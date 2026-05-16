import { db } from '../../../shared/lib/firebase';
import {
  collection, query, where, getDocs, addDoc, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import type { DeMinimisEntry, DeMinimisStatus } from '../types';

const LIMIT_EUR = 200_000;
const WINDOW_MS = 3 * 365 * 24 * 3600_000;

async function getEurPlnRate(): Promise<number> {
  try {
    const res = await fetch('https://api.nbp.pl/api/exchangerates/rates/a/eur/?format=json');
    if (!res.ok) return 4.25;
    const data = await res.json() as { rates: { mid: number }[] };
    return data.rates[0]?.mid ?? 4.25;
  } catch {
    return 4.25;
  }
}

export async function getDeMinimisStatus(tenantId: string): Promise<DeMinimisStatus> {
  const since = Timestamp.fromMillis(Date.now() - WINDOW_MS);
  const snap = await getDocs(
    query(
      collection(db, `tenants/${tenantId}/deMinimisEntries`),
      where('grantedAt', '>=', since)
    )
  );

  const entries = snap.docs.map(d => ({ id: d.id, ...d.data() } as DeMinimisEntry));
  const totalEUR = entries.reduce((s, e) => s + e.amountEUR, 0);
  const utilizationPercent = (totalEUR / LIMIT_EUR) * 100;

  return {
    totalEUR,
    limitEUR: LIMIT_EUR,
    remainingEUR: Math.max(0, LIMIT_EUR - totalEUR),
    utilizationPercent,
    entries,
    isApproachingLimit: utilizationPercent >= 80 && !( totalEUR > LIMIT_EUR),
    isExceeded: totalEUR > LIMIT_EUR,
  };
}

export async function addDeMinimisEntry(
  tenantId: string,
  grantProjectId: string,
  program: string,
  amountPLN: number
): Promise<string> {
  const [status, rate] = await Promise.all([getDeMinimisStatus(tenantId), getEurPlnRate()]);
  const amountEUR = Math.round((amountPLN / rate) * 100) / 100;

  if (status.totalEUR + amountEUR > LIMIT_EUR) {
    throw new Error(
      `Przekroczenie limitu de minimis: ${(status.totalEUR + amountEUR).toFixed(0)} EUR > ${LIMIT_EUR} EUR`
    );
  }

  const now = Date.now();
  const ref = await addDoc(collection(db, `tenants/${tenantId}/deMinimisEntries`), {
    tenantId, grantProjectId, program,
    amountPLN, amountEUR, eurPlnRate: rate,
    grantedAt: Timestamp.fromMillis(now),
    validUntil: Timestamp.fromMillis(now + WINDOW_MS),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function checkDeMinimisBeforeGrant(
  tenantId: string,
  requestedPLN: number
): Promise<{ canGrant: boolean; marginEUR: number; message: string }> {
  const [status, rate] = await Promise.all([getDeMinimisStatus(tenantId), getEurPlnRate()]);
  const requestedEUR = requestedPLN / rate;
  const canGrant = status.totalEUR + requestedEUR <= LIMIT_EUR;
  const marginEUR = Math.round((status.remainingEUR - requestedEUR) * 100) / 100;

  return {
    canGrant,
    marginEUR,
    message: canGrant
      ? `Pomoc de minimis możliwa. Pozostały limit po udzieleniu: ${marginEUR.toFixed(0)} EUR`
      : `Przekroczenie limitu de minimis o ${Math.abs(marginEUR).toFixed(0)} EUR`,
  };
}
