/**
 * Data: 2026-05-16
 * Zmiany: Realny status KSeF z getKsefStatus() + przycisk Autoryzuj KSeF.
 * Ścieżka: /src/modules/finance/ksef/KsefStatusBanner.tsx
 */
import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Cloud, CloudOff, Activity,
  RefreshCw, Zap, Settings
} from 'lucide-react';
import { getKsefStatus, type KsefStatusResult } from '../services/ksefService';
import { useTenant } from '../../../shared/hooks/useTenant';
import KsefAuthModal from './KsefAuthModal';

export default function KsefStatusBanner() {
  const { activeTenantId } = useTenant();
  const tenantId = activeTenantId ?? 'default';

  const [status, setStatus] = useState<KsefStatusResult>({
    connected: false,
    sessionActive: false,
  });
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getKsefStatus(tenantId)
      .then((s) => { if (!cancelled) setStatus(s); })
      .catch(() => { if (!cancelled) setStatus({ connected: false, sessionActive: false }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tenantId]);

  const connectionLabel = loading
    ? 'Sprawdzam...'
    : status.connected
      ? 'Polaczono'
      : 'Offline';

  const connectionDotClass = loading
    ? 'bg-slate-400'
    : status.connected
      ? 'bg-emerald-500 animate-pulse'
      : 'bg-red-500';

  const connectionIconBg = status.connected ? 'bg-emerald-50' : 'bg-red-50';
  const connectionIcon = status.connected
    ? <Cloud className="text-emerald-600" size={24} />
    : <CloudOff className="text-red-500" size={24} />;

  const sessionLabel = status.sessionActive ? 'Sesja aktywna' : 'Brak sesji';
  const sessionDotClass = status.sessionActive
    ? 'bg-emerald-500 animate-pulse'
    : 'bg-yellow-400';

  const sessionExpLabel = status.sessionExpiresAt
    ? `Wygasa: ${new Date(status.sessionExpiresAt).toLocaleTimeString('pl-PL')}`
    : 'Brak aktywnej sesji';

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Karta 1: status polaczenia */}
        <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 shadow-sm relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                System KSeF MF
              </div>
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-black text-slate-900 uppercase italic">
                  {connectionLabel}
                </h3>
                <div className={`w-2 h-2 rounded-full ${connectionDotClass}`} />
              </div>
            </div>
            <div className={`${connectionIconBg} p-4 rounded-2xl`}>
              {connectionIcon}
            </div>
          </div>
          <div className="mt-6 flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase italic">
            <Activity size={12} className="text-emerald-500" /> API: Prod Environment (V2)
          </div>
        </div>

        {/* Karta 2: status sesji */}
        <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 shadow-sm relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Sesja KSeF
              </div>
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-black text-slate-900 uppercase italic">
                  {sessionLabel}
                </h3>
                <div className={`w-2 h-2 rounded-full ${sessionDotClass}`} />
              </div>
            </div>
            <div className="bg-indigo-50 p-4 rounded-2xl">
              <Zap className="text-indigo-600" size={24} />
            </div>
          </div>
          <div className="mt-6 flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase italic">
            <RefreshCw size={12} className="text-indigo-500" />
            {sessionExpLabel}
          </div>
        </div>

        {/* Karta 3: akcje + UPO queue */}
        <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden group border-4 border-indigo-500/20">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="flex items-start justify-between relative z-10">
            <div>
              <div className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-2">
                UPO Queue
              </div>
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-black text-white uppercase italic">
                  Oczekujace: 0
                </h3>
              </div>
            </div>
            <div className="bg-white/10 p-4 rounded-2xl">
              <ShieldCheck className="text-indigo-300" size={24} />
            </div>
          </div>
          <div className="mt-6 relative z-10">
            <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest italic mb-4">
              Wszystkie faktury otrzymaly numer KSeF
            </div>
            <button
              onClick={() => setAuthModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors"
            >
              <Settings size={12} />
              Autoryzuj KSeF
            </button>
          </div>
        </div>
      </div>

      <KsefAuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        tenantId={tenantId}
      />
    </>
  );
}
