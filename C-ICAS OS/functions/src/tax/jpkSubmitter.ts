import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const generateJpkV7 = functions
  .region('europe-west1')
  .pubsub.schedule('1 of month 06:00')
  .onRun(async () => {
    const db       = admin.firestore();
    const now      = new Date();
    const prev     = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const period   = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
    const dateFrom = `${period}-01`;
    const dateTo   = `${period}-${new Date(prev.getFullYear(), prev.getMonth() + 1, 0).getDate()}`;

    const tenantsSnap = await db.collection('tenants').where('jpkEnabled', '==', true).get();
    let totalGenerated = 0;

    for (const tenantDoc of tenantsSnap.docs) {
      const tenantId = tenantDoc.id;

      const existing = await db.collection(`tenants/${tenantId}/jpkReports`)
        .where('period', '==', period).limit(1).get();
      if (!existing.empty) continue;

      const [salesSnap, purchSnap] = await Promise.all([
        db.collection('invoices')
          .where('tenantId', '==', tenantId).where('type', '==', 'SALES')
          .where('issueDate', '>=', dateFrom).where('issueDate', '<=', dateTo).get(),
        db.collection('invoices')
          .where('tenantId', '==', tenantId).where('type', '==', 'PURCHASE')
          .where('issueDate', '>=', dateFrom).where('issueDate', '<=', dateTo).get(),
      ]);

      const salesGross   = salesSnap.docs.reduce((s, d) => s + ((d.data().grossAmount as number) ?? 0), 0);
      const purchGross   = purchSnap.docs.reduce((s, d) => s + ((d.data().grossAmount as number) ?? 0), 0);
      const salesVat     = salesSnap.docs.reduce((s, d) => s + ((d.data().vatAmount as number) ?? 0), 0);
      const purchVat     = purchSnap.docs.reduce((s, d) => s + ((d.data().vatAmount as number) ?? 0), 0);

      await db.collection(`tenants/${tenantId}/jpkReports`).add({
        tenantId,
        period,
        type: 'JPK_V7M',
        salesCount:   salesSnap.size,
        salesGross:   Math.round(salesGross * 100) / 100,
        salesVat:     Math.round(salesVat * 100) / 100,
        purchaseCount: purchSnap.size,
        purchaseGross: Math.round(purchGross * 100) / 100,
        purchaseVat:  Math.round(purchVat * 100) / 100,
        vatToPay:     Math.round((salesVat - purchVat) * 100) / 100,
        status:       'READY_TO_SUBMIT',
        generatedAt:  admin.firestore.FieldValue.serverTimestamp(),
      });

      const ownerId = tenantDoc.data().ownerId as string | undefined;
      if (ownerId) {
        await db.collection(`tenants/${tenantId}/notifications`).add({
          tenantId, recipientId: ownerId,
          documentTitle: `JPK_V7M ${period}`,
          type: 'JPK_READY',
          message: `JPK_V7M za ${period} gotowy do wysłania. Sprzedaż: ${salesSnap.size} dok., VAT należny: ${Math.round(salesVat * 100) / 100} PLN.`,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          actionUrl: '/finance/tax',
        });
      }

      totalGenerated++;
      functions.logger.info('JPK_V7M generated', { tenantId, period });
    }

    functions.logger.info('generateJpkV7 complete', { totalGenerated });
  });
