import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const THRESHOLDS_DAYS = [30, 14, 7];

export const checkContractRenewals = functions
  .region('europe-west1')
  .pubsub.schedule('every 24 hours')
  .onRun(async () => {
    const db = admin.firestore();
    const now = Date.now();
    let alertsSent = 0;

    for (const days of THRESHOLDS_DAYS) {
      const windowStart = admin.firestore.Timestamp.fromMillis(now + (days - 1) * 86400_000);
      const windowEnd   = admin.firestore.Timestamp.fromMillis(now + (days + 1) * 86400_000);

      const snap = await db.collectionGroup('documentInstances')
        .where('type', '==', 'CONTRACT')
        .where('metadata.expiresAt', '>=', windowStart)
        .where('metadata.expiresAt', '<', windowEnd)
        .get();

      for (const docSnap of snap.docs) {
        const contract = docSnap.data();
        const tenantId = contract.tenantId as string;
        if (!tenantId) continue;

        // Skip archived or already-notified
        if (contract.status === 'ARCHIVED') continue;

        const alerted = await db.collection(`tenants/${tenantId}/notifications`)
          .where('documentInstanceId', '==', docSnap.id)
          .where('type', '==', 'CONTRACT_RENEWAL')
          .where('createdAt', '>=', admin.firestore.Timestamp.fromMillis(now - 2 * 86400_000))
          .limit(1)
          .get();
        if (!alerted.empty) continue;

        const title = contract.metadata?.title ?? 'Umowa';
        const recipientId = contract.submittedBy as string;

        await db.collection(`tenants/${tenantId}/notifications`).add({
          tenantId,
          recipientId,
          documentInstanceId: docSnap.id,
          documentTitle: title,
          type: 'CONTRACT_RENEWAL',
          message: `Umowa "${title}" wygasa za ${days} dni — rozważ przedłużenie lub anulowanie.`,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          actionUrl: '/workflow',
        });
        alertsSent++;
      }
    }

    functions.logger.info('checkContractRenewals completed', { alertsSent });
  });
