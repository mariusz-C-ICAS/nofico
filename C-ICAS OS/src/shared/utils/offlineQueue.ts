// IndexedDB-backed offline queue for receipt/image capture on mobile.
// DB: "offlineQueue" | Store: "receipts"

export interface QueuedReceipt {
  id: string;
  tenantId: string;
  imageDataUrl: string;
  fileName: string;
  size: number;
  capturedAt: number;
  status: 'pending' | 'processing' | 'done' | 'error';
  retryCount: number;
  errorMessage?: string;
  ocrResult?: string;
}

const DB_NAME = 'offlineQueue';
const STORE = 'receipts';
const VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('tenantId', 'tenantId', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db: IDBDatabase, mode: IDBTransactionMode) {
  return db.transaction(STORE, mode).objectStore(STORE);
}

function idbReq<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

export async function addToQueue(receipt: Omit<QueuedReceipt, 'id'>): Promise<string> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const item: QueuedReceipt = { id, ...receipt };
  const db = await openDb();
  await idbReq(tx(db, 'readwrite').put(item));
  db.close();
  return id;
}

export async function getPendingReceipts(tenantId: string): Promise<QueuedReceipt[]> {
  const db = await openDb();
  const all = await idbReq<QueuedReceipt[]>(tx(db, 'readonly').index('tenantId').getAll(tenantId));
  db.close();
  return all.filter((r) => r.status !== 'done').sort((a, b) => b.capturedAt - a.capturedAt);
}

export async function getQueueStats(tenantId: string): Promise<{ pending: number; done: number; error: number; totalSize: number }> {
  const db = await openDb();
  const all = await idbReq<QueuedReceipt[]>(tx(db, 'readonly').index('tenantId').getAll(tenantId));
  db.close();
  return all.reduce(
    (acc, r) => {
      if (r.status === 'pending' || r.status === 'processing') acc.pending++;
      else if (r.status === 'done') acc.done++;
      else if (r.status === 'error') acc.error++;
      acc.totalSize += r.size;
      return acc;
    },
    { pending: 0, done: 0, error: 0, totalSize: 0 },
  );
}

export async function processQueue(
  tenantId: string,
  processor: (receipt: QueuedReceipt) => Promise<string>,
): Promise<{ processed: number; failed: number }> {
  const db = await openDb();
  const all = await idbReq<QueuedReceipt[]>(tx(db, 'readonly').index('tenantId').getAll(tenantId));
  const pending = all.filter((r) => r.status === 'pending');

  let processed = 0;
  let failed = 0;

  for (const receipt of pending) {
    const updated: QueuedReceipt = { ...receipt, status: 'processing' };
    await idbReq(tx(db, 'readwrite').put(updated));
    try {
      const ocrResult = await processor(updated);
      await idbReq(tx(db, 'readwrite').put({ ...updated, status: 'done', ocrResult }));
      processed++;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      await idbReq(tx(db, 'readwrite').put({ ...updated, status: 'error', retryCount: updated.retryCount + 1, errorMessage }));
      failed++;
    }
  }

  db.close();
  return { processed, failed };
}

export async function clearDoneReceipts(tenantId: string): Promise<void> {
  const db = await openDb();
  const all = await idbReq<QueuedReceipt[]>(tx(db, 'readonly').index('tenantId').getAll(tenantId));
  const done = all.filter((r) => r.status === 'done');
  for (const r of done) {
    await idbReq(tx(db, 'readwrite').delete(r.id));
  }
  db.close();
}
