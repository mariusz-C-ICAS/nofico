import React, { useState, useEffect } from 'react';
import { db } from '../../shared/lib/firebase';
import { collection, query, onSnapshot, orderBy, limit, where } from 'firebase/firestore';
import { useAuth } from '../../shared/hooks/AuthContext';
import { HardHat, Ruler, Map, Construction, Info, AlertCircle, CheckCircle2, ChevronRight, Briefcase } from 'lucide-react';

export default function ConstructionModule() {
  const { activeTenantId } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    if (!activeTenantId) return;
    const q = query(collection(db, 'projects'), where('tenantId', '==', activeTenantId), limit(5));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, [activeTenantId]);

  return (
    <div className="flex flex-col gap-8 font-sans">
      <div className="bg-amber-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:scale-110 transition-transform">
           <Construction size={180} />
        </div>
        <div className="relative z-10">
           <div className="inline-flex items-center gap-2 bg-amber-500/20 px-4 py-1.5 rounded-full border border-amber-500/30 mb-6 backdrop-blur-md">
              <HardHat size={14} className="text-amber-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">Moduł Budownictwo & Wykończenia</span>
           </div>
           <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase leading-none mb-4">Site <br/> Commander</h1>
           <p className="text-amber-200/60 text-sm font-medium max-w-xl leading-relaxed italic">
              Zarządzanie placem budowy, obmiary, dziennik prac i kontrola zużycia materiałów w czasie rzeczywistym.
           </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
               <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter mb-8 flex items-center gap-3">
                  <Map size={24} className="text-amber-600" /> Aktywne Fronty Robót
               </h3>
               <div className="space-y-4">
                  {tasks.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 font-bold uppercase text-xs">Brak aktywnych projektów budowlanych</div>
                  ) : tasks.map((t, idx) => (
                    <div key={idx} className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-100 hover:bg-white hover:shadow-xl transition-all group">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-amber-900 group-hover:text-white transition-all shadow-sm">
                             <Briefcase size={22} />
                          </div>
                          <div>
                             <div className="text-sm font-black text-slate-900 italic tracking-tight">{t.name}</div>
                             <div className="text-[10px] font-bold text-slate-400 uppercase">Status: Operacyjny</div>
                          </div>
                       </div>
                       <ChevronRight className="text-slate-300 group-hover:text-amber-600 transition-colors" />
                    </div>
                  ))}
               </div>
            </div>
         </div>

         <div className="space-y-6">
            <div className="bg-slate-950 rounded-[2.5rem] p-8 text-white">
               <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-6">Szybkie Akcje Działu</h4>
               <div className="grid grid-cols-1 gap-3">
                  <ActionButton icon={<Ruler size={18}/>} label="Nowy Obmiar" />
                  <ActionButton icon={<AlertCircle size={18}/>} label="Zgłoś Usterkę" />
                  <ActionButton icon={<CheckCircle2 size={18}/>} label="Odbiór Etapu" />
               </div>
            </div>

            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm relative overflow-hidden group">
               <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
                  <Info size={120} />
               </div>
               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Standardy Jakości</h4>
               <p className="text-xs font-bold text-slate-600 italic leading-relaxed">
                  System automatycznie sprawdza czy użyte materiały posiadają atesty ITB i są zgodne z projektem wykonawczym.
               </p>
            </div>
         </div>
      </div>
    </div>
  );
}

function ActionButton({ icon, label }: { icon: any, label: string }) {
   return (
      <button className="w-full flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white hover:text-slate-900 transition-all font-black text-[10px] uppercase tracking-widest">
         <div className="p-2 bg-amber-500 rounded-xl text-slate-900">
            {icon}
         </div>
         {label}
      </button>
   )
}
