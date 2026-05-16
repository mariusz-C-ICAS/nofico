/**
 * Data: 2026-05-16
 * Ścieżka: /src/modules/finance/services/bialaListaService.ts
 * Biała Lista MF — weryfikacja VAT i rachunków bankowych.
 * REST API: https://wl-api.mf.gov.pl/
 * Cache globalny (nie per-tenant): globalCache/bialaListaNip/{nip}
 */
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';

export interface BialaListaResult {
  nip: string;
  found: boolean;
  isActiveVatPayer: boolean;
  hasValidBankAccount: boolean;
  bankAccounts?: string[];
  registrationDate?: string;
  requestId: string;
  requestDate: string;
  source: 'api' | 'firestore_cache';
}

export interface BankAccountCheckResult {
  nip: string;
  accountNumber: string;
  isOnWhitelist: boolean;
  companyName?: string;
  requestId: string;
}

const BL_BASE = 'https://wl-api.mf.gov.pl/api';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

// ─── helpers ──────────────────────────────────────────────────────────────────

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function cleanAccount(raw: string): string {
  return raw.replace(/[\s\-]/g, '');
}

function errorResult(nip: string): BialaListaResult {
  return {
    nip,
    found: false,
    isActiveVatPayer: false,
    hasValidBankAccount: false,
    requestId: 'error',
    requestDate: todayIso(),
    source: 'api',
  };
}

// ─── Firestore cache ──────────────────────────────────────────────────────────

interface CacheEntry extends BialaListaResult {
  cachedAt: number;
}

async function readCache(nip: string): Promise<BialaListaResult | null> {
  try {
    const ref = doc(db, `globalCache/bialaListaNip/${nip}`);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const entry = snap.data() as CacheEntry;
    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) return null;
    const { cachedAt: _, ...result } = entry;
    return result as BialaListaResult;
  } catch {
    return null;
  }
}

async function writeCache(result: BialaListaResult): Promise<void> {
  try {
    const ref = doc(db, `globalCache/bialaListaNip/${result.nip}`);
    await setDoc(ref, { ...result, cachedAt: Date.now() });
  } catch {
    // non-fatal
  }
}

// ─── API response mapper ──────────────────────────────────────────────────────

interface BlSubject {
  name?: string;
  nip?: string;
  statusVat?: string;
  registrationLegalDate?: string;
  bankAccounts?: Array<{ accountNumber?: string }>;
}

interface BlApiResponse {
  result?: {
    subject?: BlSubject;
    requestId?: string;
    requestDateTime?: string;
  };
}

