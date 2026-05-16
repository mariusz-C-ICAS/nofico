import { db } from '../firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';

export interface ReconciliationMatch {
  invoiceId: string;
  transactionId: string;
  invoiceNumber: string;
  invoiceAmount: number;
  transactionAmount: number;
  transactionDate: Timestamp;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface ReconciliationResult {
  matched: ReconciliationMatch[];
  unmatchedInvoiceIds: string[];
  unmatchedTransactionIds: string[];
}

const AMOUNT_TOLERANCE = 0.01;
const DATE_WINDOW_DAYS = 7;

export async function reconcileInvoicesWithTransactions(
  tenantId: string,
  year: number,
  month: number
): Promise<ReconciliationResult> {
  const start = Timestamp.fromDate(new Date(year, month - 1, 1));
  const end   = Timestamp.fromDate(new Date(year, month, 1));

  const [invoicesSnap, transactionsSnap] = await Promise.all([
    getDocs(query(
      collection(db, `tenants/${tenantId}/invoices`),
      where('dueDate', '>=', start),
      where('dueDate', '<', end),
      where('status', '==', 'UNPAID')
    )),
    getDocs(query(
      collection(db, 'transactions'),
      where('tenantId', '==', tenantId),
      where('date', '>=', start),
      where('date', '<', end),
      where('type', '==', 'INCOMING')
    )),
  ]);

  type Invoice = { id: string; total?: number; number?: string; dueDate: Timestamp };
  type Transaction = { id: string; amount?: number; date: Timestamp };

  const invoices: Invoice[] = invoicesSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
  const transactions: Transaction[] = transactionsSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));

  const matched: ReconciliationMatch[] = [];
  const matchedInvoiceIds = new Set<string>();
  const matchedTransactionIds = new Set<string>();

  for (const inv of invoices) {
    for (const tx of transactions) {
      if (matchedTransactionIds.has(tx.id)) continue;

      const amountDiff = Math.abs((inv.total ?? 0) - (tx.amount ?? 0));
      if (amountDiff > AMOUNT_TOLERANCE) continue;

      const daysDiff = Math.abs(inv.dueDate.toMillis() - tx.date.toMillis()) / 86400_000;
      if (daysDiff > DATE_WINDOW_DAYS * 2) continue;

      const confidence: ReconciliationMatch['confidence'] =
        daysDiff <= 1 ? 'HIGH' : daysDiff <= DATE_WINDOW_DAYS ? 'MEDIUM' : 'LOW';

      matched.push({
        invoiceId: inv.id,
        transactionId: tx.id,
        invoiceNumber: inv.number ?? '',
        invoiceAmount: inv.total ?? 0,
        transactionAmount: tx.amount ?? 0,
        transactionDate: tx.date,
        confidence,
      });
      matchedInvoiceIds.add(inv.id);
      matchedTransactionIds.add(tx.id);
      break;
    }
  }

  return {
    matched,
    unmatchedInvoiceIds: invoices.filter(i => !matchedInvoiceIds.has(i.id)).map(i => i.id),
    unmatchedTransactionIds: transactions.filter(t => !matchedTransactionIds.has(t.id)).map(t => t.id),
  };
}
