import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const autoTagDocumentByCustomer = functions
  .region('europe-west1')
  .firestore.document('tenants/{tenantId}/documents/{documentId}')
  .onCreate(async (snap, ctx) => {
    const { tenantId, documentId } = ctx.params;
    const docData = snap.data();

    if (docData.customerId) return; // already tagged

    const nip =
      (docData.metadata?.nip as string | undefined) ??
      (docData.ocrData?.nip as string | undefined) ??
      (docData.extractedNip as string | undefined);

    if (!nip) return;

    const cleanNip = nip.replace(/[\s\-]/g, '');
    if (cleanNip.length !== 10 || !/^\d+$/.test(cleanNip)) return;

    const db = admin.firestore();

    const snap_ = await db.collection('customers')
      .where('tenantId', '==', tenantId)
      .where('nip', '==', cleanNip)
      .limit(1)
      .get();

    if (snap_.empty) return;

    const customer = snap_.docs[0];

    await snap.ref.update({
      customerId: customer.id,
      customerName: customer.data().name,
      autoTaggedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    functions.logger.info('Document auto-tagged', { documentId, customerId: customer.id, tenantId });
  });
