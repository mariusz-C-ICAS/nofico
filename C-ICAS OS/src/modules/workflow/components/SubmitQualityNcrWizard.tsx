import React, { useState, useRef } from 'react';
import {
  ClipboardList, Mic, MicOff, Loader2, CheckCircle2, AlertTriangle, AlertOctagon,
} from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { createDocumentInstance, transitionDocument } from '../services/workflowEngine';
import { startRecording, stopRecording, transcribeAudio } from '../services/voiceNoteService';

interface Props { onComplete: (docId: string) => void; onCancel: () => void; }
type Step = 'detection' | 'analysis' | 'review';
type NcrSeverity = 'critical' | 'major' | 'minor' | 'observation';

const SEV: Record<NcrSeverity, { label: string; color: string; desc: string }> = {
  critical: { label: 'Krytyczna', color: 'bg-red-50 border-red-400 text-red-700', desc: 'Bezpośrednie zagrożenie bezpieczeństwa lub środowiska' },
  major: { label: 'Poważna', color: 'bg-orange-50 border-orange-400 text-orange-700', desc: 'Znaczące odchylenie od wymagań, ryzyko reklamacji' },
  minor: { label: 'Nieznaczna', color: 'bg-amber-50 border-amber-300 text-amber-700', desc: 'Nieznaczne odchylenie, istnieje obejście problemu' },
  observation: { label: 'Obserwacja', color: 'bg-slate-50 border-slate-300 text-slate-600', desc: 'Słaba praktyka, potencjalne ryzyko w przyszłości' },
};

const NCR_TYPES = [
  'Wada produktu / wyrobu',
  'Niezgodność procesu',
  'Materiał niezgodny ze specyfikacją',
  'Niezgodność dostawcy',
  'Brak dokumentacji',
  'Wyposażenie pomiarowe poza kalibracją',
  'Niezgodność środowiskowa',
  'Inne',
];

