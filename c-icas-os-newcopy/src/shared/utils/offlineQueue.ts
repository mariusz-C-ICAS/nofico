/**
 * Data: 2026-05-16
 * Zmiany: Offline queue dla paragonów — IndexedDB via Dexie.js
 * Ścieżka: /src/shared/utils/offlineQueue.ts
 */
import Dexie, { type Table } from 'dexie';

export interface QueuedReceipt {
  id?: number;
  tenantId: string;
  imageDataUrl: string;
  fileName: string;
  size: number;
  capturedAt: number;
  status: 'pending' | 'processing' | 'done' | 'error';
  errorMessage?: string;
  retryCount: number;
  ocrResult?: string;
}

class OfflineQueueDB extends Dexie {
  receipts!: Table<QueuedReceipt>;

  constructor() {
    super('NoFiCoOfflineQueue');
    this.version(1).stores({
      receipts: '++id, tenantId, status, capturedAt',
    });
  }
}

export const offlineDB = new OfflineQueueDB();

export async function addToQueue(
  receipt: Omit<QueuedReceipt, 'id'>,
): Promise<number> {
  return offlineDB.receipts.add(receipt);
}

export async function getPendingReceipts(
  tenantId: string,
): Promise<QueuedReceipt[]> {
  return offlineDB.receipts
    .where('tenantId')
    .equals(tenantId)
    .and((r) => r.status === 'pending')
    .sortBy('capturedAt');
}

export async function updateReceiptStatus(
  id: number,
  status: QueuedReceipt['status'],
  data?: Partial<QueuedReceipt>,
): Promise<void> {
  await offlineDB.receipts.update(id, { status, ...data });
}

export async function getQueueStats(tenantId: string): Promise<{
  pending: number;
  done: number;
  error: number;
  totalSize: number;
}> {
  const all = await offlineDB.receipts
    .where('tenantId')
    .equals(tenantId)
    .toArray();

  return all.reduce(
    (acc, r) => {
      if (r.status === 'pending' || r.status === 'processing') acc.pending += 1;
      else if (r.status === 'done') acc.done += 1;
      else if (r.status === 'error') acc.error += 1;
      acc.totalSize += r.size;
      return acc;
    },
    { pending: 0, done: 0, error: 0, totalSize: 0 },
  );
}

export async function clearDoneReceipts(tenantId: string): Promise<void> {
  const ids = await offlineDB.receipts
    .where('tenantId')
    .equals(tenantId)
    .and((r) => r.status === 'done')
    .primaryKeys();

  await offlineDB.receipts.bulkDelete(ids as number[]);
}

export async function processQueue(
  tenantId: string,
  processFn: (receipt: QueuedReceipt) => Promise<string>,
): Promise<{ processed: number; failed: number }> {
  const pending = await getPendingReceipts(tenantId);
  let processed = 0;
  let failed = 0;

  for (const receipt of pending) {
    if (receipt.id == null) continue;

    await updateReceiptStatus(receipt.id, 'processing');

    try {
      const ocrResult = await processFn(receipt);
      await updateReceiptStatus(receipt.id, 'done', { ocrResult });
      processed += 1;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Nieznany błąd';
      await updateReceiptStatus(receipt.id, 'error', {
        errorMessage,
        retryCount: (receipt.retryCount ?? 0) + 1,
      });
      failed += 1;
    }
  }

  return { processed, failed };
}
