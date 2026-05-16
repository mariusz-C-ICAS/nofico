import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { withAuth } from '../_shared/middleware';

function toCSV(val: unknown): string {
  const s = val == null ? '' : String(val);
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

const HEADERS = ['id', 'userId', 'userEmail', 'action', 'collection', 'entityId', 'tenantId', 'createdAt', 'details'];

export const exportAuditLogs = withAuth(async (req, res, ctx) => {
  if (ctx.role !== 'admin' && ctx.role !== 'owner') {
    res.status(403).json({ error: 'Admin or owner role required' });
    return;
  }

  const { startDate, endDate, limit: limitStr } = req.query as Record<string, string>;
  const db = admin.firestore();
  const tenantId = ctx.tenantId;
  const limit = Math.min(parseInt(limitStr ?? '1000', 10), 5000);

  let q: admin.firestore.Query = db.collection('auditLogs')
    .where('tenantId', '==', tenantId)
    .orderBy('createdAt', 'desc');

  if (startDate) q = q.where('createdAt', '>=', admin.firestore.Timestamp.fromDate(new Date(startDate)));
  if (endDate)   q = q.where('createdAt', '<=', admin.firestore.Timestamp.fromDate(new Date(endDate)));

  const snap = await q.limit(limit).get();

  const rows = snap.docs.map(d => {
    const data = d.data();
    const createdAt = (data.createdAt as admin.firestore.Timestamp)?.toDate?.()?.toISOString() ?? '';
    return [
      d.id,
      data.userId,
      data.userEmail ?? '',
      data.action,
      data.collection,
      data.entityId,
      data.tenantId,
      createdAt,
      JSON.stringify(data.details ?? {}),
    ].map(toCSV).join(',');
  });

  const csv = [HEADERS.join(','), ...rows].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition',
    `attachment; filename="audit-${tenantId}-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.status(200).send('﻿' + csv);

  functions.logger.info('exportAuditLogs', { tenantId, rows: rows.length });
});
