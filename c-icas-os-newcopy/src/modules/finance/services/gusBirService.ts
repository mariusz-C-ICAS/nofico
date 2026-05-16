/**
 * Data: 2026-05-16
 * Ścieżka: /src/modules/finance/services/gusBirService.ts
 * GUS BIR API v1.1 — wyszukiwanie podmiotów po NIP (SOAP over HTTPS).
 * CORS: dual-path — Cloud Function primary, SOAP fallback z cache Firestore.
 */
import {
  doc, getDoc, setDoc, deleteDoc,
  collection, getDocs, query, where
} from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';

export interface GusCompanyData {
  nip: string;
  regon: string;
  name: string;
  shortName?: string;
  province?: string;
  city?: string;
  street?: string;
  buildingNumber?: string;
  postalCode?: string;
  pkdCode?: string;
  pkdName?: string;
  legalForm?: string;
  registrationDate?: string;
  activityStatus: 'active' | 'inactive' | 'unknown';
  fetchedAt: number;
}

export interface GusSearchResult {
  found: boolean;
  data?: GusCompanyData;
  source: 'firestore_cache' | 'api' | 'fallback';
  error?: string;
}

const GUS_SOAP_ENDPOINT =
  'https://wyszukiwarkaregon.stat.gov.pl/wsBIR/UslugaBIRzewnPubl.svc';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dni
const DEMO_KEY = 'abcde12345abcde12345';

// ─── XML helpers ─────────────────────────────────────────────────────────────

function getXmlText(doc: Document, tagName: string): string {
  return doc.getElementsByTagName(tagName)[0]?.textContent?.trim() ?? '';
}

function buildLoginEnvelope(userKey: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns="http://tempuri.org/">
  <soap:Body>
    <ns:Zaloguj><ns:pKluczUzytkownika>${userKey}</ns:pKluczUzytkownika></ns:Zaloguj>
  </soap:Body>
</soap:Envelope>`;
}

function buildSearchEnvelope(nip: string, sid: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns="http://tempuri.org/">
  <soap:Header>
    <ns:sid>${sid}</ns:sid>
  </soap:Header>
  <soap:Body>
    <ns:DaneSzukajPodmioty>
      <ns:pParametryWyszukiwania>
        <ns:Nip>${nip}</ns:Nip>
      </ns:pParametryWyszukiwania>
    </ns:DaneSzukajPodmioty>
  </soap:Body>
</soap:Envelope>`;
}

// ─── XML response parser ──────────────────────────────────────────────────────

