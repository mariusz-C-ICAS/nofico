/**
 * Data: 2026-05-14
 * Ścieżka: /src/modules/esg/EsgModule.tsx
 * Opis: Moduł ESG — Środowisko, Społeczna, Ład Korporacyjny, Raport CSRD.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Leaf, Users, ShieldCheck, FileText, TrendingUp, TrendingDown,
  Zap, Car, Trash2, Heart, BookOpen, Award, AlertCircle,
  Download, RefreshCw, CheckCircle, XCircle, Minus, Globe
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

// --- TYPES ---
type Tab = 'overview' | 'env' | 'social' | 'gov' | 'csrd';

// --- MOCK DATA ---
const co2Data = [
  { month: 'Sty', travel: 12.4, energy: 28.1, fleet: 8.7 },
  { month: 'Lut', travel: 10.2, energy: 26.8, fleet: 9.1 },
  { month: 'Mar', travel: 14.1, energy: 25.4, fleet: 8.3 },
  { month: 'Kwi', travel: 11.8, energy: 24.2, fleet: 7.9 },
  { month: 'Maj', travel: 9.6, energy: 23.1, fleet: 7.4 },
];

const energyData = [
  { month: 'Sty', total: 48200, renewable: 12400 },
  { month: 'Lut', total: 45600, renewable: 14200 },
  { month: 'Mar', total: 47100, renewable: 16800 },
  { month: 'Kwi', total: 44800, renewable: 18600 },
  { month: 'Maj', total: 43200, renewable: 21000 },
];

const genderData = [
  { name: 'Kobiety', value: 42, color: '#8b5cf6' },
  { name: 'Mężczyźni', value: 58, color: '#6366f1' },
];

const ageData = [
  { range: '18-25', count: 6 },
  { range: '26-35', count: 18 },
  { range: '36-45', count: 14 },
  { range: '46-55', count: 10 },
  { range: '55+', count: 4 },
];

const esgScores = { E: 78, S: 85, G: 94, total: 86 };
const industryBenchmark = { E: 71, S: 78, G: 82, total: 77 };

// --- HELPERS ---
const ScoreRing = ({ score, label, color }: { score: number; label: string; color: string }) => (
  <div className="flex flex-col items-center gap-2">
    <div className="relative w-20 h-20">
      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="32" fill="none" stroke="#1e293b" strokeWidth="8" />
        <circle
          cx="40" cy="40" r="32" fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${(score / 100) * 201} 201`}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-white font-black text-lg">{score}</span>
    </div>
    <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">{label}</span>
  </div>
);

const StatusBadge = ({ status }: { status: 'ok' | 'warn' | 'none' }) => {
  const map = {
    ok: { icon: CheckCircle, text: 'Aktywne', cls: 'text-emerald-400' },
    warn: { icon: AlertCircle, text: 'Wymaga uwagi', cls: 'text-amber-400' },
    none: { icon: XCircle, text: 'Brak', cls: 'text-rose-400' },
  };
  const { icon: Icon, text, cls } = map[status];
  return (
    <span className={`flex items-center gap-1 text-xs font-semibold ${cls}`}>
      <Icon className="w-3.5 h-3.5" /> {text}
    </span>
  );
};

// --- TAB CONTENT COMPONENTS ---
const OverviewTab = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      <div className="bg-slate-900 rounded-[1.5rem] border border-white/5 p-6 flex flex-col items-center gap-2 md:col-span-1">
        <ScoreRing score={esgScores.total} label="ESG Total" color="#6366f1" />
        <p className="text-slate-500 text-[10px] text-center">Benchmark: {industryBenchmark.total}</p>
      </div>
      <div className="bg-slate-900 rounded-[1.5rem] border border-emerald-500/20 p-6 flex flex-col items-center gap-2">
        <ScoreRing score={esgScores.E} label="Środowisko" color="#10b981" />
        <p className="text-slate-500 text-[10px]">Branża: {industryBenchmark.E}</p>
      </div>
      <div className="bg-slate-900 rounded-[1.5rem] border border-violet-500/20 p-6 flex flex-col items-center gap-2">
        <ScoreRing score={esgScores.S} label="Społeczna" color="#8b5cf6" />
        <p className="text-slate-500 text-[10px]">Branża: {industryBenchmark.S}</p>
      </div>
      <div className="bg-slate-900 rounded-[1.5rem] border border-indigo-500/20 p-6 flex flex-col items-center gap-2">
        <ScoreRing score={esgScores.G} label="Ład Korp." color="#6366f1" />
        <p className="text-slate-500 text-[10px]">Branża: {industryBenchmark.G}</p>
      </div>
    </div>
    <div className="bg-slate-900 rounded-[1.5rem] border border-white/5 p-6">
      <h3 className="text-white font-black uppercase italic tracking-tighter mb-4">Porównanie z Benchmarkiem Branżowym</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={[
          { name: 'Środowisko (E)', firma: esgScores.E, branża: industryBenchmark.E },
          { name: 'Społeczna (S)', firma: esgScores.S, branża: industryBenchmark.S },
          { name: 'Ład (G)', firma: esgScores.G, branża: industryBenchmark.G },
        ]} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} width={110} />
          <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '0.75rem', color: '#e2e8f0' }} />
          <Bar dataKey="firma" fill="#6366f1" radius={[0, 4, 4, 0]} name="C-ICAS" />
          <Bar dataKey="branża" fill="#334155" radius={[0, 4, 4, 0]} name="Branża" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const EnvTab = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[
        { label: 'Ślad węglowy (MTD)', value: '49.1 t CO₂', trend: '-8.3%', icon: Leaf, color: 'emerald' },
        { label: 'Zużycie energii', value: '43 200 kWh', trend: '-10.4%', icon: Zap, color: 'amber' },
        { label: 'Udział OZE', value: '48.6%', trend: '+12.1%', icon: Globe, color: 'green' },
      ].map(m => (
        <div key={m.label} className="bg-slate-900 rounded-[1.5rem] border border-white/5 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">{m.label}</span>
            <div className="bg-slate-800 p-1.5 rounded-lg"><m.icon className="w-4 h-4 text-emerald-400" /></div>
          </div>
          <p className="text-2xl font-black text-white tracking-tighter">{m.value}</p>
          <p className="text-emerald-400 text-xs font-bold mt-1">{m.trend} vs poprzedni miesiąc</p>
        </div>
      ))}
    </div>

    <div className="bg-slate-900 rounded-[1.5rem] border border-white/5 p-6">
      <h3 className="text-white font-black uppercase italic tracking-tighter mb-4">Emisja CO₂ wg Źródła (tony/miesiąc)</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={co2Data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '0.75rem', color: '#e2e8f0' }} />
          <Bar dataKey="travel" fill="#6366f1" radius={[4, 4, 0, 0]} name="Podróże" stackId="a" />
          <Bar dataKey="energy" fill="#8b5cf6" radius={[0, 0, 0, 0]} name="Energia" stackId="a" />
          <Bar dataKey="fleet" fill="#a78bfa" radius={[4, 4, 0, 0]} name="Flota" stackId="a" />
        </BarChart>
      </ResponsiveContainer>
    </div>

    <div className="bg-slate-900 rounded-[1.5rem] border border-white/5 p-6">
      <h3 className="text-white font-black uppercase italic tracking-tighter mb-4">Energia: Łącznie vs OZE (kWh)</h3>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={energyData}>
          <defs>
            <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="renewGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
          <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '0.75rem', color: '#e2e8f0' }} />
          <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} fill="url(#totalGrad)" name="Łącznie" />
          <Area type="monotone" dataKey="renewable" stroke="#10b981" strokeWidth={2} fill="url(#renewGrad)" name="OZE" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const SocialTab = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-slate-900 rounded-[1.5rem] border border-white/5 p-6">
        <h3 className="text-white font-black uppercase italic tracking-tighter mb-4">Różnorodność — Płeć</h3>
        <div className="flex items-center gap-6">
          <ResponsiveContainer width={140} height={140}>
            <PieChart>
              <Pie data={genderData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={4} dataKey="value">
                {genderData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-3">
            {genderData.map(g => (
              <div key={g.name}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: g.color }} />
                  <span className="text-slate-400 text-sm">{g.name}</span>
                </div>
                <p className="text-2xl font-black text-white tracking-tighter ml-4">{g.value}%</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-slate-900 rounded-[1.5rem] border border-white/5 p-6">
        <h3 className="text-white font-black uppercase italic tracking-tighter mb-4">Rozkład Wiekowy</h3>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={ageData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="range" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '0.75rem', color: '#e2e8f0' }} />
            <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Pracownicy" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[
        { label: 'Wellbeing Score', value: '7.8 / 10', icon: Heart, color: 'rose' },
        { label: 'Szkolenia / os.', value: '24 godz / rok', icon: BookOpen, color: 'violet' },
        { label: 'Wskaźnik wypadków', value: '0.4 / 100 FTE', icon: AlertCircle, color: 'amber' },
        { label: 'Zaangażowanie CSR', value: '3 projekty', icon: Award, color: 'emerald' },
      ].map(m => (
        <div key={m.label} className="bg-slate-900 rounded-[1.5rem] border border-white/5 p-5">
          <m.icon className="w-5 h-5 text-violet-400 mb-3" />
          <p className="text-xl font-black text-white tracking-tighter">{m.value}</p>
          <p className="text-slate-500 text-xs mt-1 font-semibold uppercase tracking-wide">{m.label}</p>
        </div>
      ))}
    </div>
  </div>
);

const GovTab = () => (
  <div className="space-y-4">
    {[
      { label: 'Compliance Score', value: '94 / 100', status: 'ok' as const, desc: 'Audyt wewnętrzny Q1 2026' },
      { label: 'Polityka Antykorupcyjna', value: 'Wdrożona', status: 'ok' as const, desc: 'Aktualizacja: 2026-01-15' },
      { label: 'Kanał Sygnalisty (Whistleblower)', value: 'Aktywny', status: 'ok' as const, desc: '3 zgłoszenia YTD — wszystkie rozpatrzone' },
      { label: 'Różnorodność Zarządu', value: '33% Kobiet', status: 'ok' as const, desc: '2 z 6 miejsc w zarządzie' },
      { label: 'Polityka RODO/GDPR', value: 'Wymaga aktualizacji', status: 'warn' as const, desc: 'Termin: 31 maja 2026' },
      { label: 'Raportowanie ESG', value: 'W trakcie wdrożenia', status: 'warn' as const, desc: 'Cel: Q3 2026 — pełna zgodność CSRD' },
    ].map((item, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: i * 0.05 }}
        className="bg-slate-900 rounded-[1.25rem] border border-white/5 p-5 flex items-center justify-between"
      >
        <div>
          <p className="text-white font-bold text-sm">{item.label}</p>
          <p className="text-slate-500 text-xs mt-0.5">{item.desc}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <p className="text-slate-200 text-sm font-black">{item.value}</p>
          <StatusBadge status={item.status} />
        </div>
      </motion.div>
    ))}
  </div>
);

const CsrdTab = () => (
  <div className="space-y-6">
    <div className="bg-slate-900 rounded-[1.5rem] border border-indigo-500/20 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-indigo-500/20 p-2 rounded-xl"><FileText className="w-5 h-5 text-indigo-400" /></div>
        <div>
          <h3 className="text-white font-black uppercase italic tracking-tighter">Auto-Generator Raportu CSRD/ESRS</h3>
          <p className="text-indigo-400 text-xs">Powered by Gemini AI — placeholder</p>
        </div>
      </div>
      <p className="text-slate-400 text-sm mb-6 leading-relaxed">
        System automatycznie zbiera dane z modułów ESG, Finance, HR i Compliance,
        a następnie generuje raport zgodny ze standardami ESRS (European Sustainability Reporting Standards)
        wymaganymi przez dyrektywę CSRD.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {[
          { standard: 'ESRS 2', desc: 'Informacje ogólne', status: 'ok' as const },
          { standard: 'ESRS E1', desc: 'Zmiany klimatu', status: 'ok' as const },
          { standard: 'ESRS S1', desc: 'Siła robocza', status: 'ok' as const },
          { standard: 'ESRS G1', desc: 'Ład korporacyjny', status: 'ok' as const },
          { standard: 'ESRS E2', desc: 'Zanieczyszczenie', status: 'warn' as const },
          { standard: 'ESRS S2', desc: 'Łańcuch wartości', status: 'warn' as const },
        ].map(s => (
          <div key={s.standard} className="bg-slate-800/60 rounded-xl p-3 border border-white/5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-indigo-400 font-bold text-xs">{s.standard}</span>
              <StatusBadge status={s.status} />
            </div>
            <p className="text-slate-400 text-[11px]">{s.desc}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors">
          <RefreshCw className="w-4 h-4" /> Generuj Raport
        </button>
        <button className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm px-5 py-2.5 rounded-xl transition-colors border border-white/10">
          <Download className="w-4 h-4" /> Pobierz PDF
        </button>
      </div>
    </div>
  </div>
);

// --- MAIN ---
const TABS: { key: Tab; label: string; icon: React.FC<any> }[] = [
  { key: 'overview', label: 'Przegląd', icon: TrendingUp },
  { key: 'env', label: 'Środowisko (E)', icon: Leaf },
  { key: 'social', label: 'Społeczna (S)', icon: Users },
  { key: 'gov', label: 'Ład Korporacyjny (G)', icon: ShieldCheck },
  { key: 'csrd', label: 'Raport CSRD', icon: FileText },
];

export default function EsgModule() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  return (
    <div className="max-w-[1200px] mx-auto flex flex-col gap-6 py-8 px-4">
      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900 rounded-[2rem] p-8 border border-white/5 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="flex items-center gap-4">
          <div className="bg-emerald-500/15 p-3 rounded-2xl">
            <Leaf className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">ESG Reporting</h1>
            <p className="text-slate-400 text-sm">Environmental · Social · Governance — Zgodność CSRD 2026</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-4xl font-black text-white tracking-tighter">{esgScores.total}</p>
            <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest">ESG Score</p>
          </div>
        </div>
      </motion.div>

      {/* TABS */}
      <div className="flex gap-2 bg-slate-900 rounded-[1.5rem] p-2 border border-white/5 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wide whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'env' && <EnvTab />}
          {activeTab === 'social' && <SocialTab />}
          {activeTab === 'gov' && <GovTab />}
          {activeTab === 'csrd' && <CsrdTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
