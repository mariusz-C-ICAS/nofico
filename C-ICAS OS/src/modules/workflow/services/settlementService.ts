import {
  collection, doc, addDoc, updateDoc, getDoc, getDocs,
  query, where, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import type { SettlementRecord, DocumentInstance } from '../types';

const settlementsPath = (tenantId: string) => `tenants/${tenantId}/settlements`;

export async function createSettlementRecord(
  tenantId: string,
  docInstance: DocumentInstance,
  actorId: string
): Promise<SettlementRecord> {
  const existing = await getSettlementRecord(tenantId, docInstance.id);
  if (existing) return existing;

  // Try to get recipient IBAN from HR profile
  let recipientIban: string | undefined;
  let recipientName: string | undefined;
  try {
    const hrSnap = await getDoc(doc(db, `tenants/${tenantId}/employees/${docInstance.submittedBy}`));
    if (hrSnap.exists()) {
      recipientIban = hrSnap.data().bankAccountIban ?? undefined;
      recipientName = hrSnap.data().displayName ?? undefined;
    }
  } catch { /* HR profile optional */ }

  const transferTitle = buildTransferTitle(docInstance);

  const data: Omit<SettlementRecord, 'id'> = {
    documentInstanceId: docInstance.id,
    tenantId,
    recipientId: docInstance.submittedBy,
    recipientEmail: docInstance.submittedByEmail,
    recipientIban,
    recipientName,
    amount: docInstance.metadata.amount ?? 0,
    currency: docInstance.metadata.currency ?? 'PLN',
    transferTitle,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, settlementsPath(tenantId)), data);
  return { id: ref.id, ...data };
}

export async function getSettlementRecord(
  tenantId: string,
  documentInstanceId: string
): Promise<SettlementRecord | null> {
  const q = query(
    collection(db, settlementsPath(tenantId)),
    where('documentInstanceId', '==', documentInstanceId)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as SettlementRecord;
}

export async function updateSettlementIban(
  tenantId: string,
  settlementId: string,
  iban: string,
  recipientName?: string
): Promise<void> {
  await updateDoc(doc(db, settlementsPath(tenantId), settlementId), {
    recipientIban: iban,
    ...(recipientName && { recipientName }),
    updatedAt: serverTimestamp(),
  });
}

export async function markSettlementInitiated(
  tenantId: string,
  settlementId: string,
  transferRef: string,
  scheduledDate?: string
): Promise<void> {
  await updateDoc(doc(db, settlementsPath(tenantId), settlementId), {
    status: 'initiated',
    transferRef,
    ...(scheduledDate && { scheduledDate }),
    updatedAt: serverTimestamp(),
  });
}

export async function markSettlementCompleted(
  tenantId: string,
  settlementId: string
): Promise<void> {
  await updateDoc(doc(db, settlementsPath(tenantId), settlementId), {
    status: 'completed',
    paidAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function markSettlementFailed(
  tenantId: string,
  settlementId: string,
  reason: string
): Promise<void> {
  await updateDoc(doc(db, settlementsPath(tenantId), settlementId), {
    status: 'failed',
    transferRef: `FAILED: ${reason}`,
    updatedAt: serverTimestamp(),
  });
}

function buildTransferTitle(doc: DocumentInstance): string {
  const vendor = doc.metadata.vendor ?? 'wydatek własny';
  const date = doc.metadata.invoiceDate ?? new Date().toISOString().split('T')[0];
  return `Zwrot — ${vendor} — ${date} — ${doc.id.slice(0, 8).toUpperCase()}`;
}
