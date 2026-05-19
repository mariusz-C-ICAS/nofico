import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';
import { getAuth } from 'firebase/auth';
import { app } from '../../core/firebase/config';
import { db } from '../../shared/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { subscribeToTopic } from '../lib/fcm/topics';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

let messaging: Messaging | null = null;

function getMessagingInstance(): Messaging | null {
  try {
    if (!('serviceWorker' in navigator) || !('Notification' in window)) return null;
    if (!messaging) messaging = getMessaging(app);
    return messaging;
  } catch (e) {
    console.warn('[FCM] getMessaging failed:', e);
    return null;
  }
}

export async function requestPushPermission(userId: string, tenantId: string): Promise<string | null> {
  const m = getMessagingInstance();
  if (!m) throw new Error('[krok 1] Przeglądarka nie obsługuje powiadomień push.');

  const permission = await Notification.requestPermission();
  if (permission === 'denied') throw new Error('[krok 2] Powiadomienia zablokowane w ustawieniach przeglądarki.');
  if (permission !== 'granted') return null;

  if (!VAPID_KEY) throw new Error('[krok 3] Klucz VAPID nie jest skonfigurowany.');

  let swReg: ServiceWorkerRegistration;
  try {
    swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  } catch (e: any) {
    throw new Error('[krok 4] Rejestracja Service Worker nie powiodła się: ' + e.message);
  }

  // Wait for SW to activate (max 5s)
  if (swReg.installing || swReg.waiting) {
    await new Promise<void>((resolve, reject) => {
      const sw = swReg.installing ?? swReg.waiting!;
      const timer = setTimeout(() => reject(new Error('[krok 4] SW timeout — nie aktywował się w ciągu 5s')), 5000);
      sw.addEventListener('statechange', (e) => {
        if ((e.target as ServiceWorker).state === 'activated') { clearTimeout(timer); resolve(); }
        if ((e.target as ServiceWorker).state === 'redundant') { clearTimeout(timer); reject(new Error('[krok 4] SW stał się redundant')); }
      });
    });
  }

  let token: string;
  try {
    token = await getToken(m, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg });
  } catch (e: any) {
    throw new Error('[krok 5] getToken() failed: ' + (e?.message ?? String(e)));
  }
  if (!token) throw new Error('[krok 5] getToken() zwrócił pusty token.');

  await setDoc(
    doc(db, 'users', userId, 'fcmTokens', token.slice(-20)),
    { token, tenantId, platform: 'web', createdAt: serverTimestamp(), active: true },
    { merge: true }
  );
  const idToken = await getAuth(app).currentUser?.getIdToken();
  if (idToken) {
    await subscribeToTopic(token, `tenant_${tenantId}`, idToken).catch(() => {});
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
