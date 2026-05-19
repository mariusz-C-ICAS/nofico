import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, CheckCircle2, AlertTriangle, Hash, Info } from 'lucide-react';
import {
  getEkrsProConfig,
  lookupByKrs,
  type EkrsProConfig,
  type EkrsCompanyData,
} from '../services/ekrsProService';

interface Props {
  tenantId: string;
  onFill: (data: EkrsCompanyData) => void;
  initialKrs?: string;
}

type ConfigState = 'loading' | 'missing' | 'ready';

export default function KrsLookup({ tenantId, onFill, initialKrs = '' }: Props) {
  const [krs, setKrs] = useState(initialKrs);
  const [cfg, setCfg] = useState<EkrsProConfig | null>(null);
  const [configState, setConfigState] = useState<ConfigState>('loading');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EkrsCompanyData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getEkrsProConfig(tenantId).then(config => {
      setCfg(config);
      setConfigState(config ? 'ready' : 'missing');
    });
  }, [tenantId]);

  if (configState === 'loading') {
    return (
      <div className="flex items-center gap-2 text-[11px] text-slate-400 py-1">
        <RefreshCw size={11} className="animate-spin" /> Sprawdzanie konfiguracji e-KRS Pro...
      </div>
    );
  }

  if (configState === 'missing') {
    return (
      <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
        <Info size={12} className="flex-shrink-0 text-slate-400" />
        Skonfiguruj e-KRS Pro w Integracjach, aby korzystać z auto-uzupelniania po KRS.
      </div>
    );
  }

  const cleanKrs = krs.replace(/\D/g, '');
  const canSearch = cleanKrs.length >= 8 && cleanKrs.length <= 10;

  const handleLookup = async () => {
    if (!canSearch || !cfg) return;
    setLoading(true);
    setError(null);
    setResult(null);
    const data = await lookupByKrs(cleanKrs, cfg.apiUrl, cfg.apiKey);
    if (data) {
      setResult(data);
    } else {
      setError('Nie znaleziono spólki dla podanego numeru KRS lub wystapil blad API.');
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLookup();
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={krs}
            onChange={e => { setKrs(e.target.value); setResult(null); setError(null); }}
            onKeyDown={handleKeyDown}
            placeholder="Wpisz numer KRS..."
            maxLength={10}
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
          />
        </div>
        <button
          onClick={handleLookup}
          disabled={loading || !canSearch}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-black text-xs px-4 py-2.5 rounded-xl"
        >
          {loading ? <RefreshCw size={12} className="animate-spin" /> : <Search size={12} />}
          Szukaj KRS
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-[11px] text-red-600 bg-red-50 rounded-xl px-3 py-2 border border-red-200">
          <AlertTriangle size={12} className="flex-shrink-0" /> {error}
        </div>
      )}

      {result && (
        <div className="bg-violet-50 rounded-2xl border border-violet-200 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Hash size={16} className="text-violet-700" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-black text-slate-900">{result.name}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                <span className="text-[10px] font-mono text-slate-500">KRS: {result.krs}</span>
                {result.nip && <span className="text-[10px] font-mono text-slate-400">NIP: {result.nip}</span>}
                {result.regon && <span className="text-[10px] font-mono text-slate-400">REGON: {result.regon}</span>}
              </div>
              {result.pkd && (
                <p className="text-[10px] text-slate-500">PKD: {result.pkd}</p>
              )}
              {result.address && (
                <p className="text-[10px] text-slate-600">{result.address}</p>
              )}
              {result.managementBoard.length > 0 && (
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 mb-0.5">Zarzad</p>
                  <div className="flex flex-wrap gap-1">
                    {result.managementBoard.map((member, i) => (
                      <span key={i} className="text-[10px] bg-violet-100 text-violet-700 rounded-lg px-2 py-0.5 font-medium">
                        {member}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => onFill(result)}
            className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-black text-xs py-2 rounded-xl uppercase tracking-widest"
          >
            <CheckCircle2 size={12} /> Wypelnij formularz danymi KRS
          </button>
        </div>
      )}
    </div>
  );
}
