import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  getDocs,
  getDoc,
  Query,
  DocumentData,
} from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import { initKsefSession, sendInvoicesToKsef, getUPO, KsefUPOPendingError } from './ksefService';
import {
  SalesInvoice,
  InvoiceItem,
  InvoiceStats,
  computeInvoiceTotals,
  buildInvoiceNumber,
  requiresMpp,
} from '../types/fiTypes';

const invoicesCol = (tenantId: string) =>
  collection(db, 'tenants', tenantId, 'invoices');

export async function generateNextInvoiceNumber(tenantId: string, series: string): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  try {
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const monthEnd = `${year}-${String(month).padStart(2, '0')}-31`;

    const q = query(
      invoicesCol(tenantId),
      where('series', '==', series),
      where('issueDate', '>=', monthStart),
      where('issueDate', '<=', monthEnd),
      where('isDeleted', '==', false),
      orderBy('issueDate', 'desc')
    );
    const snap = await getDocs(q);

    // Extract max sequential number from existing invoice numbers this month
    let maxSeq = 0;
    snap.forEach((d) => {
      const data = d.data() as SalesInvoice;
      const parts = data.number?.split('/');
      if (parts && parts.length === 4) {
        const seq = parseInt(parts[3], 10);
        if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
      }
    });

    return buildInvoiceNumber(series, year, month, maxSeq + 1);
  } catch (err) {
    console.error('[invoiceService] generateNextInvoiceNumber error:', err);
    throw err;
  }
}

