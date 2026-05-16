export type VatRate = 23 | 8 | 5 | 0 | 'zw' | 'np' | 'oo';
export type Currency = 'PLN' | 'EUR' | 'USD' | 'GBP' | 'CHF' | 'CZK' | 'DKK' | 'SEK' | 'NOK' | 'HUF';
export type InvoiceStatus = 'draft' | 'issued' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled' | 'corrected';
export type KSeFStatus = 'not_sent' | 'sending' | 'sent' | 'accepted' | 'rejected' | 'n_a';
export type InvoiceType = 'standard' | 'proforma' | 'advance' | 'correction' | 'debit_note' | 'final';
export type PaymentMethod = 'transfer' | 'cash' | 'card' | 'blik' | 'instant_transfer' | 'direct_debit';
export type BankTransactionStatus = 'unmatched' | 'suggested' | 'matched' | 'manual' | 'ignored';
export type ExpenseStatus = 'pending_ocr' | 'ocr_done' | 'categorized' | 'approved' | 'rejected' | 'booked';

export interface InvoiceParty {
  name: string;
  nip?: string;
  euVatId?: string;
  regon?: string;
  address: string;
  city: string;
  postCode: string;
  country: string;
  email?: string;
  phone?: string;
  bankAccount?: string;
  bankName?: string;
  whiteListVerifiedAt?: string;
  viesValidAt?: string;
  isWhiteListValid?: boolean;
  isViesValid?: boolean;
}

export interface InvoiceItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  priceNetto: number;
  vatRate: VatRate;
  totalNetto: number;
  totalVat: number;
  totalBrutto: number;
  pkwiu?: string;
  gtinEan?: string;
  costCenterId?: string;
  projectId?: string;
  aiCategory?: string;
}

export interface VatSummaryRow {
  vatRate: VatRate;
  netto: number;
  vat: number;
  brutto: number;
}

export interface SalesInvoice {
  id?: string;
  tenantId: string;
  number: string;
  series?: string;
  type: InvoiceType;
  correctionFor?: string;
  correctionReason?: string;
  issueDate: string;
  saleDate: string;
  dueDate: string;
  paymentDate?: string;
  seller: InvoiceParty;
  buyer: InvoiceParty;
  items: InvoiceItem[];
  totalNetto: number;
  totalVat: number;
  totalBrutto: number;
  vatSummary: VatSummaryRow[];
  currency: Currency;
  exchangeRate?: number;
  exchangeRateDate?: string;
  exchangeRateSource?: string;
  totalBruttoInPln?: number;
  paymentMethod: PaymentMethod;
  bankAccount?: string;
  isMpp: boolean;
  paidAmount: number;
  remainingAmount: number;
  paymentLink?: string;
  status: InvoiceStatus;
  ksefStatus: KSeFStatus;
  ksefId?: string;
  ksefReferenceNumber?: string;
  ksefSessionId?: string;
  ksefSentAt?: string;
  ksefAcceptedAt?: string;
  costCenterId?: string;
  projectId?: string;
  documentIds?: string[];
  pdfUrl?: string;
  aiTags?: string[];
  aiCategory?: string;
  aiSummary?: string;
  confidenceScore?: number;
  emailSentAt?: string;
  emailRecipient?: string;
  reminderSentAt?: string[];
  accountantNotes?: string;
  accountantId?: string;
  isBookedByAccountant?: boolean;
  bookingDate?: string;
  kpirEntry?: number;
  createdBy: string;
  createdAt: any;
  updatedAt: any;
  deletedAt?: string;
  isDeleted?: boolean;
}

export interface PurchaseInvoice {
  id?: string;
  tenantId: string;

  supplierInvoiceNumber: string;
  internalNumber?: string;
  type: 'standard' | 'correction' | 'import' | 'intracomm';

  issueDate: string;
  receiveDate: string;
  dueDate: string;
  paymentDate?: string;

  seller: InvoiceParty;
  buyer: InvoiceParty;

  items?: InvoiceItem[];
  totalNetto: number;
  totalVat: number;
  totalBrutto: number;
  vatSummary: VatSummaryRow[];

  currency: Currency;
  exchangeRate?: number;
  exchangeRateDate?: string;
  totalBruttoInPln?: number;

  paymentMethod: PaymentMethod;
  bankAccount?: string;
  isMpp: boolean;
  isPaid: boolean;
  paidAmount: number;
  remainingAmount: number;

