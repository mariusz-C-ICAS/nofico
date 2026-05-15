/**
 * Data: 2026-05-12 19:56
 * Opis: Symulacja logiki Cloud Functions dla administratora.
 * W środowisku lokalnym wykonuje operacje bezpośrednio na Firestore.
 */
import { db } from '../../../shared/lib/firebase';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  addDoc,
  getDoc
} from 'firebase/firestore';
import { seedRoleIndexFromMembership, transferUserRole } from '../../workflow/services/roleResolutionService';

export const adminService = {
  /**
   * ADM-IMP-05: inviteUser
   * Tworzy zaproszenie w kolekcji 'invitations'.
   */
  async inviteUser(email: string, role: string, tenantId: string) {
    const invitationRef = collection(db, 'invitations');
    return await addDoc(invitationRef, {
      email,
      role,
      tenantId,
      status: 'pending',
      invitedAt: serverTimestamp(),
      invitedBy: 'system-admin' // W uproszczeniu
    });
  },

  /**
   * ADM-IMP-06: updateUserRole
   * Aktualizuje rolę użytkownika w Firestore.
   */
  async updateUserRole(userId: string, tenantId: string, newRole: string, previousRole?: string) {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      role: newRole,
      updatedAt: serverTimestamp()
    });
    const membershipRef = doc(db, `users/${userId}/tenantMemberships`, tenantId);
    await updateDoc(membershipRef, { roleId: newRole, updatedAt: serverTimestamp() });
    if (previousRole && previousRole !== newRole) {
      await transferUserRole(tenantId, userId, previousRole, newRole).catch(() => {});
    } else {
      await seedRoleIndexFromMembership(tenantId, userId).catch(() => {});
    }
  },

  /**
   * ADM-IMP-08: acceptInvitation
   * Przyjmuje zaproszenie — tworzy membership i seeduje indeks ról.
   */
  async acceptInvitation(invitationId: string, userId: string) {
    const invRef = doc(db, 'invitations', invitationId);
    const invSnap = await getDoc(invRef);
    if (!invSnap.exists()) throw new Error('Zaproszenie nie istnieje lub wygasło.');

    const inv = invSnap.data() as { tenantId: string; role: string; status: string };
    if (inv.status !== 'pending') throw new Error('Zaproszenie już zostało wykorzystane.');

    const { tenantId, role } = inv;

    const membershipRef = doc(db, `users/${userId}/tenantMemberships`, tenantId);
    await setDoc(membershipRef, {
      roleId: role,
      tenantId,
      status: 'active',
      joinedAt: serverTimestamp(),
    });

    await updateDoc(invRef, {
      status: 'accepted',
      acceptedAt: serverTimestamp(),
      acceptedBy: userId,
    });

    await seedRoleIndexFromMembership(tenantId, userId).catch(() => {});

    return tenantId;
  },

  /**
   * ADM-IMP-07: revokeIntegrationToken
   * Usuwa token integracji.
   */
  async revokeIntegrationToken(tenantId: string, integrationId: string) {
    const integrationRef = doc(db, 'tenants', tenantId, 'integrations', integrationId);
    return await updateDoc(integrationRef, {
      token: null,
      isActive: false,
      revokedAt: serverTimestamp()
    });
  }
};
