import Dexie, { Table } from 'dexie';
import { createDocumentInstance, transitionDocument } from './workflowEngine';
import type { DocumentMetadata, DocumentAttachment, DocumentType } from '../types';

// ── Offline draft schema ──────────────────────────────────────────────────────

export interface WorkflowDraft {
  localId?: number;
  tenantId: string;
  userId: string;
  userEmail: string;
  type: DocumentType;
  templateId: string;
  metadata: DocumentMetadata;
  attachments: DocumentAttachment[];
  syncStatus: 'pending' | 'syncing' | 'synced' | 'error';
  syncError?: string;
  firestoreId?: string;        // set after successful sync
  createdAt: number;           // Date.now() — used offline (no serverTimestamp)
  updatedAt: number;
}

// ── Dexie DB ──────────────────────────────────────────────────────────────────

export class WorkflowOfflineDB extends Dexie {
  drafts!: Table<WorkflowDraft>;

  constructor() {
    super('WorkflowOfflineDB');
    this.version(1).stores({
      drafts: '++localId, tenantId, userId, syncStatus, createdAt',
    });
  }
}

export const workflowOfflineDB = new WorkflowOfflineDB();

// ── CRUD helpers ──────────────────────────────────────────────────────────────

export async function saveDraftOffline(
  draft: Omit<WorkflowDraft, 'localId' | 'syncStatus' | 'createdAt' | 'updatedAt'>
): Promise<number> {
  const now = Date.now();
  return workflowOfflineDB.drafts.add({
    ...draft,
    syncStatus: 'pending',
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateDraftOffline(
  localId: number,
  changes: Partial<Pick<WorkflowDraft, 'metadata' | 'attachments' | 'syncStatus' | 'syncError' | 'firestoreId'>>
): Promise<void> {
  await workflowOfflineDB.drafts.update(localId, {
    ...changes,
    updatedAt: Date.now(),
  });
}

export async function getPendingDrafts(tenantId: string, userId: string): Promise<WorkflowDraft[]> {
  return workflowOfflineDB.drafts
    .where({ tenantId, userId, syncStatus: 'pending' })
    .toArray();
}

export async function getAllDrafts(tenantId: string, userId: string): Promise<WorkflowDraft[]> {
  return workflowOfflineDB.drafts
    .where({ tenantId, userId })
    .reverse()
    .sortBy('createdAt');
}

export async function deleteDraft(localId: number): Promise<void> {
  await workflowOfflineDB.drafts.delete(localId);
}

// ── Sync engine ───────────────────────────────────────────────────────────────
// Call this when online status is restored.
// Returns { synced, failed } counts.

export async function syncPendingDrafts(
  tenantId: string,
  userId: string,
  userEmail: string
): Promise<{ synced: number; failed: number }> {
  const pending = await getPendingDrafts(tenantId, userId);
  let synced = 0;
  let failed = 0;

  for (const draft of pending) {
    if (!draft.localId) continue;
    await updateDraftOffline(draft.localId, { syncStatus: 'syncing' });

    try {
      const firestoreId = await createDocumentInstance(
        tenantId,
        userId,
        userEmail,
        draft.type,
        draft.templateId,
        draft.metadata,
        draft.attachments
      );

      // Auto-submit if the draft was meant to be submitted (not just saved)
      await transitionDocument(tenantId, firestoreId, 'SUBMIT', userId, userEmail, 'PENDING_APPROVAL', {
        note: 'Dokument zsynchronizowany z trybu offline.',
        stepType: 'APPROVAL',
        stepDefId: 'step-1',
      });

      await updateDraftOffline(draft.localId, {
        syncStatus: 'synced',
        firestoreId,
        syncError: undefined,
      });
      synced++;
    } catch (err: any) {
      await updateDraftOffline(draft.localId, {
        syncStatus: 'error',
        syncError: err?.message ?? 'Błąd synchronizacji.',
      });
      failed++;
    }
  }

  return { synced, failed };
}

// ── Online detector hook (React) ──────────────────────────────────────────────
// Import and use in WorkflowModule to auto-trigger sync on reconnect.

export function createOnlineListener(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}

export function isOnline(): boolean {
  return navigator.onLine;
}
