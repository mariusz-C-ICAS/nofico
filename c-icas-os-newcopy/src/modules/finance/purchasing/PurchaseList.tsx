/**
 * Data: 2026-05-15
 * Ścieżka: /src/modules/finance/purchasing/PurchaseList.tsx
 * Lista faktur zakupowych — real-time Firestore + filtry + AI analiza.
 */
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  FileText, Trash2, CheckCircle2, Download,
  ChevronDown, ChevronUp, Loader2, AlertTriangle,
  Lock, Sparkles, ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTenant } from '../../../shared/hooks/useTenant';
import { askAI } from '../../../shared/services/geminiService';
import {
  getPurchaseInvoicesListener,
  markAsPaid as svcMarkAsPaid,
  deletePurchaseInvoice,
} from '../services/purchaseInvoiceService';
import type { PurchaseInvoice, VatSummaryRow } from '../types/fiTypes';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PurchaseTab = 'all' | 'unpaid' | 'overdue' | 'paid' | 'ksef';

interface Props {
  activeTab: PurchaseTab;
  searchQuery: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10);

function isOverdue(inv: PurchaseInvoice): boolean {
  return !inv.isPaid && inv.dueDate < today();
}

function fmtPLN(val: number, currency = 'PLN'): string {
  return `${val.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function getStatusBadge(inv: PurchaseInvoice) {
  if (inv.isPaid) {
    return { label: 'Opłacona', cls: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
  }
  if (isOverdue(inv)) {
    return { label: 'Przeterminowana', cls: 'bg-rose-50 text-rose-600 border-rose-100' };
  }
  return { label: 'Do Zapłaty', cls: 'bg-amber-50 text-amber-600 border-amber-100' };
}

function getSourceBadge(source: PurchaseInvoice['source']) {
  switch (source) {
    case 'ksef':        return { label: 'KSeF',     cls: 'bg-indigo-50 text-indigo-600 border-indigo-100' };
    case 'ocr_scan':   return { label: 'Skan',      cls: 'bg-purple-50 text-purple-600 border-purple-100' };
    case 'email':      return { label: 'E-mail',    cls: 'bg-sky-50 text-sky-600 border-sky-100' };
    case 'bank_import':return { label: 'Bank',      cls: 'bg-teal-50 text-teal-600 border-teal-100' };
    default:           return { label: 'Ręcznie',   cls: 'bg-slate-50 text-slate-400 border-slate-100' };
  }
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="px-6 py-5">
          <div className="h-3.5 bg-slate-100 rounded-full animate-pulse w-3/4" />
        </td>
      ))}
    </tr>
  );
}

// ─── Expanded detail row ──────────────────────────────────────────────────────

function ExpandedRow({
  inv,
  onBook,
}: {
  inv: PurchaseInvoice;
  onBook: (id: string) => void;
}) {
  return (
    <motion.tr
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-indigo-50/30"
    >
      <td colSpan={9} className="px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* VAT breakdown */}
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Stawki VAT</div>
            {inv.vatSummary?.length ? (
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-slate-400 font-black uppercase text-[9px]">
                    <th className="text-left pb-2">Stawka</th>
                    <th className="text-right pb-2">Netto</th>
                    <th className="text-right pb-2">VAT</th>
                    <th className="text-right pb-2">Brutto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inv.vatSummary.map((row: VatSummaryRow) => (
                    <tr key={String(row.vatRate)} className="font-bold text-slate-700">
                      <td className="py-1">{typeof row.vatRate === 'number' ? `${row.vatRate}%` : row.vatRate}</td>
                      <td className="text-right py-1">{row.netto.toLocaleString('pl-PL', { minimumFractionDigits: 2 })}</td>
                      <td className="text-right py-1">{row.vat.toLocaleString('pl-PL', { minimumFractionDigits: 2 })}</td>
                      <td className="text-right py-1">{row.brutto.toLocaleString('pl-PL', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-[11px] text-slate-400 font-bold">Brak danych VAT</div>
            )}
          </div>

          {/* AI category + cost center */}
          <div className="space-y-4">
            {inv.aiCategory && (
              <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Kategoria AI</div>
                <div className="text-[11px] font-black text-indigo-600 uppercase italic">{inv.aiCategory}</div>
                {inv.aiConfidence !== undefined && (
                  <div className="text-[9px] text-slate-400 font-bold mt-0.5">
                    Pewność: {Math.round(inv.aiConfidence * 100)}%
                  </div>
                )}
              </div>
            )}
            {inv.category && (
              <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Kategoria</div>
                <div className="text-[11px] font-bold text-slate-700">{inv.category}</div>
              </div>
            )}
            {inv.costCenterId && (
              <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Centrum Kosztów</div>
                <div className="text-[11px] font-bold text-slate-700">{inv.costCenterId}</div>
              </div>
            )}
          </div>

          {/* Accountant notes + booking */}
          <div className="space-y-4">
            {inv.accountantNotes && (
              <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Notatki Księgowego</div>
                <div className="text-[11px] text-slate-600 font-bold">{inv.accountantNotes}</div>
              </div>
            )}
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Historia Płatności</div>
              {inv.isPaid ? (
                <div className="text-[11px] text-emerald-600 font-black uppercase">
                  Opłacono {fmtPLN(inv.paidAmount, inv.currency)}{inv.paymentDate ? ` · ${inv.paymentDate}` : ''}
                </div>
              ) : (
                <div className="text-[11px] text-amber-600 font-black uppercase">
                  Pozostało {fmtPLN(inv.remainingAmount, inv.currency)}
                </div>
              )}
            </div>
            {!inv.isBookedByAccountant && (
              <button
                onClick={() => inv.id && onBook(inv.id)}
                className="text-[9px] font-black uppercase tracking-widest text-indigo-600 border border-indigo-200 px-4 py-2 rounded-xl hover:bg-indigo-50 transition-colors"
              >
                Zaksięguj
              </button>
            )}
            {inv.isBookedByAccountant && (
              <div className="text-[9px] font-black uppercase text-emerald-600">
                Zaksięgowano {inv.bookingDate ?? ''}
              </div>
            )}
          </div>
        </div>
      </td>
    </motion.tr>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PurchaseList({ activeTab, searchQuery }: Props) {
  const { activeTenantId } = useTenant();
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  // AI panel
  const [aiOpen, setAiOpen] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Firestore real-time subscription
  useEffect(() => {
    if (!activeTenantId) return;
    setLoading(true);
    const unsub = getPurchaseInvoicesListener(activeTenantId, (data) => {
      setInvoices(data);
      setLoading(false);
    });
    return () => unsub();
  }, [activeTenantId]);

  // Filtering
  const filtered = useMemo(() => {
    let list = invoices;
    if (activeTab === 'unpaid') list = list.filter((i) => !i.isPaid);
    else if (activeTab === 'overdue') list = list.filter(isOverdue);
    else if (activeTab === 'paid') list = list.filter((i) => i.isPaid);
    else if (activeTab === 'ksef') list = list.filter((i) => i.source === 'ksef');

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (i) =>
          i.seller?.name?.toLowerCase().includes(q) ||
          i.supplierInvoiceNumber?.toLowerCase().includes(q) ||
          i.internalNumber?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [invoices, activeTab, searchQuery]);

  const handleMarkPaid = useCallback(
    async (inv: PurchaseInvoice) => {
      if (!inv.id || !activeTenantId) return;
      setPayingId(inv.id);
      try {
        await svcMarkAsPaid(activeTenantId, inv.id, inv.totalBrutto);
      } catch (e) {
        console.error('markAsPaid error:', e);
      } finally {
        setPayingId(null);
      }
    },
    [activeTenantId]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!activeTenantId) return;
      setDeletingId(id);
      try {
        await deletePurchaseInvoice(activeTenantId, id);
      } catch (e) {
        console.error('delete error:', e);
      } finally {
        setDeletingId(null);
      }
    },
    [activeTenantId]
  );

  const handleBook = useCallback(
    async (id: string) => {
      if (!activeTenantId) return;
      const { updatePurchaseInvoice } = await import('../services/purchaseInvoiceService');
      await updatePurchaseInvoice(activeTenantId, id, {
        isBookedByAccountant: true,
        bookingDate: new Date().toISOString().slice(0, 10),
      });
    },
    [activeTenantId]
  );

  const handleAiAnalysis = useCallback(async () => {
    if (aiLoading) return;
    setAiOpen(true);
    setAiLoading(true);
    try {
      const topCategories = invoices
        .filter((i) => !i.isPaid)
        .reduce<Record<string, number>>((acc, inv) => {
          const cat = inv.aiCategory ?? inv.category ?? 'Inne';
          acc[cat] = (acc[cat] ?? 0) + inv.totalBrutto;
          return acc;
        }, {});
      const summary = Object.entries(topCategories)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([cat, amt]) => `${cat}: ${fmtPLN(amt)}`)
        .join(', ');
      const result = await askAI(
        `Jako asystent finansowy, przeanalizuj w 2-3 zdaniach po polsku kategorie wydatków firmowych: ${summary}. Wskaż potencjalne oszczędności i podaj konkretną rekomendację dla właściciela firmy.`
      );
      setAiText(result);
    } catch {
      setAiText('Nie udało się pobrać analizy AI. Spróbuj ponownie.');
    } finally {
      setAiLoading(false);
    }
  }, [invoices, aiLoading]);

  // Empty state
  if (!loading && filtered.length === 0) {
    return (
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-20 flex flex-col items-center gap-6 animate-in fade-in duration-500">
        <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center">
          <FileText className="text-indigo-300" size={32} />
        </div>
        <div className="text-center">
          <div className="text-xl font-black text-slate-900 italic tracking-tighter uppercase mb-2">
            Brak Faktur Zakupowych
          </div>
          <div className="text-sm text-slate-400 font-bold">
            Dodaj pierwszą fakturę ręcznie lub zsynchronizuj z KSeF
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">

      {/* AI analysis button */}
      <div className="flex justify-end">
        <button
          onClick={handleAiAnalysis}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
        >
          <Sparkles size={14} />
          Analiza Wydatków AI
        </button>
      </div>

      {/* AI panel */}
      <AnimatePresence>
        {aiOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-indigo-600 rounded-[2.5rem] p-8 text-white overflow-hidden"
          >
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <div className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-3 italic">
                  NoFiCo AI — Analiza Wydatków
                </div>
                {aiLoading ? (
                  <div className="flex items-center gap-3">
                    <Loader2 size={16} className="animate-spin text-indigo-300" />
                    <span className="text-indigo-200 text-sm font-bold italic">Analizuję kategorie wydatków...</span>
                  </div>
                ) : (
                  <p className="text-sm font-bold text-white leading-relaxed">{aiText}</p>
                )}
              </div>
              <button
                onClick={() => setAiOpen(false)}
                className="text-indigo-300 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest"
              >
                Zamknij
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Dostawca</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nr Faktury</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Wystawiona</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Termin</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Brutto</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">VAT</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status / Źródło</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kategoria</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Działania</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading
                ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                : filtered.map((inv) => {
                    const overdue = isOverdue(inv);
                    const expanded = expandedId === inv.id;
                    const statusBadge = getStatusBadge(inv);
                    const sourceBadge = getSourceBadge(inv.source);

                    return (
                      <React.Fragment key={inv.id}>
                        <motion.tr
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          whileHover={{
                            backgroundColor: overdue
                              ? 'rgba(255,241,242,0.7)'
                              : 'rgba(248,250,252,0.5)',
                          }}
                          className={`group transition-colors cursor-pointer ${
                            overdue ? 'bg-rose-50/40' : ''
                          }`}
                          onClick={() =>
                            setExpandedId(expanded ? null : (inv.id ?? null))
                          }
                        >
                          {/* Supplier */}
                          <td className="px-6 py-5">
                            <div className="text-[11px] font-black text-slate-900 uppercase italic">
                              {inv.seller?.name ?? '—'}
                            </div>
                            {inv.seller?.nip && (
                              <div className="text-[9px] text-slate-400 font-bold mt-0.5">
                                NIP: {inv.seller.nip}
                              </div>
                            )}
                          </td>

                          {/* Invoice number */}
                          <td className="px-6 py-5">
                            <div className="text-[11px] font-black text-slate-700 uppercase">
                              {inv.supplierInvoiceNumber}
                            </div>
                            {inv.internalNumber && (
                              <div className="text-[9px] text-slate-400 font-bold mt-0.5">
                                Int: {inv.internalNumber}
                              </div>
                            )}
                          </td>

                          {/* Issue date */}
                          <td className="px-6 py-5">
                            <div className="text-[11px] font-bold text-slate-600">{inv.issueDate}</div>
                          </td>

                          {/* Due date */}
                          <td className="px-6 py-5">
                            <div
                              className={`text-[11px] font-black ${
                                overdue ? 'text-rose-600' : 'text-slate-600'
                              }`}
                            >
                              {inv.dueDate}
                            </div>
                          </td>

                          {/* Amount brutto */}
                          <td className="px-6 py-5">
                            <div className="text-sm font-black text-slate-900 italic tracking-tighter">
                              {fmtPLN(inv.totalBrutto, inv.currency)}
                            </div>
                          </td>

                          {/* VAT total */}
                          <td className="px-6 py-5">
                            <div className="text-[11px] font-bold text-slate-500">
                              {fmtPLN(inv.totalVat, inv.currency)}
                            </div>
                          </td>

                          {/* Status + Source + MPP */}
                          <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-col gap-1">
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest italic ${statusBadge.cls}`}
                              >
                                {statusBadge.label}
                              </span>
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase ${sourceBadge.cls}`}
                              >
                                {sourceBadge.label}
                              </span>
                              {inv.isMpp && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border bg-slate-900 text-white border-slate-800 text-[9px] font-black uppercase">
                                  <Lock size={9} /> MPP
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Category */}
                          <td className="px-6 py-5">
                            <div className="text-[10px] font-bold text-slate-500">
                              {inv.aiCategory ?? inv.category ?? '—'}
                            </div>
                          </td>

                          {/* Actions */}
                          <td
                            className="px-6 py-5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-1">
                              {!inv.isPaid && (
                                <button
                                  title="Zapłać"
                                  onClick={() => handleMarkPaid(inv)}
                                  disabled={payingId === inv.id}
                                  className="text-slate-300 hover:text-emerald-600 p-2 transition-colors"
                                >
                                  {payingId === inv.id ? (
                                    <Loader2 size={15} className="animate-spin" />
                                  ) : (
                                    <CheckCircle2 size={15} />
                                  )}
                                </button>
                              )}
                              <button
                                title="Pobierz PDF"
                                className="text-slate-300 hover:text-indigo-600 p-2 transition-colors"
                              >
                                <Download size={15} />
                              </button>
                              <button
                                title="Usuń"
                                onClick={() => inv.id && handleDelete(inv.id)}
                                disabled={deletingId === inv.id}
                                className="text-slate-300 hover:text-rose-500 p-2 transition-colors"
                              >
                                {deletingId === inv.id ? (
                                  <Loader2 size={15} className="animate-spin" />
                                ) : (
                                  <Trash2 size={15} />
                                )}
                              </button>
                              <button
                                className="text-slate-300 hover:text-slate-600 p-2 transition-colors"
                                title={expanded ? 'Zwiń' : 'Rozwiń'}
                                onClick={() =>
                                  setExpandedId(expanded ? null : (inv.id ?? null))
                                }
                              >
                                {expanded ? (
                                  <ChevronUp size={15} />
                                ) : (
                                  <ChevronDown size={15} />
                                )}
                              </button>
                            </div>
                          </td>
                        </motion.tr>

                        <AnimatePresence>
                          {expanded && (
                            <ExpandedRow inv={inv} onBook={handleBook} />
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
