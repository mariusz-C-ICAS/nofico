/**
 * Data: 2026-05-16
 * Ścieżka: /src/modules/finance/components/NipLookupPanel.tsx
 * Wyszukiwarka NIP — GUS BIR + Biała Lista MF.
 */
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, CheckCircle2, XCircle, Building2, CreditCard,
  Loader2, AlertCircle, MapPin, Briefcase
} from 'lucide-react';
import { searchByNip, type GusCompanyData } from '../services/gusBirService';
import { checkNipOnBialaLista, type BialaListaResult } from '../services/bialaListaService';

interface Props {
  initialNip?: string;
  onDataLoaded: (data: GusCompanyData, biala: BialaListaResult) => void;
  tenantId: string;
}

// ─── NIP auto-format XXX-XXX-XX-XX ───────────────────────────────────────────

function formatNip(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length <= 8) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
}

function stripNip(formatted: string): string {
  return formatted.replace(/\D/g, '');
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NipLookupPanel({ initialNip, onDataLoaded, tenantId }: Props) {
  const [nipInput, setNipInput] = useState(
    initialNip ? formatNip(initialNip) : ''
  );
  const [loading, setLoading] = useState(false);
  const [gusData, setGusData] = useState<GusCompanyData | null>(null);
  const [bialaData, setBialaData] = useState<BialaListaResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNipChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setNipInput(formatNip(e.target.value));
      setGusData(null);
      setBialaData(null);
      setNotFound(false);
      setError(null);
    },
    []
  );

  const handleSearch = useCallback(async () => {
    const nip = stripNip(nipInput);
    if (nip.length !== 10) {
      setError('NIP musi mieć 10 cyfr');
      return;
    }

    setLoading(true);
    setGusData(null);
    setBialaData(null);
    setNotFound(false);
    setError(null);

    try {
      const [gusResult, bialaResult] = await Promise.all([
        searchByNip(nip, tenantId),
        checkNipOnBialaLista(nip),
      ]);

      if (!gusResult.found || !gusResult.data) {
        setNotFound(true);
      } else {
        setGusData(gusResult.data);
        setBialaData(bialaResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd wyszukiwania');
    } finally {
      setLoading(false);
    }
  }, [nipInput, tenantId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') void handleSearch();
    },
    [handleSearch]
  );

  const handleUse = useCallback(() => {
    if (gusData && bialaData) onDataLoaded(gusData, bialaData);
  }, [gusData, bialaData, onDataLoaded]);

  // ─── render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Input row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={nipInput}
            onChange={handleNipChange}
            onKeyDown={handleKeyDown}
            placeholder="000-000-00-00"
            maxLength={13}
            className="w-full pl-4 pr-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-900 placeholder-slate-300 focus:outline-none focus:border-indigo-400 transition-colors"
          />
        </div>
        <button
          onClick={() => void handleSearch()}
          disabled={loading || stripNip(nipInput).length !== 10}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-widest transition-colors"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Search size={16} />
          )}
          Sprawdz
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-rose-50 border border-rose-200">
          <AlertCircle size={14} className="text-rose-600 flex-shrink-0" />
          <span className="text-xs font-bold text-rose-700">{error}</span>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* Not found */}
        {notFound && (
          <motion.div
            key="notfound"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200"
          >
            <XCircle size={20} className="text-slate-400 flex-shrink-0" />
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-600">
                Nie znaleziono podmiotu
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Sprawdz poprawnosc NIP lub sprobuj pozniej
              </p>
            </div>
          </motion.div>
        )}

        {/* Results */}
        {gusData && bialaData && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {/* Company header */}
            <div className="flex items-start gap-3 px-5 py-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <Building2 size={18} className="text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-slate-900 text-sm leading-tight truncate">
                  {gusData.name}
                </p>
                {gusData.shortName && gusData.shortName !== gusData.name && (
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                    {gusData.shortName}
                  </p>
                )}
                <p className="text-[10px] text-slate-400 font-bold mt-1">
                  NIP: {formatNip(gusData.nip)} · REGON: {gusData.regon}
                </p>
              </div>
            </div>

            {/* Address + PKD */}
            <div className="px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              {(gusData.street || gusData.city) && (
                <div className="flex items-start gap-2">
                  <MapPin size={12} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-slate-600 font-bold">
                    {[gusData.street, gusData.buildingNumber].filter(Boolean).join(' ')}
                    {gusData.postalCode || gusData.city
                      ? `, ${[gusData.postalCode, gusData.city].filter(Boolean).join(' ')}`
                      : ''}
                    {gusData.province ? ` · ${gusData.province}` : ''}
                  </p>
                </div>
              )}
              {gusData.pkdCode && (
                <div className="flex items-start gap-2">
                  <Briefcase size={12} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-slate-600 font-bold">
                    PKD {gusData.pkdCode}
                    {gusData.pkdName ? ` — ${gusData.pkdName}` : ''}
                  </p>
                </div>
              )}
              {gusData.legalForm && (
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Forma prawna: {gusData.legalForm}
                </p>
              )}
            </div>

            {/* VAT badge */}
            <div className="flex items-center gap-2">
              {bialaData.isActiveVatPayer ? (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                  <CheckCircle2 size={11} /> VAT czynny
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-[10px] font-black uppercase tracking-widest text-rose-700">
                  <XCircle size={11} /> Brak VAT
                </span>
              )}
              {gusData.activityStatus === 'active' ? (
                <span className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Aktywny
                </span>
              ) : gusData.activityStatus === 'inactive' ? (
                <span className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-black uppercase tracking-widest text-amber-600">
                  Nieaktywny
                </span>
              ) : null}
            </div>

            {/* Bank accounts */}
            {bialaData.bankAccounts && bialaData.bankAccounts.length > 0 && (
              <div className="px-5 py-4 rounded-2xl bg-white border border-slate-100 space-y-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                  <CreditCard size={9} /> Rachunki bankowe (Biala Lista)
                </p>
                {bialaData.bankAccounts.map(acc => (
                  <div key={acc} className="flex items-center justify-between gap-3">
                    <span className="text-xs font-mono font-bold text-slate-700 truncate">
                      {acc}
                    </span>
                    <span className="flex items-center gap-1 flex-shrink-0 text-[9px] font-black uppercase text-emerald-600">
                      <CheckCircle2 size={10} className="text-emerald-500" />
                      BL
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Use button */}
            <button
              onClick={handleUse}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest transition-colors shadow-lg shadow-indigo-500/25"
            >
              <CheckCircle2 size={15} />
              Uzyj danych
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
