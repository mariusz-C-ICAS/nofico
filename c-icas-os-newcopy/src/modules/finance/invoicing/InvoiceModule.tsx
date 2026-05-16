/**
 * Data: 2026-05-15
 * Zmiany: Firestore stats + AI insight + real tab counts + quick filter.
 * Ścieżka: /src/modules/finance/invoicing/InvoiceModule.tsx
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Search, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import { useTenant } from '../../../shared/hooks/useTenant';
import { askAI } from '../../../shared/services/geminiService';
import InvoiceList, { type InvoiceTab } from './InvoiceList';
import InvoiceForm from './InvoiceForm';
import type { SalesInvoice } from '../types/fiTypes';

// ─── Stats helpers ────────────────────────────────────────────────────────────

function currentMonthRange(): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
  return { start: `${y}-${m}-01`, end: `${y}-${m}-${lastDay}` };
}

function lastMonthRange(): { start: string; end: string } {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const lastDay = new Date(y, d.getMonth() + 1, 0).getDate();
  return { start: `${y}-${m}-01`, end: `${y}-${m}-${lastDay}` };
}

function fmtPLN(val: number): string {
  return val.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function InvoiceModule() {
  const { activeTenantId } = useTenant();
  const [activeTab, setActiveTab] = useState<InvoiceTab>('all');
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tabCounts, setTabCounts] = useState<Record<InvoiceTab, number>>({
    all: 0, unpaid: 0, overdue: 0, proformas: 0, drafts: 0,
  });

  // Stats state
  const [revenue, setRevenue] = useState(0);
  const [lastRevenue, setLastRevenue] = useState(0);
  const [outstanding, setOutstanding] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);

  // Fetch stats once on mount
  useEffect(() => {
    if (!activeTenantId) return;

    const loadStats = async () => {
      setStatsLoading(true);
      try {
        const snap = await getDocs(
          query(collection(db, `tenants/${activeTenantId}/invoices`))
        );
        const invs = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as SalesInvoice))
          .filter(i => !i.isDeleted);

        const { start: mStart, end: mEnd } = currentMonthRange();
        const { start: lStart, end: lEnd } = lastMonthRange();
        const today = new Date().toISOString().slice(0, 10);

        let rev = 0;
        let lRev = 0;
        let out = 0;
        let od = 0;

        for (const inv of invs) {
          const notVoid = !['draft', 'cancelled'].includes(inv.status);
          if (notVoid && inv.issueDate >= mStart && inv.issueDate <= mEnd) {
            rev += inv.totalBrutto;
          }
          if (notVoid && inv.issueDate >= lStart && inv.issueDate <= lEnd) {
            lRev += inv.totalBrutto;
          }
          if (['issued', 'sent', 'partially_paid'].includes(inv.status)) {
            out += inv.remainingAmount ?? 0;
          }
          const isOd = inv.status === 'overdue' ||
            (!['paid', 'cancelled', 'draft'].includes(inv.status) && inv.dueDate < today);
          if (isOd) od++;
        }

        setRevenue(rev);
        setLastRevenue(lRev);
        setOutstanding(out);
        setOverdueCount(od);
        setStatsLoading(false);

        // AI Insight after stats
        if (rev > 0 || out > 0 || od > 0) {
          setAiLoading(true);
          try {
            const insight = await askAI(
              `Jako asystent finansowy, w 1 zdaniu po polsku, zasugeruj właścicielowi firmy jedną konkretną akcję na podstawie: sprzedaż bieżącego miesiąca: ${fmtPLN(rev)} PLN, zaległości: ${fmtPLN(out)} PLN, przeterminowane: ${od} faktur. Bądź konkretny i praktyczny.`
            );
            setAiInsight(insight);
          } catch {
            setAiInsight('Regularnie monitoruj terminy płatności i wysyłaj przypomnienia do klientów z nieopłaconymi fakturami.');
          } finally {
            setAiLoading(false);
          }
        } else {
          setAiInsight('Wystaw pierwszą fakturę sprzedaży, aby system zaczął analizować Twoje finanse.');
          setAiLoading(false);
        }
      } catch (err) {
        console.error('Stats fetch error:', err);
        setStatsLoading(false);
      }
    };

    loadStats();
  }, [activeTenantId]);

  const pctChange = useMemo(() => {
    if (lastRevenue === 0) return null;
    return Math.round(((revenue - lastRevenue) / lastRevenue) * 100);
  }, [revenue, lastRevenue]);

  const tabs: { id: InvoiceTab; label: string }[] = [
    { id: 'all', label: 'Wszystkie' },
    { id: 'unpaid', label: 'Nieopłacone' },
    { id: 'overdue', label: 'Przeterminowane' },
    { id: 'proformas', label: 'Proformy' },
    { id: 'drafts', label: 'Szkice' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Stats Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <button
          className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm relative overflow-hidden group text-left hover:border-indigo-200 transition-colors"
          onClick={() => setActiveTab('all')}
        >
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sprzedaż Bieżąca</div>
          {statsLoading
            ? <div className="h-8 w-32 bg-slate-100 rounded-full animate-pulse mt-2" />
            : <div className="text-3xl font-black text-slate-900 italic tracking-tighter mb-2">{fmtPLN(revenue)}</div>
          }
          {pctChange !== null && (
            <div className={`text-[9px] font-bold uppercase flex items-center gap-1 ${pctChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              <ArrowRight size={10} className={pctChange >= 0 ? '-rotate-45' : 'rotate-45'} />
              {pctChange >= 0 ? '+' : ''}{pctChange}% vs poprz. mies.
            </div>
          )}
        </button>

        <button
          className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm relative overflow-hidden group text-left hover:border-rose-200 transition-colors"
          onClick={() => setActiveTab('unpaid')}
        >
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Należności</div>
          {statsLoading
            ? <div className="h-8 w-28 bg-slate-100 rounded-full animate-pulse mt-2" />
            : <div className="text-3xl font-black text-rose-600 italic tracking-tighter mb-2">{fmtPLN(outstanding)}</div>
          }
          <div className="text-[9px] font-bold text-rose-400 uppercase">
            {overdueCount} {overdueCount === 1 ? 'faktura przeterminowana' : 'faktury przeterminowane'}
          </div>
        </button>

        <div className="bg-indigo-600 rounded-[2.5rem] p-8 shadow-xl shadow-indigo-100 relative overflow-hidden group md:col-span-2">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="relative z-10 flex justify-between items-center h-full gap-6">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-2 italic">NoFiCo AI Insights</div>
              {aiLoading
                ? (
                  <div className="flex items-center gap-3">
                    <Loader2 size={18} className="animate-spin text-indigo-300" />
                    <span className="text-indigo-200 text-sm font-bold italic">Analizuję dane finansowe...</span>
                  </div>
                )
                : (
                  <p className="text-base font-black text-white uppercase italic tracking-tighter leading-tight line-clamp-2">
                    {aiInsight || 'Ładowanie rekomendacji AI...'}
                  </p>
                )
              }
            </div>
            <button className="flex-shrink-0 bg-white text-indigo-600 p-4 rounded-2xl shadow-xl hover:scale-110 transition-transform">
              <Sparkles size={24} />
            </button>
          </div>
        </div>
      </div>

      {/* Actions & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex p-2 bg-slate-100 rounded-[2rem] w-fit flex-wrap gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-4 rounded-[1.75rem] transition-all text-[11px] font-black uppercase tracking-widest ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-xl'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
              }`}
            >
              {tab.label}
              <span className="text-[9px] opacity-40">({tabCounts[tab.id]})</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex-1 md:w-64 relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input
              type="text"
              placeholder="Szukaj faktury..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 border-none rounded-2xl pl-16 pr-8 py-4 text-xs font-black uppercase italic tracking-tighter"
            />
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-slate-900 text-white px-8 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-indigo-600 transition-all shadow-2xl shadow-slate-100"
          >
            <Plus size={18} /> Nowa Faktura
          </button>
        </div>
      </div>

      <InvoiceList
        activeTab={activeTab}
        searchQuery={searchQuery}
        onCountsChange={setTabCounts}
      />

      {showForm && (
        <InvoiceForm onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}
