import React, { useState } from 'react';
import { ArrowLeft, Check, AlertTriangle, FileCheck } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { useCompany } from '../../../core/auth/CompanyContext';
import { createDocumentInstance, transitionDocument } from '../services/workflowEngine';

interface Props { onComplete: (docId: string) => void; onCancel: () => void; }

const INPUT = 'w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-green-400 focus:border-transparent outline-none transition-all';
const CURRENCIES = ['PLN', 'EUR', 'USD'];

export default function SubmitQuoteApprovalWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [customer, setCustomer] = useState('');
  const [quoteNumber, setQuoteNumber] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [currency, setCurrency] = useState('PLN');
  const [discountPct, setDiscountPct] = useState('0');
  const [validityDate, setValidityDate] = useState('');
  const [scope, setScope] = useState('');
  const [notes, setNotes] = useState('');

  const discountNum = Number(discountPct);
  const requiresBoardApproval = discountNum > 20;
  const isValid = customer.trim().length > 1 && Number(totalAmount) > 0 && validityDate.length > 0;

  const handleSubmit = async () => {
    if (!user || !activeTenantId || !isValid) return;
    setLoading(true); setError('');
    try {
      const docId = await createDocumentInstance(
        activeTenantId, user.uid, user.email ?? '',
        'QUOTE_APPROVAL', 'default-quote-approval',
        {
          title: `Oferta: ${customer}${quoteNumber ? ` / ${quoteNumber}` : ''} — ${Number(totalAmount).toFixed(2)} ${currency}`,
          amount: Number(totalAmount), currency, vendor: customer,
          invoiceDate: new Date().toISOString().split('T')[0],
          description: `Klient: ${customer}\nNr oferty: ${quoteNumber}\nWartość: ${totalAmount} ${currency}\nRabat: ${discountPct}%${requiresBoardApproval ? ' ⚠️ WYMAGA AKCEPTACJI ZARZĄDU' : ''}\nWażna do: ${validityDate}\n\nZakres oferty:\n${scope}\n\nUwagi: ${notes}`,
        },
        [], currentCompany?.id
      );
      await transitionDocument(activeTenantId, docId, 'SUBMIT', user.uid, user.email ?? '', 'PENDING_APPROVAL', {
        stepDefId: 'step-submit', stepType: 'APPROVAL',
        note: `Oferta dla ${customer} — ${totalAmount} ${currency}${requiresBoardApproval ? '. UWAGA: rabat >20%, wymagana akceptacja zarządu.' : ''}`,
      });
      onComplete(docId);
    } catch (e: any) { setError(e.message ?? 'Błąd podczas wysyłania.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-green-50 rounded-2xl flex items-center justify-center"><FileCheck size={18} className="text-green-600" /></div>
        <div>
          <span className="text-[9px] font-black text-green-600 uppercase tracking-widest">QUOTE APPROVAL</span>
          <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 leading-none">Zatwierdzenie Oferty</h3>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Klient *"><input value={customer} onChange={e => setCustomer(e.target.value)} placeholder="Nazwa klienta" className={INPUT} /></Field>
          <Field label="Nr oferty"><input value={quoteNumber} onChange={e => setQuoteNumber(e.target.value)} placeholder="OF/2026/05/001" className={INPUT} /></Field>
        </div>

        <div className="flex gap-3">
          <Field label="Wartość oferty *">
            <input type="number" min="0" step="0.01" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} placeholder="0.00" className={INPUT} />
          </Field>
          <Field label="Waluta">
            <select value={currency} onChange={e => setCurrency(e.target.value)} className={INPUT}>
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Rabat %">
            <input type="number" min="0" max="100" step="0.5" value={discountPct} onChange={e => setDiscountPct(e.target.value)} className={INPUT} />
          </Field>
        </div>

        {requiresBoardApproval && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-600 shrink-0" />
            <p className="text-[10px] font-black text-amber-700 uppercase">Rabat powyżej 20% — wymagana dodatkowa akceptacja zarządu.</p>
          </div>
        )}

        <Field label="Oferta ważna do *"><input type="date" value={validityDate} onChange={e => setValidityDate(e.target.value)} className={INPUT} /></Field>
        <Field label="Zakres oferty"><textarea value={scope} onChange={e => setScope(e.target.value)} rows={3} placeholder="Produkty/usługi, warunki, termin realizacji..." className={INPUT + ' resize-none'} /></Field>
        <Field label="Uwagi"><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Warunki specjalne, negocjacje..." className={INPUT + ' resize-none'} /></Field>
      </div>

      {error && <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-2xl px-4 py-3 text-xs font-bold"><AlertTriangle size={13} />{error}</div>}

      <div className="flex gap-3">
        <button onClick={onCancel} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 text-slate-600 text-xs font-black uppercase hover:bg-slate-200 transition-all"><ArrowLeft size={13} />Anuluj</button>
        <button onClick={handleSubmit} disabled={loading || !isValid} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-green-600 text-white text-xs font-black uppercase hover:bg-green-700 disabled:opacity-40 transition-all">
          {loading ? 'Wysyłanie...' : <><Check size={13} />Wyślij ofertę do zatwierdzenia</>}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex-1"><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>{children}</div>;
}
