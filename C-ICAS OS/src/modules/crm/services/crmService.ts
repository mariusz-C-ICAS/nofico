import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs,
  query, where, orderBy, onSnapshot, serverTimestamp, limit, Timestamp,
} from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import type {
  CrmCustomer, CrmActivity, CrmTask, NpsResponse, AutomationRule,
} from '../types';

// ── Paths ─────────────────────────────────────────────────────────────────────

const P = {
  activities:  (t: string) => `tenants/${t}/crmActivities`,
  tasks:       (t: string) => `tenants/${t}/crmTasks`,
  nps:         (t: string) => `tenants/${t}/npsResponses`,
  automations: (t: string) => `tenants/${t}/automationRules`,
  customers:   () => 'customers',
};

// ── Activities ────────────────────────────────────────────────────────────────

export function subscribeCustomerActivities(
  tenantId: string,
  customerId: string,
  onData: (items: CrmActivity[]) => void
): () => void {
  const q = query(
    collection(db, P.activities(tenantId)),
    where('customerId', '==', customerId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  return onSnapshot(q, snap => {
    onData(snap.docs.map(d => ({ id: d.id, ...d.data() }) as CrmActivity));
  });
}

export async function addActivity(
  tenantId: string,
  data: Omit<CrmActivity, 'id' | 'createdAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, P.activities(tenantId)), {
    ...data,
    createdAt: serverTimestamp(),
  });
  // Update customer lastActivityAt
  await updateCustomerLastActivity(data.customerId);
  return ref.id;
}

async function updateCustomerLastActivity(customerId: string) {
  try {
    await updateDoc(doc(db, P.customers(), customerId), {
      lastActivityAt: serverTimestamp(),
    });
  } catch { /* customer may not exist in new format */ }
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export function subscribeAllTasks(
  tenantId: string,
  onData: (items: CrmTask[]) => void
): () => void {
  const q = query(
    collection(db, P.tasks(tenantId)),
    where('isDone', '==', false),
    orderBy('dueDate', 'asc'),
    limit(100)
  );
  return onSnapshot(q, snap => {
    onData(snap.docs.map(d => ({ id: d.id, ...d.data() }) as CrmTask));
  });
}

export function subscribeCustomerTasks(
  tenantId: string,
  customerId: string,
  onData: (items: CrmTask[]) => void
): () => void {
  const q = query(
    collection(db, P.tasks(tenantId)),
    where('customerId', '==', customerId),
    where('isDone', '==', false),
    orderBy('dueDate', 'asc')
  );
  return onSnapshot(q, snap => {
    onData(snap.docs.map(d => ({ id: d.id, ...d.data() }) as CrmTask));
  });
}

export async function addTask(
  tenantId: string,
  data: Omit<CrmTask, 'id' | 'createdAt' | 'isDone' | 'completedAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, P.tasks(tenantId)), {
    ...data,
    isDone: false,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function completeTask(tenantId: string, taskId: string): Promise<void> {
  await updateDoc(doc(db, P.tasks(tenantId), taskId), {
    isDone: true,
    completedAt: serverTimestamp(),
  });
}

export async function deleteTask(tenantId: string, taskId: string): Promise<void> {
  await deleteDoc(doc(db, P.tasks(tenantId), taskId));
}

// ── NPS ───────────────────────────────────────────────────────────────────────

export async function addNpsResponse(
  tenantId: string,
  data: Omit<NpsResponse, 'id' | 'respondedAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, P.nps(tenantId)), {
    ...data,
    respondedAt: serverTimestamp(),
  });
  return ref.id;
}

export function subscribeNpsResponses(
  tenantId: string,
  onData: (items: NpsResponse[]) => void
): () => void {
  const q = query(
    collection(db, P.nps(tenantId)),
    orderBy('respondedAt', 'desc'),
    limit(200)
  );
  return onSnapshot(q, snap => {
    onData(snap.docs.map(d => ({ id: d.id, ...d.data() }) as NpsResponse));
  });
}

// ── Automation Rules ──────────────────────────────────────────────────────────

export function subscribeAutomationRules(
  tenantId: string,
  onData: (items: AutomationRule[]) => void
): () => void {
  const q = query(collection(db, P.automations(tenantId)), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => {
    onData(snap.docs.map(d => ({ id: d.id, ...d.data() }) as AutomationRule));
  });
}

export async function saveAutomationRule(
  tenantId: string,
  data: Omit<AutomationRule, 'id' | 'createdAt' | 'runCount'>
): Promise<string> {
  const ref = await addDoc(collection(db, P.automations(tenantId)), {
    ...data,
    runCount: 0,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function toggleAutomationRule(
  tenantId: string,
  ruleId: string,
  isActive: boolean
): Promise<void> {
  await updateDoc(doc(db, P.automations(tenantId), ruleId), { isActive });
}

export async function deleteAutomationRule(tenantId: string, ruleId: string): Promise<void> {
  await deleteDoc(doc(db, P.automations(tenantId), ruleId));
}

// ── Service Events for customer (Field Service bridge) ────────────────────────

export async function getCustomerServiceEvents(
  tenantId: string,
  clientId: string
): Promise<any[]> {
  const q = query(
    collection(db, `tenants/${tenantId}/serviceEvents`),
    where('clientId', '==', clientId),
    orderBy('scheduledStart', 'desc'),
    limit(20)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── Deals (read from existing flat collection) ────────────────────────────────

export async function getDealsForForecast(tenantId: string): Promise<any[]> {
  const q = query(
    collection(db, 'deals'),
    where('tenantId', '==', tenantId),
    where('stage', 'not-in', ['closed_won', 'closed_lost'])
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
