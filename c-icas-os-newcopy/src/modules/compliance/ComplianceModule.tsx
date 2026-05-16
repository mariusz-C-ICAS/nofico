/**
 * Data: 2026-05-12
 * Zmiany: Główny moduł Compliance (RODO, NIS2, AML, BHP, AI Act).
 * Ścieżka: /src/modules/compliance/ComplianceModule.tsx
 */
import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Lock, ShieldAlert,
  FileCheck, Zap, Scale, HeartPulse,
  LayoutDashboard, Plus,
  AlertTriangle, History
} from 'lucide-react';
import RodoSection from './components/RodoSection';
import Nis2Section from './components/Nis2Section';
import AmlSection from './components/AmlSection';
import BhpRegistry from './components/BhpRegistry';
import AiInventoryAct from './components/AiInventoryAct';
import { ComplianceScoreService, ComplianceScoreResult } from './services/ComplianceScoreService';
import { useAuth } from '../../shared/hooks/AuthContext';

type ComplianceTab = 'overview' | 'rodo' | 'nis2' | 'aml' | 'bhp' | 'aiact';

export default function ComplianceModule() {
  const { userData, activeTenantId } = useAuth();
  const [activeTab, setActiveTab] = useState<ComplianceTab>('overview');
  const [scoreData, setScoreData] = useState<ComplianceScoreResult | null>(null);

  useEffect(() => {
    if (activeTenantId) {
      ComplianceScoreService.calculateAndSaveScore(activeTenantId, userData?.id || 'system')
        .then(res => setScoreData(res))
        .catch(err => console.error(err));
    }
  }, [activeTenantId, userData]);

  return (
    <div className="max-w-[1600px] mx-auto p-10 space-y-10 animate-in fade-in duration-500">
      {/* Compliance Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
         <div>
            <div className="flex items-center gap-3 mb-2">
               <div className="bg-emerald-600 p-2 rounded-lg shadow-lg shadow-emerald-200">
                  <ShieldCheck className="text-white" size={20} />
               </div>
               <h1 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">Compliance & Fortress</h1>
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] italic">Zarządzanie Zgodnością NoFiCo V5</p>
         </div>

         <div className="flex gap-4">
            <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 shadow-sm flex items-center gap-6">
               <div className="text-right">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Status Zgodności</div>
                  <div className="text-xl font-black text-emerald-600 italic">
                    {scoreData ? `${scoreData.score}%` : '...'}
                  </div>
               </div>
               <div className="w-px h-10 bg-slate-100" />
               <div className="text-right">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Ryzyka Otwarte</div>
                  <div className="text-xl font-black text-rose-500 italic">
                    {scoreData ? scoreData.openIncidents : '...'}
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-100 pb-10">
         <div className="flex flex-wrap gap-2 p-2 bg-slate-100 rounded-[2.5rem] w-fit">
            {[
              { id: 'overview', label: 'Monitor', icon: LayoutDashboard },
              { id: 'rodo', label: 'RODO / GDPR', icon: Lock },
              { id: 'nis2', label: 'NIS2 / Cyber', icon: ShieldAlert },
              { id: 'aml', label: 'AML / KYC', icon: Scale },
              { id: 'bhp', label: 'BHP', icon: HeartPulse },
              { id: 'aiact', label: 'EU AI Act', icon: Zap }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-3 px-6 py-4 rounded-[2rem] transition-all text-[10px] font-black uppercase tracking-widest ${
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

         <div className="flex gap-4">
            <button className="bg-slate-900 text-white px-10 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-emerald-600 transition-all shadow-2xl shadow-emerald-100">
               <Plus size={18} /> Nowy Incydent
            </button>
         </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
         {activeTab === 'overview' && <ComplianceOverview />}
         {activeTab === 'rodo' && <RodoSection />}
         {activeTab === 'nis2' && <Nis2Section />}
         {activeTab === 'aml' && <AmlSection />}
         {activeTab === 'bhp' && <BhpRegistry />}
         {activeTab === 'aiact' && <AiInventoryAct />}
      </div>
    </div>
  );
}

function ComplianceOverview() {
   return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
         <div className="lg:col-span-2 space-y-10">
            {/* Active Alerts */}
            <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm">
               <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Otwarte Incydenty</h3>
                  <span className="bg-rose-50 text-rose-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase italic tracking-widest">Wymagana Akcja</span>
               </div>
               
               <div className="space-y-4">
                  {[
                     { id: 'INC-001', type: 'Data Breach', severity: 'Critical', time: '2h temu', desc: 'Nieautoryzowana próba pobrania bazy /customers' },
                     { id: 'INC-002', type: 'RODO', severity: 'Medium', time: '1d temu', desc: 'Wniosek DSR (prawa do zapomnienia) - termin upływa za 3 dni' },
                  ].map(inc => (
                     <div key={inc.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all group">
                        <div className="flex items-center gap-6">
                           <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${inc.severity === 'Critical' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                              <AlertTriangle size={24} />
                           </div>
                           <div>
                              <div className="text-sm font-black text-slate-900 italic uppercase">{inc.type}</div>
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{inc.desc}</div>
                           </div>
                        </div>
                        <div className="text-right">
                           <div className="text-xs font-black text-slate-900">{inc.time}</div>
                           <button className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Szczegóły →</button>
                        </div>
                     </div>
                  ))}
               </div>
            </div>

            {/* Compliance Progress */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {[
                  { label: 'Oceny DPIA', value: '8/8', progress: 100, status: 'Complete' },
                  { label: 'Szkolenia BHP', value: '142/150', progress: 94, status: 'In Progress' }
               ].map((stat, i) => (
                  <div key={i} className="bg-white p-10 rounded-[3rem] border border-slate-100">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{stat.label}</h4>
                     <div className="flex justify-between items-end mb-4">
                        <div className="text-3xl font-black text-slate-900 italic tracking-tighter">{stat.value}</div>
                        <div className="text-[10px] font-black text-emerald-600 uppercase italic tracking-widest">{stat.status}</div>
                     </div>
                     <div className="w-full bg-slate-50 h-3 rounded-full overflow-hidden">
                        <div className="bg-indigo-600 h-full transition-all" style={{ width: `${stat.progress}%` }}></div>
                     </div>
                  </div>
               ))}
            </div>
         </div>

         {/* Calendar of Controls */}
         <div className="space-y-10">
            <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
               <History className="text-emerald-400 mb-8" size={32} />
               <h5 className="text-xl font-black uppercase italic tracking-tighter mb-8">Harmonogram <br />Kontroli</h5>
               
               <div className="space-y-6">
                  {[
                     { date: '2026-05-15', label: 'Audyt NIS2', type: 'External' },
                     { date: '2026-05-20', label: 'Przegląd RCPD', type: 'Internal' },
                     { date: '2026-06-01', label: 'Testy Penetracyjne', type: 'Technical' }
                  ].map((event, i) => (
                     <div key={i} className="flex items-center gap-6 p-4 bg-white/5 rounded-2xl border border-white/10">
                        <div className="text-center">
                           <div className="text-[9px] font-black uppercase opacity-60">Maj</div>
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
               <h6 className="text-lg font-black text-slate-900 uppercase italic mb-4">Wszystkie systemy AI zweryfikowane</h6>
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest max-w-[200px]">Zgodność z EU AI Act zachowana (Low Risk profile).</p>
            </div>
         </div>
      </div>
   )
}
