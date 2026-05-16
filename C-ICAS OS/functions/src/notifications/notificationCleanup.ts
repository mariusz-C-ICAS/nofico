import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const cleanupOldNotifications = functions
  .region('europe-west1')
  .pubsub.schedule('every 24 hours')
  .onRun(async () => {
    const db     = admin.firestore();
    const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - 30 * 24 * 3600 * 1000);

    const tenantsSnap = await db.collection('tenants').get();
    let totalDeleted  = 0;

    for (const tenantDoc of tenantsSnap.docs) {
      const tenantId = tenantDoc.id;
      const oldSnap  = await db
        .collection(`tenants/${tenantId}/notifications`)
        .where('read', '==', true)
        .where('createdAt', '<', cutoff)
        .limit(500)
        .get();

      if (oldSnap.empty) continue;

      const batch = db.batch();
      oldSnap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      totalDeleted += oldSnap.size;
    }

    functions.logger.info('cleanupOldNotifications done', {
      totalDeleted,
      cutoffDate: cutoff.toDate().toISOString(),
    });
  });
