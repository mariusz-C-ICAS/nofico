/**
 * Data: 2026-05-12
 * Zmiany: Płatności BLIK.
 * Ścieżka: /src/modules/payments/components/BlikPayment.tsx
 */
import React, { useState } from 'react';
import { Smartphone, Zap, CheckCircle2, Lock } from 'lucide-react';
import { PaymentService } from '../services/PaymentService';

export default function BlikPayment() {
  const [code, setCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const handlePay = async () => {
    if (code.length !== 6) return;
    setIsProcessing(true);
    await PaymentService.processBlikPayment(100, 'PLN', code, 'user_test_1');
    setTimeout(() => {
       setIsProcessing(false);
       setSuccess(true);
    }, 2000);
  };

  if (success) {
     return (
        <div className="bg-emerald-600 rounded-[3rem] p-12 text-white text-center shadow-xl shadow-emerald-100">
           <CheckCircle2 size={64} className="mx-auto mb-8 animate-bounce" />
           <h3 className="text-3xl font-black uppercase italic tracking-tighter mb-4">Płatność Zakończona</h3>
           <p className="text-[10px] font-black uppercase tracking-widest italic opacity-80 mb-10">Dziękujemy za skorzystanie z systemu BLIK ERP.</p>
           <button onClick={() => setSuccess(false)} className="bg-white text-emerald-600 px-12 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest">Wróć do płatności</button>
        </div>
     );
  }

  return (
    <div className="bg-white rounded-[3rem] border border-slate-100 p-12 shadow-sm flex flex-col lg:flex-row items-center gap-12">
       <div className="lg:w-1/2">
          <div className="flex items-center gap-4 mb-8">
             <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
                <Smartphone size={24} />
             </div>
             <div>
                <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Płatność BLIK</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic leading-none">Szybka płatność mobilna</p>
             </div>
          </div>

          <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest italic leading-relaxed mb-10">
             Wprowadź 6-cyfrowy kod BLIK wygenerowany w Twojej aplikacji bankowej, aby autoryzować transakcję.
          </p>

          <div className="flex gap-4 mb-10">
             <input 
                type="text" 
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000 000"
                className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] px-10 py-6 text-2xl font-black tracking-[0.5em] text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all text-center placeholder:text-slate-200"
             />
          </div>

          <button 
             onClick={handlePay}
             disabled={code.length !== 6 || isProcessing}
             className={`w-full py-6 rounded-[2rem] text-[12px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${
                code.length === 6 && !isProcessing
                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' 
                : 'bg-slate-100 text-slate-300'
             }`}
          >
             {isProcessing ? 'Przetwarzanie...' : (
                <>
                   Zapłać Teraz <Zap size={18} />
                </>
             )}
          </button>
       </div>

       <div className="lg:w-1/2 bg-slate-50 rounded-[2.5rem] p-10 border border-slate-100">
          <div className="flex justify-between items-center mb-8">
             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Podsumowanie Koszyka</h4>
             <Lock size={16} className="text-slate-300" />
          </div>
          <div className="space-y-6">
             <div className="flex justify-between items-center text-sm font-black italic uppercase">
                <span className="text-slate-400">Usługa Dedykowana</span>
                <span className="text-slate-900">81.30 PLN</span>
             </div>
             <div className="flex justify-between items-center text-sm font-black italic uppercase">
                <span className="text-slate-400">Podatek VAT (23%)</span>
                <span className="text-slate-900">18.70 PLN</span>
             </div>
             <div className="border-t border-slate-200 pt-6 flex justify-between items-end">
                <span className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">Do zapłaty</span>
                <span className="text-3xl font-black italic text-slate-900 tracking-tighter leading-none">100.00 PLN</span>
             </div>
          </div>
       </div>
    </div>
  );
}
