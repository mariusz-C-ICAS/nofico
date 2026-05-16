/**
 * Data: 2026-05-16
 * Zmiany: Pełna logika generowania JPK_V7M + JPK_KR, historia z Firestore,
 *         selektor okresu, spinner, stats po generacji.
 * Ścieżka: /src/modules/finance/tax/JpkGenerator.tsx
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  FileCode, Download, ShieldCheck, CheckCircle2,
  AlertCircle, RefreshCw, Send, Loader2, Database,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import { useTenant } from '../../../shared/hooks/useTenant';
import {
  generateJpkV7M,
  generateJpkKr,
  downloadXml,
  saveJpkReport,
  type JpkReport,
  type JpkV7MStats,
  type JpkKrStats,
} from '../services/jpkService';

// ─── Typy ─────────────────────────────────────────────────────────────────────

type JpkType = 'JPK_V7M' | 'JPK_KR';

interface TaxPayerInfo {
  name: string;
  nip: string;
  address: string;
}

// ─── Pomocnicze ───────────────────────────────────────────────────────────────

function getPrevMonthPeriod(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function buildFilename(type: JpkType, period: string): string {
  return `${type}_${period}_NoFiCo.xml`;
}

function isV7MStats(s: JpkV7MStats | JpkKrStats): s is JpkV7MStats {
  return 'salesCount' in s;
}

// ─── Komponenty pomocnicze ────────────────────────────────────────────────────

function StatusBadge({ status }: { status: JpkReport['status'] }) {
  if (status === 'sent') {
    return (
      <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl border border-emerald-100 w-fit">
        <ShieldCheck size={13} />
        <span className="text-[10px] font-black uppercase tracking-tight italic">Wysłany</span>
      </div>
    );
  }
  if (status === 'generated') {
    return (
      <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-xl border border-indigo-100 w-fit">
        <CheckCircle2 size={13} />
        <span className="text-[10px] font-black uppercase tracking-tight italic">Wygenerowany</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 bg-slate-50 text-slate-400 px-3 py-1.5 rounded-xl border border-slate-100 w-fit">
      <RefreshCw size={13} />
      <span className="text-[10px] font-black uppercase tracking-tight italic">Szkic</span>
    </div>
  );
}

// ─── Główny komponent ─────────────────────────────────────────────────────────

export default function JpkGenerator() {
  const { activeTenantId: tenantId } = useTenant();

  // Selektor
  const [jpkType, setJpkType] = useState<JpkType>('JPK_V7M');
  const [period, setPeriod] = useState<string>(getPrevMonthPeriod());

  // Stan generacji
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedXml, setGeneratedXml] = useState<string | null>(null);
  const [lastStats, setLastStats] = useState<JpkV7MStats | JpkKrStats | null>(null);

  // Historia
  const [history, setHistory] = useState<JpkReport[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Podatnik — z Firestore settings lub placeholder
  const [taxPayer, setTaxPayer] = useState<TaxPayerInfo>({
    name: 'NoFiCo Sp. z o.o.',
    nip: '0000000000',
    address: 'ul. Testowa 1, 00-001 Warszawa',
  });

  // Pobierz dane podatnika
  useEffect(() => {
    if (!tenantId) return;
    const ref = doc(db, 'tenants', tenantId, 'settings', 'general');
    getDoc(ref).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        setTaxPayer({
          name: d.companyName ?? taxPayer.name,
          nip: d.nip ?? taxPayer.nip,
          address: d.address ?? taxPayer.address,
        });
      }
    }).catch(() => {/* placeholder zostaje */});
  }, [tenantId]);

  // Historia z Firestore
  useEffect(() => {
    if (!tenantId) return;
    setHistoryLoading(true);
    const col = collection(db, 'tenants', tenantId, 'jpkReports');
    const q = query(col, orderBy('generatedAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() } as JpkReport)));
      setHistoryLoading(false);
    }, () => setHistoryLoading(false));
    return unsub;
  }, [tenantId]);

  const handleGenerate = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    setGeneratedXml(null);
    setLastStats(null);

    try {
      let xml: string;
      let stats: JpkV7MStats | JpkKrStats;

      if (jpkType === 'JPK_V7M') {
        const result = await generateJpkV7M(db, tenantId, period, taxPayer);
        xml = result.xml;
        stats = result.stats;
      } else {
        const result = await generateJpkKr(db, tenantId, period, taxPayer);
        xml = result.xml;
        stats = result.stats;
      }

      setGeneratedXml(xml);
      setLastStats(stats);

      await saveJpkReport(db, tenantId, {
        type: jpkType,
        period,
        status: 'generated',
        stats,
        xmlSize: xml.length,
      });
    } catch (err: any) {
      setError(err?.message ?? 'Błąd generowania JPK');
    } finally {
      setLoading(false);
    }
  }, [tenantId, jpkType, period, taxPayer]);

  const handleDownload = useCallback(() => {
    if (!generatedXml) return;
    downloadXml(generatedXml, buildFilename(jpkType, period));
  }, [generatedXml, jpkType, period]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex-1 w-full flex items-center gap-8">
          <div className="bg-slate-900 p-6 rounded-3xl shadow-xl shadow-slate-100">
            <FileCode className="text-indigo-400" size={32} />
          </div>
          <div>
            <h4 className="text-2xl font-black text-slate-900 uppercase italic leading-none mb-2">
              JPK Engine V4
            </h4>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Generuj i pobieraj pliki JPK_V7M, JPK_KR
            </p>
            <p className="text-[10px] text-slate-300 mt-1 uppercase tracking-widest">
              Podatnik: {taxPayer.name} | NIP: {taxPayer.nip}
            </p>
          </div>
        </div>
      </div>

      {/* Panel konfiguracji */}
      <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">
          Konfiguracja Generacji
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          {/* Typ JPK */}
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Typ JPK
            </label>
            <select
              value={jpkType}
              onChange={e => { setJpkType(e.target.value as JpkType); setGeneratedXml(null); setLastStats(null); }}
              className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-[11px] font-black text-slate-900 uppercase italic outline-none focus:border-indigo-300 transition-colors"
            >
              <option value="JPK_V7M">JPK_V7M — VAT</option>
              <option value="JPK_KR">JPK_KR — Księgi Rachunkowe</option>
            </select>
          </div>

          {/* Okres */}
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Okres (YYYY-MM)
            </label>
            <input
              type="month"
              value={period}
              onChange={e => { setPeriod(e.target.value); setGeneratedXml(null); setLastStats(null); }}
              className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-[11px] font-black text-slate-900 outline-none focus:border-indigo-300 transition-colors"
            />
          </div>
        </div>

        {/* Błąd */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-3 bg-rose-50 text-rose-700 px-5 py-4 rounded-2xl border border-rose-100 mb-6 text-[11px] font-black italic uppercase"
            >
              <AlertCircle size={16} />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats po generacji */}
        <AnimatePresence>
          {lastStats && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-indigo-50 rounded-2xl border border-indigo-100 px-6 py-5 mb-6"
            >
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3">
                Wynik Generacji
              </p>
              {isV7MStats(lastStats) ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Stat label="Faktury sprzedaży" value={String(lastStats.salesCount)} />
                  <Stat label="Faktury zakupowe" value={String(lastStats.purchaseCount)} />
                  <Stat label="VAT należny" value={`${lastStats.totalVatDue.toFixed(2)} PLN`} />
                  <Stat label="VAT naliczony" value={`${lastStats.totalVatDeductible.toFixed(2)} PLN`} />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  <Stat label="Zapisy" value={String((lastStats as JpkKrStats).entriesCount)} />
                  <Stat label="Suma Wn" value={`${(lastStats as JpkKrStats).totalWn.toFixed(2)} PLN`} />
                  <Stat label="Suma Ma" value={`${(lastStats as JpkKrStats).totalMa.toFixed(2)} PLN`} />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Przyciski akcji */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="bg-indigo-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading
              ? <><Loader2 size={14} className="animate-spin" /> Generowanie...</>
              : <><RefreshCw size={14} /> Generuj {jpkType}</>
            }
          </button>

          {generatedXml && (
            <motion.button
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={handleDownload}
              className="bg-emerald-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center gap-2"
            >
              <Download size={14} /> Pobierz XML
            </motion.button>
          )}
        </div>
      </div>

      {/* Historia */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-8 pt-8 pb-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Historia Raportów JPK
          </p>
        </div>

        {historyLoading ? (
          <div className="flex items-center justify-center py-12 gap-3 text-slate-400">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-[11px] font-black uppercase tracking-widest">Ładowanie...</span>
          </div>
        ) : history.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-slate-300">
            <span className="text-[11px] font-black uppercase tracking-widest italic">Brak raportów</span>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Typ</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Okres</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Generacji</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {history.map(jpk => (
                <motion.tr
                  key={jpk.id}
                  whileHover={{ backgroundColor: 'rgba(248, 250, 252, 0.5)' }}
                  className="group"
                >
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                        <Database size={13} />
                      </div>
                      <span className="text-xs font-black text-slate-900 italic uppercase">{jpk.type}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-xs font-black text-slate-700 italic">{jpk.period}</td>
                  <td className="px-8 py-5 text-xs font-black text-slate-400 italic">
                    {jpk.generatedAt?.toDate
                      ? jpk.generatedAt.toDate().toLocaleDateString('pl-PL')
                      : '—'}
                  </td>
                  <td className="px-8 py-5">
                    <StatusBadge status={jpk.status} />
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2 invisible group-hover:visible transition-all">
                      <button
                        className="text-slate-400 p-2 hover:bg-slate-50 rounded-lg"
                        title="Wyślij (e-Deklaracje)"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Sub-komponent stat ───────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">{label}</span>
      <span className="text-[13px] font-black text-indigo-700 italic">{value}</span>
    </div>
  );
}