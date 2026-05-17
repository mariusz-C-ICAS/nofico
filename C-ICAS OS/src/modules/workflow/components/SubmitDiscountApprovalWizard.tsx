import React, { useState } from 'react';
import { ArrowLeft, Check, AlertTriangle, Tag } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { useCompany } from '../../../core/auth/CompanyContext';
import { createDocumentInstance, transitionDocument } from '../services/workflowEngine';

interface Props { onComplete: (docId: string) => void; onCancel: () => void; }

const INPUT = 'w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none transition-all';
const CURRENCIES = ['PLN', 'EUR', 'USD'];

export default function SubmitDiscountApprovalWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [customer, setCustomer] = useState('');
  const [discountPct, setDiscountPct] = useState('');
  const [originalAmount, setOriginalAmount] = useState('');
  const [currency, setCurrency] = useState('PLN');
  const [justification, setJustification] = useState('');
  const [salesRep, setSalesRep] = useState('');
  const [quoteRef, setQuoteRef] = useState('');

  const discountNum = Number(discountPct);
  const requiresCfo = discountNum > 30;
  const discountedAmount = originalAmount ? Number(originalAmount) * (1 - discountNum / 100) : 0;
  const isValid = customer.trim().length > 1 && discountNum > 0 && justification.trim().length > 5;

  const handleSubmit = async () => {
    if (!user || !activeTenantId || !isValid) return;
    setLoading(true); setError('');
    try {
      const docId = await createDocumentInstance(
        activeTenantId, user.uid, user.email ?? '',
        'DISCOUNT_APPROVAL', 'default-discount-approval',
        {
          title: `Rabat ${discountPct}% – ${customer}${quoteRef ? ` / ${quoteRef}` : ''}`,
          amount: Number(originalAmount) || undefined, currency, vendor: customer,
          invoiceDate: new Date().toISOString().split('T')[0],
          description: `Klient: ${customer}\nHandlowiec: ${salesRep}\nRef. oferty: ${quoteRef}\nRabat: ${discountPct}%${requiresCfo ? ' ⚠️ WYMAGA CFO' : ''}\nWartość oryginalna: ${originalAmount} ${currency}\nWartość po rabacie: ${discountedAmount.toFixed(2)} ${currency}\n\nUzasadnienie:\n${justification}`,
        },
        [], currentCompany?.id
      );
      await transitionDocument(activeTenantId, docId, 'SUBMIT', user.uid, user.email ?? '', 'PENDING_APPROVAL', {
        stepDefId: 'step-submit', stepType: 'APPROVAL',
        note: `Rabat ${discountPct}% dla ${customer}${requiresCfo ? ' — wymagana akceptacja CFO (>30%).' : '.'}`,
      });
      onComplete(docId);
    } catch (e: any) { setError(e.message ?? 'Błąd podczas wysyłania.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center"><Tag size={18} className="text-amber-600" /></div>
        <div>
          <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">DISCOUNT APPROVAL</span>
          <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 leading-none">Zatwierdzenie Rabatu</h3>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Klient *"><input value={customer} onChange={e => setCustomer(e.target.value)} placeholder="Nazwa klienta" className={INPUT} /></Field>
          <Field label="Handlowiec"><input value={salesRep} onChange={e => setSalesRep(e.target.value)} placeholder="Imię Nazwisko" className={INPUT} /></Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Wartość oryginalna">
            <input type="number" min="0" step="0.01" value={originalAmount} onChange={e => setOriginalAmount(e.target.value)} placeholder="0.00" className={INPUT} />
          </Field>
          <Field label="Waluta">
            <select value={currency} onChange={e => setCurrency(e.target.value)} className={INPUT}>
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Rabat % *">
            <input type="number" min="0.1" max="100" step="0.5" value={discountPct} onChange={e => setDiscountPct(e.target.value)} placeholder="0" className={INPUT} />
          </Field>
        </div>

        {discountNum > 0 && originalAmount && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 flex items-center justify-between">
            <span className="text-[10px] font-black text-amber-700 uppercase">Wartość po rabacie</span>
            <span className="text-lg font-black text-amber-700">{discountedAmount.toFixed(2)} {currency}</span>
          </div>
        )}

        {requiresCfo && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-600 shrink-0" />
            <p className="text-[10px] font-black text-red-700 uppercase">Rabat powyżej 30% — wymagana akceptacja CFO.</p>
          </div>
        )}

        <Field label="Ref. oferty"><input value={quoteRef} onChange={e => setQuoteRef(e.target.value)} placeholder="OF/2026/05/001" className={INPUT} /></Field>
        <Field label="Uzasadnienie * (min. 5 znaków)"><textarea value={justification} onChange={e => setJustification(e.target.value)} rows={3} placeholder="Powód przyznania rabatu — strategiczny klient, utrata kontraktu, intensywna konkurencja..." className={INPUT + ' resize-none'} /></Field>
      </div>

      {error && <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-2xl px-4 py-3 text-xs font-bold"><AlertTriangle size={13} />{error}</div>}

      <div className="flex gap-3">
        <button onClick={onCancel} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 text-slate-600 text-xs font-black uppercase hover:bg-slate-200 transition-all"><ArrowLeft size={13} />Anuluj</button>
        <button onClick={handleSubmit} disabled={loading || !isValid} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-amber-600 text-white text-xs font-black uppercase hover:bg-amber-700 disabled:opacity-40 transition-all">
          {loading ? 'Wysyłanie...' : <><Check size={13} />Wyślij do zatwierdzenia</>}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex-1"><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>{children}</div>;
}
