import Dexie, { type Table } from 'dexie';
import { db as firestoreDb } from '../../firebase';
import {
  doc, setDoc, updateDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore';
import type { PendingOp } from '../types';

class SyncDB extends Dexie {
  pending!: Table<PendingOp, number>;

  constructor() {
    super('cicas-sync-queue');
    this.version(1).stores({ pending: '++id, collection, tenantId, createdAt' });
  }
}

const syncDb = new SyncDB();

export async function enqueue(op: Omit<PendingOp, 'id' | 'createdAt' | 'retries'>): Promise<void> {
  await syncDb.pending.add({ ...op, createdAt: Date.now(), retries: 0 });
}

export async function flush(): Promise<void> {
  const ops = await syncDb.pending.orderBy('createdAt').toArray();
  for (const op of ops) {
    try {
      const ref = doc(firestoreDb, op.collection, op.docId);
      if (op.op === 'create' || op.op === 'update') {
        await setDoc(ref, { ...op.data, updatedAt: serverTimestamp() }, { merge: true });
      } else if (op.op === 'delete') {
        await deleteDoc(ref);
      }
      await syncDb.pending.delete(op.id!);
    } catch (err) {
      const retries = op.retries + 1;
      if (retries >= 5) {
        await syncDb.pending.delete(op.id!);
      } else {
        await syncDb.pending.update(op.id!, { retries });
      }
    }
  }
}

export async function pendingCount(): Promise<number> {
  return syncDb.pending.count();
}

export async function clearQueue(): Promise<void> {
  await syncDb.pending.clear();
}
