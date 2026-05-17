import React, { useState } from 'react';
import { ArrowLeft, Check, AlertTriangle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { useCompany } from '../../../core/auth/CompanyContext';
import { createDocumentInstance, transitionDocument } from '../services/workflowEngine';

interface Props { onComplete: (docId: string) => void; onCancel: () => void; }

const INPUT = 'w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-red-400 focus:border-transparent outline-none transition-all';
const BREACH_TYPES = ['RODO/GDPR', 'AML/KYC', 'SFDR', 'KNF/regulacje finansowe', 'ISO/normy', 'Prawo pracy', 'Ochrona środowiska', 'Inne'];
const IMPACT_LEVELS = ['Nieznaczny', 'Umiarkowany', 'Poważny', 'Krytyczny'];

export default function SubmitRegulatoryBreachWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [regulation, setRegulation] = useState('');
  const [breachType, setBreachType] = useState(BREACH_TYPES[0]);
  const [discoveredDate, setDiscoveredDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [impactLevel, setImpactLevel] = useState('Umiarkowany');
  const [immediateActions, setImmediateActions] = useState('');
  const [reportingRequired, setReportingRequired] = useState(false);

  const isValid = regulation.trim().length > 2 && description.trim().length > 10 && immediateActions.trim().length > 5;

  const handleSubmit = async () => {
    if (!user || !activeTenantId || !isValid) return;
    setLoading(true); setError('');
    try {
      const docId = await createDocumentInstance(
        activeTenantId, user.uid, user.email ?? '',
        'REGULATORY_BREACH', 'default-regulatory-breach',
        {
          title: `Naruszenie: ${breachType} — ${regulation}`,
          invoiceDate: discoveredDate,
          description: `Regulacja: ${regulation}\nTyp naruszenia: ${breachType}\nData wykrycia: ${discoveredDate}\nPozio wpływu: ${impactLevel}\nZgłoszenie do regulatora: ${reportingRequired ? 'TAK' : 'NIE'}\n\nOpis naruszenia:\n${description}\n\nPodjęte działania:\n${immediateActions}`,
        },
        [], currentCompany?.id
      );
      await transitionDocument(activeTenantId, docId, 'SUBMIT', user.uid, user.email ?? '', 'PENDING_APPROVAL', {
        stepDefId: 'step-submit', stepType: 'APPROVAL', note: `Zgłoszenie naruszenia regulacyjnego — ${impactLevel}. Wymaga natychmiastowej weryfikacji.`,
      });
      onComplete(docId);
    } catch (e: any) { setError(e.message ?? 'Błąd podczas wysyłania.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-red-50 rounded-2xl flex items-center justify-center"><AlertCircle size={18} className="text-red-700" /></div>
        <div>
          <span className="text-[9px] font-black text-red-700 uppercase tracking-widest">REGULATORY BREACH</span>
          <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 leading-none">Naruszenie Regulacyjne</h3>
        </div>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center gap-2">
        <AlertTriangle size={14} className="text-red-600 shrink-0" />
        <p className="text-[10px] font-black text-red-700 uppercase">Dokument wymaga natychmiastowego działania — powiadomienie zarządu i prawnika.</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Typ naruszenia *">
            <select value={breachType} onChange={e => setBreachType(e.target.value)} className={INPUT}>
              {BREACH_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Data wykrycia *"><input type="date" value={discoveredDate} onChange={e => setDiscoveredDate(e.target.value)} className={INPUT} /></Field>
        </div>

        <Field label="Naruszona regulacja / przepis *"><input value={regulation} onChange={e => setRegulation(e.target.value)} placeholder="np. Art. 33 RODO, § 15 Regulaminu KNF" className={INPUT} /></Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Poziom wpływu">
            <select value={impactLevel} onChange={e => setImpactLevel(e.target.value)} className={INPUT}>
              {IMPACT_LEVELS.map(l => <option key={l}>{l}</option>)}
            </select>
          </Field>
          <label className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all self-end ${reportingRequired ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
            <input type="checkbox" checked={reportingRequired} onChange={e => setReportingRequired(e.target.checked)} className="w-4 h-4" />
            <span className={`text-[9px] font-black uppercase ${reportingRequired ? 'text-red-700' : 'text-slate-500'}`}>Wymaga zgłoszenia do regulatora</span>
          </label>
        </div>

        <Field label="Opis naruszenia * (min. 10 znaków)"><textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Co się stało, jakie dane/osoby są zaangażowane..." className={INPUT + ' resize-none'} /></Field>
        <Field label="Podjęte działania * (min. 5 znaków)"><textarea value={immediateActions} onChange={e => setImmediateActions(e.target.value)} rows={3} placeholder="Izolacja incydentu, powiadomienia, plan naprawczy..." className={INPUT + ' resize-none'} /></Field>
      </div>

      {error && <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-2xl px-4 py-3 text-xs font-bold"><AlertTriangle size={13} />{error}</div>}

      <div className="flex gap-3">
        <button onClick={onCancel} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 text-slate-600 text-xs font-black uppercase hover:bg-slate-200 transition-all"><ArrowLeft size={13} />Anuluj</button>
        <button onClick={handleSubmit} disabled={loading || !isValid} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-700 text-white text-xs font-black uppercase hover:bg-red-800 disabled:opacity-40 transition-all">
          {loading ? 'Wysyłanie...' : <><Check size={13} />Zgłoś naruszenie</>}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>{children}</div>;
}
