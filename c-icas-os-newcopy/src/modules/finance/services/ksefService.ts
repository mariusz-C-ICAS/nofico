/**
 * Data: 2026-05-16
 * Zmiany: Serwis KSeF MF API 2.0 — sesje, wysyłka FA(2), UPO, odbiór faktur.
 * Ścieżka: /src/modules/finance/services/ksefService.ts
 */
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------
const KSEF_SANDBOX = 'https://ksef-demo.mf.gov.pl/api';
const KSEF_PROD = 'https://ksef.mf.gov.pl/api';

function baseUrl(env: 'sandbox' | 'production'): string {
  return env === 'sandbox' ? KSEF_SANDBOX : KSEF_PROD;
}

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------
export interface KsefCredentials {
  nip: string;
  token: string;
  environment: 'sandbox' | 'production';
}

export interface KsefSession {
  sessionToken: string;
  sessionReference: string;
  expiresAt: number;
}

export interface KsefInvoiceFA2 {
  ksefReferenceNumber: string;
  faNumber: string;
  issueDate: string;
  sellerNip: string;
  sellerName: string;
  buyerNip?: string;
  buyerName: string;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  currency: string;
  invoiceHash: string;
  status: 'Approved' | 'Rejected' | 'Cancelled';
  xmlPayload?: string;
}

export interface UPODocument {
  referenceNumber: string;
  timestamp: string;
  elementReferenceNumbers: string[];
  processingCode: number;
  processingDescription: string;
}

export interface KsefSendResult {
  invoiceId: string;
  referenceNumber: string;
  status: string;
}

export interface KsefStatusResult {
  connected: boolean;
  sessionActive: boolean;
  sessionExpiresAt?: number;
}

// ---------------------------------------------------------------------------
// Custom errors
// ---------------------------------------------------------------------------
export class KsefAuthError extends Error {
  constructor(message = 'KSeF: błąd autoryzacji (401)') {
    super(message);
    this.name = 'KsefAuthError';
  }
}

export class KsefUPOPendingError extends Error {
  constructor(referenceNumber: string) {
    super(`KSeF: UPO w toku dla ${referenceNumber}`);
    this.name = 'KsefUPOPendingError';
  }
}

export class KsefApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(`KSeF API ${statusCode}: ${message}`);
    this.name = 'KsefApiError';
  }
}

// ---------------------------------------------------------------------------
// XML helpers
// ---------------------------------------------------------------------------
function escXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildFA2Xml(invoice: KsefInvoiceFA2): string {
  const now = new Date().toISOString();
  const sellerNip = escXml(invoice.sellerNip);
  const sellerName = escXml(invoice.sellerName);
  const buyerNip = escXml(invoice.buyerNip ?? '');
  const buyerName = escXml(invoice.buyerName);
  const currency = escXml(invoice.currency);
  const issueDate = escXml(invoice.issueDate);
  const faNumber = escXml(invoice.faNumber);
  const gross = invoice.grossAmount.toFixed(2);
  const net = invoice.netAmount.toFixed(2);

  return `<?xml version="1.0" encoding="UTF-8"?>
<Faktura xmlns="http://crd.gov.pl/wzor/2023/06/29/12648/" xmlns:etd="http://crd.gov.pl/xml/schematy/dziedzinowe/mf/2022/01/05/eD/DefinicjeTypy/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Naglowek>
    <KodFormularza kodSystemowy="FA (2)" wersjaSchemy="1-0E">FA</KodFormularza>
    <WariantFormularza>2</WariantFormularza>
    <DataWytworzeniaFa>${now}</DataWytworzeniaFa>
    <SystemInfo>NoFiCo v1.0</SystemInfo>
  </Naglowek>
  <Podmiot1>
    <DaneIdentyfikacyjne><NIP>${sellerNip}</NIP><Nazwa>${sellerName}</Nazwa></DaneIdentyfikacyjne>
  </Podmiot1>
  <Podmiot2>
    <DaneIdentyfikacyjne><NIP>${buyerNip}</NIP><Nazwa>${buyerName}</Nazwa></DaneIdentyfikacyjne>
  </Podmiot2>
  <Fa>
    <KodWaluty>${currency}</KodWaluty>
    <P_1>${issueDate}</P_1>
    <P_2>${faNumber}</P_2>
    <P_15>${gross}</P_15>
    <Adnotacje><P_16>2</P_16><P_17>2</P_17><P_18>2</P_18><P_18A>2</P_18A><P_23>2</P_23></Adnotacje>
    <RodzajFaktury>VAT</RodzajFaktury>
    <FaWiersze>
      <FaWiersz><NrWierszaFa>1</NrWierszaFa><P_7>Usługi</P_7><P_8A>szt.</P_8A><P_8B>1</P_8B><P_9A>${net}</P_9A><P_11>${net}</P_11><P_12>23</P_12></FaWiersz>
    </FaWiersze>
  </Fa>
</Faktura>`;
}

