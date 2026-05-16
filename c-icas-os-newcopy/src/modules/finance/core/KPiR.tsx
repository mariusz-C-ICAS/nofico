import React, { useState } from 'react';
import { 
  FileText, Search, Filter, Download, Printer, 
  ChevronRight, ArrowUpRight, ArrowDownLeft, Calculator,
  Calendar, CheckCircle2, AlertCircle, Info, MoreHorizontal
} from 'lucide-react';

export default function KPiR() {
  const [loading] = useState(false);
  const [activeMonth] = useState('05-2026');

  // Mock data for KPiR simulation
  const entries = [
    { lp: 1, date: '2026-05-01', docNo: 'FV/2026/05/01', description: 'Usługi doradcze IT', value: 12000.00, columns: { 7: 12000.00 } },
    { lp: 2, date: '2026-05-04', docNo: 'FV/ORANGE/220', description: 'Abonament telefoniczny', value: 150.00, columns: { 13: 150.00 } },
    { lp: 3, date: '2026-05-10', docNo: 'KR/MAY/01', description: 'Zakup paliwa do pojazdu', value: 450.00, columns: { 13: 450.00 } },
  ];

  const columns = [
    { id: 1, name: 'Lp.' },
    { id: 2, name: 'Data zdarzenia' },
    { id: 3, name: 'Nr dowodu' },
    { id: 4, name: 'Kontrahent' },
    { id: 5, name: 'Adres' },
    { id: 6, name: 'Opis' },
    { id: 7, name: 'Przychód (Wartość)' },
    { id: 8, name: 'Pozostałe' },
    { id: 9, name: 'Razem Przychód (7+8)' },
    { id: 10, name: 'Zakup tow. hand.' },
    { id: 11, name: 'Koszty uboczne' },
    { id: 12, name: 'Wynagrodzenia' },
    { id: 13, name: 'Pozostałe wydatki' },
    { id: 14, name: 'Inwestycje' },
    { id: 15, name: 'Inne' },
    { id: 16, name: 'Uwagi' }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight italic flex items-center gap-2">
              <FileText className="text-indigo-600" size={20} /> Podatkowa Księga Przychodów i Rozchodów
           </h3>
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">Ewidencja uproszczona (JDG) • Zgodna z Rozp. MF</p>
        </div>
        <div className="flex gap-3">
           <button className="bg-white text-slate-500 px-6 py-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm">
              <Printer size={16} /> Drukuj KPiR
           </button>
           <button className="bg-slate-900 text-white px-8 py-3 rounded-xl shadow-xl hover:bg-indigo-600 transition-all text-[10px] font-black uppercase tracking-widest">
              Zamknij Miesiąc
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         <div className="bg-emerald-600 rounded-[2rem] p-8 text-white shadow-xl shadow-emerald-100 flex flex-col justify-between">
            <ArrowUpRight className="opacity-40 mb-4" size={24} />
            <div>
               <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Przychód (Razem)</div>
               <div className="text-3xl font-black tracking-tighter italic leading-none">12,000.00</div>
               <div className="text-[10px] font-bold uppercase tracking-widest opacity-40 mt-1">Kolumna 7 + 8</div>
            </div>
         </div>
         <div className="bg-rose-600 rounded-[2rem] p-8 text-white shadow-xl shadow-rose-100 flex flex-col justify-between">
            <ArrowDownLeft className="opacity-40 mb-4" size={24} />
            <div>
               <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Koszty (Razem)</div>
               <div className="text-3xl font-black tracking-tighter italic leading-none">600.00</div>
               <div className="text-[10px] font-bold uppercase tracking-widest opacity-40 mt-1">Kolumna 10-13</div>
            </div>
         </div>
         <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
            <Calculator className="text-indigo-600 mb-4" size={24} />
            <div>
               <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Dochód Narastająco</div>
               <div className="text-3xl font-black tracking-tighter italic leading-none text-slate-900">11,400.00</div>
               <div className="text-[10px] font-bold uppercase tracking-widest text-slate-300 mt-1">Od początku roku</div>
            </div>
         </div>
         <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100 flex flex-col justify-between">
            <Calendar className="text-slate-400 mb-4" size={24} />
            <div>
               <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Pozostały Podatek</div>
               <div className="text-3xl font-black tracking-tighter italic leading-none text-slate-400">---</div>
               <div className="text-[10px] font-bold uppercase tracking-widest text-slate-300 mt-1 italic">Po odliczeniu ZUS</div>
            </div>
         </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm overflow-x-auto">
         <div className="min-w-[1400px]">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 divide-x divide-slate-100">
                     {columns.map(col => (
                        <th key={col.id} className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center leading-tight">
                           {col.id}.<br/>{col.name}
                        </th>
                     ))}
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {entries.map((entry, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors divide-x divide-slate-50">
                       <td className="px-4 py-3 text-[10px] font-black text-slate-300 text-center">{entry.lp}</td>
                       <td className="px-4 py-3 text-[10px] font-black text-slate-900 text-center">{entry.date}</td>
                       <td className="px-4 py-3 text-[10px] font-black text-indigo-600 uppercase italic text-center">{entry.docNo}</td>
                       <td className="px-4 py-3 text-[10px] font-bold text-slate-800 uppercase italic" colSpan={2}>
                          Kontrahent z bazy CRM
                       </td>
                       <td className="px-4 py-3 text-[10px] font-bold text-slate-600 uppercase italic">{entry.description}</td>
                       <td className="px-4 py-3 text-[11px] font-black text-slate-900 text-right italic">{entry.columns[7]?.toLocaleString() || '-'}</td>
                       <td className="px-4 py-3 text-[11px] font-black text-slate-900 text-right italic">-</td>
                       <td className="px-4 py-3 text-[11px] font-black text-slate-900 text-right italic">{entry.columns[7]?.toLocaleString() || '-'}</td>
                       <td className="px-4 py-3 text-[11px] font-black text-slate-900 text-right italic">-</td>
                       <td className="px-4 py-3 text-[11px] font-black text-slate-900 text-right italic">-</td>
                       <td className="px-4 py-3 text-[11px] font-black text-slate-900 text-right italic">-</td>
                       <td className="px-4 py-3 text-[11px] font-black text-slate-900 text-right italic">{entry.columns[13]?.toLocaleString() || '-'}</td>
                       <td className="px-4 py-3 text-[11px] font-black text-slate-900 text-right italic">-</td>
                       <td className="px-4 py-3 text-center">
                          <MoreHorizontal size={14} className="text-slate-300 mx-auto" />
                       </td>
                    </tr>
                  ))}
               </tbody>
               <tfoot>
                  <tr className="bg-slate-900 text-white divide-x divide-slate-800">
                     <td colSpan={6} className="px-4 py-6 text-xs font-black uppercase tracking-widest italic text-right">Suma strony / Podsumowanie miesięczne</td>
                     <td className="px-4 py-6 text-xs font-black text-right italic">12,000.00</td>
                     <td className="px-4 py-6 text-xs font-black text-right italic">0.00</td>
                     <td className="px-4 py-6 text-xs font-black text-right italic">12,000.00</td>
                     <td className="px-4 py-6 text-xs font-black text-right italic">0.00</td>
                     <td className="px-4 py-6 text-xs font-black text-right italic">0.00</td>
                     <td className="px-4 py-6 text-xs font-black text-right italic">0.00</td>
                     <td className="px-4 py-6 text-xs font-black text-right italic">600.00</td>
                     <td className="px-4 py-6 text-xs font-black text-right italic">0.00</td>
                     <td className="bg-slate-800 px-4 py-6"></td>
                  </tr>
               </tfoot>
            </table>
         </div>
      </div>
    </div>
  );
}