  costCenterId?: string;
  projectId?: string;
  category?: string;

  source: 'ksef' | 'email' | 'ocr_scan' | 'manual' | 'bank_import';
  ksefId?: string;
  expenseId?: string;
  documentId?: string;

  aiCategory?: string;
  aiTags?: string[];
  aiConfidence?: number;

  accountantNotes?: string;
  isBookedByAccountant?: boolean;
  bookingDate?: string;
  kpirEntry?: number;

  createdBy: string;
  createdAt: any;
  updatedAt: any;
  isDeleted?: boolean;
}

export interface ContractorBankAccount {
  id: string;
  iban: string;
  bankName?: string;
  swift?: string;
  currency: Currency;
  isDefault: boolean;
  isWhiteListVerified?: boolean;
  whiteListVerifiedAt?: string;
  label?: string;
}

export interface Contractor {
  id?: string;
  tenantId: string;

  name: string;
  shortName?: string;
  type: 'company' | 'individual' | 'foreign';
  nip?: string;
  euVatId?: string;
  regon?: string;
  krs?: string;
  pesel?: string;

  address: string;
  city: string;
  postCode: string;
  country: string;

  email?: string;
  emailInvoice?: string;
  phone?: string;
  website?: string;

  bankAccounts: ContractorBankAccount[];

  status: 'active' | 'inactive' | 'blocked';
  isCustomer: boolean;
  isSupplier: boolean;
  whiteListVerifiedAt?: string;
  isWhiteListValid?: boolean;
  viesValidAt?: string;
  isViesValid?: boolean;

  defaultPaymentDays?: number;
  defaultPaymentMethod?: PaymentMethod;
  defaultVatRate?: VatRate;
  defaultCurrency?: Currency;

  totalInvoiced?: number;
  totalOutstanding?: number;
  lastInvoiceDate?: string;
  invoiceCount?: number;

  customerId?: string;

  accountantCategory?: string;
  accountNumber?: string;

  aiNotes?: string;
  aiRiskScore?: number;

  createdBy: string;
  createdAt: any;
  updatedAt: any;
}

export interface TransactionSplit {
  id: string;
  amount: number;
  category: string;
  costCenterId?: string;
  projectId?: string;
  note?: string;
  invoiceId?: string;
}

export interface BankTransaction {
  id?: string;
  tenantId: string;
  bankAccountId: string;

  date: string;
  bookingDate?: string;
  amount: number;
  currency: Currency;
  amountInPln?: number;

  counterpartName: string;
  counterpartIban?: string;
  counterpartBankCode?: string;

  title: string;
  reference?: string;
  endToEndId?: string;

  status: BankTransactionStatus;
  matchedInvoiceId?: string;
  matchedInvoiceNumber?: string;
  matchedExpenseId?: string;
  matchScore?: number;

  splits?: TransactionSplit[];
  isSplit: boolean;

  category?: string;
  costCenterId?: string;
  projectId?: string;

  source: 'psd2' | 'mt940' | 'csv_elixir' | 'csv_generic' | 'manual';
  importBatchId?: string;

  aiCategory?: string;
  aiTags?: string[];

  isBooked: boolean;
  kpirEntry?: number;
  accountantNotes?: string;

  createdAt: any;
  updatedAt: any;
}

export interface BankAccount {
  id?: string;
  tenantId: string;
  name: string;
  iban: string;
  bankName: string;
  bankCode?: string;
  swift?: string;
  currency: Currency;
  balance?: number;
  balanceAt?: string;
  isDefault: boolean;
  isActive: boolean;

  connectionType: 'psd2' | 'manual' | 'file_import';
  psd2ConsentId?: string;
  psd2ConsentExpiry?: string;
  psd2ProviderId?: string;
  psd2AccountId?: string;
  lastSyncAt?: string;
  lastSyncStatus?: 'success' | 'error' | 'partial';
  lastSyncError?: string;

  createdBy: string;
  createdAt: any;
  updatedAt: any;
}

export interface Expense {
  id?: string;
  tenantId: string;

  receiptUrl?: string;
  receiptHash?: string;

  ocrStatus: ExpenseStatus;
  ocrRawText?: string;

  vendor: string;
  amount: number;
  currency: Currency;
  amountInPln?: number;
  exchangeRate?: number;
  vatRate?: VatRate;
  vatAmount?: number;
  nettoAmount?: number;
  date: string;
  invoiceNumber?: string;
  nip?: string;
  category: string;
  description?: string;

