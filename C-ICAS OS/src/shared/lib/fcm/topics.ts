// B5 — FCM topic subscriptions for tenant-wide broadcast notifications

import { db } from '../firebase';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

const FUNCTIONS_BASE = import.meta.env.VITE_FUNCTIONS_URL ?? 'https://europe-west1-cicas-os.cloudfunctions.net';

export type FcmTopic = `tenant_${string}` | `role_${string}` | `module_${string}`;

export async function subscribeToTopic(fcmToken: string, topic: FcmTopic, idToken: string): Promise<void> {
  const res = await fetch(`${FUNCTIONS_BASE}/fcmTopicSubscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ fcmToken, topic }),
  });
  if (!res.ok) throw new Error(`FCM topic subscribe error: ${res.status}`);
}

export async function unsubscribeFromTopic(fcmToken: string, topic: FcmTopic, idToken: string): Promise<void> {
  const res = await fetch(`${FUNCTIONS_BASE}/fcmTopicUnsubscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ fcmToken, topic }),
  });
  if (!res.ok) throw new Error(`FCM topic unsubscribe error: ${res.status}`);
}

export async function broadcastToTopic(
  topic: FcmTopic,
  title: string,
  body: string,
  data: Record<string, string> = {},
  idToken: string
): Promise<void> {
  const res = await fetch(`${FUNCTIONS_BASE}/fcmTopicBroadcast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ topic, notification: { title, body }, data }),
  });
  if (!res.ok) throw new Error(`FCM broadcast error: ${res.status}`);
}

export async function saveFcmTopicPrefs(
  uid: string,
  tenantId: string,
  topics: FcmTopic[]
): Promise<void> {
  await setDoc(
    doc(db, `users/${uid}/fcmPrefs/${tenantId}`),
    { topics, updatedAt: serverTimestamp() },
    { merge: true }
  );
}
