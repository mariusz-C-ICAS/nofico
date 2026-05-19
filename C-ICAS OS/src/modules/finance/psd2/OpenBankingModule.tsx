/**
 * Data: 2026-05-12
 * Zmiany: Implementacja modułu Open Banking (PSD2).
 * Ścieżka: /src/modules/finance/psd2/OpenBankingModule.tsx
 */
import React, { useState, lazy, Suspense } from 'react';
import {
  ShieldCheck, ArrowRightLeft, CreditCard, RefreshCw,
  Search, Filter, Banknote, Smartphone, CheckCircle2,
  AlertCircle, ChevronRight, Zap, FileText, Upload, BookOpen
} from 'lucide-react';
import BankAuth from './BankAuth';
import TransactionList from './TransactionList';
import SwipeMatcher from './SwipeMatcher';
import BatchTransfer from './BatchTransfer';
import PaymentInitiator from './PaymentInitiator';

const Iso20022Import = lazy(() => import('./Iso20022Import'));
const NordigenImportPanel = lazy(() => import('./NordigenImportPanel'));
const ExternalAccountingPanel = lazy(() => import('../components/ExternalAccountingPanel'));

type OpenBankingTab = 'auth' | 'transactions' | 'match' | 'batch' | 'import' | 'nordigen' | 'fkexport';

export default function OpenBankingModule() {
  const [activeTab, setActiveTab] = useState<OpenBankingTab>('transactions');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* PSD2 Status Banner */}
      <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm overflow-hidden relative group">
         <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700"></div>
         <div className="flex items-center gap-6">
            <div className="bg-indigo-600 p-4 rounded-2xl shadow-lg shadow-indigo-200">
               <ShieldCheck className="text-white" size={24} />
            </div>
            <div>
               <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status PSD2 / Open Banking</div>
               <div className="flex items-center gap-3">
                  <h3 className="text-xl font-black text-slate-900 uppercase italic leading-none">Aktywne Połączenia</h3>
                  <span className="bg-emerald-500/10 text-emerald-600 text-[9px] font-black px-2 py-1 rounded border border-emerald-500/20 uppercase">SCA Verified</span>
               </div>
            </div>
         </div>
         <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowPaymentModal(true)}
              className="bg-indigo-600 text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
            >
               <Smartphone size={14} /> Nowy Przelew PISP
            </button>
            <div className="text-right hidden md:block">
               <div className="text-[10px] font-bold text-slate-400 uppercase">Czas do SCA</div>
               <div className="text-xs font-black text-slate-900">82 dni pozostało</div>
            </div>
            <button className="bg-slate-900 text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all">
               <RefreshCw size={14} className="animate-spin-slow" /> Odśwież Dane
            </button>
         </div>
      </div>

      {/* Internal Navigation */}
      <div className="flex p-2 bg-slate-100 rounded-[2rem] w-fit">
         {[
           { id: 'transactions', label: 'Transakcje', icon: RefreshCw },
           { id: 'match', label: 'Swipe & Match', icon: Smartphone },
           { id: 'batch', label: 'Paczka Przelewów', icon: FileText },
           { id: 'import', label: 'Import ISO 20022', icon: Upload },
           { id: 'nordigen', label: 'Import Nordigen', icon: Banknote },
           { id: 'auth', label: 'Moje Banki', icon: CreditCard },
           { id: 'fkexport', label: 'Eksport FK', icon: BookOpen }
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

      {/* Module Views */}
      <div className="min-h-[600px]">
         {activeTab === 'transactions' && <TransactionList />}
         {activeTab === 'auth' && <BankAuth />}
         {activeTab === 'match' && <SwipeMatcher />}
         {activeTab === 'batch' && <BatchTransfer />}
         {activeTab === 'import' && (
           <Suspense fallback={<div className="h-48 flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>}>
             <Iso20022Import />
           </Suspense>
         )}
         {activeTab === 'nordigen' && (
           <Suspense fallback={<div className="h-48 flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>}>
             <NordigenImportPanel />
           </Suspense>
         )}
         {activeTab === 'fkexport' && (
           <Suspense fallback={<div className="h-48 flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>}>
             <ExternalAccountingPanel />
           </Suspense>
         )}
      </div>

      {showPaymentModal && (
        <PaymentInitiator onClose={() => setShowPaymentModal(false)} />
      )}
    </div>
  );
}
