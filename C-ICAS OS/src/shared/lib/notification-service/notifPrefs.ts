import { db } from '../firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import type { NotifType } from './index';

export type NotifChannel = 'in_app' | 'push' | 'email';

export type NotifPrefs = {
  [K in NotifType]?: {
    channels: NotifChannel[];
    enabled: boolean;
  };
};

const DEFAULT_PREFS: NotifPrefs = {
  APPROVAL_REQUIRED:  { channels: ['in_app', 'push', 'email'], enabled: true },
  DOCUMENT_APPROVED:  { channels: ['in_app', 'push'], enabled: true },
  DOCUMENT_REJECTED:  { channels: ['in_app', 'push', 'email'], enabled: true },
  STEP_TIMEOUT:       { channels: ['in_app', 'email'], enabled: true },
  PAYMENT_RECEIVED:   { channels: ['in_app', 'push'], enabled: true },
  TASK_ASSIGNED:      { channels: ['in_app', 'push'], enabled: true },
  INFO:               { channels: ['in_app'], enabled: true },
};

const _cache = new Map<string, NotifPrefs>();

export async function getNotifPrefs(uid: string, tenantId: string): Promise<NotifPrefs> {
  const key = `${uid}/${tenantId}`;
  if (_cache.has(key)) return _cache.get(key)!;

  const snap = await getDoc(doc(db, `users/${uid}/notifPrefs/${tenantId}`));
  const prefs: NotifPrefs = snap.exists()
    ? { ...DEFAULT_PREFS, ...snap.data() as NotifPrefs }
    : DEFAULT_PREFS;

  _cache.set(key, prefs);
  return prefs;
}

export async function saveNotifPrefs(uid: string, tenantId: string, prefs: NotifPrefs): Promise<void> {
  const key = `${uid}/${tenantId}`;
  _cache.delete(key);
  await setDoc(
    doc(db, `users/${uid}/notifPrefs/${tenantId}`),
    { ...prefs, updatedAt: serverTimestamp() },
    { merge: true }
  );
}
