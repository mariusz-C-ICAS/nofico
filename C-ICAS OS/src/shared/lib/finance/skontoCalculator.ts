export interface SkontoConfig {
  percent: number;
  deadlineDays: number;
}

export interface SkontoResult {
  originalGross: number;
  discountAmount: number;
  discountedGross: number;
  discountDeadline: Date;
  vatOnOriginal: number;
  vatOnDiscounted: number;
  netSaving: number;
}

export function calculateSkonto(
  grossAmount: number,
  vatRate: number,
  config: SkontoConfig,
  invoiceDate: Date = new Date()
): SkontoResult {
  const round2 = (n: number) => Math.round(n * 100) / 100;

  const netOriginal = grossAmount / (1 + vatRate);
  const vatOnOriginal = round2(grossAmount - netOriginal);

  const discountAmount = round2(grossAmount * (config.percent / 100));
  const discountedGross = round2(grossAmount - discountAmount);
  const netDiscounted = discountedGross / (1 + vatRate);
  const vatOnDiscounted = round2(discountedGross - netDiscounted);

  const deadline = new Date(invoiceDate);
  deadline.setDate(deadline.getDate() + config.deadlineDays);

  return {
    originalGross: round2(grossAmount),
    discountAmount,
    discountedGross,
    discountDeadline: deadline,
    vatOnOriginal,
    vatOnDiscounted,
    netSaving: round2(vatOnOriginal - vatOnDiscounted),
  };
}

export function isSkontoEligible(
  invoiceDate: Date,
  paymentDate: Date,
  config: SkontoConfig
): boolean {
  const deadline = new Date(invoiceDate);
  deadline.setDate(deadline.getDate() + config.deadlineDays);
  return paymentDate <= deadline;
}

export function formatSkontoClause(config: SkontoConfig): string {
  return `Skonto ${config.percent}% przy zapłacie w ciągu ${config.deadlineDays} dni od daty wystawienia faktury`;
}

export function parseSkontoFromText(text: string): SkontoConfig | null {
  // e.g. "2% skonto 14 dni" or "skonto 2% 14 dni"
  const match = text.match(/(\d+(?:\.\d+)?)\s*%.*?(\d+)\s*dni/i);
  if (!match) return null;
  return { percent: parseFloat(match[1]), deadlineDays: parseInt(match[2], 10) };
}
