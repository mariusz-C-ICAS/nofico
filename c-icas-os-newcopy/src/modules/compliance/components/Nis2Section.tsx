/**
 * Data: 2026-05-12
 * Zmiany: Zarządzanie NIS2 (Cybersecurity Assets, Risks, Incidents).
 * Ścieżka: /src/modules/compliance/components/Nis2Section.tsx
 */
import React from 'react';
import { 
  ShieldAlert, ShieldCheck, Zap, Database, 
  Activity, BarChart3, AlertCircle, Eye,
  Lock, Key, Globe
} from 'lucide-react';

export default function Nis2Section() {
  return (
    <div className="space-y-10">
       {/* Asset Inventory & Status */}
       <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
             { label: 'Systemy Krytyczne', value: '12', icon: Database, color: 'text-indigo-600', bg: 'bg-indigo-50' },
             { label: 'Aktywne Kontrole', value: '154', icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
             { label: 'Zagrożenia 24h', value: '0', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
             { label: 'Incydenty NIS2', value: '1', icon: ShieldAlert, color: 'text-rose-600', bg: 'bg-rose-50' },
          ].map((stat, i) => (
             <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center text-center">
                <div className={`w-14 h-14 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center mb-6`}>
                   <stat.icon size={28} />
                </div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">{stat.label}</div>
                <div className="text-3xl font-black text-slate-900 italic tracking-tighter">{stat.value}</div>
             </div>
          ))}
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Critical Assets List */}
          <div className="lg:col-span-12">
             <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm">
                <div className="flex justify-between items-center mb-10">
                   <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Inwentarz Zasobów NIS2</h3>
                   <div className="flex gap-4">
                      <button className="bg-slate-900 text-white px-8 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all">Skanuj Infrastrukturę</button>
                   </div>
                </div>

                <div className="overflow-x-auto">
                   <table className="w-full text-left">
                      <thead>
                         <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic border-b border-slate-100">
                            <th className="pb-6 px-4">Nazwa Systemu / Zasobu</th>
                            <th className="pb-6 px-4">Krytyczność</th>
                            <th className="pb-6 px-4">Status Zabezpieczeń</th>
                            <th className="pb-6 px-4">Właściciel</th>
                            <th className="pb-6 px-4 text-right">Akcje</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                         {[
                            { name: 'Core ERP / Finance', crit: 'Critical', status: 'Protected', owner: 'M. Czaja', icon: Database },
                            { name: 'Customer Identity Server', crit: 'High', status: 'Vulnerable (2)', owner: 'IT Security', icon: Lock },
                            { name: 'Cloud API Gateway', crit: 'High', status: 'Protected', owner: 'DevOps', icon: Globe },
                            { name: 'Production DB (Replicated)', crit: 'Critical', status: 'Protected', owner: 'M. Czaja', icon: Key }
                         ].map((asset, i) => (
                            <tr key={i} className="group hover:bg-slate-50 transition-all">
                               <td className="py-8 px-4">
                                  <div className="flex items-center gap-4">
                                     <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-300">
                                        <asset.icon size={18} />
                                     </div>
                                     <span className="text-sm font-black text-slate-900 italic uppercase">{asset.name}</span>
                                  </div>
                               </td>
                               <td className="py-8 px-4">
                                  <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                     asset.crit === 'Critical' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                                  }`}>
                                     {asset.crit}
                                  </span>
                               </td>
                               <td className="py-8 px-4">
                                  <div className="flex items-center gap-2">
                                     <div className={`w-2 h-2 rounded-full ${asset.status === 'Protected' ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></div>
                                     <span className="text-[10px] font-black text-slate-500 uppercase italic">{asset.status}</span>
                                  </div>
                               </td>
                               <td className="py-8 px-4 text-[10px] font-black text-slate-700 italic uppercase">{asset.owner}</td>
                               <td className="py-8 px-4 text-right">
                                  <button className="bg-white border border-slate-100 p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all">
                                     <Eye size={16} />
                                  </button>
                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
}
