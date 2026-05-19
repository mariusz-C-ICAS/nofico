import {
  collection, doc, addDoc, updateDoc, getDoc, getDocs,
  serverTimestamp, query, where, orderBy,
} from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import { auditService } from '../../../shared/lib/audit';
import { resolveAssignees } from './roleResolutionService';
import type {
  DocumentInstance, DocumentStatus, DocumentType, DocumentMetadata,
  DocumentAttachment, StepAction, WorkflowStepRecord, WorkflowStepType,
  WorkflowTemplate,
} from '../types';

// ── Firestore path helpers ───────────────────────────────────────────────────

const instancesPath = (tenantId: string) => `tenants/${tenantId}/documentInstances`;
const stepsPath = (tenantId: string) => `tenants/${tenantId}/workflowSteps`;
const templatesPath = (tenantId: string) => `tenants/${tenantId}/workflowTemplates`;

// ── Valid state machine transitions ─────────────────────────────────────────

const VALID_TRANSITIONS: Partial<Record<DocumentStatus, DocumentStatus[]>> = {
  DRAFT: ['SUBMITTED', 'ARCHIVED'],
  SUBMITTED: ['PENDING_APPROVAL', 'REJECTED', 'DRAFT'],
  PENDING_APPROVAL: ['APPROVED', 'REJECTED', 'SUBMITTED'],
  APPROVED: ['KSEF_VERIFIED', 'BOOKED', 'BILLING_READY', 'MARKETING_REVIEW', 'CLAIM_FILED', 'BHP_DISPATCHED', 'NCR_OPEN', 'ADVANCE_ISSUED', 'ARCHIVED'],
  REJECTED: ['DRAFT', 'ARCHIVED'],
  KSEF_VERIFIED: ['BOOKED'],
  BOOKED: ['PENDING_SETTLEMENT'],
  PENDING_SETTLEMENT: ['SETTLED'],
  SETTLED: ['ARCHIVED'],
  BILLING_READY: ['ARCHIVED', 'MARKETING_REVIEW'],
  MARKETING_REVIEW: ['MARKETING_APPROVED', 'APPROVED'],
  MARKETING_APPROVED: ['ARCHIVED'],
  CLAIM_FILED: ['CLAIM_APPROVED', 'CLAIM_REJECTED'],
  CLAIM_REJECTED: ['CLAIM_APPEALED', 'ARCHIVED'],
  CLAIM_APPEALED: ['CLAIM_APPROVED', 'ARCHIVED'],
  CLAIM_APPROVED: ['PENDING_SETTLEMENT'],
  BHP_DISPATCHED: ['BHP_CLOSED', 'ARCHIVED'],
  BHP_CLOSED: ['ARCHIVED'],
  NCR_OPEN: ['NCR_VERIFIED', 'ARCHIVED'],
  NCR_VERIFIED: ['ARCHIVED'],
  ADVANCE_ISSUED: ['SETTLED', 'ARCHIVED'],
};

