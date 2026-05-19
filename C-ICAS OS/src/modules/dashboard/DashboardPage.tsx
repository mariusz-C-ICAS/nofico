/**
 * Data: 2026-05-17
 * Zmiany: Dual-theme (light/dark) — ergonomia premium.
 * Ścieżka: /src/modules/dashboard/DashboardPage.tsx
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PendingTasksWidget from './widgets/PendingTasksWidget';
import {
  TrendingUp, Users, ShieldCheck, AlertTriangle,
  Clock, BarChart3, ArrowRight, Zap, CheckCircle2,
  Calendar, FileText, BrainCircuit, Bell, Plus
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { useTenant } from '../../core/auth/TenantContext';
import { useAuth } from '../../shared/hooks/AuthContext';
import WorkflowStatsWidget from '../workflow/components/WorkflowStatsWidget';
import OnboardingChecklist from '../onboarding/OnboardingChecklist';

const revenueData = [
  { month: 'Sty', przychody: 285000, koszty: 198000 },
  { month: 'Lut', przychody: 312000, koszty: 210000 },
  { month: 'Mar', przychody: 298000, koszty: 195000 },
  { month: 'Kwi', przychody: 345000, koszty: 225000 },
  { month: 'Maj', przychody: 378000, koszty: 240000 },
  { month: 'Cze', przychody: 362000, koszty: 235000 },
];

// Shared card base class — responsive to theme
const card = 'bg-white dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/40 rounded-2xl';

export default function DashboardPage() {
  const { t } = useTranslation();
  const { currentTenant } = useTenant();
  const { userData, user } = useAuth();
  const [aiQuery, setAiQuery] = useState('');

  const hour = new Date().getHours();
  const greeting = hour < 18 ? t('dashboard.greeting_day') : t('dashboard.greeting_evening');
  const firstName = userData?.displayName?.split(' ')[0] ?? t('dashboard.fallback_user');

  const departmentData = [
    { name: t('dashboard.dept_sales'), value: 12, color: '#6366f1' },
    { name: t('dashboard.dept_it'), value: 8, color: '#10b981' },
    { name: t('dashboard.dept_hr'), value: 5, color: '#f59e0b' },
    { name: t('dashboard.dept_finance'), value: 6, color: '#3b82f6' },
    { name: t('dashboard.dept_operations'), value: 17, color: '#8b5cf6' },
  ];

  const kpiCards = [
    { label: t('dashboard.kpi_revenue_mtd'), value: '378 450 zł', change: '+12.4%', up: true, icon: TrendingUp, color: 'emerald', path: '/finance' },
    { label: t('dashboard.kpi_employees'), value: '48 osób', change: t('dashboard.kpi_employees_change'), up: true, icon: Users, color: 'indigo', path: '/hr' },
    { label: t('dashboard.kpi_compliance_score'), value: '87%', change: '+3% MoM', up: true, icon: ShieldCheck, color: 'emerald', path: '/compliance' },
    { label: t('dashboard.kpi_open_incidents'), value: '3', change: t('dashboard.kpi_incidents_change'), up: false, icon: AlertTriangle, color: 'rose', path: '/compliance' },
    { label: t('dashboard.kpi_work_hours_mtd'), value: '7 842 h', change: t('dashboard.kpi_hours_change'), up: true, icon: Clock, color: 'indigo', path: '/time' },
  ];

  const recentActivity = [
    { icon: FileText, text: t('dashboard.activity_invoice'), time: '5 min temu', color: 'text-emerald-500' },
    { icon: Users, text: t('dashboard.activity_new_employee'), time: '1h temu', color: 'text-indigo-500' },
    { icon: ShieldCheck, text: t('dashboard.activity_audit'), time: '2h temu', color: 'text-amber-500' },
    { icon: AlertTriangle, text: t('dashboard.activity_incident'), time: '3h temu', color: 'text-rose-500' },
    { icon: CheckCircle2, text: t('dashboard.activity_jpk'), time: '1d temu', color: 'text-emerald-500' },
    { icon: Zap, text: t('dashboard.activity_ai'), time: '1d temu', color: 'text-purple-500' },
  ];

  const deadlines = [
    { date: '15 Maj', label: t('dashboard.deadline_nis2_label'), type: t('dashboard.deadline_nis2_type'), urgent: true },
    { date: '20 Maj', label: t('dashboard.deadline_jpk_label'), type: t('dashboard.deadline_jpk_type'), urgent: true },
    { date: '22 Maj', label: t('dashboard.deadline_bhp_label'), type: t('dashboard.deadline_bhp_type'), urgent: false },
    { date: '31 Maj', label: t('dashboard.deadline_contracts_label'), type: t('dashboard.deadline_contracts_type'), urgent: false },
    { date: '01 Cze', label: t('dashboard.deadline_fleet_label'), type: t('dashboard.deadline_fleet_type'), urgent: false },
  ];

  return (
    <div className="max-w-[1600px] mx-auto p-8 space-y-8 animate-in fade-in duration-500">

      {/* Greeting */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="shrink-0">
          <h1 className="text-3xl font-black text-slate-800 dark:text-zinc-100 tracking-tighter">
            {greeting}, <span className="text-indigo-500 dark:text-indigo-400 italic">{firstName}</span>!
          </h1>
          <p className="text-slate-500 dark:text-zinc-500 text-sm mt-1 font-medium">
            {currentTenant?.name} · {new Date().toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <button className="flex items-center gap-2 bg-slate-200 dark:bg-zinc-700 hover:bg-slate-300 dark:hover:bg-zinc-600 text-slate-700 dark:text-zinc-200 px-5 py-3 rounded-xl transition-colors text-xs font-bold uppercase tracking-widest">
            <Bell size={15} /> {t('dashboard.btn_notifications')} <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">3</span>
          </button>
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-xl transition-colors text-xs font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/20">
            <Plus size={15} /> {t('dashboard.btn_quick_action')}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpiCards.map((kpi, i) => (
          <Link to={kpi.path} key={i}
            className={`${card} p-5 hover:border-slate-300 dark:hover:border-zinc-600 hover:shadow-md dark:hover:bg-zinc-700/60 transition-all group`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${kpi.color === 'emerald' ? 'bg-emerald-500/10' : kpi.color === 'rose' ? 'bg-rose-500/10' : 'bg-indigo-500/10'}`}>
                <kpi.icon size={18} className={kpi.color === 'emerald' ? 'text-emerald-500' : kpi.color === 'rose' ? 'text-rose-500' : 'text-indigo-500'} />
              </div>
              <ArrowRight size={14} className="text-slate-300 dark:text-zinc-600 group-hover:text-slate-500 dark:group-hover:text-zinc-400 transition-colors" />
            </div>
            <div className="text-xl font-black text-slate-800 dark:text-zinc-100 tracking-tighter">{kpi.value}</div>
            <div className="text-[10px] text-slate-500 dark:text-zinc-500 uppercase tracking-widest font-bold mt-0.5">{kpi.label}</div>
            <div className={`text-[10px] font-bold mt-2 ${kpi.up ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
              {kpi.up ? '↑' : '↓'} {kpi.change}
            </div>
          </Link>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <div className={`${card} lg:col-span-2 p-6`}>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-sm font-black text-slate-700 dark:text-zinc-200 uppercase tracking-widest">{t('dashboard.chart_revenue_title')}</h3>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-widest mt-1">{t('dashboard.chart_revenue_subtitle')}</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-indigo-500" /><span className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold">{t('dashboard.chart_legend_revenue')}</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-500" /><span className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold">{t('dashboard.chart_legend_costs')}</span></div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="grad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, fontSize: 11 }}
                formatter={(v: any) => [`${Number(v).toLocaleString('pl-PL')} zł`]}
              />
              <Area type="monotone" dataKey="przychody" stroke="#6366f1" strokeWidth={2} fill="url(#grad1)" name="Przychody" />
              <Area type="monotone" dataKey="koszty" stroke="#f43f5e" strokeWidth={2} fill="url(#grad2)" name="Koszty" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Department pie */}
        <div className={`${card} p-6`}>
          <h3 className="text-sm font-black text-slate-700 dark:text-zinc-200 uppercase tracking-widest mb-1">{t('dashboard.chart_dept_title')}</h3>
          <p className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-5">{t('dashboard.chart_dept_subtitle')}</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={departmentData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                {departmentData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, fontSize: 11 }} formatter={(v) => [`${v} osób`]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {departmentData.map((d, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-[11px] text-slate-600 dark:text-zinc-400 font-medium">{d.name}</span>
                </div>
                <span className="text-[11px] text-slate-700 dark:text-zinc-300 font-bold">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pending Tasks Widget (D) */}
      <PendingTasksWidget />

      {/* Activity + Deadlines + AI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className={`${card} lg:col-span-1 p-6`}>
          <h3 className="text-sm font-black text-slate-700 dark:text-zinc-200 uppercase tracking-widest mb-5">{t('dashboard.section_activity')}</h3>
          <div className="space-y-4">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-700/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <item.icon size={14} className={item.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-slate-600 dark:text-zinc-300 leading-snug">{item.text}</p>
                  <span className="text-[9px] text-slate-400 dark:text-zinc-600 uppercase tracking-widest">{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Deadlines */}
        <div className={`${card} p-6`}>
          <h3 className="text-sm font-black text-slate-700 dark:text-zinc-200 uppercase tracking-widest mb-5">{t('dashboard.section_deadlines')}</h3>
          <div className="space-y-3">
            {deadlines.map((d, i) => (
              <div key={i} className={`flex items-center gap-4 p-3 rounded-xl border ${
                d.urgent
                  ? 'bg-rose-50 dark:bg-rose-500/5 border-rose-200 dark:border-rose-500/20'
                  : 'bg-slate-50 dark:bg-zinc-700/20 border-slate-200 dark:border-zinc-700/30'
              }`}>
                <div className={`text-center w-10 flex-shrink-0 ${d.urgent ? 'text-rose-500' : 'text-slate-400 dark:text-zinc-400'}`}>
                  <div className="text-[8px] font-black uppercase">{d.date.split(' ')[1]}</div>
                  <div className="text-base font-black">{d.date.split(' ')[0]}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-[11px] font-bold truncate ${d.urgent ? 'text-slate-800 dark:text-zinc-100' : 'text-slate-600 dark:text-zinc-300'}`}>{d.label}</div>
                  <div className={`text-[9px] uppercase tracking-widest ${d.urgent ? 'text-rose-500 dark:text-rose-400' : 'text-slate-400 dark:text-zinc-500'}`}>{d.type}</div>
                </div>
                {d.urgent && <AlertTriangle size={14} className="text-rose-400 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </div>

        {/* AI Copilot mini */}
        <div className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950 dark:to-purple-950 border border-indigo-200 dark:border-indigo-900/50 rounded-2xl p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-5">
            <div className="bg-indigo-500/15 dark:bg-indigo-600/30 p-2.5 rounded-xl">
              <BrainCircuit size={18} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-indigo-900 dark:text-zinc-100 uppercase tracking-widest">AI Copilot</h3>
              <p className="text-[9px] text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">{t('dashboard.ai_powered_by')}</p>
            </div>
          </div>

          <div className="flex-1 space-y-3 mb-5">
            {[
              { q: false, text: t('dashboard.ai_chat_msg1') },
              { q: true, text: t('dashboard.ai_chat_msg2') },
              { q: false, text: t('dashboard.ai_chat_msg3') },
            ].map((msg, i) => (
              <div key={i} className={`flex ${msg.q ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-2.5 rounded-xl text-[11px] leading-relaxed ${
                  msg.q
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 border border-indigo-100 dark:border-zinc-700/50'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              value={aiQuery}
              onChange={e => setAiQuery(e.target.value)}
              placeholder={t('dashboard.ai_placeholder')}
              className="flex-1 bg-white dark:bg-zinc-900/60 border border-indigo-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs text-slate-700 dark:text-zinc-300 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500"
            />
            <Link to="/ai-copilot"
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl transition-colors"
            >
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>

      {currentTenant && <OnboardingChecklist tenantId={currentTenant.id} />}

      {currentTenant && user && (
        <WorkflowStatsWidget tenantId={currentTenant.id} userId={user.uid} />
      )}

      {/* Quick module access */}
      <div>
        <h3 className="text-sm font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest mb-4">{t('dashboard.section_quick_access')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: t('dashboard.quick_new_invoice'), icon: FileText, path: '/finance', color: 'text-indigo-500' },
            { label: t('dashboard.quick_add_employee'), icon: Users, path: '/hr', color: 'text-emerald-500' },
            { label: t('dashboard.quick_incident_ohs'), icon: AlertTriangle, path: '/compliance', color: 'text-rose-500' },
            { label: t('dashboard.quick_leave_request'), icon: Calendar, path: '/hr', color: 'text-amber-500' },
            { label: t('dashboard.quick_financial_report'), icon: BarChart3, path: '/controlling', color: 'text-blue-500' },
            { label: t('dashboard.quick_call_ai'), icon: BrainCircuit, path: '/ai-copilot', color: 'text-purple-500' },
          ].map((q, i) => (
            <Link to={q.path} key={i}
              className={`${card} p-4 flex flex-col items-center gap-2 hover:border-slate-300 dark:hover:border-zinc-600 hover:shadow-sm dark:hover:bg-zinc-700/50 transition-all text-center group`}
            >
              <q.icon size={20} className={q.color} />
              <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wide group-hover:text-slate-800 dark:group-hover:text-zinc-200 transition-colors">{q.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
