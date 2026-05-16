import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const REVIEW_CYCLE_MONTHS = 12;

export const checkDocumentRetention = functions
  .region('europe-west1')
  .pubsub.schedule('every 720 hours') // ~30 days
  .onRun(async () => {
    const db = admin.firestore();
    const reviewDue = admin.firestore.Timestamp.fromMillis(
      Date.now() - REVIEW_CYCLE_MONTHS * 30 * 86400_000
    );
    let alertsSent = 0;

    const tenantsSnap = await db.collection('tenants').get();

    for (const tenantDoc of tenantsSnap.docs) {
      const tenantId = tenantDoc.id;
      const ownerId = tenantDoc.data().ownerId as string | undefined;
      if (!ownerId) continue;

      const docsSnap = await db.collection(`tenants/${tenantId}/documents`)
        .where('createdAt', '<=', reviewDue)
        .limit(100)
        .get();

      if (docsSnap.empty) continue;

      // Avoid duplicate alert this month
      const alreadyNotified = await db.collection(`tenants/${tenantId}/notifications`)
        .where('type', '==', 'RODO_REVIEW_DUE')
        .where('createdAt', '>=', admin.firestore.Timestamp.fromMillis(Date.now() - 30 * 86400_000))
        .limit(1)
        .get();
      if (!alreadyNotified.empty) continue;

      await db.collection(`tenants/${tenantId}/notifications`).add({
        tenantId,
        recipientId: ownerId,
        documentTitle: 'Przegląd retencji dokumentów',
        type: 'RODO_REVIEW_DUE',
        message: `${docsSnap.size} dokumentów starszych niż ${REVIEW_CYCLE_MONTHS} mies. wymaga przeglądu RODO.`,
        affectedDocumentCount: docsSnap.size,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        actionUrl: '/documents',
      });
      alertsSent++;
    }

    functions.logger.info('checkDocumentRetention completed', { alertsSent });
  });
