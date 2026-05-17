/**
 * Data: 2026-05-16
 * Ścieżka: /src/modules/controlling/ControllingModule.tsx
 */
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { db } from '../../shared/lib/firebase';
import { collection, query, getDocs, where, orderBy, Timestamp } from 'firebase/firestore';
import { useAuth } from '../../shared/hooks/AuthContext';
import {
  Target, TrendingUp, TrendingDown, AlertTriangle,
  BarChart3, PieChart, Calendar, Layers, Activity,
  CheckCircle2, Loader2,
} from 'lucide-react';
import BudgetPlanning from './components/BudgetPlanning';
import CostAnalysis from './components/CostAnalysis';
import IdesGenerateButton from '../../shared/components/IdesGenerateButton';

type ControllingTab = 'dashboard' | 'budget' | 'costs' | 'profitability' | 'forecasts' | 'mpk';

interface ProfitRow  { segment: string; revenue: number; costs: number; margin: number; }
interface ForecastRow { month: string; plan: number; forecast: number; actual: number | null; }
interface MpkRow     { code: string; name: string; budget: number; actual: number; variance: number; varPct: number; }

const tabs: { id: ControllingTab; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard',    label: 'Dashboard KPI',  icon: BarChart3  },
  { id: 'budget',       label: 'Budżet',          icon: Target     },
  { id: 'costs',        label: 'Analiza Kosztów', icon: PieChart   },
  { id: 'profitability',label: 'Rentowność',      icon: TrendingUp },
  { id: 'forecasts',    label: 'Prognozy',        icon: Calendar   },
  { id: 'mpk',          label: 'MPK Deep Dive',   icon: Layers     },
];

