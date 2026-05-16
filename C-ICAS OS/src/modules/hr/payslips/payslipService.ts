import { db } from '../../../shared/lib/firebase';
import { collection, addDoc, query, where, orderBy, getDocs, serverTimestamp, doc, updateDoc } from 'firebase/firestore';

export interface SalaryComponents {
  enableZusTaxes: boolean;
  zusEmerytalna: number;
  zusRentowa: number;
  zdrowotna: number;
  funduszPracy: number;
  ppk: number;
  taxProg1: number;
  taxProg2: number;
  kwotaWolna: number;
  kosztyUzyskania: number;
}

export interface PayslipCalc {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  contractType: string;
  period: string; // 'YYYY-MM'
  periodLabel: string; // 'Maj 2026'
  hoursWorked: number;
  grossBase: number;
  zusEmerytalna: number;
  zusRentowa: number;
  zdrowotna: number;
  ppk: number;
  taxBase: number;
  pit: number;
  netSalary: number;
  bruttoVAT?: number;
  vatRate?: number;
  isB2B: boolean;
  pitZero: boolean;
  isStudent: boolean;
}

export interface PayslipRecord extends PayslipCalc {
  id?: string;
  tenantId: string;
  sentAt?: any;
  sentToEmail?: string;
  generatedAt?: any;
  status: 'generated' | 'sent' | 'viewed';
}

const MONTH_NAMES_PL = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'];

export function calcPayslip(
  emp: any,
  components: SalaryComponents,
  period: string,
  hoursWorked: number
): PayslipCalc {
  const [year, month] = period.split('-').map(Number);
  const periodLabel = `${MONTH_NAMES_PL[month - 1]} ${year}`;
  const isB2B = emp.contractType === 'B2B';

  let grossBase = 0;
  if (emp.baseSalary && emp.baseSalary > 0) {
    grossBase = emp.baseSalary;
  } else {
    grossBase = hoursWorked * (emp.hourlyRate || 0);
  }
  if (emp.salaryType === 'NET' && !isB2B) {
    const factor = (emp.isStudent || emp.pitZero) ? 1.15 : 1.35;
    grossBase = grossBase * factor;
  }

  let zusEmerytalna = 0, zusRentowa = 0, zdrowotna = 0, ppk = 0, pit = 0;

  if (!isB2B && components.enableZusTaxes) {
    if (!emp.isStudent) {
      zusEmerytalna = grossBase * (components.zusEmerytalna / 100);
      zusRentowa    = grossBase * (components.zusRentowa / 100);
    }
    zdrowotna = (grossBase - zusEmerytalna - zusRentowa) * (components.zdrowotna / 100);
    ppk = grossBase * (components.ppk / 100);
    const kup = emp.authorCosts ? components.kosztyUzyskania * 2 : components.kosztyUzyskania;
    const taxBase = Math.max(0, grossBase - zusEmerytalna - zusRentowa - kup);
    if (!emp.pitZero && !emp.isStudent) {
      pit = Math.max(0, taxBase * (components.taxProg1 / 100) - components.kwotaWolna / 12);
    }
  }

  const netSalary = isB2B ? grossBase : grossBase - zusEmerytalna - zusRentowa - zdrowotna - ppk - pit;

  let bruttoVAT: number | undefined;
  let vatRate: number | undefined;
  if (isB2B) {
    vatRate = emp.vatType === 'EXEMPT' || emp.vatType === 'REVERSE_CHARGE' ? 0 : (emp.vatRate || 23);
    bruttoVAT = grossBase * (1 + vatRate / 100);
  }

  return {
    employeeId: emp.id,
    employeeName: emp.name || emp.email || '',
    employeeEmail: emp.email || '',
    contractType: emp.contractType || 'Umowa o pracę',
    period,
    periodLabel,
    hoursWorked,
    grossBase,
    zusEmerytalna,
    zusRentowa,
    zdrowotna,
    ppk,
    taxBase: Math.max(0, grossBase - zusEmerytalna - zusRentowa),
    pit,
    netSalary,
    bruttoVAT,
    vatRate,
    isB2B,
    pitZero: !!emp.pitZero,
    isStudent: !!emp.isStudent,
  };
}

export async function savePayslip(tenantId: string, calc: PayslipCalc): Promise<string> {
  const ref = await addDoc(collection(db, 'tenants', tenantId, 'payslips'), {
    ...calc,
    tenantId,
    status: 'generated',
    generatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function markPayslipSent(tenantId: string, payslipId: string, email: string) {
  await updateDoc(doc(db, 'tenants', tenantId, 'payslips', payslipId), {
    status: 'sent',
    sentAt: serverTimestamp(),
    sentToEmail: email,
  });
  // Queue email via Firestore — picked up by Firebase Extensions / Cloud Function
  await addDoc(collection(db, 'mail'), {
    to: email,
    message: {
      subject: `Pasek płacowy`,
      html: `<p>Twój pasek płacowy jest dostępny w systemie C-ICAS OS.</p>`,
    },
    tenantId,
    payslipId,
    createdAt: serverTimestamp(),
  });
}

export async function loadPayslips(tenantId: string, period?: string): Promise<PayslipRecord[]> {
  const col = collection(db, 'tenants', tenantId, 'payslips');
  const q = period
    ? query(col, where('period', '==', period), orderBy('generatedAt', 'desc'))
    : query(col, orderBy('generatedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as PayslipRecord));
}
