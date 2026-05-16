import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Target, Users, CheckSquare, Star,
  RefreshCw, ArrowUpRight, ArrowDownRight, Minus,
  DollarSign, BarChart2, Zap, AlertTriangle
} from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface Props { tenantId: string }

interface KpiData {
  totalPipeline: number;
  weightedForecast: number;
  winRate: number;
  avgDealSize: number;
  openDeals: number;
  wonThisMonth: number;
  lostThisMonth: number;
  activeCustomers: number;
  openTasks: number;
  overdueTasks: number;
  avgNps: number | null;
  activitiesThisWeek: number;
  upsellOpportunities: number;
  mrr: number;
}

function pctChange(current: number, prev: number): number | null {
  if (prev === 0) return null;
  return Math.round(((current - prev) / prev) * 100);
}

export default function CrmDashboard({ tenantId }: Props) {
  const [kpi, setKpi] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const load = async () => {
    setLoading(true);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now.getTime() - 7 * 86400000);

    const [dealsSnap, custSnap, tasksSnap, npsSnap, activitiesSnap] = await Promise.all([
      getDocs(query(collection(db, 'deals'), where('tenantId', '==', tenantId))),
      getDocs(query(collection(db, 'customers'), where('tenantId', '==', tenantId))),
      getDocs(query(collection(db, `tenants/${tenantId}/crmTasks`), where('tenantId', '==', tenantId))),
      getDocs(query(collection(db, `tenants/${tenantId}/npsResponses`), where('tenantId', '==', tenantId))),
      getDocs(query(collection(db, `tenants/${tenantId}/crmActivities`), where('tenantId', '==', tenantId))),
    ]);

    const deals = dealsSnap.docs.map(d => d.data());
    const customers = custSnap.docs.map(d => d.data());
    const tasks = tasksSnap.docs.map(d => d.data());
    const npsResponses = npsSnap.docs.map(d => d.data());
    const activities = activitiesSnap.docs.map(d => d.data());

    const openDeals = deals.filter(d => !['closed_won', 'closed_lost'].includes(d.stage ?? ''));
    const wonDeals = deals.filter(d => d.stage === 'closed_won');
    const lostDeals = deals.filter(d => d.stage === 'closed_lost');

    const wonThisMonth = wonDeals.filter(d => {
      const dt = d.closedAt?.toDate?.() ?? d.updatedAt?.toDate?.();
      return dt && dt >= startOfMonth;
    });
    const lostThisMonth = lostDeals.filter(d => {
      const dt = d.closedAt?.toDate?.() ?? d.updatedAt?.toDate?.();
      return dt && dt >= startOfMonth;
    });

    const totalPipeline = openDeals.reduce((s, d) => s + (d.value ?? 0), 0);
    const weightedForecast = openDeals.reduce((s, d) => s + ((d.value ?? 0) * ((d.probability ?? 0) / 100)), 0);
    const avgDealSize = wonDeals.length > 0 ? wonDeals.reduce((s, d) => s + (d.value ?? 0), 0) / wonDeals.length : 0;
    const totalClosed = wonDeals.length + lostDeals.length;
    const winRate = totalClosed > 0 ? Math.round((wonDeals.length / totalClosed) * 100) : 0;

    const mrr = customers
      .filter(c => c.status === 'active' && c.contractType === 'subscription')
      .reduce((s, c) => s + (c.monthlyValue ?? c.totalRevenue / 12 ?? 0), 0);

    const openTasksList = tasks.filter(t => !t.isDone);
    const overdueTasks = openTasksList.filter(t => {
      const d = t.dueDate?.toDate?.() ?? (t.dueDate ? new Date(t.dueDate) : null);
      return d && d < now;
    });

    const npsTotal = npsResponses.length;
    const avgNps = npsTotal > 0
      ? Math.round(((npsResponses.filter(r => r.score >= 9).length - npsResponses.filter(r => r.score <= 6).length) / npsTotal) * 100)
      : null;

    const activitiesThisWeek = activities.filter(a => {
      const d = a.createdAt?.toDate?.();
      return d && d >= startOfWeek;
    }).length;

    setKpi({
      totalPipeline, weightedForecast, winRate, avgDealSize,
      openDeals: openDeals.length,
      wonThisMonth: wonThisMonth.length,
      lostThisMonth: lostThisMonth.length,
      activeCustomers: customers.filter(c => c.status === 'active').length,
      openTasks: openTasksList.length,
      overdueTasks: overdueTasks.length,
      avgNps, activitiesThisWeek,
      upsellOpportunities: 0, // computed separately
      mrr,
    });
    setLastRefresh(new Date());
    setLoading(false);
  };

  useEffect(() => { load(); }, [tenantId]);

  const fmt = (n: number) => n.toLocaleString('pl-PL', { maximumFractionDigits: 0 });
  const fmtK = (n: number) => n >= 1000000 ? (n / 1000000).toFixed(1) + 'M' : n >= 1000 ? (n / 1000).toFixed(0) + 'k' : String(Math.round(n));

  if (loading) return (
    <div className="flex justify-center py-20"><RefreshCw size={20} className="animate-spin text-indigo-400" /></div>
  );
  if (!kpi) return null;

  const kpis = [
    {
      label: 'Total Pipeline', value: fmtK(kpi.totalPipeline) + ' PLN',
      sub: `${fmt(kpi.weightedForecast)} ważony`, icon: Target,
      color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200',
    },
    {
      label: 'Win Rate', value: kpi.winRate + '%',
      sub: `${kpi.wonThisMonth} wygranych · ${kpi.lostThisMonth} straconych (mies.)`,
      icon: TrendingUp, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200',
    },
    {
      label: 'Avg Deal Size', value: fmtK(kpi.avgDealSize) + ' PLN',
      sub: `${kpi.openDeals} otwartych dealów`, icon: DollarSign,
      color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200',
    },
    {
      label: 'Aktywni klienci', value: String(kpi.activeCustomers),
      sub: 'Status: active', icon: Users,
      color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200',
    },
    {
      label: 'NPS Score', value: kpi.avgNps !== null ? String(kpi.avgNps) : '—',
      sub: 'Net Promoter Score', icon: Star,
      color: kpi.avgNps !== null && kpi.avgNps >= 50 ? 'text-emerald-700' : kpi.avgNps !== null && kpi.avgNps >= 0 ? 'text-amber-700' : 'text-slate-400',
      bg: 'bg-slate-50', border: 'border-slate-200',
    },
    {
      label: 'Otwarte zadania', value: String(kpi.openTasks),
      sub: kpi.overdueTasks > 0 ? `${kpi.overdueTasks} przeterminowanych` : 'Wszystkie na czas',
      icon: CheckSquare,
      color: kpi.overdueTasks > 0 ? 'text-red-700' : 'text-slate-700',
      bg: kpi.overdueTasks > 0 ? 'bg-red-50' : 'bg-slate-50',
      border: kpi.overdueTasks > 0 ? 'border-red-200' : 'border-slate-200',
    },
    {
      label: 'Aktywności 7 dni', value: String(kpi.activitiesThisWeek),
      sub: 'Notatki, rozmowy, emaile', icon: Zap,
      color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200',
    },
    {
      label: 'MRR (est.)', value: fmtK(kpi.mrr) + ' PLN',
      sub: 'Klienci z kontraktem abon.', icon: BarChart2,
      color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200',
    },
  ];

  // Pipeline stage breakdown from deals
  const stageFunnel = [
    { stage: 'Leady',       key: 'lead' },
    { stage: 'Spotkania',   key: 'meeting' },
    { stage: 'Oferta',      key: 'quote' },
    { stage: 'Negocjacje',  key: 'negotiation' },
    { stage: 'Wygrane',     key: 'closed_won' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Dashboard CRM</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Odświeżono: {lastRefresh.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-black text-xs uppercase tracking-widest">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Odśwież
        </button>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className={`rounded-2xl border p-5 ${k.bg} ${k.border}`}>
            <k.icon size={16} className={`${k.color} mb-2`} />
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{k.label}</p>
            <p className={`text-2xl font-black mt-1 ${k.color}`}>{k.value}</p>
            <p className="text-[9px] text-slate-500 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {kpi.overdueTasks > 0 && (
        <div className="bg-red-50 rounded-2xl p-4 border border-red-200 flex items-center gap-3">
          <AlertTriangle size={16} className="text-red-600 flex-shrink-0" />
          <p className="text-xs font-black text-red-700">
            {kpi.overdueTasks} zadań przeterminowanych — przejdź do zakładki Zadania
          </p>
        </div>
      )}
      {kpi.winRate < 30 && kpi.winRate > 0 && (
        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 flex items-center gap-3">
          <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
          <p className="text-xs font-black text-amber-700">
            Win rate {kpi.winRate}% — poniżej progu 30%. Sprawdź przyczyny w zakładce Win/Loss.
          </p>
        </div>
      )}

      {/* Pipeline velocity */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Pipeline Velocity</p>
          <div className="space-y-3">
            {[
              { label: 'Ważony forecast', val: kpi.weightedForecast, max: kpi.totalPipeline, color: 'bg-indigo-500' },
              { label: 'Best case (≥50%)', val: kpi.weightedForecast * 1.3, max: kpi.totalPipeline, color: 'bg-emerald-500' },
            ].map(({ label, val, max, color }) => (
              <div key={label}>
                <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-1">
                  <span>{label}</span>
                  <span>{fmtK(Math.min(val, max))} PLN</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${color}`}
                    style={{ width: `${max > 0 ? Math.min((val / max) * 100, 100) : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Ten miesiąc</p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Wygrane', val: kpi.wonThisMonth, color: 'text-emerald-700 bg-emerald-50' },
              { label: 'Stracone', val: kpi.lostThisMonth, color: 'text-red-700 bg-red-50' },
              { label: 'Aktywności', val: kpi.activitiesThisWeek, color: 'text-indigo-700 bg-indigo-50' },
              { label: 'Otwarte deale', val: kpi.openDeals, color: 'text-slate-700 bg-slate-50' },
            ].map(({ label, val, color }) => (
              <div key={label} className={`rounded-xl p-3 ${color.split(' ')[1]}`}>
                <p className="text-[8px] font-black text-slate-400 uppercase">{label}</p>
                <p className={`text-2xl font-black ${color.split(' ')[0]}`}>{val}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
