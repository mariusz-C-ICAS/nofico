/**
 * Data: 2026-05-19
 * Zmiany: Serwis rekoncyliacji — dopasowywanie transakcji bankowych do faktur.
 * Ścieżka: /src/modules/finance/services/reconciliationService.ts
 */
import { db } from '../../../shared/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import type { SalesInvoice } from '../types/fiTypes';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BankTransaction {
  id: string;
  transactionId: string;
  accountId: string;
  tenantId: string;
  bookingDate: string;
  amount: number;
  currency: string;
  counterpartName: string;
  description: string;
  source: string;
}

export interface ReconciliationMatch {
  transaction: BankTransaction;
  invoice: SalesInvoice;
  confidence: number;
  matchReasons: string[];
}

export interface ReconciliationResult {
  matched: ReconciliationMatch[];
  unmatched: {
    transactions: BankTransaction[];
    invoices: SalesInvoice[];
  };
}

// ─── Fuzzy match ──────────────────────────────────────────────────────────────

/**
 * Prosta miara podobienstwa Jaro-Winkler uproszczona do naszych potrzeb.
 * Zwraca 0..1.
 */
function fuzzyScore(a: string, b: string): number {
  if (!a || !b) return 0;
  const na = a.toLowerCase().trim();
  const nb = b.toLowerCase().trim();
  if (na === nb) return 1;

  // Sprawdz czy jeden zawiera drugi
  if (na.includes(nb) || nb.includes(na)) return 0.85;

  // Tokenizacja + pokrycie slow
  const tokensA = new Set(na.split(/\s+/));
  const tokensB = new Set(nb.split(/\s+/));
  let common = 0;
  tokensA.forEach((t) => { if (tokensB.has(t)) common++; });
  const union = tokensA.size + tokensB.size - common;
  return union > 0 ? common / union : 0;
}

function daysDiff(dateA: string, dateB: string): number {
  const a = new Date(dateA).getTime();
  const b = new Date(dateB).getTime();
  return Math.abs(Math.round((a - b) / 86_400_000));
}

// ─── Core reconciliation logic ────────────────────────────────────────────────

function tryMatch(
  tx: BankTransaction,
  invoice: SalesInvoice
): ReconciliationMatch | null {
  const reasons: string[] = [];
  let score = 0;

  // 1. Kwota — ± 0.01
  const invoiceAmount = invoice.totalBrutto ?? 0;
  if (Math.abs(tx.amount - invoiceAmount) <= 0.01) {
    score += 0.5;
    reasons.push('kwota');
  } else {
    // Kwota musi pasować — twarda reguła
    return null;
  }

  // 2. Data — ± 3 dni
  const dueDate = invoice.dueDate ?? invoice.issueDate;
  if (dueDate && daysDiff(tx.bookingDate, dueDate) <= 3) {
    score += 0.3;
    reasons.push('data');
  }

  // 3. Nazwa kontrahenta — fuzzy
  const buyerName = invoice.buyer?.name ?? '';
  const nameScore = fuzzyScore(tx.counterpartName, buyerName);
  if (nameScore >= 0.6) {
    score += nameScore * 0.2;
    reasons.push(`kontrahent (${Math.round(nameScore * 100)}%)`);
  }

  if (score < 0.5) return null;

  return {
    transaction: tx,
    invoice,
    confidence: Math.min(score, 1),
    matchReasons: reasons,
  };
}

// ─── Main function ────────────────────────────────────────────────────────────

export async function reconcileTransactions(
  tenantId: string,
  accountId: string,
  dateFrom: string,
  dateTo: string
): Promise<ReconciliationResult> {
  const [transactions, invoices] = await Promise.all([
    fetchTransactions(tenantId, accountId, dateFrom, dateTo),
    fetchUnpaidInvoices(tenantId),
  ]);

  const matched: ReconciliationMatch[] = [];
  const usedTxIds = new Set<string>();
  const usedInvoiceIds = new Set<string>();

  // Dla kazdej transakcji szukamy najlepszego dopasowania
  for (const tx of transactions) {
    let bestMatch: ReconciliationMatch | null = null;

    for (const inv of invoices) {
      if (usedInvoiceIds.has(inv.id ?? '')) continue;

      const match = tryMatch(tx, inv);
      if (!match) continue;

      if (!bestMatch || match.confidence > bestMatch.confidence) {
        bestMatch = match;
      }
    }

    if (bestMatch) {
      matched.push(bestMatch);
      usedTxIds.add(tx.id);
      usedInvoiceIds.add(bestMatch.invoice.id ?? '');
    }
  }

  return {
    matched,
    unmatched: {
      transactions: transactions.filter((tx) => !usedTxIds.has(tx.id)),
      invoices: invoices.filter((inv) => !usedInvoiceIds.has(inv.id ?? '')),
    },
  };
}

// ─── Approve match ────────────────────────────────────────────────────────────

/**
 * Zatwierdza dopasowanie: ustawia paidAt + paymentRef na fakturze.
 */
export async function approveMatch(
  tenantId: string,
  match: ReconciliationMatch
): Promise<void> {
  const invoiceId = match.invoice.id;
  if (!invoiceId) throw new Error('Brak ID faktury.');

  const ref = doc(db, 'tenants', tenantId, 'invoices', invoiceId);
  await updateDoc(ref, {
    paidAt: match.transaction.bookingDate,
    paymentRef: match.transaction.transactionId,
    status: 'paid',
    paidAmount: match.invoice.totalBrutto ?? 0,
    remainingAmount: 0,
    updatedAt: serverTimestamp(),
  });
}

export async function approveAllMatches(
  tenantId: string,
  matches: ReconciliationMatch[]
): Promise<number> {
  await Promise.all(matches.map((m) => approveMatch(tenantId, m)));
  return matches.length;
}

// ─── Firestore queries ────────────────────────────────────────────────────────

async function fetchTransactions(
  tenantId: string,
  accountId: string,
  dateFrom: string,
  dateTo: string
): Promise<BankTransaction[]> {
  const col = collection(db, `bank_transactions/${tenantId}/items`);
  const q = query(
    col,
    where('accountId', '==', accountId),
    where('bookingDate', '>=', dateFrom),
    where('bookingDate', '<=', dateTo)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as BankTransaction));
}

async function fetchUnpaidInvoices(tenantId: string): Promise<SalesInvoice[]> {
  const col = collection(db, 'tenants', tenantId, 'invoices');
  const q = query(
    col,
    where('isDeleted', '==', false),
    where('status', 'in', ['sent', 'issued', 'partially_paid'])
  );
  const snap = await getDocs(q);
  // Zwroc tylko te bez paidAt
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as SalesInvoice))
    .filter((inv) => !('paidAt' in inv && inv.paidAt));
}
