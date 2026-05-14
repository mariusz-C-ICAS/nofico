import React, { useState, useEffect } from 'react';
import { 
  Database, Download, ArrowUpRight, ArrowDownLeft, Calculator,
  Loader2, BookOpen
} from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { useTenant } from '../../../shared/hooks/useTenant';

interface Account {
  id: string;
  code: string;
  name: string;
  balanceWn: number;
  balanceMa: number;
  category: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
}

export default function GeneralLedger() {
  const { activeTenantId } = useTenant();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeTenantId) return;

    const coaPath = `tenants/${activeTenantId}/chartOfAccounts`;
    const q = query(collection(db, coaPath), orderBy('code', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Account[] = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() } as Account);
      });
      setAccounts(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activeTenantId]);

  const totalWn = accounts.reduce((sum, acc) => sum + (acc.balanceWn || 0), 0);
  const totalMa = accounts.reduce((sum, acc) => sum + (acc.balanceMa || 0), 0);
  const assets = accounts.filter(a => a.category === 'asset').reduce((sum, acc) => sum + ((acc.balanceWn || 0) - (acc.balanceMa || 0)), 0);
  const liabilities = accounts.filter(a => a.category === 'liability').reduce((sum, acc) => sum + ((acc.balanceMa || 0) - (acc.balanceWn || 0)), 0);
  const isBalanced = Math.abs(totalWn - totalMa) < 0.01;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight italic flex items-center gap-2">
              <Database className="text-indigo-600" size={20} /> Księga Główna (General Ledger)
           </h3>
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">Zapisy systematyczne • Obroty i salda</p>
        </div>
        <div className="flex gap-3">
           <button className="bg-white text-slate-500 px-6 py-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm">
              <Download size={16} /> Eksport XLS
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-4">
         <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-[100px]"></div>
            <div className="relative z-10">
               <div className="flex items-center gap-3 mb-6">
                  <Calculator className="text-indigo-400" size={20} />
                  <span className="text-[11px] font-black uppercase tracking-widest text-indigo-200">Bilans Próbny (Trial Balance)</span>
               </div>
               <div className="flex justify-between items-end gap-10">
                  <div>
                     <div className="text-5xl font-black tracking-tighter italic mb-2 tracking-widest">
                       {totalWn.toLocaleString('pl-PL', { minimumFractionDigits: 2 })}
                     </div>
                     <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Suma Obrotów Wn / Ma</div>
                  </div>
                  <div className={`px-6 py-4 rounded-3xl border ${isBalanced ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-rose-500/20 border-rose-500/30'}`}>
                     <div className="text-[9px] font-black uppercase mb-1">{isBalanced ? 'Status' : 'Błąd'}</div>
                     <div className={`text-lg font-black italic tracking-tighter uppercase leading-none ${isBalanced ? 'text-emerald-100' : 'text-rose-100'}`}>
                       {isBalanced ? 'Zbilansowano' : 'Rozbieżność'}
                     </div>
                  </div>
               </div>
            </div>
         </div>
         <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm relative overflow-hidden">
               <ArrowUpRight className="text-emerald-500 mb-4" size={24} />
               <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Łączne Aktywa</div>
               <div className="text-2xl font-black text-slate-900 italic tracking-tighter">{assets.toLocaleString('pl-PL', { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm relative overflow-hidden">
               <ArrowDownLeft className="text-rose-500 mb-4" size={24} />
               <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Łączne Pasywa</div>
               <div className="text-2xl font-black text-slate-900 italic tracking-tighter">{liabilities.toLocaleString('pl-PL', { minimumFractionDigits: 2 })}</div>
            </div>
         </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
         <table className="w-full text-left border-collapse">
            <thead>
               <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Konto</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nazwa</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Obroty Wn</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Obroty Ma</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Saldo</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
               {loading ? (
                 <tr>
                    <td colSpan={5} className="py-20 text-center">
                       <Loader2 className="animate-spin text-indigo-500 mx-auto" />
                    </td>
                 </tr>
               ) : accounts.length === 0 ? (
                 <tr>
                    <td colSpan={5} className="py-20 text-center text-slate-300">
                       <BookOpen size={48} className="mx-auto mb-4 opacity-10" />
                       <span className="text-[10px] font-black uppercase tracking-widest">Brak danych w Księdze Głównej</span>
                    </td>
                 </tr>
               ) : accounts.map(acc => {
                 const balance = (acc.balanceWn || 0) - (acc.balanceMa || 0);
                 const absoluteBalance = Math.abs(balance);
                 const side = balance >= 0 ? 'Wn' : 'Ma';

                 return (
                   <tr key={acc.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer">
                      <td className="px-8 py-5">
                         <span className="text-xs font-black text-slate-900 font-mono tracking-tighter bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 uppercase">
                            {acc.code}
                         </span>
                      </td>
                      <td className="px-8 py-5">
                         <span className="text-[11px] font-black uppercase text-slate-700 tracking-tight">{acc.name}</span>
                      </td>
                      <td className="px-8 py-5 text-right">
                         <span className={`text-[12px] font-black italic tracking-tighter ${(acc.balanceWn || 0) > 0 ? 'text-slate-900' : 'text-slate-300'}`}>
                            {(acc.balanceWn || 0).toLocaleString('pl-PL', { minimumFractionDigits: 2 })}
                         </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                         <span className={`text-[12px] font-black italic tracking-tighter ${(acc.balanceMa || 0) > 0 ? 'text-slate-900' : 'text-slate-300'}`}>
                            {(acc.balanceMa || 0).toLocaleString('pl-PL', { minimumFractionDigits: 2 })}
                         </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                         <div className="flex flex-col items-end">
                            <span className={`text-sm font-black tracking-tighter italic ${balance > 0 ? 'text-emerald-600' : balance < 0 ? 'text-rose-600' : 'text-slate-300'}`}>
                               {absoluteBalance.toLocaleString('pl-PL', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{side}</span>
                         </div>
                      </td>
                   </tr>
                 );
               })}
            </tbody>
         </table>
      </div>
    </div>
  );
}
