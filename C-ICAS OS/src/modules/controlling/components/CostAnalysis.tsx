/**
 * Data: 2026-05-14
 * Ścieżka: /src/modules/controlling/components/CostAnalysis.tsx
 */
import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle, TrendingUp, TrendingDown,
  ChevronRight, Info
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const costCategories = [
  { name: 'Wynagrodzenia', value: 245000, pct: 48.2, budget: 240000 },
  { name: 'Uslugi Zewnetrzne', value: 87400, pct: 17.2, budget: 82000 },
  { name: 'IT / Licencje', value: 54200, pct: 10.7, budget: 50000 },
  { name: 'Marketing', value: 38100, pct: 7.5, budget: 32000 },
  { name: 'Najem / Biuro', value: 42000, pct: 8.3, budget: 42000 },
  { name: 'Inne', value: 42100, pct: 8.3, budget: 45000 },
];

const monthlyTrend = [
  { month: 'Sty', total: 468000, personnel: 238000, services: 81000, other: 149000 },
  { month: 'Lut', total: 481000, personnel: 241000, services: 84000, other: 156000 },
  { month: 'Mar', total: 494000, personnel: 243000, services: 86000, other: 165000 },
  { month: 'Kwi', total: 502000, personnel: 244000, services: 87000, other: 171000 },
  { month: 'Maj', total: 508800, personnel: 245000, services: 87400, other: 176400 },
];

const topDrivers = [
  { name: 'Outsourcing IT — Accenture', amount: 34200, category: 'Uslugi Zewnetrzne', mom: +12.4, anomaly: true },
  { name: 'Wynagrodzenia — Dzial Handlowy', amount: 82000, category: 'Wynagrodzenia', mom: +2.1, anomaly: false },
  { name: 'Google Workspace / MS365', amount: 8400, category: 'IT / Licencje', mom: +0.0, anomaly: false },
  { name: 'Facebook Ads Q2', amount: 18100, category: 'Marketing', mom: +24.7, anomaly: true },
  { name: 'AWS / Azure Cloud', amount: 22800, category: 'IT / Licencje', mom: +8.3, anomaly: false },
  { name: 'Najem Biura Warszawa', amount: 28000, category: 'Najem / Biuro', mom: +0.0, anomaly: false },
];

const mpkDetails: Record<string, { label: string; items: { name: string; amount: number }[] }> = {
  'Wynagrodzenia': {
    label: 'Wynagrodzenia — Szczegoly',
    items: [
      { name: 'Dzial IT (8 os.)', amount: 82000 },
      { name: 'Dzial Handlowy (5 os.)', amount: 82000 },
      { name: 'Administracja (3 os.)', amount: 48000 },
      { name: 'Marketing (2 os.)', amount: 33000 },
    ],
  },
  'Uslugi Zewnetrzne': {
    label: 'Uslugi Zewnetrzne — Szczegoly',
    items: [
      { name: 'Outsourcing IT', amount: 34200 },
      { name: 'Ksiegowosc', amount: 12400 },
      { name: 'Prawne', amount: 18600 },
      { name: 'Inne', amount: 22200 },
    ],
  },
};

const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, pct, name }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (pct < 8) return null;
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight="900">
      {pct.toFixed(0)}%
    </text>
  );
};

