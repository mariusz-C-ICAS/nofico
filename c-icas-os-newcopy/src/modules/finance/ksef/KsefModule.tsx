/**
 * Data: 2026-05-12
 * Zmiany: Główny moduł KSeF (Krajowy System e-Faktur).
 * Ścieżka: /src/modules/finance/ksef/KsefModule.tsx
 */
import React, { useState } from 'react';
import { 
  ShieldCheck, FileText, Download, Send, 
  RefreshCw, Search, Filter, AlertCircle,
  CheckCircle2, Cloud, CloudOff, Activity
} from 'lucide-react';
import KsefStatusBanner from './KsefStatusBanner';
import KsefInvoiceList from './KsefInvoiceList';

type KsefTab = 'sent' | 'received' | 'settings';

export default function KsefModule() {
  const [activeTab, setActiveTab] = useState<KsefTab>('received');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <KsefStatusBanner />

      <div className="flex p-2 bg-slate-100 rounded-[2rem] w-fit">
         {[
           { id: 'received', label: 'Faktury Zakupowe', icon: Download },
           { id: 'sent', label: 'Wysłane (Przychody)', icon: Send },
           { id: 'settings', label: 'Konfiguracja', icon: Activity }
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
         <KsefInvoiceList type={activeTab === 'received' ? 'purchase' : 'sales'} />
      </div>
    </div>
  );
}
