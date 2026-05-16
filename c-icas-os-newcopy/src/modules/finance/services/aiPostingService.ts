/**
 * Data: 2026-05-16
 * Ścieżka: /src/modules/finance/services/aiPostingService.ts
 * AI Dekretacja — sugestie WN/MA na podstawie dokumentu + Gemini 2.0 Flash.
 */
import {
  collection, getDocs, query, orderBy, limit, where,
  doc, runTransaction, updateDoc, serverTimestamp, addDoc
} from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import { GoogleGenAI } from '@google/genai';

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface PostingEntry {
  accountCode: string;
  accountName: string;
  side: 'Wn' | 'Ma';
  amount: number;
  description: string;
}

export interface PostingSuggestion {
  entries: PostingEntry[];
  confidence: number;           // 0-100
  explanation: string;          // uzasadnienie po polsku
  documentType: 'sales_invoice' | 'purchase_invoice' | 'expense' | 'bank_transaction';
  isBalanced: boolean;          // suma Wn = suma Ma (tolerance 0.01)
}

export interface PostingPattern {
  category: string;             // kategoria dokumentu
  vendorPattern?: string;       // regex sprzedawcy
  accountPairs: Array<{
    debitCode: string;
    creditCode: string;
    label: string;
  }>;
  usageCount: number;
}

export interface PostingDocument {
  id?: string;
  type?: 'sales_invoice' | 'purchase_invoice' | 'expense' | 'bank_transaction';
  amountNet?: number;
  amountVat?: number;
  amountGross?: number;
  category?: string;
  vendor?: string;
  buyer?: string;
  nip?: string;
  date?: string;
  invoiceNumber?: string;
  description?: string;
}

