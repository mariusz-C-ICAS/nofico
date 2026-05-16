/**
 * Data: 2026-05-15
 * Zmiany: Serwis do importu wyciągów bankowych (MT940, ELIXIR CSV, Generic CSV) z AI enhancement.
 * Ścieżka: /src/modules/finance/services/bankImportService.ts
 */
import { askAI } from '../../../shared/services/geminiService';
import type { Currency } from './transactionService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ParsedTransaction {
  date: string; // ISO YYYY-MM-DD
  amount: number; // positive=incoming, negative=outgoing
  currency: Currency;
  counterpartName: string;
  counterpartIban?: string;
  title: string;
  reference?: string;
  aiCategory?: string;
  aiDuplicate?: boolean;
  rawLine?: string;
}

export interface CSVColumnMapping {
  dateCol: number;
  amountCol: number;
  counterpartNameCol?: number;
  counterpartIbanCol?: number;
  titleCol?: number;
  referenceCol?: number;
  currencyCol?: number;
  delimiter?: ',' | ';' | '\t';
  dateFormat?: 'YYYY-MM-DD' | 'DD.MM.YYYY' | 'DD/MM/YYYY';
}

// ─── Format detection ─────────────────────────────────────────────────────────

/**
 * Auto-detect file format based on content markers.
 */
export function detectFormat(
  content: string
): 'mt940' | 'csv_elixir' | 'csv_generic' | 'unknown' {
  const firstLines = content.slice(0, 500);

  // MT940 always starts with :20: or :01:
  if (/^:20:/m.test(firstLines) || /^:01:/m.test(firstLines)) {
    return 'mt940';
  }

  // ELIXIR has fixed column header pattern
  if (
    /data operacji/i.test(firstLines) &&
    /kwota/i.test(firstLines) &&
    /rachunek/i.test(firstLines)
  ) {
    return 'csv_elixir';
  }

  // If it has CSV structure with semicolons or commas, treat as generic
  const lines = content.split('\n').filter((l) => l.trim());
  if (lines.length > 1) {
    const sep = lines[0].includes(';') ? ';' : ',';
    const colCount = lines[0].split(sep).length;
    if (colCount >= 3) return 'csv_generic';
  }

  return 'unknown';
}

// ─── Date parsing helpers ─────────────────────────────────────────────────────

function parseDateToISO(
  raw: string,
  fmt: CSVColumnMapping['dateFormat'] = 'YYYY-MM-DD'
): string {
  raw = raw.trim();
  if (fmt === 'DD.MM.YYYY') {
    const [d, m, y] = raw.split('.');
    return `${y}-${m?.padStart(2, '0')}-${d?.padStart(2, '0')}`;
  }
  if (fmt === 'DD/MM/YYYY') {
    const [d, m, y] = raw.split('/');
    return `${y}-${m?.padStart(2, '0')}-${d?.padStart(2, '0')}`;
  }
  // MT940 date: YYMMDD
  if (/^\d{6}$/.test(raw)) {
    const yy = raw.slice(0, 2);
    const mm = raw.slice(2, 4);
    const dd = raw.slice(4, 6);
    const year = parseInt(yy) > 50 ? `19${yy}` : `20${yy}`;
    return `${year}-${mm}-${dd}`;
  }
  return raw; // assume already ISO
}

function parseAmount(raw: string): number {
  // Handle Polish decimal format (comma as decimal separator)
  return parseFloat(raw.replace(/\s/g, '').replace(',', '.'));
}

// ─── MT940 Parser ─────────────────────────────────────────────────────────────

/**
 * Parse MT940 bank statement format (PKO BP, Pekao, mBank, ING, etc.)
 */
export function parseMT940(content: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  // Split into transaction blocks by :61:
  const blocks = content.split(/(?=:61:)/);

  for (const block of blocks) {
    const line61 = block.match(/:61:(\d{6})(\d{4})?(C|D|RD|RC)(\d+,\d+)([A-Z]{4})?([^\n]*)/);
    if (!line61) continue;

    const rawDate = line61[1]; // YYMMDD
    const creditDebit = line61[3]; // C = credit (incoming), D = debit (outgoing)
    const rawAmount = line61[4]; // e.g. 1234,56
    const currency: Currency = 'PLN'; // MT940 currency from :32A: field

    // Try to get currency from :32A:
    const line32 = block.match(/:32A:\d{6}([A-Z]{3})/);
    const resolvedCurrency: Currency = line32
      ? (line32[1] as Currency)
      : currency;

    const amount = parseAmount(rawAmount);
    const signedAmount = creditDebit.startsWith('C') ? amount : -amount;
    const date = parseDateToISO(rawDate);

    // Extract :86: for counterpart and title
    const line86 = block.match(/:86:([\s\S]*?)(?=:\d\d[A-Z]?:|$)/);
    const details = line86 ? line86[1].replace(/\n/g, ' ').trim() : '';

    // Try to extract IBAN from details (26 chars starting with 2 letters + digits)
    const ibanMatch = details.match(/[A-Z]{2}\d{2}[A-Z0-9]{10,28}/);
    const counterpartIban = ibanMatch ? ibanMatch[0] : undefined;

    // Counterpart name — usually after IBAN or at start of details
    const counterpartName = extractMT940Counterpart(details, counterpartIban);
    const title = details.replace(counterpartIban ?? '', '').trim();

    transactions.push({
      date,
      amount: signedAmount,
      currency: resolvedCurrency,
      counterpartName: counterpartName || 'NIEZNANY',
      counterpartIban,
      title: title.slice(0, 140),
      rawLine: block.slice(0, 200),
    });
  }

  return transactions;
}

