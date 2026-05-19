/**
 * Data: 2026-05-19
 * Zmiany: T3-08 — integracja ZUS PUE API z modułem HR.
 * Ścieżka: /src/modules/hr/services/zusService.ts
 */
import { db } from '../../../shared/lib/firebase';
import { doc, getDoc, collection, addDoc, getDocs, updateDoc, query, where, orderBy } from 'firebase/firestore';
import { Employee } from './HrService';

export interface ZusConfig {
  providerId: 'zus-pue';
  pueToken: string;
  nipPłatnika: string;
  regon: string;
  nazwaPłatnika: string;
}

export interface ZusEmployeeEntry {
  employeeId: string;
  employeeName: string;
  pesel: string;
  grossSalary: number;
  zusEmerytalna: number;         // emerytalne pracownik 9.76%
  zusRentowa: number;            // rentowe pracownik 1.5%
  zusChorobowa: number;          // chorobowe 2.45%
  zusEmerytalnaPracodawca: number; // emerytalne pracodawca 9.76%
  zusRentowaPracodawca: number;    // rentowe pracodawca 6.5%
  zusWypadkowa: number;            // wypadkowe pracodawca ~1.67%
  funduszPracy: number;            // 2.45%
  fgsp: number;                    // 0.1%
  podstawaSkładek: number;
}

export interface ZusDeclaration {
  month: string;
  nipPłatnika: string;
  regon: string;
  nazwaPłatnika: string;
  entries: ZusEmployeeEntry[];
  generatedAt: string;
  xmlContent?: string;
}

export interface ZusSubmission {
  id?: string;
  tenantId: string;
  month: string;
  status: 'pending' | 'submitted' | 'accepted' | 'rejected';
  submittedAt?: string;
  confirmationNumber?: string;
  errorMessage?: string;
  xmlContent: string;
}

const ZUS_RATES = {
  emerytalnaPracownik: 0.0976,
  rentowaPracownik: 0.015,
  chorobowa: 0.0245,
  emerytalnaPracodawca: 0.0976,
  rentowaPracodawca: 0.065,
  wypadkowa: 0.0167,
  funduszPracy: 0.0245,
  fgsp: 0.001,
} as const;

async function getZusConfig(tenantId: string): Promise<ZusConfig> {
  const snap = await getDoc(doc(db, `tenants/${tenantId}/integrations/zus-pue`));
  if (!snap.exists()) {
    throw new Error('Brak konfiguracji ZUS PUE. Skonfiguruj integrację w ustawieniach.');
  }
  const data = snap.data() as ZusConfig;
  if (!data.pueToken || !data.nipPłatnika) {
    throw new Error('Niekompletna konfiguracja ZUS PUE (brak tokenu lub NIP płatnika).');
  }
  return data;
}

function buildEmployeeEntry(emp: Employee & { pesel?: string }): ZusEmployeeEntry {
  const podstawa = emp.salary;
  return {
    employeeId: emp.id,
    employeeName: `${emp.firstName} ${emp.lastName}`,
    pesel: emp.pesel ?? '',
    grossSalary: podstawa,
    podstawaSkładek: podstawa,
    zusEmerytalna: Math.round(podstawa * ZUS_RATES.emerytalnaPracownik * 100) / 100,
    zusRentowa: Math.round(podstawa * ZUS_RATES.rentowaPracownik * 100) / 100,
    zusChorobowa: Math.round(podstawa * ZUS_RATES.chorobowa * 100) / 100,
    zusEmerytalnaPracodawca: Math.round(podstawa * ZUS_RATES.emerytalnaPracodawca * 100) / 100,
    zusRentowaPracodawca: Math.round(podstawa * ZUS_RATES.rentowaPracodawca * 100) / 100,
    zusWypadkowa: Math.round(podstawa * ZUS_RATES.wypadkowa * 100) / 100,
    funduszPracy: Math.round(podstawa * ZUS_RATES.funduszPracy * 100) / 100,
    fgsp: Math.round(podstawa * ZUS_RATES.fgsp * 100) / 100,
  };
}

