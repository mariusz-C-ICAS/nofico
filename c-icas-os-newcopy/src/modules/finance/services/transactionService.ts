/**
 * Data: 2026-05-15
 * Zmiany: Firestore service dla transakcji bankowych z AI auto-matchingiem.
 * Ścieżka: /src/modules/finance/services/transactionService.ts
 */
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  query,
  orderBy,
  where,
  getDocs,
  Timestamp,
  writeBatch,
  getDoc,
  Query,
  DocumentData,
} from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import { askAI } from '../../../shared/services/geminiService';

// ─── Types ────────────────────────────────────────────────────────────────────

export type BankTransactionStatus =
  | 'unmatched'
  | 'suggested'
  | 'matched'
  | 'manual'
  | 'ignored';

export type Currency = 'PLN' | 'EUR' | 'USD' | 'GBP' | 'CHF';

export interface BankTransaction {
  id?: string;
  tenantId: string;
  bankAccountId: string;
  date: string;
  bookingDate?: string;
  amount: number; // positive=incoming, negative=outgoing
  currency: Currency;
  amountInPln?: number;
  counterpartName: string;
  counterpartIban?: string;
  title: string;
  reference?: string;
  status: BankTransactionStatus;
  matchedInvoiceId?: string;
  matchedInvoiceNumber?: string;
  matchScore?: number;
  isSplit: boolean;
  splits?: {
    id: string;
    amount: number;
    category: string;
    costCenterId?: string;
    note?: string;
  }[];
  category?: string;
  costCenterId?: string;
  projectId?: string;
  source: 'psd2' | 'mt940' | 'csv_elixir' | 'csv_generic' | 'manual';
  importBatchId?: string;
  aiCategory?: string;
  aiTags?: string[];
  isBooked: boolean;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface TransactionFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: BankTransactionStatus;
  bankAccountId?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
}

export interface TransactionSummary {
  totalIncoming: number;
  totalOutgoing: number;
  uncategorizedCount: number;
  unmatchedCount: number;
}

interface AISuggestion {
  txId: string;
  suggestedInvoicePattern: string;
  confidence: number;
  reasoning: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function txCol(tenantId: string) {
  return collection(db, `tenants/${tenantId}/bankTransactions`);
}

function txDoc(tenantId: string, txId: string) {
  return doc(db, `tenants/${tenantId}/bankTransactions/${txId}`);
}

function now() {
  return Timestamp.now();
}

/** Simple hash for dedup: date + amount + counterpartName */
function txHash(date: string, amount: number, counterpartName: string): string {
  return `${date}__${amount}__${counterpartName.toLowerCase().trim()}`;
}

// ─── Real-time listener ───────────────────────────────────────────────────────

/**
 * Subscribe to bank transactions with optional filters.
 * Returns unsubscribe function.
 */
export function getTransactionsListener(
  tenantId: string,
  filters: TransactionFilters,
  callback: (transactions: BankTransaction[]) => void
): () => void {
  let q: Query<DocumentData> = query(txCol(tenantId), orderBy('date', 'desc'));

  if (filters.bankAccountId) {
    q = query(q, where('bankAccountId', '==', filters.bankAccountId));
  }
  if (filters.status) {
    q = query(q, where('status', '==', filters.status));
  }
  if (filters.dateFrom) {
    q = query(q, where('date', '>=', filters.dateFrom));
  }
  if (filters.dateTo) {
    q = query(q, where('date', '<=', filters.dateTo));
  }

  return onSnapshot(q, (snap) => {
    let transactions: BankTransaction[] = snap.docs.map((d) => ({
      ...(d.data() as Omit<BankTransaction, 'id'>),
      id: d.id,
    }));

    // Client-side filters (search, amount range)
    if (filters.search) {
      const term = filters.search.toLowerCase();
      transactions = transactions.filter(
        (tx) =>
          tx.counterpartName.toLowerCase().includes(term) ||
          tx.title.toLowerCase().includes(term)
      );
    }
    if (filters.minAmount !== undefined) {
      transactions = transactions.filter((tx) => tx.amount >= filters.minAmount!);
    }
    if (filters.maxAmount !== undefined) {
      transactions = transactions.filter((tx) => tx.amount <= filters.maxAmount!);
    }

    callback(transactions);
  });
}

// ─── Match / Unmatch / Ignore ─────────────────────────────────────────────────

export async function matchTransaction(
  tenantId: string,
  txId: string,
  invoiceId: string,
  invoiceNumber: string
): Promise<void> {
  await updateDoc(txDoc(tenantId, txId), {
    status: 'matched' as BankTransactionStatus,
    matchedInvoiceId: invoiceId,
    matchedInvoiceNumber: invoiceNumber,
    updatedAt: now(),
  });
}

export async function unmatchTransaction(
  tenantId: string,
  txId: string
): Promise<void> {
  await updateDoc(txDoc(tenantId, txId), {
    status: 'unmatched' as BankTransactionStatus,
    matchedInvoiceId: null,
    matchedInvoiceNumber: null,
    matchScore: null,
    updatedAt: now(),
  });
}

export async function ignoreTransaction(
  tenantId: string,
  txId: string
): Promise<void> {
  await updateDoc(txDoc(tenantId, txId), {
    status: 'ignored' as BankTransactionStatus,
    updatedAt: now(),
  });
}

// ─── AI Auto-Match ────────────────────────────────────────────────────────────

/**
 * Send unmatched transactions to Gemini and get match suggestions.
 * Updates Firestore with matchScore + matchedInvoiceNumber (status='suggested').
 * Returns number of suggestions applied.
 */
export async function aiAutoMatch(
  tenantId: string,
  transactions: BankTransaction[]
): Promise<number> {
  const unmatched = transactions.filter(
    (tx) => tx.status === 'unmatched' && tx.id
  );
  if (unmatched.length === 0) return 0;

  const payload = unmatched.map((tx) => ({
    txId: tx.id,
    counterpartName: tx.counterpartName,
    title: tx.title,
    amount: tx.amount,
    date: tx.date,
  }));

  const prompt = `
Jesteś asystentem księgowym. Poniżej masz listę nieodpasowanych transakcji bankowych.
Dla każdej transakcji zaproponuj numer faktury lub wzorzec faktury, który prawdopodobnie jej odpowiada.
Odpowiedz WYŁĄCZNIE jako tablica JSON bez żadnego markdown, np.:
[{"txId":"abc","suggestedInvoicePattern":"FV/2026/05","confidence":92,"reasoning":"Kwota i kontrahent pasują"}]

Transakcje:
${JSON.stringify(payload, null, 2)}
`;

  const raw = await askAI(prompt);

  let suggestions: AISuggestion[] = [];
  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      suggestions = JSON.parse(jsonMatch[0]) as AISuggestion[];
    }
  } catch {
    console.error('aiAutoMatch: failed to parse AI response', raw);
    return 0;
  }

  const batch = writeBatch(db);
  let count = 0;

  for (const suggestion of suggestions) {
    if (!suggestion.txId || suggestion.confidence < 50) continue;
    const ref = txDoc(tenantId, suggestion.txId);
    batch.update(ref, {
      status: 'suggested' as BankTransactionStatus,
      matchedInvoiceNumber: suggestion.suggestedInvoicePattern,
      matchScore: suggestion.confidence,
      updatedAt: now(),
    });
    count++;
  }

  if (count > 0) await batch.commit();
  return count;
}

