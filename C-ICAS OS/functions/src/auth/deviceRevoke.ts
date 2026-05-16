import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { withAuth } from '../_shared/middleware';

export const revokeDevice = withAuth(async (req, res, ctx) => {
  const { targetUid } = req.body as { targetUid?: string };
  if (!targetUid) { res.status(400).json({ error: 'targetUid required' }); return; }

  if (targetUid !== ctx.uid && ctx.role !== 'owner' && ctx.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  await admin.auth().revokeRefreshTokens(targetUid);

  await admin.firestore().collection('auditLogs').add({
    userId: ctx.uid,
    tenantId: ctx.tenantId,
    entityId: targetUid,
    collection: 'auth',
    action: 'update',
    details: { operation: 'revokeRefreshTokens', targetUid },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  functions.logger.info('Device tokens revoked', { targetUid, by: ctx.uid });
  res.json({ success: true, uid: targetUid, revokedAt: new Date().toISOString() });
});
