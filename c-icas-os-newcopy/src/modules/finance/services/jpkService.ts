/**
 * Data: 2026-05-16
 * Zmiany: Serwis generowania plików JPK (V7M + KR) zgodnych ze schematami MF.
 * Ścieżka: /src/modules/finance/services/jpkService.ts
 */
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import type { SalesInvoice, PurchaseInvoice, VatSummaryRow } from '../types/fiTypes';

// ─── Pomocnicze ───────────────────────────────────────────────────────────────

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

/** Ostatni dzien miesiąca YYYY-MM */
function lastDayOfMonth(period: string): string {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(y, m, 0).getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Pole KodSystemowyStawki dla JPK_V7M */
function vatRateCode(rate: SalesInvoice['vatSummary'][0]['vatRate']): string {
  if (rate === 23) return 'K_19';
  if (rate === 8)  return 'K_17';
  if (rate === 5)  return 'K_15';
  if (rate === 0)  return 'K_13';
  if (rate === 'zw') return 'K_13';
  if (rate === 'np') return 'K_11';
  return 'K_11';
}

/** Numeryczny kod stawki VAT wg JPK_V7M */
function vatRateSymbol(rate: VatSummaryRow['vatRate']): string {
  if (rate === 23) return '23';
  if (rate === 8)  return '8';
  if (rate === 5)  return '5';
  if (rate === 0)  return '0';
  if (rate === 'zw') return 'zw';
  if (rate === 'np') return 'np';
  return 'oo';
}

// ─── Pobieranie danych z Firestore ───────────────────────────────────────────

async function fetchSalesInvoicesForPeriod(
  db: any,
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
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as SalesInvoice));
}

async function fetchPurchaseInvoicesForPeriod(
  db: any,
  tenantId: string,
  period: string
): Promise<PurchaseInvoice[]> {
  const dateFrom = `${period}-01`;
  const dateTo = lastDayOfMonth(period);
  const col = collection(db, 'tenants', tenantId, 'purchaseInvoices');
  const q = query(
    col,
    where('isDeleted', '==', false),
    where('issueDate', '>=', dateFrom),
    where('issueDate', '<=', dateTo)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as PurchaseInvoice));
}

// ─── Nagłówek XML ─────────────────────────────────────────────────────────────

function buildNaglowek(
  kodFormularza: string,
  wariant: string,
  period: string
): string {
  const now = new Date().toISOString().replace('Z', '').substring(0, 19);
  const dateFrom = `${period}-01`;
  const dateTo = lastDayOfMonth(period);
  return `
  <Naglowek>
    <KodFormularza kodSystemowy="${kodFormularza}" wersjaSchemy="1-0E">${kodFormularza.split(' ')[0]}</KodFormularza>
    <WariantFormularza>${wariant}</WariantFormularza>
    <CelZlozenia poz="P_7">1</CelZlozenia>
    <DataPrzygotowania>${now}</DataPrzygotowania>
    <DataOd>${dateFrom}</DataOd>
    <DataDo>${dateTo}</DataDo>
    <NazwaSystemu>NoFiCo v3</NazwaSystemu>
  </Naglowek>`;
}

function buildPodmiot(info: { name: string; nip: string; address: string }): string {
  return `
  <Podmiot1>
    <OsobaNiefizyczna>
      <NIP>${escXml(info.nip.replace(/[^0-9]/g, ''))}</NIP>
      <PelnaNazwa>${escXml(info.name)}</PelnaNazwa>
      <REGON/>
    </OsobaNiefizyczna>
    <AdresZamieszkaniaSiedziby rodzajAdresu="RAD">
      <Ulica>${escXml(info.address)}</Ulica>
    </AdresZamieszkaniaSiedziby>
  </Podmiot1>`;
}

// ─── JPK_V7M ─────────────────────────────────────────────────────────────────

