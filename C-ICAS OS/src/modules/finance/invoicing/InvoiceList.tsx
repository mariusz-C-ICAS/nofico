/**
 * Data: 2026-05-12
 * Zmiany: Lista wystawionych faktur sprzedaży.
 * Ścieżka: /src/modules/finance/invoicing/InvoiceList.tsx
 */
import React from 'react';
import { 
  FileText, Download, Send, CreditCard, 
  MoreVertical, ShieldCheck, Mail, Link2,
  CheckCircle2, Clock, AlertCircle, Bookmark
} from 'lucide-react';
import { motion } from 'motion/react';
import PaymentInitiator from '../psd2/PaymentInitiator';

interface Invoice {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  customer: string;
  amount: number;
  currency: string;
  status: 'paid' | 'unpaid' | 'overdue' | 'draft';
  ksefStatus?: 'sent' | 'pending' | 'none';
  iban?: string;
}

export default function InvoiceList() {
  const [selectedInvoice, setSelectedInvoice] = React.useState<Invoice | null>(null);
  
  const invoices: Invoice[] = [
    { id: '1', number: 'FV/2026/05/01', date: '2026-05-12', dueDate: '2026-05-19', customer: 'APPLE POLSKA SP. Z O.O.', amount: 15400.00, currency: 'PLN', status: 'unpaid', ksefStatus: 'sent', iban: 'PL 10 1020 1234 0000 9876 5432' },
    { id: '2', number: 'FV/2026/05/02', date: '2026-05-10', dueDate: '2026-05-17', customer: 'GOOGLE CLOUD POLAND', amount: 8900.50, currency: 'PLN', status: 'paid', ksefStatus: 'sent' },
    { id: '3', number: 'FV/2026/04/98', date: '2026-04-20', dueDate: '2026-04-27', customer: 'STARTUP X INC', amount: 1200.00, currency: 'EUR', status: 'overdue', ksefStatus: 'none' },
    { id: '4', number: 'FV/2026/05/03', date: '2026-05-12', dueDate: '2026-05-26', customer: 'LOKALNA FIRMA', amount: 450.00, currency: 'PLN', status: 'draft' },
  ];

  const getStatusStyle = (status: Invoice['status']) => {
    switch (status) {
      case 'paid': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'unpaid': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'overdue': return 'bg-rose-50 text-rose-600 border-rose-100';
      default: return 'bg-slate-50 text-slate-400 border-slate-100';
    }
  };

  const getStatusIcon = (status: Invoice['status']) => {
    switch (status) {
      case 'paid': return <CheckCircle2 size={12} />;
      case 'unpaid': return <Clock size={12} />;
      case 'overdue': return <AlertCircle size={12} />;
      default: return <FileText size={12} />;
    }
  };

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
             {invoices.map(inv => (
               <motion.tr 
                 key={inv.id}
                 whileHover={{ backgroundColor: 'rgba(248, 250, 252, 0.5)' }}
                 className="group transition-colors"
               >
                  <td className="px-8 py-6">
                     <div className="text-[11px] font-black text-slate-900 uppercase italic mb-1">{inv.number}</div>
                     <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">{inv.date}</span>
                        <span className="text-slate-200">|</span>
                        <span className={`text-[9px] font-black uppercase ${inv.status === 'overdue' ? 'text-rose-500' : 'text-slate-400'}`}>Termin: {inv.dueDate}</span>
                     </div>
                  </td>
                  <td className="px-8 py-6">
                     <div className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{inv.customer}</div>
                  </td>
                  <td className="px-8 py-6">
                     <div className="text-sm font-black text-slate-900 italic tracking-tighter">
                        {inv.amount.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} {inv.currency}
                     </div>
                  </td>
                  <td className="px-8 py-6">
                     <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest italic ${getStatusStyle(inv.status)}`}>
                           {getStatusIcon(inv.status)}
                           {inv.status === 'paid' ? 'Opłacona' : inv.status === 'unpaid' ? 'Oczekuje' : inv.status === 'overdue' ? 'Po Terminie' : 'Szkic'}
                        </div>
                        {inv.ksefStatus === 'sent' && (
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
                          className="text-slate-300 hover:text-indigo-600 p-2 transition-colors" title="Zapłać przez bank (PSD2)"
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
             ))}
          </tbody>
       </table>

       {selectedInvoice && (
         <PaymentInitiator 
           invoice={{
              id: selectedInvoice.id,
              number: selectedInvoice.number,
              amount: selectedInvoice.amount,
              counterpart: selectedInvoice.customer,
              iban: selectedInvoice.iban || 'PL 12 3456 7890 0000 0000 0000 0000'
           }}
           onClose={() => setSelectedInvoice(null)} 
         />
       )}
    </div>
  );
}
