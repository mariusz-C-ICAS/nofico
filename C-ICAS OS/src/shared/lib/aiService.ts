/**
 * Universal AI Service — provider-agnostic adapter.
 * Supports: Anthropic, OpenAI, Groq, Gemini, Azure OpenAI, Custom (OpenAI-compatible).
 * Config stored in: tenants/{id}/integrations/ai
 * Usage logged in: tenants/{id}/aiUsage/{usageId}
 */
import { collection, doc, addDoc, getDoc, getDocs, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

// ── Types ────────────────────────────────────────────────────────────────────

export type AiProvider = 'anthropic' | 'openai' | 'groq' | 'gemini' | 'azure_openai' | 'custom';

export interface AiConfig {
  provider: AiProvider;
  apiKey: string;
  model: string;
  visionModel?: string;
  transcriptionModel?: string;
  baseUrl?: string;
  azureDeployment?: string;
  maxTokens?: number;
  temperature?: number;
  enabled: boolean;
  updatedAt?: any;
  updatedBy?: string;
}

export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiUsageRecord {
  id?: string;
  tenantId: string;
  userId: string;
  module: string;
  operation: string;
  provider: AiProvider;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  createdAt: any;
}

// ── Cost table (USD per 1K tokens) ───────────────────────────────────────────

const COST_TABLE: Record<string, { input: number; output: number }> = {
  'claude-opus-4-7':          { input: 0.015,   output: 0.075 },
  'claude-sonnet-4-6':        { input: 0.003,   output: 0.015 },
  'claude-haiku-4-5':         { input: 0.00025, output: 0.00125 },
  'gpt-4o':                   { input: 0.005,   output: 0.015 },
  'gpt-4o-mini':              { input: 0.00015, output: 0.0006 },
  'gpt-4-turbo':              { input: 0.01,    output: 0.03 },
  'o1':                       { input: 0.015,   output: 0.06 },
  'gemini-2.0-flash':         { input: 0.0001,  output: 0.0004 },
  'gemini-1.5-pro':           { input: 0.0035,  output: 0.0105 },
  'gemini-1.5-flash':         { input: 0.000075, output: 0.0003 },
  'llama-3.3-70b-versatile':  { input: 0.00059, output: 0.00079 },
  'llama-3.2-11b-vision':     { input: 0.00018, output: 0.00018 },
  'mistral-large':            { input: 0.003,   output: 0.009 },
};

function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const key = Object.keys(COST_TABLE).find(k => model.toLowerCase().includes(k.toLowerCase()));
  const rates = key ? COST_TABLE[key] : { input: 0.002, output: 0.008 };
  return (promptTokens / 1000) * rates.input + (completionTokens / 1000) * rates.output;
}

// ── Config loading ────────────────────────────────────────────────────────────

export async function getAiConfig(tenantId: string): Promise<AiConfig | null> {
  try {
    const snap = await getDoc(doc(db, `tenants/${tenantId}/integrations/ai`));
    if (!snap.exists() || !snap.data().enabled) return null;
    return snap.data() as AiConfig;
  } catch { return null; }
}

// ── Usage recording ───────────────────────────────────────────────────────────

async function recordUsage(
  tenantId: string,
  userId: string,
  module: string,
  operation: string,
  provider: AiProvider,
  model: string,
  promptTokens: number,
  completionTokens: number
): Promise<void> {
  try {
    await addDoc(collection(db, `tenants/${tenantId}/aiUsage`), {
      tenantId, userId, module, operation, provider, model,
      promptTokens, completionTokens,
      totalTokens: promptTokens + completionTokens,
      estimatedCostUsd: estimateCost(model, promptTokens, completionTokens),
      createdAt: serverTimestamp(),
    });
  } catch { /* non-blocking */ }
}

// ── Provider adapters — Chat Completion ───────────────────────────────────────

