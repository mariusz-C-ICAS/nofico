import {
  collection, addDoc, updateDoc, getDocs, getDoc, setDoc,
  serverTimestamp, query, where, orderBy, doc, limit,
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
  BILLING_READY: { auditLog: true, inApp: true, push: true },
  MARKETING_APPROVED: { auditLog: true, inApp: true, push: false },
  CLAIM_FILED: { auditLog: true, inApp: true, push: false },
  CLAIM_REJECTED: { auditLog: true, inApp: true, push: true },
  CLAIM_APPROVED: { auditLog: true, inApp: true, push: true },
  BHP_DISPATCHED: { auditLog: true, inApp: true, push: true },
  BHP_CLOSED: { auditLog: true, inApp: true, push: false },
  NCR_OPEN: { auditLog: true, inApp: true, push: true },
  NCR_VERIFIED: { auditLog: true, inApp: true, push: false },
  ADVANCE_ISSUED: { auditLog: true, inApp: true, push: true },
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
  recipientEmail?: string;
  documentInstanceId: string;
  documentTitle: string;
  type: NotificationType;
  message: string;
  actionUrl?: string;
}): Promise<void> {
  const prefs = await getUserPrefs(params.recipientId, params.tenantId);
  const channelPrefs = prefs.channels[params.type] ?? DEFAULT_PREFS[params.type];

  let notifId: string | undefined;

  if (channelPrefs.inApp) {
    const ref = await addDoc(collection(db, notifPath(params.tenantId)), {
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
    notifId = ref.id;
  }

  if (channelPrefs.push && 'Notification' in window && Notification.permission === 'granted') {
    new Notification(`C-ICAS: ${NOTIF_TITLES[params.type]}`, {
      body: params.message,
      icon: '/favicon.ico',
    });
  }

  if (channelPrefs.email) {
    await addDoc(collection(db, `tenants/${params.tenantId}/emailQueue`), {
      to: params.recipientEmail ?? null,
      recipientId: params.recipientId,
      subject: `[C-ICAS] ${NOTIF_TITLES[params.type]}`,
      bodyText: params.message,
      type: params.type,
      documentInstanceId: params.documentInstanceId,
      notificationId: notifId ?? null,
      status: 'pending',
      createdAt: serverTimestamp(),
    }).catch(() => {});
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
  BILLING_READY: 'Gotowe do fakturowania',
  MARKETING_APPROVED: 'Marketing zatwierdził materiały',
  CLAIM_FILED: 'Zgłoszono szkodę do ubezpieczyciela',
  CLAIM_REJECTED: 'Ubezpieczyciel odrzucił wniosek',
  CLAIM_APPROVED: 'Ubezpieczyciel zatwierdził odszkodowanie',
  BHP_DISPATCHED: 'Incydent BHP — wysłano do wszystkich stron',
  BHP_CLOSED: 'Sprawa BHP zamknięta',
  NCR_OPEN: 'Karta Niezgodności otwarta',
  NCR_VERIFIED: 'NCR zweryfikowany — CAPA zakończona',
  ADVANCE_ISSUED: 'Zaliczka wydana — pamiętaj o rozliczeniu',
};

// ── Interaction logging ───────────────────────────────────────────────────────

export type NotificationInteractionAction = 'viewed' | 'clicked' | 'dismissed';
export type NotificationChannel = 'in_app' | 'email' | 'push';

export async function logInteraction(
  tenantId: string,
  notificationId: string,
  userId: string,
  action: NotificationInteractionAction,
  channel: NotificationChannel = 'in_app'
): Promise<void> {
  await addDoc(collection(db, `tenants/${tenantId}/notificationInteractions`), {
    notificationId,
    userId,
    tenantId,
    action,
    channel,
    timestamp: serverTimestamp(),
  }).catch(() => {});
}

export async function getInteractionLog(
  tenantId: string,
  limitCount = 50
): Promise<any[]> {
  const q = query(
    collection(db, `tenants/${tenantId}/notificationInteractions`),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── Retention config ──────────────────────────────────────────────────────────

export async function saveRetentionConfig(
  tenantId: string,
  retentionDays: number
): Promise<void> {
  await setDoc(
    doc(db, `tenants/${tenantId}/config/notifications`),
    { retentionDays, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function getRetentionConfig(tenantId: string): Promise<{ retentionDays: number }> {
  try {
    const snap = await getDoc(doc(db, `tenants/${tenantId}/config/notifications`));
    if (snap.exists()) return snap.data() as { retentionDays: number };
  } catch { /* default */ }
  return { retentionDays: 90 };
}

// ── Human-readable messages ───────────────────────────────────────────────────

export const NOTIF_MESSAGES: Partial<Record<NotificationType, (title: string) => string>> = {
  APPROVAL_REQUIRED: (t) => `Dokument "${t}" oczekuje na Twoje zatwierdzenie.`,
  DOCUMENT_APPROVED: (t) => `Dokument "${t}" został zatwierdzony.`,
  DOCUMENT_REJECTED: (t) => `Dokument "${t}" został odrzucony.`,
  DOCUMENT_SETTLED: (t) => `Zwrot dla "${t}" został zrealizowany.`,
  CHANGES_REQUESTED: (t) => `Dokument "${t}" wymaga poprawek przed ponownym wysłaniem.`,
  BILLING_READY: (t) => `Projekt "${t}" został skierowany do fakturowania klienta.`,
  MARKETING_APPROVED: (t) => `Materiały z projektu "${t}" zostały zatwierdzone przez Marketing do publikacji.`,
  CLAIM_FILED: (t) => `Szkoda "${t}" została zgłoszona do ubezpieczyciela — oczekiwanie na odpowiedź.`,
  CLAIM_REJECTED: (t) => `Ubezpieczyciel odrzucił wniosek dla "${t}". Backoffice może złożyć odwołanie.`,
  CLAIM_APPROVED: (t) => `Ubezpieczyciel zatwierdził odszkodowanie dla "${t}". Przekaż do FI.`,
  BHP_DISPATCHED: (t) => `Incydent BHP "${t}" wysłany do BeHaPowca, ubezpieczyciela i zarządu. Dowody zabezpieczone.`,
  BHP_CLOSED: (t) => `Sprawa BHP "${t}" została zamknięta. Pełny log dostępny w archiwum.`,
  NCR_OPEN: (t) => `Karta Niezgodności "${t}" jest otwarta. Przypisano odpowiedzialność za CAPA.`,
  NCR_VERIFIED: (t) => `NCR "${t}" zweryfikowany i zamknięty. Działania korygujące zakończone.`,
  ADVANCE_ISSUED: (t) => `Zaliczka dla "${t}" została wydana. Rozlicz ją do zadeklarowanej daty.`,
};
