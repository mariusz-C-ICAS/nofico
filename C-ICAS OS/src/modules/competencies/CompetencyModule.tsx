import React, { useState, useEffect } from 'react';
import { toast } from '../../shared/utils/toast';
import { Target, BookOpen, Sparkles, Settings2 } from 'lucide-react';
import IdesGenerateButton from '../../shared/components/IdesGenerateButton';
import CompetencyDictionary from './CompetencyDictionary';
import CompetencyArchitect from './CompetencyArchitect';
import { db } from '../../shared/lib/firebase';
import { collection, query, getDocs, limit, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../shared/hooks/AuthContext';

export default function CompetencyModule() {
  const { activeTenantId } = useAuth();
  const [activeTab, setActiveTab] = useState<'dictionary' | 'architect' | 'settings'>('dictionary');

  const [config, setConfig] = useState<{
    detailLevel: 'SIMPLE' | 'ADVANCED' | 'EXPERT';
    autoAiSync: boolean;
  }>({
    detailLevel: 'ADVANCED',
    autoAiSync: true
  });

  useEffect(() => {
    if (!activeTenantId) return;
    const fetchConfig = async () => {
      const q = query(collection(db, 'tenants', activeTenantId, 'competency_profile'), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const data = snap.docs[0].data();
        setConfig({
          detailLevel: data.managementLevel || 'ADVANCED',
          autoAiSync: data.isAiOptimized ?? true
        });
      }
    };
    fetchConfig();
  }, [activeTenantId]);

  const saveConfig = async (newConfig: typeof config) => {
    if (!activeTenantId) return;
    const q = query(collection(db, 'tenants', activeTenantId, 'competency_profile'), limit(1));
    const snap = await getDocs(q);
    const docData = { managementLevel: newConfig.detailLevel, isAiOptimized: newConfig.autoAiSync, updatedAt: serverTimestamp() };
    if (snap.empty) {
      await addDoc(collection(db, 'tenants', activeTenantId, 'competency_profile'), docData);
    } else {
      await updateDoc(doc(db, 'tenants', activeTenantId, 'competency_profile', snap.docs[0].id), docData);
    }
    setConfig(newConfig);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-8 py-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100"><Target size={24} /></div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">Baza Kompetencji</h1>
              <p className="text-sm font-medium text-slate-500">Zarządzaj modelem kompetencyjnym swojej organizacji</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <IdesGenerateButton moduleKey="hr" />
            <div className="flex bg-slate-100 p-1 rounded-2xl shadow-inner divide-x divide-slate-200">
              <button onClick={() => setActiveTab('dictionary')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'dictionary' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <BookOpen size={14} /> Słownik
              </button>
              <button onClick={() => setActiveTab('architect')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'architect' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-slate-500 hover:text-slate-700'}`}>
                <Sparkles size={14} /> AI Architekt
              </button>
              <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-slate-500 hover:text-slate-700'}`}>
                <Settings2 size={14} /> Konfiguracja
              </button>
            </div>
          </div>
        </div>

        {activeTab === 'dictionary' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aktywne Kompetencje</p>
              <p className="text-2xl font-black text-slate-800">124</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Poziom Zarządzania</p>
              <p className="text-2xl font-black text-indigo-600 uppercase">{config.detailLevel}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mapowanie Branżowe</p>
              <p className="text-2xl font-black text-slate-800">Dynamiczne</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Weryfikacja AI</p>
              <p className="text-2xl font-black text-emerald-600">Pełna</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-8">
        {activeTab === 'dictionary' && <CompetencyDictionary />}
        {activeTab === 'architect' && <CompetencyArchitect />}
        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <Settings2 className="text-indigo-600" size={24} />
                <h2 className="text-xl font-black text-slate-800">Ustawienia Modelu</h2>
              </div>
              <div className="space-y-10">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Poziom Szczegółowości Bazy</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {(['SIMPLE', 'ADVANCED', 'EXPERT'] as const).map(level => (
                      <button
                        key={level}
                        onClick={() => saveConfig({ ...config, detailLevel: level })}
                        className={`p-5 rounded-2xl border-2 transition-all text-left ${config.detailLevel === level ? 'border-indigo-600 bg-indigo-50 shadow-lg shadow-indigo-50' : 'border-slate-100 hover:border-slate-200 bg-white'}`}
                      >
                        <p className={`text-[11px] font-black uppercase tracking-widest ${config.detailLevel === level ? 'text-indigo-600' : 'text-slate-400'}`}>
                          {level === 'SIMPLE' ? 'Prosty' : level === 'ADVANCED' ? 'Zaawansowany' : 'Ekspercki'}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-2 font-medium leading-relaxed">
                          {level === 'SIMPLE' ? 'Tylko nazwy i opisy ogólne.' : level === 'ADVANCED' ? 'Poziomy biegłości i wskaźniki.' : 'Pełna matryca zachowań i norm.'}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between p-6 bg-slate-50 border border-slate-100 rounded-2xl">
                   <div>
                      <p className="text-sm font-black text-slate-800">Automatyczna Synchronizacja AI</p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">Automatycznie analizuj kompetencje przy dodawaniu pracowników.</p>
                   </div>
                   <button
                    onClick={() => saveConfig({ ...config, autoAiSync: !config.autoAiSync })}
                    className={`w-14 h-8 rounded-full transition-all relative ${config.autoAiSync ? 'bg-emerald-500' : 'bg-slate-300'}`}
                   >
                     <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${config.autoAiSync ? 'left-7' : 'left-1'}`} />
                   </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-sm space-y-6">
               <div className="flex items-center gap-3">
                  <Sparkles className="text-amber-500" size={24} />
                  <h3 className="text-lg font-black text-slate-800">Baza Master & Branże</h3>
               </div>
               <p className="text-xs text-slate-500 font-medium leading-relaxed">Pobierz predefiniowane katalogi kompetencji dla konkretnych sektorów.</p>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <button
                   onClick={async () => {
                     const { seedMasterCompetencies } = await import('../hr/utils/seedCompetencies');
                     await seedMasterCompetencies();
                     toast.success('Baza Master została zasilona wzorcowymi danymi.');
                   }}
                   className="px-6 py-4 bg-white border-2 border-indigo-100 text-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                 >
                   Inicjalizuj Kompetencje Master
                 </button>
                 <button
                   onClick={async () => {
                     const { seedIndustries } = await import('./utils/seedIndustries');
                     await seedIndustries();
                     toast.success('Słownik Branż i Sektorów został zaktualizowany.');
                   }}
                   className="px-6 py-4 bg-white border-2 border-emerald-100 text-emerald-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                 >
                   Inicjalizuj Słownik Branż
                 </button>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
