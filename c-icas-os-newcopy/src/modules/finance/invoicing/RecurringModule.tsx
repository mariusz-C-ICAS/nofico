/**
 * Data: 2026-05-15
 * Zmiany: Modul Faktur Cyklicznych z generowaniem automatycznym i real-time Firestore.
 * Sciezka: /src/modules/finance/invoicing/RecurringModule.tsx
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  RefreshCw, Plus, X, Loader2, Sparkles, Power, Trash2,
  Calendar, ChevronDown, ChevronUp, Play, Users, FileText,
  AlertCircle, CheckCircle2, Clock, TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import useTenant from '../../../shared/hooks/useTenant';
import {
  RecurringInvoiceTemplate, InvoiceItem, Currency, PaymentMethod
} from '../types/fiTypes';

const FREQUENCY_LABELS: Record<RecurringInvoiceTemplate['frequency'], string> = {
  monthly: 'Miesieczna',
  quarterly: 'Kwartalna',
  yearly: 'Roczna',
  custom: 'Niestandardowa',
};

const FREQUENCY_COLORS: Record<RecurringInvoiceTemplate['frequency'], string> = {
  monthly: 'bg-blue-100 text-blue-700',
  quarterly: 'bg-purple-100 text-purple-700',
  yearly: 'bg-amber-100 text-amber-700',
  custom: 'bg-slate-100 text-slate-600',
};

const VAT_RATES = [23, 8, 5, 0] as const;
const CURRENCIES: Currency[] = ['PLN', 'EUR', 'USD', 'GBP'];
const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'transfer', label: 'Przelew' },
  { value: 'cash', label: 'Gotowka' },
  { value: 'card', label: 'Karta' },
  { value: 'blik', label: 'BLIK' },
  { value: 'instant_transfer', label: 'Przelew Natychmiastowy' },
];

const fmt = (n: number, currency = 'PLN') =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);

function calcNextIssueDate(
  frequency: RecurringInvoiceTemplate['frequency'],
  dayOfMonth: number,
  from?: string
): string {
  const base = from ? new Date(from) : new Date();
  let next = new Date(base);
  switch (frequency) {
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'quarterly':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      next.setMonth(next.getMonth() + 1);
  }
  next.setDate(Math.min(dayOfMonth, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
  return next.toISOString().slice(0, 10);
}

function templateTotal(items: RecurringInvoiceTemplate['items']): number {
  return items.reduce((sum, it) => {
    const netto = it.quantity * it.priceNetto;
    const vat = typeof it.vatRate === 'number' ? netto * (it.vatRate / 100) : 0;
    return sum + netto + vat;
  }, 0);
}

function isThisWeek(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(now.getDate() + 7);
  return d >= now && d <= weekEnd;
}

const emptyItem = () => ({
  id: crypto.randomUUID(),
  name: '',
  quantity: 1,
  unit: 'szt',
  priceNetto: 0,
  vatRate: 23 as any,
});

const emptyForm = {
  name: '',
  buyerName: '',
  buyerNip: '',
  buyerAddress: '',
  buyerCity: '',
  buyerPostCode: '',
  buyerCountry: 'PL',
  frequency: 'monthly' as RecurringInvoiceTemplate['frequency'],
  dayOfMonth: 1,
  paymentDays: 14,
  paymentMethod: 'transfer' as PaymentMethod,
  currency: 'PLN' as Currency,
  endDate: '',
  items: [emptyItem()],
};

export default function RecurringModule() {
  const { activeTenantId } = useTenant();
  const [templates, setTemplates] = useState<RecurringInvoiceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeTenantId) return;
    const q = query(
      collection(db, `tenants/${activeTenantId}/recurringTemplates`),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      setTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() } as RecurringInvoiceTemplate)));
      setLoading(false);
    });
    return unsub;
  }, [activeTenantId]);

  const stats = useMemo(() => ({
    active: templates.filter(t => t.isActive).length,
    thisWeek: templates.filter(t => t.isActive && isThisWeek(t.nextIssueDate)).length,
    totalGenerated: templates.reduce((s, t) => s + t.invoicesGenerated, 0),
  }), [templates]);

  async function handleToggleActive(t: RecurringInvoiceTemplate) {
    if (!activeTenantId || !t.id) return;
    await updateDoc(doc(db, `tenants/${activeTenantId}/recurringTemplates`, t.id), {
      isActive: !t.isActive,
      updatedAt: serverTimestamp(),
    });
  }

  async function handleGenerateNow(t: RecurringInvoiceTemplate) {
    if (!activeTenantId || !t.id) return;
    setGeneratingId(t.id);
    const today = new Date().toISOString().slice(0, 10);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + t.paymentDays);

    const items: InvoiceItem[] = t.items.map(it => {
      const netto = Math.round(it.quantity * it.priceNetto * 100) / 100;
      const vatRate = typeof it.vatRate === 'number' ? it.vatRate : 0;
      const vat = typeof it.vatRate === 'number' ? Math.round(netto * vatRate / 100 * 100) / 100 : 0;
      return {
        ...it,
        totalNetto: netto,
        totalVat: vat,
        totalBrutto: Math.round((netto + vat) * 100) / 100,
      };
    });

    const totalNetto = items.reduce((s, i) => s + i.totalNetto, 0);
    const totalVat = items.reduce((s, i) => s + i.totalVat, 0);
    const totalBrutto = items.reduce((s, i) => s + i.totalBrutto, 0);

    const invoice = {
      tenantId: activeTenantId,
      number: `REC/${today}/${t.id.slice(-4)}`,
      type: 'standard',
      issueDate: today,
      saleDate: today,
      dueDate: dueDate.toISOString().slice(0, 10),
      seller: { name: '', address: '', city: '', postCode: '', country: 'PL' },
      buyer: t.buyer,
      items,
      totalNetto: Math.round(totalNetto * 100) / 100,
      totalVat: Math.round(totalVat * 100) / 100,
      totalBrutto: Math.round(totalBrutto * 100) / 100,
      vatSummary: [],
      currency: t.currency,
      paymentMethod: t.paymentMethod,
      isMpp: false,
      paidAmount: 0,
      remainingAmount: Math.round(totalBrutto * 100) / 100,
      status: 'issued',
      ksefStatus: 'not_sent',
      recurringTemplateId: t.id,
      createdBy: 'recurring-system',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await addDoc(collection(db, `tenants/${activeTenantId}/invoices`), invoice);
    const nextDate = calcNextIssueDate(t.frequency, t.dayOfMonth, today);
    await updateDoc(doc(db, `tenants/${activeTenantId}/recurringTemplates`, t.id), {
      invoicesGenerated: t.invoicesGenerated + 1,
      lastGeneratedAt: today,
      nextIssueDate: nextDate,
      updatedAt: serverTimestamp(),
    });
    setGeneratingId(null);
  }

  async function handleDelete(t: RecurringInvoiceTemplate) {
    if (!activeTenantId || !t.id) return;
    setDeletingId(t.id);
    await deleteDoc(doc(db, `tenants/${activeTenantId}/recurringTemplates`, t.id));
    setDeletingId(null);
  }

  function updateItem(idx: number, field: string, value: any) {
    setForm(f => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [field]: value };
      return { ...f, items };
    });
  }

  async function handleSave() {
    if (!activeTenantId || !form.name || !form.buyerName) return;
    setSaving(true);
    const nextDate = calcNextIssueDate(form.frequency, form.dayOfMonth);
    const today = new Date();
    const firstDate = new Date(today.getFullYear(), today.getMonth(), form.dayOfMonth);
    if (firstDate <= today) firstDate.setMonth(firstDate.getMonth() + 1);

    const template: Omit<RecurringInvoiceTemplate, 'id'> = {
      tenantId: activeTenantId,
      name: form.name,
      isActive: true,
      buyer: {
        name: form.buyerName,
        nip: form.buyerNip || undefined,
        address: form.buyerAddress,
        city: form.buyerCity,
        postCode: form.buyerPostCode,
        country: form.buyerCountry,
      },
      items: form.items.filter(it => it.name),
      currency: form.currency,
      paymentDays: form.paymentDays,
      paymentMethod: form.paymentMethod,
      frequency: form.frequency,
      dayOfMonth: form.dayOfMonth,
      nextIssueDate: firstDate.toISOString().slice(0, 10),
      endDate: form.endDate || undefined,
      invoicesGenerated: 0,
      createdBy: 'user',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await addDoc(collection(db, `tenants/${activeTenantId}/recurringTemplates`), template);
    setForm(emptyForm);
    setShowModal(false);
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-slate-100 rounded-[2rem] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Stats header */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <RefreshCw className="text-indigo-400" size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-100">Faktury Cykliczne</span>
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Aktywne Szablony</p>
              <p className="text-2xl font-black text-indigo-400">{stats.active}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Wystawienie w tym tyg.</p>
              <p className="text-2xl font-black text-amber-400">{stats.thisWeek}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Lacznie Wystawionych</p>
              <p className="text-2xl font-black text-emerald-400">{stats.totalGenerated}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-[1.5rem] bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all"
        >
          <Plus size={14} /> Dodaj Szablon
        </button>
      </div>

      {/* Template list */}
      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <RefreshCw size={32} className="text-slate-300" />
          </div>
          <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Brak szablonow cyklicznych</p>
          <p className="text-xs text-slate-300 mt-2">Dodaj pierwszy szablon, by automatycznie wystawiac faktury cykliczne</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map(t => {
            const total = templateTotal(t.items);
            const isExpanded = expandedId === t.id;
            const thisWeek = isThisWeek(t.nextIssueDate);

            return (
              <motion.div key={t.id} layout className={`bg-white border rounded-[2rem] overflow-hidden transition-all ${t.isActive ? 'border-slate-100' : 'border-slate-100 opacity-60'}`}>
                <div className="p-6">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-black text-slate-900 text-sm">{t.name}</p>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${FREQUENCY_COLORS[t.frequency]}`}>
                          {FREQUENCY_LABELS[t.frequency]}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <Users size={11} /> {t.buyer.name} {t.buyer.nip && `· NIP ${t.buyer.nip}`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggleActive(t)}
                      className={`p-2 rounded-[0.75rem] transition-all ${t.isActive ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                    >
                      <Power size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Kwota brutto</p>
                      <p className="text-sm font-black text-slate-900">{fmt(total, t.currency)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Nastepne wystawienie</p>
                      <p className={`text-sm font-black ${thisWeek ? 'text-amber-600' : 'text-slate-700'}`}>
                        {t.nextIssueDate}
                        {thisWeek && <span className="ml-1 text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Ten tydzien</span>}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Wystawionych</p>
                      <p className="text-sm font-black text-indigo-600">{t.invoicesGenerated}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Platnosc</p>
                      <p className="text-xs font-bold text-slate-600">{t.paymentDays} dni</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleGenerateNow(t)}
                      disabled={generatingId === t.id || !t.isActive}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[1rem] bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50"
                    >
                      {generatingId === t.id ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                      Generuj Teraz
                    </button>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : (t.id ?? null))}
                      className="px-3 py-2.5 rounded-[1rem] bg-slate-50 text-slate-500 text-[9px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                    >
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                    <button
                      onClick={() => handleDelete(t)}
                      disabled={deletingId === t.id}
                      className="px-3 py-2.5 rounded-[1rem] bg-red-50 text-red-400 hover:bg-red-100 transition-all"
                    >
                      {deletingId === t.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-100 overflow-hidden"
                    >
                      <div className="p-6">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">Pozycje faktury</p>
                        <div className="space-y-2">
                          {t.items.map((it, i) => (
                            <div key={i} className="flex items-center justify-between bg-slate-50 rounded-[1rem] px-4 py-2">
                              <p className="text-xs font-bold text-slate-700">{it.name}</p>
                              <p className="text-xs font-black text-slate-900">
                                {it.quantity} x {fmt(it.priceNetto)} + VAT {it.vatRate}%
                              </p>
                            </div>
                          ))}
                        </div>
                        {t.lastGeneratedAt && (
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-3">
                            Ostatnio wygenerowano: {t.lastGeneratedAt}
                          </p>
                        )}
                        {t.endDate && (
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">
                            Koniec: {t.endDate}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black uppercase tracking-tighter italic text-slate-900">Nowy Szablon Cykliczny</h2>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-5">
                {/* Szablon info */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Nazwa szablonu</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full border border-slate-200 rounded-[1rem] px-4 py-3 text-sm font-medium focus:outline-none focus:border-indigo-400"
                    placeholder="np. Abonament miesięczny — Klient X"
                  />
                </div>

                {/* Nabywca */}
                <div className="border border-slate-100 rounded-[1.5rem] p-5 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nabywca</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Nazwa firmy</label>
                      <input
                        value={form.buyerName}
                        onChange={e => setForm(f => ({ ...f, buyerName: e.target.value }))}
                        className="w-full border border-slate-200 rounded-[1rem] px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-indigo-400"
                        placeholder="Nazwa nabywcy"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">NIP</label>
                      <input
                        value={form.buyerNip}
                        onChange={e => setForm(f => ({ ...f, buyerNip: e.target.value }))}
                        className="w-full border border-slate-200 rounded-[1rem] px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-indigo-400"
                        placeholder="1234567890"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Kraj</label>
                      <input
                        value={form.buyerCountry}
                        onChange={e => setForm(f => ({ ...f, buyerCountry: e.target.value }))}
                        className="w-full border border-slate-200 rounded-[1rem] px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-indigo-400"
                        placeholder="PL"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Adres</label>
                      <input
                        value={form.buyerAddress}
                        onChange={e => setForm(f => ({ ...f, buyerAddress: e.target.value }))}
                        className="w-full border border-slate-200 rounded-[1rem] px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-indigo-400"
                        placeholder="ul. Przykładowa 1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Miasto</label>
                      <input
                        value={form.buyerCity}
                        onChange={e => setForm(f => ({ ...f, buyerCity: e.target.value }))}
                        className="w-full border border-slate-200 rounded-[1rem] px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-indigo-400"
                        placeholder="Warszawa"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Kod pocztowy</label>
                      <input
                        value={form.buyerPostCode}
                        onChange={e => setForm(f => ({ ...f, buyerPostCode: e.target.value }))}
                        className="w-full border border-slate-200 rounded-[1rem] px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-indigo-400"
                        placeholder="00-001"
                      />
                    </div>
                  </div>
                </div>

                {/* Parametry */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Czestotliwosc</label>
                    <select
                      value={form.frequency}
                      onChange={e => setForm(f => ({ ...f, frequency: e.target.value as any }))}
                      className="w-full border border-slate-200 rounded-[1rem] px-4 py-3 text-sm font-medium focus:outline-none focus:border-indigo-400 bg-white"
                    >
                      {Object.entries(FREQUENCY_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Dzien miesiaca</label>
                    <input
                      type="number"
                      min={1}
                      max={28}
                      value={form.dayOfMonth}
                      onChange={e => setForm(f => ({ ...f, dayOfMonth: parseInt(e.target.value, 10) }))}
                      className="w-full border border-slate-200 rounded-[1rem] px-4 py-3 text-sm font-medium focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Termin platnosci (dni)</label>
                    <input
                      type="number"
                      value={form.paymentDays}
                      onChange={e => setForm(f => ({ ...f, paymentDays: parseInt(e.target.value, 10) }))}
                      className="w-full border border-slate-200 rounded-[1rem] px-4 py-3 text-sm font-medium focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Metoda platnosci</label>
                    <select
                      value={form.paymentMethod}
                      onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value as PaymentMethod }))}
                      className="w-full border border-slate-200 rounded-[1rem] px-4 py-3 text-sm font-medium focus:outline-none focus:border-indigo-400 bg-white"
                    >
                      {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Waluta</label>
                    <select
                      value={form.currency}
                      onChange={e => setForm(f => ({ ...f, currency: e.target.value as Currency }))}
                      className="w-full border border-slate-200 rounded-[1rem] px-4 py-3 text-sm font-medium focus:outline-none focus:border-indigo-400 bg-white"
                    >
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Data konca (opcj.)</label>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                      className="w-full border border-slate-200 rounded-[1rem] px-4 py-3 text-sm font-medium focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                </div>

                {/* Pozycje */}
                <div className="border border-slate-100 rounded-[1.5rem] p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pozycje</p>
                    <button
                      onClick={() => setForm(f => ({ ...f, items: [...f.items, emptyItem()] }))}
                      className="text-[9px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1 hover:text-indigo-800"
                    >
                      <Plus size={11} /> Dodaj pozycje
                    </button>
                  </div>
                  <div className="space-y-3">
                    {form.items.map((it, idx) => (
                      <div key={it.id} className="grid grid-cols-12 gap-2 items-center">
                        <input
                          value={it.name}
                          onChange={e => updateItem(idx, 'name', e.target.value)}
                          placeholder="Nazwa uslugi"
                          className="col-span-4 border border-slate-200 rounded-[0.75rem] px-3 py-2 text-xs font-medium focus:outline-none focus:border-indigo-400"
                        />
                        <input
                          type="number"
                          value={it.quantity}
                          onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value))}
                          placeholder="Ilosc"
                          className="col-span-2 border border-slate-200 rounded-[0.75rem] px-3 py-2 text-xs font-medium focus:outline-none focus:border-indigo-400"
                        />
                        <input
                          type="number"
                          value={it.priceNetto}
                          onChange={e => updateItem(idx, 'priceNetto', parseFloat(e.target.value))}
                          placeholder="Cena netto"
                          className="col-span-3 border border-slate-200 rounded-[0.75rem] px-3 py-2 text-xs font-medium focus:outline-none focus:border-indigo-400"
                        />
                        <select
                          value={it.vatRate}
                          onChange={e => updateItem(idx, 'vatRate', parseInt(e.target.value, 10))}
                          className="col-span-2 border border-slate-200 rounded-[0.75rem] px-2 py-2 text-xs font-medium focus:outline-none focus:border-indigo-400 bg-white"
                        >
                          {VAT_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                        </select>
                        {form.items.length > 1 && (
                          <button
                            onClick={() => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))}
                            className="col-span-1 flex items-center justify-center text-red-400 hover:text-red-600"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleSave}
                  disabled={saving || !form.name || !form.buyerName}
                  className="w-full bg-indigo-600 text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-[1.5rem] hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Zapisz Szablon
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
