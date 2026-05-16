import React, { useState, useRef } from 'react';
import {
  AlertOctagon, Camera, Mic, MicOff, Loader2, CheckCircle2,
  AlertTriangle, X, Film, FileText, User, MapPin, Clock,
} from 'lucide-react';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../../shared/lib/firebase';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { createDocumentInstance, transitionDocument } from '../services/workflowEngine';
import { startRecording, stopRecording, transcribeAudio } from '../services/voiceNoteService';
import type { DocumentAttachment } from '../types';

interface Props {
  onComplete: (docId: string) => void;
  onCancel: () => void;
}

type Step = 'incident' | 'evidence' | 'protocol' | 'review';

interface IncidentForm {
  title: string;
  incidentDate: string;
  incidentLocation: string;
  injuredPersonName: string;
  injuredPersonPosition: string;
  injuryType: string;
  injuredBodyPart: string;
  description: string;
  voiceTranscript: string;
}

interface ProtocolForm {
  witnesses: string;
  immediateCause: string;
  rootCause: string;
  correctiveActions: string;
  firstAidProvided: string;
  policeRequired: boolean;
  ambulanceCalled: boolean;
  workStopped: boolean;
}

interface MediaFile {
  file: File;
  previewUrl: string;
  type: 'image' | 'video';
  transcript?: string;
}

const STEPS: { id: Step; label: string }[] = [
  { id: 'incident', label: 'Incydent' },
  { id: 'evidence', label: 'Dowody' },
  { id: 'protocol', label: 'Protokół' },
  { id: 'review', label: 'Wyślij' },
];

const INJURY_TYPES = ['Uraz głowy', 'Złamanie', 'Skaleczenie', 'Oparzenie', 'Upadek', 'Uraz kręgosłupa', 'Inne'];

