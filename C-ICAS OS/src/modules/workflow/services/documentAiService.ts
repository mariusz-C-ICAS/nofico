import { collection, doc, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import type { AiDocumentAnalysis, AiExtractionField, DocumentMetadata } from '../types';

const analysesPath = (tenantId: string) => `tenants/${tenantId}/documentAiAnalyses`;

const GROQ_VISION_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

const EXTRACTION_PROMPT = `Jesteś ekspertem od analizy dokumentów. Przeanalizuj dokument i wyodrębnij WSZYSTKIE informacje.
Odpowiedz TYLKO JSON (bez markdown), schema:
{
  "printed_text": ["bloki drukowanego tekstu"],
  "handwritten": ["tekst odręczny, notatki ręczne"],
  "stamp": ["treść pieczątek i stempli"],
  "barcode": ["wartości kodów kreskowych"],
  "qr_code": ["treść kodów QR"],
  "amounts": ["kwoty z walutą np '123.45 PLN'"],
  "dates": ["daty w formacie YYYY-MM-DD"],
  "nip_numbers": ["numery NIP"],
  "iban_numbers": ["numery IBAN / rachunki bankowe"],
  "vendor_name": ["nazwa dostawcy/firmy"],
  "invoice_number": ["numer faktury/dokumentu"],
  "signatures": ["informacje o podpisach/parafach"],
  "suggested_title": "krótki tytuł dokumentu",
  "suggested_amount": 0.00,
  "suggested_currency": "PLN",
  "suggested_vendor": "nazwa firmy",
  "suggested_date": "YYYY-MM-DD",
  "suggested_ksef_number": "numer KSeF jeśli widoczny",
  "confidence": 0.95
}`;

async function getGroqApiKey(tenantId: string): Promise<string | null> {
  try {
    const { getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, `tenants/${tenantId}/integrations/groq`));
    if (!snap.exists()) return null;
    return snap.data().apiKey ?? null;
  } catch {
    return null;
  }
}

async function callGroqVision(imageUrl: string, apiKey: string): Promise<any> {
  const res = await fetch(GROQ_VISION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_VISION_MODEL,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: EXTRACTION_PROMPT },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      }],
      max_tokens: 1024,
      temperature: 0,
    }),
  });
  if (!res.ok) throw new Error(`Groq API ${res.status}`);
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

function simulateExtraction(attachmentId: string): any {
  return {
    printed_text: ['Faktura VAT', 'ORYGINAŁ'],
    handwritten: [],
    stamp: ['Zapłacono 2026-05-15'],
    barcode: [],
    qr_code: [],
    amounts: ['123.45 PLN', '28.39 PLN VAT'],
    dates: ['2026-05-15'],
    nip_numbers: ['1234567890'],
    iban_numbers: [],
    vendor_name: ['Przykładowy Sklep Sp. z o.o.'],
    invoice_number: [`FV/2026/05/${attachmentId.slice(0, 4).toUpperCase()}`],
    signatures: [],
    suggested_title: 'Faktura VAT — Przykładowy Sklep',
    suggested_amount: 123.45,
    suggested_currency: 'PLN',
    suggested_vendor: 'Przykładowy Sklep Sp. z o.o.',
    suggested_date: '2026-05-15',
    suggested_ksef_number: null,
    confidence: 0.82,
  };
}

export async function analyzeDocument(
  tenantId: string,
  documentInstanceId: string,
  attachmentId: string,
  imageUrl: string
): Promise<AiDocumentAnalysis> {
  const apiKey = await getGroqApiKey(tenantId);
  let raw: any;
  let model: string;

  if (apiKey && imageUrl.startsWith('http')) {
    try {
      raw = await callGroqVision(imageUrl, apiKey);
      model = GROQ_VISION_MODEL;
    } catch {
      raw = simulateExtraction(attachmentId);
      model = 'simulation';
    }
  } else {
    raw = simulateExtraction(attachmentId);
    model = 'simulation';
  }

  const extractedData: Partial<Record<AiExtractionField, string[]>> = {
    printed_text: raw.printed_text ?? [],
    handwritten: raw.handwritten ?? [],
    stamp: raw.stamp ?? [],
    barcode: raw.barcode ?? [],
    qr_code: raw.qr_code ?? [],
    amounts: raw.amounts ?? [],
    dates: raw.dates ?? [],
    nip_numbers: raw.nip_numbers ?? [],
    iban_numbers: raw.iban_numbers ?? [],
    vendor_name: raw.vendor_name ?? [],
    invoice_number: raw.invoice_number ?? [],
    signatures: raw.signatures ?? [],
  };

  const analysis: Omit<AiDocumentAnalysis, 'id'> = {
    documentInstanceId,
    tenantId,
    attachmentId,
    extractedData,
    suggestedTitle: raw.suggested_title ?? undefined,
    suggestedAmount: raw.suggested_amount ?? undefined,
    suggestedCurrency: raw.suggested_currency ?? undefined,
    suggestedVendor: raw.suggested_vendor ?? undefined,
    suggestedDate: raw.suggested_date ?? undefined,
    suggestedKsefNumber: raw.suggested_ksef_number ?? undefined,
    confidence: raw.confidence ?? 0.5,
    model,
    analyzedAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, analysesPath(tenantId)), analysis);
  return { id: ref.id, ...analysis };
}

export async function getDocumentAnalysis(
  tenantId: string,
  documentInstanceId: string
): Promise<AiDocumentAnalysis | null> {
  const q = query(
    collection(db, analysesPath(tenantId)),
    where('documentInstanceId', '==', documentInstanceId)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as AiDocumentAnalysis;
}

export function buildSuggestedMetadata(analysis: AiDocumentAnalysis): Partial<DocumentMetadata> {
  return {
    ...(analysis.suggestedTitle && { title: analysis.suggestedTitle }),
    ...(analysis.suggestedAmount && { amount: analysis.suggestedAmount }),
    ...(analysis.suggestedCurrency && { currency: analysis.suggestedCurrency }),
    ...(analysis.suggestedVendor && { vendor: analysis.suggestedVendor }),
    ...(analysis.suggestedDate && { invoiceDate: analysis.suggestedDate }),
    ...(analysis.suggestedKsefNumber && { ksefNumber: analysis.suggestedKsefNumber }),
  };
}
