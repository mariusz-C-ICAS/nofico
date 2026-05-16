export type IndustryCode =
  | 'IT'
  | 'CONSTRUCTION'
  | 'GASTRONOMY'
  | 'BEAUTY'
  | 'LEGAL'
  | 'MEDICAL'
  | 'NGO';

export type BillingMode = 'TIME_AND_MATERIAL' | 'FIXED_PRICE' | 'RETAINER' | 'MATTER_BASED';

export interface VatRuleOverride {
  description: string;
  defaultRate: number;
  splitRules?: { condition: string; rate: number }[];
}

export interface TimeTrackingConfig {
  billingMode: BillingMode;
  defaultRatePerHour?: number;
  requiresClientApproval: boolean;
  exportFormat?: 'STANDARD' | 'MATTER' | 'PROJECT_CODE';
}

export interface ComplianceFlag {
  regulation: string;
  description: string;
  requiresDPIA: boolean;
  retentionYears: number;
}

export interface DocumentTypeExtension {
  type: string;
  labelPL: string;
  defaultWorkflowSteps?: string[];
}

export interface ExternalIntegration {
  name: string;
  type: 'POS' | 'ERP' | 'MARKETPLACE' | 'GOVERNMENT' | 'BOOKING';
  cfEndpoint: string;
}

export interface CustomFieldDefinition {
  entity: 'customer' | 'employee' | 'invoice' | 'project';
  field: string;
  labelPL: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select';
  options?: string[];
}

export interface IndustryPlugin {
  id: IndustryCode;
  namePL: string;
  nameEN: string;
  description: string;
  existingModulePath?: string;
  vatRules?: VatRuleOverride;
  timeTracking?: TimeTrackingConfig;
  complianceFlags?: ComplianceFlag[];
  documentTypeExtensions?: DocumentTypeExtension[];
  brAutoDetect?: {
    enabled: boolean;
    keywords: string[];
    categoryHints: string[];
  };
  externalIntegrations?: ExternalIntegration[];
  customFields?: CustomFieldDefinition[];
}
