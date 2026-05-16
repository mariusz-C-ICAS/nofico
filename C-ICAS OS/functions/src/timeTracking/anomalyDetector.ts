import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const MAX_SHIFT_HOURS = 12;
const HOLIDAY_WORK_HOURS = 8;

function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getPolishHolidays(year: number): Set<string> {
  const easter = easterSunday(year);
  return new Set([
    `${year}-01-01`,
    `${year}-01-06`,
    toDateKey(addDays(easter, 1)),
    `${year}-05-01`,
    `${year}-05-03`,
    toDateKey(addDays(easter, 49)),
    toDateKey(addDays(easter, 60)),
    `${year}-08-15`,
    `${year}-11-01`,
    `${year}-11-11`,
    `${year}-12-25`,
    `${year}-12-26`,
  ]);
}

function isHoliday(ts: admin.firestore.Timestamp): boolean {
  const d = ts.toDate();
  return getPolishHolidays(d.getFullYear()).has(toDateKey(d));
}

export const detectTimeTrackingAnomalies = functions
  .region('europe-west1')
  .pubsub.schedule('every 2 hours')
  .onRun(async () => {
    const db = admin.firestore();
    const now = Date.now();
    const cutoff = admin.firestore.Timestamp.fromMillis(now - MAX_SHIFT_HOURS * 3600_000);

    // 1. Long-shift detection (IN_PROGRESS)
    const snap = await db.collection('timeEntries')
      .where('status', '==', 'IN_PROGRESS')
      .where('startTime', '<', cutoff)
      .get();

    let alertsSent = 0;
    for (const docSnap of snap.docs) {
      const entry = docSnap.data();
      const tenantId = entry.tenantId as string;
      const userId = entry.userId as string;
      if (!tenantId || !userId) continue;

      const alerted = await db.collection(`tenants/${tenantId}/notifications`)
        .where('timeEntryId', '==', docSnap.id)
        .where('type', '==', 'BHP_LONG_SHIFT')
        .limit(1)
        .get();
      if (!alerted.empty) continue;

      await db.collection(`tenants/${tenantId}/notifications`).add({
        tenantId,
        recipientId: userId,
        timeEntryId: docSnap.id,
        documentTitle: 'Anomalia czasu pracy',
        type: 'BHP_LONG_SHIFT',
        message: `Zmiana trwa ponad ${MAX_SHIFT_HOURS}h bez przerwy — wymagana weryfikacja BHP.`,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        actionUrl: '/time-tracking',
      });
      alertsSent++;
    }

    // 2. Holiday overtime detection (COMPLETED in last 24h on Polish public holidays)
    const dayAgo = admin.firestore.Timestamp.fromMillis(now - 24 * 3600_000);
    const holidaySnap = await db.collection('timeEntries')
      .where('status', '==', 'COMPLETED')
      .where('endTime', '>=', dayAgo)
      .get();

    let holidayAlerts = 0;
    for (const docSnap of holidaySnap.docs) {
      const entry = docSnap.data();
      const tenantId = entry.tenantId as string;
      const userId = entry.userId as string;
      if (!tenantId || !userId) continue;

      const startTime = entry.startTime as admin.firestore.Timestamp | undefined;
      if (!startTime || !isHoliday(startTime)) continue;

      const durationMs = (entry.endTime?.toMillis?.() ?? 0) - startTime.toMillis();
      if (durationMs < HOLIDAY_WORK_HOURS * 3600_000) continue;

      const alerted = await db.collection(`tenants/${tenantId}/notifications`)
        .where('timeEntryId', '==', docSnap.id)
        .where('type', '==', 'HOLIDAY_OVERTIME')
        .limit(1)
        .get();
      if (!alerted.empty) continue;

      await db.collection(`tenants/${tenantId}/notifications`).add({
        tenantId,
        recipientId: userId,
        timeEntryId: docSnap.id,
        documentTitle: 'Praca w święto',
        type: 'HOLIDAY_OVERTIME',
        message: `Zarejestrowano ponad ${HOLIDAY_WORK_HOURS}h pracy w dniu ustawowo wolnym — wymagane rozliczenie nadgodzin świątecznych.`,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        actionUrl: '/time-tracking',
      });
      holidayAlerts++;
    }

    functions.logger.info('detectTimeTrackingAnomalies completed', {
      checked: snap.size,
      alertsSent,
      holidayChecked: holidaySnap.size,
      holidayAlerts,
    });
  });