function mapSubject(
  nip: string,
  subject: BlSubject | undefined,
  requestId: string,
  requestDate: string
): BialaListaResult {
  if (!subject) {
    return {
      nip,
      found: false,
      isActiveVatPayer: false,
      hasValidBankAccount: false,
      requestId,
      requestDate,
      source: 'api',
    };
  }

  const accounts = (subject.bankAccounts ?? [])
    .map(a => a.accountNumber ?? '')
    .filter(Boolean);

  return {
    nip,
    found: true,
    isActiveVatPayer: subject.statusVat === 'Czynny',
    hasValidBankAccount: accounts.length > 0,
    bankAccounts: accounts.length > 0 ? accounts : undefined,
    registrationDate: subject.registrationLegalDate ?? undefined,
    requestId,
    requestDate,
    source: 'api',
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Sprawdza NIP na Białej Liście MF.
 * Cache 24h w Firestore (globalny, nie per-tenant).
 * Przy błędzie CORS/network NIE rzuca — zwraca neutralny wynik.
 */
export async function checkNipOnBialaLista(
  nip: string,
  date?: string
): Promise<BialaListaResult> {
  const cleanNip = nip.replace(/[-\s]/g, '');
  const checkDate = date ?? todayIso();

  // Cache
  const cached = await readCache(cleanNip);
  if (cached) return { ...cached, source: 'firestore_cache' };

  try {
    const url = `${BL_BASE}/search/nip/${cleanNip}?date=${checkDate}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      const fallback = errorResult(cleanNip);
      fallback.requestDate = checkDate;
      return fallback;
    }

    const json = (await res.json()) as BlApiResponse;
    const requestId = json.result?.requestId ?? 'unknown';
    const requestDate = json.result?.requestDateTime?.slice(0, 10) ?? checkDate;
    const result = mapSubject(cleanNip, json.result?.subject, requestId, requestDate);

    await writeCache(result);
    return result;
  } catch {
    return errorResult(cleanNip);
  }
}

/**
 * Sprawdza, czy konkretny rachunek bankowy należy do podmiotu na BL.
 */
export async function checkBankAccount(
  nip: string,
  accountNumber: string,
  date?: string
): Promise<BankAccountCheckResult> {
  const cleanNip = nip.replace(/[-\s]/g, '');
  const account = cleanAccount(accountNumber);
  const checkDate = date ?? todayIso();

  try {
    const url = `${BL_BASE}/check/nip/${cleanNip}/bank-account/${account}?date=${checkDate}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });

    if (!res.ok) {
      return {
        nip: cleanNip,
        accountNumber: account,
        isOnWhitelist: false,
        requestId: 'error',
      };
    }

    const json = (await res.json()) as {
      result?: {
        accountAssigned?: string;
        subject?: { name?: string };
        requestId?: string;
      };
    };

    return {
      nip: cleanNip,
      accountNumber: account,
      isOnWhitelist: json.result?.accountAssigned === 'TAK',
      companyName: json.result?.subject?.name ?? undefined,
      requestId: json.result?.requestId ?? 'unknown',
    };
  } catch {
    return {
      nip: cleanNip,
      accountNumber: account,
      isOnWhitelist: false,
      requestId: 'error',
    };
  }
}

/**
 * Masowe sprawdzenie NIPów (chunki po 30, limit API).
 */
export async function batchCheckNips(
  nips: string[]
): Promise<Map<string, BialaListaResult>> {
  const results = new Map<string, BialaListaResult>();
  const checkDate = todayIso();
  const CHUNK = 30;

  for (let i = 0; i < nips.length; i += CHUNK) {
    const chunk = nips.slice(i, i + CHUNK).map(n => n.replace(/[-\s]/g, ''));

    try {
      const url = `${BL_BASE}/search/nips/${chunk.join(',')}?date=${checkDate}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });

      if (!res.ok) {
        chunk.forEach(nip => results.set(nip, errorResult(nip)));
        continue;
      }

      const json = (await res.json()) as {
        result?: {
          subjects?: Array<BlSubject & { nip?: string }>;
          requestId?: string;
          requestDateTime?: string;
        };
      };

      const requestId = json.result?.requestId ?? 'unknown';
      const requestDate = json.result?.requestDateTime?.slice(0, 10) ?? checkDate;

      // Zbierz znalezione NIPy
      const foundNips = new Set<string>();
      for (const subject of json.result?.subjects ?? []) {
        const subjectNip = subject.nip ?? '';
        if (!subjectNip) continue;
        const mapped = mapSubject(subjectNip, subject, requestId, requestDate);
        results.set(subjectNip, mapped);
        foundNips.add(subjectNip);
        writeCache(mapped); // fire-and-forget
      }

      // NIPy nieznalezione → not found
      chunk
        .filter(n => !foundNips.has(n))
        .forEach(nip => {
          const notFound: BialaListaResult = {
            nip,
            found: false,
            isActiveVatPayer: false,
            hasValidBankAccount: false,
            requestId,
            requestDate,
            source: 'api',
          };
          results.set(nip, notFound);
        });
    } catch {
      chunk.forEach(nip => results.set(nip, errorResult(nip)));
    }
  }

  return results;
}
