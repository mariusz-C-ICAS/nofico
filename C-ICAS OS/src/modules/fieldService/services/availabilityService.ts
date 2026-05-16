import { getDocs, query, collection, where, Timestamp } from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import type { ServiceEvent } from '../types';

export interface FeasibilityResult {
  workerAvailable: boolean;
  travelFeasible: boolean;
  estimatedArrivalMinutes: number;
  conflictingEventId?: string;
  distanceKm: number;
  warnings: string[];
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function checkWorkerFeasibility(
  tenantId: string,
  workerId: string,
  proposedStart: Date,
  proposedEnd: Date,
  destLat?: number,
  destLng?: number,
  skipEventId?: string
): Promise<FeasibilityResult> {
  const from = new Date(proposedStart.getTime() - 6 * 3600_000);
  const to   = new Date(proposedEnd.getTime()   + 2 * 3600_000);
  const q = query(
    collection(db, `tenants/${tenantId}/serviceEvents`),
    where('scheduledStart', '>=', Timestamp.fromDate(from)),
    where('scheduledStart', '<=', Timestamp.fromDate(to)),
  );
  const snap = await getDocs(q);
  const events = snap.docs
    .map(d => ({ id: d.id, ...d.data() }) as ServiceEvent)
    .filter(e =>
      e.id !== skipEventId &&
      !['CANCELLED', 'ARCHIVED'].includes(e.status) &&
      e.assignedWorkers.some(w => w.uid === workerId)
    );

  const warnings: string[] = [];
  let workerAvailable = true;
  let conflictingEventId: string | undefined;

  for (const e of events) {
    const s: Date = e.scheduledStart.toDate();
    const end: Date = e.scheduledEnd.toDate();
    if (proposedStart < end && proposedEnd > s) {
      workerAvailable = false;
      conflictingEventId = e.id;
      warnings.push(`Kolizja z: ${e.title || e.clientName} (${s.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })})`);
      break;
    }
  }

  let distanceKm = 0;
  let estimatedArrivalMinutes = 0;
  let travelFeasible = true;

  if (destLat && destLng && workerAvailable) {
    const prevEvent = events
      .filter(e => {
        const end: Date = e.scheduledEnd?.toDate?.();
        return end && end <= proposedStart;
      })
      .sort((a, b) => b.scheduledEnd.toDate().getTime() - a.scheduledEnd.toDate().getTime())[0];

    if (prevEvent?.location?.lat && prevEvent.location.lng) {
      distanceKm = haversineKm(prevEvent.location.lat, prevEvent.location.lng, destLat, destLng);
      estimatedArrivalMinutes = Math.round((distanceKm / 40) * 60 + 15);
      const prevEnd: Date = prevEvent.scheduledEnd.toDate();
      const minutesAvail = (proposedStart.getTime() - prevEnd.getTime()) / 60_000;
      if (estimatedArrivalMinutes > minutesAvail) {
        travelFeasible = false;
        warnings.push(
          `Niewystarczający czas dojazdu: potrzeba ${estimatedArrivalMinutes} min, ` +
          `dostępne ${Math.round(minutesAvail)} min (${Math.round(distanceKm)} km od poprzedniego miejsca)`
        );
      }
    }
  }

  return { workerAvailable, travelFeasible, estimatedArrivalMinutes, conflictingEventId, distanceKm, warnings };
}

export async function findAvailableSlots(
  tenantId: string,
  workerId: string,
  durationMinutes: number,
  fromDate: Date,
  daysAhead: number
): Promise<Date[]> {
  const to = new Date(fromDate.getTime() + daysAhead * 86_400_000);
  const q = query(
    collection(db, `tenants/${tenantId}/serviceEvents`),
    where('scheduledStart', '>=', Timestamp.fromDate(fromDate)),
    where('scheduledStart', '<=', Timestamp.fromDate(to)),
  );
  const snap = await getDocs(q);
  const busy = snap.docs
    .map(d => ({ id: d.id, ...d.data() }) as ServiceEvent)
    .filter(e => e.assignedWorkers.some(w => w.uid === workerId) && !['CANCELLED', 'ARCHIVED'].includes(e.status));

  const slots: Date[] = [];
  for (let d = 0; d < daysAhead && slots.length < 12; d++) {
    const day = new Date(fromDate.getTime() + d * 86_400_000);
    if (day.getDay() === 0) continue;
    for (let h = 8; h <= 16; h++) {
      const slotStart = new Date(day); slotStart.setHours(h, 0, 0, 0);
      const slotEnd   = new Date(slotStart.getTime() + durationMinutes * 60_000);
      if (slotEnd.getHours() > 17) break;
      const conflict = busy.some(e => {
        const s: Date = e.scheduledStart.toDate();
        const e2: Date = e.scheduledEnd.toDate();
        return slotStart < e2 && slotEnd > s;
      });
      if (!conflict) slots.push(new Date(slotStart));
    }
  }
  return slots;
}
