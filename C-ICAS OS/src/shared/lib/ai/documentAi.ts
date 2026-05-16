// Document AI — calls Cloud Function proxy (server-side @google-cloud/documentai)

const FUNCTIONS_BASE = import.meta.env.VITE_FUNCTIONS_URL ?? 'https://europe-west1-cicas-os.cloudfunctions.net';

export interface DocumentAiResult {
  text: string;
  entities: Array<{ type: string; mentionText: string; confidence: number }>;
  nip?: string;
  pesel?: string;
  invoiceNumber?: string;
  totalAmount?: number;
  issueDate?: string;
}

export async function processInvoiceOcr(
  base64File: string,
  mimeType: string,
  idToken: string
): Promise<DocumentAiResult> {
  const res = await fetch(`${FUNCTIONS_BASE}/processDocumentAi`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ base64File, mimeType }),
  });
  if (!res.ok) throw new Error(`Document AI error: ${res.status}`);
  return res.json();
}
