/**
 * Data: 2026-05-16
 * Zmiany: Firestore-based Temporal-like Workflow Engine.
 * Sciezka: /src/modules/finance/services/workflowEngine.ts
 */
import {
  collection,
  doc,
  addDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  runTransaction,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import { buildFA2Xml, sendInvoicesToKsef, getUPO, KsefSession } from './ksefService';
import { searchByNip, GusCompanyData } from './gusBirService';
import { batchCheckNips as bialaListaBatchCheck } from './bialaListaService';

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorkflowStatus = 'pending' | 'running' | 'completed' | 'failed' | 'retrying';

export interface WorkflowStep {
  stepId: string;
  name: string;
  status: WorkflowStatus;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  retryCount: number;
  output?: unknown;
}

export interface Workflow {
  id: string;
  type: 'ksef_batch_send' | 'jpk_generate' | 'ml_insights_refresh' | 'gus_batch_lookup';
  tenantId: string;
  status: WorkflowStatus;
  steps: WorkflowStep[];
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  metadata?: Record<string, unknown>;
  totalItems?: number;
  processedItems?: number;
}

// ─── Stubs dla opcjonalnych serwisow ─────────────────────────────────────────

async function batchCheckNips(
  tenantId: string,
  nips: string[]
): Promise<Record<string, boolean>> {
  const blMap = await bialaListaBatchCheck(nips);
  const result: Record<string, boolean> = {};
  blMap.forEach((blResult, nip) => {
    result[nip] = blResult.isActiveVatPayer;
  });
  return result;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MAX_RETRY = 3;
const UPO_POLL_MAX = 10;
const UPO_POLL_DELAY_MS = 2000;
const GUS_BATCH_CONCURRENCY = 10;

function workflowsCol(tenantId: string) {
  return collection(db, 'tenants', tenantId, 'workflows');
}

function workflowDoc(tenantId: string, workflowId: string) {
  return doc(db, 'tenants', tenantId, 'workflows', workflowId);
}

function makeStep(stepId: string, name: string): WorkflowStep {
  return { stepId, name, status: 'pending', retryCount: 0 };
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Public: createWorkflow ───────────────────────────────────────────────────

export async function createWorkflow(
  tenantId: string,
  type: Workflow['type'],
  metadata?: Record<string, unknown>
): Promise<string> {
  const now = Date.now();
  const ref = await addDoc(workflowsCol(tenantId), {
    type,
    tenantId,
    status: 'pending' as WorkflowStatus,
    steps: [],
    createdAt: now,
    updatedAt: now,
    metadata: metadata ?? {},
    totalItems: 0,
    processedItems: 0,
  });
  return ref.id;
}

// ─── Public: updateWorkflowStep ───────────────────────────────────────────────

export async function updateWorkflowStep(
  tenantId: string,
  workflowId: string,
  stepId: string,
  update: Partial<WorkflowStep>
): Promise<void> {
  const ref = workflowDoc(tenantId, workflowId);
  await runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error(`Workflow ${workflowId} not found`);
    const data = snap.data() as Omit<Workflow, 'id'>;
    const steps = data.steps.map(s =>
      s.stepId === stepId ? { ...s, ...update } : s
    );
    tx.update(ref, { steps, updatedAt: Date.now() });
  });
}

// ─── Internal: setWorkflowStatus ─────────────────────────────────────────────

async function setWorkflowStatus(
  tenantId: string,
  workflowId: string,
  status: WorkflowStatus,
  extra?: Partial<Pick<Workflow, 'completedAt' | 'processedItems'>>
): Promise<void> {
  await updateDoc(workflowDoc(tenantId, workflowId), {
    status,
    updatedAt: Date.now(),
    ...(extra ?? {}),
  });
}

// ─── Internal: runStep ────────────────────────────────────────────────────────

async function runStep<T>(
  tenantId: string,
  workflowId: string,
  step: WorkflowStep,
  fn: () => Promise<T>
): Promise<T> {
  await updateWorkflowStep(tenantId, workflowId, step.stepId, {
    status: 'running',
    startedAt: Date.now(),
  });

  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= MAX_RETRY; attempt++) {
    try {
      const output = await fn();
      await updateWorkflowStep(tenantId, workflowId, step.stepId, {
        status: 'completed',
        completedAt: Date.now(),
        output: output as unknown,
      });
      return output;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRY) {
        await updateWorkflowStep(tenantId, workflowId, step.stepId, {
          status: 'retrying',
          retryCount: attempt + 1,
          error: lastError.message,
        });
      }
    }
  }

  await updateWorkflowStep(tenantId, workflowId, step.stepId, {
    status: 'failed',
    error: lastError?.message ?? 'Unknown error',
  });
  throw lastError ?? new Error('Step failed');
}

