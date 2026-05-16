import React, { useState } from 'react';
import { MapPin, ShieldCheck, X, CheckCircle2 } from 'lucide-react';
import { saveGpsConsent } from '../services/gpsService';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';

interface Props {
  onClose: (consented: boolean) => void;
}

export default function GpsConsentModal({ onClose }: Props) {
  const { user }          = useAuth();
  const { activeTenantId } = useTenant();
  const [saving, setSaving] = useState(false);

  const handle = async (consent: boolean) => {
    if (!user || !activeTenantId) return onClose(false);
    setSaving(true);
    try {
      await saveGpsConsent(activeTenantId, user.uid, consent);
      onClose(consent);
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full p-8 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center flex-shrink-0">
            <MapPin size={24} className="text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">Śledzenie GPS</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Zgoda RODO / GDPR</p>
          </div>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed">
          Aplikacja może rejestrować Twoją lokalizację <strong>wyłącznie podczas pracy</strong>
          w celu optymalizacji tras, kalkulacji czasu dojazdu i planowania harmonogramów.
        </p>

        <ul className="space-y-2">
          {[
            'Lokalizacja zbierana tylko w godzinach pracy',
            'Dane GPS nie są udostępniane osobom trzecim',
            'Możesz wycofać zgodę w ustawieniach w dowolnej chwili',
            'Dane przechowywane max. 12 miesięcy zgodnie z RODO',
          ].map(t => (
            <li key={t} className="flex items-start gap-2">
              <ShieldCheck size={12} className="text-emerald-500 mt-0.5 flex-shrink-0" />
              <span className="text-xs text-slate-600">{t}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2 pt-2">
          <button
            disabled={saving}
            onClick={() => handle(true)}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-black px-6 py-3 rounded-2xl text-xs uppercase tracking-widest"
          >
            <CheckCircle2 size={14} /> Wyrażam zgodę
          </button>
          <button
            disabled={saving}
            onClick={() => handle(false)}
            className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-600 font-black px-6 py-3 rounded-2xl text-xs uppercase tracking-widest"
          >
            <X size={14} /> Odmawiam
          </button>
        </div>

        <p className="text-[9px] text-slate-400 text-center leading-relaxed">
          Administrator: Twoja firma · Podstawa prawna: art. 6 ust. 1 lit. a RODO
        </p>
      </div>
    </div>
  );
}
