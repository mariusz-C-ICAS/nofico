/**
 * Data: 2026-05-16
 * Ścieżka: /src/modules/eRecruitment/ERecruitmentModule.tsx
 */
import React, { useState, useEffect, Suspense } from 'react';
import { motion } from 'motion/react';
import {
  Briefcase, Users, CalendarCheck, UserCheck,
  BarChart3, TrendingUp, Clock, Target, Loader2,
} from 'lucide-react';
import { db } from '../../shared/lib/firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { useAuth } from '../../shared/hooks/AuthContext';
import IdesGenerateButton from '../../shared/components/IdesGenerateButton';

const JobPostingList      = React.lazy(() => import('./components/JobPostingList'));
const CandidateKanban     = React.lazy(() => import('./components/CandidateKanban'));
const InterviewScheduler  = React.lazy(() => import('./components/InterviewScheduler'));
const OnboardingChecklist = React.lazy(() => import('./components/OnboardingChecklist'));

type Tab = 'jobs' | 'candidates' | 'interviews' | 'onboarding' | 'report';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'jobs',       label: 'Oferty Pracy',           icon: Briefcase    },
  { id: 'candidates', label: 'Kandydaci (Pipeline)',    icon: Users        },
  { id: 'interviews', label: 'Rozmowy Kwalifikacyjne', icon: CalendarCheck },
  { id: 'onboarding', label: 'Onboarding',             icon: UserCheck    },
  { id: 'report',     label: 'Raport',                 icon: BarChart3    },
];

interface FunnelRow { stage: string; count: number; pct: number; }
interface SourceRow { src: string; cnt: number; color: string; }

