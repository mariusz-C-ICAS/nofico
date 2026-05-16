import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

type AuthedHandler = (
  req: functions.https.Request & { uid: string; tenantId: string },
  res: functions.Response
) => Promise<void>;

export function withTenant(handler: AuthedHandler): functions.HttpsFunction {
  return functions
    .region('europe-west1')
    .https.onRequest(async (req, res) => {
      res.set('Access-Control-Allow-Origin', '*');
      if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Tenant-Id');
        res.status(204).send('');
        return;
      }

      const authHeader = req.headers.authorization ?? '';
      if (!authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Missing Authorization header' });
        return;
      }

      const idToken = authHeader.slice(7);

      let decoded: admin.auth.DecodedIdToken;
      try {
        decoded = await admin.auth().verifyIdToken(idToken);
      } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
      }

      const tenantId =
        (req.headers['x-tenant-id'] as string | undefined) ??
        (req.body as Record<string, unknown>)?.tenantId as string | undefined ??
        decoded.tenantId;

      if (!tenantId) {
        res.status(400).json({ error: 'tenantId required (header X-Tenant-Id or body.tenantId)' });
        return;
      }

      const memberDoc = await admin
        .firestore()
        .doc(`tenants/${tenantId}/members/${decoded.uid}`)
        .get();

      if (!memberDoc.exists) {
        res.status(403).json({ error: 'Not a member of this tenant' });
        return;
      }

      try {
        await handler(
          Object.assign(req, { uid: decoded.uid, tenantId }) as any,
          res
        );
      } catch (err) {
        functions.logger.error('withTenant handler error', { err, uid: decoded.uid, tenantId });
        res.status(500).json({ error: 'Internal server error' });
      }
    });
}
