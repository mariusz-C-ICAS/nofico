import { db } from '../../../shared/lib/firebase';
import {
  collection, doc, runTransaction, serverTimestamp, addDoc,
} from 'firebase/firestore';
import type { StockMovement, StockMovementItem, WarehouseProduct } from '../types';

function getStockDelta(type: StockMovement['type'], quantity: number): number {
  switch (type) {
    case 'PZ': case 'PW': case 'MM_IN': return quantity;
    case 'WZ': case 'RW': case 'MM_OUT': return -quantity;
    case 'INVENTORY_ADJUSTMENT': return quantity;
    default: return 0;
  }
}

export async function confirmMovement(
  tenantId: string,
  movementId: string,
  confirmedBy: string
): Promise<void> {
  await runTransaction(db, async (tx) => {
    // All reads before any writes
    const movRef = doc(db, `tenants/${tenantId}/stockMovements/${movementId}`);
    const movSnap = await tx.get(movRef);
    if (!movSnap.exists()) throw new Error('Movement not found');

    const mv = movSnap.data() as StockMovement;
    if (mv.status !== 'DRAFT') throw new Error(`Cannot confirm status: ${mv.status}`);

    const productRefs = mv.items.map(item =>
      doc(db, `tenants/${tenantId}/warehouseProducts/${item.productId}`)
    );
    const productSnaps = await Promise.all(productRefs.map(ref => tx.get(ref)));

    // Writes
    for (let i = 0; i < mv.items.length; i++) {
      const item = mv.items[i];
      const pSnap = productSnaps[i];
      if (!pSnap.exists()) throw new Error(`Product ${item.productId} not found`);
      const p = pSnap.data() as WarehouseProduct;
      const delta = getStockDelta(mv.type, item.quantity);

      tx.update(productRefs[i], {
        currentStock: p.currentStock + delta,
        updatedAt: serverTimestamp(),
      });

      if (mv.type === 'PZ' || mv.type === 'PW') {
        const lotRef = doc(collection(db, `tenants/${tenantId}/stockLots`));
        tx.set(lotRef, {
          productId: item.productId,
          warehouseId: mv.warehouseId,
          tenantId,
          quantity: item.quantity,
          remainingQuantity: item.quantity,
          unitCost: item.unitCost ?? p.unitCostAverage,
          receivedAt: serverTimestamp(),
          movementId,
          batchNumber: item.batchNumber ?? null,
        });
      }
    }

    tx.update(movRef, {
      status: 'CONFIRMED',
      confirmedBy,
      confirmedAt: serverTimestamp(),
    });
  });
}

export async function createPZ(
  tenantId: string,
  warehouseId: string,
  items: StockMovementItem[],
  createdBy: string,
  referenceDocumentId?: string
): Promise<string> {
  const ref = await addDoc(collection(db, `tenants/${tenantId}/stockMovements`), {
    tenantId, warehouseId, type: 'PZ', status: 'DRAFT', items,
    documentNumber: `PZ-${Date.now()}`,
    referenceDocumentId: referenceDocumentId ?? null,
    createdBy, createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function createWZ(
  tenantId: string,
  warehouseId: string,
  items: StockMovementItem[],
  createdBy: string,
  referenceDocumentId?: string
): Promise<string> {
  const ref = await addDoc(collection(db, `tenants/${tenantId}/stockMovements`), {
    tenantId, warehouseId, type: 'WZ', status: 'DRAFT', items,
    documentNumber: `WZ-${Date.now()}`,
    referenceDocumentId: referenceDocumentId ?? null,
    createdBy, createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function createMM(
  tenantId: string,
  sourceWarehouseId: string,
  targetWarehouseId: string,
  items: StockMovementItem[],
  createdBy: string
): Promise<{ outId: string; inId: string }> {
  const outRef = await addDoc(collection(db, `tenants/${tenantId}/stockMovements`), {
    tenantId, warehouseId: sourceWarehouseId, targetWarehouseId,
    type: 'MM_OUT', status: 'DRAFT', items,
    documentNumber: `MM-${Date.now()}`,
    createdBy, createdAt: serverTimestamp(),
  });
  const inRef = await addDoc(collection(db, `tenants/${tenantId}/stockMovements`), {
    tenantId, warehouseId: targetWarehouseId,
    type: 'MM_IN', status: 'DRAFT', items,
    documentNumber: `MM-${Date.now()}-IN`,
    referenceDocumentId: outRef.id,
    createdBy, createdAt: serverTimestamp(),
  });
  return { outId: outRef.id, inId: inRef.id };
}

export async function cancelMovement(
  tenantId: string,
  movementId: string,
  cancelledBy: string
): Promise<void> {
  await runTransaction(db, async (tx) => {
    const movRef = doc(db, `tenants/${tenantId}/stockMovements/${movementId}`);
    const snap = await tx.get(movRef);
    if (!snap.exists()) throw new Error('Movement not found');
    if (snap.data()?.status !== 'DRAFT') throw new Error('Only DRAFT movements can be cancelled');
    tx.update(movRef, { status: 'CANCELLED', cancelledBy, cancelledAt: serverTimestamp() });
  });
}
