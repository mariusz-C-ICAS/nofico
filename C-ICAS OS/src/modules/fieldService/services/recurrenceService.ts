import { Timestamp } from 'firebase/firestore';
import { createServiceEvent } from './calendarService';
import type { RecurrenceRule, ServiceEvent, EventStatus } from '../types';

export function generateOccurrences(rule: RecurrenceRule, fromDate: Date, toDate: Date): Date[] {
  const ruleStart  = new Date(rule.startDate);
  const ruleEnd    = rule.endDate ? new Date(rule.endDate) : toDate;
  const effectiveFrom = ruleStart > fromDate ? ruleStart : fromDate;
  const effectiveTo   = ruleEnd < toDate ? ruleEnd : toDate;

  const dates: Date[] = [];
  let cursor = new Date(effectiveFrom);
  cursor.setHours(8, 0, 0, 0);

  const addIfInRange = (d: Date) => {
    if (d >= effectiveFrom && d <= effectiveTo) dates.push(new Date(d));
  };

  while (cursor <= effectiveTo && dates.length < 365) {
    const freq = rule.frequency;
    if (freq === 'daily') {
      addIfInRange(cursor);
      cursor = new Date(cursor.getTime() + 86_400_000);
    } else if (freq === 'weekly' || freq === 'biweekly') {
      const dows = rule.daysOfWeek?.length ? rule.daysOfWeek : [1];
      for (const dow of dows) {
        const d = new Date(cursor);
        const diff = (dow - d.getDay() + 7) % 7;
        d.setDate(d.getDate() + diff);
        addIfInRange(d);
      }
      cursor = new Date(cursor.getTime() + (freq === 'biweekly' ? 14 : 7) * 86_400_000);
    } else if (freq === 'monthly') {
      addIfInRange(cursor);
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate());
    } else {
      break;
    }
  }

  const seen = new Set<string>();
  return dates.filter(d => {
    const k = d.toISOString().slice(0, 10);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export async function materializeRecurrenceRule(
  tenantId: string,
  rule: RecurrenceRule,
  serviceTypeName: string,
  serviceTypeColor: string,
  defaultDuration: number,
  defaultPrice: number,
  currency: string,
  createdBy: string,
  createdByEmail: string,
  fromDate: Date,
  toDate: Date
): Promise<string[]> {
  const dates = generateOccurrences(rule, fromDate, toDate);
  const ids: string[] = [];
  for (const d of dates) {
    const endDate = new Date(d.getTime() + defaultDuration * 60_000);
    const eventData: Omit<ServiceEvent, 'id' | 'createdAt' | 'updatedAt'> = {
      tenantId,
      title: `${rule.clientName} — ${serviceTypeName}`,
      clientId: rule.clientId,
      clientName: rule.clientName,
      serviceTypeId: rule.serviceTypeId,
      serviceTypeName,
      serviceTypeColor,
      location: rule.location,
      assignedWorkers: rule.defaultWorkers,
      scheduledStart: Timestamp.fromDate(d),
      scheduledEnd: Timestamp.fromDate(endDate),
      estimatedDurationMinutes: defaultDuration,
      status: 'SCHEDULED' as EventStatus,
      isRecurring: true,
      recurrenceId: rule.id,
      recurrenceLabel: rule.frequency,
      price: rule.basePrice ?? defaultPrice,
      currency,
      createdBy,
      createdByEmail,
    };
    const id = await createServiceEvent(tenantId, eventData);
    ids.push(id);
  }
  return ids;
}
