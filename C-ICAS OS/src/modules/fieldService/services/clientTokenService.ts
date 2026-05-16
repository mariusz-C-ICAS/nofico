import {
  addDoc, getDoc, getDocs, updateDoc, doc, collection,
  query, where, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import type { ClientEventToken, EventChangeRequest, ServiceEvent, ServiceLocation } from '../types';

const tokenPath  = (t: string) => `tenants/${t}/clientEventTokens`;
const changePath = (t: string) => `tenants/${t}/eventChangeRequests`;

export async function createClientToken(
  tenantId: string,
  eventId: string,
  clientEmail: string
): Promise<string> {
  const expires = new Date();
  expires.setDate(expires.getDate() + 14);
  const ref = await addDoc(collection(db, tokenPath(tenantId)), {
    tenantId, eventId, clientEmail,
    expiresAt: Timestamp.fromDate(expires),
    isRevoked: false,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function resolveToken(
  tenantId: string,
  tokenId: string
): Promise<{ event: ServiceEvent; token: ClientEventToken } | null> {
  const tSnap = await getDoc(doc(db, `${tokenPath(tenantId)}/${tokenId}`));
  if (!tSnap.exists()) return null;
  const token = { id: tSnap.id, ...tSnap.data() } as ClientEventToken;
  if (token.isRevoked) return null;
  const expires: Date = token.expiresAt?.toDate?.() ?? new Date(0);
  if (expires < new Date()) return null;
  const eSnap = await getDoc(doc(db, `tenants/${tenantId}/serviceEvents/${token.eventId}`));
  if (!eSnap.exists()) return null;
  return { event: { id: eSnap.id, ...eSnap.data() } as ServiceEvent, token };
}

export async function submitChangeRequest(
  tenantId: string,
  req: Omit<EventChangeRequest, 'id' | 'status' | 'feasibilityOk' | 'createdAt' | 'resolvedAt' | 'resolvedBy'>
): Promise<string> {
  const ref = await addDoc(collection(db, changePath(tenantId)), {
    ...req,
    status: 'PENDING',
    feasibilityOk: (req.workerAvailable ?? true) && (req.travelFeasible ?? true),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getPendingChangeRequests(tenantId: string): Promise<EventChangeRequest[]> {
  const q = query(collection(db, changePath(tenantId)), where('status', '==', 'PENDING'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as EventChangeRequest);
}

export async function resolveChangeRequest(
  tenantId: string,
  reqId: string,
  approved: boolean,
  resolvedBy: string
): Promise<void> {
  await updateDoc(doc(db, `${changePath(tenantId)}/${reqId}`), {
    status: approved ? 'APPROVED' : 'REJECTED',
    resolvedAt: serverTimestamp(),
    resolvedBy,
  });
}

export async function revokeToken(tenantId: string, tokenId: string): Promise<void> {
  await updateDoc(doc(db, `${tokenPath(tenantId)}/${tokenId}`), { isRevoked: true });
}

export function buildClientPortalUrl(tenantId: string, tokenId: string): string {
  return `${window.location.origin}/client-event/${tenantId}/${tokenId}`;
}
