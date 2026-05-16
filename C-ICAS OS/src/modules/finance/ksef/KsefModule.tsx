/**
 * Data: 2026-05-12
 * Zmiany: Główny moduł KSeF (Krajowy System e-Faktur).
 * Ścieżka: /src/modules/finance/ksef/KsefModule.tsx
 */
import React, { useState, lazy, Suspense } from 'react';
import {
  ShieldCheck, FileText, Download, Send,
  RefreshCw, Search, Filter, AlertCircle,
  CheckCircle2, Cloud, CloudOff, Activity, WifiOff, Scissors
} from 'lucide-react';
import KsefStatusBanner from './KsefStatusBanner';
import KsefInvoiceList from './KsefInvoiceList';

const KsefOffline24 = lazy(() => import('./KsefOffline24'));
const KsefSettings  = lazy(() => import('./KsefSettings'));

type KsefTab = 'sent' | 'received' | 'offline24' | 'settings';

const Loader = () => <div className="h-48 flex items-center justify-center"><div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" /></div>;

export default function KsefModule() {
  const [activeTab, setActiveTab] = useState<KsefTab>('received');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <KsefStatusBanner />

      <div className="flex flex-wrap gap-1 p-2 bg-slate-100 rounded-[2rem] w-fit">
         {[
           { id: 'received', label: 'Faktury Zakupowe', icon: Download },
           { id: 'sent', label: 'Wysłane (Przychody)', icon: Send },
           { id: 'offline24', label: 'Tryb Offline24', icon: WifiOff },
           { id: 'settings', label: 'Konfiguracja', icon: Activity }
         ].map(tab => (
           <button
             key={tab.id}
             onClick={() => setActiveTab(tab.id as KsefTab)}
             className={`flex items-center gap-3 px-6 py-4 rounded-[1.75rem] transition-all text-[11px] font-black uppercase tracking-widest ${
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
        {(activeTab === 'received' || activeTab === 'sent') && (
          <KsefInvoiceList type={activeTab === 'received' ? 'purchase' : 'sales'} />
        )}
        {activeTab === 'offline24' && (
          <Suspense fallback={<Loader />}><KsefOffline24 /></Suspense>
        )}
        {activeTab === 'settings' && (
          <Suspense fallback={<Loader />}><KsefSettings /></Suspense>
        )}
      </div>
    </div>
  );
}
