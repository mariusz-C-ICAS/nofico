/**
 * Data: 2026-05-12
 * Zmiany: AML (Anti-Money Laundering) - Sanctions & PEP checks.
 * Ścieżka: /src/modules/compliance/components/AmlSection.tsx
 */
import React from 'react';
import { 
  Scale, ShieldCheck, Search, ShieldAlert, 
  UserCheck, AlertTriangle, ExternalLink,
  History, Download
} from 'lucide-react';

export default function AmlSection() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
       <div className="lg:col-span-8 space-y-8">
          <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm">
             <div className="flex justify-between items-center mb-10">
                <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Weryfikacja AML / KYC</h3>
                <div className="relative group">
                   <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-indigo-600 transition-colors" size={18} />
                   <input 
                      type="text" 
                      placeholder="SPRAWDŹ OSOBĘ / FIRMĘ..." 
                      className="bg-slate-50 border-2 border-transparent rounded-[2rem] pl-16 pr-8 py-4 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-indigo-600 focus:bg-white transition-all w-[300px]"
                   />
                </div>
             </div>

             <div className="space-y-4">
                <div className="grid grid-cols-12 gap-4 pb-4 border-b border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">
                   <div className="col-span-4">Podmiot</div>
                   <div className="col-span-3">Status List Sankcyjnych</div>
                   <div className="col-span-3">Status PEP</div>
                   <div className="col-span-2 text-right">Wynik</div>
                </div>

                {[
                   { name: 'John Doe Enterprise', sanctions: 'Not Listed', pep: 'No', risk: 'Low' },
                   { name: 'Alex Smith Consultants', sanctions: 'Not Listed', pep: 'Yes', risk: 'Medium' },
                   { name: 'Global Offshore Ltd', sanctions: 'Warning', pep: 'N/A', risk: 'High' }
                ].map((podmiot, i) => (
                   <div key={i} className="grid grid-cols-12 gap-4 p-6 bg-slate-50 rounded-2xl items-center border border-transparent hover:border-indigo-100 hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all group">
                      <div className="col-span-4 flex items-center gap-4">
                         <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-300">
                            <Scale size={18} />
                         </div>
                         <span className="text-sm font-black text-slate-900 italic uppercase">{podmiot.name}</span>
                      </div>
                      <div className="col-span-3">
                         <span className={`text-[10px] font-black uppercase italic ${podmiot.sanctions === 'Warning' ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {podmiot.sanctions}
                         </span>
                      </div>
                      <div className="col-span-3">
                         <span className={`text-[10px] font-black uppercase italic ${podmiot.pep === 'Yes' ? 'text-amber-600' : 'text-slate-400'}`}>
                            PEP: {podmiot.pep}
                         </span>
                      </div>
                      <div className="col-span-2 text-right">
                         <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                            podmiot.risk === 'Low' ? 'bg-emerald-50 text-emerald-600' :
                            podmiot.risk === 'Medium' ? 'bg-amber-50 text-amber-600' :
                            'bg-rose-50 text-rose-600 animate-pulse'
                         }`}>
                            {podmiot.risk} Risk
                         </span>
                      </div>
                   </div>
                ))}
             </div>
          </div>
       </div>

       <div className="lg:col-span-4 space-y-8">
          <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
             <History className="text-amber-400 mb-8" size={32} />
             <h5 className="text-xl font-black uppercase italic tracking-tighter mb-8">Audyt Weryfikacji</h5>
             <div className="space-y-4">
                {[
                   { date: '21:30', user: 'Admin', target: 'Acme Corp', status: 'OK' },
                   { date: '18:12', user: 'Admin', target: 'Global Ltd', status: 'Warning' },
                   { date: 'Wczoraj', user: 'Sales', target: 'John Doe', status: 'OK' }
                ].map((aud, i) => (
                   <div key={i} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/10">
                      <div>
                         <div className="text-[10px] font-black text-amber-400 uppercase italic leading-none mb-1">{aud.target}</div>
                         <div className="text-[8px] font-black text-white/40 uppercase tracking-widest">{aud.user} • {aud.date}</div>
                      </div>
                      <div className={`text-[10px] font-black uppercase tracking-widest ${aud.status === 'OK' ? 'text-emerald-400' : 'text-rose-400'}`}>{aud.status}</div>
                   </div>
                ))}
             </div>
             <button className="w-full mt-10 p-4 border border-white/10 rounded-2xl text-[9px] font-black uppercase tracking-widest text-white/60 hover:bg-white/5 hover:text-white transition-all flex items-center justify-center gap-2">
                <Download size={14} /> Eksportuj Rejestr
             </button>
          </div>
       </div>
    </div>
  );
}