function extractMT940Counterpart(details: string, iban?: string): string {
  let d = iban ? details.replace(iban, '') : details;
  // Common MT940 field markers: /NAME/, /REMI/, etc.
  const nameMatch = d.match(/\/NAME\/(.*?)(?:\/|$)/i);
  if (nameMatch) return nameMatch[1].trim();
  // Fallback: first 50 non-digit chars
  const fallback = d.replace(/\d/g, ' ').trim().slice(0, 50);
  return fallback || 'NIEZNANY';
}

// ─── ELIXIR CSV Parser ────────────────────────────────────────────────────────

/**
 * Parse Polish ELIXIR CSV format.
 * Columns: date, amount, counterpart_account, counterpart_name, title, reference, type
 */
export function parseCSVElixir(content: string): ParsedTransaction[] {
  const lines = content.split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Detect delimiter
  const sep = lines[0].includes(';') ? ';' : ',';
  const transactions: ParsedTransaction[] = [];

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i], sep);
    if (cols.length < 4) continue;

    const rawDate = cols[0]?.trim() ?? '';
    const rawAmount = cols[1]?.trim() ?? '0';
    const counterpartIban = cols[2]?.trim() || undefined;
    const counterpartName = cols[3]?.trim() ?? 'NIEZNANY';
    const title = cols[4]?.trim() ?? '';
    const reference = cols[5]?.trim() || undefined;

    const date = parseDateToISO(rawDate, detectDateFormat(rawDate));
    const amount = parseAmount(rawAmount);

    if (!date || isNaN(amount)) continue;

    transactions.push({
      date,
      amount,
      currency: 'PLN',
      counterpartName,
      counterpartIban,
      title,
      reference,
      rawLine: lines[i].slice(0, 200),
    });
  }

  return transactions;
}

// ─── Generic CSV Parser ───────────────────────────────────────────────────────

/**
 * Flexible CSV parser with user-defined or auto-detected column mapping.
 */
export function parseGenericCSV(
  content: string,
  mapping?: CSVColumnMapping
): ParsedTransaction[] {
  const lines = content.split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];

  const sep = mapping?.delimiter ?? detectDelimiter(lines[0]);
  const resolvedMapping = mapping ?? autoDetectCSVMapping(lines[0], sep);
  const transactions: ParsedTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i], sep);

    const rawDate = cols[resolvedMapping.dateCol]?.trim() ?? '';
    const rawAmount = cols[resolvedMapping.amountCol]?.trim() ?? '0';
    const counterpartName =
      resolvedMapping.counterpartNameCol !== undefined
        ? (cols[resolvedMapping.counterpartNameCol]?.trim() ?? 'NIEZNANY')
        : 'NIEZNANY';
    const counterpartIban =
      resolvedMapping.counterpartIbanCol !== undefined
        ? cols[resolvedMapping.counterpartIbanCol]?.trim() || undefined
        : undefined;
    const title =
      resolvedMapping.titleCol !== undefined
        ? (cols[resolvedMapping.titleCol]?.trim() ?? '')
        : '';
    const reference =
      resolvedMapping.referenceCol !== undefined
        ? cols[resolvedMapping.referenceCol]?.trim() || undefined
        : undefined;
    const rawCurrency =
      resolvedMapping.currencyCol !== undefined
        ? cols[resolvedMapping.currencyCol]?.trim()
        : undefined;
    const currency: Currency = isValidCurrency(rawCurrency) ? rawCurrency : 'PLN';

    const date = parseDateToISO(rawDate, resolvedMapping.dateFormat);
    const amount = parseAmount(rawAmount);

    if (!date || isNaN(amount)) continue;

    transactions.push({
      date,
      amount,
      currency,
      counterpartName,
      counterpartIban,
      title,
      reference,
      rawLine: lines[i].slice(0, 200),
    });
  }

  return transactions;
}

// ─── AI Enhancement ───────────────────────────────────────────────────────────

