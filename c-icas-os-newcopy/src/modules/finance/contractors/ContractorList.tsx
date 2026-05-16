/**
 * Data: 2026-05-15
 * Ścieżka: /src/modules/finance/contractors/ContractorList.tsx
 * Opis: Lista kontrahentów z real-time Firestore, weryfikacją BL/VIES, rozwijaniem wierszy.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Search, Plus, ShieldCheck, ShieldAlert, ShieldX, ChevronDown, ChevronUp,
  Pencil, Trash2, RefreshCw, Users, Building2, Truck, AlertTriangle, Loader2,
  CreditCard, CheckCircle2, XCircle,
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import { useTenant } from '../../../shared/hooks/useTenant';
import { getContractorsListener, verifyWhiteList, verifyVies } from '../services/contractorService';
import type { Contractor } from '../types/fiTypes';

// ─── Types ────────────────────────────────────────────────────────────────────
type FilterTab = 'all' | 'customers' | 'suppliers';

interface Props {
  onEdit: (c: Contractor) => void;
  onAdd: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtPLN(val?: number): string {
  if (val == null) return '—';
  return val.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' PLN';
}

function WhiteListBadge({ valid }: { valid?: boolean }) {
  if (valid === true)
    return <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full"><ShieldCheck size={10} /> BL OK</span>;
  if (valid === false)
    return <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full"><ShieldX size={10} /> BL BŁĄD</span>;
  return <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full"><ShieldAlert size={10} /> Nie zweryfikowano</span>;
}

function ViesBadge({ valid }: { valid?: boolean }) {
  if (valid === true)
    return <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full"><CheckCircle2 size={10} /> VIES OK</span>;
  if (valid === false)
    return <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full"><XCircle size={10} /> VIES BŁĄD</span>;
  return null;
}

function SkeletonRow() {
  return (
    <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-100 animate-pulse">
      {[3, 2, 2, 1, 2, 2].map((cols, i) => (
        <div key={i} className={`col-span-${cols} h-4 bg-slate-100 rounded-full`} />
      ))}
    </div>
  );
}

// ─── Toast mini ───────────────────────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const show = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };
  return { toast, show };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ContractorList({ onEdit, onAdd }: Props) {
  const { activeTenantId } = useTenant();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [verifyingBL, setVerifyingBL] = useState<string | null>(null);
  const [verifyingVIES, setVerifyingVIES] = useState<string | null>(null);
  const { toast, show: showToast } = useToast();

  // Real-time Firestore subscription
  useEffect(() => {
    if (!activeTenantId) return;
    const unsub = getContractorsListener(activeTenantId, (data) => {
      setContractors(data);
      setLoading(false);
    });
    return unsub;
  }, [activeTenantId]);

  // Computed stats from live data
  const stats = useMemo(() => {
    const total = contractors.length;
    const customers = contractors.filter(c => c.isCustomer).length;
    const suppliers = contractors.filter(c => c.isSupplier).length;
    const unverifiedBL = contractors.filter(c => c.isWhiteListValid == null).length;
    return { total, customers, suppliers, unverifiedBL };
  }, [contractors]);

  // Filter
  const filtered = useMemo(() => {
    let list = contractors;
    if (filterTab === 'customers') list = list.filter(c => c.isCustomer);
    if (filterTab === 'suppliers') list = list.filter(c => c.isSupplier);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.nip ?? '').includes(q) ||
        (c.city ?? '').toLowerCase().includes(q) ||
        (c.shortName ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [contractors, filterTab, search]);

  async function handleVerifyBL(c: Contractor) {
    if (!activeTenantId || !c.id || !c.nip) return;
    setVerifyingBL(c.id);
    try {
      const result = await verifyWhiteList(activeTenantId, c.id, c.nip);
      showToast(result.isValid ? `BL: Podatnik aktywny — ${result.statusDescription}` : `BL: Brak na liście — ${result.statusDescription}`, result.isValid);
    } catch {
      showToast('Błąd weryfikacji Białej Listy', false);
    } finally {
      setVerifyingBL(null);
    }
  }

  async function handleVerifyVIES(c: Contractor) {
    if (!c.euVatId) { showToast('Brak numeru EU VAT', false); return; }
    setVerifyingVIES(c.id ?? null);
    try {
      const result = await verifyVies(c.euVatId);
      showToast(result.isValid ? `VIES: Numer aktywny (${result.name ?? ''})` : 'VIES: Numer nieaktywny', result.isValid);
    } catch {
      showToast('Błąd weryfikacji VIES', false);
    } finally {
      setVerifyingVIES(null);
    }
  }

  async function handleSoftDelete(c: Contractor) {
    if (!activeTenantId || !c.id) return;
    if (!window.confirm(`Zablokować kontrahenta "${c.name}"?`)) return;
    await updateDoc(doc(db, 'tenants', activeTenantId, 'contractors', c.id), { status: 'blocked' });
    showToast(`Kontrahent "${c.name}" zablokowany`);
  }

  const filterTabs: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'Wszyscy' },
    { id: 'customers', label: 'Klienci' },
    { id: 'suppliers', label: 'Dostawcy' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-xl font-bold text-sm flex items-center gap-2 ${toast.ok ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}
          >
            {toast.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Wszyscy', value: stats.total, icon: Users, color: 'indigo' },
          { label: 'Klienci', value: stats.customers, icon: Building2, color: 'emerald' },
          { label: 'Dostawcy', value: stats.suppliers, icon: Truck, color: 'sky' },
          { label: 'Nie zweryfikowani BL', value: stats.unverifiedBL, icon: ShieldAlert, color: 'amber' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-[2.5rem] p-5 border border-slate-100 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</div>
            <div className={`text-3xl font-black italic tracking-tighter text-${color}-600`}>{loading ? '—' : value}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex flex-col md:flex-row items-center gap-3 p-4 border-b border-slate-100">
          {/* Search */}
          <div className="relative flex-1 w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Szukaj nazwy, NIP, miasta..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm font-medium text-slate-700 outline-none focus:border-indigo-400 transition-colors"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 bg-slate-50 rounded-xl p-1">
            {filterTabs.map(t => (
              <button
                key={t.id}
                onClick={() => setFilterTab(t.id)}
                className={`px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${filterTab === t.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            onClick={onAdd}
            className="ml-auto flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black uppercase tracking-widest px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-500/20 transition-all"
          >
            <Plus size={14} /> Dodaj
          </button>
        </div>

        {/* Table header */}
        <div className="hidden md:grid grid-cols-12 gap-2 px-6 py-3 bg-slate-50 border-b border-slate-100">
          {['Nazwa', 'NIP', 'Typ', 'Miasto', 'Biała Lista', 'VIES', 'Zaległości', 'Akcje'].map((h, i) => (
            <div key={h} className={`text-[10px] font-black uppercase tracking-widest text-slate-400 ${i === 0 ? 'col-span-3' : i === 7 ? 'col-span-2 text-right' : 'col-span-1'}`}>{h}</div>
          ))}
        </div>

        {/* Rows */}
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Users className="mx-auto text-slate-200 mb-4" size={40} />
            <p className="text-sm font-bold text-slate-400">Brak kontrahentów — dodaj pierwszego</p>
            <button onClick={onAdd} className="mt-4 text-indigo-600 text-sm font-black underline underline-offset-2">Dodaj kontrahenta</button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map(c => {
              const isExpanded = expandedId === c.id;
              const isAtRisk = (c.totalOutstanding ?? 0) > 0 && c.isWhiteListValid === false;
              return (
                <div key={c.id} className={`${isAtRisk ? 'bg-amber-50/60' : 'bg-white'} transition-colors`}>
                  {/* Main row */}
                  <div className="hidden md:grid grid-cols-12 gap-2 px-6 py-4 items-center hover:bg-slate-50/60 transition-colors">
                    {/* Name */}
                    <div className="col-span-3 min-w-0">
                      <div className="font-bold text-slate-900 text-sm truncate flex items-center gap-2">
                        {isAtRisk && <AlertTriangle size={13} className="text-amber-500 flex-shrink-0" />}
                        {c.name}
                      </div>
                      {c.shortName && <div className="text-[10px] text-slate-400 font-medium truncate">{c.shortName}</div>}
                    </div>
                    {/* NIP */}
                    <div className="col-span-1 text-xs font-mono text-slate-600">{c.nip ?? '—'}</div>
                    {/* Type */}
                    <div className="col-span-1">
                      <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {c.type === 'company' ? 'Firma' : c.type === 'individual' ? 'Osoba' : 'Zagr.'}
                      </span>
                    </div>
                    {/* City */}
                    <div className="col-span-1 text-xs text-slate-500 truncate">{c.city}</div>
                    {/* BL Badge */}
                    <div className="col-span-1"><WhiteListBadge valid={c.isWhiteListValid} /></div>
                    {/* VIES Badge */}
                    <div className="col-span-1"><ViesBadge valid={c.isViesValid} /></div>
                    {/* Outstanding */}
                    <div className={`col-span-2 text-sm font-bold tabular-nums ${(c.totalOutstanding ?? 0) > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                      {fmtPLN(c.totalOutstanding)}
                    </div>
                    {/* Actions */}
                    <div className="col-span-2 flex items-center justify-end gap-1">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : c.id!)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
                        title="Rozwiń"
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      <button onClick={() => onEdit(c)} className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors" title="Edytuj">
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleVerifyBL(c)}
                        disabled={verifyingBL === c.id || !c.nip}
                        className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors disabled:opacity-30"
                        title="Weryfikuj Białą Listę"
                      >
                        {verifyingBL === c.id ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                      </button>
                      <button
                        onClick={() => handleVerifyVIES(c)}
                        disabled={verifyingVIES === c.id || !c.euVatId}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors disabled:opacity-30"
                        title="Weryfikuj VIES"
                      >
                        {verifyingVIES === c.id ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      </button>
                      <button onClick={() => handleSoftDelete(c)} className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors" title="Zablokuj">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Mobile row */}
                  <div className="md:hidden flex items-start justify-between p-4 gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm text-slate-900 truncate">{c.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{c.nip} · {c.city}</div>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        <WhiteListBadge valid={c.isWhiteListValid} />
                        <ViesBadge valid={c.isViesValid} />
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => onEdit(c)} className="p-2 rounded-xl bg-slate-100 text-slate-600"><Pencil size={13} /></button>
                      <button onClick={() => setExpandedId(isExpanded ? null : c.id!)} className="p-2 rounded-xl bg-slate-100 text-slate-600">
                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-5 pt-2 grid grid-cols-1 md:grid-cols-3 gap-5 border-t border-slate-100 bg-slate-50/60">
                          {/* Bank accounts */}
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1"><CreditCard size={10} /> Rachunki bankowe</div>
                            {c.bankAccounts.length === 0 ? (
                              <p className="text-xs text-slate-400 italic">Brak rachunków</p>
                            ) : (
                              <ul className="space-y-1">
                                {c.bankAccounts.map(ba => (
                                  <li key={ba.id} className="text-xs font-mono text-slate-700 flex items-center gap-1">
                                    {ba.isDefault && <span className="text-[9px] bg-indigo-100 text-indigo-600 font-black px-1.5 py-0.5 rounded uppercase">Domyślny</span>}
                                    {ba.iban}
                                    {ba.bankName && <span className="text-slate-400 non-mono">· {ba.bankName}</span>}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          {/* AI risk + payment terms */}
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Ocena AI i warunki</div>
                            {c.aiNotes && <p className="text-xs text-slate-600 italic mb-2">"{c.aiNotes}"</p>}
                            <div className="text-xs text-slate-600 space-y-0.5">
                              {c.defaultPaymentDays != null && <div>Termin płatności: <strong>{c.defaultPaymentDays} dni</strong></div>}
                              {c.defaultPaymentMethod && <div>Metoda: <strong className="capitalize">{c.defaultPaymentMethod}</strong></div>}
                              {c.defaultVatRate != null && <div>VAT: <strong>{c.defaultVatRate}%</strong></div>}
                              {c.defaultCurrency && <div>Waluta: <strong>{c.defaultCurrency}</strong></div>}
                            </div>
                          </div>

                          {/* Invoice stats */}
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Statystyki fakturowania</div>
                            <div className="text-xs text-slate-600 space-y-0.5">
                              <div>Łącznie zafakturowano: <strong className="text-slate-900">{fmtPLN(c.totalInvoiced)}</strong></div>
                              <div>Zaległości: <strong className={`${(c.totalOutstanding ?? 0) > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{fmtPLN(c.totalOutstanding)}</strong></div>
                              <div>Faktury: <strong>{c.invoiceCount ?? 0}</strong></div>
                              {c.lastInvoiceDate && <div>Ostatnia faktura: <strong>{c.lastInvoiceDate}</strong></div>}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