function buildSprzedazWiersz(inv: SalesInvoice, lp: number): string {
  const rows = inv.vatSummary ?? [];
  const vatFields = rows.map((r, i) => {
    const sym = vatRateSymbol(r.vatRate);
    return `
      <StawkaPodatku${i + 1}>${sym}</StawkaPodatku${i + 1}>
      <PodstawaOpodatkowania${i + 1}>${fmt(r.netto)}</PodstawaOpodatkowania${i + 1}>
      <PodatekNalezny${i + 1}>${fmt(r.vat)}</PodatekNalezny${i + 1}>`;
  }).join('');

  return `
    <SprzedazWiersz>
      <LpSprzedazy>${lp}</LpSprzedazy>
      <NrKontrahenta>${escXml(inv.buyer.nip ?? inv.buyer.euVatId ?? '')}</NrKontrahenta>
      <NazwaKontrahenta>${escXml(inv.buyer.name)}</NazwaKontrahenta>
      <DowodSprzedazy>${escXml(inv.number)}</DowodSprzedazy>
      <DataSprzedazy>${escXml(inv.saleDate ?? inv.issueDate)}</DataSprzedazy>
      <DataWystawienia>${escXml(inv.issueDate)}</DataWystawienia>${vatFields}
      <K_19>${fmt(rows.find(r => r.vatRate === 23)?.netto ?? 0)}</K_19>
      <K_20>${fmt(rows.find(r => r.vatRate === 23)?.vat ?? 0)}</K_20>
      <K_17>${fmt(rows.find(r => r.vatRate === 8)?.netto ?? 0)}</K_17>
      <K_18>${fmt(rows.find(r => r.vatRate === 8)?.vat ?? 0)}</K_18>
      <K_15>${fmt(rows.find(r => r.vatRate === 5)?.netto ?? 0)}</K_15>
      <K_16>${fmt(rows.find(r => r.vatRate === 5)?.vat ?? 0)}</K_16>
      <K_13>${fmt(rows.find(r => r.vatRate === 0 || r.vatRate === 'zw')?.netto ?? 0)}</K_13>
    </SprzedazWiersz>`;
}

function buildZakupWiersz(inv: PurchaseInvoice, lp: number): string {
  const rows = inv.vatSummary ?? [];
  return `
    <ZakupWiersz>
      <LpZakupu>${lp}</LpZakupu>
      <NrDostawcy>${escXml(inv.seller.nip ?? inv.seller.euVatId ?? '')}</NrDostawcy>
      <NazwaDostawcy>${escXml(inv.seller.name)}</NazwaDostawcy>
      <DowodZakupu>${escXml(inv.supplierInvoiceNumber)}</DowodZakupu>
      <DataZakupu>${escXml(inv.issueDate)}</DataZakupu>
      <DataWplywu>${escXml(inv.receiveDate ?? inv.issueDate)}</DataWplywu>
      <K_41>${fmt(rows.find(r => r.vatRate === 23)?.netto ?? 0)}</K_41>
      <K_42>${fmt(rows.find(r => r.vatRate === 23)?.vat ?? 0)}</K_42>
      <K_43>${fmt(rows.find(r => r.vatRate === 8)?.netto ?? 0)}</K_43>
      <K_44>${fmt(rows.find(r => r.vatRate === 8)?.vat ?? 0)}</K_44>
      <K_45>${fmt(rows.find(r => r.vatRate === 5)?.netto ?? 0)}</K_45>
      <K_46>${fmt(rows.find(r => r.vatRate === 5)?.vat ?? 0)}</K_46>
    </ZakupWiersz>`;
}

export interface JpkV7MStats {
  salesCount: number;
  purchaseCount: number;
  totalVatDue: number;
  totalVatDeductible: number;
}

