import { Timestamp } from 'firebase/firestore';

export type DebtStage = 'SOFT_REMINDER' | 'FORMAL_DEMAND' | 'PRE_LEGAL' | 'LEGAL' | 'WRITE_OFF' | 'SETTLED';
export type ContactOutcome = 'NO_RESPONSE' | 'PROMISE_TO_PAY' | 'DISPUTED' | 'PARTIAL_PAYMENT' | 'FULL_PAYMENT';
export type ContactMethod = 'EMAIL' | 'PHONE' | 'REGISTERED_MAIL' | 'BAILIFF';

export interface ContactAttempt {
  id: string;
  method: ContactMethod;
  date: Timestamp;
  note: string;
  outcome: ContactOutcome;
  performedBy: string;
}

export interface DebtCase {
  id: string;
  tenantId: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  originalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  currency: string;
  duedDate: Timestamp;
  dpd: number;
  stage: DebtStage;
  contactAttempts: ContactAttempt[];
  assignedTo?: string;
  notes?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  settledAt?: Timestamp;
}
