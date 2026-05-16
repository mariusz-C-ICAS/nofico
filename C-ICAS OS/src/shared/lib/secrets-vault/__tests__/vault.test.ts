import { describe, it, expect, beforeAll } from 'vitest';
import { encrypt, decrypt } from '../services/vault';

beforeAll(() => {
  if (typeof globalThis.crypto === 'undefined') {
    // Node 18+ has globalThis.crypto — vitest jsdom provides it
    throw new Error('Web Crypto API not available in test environment');
  }
});

describe('secrets-vault', () => {
  it('roundtrip encrypt → decrypt', async () => {
    const plain = 'sensitive-NIP-123456789';
    const p = await encrypt(plain, 'uid-1', 'tenant-1');
    expect(p.ciphertext).not.toBe(plain);
    expect(await decrypt(p, 'uid-1', 'tenant-1')).toBe(plain);
  });

  it('different tenants produce different ciphertext', async () => {
    const p1 = await encrypt('data', 'uid-1', 'tenantA');
    const p2 = await encrypt('data', 'uid-1', 'tenantB');
    expect(p1.ciphertext).not.toBe(p2.ciphertext);
  });

  it('wrong uid fails to decrypt', async () => {
    const p = await encrypt('secret', 'uid-correct', 'tenant-1');
    await expect(decrypt(p, 'uid-wrong', 'tenant-1')).rejects.toThrow();
  });

  it('each call produces unique IV', async () => {
    const p1 = await encrypt('x', 'u', 't');
    const p2 = await encrypt('x', 'u', 't');
    expect(p1.iv).not.toBe(p2.iv);
  });
});
