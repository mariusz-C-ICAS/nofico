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

// GUS REGON BIR API data (returned by lookupRegon)
export interface RegonCompanyData {
  name: string;
  nip: string;
  regon: string;
  krs?: string;
  pkd?: string;
  street?: string;
  city?: string;
  postalCode?: string;
  voivodeship?: string;
}

const GUS_BIR_WSDL = 'https://wyszukiwarkaregon.stat.gov.pl/wsBIR/UslugaBIRzewnPubl.svc';

function normalizeRegon(regon: string): string {
  return regon.replace(/[\s\-]/g, '');
}

function buildSoapEnvelope(method: string, body: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:ns="http://CIS/BIR/PUBL/2014/07">
  <soap:Header>
    <ns:${method}>
      ${body}
    </ns:${method}>
  </soap:Header>
  <soap:Body/>
</soap:Envelope>`;
}

function buildLoginEnvelope(apiKey: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:ns="http://CIS/BIR/PUBL/2014/07">
  <soap:Body>
    <ns:Zaloguj>
      <ns:pKluczUzytkownika>${apiKey}</ns:pKluczUzytkownika>
    </ns:Zaloguj>
  </soap:Body>
</soap:Envelope>`;
}

function buildSearchEnvelope(regon: string, sessionKey: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:ns="http://CIS/BIR/PUBL/2014/07">
  <soap:Header>
    <ns:ZalogowanyToken>${sessionKey}</ns:ZalogowanyToken>
  </soap:Header>
  <soap:Body>
    <ns:DaneSzukajPodmioty>
      <ns:pParametryWyszukiwania>
        <ns:Regon>${regon}</ns:Regon>
      </ns:pParametryWyszukiwania>
    </ns:DaneSzukajPodmioty>
  </soap:Body>
</soap:Envelope>`;
}

function extractTextBetweenTags(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
  return match?.[1]?.trim() ?? '';
}

function parseRegonXmlResult(xml: string): RegonCompanyData | null {
  const name = extractTextBetweenTags(xml, 'Nazwa');
  const regon = extractTextBetweenTags(xml, 'Regon');
  const nip = extractTextBetweenTags(xml, 'Nip');
  if (!name || !regon) return null;

  const street = [
    extractTextBetweenTags(xml, 'Ulica'),
    extractTextBetweenTags(xml, 'NrNieruchomosci'),
    extractTextBetweenTags(xml, 'NrLokalu'),
  ].filter(Boolean).join(' ');

  return {
    name,
    nip,
    regon,
    krs: extractTextBetweenTags(xml, 'Krs') || undefined,
    pkd: extractTextBetweenTags(xml, 'PkdKod') || undefined,
    street: street || undefined,
    city: extractTextBetweenTags(xml, 'Miejscowosc') || undefined,
    postalCode: extractTextBetweenTags(xml, 'KodPocztowy') || undefined,
    voivodeship: extractTextBetweenTags(xml, 'Wojewodztwo') || undefined,
  };
}

async function birLogin(apiKey: string): Promise<string | null> {
  const res = await fetch(GUS_BIR_WSDL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/soap+xml; charset=utf-8',
      SOAPAction: 'http://CIS/BIR/PUBL/2014/07/IUslugaBIRzewnPubl/Zaloguj',
    },
    body: buildLoginEnvelope(apiKey),
  });
  if (!res.ok) return null;
  const text = await res.text();
  const token = extractTextBetweenTags(text, 'ZalogujResult');
  return token || null;
}

/**
 * Lookup company data from GUS REGON BIR API.
 * NOTE: GUS BIR SOAP endpoint does NOT send CORS headers, so direct browser calls
 * will be blocked by the browser. This function will throw a network error in that
 * case. A backend proxy (Cloud Function) is required for production use.
 * The function is structured correctly for use via a proxy or in a Node.js context.
 */
export async function lookupRegon(
  regonNumber: string,
  apiKey: string,
): Promise<RegonCompanyData | null> {
  const clean = normalizeRegon(regonNumber);
  if (clean.length !== 9 && clean.length !== 14) return null;

  try {
    const sessionKey = await birLogin(apiKey);
    if (!sessionKey) return null;

    const searchRes = await fetch(GUS_BIR_WSDL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/soap+xml; charset=utf-8',
        SOAPAction: 'http://CIS/BIR/PUBL/2014/07/IUslugaBIRzewnPubl/DaneSzukajPodmioty',
        sid: sessionKey,
      },
      body: buildSearchEnvelope(clean, sessionKey),
    });
    if (!searchRes.ok) return null;
    const xml = await searchRes.text();
    return parseRegonXmlResult(xml);
  } catch {
    return null;
  }
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
