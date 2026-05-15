// GUS auto-fill via MF White List VAT API (no API key required)
// Docs: https://www.podatki.gov.pl/e-deklaracje/dokumentacja-it/api-wykazu-podatnikow-vat/

export interface GusCompanyData {
  name: string;
  nip: string;
  regon?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  statusVat: 'Czynny' | 'Zwolniony' | 'Niezarejestrowany' | string;
  accountNumbers?: string[];
  whiteListValid: boolean;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizeNip(nip: string): string {
  return nip.replace(/[\s\-]/g, '');
}

function parseAddress(raw: string): { address: string; city: string; zipCode: string } {
  // Format: "ul. Przykładowa 1, 00-001 Warszawa"
  const zipCity = raw.match(/(\d{2}-\d{3})\s+(.+)$/);
  const city = zipCity?.[2]?.trim() ?? '';
  const zipCode = zipCity?.[1] ?? '';
  const address = raw.replace(/,?\s*\d{2}-\d{3}\s+.+$/, '').trim();
  return { address, city, zipCode };
}

export async function lookupNip(nip: string): Promise<GusCompanyData | null> {
  const clean = normalizeNip(nip);
  if (clean.length !== 10) return null;

  const url = `https://wl-api.mf.gov.pl/api/search/nip/${clean}?date=${todayStr()}`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const json = await res.json();
    const subject = json?.result?.subject;
    if (!subject) return null;

    const workingAddress = subject.workingAddress ?? subject.residenceAddress ?? '';
    const parsed = parseAddress(workingAddress);

    return {
      name: subject.name ?? '',
      nip: subject.nip ?? clean,
      regon: subject.regon,
      address: parsed.address || workingAddress,
      city: parsed.city,
      zipCode: parsed.zipCode,
      statusVat: subject.statusVat ?? '',
      accountNumbers: subject.accountNumbers ?? [],
      whiteListValid: subject.statusVat === 'Czynny',
    };
  } catch {
    return null;
  }
}