export default function SubmitQualityNcrWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const [step, setStep] = useState<Step>('detection');
  const [severity, setSeverity] = useState<NcrSeverity>('major');
  const [ncrType, setNcrType] = useState(NCR_TYPES[0]);
  const [title, setTitle] = useState('');
  const [processArea, setProcessArea] = useState('');
  const [detectedBy, setDetectedBy] = useState('');
  const [description, setDescription] = useState('');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [immediateAction, setImmediateAction] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const order: Step[] = ['detection', 'analysis', 'review'];
  const stepIndex = order.indexOf(step);
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const startRec = async () => {
    try {
      await startRecording();
      setRecording(true); setRecSeconds(0);
      timerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000);
    } catch { alert('Brak dostępu do mikrofonu'); }
  };

  const stopRec = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false); setTranscribing(true);
    try {
      const blob = await stopRecording();
      const text = await transcribeAudio(blob, activeTenantId ?? '');
      setVoiceTranscript(v => (v ? v + '\n' : '') + text);
    } catch { } finally { setTranscribing(false); }
  };

  const canProceed = () => {
    if (step === 'detection') return title.trim() && processArea.trim() && description.trim();
    return true;
  };

  const combinedDesc = [description, voiceTranscript].filter(Boolean).join('\n\n--- Notatka głosowa ---\n');

  const handleSubmit = async () => {
    if (!user || !activeTenantId) return;
    setLoading(true); setError('');
    try {
      const docId = await createDocumentInstance(activeTenantId, user.uid, user.email ?? '', 'QUALITY_NCR', 'default-ncr', {
        title: title.trim(),
        ncrSeverity: severity,
        ncrProcessArea: processArea.trim(),
        description: combinedDesc,
        ncrResponsiblePerson: detectedBy.trim() || undefined,
        immediateAction: immediateAction.trim() || undefined,
        rootCause: rootCause.trim() || undefined,
      });
      await transitionDocument(activeTenantId, docId, 'SUBMIT', user.uid, user.email ?? '', 'PENDING_APPROVAL',
        { stepType: 'APPROVAL', note: `NCR [${severity.toUpperCase()}] — ${ncrType} w obszarze ${processArea}. Wymaga zatwierdzenia i przypisania odpowiedzialności.` });
      onComplete(docId);
    } catch (e: any) { setError(e.message ?? 'Błąd wysyłania.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div>
        <button onClick={onCancel} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 mb-4 block">← Anuluj</button>
        <div className="flex items-center gap-3 mb-1">
          <ClipboardList size={20} className="text-yellow-600" />
          <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Karta Niezgodności (NCR)</h3>
        </div>
        <p className="text-slate-400 text-sm font-medium">Niezgodność jakościowa — ISO 9001, produkcja, budownictwo, usługi.</p>
      </div>

      <div className="flex gap-1">
        {order.map((s, i) => (
          <div key={s} className="flex-1 flex flex-col gap-1">
            <div className={`h-1 rounded-full ${i <= stepIndex ? 'bg-yellow-500' : 'bg-slate-200'}`} />
            <span className={`text-[9px] font-black uppercase tracking-widest ${s === step ? 'text-yellow-600' : 'text-slate-400'}`}>
              {s === 'detection' ? 'Wykrycie' : s === 'analysis' ? 'Analiza' : 'Wyślij'}
            </span>
          </div>
        ))}
      </div>

      {step === 'detection' && (
        <div className="space-y-5">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Dotkliwość niezgodności</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(SEV) as [NcrSeverity, typeof SEV[NcrSeverity]][]).map(([sev, meta]) => (
                <button key={sev} onClick={() => setSeverity(sev)}
                  className={`p-3 rounded-2xl border text-left transition-all ${severity === sev ? meta.color + ' ring-2 ring-current' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    {sev === 'critical' && <AlertOctagon size={10} />}
                    <p className="text-xs font-black">{meta.label}</p>
                  </div>
                  <p className="text-[9px] leading-snug">{meta.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Typ niezgodności</label>
            <select value={ncrType} onChange={e => setNcrType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-yellow-500 outline-none">
              {NCR_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tytuł / opis skrócony *</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="np. Niezgodność wymiarowa partii profili aluminiowych #A2026-44"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-yellow-500 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Obszar procesu *</label>
              <input value={processArea} onChange={e => setProcessArea(e.target.value)}
                placeholder="Magazyn wejścia, Produkcja — linia 3"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-yellow-500 outline-none" />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Wykryte przez</label>
              <input value={detectedBy} onChange={e => setDetectedBy(e.target.value)}
                placeholder="Anna Kowalska — QC"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-yellow-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Opis niezgodności *</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4}
              placeholder="Co konkretnie jest niezgodne, jakie są wymogi, ile sztuk/partii dotyczy..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm resize-none focus:ring-2 focus:ring-yellow-500 outline-none" />
          </div>
        </div>
      )}

      {step === 'analysis' && (
        <div className="space-y-5">
          <div className="bg-yellow-50 rounded-[2rem] p-5 border border-yellow-100 space-y-3">
            <p className="text-[9px] font-black text-yellow-700 uppercase tracking-widest flex items-center gap-1.5"><Mic size={10} /> Notatka głosowa — opis z miejsca wykrycia</p>
            <div className="flex items-center gap-3">
              <button onClick={recording ? stopRec : startRec} disabled={transcribing}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg ${recording ? 'bg-red-500 animate-pulse' : 'bg-yellow-500 hover:bg-yellow-600'}`}>
                {transcribing ? <Loader2 size={18} className="text-white animate-spin" /> : recording ? <MicOff size={18} className="text-white" /> : <Mic size={18} className="text-white" />}
              </button>
              <div>
                {recording && <p className="text-xs font-black text-red-600 animate-pulse">Nagrywam… {fmt(recSeconds)}</p>}
                {transcribing && <p className="text-xs font-bold text-yellow-600">Whisper AI transkrybuje…</p>}
                {!recording && !transcribing && <p className="text-[10px] text-yellow-600 font-bold">Opisz niezgodność głosowo z miejsca wykrycia</p>}
              </div>
            </div>
            {voiceTranscript && <div className="bg-white rounded-2xl p-3 border border-yellow-100"><p className="text-xs text-slate-800">{voiceTranscript}</p></div>}
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Działania natychmiastowe (containment)</label>
            <textarea value={immediateAction} onChange={e => setImmediateAction(e.target.value)} rows={3}
              placeholder="Wstrzymanie produkcji, kwarantanna partii, powiadomienie klienta..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm resize-none focus:ring-2 focus:ring-yellow-500 outline-none" />
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Wstępna analiza przyczyny (opcjonalnie)</label>
            <textarea value={rootCause} onChange={e => setRootCause(e.target.value)} rows={3}
              placeholder="Błąd nastawienia maszyny, zmiana dostawcy surowca, brak szkolenia operatora..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm resize-none focus:ring-2 focus:ring-yellow-500 outline-none" />
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-4">
          <div className={`rounded-[2rem] p-4 border-2 ${SEV[severity].color}`}>
            <p className="text-xs font-black uppercase">{SEV[severity].label} — {ncrType}</p>
          </div>
          <div className="bg-slate-50 rounded-[2rem] p-6 space-y-3">
            <Row label="Tytuł" value={title} />
            <Row label="Obszar" value={processArea} />
            {detectedBy && <Row label="Wykryte przez" value={detectedBy} />}
          </div>
          <div className="bg-yellow-50 rounded-[2rem] p-4 border border-yellow-100">
            <p className="text-[10px] text-yellow-700 font-bold">NCR trafi do menedżera jakości. Po zatwierdzeniu (APPROVED) zostanie otwarta karta CAPA i przypisana osoba odpowiedzialna. Weryfikacja zamknie NCR.</p>
          </div>
          {error && <p className="text-red-600 text-xs font-bold flex items-center gap-1.5"><AlertTriangle size={12} />{error}</p>}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button onClick={() => { const i = order.indexOf(step); i > 0 ? setStep(order[i - 1]) : onCancel(); }}
          className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600">
          ← {step === 'detection' ? 'Anuluj' : 'Wstecz'}
        </button>
        {step !== 'review' ? (
          <button disabled={!canProceed()} onClick={() => setStep(order[order.indexOf(step) + 1])}
            className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-40 text-white font-black px-8 py-3 rounded-2xl text-xs uppercase tracking-widest">Dalej →</button>
        ) : (
          <button disabled={loading} onClick={handleSubmit}
            className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white font-black px-8 py-3 rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-yellow-500/20">
            {loading ? 'Wysyłanie...' : <><CheckCircle2 size={14} /> Otwórz NCR</>}
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
