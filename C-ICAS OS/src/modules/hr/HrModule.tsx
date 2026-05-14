/**
 * Data: 2026-05-14
 * Ścieżka: /src/modules/hr/HrModule.tsx
 */
import React, { Suspense, useState } from 'react';
import {
  Users, Banknote, Calendar, ShieldCheck,
  Clock, GraduationCap, Briefcase, Network,
  Plus, TrendingUp
} from 'lucide-react';

const EmployeeList   = React.lazy(() => import('./components/EmployeeList'));
const OrgChart       = React.lazy(() => import('./components/OrgChart'));
const PayrollModule  = React.lazy(() => import('./components/PayrollModule'));
const LeaveManagement = React.lazy(() => import('./LeaveManagement'));

type HrTab = 'employees' | 'orgchart' | 'payroll' | 'leaves' | 'bhp' | 'timework' | 'recruitment' | 'lms';

const TABS: { id: HrTab; label: string; icon: React.ElementType }[] = [
  { id: 'employees',   label: 'Pracownicy',     icon: Users        },
  { id: 'orgchart',    label: 'Struktura Org',  icon: Network      },
  { id: 'payroll',     label: 'Płace',          icon: Banknote     },
  { id: 'leaves',      label: 'Urlopy',         icon: Calendar     },
  { id: 'bhp',         label: 'BHP',            icon: ShieldCheck  },
  { id: 'timework',    label: 'Czas Pracy',     icon: Clock        },
  { id: 'recruitment', label: 'eRekrutacja',    icon: Briefcase    },
  { id: 'lms',         label: 'Szkolenia',      icon: GraduationCap},
];

function Loader() {
  return (
    <div className="h-64 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
}

function PlaceholderTab({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="h-[420px] flex flex-col items-center justify-center text-center space-y-6">
      <Icon size={64} className="text-slate-200" />
      <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">{title}</h3>
      <p className="text-xs font-black text-slate-400 uppercase tracking-widest max-w-sm leading-relaxed">{description}</p>
      <button className="bg-slate-100 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all">
        Konfiguruj
      </button>
    </div>
  );
}

export default function HrModule() {
  const [activeTab, setActiveTab] = useState<HrTab>('employees');

  const stats = [
    { label: 'Zatrudnienie',    value: '48',  unit: 'osób',     color: 'text-slate-900' },
    { label: 'Na urlopie',      value: '3',   unit: 'dziś',     color: 'text-amber-600' },
    { label: 'Otwarte wakaty',  value: '5',   unit: 'pozycji',  color: 'text-indigo-600' },
  ];

  return (
    <div className="max-w-[1600px] mx-auto p-10 space-y-10 animate-in fade-in duration-500">

      {/* Header */}
      <div className="bg-slate-900 rounded-[3rem] p-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative overflow-hidden shadow-2xl shadow-slate-200">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div>
          <div className="flex items-center gap-4 mb-3">
            <div className="bg-indigo-600 p-3 rounded-[1.5rem] shadow-lg shadow-indigo-900/40">
              <Users className="text-white" size={22} />
            </div>
            <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">
              Human Resources
            </h1>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">
            System Kadrowo-Płacowy — C-ICAS OS V5
          </p>
        </div>

        <div className="flex gap-6 flex-wrap">
          {stats.map((s, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-[2rem] px-8 py-6 text-right backdrop-blur-sm">
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</div>
              <div className={`text-2xl font-black italic ${s.color}`}>
                {s.value} <span className="text-[10px] text-slate-500">{s.unit}</span>
              </div>
            </div>
          ))}
          <div className="bg-indigo-600 rounded-[2rem] px-8 py-6 flex items-center gap-3">
            <TrendingUp className="text-white" size={18} />
            <div className="text-right">
              <div className="text-[9px] font-black text-indigo-200 uppercase tracking-widest mb-1">Retencja</div>
              <div className="text-2xl font-black text-white italic">94<span className="text-sm">%</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-100 pb-8">
        <div className="flex flex-wrap gap-2 p-2 bg-slate-100 rounded-[2.5rem] w-fit">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 rounded-[2rem] transition-all text-[10px] font-black uppercase tracking-widest ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-xl scale-[1.02]'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        <button className="bg-slate-900 text-white px-10 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-indigo-600 transition-all shadow-2xl shadow-slate-200 whitespace-nowrap">
          <Plus size={16} /> Dodaj Pracownika
        </button>
      </div>

      {/* Content */}
      <div className="min-h-[600px]">
        <Suspense fallback={<Loader />}>
          {activeTab === 'employees'   && <EmployeeList />}
          {activeTab === 'orgchart'    && <OrgChart />}
          {activeTab === 'payroll'     && <PayrollModule />}
          {activeTab === 'leaves'      && <LeaveManagement />}
          {activeTab === 'bhp'         && (
            <PlaceholderTab
              icon={ShieldCheck}
              title="Moduł BHP"
              description="Zarządzanie szkoleniami BHP, kartami ryzyka zawodowego i rejestrem wypadków w miejscu pracy."
            />
          )}
          {activeTab === 'timework'    && (
            <PlaceholderTab
              icon={Clock}
              title="Czas Pracy"
              description="Ewidencja czasu pracy, grafiki zmianowe, nadgodziny i rozliczenia RCP dla wszystkich pracowników."
            />
          )}
          {activeTab === 'recruitment' && (
            <PlaceholderTab
              icon={Briefcase}
              title="eRekrutacja"
              description="Zarządzanie procesem rekrutacji: ogłoszenia, aplikacje, rozmowy kwalifikacyjne i onboarding nowych pracowników."
            />
          )}
          {activeTab === 'lms'         && (
            <PlaceholderTab
              icon={GraduationCap}
              title="Szkolenia — LMS"
              description="Platforma szkoleń wewnętrznych i zewnętrznych: kursy e-learning, certyfikaty, ścieżki rozwoju i raporty postępów."
            />
          )}
        </Suspense>
      </div>
    </div>
  );
}
