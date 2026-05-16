import { test, expect } from '@playwright/test';

test.describe('Secrets Vault (AES-256-GCM)', () => {
  test('encrypt and decrypt round-trip preserves plaintext', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(async () => {
      const { encrypt, decrypt } = await import('/src/shared/lib/secrets-vault/services/vault');
      const uid = 'test-user-123';
      const tenantId = 'test-tenant-456';
      const plaintext = 'Tajny klucz API: abc-xyz-789';

      const encrypted = await encrypt(plaintext, uid, tenantId);
      const decrypted = await decrypt(encrypted, uid, tenantId);
      return { plaintext, decrypted, match: plaintext === decrypted };
    });

    expect(result.match).toBe(true);
  });

  test('decrypt with wrong tenantId fails', async ({ page }) => {
    await page.goto('/');

    const failed = await page.evaluate(async () => {
      const { encrypt, decrypt } = await import('/src/shared/lib/secrets-vault/services/vault');
      const uid = 'test-user-123';
      const encrypted = await encrypt('secret data', uid, 'tenant-A');
      try {
        await decrypt(encrypted, uid, 'tenant-B');
        return false;
      } catch {
        return true;
      }
    });

    expect(failed).toBe(true);
  });

  test('different encrypt calls produce different ciphertext', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(async () => {
      const { encrypt } = await import('/src/shared/lib/secrets-vault/services/vault');
      const uid = 'u1';
      const tenantId = 't1';
      const a = await encrypt('same text', uid, tenantId);
      const b = await encrypt('same text', uid, tenantId);
      return a.iv !== b.iv;
    });

    expect(result).toBe(true);
  });
});
