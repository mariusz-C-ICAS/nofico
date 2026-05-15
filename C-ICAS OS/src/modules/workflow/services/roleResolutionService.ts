import {
  collection, doc, getDoc, setDoc, updateDoc,
  serverTimestamp, query, where, getDocs,
} from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';

// ── Data model ────────────────────────────────────────────────────────────────
// tenants/{tenantId}/memberRoles/{roleId} → { userIds: string[] }
// This denormalized index avoids a full user scan for role lookups.

const memberRolesPath = (tenantId: string, roleId: string) =>
  `tenants/${tenantId}/memberRoles/${roleId}`;

interface MemberRoleDoc {
  userIds: string[];
  updatedAt: any;
}

// ── Role resolution ───────────────────────────────────────────────────────────

export async function getUsersByRoles(
  tenantId: string,
  roles: string[]
): Promise<string[]> {
  const results = await Promise.all(
    roles.map(async role => {
      const snap = await getDoc(doc(db, memberRolesPath(tenantId, role)));
      if (!snap.exists()) return [] as string[];
      return (snap.data() as MemberRoleDoc).userIds ?? [];
    })
  );
  // Deduplicate across roles
  return [...new Set(results.flat())];
}

// ── Index maintenance ─────────────────────────────────────────────────────────
// Call this when a user joins/leaves or changes role in a tenant.

export async function addUserToRole(
  tenantId: string,
  userId: string,
  roleId: string
): Promise<void> {
  const ref = doc(db, memberRolesPath(tenantId, roleId));
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, { userIds: [userId], updatedAt: serverTimestamp() });
  } else {
    const current = (snap.data() as MemberRoleDoc).userIds ?? [];
    if (!current.includes(userId)) {
      await updateDoc(ref, {
        userIds: [...current, userId],
        updatedAt: serverTimestamp(),
      });
    }
  }
}

export async function removeUserFromRole(
  tenantId: string,
  userId: string,
  roleId: string
): Promise<void> {
  const ref = doc(db, memberRolesPath(tenantId, roleId));
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const current = (snap.data() as MemberRoleDoc).userIds ?? [];
  await updateDoc(ref, {
    userIds: current.filter(id => id !== userId),
    updatedAt: serverTimestamp(),
  });
}

export async function transferUserRole(
  tenantId: string,
  userId: string,
  fromRole: string,
  toRole: string
): Promise<void> {
  await Promise.all([
    removeUserFromRole(tenantId, userId, fromRole),
    addUserToRole(tenantId, userId, toRole),
  ]);
}

// ── Seed helper — call on tenant membership creation ─────────────────────────
// Reads the user's current membership and seeds the role index.
// Should be called from the onboarding/invite flow.

export async function seedRoleIndexFromMembership(
  tenantId: string,
  userId: string
): Promise<void> {
  try {
    const memberSnap = await getDoc(
      doc(db, `users/${userId}/tenantMemberships/${tenantId}`)
    );
    if (!memberSnap.exists()) return;
    const roleId: string = memberSnap.data().roleId;
    await addUserToRole(tenantId, userId, roleId);
  } catch {
    // Best-effort — role index is a cache, not source of truth
  }
}

// ── Assignee resolver for workflow steps ─────────────────────────────────────
// Given a step's requiredRoles, returns the list of userIds who should be assigned.

export async function resolveAssignees(
  tenantId: string,
  requiredRoles: string[]
): Promise<string[]> {
  // 'system' role means automated step — no human assignees
  const humanRoles = requiredRoles.filter(r => r !== 'system');
  if (humanRoles.length === 0) return [];
  return getUsersByRoles(tenantId, humanRoles);
}
