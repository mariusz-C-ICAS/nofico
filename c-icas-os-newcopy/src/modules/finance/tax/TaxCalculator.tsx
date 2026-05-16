/**
 * Data: 2026-05-12
 * Zmiany: Silnik obliczeniowy PIT/CIT/ZUS/PPK.
 * Ścieżka: /src/modules/finance/tax/TaxCalculator.tsx
 */
import React from 'react';
import { 
  TrendingDown, TrendingUp, Calculator, 
  ShieldAlert, RefreshCw, BarChart, 
  Activity, ArrowRight
} from 'lucide-react';
import { motion } from 'motion/react';

export default function TaxCalculator() {
  const taxItems = [
    { name: 'Podatek Dochodowy (PIT-5)', amount: 4320.50, status: 'calculated', trend: 'up' },
    { name: 'Składka Zdrowotna (Polski Ład)', amount: 1240.00, status: 'calculated', trend: 'stable' },
    { name: 'Składka ERIP (Społeczne)', amount: 2450.80, status: 'paid', trend: 'none' },
    { name: 'Fundusz Pracy / FGŚP', amount: 112.40, status: 'calculated', trend: 'none' },
    { name: 'Wpłata PPK (1.5% Pracodawca)', amount: 450.00, status: 'calculated', trend: 'up' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-700">
       <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10">
          <div className="flex justify-between items-center mb-10">
             <div>
                <h4 className="text-xl font-black text-slate-900 uppercase italic">Zaliczki i Składki</h4>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rozliczenie za okres: Maj 2026</div>
             </div>
             <button className="bg-slate-50 text-slate-400 p-3 rounded-xl hover:text-indigo-600 transition-colors">
                <RefreshCw size={18} />
             </button>
          </div>

          <div className="space-y-4">
             {taxItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-100/50 transition-all group">
                   <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.status === 'paid' ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'}`}>
                         {item.status === 'paid' ? <ShieldAlert size={20} /> : <Calculator size={20} />}
                      </div>
                      <div>
                         <div className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{item.name}</div>
                         <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">{item.status === 'paid' ? 'Opłacono' : 'Do opłacenia'}</div>
                      </div>
                   </div>
                   <div className="text-right">
                      <div className="text-sm font-black text-slate-900 italic tracking-tighter">
                         {item.amount.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN
                      </div>
                      <div className="flex items-center justify-end gap-1">
                         {item.trend === 'up' && <TrendingUp size={10} className="text-rose-500" />}
                         {item.trend === 'down' && <TrendingDown size={10} className="text-emerald-500" />}
                      </div>
                   </div>
                </div>
             ))}
          </div>

          <div className="mt-10 p-8 bg-slate-900 rounded-[2.5rem] text-white">
             <div className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-2 italic">Sumaryczne Obciążenie (Tax Burn)</div>
             <div className="text-4xl font-black italic tracking-tighter text-emerald-400">8,573.70 PLN</div>
          </div>
       </div>

       <div className="space-y-8">
          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10">
             <h5 className="text-sm font-black text-slate-900 uppercase italic tracking-widest mb-8 flex items-center gap-3">
                <Activity className="text-indigo-600" size={20} /> Analityka Podatkowa
             </h5>
             <div className="space-y-8">
                <div>
                   <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Efektywna Stopa Podatkowa</span>
                      <span className="text-[10px] font-black text-slate-900 uppercase italic">15.4%</span>
                   </div>
                   <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full w-[15.4%]"></div>
                   </div>
                </div>
                <div>
                   <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Wykorzystanie Kwoty Wolnej</span>
                      <span className="text-[10px] font-black text-slate-900 uppercase italic">82%</span>
                   </div>
                   <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full w-[82%]"></div>
                   </div>
                </div>
                <div>
                   <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Proporcja Kosztów (EBITDA Margin)</span>
                      <span className="text-[10px] font-black text-slate-900 uppercase italic">42%</span>
                   </div>
                   <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full w-[42%]"></div>
                   </div>
                </div>
             </div>
          </div>

          <div className="bg-indigo-600 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-indigo-100 group">
             <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
             <BarChart className="text-indigo-200 mb-6" size={32} />
             <h5 className="text-2xl font-black uppercase italic tracking-tighter mb-4 leading-tight">IP Box & Ulga B+R <br />Klasyfikator AI</h5>
             <p className="text-xs font-medium text-indigo-100 italic leading-relaxed mb-8">
                Nasz algorytm Vertex AI analizuje Twoje kody PKWiU i opisy transakcji, aby automatycznie wykryć możliwość zastosowania 5% stawki podatkowej.
             </p>
             <button className="flex items-center gap-3 bg-white text-indigo-600 px-8 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-xl">
                Uruchom Analizę Ulg <ArrowRight size={16} />
             </button>
          </div>
       </div>
    </div>
  );
}
