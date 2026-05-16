import { addDoc, setDoc, doc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../core/firebase/config';

export interface OnboardingInput {
  companyName: string;
  nip?: string;
  industry?: string;
  userId: string;
  userEmail: string;
}

export async function createTenantWithCompany(input: OnboardingInput): Promise<{ tenantId: string; companyId: string }> {
  const { companyName, nip, industry, userId, userEmail } = input;

  // 1. Tenant
  const tenantRef = await addDoc(collection(db, 'tenants'), {
    name: companyName,
    ownerId: userId,
    plan: 'trial',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 2. Membership — doc ID = tenantId (TenantContext uses d.id as currentTenant.id)
  await setDoc(doc(db, 'tenantMemberships', tenantRef.id), {
    userId,
    email: userEmail,
    role: 'OWNER',
    name: companyName,
    status: 'ACTIVE',
    joinedAt: serverTimestamp(),
  });

  // 3. Firma
  const companyRef = await addDoc(collection(db, 'companies'), {
    tenantId: tenantRef.id,
    name: companyName,
    ...(nip && { nip }),
    ...(industry && { industry }),
    isActive: true,
    createdAt: serverTimestamp(),
  });

  return { tenantId: tenantRef.id, companyId: companyRef.id };
}
