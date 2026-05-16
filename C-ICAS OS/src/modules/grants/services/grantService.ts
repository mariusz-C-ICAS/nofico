import { db } from '../../../shared/lib/firebase';
import {
  collection, query, where, getDocs, addDoc, updateDoc,
  doc, getDoc, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import type { GrantProject, GrantCost, GrantSettlementReport, GrantCostCategory } from '../types';

export async function getGrantProjects(tenantId: string): Promise<GrantProject[]> {
  const snap = await getDocs(
    query(collection(db, `tenants/${tenantId}/grantProjects`), where('tenantId', '==', tenantId))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as GrantProject));
}

export async function createGrantProject(
  tenantId: string,
  data: Omit<GrantProject, 'id' | 'tenantId' | 'createdAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, `tenants/${tenantId}/grantProjects`), {
    ...data, tenantId, createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function flagDocumentAsGrantCost(
  tenantId: string,
  grantProjectId: string,
  opts: {
    documentId: string;
    documentNumber: string;
    amount: number;
    vatAmount: number;
    category: GrantCostCategory;
    createdBy: string;
    periodStart: Timestamp;
    periodEnd: Timestamp;
  }
): Promise<string> {
  const existing = await getDocs(
    query(
      collection(db, `tenants/${tenantId}/grantCosts`),
      where('documentId', '==', opts.documentId),
      where('grantProjectId', '==', grantProjectId)
    )
  );
  if (!existing.empty) throw new Error('Document already flagged for this grant project');

  const ref = await addDoc(collection(db, `tenants/${tenantId}/grantCosts`), {
    tenantId, grantProjectId, ...opts, currency: 'PLN',
    isEligible: true, createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function markCostIneligible(
  tenantId: string,
  grantCostId: string,
  reason: string
): Promise<void> {
  await updateDoc(doc(db, `tenants/${tenantId}/grantCosts/${grantCostId}`), {
    isEligible: false, ineligibilityReason: reason,
  });
}

export async function generateSettlementReport(
  tenantId: string,
  grantProjectId: string,
  periodNumber: number,
  periodStart: Timestamp,
  periodEnd: Timestamp,
  createdBy: string
): Promise<GrantSettlementReport> {
  const projectSnap = await getDoc(doc(db, `tenants/${tenantId}/grantProjects/${grantProjectId}`));
  if (!projectSnap.exists()) throw new Error('Grant project not found');
  const project = projectSnap.data() as GrantProject;

  const costsSnap = await getDocs(
    query(
      collection(db, `tenants/${tenantId}/grantCosts`),
      where('grantProjectId', '==', grantProjectId),
      where('periodStart', '>=', periodStart),
      where('periodEnd', '<=', periodEnd)
    )
  );

  const costs = costsSnap.docs.map(d => d.data() as GrantCost);
  const eligible = costs.filter(c => c.isEligible);
  const ineligible = costs.filter(c => !c.isEligible);

  const totalEligible = eligible.reduce((s, c) => s + c.amount, 0);
  const totalIneligible = ineligible.reduce((s, c) => s + c.amount, 0);

  const breakdown = eligible.reduce((acc, c) => {
    acc[c.category] = (acc[c.category] ?? 0) + c.amount;
    return acc;
  }, {} as Partial<Record<GrantCostCategory, number>>);

  const report = {
    tenantId, grantProjectId, periodNumber, periodStart, periodEnd,
    totalCosts: totalEligible + totalIneligible,
    eligibleCosts: totalEligible,
    ineligibleCosts: totalIneligible,
    requestedAmount: Math.round(totalEligible * project.coFinancingRate * 100) / 100,
    breakdown,
    status: 'DRAFT' as const,
    createdBy,
    createdAt: serverTimestamp() as unknown as Timestamp,
  };

  const ref = await addDoc(collection(db, `tenants/${tenantId}/grantSettlements`), report);
  return { id: ref.id, ...report };
}

export async function detectIneligibleCosts(
  tenantId: string,
  grantProjectId: string
): Promise<{ grantCostId: string; reason: string }[]> {
  const projectSnap = await getDoc(doc(db, `tenants/${tenantId}/grantProjects/${grantProjectId}`));
  if (!projectSnap.exists()) return [];
  const project = projectSnap.data() as GrantProject;

  const snap = await getDocs(
    query(
      collection(db, `tenants/${tenantId}/grantCosts`),
      where('grantProjectId', '==', grantProjectId),
      where('isEligible', '==', true)
    )
  );

  const flagged: { grantCostId: string; reason: string }[] = [];
  for (const d of snap.docs) {
    const cost = d.data() as GrantCost;
    const outOfPeriod =
      cost.periodStart.toMillis() < project.startDate.toMillis() ||
      cost.periodEnd.toMillis() > project.endDate.toMillis();

    if (outOfPeriod) {
      const reason = 'Koszt poza okresem kwalifikowania projektu';
      await updateDoc(d.ref, { isEligible: false, ineligibilityReason: reason });
      flagged.push({ grantCostId: d.id, reason });
    }
  }
  return flagged;
}
