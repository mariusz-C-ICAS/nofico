// e-KRS Pro service — commercial KRS lookup API
// Config is stored in Firestore: integrations/{providerId: 'e-krs-pro'}

import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';

export interface EkrsProConfig {
  apiUrl: string;
  apiKey: string;
}

export interface EkrsCompanyData {
  name: string;
  nip: string;
  regon: string;
  krs: string;
  address: string;
  pkd: string;
  managementBoard: string[];
}

export async function getEkrsProConfig(tenantId: string): Promise<EkrsProConfig | null> {
  try {
    const q = query(
      collection(db, 'integrations'),
      where('tenantId', '==', tenantId),
      where('providerId', '==', 'e-krs-pro'),
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const cfg = snap.docs[0].data()?.config as Record<string, string> | undefined;
    if (!cfg?.apiUrl || !cfg?.apiKey) return null;
    return { apiUrl: cfg.apiUrl, apiKey: cfg.apiKey };
  } catch {
    return null;
  }
}

export async function lookupByKrs(
  krsNumber: string,
  apiUrl: string,
  apiKey: string,
): Promise<EkrsCompanyData | null> {
  const clean = krsNumber.replace(/\s/g, '');
  if (!clean) return null;
  try {
    const res = await fetch(`${apiUrl}/krs/${clean}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    });
    if (!res.ok) return null;
    const json = await res.json();

    return {
      name: String(json.name ?? ''),
      nip: String(json.nip ?? ''),
      regon: String(json.regon ?? ''),
      krs: String(json.krs ?? clean),
      address: String(json.address ?? ''),
      pkd: String(json.pkd ?? ''),
      managementBoard: Array.isArray(json.managementBoard)
        ? (json.managementBoard as unknown[]).map(String)
        : [],
    };
  } catch {
    return null;
  }
}
