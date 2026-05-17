import React, { useState } from 'react';
import { ArrowLeft, Check, AlertTriangle, PiggyBank } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { useCompany } from '../../../core/auth/CompanyContext';
import { createDocumentInstance, transitionDocument } from '../services/workflowEngine';

interface Props { onComplete: (docId: string) => void; onCancel: () => void; }

const INPUT = 'w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-emerald-400 focus:border-transparent outline-none transition-all';
const CURRENCIES = ['PLN', 'EUR', 'USD'];
const CATEGORIES = ['IT / Oprogramowanie', 'Marketing', 'Podróże i delegacje', 'Szkolenia', 'Sprzęt i wyposażenie', 'Usługi zewnętrzne', 'Zatrudnienie', 'Inne'];
const PRIORITIES = [{ val: 'critical', label: 'Krytyczny' }, { val: 'high', label: 'Wysoki' }, { val: 'medium', label: 'Średni' }, { val: 'low', label: 'Niski' }];

export default function SubmitBudgetRequestWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [costCenter, setCostCenter] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('PLN');
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [priority, setPriority] = useState('medium');
  const [justification, setJustification] = useState('');
  const [alternatives, setAlternatives] = useState('');

  const isValid = costCenter.trim().length > 0 && amount !== '' && justification.trim().length > 10;

  const handleSubmit = async () => {
    if (!user || !activeTenantId || !isValid) return;
    setLoading(true); setError('');
    try {
      const docId = await createDocumentInstance(
        activeTenantId, user.uid, user.email ?? '',
        'BUDGET_REQUEST', 'default-budget-request',
        {
          title: `Budżet: ${category} – ${costCenter}`,
          amount: parseFloat(amount) || 0,
          currency,
          costCenter,
          invoiceDate: periodFrom || new Date().toISOString().split('T')[0],
          description: `Kategoria: ${category}\nPriorytet: ${priority}\nOkres: ${periodFrom} – ${periodTo}\nUzasadnienie: ${justification}\nAlternatywy: ${alternatives}`,
        },
        [], currentCompany?.id
      );
      await transitionDocument(activeTenantId, docId, 'SUBMIT', user.uid, user.email ?? '', 'SUBMITTED', {
        stepDefId: 'step-submit', stepType: 'APPROVAL', note: 'Wniosek budżetowy wysłany do managera i CFO.',
      });
      onComplete(docId);
    } catch (e: any) { setError(e.message ?? 'Błąd podczas wysyłania.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center"><PiggyBank size={18} className="text-emerald-600" /></div>
        <div>
          <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">BUDGET REQUEST</span>
          <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 leading-none">Wniosek Budżetowy</h3>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Centrum kosztów *"><input value={costCenter} onChange={e => setCostCenter(e.target.value)} placeholder="np. DZIAŁ-IT / 401-01" className={INPUT} /></Field>
          <Field label="Kategoria wydatku">
            <select value={category} onChange={e => setCategory(e.target.value)} className={INPUT}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Kwota *" className="col-span-2"><input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className={INPUT} /></Field>
          <Field label="Waluta">
            <select value={currency} onChange={e => setCurrency(e.target.value)} className={INPUT}>
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Okres od"><input type="date" value={periodFrom} onChange={e => setPeriodFrom(e.target.value)} className={INPUT} /></Field>
          <Field label="Okres do"><input type="date" value={periodTo} onChange={e => setPeriodTo(e.target.value)} className={INPUT} /></Field>
        </div>

        <Field label="Priorytet">
          <div className="flex gap-2">
            {PRIORITIES.map(p => (
              <button key={p.val} type="button" onClick={() => setPriority(p.val)}
                className={`flex-1 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border ${priority === p.val ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-emerald-300'}`}>
                {p.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Uzasadnienie * (min. 10 znaków)"><textarea value={justification} onChange={e => setJustification(e.target.value)} rows={3} placeholder="Szczegółowe uzasadnienie biznesowe..." className={INPUT + ' resize-none'} /></Field>
        <Field label="Alternatywy / inne opcje"><textarea value={alternatives} onChange={e => setAlternatives(e.target.value)} rows={2} placeholder="Rozważane alternatywne rozwiązania..." className={INPUT + ' resize-none'} /></Field>
      </div>

      {error && <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-2xl px-4 py-3 text-xs font-bold"><AlertTriangle size={13} />{error}</div>}

      <div className="flex gap-3">
        <button onClick={onCancel} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 text-slate-600 text-xs font-black uppercase hover:bg-slate-200 transition-all"><ArrowLeft size={13} />Anuluj</button>
        <button onClick={handleSubmit} disabled={loading || !isValid} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-600 text-white text-xs font-black uppercase hover:bg-emerald-700 disabled:opacity-40 transition-all">
          {loading ? 'Wysyłanie...' : <><Check size={13} />Wyślij do managera i CFO</>}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={className}><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>{children}</div>;
}
