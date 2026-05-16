import React, { useState } from 'react';
import { MonitorOff, CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { createDocumentInstance, transitionDocument } from '../services/workflowEngine';

interface Props { onComplete: (docId: string) => void; onCancel: () => void; }
type Step = 'incident' | 'impact' | 'review';
type Severity = 'critical' | 'high' | 'medium' | 'low';

const SEV_META: Record<Severity, { label: string; color: string; desc: string }> = {
  critical: { label: 'KRYTYCZNY', color: 'bg-red-50 border-red-400 text-red-700 ring-red-400', desc: 'Systemy produkcyjne niedostępne, utrata danych, naruszenie bezpieczeństwa' },
  high: { label: 'WYSOKI', color: 'bg-orange-50 border-orange-400 text-orange-700 ring-orange-400', desc: 'Znaczące zakłócenia, duża liczba użytkowników, brak obejścia' },
  medium: { label: 'ŚREDNI', color: 'bg-amber-50 border-amber-400 text-amber-700 ring-amber-400', desc: 'Ograniczona funkcjonalność, istnieje obejście problemu' },
  low: { label: 'NISKI', color: 'bg-slate-50 border-slate-300 text-slate-600 ring-slate-300', desc: 'Drobny problem, kosmetyczny, nie wpływa na produkcję' },
};

const INCIDENT_TYPES = [
  'Niedostępność systemu / serwisu',
  'Naruszenie bezpieczeństwa / atak',
  'Utrata danych',
  'Błąd krytyczny aplikacji',
  'Awaria sieci / infrastruktury',
  'Problemy z wydajnością',
  'Nieautoryzowany dostęp',
  'Incydent RODO / wyciek danych',
  'Inne',
];

export default function SubmitItIncidentWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const [step, setStep] = useState<Step>('incident');
  const [severity, setSeverity] = useState<Severity>('medium');
  const [incidentType, setIncidentType] = useState(INCIDENT_TYPES[0]);
  const [systemName, setSystemName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [affectedUsers, setAffectedUsers] = useState('');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [resolutionSteps, setResolutionSteps] = useState('');
  const [detectedAt, setDetectedAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const order: Step[] = ['incident', 'impact', 'review'];
  const stepIndex = order.indexOf(step);

  const canProceed = () => {
    if (step === 'incident') return title.trim() && systemName.trim() && description.trim();
    return true;
  };

  const handleSubmit = async () => {
    if (!user || !activeTenantId) return;
    setLoading(true); setError('');
    try {
      const docId = await createDocumentInstance(activeTenantId, user.uid, user.email ?? '', 'IT_INCIDENT', 'default-it-incident', {
        title: title.trim(),
        itSeverity: severity,
        itSystemName: systemName.trim(),
        description: description.trim(),
        affectedUsersCount: affectedUsers ? parseInt(affectedUsers) : undefined,
        itResolutionSteps: resolutionSteps.trim() || undefined,
        incidentDate: detectedAt || undefined,
      });
      await transitionDocument(activeTenantId, docId, 'SUBMIT', user.uid, user.email ?? '', 'PENDING_APPROVAL',
        { stepType: 'APPROVAL', note: `Incydent IT [${severity.toUpperCase()}] — ${systemName}. Wymaga natychmiastowej uwagi.` });
      onComplete(docId);
    } catch (e: any) { setError(e.message ?? 'Błąd wysyłania.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div>
        <button onClick={onCancel} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 mb-4 block">← Anuluj</button>
        <div className="flex items-center gap-3 mb-1">
          <MonitorOff size={20} className="text-violet-600" />
          <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Incydent IT</h3>
        </div>
        <p className="text-slate-400 text-sm font-medium">Awaria, naruszenie bezpieczeństwa, incydent RODO — pełny log audytowy.</p>
      </div>

      <div className="flex gap-1">
        {(['incident', 'impact', 'review'] as Step[]).map((s, i) => (
          <div key={s} className="flex-1 flex flex-col gap-1">
            <div className={`h-1 rounded-full ${i <= stepIndex ? 'bg-violet-600' : 'bg-slate-200'}`} />
            <span className={`text-[9px] font-black uppercase tracking-widest ${s === step ? 'text-violet-600' : 'text-slate-400'}`}>
              {s === 'incident' ? 'Incydent' : s === 'impact' ? 'Skutki' : 'Wyślij'}
            </span>
          </div>
        ))}
      </div>

      {step === 'incident' && (
        <div className="space-y-5">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Poziom ważności (severity)</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(SEV_META) as [Severity, typeof SEV_META[Severity]][]).map(([sev, meta]) => (
                <button key={sev} onClick={() => setSeverity(sev)}
                  className={`p-3 rounded-2xl border text-left transition-all ${severity === sev ? meta.color + ' ring-2' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    {sev === 'critical' && <AlertOctagon size={10} />}
                    <p className="text-xs font-black">{meta.label}</p>
                  </div>
                  <p className="text-[9px] font-medium leading-snug">{meta.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Typ incydentu</label>
            <select value={incidentType} onChange={e => setIncidentType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-violet-500 outline-none">
              {INCIDENT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tytuł incydentu *</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="np. Niedostępność CRM — baza danych offline od 14:32"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-violet-500 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Dotknięty system *</label>
              <input value={systemName} onChange={e => setSystemName(e.target.value)}
                placeholder="CRM, ERP, e-mail, VPN..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500 outline-none" />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Wykryto o</label>
              <input type="datetime-local" value={detectedAt} onChange={e => setDetectedAt(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Opis incydentu *</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4}
              placeholder="Co się wydarzyło, jakie objawy, co jest niedostępne..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm resize-none focus:ring-2 focus:ring-violet-500 outline-none" />
          </div>
        </div>
      )}

      {step === 'impact' && (
        <div className="space-y-4">
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Liczba dotkniętych użytkowników</label>
            <input type="number" min="0" value={affectedUsers} onChange={e => setAffectedUsers(e.target.value)}
              placeholder="np. 45"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-violet-500 outline-none" />
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Kroki do reprodukcji / okoliczności</label>
            <textarea value={stepsToReproduce} onChange={e => setStepsToReproduce(e.target.value)} rows={3}
              placeholder="1. Użytkownik otwiera aplikację\n2. Klika Zaloguj\n3. Pojawia się błąd 500..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm resize-none focus:ring-2 focus:ring-violet-500 outline-none" />
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Podjęte działania naprawcze</label>
            <textarea value={resolutionSteps} onChange={e => setResolutionSteps(e.target.value)} rows={3}
              placeholder="Restart serwisu, przywrócenie z backup, eskalacja do dostawcy..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm resize-none focus:ring-2 focus:ring-violet-500 outline-none" />
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-4">
          <div className={`rounded-[2rem] p-4 border-2 ${SEV_META[severity].color}`}>
            <p className="text-xs font-black uppercase">{SEV_META[severity].label} — {incidentType}</p>
          </div>
          <div className="bg-slate-50 rounded-[2rem] p-6 space-y-3">
            <Row label="Tytuł" value={title} />
            <Row label="System" value={systemName} />
            {detectedAt && <Row label="Wykryto" value={detectedAt.replace('T', ' ')} />}
            {affectedUsers && <Row label="Użytkownicy" value={affectedUsers} />}
          </div>
          {severity === 'critical' && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <p className="text-xs font-black text-red-700">KRYTYCZNY — po wysłaniu natychmiast powiadomi menedżera IT i zarząd.</p>
            </div>
          )}
          {error && <p className="text-red-600 text-xs font-bold flex items-center gap-1.5"><AlertTriangle size={12} />{error}</p>}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button onClick={() => { const i = order.indexOf(step); i > 0 ? setStep(order[i - 1]) : onCancel(); }}
          className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600">
          ← {step === 'incident' ? 'Anuluj' : 'Wstecz'}
        </button>
        {step !== 'review' ? (
          <button disabled={!canProceed()} onClick={() => setStep(order[order.indexOf(step) + 1])}
            className="bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white font-black px-8 py-3 rounded-2xl text-xs uppercase tracking-widest">Dalej →</button>
        ) : (
          <button disabled={loading} onClick={handleSubmit}
            className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-black px-8 py-3 rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-violet-500/20">
            {loading ? 'Wysyłanie...' : <><CheckCircle2 size={14} /> Zgłoś incydent</>}
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