// ─── Public: runKsefBatchWorkflow ─────────────────────────────────────────────

export async function runKsefBatchWorkflow(
  tenantId: string,
  invoiceIds: string[],
  session: KsefSession
): Promise<string> {
  const stepDefs = [
    'validate',
    'build_xml',
    'send_to_ksef',
    'fetch_upo',
    'update_firestore',
  ];

  const steps = stepDefs.map(id => makeStep(id, id));
  const now = Date.now();

  const ref = await addDoc(workflowsCol(tenantId), {
    type: 'ksef_batch_send' as Workflow['type'],
    tenantId,
    status: 'running' as WorkflowStatus,
    steps,
    createdAt: now,
    updatedAt: now,
    totalItems: invoiceIds.length,
    processedItems: 0,
    metadata: { invoiceCount: invoiceIds.length },
  });
  const workflowId = ref.id;

  try {
    // Krok 1: validate — sprawdz czy ids niepuste
    await runStep(tenantId, workflowId, steps[0], async () => {
      if (invoiceIds.length === 0) throw new Error('Brak faktur do wysylki');
      return { validated: invoiceIds.length };
    });

    // Krok 2: build_xml — buduj XML dla kazdej faktury
    const xmlMap: Record<string, string> = {};
    await runStep(tenantId, workflowId, steps[1], async () => {
      const { getDoc: fsGetDoc } = await import('firebase/firestore');
      for (const id of invoiceIds) {
        const snap = await fsGetDoc(doc(db, `tenants/${tenantId}/invoices/${id}`));
        if (!snap.exists()) continue;
        const raw = { id, ...snap.data() } as unknown as Record<string, unknown> & { id: string };
        // buildFA2Xml przyjmuje KsefInvoiceFA2 — mapujemy z surowych danych
        const fa2 = {
          ksefReferenceNumber: '',
          faNumber: raw.faNumber as string ?? raw.number as string ?? id,
          issueDate: raw.issueDate as string ?? new Date().toISOString().slice(0, 10),
          sellerNip: raw.sellerNip as string ?? '',
          sellerName: raw.sellerName as string ?? '',
          buyerNip: raw.buyerNip as string | undefined,
          buyerName: raw.buyerName as string ?? '',
          netAmount: Number(raw.netAmount ?? raw.net ?? 0),
          vatAmount: Number(raw.vatAmount ?? raw.vat ?? 0),
          grossAmount: Number(raw.grossAmount ?? raw.gross ?? 0),
          currency: raw.currency as string ?? 'PLN',
          invoiceHash: '',
          status: 'Approved' as const,
        };
        xmlMap[id] = buildFA2Xml(fa2);
      }
      return { built: Object.keys(xmlMap).length };
    });

    // Krok 3: send_to_ksef
    const sendResults = await runStep(tenantId, workflowId, steps[2], async () => {
      return sendInvoicesToKsef(tenantId, invoiceIds, session);
    });

    // Krok 4: fetch_upo — polling dla kazdego referenceNumber
    await runStep(tenantId, workflowId, steps[3], async () => {
      const refs = sendResults.map(r => r.referenceNumber).filter(Boolean);
      const upos: unknown[] = [];
      for (const refNum of refs) {
        let upo: unknown = null;
        for (let i = 0; i < UPO_POLL_MAX; i++) {
          try {
            upo = await getUPO(tenantId, refNum, session);
            break;
          } catch {
            if (i < UPO_POLL_MAX - 1) await delay(UPO_POLL_DELAY_MS);
          }
        }
        upos.push(upo);
      }
      return { upos: upos.length };
    });

    // Krok 5: update_firestore — bulk mark as sent
    await runStep(tenantId, workflowId, steps[4], async () => {
      const { updateDoc: fsUpdate, doc: fsDoc } = await import('firebase/firestore');
      for (const inv of sendResults) {
        await fsUpdate(fsDoc(db, `tenants/${tenantId}/invoices/${inv.invoiceId}`), {
          ksefStatus: 'completed',
          ksefReferenceNumber: inv.referenceNumber,
        });
      }
      return { updated: sendResults.length };
    });

    await setWorkflowStatus(tenantId, workflowId, 'completed', {
      completedAt: Date.now(),
      processedItems: invoiceIds.length,
    });
  } catch (err) {
    await setWorkflowStatus(tenantId, workflowId, 'failed');
    console.error('[workflowEngine] ksef_batch_send failed:', err);
  }

  return workflowId;
}

