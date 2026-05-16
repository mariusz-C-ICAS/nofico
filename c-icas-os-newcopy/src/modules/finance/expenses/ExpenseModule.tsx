/**
 * Data: 2026-05-15
 * Zmiany: Główny moduł zarządzania wydatkami z OCR i AI insights.
 * Ścieżka: /src/modules/finance/expenses/ExpenseModule.tsx
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  ScanLine, Search, Filter, CheckCircle2, XCircle, Trash2,
  ChevronDown, ChevronUp, Sparkles, Receipt, Loader2,
  AlertCircle, ArrowRight, Tag, Building2, Calendar,
  BarChart2, TrendingUp, Clock, Wallet, FileCheck2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  collection, onSnapshot, doc, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from '../../shared/lib/firebase';
import useTenant from '../../shared/hooks/useTenant';
import { askAI } from '../../shared/services/geminiService';
import ExpenseScanner from './ExpenseScanner';

type ExpenseStatus = 'pending_ocr' | 'ocr_done' | 'categorized' | 'approved' | 'rejected' | 'booked';
type VatRate = 23 | 8 | 5 | 0 | 'zw' | 'np';
type Currency = 'PLN' | 'EUR' | 'USD' | 'GBP' | 'CHF';

interface Expense {
  id?: string;
  tenantId: string;
  receiptUrl?: string;
  receiptThumbnail?: string;
  ocrStatus: ExpenseStatus;
  vendor: string;
  amount: number;
  currency: Currency;
  amountInPln?: number;
  vatRate?: VatRate;
  vatAmount?: number;
  nettoAmount?: number;
  date: string;
  invoiceNumber?: string;
  nip?: string;
  category: string;
  description?: string;
  costCenterId?: string;
  projectId?: string;
  employeeId?: string;
  isReimbursable: boolean;
  status: ExpenseStatus;
  approvedBy?: string;
  approvedAt?: string;
  aiCategory?: string;
  aiTags?: string[];
  aiConfidence?: number;
  aiRawExtraction?: string;
  isBooked: boolean;
  createdBy: string;
  createdAt: unknown;
  updatedAt: unknown;
}

const CATEGORY_TABS = ['Wszystkie', 'Paliwo', 'Biuro', 'Marketing', 'Podróże', 'Usługi IT', 'Restauracja', 'Inne'];
const STATUS_FILTERS = ['Wszystkie', 'ocr_done', 'approved', 'rejected', 'booked'] as const;
const STATUS_LABELS: Record<string, string> = {
  pending_ocr: 'OCR', ocr_done: 'Do weryfikacji', categorized: 'Skategoryzowany',
  approved: 'Zatwierdzony', rejected: 'Odrzucony', booked: 'Zaksięgowany'
};
const STATUS_COLORS: Record<string, string> = {
  pending_ocr: 'bg-slate-100 text-slate-500',
  ocr_done: 'bg-amber-100 text-amber-700',
  categorized: 'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-600',
  booked: 'bg-indigo-100 text-indigo-700'
};

export default function ExpenseModule() {
  const { activeTenantId, user } = useTenant();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('Wszystkie');
  const [statusFilter, setStatusFilter] = useState<string>('Wszystkie');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showInsights, setShowInsights] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);

  useEffect(() => {
    if (!activeTenantId) return;
    const q = query(
      collection(db, `tenants/${activeTenantId}/expenses`),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense)));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [activeTenantId]);

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthExpenses = expenses.filter(e => e.date?.startsWith(thisMonth));
  const totalMonth = monthExpenses.reduce((s, e) => s + (e.amount ?? 0), 0);
  const pendingCount = expenses.filter(e => e.status === 'ocr_done').length;
  const reimbursable = expenses.filter(e => e.isReimbursable && e.status !== 'booked').reduce((s, e) => s + (e.amount ?? 0), 0);
  const aiCategorized = expenses.length ? Math.round(expenses.filter(e => e.aiCategory).length / expenses.length * 100) : 0;

  const filtered = useMemo(() => {
    return expenses.filter(e => {
      if (categoryFilter !== 'Wszystkie' && e.category !== categoryFilter) return false;
      if (statusFilter !== 'Wszystkie' && e.status !== statusFilter) return false;
      if (search && !`${e.vendor} ${e.description ?? ''}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [expenses, categoryFilter, statusFilter, search]);

  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    monthExpenses.forEach(e => {
      totals[e.category] = (totals[e.category] ?? 0) + (e.amount ?? 0);
    });
    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  }, [monthExpenses]);

  const maxCatTotal = categoryTotals[0]?.[1] ?? 1;

  const updateStatus = async (id: string, status: ExpenseStatus) => {
    if (!activeTenantId) return;
    await updateDoc(doc(db, `tenants/${activeTenantId}/expenses`, id), {
      status, updatedAt: serverTimestamp(),
      ...(status === 'approved' ? { approvedBy: user?.uid, approvedAt: new Date().toISOString() } : {})
    });
  };

  const deleteExpense = async (id: string) => {
    if (!activeTenantId) return;
    await deleteDoc(doc(db, `tenants/${activeTenantId}/expenses`, id));
  };

  const bulkApprove = async () => {
    await Promise.all(Array.from(selected).map(id => updateStatus(id, 'approved')));
    setSelected(new Set());
  };

  const handleAiInsight = async () => {
    setInsightLoading(true);
    setAiInsight(null);
    try {
      const summary = categoryTotals.map(([cat, total]) => `${cat}: ${total.toFixed(2)} PLN`).join(', ');
      const result = await askAI(
        `Przeanalizuj wydatki firmy za ten miesiąc: ${summary}.
        Łącznie: ${totalMonth.toFixed(2)} PLN.
        Daj krótkie (2-3 zdania) podsumowanie i wskaż jedną kategorię do optymalizacji kosztowej.
        Odpowiedz po polsku, krótko i rzeczowo.`
      );
      setAiInsight(result);
    } catch {
      setAiInsight('Nie udało się wygenerować analizy.');
    } finally {
      setInsightLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (showScanner) {
    return (
      <div className="animate-in fade-in duration-300">
        <ExpenseScanner
          onClose={() => setShowScanner(false)}
          onSaved={() => setShowScanner(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Wydatki (mies.)', value: `${totalMonth.toFixed(2)} PLN`, icon: Wallet, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Do zatwierdzenia', value: String(pendingCount), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Do rozliczenia', value: `${reimbursable.toFixed(2)} PLN`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Kat. przez AI', value: `${aiCategorized}%`, icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 ${bg} rounded-2xl flex items-center justify-center`}>
              <Icon size={22} className={color} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
              <p className="text-xl font-black text-slate-900 italic tracking-tighter">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA + Insights Row */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => setShowScanner(true)}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-sm py-5 px-8 rounded-[2rem] shadow-xl shadow-indigo-500/30 transition-all flex items-center justify-center gap-3 group"
        >
          <ScanLine size={22} className="group-hover:animate-pulse" />
          Skanuj Paragon / Fakturę
          <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
        </button>
        <button
          onClick={() => setShowInsights(!showInsights)}
          className="sm:w-64 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-xs py-5 px-8 rounded-[2rem] transition-all flex items-center justify-center gap-3"
        >
          <Sparkles size={18} className="text-indigo-400" />
          Podsumowanie AI
          {showInsights ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* AI Insights Panel */}
      <AnimatePresence>
        {showInsights && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="bg-slate-900 rounded-[2.5rem] p-8 text-white overflow-hidden"
          >
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Category Bars */}
              <div className="flex-1 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Wydatki wg kategorii</p>
                {categoryTotals.length === 0 ? (
                  <p className="text-slate-500 text-sm font-bold">Brak danych za ten miesiąc</p>
                ) : (
                  categoryTotals.map(([cat, total]) => (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-black text-slate-300 uppercase">{cat}</span>
                        <span className="font-bold text-slate-400">{total.toFixed(0)} PLN</span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(total / maxCatTotal) * 100}%` }}
                          className="h-full bg-indigo-500 rounded-full"
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* AI Text Insight */}
              <div className="lg:w-80 bg-slate-800 rounded-[2rem] p-6 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-indigo-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Analiza AI</span>
                </div>
                {aiInsight ? (
                  <p className="text-sm text-slate-300 font-medium leading-relaxed">{aiInsight}</p>
                ) : (
                  <p className="text-xs text-slate-500 font-bold">Kliknij aby wygenerować analizę wydatków</p>
                )}
                <button
                  onClick={handleAiInsight}
                  disabled={insightLoading}
                  className="mt-auto bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase px-4 py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {insightLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {insightLoading ? 'Analizuję...' : 'Generuj analizę'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="space-y-4">
        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORY_TABS.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`flex-shrink-0 text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-full transition-all ${
                categoryFilter === cat
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search + Status */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Szukaj po sprzedawcy, opisie..."
              className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-100 text-sm font-medium text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-indigo-300 bg-white"
            />
          </div>
          <div className="flex gap-2">
            <Filter size={16} className="text-slate-400 self-center ml-2" />
            {STATUS_FILTERS.map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${
                  statusFilter === s
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'
                }`}
              >
                {s === 'Wszystkie' ? 'Wszystkie' : STATUS_LABELS[s] ?? s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-indigo-600 rounded-[2rem] px-8 py-4 flex items-center justify-between">
            <span className="text-white font-black text-sm uppercase tracking-widest">
              {selected.size} zaznaczonych
            </span>
            <div className="flex gap-3">
              <button onClick={bulkApprove}
                className="bg-white text-indigo-700 font-black text-xs uppercase px-5 py-2.5 rounded-xl hover:bg-indigo-50 transition-colors flex items-center gap-1">
                <CheckCircle2 size={12} /> Zatwierdź
              </button>
              <button onClick={() => setSelected(new Set())}
                className="bg-indigo-700 text-white font-black text-xs uppercase px-5 py-2.5 rounded-xl hover:bg-indigo-800 transition-colors">
                Anuluj
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expense List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={40} className="text-indigo-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-[3rem]">
          <Receipt size={48} className="text-slate-200 mx-auto mb-4" />
          <p className="font-black text-slate-400 uppercase tracking-tighter text-xl italic">Brak wydatków</p>
          <p className="text-xs text-slate-300 font-bold uppercase tracking-widest mt-2">
            Dodaj pierwszy wydatek skanując paragon
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Header */}
          <div className="grid grid-cols-[2rem_auto_1fr_8rem_8rem_8rem_6rem] gap-4 px-6 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
            <span></span>
            <span></span>
            <span>Sprzedawca</span>
            <span>Data</span>
            <span>Kwota</span>
            <span>Kategoria</span>
            <span>Status</span>
          </div>

          {filtered.map(expense => (
            <div key={expense.id} className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              {/* Row */}
              <div
                className="grid grid-cols-[2rem_auto_1fr_8rem_8rem_8rem_6rem_auto] gap-4 px-6 py-4 items-center cursor-pointer"
                onClick={() => setExpandedId(expandedId === expense.id ? null : expense.id ?? null)}
              >
                <input type="checkbox" checked={selected.has(expense.id!)}
                  onClick={e => e.stopPropagation()}
                  onChange={() => toggleSelect(expense.id!)}
                  className="w-4 h-4 accent-indigo-600 rounded" />

                {expense.receiptThumbnail ? (
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                    <img src={expense.receiptThumbnail} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Receipt size={16} className="text-slate-300" />
                  </div>
                )}

                <div className="min-w-0">
                  <p className="font-black text-slate-900 truncate text-sm">{expense.vendor || '—'}</p>
                  {expense.description && (
                    <p className="text-[10px] text-slate-400 font-medium truncate">{expense.description}</p>
                  )}
                </div>

                <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                  <Calendar size={11} /> {expense.date || '—'}
                </span>

                <span className="text-sm font-black text-slate-900">
                  {expense.amount?.toFixed(2)} <span className="text-slate-400 text-xs">{expense.currency}</span>
                </span>

                <span className="text-[10px] font-black flex items-center gap-1 text-slate-500">
                  <Tag size={10} /> {expense.category || '—'}
                </span>

                <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full w-fit ${STATUS_COLORS[expense.status] ?? 'bg-slate-100 text-slate-500'}`}>
                  {STATUS_LABELS[expense.status] ?? expense.status}
                </span>

                {expandedId === expense.id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
              </div>

              {/* Expanded Detail */}
              <AnimatePresence>
                {expandedId === expense.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="border-t border-slate-50 overflow-hidden"
                  >
                    <div className="px-8 py-6 bg-slate-50/50">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {[
                          { label: 'Netto', value: expense.nettoAmount?.toFixed(2) ?? '—' },
                          { label: 'VAT', value: `${expense.vatAmount?.toFixed(2) ?? '—'} (${expense.vatRate ?? '—'}%)` },
                          { label: 'Nr Faktury', value: expense.invoiceNumber ?? '—' },
                          { label: 'NIP', value: expense.nip ?? '—' },
                          { label: 'Pewność AI', value: expense.aiConfidence ? `${expense.aiConfidence}%` : '—' },
                          { label: 'Dodał', value: expense.createdBy ?? '—' },
                        ].map(({ label, value }) => (
                          <div key={label}>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                            <p className="text-sm font-bold text-slate-700 mt-0.5">{value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3 flex-wrap">
                        {expense.status === 'ocr_done' && (
                          <>
                            <button onClick={() => updateStatus(expense.id!, 'approved')}
                              className="bg-emerald-600 text-white font-black text-xs uppercase px-5 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-1">
                              <CheckCircle2 size={12} /> Zatwierdź
                            </button>
                            <button onClick={() => updateStatus(expense.id!, 'rejected')}
                              className="bg-red-50 text-red-600 font-black text-xs uppercase px-5 py-2.5 rounded-xl hover:bg-red-100 transition-colors flex items-center gap-1">
                              <XCircle size={12} /> Odrzuć
                            </button>
                          </>
                        )}
                        {expense.status === 'approved' && (
                          <button onClick={() => updateStatus(expense.id!, 'booked')}
                            className="bg-indigo-600 text-white font-black text-xs uppercase px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-1">
                            <FileCheck2 size={12} /> Zaksięguj
                          </button>
                        )}
                        <button onClick={() => deleteExpense(expense.id!)}
                          className="bg-slate-100 text-slate-500 font-black text-xs uppercase px-5 py-2.5 rounded-xl hover:bg-red-50 hover:text-red-500 transition-colors flex items-center gap-1">
                          <Trash2 size={12} /> Usuń
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
