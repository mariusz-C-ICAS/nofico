/**
 * Data: 2026-05-14
 * Zmiany: Rozbudowa o ISMS, DPIA, Consent, DSR, Risk Register, Security Policies.
 * Ścieżka: /src/modules/compliance/ComplianceModule.tsx
 */
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck, Lock, ShieldAlert, FileCheck, Zap, Scale, HeartPulse,
  LayoutDashboard, Plus, AlertTriangle, History, FileKey, UserCheck,
  Database, FolderLock, ClipboardList
} from 'lucide-react';
import { ComplianceScoreService, ComplianceScoreResult } from './services/ComplianceScoreService';
import { useAuth } from '../../shared/hooks/AuthContext';

const RodoSection          = lazy(() => import('./components/RodoSection'));
const Nis2Section          = lazy(() => import('./components/Nis2Section'));
const AmlSection           = lazy(() => import('./components/AmlSection'));
const BhpRegistry          = lazy(() => import('./components/BhpRegistry'));
const AiInventoryAct       = lazy(() => import('./components/AiInventoryAct'));
const IsmsModule           = lazy(() => import('./components/IsmsModule'));
const DpiaManager          = lazy(() => import('./components/DpiaManager'));
const ConsentManager       = lazy(() => import('./components/ConsentManager'));
const DataSubjectRequests  = lazy(() => import('./components/DataSubjectRequests'));
const RiskRegister         = lazy(() => import('./components/RiskRegister'));
const SecurityPolicies     = lazy(() => import('./components/SecurityPolicies'));
const LegalVaultModule     = lazy(() => import('./legal/LegalVaultModule'));

type ComplianceTab =
  | 'overview' | 'rodo' | 'nis2' | 'aml' | 'bhp' | 'aiact'
  | 'isms' | 'dpia' | 'consent' | 'dsr' | 'risk' | 'policies' | 'legal';

// TABS are built dynamically inside the component using t()

const Loader = () => (
  <div className="h-64 flex items-center justify-center">
    <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
  </div>
);

