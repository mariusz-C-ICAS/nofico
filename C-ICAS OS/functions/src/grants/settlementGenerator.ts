import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { withAuth } from '../_shared/middleware';

export const generateGrantSettlement = withAuth(async (req, res, ctx) => {
  const { grantProjectId, periodNumber, periodStart, periodEnd } = req.body as {
    grantProjectId?: string;
    periodNumber?: number;
    periodStart?: string;
    periodEnd?: string;
  };

  if (!grantProjectId || !periodNumber || !periodStart || !periodEnd) {
    res.status(400).json({ error: 'grantProjectId, periodNumber, periodStart, periodEnd required' });
    return;
  }

  const db = admin.firestore();
  const tenantId = ctx.tenantId;

  const projectSnap = await db.doc(`tenants/${tenantId}/grantProjects/${grantProjectId}`).get();
  if (!projectSnap.exists) { res.status(404).json({ error: 'Grant project not found' }); return; }

  const project = projectSnap.data()!;
  const startTs = admin.firestore.Timestamp.fromDate(new Date(periodStart));
  const endTs = admin.firestore.Timestamp.fromDate(new Date(periodEnd));

  const costsSnap = await db.collection(`tenants/${tenantId}/grantCosts`)
    .where('grantProjectId', '==', grantProjectId)
    .where('isEligible', '==', true)
    .where('periodStart', '>=', startTs)
    .get();

  const costs = costsSnap.docs
    .map(d => d.data())
    .filter(c => (c.periodEnd as admin.firestore.Timestamp).toMillis() <= endTs.toMillis());

  const totalEligible = costs.reduce((s: number, c) => s + (c.amount ?? 0), 0);
  const coRate: number = project.coFinancingRate ?? 0.85;

  const breakdown = costs.reduce((acc: Record<string, number>, c) => {
    const cat = c.category as string;
    acc[cat] = (acc[cat] ?? 0) + (c.amount ?? 0);
    return acc;
  }, {});

  const report = {
    tenantId,
    grantProjectId,
    periodNumber,
    periodStart: startTs,
    periodEnd: endTs,
    totalCosts: totalEligible,
    eligibleCosts: totalEligible,
    ineligibleCosts: 0,
    requestedAmount: Math.round(totalEligible * coRate * 100) / 100,
    breakdown,
    status: 'DRAFT',
    createdBy: ctx.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const ref = await db.collection(`tenants/${tenantId}/grantSettlements`).add(report);

  functions.logger.info('Grant settlement generated', { grantProjectId, periodNumber, tenantId });
  res.json({ id: ref.id, totalEligible, requestedAmount: report.requestedAmount });
});
