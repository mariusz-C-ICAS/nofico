import type { IndustryCode, IndustryPlugin } from './types';
import {
  itPlugin, constructionPlugin, gastroPlugin,
  beautyPlugin, legalPlugin, medicalPlugin, ngoPlugin,
} from './plugins';

const REGISTRY: Record<IndustryCode, IndustryPlugin> = {
  IT: itPlugin,
  CONSTRUCTION: constructionPlugin,
  GASTRONOMY: gastroPlugin,
  BEAUTY: beautyPlugin,
  LEGAL: legalPlugin,
  MEDICAL: medicalPlugin,
  NGO: ngoPlugin,
};

export function getPlugin(industry: IndustryCode): IndustryPlugin | undefined {
  return REGISTRY[industry];
}

export function getAllPlugins(): IndustryPlugin[] {
  return Object.values(REGISTRY);
}

export function getActivePlugin(industryCode: IndustryCode | null | undefined): IndustryPlugin | undefined {
  if (!industryCode) return undefined;
  return REGISTRY[industryCode];
}

export function requiresDPIA(industry: IndustryCode): boolean {
  return REGISTRY[industry]?.complianceFlags?.some(f => f.requiresDPIA) ?? false;
}

export function getRetentionYears(industry: IndustryCode): number {
  const flags = REGISTRY[industry]?.complianceFlags;
  if (!flags?.length) return 5;
  return Math.max(...flags.map(f => f.retentionYears));
}

export function getComplianceFlags(industry: IndustryCode): string[] {
  return REGISTRY[industry]?.complianceFlags?.map(f => f.regulation) ?? [];
}

export function getExternalIntegrations(industry: IndustryCode) {
  return REGISTRY[industry]?.externalIntegrations ?? [];
}

export function getCustomFields(industry: IndustryCode, entity: 'customer' | 'employee' | 'invoice' | 'project') {
  return REGISTRY[industry]?.customFields?.filter(f => f.entity === entity) ?? [];
}
