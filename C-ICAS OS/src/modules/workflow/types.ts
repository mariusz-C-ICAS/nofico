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
  | 'ARCHIVED'
  | 'BILLING_READY'
  | 'MARKETING_REVIEW'
  | 'MARKETING_APPROVED'
  | 'CLAIM_FILED'
  | 'CLAIM_REJECTED'
  | 'CLAIM_APPEALED'
  | 'CLAIM_APPROVED'
  | 'BHP_DISPATCHED'
  | 'BHP_CLOSED'
  | 'ADVANCE_ISSUED'
  | 'NCR_OPEN'
  | 'NCR_VERIFIED'
  | 'UNDER_INVESTIGATION'
  | 'COMPLAINT_RESOLVED'
  | 'GOODS_RECEIVED'
  | 'QUOTE_SENT';

export type DocumentType =
  | 'OUT_OF_POCKET'
  | 'VENDOR_INVOICE'
  | 'CONTRACT'
  | 'TIMESHEET'
  | 'PURCHASE_ORDER'
  | 'TRAVEL_EXPENSE'
  | 'PROJECT_DELIVERY'
  | 'DAMAGE_CLAIM'
  | 'BHP_INCIDENT'
  | 'LEAVE_REQUEST'
  | 'VEHICLE_INCIDENT'
  | 'IT_INCIDENT'
  | 'ASSET_HANDOVER'
  | 'EXPENSE_ADVANCE'
  | 'QUALITY_NCR'
  | 'SUBCONTRACTOR_APPROVAL'
  | 'CREDIT_NOTE'
  | 'BUDGET_REQUEST'
  | 'WRITE_OFF'
  | 'TAX_DOCUMENT'
  | 'RFQ'
  | 'BID_EVALUATION'
  | 'GOODS_RECEIPT'
  | 'GOODS_ISSUE'
  | 'RETURN_MERCHANDISE'
  | 'NDA'
  | 'GDPR_REQUEST'
  | 'POLICY_EXCEPTION'
  | 'REGULATORY_BREACH'
  | 'AUDIT_FINDING'
  | 'WHISTLEBLOWER'
  | 'SALES_ORDER'
  | 'QUOTE_APPROVAL'
  | 'CUSTOMER_COMPLAINT'
  | 'DISCOUNT_APPROVAL'
  | 'CHANGE_REQUEST'
  | 'RISK_REGISTER'
  | 'PROJECT_CLOSURE'
  | 'PATIENT_INCIDENT'
  | 'MEDICATION_ERROR'
  | 'PRODUCTION_ORDER'
  | 'ENGINEERING_CHANGE'
  | 'CALIBRATION_RECORD'
  | 'INSPECTION_REPORT'
  | 'TRANSPORT_ORDER'
  | 'CUSTOMS_DECLARATION'
  | 'INSURANCE_CLAIM'
  | 'LEASE_AGREEMENT'
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
  | 'CANCEL'
  | 'FILE_CLAIM'
  | 'APPEAL_CLAIM'
  | 'CLOSE_CLAIM'
  | 'DISPATCH'
  | 'OPEN_NCR'
  | 'CLOSE_NCR'
  | 'ISSUE_ADVANCE';