async function callOpenAICompat(
  baseUrl: string, apiKey: string, model: string,
  messages: AiMessage[], maxTokens: number, temperature: number, json: boolean
): Promise<{ text: string; promptTokens: number; completionTokens: number }> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model, messages,
      max_tokens: maxTokens,
      temperature,
      ...(json && { response_format: { type: 'json_object' } }),
    }),
  });
  if (!res.ok) throw new Error(`AI API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return {
    text: data.choices[0].message.content ?? '',
    promptTokens: data.usage?.prompt_tokens ?? 0,
    completionTokens: data.usage?.completion_tokens ?? 0,
  };
}

async function callAnthropic(
  apiKey: string, model: string,
  messages: AiMessage[], maxTokens: number, temperature: number
): Promise<{ text: string; promptTokens: number; completionTokens: number }> {
  const system = messages.find(m => m.role === 'system')?.content;
  const conv = messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content }));
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model, messages: conv,
      ...(system && { system }),
      max_tokens: maxTokens,
      temperature,
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return {
    text: data.content[0]?.text ?? '',
    promptTokens: data.usage?.input_tokens ?? 0,
    completionTokens: data.usage?.output_tokens ?? 0,
  };
}

async function callGemini(
  apiKey: string, model: string,
  messages: AiMessage[], maxTokens: number, temperature: number
): Promise<{ text: string; promptTokens: number; completionTokens: number }> {
  const contents = messages.filter(m => m.role !== 'system').map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const systemText = messages.find(m => m.role === 'system')?.content;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        ...(systemText && { systemInstruction: { parts: [{ text: systemText }] } }),
        generationConfig: { maxOutputTokens: maxTokens, temperature },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return {
    text: data.candidates[0]?.content?.parts[0]?.text ?? '',
    promptTokens: data.usageMetadata?.promptTokenCount ?? 0,
    completionTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
  };
}

// ── Vision adapters ───────────────────────────────────────────────────────────

async function visionOpenAICompat(
  baseUrl: string, apiKey: string, model: string, imageUrl: string, prompt: string, maxTokens: number
): Promise<{ text: string; promptTokens: number; completionTokens: number }> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: imageUrl } },
      ]}],
      max_tokens: maxTokens,
    }),
  });
  if (!res.ok) throw new Error(`Vision API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return { text: data.choices[0].message.content ?? '', promptTokens: data.usage?.prompt_tokens ?? 0, completionTokens: data.usage?.completion_tokens ?? 0 };
}

async function visionAnthropic(
  apiKey: string, model: string, imageUrl: string, prompt: string, maxTokens: number
): Promise<{ text: string; promptTokens: number; completionTokens: number }> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model, max_tokens: maxTokens,
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'url', url: imageUrl } },
        { type: 'text', text: prompt },
      ]}],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic Vision ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return { text: data.content[0]?.text ?? '', promptTokens: data.usage?.input_tokens ?? 0, completionTokens: data.usage?.output_tokens ?? 0 };
}

