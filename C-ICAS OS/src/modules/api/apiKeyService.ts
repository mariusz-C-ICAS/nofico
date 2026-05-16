import { db } from '../../shared/lib/firebase';
import {
  collection, query, where, getDocs, addDoc, updateDoc,
  doc, serverTimestamp, orderBy, limit,
} from 'firebase/firestore';

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  scopes: string[];
  active: boolean;
  tenantId: string;
  createdAt: any;
  lastUsedAt?: any;
  expiresAt?: string;
  callCount: number;
}

export interface ApiLog {
  id: string;
  tenantId: string;
  keyId: string;
  keyName: string;
  endpoint: string;
  method: string;
  statusCode: number;
  durationMs: number;
  ip?: string;
  createdAt: any;
}

export const API_SCOPES = [
  { id: 'customers:read',   label: 'Klienci — odczyt' },
  { id: 'customers:write',  label: 'Klienci — zapis' },
  { id: 'invoices:read',    label: 'Faktury — odczyt' },
  { id: 'invoices:write',   label: 'Faktury — zapis' },
  { id: 'employees:read',   label: 'Pracownicy — odczyt' },
  { id: 'hr:analytics',     label: 'HR Analytics' },
  { id: 'finance:read',     label: 'Finanse — odczyt' },
  { id: 'webhooks:manage',  label: 'Webhooki — zarządzanie' },
];

function randomHex(len: number) {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function generateApiKey(
  tenantId: string,
  name: string,
  scopes: string[],
  expiresAt?: string,
): Promise<{ key: string; record: Omit<ApiKey, 'id'> }> {
  const rawKey = `cicas_${randomHex(24)}`;
  const prefix = rawKey.slice(0, 14);
  // Simple hash for storage (not security-critical — real backend would use bcrypt)
  const encoder = new TextEncoder();
  const data = encoder.encode(rawKey);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  const keyHash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');

  const record: Omit<ApiKey, 'id'> = {
    name,
    keyPrefix: prefix,
    keyHash,
    scopes,
    active: true,
    tenantId,
    createdAt: serverTimestamp(),
    callCount: 0,
    ...(expiresAt ? { expiresAt } : {}),
  };
  await addDoc(collection(db, 'api_keys'), record);
  return { key: rawKey, record };
}

export async function listApiKeys(tenantId: string): Promise<ApiKey[]> {
  const snap = await getDocs(
    query(collection(db, 'api_keys'), where('tenantId', '==', tenantId))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as ApiKey));
}

export async function revokeApiKey(keyId: string): Promise<void> {
  await updateDoc(doc(db, 'api_keys', keyId), { active: false });
}

export async function listApiLogs(tenantId: string, rows = 50): Promise<ApiLog[]> {
  const snap = await getDocs(
    query(
      collection(db, 'api_logs'),
      where('tenantId', '==', tenantId),
      orderBy('createdAt', 'desc'),
      limit(rows),
    )
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as ApiLog));
}
