import React, { useState } from 'react';
import { ArrowLeft, Check, AlertTriangle, Pill } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { useCompany } from '../../../core/auth/CompanyContext';
import { createDocumentInstance, transitionDocument } from '../services/workflowEngine';

interface Props { onComplete: (docId: string) => void; onCancel: () => void; }

const INPUT = 'w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-rose-400 focus:border-transparent outline-none transition-all';
const ERROR_TYPES = ['Błędna dawka', 'Błędny lek', 'Błędny pacjent', 'Błędna droga podania', 'Błędny czas podania', 'Pominięcie dawki', 'Inne'];
const SEVERITY = ['Bez szkody dla pacjenta', 'Łagodna szkoda', 'Umiarkowana szkoda', 'Poważna szkoda', 'Zgon'];

export default function SubmitMedicationErrorWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [patientId, setPatientId] = useState('');
  const [ward, setWard] = useState('');
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0]);
  const [errorType, setErrorType] = useState(ERROR_TYPES[0]);
  const [medicationName, setMedicationName] = useState('');
  const [prescribedDose, setPrescribedDose] = useState('');
  const [administeredDose, setAdministeredDose] = useState('');
  const [severity, setSeverity] = useState(SEVERITY[0]);
  const [description, setDescription] = useState('');
  const [immediateAction, setImmediateAction] = useState('');
  const [urplRequired, setUrplRequired] = useState(false);

  const isValid = patientId.trim().length > 0 && medicationName.trim().length > 1 && description.trim().length > 10 && immediateAction.trim().length > 5;

  const handleSubmit = async () => {
    if (!user || !activeTenantId || !isValid) return;
    setLoading(true); setError('');
    try {
      const docId = await createDocumentInstance(
        activeTenantId, user.uid, user.email ?? '',
        'MEDICATION_ERROR', 'default-medication-error',
        {
          title: `Błąd lekowy [${errorType}]: ${medicationName} — Pacjent ${patientId}`,
          invoiceDate: incidentDate,
          description: `Identyfikator pacjenta: ${patientId} (zanonimizowany)\nOddział: ${ward}\nData zdarzenia: ${incidentDate}\nTyp błędu: ${errorType}\nLek: ${medicationName}\nDawka przepisana: ${prescribedDose}\nDawka podana: ${administeredDose}\nPoziom szkody: ${severity}\nZgłoszenie do URPL: ${urplRequired ? 'TAK — OBOWIĄZKOWE' : 'NIE'}\n\nOpis zdarzenia:\n${description}\n\nPodjęte działania:\n${immediateAction}`,
        },
        [], currentCompany?.id
      );
      await transitionDocument(activeTenantId, docId, 'SUBMIT', user.uid, user.email ?? '', 'PENDING_APPROVAL', {
        stepDefId: 'step-submit', stepType: 'APPROVAL', note: `Błąd lekowy — ${severity}. Natychmiastowy przegląd wymagany.${urplRequired ? ' Konieczne zgłoszenie do URPL.' : ''}`,
      });
      onComplete(docId);
    } catch (e: any) { setError(e.message ?? 'Błąd podczas wysyłania.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-rose-50 rounded-2xl flex items-center justify-center"><Pill size={18} className="text-rose-600" /></div>
        <div>
          <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest">MEDICATION ERROR</span>
          <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 leading-none">Błąd Lekowy</h3>
        </div>
      </div>

      <div className="bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 flex items-center gap-2">
        <AlertTriangle size={14} className="text-rose-600 shrink-0" />
        <p className="text-[10px] font-black text-rose-700 uppercase">Obowiązkowe zgłoszenie — dane pacjenta zanonimizowane. Termin zgłoszenia do URPL: 15 dni.</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="ID pacjenta (zanonimizowany) *"><input value={patientId} onChange={e => setPatientId(e.target.value)} placeholder="np. PAC-2026-001" className={INPUT} /></Field>
          <Field label="Oddział / jednostka"><input value={ward} onChange={e => setWard(e.target.value)} placeholder="Oddział kardiologiczny" className={INPUT} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data zdarzenia *"><input type="date" value={incidentDate} onChange={e => setIncidentDate(e.target.value)} className={INPUT} /></Field>
          <Field label="Typ błędu *">
            <select value={errorType} onChange={e => setErrorType(e.target.value)} className={INPUT}>
              {ERROR_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Lek *"><input value={medicationName} onChange={e => setMedicationName(e.target.value)} placeholder="Nazwa leku" className={INPUT} /></Field>
          <Field label="Dawka przepisana"><input value={prescribedDose} onChange={e => setPrescribedDose(e.target.value)} placeholder="np. 10mg" className={INPUT} /></Field>
          <Field label="Dawka podana"><input value={administeredDose} onChange={e => setAdministeredDose(e.target.value)} placeholder="np. 100mg" className={INPUT} /></Field>
        </div>
        <Field label="Poziom szkody *">
          <div className="grid grid-cols-1 gap-2">
            {SEVERITY.map(s => (
              <button key={s} type="button" onClick={() => setSeverity(s)}
                className={`text-left px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase border transition-all ${severity === s
                  ? s.includes('Zgon') || s.includes('Poważna') ? 'bg-red-600 text-white border-red-600' : s.includes('Umiarkowana') ? 'bg-orange-500 text-white border-orange-500' : 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-rose-200'}`}>
                {s}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Opis zdarzenia * (min. 10 znaków)"><textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Okoliczności błędu, przebieg zdarzeń..." className={INPUT + ' resize-none'} /></Field>
        <Field label="Podjęte działania * (min. 5 znaków)"><textarea value={immediateAction} onChange={e => setImmediateAction(e.target.value)} rows={2} placeholder="Anulowanie dawki, obserwacja pacjenta, lekarz powiadomiony..." className={INPUT + ' resize-none'} /></Field>
        <label className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${urplRequired ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
          <input type="checkbox" checked={urplRequired} onChange={e => setUrplRequired(e.target.checked)} className="w-4 h-4" />
          <span className={`text-[9px] font-black uppercase ${urplRequired ? 'text-rose-700' : 'text-slate-500'}`}>Wymaga obowiązkowego zgłoszenia do URPL</span>
        </label>
      </div>

      {error && <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-2xl px-4 py-3 text-xs font-bold"><AlertTriangle size={13} />{error}</div>}

      <div className="flex gap-3">
        <button onClick={onCancel} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 text-slate-600 text-xs font-black uppercase hover:bg-slate-200 transition-all"><ArrowLeft size={13} />Anuluj</button>
        <button onClick={handleSubmit} disabled={loading || !isValid} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-rose-600 text-white text-xs font-black uppercase hover:bg-rose-700 disabled:opacity-40 transition-all">
          {loading ? 'Wysyłanie...' : <><Check size={13} />Zgłoś błąd lekowy</>}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex-1"><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>{children}</div>;
}
