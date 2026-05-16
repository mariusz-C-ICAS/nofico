import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

function getQuarterDates(year: number, quarter: number): [string, string] {
  const m1  = (quarter - 1) * 3 + 1;
  const m3  = m1 + 2;
  const end = new Date(year, m3, 0).getDate();
  return [
    `${year}-${String(m1).padStart(2, '0')}-01`,
    `${year}-${String(m3).padStart(2, '0')}-${end}`,
  ];
}

export const consolidateFinancials = functions
  .region('europe-west1')
  .pubsub.schedule('1 of jan,apr,jul,oct 05:00')
  .onRun(async () => {
    const db  = admin.firestore();
    const now = new Date();
    const q   = Math.ceil((now.getMonth() + 1) / 3);
    const pq  = q === 1 ? 4 : q - 1;
    const py  = q === 1 ? now.getFullYear() - 1 : now.getFullYear();
    const period = `${py}-Q${pq}`;

    const groupsSnap = await db.collection('tenantGroups').get();
    let consolidated = 0;

    for (const groupDoc of groupsSnap.docs) {
      const group          = groupDoc.data();
      const memberIds      = group.memberTenantIds as string[] ?? [];
      const parentTenantId = group.parentTenantId as string | undefined;
      if (memberIds.length < 2 || !parentTenantId) continue;

      const existing = await db.collection(`tenants/${parentTenantId}/consolidationReports`)
        .where('period', '==', period).limit(1).get();
      if (!existing.empty) continue;

      const [dateFrom, dateTo] = getQuarterDates(py, pq);

      let totalRevenue = 0, totalExpenses = 0;
      const memberResults: Record<string, { revenue: number; expenses: number }> = {};

      for (const memberId of memberIds) {
        const [revSnap, expSnap] = await Promise.all([
          db.collection('invoices')
            .where('tenantId', '==', memberId).where('type', '==', 'SALES')
            .where('issueDate', '>=', dateFrom).where('issueDate', '<=', dateTo)
            .where('status', '==', 'PAID').get(),
          db.collection('invoices')
            .where('tenantId', '==', memberId).where('type', '==', 'PURCHASE')
            .where('issueDate', '>=', dateFrom).where('issueDate', '<=', dateTo).get(),
        ]);
        const rev = revSnap.docs.reduce((s, d) => s + (((d.data().netAmount) as number) ?? 0), 0);
        const exp = expSnap.docs.reduce((s, d) => s + (((d.data().netAmount) as number) ?? 0), 0);
        const r   = (v: number) => Math.round(v * 100) / 100;
        memberResults[memberId] = { revenue: r(rev), expenses: r(exp) };
        totalRevenue  += rev;
        totalExpenses += exp;
      }

      const r = (v: number) => Math.round(v * 100) / 100;

      await db.collection(`tenants/${parentTenantId}/consolidationReports`).add({
        groupId:           groupDoc.id,
        period,
        parentTenantId,
        memberCount:       memberIds.length,
        totalRevenue:      r(totalRevenue),
        totalExpenses:     r(totalExpenses),
        consolidatedProfit: r(totalRevenue - totalExpenses),
        memberResults,
        status:            'DRAFT',
        generatedAt:       admin.firestore.FieldValue.serverTimestamp(),
      });

      consolidated++;
    }

    functions.logger.info('consolidateFinancials complete', { period, consolidated });
  });
