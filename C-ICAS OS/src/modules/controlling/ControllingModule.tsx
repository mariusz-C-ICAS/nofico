/**
 * Data: 2026-05-14
 * Ścieżka: /src/modules/controlling/ControllingModule.tsx
 */
import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Target, TrendingUp, TrendingDown, AlertTriangle,
  BarChart3, PieChart, Calendar, Layers, Activity,
  ArrowRight, CheckCircle2, XCircle
} from 'lucide-react';
import BudgetPlanning from './components/BudgetPlanning';
import CostAnalysis from './components/CostAnalysis';

type ControllingTab = 'dashboard' | 'budget' | 'costs' | 'profitability' | 'forecasts' | 'mpk';

const kpiData = [
  { label: 'Realizacja Budżetu', value: '87.3%', delta: '+2.1%', up: true, icon: Target, color: 'indigo' },
  { label: 'Odchylenie Kosztów', value: '-4.2%', delta: 'vs plan', up: false, icon: TrendingDown, color: 'rose' },
  { label: 'Przychody vs Plan', value: '112%', delta: '+12 pkt', up: true, icon: TrendingUp, color: 'emerald' },
  { label: 'EBITDA', value: '38.4%', delta: 'marża', up: true, icon: Activity, color: 'amber' },
];

const profitabilityData = [
  { segment: 'Usługi IT', revenue: 145000, costs: 98000, margin: 32.4 },
  { segment: 'Consulting', revenue: 87000, costs: 52000, margin: 40.2 },
  { segment: 'Licencje', revenue: 34000, costs: 8000, margin: 76.5 },
  { segment: 'Wsparcie', revenue: 22000, costs: 18000, margin: 18.2 },
  { segment: 'Hardware', revenue: 15000, costs: 13500, margin: 10.0 },
];

const forecastData = [
  { month: 'Cze', plan: 280000, forecast: 295000, actual: null },
  { month: 'Lip', plan: 265000, forecast: 271000, actual: null },
  { month: 'Sie', plan: 290000, forecast: 288000, actual: null },
  { month: 'Wrz', plan: 310000, forecast: 325000, actual: null },
];

const mpkData = [
  { code: 'MPK-001', name: 'Dział IT', budget: 85000, actual: 78200, variance: -6800, varPct: -8.0 },
  { code: 'MPK-002', name: 'Dział Handlowy', budget: 62000, actual: 68400, variance: 6400, varPct: 10.3 },
  { code: 'MPK-003', name: 'Administracja', budget: 38000, actual: 36100, variance: -1900, varPct: -5.0 },
  { code: 'MPK-004', name: 'Marketing', budget: 28000, actual: 31200, variance: 3200, varPct: 11.4 },
  { code: 'MPK-005', name: 'R&D', budget: 45000, actual: 42800, variance: -2200, varPct: -4.9 },
];

const tabs: { id: ControllingTab; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard KPI', icon: BarChart3 },
  { id: 'budget', label: 'Budżet', icon: Target },
  { id: 'costs', label: 'Analiza Kosztów', icon: PieChart },
  { id: 'profitability', label: 'Rentowność', icon: TrendingUp },
  { id: 'forecasts', label: 'Prognozy', icon: Calendar },
  { id: 'mpk', label: 'MPK Deep Dive', icon: Layers },
];

