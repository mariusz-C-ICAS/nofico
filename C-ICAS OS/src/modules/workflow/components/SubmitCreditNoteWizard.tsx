import React, { useState } from 'react';
import { ArrowLeft, Check, AlertTriangle, FileMinus } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { useCompany } from '../../../core/auth/CompanyContext';
import { createDocumentInstance, transitionDocument } from '../services/workflowEngine';

interface Props { onComplete: (docId: string) => void; onCancel: () => void; }

const INPUT = 'w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-rose-400 focus:border-transparent outline-none transition-all';
const CURRENCIES = ['PLN', 'EUR', 'USD'];
const REASONS = ['Błędna kwota', 'Zwrot towaru', 'Rabat posprzedażowy', 'Błędne dane na fakturze', 'Duplikat faktury', 'Inne'];

export default function SubmitCreditNoteWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [origInvoiceNo, setOrigInvoiceNo] = useState('');
  const [origDate, setOrigDate] = useState('');
  const [buyerNip, setBuyerNip] = useState('');
  const [reason, setReason] = useState(REASONS[0]);
  const [netAmount, setNetAmount] = useState('');
  const [grossAmount, setGrossAmount] = useState('');
  const [currency, setCurrency] = useState('PLN');
  const [notes, setNotes] = useState('');

  const isValid = origInvoiceNo.trim().length > 0 && grossAmount !== '';

  const handleSubmit = async () => {
    if (!user || !activeTenantId || !isValid) return;
    setLoading(true); setError('');
    try {
      const docId = await createDocumentInstance(
        activeTenantId, user.uid, user.email ?? '',
        'CREDIT_NOTE', 'default-credit-note',
        {
          title: `Korekta do FV/${origInvoiceNo}`,
          amount: parseFloat(grossAmount) || 0,
          currency,
          vendor: buyerNip,
          invoiceDate: origDate || new Date().toISOString().split('T')[0],
          description: `Powód korekty: ${reason}\nFaktura oryginalna: ${origInvoiceNo} z dn. ${origDate}\nKwota netto: ${netAmount} ${currency}\nKwota brutto: ${grossAmount} ${currency}\nUwagi: ${notes}`,
        },
        [], currentCompany?.id
      );
      await transitionDocument(activeTenantId, docId, 'SUBMIT', user.uid, user.email ?? '', 'SUBMITTED', {
        stepDefId: 'step-submit', stepType: 'APPROVAL', note: 'Faktura korygująca wysłana do weryfikacji KSeF.',
      });
      onComplete(docId);
    } catch (e: any) { setError(e.message ?? 'Błąd podczas wysyłania.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-rose-50 rounded-2xl flex items-center justify-center"><FileMinus size={18} className="text-rose-600" /></div>
        <div>
          <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest">CREDIT NOTE</span>
          <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 leading-none">Faktura Korygująca VAT</h3>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nr faktury oryginalnej *"><input value={origInvoiceNo} onChange={e => setOrigInvoiceNo(e.target.value)} placeholder="FV/2026/05/001" className={INPUT} /></Field>
          <Field label="Data faktury oryginalnej"><input type="date" value={origDate} onChange={e => setOrigDate(e.target.value)} className={INPUT} /></Field>
        </div>

        <Field label="NIP nabywcy (opcjonalnie)"><input value={buyerNip} onChange={e => setBuyerNip(e.target.value)} placeholder="0000000000" className={INPUT} /></Field>

        <Field label="Powód korekty">
          <select value={reason} onChange={e => setReason(e.target.value)} className={INPUT}>
            {REASONS.map(r => <option key={r}>{r}</option>)}
          </select>
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Kwota netto"><input type="number" step="0.01" min="0" value={netAmount} onChange={e => setNetAmount(e.target.value)} placeholder="0.00" className={INPUT} /></Field>
          <Field label="Kwota brutto *"><input type="number" step="0.01" min="0" value={grossAmount} onChange={e => setGrossAmount(e.target.value)} placeholder="0.00" className={INPUT} /></Field>
          <Field label="Waluta">
            <select value={currency} onChange={e => setCurrency(e.target.value)} className={INPUT}>
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Opis korekty"><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Szczegółowe uzasadnienie korekty..." className={INPUT + ' resize-none'} /></Field>
      </div>

      {error && <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-2xl px-4 py-3 text-xs font-bold"><AlertTriangle size={13} />{error}</div>}

      <div className="flex gap-3">
        <button onClick={onCancel} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 text-slate-600 text-xs font-black uppercase hover:bg-slate-200 transition-all"><ArrowLeft size={13} />Anuluj</button>
        <button onClick={handleSubmit} disabled={loading || !isValid} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-rose-600 text-white text-xs font-black uppercase hover:bg-rose-700 disabled:opacity-40 transition-all">
          {loading ? 'Wysyłanie...' : <><Check size={13} />Wyślij do weryfikacji KSeF</>}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>{children}</div>;
}
