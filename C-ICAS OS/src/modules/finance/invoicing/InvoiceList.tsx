/**
 * Data: 2026-05-18
 * Zmiany: Zastąpiono hardcoded dane real-time Firestore listener (getInvoicesListener).
 * Ścieżka: /src/modules/finance/invoicing/InvoiceList.tsx
 */
import React, { useState, useEffect } from 'react';
import {
  FileText, Download, Mail, CreditCard,
  MoreVertical, ShieldCheck, Link2,
  CheckCircle2, Clock, AlertCircle, Loader2,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useTenant } from '../../../shared/hooks/useTenant';
import { getInvoicesListener } from '../services/invoiceService';
import type { SalesInvoice } from '../types/fiTypes';
import PaymentInitiator from '../psd2/PaymentInitiator';

const STATUS_CFG: Record<string, { cls: string; label: string; icon: React.ReactNode }> = {
  paid:           { cls: 'bg-emerald-50 text-emerald-600 border-emerald-100', label: 'Opłacona',      icon: <CheckCircle2 size={12} /> },
  issued:         { cls: 'bg-amber-50  text-amber-600  border-amber-100',  label: 'Oczekuje',       icon: <Clock size={12} /> },
  sent:           { cls: 'bg-amber-50  text-amber-600  border-amber-100',  label: 'Oczekuje',       icon: <Clock size={12} /> },
  partially_paid: { cls: 'bg-sky-50    text-sky-600    border-sky-100',    label: 'Częściowo',      icon: <CreditCard size={12} /> },
  overdue:        { cls: 'bg-rose-50   text-rose-600   border-rose-100',   label: 'Po Terminie',    icon: <AlertCircle size={12} /> },
  draft:          { cls: 'bg-slate-50  text-slate-400  border-slate-100',  label: 'Szkic',          icon: <FileText size={12} /> },
  cancelled:      { cls: 'bg-slate-50  text-slate-400  border-slate-100',  label: 'Anulowana',      icon: <FileText size={12} /> },
  corrected:      { cls: 'bg-slate-50  text-slate-400  border-slate-100',  label: 'Skorygowana',    icon: <FileText size={12} /> },
};

function SkeletonRow() {
  return (
    <tr className="animate-pulse border-b border-slate-50">
      <td className="px-8 py-6"><div className="h-3 bg-slate-100 rounded-full w-32 mb-2" /><div className="h-2 bg-slate-100 rounded-full w-24" /></td>
      <td className="px-8 py-6"><div className="h-3 bg-slate-100 rounded-full w-40" /></td>
      <td className="px-8 py-6"><div className="h-3 bg-slate-100 rounded-full w-24" /></td>
      <td className="px-8 py-6"><div className="h-6 bg-slate-100 rounded-lg w-20" /></td>
      <td className="px-8 py-6"><div className="h-3 bg-slate-100 rounded-full w-28 ml-auto" /></td>
    </tr>
  );
}

export default function InvoiceList() {
  const { activeTenantId } = useTenant();
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!activeTenantId) return;
    const unsub = getInvoicesListener(activeTenantId, {}, data => {
      setInvoices(data);
      setLoading(false);
    });
    return unsub;
  }, [activeTenantId]);

  return (
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
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
          ) : invoices.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-8 py-20 text-center">
                <FileText className="mx-auto text-slate-200 mb-4" size={40} />
                <p className="text-sm font-bold text-slate-400">Brak faktur — kliknij &ldquo;Nowa Faktura&rdquo; aby wystawić pierwszą.</p>
              </td>
            </tr>
          ) : (
            invoices.map(inv => {
              const isActuallyOverdue =
                !['paid', 'cancelled', 'corrected', 'draft'].includes(inv.status) && inv.dueDate < today;
              const cfg = isActuallyOverdue ? STATUS_CFG.overdue : (STATUS_CFG[inv.status] ?? STATUS_CFG.draft);
              const ksefOk = inv.ksefStatus === 'sent' || inv.ksefStatus === 'accepted';
              const displayAmount = inv.remainingAmount > 0 ? inv.remainingAmount : inv.totalBrutto;

              return (
                <motion.tr
                  key={inv.id}
                  whileHover={{ backgroundColor: 'rgba(248, 250, 252, 0.5)' }}
                  className="group transition-colors"
                >
                  <td className="px-8 py-6">
                    <div className="text-[11px] font-black text-slate-900 uppercase italic mb-1">{inv.number}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">{inv.issueDate}</span>
                      <span className="text-slate-200">|</span>
                      <span className={`text-[9px] font-black uppercase ${isActuallyOverdue ? 'text-rose-500' : 'text-slate-400'}`}>
                        Termin: {inv.dueDate}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{inv.buyer.name}</div>
                    {inv.buyer.nip && <div className="text-[9px] text-slate-400 font-mono mt-0.5">{inv.buyer.nip}</div>}
                  </td>
                  <td className="px-8 py-6">
                    <div className="text-sm font-black text-slate-900 italic tracking-tighter">
                      {displayAmount.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} {inv.currency}
                    </div>
                    {inv.isMpp && (
                      <div className="text-[9px] font-black text-amber-600 uppercase mt-0.5">MPP</div>
                    )}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest italic ${cfg.cls}`}>
                        {cfg.icon}
                        {cfg.label}
                      </div>
                      {ksefOk && (
                        <div className="text-indigo-600 bg-indigo-50 p-1.5 rounded-md border border-indigo-100" title="Wysłano do KSeF">
                          <ShieldCheck size={14} />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="text-slate-300 hover:text-indigo-600 p-2 transition-colors" title="Drukuj PDF">
                        <Download size={18} />
                      </button>
                      <button className="text-slate-300 hover:text-indigo-600 p-2 transition-colors" title="Wyślij E-mail">
                        <Mail size={18} />
                      </button>
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="text-slate-300 hover:text-indigo-600 p-2 transition-colors"
                        title="Zapłać przez bank (PSD2)"
                      >
                        <CreditCard size={18} />
                      </button>
                      <button className="text-slate-300 hover:text-emerald-600 p-2 transition-colors" title="Link do płatności (Stripe)">
                        <Link2 size={18} />
                      </button>
                      <div className="w-px h-6 bg-slate-100 mx-2" />
                      <button className="text-slate-200 hover:text-slate-500 transition-colors">
                        <MoreVertical size={18} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              );
            })
          )}
        </tbody>
      </table>

      {selectedInvoice && (
        <PaymentInitiator
          invoice={{
            id: selectedInvoice.id!,
            number: selectedInvoice.number,
            amount: selectedInvoice.remainingAmount || selectedInvoice.totalBrutto,
            counterpart: selectedInvoice.buyer.name,
            iban: selectedInvoice.bankAccount || selectedInvoice.buyer.bankAccount || 'PL 00 0000 0000 0000 0000 0000 0000',
          }}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
}
