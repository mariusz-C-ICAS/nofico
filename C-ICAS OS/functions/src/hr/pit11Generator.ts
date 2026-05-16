import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const generatePit11Annual = functions
  .region('europe-west1')
  .pubsub.schedule('1 of feb 05:00')
  .onRun(async () => {
    const db   = admin.firestore();
    const now  = new Date();
    const year = now.getFullYear() - 1;

    const tenantsSnap = await db.collection('tenants').where('hrEnabled', '==', true).get();
    let processed = 0;

    for (const tenantDoc of tenantsSnap.docs) {
      const tenantId = tenantDoc.id;

      const existing = await db.collection(`tenants/${tenantId}/pit11Reports`)
        .where('year', '==', year).limit(1).get();
      if (!existing.empty) continue;

      const payslipSnap = await db.collectionGroup('payslips')
        .where('tenantId', '==', tenantId)
        .where('status', '==', 'APPROVED')
        .get();

      const yearPayslips = payslipSnap.docs.filter(d =>
        ((d.data().period as string) ?? '').startsWith(`${year}-`)
      );
      if (!yearPayslips.length) continue;

      const byEmployee: Record<string, { grossSalary: number; taxAdvance: number; healthInsurance: number }> = {};

      for (const pDoc of yearPayslips) {
        const p = pDoc.data();
        const empId = (p.employeeId as string) ?? pDoc.id;
        if (!byEmployee[empId]) byEmployee[empId] = { grossSalary: 0, taxAdvance: 0, healthInsurance: 0 };
        byEmployee[empId].grossSalary     += (p.grossSalary as number)     ?? 0;
        byEmployee[empId].taxAdvance      += (p.taxAdvance as number)      ?? 0;
        byEmployee[empId].healthInsurance += (p.healthInsurance as number) ?? 0;
      }

      const r       = (v: number) => Math.round(v * 100) / 100;
      const empCount = Object.keys(byEmployee).length;

      const reportRef = await db.collection(`tenants/${tenantId}/pit11Reports`).add({
        tenantId,
        year,
        employeeCount: empCount,
        status:        'READY',
        generatedAt:   admin.firestore.FieldValue.serverTimestamp(),
      });

      const batch = db.batch();
      for (const [empId, agg] of Object.entries(byEmployee)) {
        batch.set(reportRef.collection('employees').doc(empId), {
          employeeId:       empId,
          year,
          grossSalary:      r(agg.grossSalary),
          taxAdvance:       r(agg.taxAdvance),
          healthInsurance:  r(agg.healthInsurance),
          status:           'DRAFT',
        });
      }
      await batch.commit();

      const ownerId = tenantDoc.data().ownerId as string | undefined;
      if (ownerId) {
        await db.collection(`tenants/${tenantId}/notifications`).add({
          tenantId, recipientId: ownerId,
          documentTitle: `PIT-11 za ${year}`,
          type:          'STEP_TIMEOUT',
          message:       `PIT-11 za ${year} wygenerowany dla ${empCount} pracowników. Złóż do e-Deklaracji do 28 lutego.`,
          read:          false,
          createdAt:     admin.firestore.FieldValue.serverTimestamp(),
          actionUrl:     '/hr/payroll',
        });
      }
      processed++;
    }

    functions.logger.info('generatePit11Annual complete', { year, processed });
  });
