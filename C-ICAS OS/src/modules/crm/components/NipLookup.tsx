import React, { useState } from 'react';
import { Search, RefreshCw, CheckCircle2, AlertTriangle, Building2, ShieldCheck, ShieldX } from 'lucide-react';
import { lookupNip, type GusCompanyData } from '../services/gusApiService';

interface Props {
  onFill: (data: GusCompanyData) => void;
  initialNip?: string;
}

export default function NipLookup({ onFill, initialNip = '' }: Props) {
  const [nip, setNip] = useState(initialNip);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GusCompanyData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLookup = async () => {
    if (!nip.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    const data = await lookupNip(nip.trim());
    if (data) {
      setResult(data);
    } else {
      setError('Nie znaleziono firmy dla podanego NIP lub błąd API MF.');
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
          <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={nip}
            onChange={e => { setNip(e.target.value); setResult(null); setError(null); }}
            onKeyDown={handleKeyDown}
            placeholder="Wpisz NIP (10 cyfr)..."
            maxLength={13}
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
          />
        </div>
        <button onClick={handleLookup} disabled={loading || nip.replace(/\D/g, '').length < 10}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-black text-xs px-4 py-2.5 rounded-xl">
          {loading ? <RefreshCw size={12} className="animate-spin" /> : <Search size={12} />}
          Szukaj GUS
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-[11px] text-red-600 bg-red-50 rounded-xl px-3 py-2 border border-red-200">
          <AlertTriangle size={12} /> {error}
        </div>
      )}

      {result && (
        <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Building2 size={16} className="text-emerald-700" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-slate-900">{result.name}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-[10px] font-mono text-slate-500">NIP: {result.nip}</span>
                {result.regon && <span className="text-[10px] font-mono text-slate-400">REGON: {result.regon}</span>}
                {result.whiteListValid
                  ? <span className="flex items-center gap-1 text-[9px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full"><ShieldCheck size={9} /> Biała Lista VAT</span>
                  : <span className="flex items-center gap-1 text-[9px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full"><ShieldX size={9} /> {result.statusVat}</span>
                }
              </div>
              {(result.address || result.city) && (
                <p className="text-[10px] text-slate-600 mt-1">{[result.address, result.zipCode, result.city].filter(Boolean).join(' · ')}</p>
              )}
              {result.accountNumbers && result.accountNumbers.length > 0 && (
                <p className="text-[9px] text-slate-500 font-mono mt-1">Konto: {result.accountNumbers[0]}</p>
              )}
            </div>
          </div>
          <button onClick={() => onFill(result)}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2 rounded-xl uppercase tracking-widest">
            <CheckCircle2 size={12} /> Wypełnij formularz danymi GUS
          </button>
        </div>
      )}
    </div>
  );
}
