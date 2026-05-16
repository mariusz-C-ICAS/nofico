/**
 * Data: 2026-05-12
 * Zmiany: Główny moduł fakturowania sprzedaży.
 * Ścieżka: /src/modules/finance/invoicing/InvoiceModule.tsx
 */
import React, { useState } from 'react';
import { 
  Plus, Search, Filter, FileText, Download, 
  Send, CreditCard, Sparkles, AlertCircle,
  MoreVertical, ChevronRight, LayoutDashboard,
  Calendar, ArrowRight
} from 'lucide-react';
import InvoiceList from './InvoiceList';
import InvoiceForm from './InvoiceForm';

type InvoiceTab = 'all' | 'unpaid' | 'proformas' | 'drafts';

export default function InvoiceModule() {
  const [activeTab, setActiveTab] = useState<InvoiceTab>('all');
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Sales Stats Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sprzedaż Bieżąca</div>
            <div className="text-3xl font-black text-slate-900 italic tracking-tighter mb-2">124,500.00</div>
            <div className="text-[9px] font-bold text-emerald-500 uppercase flex items-center gap-1">
               <ArrowRight size={10} className="-rotate-45" /> +12% vs poprz. mies.
            </div>
         </div>
         <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Należności</div>
            <div className="text-3xl font-black text-rose-600 italic tracking-tighter mb-2">12,300.00</div>
            <div className="text-[9px] font-bold text-rose-400 uppercase">3 faktury przeterminowane</div>
         </div>
         <div className="bg-indigo-600 rounded-[2.5rem] p-8 shadow-xl shadow-indigo-100 relative overflow-hidden group md:col-span-2">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <div className="relative z-10 flex justify-between items-center h-full">
               <div>
                  <div className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-2 italic">NoFiCo AI Insights</div>
                  <h4 className="text-xl font-black text-white uppercase italic tracking-tighter leading-tight">
                     Sugerujemy wystawienie faktur cyklicznych <br />dla 4 klientów z grupy "Abonamenty".
                  </h4>
               </div>
               <button className="bg-white text-indigo-600 p-4 rounded-2xl shadow-xl hover:scale-110 transition-transform">
                  <Sparkles size={24} />
               </button>
            </div>
         </div>
      </div>

      {/* Actions & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
         <div className="flex p-2 bg-slate-100 rounded-[2rem] w-fit">
            {[
              { id: 'all', label: 'Wszystkie', count: 42 },
              { id: 'unpaid', label: 'Nieopłacone', count: 5 },
              { id: 'proformas', label: 'Proformy', count: 3 },
              { id: 'drafts', label: 'Szkice', count: 2 }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-4 rounded-[1.75rem] transition-all text-[11px] font-black uppercase tracking-widest ${
                  activeTab === tab.id 
                    ? 'bg-white text-slate-900 shadow-xl' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                }`}
              >
                 {tab.label}
                 <span className="text-[9px] opacity-40">({tab.count})</span>
              </button>
            ))}
         </div>
         
         <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="flex-1 md:w-64 relative">
               <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
               <input 
                 type="text" 
                 placeholder="Szukaj faktury..."
                 className="w-full bg-slate-100 border-none rounded-2xl pl-16 pr-8 py-4 text-xs font-black uppercase italic tracking-tighter"
               />
            </div>
            <button 
              onClick={() => setShowForm(true)}
              className="bg-slate-900 text-white px-8 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-indigo-600 transition-all shadow-2xl shadow-slate-100"
            >
               <Plus size={18} /> Nowa Faktura
            </button>
         </div>
      </div>

      <InvoiceList />

      {showForm && (
        <InvoiceForm onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}
