import { getAuth } from 'firebase/auth';
import { sendNotification, type NotifPayload } from './index';
import { getNotifPrefs } from './notifPrefs';
import { getMessaging, getToken } from 'firebase/messaging';
import { subscribeToTopic } from '../fcm/topics';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY ?? '';
const FUNCTIONS_BASE = import.meta.env.VITE_FUNCTIONS_URL ?? 'https://europe-west1-cicas-os.cloudfunctions.net';

async function routeToEmail(payload: NotifPayload, idToken: string): Promise<void> {
  await fetch(`${FUNCTIONS_BASE}/sendEmailOnNotification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify(payload),
  }).catch(() => { /* email best-effort */ });
}

async function routeToPush(payload: NotifPayload, idToken: string): Promise<void> {
  try {
    const messaging = getMessaging();
    const fcmToken = await getToken(messaging, { vapidKey: VAPID_KEY });
    await fetch(`${FUNCTIONS_BASE}/fcmTopicBroadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({
        topic: `tenant_${payload.tenantId}`,
        notification: {
          title: payload.type.replace(/_/g, ' '),
          body: payload.message,
        },
        data: { actionUrl: payload.actionUrl ?? '/dashboard' },
      }),
    });
  } catch {
    /* push best-effort */
  }
}

export async function sendNotificationRouted(payload: NotifPayload): Promise<void> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return;

  const [idToken, prefs] = await Promise.all([
    user.getIdToken(),
    getNotifPrefs(payload.recipientId, payload.tenantId),
  ]);

  const typePref = prefs[payload.type];
  if (!typePref || !typePref.enabled) return;

  const tasks: Promise<void>[] = [
    sendNotification(payload),
  ];

  if (typePref.channels.includes('email')) {
    tasks.push(routeToEmail(payload, idToken));
  }
  if (typePref.channels.includes('push')) {
    tasks.push(routeToPush(payload, idToken));
  }

  await Promise.allSettled(tasks);
}
