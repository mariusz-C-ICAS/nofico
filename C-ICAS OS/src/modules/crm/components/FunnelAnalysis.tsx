import React, { useState, useEffect } from 'react';
import { BarChart2, RefreshCw, TrendingDown, TrendingUp, AlertTriangle, Clock } from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface Props { tenantId: string }

interface Deal {
  id: string;
  stage: string;
  value?: number;
  probability?: number;
  createdAt?: any;
  updatedAt?: any;
  closedAt?: any;
}

const STAGES = [
  { key: 'lead',        label: 'Lead',         color: 'bg-slate-400', text: 'text-slate-700' },
  { key: 'meeting',     label: 'Spotkanie',    color: 'bg-blue-400',  text: 'text-blue-700' },
  { key: 'quote',       label: 'Oferta',       color: 'bg-indigo-500', text: 'text-indigo-700' },
  { key: 'negotiation', label: 'Negocjacje',   color: 'bg-violet-500', text: 'text-violet-700' },
  { key: 'closed_won',  label: 'Wygrane',      color: 'bg-emerald-500', text: 'text-emerald-700' },
];

function daysBetween(a: any, b: any): number | null {
  const da = a?.toDate?.() ?? (a ? new Date(a) : null);
  const db_ = b?.toDate?.() ?? (b ? new Date(b) : null);
  if (!da || !db_) return null;
  return Math.abs(Math.round((db_.getTime() - da.getTime()) / 86400000));
}

