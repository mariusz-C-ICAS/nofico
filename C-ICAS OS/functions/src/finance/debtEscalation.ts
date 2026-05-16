import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const THRESHOLDS = [
  { dpd:  7, stage: 'SOFT_REMINDER',  notifType: 'DEBT_SOFT_REMINDER' },
  { dpd: 30, stage: 'FORMAL_DEMAND',  notifType: 'DEBT_FORMAL_DEMAND' },
  { dpd: 60, stage: 'PRE_LEGAL',      notifType: 'DEBT_PRE_LEGAL' },
  { dpd: 90, stage: 'LEGAL',          notifType: 'DEBT_LEGAL' },
] as const;

export const escalateDebtCases = functions
  .region('europe-west1')
  .pubsub.schedule('every 24 hours')
  .onRun(async () => {
    const db       = admin.firestore();
    const casesSnap = await db.collectionGroup('debtCases')
      .where('stage', 'not-in', ['SETTLED', 'WRITE_OFF'])
      .get();

    let escalated = 0;

    for (const caseDoc of casesSnap.docs) {
      const c        = caseDoc.data();
      const tenantId = c.tenantId as string;
      if (!tenantId) continue;

      const dueDate = (c.duedDate as admin.firestore.Timestamp | undefined)?.toDate();
      if (!dueDate) continue;

      const dpd = Math.floor((Date.now() - dueDate.getTime()) / 86400_000);
      const updates: Record<string, unknown> = { dpd, updatedAt: admin.firestore.FieldValue.serverTimestamp() };

      const target = [...THRESHOLDS].reverse().find(t => dpd >= t.dpd);
      if (!target) { await caseDoc.ref.update(updates); continue; }

      if (c.stage !== target.stage) {
        updates.stage = target.stage;
        const ownerId = (await db.collection('tenants').doc(tenantId).get()).data()?.ownerId as string | undefined;
        if (ownerId) {
          await db.collection(`tenants/${tenantId}/notifications`).add({
            tenantId, recipientId: ownerId,
            documentTitle: `Windykacja: ${c.invoiceNumber}`,
            type: target.notifType,
            message: `Sprawa ${c.invoiceNumber} (${c.customerName}) → etap ${target.stage}. DPD: ${dpd}d. Kwota: ${c.outstandingAmount} ${c.currency}.`,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            actionUrl: '/debt-collection',
          });
        }
        escalated++;
      }

      await caseDoc.ref.update(updates);
    }

    functions.logger.info('escalateDebtCases complete', { total: casesSnap.size, escalated });
  });
