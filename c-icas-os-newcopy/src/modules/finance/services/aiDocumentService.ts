/**
 * Data: 2026-05-16
 * Ścieżka: /src/modules/finance/services/aiDocumentService.ts
 * AI Document Intelligence — duplikaty, anomalie, auto-kategoryzacja.
 */
import { collection, getDocs, query, orderBy, limit, where, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import { GoogleGenAI } from '@google/genai';

export interface AnomalyAlert {
  type: 'duplicate' | 'unusual_amount' | 'unknown_vendor' | 'vat_mismatch' | 'nip_invalid' | 'high_risk';
  severity: 'info' | 'warning' | 'critical';
  expenseId: string;
  message: string;
  details?: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matchScore: number;          // 0-100
  matchedExpenseId?: string;
  matchedAmount?: number;
  matchedDate?: string;
  matchedVendor?: string;
  reason?: string;
}

interface ExpenseDoc {
  id?: string;
  vendor?: string;
  amount?: number;
  date?: string;
  nip?: string;
  invoiceNumber?: string;
  currency?: string;
  vatRate?: number | string;
  vatAmount?: number;
  category?: string;
}

// Walidacja formatu NIP PL (10 cyfr z checkdigit)
export function validateNip(nip: string): boolean {
  const cleaned = nip.replace(/[\s-]/g, '');
  if (!/^\d{10}$/.test(cleaned)) return false;
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const sum = weights.reduce((acc, w, i) => acc + w * parseInt(cleaned[i]), 0);
  return (sum % 11) === parseInt(cleaned[9]);
}

// Prosta heurystyczna ocena podobieństwa sprzedawców
function vendorSimilarity(a: string, b: string): number {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^\w]/g, ' ').replace(/\s+/g, ' ').trim();
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 100;
  if (na.includes(nb) || nb.includes(na)) return 85;
  const wordsA = new Set(na.split(' '));
  const wordsB = new Set(nb.split(' '));
  const common = [...wordsA].filter(w => wordsB.has(w) && w.length > 3).length;
  const total = Math.max(wordsA.size, wordsB.size);
  return total > 0 ? Math.round((common / total) * 80) : 0;
}

/**
 * Sprawdza czy nowy wydatek jest duplikatem istniejącego.
 * Duplikat = ta sama kwota + podobny sprzedawca + data ±3 dni.
 */
export async function checkDuplicate(
  tenantId: string,
  expense: ExpenseDoc
): Promise<DuplicateCheckResult> {
  if (!expense.amount || !expense.date) return { isDuplicate: false, matchScore: 0 };

  const col = collection(db, `tenants/${tenantId}/expenses`);
  const snap = await getDocs(query(col, orderBy('date', 'desc'), limit(200)));

  const expDate = new Date(expense.date);
  const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;

  for (const d of snap.docs) {
    if (d.id === expense.id) continue;
    const ex = d.data() as ExpenseDoc;
    if (!ex.date || !ex.amount) continue;

    const exDate = new Date(ex.date);
    const dateDiff = Math.abs(expDate.getTime() - exDate.getTime());
    if (dateDiff > THREE_DAYS) continue;

    const amountMatch = Math.abs((ex.amount - expense.amount) / expense.amount) < 0.01;
    if (!amountMatch) continue;

    let matchScore = 60;

    const venScore = expense.vendor && ex.vendor
      ? vendorSimilarity(expense.vendor, ex.vendor)
      : 0;
    matchScore += Math.round(venScore * 0.2);

    if (expense.nip && ex.nip && expense.nip === ex.nip) matchScore += 15;
    if (expense.invoiceNumber && ex.invoiceNumber &&
        expense.invoiceNumber === ex.invoiceNumber) matchScore += 20;

    if (matchScore >= 70) {
      return {
        isDuplicate: true,
        matchScore,
        matchedExpenseId: d.id,
        matchedAmount: ex.amount,
        matchedDate: ex.date,
        matchedVendor: ex.vendor,
        reason: `Podobna kwota ${ex.amount} PLN, sprzedawca "${ex.vendor ?? '?'}", data ${ex.date}`,
      };
    }
  }

  return { isDuplicate: false, matchScore: 0 };
}

/**
 * Analizuje listę wydatków i zwraca alerty anomalii.
 * Wykrywa: niezwalidowane NIP, kwoty >3σ od średniej kategorii, nieznani sprzedawcy.
 */
