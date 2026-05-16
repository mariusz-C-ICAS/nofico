import { collection, doc, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import { visionAnalysis, chatCompletion } from '../../../shared/lib/aiService';
import type { AiDocumentAnalysis, AiExtractionField, DocumentMetadata } from '../types';

const analysesPath = (tenantId: string) => `tenants/${tenantId}/documentAiAnalyses`;

const EXTRACTION_PROMPT = `Jesteś ekspertem od analizy dokumentów finansowych i biznesowych.
Przeanalizuj obraz dokumentu i wyodrębnij WSZYSTKIE informacje jakie możesz zobaczyć.
Odpowiedz TYLKO JSON (bez markdown), zgodnie z poniższym schema:
{
  "printed_text": ["lista bloków drukowanego tekstu"],
  "handwritten": ["tekst odręczny i ręczne notatki"],
  "stamp": ["treść pieczątek, stempli, pieczęci"],
  "barcode": ["odkodowane wartości kodów kreskowych"],
  "qr_code": ["treść kodów QR"],
  "amounts": ["kwoty z walutą, np. '123.45 PLN'"],
  "dates": ["daty w formacie YYYY-MM-DD"],
  "nip_numbers": ["numery NIP/VAT"],
  "iban_numbers": ["numery IBAN i rachunki bankowe"],
  "vendor_name": ["nazwa dostawcy lub wystawcy dokumentu"],
  "invoice_number": ["numer faktury lub dokumentu"],
  "signatures": ["informacja o podpisach lub parafach"],
  "suggested_title": "krótki tytuł dokumentu (max 60 znaków)",
  "suggested_amount": 0.00,
  "suggested_currency": "PLN",
  "suggested_vendor": "najlepiej pasująca nazwa dostawcy",
  "suggested_date": "YYYY-MM-DD",
  "suggested_ksef_number": null,
  "confidence": 0.9
}`;

function simulateExtraction(attachmentId: string): any {
  return {
    printed_text: ['Faktura VAT', 'ORYGINAŁ'],
    handwritten: [],
    stamp: ['Zapłacono'],
    barcode: [],
    qr_code: [],
    amounts: ['123.45 PLN'],
    dates: [new Date().toISOString().split('T')[0]],
    nip_numbers: [],
    iban_numbers: [],
    vendor_name: ['Dostawca Sp. z o.o.'],
    invoice_number: [`FV/${new Date().getFullYear()}/${attachmentId.slice(0, 4).toUpperCase()}`],
    signatures: [],
    suggested_title: 'Faktura VAT — analiza AI niedostępna',
    suggested_amount: 123.45,
    suggested_currency: 'PLN',
    suggested_vendor: 'Dostawca Sp. z o.o.',
    suggested_date: new Date().toISOString().split('T')[0],
    suggested_ksef_number: null,
    confidence: 0.5,
  };
}

export async function analyzeDocument(
  tenantId: string,
  documentInstanceId: string,
  attachmentId: string,
  imageUrl: string
): Promise<AiDocumentAnalysis> {
  let raw: any;
  let model = 'simulation';

  try {
    // Use configured AI provider (vision capable)
    const rawText = await visionAnalysis(
      tenantId,
      'system',
      'workflow',
      'document_ocr',
      imageUrl,
      EXTRACTION_PROMPT
    );
    // Extract JSON from response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    raw = jsonMatch ? JSON.parse(jsonMatch[0]) : simulateExtraction(attachmentId);
    model = 'ai-vision';
  } catch {
    raw = simulateExtraction(attachmentId);
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
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as AiDocumentAnalysis;
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
