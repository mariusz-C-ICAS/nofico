import React, { useState, useEffect, useRef } from 'react';
import {
  Mic, MicOff, Loader2, Check, AlertTriangle, Bot, Clock,
  MessageSquare, FileText, Lightbulb, Bell, ListTodo, CheckSquare, X,
} from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { DocumentNote, DocumentNoteType } from '../types';
import {
  startRecording, stopRecording, isRecording,
  transcribeAudio, saveDocumentNote, getDocumentNotes,
  processAiTodo, updateNoteCompletion,
} from '../services/voiceNoteService';

interface Props {
  tenantId: string;
  documentInstanceId: string;
  documentTitle?: string;
  authorId: string;
  authorEmail: string;
}

const NOTE_TYPES: { id: DocumentNoteType; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'note',        label: 'Notatka',      icon: <FileText size={12} />,   color: 'bg-slate-100 text-slate-700' },
  { id: 'comment',     label: 'Komentarz',    icon: <MessageSquare size={12} />, color: 'bg-blue-50 text-blue-700' },
  { id: 'explanation', label: 'Wyjaśnienie',  icon: <Lightbulb size={12} />,  color: 'bg-amber-50 text-amber-700' },
  { id: 'warning',     label: 'Uwaga',        icon: <AlertTriangle size={12} />, color: 'bg-red-50 text-red-700' },
  { id: 'ai_todo',     label: 'Dla AI',       icon: <Bot size={12} />,        color: 'bg-violet-50 text-violet-700' },
  { id: 'reminder',    label: 'Przypomnienie',icon: <Bell size={12} />,       color: 'bg-orange-50 text-orange-700' },
  { id: 'task',        label: 'Zadanie',      icon: <ListTodo size={12} />,   color: 'bg-emerald-50 text-emerald-700' },
];