function RecruitmentReport() {
  const { activeTenantId } = useAuth() as any;
  const [funnel,  setFunnel]  = useState<FunnelRow[]>([]);
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeTenantId) return;
    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, `tenants/${activeTenantId}/candidates`));
        const total = snap.size;

        const STAGES = ['Aplikacja', 'Screening CV', 'Rozmowa HR', 'Test Techniczny', 'Rozmowa Finalna', 'Oferta', 'Zatrudniony'];
        const stageCounts: Record<string, number> = {};
        STAGES.forEach(s => { stageCounts[s] = 0; });
        stageCounts['Aplikacja'] = total;

        const srcCounts: Record<string, number> = {};
        snap.docs.forEach(d => {
          const c = d.data();
          const stage = c.stage as string;
          if (stage && stage in stageCounts) stageCounts[stage]++;
          const src = (c.source as string) ?? 'Inne';
          srcCounts[src] = (srcCounts[src] ?? 0) + 1;
        });

        setFunnel(STAGES.map(stage => ({
          stage,
          count: stageCounts[stage],
          pct: total > 0 ? Math.round((stageCounts[stage] / total) * 100) : 0,
        })));

        const SOURCE_COLORS = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-slate-600'];
        setSources(Object.entries(srcCounts).slice(0, 4).map(([src, cnt], i) => ({
          src, cnt, color: SOURCE_COLORS[i % SOURCE_COLORS.length],
        })));
      } finally {
        setLoading(false);
      }
    })();
  }, [activeTenantId]);

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Konwersja aplikacja → oferta', value: funnel.length > 0 ? `${funnel[5]?.pct ?? 0}%` : '—', icon: Target,    color: 'bg-indigo-600' },
          { label: 'Koszt rekrutacji (avg.)',       value: '2 840 PLN',                                         icon: BarChart3, color: 'bg-emerald-600' },
          { label: 'NPS kandydatów',                value: '72 / 100',                                          icon: TrendingUp,color: 'bg-amber-600' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white border-2 border-slate-100 rounded-[3rem] p-8 shadow-sm">
            <div className={`${kpi.color} w-10 h-10 rounded-2xl flex items-center justify-center mb-4`}>
              <kpi.icon size={18} className="text-white" />
            </div>
            <div className="text-3xl font-black text-slate-900 italic tracking-tighter mb-1">{kpi.value}</div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border-2 border-slate-100 rounded-[3rem] p-10 shadow-sm">
        <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-tighter mb-8">Lejek Rekrutacyjny</h3>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-400" size={24} /></div>
        ) : (
          <div className="space-y-4">
            {funnel.map(row => (
              <div key={row.stage} className="flex items-center gap-6">
                <div className="w-36 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">{row.stage}</div>
                <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                  <motion.div
                    className="h-3 bg-indigo-600 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${row.pct}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                  />
                </div>
                <div className="w-12 text-right text-[11px] font-black text-slate-900">{row.count}</div>
                <div className="w-10 text-right text-[10px] font-black text-slate-400">{row.pct}%</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-slate-900 rounded-[3rem] p-10 text-white">
        <h3 className="text-sm font-black uppercase italic tracking-tighter mb-6 text-slate-300">Top Źródła Aplikacji</h3>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-400" size={24} /></div>
        ) : sources.length === 0 ? (
          <p className="text-slate-400 text-sm italic">Brak danych o źródłach</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {sources.map(s => (
              <div key={s.src} className="space-y-2">
                <div className={`${s.color} h-1 rounded-full`} />
                <div className="text-2xl font-black italic tracking-tighter">{s.cnt}</div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.src}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ERecruitmentModule() {
  const { activeTenantId } = useAuth() as any;
  const [activeTab,  setActiveTab]  = useState<Tab>('jobs');
  const [statsData,  setStatsData]  = useState({ openJobs: 0, applications: 0, weekInterviews: 0 });

  useEffect(() => {
    if (!activeTenantId) return;
    (async () => {
      const now       = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const [jobsSnap, candidatesSnap, interviewsSnap] = await Promise.all([
        getDocs(query(collection(db, `tenants/${activeTenantId}/jobPostings`), where('status', '==', 'active'))),
        getDocs(collection(db, `tenants/${activeTenantId}/candidates`)),
        getDocs(query(
          collection(db, `tenants/${activeTenantId}/interviews`),
          where('date', '>=', Timestamp.fromDate(weekStart)),
          where('date', '<=', Timestamp.fromDate(weekEnd)),
        )),
      ]);
      setStatsData({
        openJobs:       jobsSnap.size,
        applications:   candidatesSnap.size,
        weekInterviews: interviewsSnap.size,
      });
    })();
  }, [activeTenantId]);

  const stats = [
    { label: 'Otwarte stanowiska',  value: String(statsData.openJobs),       sub: 'aktywnych ofert',       icon: Briefcase,    color: 'text-indigo-600'  },
    { label: 'Aplikacje w mies.',   value: String(statsData.applications),   sub: 'łącznie kandydatów',    icon: TrendingUp,   color: 'text-emerald-600' },
    { label: 'Zaplanowane rozmowy', value: String(statsData.weekInterviews), sub: 'na ten tydzień',        icon: CalendarCheck,color: 'text-amber-600'   },
    { label: 'Avg. time-to-hire',   value: '18 dni',                         sub: 'od aplikacji do oferty', icon: Clock,        color: 'text-rose-600'    },
  ];

  return (
    <div className="max-w-[1600px] mx-auto p-10 space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start gap-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-200">
              <Briefcase className="text-white" size={20} />
            </div>
            <h1 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">eRecruitment</h1>
            <IdesGenerateButton moduleKey="hr" />
          </div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] italic">Modul Rekrutacji C-ICAS OS — NoFiCo V5</p>
        </div>

        <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 shadow-sm flex items-center gap-6 flex-wrap">
          {stats.map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 && <div className="w-px h-10 bg-slate-100" />}
              <div className="text-right">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{s.label}</div>
                <div className={`text-xl font-black italic ${s.color}`}>{s.value}</div>
                <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{s.sub}</div>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-100 pb-10">
        <div className="flex p-2 bg-slate-100 rounded-[2.5rem] w-fit flex-wrap gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-8 py-5 rounded-[2rem] transition-all text-[11px] font-black uppercase tracking-widest ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-2xl scale-[1.02]'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-[600px]">
        <Suspense fallback={
          <div className="h-64 flex items-center justify-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Wczytywanie...
          </div>
        }>
          {activeTab === 'jobs'       && <JobPostingList />}
          {activeTab === 'candidates' && <CandidateKanban />}
          {activeTab === 'interviews' && <InterviewScheduler />}
          {activeTab === 'onboarding' && <OnboardingChecklist />}
          {activeTab === 'report'     && <RecruitmentReport />}
        </Suspense>
      </div>
    </div>
  );
}