export type NotificationType =
  | 'APPROVAL_REQUIRED'
  | 'DOCUMENT_APPROVED'
  | 'DOCUMENT_REJECTED'
  | 'DOCUMENT_SETTLED'
  | 'KSEF_VERIFIED'
  | 'STEP_TIMEOUT'
  | 'DOCUMENT_CANCELLED'
  | 'CHANGES_REQUESTED'
  | 'BILLING_READY'
  | 'MARKETING_APPROVED'
  | 'CLAIM_FILED'
  | 'CLAIM_REJECTED'
  | 'CLAIM_APPROVED'
  | 'BHP_DISPATCHED'
  | 'BHP_CLOSED'
  | 'NCR_OPEN'
  | 'NCR_VERIFIED'
  | 'ADVANCE_ISSUED'
  | 'COMPLAINT_RESOLVED'
  | 'UNDER_INVESTIGATION'
  | 'GOODS_RECEIVED';

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
  milestoneId?: string;
  isBillable?: boolean;
  sendToMarketing?: boolean;
  insuranceRef?: string;
  claimNotes?: string;
  // BHP_INCIDENT fields
  incidentDate?: string;
  incidentLocation?: string;
  injuredPersonName?: string;
  injuredPersonPosition?: string;
  injuryType?: string;
  injuredBodyPart?: string;
  witnesses?: string;
  immediateCause?: string;
  rootCause?: string;
  correctiveActions?: string;
  firstAidProvided?: string;
  policeRequired?: boolean;
  ambulanceCalled?: boolean;
  workStopped?: boolean;
  dispatchedTo?: string[];
  // LEAVE_REQUEST fields
  leaveType?: string;
  leaveStartDate?: string;
  leaveEndDate?: string;
  leaveDays?: number;
  leaveReason?: string;
  // VEHICLE_INCIDENT fields
  vehiclePlate?: string;
  driverName?: string;
  otherPartyInfo?: string;
  policeReportNumber?: string;
  // IT_INCIDENT fields
  itSeverity?: string;
  itSystemName?: string;
  affectedUsersCount?: number;
  itResolutionSteps?: string;
  // ASSET_HANDOVER fields
  assetType?: string;
  assetId?: string;
  assetSerialNumber?: string;
  handoverType?: string;
  handoverEmployeeName?: string;
  handoverEmployeeId?: string;
  assetCondition?: string;
  // EXPENSE_ADVANCE fields
  advancePurpose?: string;
  advanceExpectedSettlementDate?: string;
  // QUALITY_NCR fields
  ncrSeverity?: string;
  ncrProcessArea?: string;
  ncrResponsiblePerson?: string;
  immediateAction?: string;
  ncrCapaDescription?: string;
  ncrCapaDueDate?: string;
  ncrVerifiedBy?: string;
  // SUBCONTRACTOR_APPROVAL fields
  subcontractorName?: string;
  subcontractorNip?: string;
  subcontractorScope?: string;
  subcontractorValidUntil?: string;
  // CREDIT_NOTE fields
  creditNoteReason?: string;
  originalInvoiceRef?: string;
  // BUDGET_REQUEST fields
  budgetCategory?: string;
  budgetYear?: string;
  budgetPurpose?: string;
  // RFQ fields
  rfqScope?: string;
  rfqDeadline?: string;
  invitedVendors?: string;
  // GOODS_RECEIPT / GOODS_ISSUE / RETURN_MERCHANDISE fields
  goodsDescription?: string;
  quantity?: number;
  unit?: string;
  warehouseLocation?: string;
  purchaseOrderRef?: string;
  // NDA fields
  ndaPartyName?: string;
  ndaPartyNip?: string;
  ndaValidityDays?: number;
  // GDPR_REQUEST fields
  gdprRequestType?: string;
  dataSubjectEmail?: string;
  // WHISTLEBLOWER fields
  isAnonymous?: boolean;
  whistleblowerCategory?: string;
  reportedDepartment?: string;
  evidenceDescription?: string;
  // SALES_ORDER / QUOTE_APPROVAL fields
  customerId?: string;
  customerName?: string;
  deliveryDate?: string;
  quoteNumber?: string;
  quoteTotalValue?: number;
  quoteValidUntil?: string;
  discountPercent?: number;
  // CUSTOMER_COMPLAINT fields
  complaintRef?: string;
  complaintCategory?: string;
  complainantName?: string;
  complainantEmail?: string;
  resolutionDeadline?: string;
  // CHANGE_REQUEST fields
  changeScope?: string;
  changeImpact?: string;
  changeRisk?: string;
  estimatedEffortHours?: number;
  rollbackPlan?: string;
  changeProjectRef?: string;
  // RISK_REGISTER fields
  riskCategory?: string;
  riskProbability?: string;
  riskImpact?: string;
  riskOwner?: string;
  mitigationPlan?: string;
  // PATIENT_INCIDENT fields
  patientId?: string;
  patientIncidentType?: string;
  medicalStaffInvolved?: string;
  notifiedAuthorities?: boolean;
  // MEDICATION_ERROR fields
  medicationName?: string;
  prescribedDose?: string;
  administeredDose?: string;
  medicationErrorType?: string;
  patientHarm?: string;
  // PRODUCTION_ORDER fields
  productionOrderNumber?: string;
  productCode?: string;
  plannedQuantity?: number;
  // ENGINEERING_CHANGE fields
  ecoNumber?: string;
  affectedParts?: string;
  ecoChangeReason?: string;
  // CALIBRATION_RECORD fields
  instrumentId?: string;
  instrumentName?: string;
  calibrationResult?: string;
  nextCalibrationDate?: string;
  calibratedBy?: string;
  // INSPECTION_REPORT fields
  inspectionType?: string;
  inspectedBy?: string;
  passFailStatus?: string;
  // TRANSPORT_ORDER fields
  carrierId?: string;
  originAddress?: string;
  destinationAddress?: string;
  expectedDeliveryDate?: string;
  trackingNumber?: string;
  cargoDescription?: string;
  // CUSTOMS_DECLARATION fields
  hsCode?: string;
  goodsOriginCountry?: string;
  customsValue?: number;
  declarationType?: string;
  // INSURANCE_CLAIM fields
  policyNumber?: string;
  insuredName?: string;
  estimatedLoss?: number;
  // LEASE_AGREEMENT fields
  propertyAddress?: string;
  lesseeName?: string;
  monthlyRent?: number;
  leaseStartDate?: string;
  leaseEndDate?: string;
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
  companyId?: string;
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
  delegatedFor?: string;
  delegatedForEmail?: string;
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
  email?: boolean;
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
  BILLING_READY: 'Gotowe do fakturowania',
  MARKETING_REVIEW: 'Przegląd marketingowy',
  MARKETING_APPROVED: 'Zatwierdzone przez Marketing',
  CLAIM_FILED: 'Zgłoszono do ubezpieczyciela',
  CLAIM_REJECTED: 'Ubezpieczyciel odrzucił',
  CLAIM_APPEALED: 'Złożono odwołanie',
  CLAIM_APPROVED: 'Ubezpieczyciel zatwierdził',
  BHP_DISPATCHED: 'Wysłano do wszystkich stron',
  BHP_CLOSED: 'Sprawa zamknięta',
  ADVANCE_ISSUED: 'Zaliczka wydana',
  NCR_OPEN: 'NCR otwarty',
  NCR_VERIFIED: 'NCR zweryfikowany',
  UNDER_INVESTIGATION: 'W trakcie śledztwa',
  COMPLAINT_RESOLVED: 'Reklamacja rozwiązana',
  GOODS_RECEIVED: 'Towar przyjęty',
  QUOTE_SENT: 'Oferta wysłana',
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
  BILLING_READY: 'bg-lime-100 text-lime-700',
  MARKETING_REVIEW: 'bg-pink-100 text-pink-700',
  MARKETING_APPROVED: 'bg-fuchsia-100 text-fuchsia-700',
  CLAIM_FILED: 'bg-sky-100 text-sky-700',
  CLAIM_REJECTED: 'bg-rose-100 text-rose-700',
  CLAIM_APPEALED: 'bg-orange-100 text-orange-700',
  CLAIM_APPROVED: 'bg-green-100 text-green-700',
  BHP_DISPATCHED: 'bg-red-100 text-red-700',
  BHP_CLOSED: 'bg-slate-200 text-slate-600',
  ADVANCE_ISSUED: 'bg-lime-100 text-lime-700',
  NCR_OPEN: 'bg-yellow-100 text-yellow-700',
  NCR_VERIFIED: 'bg-teal-100 text-teal-700',
  UNDER_INVESTIGATION: 'bg-purple-100 text-purple-700',
  COMPLAINT_RESOLVED: 'bg-teal-100 text-teal-700',
  GOODS_RECEIVED: 'bg-emerald-100 text-emerald-700',
  QUOTE_SENT: 'bg-blue-100 text-blue-700',
};

