import React, { useState } from 'react';
import { Archive, ShieldAlert, FileArchive, Activity, Save, History, CalendarClock } from 'lucide-react';

export default function RetentionAdmin() {
  const [retentionPolicies, setRetentionPolicies] = useState([
    { id: '1', module: 'HR', name: 'Dane Podstawowe (Akta)', duration: 50, unit: 'lat', offsetEndOfYear: true, description: 'Po ustaniu zatrudnienia' },
    { id: '2', module: 'HR', name: 'Dokumenty ZUS/PIT', duration: 10, unit: 'lat', offsetEndOfYear: true, description: 'Od daty wysłania' },
    { id: '3', module: 'HR', name: 'Kandydaci', duration: 6, unit: 'mies', offsetEndOfYear: false, description: 'Bez zgody na marketing per rekrutacja' },
    { id: '4', module: 'HR', name: 'Historia Stanowisk', duration: 10, unit: 'lat', offsetEndOfYear: true, description: 'Archiwum zatrudnienia' },
  ]);

  const [auditTrail] = useState([
    { date: '2026-05-14 02:00', event: 'Automatyczna anonimizacja (Cron)', details: 'Zanonimizowano 12 rekordów kandydatów (Rekrutacja).', user: 'System Worker' },
    { date: '2026-05-10 14:22', event: 'Zmiana polityki (HR)', details: 'Zmieniono retencję "Kandydaci" z 12 mies na 6 mies.', user: 'Admin' },
  ]);

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-8">
        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-100 justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 rounded-lg">
              <Archive size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Retencja Danych (Polityki)</h2>
              <p className="text-sm text-slate-500">Zarządzanie czasem przechowywania informacji dla każdego modułu (RODO)</p>
            </div>
          </div>
          <button className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2">
            <Save size={16} /> Zapisz Zmiany
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
             <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-4 flex items-center gap-2">
               <ShieldAlert size={16} className="text-indigo-600" />
               Globalne reguły retencji per Moduł
             </h3>
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="border-b border-gray-200">
                     <th className="py-4 px-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Moduł</th>
                     <th className="py-4 px-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Infotyp (Dokument)</th>
                     <th className="py-4 px-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Warunek = Start Retencji</th>
                     <th className="py-4 px-4 text-[10px] font-black uppercase text-gray-500 tracking-widest text-center">Czas retencji</th>
                     <th className="py-4 px-4 text-[10px] font-black uppercase text-gray-500 tracking-widest text-center">Liczenie Od</th>
                     <th className="py-4 px-4 text-[10px] font-black uppercase text-gray-500 tracking-widest text-center">Akcja (AI)</th>
                   </tr>
                 </thead>
                 <tbody className="text-sm divide-y divide-gray-100">
                   {retentionPolicies.map((policy, index) => (
                     <tr key={policy.id} className="hover:bg-slate-100 transition-colors">
                       <td className="py-4 px-4 font-bold text-slate-800">{policy.module}</td>
                       <td className="py-4 px-4 font-medium text-slate-600">{policy.name}</td>
                       <td className="py-4 px-4 text-xs text-slate-500">{policy.description}</td>
                       <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <input 
                              type="number" 
                              step="any"
                              value={policy.duration} 
                              onChange={(e) => {
                                 const arr = [...retentionPolicies];
                                 arr[index].duration = parseFloat(e.target.value) || 0;
                                 setRetentionPolicies(arr);
                              }}
                              className="w-20 bg-slate-50 border border-slate-300 rounded-lg text-center py-2 px-2 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                            />
                            <select 
                              value={policy.unit}
                              onChange={(e) => {
                                 const arr = [...retentionPolicies];
                                 arr[index].unit = e.target.value;
                                 setRetentionPolicies(arr);
                              }}
                              className="bg-slate-50 border border-slate-300 rounded-lg py-2 px-3 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                            >
                               <option value="godz">godzin</option>
                               <option value="dni">dni</option>
                               <option value="tyg">tyg.</option>
                               <option value="mies">mies.</option>
                               <option value="lat">lat</option>
                            </select>
                          </div>
                       </td>
                       <td className="py-4 px-4 text-center">
                          <button 
                            onClick={() => {
                               const arr = [...retentionPolicies];
                               arr[index].offsetEndOfYear = !arr[index].offsetEndOfYear;
                               setRetentionPolicies(arr);
                            }}
                            className={`text-xs font-bold px-3 py-2 rounded-lg transition-all border ${policy.offsetEndOfYear ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}
                            title="Liczone od końca roku kalendarzowego"
                          >
                             {policy.offsetEndOfYear ? 'Od Końca Roku' : 'Dokładna Data'}
                          </button>
                       </td>
                       <td className="py-4 px-4 text-center">
                          <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-1 rounded border border-rose-100 uppercase">Anonimizacja / Twarde Kasowanie</span>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
             
             <button className="mt-6 w-full py-3 bg-white border-2 border-dashed border-slate-300 rounded-xl text-xs font-black text-slate-500 hover:border-slate-400 hover:text-slate-600 transition-colors">
               + Dodaj nową regułę dla modułu
             </button>
          </div>

          <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 text-white relative overflow-hidden mt-4 shadow-xl">
             <div className="absolute -inset-8 bg-emerald-500/10 blur-3xl rounded-full"></div>
             <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                   <h4 className="font-black text-sm text-emerald-400 flex items-center gap-2">
                      <Activity size={16} /> Worker Skasowania i Anonimizacji (Cron)
                   </h4>
                   <p className="text-xs text-slate-400 mt-2 max-w-xl leading-relaxed">
                     Zadanie systemowe uruchamiane codziennie w nocy (02:00 czasu lokalnego). System odszuka stare dane we wszystkich zdefiniowanych kolekcjach i wykona wybraną strategię anonimizacji.
                   </p>
                </div>
                <button className="w-full md:w-auto shrink-0 bg-emerald-600 hover:bg-emerald-700 font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/30">
                  Uruchom Worker ręcznie teraz
                </button>
             </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mt-4">
             <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-4 flex items-center gap-2">
               <History size={16} className="text-indigo-600" />
               Dziennik Zdarzeń (Audit Trail - GDPR)
             </h3>
             <table className="w-full text-left text-xs">
                <thead>
                   <tr className="border-b border-gray-100 text-slate-400">
                      <th className="py-2 font-black uppercase pb-3">Data / Czas</th>
                      <th className="py-2 font-black uppercase pb-3">Zdarzenie</th>
                      <th className="py-2 font-black uppercase pb-3">Szczegóły</th>
                      <th className="py-2 font-black uppercase pb-3">Inicjator</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                   {auditTrail.map((log, i) => (
                      <tr key={i} className="text-slate-600 font-medium">
                         <td className="py-3 flex items-center gap-2"><CalendarClock size={12} className="text-slate-400"/> {log.date}</td>
                         <td className="py-3 font-bold">{log.event}</td>
                         <td className="py-3 italic">{log.details}</td>
                         <td className="py-3">
                            <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-[10px] font-black uppercase">{log.user}</span>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </div>
      </div>
    </div>
  );
}
