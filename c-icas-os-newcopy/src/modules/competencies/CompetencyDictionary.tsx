import React, { useState, useEffect } from 'react';
import { db } from '../../shared/lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, getDocs, limit } from 'firebase/firestore';
import { useAuth } from '../../shared/hooks/AuthContext';
import { useTranslation } from 'react-i18next';
import { Search, Filter, ShieldCheck, Zap, Layers, Trash2, ChevronRight, Star, Info, ListTree, MoreVertical, LayoutGrid as Grid, Globe } from 'lucide-react';

export default function CompetencyDictionary() {
  const { activeTenantId } = useAuth();
  const { i18n } = useTranslation();
  const [competencies, setCompetencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [selectedComp, setSelectedComp] = useState<any>(null);

  useEffect(() => {
    if (!activeTenantId) return;

    const q = query(collection(db, 'tenants', activeTenantId, 'competencies'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setCompetencies(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return unsubscribe;
  }, [activeTenantId]);

  const lang = i18n.language === 'pl' ? 'pl' : 'en';

  const getLocalized = (field: any) => {
    if (typeof field === 'object' && field !== null) {
      return field[lang] || field.pl || field.en || '';
    }
    return field || '';
  };

  const toggleStatus = async (id: string, current: boolean) => {
    if (!activeTenantId) return;
    await updateDoc(doc(db, 'tenants', activeTenantId, 'competencies', id), {
      isActive: !current
    });
  };

  const deleteComp = async (id: string) => {
    if (!activeTenantId || !confirm('Czy na pewno chcesz usunąć tę kompetencję?')) return;
    try {
      await deleteDoc(doc(db, 'tenants', activeTenantId, 'competencies', id));
      if (selectedComp?.id === id) setSelectedComp(null);
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = competencies.filter(c => {
    const name = getLocalized(c.name);
    const desc = getLocalized(c.description);
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          desc.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'ALL' || c.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 text-slate-400 gap-4">
      <Zap className="animate-pulse text-indigo-500" size={48} />
      <p className="text-sm font-black uppercase tracking-widest">Inicjalizacja Słownika...</p>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Main List */}
      <div className="flex-1 space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="Szukaj kompetencji..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold placeholder:text-slate-300 outline-none focus:border-indigo-500 transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {['ALL', 'SOFT', 'TECHNICAL', 'LEADERSHIP', 'DOMAIN'].map(cat => (
              <button 
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  filterCategory === cat ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat === 'ALL' ? 'Wszystkie' : cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(comp => (
            <div 
              key={comp.id} 
              onClick={() => setSelectedComp(comp)}
              className={`p-6 rounded-3xl border transition-all cursor-pointer group ${
                selectedComp?.id === comp.id ? 'border-indigo-600 bg-indigo-50/30' : 'bg-white border-slate-200 hover:border-indigo-300'
              }`}
            >
               <div className="flex justify-between items-start mb-3">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                    comp.category === 'TECHNICAL' ? 'bg-blue-100 text-blue-600' : 
                    comp.category === 'SOFT' ? 'bg-emerald-100 text-emerald-600' : 
                    'bg-indigo-100 text-indigo-600'
                  }`}>
                    {comp.category}
                  </span>
                  {comp.isAiGenerated && <div className="text-amber-500" title="AI Support"><Zap size={12} /></div>}
               </div>
               <h3 className="text-sm font-black text-slate-800 mb-1">
                 {getLocalized(comp.name)}
               </h3>
               <p className="text-xs text-slate-500 line-clamp-2 mb-4 font-medium italic">
                 {getLocalized(comp.description)}
               </p>
               <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(lv => (
                      <div key={lv} className={`w-3 h-1.5 rounded-full ${comp.proficiencyLevels?.length >= lv ? 'bg-indigo-500' : 'bg-slate-100'}`} />
                    ))}
                    <span className="ml-2 text-[10px] font-bold text-slate-400">Levels: {comp.proficiencyLevels?.length || 0}</span>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
               </div>
            </div>
          ))}
        </div>
      </div>

      {/* Details Sidebar / Panel */}
      <div className="w-full lg:w-96 shrink-0">
        {selectedComp ? (
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-xl sticky top-8 sticky-nav animate-in slide-in-from-right-4">
             <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                   <ShieldCheck size={24} />
                </div>
                <div>
                   <h2 className="text-lg font-black text-slate-800 leading-none">
                     {getLocalized(selectedComp.name)}
                   </h2>
                   <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mt-1">{selectedComp.category}</p>
                </div>
             </div>

             <div className="mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1">
                   <Info size={12} /> Definicja
                </h4>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {getLocalized(selectedComp.description)}
                </p>
             </div>

             <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-1">
                   <ListTree size={12} /> Matryca Biegłości
                </h4>
                {selectedComp.proficiencyLevels?.map((pl: any, idx: number) => (
                  <div key={idx} className="relative pl-6 border-l-2 border-slate-100 pb-4 last:pb-0">
                    <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-slate-200 border border-white" />
                    <div className="flex items-center justify-between mb-1">
                       <span className="text-[10px] font-black text-slate-900">POZIOM {pl.level}</span>
                       <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">{getLocalized(pl.label)}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium">
                      {getLocalized(pl.behavior) || 'Brak zdefiniowanego wskaźnika zachowań dla tego poziomu.'}
                    </p>
                  </div>
                ))}
             </div>

             <div className="mt-10 flex gap-3">
                <button className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-slate-200">
                   Edytuj Matrycę
                </button>
                <button 
                  onClick={() => deleteComp(selectedComp.id)}
                  className="w-12 h-12 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-100 transition-colors"
                >
                   <Trash2 size={18} />
                </button>
             </div>
          </div>
        ) : (
          <div className="h-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center p-12 text-center opacity-50">
             <Grid className="text-slate-200 mb-4" size={64} />
             <p className="text-sm font-black uppercase tracking-widest text-slate-400">Wybierz kompetencję,<br/>aby zobaczyć szczegóły</p>
          </div>
        )}
      </div>
    </div>
  );
}
