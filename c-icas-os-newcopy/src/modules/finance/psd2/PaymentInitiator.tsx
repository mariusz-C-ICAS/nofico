/**
 * Data: 2026-05-12
 * Zmiany: Komponent inicjowania płatności (PIS) via PSD2.
 * Ścieżka: /src/modules/finance/psd2/PaymentInitiator.tsx
 */
import React, { useState } from 'react';
import { 
  CreditCard, ShieldCheck, ArrowRight, Banknote, 
  Loader2, CheckCircle2, Landmark, Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PaymentInitiatorProps {
  onClose: () => void;
  invoice?: {
    id: string;
    number: string;
    amount: number;
    counterpart: string;
    iban: string;
  };
}

export default function PaymentInitiator({ onClose, invoice }: PaymentInitiatorProps) {
  const [step, setStep] = useState<'details' | 'authenticating' | 'success'>('details');
  const [loading, setLoading] = useState(false);

  const handlePay = () => {
    setLoading(true);
    setStep('authenticating');
    // Simulate Tink PISP flow
    setTimeout(() => {
      setLoading(false);
      setStep('success');
    }, 3000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[70] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[4rem] p-12 max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden relative"
      >
        <AnimatePresence mode="wait">
          {step === 'details' && (
            <motion.div 
              key="details"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-start">
                 <div>
                    <h4 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter mb-2">Płatność PSD2</h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inicjowanie przelewu bezpośredniego (PISP)</p>
                 </div>
                 <button onClick={onClose} className="text-slate-400 hover:text-slate-900">✕</button>
              </div>

              <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100 italic">
                 <div className="flex justify-between items-center mb-6">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Do zapłaty</span>
                    <span className="text-3xl font-black text-indigo-600 tracking-tighter italic">
                       {invoice?.amount.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN
                    </span>
                 </div>
                 <div className="space-y-4">
                    <div className="flex justify-between">
                       <span className="text-[9px] font-black text-slate-400 uppercase">Kontrahent</span>
                       <span className="text-xs font-black text-slate-900 uppercase">{invoice?.counterpart || 'ORANGE POLSKA S.A.'}</span>
                    </div>
                    <div className="flex justify-between">
                       <span className="text-[9px] font-black text-slate-400 uppercase">Faktura</span>
                       <span className="text-xs font-black text-slate-900 italic">{invoice?.number || 'FV/2026/05/12'}</span>
                    </div>
                    <div className="flex justify-between">
                       <span className="text-[9px] font-black text-slate-400 uppercase">IBAN Odbiorcy</span>
                       <span className="text-[10px] font-mono font-black text-slate-900 italic tracking-tight">{invoice?.iban || 'PL 10 1020 1234 0000 9876 5432'}</span>
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                 <button className="flex items-center justify-between p-6 bg-white border-2 border-slate-100 rounded-[2rem] hover:border-indigo-600 hover:bg-slate-50 transition-all group">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center p-2">
                          <Landmark className="text-slate-400" />
                       </div>
                       <div className="text-left">
                          <div className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Z rachunku</div>
                          <div className="text-sm font-black text-slate-900 uppercase italic">PKO Bank Polski</div>
                       </div>
                    </div>
                    <ArrowRight size={20} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
                 </button>
              </div>

              <div className="space-y-4">
                 <button 
                   onClick={handlePay}
                   className="w-full bg-slate-900 text-white font-black py-6 rounded-2xl text-[11px] uppercase tracking-widest shadow-2xl shadow-slate-100 hover:bg-indigo-600 transition-all flex items-center justify-center gap-3"
                 >
                    <Smartphone size={18} /> Autoryzuj i zapłać
                 </button>
                 <p className="text-[9px] font-black text-slate-400 text-center uppercase tracking-widest flex items-center justify-center gap-2 italic">
                    <ShieldCheck size={12} className="text-emerald-500" /> Bezpieczna transakcja bankowa via Tink Consent
                 </p>
              </div>
            </motion.div>
          )}

          {step === 'authenticating' && (
            <motion.div 
              key="authenticating"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
               <div className="relative w-40 h-40 mb-12">
                  <div className="absolute inset-0 border-8 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <div className="absolute inset-4 border-4 border-slate-100 rounded-full flex items-center justify-center">
                     <Smartphone size={48} className="text-slate-200" />
                  </div>
               </div>
               <h4 className="text-2xl font-black text-slate-900 uppercase italic mb-4">Oczekiwanie na SCA...</h4>
               <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-relaxed max-w-xs">
                  Potwierdź przelew w swojej aplikacji mobilnej banku. Mamy na to 180 sekund.
               </p>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div 
              key="success"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
               <div className="w-40 h-40 bg-emerald-50 rounded-full flex items-center justify-center mb-12 shadow-xl shadow-emerald-100">
                  <CheckCircle2 className="text-emerald-500" size={80} strokeWidth={3} />
               </div>
               <h4 className="text-4xl font-black text-slate-900 uppercase italic mb-4">Przelew Wysłany!</h4>
               <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-relaxed max-w-sm mb-12">
                  Zlecenie zostało przyjęte przez bank. Status zmieni się na "Settled" po otrzymaniu webhooka PSD2.
               </p>
               <button 
                 onClick={onClose}
                 className="bg-slate-900 text-white px-12 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl hover:bg-slate-800 transition-all"
               >
                  Powrót do faktur
               </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
