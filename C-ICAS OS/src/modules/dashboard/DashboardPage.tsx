/**
 * Data: 2026-05-14
 * Zmiany: Kompletny executive dashboard z KPI, wykresami, alertami i AI widgetem.
 * Ścieżka: /src/modules/dashboard/DashboardPage.tsx
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, Users, ShieldCheck, AlertTriangle,
  Clock, Landmark, BarChart3, ArrowRight, Zap, CheckCircle2,
  Calendar, FileText, BrainCircuit, Bell, Plus
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { useTenant } from '../../core/auth/TenantContext';
import { useAuth } from '../../shared/hooks/AuthContext';

const revenueData = [
  { month: 'Sty', przychody: 285000, koszty: 198000 },
  { month: 'Lut', przychody: 312000, koszty: 210000 },
  { month: 'Mar', przychody: 298000, koszty: 195000 },
  { month: 'Kwi', przychody: 345000, koszty: 225000 },
  { month: 'Maj', przychody: 378000, koszty: 240000 },
  { month: 'Cze', przychody: 362000, koszty: 235000 },
];

const departmentData = [
  { name: 'Sprzedaż', value: 12, color: '#6366f1' },
  { name: 'IT', value: 8, color: '#10b981' },
  { name: 'HR', value: 5, color: '#f59e0b' },
  { name: 'Finanse', value: 6, color: '#3b82f6' },
  { name: 'Operacje', value: 17, color: '#8b5cf6' },
];

const kpiCards = [
  { label: 'Przychód MTD', value: '378 450 zł', change: '+12.4%', up: true, icon: TrendingUp, color: 'emerald', path: '/finance' },
  { label: 'Pracownicy', value: '48 osób', change: '+2 w maju', up: true, icon: Users, color: 'indigo', path: '/hr' },
  { label: 'Compliance Score', value: '87%', change: '+3% MoM', up: true, icon: ShieldCheck, color: 'emerald', path: '/compliance' },
  { label: 'Otwarte Incydenty', value: '3', change: '-2 zamknięte', up: false, icon: AlertTriangle, color: 'rose', path: '/compliance' },
  { label: 'Czas Pracy MTD', value: '7,842 h', change: 'Zalogowanych', up: true, icon: Clock, color: 'indigo', path: '/time' },
];

const recentActivity = [
  { icon: FileText, text: 'Faktura FV/2026/05/042 wystawiona — Kontrahent XYZ', time: '5 min temu', color: 'text-emerald-500' },
  { icon: Users, text: 'Nowy pracownik: Karolina Wiśniewska — dołączyła do HR', time: '1h temu', color: 'text-indigo-500' },
  { icon: ShieldCheck, text: 'Audyt NIS2 zaplanowany na 15.05.2026', time: '2h temu', color: 'text-amber-500' },
  { icon: AlertTriangle, text: 'Incydent INC-003: Polityka haseł wymaga aktualizacji', time: '3h temu', color: 'text-rose-500' },
  { icon: CheckCircle2, text: 'JPK-VAT za kwiecień — przesłany pomyślnie', time: '1d temu', color: 'text-emerald-500' },
  { icon: Zap, text: 'AI Copilot: wykryto anomalię kosztową w MPK-204', time: '1d temu', color: 'text-purple-500' },
];

const deadlines = [
  { date: '15 Maj', label: 'Audyt NIS2', type: 'Compliance', urgent: true },
  { date: '20 Maj', label: 'JPK-VAT (kwiecień)', type: 'Finanse', urgent: true },
  { date: '22 Maj', label: 'Szkolenie BHP — ergonomia', type: 'HR', urgent: false },
  { date: '31 Maj', label: 'Przegląd umów — 3 wygasające', type: 'Prawne', urgent: false },
  { date: '01 Cze', label: 'Przegląd techniczny floty', type: 'Logistyka', urgent: false },
];

export default function DashboardPage() {
  const { currentTenant } = useTenant();
  const { userData } = useAuth();
  const [aiQuery, setAiQuery] = useState('');

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Dzień dobry' : hour < 18 ? 'Dzień dobry' : 'Dobry wieczór';
  const firstName = userData?.displayName?.split(' ')[0] ?? 'Użytkowniku';

  return (
    <div className="max-w-[1600px] mx-auto p-8 space-y-8 animate-in fade-in duration-500">

      {/* Top greeting */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-zinc-100 tracking-tighter">
            {greeting}, <span className="text-indigo-400 italic">{firstName}</span>!
          </h1>
          <p className="text-zinc-500 text-sm mt-1 font-medium">
            {currentTenant?.name} · {new Date().toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-5 py-3 rounded-xl transition-colors text-xs font-bold uppercase tracking-widest">
            <Bell size={15} /> Powiadomienia <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">3</span>
          </button>
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-xl transition-colors text-xs font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/20">
            <Plus size={15} /> Szybka akcja
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpiCards.map((kpi, i) => (
          <Link to={kpi.path} key={i}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all group"
          >
            <div className={`flex items-center justify-between mb-4`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${kpi.color === 'emerald' ? 'bg-emerald-500/10' : kpi.color === 'rose' ? 'bg-rose-500/10' : 'bg-indigo-500/10'}`}>
                <kpi.icon size={18} className={kpi.color === 'emerald' ? 'text-emerald-400' : kpi.color === 'rose' ? 'text-rose-400' : 'text-indigo-400'} />
              </div>
              <ArrowRight size={14} className="text-zinc-700 group-hover:text-zinc-400 transition-colors" />
            </div>
            <div className="text-xl font-black text-zinc-100 tracking-tighter">{kpi.value}</div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-0.5">{kpi.label}</div>
            <div className={`text-[10px] font-bold mt-2 ${kpi.up ? 'text-emerald-400' : 'text-rose-400'}`}>
              {kpi.up ? '↑' : '↓'} {kpi.change}
            </div>
          </Link>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-sm font-black text-zinc-100 uppercase tracking-widest">Przychody vs Koszty</h3>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Ostatnie 6 miesięcy</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-indigo-500" /><span className="text-[10px] text-zinc-400 font-bold">Przychody</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-500" /><span className="text-[10px] text-zinc-400 font-bold">Koszty</span></div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="grad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#71717a' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 12, fontSize: 11 }}
                formatter={(v: any) => [`${Number(v).toLocaleString('pl-PL')} zł`]}
              />
              <Area type="monotone" dataKey="przychody" stroke="#6366f1" strokeWidth={2} fill="url(#grad1)" name="Przychody" />
              <Area type="monotone" dataKey="koszty" stroke="#f43f5e" strokeWidth={2} fill="url(#grad2)" name="Koszty" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Department pie */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-sm font-black text-zinc-100 uppercase tracking-widest mb-2">Zatrudnienie wg Działów</h3>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-6">48 pracowników łącznie</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={departmentData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                {departmentData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 12, fontSize: 11 }} formatter={(v) => [`${v} osób`]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {departmentData.map((d, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-[11px] text-zinc-400 font-medium">{d.name}</span>
                </div>
                <span className="text-[11px] text-zinc-300 font-bold">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity + Deadlines + AI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-sm font-black text-zinc-100 uppercase tracking-widest mb-6">Ostatnia Aktywność</h3>
          <div className="space-y-4">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  <item.icon size={14} className={item.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-zinc-300 leading-snug">{item.text}</p>
                  <span className="text-[9px] text-zinc-600 uppercase tracking-widest">{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Deadlines */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-sm font-black text-zinc-100 uppercase tracking-widest mb-6">Nadchodzące Terminy</h3>
          <div className="space-y-3">
            {deadlines.map((d, i) => (
              <div key={i} className={`flex items-center gap-4 p-3 rounded-xl border ${d.urgent ? 'bg-rose-500/5 border-rose-500/20' : 'bg-zinc-800/50 border-zinc-800'}`}>
                <div className={`text-center w-10 flex-shrink-0 ${d.urgent ? 'text-rose-400' : 'text-zinc-400'}`}>
                  <div className="text-[8px] font-black uppercase">{d.date.split(' ')[1]}</div>
                  <div className="text-base font-black">{d.date.split(' ')[0]}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-[11px] font-bold truncate ${d.urgent ? 'text-zinc-100' : 'text-zinc-300'}`}>{d.label}</div>
                  <div className={`text-[9px] uppercase tracking-widest ${d.urgent ? 'text-rose-400' : 'text-zinc-500'}`}>{d.type}</div>
                </div>
                {d.urgent && <AlertTriangle size={14} className="text-rose-400 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </div>

        {/* AI Copilot mini */}
        <div className="bg-gradient-to-br from-indigo-950 to-purple-950 border border-indigo-900/50 rounded-2xl p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-indigo-600/30 p-2.5 rounded-xl">
              <BrainCircuit size={18} className="text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-zinc-100 uppercase tracking-widest">AI Copilot</h3>
              <p className="text-[9px] text-indigo-400 uppercase tracking-widest">Zasilany Google Gemini</p>
            </div>
          </div>

          <div className="flex-1 space-y-3 mb-6">
            {[
              { q: false, text: 'Hej! Zauważyłem anomalię w kosztach MPK-204 — wzrost o 34% MoM. Chcesz szczegóły?' },
              { q: true, text: 'Tak, pokaż analizę.' },
              { q: false, text: 'Główny driver to delegacje (↑180%) i materiały (↑22%). Sugeruję budżetową rewizję przed Q3.' },
            ].map((msg, i) => (
              <div key={i} className={`flex ${msg.q ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-2.5 rounded-xl text-[11px] leading-relaxed ${msg.q ? 'bg-indigo-600 text-white' : 'bg-zinc-800/80 text-zinc-300 border border-zinc-700/50'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              value={aiQuery}
              onChange={e => setAiQuery(e.target.value)}
              placeholder="Zapytaj AI..."
              className="flex-1 bg-zinc-900/60 border border-zinc-700 rounded-xl px-4 py-2.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
            />
            <Link to="/ai-copilot"
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl transition-colors"
            >
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>

      {/* Quick module access */}
      <div>
        <h3 className="text-sm font-black text-zinc-500 uppercase tracking-widest mb-4">Szybki Dostęp</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: 'Nowa Faktura', icon: FileText, path: '/finance', color: 'text-indigo-400' },
            { label: 'Dodaj Pracownika', icon: Users, path: '/hr', color: 'text-emerald-400' },
            { label: 'Incydent BHP', icon: AlertTriangle, path: '/compliance', color: 'text-rose-400' },
            { label: 'Wniosek Urlopowy', icon: Calendar, path: '/hr', color: 'text-amber-400' },
            { label: 'Raport Finansowy', icon: BarChart3, path: '/controlling', color: 'text-blue-400' },
            { label: 'Zadzwoń do AI', icon: BrainCircuit, path: '/ai-copilot', color: 'text-purple-400' },
          ].map((q, i) => (
            <Link to={q.path} key={i}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col items-center gap-2 hover:border-zinc-700 hover:bg-zinc-800 transition-all text-center group"
            >
              <q.icon size={20} className={q.color} />
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wide group-hover:text-zinc-200 transition-colors">{q.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
