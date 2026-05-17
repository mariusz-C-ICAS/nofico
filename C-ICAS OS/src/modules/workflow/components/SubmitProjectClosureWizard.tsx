import React, { useState } from 'react';
import { ArrowLeft, Check, AlertTriangle, FolderCheck } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { useCompany } from '../../../core/auth/CompanyContext';
import { createDocumentInstance, transitionDocument } from '../services/workflowEngine';

interface Props { onComplete: (docId: string) => void; onCancel: () => void; }

const INPUT = 'w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-emerald-400 focus:border-transparent outline-none transition-all';
const CURRENCIES = ['PLN', 'EUR', 'USD'];

export default function SubmitProjectClosureWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [projectName, setProjectName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [budgetPlanned, setBudgetPlanned] = useState('');
  const [budgetActual, setBudgetActual] = useState('');
  const [currency, setCurrency] = useState('PLN');
  const [deliverables, setDeliverables] = useState('');
  const [lessonsLearned, setLessonsLearned] = useState('');
  const [clientAcceptance, setClientAcceptance] = useState(false);

  const budgetVariance = budgetPlanned && budgetActual
    ? ((Number(budgetActual) - Number(budgetPlanned)) / Number(budgetPlanned) * 100).toFixed(1)
    : null;

  const isValid = projectName.trim().length > 1 && deliverables.trim().length > 5 && lessonsLearned.trim().length > 5;

  const handleSubmit = async () => {
    if (!user || !activeTenantId || !isValid) return;
    setLoading(true); setError('');
    try {
      const docId = await createDocumentInstance(
        activeTenantId, user.uid, user.email ?? '',
        'PROJECT_CLOSURE', 'default-project-closure',
        {
          title: `Zamknięcie projektu: ${projectName}${projectId ? ` (${projectId})` : ''}`,
          amount: budgetActual ? Number(budgetActual) : undefined,
          currency, vendor: projectName,
          invoiceDate: endDate,
          description: `Projekt: ${projectName} ${projectId}\nOkres: ${startDate} – ${endDate}\nBudżet planowany: ${budgetPlanned} ${currency}\nBudżet rzeczywisty: ${budgetActual} ${currency}${budgetVariance ? ` (${budgetVariance}%)` : ''}\nAkceptacja klienta: ${clientAcceptance ? 'TAK' : 'NIE'}\n\nDostarczono:\n${deliverables}\n\nLekcje z projektu:\n${lessonsLearned}`,
        },
        [], currentCompany?.id
      );
      await transitionDocument(activeTenantId, docId, 'SUBMIT', user.uid, user.email ?? '', 'PENDING_APPROVAL', {
        stepDefId: 'step-submit', stepType: 'APPROVAL', note: `Wniosek o formalne zamknięcie projektu ${projectName}. Do akceptacji PM i zarządu.`,
      });
      onComplete(docId);
    } catch (e: any) { setError(e.message ?? 'Błąd podczas wysyłania.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center"><FolderCheck size={18} className="text-emerald-600" /></div>
        <div>
          <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">PROJECT CLOSURE</span>
          <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 leading-none">Zamknięcie Projektu</h3>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nazwa projektu *"><input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="Nazwa projektu" className={INPUT} /></Field>
          <Field label="ID projektu"><input value={projectId} onChange={e => setProjectId(e.target.value)} placeholder="PRJ-2026-001" className={INPUT} /></Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Data startu"><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={INPUT} /></Field>
          <Field label="Data zakończenia"><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={INPUT} /></Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Budżet planowany">
            <input type="number" min="0" value={budgetPlanned} onChange={e => setBudgetPlanned(e.target.value)} placeholder="0" className={INPUT} />
          </Field>
          <Field label="Budżet rzeczywisty">
            <input type="number" min="0" value={budgetActual} onChange={e => setBudgetActual(e.target.value)} placeholder="0" className={INPUT} />
          </Field>
          <Field label="Waluta">
            <select value={currency} onChange={e => setCurrency(e.target.value)} className={INPUT}>
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>

        {budgetVariance !== null && (
          <div className={`flex items-center justify-between rounded-2xl px-4 py-3 border ${Number(budgetVariance) > 10 ? 'bg-red-50 border-red-200 text-red-700' : Number(budgetVariance) > 0 ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
            <span className="text-[10px] font-black uppercase">Odchylenie budżetu</span>
            <span className="text-lg font-black">{Number(budgetVariance) > 0 ? '+' : ''}{budgetVariance}%</span>
          </div>
        )}

        <Field label="Zrealizowane produkty/usługi * (min. 5 znaków)"><textarea value={deliverables} onChange={e => setDeliverables(e.target.value)} rows={3} placeholder="Co zostało dostarczone, jakie są wyniki..." className={INPUT + ' resize-none'} /></Field>
        <Field label="Lekcje z projektu * (min. 5 znaków)"><textarea value={lessonsLearned} onChange={e => setLessonsLearned(e.target.value)} rows={3} placeholder="Co poszło dobrze, co warto ulepszyć w przyszłości..." className={INPUT + ' resize-none'} /></Field>

        <label className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${clientAcceptance ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
          <input type="checkbox" checked={clientAcceptance} onChange={e => setClientAcceptance(e.target.checked)} className="w-4 h-4" />
          <span className={`text-[9px] font-black uppercase ${clientAcceptance ? 'text-emerald-700' : 'text-slate-500'}`}>
            Klient formalnie zaakceptował rezultaty projektu (protokół odbioru)
          </span>
        </label>
      </div>

      {error && <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-2xl px-4 py-3 text-xs font-bold"><AlertTriangle size={13} />{error}</div>}

      <div className="flex gap-3">
        <button onClick={onCancel} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 text-slate-600 text-xs font-black uppercase hover:bg-slate-200 transition-all"><ArrowLeft size={13} />Anuluj</button>
        <button onClick={handleSubmit} disabled={loading || !isValid} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-600 text-white text-xs font-black uppercase hover:bg-emerald-700 disabled:opacity-40 transition-all">
          {loading ? 'Wysyłanie...' : <><Check size={13} />Wyślij do formalnego zamknięcia</>}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex-1"><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>{children}</div>;
}
