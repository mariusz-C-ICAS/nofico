import React, { useState } from 'react';
import { ArrowLeft, Check, AlertTriangle, FileText } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { useCompany } from '../../../core/auth/CompanyContext';
import { createDocumentInstance, transitionDocument } from '../services/workflowEngine';

interface Props { onComplete: (docId: string) => void; onCancel: () => void; }

const INPUT = 'w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-slate-400 focus:border-transparent outline-none transition-all';
const CURRENCIES = ['PLN', 'EUR', 'USD'];

export default function SubmitWriteOffWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [debtor, setDebtor] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('PLN');
  const [documentRef, setDocumentRef] = useState('');
  const [reason, setReason] = useState('');
  const [ageMonths, setAgeMonths] = useState('');

  const isValid = debtor.trim().length > 1 && Number(amount) > 0 && reason.trim().length > 5;

  const handleSubmit = async () => {
    if (!user || !activeTenantId || !isValid) return;
    setLoading(true); setError('');
    try {
      const docId = await createDocumentInstance(
        activeTenantId, user.uid, user.email ?? '',
        'WRITE_OFF', 'default-write-off',
        {
          title: `Odpis: ${debtor} – ${Number(amount).toFixed(2)} ${currency}`,
          amount: Number(amount), currency, vendor: debtor,
          invoiceDate: new Date().toISOString().split('T')[0],
          description: `Dłużnik: ${debtor}\nKwota do odpisania: ${amount} ${currency}\nRef. dokumentu: ${documentRef}\nWiek należności: ${ageMonths} mies.\n\nUzasadnienie odpisania:\n${reason}`,
        },
        [], currentCompany?.id
      );
      await transitionDocument(activeTenantId, docId, 'SUBMIT', user.uid, user.email ?? '', 'PENDING_APPROVAL', {
        stepDefId: 'step-submit', stepType: 'APPROVAL', note: 'Wniosek o odpis należności przesłany do zatwierdzenia przez zarząd.',
      });
      onComplete(docId);
    } catch (e: any) { setError(e.message ?? 'Błąd podczas wysyłania.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center"><FileText size={18} className="text-slate-600" /></div>
        <div>
          <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">WRITE-OFF / ODPIS</span>
          <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 leading-none">Odpis Należności</h3>
        </div>
      </div>

      <div className="space-y-4">
        <Field label="Dłużnik *"><input value={debtor} onChange={e => setDebtor(e.target.value)} placeholder="Nazwa firmy / osoby" className={INPUT} /></Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Ref. dokumentu (FV/PO)"><input value={documentRef} onChange={e => setDocumentRef(e.target.value)} placeholder="FV/2025/001" className={INPUT} /></Field>
          <Field label="Wiek należności (mies.)"><input type="number" min="0" value={ageMonths} onChange={e => setAgeMonths(e.target.value)} className={INPUT} /></Field>
        </div>

        <div className="flex items-center gap-3">
          <Field label="Kwota do odpisania *">
            <input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className={INPUT} />
          </Field>
          <Field label="Waluta">
            <select value={currency} onChange={e => setCurrency(e.target.value)} className={INPUT}>
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Uzasadnienie odpisania * (min. 5 znaków)">
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={4} placeholder="Należność nieściągalna z uwagi na... (upadłość, przedawnienie, brak majątku)" className={INPUT + ' resize-none'} />
        </Field>
      </div>

      {error && <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-2xl px-4 py-3 text-xs font-bold"><AlertTriangle size={13} />{error}</div>}

      <div className="flex gap-3">
        <button onClick={onCancel} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 text-slate-600 text-xs font-black uppercase hover:bg-slate-200 transition-all"><ArrowLeft size={13} />Anuluj</button>
        <button onClick={handleSubmit} disabled={loading || !isValid} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-slate-900 text-white text-xs font-black uppercase hover:bg-slate-700 disabled:opacity-40 transition-all">
          {loading ? 'Wysyłanie...' : <><Check size={13} />Wyślij do zarządu</>}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex-1"><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>{children}</div>;
}
