/**
 * Data: 2026-05-19
 * Modul: DMS — Cloud Drive Integration
 * Opis: Serwis do pobierania plików z OneDrive (MS Graph API) i Google Drive API.
 *       Zapis metadanych do kolekcji Firestore `documents` (bez pobierania binarnego).
 */

import { db } from '../../../shared/lib/firebase';
import {
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';

// ---------------------------------------------------------------------------
// Typy publiczne
// ---------------------------------------------------------------------------

export type DriveProvider = 'onedrive' | 'googledrive' | 'dropbox';

export interface DriveFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  modifiedAt: string;
  downloadUrl?: string;
  webUrl?: string;
}

export interface DriveTokenResult {
  token: string | null;
  configured: boolean;
}

// ---------------------------------------------------------------------------
// Pobieranie tokenów z Firestore
// ---------------------------------------------------------------------------

/**
 * Odczytuje token dostępu do dostawcy z Firestore.
 * Ścieżka: tenants/{tenantId}/integrations/{provider}
 * Zwraca { token: null, configured: false } jeśli brak konfiguracji — nie rzuca wyjątku.
 */
export async function getTokenForProvider(
  tenantId: string,
  provider: DriveProvider
): Promise<DriveTokenResult> {
  const firestoreKeyMap: Record<DriveProvider, string> = {
    onedrive: 'ms365',
    googledrive: 'google-workspace',
    dropbox: 'dropbox',
  };
  const firestoreKey = firestoreKeyMap[provider];

  try {
    const ref = doc(db, `tenants/${tenantId}/integrations/${firestoreKey}`);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return { token: null, configured: false };
    }

    const data = snap.data() as Record<string, unknown>;
    const token =
      (data['accessToken'] as string | undefined) ??
      (data['access_token'] as string | undefined) ??
      null;

    return { token, configured: true };
  } catch {
    // brak uprawnień lub doc nie istnieje — traktujemy gracefully
    return { token: null, configured: false };
  }
}

// ---------------------------------------------------------------------------
// Dropbox — API v2
// ---------------------------------------------------------------------------

interface DropboxEntry {
  '.tag': string;
  id: string;
  name: string;
  size?: number;
  client_modified?: string;
  path_lower?: string;
}

interface DropboxListFolderResponse {
  entries: DropboxEntry[];
  cursor: string;
  has_more: boolean;
}

/**
 * Odczytuje konfigurację Dropbox (token OAuth2) z Firestore.
 * Ścieżka: tenants/{tenantId}/integrations/dropbox
 * Pole accessToken — zapisane przez moduł Integracji.
 */
export async function getDropboxConfig(
  tenantId: string
): Promise<DriveTokenResult> {
  return getTokenForProvider(tenantId, 'dropbox');
}

/**
 * Listuje pliki w podanej ścieżce Dropbox przez API v2.
 * path = '' → root (Dropbox API wymaga pustego stringa dla rootu).
 */
export async function listDropboxFiles(
  token: string,
  path?: string
): Promise<DriveFile[]> {
  const folderPath = path ?? '';

  const response = await fetch(
    'https://api.dropboxapi.com/2/files/list_folder',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: folderPath,
        recursive: false,
        include_media_info: false,
        include_deleted: false,
        include_has_explicit_shared_members: false,
        limit: 50,
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Dropbox API error ${response.status}: ${text}`);
  }

  const json: DropboxListFolderResponse = await response.json();

  return json.entries
    .filter((entry) => entry['.tag'] === 'file')
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      size: entry.size ?? 0,
      mimeType: getMimeTypeFromName(entry.name),
      modifiedAt: entry.client_modified ?? new Date().toISOString(),
      webUrl: `https://www.dropbox.com/home${entry.path_lower ?? ''}`,
    }));
}

function getMimeTypeFromName(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const mimeMap: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    txt: 'text/plain',
    csv: 'text/csv',
  };
  return mimeMap[ext] ?? 'application/octet-stream';
}

// ---------------------------------------------------------------------------
// OneDrive — MS Graph API
// ---------------------------------------------------------------------------

interface GraphDriveItem {
  id: string;
  name: string;
  size: number;
  file?: { mimeType: string };
  lastModifiedDateTime: string;
  '@microsoft.graph.downloadUrl'?: string;
  webUrl?: string;
}

