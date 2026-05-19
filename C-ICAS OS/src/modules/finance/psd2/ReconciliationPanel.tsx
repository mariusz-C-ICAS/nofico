/**
 * Data: 2026-05-19
 * Zmiany: Panel rekoncyliacji transakcji bankowych z fakturami.
 * Sciezka: /src/modules/finance/psd2/ReconciliationPanel.tsx
 */
import React, { useState, useCallback } from 'react';
import {
  ArrowRightLeft, CheckCircle2, AlertTriangle, Loader2,
  CreditCard, FileText, Check, RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import {
  reconcileTransactions,
  approveMatch,
  approveAllMatches,
  type ReconciliationResult,
  type ReconciliationMatch,
  type BankTransaction,
} from '../services/reconciliationService';
import type { SalesInvoice } from '../types/fiTypes';

// ─── Types ────────────────────────────────────────────────────────────────────

type PanelStatus = 'idle' | 'loading' | 'done' | 'error';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const today = (): string => new Date().toISOString().slice(0, 10);

const monthAgo = (): string => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
};

function fmtMoney(amount: number, currency = 'PLN'): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReconciliationPanel() {
  const { activeTenantId } = useAuth() as { activeTenantId: string };

  const [accountId, setAccountId] = useState('');
  const [dateFrom, setDateFrom] = useState(monthAgo());
  const [dateTo, setDateTo] = useState(today());
  const [status, setStatus] = useState<PanelStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<ReconciliationResult | null>(null);
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());
  const [approvingAll, setApprovingAll] = useState(false);

  // ─── Reconcile ──────────────────────────────────────────────────────────────

  const handleReconcile = useCallback(async () => {
    if (!activeTenantId || !accountId.trim()) return;
    setStatus('loading');
    setErrorMsg('');
    setResult(null);
    setApprovedIds(new Set());
    try {
      const res = await reconcileTransactions(activeTenantId, accountId.trim(), dateFrom, dateTo);
      setResult(res);
      setStatus('done');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setStatus('error');
    }
  }, [activeTenantId, accountId, dateFrom, dateTo]);

  // ─── Approve single ─────────────────────────────────────────────────────────

  const handleApprove = useCallback(async (match: ReconciliationMatch) => {
    const key = match.transaction.id;
    try {
      await approveMatch(activeTenantId, match);
      setApprovedIds((prev) => new Set(prev).add(key));
    } catch (err) {
      console.error('[ReconciliationPanel] approveMatch error:', err);
    }
  }, [activeTenantId]);

  // ─── Approve all ────────────────────────────────────────────────────────────

  const handleApproveAll = useCallback(async () => {
    if (!result) return;
    const pending = result.matched.filter((m) => !approvedIds.has(m.transaction.id));
    if (pending.length === 0) return;
    setApprovingAll(true);
    try {
      await approveAllMatches(activeTenantId, pending);
      setApprovedIds((prev) => {
        const next = new Set(prev);
        pending.forEach((m) => next.add(m.transaction.id));
        return next;
      });
    } catch (err) {
      console.error('[ReconciliationPanel] approveAllMatches error:', err);
    } finally {
      setApprovingAll(false);
    }
  }, [activeTenantId, result, approvedIds]);

  // ─── Stats ──────────────────────────────────────────────────────────────────

  const totalTx = result
    ? result.matched.length + result.unmatched.transactions.length
    : 0;
  const matchedCount = result?.matched.length ?? 0;
  const approvedCount = approvedIds.size;
  const pendingApproval = matchedCount - approvedCount;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Controls */}
      <div className="bg-white border-2 border-slate-100 rounded-[2rem] p-6 shadow-sm space-y-5">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Parametry rekoncyliacji
        </div>

        <div className="flex flex-wrap gap-4 items-end">
          {/* Account ID */}
          <label className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              ID konta (Nordigen accountId)
            </span>
            <input
              type="text"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder="np. abc123-uuid-konta"
              className="border-2 border-slate-100 rounded-xl px-3 py-2 text-xs font-black text-slate-700 focus:outline-none focus:border-indigo-400 placeholder:text-slate-300"
            />
          </label>

          {/* Date range */}
          <label className="flex flex-col gap-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Od</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border-2 border-slate-100 rounded-xl px-3 py-2 text-xs font-black text-slate-700 focus:outline-none focus:border-indigo-400"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Do</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border-2 border-slate-100 rounded-xl px-3 py-2 text-xs font-black text-slate-700 focus:outline-none focus:border-indigo-400"
            />
          </label>

          <button
            onClick={handleReconcile}
            disabled={status === 'loading' || !accountId.trim()}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed self-end"
          >
            {status === 'loading'
              ? <Loader2 size={14} className="animate-spin" />
              : <RefreshCw size={14} />
            }
            Rekoncyliuj
          </button>
        </div>
      </div>

      {/* Error */}
      {status === 'error' && (
        <div className="bg-white border-2 border-rose-100 rounded-[2rem] p-6 flex items-start gap-4 shadow-sm">
          <div className="bg-rose-50 p-3 rounded-xl shrink-0">
            <AlertTriangle className="text-rose-500" size={20} />
          </div>
          <div>
            <div className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Błąd rekoncyliacji</div>
            <div className="text-[11px] font-black text-slate-700 uppercase font-mono">{errorMsg}</div>
          </div>
        </div>
      )}

      {/* Results */}
      {status === 'done' && result && (
        <div className="space-y-6">

          {/* Summary bar */}
          <div className="bg-white border-2 border-slate-100 rounded-[2rem] p-5 flex flex-wrap gap-6 items-center shadow-sm">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-50 p-2 rounded-xl">
                <CheckCircle2 className="text-emerald-600" size={18} />
              </div>
              <div>
                <div className="text-[9px] font-black text-slate-400 uppercase">Dopasowane</div>
                <div className="text-xl font-black text-emerald-600 italic">
                  {matchedCount} z {totalTx}
                </div>
              </div>
            </div>
            <div className="text-[10px] font-black text-slate-500 uppercase flex-1">
              {matchedCount} z {totalTx} transakcji dopasowanych automatycznie
            </div>

            {pendingApproval > 0 && (
              <button
                onClick={handleApproveAll}
                disabled={approvingAll}
                className="bg-emerald-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {approvingAll
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Check size={14} />
                }
                Zatwierdź wszystkie ({pendingApproval})
              </button>
            )}
          </div>

          {/* Matched */}
          <MatchSection
            title="Dopasowane"
            count={matchedCount}
            accentClass="border-emerald-100"
            headerIcon={<CheckCircle2 size={16} className="text-emerald-600" />}
          >
            {result.matched.length === 0 ? (
              <EmptyState text="Brak dopasowań automatycznych." />
            ) : (
              result.matched.map((match) => (
                <MatchRow
                  key={match.transaction.id}
                  match={match}
                  approved={approvedIds.has(match.transaction.id)}
                  onApprove={() => handleApprove(match)}
                />
              ))
            )}
          </MatchSection>

          {/* Unmatched transactions */}
          <MatchSection
            title="Nierozliczone transakcje"
            count={result.unmatched.transactions.length}
            accentClass="border-amber-100"
            headerIcon={<CreditCard size={16} className="text-amber-500" />}
          >
            {result.unmatched.transactions.length === 0 ? (
              <EmptyState text="Wszystkie transakcje dopasowane." />
            ) : (
              result.unmatched.transactions.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} />
              ))
            )}
          </MatchSection>

          {/* Unmatched invoices */}
          <MatchSection
            title="Niezapłacone faktury"
            count={result.unmatched.invoices.length}
            accentClass="border-rose-100"
            headerIcon={<FileText size={16} className="text-rose-500" />}
          >
            {result.unmatched.invoices.length === 0 ? (
              <EmptyState text="Wszystkie faktury mają dopasowanie." />
            ) : (
              result.unmatched.invoices.map((inv) => (
                <InvoiceRow key={inv.id} invoice={inv} />
              ))
            )}
          </MatchSection>

        </div>
      )}
    </div>
  );
}