// ---------------------------------------------------------------------------
// UPO XML parser
// ---------------------------------------------------------------------------
function parseUpoXml(xml: string): UPODocument {
  const getText = (tag: string): string => {
    const m = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`));
    return m ? m[1].trim() : '';
  };
  const getAll = (tag: string): string[] => {
    const re = new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`, 'g');
    const results: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml)) !== null) results.push(m[1].trim());
    return results;
  };

  return {
    referenceNumber: getText('ReferenceNumber') || getText('referenceNumber'),
    timestamp: getText('Timestamp') || getText('timestamp'),
    elementReferenceNumbers: getAll('ElementReferenceNumber'),
    processingCode: parseInt(getText('ProcessingCode') || '0', 10),
    processingDescription: getText('ProcessingDescription'),
  };
}

// ---------------------------------------------------------------------------
// initKsefSession
// ---------------------------------------------------------------------------
export async function initKsefSession(
  tenantId: string,
  credentials: KsefCredentials
): Promise<KsefSession> {
  const base = baseUrl(credentials.environment);

  const response = await fetch(`${base}/online/Session/InitSigned`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${credentials.token}`,
    },
    body: JSON.stringify({
      contextIdentifier: { type: 'onip', identifier: credentials.nip },
      credentialsRoleList: [{ roleType: 'owner', roleDescription: 'Owner' }],
    }),
  });

  if (response.status === 401) throw new KsefAuthError();
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new KsefApiError(response.status, text);
  }

  const data = await response.json();
  const sessionToken: string = data.sessionToken ?? data.SessionToken ?? '';
  const sessionReference: string = data.referenceNumber ?? data.ReferenceNumber ?? '';
  // Sesje KSeF ważne ~1h; zapisujemy TTL 55 min
  const expiresAt = Date.now() + 55 * 60 * 1000;

  const session: KsefSession = { sessionToken, sessionReference, expiresAt };

  await setDoc(
    doc(db, `tenants/${tenantId}/ksefSessions/current`),
    {
      ...session,
      createdAt: serverTimestamp(),
    }
  );

  return session;
}

// ---------------------------------------------------------------------------
// buildFA2XmlForFirestoreInvoice — przekształca dokument Firestore na XML
// ---------------------------------------------------------------------------
interface FirestoreInvoice {
  id: string;
  number?: string;
  faNumber?: string;
  issueDate?: string;
  date?: string;
  sellerNip?: string;
  sellerName?: string;
  buyerNip?: string;
  buyerName?: string;
  netAmount?: number;
  net?: number;
  vatAmount?: number;
  vat?: number;
  grossAmount?: number;
  gross?: number;
  currency?: string;
  [key: string]: unknown;
}

function firestoreToFA2(raw: FirestoreInvoice): KsefInvoiceFA2 {
  return {
    ksefReferenceNumber: '',
    faNumber: raw.faNumber ?? raw.number ?? raw.id,
    issueDate: raw.issueDate ?? raw.date ?? new Date().toISOString().slice(0, 10),
    sellerNip: raw.sellerNip ?? '',
    sellerName: raw.sellerName ?? '',
    buyerNip: raw.buyerNip,
    buyerName: raw.buyerName ?? '',
    netAmount: raw.netAmount ?? raw.net ?? 0,
    vatAmount: raw.vatAmount ?? raw.vat ?? 0,
    grossAmount: raw.grossAmount ?? raw.gross ?? 0,
    currency: raw.currency ?? 'PLN',
    invoiceHash: '',
    status: 'Approved',
  };
}

// ---------------------------------------------------------------------------
// sendInvoicesToKsef
// ---------------------------------------------------------------------------
export async function sendInvoicesToKsef(
  tenantId: string,
  invoiceIds: string[],
  session: KsefSession
): Promise<KsefSendResult[]> {
  const credSnap = await getDoc(doc(db, `tenants/${tenantId}/ksefCredentials/main`));
  const cred = credSnap.data() as { environment?: string } | undefined;
  const env = (cred?.environment ?? 'sandbox') as 'sandbox' | 'production';
  const base = baseUrl(env);

  const results: KsefSendResult[] = [];

  for (const invoiceId of invoiceIds) {
    const invSnap = await getDoc(doc(db, `tenants/${tenantId}/invoices/${invoiceId}`));
    if (!invSnap.exists()) continue;

    const raw = { id: invoiceId, ...invSnap.data() } as FirestoreInvoice;
    const fa2 = firestoreToFA2(raw);
    const xml = buildFA2Xml(fa2);
    const encoded = btoa(unescape(encodeURIComponent(xml)));

    const response = await fetch(`${base}/online/Invoice/Send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Session-Token': session.sessionToken,
      },
      body: encoded,
    });

    if (response.status === 401) throw new KsefAuthError();
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new KsefApiError(response.status, text);
    }

    const data = await response.json();
    const referenceNumber: string = data.elementReferenceNumber ?? data.referenceNumber ?? '';
    const status: string = data.processingCode !== undefined ? String(data.processingCode) : 'sent';

    await updateDoc(doc(db, `tenants/${tenantId}/invoices/${invoiceId}`), {
      ksefStatus: 'sent',
      ksefReferenceNumber: referenceNumber,
      ksefSentAt: serverTimestamp(),
    });

    results.push({ invoiceId, referenceNumber, status });
  }

  return results;
}