export async function createInvoice(
  tenantId: string,
  data: Omit<SalesInvoice, 'id' | 'createdAt' | 'updatedAt' | 'totalNetto' | 'totalVat' | 'totalBrutto' | 'vatSummary'>
): Promise<string> {
  try {
    const totals = computeInvoiceTotals(data.items);
    const isMpp = requiresMpp(totals.totalNetto, data.currency, !data.buyer.nip === false);

    const payload: Omit<SalesInvoice, 'id'> = {
      ...data,
      tenantId,
      ...totals,
      isMpp: data.isMpp ?? isMpp,
      remainingAmount: totals.totalBrutto - (data.paidAmount ?? 0),
      paidAmount: data.paidAmount ?? 0,
      isDeleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const ref = await addDoc(invoicesCol(tenantId), payload);
    return ref.id;
  } catch (err) {
    console.error('[invoiceService] createInvoice error:', err);
    throw err;
  }
}

export async function updateInvoice(
  tenantId: string,
  id: string,
  updates: Partial<SalesInvoice>
): Promise<void> {
  try {
    const ref = doc(db, 'tenants', tenantId, 'invoices', id);

    let computed: Partial<SalesInvoice> = {};
    if (updates.items) {
      const totals = computeInvoiceTotals(updates.items);
      computed = {
        ...totals,
        remainingAmount: totals.totalBrutto - (updates.paidAmount ?? 0),
      };
    }

    await updateDoc(ref, {
      ...updates,
      ...computed,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[invoiceService] updateInvoice error:', err);
    throw err;
  }
}

export async function deleteInvoice(tenantId: string, id: string): Promise<void> {
  try {
    const ref = doc(db, 'tenants', tenantId, 'invoices', id);
    await updateDoc(ref, {
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[invoiceService] deleteInvoice error:', err);
    throw err;
  }
}

export interface InvoiceFilters {
  status?: SalesInvoice['status'];
  dateFrom?: string;
  dateTo?: string;
}

export function getInvoicesListener(
  tenantId: string,
  filters: InvoiceFilters,
  callback: (invoices: SalesInvoice[]) => void
): () => void {
  let q: Query<DocumentData> = query(
    invoicesCol(tenantId),
    where('isDeleted', '==', false),
    orderBy('issueDate', 'desc')
  );

  if (filters.status) {
    q = query(q, where('status', '==', filters.status));
  }
  if (filters.dateFrom) {
    q = query(q, where('issueDate', '>=', filters.dateFrom));
  }
  if (filters.dateTo) {
    q = query(q, where('issueDate', '<=', filters.dateTo));
  }

  return onSnapshot(
    q,
    (snap) => {
      const invoices = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SalesInvoice));
      callback(invoices);
    },
    (err) => {
      console.error('[invoiceService] getInvoicesListener error:', err);
    }
  );
}

export async function markAsPaid(
  tenantId: string,
  id: string,
  amount: number,
  paymentDate: string
): Promise<void> {
  try {
    const ref = doc(db, 'tenants', tenantId, 'invoices', id);
    const snap = await getDocs(
      query(invoicesCol(tenantId), where('__name__', '==', id))
    );

    let totalBrutto = 0;
    snap.forEach((d) => {
      totalBrutto = (d.data() as SalesInvoice).totalBrutto;
    });

    const paidAmount = amount;
    const remainingAmount = Math.max(0, totalBrutto - paidAmount);
    const status: SalesInvoice['status'] =
      remainingAmount <= 0 ? 'paid' : 'partially_paid';

    await updateDoc(ref, {
      paidAmount,
      remainingAmount,
      paymentDate,
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[invoiceService] markAsPaid error:', err);
    throw err;
  }
}

export async function sendToKSeF(tenantId: string, id: string): Promise<void> {
  const ref = doc(db, 'tenants', tenantId, 'invoices', id);
  try {
    await updateDoc(ref, {
      ksefStatus: 'sending',
      ksefSentAt: new Date().toISOString(),
      updatedAt: serverTimestamp(),
    });

    // Pobierz credentials KSeF z Firestore
    const credSnap = await getDoc(doc(db, `tenants/${tenantId}/ksefCredentials/main`));
    if (!credSnap.exists()) throw new Error('Brak konfiguracji KSeF dla tej organizacji');
    const cred = credSnap.data() as { nip: string; token: string; environment: 'sandbox' | 'production' };

    // Inicjuj sesję
    const session = await initKsefSession(tenantId, cred);

    // Wyślij fakturę
    const results = await sendInvoicesToKsef(tenantId, [id], session);

    // Jeśli wysłano — czekaj na UPO (max 10 prób co 3s)
    const referenceNumber = results[0]?.referenceNumber;
    let upoDoc = null;
    if (referenceNumber) {
      for (let i = 0; i < 10; i++) {
        try {
          upoDoc = await getUPO(tenantId, referenceNumber, session);
          break;
        } catch (err) {
          if (err instanceof KsefUPOPendingError) {
            await new Promise(r => setTimeout(r, 3000));
          } else {
            throw err;
          }
        }
      }
    }

    await updateDoc(ref, {
      ksefStatus: upoDoc ? 'confirmed' : 'sent',
      ksefReferenceNumber: referenceNumber ?? null,
      ksefUpoTimestamp: upoDoc?.timestamp ?? null,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[invoiceService] sendToKSeF error:', err);
    try {
      await updateDoc(ref, { ksefStatus: 'not_sent', updatedAt: serverTimestamp() });
    } catch (revertErr) {
      console.error('[invoiceService] sendToKSeF revert error:', revertErr);
    }
    throw err;
  }
}

export async function getInvoiceStats(tenantId: string): Promise<InvoiceStats> {
  try {
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const todayStr = now.toISOString().split('T')[0];

    const [allSnap, overdueSnap, thisMonthSnap] = await Promise.all([
      getDocs(
        query(
          invoicesCol(tenantId),
          where('isDeleted', '==', false),
          where('status', 'in', ['issued', 'sent', 'partially_paid', 'paid'])
        )
      ),
      getDocs(
        query(
          invoicesCol(tenantId),
          where('isDeleted', '==', false),
          where('status', 'in', ['issued', 'sent', 'partially_paid']),
          where('dueDate', '<', todayStr)
        )
      ),
      getDocs(
        query(
          invoicesCol(tenantId),
          where('isDeleted', '==', false),
          where('issueDate', '>=', monthStart),
          where('status', 'in', ['issued', 'sent', 'partially_paid', 'paid'])
        )
      ),
    ]);

    let totalRevenue = 0;
    let outstanding = 0;
    allSnap.forEach((d) => {
      const inv = d.data() as SalesInvoice;
      totalRevenue += inv.totalBrutto ?? 0;
      outstanding += inv.remainingAmount ?? 0;
    });

    let thisMonthRevenue = 0;
    thisMonthSnap.forEach((d) => {
      thisMonthRevenue += (d.data() as SalesInvoice).totalBrutto ?? 0;
    });

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      outstanding: Math.round(outstanding * 100) / 100,
      overdueCount: overdueSnap.size,
      thisMonthRevenue: Math.round(thisMonthRevenue * 100) / 100,
    };
  } catch (err) {
    console.error('[invoiceService] getInvoiceStats error:', err);
    throw err;
  }
}

export async function getOverdueInvoices(tenantId: string): Promise<SalesInvoice[]> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const q = query(
      invoicesCol(tenantId),
      where('isDeleted', '==', false),
      where('status', 'in', ['issued', 'sent', 'partially_paid']),
      where('dueDate', '<', today),
      orderBy('dueDate', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SalesInvoice));
  } catch (err) {
    console.error('[invoiceService] getOverdueInvoices error:', err);
    throw err;
  }
}