// ─── MatchSection ─────────────────────────────────────────────────────────────

interface MatchSectionProps {
  title: string;
  count: number;
  accentClass: string;
  headerIcon: React.ReactNode;
  children: React.ReactNode;
}

function MatchSection({ title, count, accentClass, headerIcon, children }: MatchSectionProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`bg-white border-2 ${accentClass} rounded-[2rem] shadow-sm overflow-hidden`}>
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-all"
      >
        <div className="flex items-center gap-3">
          {headerIcon}
          <div className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
            {title}
          </div>
          <span className="bg-slate-100 text-slate-600 text-[9px] font-black px-2 py-0.5 rounded uppercase">
            {count}
          </span>
        </div>
        {collapsed ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronUp size={16} className="text-slate-400" />}
      </button>
      {!collapsed && (
        <div className="px-6 pb-5 space-y-2">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── MatchRow ─────────────────────────────────────────────────────────────────

interface MatchRowProps {
  match: ReconciliationMatch;
  approved: boolean;
  onApprove: () => void;
}

function MatchRow({ match, approved, onApprove }: MatchRowProps) {
  const { transaction: tx, invoice: inv, confidence, matchReasons } = match;
  const confidencePct = Math.round(confidence * 100);

  return (
    <div className={`border-2 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center gap-4 justify-between transition-all ${
      approved ? 'border-emerald-100 bg-emerald-50/30' : 'border-slate-100'
    }`}>
      <div className="flex-1 min-w-0 grid md:grid-cols-2 gap-3">
        {/* Transaction side */}
        <div className="min-w-0">
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
            Transakcja
          </div>
          <div className="text-xs font-black text-slate-800 uppercase italic truncate">
            {tx.counterpartName}
          </div>
          <div className="text-[10px] font-black text-indigo-600">
            {fmtMoney(tx.amount, tx.currency)}
          </div>
          <div className="text-[9px] font-black text-slate-400 uppercase font-mono">
            {tx.bookingDate}
          </div>
        </div>

        {/* Invoice side */}
        <div className="min-w-0">
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
            Faktura
          </div>
          <div className="text-xs font-black text-slate-800 uppercase italic truncate">
            {inv.number} — {inv.buyer?.name}
          </div>
          <div className="text-[10px] font-black text-indigo-600">
            {fmtMoney(inv.totalBrutto ?? 0, inv.currency ?? 'PLN')}
          </div>
          <div className="text-[9px] font-black text-slate-400 uppercase">
            Powody: {matchReasons.join(', ')} · Pewność: {confidencePct}%
          </div>
        </div>
      </div>

      <div className="shrink-0">
        {approved ? (
          <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase">
            <CheckCircle2 size={14} />
            Zatwierdzone
          </div>
        ) : (
          <button
            onClick={onApprove}
            className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100"
          >
            <Check size={12} />
            Zatwierdź
          </button>
        )}
      </div>
    </div>
  );
}

// ─── TransactionRow ───────────────────────────────────────────────────────────

function TransactionRow({ tx }: { tx: BankTransaction }) {
  return (
    <div className="border-2 border-slate-100 rounded-xl px-4 py-3 flex items-center justify-between">
      <div>
        <div className="text-xs font-black text-slate-800 uppercase italic">
          {tx.counterpartName}
        </div>
        <div className="text-[9px] font-black text-slate-400 uppercase font-mono">
          {tx.bookingDate} · {tx.description?.slice(0, 60) ?? '—'}
        </div>
      </div>
      <div className="text-[10px] font-black text-slate-700 shrink-0">
        {fmtMoney(tx.amount, tx.currency)}
      </div>
    </div>
  );
}

// ─── InvoiceRow ───────────────────────────────────────────────────────────────

function InvoiceRow({ invoice: inv }: { invoice: SalesInvoice }) {
  return (
    <div className="border-2 border-slate-100 rounded-xl px-4 py-3 flex items-center justify-between">
      <div>
        <div className="text-xs font-black text-slate-800 uppercase italic">
          {inv.number} — {inv.buyer?.name}
        </div>
        <div className="text-[9px] font-black text-slate-400 uppercase">
          Termin: {inv.dueDate ?? '—'} · Wystawiona: {inv.issueDate}
        </div>
      </div>
      <div className="text-[10px] font-black text-rose-600 shrink-0">
        {fmtMoney(inv.totalBrutto ?? 0, inv.currency ?? 'PLN')}
      </div>
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
      {text}
    </div>
  );
}
