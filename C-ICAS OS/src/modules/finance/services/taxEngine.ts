/**
 * Data: 2026-05-16
 * Silnik obliczeniowy PIT/ZUS/VAT dla polskich przedsiębiorców 2026.
 * Ścieżka: /src/modules/finance/services/taxEngine.ts
 */

export interface TaxInput {
  monthlyRevenue: number;
  monthlyCosts: number;
  taxForm: 'scale' | 'linear' | 'lump_8_5' | 'lump_12' | 'lump_15' | 'card';
  pkwiuCode?: string;
  hasChildren?: number;
  spouseJoint?: boolean;
  zusBase?: 'standard' | 'preferential' | 'small_business';
  hasPpk?: boolean;
  ytdRevenue?: number;
  ytdCosts?: number;
  period?: string;
}

export interface TaxResult {
  grossIncome: number;
  taxBase: number;
  incomeTax: number;
  healthContribution: number;
  socialContributions: number;
  laborFundContribution: number;
  ppkContribution: number;
  totalBurden: number;
  netIncome: number;
  effectiveTaxRate: number;
  notes: string[];
  breakdown: { label: string; amount: number; basis?: string }[];
}

// ─── Stałe 2026 ──────────────────────────────────────────────────────────────

const ZUS_RATES = {
  emerytalna: 0.1952,
  rentowa: 0.08,
  chorobowa: 0.0245,
  wypadkowa: 0.0167,
  fp: 0.01,
};

const ZUS_BASES = {
  standard: 5203.80,       // 60% przeciętnego wynagrodzenia 2026
  preferential: 1347.00,   // 30% minimalnego wynagrodzenia (nowe firmy, pierwsze 24 mies.)
  small_business: 2700.00, // Mały ZUS Plus – szacowana podstawa (zależy od dochodu)
};

const HEALTH_2026 = {
  scale_rate: 0.09,
  linear_rate: 0.049,
  min_health: 314.96,   // minimalna składka zdrowotna
  lump: {
    tier1: { maxRevenueMth: 5000, monthly: 314.96 },    // do 60k/rok = 5k/mies
    tier2: { maxRevenueMth: 25000, monthly: 524.93 },   // do 300k/rok = 25k/mies
    tier3: { monthly: 944.87 },                          // powyżej 300k/rok
  },
};

const PIT_SCALE_2026 = {
  threshold: 120000,
  rate1: 0.12,
  rate2: 0.32,
  taxFreeAmount: 30000,
  taxFreeReduction: 3600,  // 30k * 12% = 3600 zł ulga
  childRelief: [
    { children: 1, annual: 1112.04 },
    { children: 2, annual: 2224.08 },
    { children: 3, annual: 4224.12 },
    { children: 4, annual: 6924.12 },
  ],
};

const PIT_LINEAR_RATE = 0.19;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function round2(val: number): number {
  return Math.round(val * 100) / 100;
}

function calcZusSocial(zusBase: TaxInput['zusBase'] = 'standard'): {
  emerytalna: number;
  rentowa: number;
  chorobowa: number;
  wypadkowa: number;
  total: number;
  base: number;
} {
  const base = ZUS_BASES[zusBase ?? 'standard'];
  const emerytalna = round2(base * ZUS_RATES.emerytalna);
  const rentowa = round2(base * ZUS_RATES.rentowa);
  const chorobowa = round2(base * ZUS_RATES.chorobowa);
  const wypadkowa = round2(base * ZUS_RATES.wypadkowa);
  const total = round2(emerytalna + rentowa + chorobowa + wypadkowa);
  return { emerytalna, rentowa, chorobowa, wypadkowa, total, base };
}

function calcLaborFund(zusBase: TaxInput['zusBase'] = 'standard'): number {
  const base = ZUS_BASES[zusBase ?? 'standard'];
  return round2(base * ZUS_RATES.fp);
}

function calcHealthScale(dochod: number): number {
  const raw = round2(dochod * HEALTH_2026.scale_rate);
  return Math.max(raw, HEALTH_2026.min_health);
}

