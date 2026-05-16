import { Timestamp } from 'firebase/firestore';

export type GrantStatus = 'ACTIVE' | 'COMPLETED' | 'SUSPENDED' | 'CLOSED';
export type GrantCostCategory = 'PERSONAL' | 'EQUIPMENT' | 'SUBCONTRACTING' | 'OTHER_DIRECT' | 'INDIRECT';
export type GrantProgram = 'POIR' | 'FENG' | 'KPO' | 'RPO' | 'POPC' | 'FNE' | 'OTHER';
export type SettlementStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface GrantProject {
  id: string;
  tenantId: string;
  name: string;
  grantNumber: string;
  program: GrantProgram;
  grantor: string;
  budgetPLN: number;
  coFinancingRate: number;
  startDate: Timestamp;
  endDate: Timestamp;
  reportingPeriodMonths: number;
  status: GrantStatus;
  description?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface GrantCost {
  id: string;
  tenantId: string;
  grantProjectId: string;
  documentId: string;
  documentNumber: string;
  amount: number;
  vatAmount: number;
  currency: string;
  category: GrantCostCategory;
  isEligible: boolean;
  ineligibilityReason?: string;
  periodStart: Timestamp;
  periodEnd: Timestamp;
  createdBy: string;
  createdAt: Timestamp;
}

export interface GrantSettlementReport {
  id: string;
  tenantId: string;
  grantProjectId: string;
  periodNumber: number;
  periodStart: Timestamp;
  periodEnd: Timestamp;
  totalCosts: number;
  eligibleCosts: number;
  ineligibleCosts: number;
  requestedAmount: number;
  breakdown: Partial<Record<GrantCostCategory, number>>;
  status: SettlementStatus;
  createdBy: string;
  createdAt: Timestamp;
}

export interface DeMinimisEntry {
  id: string;
  tenantId: string;
  grantProjectId: string;
  program: string;
  amountPLN: number;
  amountEUR: number;
  eurPlnRate: number;
  grantedAt: Timestamp;
  validUntil: Timestamp;
  createdAt: Timestamp;
}

export interface DeMinimisStatus {
  totalEUR: number;
  limitEUR: number;
  remainingEUR: number;
  utilizationPercent: number;
  entries: DeMinimisEntry[];
  isApproachingLimit: boolean;
  isExceeded: boolean;
}