export default function FunnelAnalysis({ tenantId }: Props) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<90 | 180 | 365>(90);

  const load = async () => {
    setLoading(true);
    const snap = await getDocs(query(collection(db, 'deals'), where('tenantId', '==', tenantId)));
    setDeals(snap.docs.map(d => ({ id: d.id, ...d.data() } as Deal)));
    setLoading(false);
  };

  useEffect(() => { load(); }, [tenantId]);

  const cutoff = new Date(Date.now() - period * 86400000);
  const periodDeals = deals.filter(d => {
    const dt = d.createdAt?.toDate?.() ?? (d.createdAt ? new Date(d.createdAt) : null);
    return dt && dt >= cutoff;
  });

  const stageCounts = STAGES.map(s => {
    const stageDeals = deals.filter(d => d.stage === s.key);
    const value = stageDeals.reduce((sum, d) => sum + (d.value ?? 0), 0);
    return { ...s, count: stageDeals.length, value };
  });

  const maxCount = Math.max(...stageCounts.map(s => s.count), 1);

  const conversionRates: { from: string; to: string; rate: number }[] = [];
  for (let i = 0; i < STAGES.length - 1; i++) {
    const fromCount = stageCounts[i].count;
    const toCount = stageCounts[i + 1].count;
    const rate = fromCount > 0 ? Math.round((toCount / fromCount) * 100) : 0;
    conversionRates.push({ from: STAGES[i].label, to: STAGES[i + 1].label, rate });
  }

  const overallConversion = stageCounts[0].count > 0
    ? Math.round((stageCounts[stageCounts.length - 1].count / stageCounts[0].count) * 100) : 0;

  const avgDaysToClose = (() => {
    const closedDeals = deals.filter(d => d.stage === 'closed_won' && d.createdAt && d.closedAt);
    const days = closedDeals.map(d => daysBetween(d.createdAt, d.closedAt)).filter(d => d !== null) as number[];
    return days.length > 0 ? Math.round(days.reduce((s, d) => s + d, 0) / days.length) : null;
  })();

  const avgDealSize = (() => {
    const won = deals.filter(d => d.stage === 'closed_won');
    return won.length > 0 ? Math.round(won.reduce((s, d) => s + (d.value ?? 0), 0) / won.length) : 0;
  })();

  const bottleneck = (() => {
    let worst = { stage: '', rate: 100 };
    conversionRates.forEach(r => {
      if (r.rate < worst.rate) worst = { stage: `${r.from} → ${r.to}`, rate: r.rate };
    });
    return worst.rate < 100 ? worst : null;
  })();

  const fmt = (n: number) => n.toLocaleString('pl-PL', { maximumFractionDigits: 0 });

  if (loading) return <div className="flex justify-center py-20"><RefreshCw size={20} className="animate-spin text-indigo-400" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Funnel Analysis</h3>
          <p className="text-xs text-slate-500 mt-0.5">{deals.length} dealów ogółem · konwersja end-to-end: {overallConversion}%</p>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {([90, 180, 365] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${period === p ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}>
              {p === 365 ? '1 rok' : `${p}d`}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Konwersja end-to-end', value: overallConversion + '%', icon: TrendingUp, color: overallConversion >= 20 ? 'text-emerald-700' : 'text-amber-700', bg: 'bg-slate-50 border-slate-200' },
          { label: 'Śr. czas do zamknięcia', value: avgDaysToClose !== null ? `${avgDaysToClose}d` : '—', icon: Clock, color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
          { label: 'Śr. wartość dealu', value: fmt(avgDealSize) + ' PLN', icon: BarChart2, color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
          { label: 'Nowe w okresie', value: String(periodDeals.length), icon: TrendingUp, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
        ].map(k => (
          <div key={k.label} className={`rounded-2xl border p-5 ${k.bg}`}>
            <k.icon size={16} className={`${k.color} mb-2`} />
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{k.label}</p>
            <p className={`text-2xl font-black mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Bottleneck alert */}
      {bottleneck && bottleneck.rate < 40 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle size={14} className="text-amber-600 flex-shrink-0" />
          <p className="text-xs font-black text-amber-700">
            Bottleneck: {bottleneck.stage} — konwersja tylko {bottleneck.rate}%
          </p>
        </div>
      )}

      {/* Funnel visualization */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-6">Lejek sprzedażowy</p>
        <div className="space-y-2">
          {stageCounts.map((s, i) => {
            const width = maxCount > 0 ? Math.max((s.count / maxCount) * 100, 4) : 4;
            return (
              <div key={s.key} className="flex items-center gap-4">
                <div className="w-24 text-[10px] font-black text-slate-600 text-right">{s.label}</div>
                <div className="flex-1 flex items-center gap-3">
                  <div className="flex-1 h-9 bg-slate-100 rounded-xl overflow-hidden">
                    <div className={`h-full ${s.color} rounded-xl flex items-center pl-3 transition-all duration-500`}
                      style={{ width: `${width}%` }}>
                      {s.count > 0 && (
                        <span className="text-white text-[10px] font-black whitespace-nowrap">{s.count}</span>
                      )}
                    </div>
                  </div>
                  <div className="w-24 text-right">
                    <p className="text-xs font-black text-slate-700">{s.count} dealów</p>
                    <p className="text-[9px] text-slate-400">{fmt(s.value)} PLN</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Conversion rates */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Konwersja między etapami</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {conversionRates.map(r => (
            <div key={r.from + r.to} className="text-center">
              <p className="text-[9px] text-slate-400 mb-1">{r.from} → {r.to}</p>
              <div className={`text-2xl font-black ${r.rate >= 50 ? 'text-emerald-700' : r.rate >= 25 ? 'text-amber-700' : 'text-red-700'}`}>
                {r.rate}%
              </div>
              {r.rate < 25 && <p className="text-[8px] text-red-500 mt-0.5 flex items-center justify-center gap-0.5"><TrendingDown size={8} /> Niski</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Stage velocity */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Wartość per etap</p>
        <div className="space-y-3">
          {stageCounts.filter(s => s.value > 0).map(s => {
            const totalVal = stageCounts.reduce((sum, x) => sum + x.value, 0);
            const pct = totalVal > 0 ? (s.value / totalVal) * 100 : 0;
            return (
              <div key={s.key}>
                <div className="flex justify-between text-[10px] font-black text-slate-700 mb-1">
                  <span>{s.label}</span>
                  <span>{fmt(s.value)} PLN ({pct.toFixed(0)}%)</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${s.color} rounded-full`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
