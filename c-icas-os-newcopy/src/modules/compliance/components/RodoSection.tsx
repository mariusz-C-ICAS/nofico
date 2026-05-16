/**
 * Data: 2026-05-12
 * Zmiany: Zarządzanie RODO/GDPR (RCPD, DPIA, DSR).
 * Ścieżka: /src/modules/compliance/components/RodoSection.tsx
 */
import React from 'react';
import { 
  Lock, FileText, UserMinus, ShieldCheck, 
  Download, Plus, Search, ChevronRight,
  AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';

export default function RodoSection() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
       {/* RCPD - Register of Processing Activities */}
       <div className="lg:col-span-8 space-y-8">
          <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm">
             <div className="flex justify-between items-center mb-10">
                <div>
                   <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter mb-2">RCPD (Rejestr Czynności)</h3>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Inventory of Personal Data Processing</p>
                </div>
                <button className="bg-slate-100 text-slate-900 px-8 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2">
                   <Plus size={16} /> Dodaj Czynność
                </button>
             </div>

             <div className="space-y-4">
                {[
                  { id: 'RCPD-01', name: 'Zarządzanie Kadrami', owner: 'HR Dept', basis: 'Art. 6 ust. 1 lit. c', risk: 'Low' },
                  { id: 'RCPD-02', name: 'Obsługa Klienta (CRM)', owner: 'Sales Dept', basis: 'Art. 6 ust. 1 lit. b', risk: 'Medium' },
                  { id: 'RCPD-03', name: 'Marketing/Newsletter', owner: 'Marketing', basis: 'Art. 6 ust. 1 lit. a', risk: 'Low' },
                  { id: 'RCPD-04', name: 'Monitoring Wizyjny', owner: 'Security', basis: 'Art. 6 ust. 1 lit. f', risk: 'High' }
                ].map(item => (
                  <div key={item.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all group">
                     <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
                        <div>
                           <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">{item.id}</div>
                           <div className="text-sm font-black text-slate-900 italic uppercase">{item.name}</div>
                        </div>
                        <div>
                           <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Właściciel</div>
                           <div className="text-[10px] font-black text-slate-700">{item.owner}</div>
                        </div>
                        <div>
                           <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Podstawa</div>
                           <div className="text-[10px] font-black text-slate-500 whitespace-nowrap">{item.basis}</div>
                        </div>
                        <div className="flex justify-end">
                           <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                             item.risk === 'High' ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                             item.risk === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                             'bg-emerald-50 text-emerald-600 border-emerald-100'
                           }`}>
                              {item.risk} Risk
                           </span>
                        </div>
                     </div>
                     <button className="ml-8 text-slate-200 hover:text-indigo-600 transition-colors">
                        <ChevronRight size={20} />
                     </button>
                  </div>
                ))}
             </div>
          </div>
       </div>

       {/* DSR & DPIA sidebar */}
       <div className="lg:col-span-4 space-y-8">
          {/* DSR Workflow */}
          <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500 rounded-full blur-[100px] opacity-20"></div>
             <UserMinus className="text-indigo-400 mb-8" size={32} />
             <h4 className="text-xl font-black uppercase italic tracking-tighter mb-8 text-white">Wnioski DSR</h4>
             
             <div className="space-y-4">
                {[
                  { id: 'DSR-22', status: 'Pending', daysLeft: 4, type: 'Right to Be Forgotten' },
                  { id: 'DSR-23', status: 'In Review', daysLeft: 12, type: 'Access Request' }
                ].map(dsr => (
                  <div key={dsr.id} className="p-6 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                     <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest italic">{dsr.id}</span>
                        <span className="text-[9px] font-black uppercase italic text-amber-400">{dsr.status}</span>
                     </div>
                     <div className="text-[11px] font-black uppercase italic mb-3">{dsr.type}</div>
                     <div className="flex items-center gap-2">
                        <div className="flex-1 bg-white/5 h-1.5 rounded-full overflow-hidden">
                           <div className="bg-rose-500 h-full w-[40%]"></div>
                        </div>
                        <span className="text-[9px] font-black uppercase italic opacity-60">{dsr.daysLeft} dni</span>
                     </div>
                  </div>
                ))}
             </div>
             
             <button className="w-full mt-8 py-5 rounded-[1.5rem] bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-900/40">
                Otwórz Panel Wniosków
             </button>
          </div>

          {/* DPIA Auto-Builder (Gemini) */}
          <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm">
             <ShieldCheck size={32} className="text-emerald-500 mb-6" />
             <h5 className="text-lg font-black text-slate-900 uppercase italic mb-4">DPIA Gemini AI</h5>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8 leading-relaxed">Automatyczna ocena skutków przetwarzania (DPIA) dla nowych procesów z wykorzystaniem modeli Gemini.</p>
             
             <button className="w-full py-5 rounded-2xl border-2 border-dashed border-slate-100 text-slate-300 hover:text-emerald-600 hover:border-emerald-100 hover:bg-emerald-50 transition-all flex items-center justify-center gap-3">
                <Plus size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest">Nowa Ocena AI</span>
             </button>
          </div>
       </div>
    </div>
  );
}
