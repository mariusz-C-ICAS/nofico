/**
 * Data: 2026-05-17
 * Opis: Typy danych dla generatora IDES — profile firm i wyniki generowania.
 */

export type CompanyType =
  | 'manufacturing'
  | 'services'
  | 'it'
  | 'retail'
  | 'construction'
  | 'healthcare'
  | 'education'
  | 'logistics'
  | 'finance_sector';

export interface CompanyProfile {
  companyName: string;
  companyType: CompanyType;
  industry: string;
  employeeCount: number;
  modules: string[];
  generateMonths: number; // default 13
  tenantId: string;
}

export interface IdesGenerationResult {
  module: string;
  created: number;
  errors: number;
}
