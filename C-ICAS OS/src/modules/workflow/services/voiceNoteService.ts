import {
  collection, doc, addDoc, updateDoc, getDocs,
  query, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import { chatCompletion, audioTranscription } from '../../../shared/lib/aiService';
import type { DocumentNote, DocumentNoteType } from '../types';

const notesPath = (tenantId: string, documentInstanceId: string) =>
  `tenants/${tenantId}/documentInstances/${documentInstanceId}/notes`;

// ── Recording ─────────────────────────────────────────────────────────────────

let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];

export async function startRecording(): Promise<void> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  audioChunks = [];
  mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
  mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
  mediaRecorder.start(250);
}

export function stopRecording(): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (!mediaRecorder) { reject(new Error('Brak nagrania')); return; }
    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: 'audio/webm' });
      mediaRecorder?.stream.getTracks().forEach(t => t.stop());
      mediaRecorder = null;
      resolve(blob);
    };
    mediaRecorder.stop();
  });
}

export function isRecording(): boolean {
  return mediaRecorder?.state === 'recording';
}

// ── Transcription — uses configured tenant AI provider ────────────────────────

export async function transcribeAudio(
  audioBlob: Blob,
  tenantId: string
): Promise<string> {
  try {
    return await audioTranscription(tenantId, 'system', 'workflow', 'voice_transcription', audioBlob, 'pl');
  } catch (e: any) {
    // Return error message as transcript so user can see what went wrong
    return `[Transkrypcja niedostępna: ${e.message ?? 'Skonfiguruj AI w Admin → AI'}]`;
  }
}

// ── AI Todo — uses configured tenant AI provider ──────────────────────────────

export async function processAiTodo(
  content: string,
  tenantId: string,
  documentContext?: string
): Promise<string> {
  const systemPrompt = `Jesteś asystentem AI systemu obiegu dokumentów C-ICAS OS.
Otrzymujesz zadanie dotyczące dokumentu${documentContext ? `: "${documentContext}"` : ''}.
Odpowiadaj zwięźle po polsku. Jeśli zadanie wymaga działania, opisz co zrobisz i zaproponuj kolejny krok.`;

  try {
    return await chatCompletion(
      tenantId, 'system', 'workflow', 'ai_todo',
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content },
      ],
      { maxTokens: 512, temperature: 0.3 }
    );
  } catch (e: any) {
    return `[AI niedostępne: ${e.message ?? 'Skonfiguruj AI w Admin → AI'}]`;
  }
}

// ── Firestore CRUD ────────────────────────────────────────────────────────────

export async function saveDocumentNote(
  tenantId: string,
  documentInstanceId: string,
  params: {
    authorId: string;
    authorEmail: string;
    type: DocumentNoteType;
    content: string;
    hasAudio?: boolean;
    audioStorageRef?: string;
    aiResponse?: string;
    dueDate?: string;
  }
): Promise<DocumentNote> {
  const data = {
    documentInstanceId,
    tenantId,
    authorId: params.authorId,
    authorEmail: params.authorEmail,
    type: params.type,
    content: params.content,
    hasAudio: params.hasAudio ?? false,
    audioStorageRef: params.audioStorageRef,
    aiResponse: params.aiResponse,
    dueDate: params.dueDate,
    completed: false,
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, notesPath(tenantId, documentInstanceId)), data);
  return { id: ref.id, ...data } as DocumentNote;
}

export async function getDocumentNotes(
  tenantId: string,
  documentInstanceId: string
): Promise<DocumentNote[]> {
  const q = query(
    collection(db, notesPath(tenantId, documentInstanceId)),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as DocumentNote);
}

export async function updateNoteCompletion(
  tenantId: string,
  documentInstanceId: string,
  noteId: string,
  completed: boolean
): Promise<void> {
  await updateDoc(
    doc(db, notesPath(tenantId, documentInstanceId), noteId),
    { completed, updatedAt: serverTimestamp() }
  );
}

export async function updateNoteAiResponse(
  tenantId: string,
  documentInstanceId: string,
  noteId: string,
  aiResponse: string
): Promise<void> {
  await updateDoc(
    doc(db, notesPath(tenantId, documentInstanceId), noteId),
    { aiResponse, updatedAt: serverTimestamp() }
  );
}
