import type { IndustryPlugin } from './types';

export const itPlugin: IndustryPlugin = {
  id: 'IT',
  namePL: 'IT / Software House',
  nameEN: 'IT / Software House',
  description: 'Klasyfikacja B+R/IP Box, rozliczenia T&M i Fixed Price, integracja GitHub/GitLab',
  timeTracking: { billingMode: 'TIME_AND_MATERIAL', requiresClientApproval: true, exportFormat: 'PROJECT_CODE' },
  brAutoDetect: {
    enabled: true,
    keywords: ['cloud', 'licencja', 'konferencja', 'szkolenie', 'serwer', 'software', 'API', 'hosting', 'AWS', 'GCP', 'Azure'],
    categoryHints: ['IT_TOOLS', 'TRAINING', 'CLOUD_SERVICES', 'CONFERENCES'],
  },
  documentTypeExtensions: [
    { type: 'CHANGE_REQUEST', labelPL: 'Change Request', defaultWorkflowSteps: ['REQUEST', 'ESTIMATE', 'APPROVE', 'IMPLEMENT'] },
    { type: 'PROJECT_DELIVERY', labelPL: 'Milestone Delivery', defaultWorkflowSteps: ['SUBMIT', 'CLIENT_REVIEW', 'APPROVE', 'INVOICE'] },
  ],
  externalIntegrations: [
    { name: 'GitHub', type: 'ERP', cfEndpoint: 'syncGitHubTimeEntries' },
    { name: 'GitLab', type: 'ERP', cfEndpoint: 'syncGitLabTimeEntries' },
    { name: 'Jira', type: 'ERP', cfEndpoint: 'syncJiraTimeEntries' },
  ],
  customFields: [
    { entity: 'project', field: 'billingMode', labelPL: 'Tryb rozliczeń', type: 'select', options: ['T&M', 'Fixed Price', 'Retainer'] },
    { entity: 'project', field: 'isBrProject', labelPL: 'Projekt B+R (IP Box)', type: 'boolean' },
    { entity: 'invoice', field: 'ipBoxClassification', labelPL: 'Klasyfikacja IP Box', type: 'select', options: ['KWALIFIKOWANE', 'NIE-KWALIFIKOWANE', 'DO_WERYFIKACJI'] },
  ],
};

export const constructionPlugin: IndustryPlugin = {
  id: 'CONSTRUCTION',
  namePL: 'Budownictwo',
  nameEN: 'Construction',
  description: 'MPP/split-payment podwykonawcy, karty pracy brygady, materiały per budowa',
  existingModulePath: 'src/modules/departments/ConstructionModule.tsx',
  vatRules: {
    description: 'Odwrotne obciążenie / MPP dla usług budowlanych B2B',
    defaultRate: 0.23,
    splitRules: [
      { condition: 'Usługi budowlane między podatnikami VAT', rate: 0 },
      { condition: 'Sprzedaż materiałów budowlanych', rate: 0.23 },
    ],
  },
  timeTracking: { billingMode: 'TIME_AND_MATERIAL', requiresClientApproval: false, exportFormat: 'PROJECT_CODE' },
  documentTypeExtensions: [
    { type: 'GOODS_RECEIPT', labelPL: 'Przyjęcie materiałów na budowę (PZ)' },
    { type: 'SUBCONTRACTOR_APPROVAL', labelPL: 'Akceptacja faktury podwykonawcy' },
  ],
  customFields: [
    { entity: 'project', field: 'constructionSiteAddress', labelPL: 'Adres budowy', type: 'text' },
    { entity: 'project', field: 'buildingPermitNumber', labelPL: 'Nr pozwolenia na budowę', type: 'text' },
    { entity: 'invoice', field: 'isMppRequired', labelPL: 'Wymaga Split Payment (MPP)', type: 'boolean' },
  ],
};

export const gastroPlugin: IndustryPlugin = {
  id: 'GASTRONOMY',
  namePL: 'Gastronomia',
  nameEN: 'Gastronomy / F&B',
  description: 'Integracja POS, podział VAT lokal/takeaway, analiza shrinkage, faktury B2C dzienne',
  vatRules: {
    description: 'Różne stawki VAT: dine-in (5%) vs takeaway (8%)',
    defaultRate: 0.05,
    splitRules: [
      { condition: 'Sprzedaż na miejscu (dine-in)', rate: 0.05 },
      { condition: 'Sprzedaż na wynos (takeaway)', rate: 0.08 },
      { condition: 'Dostawa (delivery platform)', rate: 0.08 },
    ],
  },
  externalIntegrations: [
    { name: 'PosBistro', type: 'POS', cfEndpoint: 'syncPosBistro' },
    { name: 'Gastro POS', type: 'POS', cfEndpoint: 'syncGastroPOS' },
    { name: 'Uber Eats', type: 'MARKETPLACE', cfEndpoint: 'syncUberEats' },
    { name: 'Glovo', type: 'MARKETPLACE', cfEndpoint: 'syncGlovo' },
  ],
  customFields: [
    { entity: 'invoice', field: 'vatSplitDineIn', labelPL: 'Wartość sprzedaży na miejscu (PLN)', type: 'number' },
    { entity: 'invoice', field: 'vatSplitTakeaway', labelPL: 'Wartość sprzedaży na wynos (PLN)', type: 'number' },
    { entity: 'project', field: 'posSystem', labelPL: 'System POS', type: 'select', options: ['PosBistro', 'Gastro POS', 'Square', 'Brak'] },
  ],
};

