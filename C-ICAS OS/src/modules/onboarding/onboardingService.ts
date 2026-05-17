import { addDoc, setDoc, doc, updateDoc, collection, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../core/firebase/config';

export interface KrsCompanyData {
  name: string;
  regon?: string;
  krs?: string;
  street?: string;
  zip?: string;
  city?: string;
}

export async function checkNipExists(nip: string): Promise<number> {
  const snap = await getDocs(query(collection(db, 'companies'), where('nip', '==', nip)));
  return snap.size;
}

export async function fetchCompanyByNip(nip: string): Promise<KrsCompanyData | null> {
  const today = new Date().toISOString().split('T')[0];
  try {
    const res = await fetch(
      `https://wl-api.mf.gov.pl/api/search/nip/${nip}?date=${today}`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const s = data?.result?.subject;
    if (!s?.name) return null;

    // Parse address: "ul. Przykładowa 1, 00-001 Warszawa"
    let street: string | undefined;
    let zip: string | undefined;
    let city: string | undefined;
    const raw: string = s.workingAddress ?? s.residenceAddress ?? '';
    if (raw) {
      const parts = raw.split(',').map((p: string) => p.trim());
      const lastPart = parts[parts.length - 1] ?? '';
      const zipMatch = lastPart.match(/^(\d{2}-\d{3})\s+(.+)$/);
      if (zipMatch) {
        zip = zipMatch[1];
        city = zipMatch[2];
        street = parts.slice(0, -1).join(', ');
      } else {
        street = raw;
      }
    }

    return {
      name: s.name as string,
      regon: s.regon ?? undefined,
      krs: s.krs ?? undefined,
      street,
      zip,
      city,
    };
  } catch {
    return null;
  }
}

export interface OnboardingInput {
  companyName: string;
  nip?: string;
  industries?: string[];
  userId: string;
  userEmail: string;
}

export async function createTenantWithCompany(input: OnboardingInput): Promise<{ tenantId: string; companyId: string }> {
  const { companyName, nip, industries, userId, userEmail } = input;

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
    ...(industries && industries.length > 0 && { industries }),
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
    status: 'INVITED',
    invitedBy: invitedByEmail,
    joinedAt: serverTimestamp(),
  });
  // Queue invitation email via Firebase Trigger Email extension (non-fatal if not configured)
  addDoc(collection(db, 'mail'), {
    to: email,
    tenantId,
    message: {
      subject: 'Zaproszenie do C-ICAS OS',
      html: `<p>Zostałeś zaproszony do systemu C-ICAS OS przez <strong>${invitedByEmail}</strong>.</p><p>Rola: <strong>${role}</strong></p><p><a href="https://c-icas-os-59896.web.app">Kliknij tutaj, aby dołączyć</a></p>`,
    },
  }).catch(() => { /* mail extension not configured — ignored */ });
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
