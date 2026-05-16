/**
 * Data: 2026-05-15
 * Zmiany: Firestore real-time list + AI features + KSeF + overdue highlighting.
 * Ścieżka: /src/modules/finance/invoicing/InvoiceList.tsx
 */
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  FileText, Download, Send, CreditCard,
  ShieldCheck, Mail, CheckCircle2, Clock,
  AlertCircle, ChevronDown, ChevronUp, Loader2,
  XCircle, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  collection, onSnapshot, query, orderBy,
  updateDoc, doc, Timestamp
} from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import { useTenant } from '../../../shared/hooks/useTenant';
import type { SalesInvoice, InvoiceStatus, KSeFStatus } from '../types/fiTypes';
import PaymentInitiator from '../psd2/PaymentInitiator';

// ─── Types ────────────────────────────────────────────────────────────────────

export type InvoiceTab = 'all' | 'unpaid' | 'overdue' | 'proformas' | 'drafts';

interface Props {
  activeTab: InvoiceTab;
  searchQuery: string;
  onCountsChange?: (counts: Record<InvoiceTab, number>) => void;
  onFilterChange?: (filter: InvoiceTab) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

function isOverdue(inv: SalesInvoice): boolean {
  if (inv.status === 'overdue') return true;
  if (['paid', 'cancelled', 'draft'].includes(inv.status)) return false;
  return inv.dueDate < new Date().toISOString().slice(0, 10);
}

function getStatusStyle(status: InvoiceStatus): string {
  switch (status) {
    case 'paid': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    case 'issued':
    case 'sent':
    case 'partially_paid': return 'bg-amber-50 text-amber-600 border-amber-100';
    case 'overdue': return 'bg-rose-50 text-rose-600 border-rose-100';
    case 'cancelled':
    case 'corrected': return 'bg-slate-50 text-slate-400 border-slate-100';
    default: return 'bg-slate-50 text-slate-400 border-slate-100';
  }
}

function getStatusLabel(status: InvoiceStatus): string {
  const map: Record<InvoiceStatus, string> = {
    draft: 'Szkic', issued: 'Wystawiona', sent: 'Wysłana',
    partially_paid: 'Część. Opł.', paid: 'Opłacona',
    overdue: 'Po Terminie', cancelled: 'Anulowana', corrected: 'Korygowana',
  };
  return map[status] ?? status;
}

function getStatusIcon(status: InvoiceStatus) {
  switch (status) {
    case 'paid': return <CheckCircle2 size={12} />;
    case 'overdue': return <AlertCircle size={12} />;
    case 'cancelled': return <XCircle size={12} />;
    case 'draft': return <FileText size={12} />;
    default: return <Clock size={12} />;
  }
}

function getKSeFStyle(ksefStatus: KSeFStatus): string {
  switch (ksefStatus) {
    case 'accepted': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    case 'sending':
    case 'sent': return 'text-amber-500 bg-amber-50 border-amber-100';
    case 'rejected': return 'text-rose-600 bg-rose-50 border-rose-100';
    default: return 'text-slate-300 bg-slate-50 border-slate-100';
  }
}

function getKSeFLabel(ksefStatus: KSeFStatus): string {
  const map: Record<KSeFStatus, string> = {
    not_sent: 'KSeF', sending: 'Wysyłanie', sent: 'Wysłano',
    accepted: 'KSeF OK', rejected: 'KSeF Błąd', n_a: 'N/D',
  };
  return map[ksefStatus] ?? ksefStatus;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr>
      {[1, 2, 3, 4, 5].map(i => (
        <td key={i} className="px-8 py-6">
          <div className="h-4 bg-slate-100 rounded-full animate-pulse w-3/4" />
        </td>
      ))}
    </tr>
  );
}

// ─── VAT Summary inline ───────────────────────────────────────────────────────

