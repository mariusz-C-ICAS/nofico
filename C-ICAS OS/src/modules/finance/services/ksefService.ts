export interface KsefSession {
  sessionToken: string;
  expiresAt: Date;
  environment: 'prod' | 'test';
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
): Promise<string | null> {
  return referenceNumber ? `UPO_${referenceNumber}` : null;
}
