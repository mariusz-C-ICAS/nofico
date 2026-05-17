import React, { useState } from 'react';
import { ArrowLeft, Check, AlertTriangle, GitPullRequest } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { useCompany } from '../../../core/auth/CompanyContext';
import { createDocumentInstance, transitionDocument } from '../services/workflowEngine';

interface Props { onComplete: (docId: string) => void; onCancel: () => void; }

const INPUT = 'w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-violet-400 focus:border-transparent outline-none transition-all';
const CHANGE_TYPES = ['Zakres (Scope)', 'Harmonogram (Schedule)', 'Budżet (Budget)', 'Zasoby (Resources)', 'Wymagania techniczne', 'Wiele obszarów'];
const CURRENCIES = ['PLN', 'EUR', 'USD'];

export default function SubmitChangeRequestWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [projectName, setProjectName] = useState('');
  const [changeType, setChangeType] = useState(CHANGE_TYPES[0]);
  const [changeTitle, setChangeTitle] = useState('');
  const [description, setDescription] = useState('');
  const [impactAnalysis, setImpactAnalysis] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [currency, setCurrency] = useState('PLN');
  const [scheduleImpactDays, setScheduleImpactDays] = useState('');

  const isValid = projectName.trim().length > 1 && changeTitle.trim().length > 3 && description.trim().length > 10 && impactAnalysis.trim().length > 5;

  const handleSubmit = async () => {
    if (!user || !activeTenantId || !isValid) return;
    setLoading(true); setError('');
    try {
      const docId = await createDocumentInstance(
        activeTenantId, user.uid, user.email ?? '',
        'CHANGE_REQUEST', 'default-change-request',
        {
          title: `CR: ${changeTitle} — ${projectName}`,
          amount: estimatedCost ? Number(estimatedCost) : undefined,
          currency, vendor: projectName,
          invoiceDate: new Date().toISOString().split('T')[0],
          description: `Projekt: ${projectName}\nTyp zmiany: ${changeType}\nTytuł: ${changeTitle}\nSzacowany koszt zmiany: ${estimatedCost || 'n/d'} ${currency}\nWpływ na harmonogram: +${scheduleImpactDays || '0'} dni\n\nOpis zmiany:\n${description}\n\nAnaliza wpływu:\n${impactAnalysis}`,
        },
        [], currentCompany?.id
      );
      await transitionDocument(activeTenantId, docId, 'SUBMIT', user.uid, user.email ?? '', 'PENDING_APPROVAL', {
        stepDefId: 'step-submit', stepType: 'APPROVAL', note: `Wniosek o zmianę [${changeType}] w projekcie ${projectName} — do akceptacji sponsora.`,
      });
      onComplete(docId);
    } catch (e: any) { setError(e.message ?? 'Błąd podczas wysyłania.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-violet-50 rounded-2xl flex items-center justify-center"><GitPullRequest size={18} className="text-violet-600" /></div>
        <div>
          <span className="text-[9px] font-black text-violet-600 uppercase tracking-widest">CHANGE REQUEST</span>
          <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 leading-none">Wniosek o Zmianę</h3>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Projekt *"><input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="Nazwa projektu" className={INPUT} /></Field>
          <Field label="Obszar zmiany *">
            <select value={changeType} onChange={e => setChangeType(e.target.value)} className={INPUT}>
              {CHANGE_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Tytuł zmiany * (min. 3 znaki)"><input value={changeTitle} onChange={e => setChangeTitle(e.target.value)} placeholder="Krótki opis zmiany" className={INPUT} /></Field>
        <Field label="Opis zmiany * (min. 10 znaków)"><textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Co się zmienia, dlaczego, jakie są alternatywy..." className={INPUT + ' resize-none'} /></Field>
        <Field label="Analiza wpływu * (min. 5 znaków)"><textarea value={impactAnalysis} onChange={e => setImpactAnalysis(e.target.value)} rows={3} placeholder="Wpływ na budżet, harmonogram, jakość, ryzyko, interesariuszy..." className={INPUT + ' resize-none'} /></Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Szacowany koszt">
            <input type="number" min="0" step="100" value={estimatedCost} onChange={e => setEstimatedCost(e.target.value)} placeholder="0" className={INPUT} />
          </Field>
          <Field label="Waluta">
            <select value={currency} onChange={e => setCurrency(e.target.value)} className={INPUT}>
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Opóźnienie (dni)">
            <input type="number" min="0" value={scheduleImpactDays} onChange={e => setScheduleImpactDays(e.target.value)} placeholder="0" className={INPUT} />
          </Field>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-2xl px-4 py-3 text-xs font-bold"><AlertTriangle size={13} />{error}</div>}

      <div className="flex gap-3">
        <button onClick={onCancel} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 text-slate-600 text-xs font-black uppercase hover:bg-slate-200 transition-all"><ArrowLeft size={13} />Anuluj</button>
        <button onClick={handleSubmit} disabled={loading || !isValid} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-violet-600 text-white text-xs font-black uppercase hover:bg-violet-700 disabled:opacity-40 transition-all">
          {loading ? 'Wysyłanie...' : <><Check size={13} />Wyślij do sponsora projektu</>}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex-1"><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>{children}</div>;
}
