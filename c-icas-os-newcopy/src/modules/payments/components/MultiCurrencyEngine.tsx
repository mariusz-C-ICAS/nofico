/**
 * Data: 2026-05-12
 * Zmiany: Kursy walut i przeliczenia multi-currency.
 * Ścieżka: /src/modules/payments/components/MultiCurrencyEngine.tsx
 */
import React, { useState } from 'react';
import { Globe, RefreshCw, TrendingUp, TrendingDown, Info } from 'lucide-react';

export default function MultiCurrencyEngine() {
  const [amount, setAmount] = useState('1000');
  
  const rates = [
    { pair: 'EUR/PLN', rate: '4.3221', trend: 'down', change: '-0.12%' },
    { pair: 'USD/PLN', rate: '3.9850', trend: 'up', change: '+0.45%' },
    { pair: 'GBP/PLN', rate: '5.1244', trend: 'up', change: '+0.08%' },
    { pair: 'CHF/PLN', rate: '4.4502', trend: 'down', change: '-0.33%' }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
       <div className="lg:col-span-8">
          <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm">
             <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                      <Globe size={24} />
                   </div>
                   <div>
                      <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Multi-Currency Hub</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Live Exchange Rates & Batch Conversion</p>
                   </div>
                </div>
                <button className="p-4 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-2xl transition-colors">
                   <RefreshCw size={20} />
                </button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                {rates.map(rate => (
                   <div key={rate.pair} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-100 transition-all">
                      <div>
                         <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">{rate.pair}</div>
                         <div className="text-xl font-black text-slate-900 italic tracking-tighter">{rate.rate}</div>
                      </div>
                      <div className={`flex items-center gap-2 text-[10px] font-black uppercase italic ${rate.trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
                         {rate.trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                         {rate.change}
                      </div>
                   </div>
                ))}
             </div>

             <div className="p-8 bg-indigo-600 rounded-[2rem] text-white">
                <h4 className="text-[10px] font-black uppercase tracking-widest italic mb-6 text-indigo-200">Przelicznik Walutowy (Sim)</h4>
                <div className="flex flex-col md:flex-row gap-6">
                   <div className="flex-1">
                      <input 
                         type="number" 
                         value={amount}
                         onChange={(e) => setAmount(e.target.value)}
                         className="w-full bg-white/10 border-2 border-white/10 rounded-2xl px-8 py-4 text-2xl font-black italic focus:outline-none focus:border-white focus:bg-white/20 transition-all"
                      />
                   </div>
                   <div className="flex items-center justify-center">
                      <RefreshCw className="text-indigo-300" />
                   </div>
                   <div className="flex-1 bg-white/10 border-2 border-white/10 rounded-2xl px-8 py-4 text-2xl font-black italic flex items-center">
                      {(parseFloat(amount || '0') * 4.3221).toFixed(2)} <span className="ml-2 text-sm uppercase text-indigo-300">PLN</span>
                   </div>
                </div>
             </div>
          </div>
       </div>

       <div className="lg:col-span-4">
          <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl h-full relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-[100px]"></div>
             <Info className="text-amber-400 mb-8" size={32} />
             <h4 className="text-xl font-black uppercase italic tracking-tighter mb-8 text-white leading-tight">Konfiguracja Rezerw Walutowych</h4>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic mb-10 leading-relaxed">System automatycznie zabezpiecza kursy walut dla transakcji powyżej 50.000 PLN wykorzystując instrumenty forward (symulacja).</p>
             
             <div className="space-y-6">
                {[
                   { label: 'Ekspozycja EUR', value: '1.2M', pct: 65 },
                   { label: 'Ekspozycja USD', value: '450K', pct: 25 },
                   { label: 'Inne', value: '180K', pct: 10 }
                ].map(exp => (
                   <div key={exp.label} className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase italic">
                         <span className="text-slate-400 tracking-widest">{exp.label}</span>
                         <span className="text-white">{exp.value}</span>
                      </div>
                      <div className="bg-white/5 h-1.5 rounded-full overflow-hidden">
                         <div className="bg-indigo-500 h-full" style={{ width: `${exp.pct}%` }}></div>
                      </div>
                   </div>
                ))}
             </div>
          </div>
       </div>
    </div>
  );
}
