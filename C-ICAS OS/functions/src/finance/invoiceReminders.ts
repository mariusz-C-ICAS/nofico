import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const STAGES = [
  { daysOverdue: 7,  type: 'INVOICE_REMINDER_1',     label: 'pierwsze przypomnienie (7 dni)' },
  { daysOverdue: 14, type: 'INVOICE_REMINDER_2',     label: 'drugie przypomnienie (14 dni)' },
  { daysOverdue: 30, type: 'INVOICE_REMINDER_FINAL', label: 'ostateczne wezwanie do zapłaty (30 dni)' },
];

export const checkInvoiceReminders = functions
  .region('europe-west1')
  .pubsub.schedule('every 24 hours')
  .onRun(async () => {
    const db = admin.firestore();
    const now = Date.now();

    for (const stage of STAGES) {
      const cutoff = admin.firestore.Timestamp.fromMillis(now - stage.daysOverdue * 86400_000);

      const snap = await db.collectionGroup('invoices')
        .where('status', '==', 'UNPAID')
        .where('dueDate', '<', cutoff)
        .get();

      for (const docSnap of snap.docs) {
        const invoice = docSnap.data();
        const tenantId = invoice.tenantId as string;
        if (!tenantId) continue;

        const existing = await db.collection(`tenants/${tenantId}/notifications`)
          .where('invoiceId', '==', docSnap.id)
          .where('type', '==', stage.type)
          .limit(1)
          .get();
        if (!existing.empty) continue;

        await db.collection(`tenants/${tenantId}/notifications`).add({
          tenantId,
          recipientId: invoice.ownerId ?? invoice.createdBy ?? '',
          invoiceId: docSnap.id,
          documentTitle: invoice.number ?? 'Faktura',
          type: stage.type,
          message: `Faktura "${invoice.number ?? docSnap.id}" — ${stage.label}.`,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          actionUrl: '/invoices',
        });
      }
    }

    functions.logger.info('checkInvoiceReminders completed');
  });
