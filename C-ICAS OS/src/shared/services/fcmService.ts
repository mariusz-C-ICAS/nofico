import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';
import { getAuth } from 'firebase/auth';
import { app } from '../../core/firebase/config';
import { db } from '../../shared/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { subscribeToTopic } from '../lib/fcm/topics';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

let messaging: Messaging | null = null;

function getMessagingInstance(): Messaging | null {
  if (!('serviceWorker' in navigator) || !('Notification' in window)) return null;
  if (!messaging) messaging = getMessaging(app);
  return messaging;
}

export async function requestPushPermission(userId: string, tenantId: string): Promise<string | null> {
  const m = getMessagingInstance();
  if (!m) return null;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  const sw = await navigator.serviceWorker.ready;

  const token = await getToken(m, { vapidKey: VAPID_KEY, serviceWorkerRegistration: sw });
  if (token) {
    await setDoc(
      doc(db, 'users', userId, 'fcmTokens', token.slice(-20)),
      { token, tenantId, platform: 'web', createdAt: serverTimestamp(), active: true },
      { merge: true }
    );
    const idToken = await getAuth(app).currentUser?.getIdToken();
    if (idToken) {
      await subscribeToTopic(token, `tenant_${tenantId}`, idToken).catch(() => {});
    }
  }
  return token;
}

export function onForegroundMessage(callback: (payload: any) => void): () => void {
  const m = getMessagingInstance();
  if (!m) return () => {};
  return onMessage(m, callback);
}

export async function getPushPermissionState(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}