async function visionGemini(
  apiKey: string, model: string, imageUrl: string, prompt: string, maxTokens: number
): Promise<{ text: string; promptTokens: number; completionTokens: number }> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [
          { text: prompt },
          { inlineData: { mimeType: 'image/jpeg', data: '' } }, // URL mode via fileData
          { fileData: { mimeType: 'image/jpeg', fileUri: imageUrl } },
        ]}],
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini Vision ${res.status}`);
  const data = await res.json();
  return { text: data.candidates[0]?.content?.parts[0]?.text ?? '', promptTokens: data.usageMetadata?.promptTokenCount ?? 0, completionTokens: data.usageMetadata?.candidatesTokenCount ?? 0 };
}

// ── Transcription adapters ────────────────────────────────────────────────────

async function transcribeOpenAICompat(
  baseUrl: string, apiKey: string, model: string, audioBlob: Blob, language: string
): Promise<string> {
  const form = new FormData();
  form.append('file', audioBlob, 'audio.webm');
  form.append('model', model);
  form.append('language', language);
  form.append('response_format', 'json');
  const res = await fetch(`${baseUrl}/audio/transcriptions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Transcription API ${res.status}`);
  return (await res.json()).text ?? '';
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function chatCompletion(
  tenantId: string,
  userId: string,
  module: string,
  operation: string,
  messages: AiMessage[],
  options: { maxTokens?: number; temperature?: number; json?: boolean } = {}
): Promise<string> {
  const cfg = await getAiConfig(tenantId);
  if (!cfg) throw new Error('AI nie jest skonfigurowane dla tego tenanta. Skonfiguruj w Panelu Admin → AI.');

  const maxTokens = options.maxTokens ?? cfg.maxTokens ?? 1024;
  const temperature = options.temperature ?? cfg.temperature ?? 0.3;
  const json = options.json ?? false;
  let result: { text: string; promptTokens: number; completionTokens: number };

  switch (cfg.provider) {
    case 'anthropic':
      result = await callAnthropic(cfg.apiKey, cfg.model, messages, maxTokens, temperature);
      break;
    case 'gemini':
      result = await callGemini(cfg.apiKey, cfg.model, messages, maxTokens, temperature);
      break;
    case 'azure_openai': {
      const base = `${cfg.baseUrl}/openai/deployments/${cfg.azureDeployment ?? cfg.model}`;
      result = await callOpenAICompat(`${base}?api-version=2024-02-01`, cfg.apiKey, cfg.model, messages, maxTokens, temperature, json);
      break;
    }
    case 'openai':
      result = await callOpenAICompat('https://api.openai.com/v1', cfg.apiKey, cfg.model, messages, maxTokens, temperature, json);
      break;
    case 'groq':
      result = await callOpenAICompat('https://api.groq.com/openai/v1', cfg.apiKey, cfg.model, messages, maxTokens, temperature, json);
      break;
    case 'custom':
      result = await callOpenAICompat(cfg.baseUrl!, cfg.apiKey, cfg.model, messages, maxTokens, temperature, json);
      break;
    default:
      throw new Error(`Nieznany provider: ${cfg.provider}`);
  }

  await recordUsage(tenantId, userId, module, operation, cfg.provider, cfg.model, result.promptTokens, result.completionTokens);
  return result.text;
}

export async function visionAnalysis(
  tenantId: string,
  userId: string,
  module: string,
  operation: string,
  imageUrl: string,
  prompt: string
): Promise<string> {
  const cfg = await getAiConfig(tenantId);
  if (!cfg) throw new Error('AI nie jest skonfigurowane.');
  const visionModel = cfg.visionModel ?? cfg.model;
  const maxTokens = cfg.maxTokens ?? 1500;
  let result: { text: string; promptTokens: number; completionTokens: number };

  switch (cfg.provider) {
    case 'anthropic':
      result = await visionAnthropic(cfg.apiKey, visionModel, imageUrl, prompt, maxTokens);
      break;
    case 'gemini':
      result = await visionGemini(cfg.apiKey, visionModel, imageUrl, prompt, maxTokens);
      break;
    case 'azure_openai':
    case 'openai': {
      const base = cfg.provider === 'openai' ? 'https://api.openai.com/v1' :
        `${cfg.baseUrl}/openai/deployments/${cfg.azureDeployment ?? visionModel}?api-version=2024-02-01`;
      result = await visionOpenAICompat(base, cfg.apiKey, visionModel, imageUrl, prompt, maxTokens);
      break;
    }
    case 'groq':
    case 'custom':
      result = await visionOpenAICompat(
        cfg.provider === 'groq' ? 'https://api.groq.com/openai/v1' : cfg.baseUrl!,
        cfg.apiKey, visionModel, imageUrl, prompt, maxTokens
      );
      break;
    default:
      throw new Error(`Nieznany provider: ${cfg.provider}`);
  }

  await recordUsage(tenantId, userId, module, operation, cfg.provider, visionModel, result.promptTokens, result.completionTokens);
  return result.text;
}

export async function audioTranscription(
  tenantId: string,
  userId: string,
  module: string,
  operation: string,
  audioBlob: Blob,
  language = 'pl'
): Promise<string> {
  const cfg = await getAiConfig(tenantId);
  if (!cfg) throw new Error('AI nie jest skonfigurowane.');

  let text = '';
  if (cfg.provider === 'anthropic' || cfg.provider === 'gemini') {
    throw new Error(`Provider ${cfg.provider} nie obsługuje transkrypcji audio. Użyj OpenAI, Groq lub Custom.`);
  }

  const transcriptionModel = cfg.transcriptionModel ?? (cfg.provider === 'groq' ? 'whisper-large-v3' : 'whisper-1');
  const base = cfg.provider === 'openai' ? 'https://api.openai.com/v1' :
    cfg.provider === 'groq' ? 'https://api.groq.com/openai/v1' :
    cfg.provider === 'azure_openai' ? `${cfg.baseUrl}/openai/deployments/${cfg.azureDeployment ?? 'whisper'}?api-version=2024-02-01` :
    cfg.baseUrl!;

  text = await transcribeOpenAICompat(base, cfg.apiKey, transcriptionModel, audioBlob, language);
  // Transcription doesn't return token counts — estimate from text length
  const estimatedTokens = Math.ceil(text.length / 4);
  await recordUsage(tenantId, userId, module, operation, cfg.provider, transcriptionModel, estimatedTokens, 0);
  return text;
}

// ── Usage stats ───────────────────────────────────────────────────────────────

export async function getUsageStats(tenantId: string, days = 30): Promise<{
  totalTokens: number;
  totalCostUsd: number;
  byModule: Record<string, { tokens: number; costUsd: number }>;
  byUser: Array<{ userId: string; tokens: number; costUsd: number }>;
}> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const q = query(
    collection(db, `tenants/${tenantId}/aiUsage`),
    where('createdAt', '>=', since),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  const records = snap.docs.map(d => d.data() as AiUsageRecord);

  let totalTokens = 0, totalCostUsd = 0;
  const byModule: Record<string, { tokens: number; costUsd: number }> = {};
  const byUser: Record<string, { tokens: number; costUsd: number }> = {};

  for (const r of records) {
    totalTokens += r.totalTokens;
    totalCostUsd += r.estimatedCostUsd;
    byModule[r.module] = { tokens: (byModule[r.module]?.tokens ?? 0) + r.totalTokens, costUsd: (byModule[r.module]?.costUsd ?? 0) + r.estimatedCostUsd };
    byUser[r.userId] = { tokens: (byUser[r.userId]?.tokens ?? 0) + r.totalTokens, costUsd: (byUser[r.userId]?.costUsd ?? 0) + r.estimatedCostUsd };
  }

  return {
    totalTokens,
    totalCostUsd,
    byModule,
    byUser: Object.entries(byUser).map(([userId, v]) => ({ userId, ...v })).sort((a, b) => b.tokens - a.tokens),
  };
}
