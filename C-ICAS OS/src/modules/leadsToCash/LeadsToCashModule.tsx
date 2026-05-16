/**
 * Data: 2026-05-16
 * Ścieżka: /src/modules/leadsToCash/LeadsToCashModule.tsx
 * UC#16 — Leads to Cash orchestration view.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Target, FileSignature, Hammer, Receipt, Banknote,
  ArrowRight, TrendingUp, Loader2, ExternalLink, ChevronRight,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  collection, query, where, getDocs, orderBy, limit,
} from 'firebase/firestore';
import { db } from '../../shared/lib/firebase';
import useTenant from '../../shared/hooks/useTenant';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StageData {
  count: number;
  value: number;
  loading: boolean;
}

interface RecentDeal {
  id: string;
  title: string;
  customer?: string;
  value: number;
  stage: string;
  updatedAt?: any;
}

const EMPTY: StageData = { count: 0, value: 0, loading: true };

const STAGE_LABELS: Record<string, string> = {
  lead: 'Lead', meeting: 'Spotkanie', quote: 'Oferta',
  negotiation: 'Negocjacje', closed_won: 'Wygrany', closed_lost: 'Przegrany',
};

const STAGE_COLORS: Record<string, string> = {
  lead: 'bg-slate-100 text-slate-600',
  meeting: 'bg-blue-50 text-blue-700',
  quote: 'bg-indigo-50 text-indigo-700',
  negotiation: 'bg-amber-50 text-amber-700',
  closed_won: 'bg-emerald-50 text-emerald-700',
  closed_lost: 'bg-rose-50 text-rose-600',
};

// ─── Pipeline Stage Card ──────────────────────────────────────────────────────

function StageCard({
  icon: Icon, label, sublabel, data, accent, route, last,
}: {
  icon: React.ElementType; label: string; sublabel: string;
  data: StageData; accent: string; route: string; last?: boolean;
}) {
  const nav = useNavigate();
  return (
    <div className="flex items-stretch gap-0">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => nav(route)}
        className={`flex-1 flex flex-col gap-3 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all text-left group`}
      >
        <div className="flex items-center justify-between">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent}`}>
            <Icon size={18} />
          </div>
          <ExternalLink size={13} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
        </div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{sublabel}</p>
          <p className="text-sm font-black text-slate-800 uppercase italic tracking-tight leading-tight">{label}</p>
        </div>
        {data.loading ? (
          <Loader2 size={14} className="animate-spin text-slate-300" />
        ) : (
          <div>
            <p className="text-2xl font-black text-slate-900">{data.count}</p>
            {data.value > 0 && (
              <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">
                {data.value.toLocaleString('pl-PL')} PLN
              </p>
            )}
          </div>
        )}
      </motion.button>
      {!last && (
        <div className="flex items-center px-1">
          <ArrowRight size={16} className="text-slate-200 flex-shrink-0" />
        </div>
      )}
    </div>
  );
}

// ─── Conversion Rate Bar ──────────────────────────────────────────────────────

function ConvRate({ from, to, pct }: { from: number; to: number; pct: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-700"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className="text-[10px] font-black text-slate-400 tabular-nums w-10 text-right">
        {from > 0 ? Math.round(pct) : 0}%
      </span>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function LeadsToCashModule() {
  const { activeTenantId } = useTenant();
  const [leads, setLeads] = useState<StageData>(EMPTY);
  const [offers, setOffers] = useState<StageData>(EMPTY);
  const [contracts, setContracts] = useState<StageData>(EMPTY);
  const [projects, setProjects] = useState<StageData>(EMPTY);
  const [invoices, setInvoices] = useState<StageData>(EMPTY);
  const [receipts, setReceipts] = useState<StageData>(EMPTY);
  const [recentDeals, setRecentDeals] = useState<RecentDeal[]>([]);
  const [dealsLoading, setDealsLoading] = useState(true);

  useEffect(() => {
    if (!activeTenantId) return;
    fetchAll(activeTenantId);
  }, [activeTenantId]);

  const fetchAll = async (tid: string) => {
    await Promise.all([
      fetchCustomers(tid),
      fetchDeals(tid),
      fetchProjects(tid),
      fetchInvoices(tid),
      fetchPayments(tid),
      fetchRecentDeals(tid),
    ]);
  };

  const fetchCustomers = async (tid: string) => {
    const snap = await getDocs(query(collection(db, 'customers'), where('tenantId', '==', tid), where('status', '==', 'prospect')));
    setLeads({ count: snap.size, value: 0, loading: false });
  };

  const fetchDeals = async (tid: string) => {
    const snap = await getDocs(query(collection(db, 'deals'), where('tenantId', '==', tid)));
    const all = snap.docs.map(d => ({ stage: d.data().stage, value: d.data().value || 0 }));
    const offerDocs = all.filter(d => ['meeting', 'quote'].includes(d.stage));
    const negosDocs = all.filter(d => d.stage === 'negotiation');
    setOffers({ count: offerDocs.length, value: offerDocs.reduce((s, d) => s + d.value, 0), loading: false });
    setContracts({ count: negosDocs.length, value: negosDocs.reduce((s, d) => s + d.value, 0), loading: false });
  };

  const fetchProjects = async (tid: string) => {
    const snap = await getDocs(query(collection(db, 'projects'), where('tenantId', '==', tid)));
    setProjects({ count: snap.size, value: 0, loading: false });
  };

  const fetchInvoices = async (tid: string) => {
    const snap = await getDocs(query(collection(db, 'invoices'), where('tenantId', '==', tid)));
    const total = snap.docs.reduce((s, d) => s + (d.data().amount || d.data().totalGross || 0), 0);
    setInvoices({ count: snap.size, value: total, loading: false });
  };

  const fetchPayments = async (tid: string) => {
    const snap = await getDocs(query(collection(db, 'financialTransactions'), where('tenantId', '==', tid), where('type', '==', 'income')));
    const total = snap.docs.reduce((s, d) => s + (d.data().amount || 0), 0);
    setReceipts({ count: snap.size, value: total, loading: false });
  };

  const fetchRecentDeals = async (tid: string) => {
    setDealsLoading(true);
    try {
      const snap = await getDocs(query(
        collection(db, 'deals'), where('tenantId', '==', tid),
        orderBy('createdAt', 'desc'), limit(8)
      ));
      setRecentDeals(snap.docs.map(d => ({ id: d.id, ...d.data() } as RecentDeal)));
    } catch {
      setRecentDeals([]);
    } finally {
      setDealsLoading(false);
    }
  };

  const stages = [
    { icon: Users,         label: 'Leady',       sublabel: '01 / Akwizycja',    data: leads,     accent: 'bg-slate-100 text-slate-600',   route: '/crm' },
    { icon: Target,        label: 'Oferty',       sublabel: '02 / Kwalifikacja', data: offers,    accent: 'bg-blue-50 text-blue-600',      route: '/crm' },
    { icon: FileSignature, label: 'Kontrakty',    sublabel: '03 / Umowa',        data: contracts, accent: 'bg-indigo-50 text-indigo-600',  route: '/crm' },
    { icon: Hammer,        label: 'Realizacja',   sublabel: '04 / Projekt',      data: projects,  accent: 'bg-amber-50 text-amber-600',    route: '/projects' },
    { icon: Receipt,       label: 'Fakturowanie', sublabel: '05 / Faktura',      data: invoices,  accent: 'bg-violet-50 text-violet-600',  route: '/finance' },
    { icon: Banknote,      label: 'Wpłaty',       sublabel: '06 / Cash',         data: receipts,  accent: 'bg-emerald-50 text-emerald-600', route: '/payments', last: true },
  ] as const;

  const topValue = Math.max(leads.count, offers.count, contracts.count, projects.count, invoices.count, receipts.count, 1);

  return (
    <div className="max-w-[1600px] mx-auto p-8 space-y-10 animate-in fade-in duration-500">

      {/* Header */}
      <div className="bg-slate-900 rounded-[3rem] p-10 relative overflow-hidden shadow-2xl shadow-slate-200">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <div className="bg-indigo-600 p-3 rounded-[1.5rem] shadow-lg shadow-indigo-900/40">
                <TrendingUp className="text-white" size={22} />
              </div>
              <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">
                Leads to Cash
              </h1>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">
              UC#16 — Pełna Ścieżka Klienta · C-ICAS OS
            </p>
          </div>
          <div className="flex gap-8">
            {[
              { label: 'Aktywne leady',   value: leads.count + offers.count + contracts.count, color: 'text-white' },
              { label: 'W realizacji',    value: projects.count,                                color: 'text-amber-400' },
              { label: 'Faktur otwartych', value: invoices.count,                              color: 'text-indigo-400' },
            ].map(s => (
              <div key={s.label} className="text-right">
                <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pipeline */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {stages.map((s, i) => (
          <StageCard key={i} {...s} />
        ))}
      </div>

      {/* Conversion funnel */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Konwersja etapów</p>
        <div className="space-y-3">
          {[
            { label: 'Leady → Oferty',      from: leads.count,     to: offers.count },
            { label: 'Oferty → Kontrakty',  from: offers.count,    to: contracts.count },
            { label: 'Kontrakty → Projekty',from: contracts.count, to: projects.count },
            { label: 'Projekty → Faktury',  from: projects.count,  to: invoices.count },
            { label: 'Faktury → Wpłaty',    from: invoices.count,  to: receipts.count },
          ].map(r => (
            <div key={r.label} className="grid grid-cols-[180px_1fr] items-center gap-4">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{r.label}</span>
              <ConvRate from={r.from} to={r.to} pct={r.from > 0 ? (r.to / r.from) * 100 : 0} />
            </div>
          ))}
        </div>
      </div>

      {/* Recent deals */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Ostatnie transakcje</p>
          <button onClick={() => window.location.href = '/crm'}
            className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 transition-colors">
            Wszystkie <ChevronRight size={12} />
          </button>
        </div>
        {dealsLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 size={20} className="animate-spin text-slate-300" />
          </div>
        ) : recentDeals.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-slate-300 text-[10px] font-black uppercase tracking-widest">
            Brak danych — dodaj pierwszy deal w CRM
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {recentDeals.map(deal => (
              <div key={deal.id} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <Target size={13} className="text-indigo-500" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-800 uppercase italic tracking-tight">{deal.title}</p>
                    {deal.customer && (
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{deal.customer}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${STAGE_COLORS[deal.stage] || 'bg-slate-100 text-slate-500'}`}>
                    {STAGE_LABELS[deal.stage] || deal.stage}
                  </span>
                  {deal.value > 0 && (
                    <span className="text-sm font-black text-slate-900 tabular-nums">
                      {deal.value.toLocaleString('pl-PL')} PLN
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
