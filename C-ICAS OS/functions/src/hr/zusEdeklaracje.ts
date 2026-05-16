import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const generateZusEdeklaracje = functions
  .region('europe-west1')
  .pubsub.schedule('15 of month 06:00')
  .onRun(async () => {
    const db   = admin.firestore();
    const now  = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const period = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
    const dueDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-15`;

    const tenantsSnap = await db.collection('tenants').where('zusEnabled', '==', true).get();
    let processed = 0;

    for (const tenantDoc of tenantsSnap.docs) {
      const tenantId = tenantDoc.id;

      const existing = await db.collection(`tenants/${tenantId}/zusReports`)
        .where('period', '==', period).limit(1).get();
      if (!existing.empty) continue;

      const payrollSnap = await db.collectionGroup('payslips')
        .where('tenantId', '==', tenantId)
        .where('period', '==', period)
        .where('status', '==', 'APPROVED')
        .get();

      if (payrollSnap.empty) continue;

      let totalGross = 0, totalEmpSocial = 0, totalEmpRSocial = 0, totalHealth = 0;

      for (const pDoc of payrollSnap.docs) {
        const p = pDoc.data();
        totalGross      += (p.grossSalary as number) ?? 0;
        totalEmpSocial  += (p.employeeSocialContribution as number) ?? 0;
        totalEmpRSocial += (p.employerSocialContribution as number) ?? 0;
        totalHealth     += (p.healthInsurance as number) ?? 0;
      }

      const r = (v: number) => Math.round(v * 100) / 100;
      const totalZus = r(totalEmpSocial + totalEmpRSocial + totalHealth);

      await db.collection(`tenants/${tenantId}/zusReports`).add({
        tenantId,
        period,
        type:                  'ZUS_DRA',
        employeeCount:         payrollSnap.size,
        totalGross:            r(totalGross),
        totalEmployeeSocial:   r(totalEmpSocial),
        totalEmployerSocial:   r(totalEmpRSocial),
        totalHealth:           r(totalHealth),
        totalZus,
        dueDate,
        status:                'READY_TO_SUBMIT',
        generatedAt:           admin.firestore.FieldValue.serverTimestamp(),
      });

      const ownerId = tenantDoc.data().ownerId as string | undefined;
      if (ownerId) {
        await db.collection(`tenants/${tenantId}/notifications`).add({
          tenantId, recipientId: ownerId,
          documentTitle: `ZUS DRA ${period}`,
          type: 'ZUS_READY',
          message: `ZUS DRA za ${period}: ${payrollSnap.size} pracowników, łączny ZUS: ${totalZus} PLN. Termin płatności: ${dueDate}.`,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          actionUrl: '/hr/payroll',
        });
      }

      processed++;
    }

    functions.logger.info('generateZusEdeklaracje complete', { period, processed });
  });
