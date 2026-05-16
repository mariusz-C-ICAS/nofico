// Speech-to-Text Chirp 2 — Cloud Function proxy

const FUNCTIONS_BASE = import.meta.env.VITE_FUNCTIONS_URL ?? 'https://europe-west1-cicas-os.cloudfunctions.net';

export interface SttResult {
  transcript: string;
  confidence: number;
  words?: Array<{ word: string; startTime: number; endTime: number }>;
}

export async function transcribeAudio(
  base64Audio: string,
  mimeType: string,
  languageCode = 'pl-PL',
  idToken?: string
): Promise<SttResult> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (idToken) headers.Authorization = `Bearer ${idToken}`;

  const res = await fetch(`${FUNCTIONS_BASE}/transcribeAudio`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ base64Audio, mimeType, languageCode }),
  });
  if (!res.ok) throw new Error(`STT error: ${res.status}`);
  return res.json();
}

export function recordAudio(maxDurationMs = 30_000): Promise<{ blob: Blob; base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        const recorder = new MediaRecorder(stream);
        const chunks: BlobPart[] = [];
        recorder.ondataavailable = e => chunks.push(e.data);
        recorder.onstop = async () => {
          stream.getTracks().forEach(t => t.stop());
          const blob = new Blob(chunks, { type: recorder.mimeType });
          const buffer = await blob.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
          resolve({ blob, base64, mimeType: recorder.mimeType });
        };
        recorder.start();
        setTimeout(() => recorder.stop(), maxDurationMs);
      })
      .catch(reject);
  });
}
