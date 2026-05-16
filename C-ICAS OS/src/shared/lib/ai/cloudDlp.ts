// Cloud DLP — PII detection before writing to Firestore

const FUNCTIONS_BASE = import.meta.env.VITE_FUNCTIONS_URL ?? 'https://europe-west1-cicas-os.cloudfunctions.net';

export interface DlpFinding {
  infoType: string;
  likelihood: string;
  quote: string;
}

export interface DlpResult {
  hasPii: boolean;
  findings: DlpFinding[];
  sanitized?: string;
}

export async function scanForPii(text: string, idToken?: string): Promise<DlpResult> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (idToken) headers.Authorization = `Bearer ${idToken}`;

  const res = await fetch(`${FUNCTIONS_BASE}/scanDlp`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`DLP error: ${res.status}`);
  return res.json();
}

export function quickScanPii(text: string): boolean {
  // Client-side heuristic — for non-critical fast check before API call
  const patterns = [
    /\b\d{11}\b/,          // PESEL
    /\b\d{3}-?\d{2}-?\d{4}\b/, // NIP-like
    /\b[A-Z]{2}\d{2}[\d\s]{15,25}\b/, // IBAN
  ];
  return patterns.some(p => p.test(text));
}