function calcHealthLinear(dochod: number): number {
  const raw = round2(dochod * HEALTH_2026.linear_rate);
  return Math.max(raw, HEALTH_2026.min_health);
}

function calcHealthLump(monthlyRevenue: number): number {
  const t = HEALTH_2026.lump;
  if (monthlyRevenue <= t.tier1.maxRevenueMth) return t.tier1.monthly;
  if (monthlyRevenue <= t.tier2.maxRevenueMth) return t.tier2.monthly;
  return t.tier3.monthly;
}

function calcChildRelief(children: number): number {
  if (!children || children <= 0) return 0;
  const clamped = Math.min(children, 4);
  return (PIT_SCALE_2026.childRelief.find(c => c.children === clamped)?.annual ?? 0) / 12;
}

// ─── Kalkulatory per forma ────────────────────────────────────────────────────

function calcScale(input: TaxInput): TaxResult {
  const notes: string[] = [];
  const breakdown: TaxResult['breakdown'] = [];

  const zus = calcZusSocial(input.zusBase);
  const fp = calcLaborFund(input.zusBase);

  const grossIncome = round2(input.monthlyRevenue - input.monthlyCosts);
  const grossIncomeAnnual = grossIncome * 12;

  // Podstawa = dochód - ZUS społeczne (zaokr do zł)
  const taxBase = Math.max(0, round2(grossIncome - zus.total));
  const taxBaseAnnual = taxBase * 12;

  // Składka zdrowotna od dochodu (po ZUS)
  const healthContribution = calcHealthScale(taxBase);

  // Zaliczka PIT – prosta skala roczna proporcjonalna
  let annualTax = 0;
  const taxFreeDeduction = PIT_SCALE_2026.taxFreeReduction; // 3600 zł rocznie
  if (taxBaseAnnual <= PIT_SCALE_2026.taxFreeAmount) {
    annualTax = 0;
  } else if (taxBaseAnnual <= PIT_SCALE_2026.threshold) {
    annualTax = taxBaseAnnual * PIT_SCALE_2026.rate1 - taxFreeDeduction;
  } else {
    annualTax =
      PIT_SCALE_2026.threshold * PIT_SCALE_2026.rate1 -
      taxFreeDeduction +
      (taxBaseAnnual - PIT_SCALE_2026.threshold) * PIT_SCALE_2026.rate2;
    notes.push('Przekraczasz próg 32% — rozważ podatek liniowy lub optymalizację kosztów.');
  }

  // Ulga na dzieci
  const childRelief = calcChildRelief(input.hasChildren ?? 0);
  annualTax = Math.max(0, annualTax - childRelief * 12);

  const incomeTax = Math.max(0, round2(annualTax / 12));

  const ppkContribution = input.hasPpk ? round2(input.monthlyRevenue * 0.015) : 0;

  const totalBurden = round2(
    incomeTax + healthContribution + zus.total + fp + ppkContribution
  );
  const netIncome = round2(input.monthlyRevenue - input.monthlyCosts - totalBurden);
  const effectiveTaxRate = input.monthlyRevenue > 0
    ? round2((totalBurden / input.monthlyRevenue) * 100)
    : 0;

  if (input.hasChildren && input.hasChildren > 0) {
    notes.push(`Ulga na ${input.hasChildren} dziecko/dzieci: ${round2(childRelief)} PLN/mies.`);
  }
  if (input.spouseJoint && taxBaseAnnual > 60000) {
    notes.push('Rozliczenie wspólne może obniżyć podatek — skonsultuj z doradcą.');
  }
  if (input.zusBase === 'preferential') {
    notes.push('Preferencyjny ZUS: dostępny przez pierwsze 24 miesiące działalności.');
  }

  breakdown.push(
    { label: 'Przychód', amount: input.monthlyRevenue },
    { label: 'Koszty', amount: -input.monthlyCosts },
    { label: 'Dochód brutto', amount: grossIncome },
    { label: 'ZUS emerytalna', amount: -zus.emerytalna, basis: `${(ZUS_RATES.emerytalna * 100).toFixed(2)}% od ${zus.base} PLN` },
    { label: 'ZUS rentowa', amount: -zus.rentowa, basis: `${(ZUS_RATES.rentowa * 100).toFixed(2)}%` },
    { label: 'ZUS chorobowa', amount: -zus.chorobowa, basis: `${(ZUS_RATES.chorobowa * 100).toFixed(2)}%` },
    { label: 'ZUS wypadkowa', amount: -zus.wypadkowa, basis: `${(ZUS_RATES.wypadkowa * 100).toFixed(2)}%` },
    { label: 'Fundusz Pracy', amount: -fp, basis: `${(ZUS_RATES.fp * 100).toFixed(2)}%` },
    { label: 'Składka zdrowotna', amount: -healthContribution, basis: '9% od podstawy po ZUS' },
    { label: 'Zaliczka PIT (skala)', amount: -incomeTax, basis: '12% / 32% po kwocie wolnej' },
  );
  if (ppkContribution > 0) {
    breakdown.push({ label: 'PPK pracodawca', amount: -ppkContribution, basis: '1.5%' });
  }
  breakdown.push({ label: 'Dochód netto (na rękę)', amount: netIncome });

  return {
    grossIncome,
    taxBase,
    incomeTax,
    healthContribution,
    socialContributions: zus.total,
    laborFundContribution: fp,
    ppkContribution,
    totalBurden,
    netIncome,
    effectiveTaxRate,
    notes,
    breakdown,
  };
}

