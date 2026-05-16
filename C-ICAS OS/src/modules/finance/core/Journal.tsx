import React, { useState, useEffect } from 'react';
import { 
  BookText, Plus, Search, Filter, Download, Calendar, 
  ArrowRight, CheckCircle2, AlertCircle, Loader2, MoreVertical,
  ExternalLink, Trash2, Printer
} from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';

interface JournalEntry {
  id: string;
  date: any;
  documentNumber: string;
  description: string;
  items: {
    accountId: string;
    accountCode: string;
    debit: number;
    credit: number;
    side: 'Wn' | 'Ma';
  }[];
  totalAmount: number;
  status: 'posted' | 'draft' | 'reversed';
  createdBy: string;
}

import JournalEntryModal from './JournalEntryModal';

export default function Journal() {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (!activeTenantId) return;

    const journalPath = `tenants/${activeTenantId}/journals`;
    const q = query(collection(db, journalPath), orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: JournalEntry[] = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() } as JournalEntry);
      });
      setEntries(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activeTenantId]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight italic flex items-center gap-2">
              <BookText className="text-indigo-600" size={20} /> Dziennik Księgowań
           </h3>
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">Chronologiczny zapis zdarzeń gospodarczych</p>
        </div>
        <div className="flex gap-3">
           <button className="bg-white text-slate-500 px-6 py-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm">
              <Printer size={16} /> Drukuj Dziennik
           </button>
           <button 
             onClick={() => setShowAddModal(true)}
             className="bg-slate-900 text-white px-6 py-3 rounded-xl shadow-xl hover:bg-indigo-600 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
           >
              <Plus size={16} /> Nowy Dekret
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
         <div className="bg-indigo-600 rounded-[2rem] p-8 text-white shadow-xl shadow-indigo-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10">
               <div className="flex items-center gap-3 mb-4 opacity-70">
                  <CheckCircle2 size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Obroty Miesięczne</span>
               </div>
               <div className="text-3xl font-black tracking-tighter italic mb-1">128,450.00 PLN</div>
               <div className="text-[10px] font-bold uppercase tracking-widest opacity-60">Suma zapisów Wn/Ma</div>
            </div>
         </div>
         <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className="relative z-10">
               <div className="flex items-center gap-3 mb-4 text-slate-400">
                  <AlertCircle size={16} className="text-amber-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Oczekujące (Draft)</span>
               </div>
               <div className="text-3xl font-black tracking-tighter italic mb-1 text-slate-900">12,100.00 PLN</div>
               <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">7 dekretów do zatwierdzenia</div>
            </div>
         </div>
         <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100 relative overflow-hidden group border-dashed">
            <div className="relative z-10 flex flex-col justify-center h-full">
               <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 italic">Zautomatyzowane księgowanie</div>
               <button className="bg-indigo-50 text-indigo-600 font-black py-3 px-6 rounded-xl text-[10px] uppercase tracking-widest self-start border border-indigo-100 hover:bg-white transition-all">
                  Synchronizuj z KSeF
               </button>
            </div>
         </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
         <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
            <div className="flex items-center gap-6">
               <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-slate-400" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Okres: Maj 2026</span>
               </div>
               <div className="w-px h-4 bg-slate-200"></div>
               <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                  Wszystkie dzienniki (01-GL)
               </div>
            </div>
            <div className="flex gap-2">
               <button className="p-2 text-slate-400 hover:bg-white rounded-lg border border-transparent hover:border-slate-100 transition-all"><Filter size={14}/></button>
               <button className="p-2 text-slate-400 hover:bg-white rounded-lg border border-transparent hover:border-slate-100 transition-all"><Download size={14}/></button>
            </div>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
               <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                     <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                     <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Poz / Dokument</th>
                     <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Opis operacji</th>
                     <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Konto Wn</th>
                     <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Konto Ma</th>
                     <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Suma</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                       <td colSpan={6} className="py-20 text-center text-slate-300">
                          <Loader2 className="animate-spin text-indigo-500 mx-auto mb-4" size={32} />
                          <span className="text-[10px] font-black uppercase tracking-widest italic">Pobieram dziennik...</span>
                       </td>
                    </tr>
                  ) : entries.length === 0 ? (
                    <tr>
                       <td colSpan={6} className="py-20 text-center text-slate-300">
                          <BookText size={48} className="mx-auto mb-4 opacity-20" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Dziennik jest pusty w tym okresie</span>
                       </td>
                    </tr>
                  ) : (
                    entries.map((entry, idx) => (
                      <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors group">
                         <td className="px-8 py-5 align-top">
                            <span className="text-[11px] font-black text-slate-700 italic">
                               {new Date(entry.date?.seconds * 1000).toLocaleDateString()}
                            </span>
                         </td>
                         <td className="px-8 py-5 align-top">
                            <div className="flex flex-col gap-1">
                               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">POZ. {entries.length - idx}</span>
                               <span className="text-[11px] font-black text-indigo-600 uppercase tracking-tighter leading-none italic">{entry.documentNumber}</span>
                            </div>
                         </td>
                         <td className="px-8 py-5 align-top">
                            <span className="text-[11px] font-bold text-slate-800 uppercase leading-relaxed max-w-xs block">
                               {entry.description}
                            </span>
                         </td>
                         <td className="px-8 py-5 align-top">
                            {entry.items.filter(i => i.side === 'Wn').map((i, idx) => (
                              <div key={idx} className="flex flex-col gap-1 mb-2 last:mb-0">
                                 <span className="text-[11px] font-black text-slate-800">{i.accountCode}</span>
                                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Wn</span>
                              </div>
                            ))}
                         </td>
                         <td className="px-8 py-5 align-top">
                            {entry.items.filter(i => i.side === 'Ma').map((i, idx) => (
                              <div key={idx} className="flex flex-col gap-1 mb-2 last:mb-0">
                                 <span className="text-[11px] font-black text-slate-800">{i.accountCode}</span>
                                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Ma</span>
                              </div>
                            ))}
                         </td>
                         <td className="px-8 py-5 align-top text-right">
                            <div className="flex flex-col items-end gap-1">
                               <span className="text-[13px] font-black text-slate-900 tracking-tighter italic">{entry.totalAmount?.toLocaleString('pl-PL', { minimumFractionDigits: 2 })}</span>
                               <span className="text-[9px] font-black text-slate-400 uppercase">PLN</span>
                            </div>
                         </td>
                      </tr>
                    ))
                  )}
               </tbody>
            </table>
         </div>
      </div>

      {showAddModal && (
        <JournalEntryModal onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}
