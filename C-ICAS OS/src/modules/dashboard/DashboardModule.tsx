/**
 * Data: 2026-05-14
 * Ścieżka: /src/modules/dashboard/DashboardModule.tsx
 * Opis: Rozszerzony dashboard executive z KPI, wykresami, aktywnościami i AI Copilotem.
 */
import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp, Users, AlertTriangle, ShieldCheck, Bot,
  ArrowUpRight, ArrowDownRight, Calendar, Clock, Send,
  DollarSign, Activity, ChevronRight, Bell
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { useAuth } from '../../shared/hooks/AuthContext';

// --- MOCK DATA ---
const revenueData = [
  { month: 'Gru', revenue: 142000, expenses: 98000 },
  { month: 'Sty', revenue: 158000, expenses: 104000 },
  { month: 'Lut', revenue: 134000, expenses: 92000 },
  { month: 'Mar', revenue: 171000, expenses: 115000 },
  { month: 'Kwi', revenue: 189000, expenses: 121000 },
  { month: 'Maj', revenue: 204000, expenses: 128000 },
];

const deptData = [
  { name: 'IT', value: 12, color: '#6366f1' },
  { name: 'Finance', value: 8, color: '#8b5cf6' },
  { name: 'HR', value: 6, color: '#a78bfa' },
  { name: 'Sales', value: 15, color: '#c4b5fd' },
  { name: 'Operations', value: 11, color: '#ddd6fe' },
];

const activities = [
  { id: 1, type: 'invoice', text: 'Faktura #INV-2024 wystawiona dla Acme Corp', time: '5 min', color: 'indigo' },
  { id: 2, type: 'hr', text: 'Nowy pracownik: Anna Kowalska dołączyła do działu IT', time: '23 min', color: 'violet' },
  { id: 3, type: 'compliance', text: 'Audyt GDPR zakończony — wynik: 94/100', time: '1 godz', color: 'green' },
  { id: 4, type: 'alert', text: 'Incident BHP #BHP-07 zgłoszony w magazynie', time: '2 godz', color: 'red' },
  { id: 5, type: 'contract', text: 'Kontrakt z XYZ Ltd podpisany przez obie strony', time: '3 godz', color: 'blue' },
  { id: 6, type: 'finance', text: 'Przelew przychodzący: 48 200 PLN od Beta SA', time: '4 godz', color: 'emerald' },
  { id: 7, type: 'ai', text: 'AI wykryło anomalię w wydatkach działu Sales (+34%)', time: '5 godz', color: 'amber' },
  { id: 8, type: 'training', text: 'Szkolenie BHP Q2 ukończone przez 18 pracowników', time: '6 godz', color: 'purple' },
];

const deadlines = [
  { label: 'JPK_VAT za kwiecień', date: '25 maja 2026', priority: 'high', icon: DollarSign },
  { label: 'Szkolenie BHP — dział IT', date: '28 maja 2026', priority: 'medium', icon: ShieldCheck },
  { label: 'Odnowienie kontraktu — Delta Sp. z o.o.', date: '1 czerwca 2026', priority: 'high', icon: Activity },
  { label: 'Audyt compliance ISO 27001', date: '10 czerwca 2026', priority: 'low', icon: ShieldCheck },
];

const kpis = [
  {
    label: 'Przychód MTD', value: '204 000 PLN', trend: '+8.2%', up: true,
    icon: TrendingUp, border: 'border-indigo-500', accent: 'text-indigo-400', bg: 'bg-indigo-500/10'
  },
  {
    label: 'Aktywni pracownicy', value: '52', trend: '+2', up: true,
    icon: Users, border: 'border-violet-500', accent: 'text-violet-400', bg: 'bg-violet-500/10'
  },
  {
    label: 'Otwarte incydenty', value: '3', trend: '-1', up: true,
    icon: AlertTriangle, border: 'border-amber-500', accent: 'text-amber-400', bg: 'bg-amber-500/10'
  },
  {
    label: 'Compliance Score', value: '94 / 100', trend: '+6', up: true,
    icon: ShieldCheck, border: 'border-emerald-500', accent: 'text-emerald-400', bg: 'bg-emerald-500/10'
  },
  {
    label: 'Alerty AI', value: '7', trend: '+3', up: false,
    icon: Bot, border: 'border-rose-500', accent: 'text-rose-400', bg: 'bg-rose-500/10'
  },
];

// --- SUBCOMPONENTS ---
const KpiCard = ({ kpi, index }: { kpi: typeof kpis[0]; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.07 }}
    className={`bg-slate-900 rounded-[1.5rem] border ${kpi.border} border-opacity-40 p-6 flex flex-col gap-3`}
  >
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{kpi.label}</span>
      <div className={`${kpi.bg} p-2 rounded-xl`}>
        <kpi.icon className={`w-4 h-4 ${kpi.accent}`} />
      </div>
    </div>
    <p className="text-2xl font-black text-white tracking-tighter">{kpi.value}</p>
    <div className="flex items-center gap-1">
      {kpi.up
        ? <ArrowUpRight className="w-3 h-3 text-emerald-400" />
        : <ArrowDownRight className="w-3 h-3 text-rose-400" />}
      <span className={`text-xs font-bold ${kpi.up ? 'text-emerald-400' : 'text-rose-400'}`}>{kpi.trend}</span>
      <span className="text-xs text-slate-500 ml-1">vs. poprzedni miesiąc</span>
    </div>
  </motion.div>
);

