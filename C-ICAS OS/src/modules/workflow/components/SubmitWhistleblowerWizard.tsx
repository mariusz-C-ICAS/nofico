import React, { useState } from 'react';
import { Eye, EyeOff, CheckCircle2, AlertTriangle, Shield } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { useCompany } from '../../../core/auth/CompanyContext';
import { createDocumentInstance, transitionDocument } from '../services/workflowEngine';

interface Props { onComplete: (docId: string) => void; onCancel: () => void; }
type Step = 'form' | 'review';

const CATEGORIES = [
  'Korupcja / łapownictwo',
  'Mobing / dyskryminacja',
  'Naruszenie prawa pracy',
  'Naruszenie prawa ochrony środowiska',
  'Naruszenie bezpieczeństwa danych (RODO)',
  'Naruszenie przepisów finansowych',
  'Konflikty interesów',
  'Naruszenie procedur wewnętrznych',
  'Inne',
];

export default function SubmitWhistleblowerWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const { currentCompany } = useCompany();
  const [step, setStep] = useState<Step>('form');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [title, setTitle] = useState('');
  const [reportedDepartment, setReportedDepartment] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceDescription, setEvidenceDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canProceed = title.trim().length > 3 && description.trim().length > 10;

  const handleSubmit = async () => {
    if (!user || !activeTenantId) return;
    setLoading(true); setError('');
    try {
      const docId = await createDocumentInstance(
        activeTenantId, user.uid, user.email ?? '', 'WHISTLEBLOWER', 'default-whistleblower',
        {
          title: title.trim(),
          whistleblowerCategory: category,
          reportedDepartment: reportedDepartment.trim() || undefined,
          description: description.trim(),
          evidenceDescription: evidenceDescription.trim() || undefined,
          isAnonymous,
        },
        [],
        currentCompany?.id
      );
      await transitionDocument(
        activeTenantId, docId, 'SUBMIT', user.uid, user.email ?? '', 'PENDING_APPROVAL',
        { stepType: 'APPROVAL', note: `Zgłoszenie sygnalisty — ${category}. ${isAnonymous ? 'Anonimowe.' : 'Imienne.'}` }
      );
      onComplete(docId);
    } catch (e: any) { setError(e.message ?? 'Błąd wysyłania.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <button onClick={onCancel} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 block">← Anuluj</button>

      <div className="flex items-start gap-4 bg-slate-900 rounded-[2.5rem] p-6 text-white">
        <div className="w-10 h-10 bg-slate-700 rounded-2xl flex items-center justify-center flex-shrink-0">
          <Eye size={18} className="text-slate-300" />
        </div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Dyrektywa UE 2019/1937 · Ochrona sygnalistów</p>
          <h3 className="text-xl font-black uppercase tracking-tighter">Zgłoszenie sygnalisty</h3>
          <p className="text-slate-400 text-xs mt-1">Twoje zgłoszenie jest chronione prawnie. Termin potwierdzenia: 7 dni. Termin odpowiedzi: 90 dni.</p>
        </div>
      </div>

      <div className="flex gap-1">
        {(['form', 'review'] as Step[]).map((s, i) => (
          <div key={s} className="flex-1 flex flex-col gap-1">
            <div className={`h-1 rounded-full ${i <= (['form', 'review'] as Step[]).indexOf(step) ? 'bg-slate-900' : 'bg-slate-200'}`} />
            <span className={`text-[9px] font-black uppercase tracking-widest ${s === step ? 'text-slate-900' : 'text-slate-400'}`}>
              {s === 'form' ? 'Formularz' : 'Wyślij'}
            </span>
          </div>
        ))}
      </div>

      {step === 'form' && (
        <div className="space-y-5">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Tryb zgłoszenia</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setIsAnonymous(false)}
                className={`p-4 rounded-2xl border text-xs font-black flex items-center gap-2 transition-all ${!isAnonymous ? 'bg-slate-900 border-slate-900 text-white ring-2 ring-slate-900' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
              >
                <Eye size={14} /> Imienne
              </button>
              <button
                onClick={() => setIsAnonymous(true)}
                className={`p-4 rounded-2xl border text-xs font-black flex items-center gap-2 transition-all ${isAnonymous ? 'bg-slate-900 border-slate-900 text-white ring-2 ring-slate-900' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
              >
                <EyeOff size={14} /> Anonimowe
              </button>
            </div>
            {isAnonymous && (
              <div className="mt-2 p-3 bg-amber-50 rounded-2xl border border-amber-200">
                <p className="text-[10px] text-amber-700 font-bold">W trybie anonimowym Twoje dane nie są zapisywane. Możesz nie otrzymać odpowiedzi zwrotnej.</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Kategoria naruszenia *</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-slate-900 outline-none">
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tytuł zgłoszenia *</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Krótki opis naruszenia..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-slate-900 outline-none" />
          </div>

          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Dział / obszar (opcjonalnie)</label>
            <input value={reportedDepartment} onChange={e => setReportedDepartment(e.target.value)}
              placeholder="np. Dział finansowy, Oddział Warszawa..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-slate-900 outline-none" />
          </div>

          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Opis naruszenia *</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={5}
              placeholder="Opisz zdarzenie jak najdokładniej: co, kiedy, gdzie, kto był zaangażowany..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm resize-none focus:ring-2 focus:ring-slate-900 outline-none" />
          </div>

          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Opis dowodów (opcjonalnie)</label>
            <textarea value={evidenceDescription} onChange={e => setEvidenceDescription(e.target.value)} rows={3}
              placeholder="Czy posiadasz dokumenty, e-maile, nagrania lub świadków? Opisz..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm resize-none focus:ring-2 focus:ring-slate-900 outline-none" />
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-[2rem] p-6 space-y-3">
            <Row label="Tryb" value={isAnonymous ? 'Anonimowe' : 'Imienne'} />
            <Row label="Kategoria" value={category} />
            <Row label="Tytuł" value={title} />
            {reportedDepartment && <Row label="Dział" value={reportedDepartment} />}
            <Row label="Opis" value={description.substring(0, 120) + (description.length > 120 ? '...' : '')} />
          </div>
          <div className="bg-blue-50 rounded-[2rem] p-4 border border-blue-100 flex items-start gap-3">
            <Shield size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-blue-700 font-bold">
              Zgłoszenie zostanie skierowane do Compliance Officer. Jesteś chroniony przed działaniami odwetowymi zgodnie z Dyrektywą UE 2019/1937 i polskim prawem.
            </p>
          </div>
          {error && <p className="text-red-600 text-xs font-bold flex items-center gap-1.5"><AlertTriangle size={12} />{error}</p>}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button onClick={() => step === 'form' ? onCancel() : setStep('form')}
          className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600">
          ← {step === 'form' ? 'Anuluj' : 'Wstecz'}
        </button>
        {step === 'form' ? (
          <button disabled={!canProceed} onClick={() => setStep('review')}
            className="bg-slate-900 hover:bg-slate-700 disabled:opacity-40 text-white font-black px-8 py-3 rounded-2xl text-xs uppercase tracking-widest">
            Dalej →
          </button>
        ) : (
          <button disabled={loading} onClick={handleSubmit}
            className="bg-slate-900 hover:bg-slate-700 disabled:opacity-50 text-white font-black px-8 py-3 rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl">
            {loading ? 'Wysyłanie...' : <><CheckCircle2 size={14} /> Złóż zgłoszenie</>}
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