export async function generateJpkV7M(
  db: any,
  tenantId: string,
  period: string,
  taxPayerInfo: { name: string; nip: string; address: string }
): Promise<{ xml: string; stats: JpkV7MStats }> {
  const [sales, purchases] = await Promise.all([
    fetchSalesInvoicesForPeriod(db, tenantId, period),
    fetchPurchaseInvoicesForPeriod(db, tenantId, period),
  ]);

  const sprzedazWiersze = sales
    .map((inv, i) => buildSprzedazWiersz(inv, i + 1))
    .join('');

  const totalVatDue = sales.reduce((acc, inv) => acc + (inv.totalVat ?? 0), 0);

  const sprzedazCtrl = `
    <SprzedazCtrl>
      <LiczbaWierszy>${sales.length}</LiczbaWierszy>
      <PodatekNalezny>${fmt(totalVatDue)}</PodatekNalezny>
    </SprzedazCtrl>`;

  const zakupWiersze = purchases
    .map((inv, i) => buildZakupWiersz(inv, i + 1))
    .join('');

  const totalVatDeductible = purchases.reduce((acc, inv) => acc + (inv.totalVat ?? 0), 0);

  const zakupCtrl = `
    <ZakupCtrl>
      <LiczbaWierszy>${purchases.length}</LiczbaWierszy>
      <PodatekNaliczony>${fmt(totalVatDeductible)}</PodatekNaliczony>
    </ZakupCtrl>`;

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<JPK xmlns="http://jpk.mf.gov.pl/wzor/2022/02/17/02170/" xmlns:etd="http://crd.gov.pl/xml/schematy/dziedzinowe/mf/2022/01/05/eD/DefinicjeTypy/">` +
    buildNaglowek('JPK_V7M (2)', '2', period) +
    buildPodmiot(taxPayerInfo) +
    `
  <Ewidencja>${sprzedazWiersze}${sprzedazCtrl}${zakupWiersze}${zakupCtrl}
  </Ewidencja>
  <Deklaracja>
    <Pouczenia>1</Pouczenia>
  </Deklaracja>` +
    `</JPK>`;

  return {
    xml,
    stats: {
      salesCount: sales.length,
      purchaseCount: purchases.length,
      totalVatDue: Math.round(totalVatDue * 100) / 100,
      totalVatDeductible: Math.round(totalVatDeductible * 100) / 100,
    },
  };
}

// ─── JPK_KR ──────────────────────────────────────────────────────────────────

interface JournalEntry {
  id?: string;
  date: string;
  number: string;
  description: string;
  debit: number;   // Wn
  credit: number;  // Ma
  accountWn: string;
  accountMa: string;
}

async function fetchJournalEntries(
  db: any,
  tenantId: string,
  period: string
): Promise<JournalEntry[]> {
  const dateFrom = `${period.substring(0, 7)}-01`;
  const dateTo = lastDayOfMonth(period.substring(0, 7));
  const col = collection(db, 'tenants', tenantId, 'journals');
  const q = query(
    col,
    where('date', '>=', dateFrom),
    where('date', '<=', dateTo)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as JournalEntry));
}

async function fetchChartOfAccounts(
  db: any,
  tenantId: string
): Promise<{ number: string; name: string }[]> {
  const col = collection(db, 'tenants', tenantId, 'chartOfAccounts');
  const snap = await getDocs(col);
  return snap.docs.map(d => d.data() as { number: string; name: string });
}

function buildKrZapis(entry: JournalEntry, lp: number): string {
  return `
    <ZapisKsiegowy>
      <LpZapisu>${lp}</LpZapisu>
      <NrDokumentu>${escXml(entry.number)}</NrDokumentu>
      <DataOperacji>${escXml(entry.date)}</DataOperacji>
      <OpisOperacji>${escXml(entry.description)}</OpisOperacji>
      <KwotaWn>${fmt(entry.debit ?? 0)}</KwotaWn>
      <KwotaMa>${fmt(entry.credit ?? 0)}</KwotaMa>
      <KontoWn>${escXml(entry.accountWn ?? '')}</KontoWn>
      <KontoMa>${escXml(entry.accountMa ?? '')}</KontoMa>
    </ZapisKsiegowy>`;
}

function buildKontoSaldo(
  konto: { number: string; name: string },
  entries: JournalEntry[],
  lp: number
): string {
  const obrotyWn = entries
    .filter(e => e.accountWn === konto.number)
    .reduce((s, e) => s + (e.debit ?? 0), 0);
  const obrotyMa = entries
    .filter(e => e.accountMa === konto.number)
    .reduce((s, e) => s + (e.credit ?? 0), 0);
  const saldoWn = Math.max(0, obrotyWn - obrotyMa);
  const saldoMa = Math.max(0, obrotyMa - obrotyWn);
  return `
    <KontoSaldo>
      <LpKonta>${lp}</LpKonta>
      <NrKonta>${escXml(konto.number)}</NrKonta>
      <NazwaKonta>${escXml(konto.name)}</NazwaKonta>
      <ObrotyWn>${fmt(obrotyWn)}</ObrotyWn>
      <ObrotyMa>${fmt(obrotyMa)}</ObrotyMa>
      <SaldoWn>${fmt(saldoWn)}</SaldoWn>
      <SaldoMa>${fmt(saldoMa)}</SaldoMa>
    </KontoSaldo>`;
}

export interface JpkKrStats {
  entriesCount: number;
  totalWn: number;
  totalMa: number;
}

export async function generateJpkKr(
  db: any,
  tenantId: string,
  period: string,
  taxPayerInfo: { name: string; nip: string; address: string }
): Promise<{ xml: string; stats: JpkKrStats }> {
  const monthPeriod = period.substring(0, 7); // YYYY-MM

  const [entries, coa] = await Promise.all([
    fetchJournalEntries(db, tenantId, period),
    fetchChartOfAccounts(db, tenantId),
  ]);

  const zapisy = entries.map((e, i) => buildKrZapis(e, i + 1)).join('');

  const usedAccounts = coa.filter(k =>
    entries.some(e => e.accountWn === k.number || e.accountMa === k.number)
  );
  const saldaKont = usedAccounts.map((k, i) => buildKontoSaldo(k, entries, i + 1)).join('');

  const totalWn = entries.reduce((s, e) => s + (e.debit ?? 0), 0);
  const totalMa = entries.reduce((s, e) => s + (e.credit ?? 0), 0);

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<JPK xmlns="http://jpk.mf.gov.pl/wzor/2016/10/26/10261/" xmlns:etd="http://crd.gov.pl/xml/schematy/dziedzinowe/mf/2016/01/05/eD/DefinicjeTypy/">` +
    buildNaglowek('JPK_KR (1)', '1', monthPeriod) +
    buildPodmiot(taxPayerInfo) +
    `
  <KsiegiRachunkowe>
    <ZapisyKsiegowe>${zapisy}
    </ZapisyKsiegowe>
    <SaldaKont>${saldaKont}
    </SaldaKont>
    <KsiegiCtrl>
      <LiczbaZapisow>${entries.length}</LiczbaZapisow>
      <SumaWn>${fmt(totalWn)}</SumaWn>
      <SumaMa>${fmt(totalMa)}</SumaMa>
    </KsiegiCtrl>
  </KsiegiRachunkowe>` +
    `</JPK>`;

  return {
    xml,
    stats: {
      entriesCount: entries.length,
      totalWn: Math.round(totalWn * 100) / 100,
      totalMa: Math.round(totalMa * 100) / 100,
    },
  };
}

// ─── Zapisz raport JPK w Firestore ───────────────────────────────────────────

export interface JpkReport {
  id?: string;
  type: 'JPK_V7M' | 'JPK_KR';
  period: string;
  generatedAt: any;
  status: 'generated' | 'sent' | 'draft';
  stats: JpkV7MStats | JpkKrStats;
  xmlSize: number;
}

export async function saveJpkReport(
  db: any,
  tenantId: string,
  report: Omit<JpkReport, 'id' | 'generatedAt'>
): Promise<string> {
  const col = collection(db, 'tenants', tenantId, 'jpkReports');
  const ref = await addDoc(col, {
    ...report,
    generatedAt: serverTimestamp(),
  });
  return ref.id;
}

// ─── Pobieranie XML ───────────────────────────────────────────────────────────

export function downloadXml(xml: string, filename: string): void {
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
