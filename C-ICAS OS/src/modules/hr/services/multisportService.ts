/**
 * Data: 2026-05-19
 * Zmiany: T2-05 — integracja Multisport z modułem HR.
 * Ścieżka: /src/modules/hr/services/multisportService.ts
 */
import { db } from '../../../shared/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export interface MultisportConfig {
  apiUrl: string;
  apiKey: string;
}

export interface MultisportCard {
  cardId: string;
  employeeName: string;
  email: string;
  status: 'active' | 'inactive';
  startDate: string;
}

export interface MultisportMonthlyReport {
  month: string;
  activeCards: number;
  inactiveCards: number;
  totalCost: number;
  cards: MultisportCard[];
}

export interface NewEmployeeInput {
  name: string;
  email: string;
  startDate: string;
}

async function getMultisportConfig(tenantId: string): Promise<MultisportConfig> {
  const snap = await getDoc(doc(db, `tenants/${tenantId}/integrations/multisport`));
  if (!snap.exists()) {
    throw new Error('Brak konfiguracji Multisport. Skonfiguruj integrację w ustawieniach.');
  }
  const data = snap.data() as { apiUrl: string; apiKey: string };
  if (!data.apiUrl || !data.apiKey) {
    throw new Error('Niekompletna konfiguracja Multisport (brak apiUrl lub apiKey).');
  }
  return { apiUrl: data.apiUrl, apiKey: data.apiKey };
}

async function fetchEmployeeCards(
  tenantId: string,
  apiUrl: string,
  apiKey: string,
): Promise<MultisportCard[]> {
  const response = await fetch(`${apiUrl}/cards`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'X-Tenant-Id': tenantId,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`Multisport API błąd ${response.status}: ${response.statusText}`);
  }
  return response.json() as Promise<MultisportCard[]>;
}

async function reportNewEmployee(
  tenantId: string,
  employee: NewEmployeeInput,
): Promise<MultisportCard> {
  const config = await getMultisportConfig(tenantId);
  const response = await fetch(`${config.apiUrl}/cards`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'X-Tenant-Id': tenantId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(employee),
  });
  if (!response.ok) {
    throw new Error(`Błąd rejestracji pracownika w Multisport: ${response.status}`);
  }
  return response.json() as Promise<MultisportCard>;
}

async function deactivateCard(tenantId: string, cardId: string): Promise<void> {
  const config = await getMultisportConfig(tenantId);
  const response = await fetch(`${config.apiUrl}/cards/${cardId}/deactivate`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'X-Tenant-Id': tenantId,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`Błąd dezaktywacji karty ${cardId}: ${response.status}`);
  }
}

async function getMonthlyReport(
  tenantId: string,
  month: string,
): Promise<MultisportMonthlyReport> {
  const config = await getMultisportConfig(tenantId);
  const response = await fetch(`${config.apiUrl}/reports/${month}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'X-Tenant-Id': tenantId,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`Błąd pobierania raportu Multisport za ${month}: ${response.status}`);
  }
  return response.json() as Promise<MultisportMonthlyReport>;
}

export const multisportService = {
  getMultisportConfig,
  fetchEmployeeCards,
  reportNewEmployee,
  deactivateCard,
  getMonthlyReport,
};
