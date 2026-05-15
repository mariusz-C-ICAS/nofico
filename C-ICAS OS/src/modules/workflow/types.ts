export type DocumentStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'KSEF_VERIFIED'
  | 'BOOKED'
  | 'PENDING_SETTLEMENT'
  | 'SETTLED'
  | 'ARCHIVED';

export type DocumentType =
  | 'OUT_OF_POCKET'
  | 'VENDOR_INVOICE'
  | 'CONTRACT'
  | 'TIMESHEET'
  | 'PURCHASE_ORDER'
  | 'TRAVEL_EXPENSE'
  | 'CUSTOM';

export type WorkflowStepType =
  | 'APPROVAL'
  | 'KSEF_VERIFY'
  | 'BOOK'
  | 'SETTLE'
  | 'NOTIFY'
  | 'ARCHIVE';

export type StepAction =
  | 'CREATE'
  | 'SUBMIT'
  | 'APPROVE'
  | 'REJECT'
  | 'REQUEST_CHANGES'
  | 'VERIFY'
  | 'BOOK'
  | 'SETTLE'
  | 'ARCHIVE'
  | 'RESUBMIT'
  | 'CANCEL';

export type NotificationType =
  | 'APPROVAL_REQUIRED'
  | 'DOCUMENT_APPROVED'
  | 'DOCUMENT_REJECTED'
  | 'DOCUMENT_SETTLED'
  | 'KSEF_VERIFIED'
  | 'STEP_TIMEOUT'
  | 'DOCUMENT_CANCELLED'
  | 'CHANGES_REQUESTED';

// ── Workflow template (admin-configurable per document type) ─────────────────

export interface WorkflowStepDef {
  id: string;
  order: number;
  label: string;
  type: WorkflowStepType;
  requiredRoles: string[];
  optional?: boolean;
  parallelApprovals?: boolean;
  timeoutHours?: number;
  onApprove: DocumentStatus;
  onReject: DocumentStatus;
}

export interface WorkflowTemplate {
  id: string;
  tenantId: string;
  documentType: DocumentType;
  name: string;
  description?: string;
  steps: WorkflowStepDef[];
  isDefault: boolean;
  createdAt: any;
  createdBy: string;
  updatedAt?: any;
}

// ── Document instance (living document in circulation) ───────────────────────

export interface DocumentMetadata {
  title: string;
  amount?: number;
  currency?: string;
  vendor?: string;
  invoiceDate?: string;
  ksefNumber?: string;
  ksefVerified?: boolean;
  journalEntryId?: string;
  settlementDate?: string;
  settlementRef?: string;
  projectId?: string;
  costCenter?: string;
  description?: string;
  tags?: string[];
}

export interface DocumentAttachment {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  storageRef?: string;
  hash: string;
  isLocalOnly?: boolean;
  uploadedAt: any;
  uploadedBy: string;
}

export interface DocumentInstance {
  id: string;
  tenantId: string;
  templateId: string;
  type: DocumentType;
  status: DocumentStatus;
  currentStepId: string;
  submittedBy: string;
  submittedByEmail: string;
  assignedTo?: string[];
  metadata: DocumentMetadata;
  attachments: DocumentAttachment[];
  createdAt: any;
  updatedAt: any;
  isOfflineDraft?: boolean;
}

// ── Immutable audit step record (GoBD / GoBS append-only) ───────────────────
// NEVER update these records — only addDoc, never updateDoc

export interface WorkflowStepRecord {
  id: string;
  documentInstanceId: string;
  tenantId: string;
  stepDefId: string;
  stepType: WorkflowStepType;
  action: StepAction;
  actorId: string;
  actorEmail: string;
  actorRole?: string;
  previousStatus: DocumentStatus;
  newStatus: DocumentStatus;
  note?: string;
  attachmentHash?: string;
  timestamp: any;
  deviceInfo?: string;
  isOffline?: boolean;
  syncedAt?: any;
}

// ── Notifications ────────────────────────────────────────────────────────────

export interface WorkflowNotification {
  id: string;
  tenantId: string;
  recipientId: string;
  documentInstanceId: string;
  documentTitle: string;
  type: NotificationType;
  message: string;
  read: boolean;
  createdAt: any;
  actionUrl?: string;
}

