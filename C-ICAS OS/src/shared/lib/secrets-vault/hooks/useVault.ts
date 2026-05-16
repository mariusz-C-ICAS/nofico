import { useCallback } from 'react';
import { useAuth } from '../../../../core/auth/AuthContext';
import { useTenant } from '../../../../core/auth/TenantContext';
import { encrypt, decrypt } from '../services/vault';
import type { EncryptedPayload } from '../types';

export function useVault() {
  const { userData } = useAuth();
  const { currentTenant } = useTenant();

  const encryptField = useCallback(async (plaintext: string): Promise<EncryptedPayload> => {
    const uid = (userData as any)?.uid ?? 'anon';
    const tenantId = (currentTenant as any)?.id ?? 'default';
    return encrypt(plaintext, uid, tenantId);
  }, [userData, currentTenant]);

  const decryptField = useCallback(async (payload: EncryptedPayload): Promise<string> => {
    const uid = (userData as any)?.uid ?? 'anon';
    const tenantId = (currentTenant as any)?.id ?? 'default';
    return decrypt(payload, uid, tenantId);
  }, [userData, currentTenant]);

  return { encryptField, decryptField };
}
