/**
 * Data: 2026-05-12
 * Zmiany: Generator plików JPK (V7M, KR, FA, MAG).
 * Ścieżka: /src/modules/finance/tax/JpkGenerator.tsx
 */
import React, { useState } from 'react';
import { 
  FileCode, Download, ShieldCheck, CheckCircle2, 
  AlertCircle, Search, RefreshCw, X, MoreVertical,
  Activity, Database, Send
} from 'lucide-react';
import { motion } from 'motion/react';

export default function JpkGenerator() {
  const [loading, setLoading] = useState(false);

  const jpkHistory = [
    { id: '1', type: 'JPK_V7M', period: '2026-04', date: '2026-05-10', status: 'sent', upo: '9876-1234-AX' },
    { id: '2', type: 'JPK_KR', period: '2026-Q1', date: '2026-04-30', status: 'draft', upo: null },
    { id: '3', type: 'JPK_FA', period: '2026-04', date: '2026-05-05', status: 'error', upo: null },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
       <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex-1 w-full flex items-center gap-8">
             <div className="bg-slate-900 p-6 rounded-3xl shadow-xl shadow-slate-100">
                <FileCode className="text-indigo-400" size={32} />
             </div>
             <div>
                <h4 className="text-2xl font-black text-slate-900 uppercase italic leading-none mb-2">JPK Engine V4</h4>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Generuj i wysyłaj pliki JPK_V7M, JPK_KR (FA(2) compatible)</p>
             </div>
          </div>
          <button className="w-full md:w-auto bg-indigo-600 text-white px-10 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
             <RefreshCw size={16} /> Nowy Plik JPK
          </button>
       </div>

       <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
             <thead>
                <tr className="bg-slate-50/50">
                   <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Typ Dokumentu</th>
                   <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Okres</th>
                   <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Generacji</th>
                   <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status / UPO</th>
                   <th className="px-8 py-6 text-[10px) font-black text-slate-400 uppercase tracking-widest">Akcje</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-50">
                {jpkHistory.map(jpk => (
                  <motion.tr 
                    key={jpk.id}
                    whileHover={{ backgroundColor: 'rgba(248, 250, 252, 0.5)' }}
                    className="group"
                  >
                     <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                              <Database size={14} />
                           </div>
                           <span className="text-xs font-black text-slate-900 italic uppercase">{jpk.type}</span>
                        </div>
                     </td>
                     <td className="px-8 py-6 text-xs font-black text-slate-700 italic">{jpk.period}</td>
                     <td className="px-8 py-6 text-xs font-black text-slate-400 italic">{jpk.date}</td>
                     <td className="px-8 py-6">
                        {jpk.status === 'sent' ? (
                          <div className="flex items-center gap-3 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl border border-emerald-100 w-fit">
                             <ShieldCheck size={14} />
                             <span className="text-[10px] font-black uppercase tracking-tight italic">UPO: {jpk.upo}</span>
                          </div>
                        ) : jpk.status === 'error' ? (
                          <div className="flex items-center gap-3 bg-rose-50 text-rose-700 px-4 py-2 rounded-xl border border-rose-100 w-fit">
                             <AlertCircle size={14} />
                             <span className="text-[10px] font-black uppercase tracking-tight italic">Błąd XML Validation</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 bg-slate-50 text-slate-400 px-4 py-2 rounded-xl border border-slate-100 w-fit">
                             <RefreshCw size={14} />
                             <span className="text-[10px] font-black uppercase tracking-tight italic">Szkic (Korekta)</span>
                          </div>
                        )}
                     </td>
                     <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-3 invisible group-hover:visible transition-all">
                           <button className="text-indigo-600 p-2 hover:bg-indigo-50 rounded-lg" title="Pobierz XML">
                              <Download size={18} />
                           </button>
                           <button className="text-slate-400 p-2 hover:bg-slate-50 rounded-lg" title="Wyślij do Karuzeli (e-Deklaracje)">
                              <Send size={18} />
                           </button>
                        </div>
                     </td>
                  </motion.tr>
                ))}
             </tbody>
          </table>
       </div>
    </div>
  );
}