export const beautyPlugin: IndustryPlugin = {
  id: 'BEAUTY',
  namePL: 'Beauty / Usługi osobiste',
  nameEN: 'Beauty / Personal Services',
  description: 'Rezerwacje → auto-faktura, kartoteka klienta (RODO), prowizje pracowników B2B',
  complianceFlags: [{
    regulation: 'RODO Art. 9',
    description: 'Dane dotyczące zdrowia klientów (zabiegi dermatologiczne) — wymagają DPIA',
    requiresDPIA: false,
    retentionYears: 5,
  }],
  externalIntegrations: [
    { name: 'Booksy', type: 'BOOKING', cfEndpoint: 'syncBooksy' },
    { name: 'Fresha', type: 'BOOKING', cfEndpoint: 'syncFresha' },
  ],
  customFields: [
    { entity: 'customer', field: 'gdprConsentDate', labelPL: 'Data zgody RODO', type: 'date' },
    { entity: 'employee', field: 'commissionRate', labelPL: 'Prowizja (%)', type: 'number' },
    { entity: 'invoice', field: 'appointmentId', labelPL: 'ID wizyty w systemie rezerwacji', type: 'text' },
  ],
};

export const legalPlugin: IndustryPlugin = {
  id: 'LEGAL',
  namePL: 'Kancelaria prawna',
  nameEN: 'Law Firm',
  description: 'Billing per matter, tajemnica zawodowa, izolacja danych, integracja EPU/PRS',
  timeTracking: { billingMode: 'MATTER_BASED', requiresClientApproval: true, exportFormat: 'MATTER' },
  complianceFlags: [{
    regulation: 'Tajemnica zawodowa adwokacka/radcowska',
    description: 'Zakaz dostępu AI Copilot bez eksplicytnej zgody klienta. Obowiązkowe DPIA.',
    requiresDPIA: true,
    retentionYears: 10,
  }],
  externalIntegrations: [
    { name: 'Portal EPU (e-sąd)', type: 'GOVERNMENT', cfEndpoint: 'syncEPU' },
    { name: 'Portal PRS', type: 'GOVERNMENT', cfEndpoint: 'syncPRS' },
  ],
  customFields: [
    { entity: 'project', field: 'matterNumber', labelPL: 'Nr sprawy', type: 'text' },
    { entity: 'project', field: 'courtCaseId', labelPL: 'Sygnatura sądowa', type: 'text' },
    { entity: 'customer', field: 'confidentiality', labelPL: 'Poziom poufności', type: 'select', options: ['STANDARDOWY', 'PODWYŻSZONY', 'TAJEMNICA_BEZWZGLEDNA'] },
    { entity: 'invoice', field: 'billedHours', labelPL: 'Zafakturowane godziny', type: 'number' },
  ],
};

export const medicalPlugin: IndustryPlugin = {
  id: 'MEDICAL',
  namePL: 'Ochrona zdrowia',
  nameEN: 'Healthcare / Medical',
  description: 'Dane Art. 9 RODO, DPIA obowiązkowe, rozliczenia NFZ/SZOI, recepty refundowane',
  complianceFlags: [
    {
      regulation: 'RODO Art. 9 — Dane dotyczące zdrowia',
      description: 'Dane pacjentów są danymi wrażliwymi. Obowiązkowe DPIA + DPO + anonimizacja w BI.',
      requiresDPIA: true,
      retentionYears: 20,
    },
    {
      regulation: 'Ustawa o prawach pacjenta Art. 26',
      description: 'Dokumentacja medyczna min. 20 lat od ostatniego wpisu.',
      requiresDPIA: false,
      retentionYears: 20,
    },
  ],
  externalIntegrations: [
    { name: 'SZOI / NFZ', type: 'GOVERNMENT', cfEndpoint: 'syncSZOI' },
    { name: 'SIMP (eWUŚ)', type: 'GOVERNMENT', cfEndpoint: 'syncSIMP' },
  ],
  customFields: [
    { entity: 'customer', field: 'patientPesel', labelPL: 'Nr PESEL pacjenta', type: 'text' },
    { entity: 'invoice', field: 'nfzContractNumber', labelPL: 'Nr umowy NFZ', type: 'text' },
    { entity: 'invoice', field: 'prescriptionRefundPLN', labelPL: 'Refundacja recepty (PLN)', type: 'number' },
  ],
};

export const ngoPlugin: IndustryPlugin = {
  id: 'NGO',
  namePL: 'Fundacja / NGO / OPP',
  nameEN: 'Foundation / NGO / OPP',
  description: 'Działalność statutowa vs gospodarcza, OPP 1.5% PIT, portal dla darczyńców',
  documentTypeExtensions: [
    { type: 'BUDGET_REQUEST', labelPL: 'Wniosek o środki z funduszu' },
    { type: 'AUDIT_FINDING', labelPL: 'Sprawozdanie OPP (MRiPS)' },
  ],
  customFields: [
    { entity: 'project', field: 'activityType', labelPL: 'Rodzaj działalności', type: 'select', options: ['STATUTOWA', 'GOSPODARCZA', 'MIESZANA'] },
    { entity: 'invoice', field: 'isOppEligible', labelPL: 'Koszt kwalifikowany OPP', type: 'boolean' },
    { entity: 'customer', field: 'donorType', labelPL: 'Typ darczyńcy', type: 'select', options: ['OSOBA_FIZYCZNA', 'FIRMA', 'INSTYTUCJA_PUBLICZNA', 'ZAGRANICA'] },
    { entity: 'customer', field: 'oppConsent', labelPL: 'Zgoda na 1.5% PIT', type: 'boolean' },
  ],
};
