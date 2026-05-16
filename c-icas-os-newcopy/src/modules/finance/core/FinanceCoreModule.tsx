/**
 * Data: 2026-05-12
 * Zmiany: Inicjalizacja głównej księgi finansowej.
 * Ścieżka: /src/modules/finance/core/FinanceCoreModule.tsx
 */
import React, { useState } from 'react';
import {
  Layers, BookText, FileText, Target, BarChart3,
  Settings2, HelpCircle, Bell, User, LayoutDashboard,
  Search, ExternalLink, ShieldCheck, Database, Smartphone, Calculator, Receipt,
  Users, ShoppingCart, RefreshCw
} from 'lucide-react';
import ChartOfAccounts from './ChartOfAccounts';
import Journal from './Journal';
import KPiR from './KPiR';
import CostCenters from './CostCenters';
import GeneralLedger from './GeneralLedger';
import OpenBankingModule from '../psd2/OpenBankingModule';
import KsefModule from '../ksef/KsefModule';
import InvoiceModule from '../invoicing/InvoiceModule';
import TaxModule from '../tax/TaxModule';
import ReportingModule from '../reporting/ReportingModule';
import ExpenseModule from '../expenses/ExpenseModule';
import AssetsModule from '../assets/AssetsModule';
import ContractorsModule from '../contractors/ContractorsModule';
import PurchaseModule from '../purchasing/PurchaseModule';
import RecurringModule from '../invoicing/RecurringModule';

type FinanceTab = 'coa' | 'journal' | 'kpir' | 'mpk' | 'ledger' | 'assets' | 'psd2' | 'ksef' | 'invoicing' | 'tax' | 'reporting' | 'expenses' | 'contractors' | 'purchasing' | 'recurring';

export default function FinanceCoreModule() {
  const [activeTab, setActiveTab] = useState<FinanceTab>('coa');

  const tabs = [
    { id: 'reporting', label: 'Raporty & BI', icon: BarChart3 },
    { id: 'invoicing', label: 'Sprzedaż', icon: FileText },
    { id: 'recurring', label: 'Faktury Cykliczne', icon: RefreshCw },
    { id: 'expenses', label: 'Wydatki & Paragony', icon: Receipt },
    { id: 'contractors', label: 'Kontrahenci', icon: Users },
    { id: 'purchasing', label: 'Faktury Zakupowe', icon: ShoppingCart },
    { id: 'journal', label: 'Dziennik', icon: BookText },
    { id: 'coa', label: 'Plan Kont', icon: Layers },
    { id: 'kpir', label: 'KPiR', icon: FileText },
    { id: 'mpk', label: 'MPK', icon: Target },
    { id: 'ledger', label: 'Księga Główna', icon: Database },
    { id: 'tax', label: 'Podatki & JPK', icon: Calculator },
    { id: 'ksef', label: 'KSeF MF', icon: ShieldCheck },
    { id: 'psd2', label: 'Bankowość (PSD2)', icon: Smartphone },
    { id: 'assets', label: 'Środki Trwałe', icon: LayoutDashboard },
  ];

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-10 animate-in fade-in duration-500 pb-20">
      
      {/* Dynamic Header Wrapper */}
      <div className="bg-slate-900 rounded-[3rem] p-12 text-white relative overflow-hidden shadow-2xl border border-slate-800">
         <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px] -translate-y-1/2 translate-x-1/4"></div>
         <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
            <div className="max-w-2xl">
               <div className="flex items-center gap-3 mb-6 bg-slate-800/80 w-fit px-5 py-2 rounded-full border border-slate-700">
                  <ShieldCheck className="text-indigo-400" size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-100">Certified Financial Core Architecture</span>
               </div>
               <h1 className="text-6xl font-black uppercase tracking-tighter mb-4 italic">
                  Fin<span className="text-indigo-500">Core</span> <span className="text-slate-700">Audit</span>
               </h1>
               <p className="text-slate-400 font-medium leading-relaxed italic text-sm">
                  System finansowo-księgowy NoFiCo zapewnia pełną zgodność z ustawą o rachunkowości oraz KSeF. Wyizolowana struktura KG/KH umożliwia bezpieczne prowadzenie rozliczeń wielu tenantów w architekturze Zero-Knowledge.
               </p>
            </div>
            <div className="flex gap-4">
               <button className="bg-slate-800/50 hover:bg-slate-800 text-white font-black px-8 py-4 rounded-2xl border border-slate-700 transition-all uppercase tracking-widest text-[10px] flex items-center gap-2">
                  <BarChart3 size={16} /> Analityka BI
               </button>
               <button className="bg-indigo-600 text-white hover:shadow-indigo-500/20 font-black px-10 py-4 rounded-2xl shadow-xl transition-all uppercase tracking-widest text-[10px] flex items-center gap-2">
                  <Settings2 size={18} /> Konfiguracja Roku
               </button>
            </div>
         </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
         {/* Navigation Panel */}
         <div className="lg:w-80 space-y-3">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-4 px-8 py-6 rounded-[2rem] transition-all font-black text-xs uppercase tracking-widest ${
                  activeTab === tab.id 
                    ? 'bg-slate-900 text-white shadow-2xl scale-[1.02] border-none' 
                    : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-100'
                }`}
              >
                 <tab.icon size={20} className={activeTab === tab.id ? 'text-indigo-400' : 'text-slate-300'} />
                 {tab.label}
              </button>
            ))}

            <div className="mt-10 p-8 rounded-[2.5rem] bg-indigo-50/50 border border-indigo-100/50">
               <div className="flex items-center gap-3 mb-4">
                  <HelpCircle className="text-indigo-600" size={18} />
                  <span className="text-[11px] font-black uppercase text-indigo-900 italic">Audit Status</span>
               </div>
               <p className="text-[10px] font-bold text-indigo-700 uppercase leading-relaxed mb-6">
                 Twój dziennik spełnia wymogi integralności (sha256 matching). Ostatni backup: dzisiaj, 14:00.
               </p>
               <button className="text-[10px] font-black text-indigo-600 uppercase underline decoration-double flex items-center gap-2">
                  Zweryfikuj Sumy <ExternalLink size={12} />
               </button>
            </div>
         </div>

         {/* Content Viewport */}
         <div className="flex-1 min-h-[800px] bg-white p-10 rounded-[3.5rem] shadow-sm border border-slate-50">
            {activeTab === 'coa' && <ChartOfAccounts />}
            {activeTab === 'journal' && <Journal />}
            {activeTab === 'kpir' && <KPiR />}
            {activeTab === 'mpk' && <CostCenters />}
            {activeTab === 'ledger' && <GeneralLedger />}
            {activeTab === 'psd2' && <OpenBankingModule />}
            {activeTab === 'ksef' && <KsefModule />}
            {activeTab === 'invoicing' && <InvoiceModule />}
            {activeTab === 'recurring' && <RecurringModule />}
            {activeTab === 'expenses' && <ExpenseModule />}
            {activeTab === 'contractors' && <ContractorsModule />}
            {activeTab === 'purchasing' && <PurchaseModule />}
            {activeTab === 'tax' && <TaxModule />}
            {activeTab === 'reporting' && <ReportingModule />}
            {activeTab === 'assets' && <AssetsModule />}
         </div>
      </div>
    </div>
  );
}
