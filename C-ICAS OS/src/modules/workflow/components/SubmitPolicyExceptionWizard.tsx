import React, { useState } from 'react';
import { ArrowLeft, Check, AlertTriangle, CircleSlash } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { useCompany } from '../../../core/auth/CompanyContext';
import { createDocumentInstance, transitionDocument } from '../services/workflowEngine';

interface Props { onComplete: (docId: string) => void; onCancel: () => void; }

const INPUT = 'w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none transition-all';
const RISK_LEVELS = ['Niskie', 'Umiarkowane', 'Wysokie', 'Krytyczne'];

export default function SubmitPolicyExceptionWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [policyName, setPolicyName] = useState('');
  const [exceptionTitle, setExceptionTitle] = useState('');
  const [description, setDescription] = useState('');
  const [justification, setJustification] = useState('');
  const [riskLevel, setRiskLevel] = useState('Umiarkowane');
  const [durationDays, setDurationDays] = useState('30');
  const [mitigationPlan, setMitigationPlan] = useState('');

  const isValid = policyName.trim().length > 2 && exceptionTitle.trim().length > 2 && justification.trim().length > 10;

  const handleSubmit = async () => {
    if (!user || !activeTenantId || !isValid) return;
    setLoading(true); setError('');
    try {
      const docId = await createDocumentInstance(
        activeTenantId, user.uid, user.email ?? '',
        'POLICY_EXCEPTION', 'default-policy-exception',
        {
          title: `Wyjątek: ${exceptionTitle} — ${policyName}`,
          invoiceDate: new Date().toISOString().split('T')[0],
          description: `Polityka: ${policyName}\nWyjątek: ${exceptionTitle}\nPoziom ryzyka: ${riskLevel}\nCzas trwania: ${durationDays} dni\n\nOpis:\n${description}\n\nUzasadnienie:\n${justification}\n\nPlan mitygacji:\n${mitigationPlan}`,
        },
        [], currentCompany?.id
      );
      await transitionDocument(activeTenantId, docId, 'SUBMIT', user.uid, user.email ?? '', 'PENDING_APPROVAL', {
        stepDefId: 'step-submit', stepType: 'APPROVAL', note: `Wniosek o wyjątek od polityki "${policyName}" — ryzyko: ${riskLevel}.`,
      });
      onComplete(docId);
    } catch (e: any) { setError(e.message ?? 'Błąd podczas wysyłania.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-orange-50 rounded-2xl flex items-center justify-center"><CircleSlash size={18} className="text-orange-600" /></div>
        <div>
          <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest">POLICY EXCEPTION</span>
          <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 leading-none">Wyjątek od Polityki</h3>
        </div>
      </div>

      <div className="space-y-4">
        <Field label="Nazwa polityki *"><input value={policyName} onChange={e => setPolicyName(e.target.value)} placeholder="np. Polityka zakupów, IT Security Policy" className={INPUT} /></Field>
        <Field label="Tytuł wyjątku *"><input value={exceptionTitle} onChange={e => setExceptionTitle(e.target.value)} placeholder="Krótki opis wyjątku" className={INPUT} /></Field>
        <Field label="Opis sytuacji"><textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Co i dlaczego wymaga odejścia od standardowej polityki..." className={INPUT + ' resize-none'} /></Field>
        <Field label="Uzasadnienie biznesowe * (min. 10 znaków)"><textarea value={justification} onChange={e => setJustification(e.target.value)} rows={3} placeholder="Dlaczego wyjątek jest konieczny..." className={INPUT + ' resize-none'} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Poziom ryzyka">
            <select value={riskLevel} onChange={e => setRiskLevel(e.target.value)} className={INPUT}>
              {RISK_LEVELS.map(r => <option key={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Czas trwania (dni)"><input type="number" min="1" value={durationDays} onChange={e => setDurationDays(e.target.value)} className={INPUT} /></Field>
        </div>
        <Field label="Plan mitygacji ryzyka"><textarea value={mitigationPlan} onChange={e => setMitigationPlan(e.target.value)} rows={2} placeholder="Jakie kontrole zastępcze zostaną wdrożone..." className={INPUT + ' resize-none'} /></Field>
      </div>

      {error && <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-2xl px-4 py-3 text-xs font-bold"><AlertTriangle size={13} />{error}</div>}

      <div className="flex gap-3">
        <button onClick={onCancel} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 text-slate-600 text-xs font-black uppercase hover:bg-slate-200 transition-all"><ArrowLeft size={13} />Anuluj</button>
        <button onClick={handleSubmit} disabled={loading || !isValid} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-orange-600 text-white text-xs font-black uppercase hover:bg-orange-700 disabled:opacity-40 transition-all">
          {loading ? 'Wysyłanie...' : <><Check size={13} />Wyślij do zatwierdzenia</>}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>{children}</div>;
}
