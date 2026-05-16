import React, { useState, useEffect } from 'react';
import { Users, RefreshCw, TrendingUp, BarChart2, DollarSign } from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface Props { tenantId: string }

interface Customer {
  id: string;
  name: string;
  status: string;
  totalRevenue?: number;
  createdAt?: any;
}

interface Deal {
  id: string;
  customerId?: string;
  value?: number;
  stage: string;
  closedAt?: any;
  updatedAt?: any;
}

interface CohortRow {
  period: string;
  label: string;
  acquired: number;
  active: number;
  churned: number;
  retentionRate: number;
  totalRevenue: number;
  ltv: number;
}

function monthKey(ts: any): string | null {
  const d = ts?.toDate?.() ?? (ts ? new Date(ts) : null);
  if (!d) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function periodLabel(key: string): string {
  const [y, m] = key.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('pl-PL', { month: 'short', year: '2-digit' });
}

function retentionColor(rate: number): string {
  if (rate >= 80) return 'bg-emerald-500 text-white';
  if (rate >= 60) return 'bg-emerald-300 text-white';
  if (rate >= 40) return 'bg-amber-300 text-white';
  if (rate >= 20) return 'bg-orange-400 text-white';
  return 'bg-red-400 text-white';
}

export default function CohortAnalysis({ tenantId }: Props) {
  const [cohorts, setCohorts] = useState<CohortRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'retention' | 'revenue' | 'ltv'>('retention');

  const load = async () => {
    setLoading(true);
    const [custSnap, dealSnap] = await Promise.all([
      getDocs(query(collection(db, 'customers'), where('tenantId', '==', tenantId))),
      getDocs(query(collection(db, 'deals'), where('tenantId', '==', tenantId))),
    ]);

    const customers = custSnap.docs.map(d => ({ id: d.id, ...d.data() } as Customer));
    const deals = dealSnap.docs.map(d => ({ id: d.id, ...d.data() } as Deal));
    const wonDeals = deals.filter(d => d.stage === 'closed_won');

    // Group customers by acquisition month
    const byMonth: Record<string, Customer[]> = {};
    customers.forEach(c => {
      const key = monthKey(c.createdAt);
      if (!key) return;
      byMonth[key] = [...(byMonth[key] ?? []), c];
    });

    // Compute revenue per customer
    const revenueByCustomer: Record<string, number> = {};
    wonDeals.forEach(d => {
      if (d.customerId) revenueByCustomer[d.customerId] = (revenueByCustomer[d.customerId] ?? 0) + (d.value ?? 0);
    });

    const rows: CohortRow[] = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12) // last 12 months
      .map(([period, custs]) => {
        const active = custs.filter(c => c.status === 'active').length;
        const churned = custs.filter(c => c.status === 'churned').length;
        const retentionRate = custs.length > 0 ? Math.round((active / custs.length) * 100) : 0;
        const totalRevenue = custs.reduce((s, c) => s + (revenueByCustomer[c.id] ?? c.totalRevenue ?? 0), 0);
        const ltv = custs.length > 0 ? Math.round(totalRevenue / custs.length) : 0;
        return { period, label: periodLabel(period), acquired: custs.length, active, churned, retentionRate, totalRevenue, ltv };
      });

    setCohorts(rows);
    setLoading(false);
  };

  useEffect(() => { load(); }, [tenantId]);

  const fmt = (n: number) => n.toLocaleString('pl-PL', { maximumFractionDigits: 0 });
  const fmtK = (n: number) => n >= 1000 ? (n / 1000).toFixed(0) + 'k' : String(n);

  const totalAcquired = cohorts.reduce((s, c) => s + c.acquired, 0);
  const avgRetention = cohorts.length > 0 ? Math.round(cohorts.reduce((s, c) => s + c.retentionRate, 0) / cohorts.length) : 0;
  const avgLtv = cohorts.length > 0 ? Math.round(cohorts.reduce((s, c) => s + c.ltv, 0) / cohorts.length) : 0;
  const totalRevenue = cohorts.reduce((s, c) => s + c.totalRevenue, 0);

  if (loading) return <div className="flex justify-center py-20"><RefreshCw size={20} className="animate-spin text-indigo-400" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Cohort Analysis</h3>
          <p className="text-xs text-slate-500 mt-0.5">Retencja i LTV per miesiąc pozyskania · ostatnie 12 miesięcy</p>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {([
            { id: 'retention', label: 'Retencja' },
            { id: 'revenue', label: 'Przychód' },
            { id: 'ltv', label: 'LTV' },
          ] as const).map(v => (
            <button key={v.id} onClick={() => setView(v.id)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${view === v.id ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Pozyskani łącznie', value: String(totalAcquired), icon: Users, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
          { label: 'Śr. retencja', value: avgRetention + '%', icon: TrendingUp, color: avgRetention >= 70 ? 'text-emerald-700' : 'text-amber-700', bg: 'bg-slate-50 border-slate-200' },
          { label: 'Śr. LTV', value: fmt(avgLtv) + ' PLN', icon: DollarSign, color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
          { label: 'Przychód łącznie', value: fmtK(totalRevenue) + ' PLN', icon: BarChart2, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
        ].map(k => (
          <div key={k.label} className={`rounded-2xl border p-5 ${k.bg}`}>
            <k.icon size={16} className={`${k.color} mb-2`} />
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{k.label}</p>
            <p className={`text-2xl font-black mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {cohorts.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">Brak danych do analizy kohortowej</div>
      ) : (
        <>
          {/* Heatmap table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 overflow-x-auto">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">
              {view === 'retention' ? 'Retencja (%)' : view === 'revenue' ? 'Przychód (PLN)' : 'LTV per klient (PLN)'}
            </p>
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="text-[9px] font-black text-slate-400 uppercase">
                  <th className="text-left py-2 pr-4 w-20">Kohorta</th>
                  <th className="py-2 px-2 w-16">Pozysk.</th>
                  <th className="py-2 px-2 w-14">Aktywni</th>
                  <th className="py-2 px-2 flex-1">Wartość</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {cohorts.map(c => {
                  const displayVal = view === 'retention' ? c.retentionRate + '%' : view === 'revenue' ? fmtK(c.totalRevenue) + ' PLN' : fmt(c.ltv) + ' PLN';
                  const heatVal = view === 'retention' ? c.retentionRate : view === 'revenue' ? (totalRevenue > 0 ? (c.totalRevenue / totalRevenue) * 100 : 0) : (avgLtv > 0 ? (c.ltv / (avgLtv * 2)) * 100 : 0);
                  return (
                    <tr key={c.period} className="hover:bg-slate-50">
                      <td className="py-3 pr-4 text-xs font-black text-slate-700">{c.label}</td>
                      <td className="py-3 px-2 text-center text-xs text-slate-600">{c.acquired}</td>
                      <td className="py-3 px-2 text-center text-xs text-slate-600">{c.active}</td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <div className={`px-3 py-1 rounded-lg text-[10px] font-black min-w-[64px] text-center ${retentionColor(heatVal)}`}>
                            {displayVal}
                          </div>
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${heatVal >= 60 ? 'bg-emerald-500' : heatVal >= 30 ? 'bg-amber-400' : 'bg-red-400'}`}
                              style={{ width: `${Math.min(heatVal, 100)}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bar chart */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Pozyskanie vs. aktywni per kohorta</p>
            <div className="space-y-3">
              {cohorts.map(c => (
                <div key={c.period} className="flex items-center gap-3">
                  <div className="w-14 text-[9px] font-black text-slate-500 text-right">{c.label}</div>
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="h-2.5 bg-blue-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-400 rounded-full" style={{ width: `${(c.acquired / Math.max(...cohorts.map(x => x.acquired))) * 100}%` }} />
                    </div>
                    <div className="h-2.5 bg-emerald-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(c.active / Math.max(...cohorts.map(x => x.acquired), 1)) * 100}%` }} />
                    </div>
                  </div>
                  <div className="text-[9px] text-slate-400 w-20 text-right">{c.acquired} / {c.active}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-3 text-[9px] font-black text-slate-400">
              <span className="flex items-center gap-1"><span className="w-3 h-1.5 bg-blue-400 rounded inline-block" /> Pozyskani</span>
              <span className="flex items-center gap-1"><span className="w-3 h-1.5 bg-emerald-500 rounded inline-block" /> Aktywni</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
