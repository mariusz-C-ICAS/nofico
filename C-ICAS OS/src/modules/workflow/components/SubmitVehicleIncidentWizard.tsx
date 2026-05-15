import React, { useState, useRef } from 'react';
import {
  Car, Mic, MicOff, Loader2, CheckCircle2, AlertTriangle, X, Film, Volume2, Camera,
} from 'lucide-react';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../../shared/lib/firebase';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { createDocumentInstance, transitionDocument } from '../services/workflowEngine';
import { startRecording, stopRecording, transcribeAudio } from '../services/voiceNoteService';
import type { DocumentAttachment } from '../types';

interface Props { onComplete: (docId: string) => void; onCancel: () => void; }
type Step = 'incident' | 'damage' | 'evidence' | 'review';

interface MediaFile { file: File; previewUrl: string; type: 'image' | 'video'; transcript?: string; }

const STEPS: { id: Step; label: string }[] = [
  { id: 'incident', label: 'Zdarzenie' },
  { id: 'damage', label: 'Opis' },
  { id: 'evidence', label: 'Dowody' },
  { id: 'review', label: 'Wyślij' },
];

export default function SubmitVehicleIncidentWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const [step, setStep] = useState<Step>('incident');
  const [incident, setI] = useState({ title: '', incidentDate: '', incidentLocation: '', vehiclePlate: '', driverName: '' });
  const [damage, setD] = useState({ description: '', voiceTranscript: '', otherPartyInfo: '', policeReportNumber: '' });
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
      setD(f => ({ ...f, voiceTranscript: (f.voiceTranscript ? f.voiceTranscript + '\n' : '') + text }));
    } catch { } finally { setTranscribing(false); }
  };

  const transcribeVideo = async (idx: number) => {
    const mf = mediaFiles[idx];
    if (!mf || mf.type !== 'video') return;
    setTranscribingVideoIdx(idx);
    try {
      const text = await transcribeAudio(mf.file, activeTenantId ?? '');
      setMediaFiles(prev => prev.map((m, i) => i === idx ? { ...m, transcript: text } : m));
      setD(f => ({ ...f, voiceTranscript: (f.voiceTranscript ? f.voiceTranscript + '\n\n[Wideo #' + (idx + 1) + ']\n' : '') + text }));
    } catch { } finally { setTranscribingVideoIdx(null); }
  };

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) return;
      setMediaFiles(prev => [...prev, { file, previewUrl: URL.createObjectURL(file), type: file.type.startsWith('image/') ? 'image' : 'video' }]);
    });
  };

  const canProceed = () => {
    if (step === 'incident') return incident.title.trim() && incident.incidentDate && incident.vehiclePlate.trim();
    if (step === 'damage') return damage.description.trim() || damage.voiceTranscript.trim();
    if (step === 'evidence') return mediaFiles.length > 0;
    return true;
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const combinedDesc = [damage.description, damage.voiceTranscript].filter(Boolean).join('\n\n--- Notatka głosowa ---\n');
  const order: Step[] = ['incident', 'damage', 'evidence', 'review'];

  const handleSubmit = async () => {
    if (!user || !activeTenantId) return;
    setLoading(true); setError('');
    try {
      const attachments: DocumentAttachment[] = await Promise.all(
        mediaFiles.map(async (mf, i) => {
          const sRef = storageRef(storage, `tenants/${activeTenantId}/attachments/${Date.now()}_${i}_${mf.file.name}`);
          await uploadBytes(sRef, mf.file);
          const url = await getDownloadURL(sRef);
          return { id: `att_${i}`, name: mf.file.name, size: mf.file.size, mimeType: mf.file.type, storageRef: url, hash: `${mf.file.size}_${mf.file.lastModified}`, uploadedAt: new Date() as any, uploadedBy: user.uid } satisfies DocumentAttachment;
        })
      );
      const docId = await createDocumentInstance(activeTenantId, user.uid, user.email ?? '', 'VEHICLE_INCIDENT', 'default-vehicle-incident',
        { title: incident.title.trim(), incidentDate: incident.incidentDate, incidentLocation: incident.incidentLocation, vehiclePlate: incident.vehiclePlate, driverName: incident.driverName, otherPartyInfo: damage.otherPartyInfo || undefined, policeReportNumber: damage.policeReportNumber || undefined, description: combinedDesc },
        attachments
      );
      await transitionDocument(activeTenantId, docId, 'SUBMIT', user.uid, user.email ?? '', 'PENDING_APPROVAL',
        { stepType: 'APPROVAL', note: 'Kolizja pojazdu służbowego — wniosek o zatwierdzenie i zgłoszenie do ubezpieczyciela.' });
      onComplete(docId);
    } catch (e: any) { setError(e.message ?? 'Błąd wysyłania.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <button onClick={onCancel} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 mb-4 block">← Anuluj</button>
        <div className="flex items-center gap-3 mb-1">
          <Car size={20} className="text-sky-600" />
          <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Kolizja pojazdu służbowego</h3>
        </div>
        <p className="text-slate-400 text-sm font-medium">Wypadek/kolizja → szef → backoffice → ubezpieczyciel. Dowody WORM.</p>
      </div>

      <div className="flex gap-1">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex-1 flex flex-col gap-1">
            <div className={`h-1 rounded-full ${i <= stepIndex ? 'bg-sky-600' : 'bg-slate-200'}`} />
            <span className={`text-[9px] font-black uppercase tracking-widest ${s.id === step ? 'text-sky-600' : 'text-slate-400'}`}>{s.label}</span>
          </div>
        ))}
      </div>

      {step === 'incident' && (
        <div className="space-y-4">
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tytuł zdarzenia *</label>
            <input value={incident.title} onChange={e => setI(f => ({ ...f, title: e.target.value }))}
              placeholder="np. Kolizja na parkingu — ul. Przemysłowa 5, Warszawa"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-sky-500 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Data i godzina *</label>
              <input type="datetime-local" value={incident.incidentDate} onChange={e => setI(f => ({ ...f, incidentDate: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-sky-500 outline-none" />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Lokalizacja</label>
              <input value={incident.incidentLocation} onChange={e => setI(f => ({ ...f, incidentLocation: e.target.value }))}
                placeholder="ul. Budowlana 12, Wrocław"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-sky-500 outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tablica rejestracyjna *</label>
              <input value={incident.vehiclePlate} onChange={e => setI(f => ({ ...f, vehiclePlate: e.target.value.toUpperCase() }))}
                placeholder="WA 12345"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-sky-500 outline-none" />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Kierowca</label>
              <input value={incident.driverName} onChange={e => setI(f => ({ ...f, driverName: e.target.value }))}
                placeholder="Jan Kowalski"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-sky-500 outline-none" />
            </div>
          </div>
        </div>
      )}

      {step === 'damage' && (
        <div className="space-y-4">
          <div className="bg-sky-50 rounded-[2rem] p-5 border border-sky-100 space-y-3">
            <p className="text-[9px] font-black text-sky-600 uppercase tracking-widest flex items-center gap-1.5"><Mic size={10} /> Notatka głosowa z miejsca zdarzenia</p>
            <div className="flex items-center gap-3">
              <button onClick={recording ? stopRec : startRec} disabled={transcribing}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all shadow-lg ${recording ? 'bg-red-500 animate-pulse' : 'bg-sky-600 hover:bg-sky-700'}`}>
                {transcribing ? <Loader2 size={18} className="text-white animate-spin" /> : recording ? <MicOff size={18} className="text-white" /> : <Mic size={18} className="text-white" />}
              </button>
              <div>
                {recording && <p className="text-xs font-black text-red-600 animate-pulse">Nagrywam… {fmt(recSeconds)}</p>}
                {transcribing && <p className="text-xs font-bold text-sky-600">Whisper AI transkrybuje…</p>}
                {!recording && !transcribing && <p className="text-[10px] text-sky-500 font-bold">Nagraj opis kolizji z miejsca zdarzenia</p>}
              </div>
            </div>
            {damage.voiceTranscript && <div className="bg-white rounded-2xl p-3 border border-sky-100"><p className="text-xs text-slate-800">{damage.voiceTranscript}</p></div>}
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Opis pisemny</label>
            <textarea value={damage.description} onChange={e => setD(f => ({ ...f, description: e.target.value }))} rows={3}
              placeholder="Okoliczności kolizji, zakres uszkodzeń pojazdu..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm resize-none focus:ring-2 focus:ring-sky-500 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Dane drugiej strony</label>
              <input value={damage.otherPartyInfo} onChange={e => setD(f => ({ ...f, otherPartyInfo: e.target.value }))}
                placeholder="Jan Nowak, WR 98765, OC nr..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-sky-500 outline-none" />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nr raportu policji</label>
              <input value={damage.policeReportNumber} onChange={e => setD(f => ({ ...f, policeReportNumber: e.target.value }))}
                placeholder="RSD-2026-00123"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-sky-500 outline-none" />
            </div>
          </div>
        </div>
      )}

      {step === 'evidence' && (
        <div className="space-y-4">
          <div onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-sky-200 rounded-[2rem] p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-sky-400 hover:bg-sky-50/30 transition-all">
            <Camera size={32} className="text-sky-400" />
            <p className="text-sm font-black text-slate-700 uppercase tracking-tight">Zdjęcia i wideo z miejsca kolizji</p>
            <p className="text-[10px] text-slate-400 font-medium">Uszkodzenia pojazdu, tablice, otoczenie, dokumenty OC</p>
            <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={e => addFiles(e.target.files)} />
          </div>
          {mediaFiles.length > 0 && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {mediaFiles.map((mf, i) => (
                  <div key={i} className="relative group rounded-2xl overflow-hidden bg-slate-100 aspect-square">
                    {mf.type === 'image'
                      ? <img src={mf.previewUrl} alt={mf.file.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-2">
                          <Film size={24} className="text-slate-400" />
                          {!mf.transcript && (
                            <button onClick={() => transcribeVideo(i)} disabled={transcribingVideoIdx !== null}
                              className="flex items-center gap-1 px-2 py-1 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg text-[8px] font-black">
                              {transcribingVideoIdx === i ? <Loader2 size={8} className="animate-spin" /> : <Volume2 size={8} />}
                              {transcribingVideoIdx === i ? 'AI…' : 'Transkrybuj'}
                            </button>
                          )}
                          {mf.transcript && <span className="text-[8px] text-emerald-600 font-black">✓ Transkrypcja</span>}
                        </div>}
                    <button onClick={() => setMediaFiles(prev => prev.filter((_, j) => j !== i))}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-600 text-white rounded-full items-center justify-center hidden group-hover:flex"><X size={10} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {mediaFiles.length === 0 && <p className="text-xs text-amber-600 font-bold flex items-center gap-1.5"><AlertTriangle size={12} /> Wymagane co najmniej 1 plik</p>}
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-[2rem] p-6 space-y-3">
            <Row label="Tytuł" value={incident.title} />
            <Row label="Data" value={incident.incidentDate.replace('T', ' ')} />
            {incident.incidentLocation && <Row label="Lokalizacja" value={incident.incidentLocation} />}
            <Row label="Pojazd" value={incident.vehiclePlate} />
            {incident.driverName && <Row label="Kierowca" value={incident.driverName} />}
            {damage.otherPartyInfo && <Row label="Druga strona" value={damage.otherPartyInfo} />}
            <Row label="Pliki" value={`${mediaFiles.length} plik(ów)`} />
          </div>
          <div className="bg-sky-50 rounded-[2rem] p-4 border border-sky-100">
            <p className="text-[10px] text-sky-700 font-bold">Po zatwierdzeniu przez szefa, backoffice zgłosi szkodę do ubezpieczyciela — ten sam proces co Zgłoszenie Szkody.</p>
          </div>
          {error && <p className="text-red-600 text-xs font-bold flex items-center gap-1.5"><AlertTriangle size={12} />{error}</p>}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button onClick={() => { const idx = order.indexOf(step); idx > 0 ? setStep(order[idx - 1]) : onCancel(); }}
          className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600">
          ← {step === 'incident' ? 'Anuluj' : 'Wstecz'}
        </button>
        {step !== 'review' ? (
          <button disabled={!canProceed()} onClick={() => setStep(order[order.indexOf(step) + 1])}
            className="bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white font-black px-8 py-3 rounded-2xl text-xs uppercase tracking-widest">Dalej →</button>
        ) : (
          <button disabled={loading} onClick={handleSubmit}
            className="bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-black px-8 py-3 rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-sky-500/20">
            {loading ? 'Wysyłanie...' : <><CheckCircle2 size={14} /> Zgłoś kolizję</>}
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
