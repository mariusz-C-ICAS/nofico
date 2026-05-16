/**
 * Data: 2026-05-12
 * Zmiany: Moduł zarządzania urlopami i nieobecnościami.
 * Ścieżka: /src/modules/hr/LeaveManagement.tsx
 */
import React from 'react';
import { 
  Calendar, CheckCircle2, XCircle, Clock, 
  MapPin, Coffee, Plane, Heart, Plus
} from 'lucide-react';
import { motion } from 'motion/react';

export default function LeaveManagement() {
  const leaveRequests = [
    { id: 'LR-01', emp: 'Marek Zając', type: 'Wypoczynkowy', from: '2026-05-20', to: '2026-05-30', days: 8, status: 'pending' },
    { id: 'LR-02', emp: 'Adam Kowalski', type: 'Chorobowy (L4)', from: '2026-05-10', to: '2026-05-14', days: 5, status: 'approved' },
    { id: 'LR-03', emp: 'Katarzyna Wilk', type: 'Opieka nad dzieckiem', from: '2026-06-01', to: '2026-06-01', days: 1, status: 'denied' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 animate-in fade-in duration-700">
       <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10">
             <div className="flex justify-between items-center mb-10">
                <div>
                   <h4 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Wnioski Urlopowe</h4>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Oczekujące na zatwierdzenie (Maj 2026)</p>
                </div>
                <button className="bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-rose-600 transition-all">
                   <Plus size={14} /> Nowy Wniosek
                </button>
             </div>

             <div className="space-y-4">
                {leaveRequests.map(req => (
                  <div key={req.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all group">
                     <div className="flex items-center gap-6">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                          req.type === 'Wypoczynkowy' ? 'bg-emerald-50 text-emerald-500' : 
                          req.type === 'Chorobowy (L4)' ? 'bg-rose-50 text-rose-500' : 'bg-amber-50 text-amber-500'
                        }`}>
                           {req.type === 'Wypoczynkowy' ? <Plane size={24} /> : 
                            req.type === 'Chorobowy (L4)' ? <Heart size={24} /> : <Coffee size={24} />}
                        </div>
                        <div>
                           <div className="text-[12px] font-black text-slate-900 uppercase italic mb-1">{req.emp}</div>
                           <div className="flex items-center gap-3">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{req.from} - {req.to}</span>
                              <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded uppercase">{req.days} dni</span>
                           </div>
                        </div>
                     </div>

                     <div className="flex items-center gap-3">
                        {req.status === 'pending' ? (
                          <div className="flex gap-2">
                             <button className="bg-emerald-500 text-white p-3 rounded-xl hover:scale-110 transition-transform">
                                <CheckCircle2 size={18} />
                             </button>
                             <button className="bg-white border border-slate-200 text-slate-400 p-3 rounded-xl hover:text-rose-500 transition-all">
                                <XCircle size={18} />
                             </button>
                          </div>
                        ) : (
                          <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                            req.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                          }`}>
                             {req.status === 'approved' ? 'Zatwierdzony' : 'Odrzucony'}
                          </div>
                        )}
                     </div>
                  </div>
                ))}
             </div>
          </div>
       </div>

       <div className="space-y-8">
          <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
             <Calendar className="text-rose-500 mb-6" size={32} />
             <h5 className="text-2xl font-black uppercase italic tracking-tighter mb-4 leading-tight">Kalendarz <br />Nieobecności</h5>
             <div className="grid grid-cols-7 gap-1 mb-8 opacity-40">
                {Array.from({ length: 31 }).map((_, i) => (
                  <div key={i} className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-[10px] font-black">
                     {i + 1}
                  </div>
                ))}
             </div>
             <button className="w-full bg-white text-slate-900 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all">
                Widok Pełnoekranowy
             </button>
          </div>

          <div className="bg-white rounded-[3rem] border border-slate-100 p-8 shadow-sm">
             <h5 className="text-sm font-black text-slate-900 uppercase italic mb-6">Limity Urlopowe</h5>
             <div className="space-y-6">
                <div>
                   <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase italic">Pozostało ogółem</span>
                      <span className="text-xs font-black text-slate-900 italic">420 dni</span>
                   </div>
                   <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full w-[65%]"></div>
                   </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                   <Clock size={20} className="text-amber-500 flex-shrink-0" />
                   <p className="text-[9px] font-black text-amber-900 uppercase italic leading-relaxed">
                      Wykryto 3 wnioski blisko terminu przedawnienia urlopu (30.09).
                   </p>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
}
