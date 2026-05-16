import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const MAX_SHIFT_HOURS = 12;

export const detectTimeTrackingAnomalies = functions
  .region('europe-west1')
  .pubsub.schedule('every 2 hours')
  .onRun(async () => {
    const db = admin.firestore();
    const cutoff = admin.firestore.Timestamp.fromMillis(
      Date.now() - MAX_SHIFT_HOURS * 3600_000
    );

    const snap = await db.collection('timeEntries')
      .where('status', '==', 'IN_PROGRESS')
      .where('startTime', '<', cutoff)
      .get();

    let alertsSent = 0;
    for (const docSnap of snap.docs) {
      const entry = docSnap.data();
      const tenantId = entry.tenantId as string;
      const userId = entry.userId as string;
      if (!tenantId || !userId) continue;

      const alerted = await db.collection(`tenants/${tenantId}/notifications`)
        .where('timeEntryId', '==', docSnap.id)
        .where('type', '==', 'BHP_LONG_SHIFT')
        .limit(1)
        .get();
      if (!alerted.empty) continue;

      await db.collection(`tenants/${tenantId}/notifications`).add({
        tenantId,
        recipientId: userId,
        timeEntryId: docSnap.id,
        documentTitle: 'Anomalia czasu pracy',
        type: 'BHP_LONG_SHIFT',
        message: `Zmiana trwa ponad ${MAX_SHIFT_HOURS}h bez przerwy — wymagana weryfikacja BHP.`,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        actionUrl: '/time-tracking',
      });
      alertsSent++;
    }

    functions.logger.info('detectTimeTrackingAnomalies completed', { checked: snap.size, alertsSent });
  });
