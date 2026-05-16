import React, { useState, useEffect } from 'react';
import { db } from '../../shared/lib/firebase';
import { collection, query, onSnapshot, orderBy, limit, where } from 'firebase/firestore';
import { useAuth } from '../../shared/hooks/AuthContext';
import { Leaf, Sprout, CloudRain, Sun, Calendar, Info, MapPin, ChevronRight, Flower2 } from 'lucide-react';

export default function GardeningModule() {
  const { activeTenantId } = useAuth();
  const [activeJobs, setActiveJobs] = useState<any[]>([]);

  useEffect(() => {
    if (!activeTenantId) return;
    const q = query(collection(db, 'projects'), where('tenantId', '==', activeTenantId), limit(4));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        setActiveJobs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, [activeTenantId]);

  return (
    <div className="flex flex-col gap-8 font-sans">
      <div className="bg-emerald-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:scale-110 transition-transform">
           <Leaf size={180} />
        </div>
        <div className="relative z-10">
           <div className="inline-flex items-center gap-2 bg-emerald-500/20 px-4 py-1.5 rounded-full border border-emerald-500/30 mb-6 backdrop-blur-md">
              <Sprout size={14} className="text-emerald-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Moduł Architektura Krajobrazu</span>
           </div>
           <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase leading-none mb-4">Garden <br/> Architect</h1>
           <p className="text-emerald-200/60 text-sm font-medium max-w-xl leading-relaxed italic">
              Zarządzanie nasadzeniami, systemami nawadniania i harmonogramem pielęgnacji sezonowej. 
           </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         <div className="md:col-span-3 bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
            <div className="flex justify-between items-center mb-10">
               <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-3">
                  <Flower2 size={24} className="text-emerald-600" /> Harmonogram Pielęgnacji
               </h3>
               <div className="flex gap-2">
                   <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-100">
                      <CloudRain size={14} /> Opady: 20%
                   </div>
                   <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-amber-100">
                      <Sun size={14} /> UV: Średnie
                   </div>
               </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               {activeJobs.map((job, idx) => (
                  <div key={idx} className="p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 hover:bg-white hover:shadow-xl transition-all group flex flex-col justify-between">
                     <div>
                        <div className="flex justify-between items-start mb-4">
                           <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
                              <MapPin size={20} />
                           </div>
                           <span className="text-[9px] font-black uppercase bg-emerald-100 text-emerald-700 px-2 py-1 rounded">Aktywny</span>
                        </div>
                        <h4 className="text-sm font-black text-slate-900 italic uppercase mb-1">{job.name}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest line-clamp-1">{job.description || 'Pielęgnacja trawnika i rabat'}</p>
                     </div>
                     <button className="mt-6 w-full py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:bg-emerald-900 group-hover:text-white group-hover:border-emerald-900 transition-all flex items-center justify-center gap-2">
                        Otwórz Kartę Pracy <ChevronRight size={14} />
                     </button>
                  </div>
               ))}
            </div>
         </div>

         <div className="grid grid-cols-1 gap-6">
            <div className="bg-slate-950 rounded-[2.5rem] p-8 text-white flex flex-col justify-between">
               <div>
                  <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-6">Narzędzia Operacyjne</h4>
                  <div className="space-y-3">
                     <QuickAction icon={<Calendar size={18}/>} label="Kalendarz Nasadzeń" />
                     <QuickAction icon={<Sprout size={18}/>} label="Magazyn Roślin" />
                     <QuickAction icon={<CloudRain size={18}/>} label="Kontrola Nawadniania" />
                  </div>
               </div>
            </div>
            
            <div className="bg-emerald-50 rounded-[2.5rem] p-8 border border-emerald-100">
               <Info className="text-emerald-700 mb-4" />
               <h4 className="text-xs font-black text-emerald-950 uppercase mb-2">Automatyka Nawadniania</h4>
               <p className="text-[10px] font-bold text-emerald-800 leading-relaxed uppercase tracking-tighter italic">
                  Zintegrowano z modułem Fleet-Sensor. Sprawdź poziom wilgotności gleby w sekcji Magazyn/Czujniki.
               </p>
            </div>
         </div>
      </div>
    </div>
  );
}

function QuickAction({ icon, label }: { icon: any, label: string }) {
   return (
      <button className="w-full flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white hover:text-emerald-900 transition-all font-black text-[10px] uppercase tracking-widest">
         <div className="p-2 bg-emerald-500 rounded-xl text-emerald-950">
            {icon}
         </div>
         {label}
      </button>
   )
}
