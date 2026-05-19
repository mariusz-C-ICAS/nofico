/**
 * Data: 2026-05-19
 * Modul: DMS — eSign Integration (DocuSign)
 * Opis: Serwis do wysyłania dokumentów do podpisu elektronicznego przez DocuSign REST API.
 *       Konfiguracja odczytywana z Firestore tenants/{id}/integrations/docusign.
 *       Historia podpisów zapisywana do kolekcji doc_signatures.
 */

import { db } from '../../../shared/lib/firebase';
import {
  doc,
  getDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  orderBy,
} from 'firebase/firestore';

// ---------------------------------------------------------------------------
// Typy publiczne
// ---------------------------------------------------------------------------

export interface ESignConfig {
  apiKey: string;
  apiUrl: string;
  accountId: string;
}

export interface ESignConfigResult {
  config: ESignConfig | null;
  configured: boolean;
}

export interface Signer {
  name: string;
  email: string;
  role: string;
}

export interface EnvelopeResult {
  envelopeId: string;
  status: string;
}

export interface SignatureStatus {
  status: string;
  completedDateTime?: string;
}

export interface SignatureRecord {
  id: string;
  documentId: string;
  envelopeId: string;
  signers: Signer[];
  status: string;
  sentAt: string;
  completedAt?: string;
}

// ---------------------------------------------------------------------------
// Firestore — odczyt konfiguracji
// ---------------------------------------------------------------------------

/**
 * Odczytuje konfigurację DocuSign z Firestore.
 * Ścieżka: tenants/{tenantId}/integrations/docusign
 * Pola: config.apiKey, config.apiUrl, config.accountId
 */
export async function getDocuSignConfig(
  tenantId: string
): Promise<ESignConfigResult> {
  try {
    const ref = doc(db, `tenants/${tenantId}/integrations/docusign`);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return { config: null, configured: false };
    }

    const data = snap.data() as Record<string, unknown>;
    const cfg = (data['config'] ?? data) as Record<string, unknown>;

    const apiKey = (cfg['apiKey'] as string | undefined) ?? '';
    const apiUrl =
      (cfg['apiUrl'] as string | undefined) ??
      'https://demo.docusign.net/restapi/v2.1/accounts';
    const accountId = (cfg['accountId'] as string | undefined) ?? '';

    if (!apiKey || !accountId) {
      return { config: null, configured: false };
    }

    return {
      config: { apiKey, apiUrl, accountId },
      configured: true,
    };
  } catch {
    return { config: null, configured: false };
  }
}

// ---------------------------------------------------------------------------
// DocuSign REST API
// ---------------------------------------------------------------------------

/**
 * Wysyła dokument do podpisu elektronicznego przez DocuSign.
 * Dokument musi być dostępny jako base64 lub jako URL z Firebase Storage.
 *
 * Jeśli documentBase64 jest pusty (brak pliku binarnego w Firestore),
 * funkcja zwraca błąd z informacją o konieczności uploadu do Firebase Storage.
 */
export async function sendForSignature(
  tenantId: string,
  documentId: string,
  signers: Signer[],
  documentBase64: string,
  documentName: string
): Promise<EnvelopeResult> {
  if (!documentBase64) {
    throw new Error(
      'UPLOAD_REQUIRED: Wymagany upload pliku do Firebase Storage przed wysłaniem do podpisu.'
    );
  }

  const { config, configured } = await getDocuSignConfig(tenantId);

  if (!configured || !config) {
    throw new Error('DocuSign nie jest skonfigurowany. Skonfiguruj integrację w module Integracji.');
  }

  const docuSignSigners = signers.map((signer, index) => ({
    name: signer.name,
    email: signer.email,
    recipientId: String(index + 1),
    routingOrder: String(index + 1),
    roleName: signer.role,
    tabs: {
      signHereTabs: [
        {
          anchorString: '/sig/',
          anchorXOffset: '0',
          anchorYOffset: '0',
          anchorUnits: 'pixels',
          anchorIgnoreIfNotPresent: 'true',
        },
      ],
    },
  }));

  const body = {
    emailSubject: `Proszę podpisać dokument: ${documentName}`,
    documents: [
      {
        documentId: '1',
        name: documentName,
        documentBase64,
        fileExtension: getFileExtension(documentName),
      },
    ],
    recipients: {
      signers: docuSignSigners,
    },
    status: 'sent',
  };

  const response = await fetch(
    `${config.apiUrl}/${config.accountId}/envelopes`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DocuSign API error ${response.status}: ${text}`);
  }

  const json = (await response.json()) as { envelopeId: string; status: string };

  await saveSignatureRecord(tenantId, documentId, json.envelopeId, signers);

  return {
    envelopeId: json.envelopeId,
    status: json.status,
  };
}

/**
 * Sprawdza status koperty (podpisu) w DocuSign.
 * Zwraca status i datę ukończenia (jeśli podpisano).
 */
export async function checkSignatureStatus(
  envelopeId: string,
  apiKey: string,
  apiUrl: string,
  accountId: string
): Promise<SignatureStatus> {
  const response = await fetch(
    `${apiUrl}/${accountId}/envelopes/${envelopeId}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DocuSign status error ${response.status}: ${text}`);
  }

  const json = (await response.json()) as {
    status: string;
    completedDateTime?: string;
  };

  return {
    status: json.status,
    completedDateTime: json.completedDateTime,
  };
}

// ---------------------------------------------------------------------------
// Firestore — zapis historii podpisów
// ---------------------------------------------------------------------------

/**
 * Zapisuje rekord podpisu do kolekcji doc_signatures.
 * Ścieżka: doc_signatures/{auto-id}
 */
export async function saveSignatureRecord(
  tenantId: string,
  documentId: string,
  envelopeId: string,
  signers: Signer[]
): Promise<string> {
  const docRef = await addDoc(collection(db, 'doc_signatures'), {
    tenantId,
    documentId,
    envelopeId,
    signers,
    status: 'sent',
    sentAt: serverTimestamp(),
    completedAt: null,
  });

  return docRef.id;
}

/**
 * Pobiera historię podpisów dla danego dokumentu.
 * Ścieżka: doc_signatures gdzie documentId == id
 */
export async function getSignatureRecords(
  documentId: string
): Promise<SignatureRecord[]> {
  const q = query(
    collection(db, 'doc_signatures'),
    where('documentId', '==', documentId),
    orderBy('sentAt', 'desc')
  );

  const snapshot = await getDocs(q);
  const records: SignatureRecord[] = [];

  snapshot.forEach((d) => {
    const data = d.data() as Omit<SignatureRecord, 'id'> & {
      sentAt: { toDate?: () => Date } | string;
      completedAt?: { toDate?: () => Date } | string | null;
    };

    const sentAt =
      typeof data.sentAt === 'string'
        ? data.sentAt
        : data.sentAt?.toDate?.()?.toISOString() ?? new Date().toISOString();

    const completedAt =
      data.completedAt == null
        ? undefined
        : typeof data.completedAt === 'string'
        ? data.completedAt
        : data.completedAt?.toDate?.()?.toISOString();

    records.push({
      id: d.id,
      documentId: data.documentId,
      envelopeId: data.envelopeId,
      signers: data.signers,
      status: data.status,
      sentAt,
      completedAt,
    });
  });

  return records;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getFileExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'pdf';
  return ext;
}
