import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const healthCheck = functions.region('europe-west1').https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  const start = Date.now();

  let dbOk = false;
  try {
    await admin.firestore().collection('_health').doc('ping').get();
    dbOk = true;
  } catch { /* ignore */ }

  const latencyMs = Date.now() - start;
  const status = dbOk ? 'ok' : 'degraded';

  res.status(dbOk ? 200 : 503).json({
    status,
    version: process.env.FUNCTION_TARGET ?? '1.0.0',
    region: 'europe-west1',
    dbLatencyMs: latencyMs,
    timestamp: new Date().toISOString(),
  });
});
