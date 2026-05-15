import {
  collection, doc, addDoc, updateDoc, getDocs,
  query, orderBy, serverTimestamp, where,
} from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import type { DocumentNote, DocumentNoteType } from '../types';

const notesPath = (tenantId: string, documentInstanceId: string) =>
  `tenants/${tenantId}/documentInstances/${documentInstanceId}/notes`;

const GROQ_WHISPER_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';

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

// ── Transcription ─────────────────────────────────────────────────────────────

async function getGroqApiKey(tenantId: string): Promise<string | null> {
  try {
    const { getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, `tenants/${tenantId}/integrations/groq`));
    return snap.exists() ? (snap.data().apiKey ?? null) : null;
  } catch { return null; }
}

export async function transcribeAudio(
  audioBlob: Blob,
  tenantId: string
): Promise<string> {
  const apiKey = await getGroqApiKey(tenantId);
  if (!apiKey) return '[Transkrypcja wymaga klucza Groq API w konfiguracji integracji]';

  const formData = new FormData();
  formData.append('file', audioBlob, 'recording.webm');
  formData.append('model', 'whisper-large-v3');
  formData.append('language', 'pl');
  formData.append('response_format', 'json');

  const res = await fetch(GROQ_WHISPER_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: formData,
  });
  if (!res.ok) throw new Error(`Whisper API ${res.status}`);
  const data = await res.json();
  return data.text ?? '';
}

// ── AI Todo processing ────────────────────────────────────────────────────────

export async function processAiTodo(
  content: string,
  tenantId: string,
  documentContext?: string
): Promise<string> {
  const apiKey = await getGroqApiKey(tenantId);
  if (!apiKey) return '[Odpowiedź AI wymaga klucza Groq API]';

  const systemPrompt = `Jesteś asystentem AI systemu obiegu dokumentów C-ICAS OS.
Otrzymujesz zadanie/pytanie dotyczące dokumentu${documentContext ? `: "${documentContext}"` : ''}.
Odpowiadaj zwięźle, po polsku. Jeśli zadanie wymaga działania (np. "sprawdź NIP", "przypomnij za tydzień"), opisz co zrobisz i zaproponuj kolejny krok.`;

  const res = await fetch(GROQ_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content },
      ],
      max_tokens: 512,
      temperature: 0.3,
    }),
  });
  if (!res.ok) return '[Błąd AI — spróbuj ponownie]';
  const data = await res.json();
  return data.choices[0].message.content ?? '';
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
