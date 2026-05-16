import { db } from '../firebase';
import { doc, getDoc, writeBatch, serverTimestamp } from 'firebase/firestore';

export interface BulkOperationResult {
  approved: string[];
  failed: { id: string; reason: string }[];
}

const BATCH_SIZE = 500;

export async function bulkApproveTimeEntries(
  tenantId: string,
  entryIds: string[],
  approvedBy: string
): Promise<BulkOperationResult> {
  const approved: string[] = [];
  const failed: { id: string; reason: string }[] = [];

  for (let i = 0; i < entryIds.length; i += BATCH_SIZE) {
    const batchIds = entryIds.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    const batchApproved: string[] = [];

    for (const entryId of batchIds) {
      const ref = doc(db, 'timeEntries', entryId);
      const snap = await getDoc(ref);

      if (!snap.exists()) { failed.push({ id: entryId, reason: 'Not found' }); continue; }

      const entry = snap.data();
      if (entry?.tenantId !== tenantId) { failed.push({ id: entryId, reason: 'Access denied' }); continue; }
      if (entry?.status === 'APPROVED') { approved.push(entryId); continue; }
      if (!['SUBMITTED', 'IN_PROGRESS', 'COMPLETED'].includes(entry?.status)) {
        failed.push({ id: entryId, reason: `Invalid status: ${entry?.status}` });
        continue;
      }

      batch.update(ref, { status: 'APPROVED', approvedBy, approvedAt: serverTimestamp(), updatedAt: serverTimestamp() });
      batchApproved.push(entryId);
    }

    await batch.commit();
    approved.push(...batchApproved);
  }

  return { approved, failed };
}

export async function bulkRejectTimeEntries(
  tenantId: string,
  entryIds: string[],
  rejectedBy: string,
  reason: string
): Promise<BulkOperationResult> {
  const approved: string[] = [];
  const failed: { id: string; reason: string }[] = [];
  const batch = writeBatch(db);

  for (const entryId of entryIds.slice(0, BATCH_SIZE)) {
    const ref = doc(db, 'timeEntries', entryId);
    const snap = await getDoc(ref);

    if (!snap.exists() || snap.data()?.tenantId !== tenantId) {
      failed.push({ id: entryId, reason: 'Not found or access denied' });
      continue;
    }

    batch.update(ref, {
      status: 'REJECTED', rejectedBy,
      rejectionReason: reason,
      updatedAt: serverTimestamp(),
    });
    approved.push(entryId);
  }

  await batch.commit();
  return { approved, failed };
}
