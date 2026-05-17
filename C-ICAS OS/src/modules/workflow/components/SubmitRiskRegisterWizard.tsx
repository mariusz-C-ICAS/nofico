import React, { useState } from 'react';
import { ArrowLeft, Check, AlertTriangle, TriangleAlert } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { useCompany } from '../../../core/auth/CompanyContext';
import { createDocumentInstance, transitionDocument } from '../services/workflowEngine';

interface Props { onComplete: (docId: string) => void; onCancel: () => void; }

const INPUT = 'w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none transition-all';
const RISK_CATEGORIES = ['Finansowe', 'Operacyjne', 'Techniczne', 'Prawne/Regulacyjne', 'Reputacyjne', 'Projektowe', 'Cyberbezpieczeństwo', 'Zewnętrzne'];
const SCORES = [1, 2, 3, 4, 5];

const RISK_LABEL: Record<number, string> = { 1: 'Bardzo niskie', 2: 'Niskie', 3: 'Umiarkowane', 4: 'Wysokie', 5: 'Krytyczne' };

export default function SubmitRiskRegisterWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [riskTitle, setRiskTitle] = useState('');
  const [category, setCategory] = useState(RISK_CATEGORIES[0]);
  const [probability, setProbability] = useState(3);
  const [impact, setImpact] = useState(3);
  const [description, setDescription] = useState('');
  const [mitigationPlan, setMitigationPlan] = useState('');
  const [owner, setOwner] = useState('');
  const [projectName, setProjectName] = useState('');

  const riskScore = probability * impact;
  const riskLevel = riskScore <= 4 ? 'Niskie' : riskScore <= 9 ? 'Umiarkowane' : riskScore <= 16 ? 'Wysokie' : 'Krytyczne';
  const riskColor = riskScore <= 4 ? 'text-green-700 bg-green-50 border-green-200' : riskScore <= 9 ? 'text-amber-700 bg-amber-50 border-amber-200' : riskScore <= 16 ? 'text-orange-700 bg-orange-50 border-orange-200' : 'text-red-700 bg-red-50 border-red-200';

  const isValid = riskTitle.trim().length > 3 && description.trim().length > 10 && mitigationPlan.trim().length > 5;

  const handleSubmit = async () => {
    if (!user || !activeTenantId || !isValid) return;
    setLoading(true); setError('');
    try {
      const docId = await createDocumentInstance(
        activeTenantId, user.uid, user.email ?? '',
        'RISK_REGISTER', 'default-risk-register',
        {
          title: `Ryzyko [${riskLevel}]: ${riskTitle}`,
          vendor: projectName || undefined,
          invoiceDate: new Date().toISOString().split('T')[0],
          description: `Tytuł ryzyka: ${riskTitle}\nKategoria: ${category}\nProjekt: ${projectName || 'n/d'}\nWłaściciel: ${owner}\nPrawdopodobieństwo: ${probability}/5 (${RISK_LABEL[probability]})\nWpływ: ${impact}/5 (${RISK_LABEL[impact]})\nOcena ryzyka: ${riskScore}/25 — ${riskLevel}\n\nOpis:\n${description}\n\nPlan mitygacji:\n${mitigationPlan}`,
        },
        [], currentCompany?.id
      );
      await transitionDocument(activeTenantId, docId, 'SUBMIT', user.uid, user.email ?? '', 'PENDING_APPROVAL', {
        stepDefId: 'step-submit', stepType: 'APPROVAL', note: `Nowe ryzyko [${riskLevel}, score=${riskScore}]: ${riskTitle}. Plan mitygacji do zatwierdzenia.`,
      });
      onComplete(docId);
    } catch (e: any) { setError(e.message ?? 'Błąd podczas wysyłania.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center"><TriangleAlert size={18} className="text-amber-700" /></div>
        <div>
          <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest">RISK REGISTER</span>
          <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 leading-none">Rejestr Ryzyk</h3>
        </div>
      </div>

      <div className="space-y-4">
        <Field label="Tytuł ryzyka * (min. 3 znaki)"><input value={riskTitle} onChange={e => setRiskTitle(e.target.value)} placeholder="Krótki opis ryzyka" className={INPUT} /></Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Kategoria ryzyka">
            <select value={category} onChange={e => setCategory(e.target.value)} className={INPUT}>
              {RISK_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Projekt / obszar"><input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="Nazwa projektu / działu" className={INPUT} /></Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={`Prawdopodobieństwo: ${probability}/5 — ${RISK_LABEL[probability]}`}>
            <div className="flex gap-2">
              {SCORES.map(s => (
                <button key={s} type="button" onClick={() => setProbability(s)}
                  className={`flex-1 py-2 rounded-xl text-xs font-black border transition-all ${probability === s ? 'bg-amber-600 text-white border-amber-600' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-amber-300'}`}>
                  {s}
                </button>
              ))}
            </div>
          </Field>
          <Field label={`Wpływ: ${impact}/5 — ${RISK_LABEL[impact]}`}>
            <div className="flex gap-2">
              {SCORES.map(s => (
                <button key={s} type="button" onClick={() => setImpact(s)}
                  className={`flex-1 py-2 rounded-xl text-xs font-black border transition-all ${impact === s ? 'bg-amber-600 text-white border-amber-600' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-amber-300'}`}>
                  {s}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <div className={`flex items-center justify-between rounded-2xl px-4 py-3 border ${riskColor}`}>
          <span className="text-[10px] font-black uppercase">Ocena ryzyka (P×W)</span>
          <span className="text-xl font-black">{riskScore}/25 — {riskLevel}</span>
        </div>

        <Field label="Opis ryzyka * (min. 10 znaków)"><textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Co może się wydarzyć, jakie są przyczyny, kiedy..." className={INPUT + ' resize-none'} /></Field>
        <Field label="Plan mitygacji * (min. 5 znaków)"><textarea value={mitigationPlan} onChange={e => setMitigationPlan(e.target.value)} rows={3} placeholder="Jak ograniczyć prawdopodobieństwo lub wpływ..." className={INPUT + ' resize-none'} /></Field>
        <Field label="Właściciel ryzyka"><input value={owner} onChange={e => setOwner(e.target.value)} placeholder="Imię Nazwisko / dział" className={INPUT} /></Field>
      </div>

      {error && <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-2xl px-4 py-3 text-xs font-bold"><AlertTriangle size={13} />{error}</div>}

      <div className="flex gap-3">
        <button onClick={onCancel} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 text-slate-600 text-xs font-black uppercase hover:bg-slate-200 transition-all"><ArrowLeft size={13} />Anuluj</button>
        <button onClick={handleSubmit} disabled={loading || !isValid} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-amber-700 text-white text-xs font-black uppercase hover:bg-amber-800 disabled:opacity-40 transition-all">
          {loading ? 'Wysyłanie...' : <><Check size={13} />Wyślij do PM i zarządu</>}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>{children}</div>;
}
