/**
 * Data: 2026-05-12
 * Zmiany: Integracja z zewnętrznymi systemami (Looker Studio, Drive, OneDrive).
 * Ścieżka: /src/modules/finance/reporting/DataExport.tsx
 */
import React from 'react';
import { 
  Database, Share2, ExternalLink, HardDrive, 
  Cloud, Lock, CheckCircle2, ShieldCheck,
  ChevronRight, ArrowRight
} from 'lucide-react';

export default function DataExport() {
  const integrations = [
    { id: 'looker', name: 'Looker Studio Connector', icon: Database, color: 'bg-indigo-100 text-indigo-600', status: 'connected' },
    { id: 'drive', name: 'Google Drive Sync', icon: Cloud, color: 'bg-emerald-100 text-emerald-600', status: 'connected' },
    { id: 'onedrive', name: 'Microsoft OneDrive', icon: HardDrive, color: 'bg-indigo-100 text-indigo-600', status: 'pending' },
    { id: 'bi', name: 'PowerBI Endpoints', icon: Share2, color: 'bg-amber-100 text-amber-600', status: 'none' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-700">
       <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm">
          <h4 className="text-xl font-black text-slate-900 uppercase italic mb-8">Konektory Zewnętrzne</h4>
          <div className="space-y-4">
             {integrations.map(int => (
               <div key={int.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-100/50 transition-all group">
                  <div className="flex items-center gap-4">
                     <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${int.color}`}>
                        <int.icon size={24} />
                     </div>
                     <div>
                        <div className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{int.name}</div>
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">{int.status === 'connected' ? 'Aktywne' : int.status === 'pending' ? 'W konfiguracji' : 'Niepołączone'}</div>
                     </div>
                  </div>
                  {int.status === 'connected' ? (
                    <div className="bg-emerald-500/10 text-emerald-600 p-2 rounded-full">
                       <CheckCircle2 size={16} />
                    </div>
                  ) : (
                    <button className="text-slate-300 hover:text-indigo-600 transition-colors">
                       <ArrowRight size={20} />
                    </button>
                  )}
               </div>
             ))}
          </div>
       </div>

       <div className="flex flex-col gap-8">
          <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"></div>
             <Lock className="text-indigo-400 mb-6" size={32} />
             <h4 className="text-2xl font-black uppercase italic tracking-tighter mb-4">Export Security (Envelope Encryption)</h4>
             <p className="text-xs font-medium text-indigo-100 italic leading-relaxed mb-10">
                Wszystkie dane przesyłane do Google Drive lub eksportowane jako ZIP są szyfrowane kluczem AES-256 z unikalnym "envelope" dla każdego sprawozdania.
             </p>
             <div className="flex items-center gap-3 bg-white/10 px-6 py-4 rounded-2xl w-fit">
                <ShieldCheck size={18} className="text-indigo-300" />
                <span className="text-[10px] font-black uppercase tracking-widest italic">Klucze KMS Managed</span>
             </div>
          </div>

          <div className="bg-indigo-600 rounded-[3rem] p-10 text-white shadow-2xl flex items-center justify-between group cursor-pointer hover:bg-indigo-700 transition-all">
             <div className="flex items-center gap-6">
                <div className="bg-white/20 p-4 rounded-2xl">
                   <ExternalLink className="text-white" size={24} />
                </div>
                <div>
                   <div className="text-[10px] font-black text-indigo-200 uppercase mb-1">Nowa Integracja</div>
                   <div className="text-lg font-black uppercase italic tracking-tight leading-none">Dodaj własny Endpoint (Webhook)</div>
                </div>
             </div>
             <ChevronRight className="group-hover:translate-x-2 transition-transform" />
          </div>
       </div>
    </div>
  );
}
