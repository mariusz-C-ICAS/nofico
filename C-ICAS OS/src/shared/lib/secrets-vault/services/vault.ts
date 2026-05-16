import type { EncryptedPayload } from '../types';

const ALGO = 'AES-GCM';
const KEY_LEN = 256;
const SALT = new TextEncoder().encode('c-icas-os-vault-v1');

async function deriveKey(uid: string, tenantId: string): Promise<CryptoKey> {
  const raw = new TextEncoder().encode(`${uid}:${tenantId}`);
  const keyMaterial = await crypto.subtle.importKey('raw', raw, { name: 'PBKDF2' }, false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: SALT, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: ALGO, length: KEY_LEN },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encrypt(plaintext: string, uid: string, tenantId: string): Promise<EncryptedPayload> {
  const key = await deriveKey(uid, tenantId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const buf = await crypto.subtle.encrypt({ name: ALGO, iv }, key, new TextEncoder().encode(plaintext));
  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(buf))),
    iv: btoa(String.fromCharCode(...iv)),
    keyId: `pbkdf2:${tenantId}`,
  };
}

export async function decrypt(payload: EncryptedPayload, uid: string, tenantId: string): Promise<string> {
  const key = await deriveKey(uid, tenantId);
  const iv = Uint8Array.from(atob(payload.iv), c => c.charCodeAt(0));
  const cipher = Uint8Array.from(atob(payload.ciphertext), c => c.charCodeAt(0));
  const plain = await crypto.subtle.decrypt({ name: ALGO, iv }, key, cipher);
  return new TextDecoder().decode(plain);
}