export function canTransition(from: DocumentStatus, to: DocumentStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ── Amount-based routing ──────────────────────────────────────────────────────
// Config at tenants/{id}/config/amountRouting:
// { thresholdAmount: 5000, additionalRoles: ['cfo', 'finance_director'] }

async function getAmountThresholdApprovers(tenantId: string, amount?: number): Promise<string[]> {
  if (!amount) return [];
  try {
    const snap = await getDoc(doc(db, `tenants/${tenantId}/config/amountRouting`));
    if (!snap.exists()) return [];
    const { thresholdAmount, additionalRoles } = snap.data() as { thresholdAmount: number; additionalRoles: string[] };
    if (!thresholdAmount || amount < thresholdAmount) return [];
    return resolveAssignees(tenantId, additionalRoles ?? []).catch(() => []);
  } catch {
    return [];
  }
}

// ── Append-only step record (GoBD) ───────────────────────────────────────────
// Never call updateDoc on workflowSteps — only addDoc

async function appendStepRecord(
  params: Omit<WorkflowStepRecord, 'id' | 'timestamp'>
): Promise<void> {
  await addDoc(collection(db, stepsPath(params.tenantId)), {
    ...params,
    timestamp: serverTimestamp(),
    deviceInfo: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
  });
}

// ── Core operations ──────────────────────────────────────────────────────────

export async function createDocumentInstance(
  tenantId: string,
  userId: string,
  userEmail: string,
  type: DocumentType,
  templateId: string,
  metadata: DocumentMetadata,
  attachments: DocumentAttachment[] = [],
  companyId?: string
): Promise<string> {
  // Pre-resolve first-step assignees (managers who will need to approve)
  const template = templateId !== 'default-out-of-pocket'
    ? await getDefaultTemplate(tenantId, type)
    : null;
  const firstStep = template?.steps[0];
  const assignedTo = firstStep?.requiredRoles
    ? await resolveAssignees(tenantId, firstStep.requiredRoles).catch(() => [userId])
    : [userId];

  const extraApprovers = await getAmountThresholdApprovers(tenantId, metadata.amount);
  const allAssignees = extraApprovers.length > 0
    ? [...new Set([...assignedTo, ...extraApprovers])]
    : (assignedTo.length > 0 ? assignedTo : [userId]);

  const ref = await addDoc(collection(db, instancesPath(tenantId)), {
    tenantId,
    ...(companyId && { companyId }),
    type,
    templateId,
    status: 'DRAFT' as DocumentStatus,
    currentStepId: 'DRAFT',
    submittedBy: userId,
    submittedByEmail: userEmail,
    assignedTo: allAssignees,
    metadata,
    attachments,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } satisfies Omit<DocumentInstance, 'id'>);

  await appendStepRecord({
    documentInstanceId: ref.id,
    tenantId,
    stepDefId: 'SYSTEM_CREATE',
    stepType: 'NOTIFY',
    action: 'CREATE',
    actorId: userId,
    actorEmail: userEmail,
    previousStatus: 'DRAFT',
    newStatus: 'DRAFT',
    note: 'Dokument utworzony',
  });

  // Slack notification — fire-and-forget, never blocks document creation
  import('./slackNotificationService').then(({ notifyWorkflowSubmit }) => {
    notifyWorkflowSubmit(tenantId, {
      type,
      title: metadata.title ?? ref.id,
      submittedBy: userEmail,
      docId: ref.id,
    }).catch(() => {});
  }).catch(() => {});

  return ref.id;
}

export async function transitionDocument(
  tenantId: string,
  documentId: string,
  action: StepAction,
  actorId: string,
  actorEmail: string,
  targetStatus: DocumentStatus,
  options: {
    note?: string;
    stepDefId?: string;
    stepType?: WorkflowStepType;
    actorRole?: string;
    assignTo?: string[];
  } = {}
): Promise<void> {
  const docRef = doc(db, `${instancesPath(tenantId)}/${documentId}`);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error(`Document not found: ${documentId}`);

  const instance = { id: snap.id, ...snap.data() } as DocumentInstance;

  if (!canTransition(instance.status, targetStatus)) {
    throw new Error(
      `Invalid transition: ${instance.status} → ${targetStatus} (action: ${action})`
    );
  }

  await appendStepRecord({
    documentInstanceId: documentId,
    tenantId,
    stepDefId: options.stepDefId ?? 'SYSTEM',
    stepType: options.stepType ?? 'APPROVAL',
    action,
    actorId,
    actorEmail,
    actorRole: options.actorRole,
    previousStatus: instance.status,
    newStatus: targetStatus,
    note: options.note,
  });

  const update: Partial<DocumentInstance> = {
    status: targetStatus,
    currentStepId: targetStatus,
    updatedAt: serverTimestamp() as any,
  };
  if (options.assignTo) update.assignedTo = options.assignTo;

  await updateDoc(docRef, update);

  await auditService.logAction(
    actorId,
    `workflow.${action.toLowerCase()}`,
    documentId,
    {
      tenantId,
      previousStatus: instance.status,
      newStatus: targetStatus,
      documentTitle: instance.metadata.title,
      note: options.note,
    },
    'documents'
  );

  // Slack transition notification — fire-and-forget
  import('./slackNotificationService').then(({ notifyWorkflowTransition }) => {
    notifyWorkflowTransition(tenantId, {
      title: instance.metadata.title,
      fromStatus: instance.status,
      toStatus: targetStatus,
      docId: documentId,
    }).catch(() => {});
  }).catch(() => {});

  // Dispatch notifications — fire-and-forget, never block the transition
  import('./notificationService').then(({ dispatchNotification, dispatchToMany, NOTIF_MESSAGES }) => {
    const t = instance.metadata.title;
    if (targetStatus === 'PENDING_APPROVAL') {
      const recipients = options.assignTo?.length ? options.assignTo : (instance.assignedTo ?? []);
      if (recipients.length) {
        dispatchToMany(recipients, { tenantId, documentInstanceId: documentId, documentTitle: t, type: 'APPROVAL_REQUIRED', message: NOTIF_MESSAGES.APPROVAL_REQUIRED!(t) }).catch(() => {});
      }
    } else if (targetStatus === 'APPROVED') {
      dispatchNotification({ tenantId, recipientId: instance.submittedBy, documentInstanceId: documentId, documentTitle: t, type: 'DOCUMENT_APPROVED', message: NOTIF_MESSAGES.DOCUMENT_APPROVED!(t) }).catch(() => {});
    } else if (targetStatus === 'REJECTED') {
      dispatchNotification({ tenantId, recipientId: instance.submittedBy, documentInstanceId: documentId, documentTitle: t, type: 'DOCUMENT_REJECTED', message: NOTIF_MESSAGES.DOCUMENT_REJECTED!(t) }).catch(() => {});
    } else if (targetStatus === 'SETTLED') {
      dispatchNotification({ tenantId, recipientId: instance.submittedBy, documentInstanceId: documentId, documentTitle: t, type: 'DOCUMENT_SETTLED', message: NOTIF_MESSAGES.DOCUMENT_SETTLED!(t) }).catch(() => {});
    } else if (targetStatus === 'BILLING_READY') {
      dispatchNotification({ tenantId, recipientId: instance.submittedBy, documentInstanceId: documentId, documentTitle: t, type: 'BILLING_READY', message: NOTIF_MESSAGES.BILLING_READY!(t) }).catch(() => {});
    } else if (targetStatus === 'MARKETING_APPROVED') {
      dispatchNotification({ tenantId, recipientId: instance.submittedBy, documentInstanceId: documentId, documentTitle: t, type: 'MARKETING_APPROVED', message: NOTIF_MESSAGES.MARKETING_APPROVED!(t) }).catch(() => {});
    } else if (targetStatus === 'CLAIM_FILED') {
      dispatchNotification({ tenantId, recipientId: instance.submittedBy, documentInstanceId: documentId, documentTitle: t, type: 'CLAIM_FILED', message: NOTIF_MESSAGES.CLAIM_FILED!(t) }).catch(() => {});
    } else if (targetStatus === 'CLAIM_REJECTED') {
      dispatchNotification({ tenantId, recipientId: instance.submittedBy, documentInstanceId: documentId, documentTitle: t, type: 'CLAIM_REJECTED', message: NOTIF_MESSAGES.CLAIM_REJECTED!(t) }).catch(() => {});
    } else if (targetStatus === 'CLAIM_APPROVED') {
      dispatchNotification({ tenantId, recipientId: instance.submittedBy, documentInstanceId: documentId, documentTitle: t, type: 'CLAIM_APPROVED', message: NOTIF_MESSAGES.CLAIM_APPROVED!(t) }).catch(() => {});
    } else if (targetStatus === 'BHP_DISPATCHED') {
      dispatchNotification({ tenantId, recipientId: instance.submittedBy, documentInstanceId: documentId, documentTitle: t, type: 'BHP_DISPATCHED', message: NOTIF_MESSAGES.BHP_DISPATCHED!(t) }).catch(() => {});
    } else if (targetStatus === 'BHP_CLOSED') {
      dispatchNotification({ tenantId, recipientId: instance.submittedBy, documentInstanceId: documentId, documentTitle: t, type: 'BHP_CLOSED', message: NOTIF_MESSAGES.BHP_CLOSED!(t) }).catch(() => {});
    } else if (targetStatus === 'NCR_OPEN') {
      dispatchNotification({ tenantId, recipientId: instance.submittedBy, documentInstanceId: documentId, documentTitle: t, type: 'NCR_OPEN', message: NOTIF_MESSAGES.NCR_OPEN!(t) }).catch(() => {});
    } else if (targetStatus === 'NCR_VERIFIED') {
      dispatchNotification({ tenantId, recipientId: instance.submittedBy, documentInstanceId: documentId, documentTitle: t, type: 'NCR_VERIFIED', message: NOTIF_MESSAGES.NCR_VERIFIED!(t) }).catch(() => {});
    } else if (targetStatus === 'ADVANCE_ISSUED') {
      dispatchNotification({ tenantId, recipientId: instance.submittedBy, documentInstanceId: documentId, documentTitle: t, type: 'ADVANCE_ISSUED', message: NOTIF_MESSAGES.ADVANCE_ISSUED!(t) }).catch(() => {});
    }
  }).catch(() => {});

  // Auto-trigger KSeF verification when document reaches APPROVED
  if (targetStatus === 'APPROVED') {
    const { runKsefWorkflowStep } = await import('./ksefVerificationService');
    const updatedInstance = await getDocumentInstance(tenantId, documentId);
    if (updatedInstance) {
      // Fire-and-forget — KSeF runs asynchronously, errors don't block approval
      runKsefWorkflowStep(tenantId, updatedInstance, actorId, actorEmail).catch(err =>
        console.warn('KSeF auto-verify failed (non-blocking):', err)
      );
    }
  }
}

// ── Read operations ──────────────────────────────────────────────────────────

export async function getDocumentInstance(
  tenantId: string,
  documentId: string
): Promise<DocumentInstance | null> {
  const snap = await getDoc(doc(db, `${instancesPath(tenantId)}/${documentId}`));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as DocumentInstance;
}

export async function getDocumentHistory(
  tenantId: string,
  documentId: string
): Promise<WorkflowStepRecord[]> {
  const q = query(
    collection(db, stepsPath(tenantId)),
    where('documentInstanceId', '==', documentId),
    orderBy('timestamp', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as WorkflowStepRecord);
}

export async function getPendingForUser(
  tenantId: string,
  userId: string
): Promise<DocumentInstance[]> {
  const q = query(
    collection(db, instancesPath(tenantId)),
    where('assignedTo', 'array-contains', userId),
    where('status', 'in', ['SUBMITTED', 'PENDING_APPROVAL']),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as DocumentInstance);
}

export async function getMySubmissions(
  tenantId: string,
  userId: string
): Promise<DocumentInstance[]> {
  const q = query(
    collection(db, instancesPath(tenantId)),
    where('submittedBy', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as DocumentInstance);
}

// ── Template helpers ─────────────────────────────────────────────────────────

export async function getDefaultTemplate(
  tenantId: string,
  type: DocumentType
): Promise<WorkflowTemplate | null> {
  const q = query(
    collection(db, templatesPath(tenantId)),
    where('documentType', '==', type),
    where('isDefault', '==', true)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as WorkflowTemplate;
}

export async function listTemplates(tenantId: string): Promise<WorkflowTemplate[]> {
  const q = query(
    collection(db, templatesPath(tenantId)),
    orderBy('documentType', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as WorkflowTemplate);
}

export async function saveTemplate(
  tenantId: string,
  userId: string,
  template: Omit<WorkflowTemplate, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, templatesPath(tenantId)), {
    ...template,
    tenantId,
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}
