import { db } from '../../../lib/firebase';
import { collection, writeBatch, doc, Timestamp } from 'firebase/firestore';
import type { CompanyProfile, IdesGenerationResult } from '../types';

const VENDORS    = ['Allegro Business', 'Media Expert', 'Orlen', 'PKP Intercity', 'UPC Polska', 'T-Mobile', 'Google Workspace', 'Microsoft 365', 'PZU', 'mBank'];
const CATEGORIES = ['IT', 'OFFICE', 'TRAVEL', 'MARKETING', 'UTILITIES', 'SERVICES', 'RENT'];
const VAT_RATES  = [0.23, 0.08, 0.05, 0];
const ITEM_NAMES = ['Usluga konsultingowa', 'Dostawa towaru', 'Wdrozenie systemu', 'Abonament miesieczny', 'Szkolenie', 'Serwis IT', 'Najem powierzchni', 'Dostawa sprzetu'];

function rnd(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function pastTs(monthsAgo: number, dayOffset = 0): Timestamp {
  const d = new Date(Date.now() - monthsAgo * 30 * 24 * 3600 * 1000 + dayOffset * 24 * 3600 * 1000);
  return Timestamp.fromDate(d);
}
function mockNip(): string {
  return Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join('');
}
function invoiceNumber(monthsAgo: number, idx: number): string {
  const d = new Date(Date.now() - monthsAgo * 30 * 24 * 3600 * 1000);
  return `FV/${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(idx + 1).padStart(3, '0')}`;
}

export async function generateFinance(profile: CompanyProfile): Promise<IdesGenerationResult> {
  const { tenantId, employeeCount, generateMonths } = profile;
  let created = 0;

  const invoicesPerMonth = Math.max(5, Math.round(employeeCount / 4));
  const expensesPerMonth = Math.max(8, Math.round(employeeCount / 3));

  // Sales invoices — month by month
  for (let m = generateMonths; m >= 0; m--) {
    const count = m === 0 ? Math.round(invoicesPerMonth / 2) : invoicesPerMonth;
    for (let b = 0; b < count; b += 400) {
      const batch = writeBatch(db);
      const end = Math.min(b + 400, count);
      for (let i = b; i < end; i++) {
        const issueDate = pastTs(m, -rnd(0, 20));
        const netAmount = rnd(500, 50000);
        const vatRate   = pick(VAT_RATES);
        const vatAmount = Math.round(netAmount * vatRate);
        const ref = doc(collection(db, `tenants/${tenantId}/invoices`));
        batch.set(ref, {
          tenantId,
          number:      invoiceNumber(m, i),
          issueDate,
          dueDate:     pastTs(m, -rnd(0, 20) + 14),
          clientName:  `Klient ${rnd(1, 99)} Sp. z o.o.`,
          clientNip:   mockNip(),
          netAmount,
          vatRate:     Math.round(vatRate * 100),
          vatAmount,
          grossAmount: netAmount + vatAmount,
          status:      m > 2 ? 'PAID' : pick(['PAID', 'PAID', 'PENDING', 'OVERDUE']),
          currency:    'PLN',
          items: [{ name: pick(ITEM_NAMES), qty: rnd(1, 5), unitPrice: Math.round(netAmount / rnd(1, 3)), netAmount }],
          createdAt:   issueDate,
          _ides: true,
        });
        created++;
      }
      await batch.commit();
    }
  }

  // Expenses
  for (let m = generateMonths; m >= 0; m--) {
    const count = m === 0 ? Math.round(expensesPerMonth / 2) : expensesPerMonth;
    for (let b = 0; b < count; b += 400) {
      const batch = writeBatch(db);
      const end = Math.min(b + 400, count);
      for (let i = b; i < end; i++) {
        const netAmount = rnd(100, 15000);
        const vatRate   = pick(VAT_RATES);
        const vatAmount = Math.round(netAmount * vatRate);
        const expDate   = pastTs(m, -rnd(0, 25));
        const ref = doc(collection(db, `tenants/${tenantId}/expenses`));
        batch.set(ref, {
          tenantId,
          vendor:      pick(VENDORS),
          category:    pick(CATEGORIES),
          description: `Zakup - ${pick(ITEM_NAMES)}`,
          date:        expDate,
          netAmount,
          vatAmount,
          grossAmount: netAmount + vatAmount,
          currency:    'PLN',
          status:      'APPROVED',
          createdAt:   expDate,
          _ides: true,
        });
        created++;
      }
      await batch.commit();
    }
  }

  return { module: 'finance', created, errors: 0 };
}
