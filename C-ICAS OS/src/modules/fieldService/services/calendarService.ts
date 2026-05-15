import {
  collection, doc, addDoc, updateDoc, getDoc, getDocs,
  serverTimestamp, query, where, orderBy, onSnapshot, deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import type { ServiceEvent, ServiceType, EventStatus, RecurrenceRule, WorkerTimeLog } from '../types';

const eventsPath  = (t: string) => `tenants/${t}/serviceEvents`;
const typesPath   = (t: string) => `tenants/${t}/serviceTypes`;
const recurPath   = (t: string) => `tenants/${t}/recurrenceRules`;
const logsPath    = (t: string) => `tenants/${t}/workerTimeLogs`;

// ── Events ───────────────────────────────────────────────────────────────────

export async function createServiceEvent(
  tenantId: string,
  data: Omit<ServiceEvent, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, eventsPath(tenantId)), {
    ...data,
    tenantId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateServiceEvent(
  tenantId: string,
  eventId: string,
  data: Partial<ServiceEvent>
): Promise<void> {
  await updateDoc(doc(db, `${eventsPath(tenantId)}/${eventId}`), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function updateEventStatus(
  tenantId: string,
  eventId: string,
  status: EventStatus,
  extra?: Partial<ServiceEvent>
): Promise<void> {
  const update: any = { status, updatedAt: serverTimestamp(), ...extra };
  if (status === 'IN_TRANSIT') update.actualStartTime = serverTimestamp();
  if (status === 'COMPLETED')  update.actualEndTime   = serverTimestamp();
  await updateDoc(doc(db, `${eventsPath(tenantId)}/${eventId}`), update);
}

export function subscribeToEvents(
  tenantId: string,
  from: Date,
  to: Date,
  onData: (events: ServiceEvent[]) => void
): () => void {
  const q = query(
    collection(db, eventsPath(tenantId)),
    where('scheduledStart', '>=', Timestamp.fromDate(from)),
    where('scheduledStart', '<=', Timestamp.fromDate(to)),
    orderBy('scheduledStart', 'asc')
  );
  return onSnapshot(q, snap => {
    onData(snap.docs.map(d => ({ id: d.id, ...d.data() }) as ServiceEvent));
  });
}

export function subscribeToWorkerEvents(
  tenantId: string,
  workerId: string,
  from: Date,
  onData: (events: ServiceEvent[]) => void
): () => void {
  const q = query(
    collection(db, eventsPath(tenantId)),
    where('assignedWorkers', 'array-contains', { uid: workerId } as any),
    where('scheduledStart', '>=', Timestamp.fromDate(from)),
    orderBy('scheduledStart', 'asc')
  );
  return onSnapshot(q, snap => {
    onData(snap.docs.map(d => ({ id: d.id, ...d.data() }) as ServiceEvent));
  });
}

export async function getEventsForWorker(
  tenantId: string,
  workerId: string,
  from: Date,
  to: Date
): Promise<ServiceEvent[]> {
  const q = query(
    collection(db, eventsPath(tenantId)),
    where('scheduledStart', '>=', Timestamp.fromDate(from)),
    where('scheduledStart', '<=', Timestamp.fromDate(to)),
    orderBy('scheduledStart', 'asc')
  );
  const snap = await getDocs(q);
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() }) as ServiceEvent);
  return all.filter(e => e.assignedWorkers.some(w => w.uid === workerId));
}

// ── Service Types ─────────────────────────────────────────────────────────────

export async function createServiceType(
  tenantId: string,
  data: Omit<ServiceType, 'id' | 'createdAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, typesPath(tenantId)), {
    ...data,
    tenantId,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateServiceType(
  tenantId: string,
  typeId: string,
  data: Partial<ServiceType>
): Promise<void> {
  await updateDoc(doc(db, `${typesPath(tenantId)}/${typeId}`), data);
}

export async function deleteServiceType(tenantId: string, typeId: string): Promise<void> {
  await deleteDoc(doc(db, `${typesPath(tenantId)}/${typeId}`));
}

export function subscribeToServiceTypes(
  tenantId: string,
  onData: (types: ServiceType[]) => void
): () => void {
  const q = query(collection(db, typesPath(tenantId)), orderBy('name', 'asc'));
  return onSnapshot(q, snap => {
    onData(snap.docs.map(d => ({ id: d.id, ...d.data() }) as ServiceType));
  });
}

// ── Recurrence Rules ──────────────────────────────────────────────────────────

export async function createRecurrenceRule(
  tenantId: string,
  data: Omit<RecurrenceRule, 'id' | 'createdAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, recurPath(tenantId)), {
    ...data,
    tenantId,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export function subscribeToRecurrenceRules(
  tenantId: string,
  onData: (rules: RecurrenceRule[]) => void
): () => void {
  const q = query(collection(db, recurPath(tenantId)), where('isActive', '==', true));
  return onSnapshot(q, snap => {
    onData(snap.docs.map(d => ({ id: d.id, ...d.data() }) as RecurrenceRule));
  });
}

// ── Time Logs ─────────────────────────────────────────────────────────────────

export async function logWorkerTime(
  tenantId: string,
  data: Omit<WorkerTimeLog, 'id'>
): Promise<string> {
  const ref = await addDoc(collection(db, logsPath(tenantId)), data);
  return ref.id;
}

export async function getEventTimeLogs(tenantId: string, eventId: string): Promise<WorkerTimeLog[]> {
  const q = query(collection(db, logsPath(tenantId)), where('eventId', '==', eventId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as WorkerTimeLog);
}
