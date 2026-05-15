import React, { useState } from 'react';
import { Banknote, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { createDocumentInstance, transitionDocument } from '../services/workflowEngine';

interface Props { onComplete: (docId: string) => void; onCancel: () => void; }
type Step = 'request' | 'review';
type AdvancePurpose = 'trip' | 'purchase' | 'training' | 'client_entertainment' | 'other';

const PURPOSE_LABELS: Record<AdvancePurpose, string> = {
  trip: 'Podróż służbowa',
  purchase: 'Zakupy materiałów',
  training: 'Szkolenie / konferencja',
  client_entertainment: 'Reprezentacja klienta',
  other: 'Inne',
};

export default function SubmitExpenseAdvanceWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const [step, setStep] = useState<Step>('request');
  const [purpose, setPurpose] = useState<AdvancePurpose>('trip');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('PLN');
  const [projectId, setProjectId] = useState('');
  const [settlementDate, setSettlementDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canProceed = title.trim().length > 0 && parseFloat(amount) > 0 && settlementDate;

  const handleSubmit = async () => {
    if (!user || !activeTenantId) return;
    setLoading(true); setError('');
    try {
      const docId = await createDocumentInstance(
        activeTenantId, user.uid, user.email ?? '', 'EXPENSE_ADVANCE', 'default-advance',
        {
          title: title.trim(),
          amount: parseFloat(amount),
          currency,
          advancePurpose: PURPOSE_LABELS[purpose],
          projectId: projectId.trim() || undefined,
          advanceExpectedSettlementDate: settlementDate,
          description: notes.trim() || undefined,
        }
      );
      await transitionDocument(activeTenantId, docId, 'SUBMIT', user.uid, user.email ?? '', 'PENDING_APPROVAL',
        { stepType: 'APPROVAL', note: `Wniosek o zaliczkę ${amount} ${currency} — ${PURPOSE_LABELS[purpose]}. Rozliczenie do: ${settlementDate}.` });
      onComplete(docId);
    } catch (e: any) { setError(e.message ?? 'Błąd wysyłania.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div>
        <button onClick={onCancel} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 mb-4 block">← Anuluj</button>
        <div className="flex items-center gap-3 mb-1">
          <Banknote size={20} className="text-green-600" />
          <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Zaliczka pracownicza</h3>
        </div>
        <p className="text-slate-400 text-sm font-medium">Wniosek o przedpłatę przed podróżą lub zakupem. Rozliczenie po fakcie.</p>
      </div>

      <div className="flex gap-1">
        {(['request', 'review'] as Step[]).map((s, i) => (
          <div key={s} className="flex-1 flex flex-col gap-1">
            <div className={`h-1 rounded-full ${i <= (['request', 'review'] as Step[]).indexOf(step) ? 'bg-green-600' : 'bg-slate-200'}`} />
            <span className={`text-[9px] font-black uppercase tracking-widest ${s === step ? 'text-green-600' : 'text-slate-400'}`}>
              {s === 'request' ? 'Wniosek' : 'Wyślij'}
            </span>
          </div>
        ))}
      </div>

      {step === 'request' && (
        <div className="space-y-5">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Cel zaliczki</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(PURPOSE_LABELS) as AdvancePurpose[]).map(p => (
                <button key={p} onClick={() => setPurpose(p)}
                  className={`p-3 rounded-2xl border text-xs font-black text-left transition-all ${purpose === p ? 'bg-green-50 border-green-400 text-green-700 ring-2 ring-green-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                  {PURPOSE_LABELS[p]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tytuł wniosku *</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="np. Zaliczka na wyjazd do Berlina — szkolenie SAP"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Kwota *</label>
              <input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="1500.00"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Waluta</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-sm focus:ring-2 focus:ring-green-500 outline-none">
                {['PLN', 'EUR', 'USD', 'GBP', 'CHF'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Rozliczenie do *</label>
              <input type="date" value={settlementDate} onChange={e => setSettlementDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">ID projektu</label>
              <input value={projectId} onChange={e => setProjectId(e.target.value)}
                placeholder="PROJ-2026-042"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Uzasadnienie (opcjonalnie)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="Cel wyjazdu, lista planowanych wydatków..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm resize-none focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-[2rem] p-6 space-y-3">
            <Row label="Tytuł" value={title} />
            <Row label="Cel" value={PURPOSE_LABELS[purpose]} />
            <Row label="Kwota" value={`${parseFloat(amount).toFixed(2)} ${currency}`} />
            <Row label="Rozliczenie do" value={settlementDate} />
            {projectId && <Row label="Projekt" value={projectId} />}
          </div>
          <div className="bg-green-50 rounded-[2rem] p-4 border border-green-100">
            <p className="text-[10px] text-green-700 font-bold">
              Po zatwierdzeniu przez menedżera, dział FI wyda zaliczkę. Pracownik rozlicza się składając wydatki jako OUT_OF_POCKET do daty rozliczenia.
            </p>
          </div>
          {error && <p className="text-red-600 text-xs font-bold flex items-center gap-1.5"><AlertTriangle size={12} />{error}</p>}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button onClick={() => step === 'request' ? onCancel() : setStep('request')}
          className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600">
          ← {step === 'request' ? 'Anuluj' : 'Wstecz'}
        </button>
        {step === 'request' ? (
          <button disabled={!canProceed} onClick={() => setStep('review')}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-black px-8 py-3 rounded-2xl text-xs uppercase tracking-widest">
            Dalej →
          </button>
        ) : (
          <button disabled={loading} onClick={handleSubmit}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-black px-8 py-3 rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-green-500/20">
            {loading ? 'Wysyłanie...' : <><CheckCircle2 size={14} /> Złóż wniosek</>}
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
