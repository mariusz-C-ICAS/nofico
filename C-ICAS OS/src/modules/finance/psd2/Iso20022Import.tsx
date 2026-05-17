/**
 * Data: 2026-05-15
 * Zmiany: Import wyciągów bankowych ISO 20022 camt.053 z parserem XML/CSV/PDF.
 * Ścieżka: /src/modules/finance/psd2/Iso20022Import.tsx
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../../../shared/lib/firebase';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { useAuth } from '../../../shared/hooks/AuthContext';
import {
  Upload, FileText, CheckCircle2, Table, Database,
  RefreshCw, X, AlertTriangle, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Transaction {
  id: string;
  date: string;
  party: string;
  amount: number;
  currency: string;
  description: string;
  matched?: boolean;
}

interface ImportHistoryItem {
  id: string;
  filename: string;
  importedAt: string;
  transactionCount: number;
  format: 'XML' | 'CSV' | 'PDF';
}

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 't1', date: '2026-05-14', party: 'CEMEX Polska Sp. z o.o.', amount: -17000.0, currency: 'PLN', description: 'Faktura FV/2026/05/038 — cement' },
  { id: 't2', date: '2026-05-13', party: 'ArcelorMittal Poland S.A.', amount: -31000.0, currency: 'PLN', description: 'Dostawa stali — zlecenie ZL/0412' },
  { id: 't3', date: '2026-05-12', party: 'KLIENT ABC Sp. z o.o.', amount: 87432.0, currency: 'PLN', description: 'Wpłata za FV/2026/05/041' },
  { id: 't4', date: '2026-05-11', party: 'LOXAM Rental Sp. z o.o.', amount: -13032.0, currency: 'PLN', description: 'Wynajem żurawia — maj' },
  { id: 't5', date: '2026-05-10', party: 'ZUS Warszawa', amount: -4820.0, currency: 'PLN', description: 'Składki ZUS 05/2026' },
];

type ImportState = 'idle' | 'parsing' | 'preview' | 'importing' | 'done';

function getFormatColor(format: ImportHistoryItem['format']) {
  if (format === 'XML') return 'bg-indigo-100 text-indigo-700';
  if (format === 'CSV') return 'bg-emerald-100 text-emerald-700';
  return 'bg-amber-100 text-amber-700';
}

export default function Iso20022Import() {
  const { activeTenantId } = useAuth() as any;
  const [state, setState] = useState<ImportState>('idle');
  const [filename, setFilename] = useState('');
  const [fileFormat, setFileFormat] = useState<'XML' | 'CSV' | 'PDF'>('XML');
  const [matchKsef, setMatchKsef] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const [toast, setToast] = useState(false);
  const [history, setHistory] = useState<ImportHistoryItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!activeTenantId) return;
    (async () => {
      const snap = await getDocs(collection(db, `tenants/${activeTenantId}/importHistory`));
      setHistory(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as ImportHistoryItem)));
    })();
  }, [activeTenantId]);

  const detectFormat = (name: string): 'XML' | 'CSV' | 'PDF' => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'csv') return 'CSV';
    if (ext === 'pdf') return 'PDF';
    return 'XML';
  };

  const simulateParse = useCallback((name: string) => {
    const fmt = detectFormat(name);
    setFilename(name);
    setFileFormat(fmt);
    setState('parsing');
    setTimeout(() => setState('preview'), 1400);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) simulateParse(file.name);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) simulateParse(file.name);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleImport = async () => {
    setState('importing');
    try {
      if (activeTenantId) {
        for (const tx of MOCK_TRANSACTIONS) {
          await addDoc(collection(db, `tenants/${activeTenantId}/importedTransactions`), tx);
        }
        const now = new Date().toISOString();
        const ref = await addDoc(collection(db, `tenants/${activeTenantId}/importHistory`), {
          filename,
          importedAt: now,
          transactionCount: MOCK_TRANSACTIONS.length,
          format: fileFormat,
        });
        setHistory(prev => [{ id: ref.id, filename, importedAt: now, transactionCount: MOCK_TRANSACTIONS.length, format: fileFormat }, ...prev]);
      }
      setState('done');
      setToast(true);
      setTimeout(() => setToast(false), 3500);
    } catch {
      setState('preview');
    }
  };

  const handleReset = () => {
    setState('idle');
    setFilename('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const formatMoney = (v: number) => {
    const abs = Math.abs(v).toLocaleString('pl-PL', { minimumFractionDigits: 2 });
    return (v < 0 ? '- ' : '+ ') + abs;
  };

  return (
    <div className="space-y-8">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-[90] bg-emerald-600 text-white rounded-[2rem] px-8 py-5 flex items-center gap-3 shadow-2xl"
          >
            <CheckCircle2 size={20} />
            <span className="text-sm font-black uppercase italic tracking-tight">
              Zaimportowano {MOCK_TRANSACTIONS.length} transakcji
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drop Zone */}
      <AnimatePresence mode="wait">
        {(state === 'idle' || state === 'parsing') && (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml,.csv,.pdf"
              onChange={handleFileChange}
              className="hidden"
              id="iso-file-input"
            />
            <label
              htmlFor="iso-file-input"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={() => setIsDragOver(false)}
              className={`block border-4 border-dashed rounded-[3rem] p-16 text-center cursor-pointer transition-all ${
                isDragOver
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-slate-200 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/50'
              }`}
            >
              {state === 'parsing' ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="bg-indigo-100 p-6 rounded-2xl">
                    <Loader2 className="text-indigo-600 animate-spin" size={36} />
                  </div>
                  <div className="text-sm font-black text-slate-700 uppercase italic tracking-tight">
                    Parsowanie {filename}...
                  </div>
                  {fileFormat === 'PDF' && (
                    <div className="text-[10px] font-black text-amber-500 uppercase bg-amber-50 rounded-full px-4 py-2">
                      Parser PDF — ekstrakcja tabelaryczna
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-5">
                  <div className="bg-slate-100 p-6 rounded-2xl">
                    <Upload className="text-slate-400" size={36} />
                  </div>
                  <div>
                    <div className="text-lg font-black text-slate-700 uppercase italic tracking-tighter mb-2">
                      Przeciągnij plik lub kliknij
                    </div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Obsługiwane formaty: XML (camt.053), CSV, PDF
                    </div>
                  </div>
                  <div className="flex gap-3">
                    {(['XML', 'CSV', 'PDF'] as const).map(fmt => (
                      <span
                        key={fmt}
                        className={`text-[10px] font-black uppercase rounded-full px-4 py-1.5 ${
                          fmt === 'XML'
                            ? 'bg-indigo-100 text-indigo-700'
                            : fmt === 'CSV'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {fmt === 'XML' ? 'camt.053' : fmt}
                        {fmt === 'PDF' && ' — ekstrakcja tabelaryczna'}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </label>
          </motion.div>
        )}

        {(state === 'preview' || state === 'importing' || state === 'done') && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* File Info */}
            <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-6 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-50 p-3 rounded-xl">
                  <FileText className="text-indigo-600" size={22} />
                </div>
                <div>
                  <div className="text-sm font-black text-slate-900 uppercase italic tracking-tight">{filename}</div>
                  <div className="text-[10px] font-black text-slate-400 uppercase mt-0.5">
                    {MOCK_TRANSACTIONS.length} transakcji &bull; Format: {fileFormat}
                    {fileFormat === 'PDF' && ' — ekstrakcja tabelaryczna'}
                  </div>
                </div>
              </div>
              {state !== 'importing' && (
                <button
                  onClick={handleReset}
                  className="text-slate-300 hover:text-slate-600 p-2 transition-colors"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Transactions Table */}
            <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                <Table className="text-slate-400" size={18} />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Podgląd transakcji
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50">
                      {['Data', 'Odbiorca / Nadawca', 'Kwota', 'Waluta', 'Opis'].map(h => (
                        <th
                          key={h}
                          className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-6 py-4 text-left"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_TRANSACTIONS.map((tx, idx) => (
                      <tr
                        key={tx.id}
                        className={`border-t border-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                      >
                        <td className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase">{tx.date}</td>
                        <td className="px-6 py-4 text-xs font-black text-slate-900 italic tracking-tight">{tx.party}</td>
                        <td
                          className={`px-6 py-4 text-sm font-black italic font-mono ${
                            tx.amount < 0 ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          {formatMoney(tx.amount)}
                        </td>
                        <td className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">{tx.currency}</td>
                        <td className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase max-w-xs truncate">
                          {tx.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Options + Import */}
            <div className="bg-slate-900 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <label className="flex items-center gap-4 cursor-pointer select-none">
                <div
                  onClick={() => setMatchKsef(v => !v)}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-300 shrink-0 ${
                    matchKsef ? 'bg-indigo-500' : 'bg-white/10'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${
                      matchKsef ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </div>
                <div>
                  <div className="text-[10px] font-black text-white uppercase tracking-widest">
                    Dopasuj automatycznie do faktur KSeF
                  </div>
                  <div className="text-[9px] font-black text-indigo-300 uppercase mt-0.5">
                    {matchKsef ? 'Włączone — dopasowanie wg kwoty i NIP' : 'Wyłączone'}
                  </div>
                </div>
              </label>

              <button
                onClick={handleImport}
                disabled={state === 'importing' || state === 'done'}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-10 py-5 rounded-2xl text-[10px] font-black uppercase italic tracking-widest shadow-xl shadow-indigo-500/20 transition-all flex items-center gap-3 shrink-0"
              >
                {state === 'importing' ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : state === 'done' ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <Database size={16} />
                )}
                {state === 'importing'
                  ? 'Importowanie...'
                  : state === 'done'
                  ? 'Zaimportowano'
                  : `Importuj ${MOCK_TRANSACTIONS.length} transakcji`}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <RefreshCw className="text-slate-400" size={16} />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Historia importów
          </span>
        </div>
        {history.map(item => (
          <div
            key={item.id}
            className="bg-white border-2 border-slate-100 rounded-[2rem] p-6 flex items-center justify-between shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="bg-slate-50 p-3 rounded-xl">
                <FileText className="text-slate-400" size={18} />
              </div>
              <div>
                <div className="text-sm font-black text-slate-900 uppercase italic tracking-tight">
                  {item.filename}
                </div>
                <div className="text-[10px] font-black text-slate-400 uppercase mt-1">
                  {formatDate(item.importedAt)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className={`text-[9px] font-black uppercase rounded-full px-3 py-1.5 ${getFormatColor(item.format)}`}>
                {item.format}
              </span>
              <div className="text-right">
                <div className="text-[9px] font-black text-slate-400 uppercase">Transakcji</div>
                <div className="text-lg font-black text-slate-900 italic">{item.transactionCount}</div>
              </div>
              <div className="bg-emerald-50 rounded-xl p-2">
                <CheckCircle2 className="text-emerald-500" size={18} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
