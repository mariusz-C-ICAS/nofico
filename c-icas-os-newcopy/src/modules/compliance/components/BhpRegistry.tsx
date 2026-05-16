/**
 * Data: 2026-05-12
 * Zmiany: BHP Rejestr i Scheduler szkoleń.
 * Ścieżka: /src/modules/compliance/components/BhpRegistry.tsx
 */
import React from 'react';
import { 
  HeartPulse, GraduationCap, Calendar, AlertTriangle, 
  CheckCircle2, Plus, ArrowUpRight, History
} from 'lucide-react';

export default function BhpRegistry() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
       <div className="lg:col-span-8 space-y-10">
          <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm">
             <div className="flex justify-between items-center mb-10">
                <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Szkolenia BHP pracowników</h3>
                <button className="bg-emerald-600 text-white px-8 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all flex items-center gap-2">
                   <Plus size={16} /> Nowe Szkolenie
                </button>
             </div>

             <div className="space-y-4">
                {[
                   { name: 'Adam Nowak', dept: 'Produkcja', type: 'Wstępne', expiry: '2027-05-12', status: 'Valid' },
                   { name: 'Ewa Kowalska', dept: 'Biuro', type: 'Okresowe', expiry: '2026-06-10', status: 'Expiring Soon' },
                   { name: 'Jan Zieliński', dept: 'Logistyka', type: 'P-POŻ', expiry: '2026-05-01', status: 'Expired' }
                ].map((emp, i) => (
                   <div key={i} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all group">
                      <div className="flex-1 grid grid-cols-4 gap-6 items-center">
                         <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-300">
                               <GraduationCap size={20} />
                            </div>
                            <span className="text-sm font-black text-slate-900 italic uppercase">{emp.name}</span>
                         </div>
                         <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{emp.dept}</div>
                         <div>
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ważne do</div>
                            <div className="text-[10px] font-black text-slate-700 italic">{emp.expiry}</div>
                         </div>
                         <div className="text-right">
                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                               emp.status === 'Valid' ? 'bg-emerald-50 text-emerald-600' :
                               emp.status === 'Expired' ? 'bg-rose-50 text-rose-600' :
                               'bg-amber-50 text-amber-600 animate-pulse'
                            }`}>
                               {emp.status}
                            </span>
                         </div>
                      </div>
                   </div>
                ))}
             </div>
          </div>

          <div className="bg-rose-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
             <AlertTriangle className="text-rose-400 mb-8" size={32} />
             <h4 className="text-2xl font-black uppercase italic tracking-tighter mb-4">Rejestr Wypadków</h4>
             <p className="text-[10px] font-black text-rose-300 uppercase tracking-widest mb-8 italic">Brak zarejestrowanych incydentów w ostatnich 365 dniach.</p>
             <button className="bg-white/10 border border-white/20 text-white px-10 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all">Generuj Raport Roczny</button>
          </div>
       </div>

       <div className="lg:col-span-4 space-y-10">
          <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm">
             <Calendar size={32} className="text-indigo-600 mb-6" />
             <h5 className="text-lg font-black text-slate-900 uppercase italic mb-6">Nadchodzące Szkolenia</h5>
             <div className="space-y-6">
                {[
                   { date: '15 Maj', title: 'Podstawy P-POŻ', attendees: 12 },
                   { date: '22 Maj', title: 'Ergonomia Biurowa', attendees: 5 },
                   { date: '02 Cze', title: 'Pierwsza Pomoc', attendees: 20 }
                ].map((event, i) => (
                   <div key={i} className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-[10px] font-black text-center leading-none">
                         {event.date.split(' ')[0]} <br /> {event.date.split(' ')[1]}
                      </div>
                      <div>
                         <div className="text-[11px] font-black text-slate-900 uppercase italic mb-1">{event.title}</div>
                         <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">{event.attendees} uczestników</div>
                      </div>
                   </div>
                ))}
             </div>
          </div>

          <div className="bg-indigo-600 rounded-[3rem] p-10 text-white shadow-xl shadow-indigo-100">
             <HeartPulse className="text-indigo-200 mb-6" size={32} />
             <h6 className="text-xl font-black uppercase italic mb-4">Przeglądy Lekarskie</h6>
             <div className="flex justify-between items-end">
                <div className="text-4xl font-black italic">100%</div>
                <div className="text-[10px] font-black uppercase opacity-60 italic tracking-widest">Wszyscy aktualni</div>
             </div>
          </div>
       </div>
    </div>
  );
}
