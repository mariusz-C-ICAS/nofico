/**
 * Data: 2026-05-15
 * Ścieżka: /src/modules/finance/services/purchaseInvoiceService.ts
 * Serwis Firestore dla faktur zakupowych (purchase invoices).
 */
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import type { PurchaseInvoice } from '../types/fiTypes';

// ─── Collection reference ──────────────────────────────────────────────────────

export const purchaseInvoicesCol = (tenantId: string) =>
  collection(db, 'tenants', tenantId, 'purchaseInvoices');

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function createPurchaseInvoice(
  tenantId: string,
  data: Omit<PurchaseInvoice, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    const payload = {
      ...data,
      tenantId,
      isDeleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const ref = await addDoc(purchaseInvoicesCol(tenantId), payload);
    return ref.id;
  } catch (err) {
    console.error('[purchaseInvoiceService] createPurchaseInvoice error:', err);
    throw err;
  }
}

export async function updatePurchaseInvoice(
  tenantId: string,
  id: string,
  updates: Partial<PurchaseInvoice>
): Promise<void> {
  try {
    const ref = doc(db, 'tenants', tenantId, 'purchaseInvoices', id);
    await updateDoc(ref, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[purchaseInvoiceService] updatePurchaseInvoice error:', err);
    throw err;
  }
}

export async function deletePurchaseInvoice(
  tenantId: string,
  id: string
): Promise<void> {
  try {
    const ref = doc(db, 'tenants', tenantId, 'purchaseInvoices', id);
    await updateDoc(ref, {
      isDeleted: true,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[purchaseInvoiceService] deletePurchaseInvoice error:', err);
    throw err;
  }
}

// ─── Real-time listener ────────────────────────────────────────────────────────

export function getPurchaseInvoicesListener(
  tenantId: string,
  callback: (invoices: PurchaseInvoice[]) => void
): () => void {
  const q = query(
    purchaseInvoicesCol(tenantId),
    where('isDeleted', '==', false),
    orderBy('dueDate', 'desc')
  );

  return onSnapshot(
    q,
    (snap) => {
      const invoices = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as PurchaseInvoice)
      );
      callback(invoices);
    },
    (err) => {
      console.error('[purchaseInvoiceService] listener error:', err);
    }
  );
}

// ─── Payment ──────────────────────────────────────────────────────────────────

export async function markAsPaid(
  tenantId: string,
  id: string,
  amount: number
): Promise<void> {
  try {
    const ref = doc(db, 'tenants', tenantId, 'purchaseInvoices', id);
    await updateDoc(ref, {
      isPaid: true,
      paidAmount: amount,
      remainingAmount: 0,
      paymentDate: new Date().toISOString().slice(0, 10),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[purchaseInvoiceService] markAsPaid error:', err);
    throw err;
  }
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export interface PurchaseInvoiceStats {
  totalPayable: number;
  overdueCount: number;
  thisMonthSpend: number;
}

export async function getPurchaseInvoiceStats(
  tenantId: string
): Promise<PurchaseInvoiceStats> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .slice(0, 10);

    const [unpaidSnap, overdueSnap, thisMonthSnap] = await Promise.all([
      getDocs(
        query(
          purchaseInvoicesCol(tenantId),
          where('isDeleted', '==', false),
          where('isPaid', '==', false)
        )
      ),
      getDocs(
        query(
          purchaseInvoicesCol(tenantId),
          where('isDeleted', '==', false),
          where('isPaid', '==', false),
          where('dueDate', '<', today)
        )
      ),
      getDocs(
        query(
          purchaseInvoicesCol(tenantId),
          where('isDeleted', '==', false),
          where('receiveDate', '>=', monthStart),
          where('receiveDate', '<=', monthEnd)
        )
      ),
    ]);

    let totalPayable = 0;
    unpaidSnap.forEach((d) => {
      totalPayable += (d.data() as PurchaseInvoice).remainingAmount ?? 0;
    });

    let thisMonthSpend = 0;
    thisMonthSnap.forEach((d) => {
      thisMonthSpend += (d.data() as PurchaseInvoice).totalBrutto ?? 0;
    });

    return {
      totalPayable: Math.round(totalPayable * 100) / 100,
      overdueCount: overdueSnap.size,
      thisMonthSpend: Math.round(thisMonthSpend * 100) / 100,
    };
  } catch (err) {
    console.error('[purchaseInvoiceService] getPurchaseInvoiceStats error:', err);
    throw err;
  }
}

// ─── Linking ──────────────────────────────────────────────────────────────────

export async function linkToExpense(
  tenantId: string,
  invoiceId: string,
  expenseId: string
): Promise<void> {
  try {
    const ref = doc(db, 'tenants', tenantId, 'purchaseInvoices', invoiceId);
    await updateDoc(ref, {
      expenseId,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[purchaseInvoiceService] linkToExpense error:', err);
    throw err;
  }
}
