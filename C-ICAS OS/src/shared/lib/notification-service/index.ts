import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export type NotifType =
  | 'APPROVAL_REQUIRED'
  | 'DOCUMENT_APPROVED'
  | 'DOCUMENT_REJECTED'
  | 'STEP_TIMEOUT'
  | 'PAYMENT_RECEIVED'
  | 'TASK_ASSIGNED'
  | 'INFO';

export interface NotifPayload {
  tenantId: string;
  recipientId: string;
  type: NotifType;
  message: string;
  documentTitle?: string;
  documentInstanceId?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export async function sendNotification(payload: NotifPayload): Promise<void> {
  await addDoc(collection(db, `tenants/${payload.tenantId}/notifications`), {
    ...payload,
    read: false,
    createdAt: serverTimestamp(),
  });
}

export async function sendBulkNotifications(payloads: NotifPayload[]): Promise<void> {
  await Promise.all(payloads.map(sendNotification));
}
