import React, { useState } from 'react';
import { ArrowLeft, Check, AlertTriangle, Receipt } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { useCompany } from '../../../core/auth/CompanyContext';
import { createDocumentInstance, transitionDocument } from '../services/workflowEngine';

interface Props { onComplete: (docId: string) => void; onCancel: () => void; }

const INPUT = 'w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none transition-all';
const TAX_TYPES = ['JPK_V7M', 'JPK_V7K', 'CIT-8', 'PIT-11', 'PIT-4R', 'VAT-7', 'VAT-UE', 'CIT/BR', 'ORD-IN'];

export default function SubmitTaxDocumentWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [taxType, setTaxType] = useState(TAX_TYPES[0]);
  const [period, setPeriod] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  const isValid = period.trim().length > 0 && dueDate.length > 0;

  const handleSubmit = async () => {
    if (!user || !activeTenantId || !isValid) return;
    setLoading(true); setError('');
    try {
      const docId = await createDocumentInstance(
        activeTenantId, user.uid, user.email ?? '',
        'TAX_DOCUMENT', 'default-tax-document',
        {
          title: `${taxType} – ${period}`,
          amount: amount ? Number(amount) : undefined,
          invoiceDate: new Date().toISOString().split('T')[0],
          description: `Typ deklaracji: ${taxType}\nOkres rozliczeniowy: ${period}\nKwota zobowiązania: ${amount || 'n/d'} PLN\nTermin złożenia: ${dueDate}\n\nUwagi: ${notes}`,
        },
        [], currentCompany?.id
      );
      await transitionDocument(activeTenantId, docId, 'SUBMIT', user.uid, user.email ?? '', 'PENDING_APPROVAL', {
        stepDefId: 'step-submit', stepType: 'APPROVAL', note: `Deklaracja ${taxType} za ${period} przekazana do weryfikacji księgowości.`,
      });
      onComplete(docId);
    } catch (e: any) { setError(e.message ?? 'Błąd podczas wysyłania.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center"><Receipt size={18} className="text-indigo-600" /></div>
        <div>
          <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">TAX DOCUMENT</span>
          <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 leading-none">Dokument Podatkowy</h3>
        </div>
      </div>

      <div className="space-y-4">
        <Field label="Typ deklaracji *">
          <select value={taxType} onChange={e => setTaxType(e.target.value)} className={INPUT}>
            {TAX_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Okres rozliczeniowy *"><input value={period} onChange={e => setPeriod(e.target.value)} placeholder="np. 2026-04, Q1/2026" className={INPUT} /></Field>
          <Field label="Termin złożenia *"><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={INPUT} /></Field>
        </div>

        <Field label="Kwota zobowiązania (PLN)"><input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className={INPUT} /></Field>
        <Field label="Uwagi"><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Korekta, zaliczka, inne uwagi..." className={INPUT + ' resize-none'} /></Field>
      </div>

      {error && <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-2xl px-4 py-3 text-xs font-bold"><AlertTriangle size={13} />{error}</div>}

      <div className="flex gap-3">
        <button onClick={onCancel} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 text-slate-600 text-xs font-black uppercase hover:bg-slate-200 transition-all"><ArrowLeft size={13} />Anuluj</button>
        <button onClick={handleSubmit} disabled={loading || !isValid} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-600 text-white text-xs font-black uppercase hover:bg-indigo-700 disabled:opacity-40 transition-all">
          {loading ? 'Wysyłanie...' : <><Check size={13} />Wyślij do weryfikacji</>}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>{children}</div>;
}
