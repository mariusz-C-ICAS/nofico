import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { withAuth } from '../_shared/middleware';

export const gdprDataExport = withAuth(async (req, res, ctx) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { subjectId } = req.body as { subjectId?: string };
  if (!subjectId) { res.status(400).json({ error: 'Missing subjectId' }); return; }
  if (!ctx.tenantId) { res.status(400).json({ error: 'Missing tenantId' }); return; }

  if (ctx.uid !== subjectId && ctx.role !== 'owner' && ctx.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden — can only export own data unless admin' });
    return;
  }

  const db  = admin.firestore();
  const tid = ctx.tenantId;

  const [timeSnap, notifSnap, docSnap, leaveSnap] = await Promise.all([
    db.collection('timeEntries')
      .where('tenantId', '==', tid).where('userId', '==', subjectId).get(),
    db.collection(`tenants/${tid}/notifications`)
      .where('recipientId', '==', subjectId).get(),
    db.collection(`tenants/${tid}/documentInstances`)
      .where('submittedBy', '==', subjectId).get(),
    db.collection('leaves')
      .where('tenantId', '==', tid).where('userId', '==', subjectId).get(),
  ]);

  const exportData = {
    exportedAt:        new Date().toISOString(),
    tenantId:          tid,
    subjectId,
    timeEntries:       timeSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    notifications:     notifSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    documentInstances: docSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    leaves:            leaveSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    totalRecords:      timeSnap.size + notifSnap.size + docSnap.size + leaveSnap.size,
  };

  await db.collection(`tenants/${tid}/gdprRequests`).add({
    tenantId:    tid,
    subjectId,
    requestedBy: ctx.uid,
    type:        'EXPORT',
    recordCount: exportData.totalRecords,
    status:      'COMPLETED',
    createdAt:   admin.firestore.FieldValue.serverTimestamp(),
  });

  functions.logger.info('gdprDataExport completed', { tenantId: tid, subjectId, by: ctx.uid });
  res.json(exportData);
});
