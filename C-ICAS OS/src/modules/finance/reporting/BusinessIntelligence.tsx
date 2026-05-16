/**
 * Data: 2026-05-16
 * Ścieżka: /src/modules/finance/reporting/BusinessIntelligence.tsx
 */
import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import { Sparkles, TrendingUp, Info } from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, getDocs, where, Timestamp } from 'firebase/firestore';
import { useAuth } from '../../../shared/hooks/AuthContext';

interface ChartRow { name: string; sales: number; costs: number; cash: number; }

export default function BusinessIntelligence() {
  const { activeTenantId } = useAuth() as any;
  const [data, setData] = useState<ChartRow[]>([]);

  useEffect(() => {
    if (!activeTenantId) return;
    const now = new Date();

    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { year: d.getFullYear(), month: d.getMonth(), name: d.toLocaleDateString('pl-PL', { month: 'short' }) };
    });

    const queryStart = Timestamp.fromDate(new Date(months[0].year, months[0].month, 1));
    const queryEnd   = Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59));

    (async () => {
      const snap = await getDocs(query(
        collection(db, `tenants/${activeTenantId}/invoices`),
        where('issueDate', '>=', queryStart),
        where('issueDate', '<=', queryEnd),
      ));

      const byKey: Record<string, { sales: number; costs: number }> = {};
      months.forEach(m => { byKey[`${m.year}-${m.month}`] = { sales: 0, costs: 0 }; });

      snap.docs.forEach(d => {
        const inv  = d.data();
        const date = inv.issueDate?.toDate?.() as Date | undefined;
        if (!date) return;
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        if (!(key in byKey)) return;
        const amt = inv.totalGross ?? inv.totalNet ?? 0;
        if (inv.type === 'SALES') byKey[key].sales += amt;
        else                       byKey[key].costs += amt;
      });

      let cash = 0;
      setData(months.map(m => {
        const { sales, costs } = byKey[`${m.year}-${m.month}`];
        cash += sales - costs;
        return { name: m.name, sales: Math.round(sales), costs: Math.round(costs), cash: Math.round(cash) };
      }));
    })();
  }, [activeTenantId]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h4 className="text-xl font-black text-slate-900 uppercase italic">Cash Flow Forecast</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Narastające cash (6 miesięcy)</p>
            </div>
            <div className="bg-indigo-50 p-4 rounded-2xl"><Sparkles className="text-indigo-600" size={24} /></div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }} />
                <Area type="monotone" dataKey="cash" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorCash)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h4 className="text-xl font-black text-slate-900 uppercase italic">Margin Analysis</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Przychody vs Koszty</p>
            </div>
            <div className="bg-emerald-50 p-4 rounded-2xl"><TrendingUp className="text-emerald-600" size={24} /></div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} barGap={12}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: '900' }} />
                <Bar dataKey="sales" fill="#6366f1" radius={[8, 8, 8, 8]} barSize={20} />
                <Bar dataKey="costs" fill="#f43f5e" radius={[8, 8, 8, 8]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-slate-900 rounded-[3rem] p-10 text-white md:col-span-2">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h5 className="text-2xl font-black uppercase italic tracking-tighter mb-1">Looker AI Dashboard</h5>
              <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest italic leading-none">Automatyczna korelacja BigQuery x Firestore</p>
            </div>
            <Info size={18} className="text-indigo-400" />
          </div>
          <div className="grid grid-cols-2 gap-8 mt-10">
            {data.length > 0 ? (() => {
              const lastMonth = data[data.length - 1];
              const margin = lastMonth.sales > 0 ? Math.round(((lastMonth.sales - lastMonth.costs) / lastMonth.sales) * 1000) / 10 : 0;
              return (
                <>
                  <div className="p-6 bg-white/5 rounded-[2rem] border border-white/10">
                    <div className="text-[9px] font-black text-indigo-300 uppercase mb-2 italic">Przychód (ostatni miesiąc)</div>
                    <div className="text-3xl font-black italic tracking-tighter">
                      {lastMonth.sales.toLocaleString('pl-PL')} <span className="text-xs text-slate-400">PLN</span>
                    </div>
                  </div>
                  <div className="p-6 bg-white/5 rounded-[2rem] border border-white/10">
                    <div className="text-[9px] font-black text-indigo-300 uppercase mb-2 italic">Marża (ostatni miesiąc)</div>
                    <div className="text-3xl font-black italic tracking-tighter text-emerald-400">
                      {margin}% <span className="text-xs text-slate-400">netto</span>
                    </div>
                  </div>
                </>
              );
            })() : (
              <div className="col-span-2 text-slate-500 text-sm italic">Brak danych — zaimportuj faktury</div>
            )}
          </div>
        </div>

        <div className="bg-indigo-600 rounded-[3rem] p-10 text-white flex flex-col justify-between">
          <TrendingUp size={32} strokeWidth={3} className="mb-6" />
          <div>
            <h5 className="text-2xl font-black uppercase italic tracking-tighter mb-4">Łączny Cash Flow</h5>
            <div className="text-5xl font-black italic tracking-tighter mb-2">
              {data.length > 0
                ? (data[data.length - 1].cash / 1000).toFixed(1) + 'k'
                : '—'}
            </div>
            <div className="text-[10px] font-black text-indigo-200 uppercase tracking-widest italic">Suma narastająca 6M (PLN)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
