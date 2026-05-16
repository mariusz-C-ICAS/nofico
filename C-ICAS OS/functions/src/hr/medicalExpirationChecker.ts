import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const WARN_DAYS_BEFORE = 30;

const CHECKS = [
  { field: 'medicalExamExpiry',  type: 'MEDICAL_EXAM_EXPIRY',  label: 'Badania lekarskie' },
  { field: 'bhpTrainingExpiry',  type: 'BHP_TRAINING_EXPIRY',  label: 'Szkolenie BHP' },
  { field: 'firstAidExpiry',     type: 'FIRST_AID_EXPIRY',     label: 'Kurs pierwszej pomocy' },
] as const;

export const checkMedicalExpirations = functions
  .region('europe-west1')
  .pubsub.schedule('every 168 hours') // weekly
  .onRun(async () => {
    const db = admin.firestore();
    const now = Date.now();
    const soon = now + WARN_DAYS_BEFORE * 86400_000;
    let alertsSent = 0;

    const employeesSnap = await db.collection('employees').get();

    for (const empDoc of employeesSnap.docs) {
      const emp = empDoc.data();
      const tenantId = emp.tenantId as string;
      if (!tenantId) continue;

      let tenantOwnerId: string | undefined;

      for (const check of CHECKS) {
        const expiry = emp[check.field] as admin.firestore.Timestamp | undefined;
        if (!expiry) continue;

        const expiryMs = expiry.toMillis();
        if (expiryMs < now || expiryMs > soon) continue;

        const alerted = await db.collection(`tenants/${tenantId}/notifications`)
          .where('employeeId', '==', empDoc.id)
          .where('type', '==', check.type)
          .where('createdAt', '>=', admin.firestore.Timestamp.fromMillis(now - 7 * 86400_000))
          .limit(1)
          .get();
        if (!alerted.empty) continue;

        if (!tenantOwnerId) {
          const tSnap = await db.collection('tenants').doc(tenantId).get();
          tenantOwnerId = tSnap.data()?.ownerId;
        }
        if (!tenantOwnerId) continue;

        const daysLeft = Math.ceil((expiryMs - now) / 86400_000);
        const empName = `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim();

        await db.collection(`tenants/${tenantId}/notifications`).add({
          tenantId,
          recipientId: tenantOwnerId,
          employeeId: empDoc.id,
          documentTitle: check.label,
          type: check.type,
          message: `${check.label} pracownika "${empName}" wygasa za ${daysLeft} dni.`,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          actionUrl: '/hr',
        });
        alertsSent++;
      }
    }

    functions.logger.info('checkMedicalExpirations completed', { alertsSent });
  });
