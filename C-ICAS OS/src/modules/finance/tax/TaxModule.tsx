/**
 * Data: 2026-05-12
 * Zmiany: Główny moduł podatkowy (PIT/CIT/VAT/JPK).
 * Ścieżka: /src/modules/finance/tax/TaxModule.tsx
 */
import React, { useState } from 'react';
import { 
  Calculator, FileCode, BarChart3, ShieldCheck, 
  Download, Send, RefreshCw, Layers, Sparkles,
  PieChart, TrendingUp, AlertCircle
} from 'lucide-react';
import TaxCalculator from './TaxCalculator';
import JpkGenerator from './JpkGenerator';
import TaxSimulator from './TaxSimulator';

type TaxTab = 'calc' | 'jpk' | 'simulator' | 'history';

export default function TaxModule() {
  const [activeTab, setActiveTab] = useState<TaxTab>('calc');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Tax Liability Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Zaliczka PIT/CIT (Maj)</div>
            <div className="text-3xl font-black text-slate-900 italic tracking-tighter mb-2">4,320.50 <span className="text-xs text-slate-400">PLN</span></div>
            <div className="text-[9px] font-bold text-amber-500 uppercase flex items-center gap-1">
               Termin: 20.06.2026
            </div>
         </div>
         <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Podatek VAT (Maj)</div>
            <div className="text-3xl font-black text-slate-900 italic tracking-tighter mb-2">12,890.00 <span className="text-xs text-slate-400">PLN</span></div>
            <div className="text-[9px] font-bold text-emerald-500 uppercase">Do odliczenia: 2,450.00 PLN</div>
         </div>
         <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"></div>
            <div className="relative z-10">
               <div className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">Optymalizacja NoFiCo</div>
               <div className="text-xl font-black text-white italic mb-2">Oszczędność: 1,240 PLN</div>
               <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                  <Sparkles size={12} /> Wykryto ulgę IP Box 5%
               </div>
            </div>
         </div>
      </div>

      {/* Internal Navigation */}
      <div className="flex p-2 bg-slate-100 rounded-[2rem] w-fit">
         {[
           { id: 'calc', label: 'Obciążenia', icon: Calculator },
           { id: 'jpk', label: 'Generator JPK', icon: FileCode },
           { id: 'simulator', label: 'Symulator Podatkowy', icon: Sparkles },
           { id: 'history', label: 'e-Deklaracje', icon: ShieldCheck }
         ].map(tab => (
           <button
             key={tab.id}
             onClick={() => setActiveTab(tab.id as any)}
             className={`flex items-center gap-3 px-8 py-4 rounded-[1.75rem] transition-all text-[11px] font-black uppercase tracking-widest ${
               activeTab === tab.id 
                 ? 'bg-white text-slate-900 shadow-xl scale-[1.02]' 
                 : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
             }`}
           >
              <tab.icon size={16} />
              {tab.label}
           </button>
         ))}
      </div>

      <div className="min-h-[600px]">
         {activeTab === 'calc' && <TaxCalculator />}
         {activeTab === 'jpk' && <JpkGenerator />}
         {activeTab === 'simulator' && <TaxSimulator />}
         {activeTab === 'history' && (
           <div className="h-[400px] flex flex-col items-center justify-center text-center">
              <ShieldCheck size={48} className="text-slate-200 mb-6" />
              <h4 className="text-xl font-black text-slate-900 uppercase italic mb-2">Baza UPO & e-Deklaracje</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pobieranie potwierdzeń z serwerów MF...</p>
           </div>
         )}
      </div>
    </div>
  );
}
