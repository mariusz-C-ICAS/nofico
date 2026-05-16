import type { PubSubMessage, PubSubHandler, AppTopic } from './types';

const FUNCTIONS_BASE = import.meta.env.VITE_FUNCTIONS_URL ?? 'https://europe-west1-cicas-os.cloudfunctions.net';

// ── Client-side subscriber (Firebase onSnapshot-based fan-out) ────────────────
const subscriptions = new Map<string, Set<PubSubHandler>>();

export function subscribe<T>(topic: AppTopic, handler: PubSubHandler<T>): () => void {
  if (!subscriptions.has(topic)) subscriptions.set(topic, new Set());
  subscriptions.get(topic)!.add(handler as PubSubHandler);
  return () => subscriptions.get(topic)?.delete(handler as PubSubHandler);
}

export function dispatchLocal<T>(topic: AppTopic, payload: T, tenantId?: string): void {
  const msg: PubSubMessage<T> = { topic, payload, tenantId, publishedAt: Date.now() };
  subscriptions.get(topic)?.forEach(h => h(msg));
}

// ── Server-side publisher (Cloud Function proxy) ──────────────────────────────
export async function publish<T>(
  topic: AppTopic,
  payload: T,
  tenantId: string,
  idToken: string
): Promise<void> {
  const res = await fetch(`${FUNCTIONS_BASE}/publishEvent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ topic, payload, tenantId }),
  });
  if (!res.ok) throw new Error(`PubSub publish error: ${res.status}`);
  // Also fire locally so subscribers in this tab get the event immediately
  dispatchLocal(topic, payload, tenantId);
}

export type { PubSubMessage, PubSubHandler, AppTopic };
