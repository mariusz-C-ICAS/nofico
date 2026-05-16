import { db } from '../../../shared/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export interface BookedInterval {
  startTime: string;
  endTime: string;
  bookingId: string;
  customerName?: string;
}

function timeToMins(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minsToTime(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return timeToMins(aStart) < timeToMins(bEnd) && timeToMins(bStart) < timeToMins(aEnd);
}

export async function getBookedIntervals(
  tenantId: string,
  date: string,
  staffId: string | null,
): Promise<BookedInterval[]> {
  const snap = await getDocs(
    query(collection(db, `tenants/${tenantId}/bookings`), where('date', '==', date))
  );
  return snap.docs
    .map(d => ({ ...d.data(), bookingId: d.id } as any))
    .filter((b: any) => !['cancelled', 'no_show'].includes(b.status))
    .filter((b: any) => !staffId || !b.staffId || b.staffId === staffId)
    .map((b: any) => ({
      startTime: b.startTime,
      endTime: b.endTime,
      bookingId: b.bookingId,
      customerName: b.customerName,
    }));
}

export function isSlotOccupied(
  slotStart: string,
  slotEnd: string,
  intervals: BookedInterval[],
): boolean {
  return intervals.some(iv => overlaps(slotStart, slotEnd, iv.startTime, iv.endTime));
}

export function getAvailableSlots(
  allSlots: string[],
  durationMin: number,
  intervals: BookedInterval[],
): { slot: string; available: boolean }[] {
  return allSlots.map(slot => {
    const endTime = minsToTime(timeToMins(slot) + durationMin);
    return { slot, available: !isSlotOccupied(slot, endTime, intervals) };
  });
}

export function isSlotInPast(date: string, slot: string): boolean {
  return new Date(`${date}T${slot}:00`) <= new Date();
}

export function isSlotTooSoon(date: string, slot: string, noticeHours: number): boolean {
  if (!noticeHours) return false;
  return new Date(`${date}T${slot}:00`) < new Date(Date.now() + noticeHours * 3600000);
}