/**
 * Send parsed transactions to Gemini AI for enhancement:
 * - Fill missing counterpart names from IBAN/reference
 * - Suggest Polish accounting categories
 * - Detect potential duplicates
 */
export async function aiEnhanceTransactions(
  transactions: ParsedTransaction[]
): Promise<ParsedTransaction[]> {
  if (transactions.length === 0) return transactions;

  const payload = transactions.map((tx, idx) => ({
    idx,
    date: tx.date,
    amount: tx.amount,
    counterpartName: tx.counterpartName,
    counterpartIban: tx.counterpartIban,
    title: tx.title,
    reference: tx.reference,
  }));

  const prompt = `
Jesteś asystentem księgowym w Polsce. Masz listę transakcji bankowych do wzbogacenia.
Dla każdej transakcji:
1. Jeśli counterpartName to "NIEZNANY", spróbuj odgadnąć nazwę na podstawie IBAN lub tytułu
2. Zaproponuj kategorię: Paliwo, Abonament, Marketing, Podróże, Zakupy, Media, Wynagrodzenia, Podatki, Ubezpieczenia, Inne
3. Wykryj potencjalne duplikaty (ten sam idx pojawi się w tablicy duplicateIdxs)

Odpowiedz WYŁĄCZNIE jako JSON bez markdown:
{
  "enhanced": [{"idx":0,"counterpartName":"...","aiCategory":"..."}],
  "duplicateIdxs": [1, 3]
}

Transakcje:
${JSON.stringify(payload, null, 2)}
`;

  const raw = await askAI(prompt);

  interface AIEnhancedResponse {
    enhanced: { idx: number; counterpartName: string; aiCategory: string }[];
    duplicateIdxs: number[];
  }

  let parsed: AIEnhancedResponse | null = null;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]) as AIEnhancedResponse;
    }
  } catch {
    console.error('aiEnhanceTransactions: failed to parse AI response');
    return transactions;
  }

  if (!parsed) return transactions;

  const duplicateSet = new Set<number>(parsed.duplicateIdxs ?? []);
  const result = transactions.map((tx, idx) => {
    const enhancement = parsed!.enhanced?.find((e) => e.idx === idx);
    return {
      ...tx,
      counterpartName:
        enhancement?.counterpartName && enhancement.counterpartName !== 'NIEZNANY'
          ? enhancement.counterpartName
          : tx.counterpartName,
      aiCategory: enhancement?.aiCategory ?? tx.aiCategory,
      aiDuplicate: duplicateSet.has(idx),
    };
  });

  return result;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function detectDelimiter(line: string): ',' | ';' | '\t' {
  const counts = {
    ',': (line.match(/,/g) ?? []).length,
    ';': (line.match(/;/g) ?? []).length,
    '\t': (line.match(/\t/g) ?? []).length,
  };
  if (counts[';'] >= counts[','] && counts[';'] >= counts['\t']) return ';';
  if (counts['\t'] >= counts[',']) return '\t';
  return ',';
}

function detectDateFormat(raw: string): CSVColumnMapping['dateFormat'] {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return 'YYYY-MM-DD';
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(raw)) return 'DD.MM.YYYY';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return 'DD/MM/YYYY';
  return 'YYYY-MM-DD';
}

function splitCSVLine(line: string, sep: string): string[] {
  // Handle quoted fields
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === sep && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function autoDetectCSVMapping(header: string, sep: string): CSVColumnMapping {
  const cols = header.toLowerCase().split(sep);
  const find = (...terms: string[]) =>
    cols.findIndex((c) => terms.some((t) => c.includes(t)));

  return {
    dateCol: find('data', 'date') >= 0 ? find('data', 'date') : 0,
    amountCol: find('kwota', 'amount', 'suma') >= 0 ? find('kwota', 'amount', 'suma') : 1,
    counterpartNameCol: find('kontrahent', 'counterpart', 'nazwa') >= 0
      ? find('kontrahent', 'counterpart', 'nazwa')
      : undefined,
    counterpartIbanCol: find('iban', 'rachunek', 'account') >= 0
      ? find('iban', 'rachunek', 'account')
      : undefined,
    titleCol: find('tytuł', 'tytul', 'title', 'opis') >= 0
      ? find('tytuł', 'tytul', 'title', 'opis')
      : undefined,
    referenceCol: find('ref', 'referencja') >= 0
      ? find('ref', 'referencja')
      : undefined,
    currencyCol: find('waluta', 'currency') >= 0
      ? find('waluta', 'currency')
      : undefined,
    delimiter: sep as CSVColumnMapping['delimiter'],
  };
}

function isValidCurrency(val: string | undefined): val is Currency {
  return ['PLN', 'EUR', 'USD', 'GBP', 'CHF'].includes(val ?? '');
}
