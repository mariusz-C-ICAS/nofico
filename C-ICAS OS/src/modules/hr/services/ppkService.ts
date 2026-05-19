/**
 * Data: 2026-05-19
 * Zmiany: T2-06 — integracja PPK PZU z modułem HR Payroll.
 * Ścieżka: /src/modules/hr/services/ppkService.ts
 */
import { db } from '../../../shared/lib/firebase';
import { doc, getDoc, collection, getDocs, updateDoc } from 'firebase/firestore';

export interface PpkConfig {
  providerId: 'ppk-pzu';
  certificateId: string;
  contractNumber: string;
  apiUrl: string;
}

export interface EmployeePpkData {
  employeeId: string;
  employeeName: string;
  email: string;
  enrolled: boolean;
  employeeRate: number;  // np. 0.02 = 2%
  employerRate: number;  // np. 0.015 = 1.5%
  baseSalary: number;
}

export interface PpkContribution {
  employeeId: string;
  employeeName: string;
  baseSalary: number;
  employeeContribution: number;
  employerContribution: number;
  ppkBonus: number;
  total: number;
}

export interface PpkReport {
  payrollRunId: string;
  generatedAt: string;
  contributions: PpkContribution[];
  totalEmployeeContributions: number;
  totalEmployerContributions: number;
  totalPpkBonus: number;
  grandTotal: number;
}

const PPK_WELCOME_BONUS = 250;
const PPK_ANNUAL_BONUS = 240;

async function getPpkConfig(tenantId: string): Promise<PpkConfig> {
  const snap = await getDoc(doc(db, `tenants/${tenantId}/integrations/ppk-pzu`));
  if (!snap.exists()) {
    throw new Error('Brak konfiguracji PPK PZU. Skonfiguruj integrację w ustawieniach.');
  }
  const data = snap.data() as PpkConfig;
  if (!data.certificateId || !data.contractNumber) {
    throw new Error('Niekompletna konfiguracja PPK PZU (brak certyfikatu lub numeru umowy).');
  }
  return data;
}

async function getEmployeePpkData(tenantId: string): Promise<EmployeePpkData[]> {
  const snap = await getDocs(collection(db, `tenants/${tenantId}/employees`));
  return snap.docs.map(d => {
    const data = d.data();
    return {
      employeeId: d.id,
      employeeName: data.name ?? `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim(),
      email: data.email ?? '',
      enrolled: data.ppkEnrolled ?? false,
      employeeRate: data.ppkEmployeeRate ?? 0.02,
      employerRate: data.ppkEmployerRate ?? 0.015,
      baseSalary: data.salary ?? 0,
    } satisfies EmployeePpkData;
  });
}

function calculatePpkContributions(
  employees: EmployeePpkData[],
  baseSalaryOverride?: number,
): PpkContribution[] {
  return employees
    .filter(emp => emp.enrolled)
    .map(emp => {
      const base = baseSalaryOverride ?? emp.baseSalary;
      const employeeContribution = base * emp.employeeRate;
      const employerContribution = base * emp.employerRate;
      const ppkBonus = PPK_WELCOME_BONUS / 12 + PPK_ANNUAL_BONUS / 12;
      return {
        employeeId: emp.employeeId,
        employeeName: emp.employeeName,
        baseSalary: base,
        employeeContribution: Math.round(employeeContribution * 100) / 100,
        employerContribution: Math.round(employerContribution * 100) / 100,
        ppkBonus: Math.round(ppkBonus * 100) / 100,
        total: Math.round((employeeContribution + employerContribution + ppkBonus) * 100) / 100,
      } satisfies PpkContribution;
    });
}

async function generatePpkReport(tenantId: string, payrollRunId: string): Promise<PpkReport> {
  const employees = await getEmployeePpkData(tenantId);
  const contributions = calculatePpkContributions(employees);

  const totalEmployeeContributions = contributions.reduce((s, c) => s + c.employeeContribution, 0);
  const totalEmployerContributions = contributions.reduce((s, c) => s + c.employerContribution, 0);
  const totalPpkBonus = contributions.reduce((s, c) => s + c.ppkBonus, 0);

  return {
    payrollRunId,
    generatedAt: new Date().toISOString(),
    contributions,
    totalEmployeeContributions: Math.round(totalEmployeeContributions * 100) / 100,
    totalEmployerContributions: Math.round(totalEmployerContributions * 100) / 100,
    totalPpkBonus: Math.round(totalPpkBonus * 100) / 100,
    grandTotal: Math.round((totalEmployeeContributions + totalEmployerContributions + totalPpkBonus) * 100) / 100,
  };
}

async function setEmployeePpkEnrollment(
  tenantId: string,
  employeeId: string,
  enrolled: boolean,
): Promise<void> {
  await updateDoc(doc(db, `tenants/${tenantId}/employees`, employeeId), {
    ppkEnrolled: enrolled,
  });
}

export const ppkService = {
  getPpkConfig,
  getEmployeePpkData,
  calculatePpkContributions,
  generatePpkReport,
  setEmployeePpkEnrollment,
};
