import { GoogleGenAI } from '@google/genai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY ?? (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '') ?? '';

let _client: GoogleGenAI | null = null;

function client(): GoogleGenAI {
  if (!_client) _client = new GoogleGenAI({ apiKey: API_KEY });
  return _client;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export async function generateText(prompt: string, model = 'gemini-2.0-flash'): Promise<string> {
  const result = await client().models.generateContent({ model, contents: prompt });
  return result.text ?? '';
}

export async function* streamText(prompt: string, model = 'gemini-2.0-flash'): AsyncGenerator<string> {
  const stream = await client().models.generateContentStream({ model, contents: prompt });
  for await (const chunk of stream) {
    const text = chunk.text;
    if (text) yield text;
  }
}

export async function chat(history: ChatMessage[], userMessage: string, model = 'gemini-2.0-flash'): Promise<string> {
  const contents = [
    ...history.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
    { role: 'user' as const, parts: [{ text: userMessage }] },
  ];
  const result = await client().models.generateContent({ model, contents });
  return result.text ?? '';
}

export async function analyzeDocument(base64Content: string, mimeType: string, prompt: string): Promise<string> {
  const result = await client().models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { data: base64Content, mimeType } },
        { text: prompt },
      ],
    }],
  });
  return result.text ?? '';
}
