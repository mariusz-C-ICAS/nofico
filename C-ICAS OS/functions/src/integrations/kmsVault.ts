import * as functions from 'firebase-functions';
import { KeyManagementServiceClient } from '@google-cloud/kms';
import { withAuth } from '../_shared/middleware';

const kmsClient = new KeyManagementServiceClient();

const PROJECT = process.env.GCLOUD_PROJECT ?? 'cicas-os';
const LOCATION = 'europe-west1';
const KEY_RING = 'cicas-vault';
const KEY_ID = 'tenant-dek-key';

function keyVersionPath(): string {
  return kmsClient.cryptoKeyPath(PROJECT, LOCATION, KEY_RING, KEY_ID);
}

export const kmsWrap = withAuth(async (req, res) => {
  const { plaintextBase64, tenantId } = req.body as {
    plaintextBase64: string;
    tenantId: string;
  };

  if (!plaintextBase64 || !tenantId) {
    res.status(400).json({ error: 'plaintextBase64 and tenantId are required' });
    return;
  }

  const plaintext = Buffer.from(plaintextBase64, 'base64');

  const [result] = await kmsClient.encrypt({
    name: keyVersionPath(),
    plaintext,
    additionalAuthenticatedData: Buffer.from(tenantId),
  });

  const ciphertextBase64 = Buffer.from(result.ciphertext as Uint8Array).toString('base64');

  functions.logger.info('kmsWrap', { tenantId, bytes: plaintext.length });
  res.json({ ciphertextBase64 });
});

export const kmsUnwrap = withAuth(async (req, res) => {
  const { ciphertextBase64, tenantId } = req.body as {
    ciphertextBase64: string;
    tenantId: string;
  };

  if (!ciphertextBase64 || !tenantId) {
    res.status(400).json({ error: 'ciphertextBase64 and tenantId are required' });
    return;
  }

  const ciphertext = Buffer.from(ciphertextBase64, 'base64');

  const [result] = await kmsClient.decrypt({
    name: keyVersionPath(),
    ciphertext,
    additionalAuthenticatedData: Buffer.from(tenantId),
  });

  const plaintextBase64 = Buffer.from(result.plaintext as Uint8Array).toString('base64');

  functions.logger.info('kmsUnwrap', { tenantId });
  res.json({ plaintextBase64 });
});