export interface NotificationChannelPrefs {
  auditLog: boolean;
  inApp: boolean;
  push: boolean;
}

export interface NotificationPrefs {
  userId: string;
  tenantId: string;
  channels: Partial<Record<NotificationType, NotificationChannelPrefs>>;
  updatedAt?: any;
}

// ── Document notes (voice + text) ───────────────────────────────────────────

export type DocumentNoteType =
  | 'note'
  | 'comment'
  | 'explanation'
  | 'warning'
  | 'ai_todo'
  | 'reminder'
  | 'task';

export interface DocumentNote {
  id: string;
  documentInstanceId: string;
  tenantId: string;
  authorId: string;
  authorEmail: string;
  type: DocumentNoteType;
  content: string;
  hasAudio: boolean;
  audioStorageRef?: string;
  aiResponse?: string;
  dueDate?: string;
  completed?: boolean;
  createdAt: any;
  updatedAt?: any;
}

// ── AI document analysis ─────────────────────────────────────────────────────

export type AiExtractionField =
  | 'printed_text' | 'handwritten' | 'stamp' | 'barcode' | 'qr_code'
  | 'amounts' | 'dates' | 'nip_numbers' | 'iban_numbers' | 'vendor_name'
  | 'invoice_number' | 'signatures';

export interface AiDocumentAnalysis {
  id: string;
  documentInstanceId: string;
  tenantId: string;
  attachmentId: string;
  extractedData: Partial<Record<AiExtractionField, string[]>>;
  suggestedTitle?: string;
  suggestedAmount?: number;
  suggestedCurrency?: string;
  suggestedVendor?: string;
  suggestedDate?: string;
  suggestedKsefNumber?: string;
  confidence: number;
  model: string;
  analyzedAt: any;
}

// ── Settlement tracking ──────────────────────────────────────────────────────

export type SettlementStatus = 'pending' | 'initiated' | 'completed' | 'failed';

export interface SettlementRecord {
  id: string;
  documentInstanceId: string;
  tenantId: string;
  recipientId: string;
  recipientEmail: string;
  recipientIban?: string;
  recipientName?: string;
  amount: number;
  currency: string;
  transferTitle: string;
  transferRef?: string;
  status: SettlementStatus;
  scheduledDate?: string;
  paidAt?: any;
  createdAt: any;
  updatedAt?: any;
}

// ── UI helpers ───────────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<DocumentStatus, string> = {
  DRAFT: 'Szkic',
  SUBMITTED: 'Wysłany',
  PENDING_APPROVAL: 'Oczekuje zatwierdzenia',
  APPROVED: 'Zatwierdzony',
  REJECTED: 'Odrzucony',
  KSEF_VERIFIED: 'Zweryfikowany KSeF',
  BOOKED: 'Zaksięgowany',
  PENDING_SETTLEMENT: 'Oczekuje zwrotu',
  SETTLED: 'Rozliczony',
  ARCHIVED: 'Zarchiwizowany',
};

export const STATUS_COLORS: Record<DocumentStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-700',
  KSEF_VERIFIED: 'bg-violet-100 text-violet-700',
  BOOKED: 'bg-indigo-100 text-indigo-700',
  PENDING_SETTLEMENT: 'bg-orange-100 text-orange-700',
  SETTLED: 'bg-teal-100 text-teal-700',
  ARCHIVED: 'bg-slate-200 text-slate-500',
};

export const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  OUT_OF_POCKET: 'Wydatek własny',
  VENDOR_INVOICE: 'Faktura dostawcy',
  CONTRACT: 'Umowa',
  TIMESHEET: 'Karta czasu pracy',
  PURCHASE_ORDER: 'Zamówienie zakupu',
  TRAVEL_EXPENSE: 'Delegacja',
  CUSTOM: 'Własny typ',
};

export const OUT_OF_POCKET_STEPS: DocumentStatus[] = [
  'DRAFT',
  'SUBMITTED',
  'PENDING_APPROVAL',
  'APPROVED',
  'KSEF_VERIFIED',
  'BOOKED',
  'PENDING_SETTLEMENT',
  'SETTLED',
  'ARCHIVED',
];
