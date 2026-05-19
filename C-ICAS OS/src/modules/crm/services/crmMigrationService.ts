// CRM Migration — import contacts from HubSpot & Pipedrive
// HubSpot config: integrations/{providerId: 'hubspot'}, config.apiKey = token
// Pipedrive config: integrations/{providerId: 'pipedrive'}, config.apiKey = token

import {
  collection, query, where, getDocs, addDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';

export type CrmImportSource = 'hubspot' | 'pipedrive';

export interface ImportContact {
  name: string;
  email: string;
  company: string;
  phone?: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
}

// ── HubSpot ───────────────────────────────────────────────────────────────────

export async function getHubSpotConfig(tenantId: string): Promise<string | null> {
  try {
    const q = query(
      collection(db, 'integrations'),
      where('tenantId', '==', tenantId),
      where('providerId', '==', 'hubspot'),
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const cfg = snap.docs[0].data()?.config as Record<string, string> | undefined;
    return cfg?.apiKey ?? null;
  } catch {
    return null;
  }
}

export async function fetchHubSpotContacts(
  token: string,
  limit = 100,
): Promise<ImportContact[]> {
  const url = `https://api.hubapi.com/crm/v3/objects/contacts?limit=${limit}&properties=firstname,lastname,email,company,phone`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HubSpot API error: ${res.status}`);
  const json = await res.json();
  const results = (json.results ?? []) as Record<string, Record<string, string>>[];
  return results.map(r => ({
    name: [r.properties?.firstname, r.properties?.lastname].filter(Boolean).join(' ') || 'Brak nazwy',
    email: r.properties?.email ?? '',
    company: r.properties?.company ?? '',
    phone: r.properties?.phone,
  }));
}

// ── Pipedrive ─────────────────────────────────────────────────────────────────

export async function getPipedriveConfig(tenantId: string): Promise<string | null> {
  try {
    const q = query(
      collection(db, 'integrations'),
      where('tenantId', '==', tenantId),
      where('providerId', '==', 'pipedrive'),
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const cfg = snap.docs[0].data()?.config as Record<string, string> | undefined;
    return cfg?.apiKey ?? null;
  } catch {
    return null;
  }
}

export async function fetchPipedrivePersons(
  token: string,
  limit = 100,
): Promise<ImportContact[]> {
  const url = `https://api.pipedrive.com/v1/persons?api_token=${token}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Pipedrive API error: ${res.status}`);
  const json = await res.json();
  const data = (json.data ?? []) as Record<string, unknown>[];
  return data.map(p => {
    const emailArr = p.email as { value: string }[] | undefined;
    const phoneArr = p.phone as { value: string }[] | undefined;
    const org = p.org_id as { name: string } | null | undefined;
    return {
      name: String(p.name ?? 'Brak nazwy'),
      email: emailArr?.[0]?.value ?? '',
      company: org?.name ?? '',
      phone: phoneArr?.[0]?.value,
    };
  });
}

// ── Import to Firestore (deduplicated by email) ───────────────────────────────

export async function importContactsToCRM(
  tenantId: string,
  contacts: ImportContact[],
  source: CrmImportSource,
): Promise<ImportResult> {
  // Fetch existing emails to deduplicate
  const existingSnap = await getDocs(
    query(collection(db, 'customers'), where('tenantId', '==', tenantId)),
  );
  const existingEmails = new Set<string>();
  existingSnap.docs.forEach(d => {
    const email = d.data().email as string | undefined;
    if (email) existingEmails.add(email.toLowerCase().trim());
  });

  let imported = 0;
  let skipped = 0;

  for (const contact of contacts) {
    const emailKey = contact.email.toLowerCase().trim();
    if (emailKey && existingEmails.has(emailKey)) {
      skipped++;
      continue;
    }
    await addDoc(collection(db, 'customers'), {
      tenantId,
      customerType: 'business',
      name: contact.name,
      email: contact.email || null,
      phone: contact.phone || null,
      company: contact.company || null,
      status: 'prospect',
      tags: [source],
      importSource: source,
      leadScore: 0,
      serviceEventCount: 0,
      totalRevenue: 0,
      currency: 'PLN',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    if (emailKey) existingEmails.add(emailKey);
    imported++;
  }

  return { imported, skipped };
}
