import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const LIMIT_EUR = 200_000;
const WINDOW_MS = 3 * 365 * 24 * 3600_000;
const THRESHOLD = 0.80;

export const monitorDeMinimis = functions
  .region('europe-west1')
  .pubsub.schedule('every 24 hours')
  .onRun(async () => {
    const db = admin.firestore();
    const since = admin.firestore.Timestamp.fromMillis(Date.now() - WINDOW_MS);
    const tenantsSnap = await db.collection('tenants').get();

    for (const tenantDoc of tenantsSnap.docs) {
      const tenantId = tenantDoc.id;
      const ownerId = tenantDoc.data().ownerId as string | undefined;
      if (!ownerId) continue;

      const entriesSnap = await db
        .collection(`tenants/${tenantId}/deMinimisEntries`)
        .where('grantedAt', '>=', since)
        .get();

      const totalEUR = entriesSnap.docs.reduce(
        (s, d) => s + ((d.data().amountEUR as number) ?? 0), 0
      );
      const utilization = totalEUR / LIMIT_EUR;
      if (utilization < THRESHOLD) continue;

      const recentAlert = await db
        .collection(`tenants/${tenantId}/notifications`)
        .where('type', '==', 'DE_MINIMIS_ALERT')
        .where('createdAt', '>=', admin.firestore.Timestamp.fromMillis(Date.now() - 7 * 86400_000))
        .limit(1)
        .get();
      if (!recentAlert.empty) continue;

      const label = totalEUR > LIMIT_EUR ? 'PRZEKROCZONO' : `${(utilization * 100).toFixed(1)}% wykorzystania`;

      await db.collection(`tenants/${tenantId}/notifications`).add({
        tenantId,
        recipientId: ownerId,
        documentTitle: 'Limit de minimis',
        type: 'DE_MINIMIS_ALERT',
        message: `${label}: ${totalEUR.toFixed(0)} / ${LIMIT_EUR} EUR w oknie 3-letnim.`,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        actionUrl: '/grants',
      });

      functions.logger.warn('De minimis threshold alert', { tenantId, totalEUR, utilization });
    }

    functions.logger.info('monitorDeMinimis completed');
  });
