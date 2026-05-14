/**
 * Data: 2026-05-12
 * Zmiany: Główny moduł CRM (Klienci, Pipeline, Oferty).
 * Ścieżka: /src/modules/crm/ClientCrmModule.tsx
 */
import React, { useState } from 'react';
import { 
  Users, Target, FileText, Activity, 
  Plus, Search, Filter, Mail, Phone,
  TrendingUp, CheckCircle2, AlertCircle,
  LayoutGrid, List as ListIcon, Calendar
} from 'lucide-react';
import CustomerList from './components/CustomerList';
import DealsPipeline from './components/DealsPipeline';
import QuoteEditor from './components/QuoteEditor';

type CrmTab = 'customers' | 'pipeline' | 'quotes' | 'activities';

export default function ClientCrmModule() {
  const [activeTab, setActiveTab] = useState<CrmTab>('pipeline');

  return (
    <div className="max-w-[1600px] mx-auto p-10 space-y-10 animate-in fade-in duration-500">
      {/* CRM Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
         <div>
            <div className="flex items-center gap-3 mb-2">
               <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-200">
                  <Target className="text-white" size={20} />
               </div>
               <h1 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">CRM & Growth</h1>
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] italic">System Relacji NoFiCo V5</p>
         </div>

         <div className="flex gap-4">
            <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 shadow-sm flex items-center gap-6">
               <div className="text-right">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Pipeline Value</div>
                  <div className="text-xl font-black text-slate-900 italic">2.4M <span className="text-[10px] text-slate-400">PLN</span></div>
               </div>
               <div className="w-px h-10 bg-slate-100" />
               <div className="text-right">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Win Rate</div>
                  <div className="text-xl font-black text-indigo-600 italic">64%</div>
               </div>
            </div>
         </div>
      </div>

      {/* Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-100 pb-10">
         <div className="flex p-2 bg-slate-100 rounded-[2.5rem] w-fit">
            {[
              { id: 'pipeline', label: 'Lejek (Pipeline)', icon: Target },
              { id: 'customers', label: 'Klienci', icon: Users },
              { id: 'quotes', label: 'Oferty', icon: FileText },
              { id: 'activities', label: 'Aktywności', icon: Activity }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-3 px-8 py-5 rounded-[2rem] transition-all text-[11px] font-black uppercase tracking-widest ${
                  activeTab === tab.id 
                    ? 'bg-white text-slate-900 shadow-2xl scale-[1.02]' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                }`}
              >
                 <tab.icon size={16} />
                 {tab.label}
              </button>
            ))}
         </div>

         <div className="flex gap-4">
            <div className="relative group">
               <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-indigo-600 transition-colors" size={18} />
               <input 
                  type="text" 
                  placeholder="SZUKAJ KLIENTA / DEAL-A..." 
                  className="bg-white border-2 border-slate-100 rounded-[2rem] pl-16 pr-8 py-5 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-indigo-600 transition-all w-[300px]"
               />
            </div>
            <button className="bg-slate-900 text-white px-10 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-indigo-600 transition-all shadow-2xl shadow-indigo-100">
               <Plus size={18} /> Nowy Klient
            </button>
         </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
         {activeTab === 'pipeline' && <DealsPipeline />}
         {activeTab === 'customers' && <CustomerList />}
         {activeTab === 'quotes' && <QuoteEditor />}
         {activeTab === 'activities' && (
           <div className="bg-white border-2 border-dashed border-slate-200 rounded-[3rem] p-40 flex flex-col items-center text-center">
              <Calendar size={64} className="text-slate-200 mb-8" />
              <h3 className="text-2xl font-black text-slate-900 uppercase italic mb-4">Rejestr Zdarzeń</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest max-w-sm">Synchronizacja z Google Calendar i Gmail w toku.</p>
           </div>
         )}
      </div>
    </div>
  );
}