function calcLinear(input: TaxInput): TaxResult {
  const notes: string[] = [];
  const breakdown: TaxResult['breakdown'] = [];

  const zus = calcZusSocial(input.zusBase);
  const fp = calcLaborFund(input.zusBase);

  const grossIncome = round2(input.monthlyRevenue - input.monthlyCosts);
  const taxBase = Math.max(0, round2(grossIncome - zus.total));

  const healthContribution = calcHealthLinear(taxBase);
  const taxBaseAfterHealth = Math.max(0, round2(taxBase - healthContribution));
  const incomeTax = Math.max(0, round2(taxBaseAfterHealth * PIT_LINEAR_RATE));

  const ppkContribution = input.hasPpk ? round2(input.monthlyRevenue * 0.015) : 0;
  const totalBurden = round2(incomeTax + healthContribution + zus.total + fp + ppkContribution);
  const netIncome = round2(input.monthlyRevenue - input.monthlyCosts - totalBurden);
  const effectiveTaxRate = input.monthlyRevenue > 0
    ? round2((totalBurden / input.monthlyRevenue) * 100)
    : 0;

  notes.push('Podatek liniowy: brak kwoty wolnej i ulgi na dzieci. Opłaca się przy dochodach powyżej ~120k PLN/rok.');
  if (input.hasChildren && input.hasChildren > 0) {
    notes.push('Uwaga: ulga na dzieci nie przysługuje przy podatku liniowym.');
  }
  if (input.zusBase === 'preferential') {
    notes.push('Preferencyjny ZUS: dostępny przez pierwsze 24 miesiące działalności.');
  }

  breakdown.push(
    { label: 'Przychód', amount: input.monthlyRevenue },
    { label: 'Koszty', amount: -input.monthlyCosts },
    { label: 'Dochód brutto', amount: grossIncome },
    { label: 'ZUS społeczne (łącznie)', amount: -zus.total, basis: `podstawa ${zus.base} PLN` },
    { label: 'Fundusz Pracy', amount: -fp },
    { label: 'Składka zdrowotna', amount: -healthContribution, basis: '4.9% od dochodu' },
    { label: 'Zaliczka PIT (liniowy)', amount: -incomeTax, basis: '19% od podstawy' },
  );
  if (ppkContribution > 0) {
    breakdown.push({ label: 'PPK pracodawca', amount: -ppkContribution, basis: '1.5%' });
  }
  breakdown.push({ label: 'Dochód netto (na rękę)', amount: netIncome });

  return {
    grossIncome,
    taxBase,
    incomeTax,
    healthContribution,
    socialContributions: zus.total,
    laborFundContribution: fp,
    ppkContribution,
    totalBurden,
    netIncome,
    effectiveTaxRate,
    notes,
    breakdown,
  };
}

