import {
  collection, addDoc, updateDoc, getDocs, getDoc,
  serverTimestamp, query, where, orderBy, doc,
} from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import type {
  NotificationType, WorkflowNotification, NotificationPrefs,
  NotificationChannelPrefs,
} from '../types';

const notifPath = (tenantId: string) => `tenants/${tenantId}/notifications`;
const prefPath = (userId: string) => `users/${userId}/notificationPrefs`;

// ── Defaults (all channels on for critical types) ────────────────────────────

const DEFAULT_PREFS: Record<NotificationType, NotificationChannelPrefs> = {
  APPROVAL_REQUIRED: { auditLog: true, inApp: true, push: true },
  DOCUMENT_APPROVED: { auditLog: true, inApp: true, push: false },
  DOCUMENT_REJECTED: { auditLog: true, inApp: true, push: true },
  DOCUMENT_SETTLED: { auditLog: true, inApp: true, push: false },
  KSEF_VERIFIED: { auditLog: true, inApp: false, push: false },
  STEP_TIMEOUT: { auditLog: true, inApp: true, push: true },
  DOCUMENT_CANCELLED: { auditLog: true, inApp: true, push: false },
  CHANGES_REQUESTED: { auditLog: true, inApp: true, push: true },
};

async function getUserPrefs(userId: string, tenantId: string): Promise<NotificationPrefs> {
  try {
    const snap = await getDoc(doc(db, `${prefPath(userId)}/${tenantId}`));
    if (snap.exists()) return snap.data() as NotificationPrefs;
  } catch {
    // No prefs yet — use defaults
  }
  return { userId, tenantId, channels: DEFAULT_PREFS };
}

// ── Dispatch notification ────────────────────────────────────────────────────

export async function dispatchNotification(params: {
  tenantId: string;
  recipientId: string;
  documentInstanceId: string;
  documentTitle: string;
  type: NotificationType;
  message: string;
  actionUrl?: string;
}): Promise<void> {
  const prefs = await getUserPrefs(params.recipientId, params.tenantId);
  const channelPrefs = prefs.channels[params.type] ?? DEFAULT_PREFS[params.type];

  if (!channelPrefs.inApp) return;

  await addDoc(collection(db, notifPath(params.tenantId)), {
    tenantId: params.tenantId,
    recipientId: params.recipientId,
    documentInstanceId: params.documentInstanceId,
    documentTitle: params.documentTitle,
    type: params.type,
    message: params.message,
    read: false,
    createdAt: serverTimestamp(),
    actionUrl: params.actionUrl ?? null,
  } satisfies Omit<WorkflowNotification, 'id'>);

  if (channelPrefs.push && 'Notification' in window && Notification.permission === 'granted') {
    new Notification(`C-ICAS: ${NOTIF_TITLES[params.type]}`, {
      body: params.message,
      icon: '/favicon.ico',
    });
  }
}

export async function dispatchToMany(
  recipientIds: string[],
  params: Omit<Parameters<typeof dispatchNotification>[0], 'recipientId'>
): Promise<void> {
  await Promise.all(
    recipientIds.map(id => dispatchNotification({ ...params, recipientId: id }))
  );
}

// ── Read / mark as read ──────────────────────────────────────────────────────

export async function getMyNotifications(
  tenantId: string,
  userId: string,
  unreadOnly = false
): Promise<WorkflowNotification[]> {
  const constraints = [
    where('recipientId', '==', userId),
    orderBy('createdAt', 'desc'),
  ];
  if (unreadOnly) constraints.splice(1, 0, where('read', '==', false));

  const q = query(collection(db, notifPath(tenantId)), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as WorkflowNotification);
}

export async function markAsRead(tenantId: string, notificationId: string): Promise<void> {
  await updateDoc(doc(db, `${notifPath(tenantId)}/${notificationId}`), { read: true });
}

export async function markAllAsRead(tenantId: string, userId: string): Promise<void> {
  const notifs = await getMyNotifications(tenantId, userId, true);
  await Promise.all(
    notifs.map(n =>
      updateDoc(doc(db, `${notifPath(tenantId)}/${n.id}`), { read: true })
    )
  );
}

// ── Preferences ──────────────────────────────────────────────────────────────

export async function saveNotificationPrefs(
  userId: string,
  tenantId: string,
  channels: NotificationPrefs['channels']
): Promise<void> {
  const ref = doc(db, `${prefPath(userId)}/${tenantId}`);
  await updateDoc(ref, { channels, updatedAt: serverTimestamp() }).catch(async () => {
    await addDoc(collection(db, prefPath(userId)), {
      userId,
      tenantId,
      channels,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function getNotificationPrefs(
  userId: string,
  tenantId: string
): Promise<NotificationPrefs> {
  return getUserPrefs(userId, tenantId);
}

// ── Human-readable titles ────────────────────────────────────────────────────

export const NOTIF_TITLES: Record<NotificationType, string> = {
  APPROVAL_REQUIRED: 'Wymagane zatwierdzenie',
  DOCUMENT_APPROVED: 'Dokument zatwierdzony',
  DOCUMENT_REJECTED: 'Dokument odrzucony',
  DOCUMENT_SETTLED: 'Zwrot zrealizowany',
  KSEF_VERIFIED: 'Weryfikacja KSeF',
  STEP_TIMEOUT: 'Przekroczony czas SLA',
  DOCUMENT_CANCELLED: 'Dokument anulowany',
  CHANGES_REQUESTED: 'Wymagane poprawki',
};

export const NOTIF_MESSAGES: Partial<Record<NotificationType, (title: string) => string>> = {
  APPROVAL_REQUIRED: (t) => `Dokument "${t}" oczekuje na Twoje zatwierdzenie.`,
  DOCUMENT_APPROVED: (t) => `Dokument "${t}" został zatwierdzony.`,
  DOCUMENT_REJECTED: (t) => `Dokument "${t}" został odrzucony.`,
  DOCUMENT_SETTLED: (t) => `Zwrot dla "${t}" został zrealizowany.`,
  CHANGES_REQUESTED: (t) => `Dokument "${t}" wymaga poprawek przed ponownym wysłaniem.`,
};
