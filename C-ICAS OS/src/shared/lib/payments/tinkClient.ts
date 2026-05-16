// Tink/Nordigen PSD2 — allowed exception for EU Open Banking

const FUNCTIONS_BASE = import.meta.env.VITE_FUNCTIONS_URL ?? 'https://europe-west1-cicas-os.cloudfunctions.net';

export interface BankAccount {
  id: string;
  iban?: string;
  name: string;
  currency: string;
  balance: number;
  institution: string;
}

export interface BankTransaction {
  id: string;
  bookingDate: string;
  valueDate?: string;
  amount: number;
  currency: string;
  description: string;
  creditorName?: string;
  debtorName?: string;
}

export async function initTinkSession(tenantId: string, idToken: string): Promise<string> {
  const res = await fetch(`${FUNCTIONS_BASE}/tinkInitSession`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ tenantId }),
  });
  if (!res.ok) throw new Error(`Tink session error: ${res.status}`);
  const data = await res.json() as any;
  return data.link;
}

export async function getBankAccounts(tenantId: string, idToken: string): Promise<BankAccount[]> {
  const res = await fetch(`${FUNCTIONS_BASE}/tinkAccounts?tenantId=${encodeURIComponent(tenantId)}`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) throw new Error(`Tink accounts error: ${res.status}`);
  return res.json();
}

export async function getBankTransactions(
  accountId: string,
  dateFrom: string,
  dateTo: string,
  idToken: string
): Promise<BankTransaction[]> {
  const params = new URLSearchParams({ accountId, dateFrom, dateTo });
  const res = await fetch(`${FUNCTIONS_BASE}/tinkTransactions?${params}`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) throw new Error(`Tink transactions error: ${res.status}`);
  return res.json();
}
