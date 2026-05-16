import { db } from '../firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';

export interface PeriodCloseResult {
  valid: boolean;
  totalDebit: number;
  totalCredit: number;
  difference: number;
  unbookedCount: number;
  errors: string[];
}

export interface JournalEntry {
  id: string;
  debit: number;
  credit: number;
  status: 'DRAFT' | 'POSTED' | 'VOIDED';
  date: Timestamp;
}

export async function validatePeriodClose(
  tenantId: string,
  year: number,
  month: number
): Promise<PeriodCloseResult> {
  const start = Timestamp.fromDate(new Date(year, month - 1, 1));
  const end = Timestamp.fromDate(new Date(year, month, 1));

  const q = query(
    collection(db, `tenants/${tenantId}/journalEntries`),
    where('date', '>=', start),
    where('date', '<', end)
  );

  const snap = await getDocs(q);
  const entries = snap.docs.map(d => ({ id: d.id, ...d.data() } as JournalEntry));

  const errors: string[] = [];
  let totalDebit = 0;
  let totalCredit = 0;
  let unbookedCount = 0;

  for (const entry of entries) {
    if (entry.status === 'DRAFT') {
      unbookedCount++;
      errors.push(`Dekret ${entry.id} jest w stanie DRAFT — nie zaksięgowany`);
    }
    if (entry.status !== 'VOIDED') {
      totalDebit += entry.debit ?? 0;
      totalCredit += entry.credit ?? 0;
    }
  }

  const difference = Math.abs(totalDebit - totalCredit);
  const TOLERANCE = 0.01;

  if (difference > TOLERANCE) {
    errors.push(
      `Brak bilansowania: Wn=${totalDebit.toFixed(2)} ≠ Ma=${totalCredit.toFixed(2)} (różnica: ${difference.toFixed(2)} PLN)`
    );
  }

  if (unbookedCount > 0) {
    errors.push(`${unbookedCount} dekretów niezaksięgowanych w tym okresie`);
  }

  return {
    valid: errors.length === 0,
    totalDebit,
    totalCredit,
    difference,
    unbookedCount,
    errors,
  };
}

export async function trialBalance(
  tenantId: string,
  year: number,
  month: number
): Promise<{ account: string; debit: number; credit: number; balance: number }[]> {
  const start = Timestamp.fromDate(new Date(year, month - 1, 1));
  const end = Timestamp.fromDate(new Date(year, month, 1));

  const q = query(
    collection(db, `tenants/${tenantId}/journalEntries`),
    where('date', '>=', start),
    where('date', '<', end),
    where('status', '==', 'POSTED')
  );

  const snap = await getDocs(q);
  const accounts = new Map<string, { debit: number; credit: number }>();

  for (const d of snap.docs) {
    const entry = d.data() as JournalEntry & { account: string };
    const acc = entry.account ?? 'UNKNOWN';
    const cur = accounts.get(acc) ?? { debit: 0, credit: 0 };
    accounts.set(acc, {
      debit: cur.debit + (entry.debit ?? 0),
      credit: cur.credit + (entry.credit ?? 0),
    });
  }

  return Array.from(accounts.entries())
    .map(([account, { debit, credit }]) => ({
      account,
      debit,
      credit,
      balance: debit - credit,
    }))
    .sort((a, b) => a.account.localeCompare(b.account));
}
