import { addDoc, setDoc, doc, updateDoc, collection, serverTimestamp } from 'firebase/firestore';
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

  const tenantRef = await addDoc(collection(db, 'tenants'), {
    name: companyName,
    ownerId: userId,
    plan: 'trial',
    onboarding: {},
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // doc ID = tenantId — TenantContext uses d.id as currentTenant.id
  await setDoc(doc(db, 'tenantMemberships', tenantRef.id), {
    tenantId: tenantRef.id,
    userId,
    email: userEmail,
    role: 'OWNER',
    status: 'ACTIVE',
    joinedAt: serverTimestamp(),
  });

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

export async function updateCompanyProfile(companyId: string, data: {
  regon?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: { street?: string; city?: string; zip?: string; country?: string };
}): Promise<void> {
  const payload: Record<string, any> = { updatedAt: serverTimestamp() };
  if (data.regon) payload.regon = data.regon;
  if (data.phone) payload.phone = data.phone;
  if (data.email) payload.email = data.email;
  if (data.website) payload.website = data.website;
  if (data.address) {
    const a = data.address;
    payload.address = Object.fromEntries(
      Object.entries({ street: a.street, city: a.city, zip: a.zip, country: a.country ?? 'PL' })
        .filter(([, v]) => Boolean(v))
    );
  }
  await updateDoc(doc(db, 'companies', companyId), payload);
}

export async function createFirstDepartment(tenantId: string, name: string, type: string): Promise<string> {
  const ref = await addDoc(collection(db, 'hr_departments'), {
    name,
    type,
    parentId: null,
    tenantId,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function createMemberInvitation(tenantId: string, email: string, role: string, invitedByEmail: string): Promise<void> {
  await addDoc(collection(db, 'tenantMemberships'), {
    tenantId,
    email,
    role,
    status: 'PENDING',
    invitedBy: invitedByEmail,
    joinedAt: serverTimestamp(),
  });
}

export async function markOnboardingStep(tenantId: string, step: string): Promise<void> {
  await updateDoc(doc(db, 'tenants', tenantId), {
    [`onboarding.${step}`]: true,
    updatedAt: serverTimestamp(),
  });
}

export async function dismissOnboardingChecklist(tenantId: string): Promise<void> {
  await updateDoc(doc(db, 'tenants', tenantId), {
    onboardingDismissed: true,
    updatedAt: serverTimestamp(),
  });
}
