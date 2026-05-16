import React, { useState, useEffect } from 'react';
import { db } from '../../shared/lib/firebase';
import { collection, query, onSnapshot, orderBy, limit, where } from 'firebase/firestore';
import { useAuth } from '../../shared/hooks/AuthContext';
import { Sparkles, Trash2, Droplets, ShieldCheck, ClipboardList, Info, MapPin, ChevronRight, Calculator } from 'lucide-react';

export default function CleaningModule() {
  const { activeTenantId } = useAuth();
  const [contracts, setContracts] = useState<any[]>([]);

  useEffect(() => {
    if (!activeTenantId) return;
    const q = query(collection(db, 'projects'), where('tenantId', '==', activeTenantId), limit(3));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        setContracts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, [activeTenantId]);

  return (
    <div className="flex flex-col gap-8 font-sans">
      <div className="bg-sky-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:scale-110 transition-transform">
           <Sparkles size={180} />
        </div>
        <div className="relative z-10">
           <div className="inline-flex items-center gap-2 bg-sky-500/20 px-4 py-1.5 rounded-full border border-sky-500/30 mb-6 backdrop-blur-md">
              <ShieldCheck size={14} className="text-sky-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-400">Moduł Cleaning & Maintenance</span>
           </div>
           <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase leading-none mb-4">Clean <br/> Protocol</h1>
           <p className="text-sky-200/60 text-sm font-medium max-w-xl leading-relaxed italic">
              Zarządzanie ekipami sprzątającymi, kontrola jakości (Audit) i ewidencja zużycia chemii profesjonalnej.
           </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
         <div className="md:col-span-8 space-y-6">
            <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
               <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter mb-8 flex items-center gap-3">
                  <ClipboardList size={24} className="text-sky-600" /> Obiekty pod Opieką
               </h3>
               <div className="space-y-4">
                  {contracts.map((obj, idx) => (
                    <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-100 hover:bg-white hover:shadow-xl transition-all group gap-4">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-sky-600 shadow-sm group-hover:bg-sky-900 group-hover:text-white transition-all">
                             <MapPin size={22} />
                          </div>
                          <div>
                             <div className="text-sm font-black text-slate-900 italic tracking-tight">{obj.name}</div>
                             <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ostatni Serwis: 2 dni temu</div>
                          </div>
                       </div>
                       <div className="flex items-center gap-6">
                          <div className="text-right hidden sm:block">
                             <div className="text-xs font-black text-slate-800 uppercase italic">SLA: 99.8%</div>
                             <div className="text-[9px] text-emerald-500 font-black uppercase tracking-widest">W normie</div>
                          </div>
                          <button className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 group-hover:text-sky-600 group-hover:border-sky-600 transition-all">
                             <ChevronRight size={18} />
                          </button>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
         </div>

         <div className="md:col-span-4 flex flex-col gap-6">
            <div className="bg-slate-950 rounded-[2.5rem] p-8 text-white">
               <h4 className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-6">Quick Tools</h4>
               <div className="space-y-3">
                  <ActionBtn icon={<Sparkles size={18}/>} label="Nowy Audit Jakości" />
                  <ActionBtn icon={<Droplets size={18}/>} label="Uzupełnij Wyposażenie" />
                  <ActionBtn icon={<Calculator size={18}/>} label="Wycena Obiektu" />
               </div>
            </div>

            <div className="bg-sky-50 rounded-[2.5rem] p-8 border border-sky-100 relative overflow-hidden group">
               <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
                  <Trash2 size={120} />
               </div>
               <h4 className="text-[10px] font-black text-sky-800 uppercase tracking-widest mb-4">Utylizacja Odpadów</h4>
               <p className="text-[10px] font-bold text-sky-700 leading-relaxed uppercase tracking-tighter italic">
                  Pamiętaj o segregacji zgodnie z kartą charakterystyki odpadów dostępną w Module Safety.
               </p>
            </div>
         </div>
      </div>
    </div>
  );
}

function ActionBtn({ icon, label }: { icon: any, label: string }) {
   return (
      <button className="w-full flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white hover:text-sky-900 transition-all font-black text-[10px] uppercase tracking-widest text-left">
         <div className="p-2 bg-sky-500 rounded-xl text-sky-950">
            {icon}
         </div>
         {label}
      </button>
   )
}
