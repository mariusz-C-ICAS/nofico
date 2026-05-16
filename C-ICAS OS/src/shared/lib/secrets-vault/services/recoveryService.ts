import { db } from '../../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const FUNCTIONS_BASE = import.meta.env.VITE_FUNCTIONS_URL ?? 'https://europe-west1-cicas-os.cloudfunctions.net';

export interface VaultBackupEntry {
  ciphertextBase64: string;
  tenantId: string;
  uid: string;
  createdAt: unknown;
}

export async function backupEncryptedVaultKey(
  ciphertextBase64: string,
  uid: string,
  tenantId: string,
  idToken: string
): Promise<void> {
  await setDoc(
    doc(db, `users/${uid}/vaultBackup/${tenantId}`),
    {
      ciphertextBase64,
      tenantId,
      uid,
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function recoverVaultKey(
  uid: string,
  tenantId: string,
  idToken: string
): Promise<string> {
  const snap = await getDoc(doc(db, `users/${uid}/vaultBackup/${tenantId}`));
  if (!snap.exists()) {
    throw new Error(`No vault backup found for tenant ${tenantId}`);
  }

  const { ciphertextBase64 } = snap.data() as VaultBackupEntry;

  const res = await fetch(`${FUNCTIONS_BASE}/kmsUnwrap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ ciphertextBase64, tenantId }),
  });

  if (!res.ok) {
    throw new Error(`KMS unwrap failed: ${res.status}`);
  }

  const { plaintextBase64 } = await res.json();
  return plaintextBase64;
}

export async function hasVaultBackup(uid: string, tenantId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, `users/${uid}/vaultBackup/${tenantId}`));
  return snap.exists();
}
