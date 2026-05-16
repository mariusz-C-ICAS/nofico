import React, { useState, useRef } from 'react';
import {
  ShieldAlert, Camera, Mic, MicOff, Loader2, CheckCircle2,
  AlertTriangle, X, Film, Volume2,
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

type Step = 'damage' | 'evidence' | 'review';

interface FormData {
  title: string;
  projectId: string;
  location: string;
  description: string;
  voiceTranscript: string;
}

interface MediaFile {
  file: File;
  previewUrl: string;
  type: 'image' | 'video';
  transcript?: string;
}

const STEPS: { id: Step; label: string }[] = [
  { id: 'damage', label: 'Opis szkody' },
  { id: 'evidence', label: 'Dokumentacja' },
  { id: 'review', label: 'Wyślij' },
];

export default function SubmitDamageClaimWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const [step, setStep] = useState<Step>('damage');
  const [form, setForm] = useState<FormData>({
    title: '',
    projectId: '',
    location: '',
    description: '',
    voiceTranscript: '',
  });
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [transcribingVideoIdx, setTranscribingVideoIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const stepIndex = STEPS.findIndex(s => s.id === step);
  const combinedDescription = [form.description, form.voiceTranscript].filter(Boolean).join('\n\n--- Notatka głosowa ---\n');

  const startRec = async () => {
    try {
      await startRecording();
      setRecording(true);
      setRecSeconds(0);
      timerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000);
    } catch {
      alert('Brak dostępu do mikrofonu');
    }
  };

  const stopRec = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
    setTranscribing(true);
    try {
      const blob = await stopRecording();
      const text = await transcribeAudio(blob, activeTenantId ?? '');
      setForm(f => ({ ...f, voiceTranscript: (f.voiceTranscript ? f.voiceTranscript + '\n' : '') + text }));
    } catch {
      /* non-blocking */
    } finally {
      setTranscribing(false);
    }
  };

  const transcribeVideo = async (idx: number) => {
    const mf = mediaFiles[idx];
    if (!mf || mf.type !== 'video') return;
    setTranscribingVideoIdx(idx);
    try {
      const text = await transcribeAudio(mf.file, activeTenantId ?? '');
      setMediaFiles(prev => prev.map((m, i) => i === idx ? { ...m, transcript: text } : m));
      setForm(f => ({ ...f, voiceTranscript: (f.voiceTranscript ? f.voiceTranscript + '\n\n[Wideo #' + (idx + 1) + ']\n' : '') + text }));
    } catch { /* non-blocking */ }
    finally { setTranscribingVideoIdx(null); }
  };

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) return;
      setMediaFiles(prev => [...prev, {
        file,
        previewUrl: URL.createObjectURL(file),
        type: file.type.startsWith('image/') ? 'image' : 'video',
      }]);
    });
  };

  const canProceed = (): boolean => {
    if (step === 'damage') return form.title.trim().length > 0 && (form.description.trim().length > 0 || form.voiceTranscript.trim().length > 0);
    if (step === 'evidence') return mediaFiles.length > 0;
    return true;
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const handleSubmit = async () => {
    if (!user || !activeTenantId) return;
    setLoading(true);
    setError('');
    try {
      const attachments: DocumentAttachment[] = await Promise.all(
        mediaFiles.map(async (mf, i) => {
          const sRef = storageRef(storage, `tenants/${activeTenantId}/attachments/${Date.now()}_${i}_${mf.file.name}`);
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

      const docId = await createDocumentInstance(
        activeTenantId,
        user.uid,
        user.email ?? '',
        'DAMAGE_CLAIM',
        'default-damage-claim',
        {
          title: form.title.trim(),
          projectId: form.projectId.trim() || undefined,
          description: combinedDescription,
        },
        attachments
      );

      await transitionDocument(
        activeTenantId,
        docId,
        'SUBMIT',
        user.uid,
        user.email ?? '',
        'PENDING_APPROVAL',
        { stepType: 'APPROVAL', note: 'Zgłoszenie szkody wysłane do zatwierdzenia przez szefa.' }
      );

      onComplete(docId);
    } catch (e: any) {
      setError(e.message ?? 'Błąd wysyłania.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <button onClick={onCancel} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors mb-4 block">
          ← Anuluj
        </button>
        <div className="flex items-center gap-3 mb-1">
          <ShieldAlert size={20} className="text-orange-600" />
          <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Zgłoszenie szkody</h3>
        </div>
        <p className="text-slate-400 text-sm font-medium">Zdjęcia + notatka głosowa z miejsca szkody → szef → backoffice → ubezpieczyciel.</p>
      </div>

      {/* Progress */}
      <div className="flex gap-1">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex-1 flex flex-col gap-1">
            <div className={`h-1 rounded-full transition-all ${i <= stepIndex ? 'bg-orange-600' : 'bg-slate-200'}`} />
            <span className={`text-[9px] font-black uppercase tracking-widest ${i === stepIndex ? 'text-orange-600' : 'text-slate-400'}`}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Step: damage */}
      {step === 'damage' && (
        <div className="space-y-5">
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tytuł szkody *</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="np. Uszkodzenie instalacji elektrycznej — blok A"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">ID projektu</label>
              <input
                value={form.projectId}
                onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}
                placeholder="PROJ-2026-042"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Lokalizacja</label>
              <input
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                placeholder="ul. Budowlana 12, Warszawa"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
          </div>

          {/* Voice recorder inline */}
          <div className="bg-orange-50 rounded-[2rem] p-5 border border-orange-100 space-y-3">
            <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest flex items-center gap-1.5">
              <Mic size={10} /> Notatka głosowa — nagraj opis z miejsca szkody
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={recording ? stopRec : startRec}
                disabled={transcribing}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg flex-shrink-0 ${
                  recording ? 'bg-red-500 animate-pulse shadow-red-200' : 'bg-orange-600 hover:bg-orange-700 shadow-orange-200'
                }`}
              >
                {transcribing ? <Loader2 size={18} className="text-white animate-spin" /> :
                 recording ? <MicOff size={18} className="text-white" /> :
                 <Mic size={18} className="text-white" />}
              </button>
              <div className="flex-1 min-w-0">
                {recording && <p className="text-xs font-black text-red-600 animate-pulse">Nagrywam… {fmt(recSeconds)}</p>}
                {transcribing && <p className="text-xs font-bold text-orange-600">Whisper AI transkrybuje…</p>}
                {!recording && !transcribing && (
                  <p className="text-[10px] text-orange-500 font-bold">Naciśnij → nagraj → tekst pojawi się w opisie poniżej</p>
                )}
              </div>
            </div>
            {form.voiceTranscript && (
              <div className="bg-white rounded-2xl p-4 border border-orange-100">
                <p className="text-[9px] font-black text-orange-500 uppercase mb-1">Transkrypcja:</p>
                <p className="text-sm text-slate-800">{form.voiceTranscript}</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Opis pisemny (opcjonalnie)</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Dodaj opis pisemny lub zostaw samą notatkę głosową..."
              rows={4}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 outline-none resize-none"
            />
          </div>
        </div>
      )}

      {/* Step: evidence */}
      {step === 'evidence' && (
        <div className="space-y-5">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-orange-200 rounded-[2rem] p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-orange-400 hover:bg-orange-50/30 transition-all"
          >
            <Camera size={32} className="text-orange-400" />
            <p className="text-sm font-black text-slate-700 uppercase tracking-tight">Dodaj zdjęcia i filmy ze szkody</p>
            <p className="text-[10px] text-slate-400 font-medium">Każde zdjęcie/film to dowód w roszczeniu — im więcej, tym lepiej</p>
            <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={e => addFiles(e.target.files)} />
          </div>

          {mediaFiles.length > 0 && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {mediaFiles.map((mf, i) => (
                  <div key={i} className="relative group rounded-2xl overflow-hidden bg-slate-100 aspect-square">
                    {mf.type === 'image'
                      ? <img src={mf.previewUrl} alt={mf.file.name} className="w-full h-full object-cover" />
                      : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-2">
                          <Film size={24} className="text-slate-400 flex-shrink-0" />
                          <p className="text-[8px] text-slate-500 font-bold text-center truncate w-full">{mf.file.name}</p>
                          {!mf.transcript && (
                            <button
                              onClick={() => transcribeVideo(i)}
                              disabled={transcribingVideoIdx !== null}
                              className="flex items-center gap-1 px-2 py-1 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg text-[8px] font-black uppercase"
                            >
                              {transcribingVideoIdx === i
                                ? <Loader2 size={8} className="animate-spin" />
                                : <Volume2 size={8} />}
                              {transcribingVideoIdx === i ? 'AI…' : 'Transkrybuj'}
                            </button>
                          )}
                          {mf.transcript && (
                            <span className="text-[8px] text-emerald-600 font-black uppercase">✓ Transkrypcja</span>
                          )}
                        </div>
                      )}
                    <button onClick={() => setMediaFiles(prev => prev.filter((_, j) => j !== i))}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-600 text-white rounded-full items-center justify-center hidden group-hover:flex">
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
              {mediaFiles.some(m => m.transcript) && (
                <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100 space-y-2">
                  <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest">Transkrypcje z wideo:</p>
                  {mediaFiles.map((m, i) => m.transcript ? (
                    <div key={i} className="bg-white rounded-xl p-3 border border-orange-100">
                      <p className="text-[8px] font-black text-orange-400 uppercase mb-1">Wideo #{i + 1}</p>
                      <p className="text-xs text-slate-700">{m.transcript}</p>
                    </div>
                  ) : null)}
                </div>
              )}
            </div>
          )}
          {mediaFiles.length === 0 && (
            <p className="text-xs text-amber-600 font-bold flex items-center gap-1.5"><AlertTriangle size={12} /> Wymagane co najmniej 1 zdjęcie lub film</p>
          )}
        </div>
      )}

      {/* Step: review */}
      {step === 'review' && (
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-[2rem] p-6 space-y-3">
            <Row label="Tytuł" value={form.title} />
            {form.projectId && <Row label="Projekt" value={form.projectId} />}
            {form.location && <Row label="Lokalizacja" value={form.location} />}
            <Row label="Opis" value={combinedDescription.slice(0, 80) + (combinedDescription.length > 80 ? '…' : '')} />
            <Row label="Pliki" value={`${mediaFiles.length} plik(ów) — dowody`} />
          </div>
          <div className="bg-orange-50 rounded-[2rem] p-4 border border-orange-100">
            <p className="text-[10px] text-orange-700 font-bold">Po wysłaniu dokument trafi do szefa. Szef zatwierdzi i skieruje do backoffice który zgłosi szkodę do ubezpieczyciela. Wszystkie dowody zostają w systemie.</p>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-xs font-bold">
              <AlertTriangle size={12} /> {error}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <button
          onClick={() => {
            const order: Step[] = ['damage', 'evidence', 'review'];
            const idx = order.indexOf(step);
            if (idx > 0) setStep(order[idx - 1]);
            else onCancel();
          }}
          className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
        >
          ← {step === 'damage' ? 'Anuluj' : 'Wstecz'}
        </button>

        {step !== 'review' ? (
          <button
            disabled={!canProceed()}
            onClick={() => {
              const order: Step[] = ['damage', 'evidence', 'review'];
              setStep(order[order.indexOf(step) + 1]);
            }}
            className="bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white font-black px-8 py-3 rounded-2xl text-xs uppercase tracking-widest transition-all"
          >
            Dalej →
          </button>
        ) : (
          <button
            disabled={loading}
            onClick={handleSubmit}
            className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-black px-8 py-3 rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl shadow-orange-500/20"
          >
            {loading ? 'Wysyłanie...' : <><CheckCircle2 size={14} /> Zgłoś szkodę</>}
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
