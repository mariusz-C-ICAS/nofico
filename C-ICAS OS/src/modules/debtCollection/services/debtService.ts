import { db } from '../../../shared/lib/firebase';
import {
  collection, query, where, orderBy, getDocs, addDoc, updateDoc,
  doc, getDoc, serverTimestamp,
} from 'firebase/firestore';
import { DebtCase, DebtStage, ContactAttempt } from '../types';

export async function getDebtCases(tenantId: string, stage?: DebtStage): Promise<DebtCase[]> {
  const q = stage
    ? query(collection(db, `tenants/${tenantId}/debtCases`), where('stage', '==', stage), orderBy('dpd', 'desc'))
    : query(collection(db, `tenants/${tenantId}/debtCases`), orderBy('dpd', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as DebtCase));
}

export async function createDebtCase(
  tenantId: string,
  data: Omit<DebtCase, 'id' | 'tenantId' | 'createdAt' | 'contactAttempts'>,
): Promise<string> {
  const ref = await addDoc(collection(db, `tenants/${tenantId}/debtCases`), {
    ...data,
    tenantId,
    contactAttempts: [],
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateDebtStage(tenantId: string, caseId: string, stage: DebtStage): Promise<void> {
  await updateDoc(doc(db, `tenants/${tenantId}/debtCases/${caseId}`), {
    stage,
    updatedAt: serverTimestamp(),
  });
}

export async function addContactAttempt(
  tenantId: string,
  caseId: string,
  attempt: Omit<ContactAttempt, 'id'>,
): Promise<void> {
  const ref  = doc(db, `tenants/${tenantId}/debtCases/${caseId}`);
  const snap = await getDoc(ref);
  const current = (snap.data()?.contactAttempts ?? []) as ContactAttempt[];
  const newAttempt: ContactAttempt = { ...attempt, id: `ca-${Date.now()}` };
  await updateDoc(ref, { contactAttempts: [...current, newAttempt], updatedAt: serverTimestamp() });
}

export async function markAsSettled(tenantId: string, caseId: string, paidAmount: number): Promise<void> {
  await updateDoc(doc(db, `tenants/${tenantId}/debtCases/${caseId}`), {
    paidAmount,
    outstandingAmount: 0,
    stage: 'SETTLED' as DebtStage,
    settledAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