function DashboardTab() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Postęp Realizacji Budżetu — Maj 2026</div>
          <div className="space-y-4">
            {[
              { label: 'Przychody', used: 112, color: 'bg-emerald-500' },
              { label: 'Koszty Operacyjne', used: 91, color: 'bg-indigo-500' },
              { label: 'CAPEX', used: 67, color: 'bg-amber-500' },
              { label: 'Koszty Osobowe', used: 94, color: 'bg-rose-500' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{item.label}</span>
                  <span className="text-[10px] font-black text-slate-900">{item.used}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full transition-all duration-700`} style={{ width: `${Math.min(item.used, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Alerty Controllingowe</div>
          <div className="space-y-3">
            {[
              { msg: 'MPK-002 Dział Handlowy przekroczył budżet o 10.3%', type: 'danger' },
              { msg: 'MPK-004 Marketing: odchylenie +11.4% od planu', type: 'danger' },
              { msg: 'Przychody przekroczyły plan — rewizja prognozy Q3', type: 'info' },
              { msg: 'R&D: oszczędność 4.9% vs budżet roczny', type: 'success' },
            ].map((a, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-2xl ${
                a.type === 'danger' ? 'bg-rose-50 border border-rose-100' :
                a.type === 'success' ? 'bg-emerald-50 border border-emerald-100' :
                'bg-indigo-50 border border-indigo-100'
              }`}>
                {a.type === 'danger' ? <AlertTriangle size={14} className="text-rose-500 mt-0.5 shrink-0" /> :
                 a.type === 'success' ? <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" /> :
                 <Activity size={14} className="text-indigo-500 mt-0.5 shrink-0" />}
                <span className="text-[11px] font-semibold text-slate-700">{a.msg}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-slate-900 rounded-[3rem] p-10">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Wyniki YTD — Styczeń–Maj 2026</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'Przychody Razem', value: '1 458 200', unit: 'PLN', delta: '+8.4%' },
            { label: 'Koszty Operacyjne', value: '987 400', unit: 'PLN', delta: '+3.1%' },
            { label: 'Zysk Brutto', value: '470 800', unit: 'PLN', delta: '+18.2%' },
            { label: 'Marża Netto', value: '22.8%', unit: '', delta: '+2.3 pkt' },
          ].map(m => (
            <div key={m.label}>
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{m.label}</div>
              <div className="text-2xl font-black text-white italic tracking-tighter">{m.value} <span className="text-xs text-slate-400">{m.unit}</span></div>
              <div className="text-[10px] font-bold text-emerald-400 uppercase mt-1">{m.delta} vs rok ub.</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProfitabilityTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Rentowność wg Segmentu — Maj 2026</div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {['Segment', 'Przychód', 'Koszty', 'Zysk', 'Marża %', 'Status'].map(h => (
                  <th key={h} className="text-[10px] font-black text-slate-400 uppercase tracking-widest pb-3 text-left pr-6">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {profitabilityData.map(row => (
                <tr key={row.segment} className="hover:bg-slate-50 transition-colors">
                  <td className="py-4 pr-6 text-[13px] font-black text-slate-900">{row.segment}</td>
                  <td className="py-4 pr-6 text-[13px] font-semibold text-slate-700">{row.revenue.toLocaleString('pl-PL')} PLN</td>
                  <td className="py-4 pr-6 text-[13px] font-semibold text-slate-700">{row.costs.toLocaleString('pl-PL')} PLN</td>
                  <td className="py-4 pr-6 text-[13px] font-bold text-emerald-600">{(row.revenue - row.costs).toLocaleString('pl-PL')} PLN</td>
                  <td className="py-4 pr-6">
                    <span className={`text-[12px] font-black px-3 py-1 rounded-full ${row.margin > 30 ? 'bg-emerald-100 text-emerald-700' : row.margin > 15 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                      {row.margin.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-4">
                    {row.margin > 30 ? <CheckCircle2 size={16} className="text-emerald-500" /> : <AlertTriangle size={16} className="text-amber-500" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ForecastsTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prognoza Przychodów Q3 2026</div>
          <div className="flex gap-2">
            {['Scenariusz Base', 'Scenariusz Opt.', 'Scenariusz Pess.'].map(s => (
              <button key={s} className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-3 py-1.5 rounded-full bg-slate-100 hover:bg-indigo-100 hover:text-indigo-600 transition-colors">{s}</button>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          {forecastData.map(row => (
            <div key={row.month} className="flex items-center gap-4">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest w-8">{row.month}</div>
              <div className="flex-1 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Plan</div>
                  <div className="text-[13px] font-black text-slate-700">{row.plan.toLocaleString('pl-PL')} PLN</div>
                </div>
                <div>
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Prognoza</div>
                  <div className={`text-[13px] font-black ${row.forecast > row.plan ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {row.forecast.toLocaleString('pl-PL')} PLN
                    <span className="text-[10px] ml-2">({row.forecast > row.plan ? '+' : ''}{(((row.forecast - row.plan) / row.plan) * 100).toFixed(1)}%)</span>
                  </div>
                </div>
              </div>
              <div className={`w-2 h-2 rounded-full ${row.forecast > row.plan ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-900 rounded-[3rem] p-8">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Założenia Prognozy</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Wzrost organiczny', value: '5-8% r/r', icon: TrendingUp },
            { label: 'Nowi klienci', value: '+3 kontrakty', icon: Target },
            { label: 'Ryzyko walutowe', value: 'EUR/PLN ±5%', icon: AlertTriangle },
          ].map(a => (
            <div key={a.label} className="flex items-center gap-3">
              <a.icon size={16} className="text-indigo-400 shrink-0" />
              <div>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{a.label}</div>
                <div className="text-[13px] font-bold text-white">{a.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MpkDeepDiveTab() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Analiza MPK — Kliknij wiersz, aby zobaczyć szczegóły</div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {['MPK', 'Nazwa', 'Budżet', 'Wykonanie', 'Odchylenie', 'Odch. %'].map(h => (
                  <th key={h} className="text-[10px] font-black text-slate-400 uppercase tracking-widest pb-3 text-left pr-6">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {mpkData.map(row => (
                <React.Fragment key={row.code}>
                  <tr
                    className={`cursor-pointer hover:bg-slate-50 transition-colors ${selected === row.code ? 'bg-indigo-50' : ''}`}
                    onClick={() => setSelected(selected === row.code ? null : row.code)}
                  >
                    <td className="py-4 pr-6 text-[11px] font-black text-indigo-600">{row.code}</td>
                    <td className="py-4 pr-6 text-[13px] font-black text-slate-900">{row.name}</td>
                    <td className="py-4 pr-6 text-[13px] font-semibold text-slate-700">{row.budget.toLocaleString('pl-PL')} PLN</td>
                    <td className="py-4 pr-6 text-[13px] font-semibold text-slate-700">{row.actual.toLocaleString('pl-PL')} PLN</td>
                    <td className={`py-4 pr-6 text-[13px] font-bold ${row.variance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {row.variance > 0 ? '+' : ''}{row.variance.toLocaleString('pl-PL')} PLN
                    </td>
                    <td className="py-4">
                      <span className={`text-[11px] font-black px-2 py-1 rounded-full ${Math.abs(row.varPct) > 10 ? 'bg-rose-100 text-rose-700' : Math.abs(row.varPct) > 5 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {row.varPct > 0 ? '+' : ''}{row.varPct.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                  {selected === row.code && (
                    <tr>
                      <td colSpan={6} className="bg-indigo-50 px-6 py-4">
                        <div className="text-[10px] font-black text-indigo-700 uppercase tracking-widest mb-2">Szczegoly {row.name}</div>
                        <div className="grid grid-cols-3 gap-4">
                          {['Wynagrodzenia', 'Materialy', 'Uslugi'].map((cat, i) => (
                            <div key={cat}>
                              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{cat}</div>
                              <div className="text-[13px] font-bold text-slate-800">{(row.actual / 3 * (1 + i * 0.1)).toFixed(0)} PLN</div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function ControllingModule() {
  const [activeTab, setActiveTab] = useState<ControllingTab>('dashboard');

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardTab />;
      case 'budget': return <BudgetPlanning />;
      case 'costs': return <CostAnalysis />;
      case 'profitability': return <ProfitabilityTab />;
      case 'forecasts': return <ForecastsTab />;
      case 'mpk': return <MpkDeepDiveTab />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Dark Header */}
      <div className="bg-slate-900 rounded-[3rem] p-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 to-transparent pointer-events-none" />
        <div className="relative">
          <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Modul</div>
          <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter mb-3">Controlling</h1>
          <p className="text-slate-400 text-sm max-w-xl">
            Zarzadzanie budzetem, analiza kosztow i rentownosci, prognozy finansowe oraz monitoring odchylen planowych w czasie rzeczywistym.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-6">
            {kpiData.slice(0, 3).map(kpi => (
              <div key={kpi.label}>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{kpi.label}</div>
                <div className={`text-2xl font-black italic tracking-tighter ${kpi.up ? 'text-emerald-400' : 'text-rose-400'}`}>{kpi.value}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">{kpi.delta}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 p-2 bg-slate-100 rounded-[2rem] w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                : 'text-slate-500 hover:text-indigo-600 hover:bg-white'
            }`}
          >
            <tab.icon size={13} />
            {tab.label}
          </button>
        ))}
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        {renderTab()}
      </motion.div>
    </div>
  );
}