export default function CostAnalysis() {
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  const totalCosts = costCategories.reduce((s, c) => s + c.value, 0);
  const totalBudget = costCategories.reduce((s, c) => s + c.budget, 0);
  const overBudget = totalCosts > totalBudget;

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Koszty Razem (Maj)', value: `${totalCosts.toLocaleString('pl-PL')} PLN`, sub: overBudget ? 'Przekroczenie budzetu' : 'W ramach budzetu', up: !overBudget },
          { label: 'Budzet Miesieczny', value: `${totalBudget.toLocaleString('pl-PL')} PLN`, sub: 'Zatwierdzone', up: true },
          { label: 'Odchylenie', value: `${overBudget ? '+' : ''}${(totalCosts - totalBudget).toLocaleString('pl-PL')} PLN`, sub: `${(((totalCosts - totalBudget) / totalBudget) * 100).toFixed(1)}%`, up: !overBudget },
        ].map(m => (
          <div key={m.label} className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{m.label}</div>
            <div className="text-2xl font-black text-slate-900 italic tracking-tighter">{m.value}</div>
            <div className={`text-[10px] font-bold uppercase mt-1 ${m.up ? 'text-emerald-500' : 'text-rose-500'}`}>{m.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Donut chart */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Struktura Kosztow</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={costCategories}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  dataKey="value"
                  labelLine={false}
                  label={<CustomPieLabel />}
                >
                  {costCategories.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [`${v.toLocaleString('pl-PL')} PLN`, 'Kwota']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {costCategories.map((c, i) => (
              <button
                key={c.name}
                onClick={() => setSelectedCat(selectedCat === c.name ? null : c.name)}
                className={`flex items-center gap-2 text-left p-2 rounded-xl transition-colors ${selectedCat === c.name ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i] }} />
                <span className="text-[10px] font-bold text-slate-600 truncate">{c.name}</span>
                <span className="text-[10px] font-black text-slate-400 ml-auto">{c.pct}%</span>
              </button>
            ))}
          </div>

          {selectedCat && mpkDetails[selectedCat] && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 bg-indigo-50 rounded-2xl p-4"
            >
              <div className="text-[10px] font-black text-indigo-700 uppercase tracking-widest mb-2">{mpkDetails[selectedCat].label}</div>
              {mpkDetails[selectedCat].items.map(it => (
                <div key={it.name} className="flex justify-between py-1">
                  <span className="text-[11px] text-slate-700">{it.name}</span>
                  <span className="text-[11px] font-bold text-slate-900">{it.amount.toLocaleString('pl-PL')} PLN</span>
                </div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Top drivers */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Glowne Pozycje Kosztowe</div>
          <div className="space-y-3">
            {topDrivers.map((d, i) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-2xl ${d.anomaly ? 'bg-rose-50 border border-rose-100' : 'bg-slate-50'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-black text-slate-800 truncate">{d.name}</span>
                    {d.anomaly && <AlertTriangle size={11} className="text-rose-500 shrink-0" />}
                  </div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{d.category}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[12px] font-black text-slate-900">{d.amount.toLocaleString('pl-PL')}</div>
                  <div className={`text-[9px] font-bold ${d.mom > 10 ? 'text-rose-600' : d.mom > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {d.mom > 0 ? '+' : ''}{d.mom.toFixed(1)}% m/m
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trend chart */}
      <div className="bg-slate-900 rounded-[3rem] p-8">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Trend Kosztow Miesiecznie — Sty–Maj 2026</div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 16, color: '#fff', fontSize: 11 }}
                formatter={(v: number) => [`${v.toLocaleString('pl-PL')} PLN`]}
              />
              <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1', r: 4 }} name="Razem" />
              <Line type="monotone" dataKey="personnel" stroke="#10b981" strokeWidth={2} dot={false} name="Wynagrodzenia" strokeDasharray="5 3" />
              <Line type="monotone" dataKey="services" stroke="#f59e0b" strokeWidth={2} dot={false} name="Uslugi" strokeDasharray="5 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-6 mt-4">
          {[
            { label: 'Razem', color: '#6366f1' },
            { label: 'Wynagrodzenia', color: '#10b981' },
            { label: 'Uslugi', color: '#f59e0b' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-2">
              <span className="w-4 h-0.5 inline-block" style={{ backgroundColor: l.color }} />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Anomaly alert banner */}
      <div className="bg-rose-50 border border-rose-100 rounded-[2.5rem] p-6 flex items-center gap-4">
        <div className="bg-rose-100 p-3 rounded-2xl">
          <AlertTriangle size={18} className="text-rose-600" />
        </div>
        <div>
          <div className="text-[11px] font-black text-rose-800 uppercase tracking-widest">Wykryte Anomalie Kosztowe</div>
          <div className="text-[11px] text-rose-600 mt-0.5">
            2 pozycje przekraczaja plan o ponad 20%: Outsourcing IT (+12.4%) i Facebook Ads (+24.7%). Wymaga weryfikacji.
          </div>
        </div>
      </div>
    </div>
  );
}
