import { db } from '../firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingDocumentId?: string;
  matchType: 'EXACT' | 'NONE';
}

async function computeSha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function checkForDuplicate(
  file: File,
  tenantId: string
): Promise<DuplicateCheckResult> {
  const sha256 = await computeSha256(file);

  const q = query(
    collection(db, `tenants/${tenantId}/documents`),
    where('sha256', '==', sha256),
    limit(1)
  );

  const snap = await getDocs(q);

  if (!snap.empty) {
    return {
      isDuplicate: true,
      existingDocumentId: snap.docs[0].id,
      matchType: 'EXACT',
    };
  }

  return { isDuplicate: false, matchType: 'NONE' };
}

export async function computeFileHash(file: File): Promise<string> {
  return computeSha256(file);
}
