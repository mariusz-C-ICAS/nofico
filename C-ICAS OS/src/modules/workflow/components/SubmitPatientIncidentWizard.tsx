import React, { useState } from 'react';
import { HeartPulse, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { createDocumentInstance, transitionDocument } from '../services/workflowEngine';

interface Props { onComplete: (docId: string) => void; onCancel: () => void; }
type Step = 'incident' | 'patient' | 'review';

const INCIDENT_TYPES = [
  'Upadek pacjenta',
  'Błąd diagnostyczny',
  'Zakażenie szpitalne (HAI)',
  'Zdarzenie okołooperacyjne',
  'Błąd lekowy / podanie leku',
  'Awaria sprzętu medycznego',
  'Reakcja niepożądana na leczenie',
  'Inne zdarzenie niepożądane',
];

const SEVERITY_LEVELS = [
  { id: '1', label: 'Poziom 1 — Bez szkody', color: 'bg-green-50 border-green-300 text-green-700' },
  { id: '2', label: 'Poziom 2 — Łagodna szkoda', color: 'bg-yellow-50 border-yellow-300 text-yellow-700' },
  { id: '3', label: 'Poziom 3 — Umiarkowana szkoda', color: 'bg-orange-50 border-orange-300 text-orange-700' },
  { id: '4', label: 'Poziom 4 — Poważna szkoda', color: 'bg-red-50 border-red-300 text-red-700' },
  { id: '5', label: 'Poziom 5 — Zgon', color: 'bg-red-100 border-red-500 text-red-900' },
];

export default function SubmitPatientIncidentWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const [step, setStep] = useState<Step>('incident');
  const [title, setTitle] = useState('');
  const [incidentType, setIncidentType] = useState(INCIDENT_TYPES[0]);
  const [severity, setSeverity] = useState('2');
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0]);
  const [incidentLocation, setIncidentLocation] = useState('');
  const [description, setDescription] = useState('');
  const [immediateAction, setImmediateAction] = useState('');
  const [medicalStaffInvolved, setMedicalStaffInvolved] = useState('');
  const [patientId, setPatientId] = useState('');
  const [notifiedAuthorities, setNotifiedAuthorities] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canProceedStep1 = title.trim().length > 3 && incidentLocation.trim().length > 1 && description.trim().length > 10;
  const canProceedStep2 = patientId.trim().length > 0;

  const isMandatoryReport = parseInt(severity) >= 4;

  const handleSubmit = async () => {
    if (!user || !activeTenantId) return;
    setLoading(true); setError('');
    try {
      const docId = await createDocumentInstance(
        activeTenantId, user.uid, user.email ?? '', 'PATIENT_INCIDENT', 'default-patient-incident',
        {
          title: title.trim(),
          patientIncidentType: incidentType,
          ncrSeverity: severity,
          incidentDate,
          incidentLocation: incidentLocation.trim(),
          description: description.trim(),
          immediateAction: immediateAction.trim() || undefined,
          medicalStaffInvolved: medicalStaffInvolved.trim() || undefined,
          patientId: patientId.trim(),
          notifiedAuthorities,
        }
      );
      await transitionDocument(
        activeTenantId, docId, 'SUBMIT', user.uid, user.email ?? '', 'UNDER_INVESTIGATION',
        {
          stepType: 'APPROVAL',
          note: `Zdarzenie niepożądane: ${incidentType}. Poziom ${severity}. Pacjent: ${patientId}. ${isMandatoryReport ? 'OBOWIĄZKOWE ZGŁOSZENIE DO ORGANÓW REGULACYJNYCH.' : ''}`,
        }
      );
      onComplete(docId);
    } catch (e: any) { setError(e.message ?? 'Błąd wysyłania.'); }
    finally { setLoading(false); }
  };

  const steps: Step[] = ['incident', 'patient', 'review'];
  const stepLabels: Record<Step, string> = { incident: 'Zdarzenie', patient: 'Pacjent', review: 'Wyślij' };

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <button onClick={onCancel} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 block">← Anuluj</button>

      <div className="flex items-start gap-4 bg-red-900 rounded-[2.5rem] p-6 text-white">
        <div className="w-10 h-10 bg-red-700 rounded-2xl flex items-center justify-center flex-shrink-0">
          <HeartPulse size={18} />
        </div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-red-300 mb-1">Obowiązkowe zgłoszenie · WORM · Poufne</p>
          <h3 className="text-xl font-black uppercase tracking-tighter">Zdarzenie niepożądane</h3>
          <p className="text-red-300 text-xs mt-1">Zgłoszenie trafia natychmiast do Risk Manager i kierownika oddziału. Poziom 4-5 wymaga zgłoszenia do organów regulacyjnych.</p>
        </div>
      </div>

      {isMandatoryReport && step !== 'review' && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-300 rounded-2xl p-4">
          <ShieldAlert size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-[10px] text-red-700 font-bold">
            Poziom {severity} — zgłoszenie obowiązkowe do organów regulacyjnych (Centrum Monitorowania Jakości). Termin: 24h.
          </p>
        </div>
      )}

      <div className="flex gap-1">
        {steps.map((s, i) => (
          <div key={s} className="flex-1 flex flex-col gap-1">
            <div className={`h-1 rounded-full ${i <= steps.indexOf(step) ? 'bg-red-700' : 'bg-slate-200'}`} />
            <span className={`text-[9px] font-black uppercase tracking-widest ${s === step ? 'text-red-700' : 'text-slate-400'}`}>{stepLabels[s]}</span>
          </div>
        ))}
      </div>

      {step === 'incident' && (
        <div className="space-y-5">
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Poziom dotkliwości zdarzenia *</label>
            <div className="space-y-2">
              {SEVERITY_LEVELS.map(s => (
                <button key={s.id} onClick={() => setSeverity(s.id)}
                  className={`w-full p-3 rounded-2xl border text-xs font-black text-left transition-all ${severity === s.id ? `${s.color} ring-2 ring-offset-1` : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Typ zdarzenia *</label>
            <select value={incidentType} onChange={e => setIncidentType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-red-600 outline-none">
              {INCIDENT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tytuł raportu *</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Krótki opis zdarzenia..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-red-600 outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Data zdarzenia *</label>
              <input type="date" value={incidentDate} onChange={e => setIncidentDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-600 outline-none" />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Oddział / lokalizacja *</label>
              <input value={incidentLocation} onChange={e => setIncidentLocation(e.target.value)}
                placeholder="np. Oddział chirurgiczny"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-600 outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Opis zdarzenia *</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={5}
              placeholder="Opisz dokładnie co się wydarzyło, okoliczności, sekwencję zdarzeń..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm resize-none focus:ring-2 focus:ring-red-600 outline-none" />
          </div>

          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Podjęte działania natychmiastowe</label>
            <textarea value={immediateAction} onChange={e => setImmediateAction(e.target.value)} rows={3}
              placeholder="Co zrobiono bezpośrednio po zdarzeniu?"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm resize-none focus:ring-2 focus:ring-red-600 outline-none" />
          </div>

          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Zaangażowany personel</label>
            <input value={medicalStaffInvolved} onChange={e => setMedicalStaffInvolved(e.target.value)}
              placeholder="Imiona i funkcje personelu obecnego podczas zdarzenia"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-red-600 outline-none" />
          </div>
        </div>
      )}

      {step === 'patient' && (
        <div className="space-y-5">
          <div className="bg-amber-50 rounded-[2rem] p-4 border border-amber-200">
            <p className="text-[10px] text-amber-700 font-bold">Dane pacjenta są poufne. Dostęp tylko dla upoważnionego personelu medycznego i organów regulacyjnych.</p>
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">ID Pacjenta (PESEL lub nr historii choroby) *</label>
            <input value={patientId} onChange={e => setPatientId(e.target.value)}
              placeholder="ID z systemu HIS"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-mono focus:ring-2 focus:ring-red-600 outline-none" />
          </div>
          <div>
            <label className="flex items-center gap-3 cursor-pointer p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:border-red-300 transition-colors">
              <input type="checkbox" checked={notifiedAuthorities} onChange={e => setNotifiedAuthorities(e.target.checked)}
                className="w-4 h-4 accent-red-700 rounded" />
              <div>
                <p className="text-xs font-black text-slate-800">Organy regulacyjne zostały już poinformowane</p>
                <p className="text-[9px] text-slate-400 font-medium">Zaznacz jeśli wstępne zgłoszenie zostało już dokonane</p>
              </div>
            </label>
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-[2rem] p-6 space-y-3">
            <Row label="Typ" value={incidentType} />
            <Row label="Poziom" value={SEVERITY_LEVELS.find(s => s.id === severity)?.label ?? ''} />
            <Row label="Tytuł" value={title} />
            <Row label="Data" value={incidentDate} />
            <Row label="Lokalizacja" value={incidentLocation} />
            <Row label="ID Pacjenta" value={patientId} />
            {notifiedAuthorities && <Row label="Organy" value="Już powiadomione" />}
          </div>
          {isMandatoryReport && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-300 rounded-2xl p-4">
              <ShieldAlert size={16} className="text-red-700 mt-0.5 flex-shrink-0" />
              <p className="text-[10px] text-red-800 font-bold">
                Zdarzenie poziomu {severity} — po zatwierdzeniu zostanie automatycznie zgłoszone do Centrum Monitorowania Jakości i organów nadzoru. Archiwizacja WORM.
              </p>
            </div>
          )}
          {error && <p className="text-red-600 text-xs font-bold flex items-center gap-1.5"><AlertTriangle size={12} />{error}</p>}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button
          onClick={() => {
            if (step === 'incident') onCancel();
            else if (step === 'patient') setStep('incident');
            else setStep('patient');
          }}
          className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600">
          ← {step === 'incident' ? 'Anuluj' : 'Wstecz'}
        </button>
        {step === 'incident' && (
          <button disabled={!canProceedStep1} onClick={() => setStep('patient')}
            className="bg-red-700 hover:bg-red-800 disabled:opacity-40 text-white font-black px-8 py-3 rounded-2xl text-xs uppercase tracking-widest">
            Dalej →
          </button>
        )}
        {step === 'patient' && (
          <button disabled={!canProceedStep2} onClick={() => setStep('review')}
            className="bg-red-700 hover:bg-red-800 disabled:opacity-40 text-white font-black px-8 py-3 rounded-2xl text-xs uppercase tracking-widest">
            Dalej →
          </button>
        )}
        {step === 'review' && (
          <button disabled={loading} onClick={handleSubmit}
            className="bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white font-black px-8 py-3 rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-red-500/20">
            {loading ? 'Wysyłanie...' : <><CheckCircle2 size={14} /> Zgłoś zdarzenie</>}
          </button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest shrink-0">{label}</span>
      <span className="text-xs font-bold text-slate-800 text-right">{value}</span>
    </div>
  );
}