export function parseGusXmlResponse(xml: string): GusCompanyData | null {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xml, 'text/xml');

    // Sprawdź błędy parsowania
    if (xmlDoc.getElementsByTagName('parsererror').length > 0) return null;

    // Wyciągnij element <dane> lub szukaj pól bezpośrednio
    const nip = getXmlText(xmlDoc, 'Nip') || getXmlText(xmlDoc, 'NIP');
    if (!nip) return null;

    const statusText = getXmlText(xmlDoc, 'StatusDzialnosciKod') ||
      getXmlText(xmlDoc, 'StatusDzialalnosciKod');

    let activityStatus: GusCompanyData['activityStatus'] = 'unknown';
    if (statusText === '1') activityStatus = 'active';
    else if (statusText === '2' || statusText === '3') activityStatus = 'inactive';

    return {
      nip,
      regon: getXmlText(xmlDoc, 'Regon') || getXmlText(xmlDoc, 'REGON'),
      name: getXmlText(xmlDoc, 'Nazwa'),
      shortName: getXmlText(xmlDoc, 'NazwaSkrocona') || undefined,
      province: getXmlText(xmlDoc, 'Wojewodztwo') || undefined,
      city: getXmlText(xmlDoc, 'Miejscowosc') || undefined,
      street: getXmlText(xmlDoc, 'Ulica') || undefined,
      buildingNumber: getXmlText(xmlDoc, 'NrNieruchomosci') || undefined,
      postalCode: getXmlText(xmlDoc, 'KodPocztowy') || undefined,
      pkdCode: getXmlText(xmlDoc, 'PkdKod') || undefined,
      pkdName: getXmlText(xmlDoc, 'PkdNazwa') || undefined,
      legalForm: getXmlText(xmlDoc, 'FormaWlasnosci') || getXmlText(xmlDoc, 'FormaPrawna') || undefined,
      registrationDate: getXmlText(xmlDoc, 'DataRejestracji') || undefined,
      activityStatus,
      fetchedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

// ─── Firestore cache ──────────────────────────────────────────────────────────

async function readCache(
  tenantId: string,
  nip: string
): Promise<GusCompanyData | null> {
  try {
    const ref = doc(db, `tenants/${tenantId}/gusCacheByNip/${nip}`);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data() as GusCompanyData;
    if (Date.now() - data.fetchedAt > CACHE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

async function writeCache(
  tenantId: string,
  data: GusCompanyData
): Promise<void> {
  try {
    const ref = doc(db, `tenants/${tenantId}/gusCacheByNip/${data.nip}`);
    await setDoc(ref, data);
  } catch {
    // cache write failure is non-fatal
  }
}

// ─── Cloud Function path ──────────────────────────────────────────────────────

async function tryCloudFunction(
  nip: string,
  userKey?: string
): Promise<GusCompanyData | null> {
  try {
    const res = await fetch('/api/gus/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nip, key: userKey }),
    });
    if (!res.ok) return null;
    const json = await res.json() as { data?: GusCompanyData };
    return json.data ?? null;
  } catch {
    return null;
  }
}

// ─── SOAP fallback ────────────────────────────────────────────────────────────

async function soapFetch(envelope: string, soapAction: string): Promise<string> {
  const res = await fetch(GUS_SOAP_ENDPOINT, {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'text/xml;charset=UTF-8',
      SOAPAction: soapAction,
    },
    body: envelope,
  });
  // no-cors zwraca opaque response — text() rzuci lub zwróci ''
  try {
    return await res.text();
  } catch {
    return '';
  }
}

async function tryDirectSoap(
  nip: string,
  userKey: string
): Promise<GusCompanyData | null> {
  try {
    // Krok 1: Zaloguj → SID
    const loginXml = await soapFetch(
      buildLoginEnvelope(userKey),
      'http://tempuri.org/UslugaBIRzewnPubl/Zaloguj'
    );
    if (!loginXml) return null;

    const parser = new DOMParser();
    const loginDoc = parser.parseFromString(loginXml, 'text/xml');
    const sid =
      loginDoc.getElementsByTagName('ZalogujResult')[0]?.textContent?.trim();
    if (!sid) return null;

    // Krok 2: DaneSzukajPodmioty
    const searchXml = await soapFetch(
      buildSearchEnvelope(nip, sid),
      'http://tempuri.org/UslugaBIRzewnPubl/DaneSzukajPodmioty'
    );
    if (!searchXml) return null;

    return parseGusXmlResponse(searchXml);
  } catch {
    return null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Wyszukuje dane firmy po NIP z GUS BIR API.
 * Kolejność: Firestore cache → Cloud Function → SOAP fallback.
 */
export async function searchByNip(
  nip: string,
  tenantId: string,
  userKey?: string
): Promise<GusSearchResult> {
  const cleanNip = nip.replace(/[-\s]/g, '');

  // 1. Cache Firestore
  const cached = await readCache(tenantId, cleanNip);
  if (cached) {
    return { found: true, data: cached, source: 'firestore_cache' };
  }

  // 2. Cloud Function
  const cfData = await tryCloudFunction(cleanNip, userKey);
  if (cfData) {
    cfData.fetchedAt = Date.now();
    await writeCache(tenantId, cfData);
    return { found: true, data: cfData, source: 'api' };
  }

  // 3. SOAP fallback
  const key = userKey ?? DEMO_KEY;
  const soapData = await tryDirectSoap(cleanNip, key);
  if (soapData) {
    await writeCache(tenantId, soapData);
    return { found: true, data: soapData, source: 'fallback' };
  }

  return {
    found: false,
    source: 'fallback',
    error: 'Nie znaleziono podmiotu w GUS lub brak dostępu do API (CORS)',
  };
}

/**
 * Czyści cache GUS BIR.
 * Bez NIP: usuwa wpisy starsze niż 7 dni.
 * Z NIP: usuwa konkretny wpis.
 */
export async function clearGusCache(
  tenantId: string,
  nip?: string
): Promise<void> {
  if (nip) {
    const cleanNip = nip.replace(/[-\s]/g, '');
    await deleteDoc(doc(db, `tenants/${tenantId}/gusCacheByNip/${cleanNip}`));
    return;
  }

  const colRef = collection(db, `tenants/${tenantId}/gusCacheByNip`);
  const cutoff = Date.now() - CACHE_TTL_MS;
  const q = query(colRef, where('fetchedAt', '<', cutoff));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
}
