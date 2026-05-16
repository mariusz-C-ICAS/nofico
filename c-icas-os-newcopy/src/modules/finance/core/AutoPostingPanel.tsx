/**
 * Data: 2026-05-16
 * Ścieżka: /src/modules/finance/core/AutoPostingPanel.tsx
 * AI Dekretacja — panel masowego księgowania z Gemini 2.0 Flash.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Brain, FileText, Receipt, Zap, CheckCircle2, Clock,
  ChevronDown, ChevronRight, Loader2, AlertCircle, BookOpen,
  ArrowRightLeft, Layers
} from 'lucide-react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import { useTenant } from '../../../shared/hooks/useTenant';
import JournalEntryModal from './JournalEntryModal';
import {
  suggestPosting, autoPostDocument, getPostingPatterns,
  PostingSuggestion, PostingPattern, PostingDocument
} from '../services/aiPostingService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UnbookedDoc extends PostingDocument {
  id: string;
  _collection: 'invoices' | 'purchaseInvoices' | 'expenses';
  displayName: string;
  displayAmount: number;
  displayDate: string;
  displayCategory: string;
}

interface DocState {
  suggestion?: PostingSuggestion;
  loading: boolean;
  posting: boolean;
  posted: boolean;
  error?: string;
  expanded: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtPLN(n: number) {
  return n.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' PLN';
}

function docTypeLabel(d: UnbookedDoc) {
  if (d._collection === 'invoices') return 'Faktura sprzedaży';
  if (d._collection === 'purchaseInvoices') return 'Faktura zakupowa';
  return 'Wydatek';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AutoPostingPanel() {
  const { activeTenantId } = useTenant();
  const [docs, setDocs] = useState<UnbookedDoc[]>([]);
  const [docStates, setDocStates] = useState<Record<string, DocState>>({});
  const [patterns, setPatterns] = useState<PostingPattern[]>([]);
  const [patternsOpen, setPatternsOpen] = useState(false);
  const [accountsMap, setAccountsMap] = useState<Map<string, { code: string; name: string; category?: string }>>(new Map());
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [batchRunning, setBatchRunning] = useState(false);
  const [showJournalModal, setShowJournalModal] = useState(false);

  // Statystyki
  const bookedToday = docs.filter(d => docStates[d.id]?.posted).length;
  const withSuggestion = docs.filter(d => docStates[d.id]?.suggestion && !docStates[d.id]?.posted).length;
  const unbooked = docs.filter(d => !docStates[d.id]?.posted).length;

  // ---------------------------------------------------------------------------
  // Fetch accounts map
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!activeTenantId) return;
    getDocs(query(collection(db, `tenants/${activeTenantId}/chartOfAccounts`), orderBy('code', 'asc')))
      .then(snap => {
        const map = new Map<string, { code: string; name: string; category?: string }>();
        snap.docs.forEach(d => {
          const data = d.data() as any;
          map.set(d.id, { code: data.code, name: data.name, category: data.category });
        });
        setAccountsMap(map);
      });
  }, [activeTenantId]);

  // ---------------------------------------------------------------------------
  // Fetch unbooked documents
  // ---------------------------------------------------------------------------
  const fetchDocs = useCallback(async () => {
    if (!activeTenantId) return;
    setLoadingDocs(true);
    const result: UnbookedDoc[] = [];

    try {
      // Sales invoices — isBookedByAccountant != true, status != draft
      const invSnap = await getDocs(query(
        collection(db, `tenants/${activeTenantId}/invoices`),
        where('isBookedByAccountant', '!=', true),
        limit(50)
      ));
      invSnap.docs.forEach(d => {
        const data = d.data() as any;
        if (data.status === 'draft') return;
        result.push({
          id: d.id, _collection: 'invoices',
          type: 'sales_invoice',
          vendor: data.buyer ?? data.clientName,
          amountNet: data.amountNet ?? data.subtotal,
          amountVat: data.amountVat ?? data.vatAmount,
          amountGross: data.amountGross ?? data.total,
          category: data.category ?? 'Sprzedaż',
          date: data.date ?? data.issueDate,
          invoiceNumber: data.invoiceNumber ?? data.number,
          nip: data.buyerNip ?? data.nip,
          displayName: data.clientName ?? data.buyer ?? 'Faktura',
          displayAmount: data.amountGross ?? data.total ?? 0,
          displayDate: data.date ?? data.issueDate ?? '',
          displayCategory: data.category ?? 'Sprzedaż',
        });
      });

      // Purchase invoices
      const purchSnap = await getDocs(query(
        collection(db, `tenants/${activeTenantId}/purchaseInvoices`),
        where('isBookedByAccountant', '!=', true),
        limit(50)
      ));
      purchSnap.docs.forEach(d => {
        const data = d.data() as any;
        result.push({
          id: d.id, _collection: 'purchaseInvoices',
          type: 'purchase_invoice',
          vendor: data.vendor ?? data.supplierName,
          amountNet: data.amountNet ?? data.subtotal,
          amountVat: data.amountVat ?? data.vatAmount,
          amountGross: data.amountGross ?? data.total,
          category: data.category ?? 'Zakup',
          date: data.date ?? data.issueDate,
          invoiceNumber: data.invoiceNumber ?? data.number,
          nip: data.vendorNip ?? data.nip,
          displayName: data.vendor ?? data.supplierName ?? 'Faktura zakupowa',
          displayAmount: data.amountGross ?? data.total ?? 0,
          displayDate: data.date ?? data.issueDate ?? '',
          displayCategory: data.category ?? 'Zakup',
        });
      });

      // Expenses — isBooked != true, status == approved
      const expSnap = await getDocs(query(
        collection(db, `tenants/${activeTenantId}/expenses`),
        where('status', '==', 'approved'),
        where('isBooked', '!=', true),
        limit(50)
      ));
      expSnap.docs.forEach(d => {
        const data = d.data() as any;
        result.push({
          id: d.id, _collection: 'expenses',
          type: 'expense',
          vendor: data.vendor ?? data.merchantName,
          amountNet: data.amountNet ?? data.amount,
          amountVat: data.amountVat ?? data.vatAmount,
          amountGross: data.amount ?? data.amountGross,
          category: data.category ?? data.aiCategory ?? 'Inne',
          date: data.date,
          nip: data.nip,
          displayName: data.vendor ?? data.merchantName ?? 'Wydatek',
          displayAmount: data.amount ?? data.amountGross ?? 0,
          displayDate: data.date ?? '',
          displayCategory: data.category ?? data.aiCategory ?? 'Inne',
        });
      });

      setDocs(result);
      setDocStates(prev => {
        const next: Record<string, DocState> = { ...prev };
        result.forEach(d => {
          if (!next[d.id]) next[d.id] = { loading: false, posting: false, posted: false, expanded: false };
        });
        return next;
      });
    } catch (err) {
      console.error('fetchDocs error', err);
    } finally {
      setLoadingDocs(false);
    }
  }, [activeTenantId]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  // ---------------------------------------------------------------------------
  // Fetch patterns
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!activeTenantId) return;
    getPostingPatterns(activeTenantId).then(setPatterns).catch(console.error);
  }, [activeTenantId]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  function patchState(id: string, patch: Partial<DocState>) {
    setDocStates(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function handleSuggest(d: UnbookedDoc) {
    patchState(d.id, { loading: true, error: undefined, expanded: true });
    try {
      const suggestion = await suggestPosting(activeTenantId!, d, accountsMap);
      patchState(d.id, { suggestion, loading: false });
    } catch (err: any) {
      patchState(d.id, { loading: false, error: err?.message ?? 'Błąd AI' });
    }
  }

  async function handlePost(d: UnbookedDoc, userId = 'ai-autopost') {
    const state = docStates[d.id];
    if (!state?.suggestion) return;
    patchState(d.id, { posting: true, error: undefined });
    try {
      await autoPostDocument(activeTenantId!, d.id, d.type, state.suggestion, userId);
      patchState(d.id, { posting: false, posted: true });
    } catch (err: any) {
      patchState(d.id, { posting: false, error: err?.message ?? 'Błąd księgowania' });
    }
  }

  async function handleBatchSuggest() {
    const pending = docs.filter(d => !docStates[d.id]?.suggestion && !docStates[d.id]?.posted);
    if (!pending.length) return;
    setBatchRunning(true);
    // max 5 jednocześnie
    for (let i = 0; i < pending.length; i += 5) {
      const chunk = pending.slice(i, i + 5);
      await Promise.all(chunk.map(d => handleSuggest(d)));
    }
    setBatchRunning(false);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-8 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Brain className="text-indigo-600" size={22} />
            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-800">
              AI Dekretacja
            </h2>
            <span className="bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
              Gemini 2.0
            </span>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Automatyczne sugestie WN/MA zgodne z UoR
          </p>
        </div>
        <button
          onClick={handleBatchSuggest}
          disabled={batchRunning || loadingDocs}
          className="bg-indigo-600 text-white font-black px-8 py-4 rounded-2xl text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-40 flex items-center gap-2"
        >
          {batchRunning
            ? <><Loader2 className="animate-spin" size={14} /> Sugeruję...</>
            : <><Zap size={14} /> Sugeruj dla wszystkich</>}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-5">
        {[
          { label: 'Niezaksięgowane', value: unbooked, color: 'bg-amber-50 border-amber-100 text-amber-700', icon: Clock },
          { label: 'Zasugerowane przez AI', value: withSuggestion, color: 'bg-indigo-50 border-indigo-100 text-indigo-700', icon: Brain },
          { label: 'Zaksięgowane dziś', value: bookedToday, color: 'bg-emerald-50 border-emerald-100 text-emerald-700', icon: CheckCircle2 },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className={`${color} border rounded-[2rem] p-7 flex items-center gap-5`}>
            <Icon size={28} className="opacity-60" />
            <div>
              <div className="text-3xl font-black italic">{value}</div>
              <div className="text-[10px] font-black uppercase tracking-widest opacity-70 mt-1">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Document list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Dokumenty do zaksięgowania ({docs.length})
          </span>
          <button
            onClick={() => setShowJournalModal(true)}
            className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1 hover:underline"
          >
            <ArrowRightLeft size={12} /> Ręczny dekret
          </button>
        </div>

        {loadingDocs && (
          <div className="flex items-center justify-center py-16 text-slate-300">
            <Loader2 className="animate-spin mr-3" size={24} />
            <span className="text-[11px] font-bold uppercase">Ładowanie dokumentów...</span>
          </div>
        )}

        {!loadingDocs && docs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 bg-slate-50 rounded-[2rem] border border-slate-100">
            <CheckCircle2 className="text-emerald-400 mb-4" size={40} />
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
              Wszystkie dokumenty zostały zaksięgowane
            </p>
          </div>
        )}

        {docs.map(d => {
          const state = docStates[d.id] ?? { loading: false, posting: false, posted: false, expanded: false };
          const Icon = d._collection === 'expenses' ? Receipt : FileText;

          return (
            <div
              key={d.id}
              className={`border rounded-[2rem] overflow-hidden transition-all ${
                state.posted
                  ? 'bg-emerald-50 border-emerald-100'
                  : 'bg-white border-slate-100 hover:border-indigo-200'
              }`}
            >
              {/* Row */}
              <div className="flex items-center gap-5 px-8 py-5">
                <Icon size={20} className={state.posted ? 'text-emerald-500' : 'text-slate-300'} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-slate-800 uppercase italic truncate">
                      {d.displayName}
                    </span>
                    <span className="text-[9px] font-black text-slate-300 uppercase bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
                      {docTypeLabel(d)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{d.displayDate}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{d.displayCategory}</span>
                  </div>
                </div>

                <div className="text-right mr-4">
                  <span className="text-sm font-black italic text-slate-800">{fmtPLN(d.displayAmount)}</span>
                </div>

                {state.posted ? (
                  <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase bg-emerald-100 px-4 py-2 rounded-xl">
                    <CheckCircle2 size={12} /> Zaksięgowano
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    {!state.suggestion && (
                      <button
                        onClick={() => handleSuggest(d)}
                        disabled={state.loading}
                        className="bg-indigo-600 text-white font-black px-5 py-2.5 rounded-xl text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-40 flex items-center gap-1.5"
                      >
                        {state.loading
                          ? <><Loader2 className="animate-spin" size={12} /> AI...</>
                          : <><Brain size={12} /> AI Sugestia</>}
                      </button>
                    )}
                    {state.suggestion && !state.posted && (
                      <>
                        <button
                          onClick={() => handlePost(d)}
                          disabled={state.posting || !state.suggestion?.isBalanced}
                          className="bg-slate-900 text-white font-black px-5 py-2.5 rounded-xl text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all disabled:opacity-30 flex items-center gap-1.5"
                        >
                          {state.posting
                            ? <><Loader2 className="animate-spin" size={12} /> Księgowanie...</>
                            : <><BookOpen size={12} /> Zaksięguj</>}
                        </button>
                        <button
                          onClick={() => setShowJournalModal(true)}
                          className="bg-slate-100 text-slate-500 font-black px-4 py-2.5 rounded-xl text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                        >
                          Edytuj
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => patchState(d.id, { expanded: !state.expanded })}
                      className="text-slate-300 hover:text-slate-500 transition-colors p-1"
                    >
                      {state.expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                  </div>
                )}
              </div>

              {/* Expanded suggestion panel */}
              {state.expanded && state.suggestion && (
                <div className="border-t border-slate-100 px-8 pb-7 pt-5 bg-slate-50/50">
                  <div className="flex items-center gap-3 mb-4">
                    <Layers className="text-indigo-400" size={14} />
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                      Proponowany dekret
                    </span>
                    <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg ${
                      state.suggestion.isBalanced
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {state.suggestion.isBalanced ? 'Zbilansowany' : 'Niezbalansowany'}
                    </span>
                    <span className="text-[9px] font-black text-indigo-600 uppercase bg-indigo-50 px-2.5 py-1 rounded-lg">
                      Pewnosc: {state.suggestion.confidence}%
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    {state.suggestion.entries.map((entry, i) => (
                      <div key={i} className="flex items-center gap-4 bg-white rounded-xl border border-slate-100 px-5 py-3">
                        <span className={`text-[10px] font-black w-6 uppercase ${
                          entry.side === 'Wn' ? 'text-rose-500' : 'text-emerald-500'
                        }`}>{entry.side}</span>
                        <span className="text-[11px] font-black text-slate-700 w-16 font-mono">{entry.accountCode}</span>
                        <span className="text-[11px] font-bold text-slate-500 flex-1 truncate">{entry.accountName}</span>
                        <span className="text-[11px] font-black text-slate-800 italic">{fmtPLN(entry.amount)}</span>
                        <span className="text-[10px] font-bold text-slate-300 truncate max-w-[120px]">{entry.description}</span>
                      </div>
                    ))}
                  </div>

                  <p className="text-[10px] font-bold text-slate-500 italic bg-indigo-50 px-5 py-3 rounded-xl">
                    {state.suggestion.explanation}
                  </p>
                </div>
              )}

              {/* Error */}
              {state.error && (
                <div className="border-t border-rose-100 px-8 py-4 bg-rose-50 flex items-center gap-3">
                  <AlertCircle className="text-rose-500" size={14} />
                  <span className="text-[10px] font-bold text-rose-600">{state.error}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Patterns */}
      <div className="border border-slate-100 rounded-[2rem] overflow-hidden">
        <button
          onClick={() => setPatternsOpen(o => !o)}
          className="w-full flex items-center justify-between px-8 py-5 bg-white hover:bg-slate-50 transition-all"
        >
          <div className="flex items-center gap-3">
            <Layers className="text-indigo-400" size={16} />
            <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
              Wzorce dekretacji ({patterns.length})
            </span>
          </div>
          {patternsOpen ? <ChevronDown size={16} className="text-slate-300" /> : <ChevronRight size={16} className="text-slate-300" />}
        </button>

        {patternsOpen && (
          <div className="border-t border-slate-100 p-8 bg-slate-50/30 space-y-3">
            {patterns.slice(0, 5).map((p, i) => (
              <div key={i} className="bg-white border border-slate-100 rounded-2xl px-6 py-4 flex items-center gap-6">
                <div className="flex-1">
                  <span className="text-[10px] font-black text-slate-700 uppercase italic">{p.category}</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {p.accountPairs.slice(0, 3).map((pair, j) => (
                      <span key={j} className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg">
                        WN {pair.debitCode} / MA {pair.creditCode}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="text-[10px] font-black text-slate-300 uppercase">{p.usageCount}x</span>
              </div>
            ))}
            {patterns.length === 0 && (
              <p className="text-[10px] font-bold text-slate-400 uppercase text-center py-4">
                Brak historycznych wzorców — zaksięguj pierwsze dokumenty.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Manual journal modal */}
      {showJournalModal && <JournalEntryModal onClose={() => setShowJournalModal(false)} />}
    </div>
  );
}