// ─── Public: runGusLookupWorkflow ─────────────────────────────────────────────

export async function runGusLookupWorkflow(
  tenantId: string,
  nips: string[],
  userKey?: string
): Promise<string> {
  const stepDefs = ['cache_check', 'api_lookup', 'biala_lista', 'save_results'];
  const steps = stepDefs.map(id => makeStep(id, id));
  const now = Date.now();

  const ref = await addDoc(workflowsCol(tenantId), {
    type: 'gus_batch_lookup' as Workflow['type'],
    tenantId,
    status: 'running' as WorkflowStatus,
    steps,
    createdAt: now,
    updatedAt: now,
    totalItems: nips.length,
    processedItems: 0,
    metadata: { nipCount: nips.length },
  });
  const workflowId = ref.id;

  try {
    // Krok 1: cache_check — filtruj NIPs juz w cache
    let nipsToLookup = nips;
    await runStep(tenantId, workflowId, steps[0], async () => {
      const { getDoc: fsGetDoc, doc: fsDoc } = await import('firebase/firestore');
      const uncached: string[] = [];
      for (const nip of nips) {
        const snap = await fsGetDoc(fsDoc(db, `tenants/${tenantId}/gusCacheByNip/${nip}`));
        if (!snap.exists()) uncached.push(nip);
      }
      nipsToLookup = uncached;
      return { total: nips.length, uncached: uncached.length };
    });

    // Krok 2: api_lookup — max 10 rownolegly
    const results: Record<string, GusCompanyData | null> = {};
    await runStep(tenantId, workflowId, steps[1], async () => {
      let processed = 0;
      for (let i = 0; i < nipsToLookup.length; i += GUS_BATCH_CONCURRENCY) {
        const batch = nipsToLookup.slice(i, i + GUS_BATCH_CONCURRENCY);
        const settled = await Promise.allSettled(
          batch.map(nip => searchByNip(nip, tenantId, userKey))
        );
        settled.forEach((res, idx) => {
          const nip = batch[idx];
          results[nip] = res.status === 'fulfilled' && res.value.found
            ? (res.value.data ?? null)
            : null;
        });
        processed += batch.length;
        await updateDoc(workflowDoc(tenantId, workflowId), {
          processedItems: processed,
          updatedAt: Date.now(),
        });
      }
      return { found: Object.values(results).filter(Boolean).length };
    });

    // Krok 3: biala_lista
    const whiteListStatus: Record<string, boolean> = {};
    await runStep(tenantId, workflowId, steps[2], async () => {
      const nipList = Object.keys(results);
      const checked = await batchCheckNips(tenantId, nipList);
      Object.assign(whiteListStatus, checked);
      return { checked: nipList.length };
    });

    // Krok 4: save_results
    await runStep(tenantId, workflowId, steps[3], async () => {
      const { setDoc: fsSetDoc, doc: fsDoc } = await import('firebase/firestore');
      const saveNow = Date.now();
      let saved = 0;
      for (const [nip, data] of Object.entries(results)) {
        if (!data) continue;
        await fsSetDoc(fsDoc(db, `tenants/${tenantId}/gusCacheByNip/${nip}`), {
          ...data,
          bialaLista: whiteListStatus[nip] ?? null,
          fetchedAt: saveNow,
        });
        saved++;
      }
      return { saved };
    });

    await setWorkflowStatus(tenantId, workflowId, 'completed', {
      completedAt: Date.now(),
      processedItems: nips.length,
    });
  } catch (err) {
    await setWorkflowStatus(tenantId, workflowId, 'failed');
    console.error('[workflowEngine] gus_batch_lookup failed:', err);
  }

  return workflowId;
}

// ─── Public: getWorkflowStatus ────────────────────────────────────────────────

export async function getWorkflowStatus(
  tenantId: string,
  workflowId: string
): Promise<Workflow | null> {
  const snap = await getDoc(workflowDoc(tenantId, workflowId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Workflow;
}

// ─── Public: subscribeToWorkflow ──────────────────────────────────────────────

export function subscribeToWorkflow(
  tenantId: string,
  workflowId: string,
  callback: (w: Workflow) => void
): Unsubscribe {
  return onSnapshot(workflowDoc(tenantId, workflowId), snap => {
    if (snap.exists()) {
      callback({ id: snap.id, ...snap.data() } as Workflow);
    }
  });
}