function calcLump(input: TaxInput, rate: number): TaxResult {
  const notes: string[] = [];
  const breakdown: TaxResult['breakdown'] = [];

  const zus = calcZusSocial(input.zusBase);
  const fp = calcLaborFund(input.zusBase);

  // Ryczałt: podatek od PRZYCHODU, bez odliczenia kosztów
  const grossIncome = round2(input.monthlyRevenue - input.monthlyCosts);
  const taxBase = input.monthlyRevenue; // podstawa = przychód
  const healthContribution = calcHealthLump(input.monthlyRevenue);

  // Ryczałt można pomniejszyć o 50% składek ZUS społecznych
  const zusDeductionFromRevenue = round2(zus.total * 0.5);
  const taxableRevenue = Math.max(0, round2(taxBase - zusDeductionFromRevenue));
  const incomeTax = round2(taxableRevenue * rate);

  const ppkContribution = input.hasPpk ? round2(input.monthlyRevenue * 0.015) : 0;
  const totalBurden = round2(incomeTax + healthContribution + zus.total + fp + ppkContribution);
  const netIncome = round2(input.monthlyRevenue - input.monthlyCosts - totalBurden);
  const effectiveTaxRate = input.monthlyRevenue > 0
    ? round2((totalBurden / input.monthlyRevenue) * 100)
    : 0;

  const ratePercent = (rate * 100).toFixed(1);
  notes.push(`Ryczałt ${ratePercent}%: podatek od przychodu — koszty NIE obniżają podatku.`);
  notes.push('Możliwe odliczenie 50% składek ZUS od przychodu ryczałtu.');

  if (rate === 0.12 && input.pkwiuCode) {
    notes.push(`Stawka 12% dla usług IT (PKWiU ${input.pkwiuCode}). Dotyczy 62.x i doradztwa.`);
  }
  if (rate === 0.085) {
    notes.push('Stawka 8.5% dla wolnych zawodów, consultingu (nie-IT) i wielu usług.');
  }
  if (input.hasChildren && input.hasChildren > 0) {
    notes.push('Uwaga: ulga na dzieci nie przysługuje przy ryczałcie.');
  }

  breakdown.push(
    { label: 'Przychód (podstawa ryczałtu)', amount: input.monthlyRevenue },
    { label: 'Koszty (NIE odliczane od podatku)', amount: -input.monthlyCosts },
    { label: 'ZUS społeczne (łącznie)', amount: -zus.total, basis: `podstawa ${zus.base} PLN` },
    { label: 'Odliczenie ZUS od przychodu (50%)', amount: -zusDeductionFromRevenue },
    { label: 'Fundusz Pracy', amount: -fp },
    { label: `Składka zdrowotna (ryczałtowa)`, amount: -healthContribution, basis: 'kwotowa wg progu przychodu' },
    { label: `Ryczałt ${ratePercent}%`, amount: -incomeTax, basis: `${ratePercent}% od ${taxableRevenue.toLocaleString('pl-PL')} PLN` },
  );
  if (ppkContribution > 0) {
    breakdown.push({ label: 'PPK pracodawca', amount: -ppkContribution, basis: '1.5%' });
  }
  breakdown.push({ label: 'Dochód netto (na rękę)', amount: netIncome });

  return {
    grossIncome,
    taxBase,
    incomeTax,
    healthContribution,
    socialContributions: zus.total,
    laborFundContribution: fp,
    ppkContribution,
    totalBurden,
    netIncome,
    effectiveTaxRate,
    notes,
    breakdown,
  };
}