interface AccountMeta {
  code: string;
  name: string;
  category?: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getApiKey(): string {
  const key = (import.meta as any).env?.VITE_GEMINI_API_KEY as string | undefined;
  if (!key) throw new Error('VITE_GEMINI_API_KEY not set');
  return key;
}

function parseJsonFromText(text: string): unknown {
  // Wyciąga blok JSON z odpowiedzi modelu (może być owinięty w markdown)
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Brak JSON w odpowiedzi Gemini');
  return JSON.parse(match[0]);
}

function checkBalance(entries: PostingEntry[]): boolean {
  const sumWn = entries.filter(e => e.side === 'Wn').reduce((s, e) => s + e.amount, 0);
  const sumMa = entries.filter(e => e.side === 'Ma').reduce((s, e) => s + e.amount, 0);
  return Math.abs(sumWn - sumMa) <= 0.01;
}

// ---------------------------------------------------------------------------
// suggestPosting
// ---------------------------------------------------------------------------

/**
 * Sugeruje dekret WN/MA dla dokumentu przy użyciu Gemini 2.0 Flash.
 * Uwzględnia historyczne wzorce oraz dostępne konta z planu kont.
 */
export async function suggestPosting(
  tenantId: string,
  document: PostingDocument,
  accountsMap: Map<string, AccountMeta>
): Promise<PostingSuggestion> {
  // 1. Historyczne dekrety — podobne dokumenty (kategoria / sprzedawca)
  const journalCol = collection(db, `tenants/${tenantId}/journals`);
  const historySnap = await getDocs(
    query(journalCol, orderBy('createdAt', 'desc'), limit(20))
  );

  const historyEntries = historySnap.docs
    .map(d => d.data())
    .filter(d => {
      const catMatch = document.category && d.category === document.category;
      const vendorMatch = document.vendor && d.vendor &&
        (d.vendor as string).toLowerCase().includes(document.vendor.toLowerCase());
      return catMatch || vendorMatch;
    })
    .slice(0, 5);

  // 2. Buduj listę kont (max 80 pozycji — nie przekraczaj okna)
  const accountsList = [...accountsMap.entries()]
    .slice(0, 80)
    .map(([, a]) => `${a.code} – ${a.name} (${a.category ?? 'inne'})`)
    .join('\n');

  // 3. Historyczne wzorce
  const historyText = historyEntries.length > 0
    ? historyEntries.map(h => {
        const items = (h.items as any[] | undefined) ?? [];
        return items
          .map((i: any) => `  ${i.accountCode} ${i.side} ${i.debit ?? i.credit} PLN`)
          .join(', ');
      }).join('\n')
    : 'Brak historii podobnych dekretów.';

  // 4. Prompt
  const prompt = `Jesteś polskim księgowym. Zaproponuj dekret (WN/MA) zgodny z Ustawą o rachunkowości (UoR).

Dane dokumentu:
- Typ: ${document.type ?? 'expense'}
- Kwota netto: ${document.amountNet ?? 0} PLN
- VAT: ${document.amountVat ?? 0} PLN
- Brutto: ${document.amountGross ?? (document.amountNet ?? 0) + (document.amountVat ?? 0)} PLN
- Kategoria: ${document.category ?? 'nieznana'}
- Sprzedawca/Nabywca: ${document.vendor ?? document.buyer ?? 'nieznany'}
- NIP: ${document.nip ?? 'brak'}
- Data: ${document.date ?? 'brak'}
- Opis: ${document.description ?? 'brak'}

Dostępny plan kont (kod – nazwa – typ):
${accountsList}

Historyczne dekrety podobnych dokumentów:
${historyText}

Odpowiedz WYŁĄCZNIE w JSON (bez markdown):
{
  "entries": [
    {"accountCode": "...", "accountName": "...", "side": "Wn"|"Ma", "amount": 0.00, "description": "..."},
    ...
  ],
  "confidence": 0-100,
  "explanation": "krótkie uzasadnienie po polsku",
  "documentType": "sales_invoice"|"purchase_invoice"|"expense"|"bank_transaction"
}`;

  // 5. Wywołanie Gemini
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [{ parts: [{ text: prompt }] }],
  });

  const raw = response.text ?? '';
  let parsed: any;
  try {
    parsed = parseJsonFromText(raw);
  } catch {
    return {
      entries: [],
      confidence: 0,
      explanation: 'Nie udało się sparsować odpowiedzi AI. Spróbuj ponownie.',
      documentType: document.type ?? 'expense',
      isBalanced: false,
    };
  }

  const entries: PostingEntry[] = (parsed.entries ?? []).map((e: any) => ({
    accountCode: String(e.accountCode ?? ''),
    accountName: String(e.accountName ?? ''),
    side: e.side === 'Ma' ? 'Ma' : 'Wn',
    amount: Number(e.amount ?? 0),
    description: String(e.description ?? ''),
  }));

  return {
    entries,
    confidence: Math.min(100, Math.max(0, Number(parsed.confidence ?? 50))),
    explanation: String(parsed.explanation ?? ''),
    documentType: parsed.documentType ?? document.type ?? 'expense',
    isBalanced: checkBalance(entries),
  };
}

// ---------------------------------------------------------------------------
// autoPostDocument
// ---------------------------------------------------------------------------

/**
 * Tworzy wpis w journals (runTransaction), aktualizuje salda kont,
 * oznacza dokument jako zaksięgowany.
 */