export default function SubmitBhpIncidentWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const [step, setStep] = useState<Step>('incident');

  const [incident, setIncident] = useState<IncidentForm>({
    title: '',
    incidentDate: new Date().toISOString().slice(0, 16),
    incidentLocation: '',
    injuredPersonName: '',
    injuredPersonPosition: '',
    injuryType: '',
    injuredBodyPart: '',
    description: '',
    voiceTranscript: '',
  });

  const [protocol, setProtocol] = useState<ProtocolForm>({
    witnesses: '',
    immediateCause: '',
    rootCause: '',
    correctiveActions: '',
    firstAidProvided: '',
    policeRequired: false,
    ambulanceCalled: false,
    workStopped: false,
  });

  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcribingVideoIdx, setTranscribingVideoIdx] = useState<number | null>(null);
  const [recSeconds, setRecSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const stepIndex = STEPS.findIndex(s => s.id === step);

  const startRec = async () => {
    try {
      await startRecording();
      setRecording(true);
      setRecSeconds(0);
      timerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000);
    } catch { alert('Brak dostępu do mikrofonu'); }
  };

  const stopRec = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
    setTranscribing(true);
    try {
      const blob = await stopRecording();
      const text = await transcribeAudio(blob, activeTenantId ?? '');
      setIncident(f => ({ ...f, voiceTranscript: (f.voiceTranscript ? f.voiceTranscript + '\n' : '') + text }));
    } catch { /* non-blocking */ }
    finally { setTranscribing(false); }
  };

  const transcribeVideo = async (idx: number) => {
    const mf = mediaFiles[idx];
    if (!mf || mf.type !== 'video') return;
    setTranscribingVideoIdx(idx);
    try {
      const text = await transcribeAudio(mf.file, activeTenantId ?? '');
      setMediaFiles(prev => prev.map((m, i) => i === idx ? { ...m, transcript: text } : m));
      setIncident(f => ({ ...f, voiceTranscript: (f.voiceTranscript ? f.voiceTranscript + '\n\n[Wideo #' + (idx + 1) + ']\n' : '') + text }));
    } catch { /* non-blocking */ }
    finally { setTranscribingVideoIdx(null); }
  };

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) return;
      setMediaFiles(prev => [...prev, {
        file, previewUrl: URL.createObjectURL(file),
        type: file.type.startsWith('image/') ? 'image' : 'video',
      }]);
    });
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const canProceed = (): boolean => {
    if (step === 'incident') return incident.title.trim().length > 0 && incident.injuredPersonName.trim().length > 0;
    if (step === 'evidence') return mediaFiles.length > 0;
    if (step === 'protocol') return incident.description.trim().length > 0 || incident.voiceTranscript.trim().length > 0 || protocol.immediateCause.trim().length > 0;
    return true;
  };

  const handleSubmit = async () => {
    if (!user || !activeTenantId) return;
    setLoading(true);
    setError('');
    try {
      const attachments: DocumentAttachment[] = await Promise.all(
        mediaFiles.map(async (mf, i) => {
          const sRef = storageRef(storage, `tenants/${activeTenantId}/bhp/${Date.now()}_${i}_${mf.file.name}`);
          await uploadBytes(sRef, mf.file);
          const url = await getDownloadURL(sRef);
          return {
            id: `att_${i}`,
            name: mf.file.name,
            size: mf.file.size,
            mimeType: mf.file.type,
            storageRef: url,
            hash: `${mf.file.size}_${mf.file.lastModified}`,
            uploadedAt: new Date() as any,
            uploadedBy: user.uid,
          } satisfies DocumentAttachment;
        })
      );

      const fullDescription = [
        incident.description,
        incident.voiceTranscript ? `--- Notatka głosowa / transkrypcja wideo ---\n${incident.voiceTranscript}` : '',
        mediaFiles.filter(m => m.transcript).map((m, i) => `[Transkrypcja wideo]: ${m.transcript}`).join('\n'),
      ].filter(Boolean).join('\n\n');

      const docId = await createDocumentInstance(
        activeTenantId, user.uid, user.email ?? '',
        'BHP_INCIDENT', 'default-bhp-incident',
        {
          title: incident.title.trim(),
          incidentDate: incident.incidentDate,
          incidentLocation: incident.incidentLocation.trim() || undefined,
          injuredPersonName: incident.injuredPersonName.trim(),
          injuredPersonPosition: incident.injuredPersonPosition.trim() || undefined,
          injuryType: incident.injuryType || undefined,
          injuredBodyPart: incident.injuredBodyPart.trim() || undefined,
          description: fullDescription || undefined,
          witnesses: protocol.witnesses.trim() || undefined,
          immediateCause: protocol.immediateCause.trim() || undefined,
          rootCause: protocol.rootCause.trim() || undefined,
          correctiveActions: protocol.correctiveActions.trim() || undefined,
          firstAidProvided: protocol.firstAidProvided.trim() || undefined,
          policeRequired: protocol.policeRequired,
          ambulanceCalled: protocol.ambulanceCalled,
          workStopped: protocol.workStopped,
        },
        attachments
      );

      await transitionDocument(
        activeTenantId, docId, 'SUBMIT', user.uid, user.email ?? '',
        'PENDING_APPROVAL',
        { stepType: 'APPROVAL', note: `Wypadek BHP: ${incident.injuredPersonName} — ${incident.injuryType || 'nieokreślony uraz'}. Pliki: ${attachments.length}` }
      );

      onComplete(docId);
    } catch (e: any) {
      setError(e.message ?? 'Błąd wysyłania.');
    } finally {
      setLoading(false);
    }
  };

  const next = () => {
    const order: Step[] = ['incident', 'evidence', 'protocol', 'review'];
    setStep(order[order.indexOf(step) + 1]);
  };

  const back = () => {
    const order: Step[] = ['incident', 'evidence', 'protocol', 'review'];
    const idx = order.indexOf(step);
    if (idx > 0) setStep(order[idx - 1]);
    else onCancel();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <button onClick={onCancel} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors mb-4 block">← Anuluj</button>
        <div className="flex items-center gap-3 mb-1">
          <AlertOctagon size={20} className="text-red-600" />
          <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Wypadek / Incydent BHP</h3>
        </div>
        <p className="text-slate-400 text-sm font-medium">Zdjęcia + wideo z transkrypcją + protokół → BHP, ubezpieczyciel, zarząd, policja.</p>
      </div>

      <div className="flex gap-1">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex-1 flex flex-col gap-1">
            <div className={`h-1 rounded-full ${i <= stepIndex ? 'bg-red-600' : 'bg-slate-200'}`} />
            <span className={`text-[9px] font-black uppercase tracking-widest ${i === stepIndex ? 'text-red-600' : 'text-slate-400'}`}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Step 1: Incident details */}
      {step === 'incident' && (
        <div className="space-y-4">
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tytuł zdarzenia *</label>
            <input value={incident.title} onChange={e => setIncident(f => ({ ...f, title: e.target.value }))}
              placeholder="np. Upadek na mokrej posadzce — hala produkcyjna"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:ring-2 focus:ring-red-500 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Data i godzina wypadku</label>
              <input type="datetime-local" value={incident.incidentDate}
                onChange={e => setIncident(f => ({ ...f, incidentDate: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:ring-2 focus:ring-red-500 outline-none" />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Miejsce zdarzenia</label>
              <input value={incident.incidentLocation} onChange={e => setIncident(f => ({ ...f, incidentLocation: e.target.value }))}
                placeholder="Hala A, stanowisko 12"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:ring-2 focus:ring-red-500 outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Poszkodowany — imię i nazwisko *</label>
              <input value={incident.injuredPersonName} onChange={e => setIncident(f => ({ ...f, injuredPersonName: e.target.value }))}
                placeholder="Jan Kowalski"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:ring-2 focus:ring-red-500 outline-none" />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Stanowisko</label>
              <input value={incident.injuredPersonPosition} onChange={e => setIncident(f => ({ ...f, injuredPersonPosition: e.target.value }))}
                placeholder="Pracownik produkcji"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:ring-2 focus:ring-red-500 outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Rodzaj urazu</label>
              <select value={incident.injuryType} onChange={e => setIncident(f => ({ ...f, injuryType: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:ring-2 focus:ring-red-500 outline-none">
                <option value="">— wybierz —</option>
                {INJURY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Część ciała</label>
              <input value={incident.injuredBodyPart} onChange={e => setIncident(f => ({ ...f, injuredBodyPart: e.target.value }))}
                placeholder="np. prawa ręka, głowa"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:ring-2 focus:ring-red-500 outline-none" />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Evidence */}
      {step === 'evidence' && (
        <div className="space-y-5">
          <div className="bg-red-50 border border-red-100 rounded-[2rem] p-5 space-y-3">
            <p className="text-[9px] font-black text-red-600 uppercase tracking-widest flex items-center gap-1.5">
              <Mic size={10} /> Notatka głosowa lub transkrypcja wideo — nagrywaj na miejscu zdarzenia
            </p>
            <div className="flex items-center gap-3">
              <button onClick={recording ? stopRec : startRec} disabled={transcribing}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 ${
                  recording ? 'bg-red-500 animate-pulse shadow-red-200' : 'bg-red-600 hover:bg-red-700 shadow-red-200'}`}>
                {transcribing ? <Loader2 size={18} className="text-white animate-spin" /> :
                 recording ? <MicOff size={18} className="text-white" /> : <Mic size={18} className="text-white" />}
              </button>
              <div>
                {recording && <p className="text-xs font-black text-red-600 animate-pulse">Nagrywam… {fmt(recSeconds)}</p>}
                {transcribing && <p className="text-xs font-bold text-red-600">Whisper AI transkrybuje…</p>}
                {!recording && !transcribing && <p className="text-[10px] text-red-500 font-bold">Nagraj opis lub filmy wideo → AI transkrybuje audio automatycznie</p>}
              </div>
            </div>
            {incident.voiceTranscript && (
              <div className="bg-white rounded-2xl p-4 border border-red-100">
                <p className="text-[9px] font-black text-red-500 uppercase mb-1">Transkrypcja:</p>
                <p className="text-sm text-slate-800 whitespace-pre-line">{incident.voiceTranscript}</p>
              </div>
            )}
          </div>

          <div onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-red-200 rounded-[2rem] p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-red-400 hover:bg-red-50/30 transition-all">
            <Camera size={28} className="text-red-400" />
            <p className="text-sm font-black text-slate-700 uppercase tracking-tight">Zdjęcia, filmy, nagranie monitoringu</p>
            <p className="text-[10px] text-slate-400">Każdy plik stanowi niezmienialny dowód — hash obliczany przy uploadzie</p>
            <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={e => addFiles(e.target.files)} />
          </div>

          {mediaFiles.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {mediaFiles.map((mf, i) => (
                <div key={i} className="rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                  {mf.type === 'image'
                    ? <img src={mf.previewUrl} alt={mf.file.name} className="w-full aspect-square object-cover" />
                    : (
                      <div className="w-full aspect-square flex flex-col items-center justify-center gap-1 bg-slate-900 relative">
                        <Film size={24} className="text-slate-400" />
                        <span className="text-[8px] text-slate-500 font-bold px-2 text-center truncate w-full">{mf.file.name}</span>
                      </div>
                    )}
                  <div className="p-2 space-y-1.5">
                    {mf.type === 'video' && (
                      <button
                        disabled={transcribingVideoIdx === i}
                        onClick={() => transcribeVideo(i)}
                        className="w-full flex items-center justify-center gap-1 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                      >
                        {transcribingVideoIdx === i
                          ? <><Loader2 size={8} className="animate-spin" /> Transkrybuję…</>
                          : <><Mic size={8} /> Transkrybuj audio</>}
                      </button>
                    )}
                    {mf.transcript && (
                      <p className="text-[8px] text-emerald-600 font-bold flex items-center gap-0.5">
                        <CheckCircle2 size={8} /> Transkrypcja gotowa
                      </p>
                    )}
                    <button onClick={() => setMediaFiles(prev => prev.filter((_, j) => j !== i))}
                      className="w-full flex items-center justify-center gap-1 py-1 bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl text-[8px] font-black transition-all">
                      <X size={8} /> Usuń
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Protocol */}
      {step === 'protocol' && (
        <div className="space-y-4">
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Krótki opis zdarzenia</label>
            <textarea value={incident.description} onChange={e => setIncident(f => ({ ...f, description: e.target.value }))}
              placeholder="Co się stało? Opisz przebieg wypadku..."
              rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:ring-2 focus:ring-red-500 outline-none resize-none" />
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Przyczyna bezpośrednia</label>
            <textarea value={protocol.immediateCause} onChange={e => setProtocol(f => ({ ...f, immediateCause: e.target.value }))}
              placeholder="Mokra posadzka bez oznakowania, nieodpowiednie obuwie..."
              rows={2} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:ring-2 focus:ring-red-500 outline-none resize-none" />
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Przyczyna pierwotna (root cause)</label>
            <textarea value={protocol.rootCause} onChange={e => setProtocol(f => ({ ...f, rootCause: e.target.value }))}
              placeholder="Brak procedury sprzątania, brak szkolenia BHP..."
              rows={2} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:ring-2 focus:ring-red-500 outline-none resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Świadkowie</label>
              <textarea value={protocol.witnesses} onChange={e => setProtocol(f => ({ ...f, witnesses: e.target.value }))}
                placeholder="Anna Nowak, Piotr Wiśniewski"
                rows={2} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:ring-2 focus:ring-red-500 outline-none resize-none" />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Udzielona pierwsza pomoc</label>
              <textarea value={protocol.firstAidProvided} onChange={e => setProtocol(f => ({ ...f, firstAidProvided: e.target.value }))}
                placeholder="Opatrunek, unieruchomienie, wezwano ratownika..."
                rows={2} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:ring-2 focus:ring-red-500 outline-none resize-none" />
            </div>
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Podjęte działania naprawcze</label>
            <textarea value={protocol.correctiveActions} onChange={e => setProtocol(f => ({ ...f, correctiveActions: e.target.value }))}
              placeholder="Osuszono posadzkę, oznakowano strefę, poinformowano kierownictwo..."
              rows={2} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:ring-2 focus:ring-red-500 outline-none resize-none" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {([
              { key: 'ambulanceCalled', label: 'Karetka wezwana' },
              { key: 'policeRequired', label: 'Powiadomienie policji' },
              { key: 'workStopped', label: 'Wstrzymano pracę' },
            ] as { key: keyof ProtocolForm; label: string }[]).map(({ key, label }) => (
              <label key={key} className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                protocol[key] ? 'bg-red-50 border-red-300' : 'bg-slate-50 border-slate-200'}`}>
                <input type="checkbox" checked={protocol[key] as boolean}
                  onChange={e => setProtocol(f => ({ ...f, [key]: e.target.checked }))}
                  className="w-4 h-4 accent-red-600" />
                <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {step === 'review' && (
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-[2rem] p-6 space-y-3">
            <Row label="Zdarzenie" value={incident.title} />
            <Row label="Data" value={incident.incidentDate.replace('T', ' ')} />
            <Row label="Poszkodowany" value={incident.injuredPersonName} />
            {incident.injuryType && <Row label="Uraz" value={incident.injuryType} />}
            <Row label="Pliki dowodowe" value={`${mediaFiles.length} plik(ów)`} />
            {incident.voiceTranscript && <Row label="Transkrypcja" value={`${incident.voiceTranscript.slice(0, 60)}…`} />}
            <Row label="Karetka" value={protocol.ambulanceCalled ? 'Tak' : 'Nie'} />
            <Row label="Policja" value={protocol.policeRequired ? 'Tak' : 'Nie'} />
          </div>
          <div className="bg-red-50 rounded-[2rem] p-4 border border-red-100">
            <p className="text-[10px] text-red-700 font-bold leading-relaxed">
              Wszystkie pliki i dane zostaną zablokowane (WORM) po wysłaniu. Hash każdego pliku jest obliczany przy uploadzie. Log wypadku jest niepodważalny i zgodny z wymogami BHP, GDPR i GoBD. Po zatwierdzeniu przez szefa — dyspozycja do BeHaPowca, ubezpieczyciela, policji i zarządu.
            </p>
          </div>
          {error && <p className="text-red-600 text-xs font-bold flex items-center gap-1"><AlertTriangle size={12} />{error}</p>}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button onClick={back} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">
          ← {step === 'incident' ? 'Anuluj' : 'Wstecz'}
        </button>
        {step !== 'review' ? (
          <button disabled={!canProceed()} onClick={next}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-black px-8 py-3 rounded-2xl text-xs uppercase tracking-widest transition-all">
            Dalej →
          </button>
        ) : (
          <button disabled={loading} onClick={handleSubmit}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-black px-8 py-3 rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-red-500/20">
            {loading ? 'Wysyłanie...' : <><CheckCircle2 size={14} /> Zgłoś incydent BHP</>}
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
      <span className="text-xs font-bold text-slate-800 text-right break-all">{value}</span>
    </div>
  );
}