function buildXml(declaration: ZusDeclaration): string {
  const [year, month] = declaration.month.split('-');
  const rca = declaration.entries.map(e => `
    <RCA>
      <PESEL>${e.pesel}</PESEL>
      <NazwiskoPierwsze>${e.employeeName}</NazwiskoPierwsze>
      <PodstawaEmerytalno>${e.podstawaSkładek.toFixed(2)}</PodstawaEmerytalno>
      <SkładkaEmerytalna>${(e.zusEmerytalna + e.zusEmerytalnaPracodawca).toFixed(2)}</SkładkaEmerytalna>
      <SkładkaRentowa>${(e.zusRentowa + e.zusRentowaPracodawca).toFixed(2)}</SkładkaRentowa>
      <SkładkaChorobowa>${e.zusChorobowa.toFixed(2)}</SkładkaChorobowa>
      <SkładkaWypadkowa>${e.zusWypadkowa.toFixed(2)}</SkładkaWypadkowa>
      <FunduszPracy>${e.funduszPracy.toFixed(2)}</FunduszPracy>
      <FGSP>${e.fgsp.toFixed(2)}</FGSP>
    </RCA>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<Deklaracja xmlns="http://www.zus.pl/2013/08/zus/dra" wersja="1">
  <NaglowekDRA>
    <NIPPlatnika>${declaration.nipPłatnika}</NIPPlatnika>
    <REGON>${declaration.regon}</REGON>
    <NazwaPlatnika>${declaration.nazwaPłatnika}</NazwaPlatnika>
    <OkresRozliczeniowy>${year}-${month}</OkresRozliczeniowy>
    <DataGenerowania>${declaration.generatedAt}</DataGenerowania>
  </NaglowekDRA>
  <DanePracownikow>${rca}
  </DanePracownikow>
</Deklaracja>`;
}

async function generateZusDeclaration(
  tenantId: string,
  month: string,
  employees: (Employee & { pesel?: string })[],
): Promise<ZusDeclaration> {
  const config = await getZusConfig(tenantId);
  const activeEmployees = employees.filter(e => e.status === 'active' && e.contractType === 'UoP');
  const entries = activeEmployees.map(buildEmployeeEntry);

  const declaration: ZusDeclaration = {
    month,
    nipPłatnika: config.nipPłatnika,
    regon: config.regon,
    nazwaPłatnika: config.nazwaPłatnika,
    entries,
    generatedAt: new Date().toISOString(),
  };
  declaration.xmlContent = buildXml(declaration);
  return declaration;
}

async function submitDeclaration(
  tenantId: string,
  declaration: ZusDeclaration,
): Promise<string> {
  const config = await getZusConfig(tenantId);

  const response = await fetch('https://pue.zus.pl/api/v1/declarations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.pueToken}`,
      'Content-Type': 'application/xml',
      'X-Tenant-NIP': config.nipPłatnika,
    },
    body: declaration.xmlContent ?? buildXml(declaration),
  });

  const submissionRef = await addDoc(collection(db, `tenants/${tenantId}/zusSubmissions`), {
    tenantId,
    month: declaration.month,
    status: response.ok ? 'submitted' : 'rejected',
    submittedAt: new Date().toISOString(),
    errorMessage: response.ok ? null : `HTTP ${response.status}`,
    xmlContent: declaration.xmlContent ?? '',
  } satisfies Omit<ZusSubmission, 'id'>);

  if (!response.ok) {
    throw new Error(`Błąd wysyłki do PUE ZUS: HTTP ${response.status}`);
  }

  return submissionRef.id;
}

async function checkSubmissionStatus(
  tenantId: string,
  submissionId: string,
): Promise<ZusSubmission> {
  const snap = await getDoc(doc(db, `tenants/${tenantId}/zusSubmissions`, submissionId));
  if (!snap.exists()) {
    throw new Error(`Nie znaleziono zgłoszenia ${submissionId}`);
  }
  return { id: snap.id, ...snap.data() } as ZusSubmission;
}

async function getSubmissionHistory(tenantId: string): Promise<ZusSubmission[]> {
  const q = query(
    collection(db, `tenants/${tenantId}/zusSubmissions`),
    orderBy('submittedAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as ZusSubmission));
}

export const zusService = {
  getZusConfig,
  generateZusDeclaration,
  submitDeclaration,
  checkSubmissionStatus,
  getSubmissionHistory,
};
