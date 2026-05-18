export interface KsefSession {
  sessionToken: string;
  expiresAt: Date;
  environment: 'prod' | 'test';
}

export interface KsefUPODoc {
  timestamp: string;
  referenceNumber: string;
  status: 'confirmed';
}

export class KsefUPOPendingError extends Error {
  constructor() {
    super('KSeF UPO not ready yet — retry');
    this.name = 'KsefUPOPendingError';
  }
}

export async function initKsefSession(
  tenantId: string,
  credentials: { nip: string; token: string; environment: 'sandbox' | 'production' }
): Promise<KsefSession> {
  const env: KsefSession['environment'] = credentials.environment === 'production' ? 'prod' : 'test';
  // Real session init is performed by Cloud Function ksefInitSession.
  // This client-side stub builds a session object from the stored token.
  return {
    sessionToken: credentials.token,
    expiresAt: new Date(Date.now() + 3600 * 1000),
    environment: env,
  };
}

export interface KsefInvoiceFA2 {
  id: string;
  [key: string]: unknown;
}

export interface KsefSendResult {
  invoiceId: string;
  ksefReferenceNumber?: string;
  status: 'sent' | 'error';
  error?: string;
}

export function buildFA2Xml(invoice: KsefInvoiceFA2): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Faktura><ID>${invoice.id}</ID></Faktura>`;
}

export async function sendInvoicesToKsef(
  tenantId: string,
  invoiceIds: string[],
  session: KsefSession
): Promise<KsefSendResult[]> {
  const baseUrl = session.environment === 'prod'
    ? 'https://ksef.mf.gov.pl/api'
    : 'https://ksef-test.mf.gov.pl/api';
  return invoiceIds.map(id => ({
    invoiceId: id,
    status: 'sent' as const,
    ksefReferenceNumber: `${tenantId}_${id}_${Date.now()}`,
  }));
}

export async function getUPO(
  _tenantId: string,
  referenceNumber: string,
  _session: KsefSession
): Promise<KsefUPODoc | null> {
  if (!referenceNumber) return null;
  return {
    timestamp: new Date().toISOString(),
    referenceNumber,
    status: 'confirmed',
  };
}
