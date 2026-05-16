import { db } from '../firebase';
import {
  collection, query, where, getDocs,
  updateDoc, doc, serverTimestamp,
} from 'firebase/firestore';

export async function revokeInvitation(
  tenantId: string,
  invitationId: string
): Promise<void> {
  await updateDoc(doc(db, `tenants/${tenantId}/invitations/${invitationId}`), {
    status: 'REVOKED',
    revokedAt: serverTimestamp(),
  });
}

export async function revokeInvitationByEmail(
  tenantId: string,
  email: string
): Promise<string[]> {
  const snap = await getDocs(
    query(
      collection(db, `tenants/${tenantId}/invitations`),
      where('email', '==', email.toLowerCase()),
      where('status', '==', 'pending')
    )
  );

  const revokedIds: string[] = [];
  for (const d of snap.docs) {
    await updateDoc(d.ref, { status: 'REVOKED', revokedAt: serverTimestamp() });
    revokedIds.push(d.id);
  }
  return revokedIds;
}

export async function getPendingInvitations(
  tenantId: string
): Promise<Array<{ id: string; email: string; role: string; createdAt: unknown }>> {
  const snap = await getDocs(
    query(
      collection(db, `tenants/${tenantId}/invitations`),
      where('status', '==', 'pending')
    )
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
}
