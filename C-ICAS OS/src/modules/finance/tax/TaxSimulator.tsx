/**
 * Data: 2026-05-12
 * Zmiany: Symulator optymalizacji podatkowej (Skala vs Liniowy vs Ryczałt).
 * Ścieżka: /src/modules/finance/tax/TaxSimulator.tsx
 */
import React, { useState } from 'react';
import { 
  Sparkles, TrendingUp, Info, ArrowRight,
  ShieldCheck, PieChart, ChevronRight, Zap
} from 'lucide-react';
import { motion } from 'motion/react';

export default function TaxSimulator() {
  const [revenue, setRevenue] = useState(25000);
  const [costs, setCosts] = useState(5000);

  const scenarios = [
    { id: 'scale', name: 'Skala Podatkowa', rate: '12% / 32%', tax: 3500, health: 1200, benefits: ['Kwota wolna 30k', 'Ulga na dzieci'], color: 'indigo' },
    { id: 'linear', name: 'Podatek Liniowy', rate: '19%', tax: 3800, health: 850, benefits: ['Stabilna stopa', 'Brak limitów'], color: 'slate' },
    { id: 'lump', name: 'Ryczałt (8.5%)', rate: '8.5%', tax: 2125, health: 650, benefits: ['Brak księgowania kosztów', 'Niska zdrowotna'], color: 'emerald' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-700">
       <div className="lg:col-span-1 space-y-8">
          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10">
             <div className="flex items-center gap-3 mb-8">
                <Sparkles className="text-indigo-600" size={20} />
                <h4 className="text-xl font-black text-slate-900 uppercase italic">Parametry AI</h4>
             </div>
             
             <div className="space-y-8">
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Przychód Miesięczny (Netto)</label>
                   <input 
                     type="range" 
                     min="5000" 
                     max="100000" 
                     step="1000"
                     value={revenue}
                     onChange={e => setRevenue(parseInt(e.target.value))}
                     className="w-full accent-indigo-600"
                   />
                   <div className="mt-4 text-2xl font-black text-slate-900 italic tracking-tighter">{revenue.toLocaleString()} PLN</div>
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Koszty Miesięczne (Netto)</label>
                   <input 
                     type="range" 
                     min="0" 
                     max="50000" 
                     step="500"
                     value={costs}
                     onChange={e => setCosts(parseInt(e.target.value))}
                     className="w-full accent-slate-400"
                   />
                   <div className="mt-4 text-2xl font-black text-slate-900 italic tracking-tighter">{costs.toLocaleString()} PLN</div>
                </div>
             </div>
          </div>

          <div className="bg-emerald-500 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
             <Zap className="text-emerald-200 mb-6" size={32} />
             <h5 className="text-2xl font-black uppercase italic tracking-tighter mb-4 leading-tight">Najlepsza Opcja</h5>
             <div className="bg-white/20 p-6 rounded-3xl backdrop-blur-md border border-white/30">
                <div className="text-[10px] font-black text-emerald-100 uppercase mb-2">Rekomendacja NoFiCo</div>
                <div className="text-3xl font-black italic tracking-tighter mb-1">Ryczałt 8.5%</div>
                <div className="text-xs font-bold text-emerald-100">Oszczędzasz ~1,400 PLN / m-c</div>
             </div>
          </div>
       </div>

       <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {scenarios.map(sc => (
               <div key={sc.id} className="bg-white border-2 border-slate-50 rounded-[3rem] p-8 shadow-sm hover:border-indigo-500 transition-all flex flex-col items-center text-center group">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${sc.id === 'lump' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-600'}`}>
                     <PieChart size={24} />
                  </div>
                  <h6 className="text-[13px] font-black text-slate-900 uppercase italic tracking-tight mb-2">{sc.name}</h6>
                  <div className="text-[10px] font-black text-indigo-500 uppercase italic mb-6">{sc.rate}</div>
                  
                  <div className="w-full space-y-4 mb-8 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                     <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase italic">
                        <span>Podatek</span>
                        <span className="text-slate-900">{sc.tax} PLN</span>
                     </div>
                     <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase italic">
                        <span>ZUS Zdrowotna</span>
                        <span className="text-slate-900">{sc.health} PLN</span>
                     </div>
                     <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-[11px] font-black text-slate-900 italic">
                        <span>Na rękę</span>
                        <span className="text-indigo-600">{(revenue - costs - sc.tax - sc.health).toLocaleString()} PLN</span>
                     </div>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-center">
                     {sc.benefits.map((b, i) => (
                       <span key={i} className="text-[8px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded uppercase italic tracking-widest">{b}</span>
                     ))}
                  </div>
               </div>
             ))}
          </div>

          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10 overflow-hidden relative">
             <div className="flex items-center gap-3 mb-8">
                <Info className="text-indigo-600" size={20} />
                <h5 className="text-sm font-black text-slate-900 uppercase italic">Zasady Wyboru Formy Opodatkowania 2026</h5>
             </div>
             
             <div className="grid grid-cols-2 gap-8 text-[11px] font-medium text-slate-500 italic leading-relaxed">
                <div className="space-y-4">
                   <p>Przejście na ryczałt jest możliwe tylko do 20-go dnia miesiąca następującego po miesiącu, w którym osiągnięto pierwszy przychód.</p>
                   <p>Dla usług IT (kod PKWiU 62.01.11) podstawowa stawka ryczałtu to 12% lub 8.5% (jeśli nie jest to doradztwo).</p>
                </div>
                <div className="space-y-4">
                   <p>Kwota wolna od podatku wynosi 30 000 PLN i dotyczy wyłącznie Skali Podatkowej.</p>
                   <p>W 2026 roku spodziewane są zmiany w składce zdrowotnej dla przedsiębiorców (ryczałt kwotowy).</p>
                </div>
             </div>
             
             <div className="mt-10 flex items-center gap-2 text-[9px] font-black text-indigo-500 uppercase tracking-widest italic group cursor-pointer">
                Pełna baza wiedzy NoFiCo Legal <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
             </div>
          </div>
       </div>
    </div>
  );
}
