import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const FUNCTIONS_BASE =
  process.env.FUNCTIONS_URL ?? 'https://europe-west1-cicas-os.cloudfunctions.net';

export const monitorVatStatus = functions
  .region('europe-west1')
  .pubsub.schedule('every 24 hours')
  .onRun(async () => {
    const db = admin.firestore();
    const tenantsSnap = await db.collection('tenants').get();
    let checked = 0;
    let changed = 0;

    for (const tenantDoc of tenantsSnap.docs) {
      const tenantId = tenantDoc.id;
      const ownerId = tenantDoc.data().ownerId as string | undefined;

      const customersSnap = await db.collection('customers')
        .where('tenantId', '==', tenantId)
        .where('status', '==', 'active')
        .get();

      for (const custDoc of customersSnap.docs) {
        const customer = custDoc.data();
        const nip = customer.nip ?? customer.vatNumber;
        if (!nip) continue;
        checked++;

        try {
          const checkRes = await fetch(`${FUNCTIONS_BASE}/validateBialaLista`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nip, tenantId }),
          });
          if (!checkRes.ok) continue;

          const result = await checkRes.json() as { isActive?: boolean };
          const newStatus = result.isActive ? 'active' : 'inactive';
          const prevStatus = (customer.vatStatus as string | undefined) ?? 'active';
          if (newStatus === prevStatus) continue;

          changed++;
          await custDoc.ref.update({
            vatStatus: newStatus,
            vatCheckedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          if (ownerId) {
            await db.collection(`tenants/${tenantId}/notifications`).add({
              tenantId,
              recipientId: ownerId,
              customerId: custDoc.id,
              documentTitle: customer.name,
              type: 'VAT_STATUS_CHANGE',
              message: `Kontrahent "${customer.name}": status VAT zmienił się z ${prevStatus} na ${newStatus}.`,
              read: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              actionUrl: '/crm',
            });
          }
        } catch {
          functions.logger.warn('VAT check failed', { custId: custDoc.id });
        }
      }
    }

    functions.logger.info('monitorVatStatus completed', { checked, changed });
  });
