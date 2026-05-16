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
  async updateUserRole(userId: string, newRole: string) {
    const userRef = doc(db, 'users', userId);
    return await updateDoc(userRef, {
      role: newRole,
      updatedAt: serverTimestamp()
    });
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