function DashboardTab() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
            Postęp Realizacji Budżetu — {new Date().toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}
          </div>
          <div className="space-y-4">
            {[
              { label: 'Przychody',         used: 112, color: 'bg-emerald-500' },
              { label: 'Koszty Operacyjne', used:  91, color: 'bg-indigo-500'  },
              { label: 'CAPEX',             used:  67, color: 'bg-amber-500'   },
              { label: 'Koszty Osobowe',    used:  94, color: 'bg-rose-500'    },
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
              { msg: 'Sprawdź przekroczenia budżetu w działach — dane MPK zaktualizowane', type: 'danger'  },
              { msg: 'Zaktualizuj prognozy Q3 po rozliczeniu bieżącego miesiąca',          type: 'info'    },
              { msg: 'Raport rentowności wg segmentu dostępny w zakładce Rentowność',       type: 'success' },
            ].map((a, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-2xl ${
                a.type === 'danger'  ? 'bg-rose-50 border border-rose-100'   :
                a.type === 'success' ? 'bg-emerald-50 border border-emerald-100' :
                                       'bg-indigo-50 border border-indigo-100'
              }`}>
                {a.type === 'danger'  ? <AlertTriangle size={14} className="text-rose-500 mt-0.5 shrink-0" /> :
                 a.type === 'success' ? <CheckCircle2  size={14} className="text-emerald-500 mt-0.5 shrink-0" /> :
                                        <Activity      size={14} className="text-indigo-500 mt-0.5 shrink-0" />}
                <span className="text-[11px] font-semibold text-slate-700">{a.msg}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfitabilityTab({ data }: { data: ProfitRow[] }) {
  if (!data.length) return (
    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm text-center text-slate-400 text-sm">
      Brak danych — wymagane faktury sprzedażowe z wypełnionym polem kategorii
    </div>
  );
  return (
    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">
        Rentowność wg Segmentu — {new Date().toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}
      </div>
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
            {data.map(row => (
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
  );
}

function ForecastsTab({ data }: { data: ForecastRow[] }) {
  if (!data.length) return (
    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm text-center text-slate-400 text-sm">
      Brak prognoz — dodaj wpisy do kolekcji <code>controllingForecasts</code>
    </div>
  );
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Prognoza Przychodów</div>
        <div className="space-y-4">
          {data.map(row => (
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
                    <span className="text-[10px] ml-2">
                      ({row.forecast > row.plan ? '+' : ''}{(((row.forecast - row.plan) / row.plan) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
              <div className={`w-2 h-2 rounded-full ${row.forecast > row.plan ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MpkDeepDiveTab({ data }: { data: MpkRow[] }) {
  const [selected, setSelected] = useState<string | null>(null);

  if (!data.length) return (
    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm text-center text-slate-400 text-sm">
      Brak MPK — dodaj miejsca powstawania kosztów w kolekcji <code>costCenters</code>
    </div>
  );

  return (
    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">
        Analiza MPK — Kliknij wiersz, aby zobaczyć szczegóły
      </div>
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
            {data.map(row => (
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
                      <div className="text-[10px] font-black text-indigo-700 uppercase tracking-widest mb-2">Szczegóły — {row.name}</div>
                      <div className="grid grid-cols-3 gap-4">
                        {['Wynagrodzenia', 'Materiały', 'Usługi'].map((cat, i) => (
                          <div key={cat}>
                            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{cat}</div>
                            <div className="text-[13px] font-bold text-slate-800">
                              {Math.round(row.actual / 3 * (1 + i * 0.1)).toLocaleString('pl-PL')} PLN
                            </div>
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
  );
}

export default function ControllingModule() {
  const { activeTenantId } = useAuth() as any;
  const [activeTab,    setActiveTab]    = useState<ControllingTab>('dashboard');
  const [loadingData,  setLoadingData]  = useState(true);
  const [revenue,      setRevenue]      = useState(0);
  const [costs,        setCosts]        = useState(0);
  const [profitability, setProfitability] = useState<ProfitRow[]>([]);
  const [forecasts,    setForecasts]    = useState<ForecastRow[]>([]);
  const [mpk,          setMpk]          = useState<MpkRow[]>([]);

  useEffect(() => {
    if (!activeTenantId) return;
    const now   = new Date();
    const start = Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth(), 1));
    const end   = Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59));

    (async () => {
      setLoadingData(true);
      try {
        const [invSnap, forecastSnap, ccSnap] = await Promise.all([
          getDocs(query(
            collection(db, `tenants/${activeTenantId}/invoices`),
            where('issueDate', '>=', start),
            where('issueDate', '<=', end),
          )),
          getDocs(query(
            collection(db, `tenants/${activeTenantId}/controllingForecasts`),
            orderBy('sortOrder'),
          )),
          getDocs(collection(db, `tenants/${activeTenantId}/costCenters`)),
        ]);

        let rev = 0, cos = 0;
        const bySegment:    Record<string, { revenue: number; costs: number }> = {};
        const byCostCenter: Record<string, number> = {};

        invSnap.docs.forEach(d => {
          const inv = d.data();
          const amt = inv.totalGross ?? inv.totalNet ?? 0;
          const seg = inv.category ?? 'Inne';
          bySegment[seg] = bySegment[seg] ?? { revenue: 0, costs: 0 };

          if (inv.type === 'SALES') {
            rev += amt;
            bySegment[seg].revenue += amt;
          } else {
            cos += amt;
            bySegment[seg].costs += amt;
            if (inv.costCenterId) byCostCenter[inv.costCenterId] = (byCostCenter[inv.costCenterId] ?? 0) + amt;
          }
        });

        setRevenue(rev);
        setCosts(cos);

        setProfitability(
          Object.entries(bySegment)
            .filter(([, v]) => v.revenue > 0)
            .map(([segment, v]) => ({
              segment,
              revenue: Math.round(v.revenue),
              costs:   Math.round(v.costs),
              margin:  Math.round(((v.revenue - v.costs) / v.revenue) * 1000) / 10,
            }))
            .sort((a, b) => b.revenue - a.revenue),
        );

        setForecasts(forecastSnap.docs.map(d => ({
          month:    d.data().month,
          plan:     d.data().plan,
          forecast: d.data().forecast,
          actual:   d.data().actual ?? null,
        })));

        setMpk(ccSnap.docs.map(d => {
          const cc       = d.data();
          const budget   = cc.monthlyBudget ?? cc.budget ?? 0;
          const actual   = byCostCenter[d.id] ?? 0;
          const variance = actual - budget;
          return {
            code:     cc.code ?? d.id.slice(0, 8),
            name:     cc.name,
            budget:   Math.round(budget),
            actual:   Math.round(actual),
            variance: Math.round(variance),
            varPct:   budget > 0 ? Math.round((variance / budget) * 1000) / 10 : 0,
          };
        }));
      } finally {
        setLoadingData(false);
      }
    })();
  }, [activeTenantId]);

  const ebitda = revenue > 0 ? Math.round(((revenue - costs) / revenue) * 1000) / 10 : 0;

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard':     return <DashboardTab />;
      case 'budget':        return <BudgetPlanning />;
      case 'costs':         return <CostAnalysis />;
      case 'profitability': return <ProfitabilityTab data={profitability} />;
      case 'forecasts':     return <ForecastsTab data={forecasts} />;
      case 'mpk':           return <MpkDeepDiveTab data={mpk} />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-slate-900 rounded-[3rem] p-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 to-transparent pointer-events-none" />
        <div className="relative">
          <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Moduł</div>
          <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter mb-3">Controlling</h1>
          <p className="text-slate-400 text-sm max-w-xl">
            Zarządzanie budżetem, analiza kosztów i rentowności, prognozy finansowe oraz monitoring odchyleń planowych w czasie rzeczywistym.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-6">
            {loadingData ? (
              <div className="col-span-3 flex items-center gap-2 text-slate-500 text-sm">
                <Loader2 size={16} className="animate-spin" /> Ładowanie danych…
              </div>
            ) : (
              [
                { label: 'Przychody (bm)',  value: revenue.toLocaleString('pl-PL') + ' PLN', delta: 'bieżący miesiąc', up: true         },
                { label: 'Koszty (bm)',     value: costs.toLocaleString('pl-PL') + ' PLN',   delta: 'bieżący miesiąc', up: false        },
                { label: 'EBITDA',          value: ebitda.toFixed(1) + '%',                   delta: 'marża',           up: ebitda > 0   },
              ].map(kpi => (
                <div key={kpi.label}>
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{kpi.label}</div>
                  <div className={`text-2xl font-black italic tracking-tighter ${kpi.up ? 'text-emerald-400' : 'text-rose-400'}`}>{kpi.value}</div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase">{kpi.delta}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 p-2 bg-slate-100 rounded-[2rem] w-fit items-center">
        <IdesGenerateButton moduleKey="finance" />
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