function VatSummaryTable({ inv }: { inv: SalesInvoice }) {
  return (
    <motion.tr
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-indigo-50/40"
    >
      <td colSpan={5} className="px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Stawki VAT</div>
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
                {inv.vatSummary?.map(row => (
                  <tr key={String(row.vatRate)} className="font-bold text-slate-700">
                    <td className="py-1">{typeof row.vatRate === 'number' ? `${row.vatRate}%` : row.vatRate}</td>
                    <td className="text-right py-1">{row.netto.toLocaleString('pl-PL', { minimumFractionDigits: 2 })}</td>
                    <td className="text-right py-1">{row.vat.toLocaleString('pl-PL', { minimumFractionDigits: 2 })}</td>
                    <td className="text-right py-1">{row.brutto.toLocaleString('pl-PL', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Płatność</div>
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold uppercase">Zapłacono</span>
                <span className="font-black text-emerald-600">{inv.paidAmount.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} {inv.currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold uppercase">Pozostało</span>
                <span className={`font-black ${inv.remainingAmount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                  {inv.remainingAmount.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} {inv.currency}
                </span>
              </div>
              {inv.emailSentAt && (
                <div className="flex justify-between pt-2 border-t border-slate-100 mt-2">
                  <span className="text-slate-400 font-bold uppercase text-[9px]">E-mail wysłany</span>
                  <span className="text-slate-500 font-bold text-[9px]">{new Date(inv.emailSentAt).toLocaleDateString('pl-PL')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </td>
    </motion.tr>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function InvoiceList({ activeTab, searchQuery, onCountsChange }: Props) {
  const { activeTenantId } = useTenant();
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<SalesInvoice | null>(null);
  const [page, setPage] = useState(1);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);

  // Real-time Firestore subscription
  useEffect(() => {
    if (!activeTenantId) return;
    setLoading(true);

    const q = query(
      collection(db, `tenants/${activeTenantId}/invoices`),
      orderBy('issueDate', 'desc')
    );

    const unsub = onSnapshot(
      q,
      snap => {
        const data: SalesInvoice[] = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as SalesInvoice))
          .filter(inv => !inv.isDeleted);
        setInvoices(data);
        setLoading(false);
        setError(null);
      },
      err => {
        console.error('InvoiceList onSnapshot error:', err);
        setError('Nie udało się załadować faktur. Sprawdź połączenie.');
        setLoading(false);
      }
    );

    return () => unsub();
  }, [activeTenantId]);

  // Tab counts — report upward
  const counts = useMemo<Record<InvoiceTab, number>>(() => {
    const c: Record<InvoiceTab, number> = { all: 0, unpaid: 0, overdue: 0, proformas: 0, drafts: 0 };
    for (const inv of invoices) {
      c.all++;
      if (['issued', 'sent', 'partially_paid'].includes(inv.status)) c.unpaid++;
      if (isOverdue(inv)) c.overdue++;
      if (inv.type === 'proforma') c.proformas++;
      if (inv.status === 'draft') c.drafts++;
    }
    return c;
  }, [invoices]);

  useEffect(() => { onCountsChange?.(counts); }, [counts, onCountsChange]);

  // Client-side filter
  const filtered = useMemo(() => {
    let list = invoices;
    if (activeTab === 'unpaid') list = list.filter(i => ['issued', 'sent', 'partially_paid'].includes(i.status));
    else if (activeTab === 'overdue') list = list.filter(isOverdue);
    else if (activeTab === 'proformas') list = list.filter(i => i.type === 'proforma');
    else if (activeTab === 'drafts') list = list.filter(i => i.status === 'draft');

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(i =>
        i.number.toLowerCase().includes(q) ||
        i.buyer.name.toLowerCase().includes(q)
      );
    }
    return list;
  }, [invoices, activeTab, searchQuery]);

  const paginated = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page]);

  const markAsPaid = useCallback(async (inv: SalesInvoice) => {
    if (!inv.id || !activeTenantId) return;
    setMarkingPaid(inv.id);
    try {
      await updateDoc(doc(db, `tenants/${activeTenantId}/invoices/${inv.id}`), {
        status: 'paid',
        paidAmount: inv.totalBrutto,
        remainingAmount: 0,
        paymentDate: new Date().toISOString().slice(0, 10),
        updatedAt: Timestamp.now(),
      });
    } catch (e) {
      console.error('Mark paid error:', e);
    } finally {
      setMarkingPaid(null);
    }
  }, [activeTenantId]);

  // ── Render ──────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="bg-white rounded-[3rem] border border-rose-100 p-12 text-center">
        <AlertTriangle className="text-rose-400 mx-auto mb-4" size={32} />
        <div className="text-sm font-black text-slate-700 italic">{error}</div>
      </div>
    );
  }

  if (!loading && filtered.length === 0) {
    return (
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-20 flex flex-col items-center gap-6">
        <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center">
          <FileText className="text-indigo-300" size={32} />
        </div>
        <div className="text-center">
          <div className="text-xl font-black text-slate-900 italic tracking-tighter uppercase mb-2">Brak Faktur</div>
          <div className="text-sm text-slate-400 font-bold">Wystaw pierwszą fakturę, aby rozpocząć zarządzanie sprzedażą</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Dokument / Data</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kontrahent</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kwota Do Zapłaty</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status / KSeF</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Działania</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              : paginated.map(inv => {
                const overdue = isOverdue(inv);
                const expanded = expandedId === inv.id;

                return (
                  <React.Fragment key={inv.id}>
                    <motion.tr
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ backgroundColor: overdue ? 'rgba(255,241,242,0.7)' : 'rgba(248,250,252,0.5)' }}
                      className={`group transition-colors cursor-pointer ${overdue ? 'bg-rose-50/30' : ''}`}
                      onClick={() => setExpandedId(expanded ? null : (inv.id ?? null))}
                    >
                      <td className="px-8 py-6">
                        <div className="text-[11px] font-black text-slate-900 uppercase italic mb-1">{inv.number}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">{inv.issueDate}</span>
                          <span className="text-slate-200">|</span>
                          <span className={`text-[9px] font-black uppercase ${overdue ? 'text-rose-500' : 'text-slate-400'}`}>
                            Termin: {inv.dueDate}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{inv.buyer.name}</div>
                        {inv.buyer.nip && (
                          <div className="text-[9px] text-slate-400 font-bold mt-0.5">NIP: {inv.buyer.nip}</div>
                        )}
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-sm font-black text-slate-900 italic tracking-tighter">
                          {inv.totalBrutto.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} {inv.currency}
                        </div>
                        {inv.remainingAmount > 0 && inv.remainingAmount < inv.totalBrutto && (
                          <div className="text-[9px] font-bold text-amber-500 mt-0.5">
                            Pozostało: {inv.remainingAmount.toLocaleString('pl-PL', { minimumFractionDigits: 2 })}
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest italic ${getStatusStyle(inv.status)}`}>
                            {getStatusIcon(inv.status)}
                            {getStatusLabel(inv.status)}
                          </div>
                          <div className={`flex items-center gap-1 px-2 py-1 rounded-md border text-[9px] font-black ${getKSeFStyle(inv.ksefStatus)}`} title={`KSeF: ${inv.ksefStatus}`}>
                            <ShieldCheck size={11} />
                            {getKSeFLabel(inv.ksefStatus)}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            className="text-slate-300 hover:text-indigo-600 p-2 transition-colors"
                            title="Pobierz PDF"
                            onClick={() => inv.pdfUrl && window.open(inv.pdfUrl, '_blank')}
                          >
                            <Download size={16} />
                          </button>
                          <button
                            className="text-slate-300 hover:text-indigo-600 p-2 transition-colors relative"
                            title={inv.emailSentAt ? `E-mail wysłany ${new Date(inv.emailSentAt).toLocaleDateString('pl-PL')}` : 'Wyślij e-mail'}
                          >
                            <Mail size={16} />
                            {inv.emailSentAt && (
                              <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-400 rounded-full" />
                            )}
                          </button>
                          <button
                            className="text-slate-300 hover:text-indigo-600 p-2 transition-colors"
                            title="Zapłać przez bank (PSD2)"
                            onClick={() => setPaymentInvoice(inv)}
                          >
                            <CreditCard size={16} />
                          </button>
                          {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                            <button
                              className="text-slate-300 hover:text-emerald-600 p-2 transition-colors text-[9px] font-black uppercase"
                              title="Oznacz jako opłaconą"
                              onClick={() => markAsPaid(inv)}
                              disabled={markingPaid === inv.id}
                            >
                              {markingPaid === inv.id
                                ? <Loader2 size={16} className="animate-spin" />
                                : <CheckCircle2 size={16} />}
                            </button>
                          )}
                          {inv.ksefStatus === 'not_sent' && inv.status !== 'draft' && (
                            <button
                              className="text-slate-300 hover:text-indigo-600 p-2 transition-colors"
                              title="Wyślij do KSeF"
                            >
                              <Send size={16} />
                            </button>
                          )}
                          <button
                            className="text-slate-300 hover:text-slate-600 p-2 transition-colors ml-1"
                            title={expanded ? 'Zwiń' : 'Rozwiń szczegóły'}
                          >
                            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                    <AnimatePresence>
                      {expanded && <VatSummaryTable inv={inv} />}
                    </AnimatePresence>
                  </React.Fragment>
                );
              })
            }
          </tbody>
        </table>

        {!loading && filtered.length > paginated.length && (
          <div className="px-8 py-6 border-t border-slate-50 text-center">
            <button
              onClick={() => setPage(p => p + 1)}
              className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800 transition-colors"
            >
              Załaduj więcej ({filtered.length - paginated.length} pozostałych)
            </button>
          </div>
        )}
      </div>

      {paymentInvoice && (
        <PaymentInitiator
          invoice={{
            id: paymentInvoice.id ?? '',
            number: paymentInvoice.number,
            amount: paymentInvoice.remainingAmount || paymentInvoice.totalBrutto,
            counterpart: paymentInvoice.buyer.name,
            iban: paymentInvoice.bankAccount ?? paymentInvoice.seller.bankAccount ?? '',
          }}
          onClose={() => setPaymentInvoice(null)}
        />
      )}
    </>
  );
}
