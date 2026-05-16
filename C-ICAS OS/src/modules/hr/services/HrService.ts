/**
 * Data: 2026-05-14
 * Ścieżka: /src/modules/hr/services/HrService.ts
 */

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  department: string;
  position: string;
  contractType: 'UoP' | 'B2B' | 'UoZ';
  startDate: string;
  status: 'active' | 'onLeave' | 'terminated';
  salary: number;
}

export interface OrgUnit {
  id: string;
  name: string;
  parentId: string | null;
  managerId: string | null;
  headcount: number;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  month: string;
  year: number;
  grossSalary: number;
  netSalary: number;
  status: 'generated' | 'pending' | 'sent';
  generatedAt: string;
}

const MOCK_EMPLOYEES: Employee[] = [
  { id: 'EMP-001', firstName: 'Adam',      lastName: 'Kowalski',   department: 'IT',       position: 'Senior Developer',  contractType: 'B2B', startDate: '2021-03-01', status: 'active',     salary: 22000 },
  { id: 'EMP-002', firstName: 'Anna',      lastName: 'Nowak',      department: 'HR',       position: 'HR Manager',        contractType: 'UoP', startDate: '2019-06-15', status: 'active',     salary: 12500 },
  { id: 'EMP-003', firstName: 'Marek',     lastName: 'Zając',      department: 'Sprzedaż', position: 'Business Analyst',  contractType: 'UoP', startDate: '2020-11-01', status: 'onLeave',    salary:  9800 },
  { id: 'EMP-004', firstName: 'Katarzyna', lastName: 'Wilk',       department: 'IT',       position: 'UX Designer',       contractType: 'UoZ', startDate: '2026-04-01', status: 'active',     salary:  6500 },
  { id: 'EMP-005', firstName: 'Piotr',     lastName: 'Wiśniewski', department: 'Finanse',  position: 'Główny Księgowy',   contractType: 'UoP', startDate: '2018-01-10', status: 'active',     salary: 14200 },
  { id: 'EMP-006', firstName: 'Joanna',    lastName: 'Lewandowska',department: 'Produkcja',position: 'Kierownik Zmiany',  contractType: 'UoP', startDate: '2022-07-20', status: 'active',     salary:  8900 },
  { id: 'EMP-007', firstName: 'Tomasz',    lastName: 'Dąbrowski',  department: 'IT',       position: 'DevOps Engineer',   contractType: 'B2B', startDate: '2023-02-14', status: 'active',     salary: 18000 },
  { id: 'EMP-008', firstName: 'Monika',    lastName: 'Kamińska',   department: 'Sprzedaż', position: 'Account Manager',   contractType: 'UoP', startDate: '2024-09-01', status: 'terminated', salary:  7600 },
];

const MOCK_ORG_UNITS: OrgUnit[] = [
  { id: 'OU-001', name: 'Zarząd',    parentId: null,    managerId: null,    headcount: 1 },
  { id: 'OU-002', name: 'HR',        parentId: 'OU-001',managerId: 'EMP-002', headcount: 3 },
  { id: 'OU-003', name: 'Finanse',   parentId: 'OU-001',managerId: 'EMP-005', headcount: 3 },
  { id: 'OU-004', name: 'Produkcja', parentId: 'OU-001',managerId: 'EMP-006', headcount: 3 },
  { id: 'OU-005', name: 'Sprzedaż',  parentId: 'OU-001',managerId: null,    headcount: 3 },
  { id: 'OU-006', name: 'IT',        parentId: 'OU-001',managerId: 'EMP-001', headcount: 4 },
];

export const HrService = {
  /**
   * Pobiera listę pracowników dla danego tenanta.
   * HR-SVC-01
   */
  getEmployees: async (_tenantId: string): Promise<Employee[]> => {
    return Promise.resolve(MOCK_EMPLOYEES);
  },

  /**
   * Pobiera pojedynczego pracownika po ID.
   * HR-SVC-02
   */
  getEmployee: async (_tenantId: string, id: string): Promise<Employee | undefined> => {
    return Promise.resolve(MOCK_EMPLOYEES.find(e => e.id === id));
  },

  /**
   * Tworzy nowego pracownika.
   * HR-SVC-03
   */
  createEmployee: async (_tenantId: string, _data: Omit<Employee, 'id'>): Promise<string> => {
    const newId = `EMP-${String(MOCK_EMPLOYEES.length + 1).padStart(3, '0')}`;
    return Promise.resolve(newId);
  },

  /**
   * Aktualizuje dane pracownika.
   * HR-SVC-04
   */
  updateEmployee: async (_tenantId: string, _id: string, _data: Partial<Employee>): Promise<void> => {
    return Promise.resolve();
  },

  /**
   * Dezaktywuje / usuwa pracownika (soft delete).
   * HR-SVC-05
   */
  deleteEmployee: async (_tenantId: string, _id: string): Promise<void> => {
    return Promise.resolve();
  },

  /**
   * Pobiera jednostki organizacyjne (drzewo org).
   * HR-SVC-06
   */
  getOrgUnits: async (_tenantId: string): Promise<OrgUnit[]> => {
    return Promise.resolve(MOCK_ORG_UNITS);
  },

  /**
   * Pobiera listę płac dla danego miesiąca/roku.
   * HR-SVC-07
   */
  getPayrollRecords: async (_tenantId: string, _month: string, _year: number): Promise<PayrollRecord[]> => {
    return Promise.resolve([]);
  },

  /**
   * Generuje listę płac dla wybranego okresu.
   * HR-SVC-08
   */
  generatePayroll: async (_tenantId: string, _month: string, _year: number): Promise<string> => {
    const runId = `PR-${_year}${_month}-${Date.now()}`;
    return Promise.resolve(runId);
  },
};
