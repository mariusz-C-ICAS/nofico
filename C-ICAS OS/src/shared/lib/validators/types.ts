export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface ViesResult {
  valid: boolean;
  name?: string;
  address?: string;
  countryCode: string;
  vatNumber: string;
}

export interface BialaListaResult {
  valid: boolean;
  nip: string;
  accountNumbers?: string[];
  statusVat?: 'Czynny' | 'Zwolniony' | 'Niezarejestrowany';
}

export interface GUSResult {
  nip: string;
  name?: string;
  regon?: string;
  address?: string;
  found: boolean;
}
