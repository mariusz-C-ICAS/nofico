import {
  collection, query, where, getDocs, addDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import { dispatchToMany, NOTIF_TITLES } from './notificationService';
import type { DocumentInstance } from '../types';

export interface SlaViolation {
  documentId: string;
  documentTitle: string;
  status: string;
  hoursOverdue: number;
  assignedTo: string[];
}

// ── Manual SLA scan ───────────────────────────────────────────────────────────
// Call this from an admin panel or Cloud Function scheduler.
// Finds PENDING_APPROVAL documents that have exceeded their timeout threshold.

export async function scanSlaViolations(
  tenantId: string,
  timeoutHours = 48
): Promise<SlaViolation[]> {
  const cutoff = new Date(Date.now() - timeoutHours * 3_600_000);

  const q = query(
    collection(db, `tenants/${tenantId}/documentInstances`),
    where('status', 'in', ['PENDING_APPROVAL', 'SUBMITTED'])
  );
  const snap = await getDocs(q);
  const violations: SlaViolation[] = [];

  for (const d of snap.docs) {
    const doc = { id: d.id, ...d.data() } as DocumentInstance;
    const updatedAt: Date | null = doc.updatedAt?.toDate?.() ?? null;
    if (!updatedAt || updatedAt > cutoff) continue;

    const hoursOverdue = Math.floor((Date.now() - updatedAt.getTime()) / 3_600_000) - timeoutHours;
    violations.push({
      documentId: doc.id,
      documentTitle: doc.metadata.title,
      status: doc.status,
      hoursOverdue,
      assignedTo: doc.assignedTo ?? [],
    });
  }

  return violations;
}

// ── Dispatch STEP_TIMEOUT notifications for violations ────────────────────────

export async function notifySlaViolations(
  tenantId: string,
  violations: SlaViolation[]
): Promise<number> {
  let dispatched = 0;
  for (const v of violations) {
    if (v.assignedTo.length === 0) continue;
    await dispatchToMany(v.assignedTo, {
      tenantId,
      documentInstanceId: v.documentId,
      documentTitle: v.documentTitle,
      type: 'STEP_TIMEOUT',
      message: `Dokument "${v.documentTitle}" oczekuje na akcję od ${v.hoursOverdue + 48}h — przekroczony czas SLA.`,
    }).catch(() => {});
    dispatched++;
  }
  return dispatched;
}

// ── Log SLA scan result (audit trail) ────────────────────────────────────────

export async function logSlaScan(
  tenantId: string,
  violations: SlaViolation[],
  dispatchedCount: number
): Promise<void> {
  await addDoc(collection(db, `tenants/${tenantId}/slaScans`), {
    scannedAt: serverTimestamp(),
    violationsFound: violations.length,
    notificationsSent: dispatchedCount,
    violations: violations.map(v => ({
      documentId: v.documentId,
      documentTitle: v.documentTitle,
      hoursOverdue: v.hoursOverdue,
    })),
  }).catch(() => {});
}

// ── Combined: scan + notify + log ────────────────────────────────────────────
// For use in admin panel "Run SLA Check Now" button.

export async function runSlaScan(
  tenantId: string,
  timeoutHours = 48
): Promise<{ violations: SlaViolation[]; dispatched: number }> {
  const violations = await scanSlaViolations(tenantId, timeoutHours);
  const dispatched = await notifySlaViolations(tenantId, violations);
  await logSlaScan(tenantId, violations, dispatched);
  return { violations, dispatched };
}