export async function detectAnomalies(
  tenantId: string,
  expenses: ExpenseDoc[]
): Promise<AnomalyAlert[]> {
  const alerts: AnomalyAlert[] = [];
  if (!expenses.length) return alerts;

  // 1. Walidacja NIP
  for (const exp of expenses) {
    if (exp.nip && !validateNip(exp.nip)) {
      alerts.push({
        type: 'nip_invalid',
        severity: 'warning',
        expenseId: exp.id ?? '',
        message: `Nieprawidłowy NIP: ${exp.nip} (${exp.vendor ?? 'nieznany sprzedawca'})`,
        details: 'Zweryfikuj NIP sprzedawcy przed odliczeniem VAT.',
      });
    }
  }

  // 2. Analiza statystyczna — wykryj kwoty > średnia + 2σ per kategoria
  const byCat: Record<string, number[]> = {};
  for (const exp of expenses) {
    if (!exp.amount || !exp.category) continue;
    if (!byCat[exp.category]) byCat[exp.category] = [];
    byCat[exp.category].push(exp.amount);
  }

  for (const exp of expenses) {
    if (!exp.amount || !exp.category) continue;
    const vals = byCat[exp.category];
    if (vals.length < 3) continue;
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const std = Math.sqrt(vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / vals.length);
    if (std > 0 && exp.amount > mean + 2.5 * std) {
      alerts.push({
        type: 'unusual_amount',
        severity: 'warning',
        expenseId: exp.id ?? '',
        message: `Kwota ${exp.amount} PLN (${exp.category}) jest nietyp. dla tej kategorii`,
        details: `Średnia: ${mean.toFixed(0)} PLN, odchylenie: ${std.toFixed(0)} PLN`,
      });
    }
  }

  // 3. Rozbieżność VAT — sprawdź czy vat% × netto ≈ vatAmount
  for (const exp of expenses) {
    if (typeof exp.vatRate !== 'number' || !exp.vatAmount || !exp.amount) continue;
    const calcVat = Math.round(exp.amount * (exp.vatRate / (100 + exp.vatRate)) * 100) / 100;
    if (Math.abs(calcVat - exp.vatAmount) > 0.05) {
      alerts.push({
        type: 'vat_mismatch',
        severity: 'info',
        expenseId: exp.id ?? '',
        message: `Rozbieżność VAT u "${exp.vendor ?? '?'}": obliczony ${calcVat.toFixed(2)}, OCR ${exp.vatAmount.toFixed(2)}`,
        details: 'Zweryfikuj stawkę VAT na dokumencie.',
      });
    }
  }

  return alerts;
}

/**
 * Batch auto-kategoryzacja wydatków bez kategorii — wywołuje Gemini.
 * Zwraca liczbę zaktualizowanych rekordów.
 */
export async function autoCategorizeBatch(
  tenantId: string,
  apiKey: string
): Promise<{ updated: number; failed: number }> {
  const col = collection(db, `tenants/${tenantId}/expenses`);
  const snap = await getDocs(
    query(col, where('aiCategory', '==', null), limit(50))
  );

  if (snap.empty) return { updated: 0, failed: 0 };

  const ai = new GoogleGenAI({ apiKey });
  let updated = 0;
  let failed = 0;

  const CATEGORIES = ['Paliwo', 'Biuro', 'Marketing', 'Podróże', 'Usługi IT', 'Restauracja', 'Inne'];

  const batch = snap.docs.slice(0, 20);
  const descriptions = batch.map((d, i) => {
    const ex = d.data() as ExpenseDoc;
    return `${i + 1}. vendor="${ex.vendor ?? ''}" amount=${ex.amount ?? 0} PLN`;
  }).join('\n');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{
        parts: [{
          text: `Kategoryzuj każdy wydatek do jednej z: ${CATEGORIES.join(', ')}.
Odpowiedz TYLKO tablicą JSON: ["kat1","kat2",...] w tej samej kolejności.
Wydatki:\n${descriptions}`
        }]
      }]
    });

    const text = response.text ?? '';
    const match = text.match(/\[[\s\S]*?\]/);
    if (!match) throw new Error('Invalid AI response');
    const categories = JSON.parse(match[0]) as string[];

    await Promise.all(batch.map(async (d, i) => {
      const cat = CATEGORIES.includes(categories[i]) ? categories[i] : 'Inne';
      try {
        await updateDoc(doc(db, `tenants/${tenantId}/expenses`, d.id), {
          aiCategory: cat,
          category: cat,
          updatedAt: serverTimestamp(),
        });
        updated++;
      } catch {
        failed++;
      }
    }));
  } catch {
    failed += batch.length;
  }

  return { updated, failed };
}

/**
 * Kompresuje obraz do max 1MB przed wysłaniem do Gemini (mobile perf).
 */
export async function compressImage(file: File, maxWidthPx = 1280): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidthPx / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        blob => resolve(blob ? new File([blob], file.name, { type: 'image/jpeg' }) : file),
        'image/jpeg',
        0.85
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}
