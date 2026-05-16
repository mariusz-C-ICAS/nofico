/**
 * Data: 2026-05-12
 * Zmiany: Silnik obliczeniowy wynagrodzeń (ZUS, Podatki, PPK).
 * Ścieżka: /src/modules/hr/utils/payrollEngine.ts
 */

export interface PayrollCalculationInput {
  grossSalary: number;
  taxYear: number;
  hasPpk: boolean;
  ppkRateEmployee: number;
  ppkRateEmployer: number;
  isYoungerThan26: boolean;
  contractType: 'UoP' | 'B2B' | 'UZ' | 'UD';
}

export interface PayrollResult {
  gross: number;
  net: number;
  pensionInsurance: number; // Emerytalna
  disabilityInsurance: number; // Rentowa
  sicknessInsurance: number; // Chorobowa
  healthInsurance: number; // Zdrowotna
  taxBase: number;
  incomeTax: number;
  ppkEmployee: number;
  ppkEmployer: number;
  totalEmployerCost: number;
}

/**
 * Uproszczony silnik płacowy dla Polski (Wartości 2024/2025/2026).
 * HR-IMP-02
 */
export function calculatePayroll(input: PayrollCalculationInput): PayrollResult {
  const { grossSalary, hasPpk, ppkRateEmployee, ppkRateEmployer, isYoungerThan26, contractType } = input;

  if (contractType === 'B2B') {
    // B2B: Uproszczone netto (np. Ryczałt 12% + ZUS ryczałtowy)
    const zusSocial = 1600; // Stały ZUS społeczny
    const healthInsurance = 700; // Uproszczone zdrowotne
    const tax = (grossSalary - zusSocial) * 0.12; // Ryczałt 12%
    const net = grossSalary - zusSocial - healthInsurance - tax;
    
    return {
      gross: grossSalary,
      net,
      pensionInsurance: zusSocial * 0.6,
      disabilityInsurance: zusSocial * 0.3,
      sicknessInsurance: zusSocial * 0.1,
      healthInsurance,
      taxBase: grossSalary - zusSocial,
      incomeTax: tax,
      ppkEmployee: 0,
      ppkEmployer: 0,
      totalEmployerCost: grossSalary
    };
  }

  // UoP Calculations (Simplified)
  const pensionRate = 0.0976;
  const disabilityRate = 0.015;
  const sicknessRate = 0.0245;
  const healthRate = 0.09;

  const pension = grossSalary * pensionRate;
  const disability = grossSalary * disabilityRate;
  const sickness = grossSalary * sicknessRate;
  const totalSocial = pension + disability + sickness;

  const ppkEmployee = hasPpk ? grossSalary * ppkRateEmployee : 0;
  const ppkEmployer = hasPpk ? grossSalary * ppkRateEmployer : 0;

  const basisForHealth = grossSalary - totalSocial;
  const health = basisForHealth * healthRate;

  // Zaliczka na podatek
  let incomeTax = 0;
  if (!isYoungerThan26) {
    const expenses = 250; // Koszty uzyskania przychodu
    const freeAmount = 30000 / 12; // Kwota wolna (uproszczone)
    const taxBasis = Math.max(0, grossSalary - totalSocial - expenses);
    incomeTax = Math.max(0, (taxBasis * 0.12) - 300); // 12% minus ulga
  }

  const net = grossSalary - totalSocial - health - incomeTax - ppkEmployee;

  return {
    gross: grossSalary,
    net,
    pensionInsurance: pension,
    disabilityInsurance: disability,
    sicknessInsurance: sickness,
    healthInsurance: health,
    taxBase: grossSalary - totalSocial - 250,
    incomeTax,
    ppkEmployee,
    ppkEmployer,
    totalEmployerCost: grossSalary + (grossSalary * 0.18) + ppkEmployer // Koszt pracodawcy (Zus emmployer ~18%)
  };
}
