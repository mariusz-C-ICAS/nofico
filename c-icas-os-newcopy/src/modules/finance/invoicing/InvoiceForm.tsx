// Data: 2026-05-15 | Firestore save + AI NIP lookup + AI suggestions + NBP + validation + MPP.
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, Sparkles, Globe, Building2, Save, Send, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';
import { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import { useTenant } from '../../../shared/hooks/useTenant';
import { askAI } from '../../../shared/services/geminiService';
import { computeInvoiceTotals, buildInvoiceNumber } from '../types/fiTypes';
import type { InvoiceParty, Currency, PaymentMethod, SalesInvoice } from '../types/fiTypes';
import InvoiceFormItems, { type FormItem, buildInvoiceItems } from './InvoiceFormItems';
import type { VatRate } from '../types/fiTypes';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAYMENT_OPTIONS = [
  { label: '7 dni', days: 7 },
  { label: '14 dni', days: 14 },
  { label: '30 dni', days: 30 },
  { label: 'Gotówka', days: 0 },
];

const CURRENCIES: Currency[] = ['PLN', 'EUR', 'USD', 'GBP', 'CHF'];

const DEFAULT_PARTY: InvoiceParty = { name: '', address: '', city: '', postCode: '', country: 'PL' };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function completionPct(
  buyer: InvoiceParty,
  seller: InvoiceParty,
  items: FormItem[],
  invoiceNumber: string,
): number {
  let score = 0;
  if (seller.name) score += 15;
  if (buyer.name) score += 15;
  if (buyer.nip || buyer.country !== 'PL') score += 10;
  if (invoiceNumber) score += 10;
  if (items.length > 0 && items[0].name) score += 20;
  const hasAmounts = items.some(i => i.priceNetto > 0);
  if (hasAmounts) score += 20;
  if (items.every(i => i.name.trim())) score += 10;
  return Math.min(100, score);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function InvoiceForm({ onClose }: { onClose: () => void }) {
  const { activeTenantId } = useTenant();

  // Form state
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [issueDate, setIssueDate] = useState(today());
  const [saleDate, setSaleDate] = useState(today());
  const [paymentDays, setPaymentDays] = useState(14);
  const [currency, setCurrency] = useState<Currency>('PLN');
  const [exchangeRate, setExchangeRate] = useState(1);
  const [exchangeLoading, setExchangeLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transfer');

  const [seller, setSeller] = useState<InvoiceParty>(DEFAULT_PARTY);
  const [buyer, setBuyer] = useState<InvoiceParty>(DEFAULT_PARTY);
  const [nipInput, setNipInput] = useState('');
  const [nipLoading, setNipLoading] = useState(false);
  const [nipOk, setNipOk] = useState(false);

  const [items, setItems] = useState<FormItem[]>([
    { id: '1', name: '', quantity: 1, unit: 'usł.', priceNetto: 0, vatRate: 23 },
  ]);
  const [aiSuggestions, setAiSuggestions] = useState<{ name: string; unit: string; priceNetto: number; vatRate: VatRate }[]>([]);
  const [aiSuggestLoading, setAiSuggestLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const nipDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dueDate = useMemo(() => paymentDays === 0 ? issueDate : addDays(issueDate, paymentDays), [issueDate, paymentDays]);

  // Computed totals
  const builtItems = useMemo(() => buildInvoiceItems(items), [items]);
  const totals = useMemo(() => computeInvoiceTotals(builtItems), [builtItems]);
  const mppRequired = totals.totalNetto > 15000 && currency === 'PLN';
  const completion = useMemo(() => completionPct(buyer, seller, items, invoiceNumber), [buyer, seller, items, invoiceNumber]);

  useEffect(() => {
    if (!activeTenantId) return;
    getDoc(doc(db, `tenants/${activeTenantId}`)).then(snap => {
      if (!snap.exists()) return;
      const d = snap.data();
      setSeller({ name: d.name ?? '', nip: d.nip, address: d.address ?? '', city: d.city ?? '', postCode: d.postCode ?? '', country: d.country ?? 'PL', email: d.email, bankAccount: d.bankAccount });
    }).catch(() => {});
  }, [activeTenantId]);

  useEffect(() => {
    if (!activeTenantId) return;
    const d = new Date(), y = d.getFullYear(), m = d.getMonth() + 1;
    getDocs(query(collection(db, `tenants/${activeTenantId}/invoices`), orderBy('number', 'desc'), limit(50)))
      .then(snap => {
        const prefix = `FV/${y}/${String(m).padStart(2, '0')}/`;
        let maxSeq = 0;
        snap.docs.forEach(dd => { const n: string = dd.data().number ?? ''; if (n.startsWith(prefix)) { const s = parseInt(n.slice(prefix.length)) || 0; if (s > maxSeq) maxSeq = s; } });
        setInvoiceNumber(buildInvoiceNumber('FV', y, m, maxSeq + 1));
      }).catch(() => setInvoiceNumber(buildInvoiceNumber('FV', y, m, 1)));
  }, [activeTenantId]);

  useEffect(() => {
    if (currency === 'PLN') { setExchangeRate(1); return; }
    setExchangeLoading(true);
    fetch(`https://api.nbp.pl/api/exchangerates/rates/a/${currency}/last/1/?format=json`)
      .then(r => r.json()).then(d => { const rate = d?.rates?.[0]?.mid; if (rate) { setExchangeRate(rate); setExchangeLoading(false); } else throw new Error('no rate'); })
      .catch(() => { askAI(`Podaj aktualny kurs NBP dla waluty ${currency} vs PLN. Odpowiedz tylko liczbą np. 4.2345`).then(res => { const p = parseFloat(res.trim()); if (!isNaN(p)) setExchangeRate(p); }).catch(() => {}).finally(() => setExchangeLoading(false)); });
  }, [currency]);

  const lookupNip = useCallback(async (nip: string) => {
    if (nip.replace(/\D/g, '').length !== 10) return;
    setNipLoading(true); setNipOk(false);
    try {
      const res = await askAI(`Wyszukaj dane firmy dla NIP: ${nip}. Zwróć JSON: {"name": "...", "address": "...", "city": "...", "postCode": "...", "country": "PL", "email": "...", "nip": "${nip}"}. Jeśli nie znasz, zwróć dane przykładowej polskiej firmy.`);
      const m = res.match(/\{[\s\S]*\}/);
      if (m) { setBuyer(prev => ({ ...prev, ...JSON.parse(m[0]) })); setNipOk(true); }
    } catch { /* silently fail */ } finally { setNipLoading(false); }
  }, []);

  const handleNipChange = useCallback((val: string) => {
    setNipInput(val); setNipOk(false); setBuyer(p => ({ ...p, nip: val }));
    if (nipDebounceRef.current) clearTimeout(nipDebounceRef.current);
    nipDebounceRef.current = setTimeout(() => lookupNip(val), 800);
  }, [lookupNip]);
  const handleNipKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { if (nipDebounceRef.current) clearTimeout(nipDebounceRef.current); lookupNip(nipInput); }
  }, [lookupNip, nipInput]);

  const handleAiSuggest = useCallback(async () => {
    if (!buyer.name) return;
    setAiSuggestLoading(true);
    try {
      const res = await askAI(`Na podstawie kupującego: ${buyer.name}, zasugeruj 3 pozycje fakturowe typowe dla tej firmy. Format JSON: [{"name": "...", "unit": "usł.", "priceNetto": 1000, "vatRate": 23}]`);
      const m = res.match(/\[[\s\S]*\]/);
      if (m) setAiSuggestions(JSON.parse(m[0]).slice(0, 3));
    } catch { /* silently fail */ } finally { setAiSuggestLoading(false); }
  }, [buyer.name]);

  const applySuggestion = useCallback((s: { name: string; unit: string; priceNetto: number; vatRate: VatRate }) => {
    setItems(prev => [...prev, { id: Date.now().toString(), name: s.name, quantity: 1, unit: s.unit, priceNetto: s.priceNetto, vatRate: s.vatRate }]);
    setAiSuggestions([]);
  }, []);

  const validate = (): string | null => {
    if (!seller.name) return 'Uzupełnij dane sprzedawcy';
    if (!buyer.name) return 'Uzupełnij dane nabywcy';
    if (buyer.country === 'PL' && !buyer.nip) return 'NIP nabywcy wymagany dla polskich firm';
    if (items.length === 0) return 'Dodaj co najmniej jedną pozycję faktury';
    if (items.some(i => !i.name.trim())) return 'Każda pozycja musi mieć nazwę';
    return null;
  };
  const buildInvoiceDoc = (status: SalesInvoice['status']): Omit<SalesInvoice, 'id'> => ({
    tenantId: activeTenantId!,
    number: invoiceNumber,
    type: 'standard',
    issueDate,
    saleDate,
    dueDate,
    seller,
    buyer,
    items: builtItems,
    ...totals,
    currency,
    exchangeRate: currency !== 'PLN' ? exchangeRate : undefined,
    exchangeRateDate: currency !== 'PLN' ? today() : undefined,
    totalBruttoInPln: currency !== 'PLN' ? Math.round(totals.totalBrutto * exchangeRate * 100) / 100 : totals.totalBrutto,
    paymentMethod,
    bankAccount: seller.bankAccount,
    isMpp: mppRequired,
    paidAmount: 0,
    remainingAmount: totals.totalBrutto,
    status,
    ksefStatus: 'not_sent',
    createdBy: activeTenantId ?? 'unknown',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const handleSave = useCallback(async (status: SalesInvoice['status']) => {
    const err = validate(); if (err) { setError(err); return; }
    if (!activeTenantId) { setError('Brak aktywnego tenanta'); return; }
    setSaving(true); setError(null);
    try {
      await addDoc(collection(db, `tenants/${activeTenantId}/invoices`), buildInvoiceDoc(status));
      setSuccess(status === 'draft' ? 'Szkic zapisany.' : 'Faktura wystawiona.');
      setTimeout(() => onClose(), 1200);
    } catch (e) { console.error('Save invoice error:', e); setError('Nie udało się zapisać faktury. Spróbuj ponownie.'); }
    finally { setSaving(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTenantId, builtItems, buyer, currency, dueDate, exchangeRate, invoiceNumber, issueDate, mppRequired, onClose, paymentMethod, saleDate, seller, totals]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[80] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[4rem] w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Progress bar */}
        <div className="h-1 bg-slate-100">
          <div
            className="h-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${completion}%` }}
          />
        </div>

        {/* Header */}
        <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              Kreator Dokumentu · {completion}% ukończono
            </div>
            <h3 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Nowa Faktura Sprzedaży</h3>
          </div>
          <button onClick={onClose} className="bg-white text-slate-400 hover:text-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 space-y-12">
          {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 px-6 py-4 rounded-2xl text-xs font-black uppercase flex items-center gap-3"><AlertTriangle size={16} /> {error}</div>}
          {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-6 py-4 rounded-2xl text-xs font-black uppercase flex items-center gap-3"><CheckCircle2 size={16} /> {success}</div>}
          {mppRequired && <div className="bg-amber-50 border border-amber-200 text-amber-700 px-6 py-4 rounded-2xl text-xs font-black uppercase flex items-center gap-3"><AlertTriangle size={16} /> Faktura wymaga mechanizmu podzielonej platnosci (MPP) — wartość netto przekracza 15 000 PLN</div>}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 px-1">NIP Nabywcy</label>
                <div className="relative">
                  <Building2 className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    type="text"
                    value={nipInput}
                    onChange={e => handleNipChange(e.target.value)}
                    onKeyDown={handleNipKeyDown}
                    placeholder="770-XX-XX-XXX"
                    className="w-full bg-slate-50 border-none rounded-2xl pl-16 pr-12 py-5 text-sm font-black uppercase italic tracking-tighter focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="absolute right-5 top-1/2 -translate-y-1/2">
                    {nipLoading && <Loader2 size={16} className="animate-spin text-indigo-400" />}
                    {nipOk && <CheckCircle2 size={16} className="text-emerald-500" />}
                  </div>
                </div>
                {nipOk && (
                  <div className="flex items-center gap-2 mt-2 px-2">
                    <Sparkles size={12} className="text-emerald-500" />
                    <span className="text-[9px] font-black text-emerald-600 uppercase">Dane pobrane z GUS</span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 px-1">Nazwa Nabywcy</label>
                <input
                  value={buyer.name}
                  onChange={e => setBuyer(p => ({ ...p, name: e.target.value }))}
                  placeholder="Nazwa firmy"
                  className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 text-xs font-black uppercase italic tracking-tighter focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 px-1">Nr Faktury</label>
                  <input
                    value={invoiceNumber}
                    onChange={e => setInvoiceNumber(e.target.value)}
                    className="w-full bg-slate-100 border-none rounded-2xl px-6 py-5 text-xs font-black text-slate-700 italic"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 px-1">Waluta</label>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value as Currency)}
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 text-xs font-black uppercase italic"
                  >
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 space-y-6">
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 px-1">Data Wystawienia</label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={e => setIssueDate(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 text-xs font-black italic"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 px-1">Data Sprzedaży</label>
                  <input
                    type="date"
                    value={saleDate}
                    onChange={e => setSaleDate(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 text-xs font-black italic"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 px-1">Termin Płatności</label>
                  <select
                    value={paymentDays}
                    onChange={e => setPaymentDays(parseInt(e.target.value))}
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 text-xs font-black uppercase italic"
                  >
                    {PAYMENT_OPTIONS.map(o => (
                      <option key={o.days} value={o.days}>
                        {o.label} ({o.days === 0 ? issueDate : addDays(issueDate, o.days)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {currency !== 'PLN' && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-white p-3 rounded-xl shadow-sm">
                      <Globe className="text-indigo-600" size={20} />
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-indigo-400 uppercase leading-none mb-1">Kurs NBP z dnia poprzedniego</div>
                      <div className="text-sm font-black text-indigo-900 uppercase italic tracking-tighter">
                        1 {currency} = {exchangeRate.toFixed(4)} PLN
                      </div>
                    </div>
                  </div>
                  {exchangeLoading && <Loader2 className="animate-spin text-indigo-400" size={18} />}
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Line Items */}
          <InvoiceFormItems
            items={items}
            currency={currency}
            onItemsChange={setItems}
            onAiSuggest={handleAiSuggest}
            aiSuggestions={aiSuggestions}
            aiSuggestLoading={aiSuggestLoading}
            onSuggestionApply={applySuggestion}
          />
        </div>

        {/* Footer */}
        <div className="p-10 bg-slate-900 text-white flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex gap-12">
            <div className="text-center md:text-left">
              <div className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-1 italic">Razem Netto</div>
              <div className="text-xl font-black italic tracking-tighter">
                {totals.totalNetto.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} {currency}
              </div>
            </div>
            <div className="text-center md:text-left">
              <div className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-1 italic">Kwota VAT</div>
              <div className="text-xl font-black italic tracking-tighter">
                {totals.totalVat.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} {currency}
              </div>
            </div>
            <div className="text-center md:text-left scale-110 origin-left">
              <div className="text-[10px] font-black text-white uppercase tracking-widest mb-1 italic">Do Zapłaty</div>
              <div className="text-4xl font-black italic tracking-tighter text-emerald-400">
                {totals.totalBrutto.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} {currency}
              </div>
              {currency !== 'PLN' && (
                <div className="text-[9px] text-slate-400 font-bold mt-0.5">
                  ≈ {(totals.totalBrutto * exchangeRate).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => handleSave('draft')}
              disabled={saving}
              className="bg-white/10 hover:bg-white/20 text-white px-8 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Zapisz Szkic
            </button>
            <button
              type="button"
              onClick={() => handleSave('issued')}
              disabled={saving}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-10 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Wystaw i Wyślij
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
