/**
 * Data: 2026-05-15
 * Ścieżka: /src/modules/finance/purchasing/PurchaseModule.tsx
 * Moduł faktur zakupowych — shell z nawigacją, statystykami i formularzem.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, RefreshCw, Loader2,
  AlertTriangle, Sparkles, List, PenLine, ShieldCheck,
} from 'lucide-react';
import { useTenant } from '../../../shared/hooks/useTenant';
import { askAI } from '../../../shared/services/geminiService';
import {
  getPurchaseInvoiceStats,
  createPurchaseInvoice,
  type PurchaseInvoiceStats,
} from '../services/purchaseInvoiceService';
import PurchaseList, { type PurchaseTab } from './PurchaseList';
import type { PurchaseInvoice, VatRate, PaymentMethod, Currency } from '../types/fiTypes';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPLN(val: number): string {
  return val.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type View = 'list' | 'add' | 'ksef';

// ─── Manual form state ────────────────────────────────────────────────────────

interface FormState {
  supplierInvoiceNumber: string;
  sellerName: string;
  sellerNip: string;
  issueDate: string;
  dueDate: string;
  totalNetto: string;
  vatRate: VatRate;
  paymentMethod: PaymentMethod;
  bankAccount: string;
  isMpp: boolean;
}

const defaultForm: FormState = {
  supplierInvoiceNumber: '',
  sellerName: '',
  sellerNip: '',
  issueDate: new Date().toISOString().slice(0, 10),
  dueDate: '',
  totalNetto: '',
  vatRate: 23,
  paymentMethod: 'transfer',
  bankAccount: '',
  isMpp: false,
};

const VAT_RATES: VatRate[] = [23, 8, 5, 0, 'zw', 'np', 'oo'];
const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'transfer', label: 'Przelew' },
  { value: 'cash', label: 'Gotówka' },
  { value: 'card', label: 'Karta' },
  { value: 'blik', label: 'BLIK' },
  { value: 'instant_transfer', label: 'Przelew Natychmiastowy' },
  { value: 'direct_debit', label: 'Polecenie Zapłaty' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function PurchaseModule() {
  const { activeTenantId } = useTenant();
  const [view, setView] = useState<View>('list');
  const [activeTab, setActiveTab] = useState<PurchaseTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Stats
  const [stats, setStats] = useState<PurchaseInvoiceStats>({
    totalPayable: 0,
    overdueCount: 0,
    thisMonthSpend: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // AI tip
  const [aiTip, setAiTip] = useState('');
  const [aiTipLoading, setAiTipLoading] = useState(false);

  // Form
  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Load stats on mount
  useEffect(() => {
    if (!activeTenantId) return;
    const loadStats = async () => {
      setStatsLoading(true);
      try {
        const s = await getPurchaseInvoiceStats(activeTenantId);
        setStats(s);

        // AI cost reduction tip
        setAiTipLoading(true);
        try {
          const tip = await askAI(
            `Jako doradca finansowy, w jednym zdaniu po polsku, zasugeruj sposób redukcji kosztów firmowych na podstawie: ` +
            `do zapłaty: ${fmtPLN(s.totalPayable)} PLN, przeterminowane faktury: ${s.overdueCount}, ` +
            `wydatki bieżącego miesiąca: ${fmtPLN(s.thisMonthSpend)} PLN. Bądź konkretny.`
          );
          setAiTip(tip);
        } catch {
          setAiTip('Negocjuj wydłużone terminy płatności z kluczowymi dostawcami, aby poprawić płynność finansową.');
        } finally {
          setAiTipLoading(false);
        }
      } catch (err) {
        console.error('PurchaseModule stats error:', err);
      } finally {
        setStatsLoading(false);
      }
    };
    loadStats();
  }, [activeTenantId]);

  // Computed brutto from form
  const totalBrutto = (() => {
    const netto = parseFloat(form.totalNetto) || 0;
    const rate = typeof form.vatRate === 'number' ? form.vatRate / 100 : 0;
    return Math.round(netto * (1 + rate) * 100) / 100;
  })();

  const totalVat = (() => {
    const netto = parseFloat(form.totalNetto) || 0;
    return Math.round((totalBrutto - netto) * 100) / 100;
  })();

  const handleSave = useCallback(async () => {
    if (!activeTenantId) return;
    const netto = parseFloat(form.totalNetto);
    if (
      !form.supplierInvoiceNumber ||
      !form.sellerName ||
      !form.issueDate ||
      !form.dueDate ||
      isNaN(netto) ||
      netto <= 0
    ) {
      setSaveError('Wypełnij wszystkie wymagane pola.');
      return;
    }
    setSaveError('');
    setSaving(true);
    try {
      const vatSummaryRow = {
        vatRate: form.vatRate,
        netto,
        vat: totalVat,
        brutto: totalBrutto,
      };
      const payload: Omit<PurchaseInvoice, 'id' | 'createdAt' | 'updatedAt'> = {
        tenantId: activeTenantId,
        supplierInvoiceNumber: form.supplierInvoiceNumber,
        type: 'standard',
        issueDate: form.issueDate,
        receiveDate: form.issueDate,
        dueDate: form.dueDate,
        seller: {
          name: form.sellerName,
          nip: form.sellerNip || undefined,
          address: '',
          city: '',
          postCode: '',
          country: 'PL',
        },
        buyer: {
          name: '',
          address: '',
          city: '',
          postCode: '',
          country: 'PL',
        },
        totalNetto: netto,
        totalVat,
        totalBrutto,
        vatSummary: [vatSummaryRow],
        currency: 'PLN' as Currency,
        paymentMethod: form.paymentMethod,
        bankAccount: form.bankAccount || undefined,
        isMpp: form.isMpp,
        isPaid: false,
        paidAmount: 0,
        remainingAmount: totalBrutto,
        source: 'manual',
        createdBy: 'user',
        isDeleted: false,
      };
      await createPurchaseInvoice(activeTenantId, payload);
      setForm(defaultForm);
      setView('list');
    } catch (err) {
      console.error('Save error:', err);
      setSaveError('Błąd zapisu. Spróbuj ponownie.');
    } finally {
      setSaving(false);
    }
  }, [activeTenantId, form, totalBrutto, totalVat]);

  const tabs: { id: PurchaseTab; label: string }[] = [
    { id: 'all', label: 'Wszystkie' },
    { id: 'unpaid', label: 'Do Zapłaty' },
    { id: 'overdue', label: 'Przeterminowane' },
    { id: 'paid', label: 'Opłacone' },
    { id: 'ksef', label: 'KSeF' },
  ];

  const navItems: { id: View; label: string; icon: React.ReactNode }[] = [
    { id: 'list', label: 'Lista Faktur', icon: <List size={14} /> },
    { id: 'add', label: 'Dodaj Ręcznie', icon: <PenLine size={14} /> },
    { id: 'ksef', label: 'Skrzynka KSeF', icon: <ShieldCheck size={14} /> },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* Dark stats header */}
      <div className="bg-slate-900 rounded-[3rem] p-8 md:p-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">
              Faktury Zakupowe
            </div>
            <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">
              Zakupy i Koszty
            </h1>
          </div>
          <button
            onClick={() => setView('ksef')}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-900/50"
          >
            <RefreshCw size={14} />
            Importuj z KSeF
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Total payable */}
          <div className="bg-white/5 rounded-[2rem] p-6">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Do Zapłaty</div>
            {statsLoading
              ? <div className="h-8 w-32 bg-white/10 rounded-full animate-pulse" />
              : <div className="text-2xl font-black text-white italic tracking-tighter">
                  {fmtPLN(stats.totalPayable)} PLN
                </div>
            }
          </div>

          {/* Overdue */}
          <div className="bg-white/5 rounded-[2rem] p-6">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Przeterminowane</div>
            {statsLoading
              ? <div className="h-8 w-16 bg-white/10 rounded-full animate-pulse" />
              : <div className={`text-2xl font-black italic tracking-tighter ${stats.overdueCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {stats.overdueCount} faktur
                </div>
            }
          </div>

          {/* This month spend */}
          <div className="bg-white/5 rounded-[2rem] p-6">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Wydatki Bieżący Mies.</div>
            {statsLoading
              ? <div className="h-8 w-32 bg-white/10 rounded-full animate-pulse" />
              : <div className="text-2xl font-black text-white italic tracking-tighter">
                  {fmtPLN(stats.thisMonthSpend)} PLN
                </div>
            }
          </div>

          {/* AI tip */}
          <div className="bg-indigo-600/30 rounded-[2rem] p-6 border border-indigo-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={12} className="text-indigo-400" />
              <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">AI Tip</div>
            </div>
            {aiTipLoading
              ? (
                <div className="flex items-center gap-2">
                  <Loader2 size={12} className="animate-spin text-indigo-400" />
                  <span className="text-[11px] text-indigo-300 italic">Analizuję...</span>
                </div>
              )
              : <p className="text-[11px] font-bold text-indigo-200 leading-relaxed">{aiTip}</p>
            }
          </div>
        </div>
      </div>

      {/* Nav tabs (views) */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex p-2 bg-slate-100 rounded-[2rem] gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-[1.75rem] transition-all text-[10px] font-black uppercase tracking-widest ${
                view === item.id
                  ? 'bg-white text-slate-900 shadow-lg'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        {view === 'list' && (
          <div className="flex items-center gap-4">
            {/* Filter tabs */}
            <div className="flex p-1.5 bg-slate-100 rounded-[2rem] gap-1 flex-wrap">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 rounded-[1.5rem] transition-all text-[9px] font-black uppercase tracking-widest ${
                    activeTab === tab.id
                      ? 'bg-white text-slate-900 shadow'
                      : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input
                type="text"
                placeholder="Szukaj dostawcy, numeru..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-100 border-none rounded-2xl pl-12 pr-6 py-3.5 text-[10px] font-black uppercase italic tracking-tighter w-64 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>
        )}
      </div>

      {/* Views */}
      {view === 'list' && (
        <PurchaseList activeTab={activeTab} searchQuery={searchQuery} />
      )}

      {view === 'add' && (
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10 max-w-2xl">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nowa Faktura Zakupowa</div>
          <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter mb-8">Dodaj Ręcznie</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Supplier invoice number */}
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Nr Faktury Dostawcy *
              </label>
              <input
                type="text"
                value={form.supplierInvoiceNumber}
                onChange={(e) => setForm({ ...form, supplierInvoiceNumber: e.target.value })}
                placeholder="FV/2026/05/001"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            {/* Seller name */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Nazwa Dostawcy *
              </label>
              <input
                type="text"
                value={form.sellerName}
                onChange={(e) => setForm({ ...form, sellerName: e.target.value })}
                placeholder="Acme Sp. z o.o."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            {/* Seller NIP */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                NIP Dostawcy
              </label>
              <input
                type="text"
                value={form.sellerNip}
                onChange={(e) => setForm({ ...form, sellerNip: e.target.value })}
                placeholder="0000000000"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            {/* Issue date */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Data Wystawienia *
              </label>
              <input
                type="date"
                value={form.issueDate}
                onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            {/* Due date */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Termin Płatności *
              </label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            {/* Netto */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Kwota Netto (PLN) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.totalNetto}
                onChange={(e) => setForm({ ...form, totalNetto: e.target.value })}
                placeholder="0.00"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            {/* VAT rate */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Stawka VAT *
              </label>
              <select
                value={String(form.vatRate)}
                onChange={(e) => {
                  const val = e.target.value;
                  const parsed = Number(val);
                  setForm({ ...form, vatRate: isNaN(parsed) ? val as VatRate : parsed as VatRate });
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                {VAT_RATES.map((r) => (
                  <option key={String(r)} value={String(r)}>
                    {typeof r === 'number' ? `${r}%` : r.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Brutto (readonly) */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Kwota Brutto (auto)
              </label>
              <div className="w-full bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-4 text-sm font-black text-indigo-700 italic tracking-tighter">
                {fmtPLN(totalBrutto)} PLN
              </div>
            </div>

            {/* Payment method */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Metoda Płatności
              </label>
              <select
                value={form.paymentMethod}
                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as PaymentMethod })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Bank account */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Nr Konta Bankowego
              </label>
              <input
                type="text"
                value={form.bankAccount}
                onChange={(e) => setForm({ ...form, bankAccount: e.target.value })}
                placeholder="PL00 0000 0000 0000 0000 0000 0000"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            {/* MPP toggle */}
            <div className="md:col-span-2 flex items-center gap-4">
              <button
                type="button"
                onClick={() => setForm({ ...form, isMpp: !form.isMpp })}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                  form.isMpp ? 'bg-slate-900' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow ${
                    form.isMpp ? 'translate-x-8' : 'translate-x-1'
                  }`}
                />
              </button>
              <div>
                <div className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
                  Mechanizm Podzielonej Płatności (MPP)
                </div>
                <div className="text-[9px] text-slate-400 font-bold">
                  Wymagany dla B2B, kwota netto &gt; 15 000 PLN w walucie PLN
                </div>
              </div>
            </div>
          </div>

          {saveError && (
            <div className="mt-6 flex items-center gap-3 bg-rose-50 border border-rose-100 rounded-2xl p-4">
              <AlertTriangle size={16} className="text-rose-500 flex-shrink-0" />
              <span className="text-[11px] font-black text-rose-600">{saveError}</span>
            </div>
          )}

          <div className="flex items-center gap-4 mt-8">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {saving ? 'Zapisuję...' : 'Zapisz Fakturę'}
            </button>
            <button
              onClick={() => { setForm(defaultForm); setView('list'); }}
              className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-700 transition-colors"
            >
              Anuluj
            </button>
          </div>
        </div>
      )}

      {view === 'ksef' && (
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-20 flex flex-col items-center gap-6">
          <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center">
            <ShieldCheck className="text-indigo-400" size={32} />
          </div>
          <div className="text-center">
            <div className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter mb-3">
              Skrzynka KSeF MF
            </div>
            <div className="flex items-center justify-center gap-3 text-sm text-slate-500 font-bold">
              <Loader2 size={16} className="animate-spin text-indigo-500" />
              Synchronizuję z KSeF MF...
            </div>
            <div className="mt-4 text-[10px] text-slate-400 font-black uppercase tracking-widest">
              Pobieranie faktur od dostawców — proszę czekać
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
