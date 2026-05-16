/**
 * Data: 2026-05-12
 * Zmiany: Komponent sprawozdań finansowych (Bilans, RZiS, Cashflow).
 * Ścieżka: /src/modules/finance/reporting/FinancialStatements.tsx
 */
import React from 'react';
import { 
  FileSpreadsheet, Download, ChevronRight, Calculator,
  TrendingUp, TrendingDown, Clock, Search
} from 'lucide-react';
import { motion } from 'motion/react';

export default function FinancialStatements() {
  const years = ['2026', '2025', '2024'];
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-in fade-in duration-700">
       <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
             <h5 className="text-sm font-black text-slate-900 uppercase italic mb-6">Archiwum Roczne</h5>
             <div className="space-y-3">
                {years.map(year => (
                  <button key={year} className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-indigo-50 transition-all group">
                     <span className="text-xs font-black text-slate-600 group-hover:text-indigo-600">{year}</span>
                     <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-600" />
                  </button>
                ))}
             </div>
          </div>
          
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white">
             <Calculator className="text-indigo-400 mb-6" size={32} />
             <h5 className="text-xl font-black uppercase italic italic mb-4">E-Sprawozdania</h5>
             <p className="text-[10px] font-medium text-indigo-200 leading-relaxed uppercase tracking-widest italic mb-8">
                Format XML zgodny ze strukturami logicznymi Ministerstwa Finansów oraz e-KRS.
             </p>
             <button className="w-full bg-indigo-600 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all">
                Weryfikuj & Eksportuj
             </button>
          </div>
       </div>

       <div className="lg:col-span-3 space-y-8">
          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
             <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                   <h4 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Rachunek Zysków i Strat</h4>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Wariant porównawczy (w PLN)</p>
                </div>
                <div className="flex gap-4">
                   <button className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm text-slate-400 hover:text-slate-900 transition-all">
                      <Search size={20} />
                   </button>
                   <button className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm text-slate-400 hover:text-slate-900 transition-all">
                      <Download size={20} />
                   </button>
                </div>
             </div>
             
             <div className="p-10">
                <table className="w-full text-left">
                   <thead>
                      <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic border-b border-slate-100">
                         <th className="py-4 w-1/2">Wyszczególnienie</th>
                         <th className="py-4 text-right">Bieżący kwartał</th>
                         <th className="py-4 text-right">Poprzedni rok</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50 italic">
                      {[
                        { name: 'A. Przychody netto ze sprzedaży i zrównane z nimi', val1: '1,245,000.00', val2: '980,000.00', type: 'main' },
                        { name: 'I. Przychody netto ze sprzedaży produktów', val1: '1,100,000.00', val2: '850,000.00', type: 'sub' },
                        { name: 'II. Przychody netto ze sprzedaży towarów i mat.', val1: '145,000.00', val2: '130,000.00', type: 'sub' },
                        { name: 'B. Koszty działalności operacyjnej', val1: '890,000.00', val2: '720,000.00', type: 'main' },
                        { name: 'I. Amortyzacja', val1: '45,000.00', val2: '40,000.00', type: 'sub' },
                        { name: 'II. Zużycie materiałów i energii', val1: '120,000.00', val2: '110,000.00', type: 'sub' },
                        { name: 'III. Usługi obce', val1: '420,000.00', val2: '350,000.00', type: 'sub' },
                        { name: 'C. Zysk (Strata) ze sprzedaży (A-B)', val1: '355,000.00', val2: '260,000.00', type: 'main', color: 'text-indigo-600' }
                      ].map((row, idx) => (
                        <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                           <td className={`py-5 text-xs font-black uppercase tracking-tight ${row.type === 'sub' ? 'pl-8 text-slate-500' : 'text-slate-900'}`}>
                              {row.name}
                           </td>
                           <td className={`py-5 text-sm font-black text-right tracking-tighter ${row.color || 'text-slate-900'}`}>{row.val1}</td>
                           <td className="py-5 text-sm font-black text-right text-slate-400 tracking-tighter">{row.val2}</td>
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
