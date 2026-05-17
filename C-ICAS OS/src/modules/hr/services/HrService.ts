/**
 * Data: 2026-05-14
 * Ścieżka: /src/modules/hr/services/HrService.ts
 */
import { db } from '../../../shared/lib/firebase';
import { collection, doc, getDocs, getDoc, addDoc, updateDoc, query, where } from 'firebase/firestore';

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

export const HrService = {
  getEmployees: async (tenantId: string): Promise<Employee[]> => {
    const snap = await getDocs(collection(db, `tenants/${tenantId}/employees`));
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Employee, 'id'>) }));
  },

  getEmployee: async (tenantId: string, id: string): Promise<Employee | undefined> => {
    const snap = await getDoc(doc(db, `tenants/${tenantId}/employees`, id));
    if (!snap.exists()) return undefined;
    return { id: snap.id, ...(snap.data() as Omit<Employee, 'id'>) };
  },

  createEmployee: async (tenantId: string, data: Omit<Employee, 'id'>): Promise<string> => {
    const ref = await addDoc(collection(db, `tenants/${tenantId}/employees`), data);
    return ref.id;
  },

  updateEmployee: async (tenantId: string, id: string, data: Partial<Employee>): Promise<void> => {
    await updateDoc(doc(db, `tenants/${tenantId}/employees`, id), data as any);
  },

  deleteEmployee: async (tenantId: string, id: string): Promise<void> => {
    await updateDoc(doc(db, `tenants/${tenantId}/employees`, id), { status: 'terminated' });
  },

  getOrgUnits: async (tenantId: string): Promise<OrgUnit[]> => {
    const snap = await getDocs(collection(db, `tenants/${tenantId}/orgUnits`));
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<OrgUnit, 'id'>) }));
  },

  getPayrollRecords: async (tenantId: string, month: string, year: number): Promise<PayrollRecord[]> => {
    const q = query(
      collection(db, `tenants/${tenantId}/payrollRecords`),
      where('month', '==', month),
      where('year', '==', year),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<PayrollRecord, 'id'>) }));
  },

  generatePayroll: async (tenantId: string, month: string, year: number): Promise<string> => {
    const ref = await addDoc(collection(db, `tenants/${tenantId}/payrollRuns`), {
      month,
      year,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
    return ref.id;
  },
};
