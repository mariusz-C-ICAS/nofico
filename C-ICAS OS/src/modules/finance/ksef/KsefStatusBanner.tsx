/**
 * Data: 2026-05-12
 * Zmiany: Banner statusu KSeF z obsługą trybu Offline24.
 * Ścieżka: /src/modules/finance/ksef/KsefStatusBanner.tsx
 */
import React from 'react';
import { 
  ShieldCheck, Cloud, CloudOff, Activity, 
  AlertCircle, RefreshCw, Zap
} from 'lucide-react';

export default function KsefStatusBanner() {
  const ksefStatus = 'online'; // 'online' | 'offline' | 'maintenance'

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
       <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 shadow-sm relative overflow-hidden group">
          <div className="flex items-start justify-between">
             <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">System KSeF MF</div>
                <div className="flex items-center gap-3">
                   <h3 className="text-2xl font-black text-slate-900 uppercase italic">Połączono</h3>
                   <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                </div>
             </div>
             <div className="bg-emerald-50 p-4 rounded-2xl">
                <Cloud className="text-emerald-600" size={24} />
             </div>
          </div>
          <div className="mt-6 flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase italic">
             <Activity size={12} className="text-emerald-500" /> API: Prod Environment (V2)
          </div>
       </div>

       <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 shadow-sm relative overflow-hidden group">
          <div className="flex items-start justify-between">
             <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Offline24 Sync</div>
                <div className="flex items-center gap-3">
                   <h3 className="text-2xl font-black text-slate-900 uppercase italic">Zsynchronizowano</h3>
                </div>
             </div>
             <div className="bg-indigo-50 p-4 rounded-2xl">
                <Zap className="text-indigo-600" size={24} />
             </div>
          </div>
          <div className="mt-6 flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase italic">
             <RefreshCw size={12} className="text-indigo-500 animate-spin-slow" /> Ostatnia synchronizacja: 2 minuty temu
          </div>
       </div>

       <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden group border-4 border-indigo-500/20">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="flex items-start justify-between relative z-10">
             <div>
                <div className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-2">UPO Queue</div>
                <div className="flex items-center gap-3">
                   <h3 className="text-2xl font-black text-white uppercase italic">Oczekujące: 0</h3>
                </div>
             </div>
             <div className="bg-white/10 p-4 rounded-2xl">
                <ShieldCheck className="text-indigo-300" size={24} />
             </div>
          </div>
          <div className="mt-6 text-[9px] font-black text-indigo-400 uppercase tracking-widest italic relative z-10">
             Wszystkie faktury otrzymały numer KSeF
          </div>
       </div>
    </div>
  );
}