  costCenterId?: string;
  projectId?: string;
  employeeId?: string;
  isReimbursable?: boolean;
  reimbursedAt?: string;

  purchaseInvoiceId?: string;
  bankTransactionId?: string;
  documentId?: string;

  status: ExpenseStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectedReason?: string;

  aiCategory?: string;
  aiTags?: string[];
  aiConfidence?: number;

  isBooked: boolean;
  kpirEntry?: number;

  createdBy: string;
  createdAt: any;
  updatedAt: any;
}

export interface VatRegisterEntry {
  id?: string;
  tenantId: string;
  period: string;
  type: 'sales' | 'purchase';
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  counterpartName: string;
  counterpartNip?: string;
  netto23: number;
  vat23: number;
  netto8: number;
  vat8: number;
  netto5: number;
  vat5: number;
  netto0: number;
  nettoZw: number;
  nettoNp: number;
  totalVat: number;
  isMpp: boolean;
  ksefId?: string;
  createdAt: any;
}

export interface JpkReport {
  id?: string;
  tenantId: string;
  type: 'JPK_VAT7M' | 'JPK_VAT7K' | 'JPK_FA' | 'JPK_KPiR' | 'JPK_EWP';
  period: string;
  status: 'draft' | 'generated' | 'sent' | 'accepted' | 'corrected';
  xmlUrl?: string;
  sentAt?: string;
  sentBy?: string;
  correctionOrdinal?: number;
  errors?: string[];
  createdAt: any;
  updatedAt: any;
}

export interface RecurringInvoiceTemplate {
  id?: string;
  tenantId: string;
  name: string;
  isActive: boolean;
  buyer: InvoiceParty;
  items: Omit<InvoiceItem, 'totalNetto' | 'totalVat' | 'totalBrutto'>[];
  currency: Currency;
  paymentDays: number;
  paymentMethod: PaymentMethod;
  frequency: 'monthly' | 'quarterly' | 'yearly' | 'custom';
  dayOfMonth: number;
  nextIssueDate: string;
  endDate?: string;
  invoicesGenerated: number;
  lastGeneratedAt?: string;
  createdBy: string;
  createdAt: any;
  updatedAt: any;
}

export interface InvoiceStats {
  totalRevenue: number;
  outstanding: number;
  overdueCount: number;
  thisMonthRevenue: number;
}

export function computeInvoiceTotals(items: InvoiceItem[]): {
  totalNetto: number;
  totalVat: number;
  totalBrutto: number;
  vatSummary: VatSummaryRow[];
} {
  const vatMap = new Map<VatRate, { netto: number; vat: number; brutto: number }>();
  let totalNetto = 0;
  let totalVat = 0;
  let totalBrutto = 0;

  for (const item of items) {
    const vatRateNum = typeof item.vatRate === 'number' ? item.vatRate / 100 : 0;
    const netto = Math.round(item.quantity * item.priceNetto * 100) / 100;
    const vat = typeof item.vatRate === 'number' ? Math.round(netto * vatRateNum * 100) / 100 : 0;
    const brutto = Math.round((netto + vat) * 100) / 100;

    const existing = vatMap.get(item.vatRate) ?? { netto: 0, vat: 0, brutto: 0 };
    vatMap.set(item.vatRate, {
      netto: Math.round((existing.netto + netto) * 100) / 100,
      vat: Math.round((existing.vat + vat) * 100) / 100,
      brutto: Math.round((existing.brutto + brutto) * 100) / 100,
    });

    totalNetto += netto;
    totalVat += vat;
    totalBrutto += brutto;
  }

  const vatSummary: VatSummaryRow[] = Array.from(vatMap.entries()).map(([vatRate, sums]) => ({
    vatRate,
    ...sums,
  }));

  return {
    totalNetto: Math.round(totalNetto * 100) / 100,
    totalVat: Math.round(totalVat * 100) / 100,
    totalBrutto: Math.round(totalBrutto * 100) / 100,
    vatSummary,
  };
}

// PL law: split payment mandatory for B2B net > 15 000 PLN
export function requiresMpp(totalNetto: number, currency: Currency, isBtb: boolean): boolean {
  return isBtb && currency === 'PLN' && totalNetto > 15000;
}

export function buildInvoiceNumber(series: string, year: number, month: number, seq: number): string {
  return `${series}/${year}/${String(month).padStart(2, '0')}/${String(seq).padStart(3, '0')}`;
}
