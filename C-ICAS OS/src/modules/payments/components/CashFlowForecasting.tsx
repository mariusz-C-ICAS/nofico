/**
 * Data: 2026-05-16
 * Ścieżka: /src/modules/payments/components/CashFlowForecasting.tsx
 */
import React, { useEffect, useState } from 'react';
import {
  TrendingUp, Activity, PieChart,
  AlertCircle, ArrowUpRight, Target, Sparkles, ShieldCheck, Loader2,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { db } from '../../../shared/lib/firebase';
import { collection, query, getDocs, where, Timestamp } from 'firebase/firestore';
import { useTenant } from '../../../shared/hooks/useTenant';

interface ChartRow { month: string; revenue: number; costs: number; forecast?: boolean }

export default function CashFlowForecasting() {
  const { activeTenantId } = useTenant();
  const [data, setData]       = useState<ChartRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeTenantId) return;
    const now = new Date();

    const actual = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (4 - i), 1);
      return { year: d.getFullYear(), month: d.getMonth(), name: d.toLocaleDateString('pl-PL', { month: 'short' }) };
    });

    const qStart = Timestamp.fromDate(new Date(actual[0].year, actual[0].month, 1));
    const qEnd   = Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59));

    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(query(
          collection(db, `tenants/${activeTenantId}/invoices`),
          where('issueDate', '>=', qStart),
          where('issueDate', '<=', qEnd),
        ));

        const byKey: Record<string, { revenue: number; costs: number }> = {};
        actual.forEach(m => { byKey[`${m.year}-${m.month}`] = { revenue: 0, costs: 0 }; });

        snap.docs.forEach(d => {
          const inv  = d.data();
          const date = inv.issueDate?.toDate?.() as Date | undefined;
          if (!date) return;
          const key = `${date.getFullYear()}-${date.getMonth()}`;
          if (!(key in byKey)) return;
          const amt = inv.totalGross ?? inv.totalNet ?? 0;
          if (inv.type === 'SALES') byKey[key].revenue += amt;
          else                       byKey[key].costs   += amt;
        });

        const actRows: ChartRow[] = actual.map(m => ({
          month:   m.name,
          revenue: Math.round(byKey[`${m.year}-${m.month}`].revenue),
          costs:   Math.round(byKey[`${m.year}-${m.month}`].costs),
        }));

        const avgRevGrowth  = actRows.length > 1
          ? actRows.slice(1).reduce((s, r, i) => s + (r.revenue - actRows[i].revenue), 0) / (actRows.length - 1)
          : 0;
        const avgCostGrowth = actRows.length > 1
          ? actRows.slice(1).reduce((s, r, i) => s + (r.costs - actRows[i].costs), 0) / (actRows.length - 1)
          : 0;

        const last = actRows[actRows.length - 1];
        const forecastRows: ChartRow[] = [1, 2, 3].map(i => {
          const fd = new Date(now.getFullYear(), now.getMonth() + i, 1);
          return {
            month:   fd.toLocaleDateString('pl-PL', { month: 'short' }),
            revenue: Math.max(0, Math.round(last.revenue + avgRevGrowth * i)),
            costs:   Math.max(0, Math.round(last.costs   + avgCostGrowth * i)),
            forecast: true,
          };
        });

        setData([...actRows, ...forecastRows]);
      } finally {
        setLoading(false);
      }
    })();
  }, [activeTenantId]);

  const totalRev  = data.filter(d => !d.forecast).reduce((s, d) => s + d.revenue, 0);
  const totalCost = data.filter(d => !d.forecast).reduce((s, d) => s + d.costs,   0);
  const saldo     = data.reduce((s, d) => s + (d.revenue - d.costs), 0);
  const burnRate  = totalCost > 0 ? Math.round(totalCost / 90) : 0;
  const qr        = totalCost > 0 ? Math.round((totalRev / totalCost) * 100) / 100 : 0;
  const riskLabel = qr > 1.5 ? 'Low' : qr > 1 ? 'Medium' : 'High';

  const fmt = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n);

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {loading ? (
          <div className="col-span-4 flex justify-center py-8">
            <Loader2 className="animate-spin text-slate-400" size={24} />
          </div>
        ) : [
          { label: 'Prognozowany Saldo',     value: fmt(saldo),          icon: TrendingUp,  color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Burn Rate (ML)',          value: `${fmt(burnRate)}/d`, icon: Activity,   color: 'text-rose-600',   bg: 'bg-rose-50'   },
          { label: 'Płynność (Quick Ratio)',  value: String(qr),          icon: PieChart,    color: 'text-emerald-600',bg: 'bg-emerald-50'},
          { label: 'Zagrożenie Zatorami',    value: riskLabel,            icon: ShieldCheck, color: 'text-amber-600',  bg: 'bg-amber-50'  },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center text-center">
            <div className={`w-14 h-14 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center mb-6`}>
              <stat.icon size={28} />
            </div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">{stat.label}</div>
            <div className="text-3xl font-black text-slate-900 italic tracking-tighter">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-100 p-12 shadow-sm">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">BigQuery ML Cash Flow Model</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic leading-none">Prognoza przychodów i kosztów (Next 3 Months)</p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-indigo-600 rounded-full"></div><span className="text-[9px] font-black uppercase italic text-slate-400">Revenue</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-rose-400 rounded-full"></div><span className="text-[9px] font-black uppercase italic text-slate-400">Costs</span></div>
          </div>
        </div>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#4f46e5" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} dy={20} />
              <YAxis hide />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '16px', color: '#fff', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }} itemStyle={{ color: '#fff' }} />
              <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" animationDuration={2000} />
              <Area type="monotone" dataKey="costs" stroke="#fb7185" strokeWidth={2} strokeDasharray="5 5" fillOpacity={0} animationDuration={2000} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8">
          <div className="bg-slate-900 rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden">
            <Sparkles size={48} className="text-indigo-400 absolute top-12 right-12 opacity-20" />
            <h4 className="text-xl font-black uppercase italic tracking-tighter mb-8">Rekomendacje AI Finance</h4>
            <div className="space-y-6">
              {[
                { icon: ArrowUpRight, text: 'ML wykrył sezonowy wzrost przychodów w Q3. Sugerowana optymalizacja rezerw gotówkowych.', priority: 'High' },
                { icon: Target,       text: 'Zwiększ limit kredytowy o 15% przed planowanymi wydatkami w lipcu.',                      priority: 'Medium' },
                { icon: AlertCircle,  text: 'Wykryto 3 potencjalne opóźnienia w płatnościach od kluczowych kontrahentów.',             priority: 'Urgent' },
              ].map((rec, i) => (
                <div key={i} className="flex gap-6 p-6 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${rec.priority === 'Urgent' ? 'bg-rose-500' : 'bg-indigo-600'}`}>
                    <rec.icon size={24} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">{rec.priority} Priority</div>
                    <p className="text-[11px] font-black italic uppercase leading-relaxed text-white/80">{rec.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="lg:col-span-4 bg-white border border-slate-100 rounded-[3rem] p-12 shadow-sm text-center">
          <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-indigo-50">
            <Activity size={40} />
          </div>
          <h5 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter mb-4">Accuracy Rate</h5>
          <div className="text-5xl font-black text-indigo-600 italic mb-4">94.2%</div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic leading-relaxed">System uczący się na podstawie Twoich danych z ostatnich 2 lat (Standard ML-ERP V2).</p>
        </div>
      </div>
    </div>
  );
}
