import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { withAuth } from '../_shared/middleware';

type ImportType = 'customers' | 'products' | 'employees';

const COLLECTION_PATH: Record<ImportType, (tid: string) => string> = {
  customers: (tid) => `customers`,       // root collection, tenantId field on each doc
  products:  (tid) => `tenants/${tid}/warehouseProducts`,
  employees: (tid) => `employees`,       // root collection, tenantId field on each doc
};

export const bulkImport = withAuth(async (req, res, ctx) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  if (ctx.role !== 'owner' && ctx.role !== 'admin') {
    res.status(403).json({ error: 'Admin role required' });
    return;
  }

  const { type, rows } = req.body as { type?: ImportType; rows?: Record<string, unknown>[] };
  if (!type || !COLLECTION_PATH[type]) {
    res.status(400).json({ error: 'Invalid type. Allowed: customers, products, employees' });
    return;
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({ error: 'rows must be a non-empty array' });
    return;
  }
  if (rows.length > 1000) {
    res.status(400).json({ error: 'Max 1000 rows per import' });
    return;
  }

  const db      = admin.firestore();
  const tid     = ctx.tenantId;
  const colRef  = db.collection(COLLECTION_PATH[type](tid));
  let   imported = 0;

  for (let i = 0; i < rows.length; i += 500) {
    const batch = db.batch();
    rows.slice(i, i + 500).forEach((row) => {
      batch.set(colRef.doc(), {
        ...row,
        tenantId:   tid,
        importedBy: ctx.uid,
        importedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt:  admin.firestore.FieldValue.serverTimestamp(),
        status:     (row.status as string) ?? 'active',
      });
    });
    await batch.commit();
    imported += Math.min(500, rows.length - i);
  }

  functions.logger.info('bulkImport done', { tenantId: tid, type, imported });
  res.json({ ok: true, imported });
});
