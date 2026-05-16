export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  keyId: string;
}

export interface VaultConfig {
  kmsProjectId?: string;
  kmsLocationId?: string;
  kmsKeyRingId?: string;
  kmsKeyId?: string;
}