const priorityColor: Record<string, string> = {
  high: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

const activityColor: Record<string, string> = {
  indigo: 'bg-indigo-500', violet: 'bg-violet-500', green: 'bg-emerald-500',
  red: 'bg-rose-500', blue: 'bg-blue-500', emerald: 'bg-emerald-500',
  amber: 'bg-amber-500', purple: 'bg-purple-500',
};

// --- MAIN COMPONENT ---
export default function DashboardModule() {
  const { userData } = useAuth();
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { role: 'ai', text: 'Dzień dobry! Jak mogę pomóc? Zapytaj mnie o finanse, HR lub compliance.' },
  ]);

  const today = new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const userName = userData?.displayName?.split(' ')[0] ?? 'Użytkowniku';

  const sendMessage = () => {
    if (!chatInput.trim()) return;
    setChatMessages(prev => [
      ...prev,
      { role: 'user', text: chatInput },
      { role: 'ai', text: 'Analizuję dane... [AI Copilot — placeholder Gemini]' },
    ]);
    setChatInput('');
  };

  return (
    <div className="max-w-[1400px] mx-auto flex flex-col gap-8 py-8 px-4">

      {/* GREETING */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900 rounded-[2rem] p-8 border border-white/5 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />
        <p className="text-slate-400 text-sm font-semibold uppercase tracking-widest mb-2">{today}</p>
        <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter text-white">
          Dzień dobry, <span className="text-indigo-400">{userName}</span>!
        </h1>
        <p className="text-slate-400 mt-1">Oto Twój przegląd na dziś. Wszystkie systemy działają sprawnie.</p>
        <div className="flex items-center gap-2 mt-4">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-400 font-semibold">Wszystkie systemy online</span>
        </div>
      </motion.div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map((kpi, i) => <KpiCard key={kpi.label} kpi={kpi} index={i} />)}
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue vs Expenses */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 bg-slate-900 rounded-[1.5rem] border border-white/5 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-white font-black uppercase italic tracking-tighter text-lg">Przychody vs Koszty</h2>
              <p className="text-slate-500 text-xs mt-0.5">Ostatnie 6 miesięcy (PLN)</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-slate-400"><span className="w-3 h-1 rounded bg-indigo-500 inline-block" />Przychód</span>
              <span className="flex items-center gap-1.5 text-slate-400"><span className="w-3 h-1 rounded bg-rose-500 inline-block" />Koszty</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '0.75rem', color: '#e2e8f0' }}
                formatter={(val: number) => [`${val.toLocaleString('pl-PL')} PLN`]}
              />
              <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#revGrad)" name="Przychód" />
              <Area type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={2} fill="url(#expGrad)" name="Koszty" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Employee Distribution */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-slate-900 rounded-[1.5rem] border border-white/5 p-6"
        >
          <h2 className="text-white font-black uppercase italic tracking-tighter text-lg mb-1">Pracownicy</h2>
          <p className="text-slate-500 text-xs mb-4">Rozkład wg działu</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={deptData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                {deptData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '0.75rem', color: '#e2e8f0' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {deptData.map(d => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                  {d.name}
                </span>
                <span className="text-white font-bold">{d.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* BOTTOM ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Activity Feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-slate-900 rounded-[1.5rem] border border-white/5 p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-black uppercase italic tracking-tighter">Aktywności</h2>
            <Bell className="w-4 h-4 text-slate-500" />
          </div>
          <div className="space-y-3">
            {activities.map(a => (
              <div key={a.id} className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${activityColor[a.color]}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-slate-300 text-xs leading-relaxed">{a.text}</p>
                  <p className="text-slate-600 text-[10px] mt-0.5">{a.time} temu</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Deadlines */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-slate-900 rounded-[1.5rem] border border-white/5 p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-black uppercase italic tracking-tighter">Nadchodzące Terminy</h2>
            <Calendar className="w-4 h-4 text-slate-500" />
          </div>
          <div className="space-y-3">
            {deadlines.map((d, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-white/5">
                <div className="bg-slate-700/50 p-2 rounded-lg flex-shrink-0">
                  <d.icon className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 text-xs font-semibold leading-tight">{d.label}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <p className="text-slate-500 text-[10px]">{d.date}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${priorityColor[d.priority]}`}>
                  {d.priority === 'high' ? 'PILNE' : d.priority === 'medium' ? 'WAŻNE' : 'OK'}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* AI Copilot Chat */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-slate-900 rounded-[1.5rem] border border-indigo-500/20 p-6 flex flex-col"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="bg-indigo-500/20 p-2 rounded-xl">
              <Bot className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-white font-black uppercase italic tracking-tighter leading-none">AI Copilot</h2>
              <p className="text-indigo-400 text-[10px] font-semibold">Powered by Gemini</p>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto max-h-52 mb-4">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] text-xs px-3 py-2 rounded-xl leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-sm'
                    : 'bg-slate-800 text-slate-300 rounded-bl-sm border border-white/5'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Zapytaj o dane..."
              className="flex-1 bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 transition-colors"
            />
            <button
              onClick={sendMessage}
              className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-xl transition-colors flex-shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
