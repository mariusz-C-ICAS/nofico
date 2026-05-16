/**
 * Data: 2026-05-12
 * Zmiany: Lista faktur KSeF (sprzedaż/zakup) z walidacją FA(2).
 * Ścieżka: /src/modules/finance/ksef/KsefInvoiceList.tsx
 */
import React, { useState } from 'react';
import { 
  FileText, Download, CheckCircle2, ShieldCheck, 
  ExternalLink, Search, Filter, AlertCircle,
  MoreVertical, FileCode, Check
} from 'lucide-react';
import { motion } from 'motion/react';

interface KsefInvoice {
  id: string;
  number: string;
  ksefNumber: string;
  date: string;
  vendor: string;
  amount: number;
  status: 'sent' | 'accepted' | 'rejected' | 'upo_ready';
  xmlValid: boolean;
}

export default function KsefInvoiceList({ type }: { type: 'purchase' | 'sales' }) {
  const invoices: KsefInvoice[] = [
    { 
      id: '1', 
      number: 'FV/2026/05/01', 
      ksefNumber: '1234567890-20260512-123456789012',
      date: '2026-05-12',
      vendor: type === 'purchase' ? 'MICROSOFT IRELAND' : 'KLIENT TESTOWY SP. Z O.O.',
      amount: 450.00,
      status: 'accepted',
      xmlValid: true
    },
    { 
      id: '2', 
      number: 'FV/2026/05/02', 
      ksefNumber: 'PENDING',
      date: '2026-05-12',
      vendor: type === 'purchase' ? 'AWS EUROPE' : 'ABC LOGISTICS',
      amount: 1200.00,
      status: 'upo_ready',
      xmlValid: true
    },
    { 
      id: '3', 
      number: 'FV/2026/04/99', 
      ksefNumber: '9876543210-20260430-987654321098',
      date: '2026-04-30',
      vendor: 'GOOGLE CLOUD',
      amount: 89.99,
      status: 'accepted',
      xmlValid: true
    }
  ];

  return (
    <div className="space-y-6">
       <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex-1 w-full relative">
             <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
             <input 
               type="text" 
               placeholder="Szukaj w KSeF (numer, NIP, kwota...)"
               className="w-full bg-slate-50 border-none rounded-2xl pl-16 pr-8 py-5 text-sm font-black uppercase italic tracking-tighter"
             />
          </div>
          <div className="flex gap-4">
             <button className="bg-slate-50 text-slate-500 px-8 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-100 hover:bg-slate-100 transition-all">
                <Filter size={16} /> Filtry
             </button>
             <button className="bg-indigo-600 text-white px-8 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all">
                Pobierz Nowe z KSeF
             </button>
          </div>
       </div>

       <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
             <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                   <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Numer Faktury</th>
                   <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Numer KSeF</th>
                   <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kontrahent</th>
                   <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kwota</th>
                   <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status FA(2)</th>
                   <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest"></th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-50">
                {invoices.map(inv => (
                  <motion.tr 
                    key={inv.id}
                    whileHover={{ backgroundColor: 'rgba(248, 250, 252, 0.5)' }}
                    className="group"
                  >
                     <td className="px-8 py-6">
                        <div className="text-[11px] font-black text-slate-900 uppercase italic">{inv.number}</div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{inv.date}</div>
                     </td>
                     <td className="px-8 py-6">
                        <div className="flex flex-col">
                           <span className="text-[10px] font-mono font-black text-indigo-600 tracking-tighter truncate max-w-[140px] italic">
                              {inv.ksefNumber}
                           </span>
                           {inv.status === 'upo_ready' && (
                             <span className="text-[8px] font-black text-amber-500 uppercase">Synchronizacja w toku</span>
                           )}
                        </div>
                     </td>
                     <td className="px-8 py-6">
                        <div className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{inv.vendor}</div>
                     </td>
                     <td className="px-8 py-6">
                        <div className="text-sm font-black text-slate-900 tracking-tighter italic">
                           {inv.amount.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN
                        </div>
                     </td>
                     <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                           {inv.xmlValid ? (
                             <div className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg border border-emerald-100 flex items-center gap-2">
                                <Check size={12} strokeWidth={4} />
                                <span className="text-[9px] font-black uppercase tracking-widest italic">FA(2) Valid</span>
                             </div>
                           ) : (
                             <div className="bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg border border-rose-100 flex items-center gap-2">
                                <AlertCircle size={12} strokeWidth={4} />
                                <span className="text-[9px] font-black uppercase tracking-widest italic">Invalid XML</span>
                             </div>
                           )}
                           {inv.status === 'accepted' && (
                             <div className="text-emerald-500 bg-emerald-500/10 p-1.5 rounded-md">
                                <ShieldCheck size={14} />
                             </div>
                           )}
                        </div>
                     </td>
                     <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                           <button className="text-slate-300 hover:text-indigo-600 p-2 transition-colors">
                              <Download size={18} />
                           </button>
                           <button className="text-slate-300 hover:text-indigo-600 p-2 transition-colors">
                              <FileCode size={18} />
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