export default function ComplianceModule() {
  const { t } = useTranslation();
  const { userData, activeTenantId } = useAuth();
  const [activeTab, setActiveTab] = useState<ComplianceTab>('overview');
  const [scoreData, setScoreData] = useState<ComplianceScoreResult | null>(null);

  const TABS: { id: ComplianceTab; label: string; icon: React.ElementType; group: string }[] = [
    { id: 'overview',  label: t('compliance.tabs.overview'),  icon: LayoutDashboard, group: t('compliance.groups.overview') },
    { id: 'rodo',      label: t('compliance.tabs.rodo'),      icon: Lock,            group: t('compliance.groups.personalData') },
    { id: 'dpia',      label: t('compliance.tabs.dpia'),      icon: FileKey,         group: t('compliance.groups.personalData') },
    { id: 'consent',   label: t('compliance.tabs.consent'),   icon: UserCheck,       group: t('compliance.groups.personalData') },
    { id: 'dsr',       label: t('compliance.tabs.dsr'),       icon: Database,        group: t('compliance.groups.personalData') },
    { id: 'isms',      label: t('compliance.tabs.isms'),      icon: FolderLock,      group: t('compliance.groups.security') },
    { id: 'risk',      label: t('compliance.tabs.risk'),      icon: ClipboardList,   group: t('compliance.groups.security') },
    { id: 'policies',  label: t('compliance.tabs.policies'),  icon: FileCheck,       group: t('compliance.groups.security') },
    { id: 'nis2',      label: t('compliance.tabs.nis2'),      icon: ShieldAlert,     group: t('compliance.groups.regulations') },
    { id: 'aml',       label: t('compliance.tabs.aml'),       icon: Scale,           group: t('compliance.groups.regulations') },
    { id: 'bhp',       label: t('compliance.tabs.bhp'),       icon: HeartPulse,      group: t('compliance.groups.regulations') },
    { id: 'aiact',     label: t('compliance.tabs.aiact'),     icon: Zap,             group: t('compliance.groups.regulations') },
    { id: 'legal',     label: t('compliance.tabs.legal'),     icon: FileCheck,       group: t('compliance.groups.legal') },
  ];

  useEffect(() => {
    if (activeTenantId) {
      ComplianceScoreService.calculateAndSaveScore(activeTenantId, userData?.id || 'system')
        .then(setScoreData)
        .catch(console.error);
    }
  }, [activeTenantId, userData]);

  const groups = Array.from(new Set(TABS.map(t => t.group)));

  return (
    <div className="max-w-[1600px] mx-auto p-10 space-y-10 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-emerald-600 p-2 rounded-lg shadow-lg shadow-emerald-200">
              <ShieldCheck className="text-white" size={20} />
            </div>
            <h1 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">{t('compliance.title')}</h1>
          </div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] italic">{t('compliance.subtitle')}</p>
        </div>

        <div className="flex gap-4">
          <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 shadow-sm flex items-center gap-6">
            <div className="text-right">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{t('compliance.statusLabel')}</div>
              <div className={`text-xl font-black italic ${scoreData && scoreData.score >= 80 ? 'text-emerald-600' : scoreData && scoreData.score >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>
                {scoreData ? `${scoreData.score}%` : '...'}
              </div>
            </div>
            <div className="w-px h-10 bg-slate-100" />
            <div className="text-right">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{t('compliance.openRisks')}</div>
              <div className="text-xl font-black text-rose-500 italic">{scoreData ? scoreData.openIncidents : '...'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation - grouped */}
      <div className="space-y-3">
        {groups.map(group => (
          <div key={group} className="flex flex-wrap gap-2">
            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest self-center mr-2 w-20 text-right">{group}</span>
            {TABS.filter(t => t.group === group).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest ${
                  activeTab === tab.id
                    ? 'bg-slate-900 text-white shadow-xl'
                    : 'bg-slate-100 text-slate-500 hover:bg-white hover:text-slate-700 hover:shadow-md border border-slate-100'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        ))}

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button className="bg-slate-900 text-white px-10 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-100">
            <Plus size={16} /> {t('compliance.newIncident')}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        <Suspense fallback={<Loader />}>
          {activeTab === 'overview'  && <ComplianceOverview scoreData={scoreData} />}
          {activeTab === 'rodo'      && <RodoSection />}
          {activeTab === 'nis2'      && <Nis2Section />}
          {activeTab === 'aml'       && <AmlSection />}
          {activeTab === 'bhp'       && <BhpRegistry />}
          {activeTab === 'aiact'     && <AiInventoryAct />}
          {activeTab === 'isms'      && <IsmsModule />}
          {activeTab === 'dpia'      && <DpiaManager />}
          {activeTab === 'consent'   && <ConsentManager />}
          {activeTab === 'dsr'       && <DataSubjectRequests />}
          {activeTab === 'risk'      && <RiskRegister />}
          {activeTab === 'policies'  && <SecurityPolicies />}
          {activeTab === 'legal'     && <LegalVaultModule />}
        </Suspense>
      </div>
    </div>
  );
}

function ComplianceOverview({ scoreData }: { scoreData: ComplianceScoreResult | null }) {
  const { t } = useTranslation();
  const score = scoreData?.score ?? 0;
  const scoreColor = score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-rose-600';
  const scoreBar = score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
      <div className="lg:col-span-2 space-y-10">
        {/* Score Card */}
        <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm">
          <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter mb-6">{t('compliance.overview.scoreTitle')}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            {[
              { label: t('compliance.overview.scoreRodo'), value: '92%', color: 'text-emerald-600' },
              { label: t('compliance.overview.scoreNis2'), value: '78%', color: 'text-amber-600' },
              { label: t('compliance.overview.ismsStatus'), value: '85%', color: 'text-emerald-600' },
              { label: t('compliance.overview.overall'), value: `${score}%`, color: scoreColor },
            ].map((s, i) => (
              <div key={i} className="text-center p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{s.label}</div>
                <div className={`text-2xl font-black italic ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>
          <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden">
            <div className={`${scoreBar} h-full transition-all duration-1000`} style={{ width: `${score}%` }} />
          </div>
        </div>

        {/* Active Alerts */}
        <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">{t('compliance.overview.openIncidents')}</h3>
            <span className="bg-rose-50 text-rose-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase italic tracking-widest">{t('compliance.overview.actionRequired')}</span>
          </div>
          <div className="space-y-4">
            {[
              { id: 'INC-001', type: 'Data Breach', severity: 'Critical', time: '2h temu', desc: 'Nieautoryzowana próba pobrania bazy /customers' },
              { id: 'INC-002', type: 'RODO/DSR', severity: 'Medium', time: '1d temu', desc: 'Wniosek DSR (prawa do zapomnienia) — termin upływa za 3 dni' },
              { id: 'INC-003', type: 'Policy Gap', severity: 'Low', time: '3d temu', desc: 'Polityka haseł nie spełnia wymogów ISO 27001 A.9.3' },
            ].map(inc => (
              <div key={inc.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all">
                <div className="flex items-center gap-6">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${inc.severity === 'Critical' ? 'bg-rose-100 text-rose-600' : inc.severity === 'Medium' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                    <AlertTriangle size={22} />
                  </div>
                  <div>
                    <div className="text-sm font-black text-slate-900 italic uppercase">{inc.type}</div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{inc.desc}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-black text-slate-900">{inc.time}</div>
                  <button className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline">{t('compliance.overview.details')}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right sidebar */}
      <div className="space-y-10">
        <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
          <History className="text-emerald-400 mb-8" size={32} />
          <h5 className="text-xl font-black uppercase italic tracking-tighter mb-8">{t('compliance.overview.auditSchedule')}</h5>
          <div className="space-y-4">
            {[
              { date: '2026-05-15', label: 'Audyt NIS2', type: 'External' },
              { date: '2026-05-20', label: 'Przegląd RCPD', type: 'Internal' },
              { date: '2026-06-01', label: 'Testy Penetracyjne', type: 'Technical' },
              { date: '2026-06-15', label: 'Recertyfikacja ISO 27001', type: 'Certification' },
            ].map((event, i) => (
              <div key={i} className="flex items-center gap-6 p-4 bg-white/5 rounded-2xl border border-white/10">
                <div className="text-center min-w-[32px]">
                  <div className="text-[9px] font-black uppercase opacity-60">{event.date.split('-')[1]}/{event.date.split('-')[0].slice(2)}</div>
                  <div className="text-lg font-black">{event.date.split('-')[2]}</div>
                </div>
                <div className="flex-1">
                  <div className="text-[10px] font-black uppercase italic tracking-widest leading-none mb-1">{event.label}</div>
                  <div className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">{event.type}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-emerald-50 rounded-[3rem] p-10 border border-emerald-100 flex flex-col items-center text-center">
          <FileCheck size={48} className="text-emerald-500 mb-6" />
          <h6 className="text-lg font-black text-slate-900 uppercase italic mb-4">{t('compliance.overview.aiVerified')}</h6>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest max-w-[200px]">{t('compliance.overview.aiVerifiedDesc')}</p>
        </div>
      </div>
    </div>
  );
}