// ---------------------------------------------------------------------------
// getUPO
// ---------------------------------------------------------------------------
export async function getUPO(
  tenantId: string,
  referenceNumber: string,
  session: KsefSession
): Promise<UPODocument> {
  const credSnap = await getDoc(doc(db, `tenants/${tenantId}/ksefCredentials/main`));
  const cred = credSnap.data() as { environment?: string } | undefined;
  const env = (cred?.environment ?? 'sandbox') as 'sandbox' | 'production';
  const base = baseUrl(env);

  const response = await fetch(`${base}/online/Invoice/GetUPO/${referenceNumber}`, {
    headers: { 'Session-Token': session.sessionToken },
  });

  if (response.status === 401) throw new KsefAuthError();
  if (response.status === 202) throw new KsefUPOPendingError(referenceNumber);
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new KsefApiError(response.status, text);
  }

  const xml = await response.text();
  if (xml.includes('Processing')) throw new KsefUPOPendingError(referenceNumber);

  return parseUpoXml(xml);
}

// ---------------------------------------------------------------------------
// fetchReceivedInvoices
// ---------------------------------------------------------------------------
export async function fetchReceivedInvoices(
  tenantId: string,
  dateFrom: string,
  dateTo: string,
  session: KsefSession
): Promise<KsefInvoiceFA2[]> {
  const credSnap = await getDoc(doc(db, `tenants/${tenantId}/ksefCredentials/main`));
  const cred = credSnap.data() as { environment?: string } | undefined;
  const env = (cred?.environment ?? 'sandbox') as 'sandbox' | 'production';
  const base = baseUrl(env);

  const response = await fetch(
    `${base}/online/Query/Invoice/Sync?PageSize=100&PageOffset=0`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Session-Token': session.sessionToken,
      },
      body: JSON.stringify({
        queryCriteria: { subjectType: 'subject2', dateFrom, dateTo },
      }),
    }
  );

  if (response.status === 401) throw new KsefAuthError();
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new KsefApiError(response.status, text);
  }

  const data = await response.json();
  const list: KsefInvoiceFA2[] = (data.invoiceHeaderList ?? []).map(
    (h: Record<string, unknown>) => ({
      ksefReferenceNumber: String(h.ksefReferenceNumber ?? ''),
      faNumber: String(h.invoiceReferenceNumber ?? h.faNumber ?? ''),
      issueDate: String(h.invoicingDate ?? h.issueDate ?? ''),
      sellerNip: String((h.subjectBy as any)?.issuedByIdentifier?.identifier ?? h.sellerNip ?? ''),
      sellerName: String((h.subjectBy as any)?.issuedByName?.tradeName ?? h.sellerName ?? ''),
      buyerNip: String((h.subjectTo as any)?.issuedToIdentifier?.identifier ?? h.buyerNip ?? ''),
      buyerName: String((h.subjectTo as any)?.issuedToName?.tradeName ?? h.buyerName ?? ''),
      netAmount: Number(h.net ?? 0),
      vatAmount: Number(h.vat ?? 0),
      grossAmount: Number(h.gross ?? 0),
      currency: String(h.currency ?? 'PLN'),
      invoiceHash: String(h.invoiceHash ?? ''),
      status: 'Approved' as const,
    })
  );

  // Synchronizacja z Firestore
  const receivedCol = collection(db, `tenants/${tenantId}/ksefReceivedInvoices`);
  for (const inv of list) {
    await setDoc(
      doc(receivedCol, inv.ksefReferenceNumber || `ksef-${Date.now()}`),
      { ...inv, syncedAt: serverTimestamp() }
    );
  }

  return list;
}

// ---------------------------------------------------------------------------
// terminateSession
// ---------------------------------------------------------------------------
export async function terminateSession(
  session: KsefSession,
  base: string
): Promise<void> {
  await fetch(`${base}/online/Session/Terminate`, {
    headers: { 'Session-Token': session.sessionToken },
  });
}

// ---------------------------------------------------------------------------
// getKsefStatus
// ---------------------------------------------------------------------------
export async function getKsefStatus(tenantId: string): Promise<KsefStatusResult> {
  try {
    const sessionSnap = await getDoc(
      doc(db, `tenants/${tenantId}/ksefSessions/current`)
    );

    let sessionActive = false;
    let sessionExpiresAt: number | undefined;

    if (sessionSnap.exists()) {
      const data = sessionSnap.data() as { expiresAt?: number };
      const exp = data.expiresAt ?? 0;
      sessionActive = exp > Date.now();
      sessionExpiresAt = exp;
    }

    const credSnap = await getDoc(
      doc(db, `tenants/${tenantId}/ksefCredentials/main`)
    );
    const cred = credSnap.data() as { environment?: string } | undefined;
    const env = (cred?.environment ?? 'sandbox') as 'sandbox' | 'production';
    const base = baseUrl(env);

    const pingResponse = await fetch(`${base}/common/Status`, {
      signal: AbortSignal.timeout(5000),
    });
    const connected = pingResponse.ok;

    return { connected, sessionActive, sessionExpiresAt };
  } catch {
    return { connected: false, sessionActive: false };
  }
}
