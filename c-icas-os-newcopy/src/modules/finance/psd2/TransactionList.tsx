/**
 * Data: 2026-05-15
 * Zmiany: Przepisano na prawdziwy Firestore + AI auto-match, filtry, wyszukiwanie, stats.
 * Ścieżka: /src/modules/finance/psd2/TransactionList.tsx
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Search, Sparkles, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  getTransactionsListener,
  matchTransaction,
  unmatchTransaction,
  ignoreTransaction,
  aiAutoMatch,
  getTransactionSummary,
  type BankTransaction,
  type BankTransactionStatus,
  type TransactionSummary,
} from '../services/transactionService';
import { useTenant } from '../../../shared/hooks/useTenant';
import TransactionRow from './TransactionRow';

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-50">
      {[1, 2, 3, 4, 5].map((i) => (
        <td key={i} className="px-8 py-6">
          <div className="h-4 bg-slate-100 rounded-lg animate-pulse w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <tr>
      <td colSpan={5}>
        <div className="flex flex-col items-center justify-center py-24 gap-6">
          <div className="p-8 bg-slate-50 rounded-[3rem]">
            <AlertCircle size={40} className="text-slate-300" />
          </div>
          <div className="text-center">
            <p className="text-sm font-black uppercase italic tracking-tighter text-slate-900 mb-1">
              Brak transakcji
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Zaimportuj wyciąg bankowy lub podłącz PSD2
            </p>
          </div>
        </div>
      </td>
    </tr>
  );
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatsBar({ summary }: { summary: TransactionSummary | null }) {
  const fmt = (n: number) =>
    n.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const stats = [
    { label: 'Przychody (mies.)', value: summary ? `+${fmt(summary.totalIncoming)} PLN` : '—', color: 'text-emerald-600' },
    { label: 'Wydatki (mies.)', value: summary ? `-${fmt(summary.totalOutgoing)} PLN` : '—', color: 'text-rose-600' },
    { label: 'Bez kategorii', value: summary ? `${summary.uncategorizedCount}` : '—', color: 'text-amber-600' },
    { label: 'Nieodpasowane', value: summary ? `${summary.unmatchedCount}` : '—', color: 'text-slate-900' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((s) => (
        <div key={s.label} className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{s.label}</p>
          <p className={`text-sm font-black italic tracking-tighter ${s.color}`}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Manual match modal ───────────────────────────────────────────────────────

interface MatchModalProps {
  tx: BankTransaction;
  tenantId: string;
  onClose: () => void;
  onMatched: () => void;
}
function ManualMatchModal({ tx, tenantId, onClose, onMatched }: MatchModalProps) {
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!invoiceNumber.trim() || !tx.id) return;
    setSaving(true);
    try {
      await matchTransaction(tenantId, tx.id, '', invoiceNumber.trim());
      onMatched();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-[2.5rem] p-8 shadow-2xl w-full max-w-md mx-4"
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-xs font-black uppercase italic tracking-tighter text-slate-900">Połącz z fakturą</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 truncate max-w-[280px]">
              {tx.counterpartName}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        <input
          autoFocus
          type="text"
          placeholder="Numer faktury (np. FV/2026/05)"
          value={invoiceNumber}
          onChange={(e) => setInvoiceNumber(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-black uppercase italic tracking-tighter outline-none focus:border-indigo-300 transition-colors mb-4"
        />
        <button
          onClick={handleSave}
          disabled={saving || !invoiceNumber.trim()}
          className="w-full bg-indigo-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
        >
          {saving ? 'Zapisuję...' : 'Zapisz powiązanie'}
        </button>
      </motion.div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-8 right-8 z-50 bg-slate-900 text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl flex items-center gap-3"
    >
      <Sparkles size={14} className="text-indigo-400" />
      {message}
      <button onClick={onClose} className="ml-2 text-slate-400 hover:text-white"><X size={14} /></button>
    </motion.div>
  );
}

// ─── Filter tabs ──────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'incoming' | 'outgoing' | 'unmatched' | 'matched';
const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Wszystkie' },
  { key: 'incoming', label: 'Przychody' },
  { key: 'outgoing', label: 'Wydatki' },
  { key: 'unmatched', label: 'Nieodpasowane' },
  { key: 'matched', label: 'Dopasowane' },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TransactionList() {
  const { activeTenantId } = useTenant();
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [matchModalTx, setMatchModalTx] = useState<BankTransaction | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!activeTenantId) return;
    setLoading(true);
    const statusFilter: BankTransactionStatus | undefined =
      activeFilter === 'unmatched' ? 'unmatched'
      : activeFilter === 'matched' ? 'matched'
      : undefined;

    return getTransactionsListener(
      activeTenantId,
      { status: statusFilter, search: search || undefined },
      (txs) => { setTransactions(txs); setLoading(false); }
    );
  }, [activeTenantId, activeFilter, search]);

  useEffect(() => {
    if (!activeTenantId) return;
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
    getTransactionSummary(activeTenantId, `${y}-${m}-01`, `${y}-${m}-${lastDay}`)
      .then(setSummary)
      .catch(console.error);
  }, [activeTenantId, transactions.length]);

  const displayed = transactions.filter((tx) => {
    if (activeFilter === 'incoming') return tx.amount > 0;
    if (activeFilter === 'outgoing') return tx.amount < 0;
    return true;
  });

  const handleAiAutoMatch = useCallback(async () => {
    if (!activeTenantId || aiLoading) return;
    setAiLoading(true);
    try {
      const count = await aiAutoMatch(activeTenantId, transactions);
      setToast(count > 0 ? `AI dopasował ${count} transakcji!` : 'Brak nowych dopasowań.');
    } catch { setToast('Błąd AI — spróbuj ponownie.'); }
    finally { setAiLoading(false); }
  }, [activeTenantId, aiLoading, transactions]);

  const handleConfirmSuggestion = useCallback(async (tx: BankTransaction) => {
    if (!activeTenantId || !tx.id || !tx.matchedInvoiceNumber) return;
    await matchTransaction(activeTenantId, tx.id, tx.matchedInvoiceId ?? '', tx.matchedInvoiceNumber);
  }, [activeTenantId]);

  const handleUnmatch = useCallback(async (tx: BankTransaction) => {
    if (!activeTenantId || !tx.id) return;
    await unmatchTransaction(activeTenantId, tx.id);
  }, [activeTenantId]);

  const handleIgnore = useCallback(async (tx: BankTransaction) => {
    if (!activeTenantId || !tx.id) return;
    await ignoreTransaction(activeTenantId, tx.id);
  }, [activeTenantId]);

  if (!activeTenantId) {
    return (
      <div className="flex items-center justify-center h-48 text-[10px] font-black text-slate-400 uppercase tracking-widest">
        Wybierz firmę aby zobaczyć transakcje
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <StatsBar summary={summary} />

      <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input
              type="text"
              placeholder="Szukaj (kontrahent, tytuł...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-2xl pl-16 pr-8 py-5 text-sm font-black uppercase italic tracking-tighter outline-none"
            />
          </div>
          <button
            onClick={handleAiAutoMatch}
            disabled={aiLoading}
            className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-8 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-60"
          >
            <Sparkles size={16} className={aiLoading ? 'animate-spin' : ''} />
            {aiLoading ? 'AI pracuje...' : 'Auto-Match AI'}
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                activeFilter === tab.key ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              {['Informacje', 'Kontrahent / Tytuł', 'Kwota', 'Powiązanie (NoFiCo Match)', ''].map((h) => (
                <th key={h} className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
            ) : displayed.length === 0 ? (
              <EmptyState />
            ) : (
              <AnimatePresence initial={false}>
                {displayed.map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    tx={tx}
                    onConfirmSuggestion={handleConfirmSuggestion}
                    onOpenMatchModal={setMatchModalTx}
                    onUnmatch={handleUnmatch}
                    onIgnore={handleIgnore}
                  />
                ))}
              </AnimatePresence>
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {matchModalTx && activeTenantId && (
          <ManualMatchModal
            tx={matchModalTx}
            tenantId={activeTenantId}
            onClose={() => setMatchModalTx(null)}
            onMatched={() => setToast('Transakcja powiązana z fakturą.')}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  );
}