interface GraphDriveResponse {
  value: GraphDriveItem[];
}

/**
 * Listuje pliki w folderze OneDrive przez MS Graph API.
 * folderId = undefined → root
 */
export async function listOneDriveFiles(
  token: string,
  folderId?: string
): Promise<DriveFile[]> {
  const endpoint = folderId
    ? `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children`
    : 'https://graph.microsoft.com/v1.0/me/drive/root/children';

  const response = await fetch(`${endpoint}?$select=id,name,size,file,lastModifiedDateTime,webUrl&$top=50`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OneDrive API error ${response.status}: ${text}`);
  }

  const json: GraphDriveResponse = await response.json();

  return json.value
    .filter((item) => item.file) // tylko pliki, nie foldery
    .map((item) => ({
      id: item.id,
      name: item.name,
      size: item.size ?? 0,
      mimeType: item.file?.mimeType ?? 'application/octet-stream',
      modifiedAt: item.lastModifiedDateTime,
      downloadUrl: item['@microsoft.graph.downloadUrl'],
      webUrl: item.webUrl,
    }));
}

// ---------------------------------------------------------------------------
// Google Drive API v3
// ---------------------------------------------------------------------------

interface GoogleDriveFile {
  id: string;
  name: string;
  size?: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink?: string;
  webContentLink?: string;
}

interface GoogleDriveResponse {
  files: GoogleDriveFile[];
}

/**
 * Listuje pliki w folderze Google Drive przez Drive API v3.
 * folderId = undefined → root ('root')
 */
export async function listGoogleDriveFiles(
  token: string,
  folderId?: string
): Promise<DriveFile[]> {
  const parentId = folderId ?? 'root';
  const fields =
    'files(id,name,size,mimeType,modifiedTime,webViewLink,webContentLink)';
  const query = encodeURIComponent(
    `'${parentId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`
  );

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&pageSize=50`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google Drive API error ${response.status}: ${text}`);
  }

  const json: GoogleDriveResponse = await response.json();

  return json.files.map((f) => ({
    id: f.id,
    name: f.name,
    size: f.size ? parseInt(f.size, 10) : 0,
    mimeType: f.mimeType,
    modifiedAt: f.modifiedTime,
    downloadUrl: f.webContentLink,
    webUrl: f.webViewLink,
  }));
}

// ---------------------------------------------------------------------------
// Import do DMS Firestore
// ---------------------------------------------------------------------------

export interface ImportResult {
  success: boolean;
  docId?: string;
  error?: string;
}

/**
 * Importuje metadane pliku z chmury do kolekcji `documents` w Firestore.
 * Nie pobiera zawartości binarnej — zapisuje link (webUrl) i metadane.
 */
export async function importFileToDMS(
  tenantId: string,
  userId: string,
  file: DriveFile,
  provider: DriveProvider
): Promise<ImportResult> {
  const providerLabelMap: Record<DriveProvider, string> = {
    onedrive: 'OneDrive',
    googledrive: 'Google Drive',
    dropbox: 'Dropbox',
  };
  const providerLabel = providerLabelMap[provider];

  const mockHash = Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');

  const retentionDate = new Date();
  retentionDate.setFullYear(retentionDate.getFullYear() + 5);

  try {
    const docRef = await addDoc(collection(db, 'documents'), {
      tenantId,
      name: file.name,
      type: 'Import z chmury',
      date: file.modifiedAt.substring(0, 10),
      isPrivate: false,
      status: 'Oczekuje Weryfikacji',
      size: formatFileSize(file.size),
      mimeType: file.mimeType,
      hash: mockHash,
      version: 1,
      retentionUntil: retentionDate.toISOString(),
      reviewCycleMonths: 12,
      lastReviewAt: new Date().toISOString(),
      summary: `Dokument zaimportowany z ${providerLabel}.`,
      url: file.webUrl ?? file.downloadUrl ?? null,
      externalId: file.id,
      externalProvider: provider,
      createdAt: serverTimestamp(),
      createdBy: userId,
    });

    await addDoc(collection(db, `documents/${docRef.id}/versions`), {
      version: 1,
      createdAt: serverTimestamp(),
      createdBy: userId,
      action: 'IMPORTED',
      note: `Zaimportowano z ${providerLabel} — ID: ${file.id}`,
    });

    return { success: true, docId: docRef.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Nieznany błąd';
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
