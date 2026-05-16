import { db } from '../../../shared/lib/firebase';
import {
  collection, query, where, getDocs, getDoc, doc, orderBy, Timestamp,
} from 'firebase/firestore';
import type { WarehouseProduct, StockLot, StockMovement, AbcXyzResult, AbcClass, XyzClass } from '../types';

export async function getAvailableStock(
  tenantId: string, productId: string
): Promise<number> {
  const snap = await getDoc(doc(db, `tenants/${tenantId}/warehouseProducts/${productId}`));
  if (!snap.exists()) return 0;
  const p = snap.data() as WarehouseProduct;
  return p.currentStock - (p.reservedStock ?? 0);
}

async function fetchLots(
  tenantId: string, productId: string, warehouseId: string
): Promise<(StockLot & { id: string })[]> {
  const snap = await getDocs(
    query(
      collection(db, `tenants/${tenantId}/stockLots`),
      where('productId', '==', productId),
      where('warehouseId', '==', warehouseId),
      where('remainingQuantity', '>', 0),
      orderBy('remainingQuantity')
    )
  );
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as StockLot) }));
}

function consumeLots(
  lots: (StockLot & { id: string })[],
  quantity: number
): { lotIds: string[]; totalCost: number } {
  let remaining = quantity;
  let totalCost = 0;
  const lotIds: string[] = [];
  for (const lot of lots) {
    if (remaining <= 0) break;
    const consumed = Math.min(lot.remainingQuantity, remaining);
    totalCost += consumed * lot.unitCost;
    remaining -= consumed;
    lotIds.push(lot.id);
  }
  if (remaining > 0) throw new Error(`Insufficient stock: shortfall ${remaining}`);
  return { lotIds, totalCost };
}

export async function consumeFIFO(
  tenantId: string, productId: string, warehouseId: string, quantity: number
): Promise<{ lotIds: string[]; totalCost: number }> {
  const lots = (await fetchLots(tenantId, productId, warehouseId))
    .sort((a, b) => a.receivedAt.toMillis() - b.receivedAt.toMillis());
  return consumeLots(lots, quantity);
}

export async function consumeLIFO(
  tenantId: string, productId: string, warehouseId: string, quantity: number
): Promise<{ lotIds: string[]; totalCost: number }> {
  const lots = (await fetchLots(tenantId, productId, warehouseId))
    .sort((a, b) => b.receivedAt.toMillis() - a.receivedAt.toMillis());
  return consumeLots(lots, quantity);
}

export async function computeAverageUnitCost(
  tenantId: string, productId: string, warehouseId: string
): Promise<number> {
  const lots = await fetchLots(tenantId, productId, warehouseId);
  const totalQty = lots.reduce((s, l) => s + l.remainingQuantity, 0);
  const totalCost = lots.reduce((s, l) => s + l.remainingQuantity * l.unitCost, 0);
  return totalQty > 0 ? totalCost / totalQty : 0;
}

export async function analyzeAbcXyz(
  tenantId: string,
  warehouseId: string,
  periodMonths = 12
): Promise<AbcXyzResult[]> {
  const since = Timestamp.fromMillis(Date.now() - periodMonths * 30 * 86400_000);

  const snap = await getDocs(
    query(
      collection(db, `tenants/${tenantId}/stockMovements`),
      where('warehouseId', '==', warehouseId),
      where('type', '==', 'WZ'),
      where('status', '==', 'CONFIRMED'),
      where('createdAt', '>=', since)
    )
  );

  const revenueMap = new Map<string, number[]>();
  for (const d of snap.docs) {
    const mv = d.data() as StockMovement;
    for (const item of mv.items) {
      if (!revenueMap.has(item.productId)) revenueMap.set(item.productId, []);
      revenueMap.get(item.productId)!.push(item.totalCost ?? 0);
    }
  }

  const totals = Array.from(revenueMap.entries())
    .map(([productId, values]) => ({ productId, total: values.reduce((a, b) => a + b, 0), values }))
    .sort((a, b) => b.total - a.total);

  const grandTotal = totals.reduce((s, t) => s + t.total, 0);
  let cumulative = 0;
  const results: AbcXyzResult[] = [];

  for (const t of totals) {
    cumulative += t.total;
    const cumulativeShare = grandTotal > 0 ? cumulative / grandTotal : 0;
    const abcClass: AbcClass = cumulativeShare <= 0.80 ? 'A' : cumulativeShare <= 0.95 ? 'B' : 'C';
    const mean = t.values.reduce((a, b) => a + b, 0) / t.values.length;
    const variance = t.values.reduce((s, v) => s + (v - mean) ** 2, 0) / t.values.length;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
    const xyzClass: XyzClass = cv <= 0.5 ? 'X' : cv <= 1.0 ? 'Y' : 'Z';
    results.push({
      productId: t.productId,
      totalRevenue: t.total,
      revenueShare: grandTotal > 0 ? t.total / grandTotal : 0,
      cumulativeShare,
      abcClass,
      demandCV: cv,
      xyzClass,
    });
  }

  return results;
}
