/**
 * Data: 2026-05-12
 * Zmiany: Komponent autoryzacji banków (PIS/AIS).
 * Ścieżka: /src/modules/finance/psd2/BankAuth.tsx
 */
import React, { useState } from 'react';
import { 
  Plus, Search, CreditCard, ShieldCheck, Clock, 
  Trash2, ExternalLink, Loader2, Zap, Landmark
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BankConnection {
  id: string;
  name: string;
  logo: string;
  status: 'active' | 'expired' | 'error';
  lastSync: string;
  expiresAt: string;
  ibanCount: number;
}

export default function BankAuth() {
  const [loading, setLoading] = useState(false);
  const [showBankSelector, setShowBankSelector] = useState(false);

  const activeConnections: BankConnection[] = [
    { 
      id: '1', 
      name: 'PKO Bank Polski', 
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/PKO_Bank_Polski_logo.svg/1200px-PKO_Bank_Polski_logo.svg.png',
      status: 'active',
      lastSync: '10 minut temu',
      expiresAt: '2026-08-10',
      ibanCount: 2
    },
    { 
      id: '2', 
      name: 'mBank', 
      logo: 'https://pl.m-bank.com/images/mbank-logo-black.png',
      status: 'active',
      lastSync: 'Dzisiaj, 09:12',
      expiresAt: '2026-06-15',
      ibanCount: 1
    }
  ];

  const banks = [
    { id: 'pko', name: 'PKO BP', country: 'PL' },
    { id: 'mbank', name: 'mBank', country: 'PL' },
    { id: 'ing', name: 'ING Bank Śląski', country: 'PL' },
    { id: 'pekao', name: 'Pekao SA', country: 'PL' },
    { id: 'santander', name: 'Santander', country: 'PL' },
    { id: 'alior', name: 'Alior Bank', country: 'PL' },
  ];

  const handleConnectBank = () => {
    setShowBankSelector(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
         <div>
            <h4 className="text-xl font-black text-slate-900 uppercase italic mb-1">Połączone Rachunki</h4>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Zarządzaj dostępami AIS/PIS (Tink Enterprise)</div>
         </div>
         <button 
           onClick={handleConnectBank}
           className="bg-indigo-600 text-white px-8 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
         >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
            Dodaj Nowy Bank
         </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {activeConnections.map(conn => (
           <motion.div 
             key={conn.id}
             whileHover={{ y: -5 }}
             className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm relative group overflow-hidden"
           >
              <div className="absolute top-0 right-0 p-8">
                 <button className="text-slate-200 hover:text-rose-500 transition-colors">
                    <Trash2 size={18} />
                 </button>
              </div>

              <div className="flex flex-col items-center text-center">
                 <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-3xl mb-6 flex items-center justify-center p-3">
                    <Landmark className="text-slate-300" size={32} />
                 </div>
                 <h5 className="text-lg font-black text-slate-900 uppercase italic mb-1">{conn.name}</h5>
                 <div className="text-[10px] font-black text-emerald-500 uppercase flex items-center gap-1 mb-6">
                    <ShieldCheck size={12} /> Zabezpieczono SCA
                 </div>

                 <div className="w-full space-y-4 text-left bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                    <div className="flex justify-between items-center">
                       <span className="text-[9px] font-black text-slate-400 uppercase">Rachunki</span>
                       <span className="text-xs font-black text-slate-900 italic">{conn.ibanCount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="text-[9px] font-black text-slate-400 uppercase">Ostatnia sync</span>
                       <span className="text-xs font-black text-slate-900 italic">{conn.lastSync}</span>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="text-[9px] font-black text-slate-400 uppercase">Ważność SCA</span>
                       <span className="text-xs font-black text-slate-900 italic">{conn.expiresAt}</span>
                    </div>
                 </div>

                 <button className="w-full mt-6 bg-slate-50 group-hover:bg-indigo-50 border border-slate-100 group-hover:border-indigo-100 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest text-slate-500 group-hover:text-indigo-600 transition-all flex items-center justify-center gap-2">
                    Szczegóły Rachunku <ExternalLink size={12} />
                 </button>
              </div>
           </motion.div>
         ))}
      </div>

      <AnimatePresence>
        {showBankSelector && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[60] flex items-center justify-center p-6">
             <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="bg-white rounded-[4rem] p-12 max-w-2xl w-full shadow-2xl border border-slate-100"
             >
                <div className="flex justify-between items-start mb-10">
                   <div>
                      <h4 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter mb-2">Wybierz swój bank</h4>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                         Przekierujemy Cię bezpiecznie do portalu bankowości <br />elektronicznej przez infrastrukturę Tink.
                      </p>
                   </div>
                   <button onClick={() => setShowBankSelector(false)} className="bg-slate-50 text-slate-400 hover:text-slate-900 p-4 rounded-3xl transition-colors">✕</button>
                </div>

                <div className="relative mb-8">
                   <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                   <input 
                     type="text" 
                     placeholder="Wyszukaj bank (np. PKO, mBank, Revo...)"
                     className="w-full bg-slate-50 border-none rounded-[2rem] pl-16 pr-8 py-6 text-sm font-black uppercase italic tracking-tighter focus:ring-2 focus:ring-indigo-500"
                   />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
                   {banks.map(bank => (
                     <button 
                       key={bank.id}
                       className="p-8 border-2 border-slate-50 rounded-[2.5rem] hover:border-indigo-500 hover:bg-slate-50 transition-all text-center group"
                     >
                        <div className="w-12 h-12 bg-white rounded-2xl mx-auto mb-4 border border-slate-100 flex items-center justify-center font-black text-slate-200 uppercase text-[10px] group-hover:text-indigo-500 group-hover:border-indigo-100">
                           Logo
                        </div>
                        <div className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{bank.name}</div>
                     </button>
                   ))}
                </div>

                <div className="bg-indigo-600 rounded-[2.5rem] p-8 flex items-center justify-between group cursor-pointer hover:bg-indigo-700 transition-all">
                   <div className="flex items-center gap-6">
                      <div className="bg-white/20 p-4 rounded-2xl">
                         <Zap className="text-white" size={24} />
                      </div>
                      <div>
                         <div className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Inna Metoda</div>
                         <div className="text-lg font-black text-white uppercase italic tracking-tight">Import manualny (CSV/Elixir)</div>
                      </div>
                   </div>
                   <div className="bg-white/10 p-4 rounded-full text-white group-hover:translate-x-2 transition-transform">
                      <ExternalLink size={20} />
                   </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
