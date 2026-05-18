import { db } from '../../../shared/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const GUS_BIR_API = 'https://wyszukiwarkaregon.stat.gov.pl/api';

export interface GusCompanyData {
  nip: string;
  regon?: string;
  name?: string;
  street?: string;
  city?: string;
  postalCode?: string;
  voivodeship?: string;
  legalForm?: string;
  isActive?: boolean;
}

export async function searchByNip(
  nip: string,
  tenantId: string,
  _userKey?: string
): Promise<GusCompanyData | null> {
  const cleanNip = nip.replace(/[-\s]/g, '');
  try {
    const res = await fetch(`${GUS_BIR_API}/search?nip=${cleanNip}`);
    if (!res.ok) return null;
    const data = await res.json();
    const entry = data?.[0];
    if (!entry) return null;
    const result: GusCompanyData = {
      nip: cleanNip,
      regon: entry.Regon,
      name: entry.Nazwa,
      street: `${entry.Ulica ?? ''} ${entry.NrNieruchomosci ?? ''}`.trim(),
      city: entry.Miejscowosc,
      postalCode: entry.KodPocztowy,
      voivodeship: entry.Wojewodztwo,
      legalForm: entry.FormaWlasnosci,
      isActive: true,
    };
    await addDoc(collection(db, 'tenants', tenantId, 'nipLookups'), {
      ...result,
      checkedAt: serverTimestamp(),
    });
    return result;
  } catch {
    return null;
  }
}