export const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  OUT_OF_POCKET: 'Wydatek własny',
  VENDOR_INVOICE: 'Faktura dostawcy',
  CONTRACT: 'Umowa',
  TIMESHEET: 'Karta czasu pracy',
  PURCHASE_ORDER: 'Zamówienie zakupu',
  TRAVEL_EXPENSE: 'Delegacja',
  PROJECT_DELIVERY: 'Realizacja projektu',
  DAMAGE_CLAIM: 'Zgłoszenie szkody',
  BHP_INCIDENT: 'Wypadek / Incydent BHP',
  LEAVE_REQUEST: 'Wniosek urlopowy',
  VEHICLE_INCIDENT: 'Kolizja pojazdu służbowego',
  IT_INCIDENT: 'Incydent IT',
  ASSET_HANDOVER: 'Przekazanie mienia',
  EXPENSE_ADVANCE: 'Zaliczka pracownicza',
  QUALITY_NCR: 'Karta Niezgodności (NCR)',
  SUBCONTRACTOR_APPROVAL: 'Zatwierdzenie podwykonawcy',
  CREDIT_NOTE: 'Faktura korygująca',
  BUDGET_REQUEST: 'Wniosek budżetowy',
  WRITE_OFF: 'Odpisanie należności',
  TAX_DOCUMENT: 'Dokument podatkowy',
  RFQ: 'Zapytanie ofertowe',
  BID_EVALUATION: 'Ocena ofert',
  GOODS_RECEIPT: 'Przyjęcie towaru (PZ)',
  GOODS_ISSUE: 'Wydanie towaru (WZ)',
  RETURN_MERCHANDISE: 'Zwrot towaru',
  NDA: 'Umowa NDA',
  GDPR_REQUEST: 'Żądanie RODO (DSAR)',
  POLICY_EXCEPTION: 'Wyjątek od polityki',
  REGULATORY_BREACH: 'Naruszenie regulacyjne',
  AUDIT_FINDING: 'Wynik audytu',
  WHISTLEBLOWER: 'Zgłoszenie sygnalisty',
  SALES_ORDER: 'Zamówienie sprzedaży',
  QUOTE_APPROVAL: 'Zatwierdzenie oferty',
  CUSTOMER_COMPLAINT: 'Reklamacja klienta',
  DISCOUNT_APPROVAL: 'Zatwierdzenie rabatu',
  CHANGE_REQUEST: 'Zmiana zakresu projektu',
  RISK_REGISTER: 'Rejestr ryzyk',
  PROJECT_CLOSURE: 'Zamknięcie projektu',
  PATIENT_INCIDENT: 'Zdarzenie niepożądane',
  MEDICATION_ERROR: 'Błąd lekowy',
  PRODUCTION_ORDER: 'Zlecenie produkcyjne',
  ENGINEERING_CHANGE: 'Zmiana inżynierska (ECO)',
  CALIBRATION_RECORD: 'Karta kalibracji',
  INSPECTION_REPORT: 'Protokół z inspekcji',
  TRANSPORT_ORDER: 'Zlecenie transportowe',
  CUSTOMS_DECLARATION: 'Zgłoszenie celne',
  INSURANCE_CLAIM: 'Roszczenie ubezpieczeniowe',
  LEASE_AGREEMENT: 'Umowa najmu',
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