function NoteCard({ note, tenantId, onToggle }: { note: DocumentNote; tenantId: string; onToggle: (id: string, done: boolean) => void }) {
  const cfg = NOTE_TYPES.find(t => t.id === note.type) ?? NOTE_TYPES[0];
  const canComplete = note.type === 'task' || note.type === 'reminder';
  const ts = note.createdAt?.seconds
    ? format(new Date(note.createdAt.seconds * 1000), 'd MMM HH:mm', { locale: pl })
    : '—';

  return (
    <div className={`bg-white border rounded-2xl p-4 space-y-2 ${note.completed ? 'opacity-60' : 'border-slate-100'}`}>
      <div className="flex items-start gap-2">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase flex-shrink-0 ${cfg.color}`}>
          {cfg.icon}{cfg.label}
        </span>
        {note.hasAudio && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase">
            <Mic size={9} /> GŁOS
          </span>
        )}
        <div className="ml-auto flex items-center gap-1 text-[9px] text-slate-400 font-bold flex-shrink-0">
          <Clock size={9} />{ts}
        </div>
      </div>
      <p className="text-sm text-slate-800 leading-relaxed">{note.content}</p>
      {note.aiResponse && (
        <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 flex gap-2">
          <Bot size={12} className="text-violet-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-violet-800 leading-relaxed">{note.aiResponse}</p>
        </div>
      )}
      {canComplete && (
        <button
          onClick={() => onToggle(note.id, !note.completed)}
          className={`flex items-center gap-1.5 text-[9px] font-black uppercase px-3 py-1.5 rounded-lg transition-colors ${
            note.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700'
          }`}
        >
          <CheckSquare size={10} />{note.completed ? 'Ukończone' : 'Oznacz jako ukończone'}
        </button>
      )}
    </div>
  );
}

export default function VoiceNoteRecorder({ tenantId, documentInstanceId, documentTitle, authorId, authorEmail }: Props) {
  const [notes, setNotes] = useState<DocumentNote[]>([]);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [noteType, setNoteType] = useState<DocumentNoteType>('note');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [processingAi, setProcessingAi] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    getDocumentNotes(tenantId, documentInstanceId).then(setNotes).catch(() => {});
  }, [tenantId, documentInstanceId]);

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
      const text = await transcribeAudio(blob, tenantId);
      setTranscript(text);
    } finally {
      setTranscribing(false);
    }
  };

  const handleSave = async () => {
    if (!transcript.trim()) return;
    setSaving(true);
    try {
      let aiResponse: string | undefined;
      if (noteType === 'ai_todo') {
        setProcessingAi(true);
        aiResponse = await processAiTodo(transcript, tenantId, documentTitle);
        setProcessingAi(false);
      }
      const note = await saveDocumentNote(tenantId, documentInstanceId, {
        authorId, authorEmail, type: noteType, content: transcript,
        hasAudio: recSeconds > 0, aiResponse,
        dueDate: (noteType === 'task' || noteType === 'reminder') && dueDate ? dueDate : undefined,
      });
      setNotes(prev => [note, ...prev]);
      setTranscript('');
      setDueDate('');
      setNoteType('note');
      setRecSeconds(0);
    } finally {
      setSaving(false);
      setProcessingAi(false);
    }
  };

  const handleToggle = async (noteId: string, done: boolean) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    await updateNoteCompletion(tenantId, documentInstanceId, noteId, done);
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, completed: done } : n));
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-700 uppercase tracking-tight flex items-center gap-2">
          <Mic size={14} className="text-indigo-500" /> Notatki głosowe & komentarze
        </h3>
        <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
          {notes.length} notatek
        </span>
      </div>

      {/* Recorder */}
      <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {NOTE_TYPES.map(t => (
            <button
              key={t.id}
              onClick={() => setNoteType(t.id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-colors ${
                noteType === t.id ? t.color + ' ring-2 ring-indigo-400' : 'bg-white text-slate-400 hover:bg-slate-100'
              }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Record button */}
        <div className="flex items-center gap-3">
          <button
            onClick={recording ? stopRec : startRec}
            disabled={transcribing}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-lg flex-shrink-0 ${
              recording
                ? 'bg-red-500 hover:bg-red-600 animate-pulse shadow-red-200'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
            }`}
          >
            {transcribing ? <Loader2 size={20} className="text-white animate-spin" /> :
             recording ? <MicOff size={20} className="text-white" /> :
             <Mic size={20} className="text-white" />}
          </button>
          <div className="flex-1">
            {recording && (
              <p className="text-xs font-black text-red-600 animate-pulse">
                Nagrywam… {fmt(recSeconds)}
              </p>
            )}
            {transcribing && <p className="text-xs font-bold text-indigo-600">Transkrybuję…</p>}
            {!recording && !transcribing && (
              <p className="text-[10px] text-slate-400 font-bold">
                Naciśnij aby nagrać notatkę głosową — Whisper AI przetranscryptuje.
              </p>
            )}
          </div>
        </div>

        {/* Text input */}
        <textarea
          value={transcript}
          onChange={e => setTranscript(e.target.value)}
          rows={3}
          className="w-full bg-white rounded-xl px-4 py-3 text-sm text-slate-800 border border-slate-200 focus:ring-2 focus:ring-indigo-500 resize-none"
          placeholder="Wpisz notatkę lub nagraj głos → tekst pojawi się tutaj…"
        />

        {(noteType === 'task' || noteType === 'reminder') && (
          <div className="flex items-center gap-2">
            <Bell size={12} className="text-orange-500" />
            <label className="text-[9px] font-black text-slate-400 uppercase">Termin</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="bg-white rounded-xl px-3 py-1.5 text-xs font-bold border border-slate-200 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={!transcript.trim() || saving || processingAi}
          className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
        >
          {processingAi ? <><Loader2 size={12} className="animate-spin" /> Pytam AI…</> :
           saving ? <><Loader2 size={12} className="animate-spin" /> Zapisuję…</> :
           <><Check size={12} /> Zapisz notatkę</>}
        </button>
      </div>

      {/* Notes list */}
      <div className="space-y-3">
        {notes.map(note => (
          <NoteCard key={note.id} note={note} tenantId={tenantId} onToggle={handleToggle} />
        ))}
        {notes.length === 0 && (
          <p className="text-center text-[10px] text-slate-400 font-bold uppercase py-6">
            Brak notatek
          </p>
        )}
      </div>
    </div>
  );
}