function calcCard(_input: TaxInput): TaxResult {
  // Karta podatkowa – uproszczona (stawka ustalana przez US, typowo kilkaset PLN)
  const notes = [
    'Karta podatkowa: stawka ustalana indywidualnie przez Urząd Skarbowy.',
    'Nie uwzględniono w kalkulatorze — wartości są przybliżone.',
  ];
  const zus = calcZusSocial(_input.zusBase);
  const fp = calcLaborFund(_input.zusBase);
  const healthContribution = HEALTH_2026.min_health;
  const incomeTax = 500; // uproszczone
  const totalBurden = round2(incomeTax + healthContribution + zus.total + fp);
  const netIncome = round2(_input.monthlyRevenue - _input.monthlyCosts - totalBurden);
  return {
    grossIncome: round2(_input.monthlyRevenue - _input.monthlyCosts),
    taxBase: _input.monthlyRevenue,
    incomeTax,
    healthContribution,
    socialContributions: zus.total,
    laborFundContribution: fp,
    ppkContribution: 0,
    totalBurden,
    netIncome,
    effectiveTaxRate: _input.monthlyRevenue > 0
      ? round2((totalBurden / _input.monthlyRevenue) * 100)
      : 0,
    notes,
    breakdown: [
      { label: 'Karta podatkowa – stawka ryczałtowa (szacunek)', amount: -incomeTax },
      { label: 'Składka zdrowotna', amount: -healthContribution },
      { label: 'ZUS społeczne', amount: -zus.total },
      { label: 'Fundusz Pracy', amount: -fp },
      { label: 'Dochód netto (szacunek)', amount: netIncome },
    ],
  };
}

// ─── Eksportowane funkcje ─────────────────────────────────────────────────────

export function calculateTax(input: TaxInput): TaxResult {
  switch (input.taxForm) {
    case 'scale':    return calcScale(input);
    case 'linear':   return calcLinear(input);
    case 'lump_8_5': return calcLump(input, 0.085);
    case 'lump_12':  return calcLump(input, 0.12);
    case 'lump_15':  return calcLump(input, 0.15);
    case 'card':     return calcCard(input);
    default:         return calcScale(input);
  }
}

export interface OptimalFormResult {
  form: TaxInput['taxForm'];
  label: string;
  result: TaxResult;
  savings: number; // vs worst option
}

export function calculateOptimalForm(
  revenue: number,
  costs: number,
  options?: Partial<Pick<TaxInput, 'zusBase' | 'hasChildren' | 'hasPpk' | 'pkwiuCode'>>
): OptimalFormResult[] {
  const forms: Array<{ form: TaxInput['taxForm']; label: string }> = [
    { form: 'scale',    label: 'Skala podatkowa 12/32%' },
    { form: 'linear',   label: 'Podatek liniowy 19%' },
    { form: 'lump_8_5', label: 'Ryczałt 8.5%' },
    { form: 'lump_12',  label: 'Ryczałt 12%' },
    { form: 'lump_15',  label: 'Ryczałt 15%' },
  ];

  const baseInput: TaxInput = {
    monthlyRevenue: revenue,
    monthlyCosts: costs,
    taxForm: 'scale',
    zusBase: options?.zusBase ?? 'standard',
    hasChildren: options?.hasChildren ?? 0,
    hasPpk: options?.hasPpk ?? false,
    pkwiuCode: options?.pkwiuCode,
  };

  const results = forms.map(({ form, label }) => ({
    form,
    label,
    result: calculateTax({ ...baseInput, taxForm: form }),
  }));

  // Sortuj od najwyższego netIncome (najlepsza opcja)
  results.sort((a, b) => b.result.netIncome - a.result.netIncome);

  const worst = results[results.length - 1].result.netIncome;
  return results.map(r => ({
    ...r,
    savings: round2(r.result.netIncome - worst),
  }));
}

export function formatTaxBreakdown(result: TaxResult): string {
  const lines = result.breakdown.map(b => {
    const sign = b.amount >= 0 ? '+' : '';
    return `  ${b.label.padEnd(40)} ${sign}${b.amount.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN${b.basis ? `  [${b.basis}]` : ''}`;
  });
  lines.push('');
  lines.push(`  OBCIĄŻENIE ŁĄCZNE: ${result.totalBurden.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN`);
  lines.push(`  EFEKTYWNA STOPA:   ${result.effectiveTaxRate}%`);
  if (result.notes.length > 0) {
    lines.push('');
    lines.push('  Uwagi:');
    result.notes.forEach(n => lines.push(`    * ${n}`));
  }
  return lines.join('\n');
}