export async function autoPostDocument(
  tenantId: string,
  documentId: string,
  documentType: PostingDocument['type'],
  suggestion: PostingSuggestion,
  userId: string
): Promise<void> {
  if (!suggestion.isBalanced) {
    throw new Error('Dekret nie jest zbilansowany — nie można zaksięgować.');
  }

  const today = new Date().toISOString().split('T')[0];

  await runTransaction(db, async (tx) => {
    // 1. Nowy wpis w journals
    const journalRef = doc(collection(db, `tenants/${tenantId}/journals`));
    const totalWn = suggestion.entries
      .filter(e => e.side === 'Wn')
      .reduce((s, e) => s + e.amount, 0);

    tx.set(journalRef, {
      documentId,
      documentType,
      items: suggestion.entries.map(e => ({
        accountCode: e.accountCode,
        accountName: e.accountName,
        side: e.side,
        debit: e.side === 'Wn' ? e.amount : 0,
        credit: e.side === 'Ma' ? e.amount : 0,
        description: e.description,
      })),
      totalAmount: totalWn,
      aiConfidence: suggestion.confidence,
      aiExplanation: suggestion.explanation,
      status: 'posted',
      date: new Date(today),
      bookingDate: today,
      createdAt: serverTimestamp(),
      createdBy: userId,
      source: 'ai_autopost',
    });

    // 2. Aktualizuj salda kont (chartOfAccounts)
    for (const entry of suggestion.entries) {
      // Szukaj konta po kodzie
      const coaSnap = await getDocs(
        query(
          collection(db, `tenants/${tenantId}/chartOfAccounts`),
          where('code', '==', entry.accountCode),
          limit(1)
        )
      );
      if (coaSnap.empty) continue;
      const accountDoc = coaSnap.docs[0];
      const data = accountDoc.data();
      tx.update(accountDoc.ref, {
        balanceWn: (data.balanceWn ?? 0) + (entry.side === 'Wn' ? entry.amount : 0),
        balanceMa: (data.balanceMa ?? 0) + (entry.side === 'Ma' ? entry.amount : 0),
        updatedAt: serverTimestamp(),
      });
    }

    // 3. Oznacz dokument jako zaksięgowany
    const collectionName =
      documentType === 'sales_invoice' ? 'invoices' :
      documentType === 'purchase_invoice' ? 'purchaseInvoices' :
      'expenses';

    const docRef = doc(db, `tenants/${tenantId}/${collectionName}/${documentId}`);
    const bookingFields: Record<string, unknown> = {
      isBookedByAccountant: true,
      bookingDate: today,
      aiJournalId: journalRef.id,
      updatedAt: serverTimestamp(),
    };
    if (documentType === 'expense') {
      bookingFields.isBooked = true;
    }
    tx.update(docRef, bookingFields);
  });
}

// ---------------------------------------------------------------------------
// getPostingPatterns
// ---------------------------------------------------------------------------

/**
 * Analizuje historię journals (ostatnie 200) i zwraca top wzorce par kont.
 */
export async function getPostingPatterns(tenantId: string): Promise<PostingPattern[]> {
  const snap = await getDocs(
    query(
      collection(db, `tenants/${tenantId}/journals`),
      orderBy('createdAt', 'desc'),
      limit(200)
    )
  );

  // Grupuj po kategorii → zliczaj pary WN/MA
  const patternMap = new Map<string, {
    category: string;
    pairs: Map<string, number>;
    vendor?: string;
  }>();

  for (const d of snap.docs) {
    const data = d.data();
    const category = (data.category as string | undefined) ?? (data.documentType as string) ?? 'inne';
    const items: any[] = data.items ?? [];

    const wnItems = items.filter((i: any) => i.side === 'Wn');
    const maItems = items.filter((i: any) => i.side === 'Ma');

    for (const wn of wnItems) {
      for (const ma of maItems) {
        const pairKey = `${wn.accountCode}|${ma.accountCode}`;
        if (!patternMap.has(category)) {
          patternMap.set(category, { category, pairs: new Map() });
        }
        const entry = patternMap.get(category)!;
        entry.pairs.set(pairKey, (entry.pairs.get(pairKey) ?? 0) + 1);
        if (data.vendor && !entry.vendor) entry.vendor = data.vendor as string;
      }
    }
  }

  // Spłaszcz do PostingPattern[]
  const patterns: PostingPattern[] = [];
  for (const [, entry] of patternMap) {
    const sortedPairs = [...entry.pairs.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const totalCount = sortedPairs.reduce((s, [, c]) => s + c, 0);

    patterns.push({
      category: entry.category,
      vendorPattern: entry.vendor,
      accountPairs: sortedPairs.map(([key]) => {
        const [debitCode, creditCode] = key.split('|');
        return { debitCode, creditCode, label: `${debitCode} / ${creditCode}` };
      }),
      usageCount: totalCount,
    });
  }

  return patterns.sort((a, b) => b.usageCount - a.usageCount).slice(0, 20);
}