// ─── Categorize ───────────────────────────────────────────────────────────────

export async function categorizeTransaction(
  tenantId: string,
  txId: string,
  category: string,
  costCenterId?: string
): Promise<void> {
  const data: Record<string, unknown> = {
    category,
    updatedAt: now(),
  };
  if (costCenterId) data.costCenterId = costCenterId;

  await updateDoc(txDoc(tenantId, txId), data);
}

// ─── Split ────────────────────────────────────────────────────────────────────

export async function splitTransaction(
  tenantId: string,
  txId: string,
  splits: BankTransaction['splits']
): Promise<void> {
  await updateDoc(txDoc(tenantId, txId), {
    isSplit: true,
    splits,
    updatedAt: now(),
  });
}

// ─── Summary ──────────────────────────────────────────────────────────────────

export async function getTransactionSummary(
  tenantId: string,
  dateFrom: string,
  dateTo: string
): Promise<TransactionSummary> {
  const q = query(
    txCol(tenantId),
    where('date', '>=', dateFrom),
    where('date', '<=', dateTo)
  );

  const snap = await getDocs(q);
  let totalIncoming = 0;
  let totalOutgoing = 0;
  let uncategorizedCount = 0;
  let unmatchedCount = 0;

  snap.docs.forEach((d) => {
    const tx = d.data() as BankTransaction;
    if (tx.amount > 0) totalIncoming += tx.amount;
    else totalOutgoing += Math.abs(tx.amount);
    if (!tx.category) uncategorizedCount++;
    if (tx.status === 'unmatched') unmatchedCount++;
  });

  return { totalIncoming, totalOutgoing, uncategorizedCount, unmatchedCount };
}

// ─── Import ───────────────────────────────────────────────────────────────────

/**
 * Batch-import transactions with deduplication by date+amount+counterpart hash.
 * Returns count of newly added transactions.
 */
export async function importTransactions(
  tenantId: string,
  bankAccountId: string,
  transactions: Omit<
    BankTransaction,
    'id' | 'tenantId' | 'bankAccountId' | 'status' | 'isSplit' | 'isBooked' | 'createdAt' | 'updatedAt'
  >[]
): Promise<number> {
  // Fetch existing hashes to avoid duplicates
  const existingSnap = await getDocs(
    query(txCol(tenantId), where('bankAccountId', '==', bankAccountId))
  );
  const existingHashes = new Set<string>();
  existingSnap.docs.forEach((d) => {
    const tx = d.data() as BankTransaction;
    existingHashes.add(txHash(tx.date, tx.amount, tx.counterpartName));
  });

  const ts = now();
  let count = 0;
  const col = txCol(tenantId);

  for (const tx of transactions) {
    const hash = txHash(tx.date, tx.amount, tx.counterpartName);
    if (existingHashes.has(hash)) continue;

    await addDoc(col, {
      ...tx,
      tenantId,
      bankAccountId,
      status: 'unmatched' as BankTransactionStatus,
      isSplit: false,
      isBooked: false,
      createdAt: ts,
      updatedAt: ts,
    });
    existingHashes.add(hash);
    count++;
  }

  return count;
}

// ─── Get single transaction ───────────────────────────────────────────────────

export async function getTransaction(
  tenantId: string,
  txId: string
): Promise<BankTransaction | null> {
  const snap = await getDoc(txDoc(tenantId, txId));
  if (!snap.exists()) return null;
  return { ...(snap.data() as Omit<BankTransaction, 'id'>), id: snap.id };
}
