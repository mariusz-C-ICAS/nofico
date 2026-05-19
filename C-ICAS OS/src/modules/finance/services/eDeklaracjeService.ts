/**
 * Data: 2026-05-19
 * Zmiany: Serwis e-Deklaracje — konfiguracja, generowanie JPK-VAT, wysyłka deklaracji (symulacja).
 * Ścieżka: /src/modules/finance/services/eDeklaracjeService.ts
 */
import { db } from '../../../shared/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import type { SalesInvoice } from '../types/fiTypes';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DeclarationType = 'JPK_VAT' | 'CIT' | 'PIT';

export interface EDeklaracjeConfig {
  providerId: string;
  certificatePath?: string;
  certificatePassword?: string;
  nip: string;
  companyName: string;
  address: string;
  hasCertificate: boolean;
}

export interface SubmitResult {
  referenceNumber: string;
  status: 'submitted' | 'error';
  message: string;
}

export interface DeclarationHistoryEntry {
  id?: string;
  type: DeclarationType;
  period: string;
  referenceNumber: string;
  status: 'submitted' | 'error';
  message: string;
  submittedAt: unknown;
}

export interface JpkVatPreview {
  xml: string;
  salesCount: number;
  totalVatDue: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escXml(v: string | number | undefined | null): string {
  if (v === undefined || v === null) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function fmt(n: number): string {
  return n.toFixed(2);
}

function lastDayOfMonth(period: string): string {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(y, m, 0).getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function generateRefNumber(type: DeclarationType, period: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  const prefix = type === 'JPK_VAT' ? 'JPK' : type === 'CIT' ? 'CIT' : 'PIT';
  const periodShort = period.replace('-', '');
  return `${prefix}-${periodShort}-${ts}`;
}

// ─── Config ───────────────────────────────────────────────────────────────────

export async function getEDeklaracjeConfig(
  tenantId: string
): Promise<EDeklaracjeConfig> {
  const integrationsRef = collection(db, `tenants/${tenantId}/integrations`);
  const snap = await getDocs(
    query(integrationsRef, where('providerId', '==', 'e-deklaracje'))
  );

  if (snap.empty) {
    throw new Error('Brak konfiguracji e-Deklaracje. Skonfiguruj integrację w module Integracje.');
  }

  const data = snap.docs[0].data() as {
    config?: {
      nip?: string;
      companyName?: string;
      address?: string;
      certificatePath?: string;
      certificatePassword?: string;
    };
  };

  const cfg = data.config ?? {};

  if (!cfg.nip) {
    throw new Error('Brak NIP w konfiguracji e-Deklaracje.');
  }

  return {
    providerId: 'e-deklaracje',
    nip: cfg.nip,
    companyName: cfg.companyName ?? '',
    address: cfg.address ?? '',
    certificatePath: cfg.certificatePath,
    certificatePassword: cfg.certificatePassword,
    hasCertificate: Boolean(cfg.certificatePath),
  };
}

// ─── JPK-VAT Generation ───────────────────────────────────────────────────────

export async function generateJpkVat(
  tenantId: string,
  period: string
): Promise<JpkVatPreview> {
  const [cfg, invoices] = await Promise.all([
    getEDeklaracjeConfig(tenantId),
    fetchSalesInvoices(tenantId, period),
  ]);

  const now = new Date().toISOString().replace('Z', '').substring(0, 19);
  const dateFrom = `${period}-01`;
  const dateTo = lastDayOfMonth(period);

  const wiersze = invoices
    .map((inv, i) => buildSprzedazWiersz(inv, i + 1))
    .join('');

  const totalVatDue = invoices.reduce((acc, inv) => acc + (inv.totalVat ?? 0), 0);

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<JPK xmlns="http://jpk.mf.gov.pl/wzor/2022/02/17/02170/">\n` +
    `  <Naglowek>\n` +
    `    <KodFormularza kodSystemowy="JPK_V7M (2)" wersjaSchemy="1-0E">JPK_V7M</KodFormularza>\n` +
    `    <WariantFormularza>2</WariantFormularza>\n` +
    `    <CelZlozenia poz="P_7">1</CelZlozenia>\n` +
    `    <DataPrzygotowania>${now}</DataPrzygotowania>\n` +
    `    <DataOd>${dateFrom}</DataOd>\n` +
    `    <DataDo>${dateTo}</DataDo>\n` +
    `    <NazwaSystemu>NoFiCo v3 e-Deklaracje</NazwaSystemu>\n` +
    `  </Naglowek>\n` +
    `  <Podmiot1>\n` +
    `    <OsobaNiefizyczna>\n` +
    `      <NIP>${escXml(cfg.nip.replace(/[^0-9]/g, ''))}</NIP>\n` +
    `      <PelnaNazwa>${escXml(cfg.companyName)}</PelnaNazwa>\n` +
    `    </OsobaNiefizyczna>\n` +
    `    <AdresZamieszkaniaSiedziby rodzajAdresu="RAD">\n` +
    `      <Ulica>${escXml(cfg.address)}</Ulica>\n` +
    `    </AdresZamieszkaniaSiedziby>\n` +
    `  </Podmiot1>\n` +
    `  <Ewidencja>\n` +
    wiersze +
    `    <SprzedazCtrl>\n` +
    `      <LiczbaWierszy>${invoices.length}</LiczbaWierszy>\n` +
    `      <PodatekNalezny>${fmt(totalVatDue)}</PodatekNalezny>\n` +
    `    </SprzedazCtrl>\n` +
    `  </Ewidencja>\n` +
    `  <Deklaracja>\n` +
    `    <Pouczenia>1</Pouczenia>\n` +
    `  </Deklaracja>\n` +
    `</JPK>`;

  return {
    xml,
    salesCount: invoices.length,
    totalVatDue: Math.round(totalVatDue * 100) / 100,
  };
}

async function fetchSalesInvoices(
  tenantId: string,
  period: string
): Promise<SalesInvoice[]> {
  const dateFrom = `${period}-01`;
  const dateTo = lastDayOfMonth(period);
  const col = collection(db, 'tenants', tenantId, 'invoices');
  const q = query(
    col,
    where('isDeleted', '==', false),
    where('issueDate', '>=', dateFrom),
    where('issueDate', '<=', dateTo)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SalesInvoice));
}

function buildSprzedazWiersz(inv: SalesInvoice, lp: number): string {
  const rows = inv.vatSummary ?? [];
  return (
    `    <SprzedazWiersz>\n` +
    `      <LpSprzedazy>${lp}</LpSprzedazy>\n` +
    `      <NrKontrahenta>${escXml(inv.buyer.nip ?? inv.buyer.euVatId ?? '')}</NrKontrahenta>\n` +
    `      <NazwaKontrahenta>${escXml(inv.buyer.name)}</NazwaKontrahenta>\n` +
    `      <DowodSprzedazy>${escXml(inv.number)}</DowodSprzedazy>\n` +
    `      <DataSprzedazy>${escXml(inv.saleDate ?? inv.issueDate)}</DataSprzedazy>\n` +
    `      <DataWystawienia>${escXml(inv.issueDate)}</DataWystawienia>\n` +
    `      <K_19>${fmt(rows.find((r) => r.vatRate === 23)?.netto ?? 0)}</K_19>\n` +
    `      <K_20>${fmt(rows.find((r) => r.vatRate === 23)?.vat ?? 0)}</K_20>\n` +
    `      <K_17>${fmt(rows.find((r) => r.vatRate === 8)?.netto ?? 0)}</K_17>\n` +
    `      <K_18>${fmt(rows.find((r) => r.vatRate === 8)?.vat ?? 0)}</K_18>\n` +
    `      <K_15>${fmt(rows.find((r) => r.vatRate === 5)?.netto ?? 0)}</K_15>\n` +
    `      <K_16>${fmt(rows.find((r) => r.vatRate === 5)?.vat ?? 0)}</K_16>\n` +
    `    </SprzedazWiersz>\n`
  );
}

// ─── Submit Declaration ───────────────────────────────────────────────────────

export async function submitDeclaration(
  tenantId: string,
  type: DeclarationType,
  period: string
): Promise<SubmitResult> {
  let cfg: EDeklaracjeConfig;
  try {
    cfg = await getEDeklaracjeConfig(tenantId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { referenceNumber: '', status: 'error', message: msg };
  }

  if (!cfg.hasCertificate) {
    return {
      referenceNumber: '',
      status: 'error',
      message: 'Brak certyfikatu e-Deklaracje. Skonfiguruj certyfikat w ustawieniach integracji.',
    };
  }

  // Symulacja submit — w produkcji wywołanie MF Gateway
  const referenceNumber = generateRefNumber(type, period);

  const entry: Omit<DeclarationHistoryEntry, 'id'> = {
    type,
    period,
    referenceNumber,
    status: 'submitted',
    message: `Deklaracja ${type} za okres ${period} wysłana pomyślnie (symulacja).`,
    submittedAt: serverTimestamp(),
  };

  await addDoc(
    collection(db, `tenants/${tenantId}/eDeklaracje`),
    entry
  );

  return {
    referenceNumber,
    status: 'submitted',
    message: entry.message,
  };
}

// ─── History ──────────────────────────────────────────────────────────────────

export async function getDeclarationHistory(
  tenantId: string
): Promise<DeclarationHistoryEntry[]> {
  const col = collection(db, `tenants/${tenantId}/eDeklaracje`);
  const snap = await getDocs(col);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as DeclarationHistoryEntry));
}
