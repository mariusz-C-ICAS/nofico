/**
 * Data: 2026-05-18
 * Zmiany: PDF (okno drukowania), Email (mailto), przycisk KSeF dla wystawionych faktur.
 * Ścieżka: /src/modules/finance/invoicing/InvoiceList.tsx
 */
import React, { useState, useEffect } from 'react';
import {
  FileText, Download, Mail, CreditCard,
  MoreVertical, ShieldCheck, Link2,
  CheckCircle2, Clock, AlertCircle, Loader2, Send,
  XCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTenant } from '../../../shared/hooks/useTenant';
import { getInvoicesListener, sendToKSeF, updateInvoice } from '../services/invoiceService';
import type { SalesInvoice } from '../types/fiTypes';
import PaymentInitiator from '../psd2/PaymentInitiator';

const STATUS_CFG: Record<string, { cls: string; label: string; icon: React.ReactNode }> = {
  paid:           { cls: 'bg-emerald-50 text-emerald-600 border-emerald-100', label: 'Opłacona',   icon: <CheckCircle2 size={12} /> },
  issued:         { cls: 'bg-amber-50  text-amber-600  border-amber-100',    label: 'Oczekuje',   icon: <Clock size={12} /> },
  sent:           { cls: 'bg-amber-50  text-amber-600  border-amber-100',    label: 'Oczekuje',   icon: <Clock size={12} /> },
  partially_paid: { cls: 'bg-sky-50    text-sky-600    border-sky-100',      label: 'Częściowo',  icon: <CreditCard size={12} /> },
  overdue:        { cls: 'bg-rose-50   text-rose-600   border-rose-100',     label: 'Po Terminie', icon: <AlertCircle size={12} /> },
  draft:          { cls: 'bg-slate-50  text-slate-400  border-slate-100',    label: 'Szkic',      icon: <FileText size={12} /> },
  cancelled:      { cls: 'bg-slate-50  text-slate-400  border-slate-100',    label: 'Anulowana',  icon: <FileText size={12} /> },
  corrected:      { cls: 'bg-slate-50  text-slate-400  border-slate-100',    label: 'Skorygowana', icon: <FileText size={12} /> },
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

const fmtMoney = (v: number, curr = 'PLN') =>
  v.toLocaleString('pl-PL', { minimumFractionDigits: 2 }) + ' ' + curr;

function printInvoice(inv: SalesInvoice) {
  const w = window.open('', '_blank', 'width=900,height=720');
  if (!w) return;
  const rows = inv.items.map((it, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${it.name}</td>
      <td style="text-align:right">${it.quantity}</td>
      <td>${it.unit}</td>
      <td style="text-align:right">${fmtMoney(it.priceNetto)}</td>
      <td style="text-align:right">${it.vatRate}%</td>
      <td style="text-align:right">${fmtMoney(it.totalBrutto)}</td>
    </tr>`).join('');
  w.document.write(`<!DOCTYPE html><html lang="pl"><head><meta charset="UTF-8">
    <title>Faktura ${inv.number}</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:11px;color:#111;margin:0;padding:20px}
      h1{font-size:20px;margin:0}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px}
      .parties{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:16px 0}
      .party h3{font-size:9px;text-transform:uppercase;color:#888;margin:0 0 4px}
      .party p{margin:2px 0;font-size:11px}
      .party .name{font-weight:700;font-size:13px}
      table{width:100%;border-collapse:collapse;margin-top:12px}
      th{background:#f4f4f4;padding:6px 8px;text-align:left;font-size:9px;text-transform:uppercase;border-bottom:2px solid #ddd}
      td{padding:6px 8px;border-bottom:1px solid #eee}
      .totals{text-align:right;margin-top:16px}
      .totals tr td:first-child{font-weight:normal;color:#555;padding-right:20px}
      .totals tr:last-child td{font-weight:700;font-size:14px;padding-top:8px;border-top:2px solid #111}
      .mpp{background:#fef9c3;border:1px solid #fde047;padding:8px 12px;border-radius:6px;margin-top:12px;font-weight:700;font-size:11px}
      .dates{display:flex;gap:30px;color:#555;font-size:10px;margin-bottom:10px}
      @media print{@page{margin:12mm}}
    </style></head><body>
    <div class="header">
      <div><h1>FAKTURA VAT</h1><p style="color:#888;font-size:13px">${inv.number}</p></div>
      <div class="dates" style="text-align:right">
        <div><b>Data wystawienia</b><br>${inv.issueDate}</div>
        <div><b>Data sprzedaży</b><br>${inv.saleDate}</div>
        <div><b>Termin płatności</b><br>${inv.dueDate}</div>
      </div>
    </div>
    <hr style="border:none;border-top:2px solid #111;margin:10px 0">
    <div class="parties">
      <div class="party">
        <h3>Sprzedawca</h3>
        <p class="name">${inv.seller.name}</p>
        ${inv.seller.nip ? `<p>NIP: ${inv.seller.nip}</p>` : ''}
        <p>${inv.seller.address}</p>
        <p>${inv.seller.postCode} ${inv.seller.city}</p>
        ${inv.seller.email ? `<p>${inv.seller.email}</p>` : ''}
        ${inv.bankAccount ? `<p style="margin-top:6px;font-size:10px;color:#555">Rachunek: ${inv.bankAccount}</p>` : ''}
      </div>
      <div class="party">
        <h3>Nabywca</h3>
        <p class="name">${inv.buyer.name}</p>
        ${inv.buyer.nip ? `<p>NIP: ${inv.buyer.nip}</p>` : ''}
        <p>${inv.buyer.address}</p>
        <p>${inv.buyer.postCode} ${inv.buyer.city}</p>
        ${inv.buyer.email ? `<p>${inv.buyer.email}</p>` : ''}
      </div>
    </div>
    <table>
      <thead><tr>
        <th>Lp</th><th>Nazwa</th><th style="text-align:right">Ilość</th>
        <th>J.m.</th><th style="text-align:right">Cena netto</th>
        <th style="text-align:right">VAT</th><th style="text-align:right">Wartość brutto</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <table class="totals" style="width:320px;margin-left:auto;margin-top:12px">
      <tr><td>Razem netto:</td><td>${fmtMoney(inv.totalNetto, inv.currency)}</td></tr>
      <tr><td>Podatek VAT:</td><td>${fmtMoney(inv.totalVat, inv.currency)}</td></tr>
      <tr><td>Do zapłaty:</td><td>${fmtMoney(inv.totalBrutto, inv.currency)}</td></tr>
    </table>
    ${inv.isMpp ? '<div class="mpp">&#9888; MECHANIZM PODZIELONEJ PŁATNOŚCI (MPP)</div>' : ''}
    <script>window.onload=()=>{window.print();}</script>
  </body></html>`);
  w.document.close();
}

export default function InvoiceList() {
  const { activeTenantId } = useTenant();
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);
  const [ksefSending, setKsefSending] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (!activeTenantId) return;
    const unsub = getInvoicesListener(activeTenantId, {}, data => {
      setInvoices(data);
      setLoading(false);
    });
    return unsub;
  }, [activeTenantId]);

  const handleEmail = async (inv: SalesInvoice) => {
    const subject = encodeURIComponent(`Faktura ${inv.number}`);
    const body = encodeURIComponent(
      `Szanowni Państwo,\n\nW załączeniu faktura VAT ${inv.number} na kwotę ${fmtMoney(inv.totalBrutto, inv.currency)}.\nTermin płatności: ${inv.dueDate}\n\nPozdrawiamy,\n${inv.seller.name}`,
    );
    const email = inv.buyer.email || inv.emailRecipient || '';
    window.open(`mailto:${email}?subject=${subject}&body=${body}`);
    if (activeTenantId && inv.id) {
      try {
        await updateInvoice(activeTenantId, inv.id, {
          emailSentAt: new Date().toISOString(),
          emailRecipient: email || inv.buyer.email,
        });
        showToast('Email otwarto w kliencie pocztowym');
      } catch { /* non-fatal */ }
    }
  };

  const handleSendKSeF = async (inv: SalesInvoice) => {
    if (!activeTenantId || !inv.id || ksefSending) return;
    setKsefSending(inv.id);
    try {
      await sendToKSeF(activeTenantId, inv.id);
      showToast(`Faktura ${inv.number} wysłana do KSeF`);
    } catch (err: any) {
      showToast(err?.message ?? 'Błąd wysyłania do KSeF', false);
    } finally {
      setKsefSending(null);
    }
  };

  return (
    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-xl font-bold text-sm flex items-center gap-2 ${toast.ok ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}
          >
            {toast.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

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
              const ksefSendable = ['issued', 'sent'].includes(inv.status) && ['not_sent', 'rejected'].includes(inv.ksefStatus ?? '');
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
                    {inv.isMpp && <div className="text-[9px] font-black text-amber-600 uppercase mt-0.5">MPP</div>}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest italic ${cfg.cls}`}>
                        {cfg.icon}{cfg.label}
                      </div>
                      {ksefOk && (
                        <div className="text-indigo-600 bg-indigo-50 p-1.5 rounded-md border border-indigo-100" title="KSeF: wysłano">
                          <ShieldCheck size={14} />
                        </div>
                      )}
                      {ksefSendable && (
                        <button
                          onClick={() => handleSendKSeF(inv)}
                          disabled={ksefSending === inv.id}
                          title="Wyślij do KSeF"
                          className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[9px] font-black uppercase transition-colors disabled:opacity-50"
                        >
                          {ksefSending === inv.id
                            ? <Loader2 size={12} className="animate-spin" />
                            : <Send size={12} />}
                          KSeF
                        </button>
                      )}
                      {inv.ksefStatus === 'sending' && (
                        <Loader2 size={14} className="animate-spin text-indigo-400" title="Wysyłanie do KSeF..." />
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => printInvoice(inv)}
                        className="text-slate-300 hover:text-indigo-600 p-2 transition-colors"
                        title="Drukuj / Pobierz PDF"
                      >
                        <Download size={18} />
                      </button>
                      <button
                        onClick={() => handleEmail(inv)}
                        className="text-slate-300 hover:text-indigo-600 p-2 transition-colors"
                        title="Wyślij E-mail"
                      >
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
