import type { LeadScoreBreakdown } from '../types';

export function computeLeadScore(params: {
  lastActivityMs: number | null;
  totalRevenue: number;
  hasActiveDeal: boolean;
  dealStage?: string;
  serviceEventCount: number;
  activityCount30Days: number;
}): LeadScoreBreakdown {
  const now = Date.now();

  // Recency (0-25)
  let recency = 0;
  if (params.lastActivityMs) {
    const daysSince = (now - params.lastActivityMs) / 86_400_000;
    if (daysSince < 7)   recency = 25;
    else if (daysSince < 30)  recency = 18;
    else if (daysSince < 90)  recency = 8;
    else if (daysSince < 180) recency = 3;
  }

  // Revenue (0-30)
  let revenue = 0;
  if (params.totalRevenue >= 100_000) revenue = 30;
  else if (params.totalRevenue >= 50_000) revenue = 22;
  else if (params.totalRevenue >= 10_000) revenue = 15;
  else if (params.totalRevenue >= 1_000)  revenue = 7;

  // Pipeline (0-25)
  let pipeline = 0;
  if (params.hasActiveDeal) {
    if (params.dealStage === 'negotiation') pipeline = 25;
    else if (params.dealStage === 'quote')   pipeline = 20;
    else if (params.dealStage === 'meeting') pipeline = 15;
    else                                     pipeline = 10;
  }

  // Service frequency (0-15)
  let serviceFrequency = 0;
  if (params.serviceEventCount >= 10) serviceFrequency = 15;
  else if (params.serviceEventCount >= 5)  serviceFrequency = 12;
  else if (params.serviceEventCount >= 3)  serviceFrequency = 8;
  else if (params.serviceEventCount >= 1)  serviceFrequency = 4;

  // Engagement last 30 days (0-5)
  const engagement = Math.min(5, params.activityCount30Days * 2);

  const total = Math.min(100, recency + revenue + pipeline + serviceFrequency + engagement);

  return { total, recency, revenue, pipeline, serviceFrequency, engagement };
}

export function scoreLabel(score: number): { label: string; color: string; bg: string } {
  if (score >= 75) return { label: 'Gorący',   color: 'text-red-700',    bg: 'bg-red-100' };
  if (score >= 50) return { label: 'Ciepły',   color: 'text-amber-700',  bg: 'bg-amber-100' };
  if (score >= 25) return { label: 'Chłodny',  color: 'text-blue-700',   bg: 'bg-blue-100' };
  return                  { label: 'Zimny',    color: 'text-slate-600',  bg: 'bg-slate-100' };
}

// ── Deal health score (AI feature #10) ────────────────────────────────────────

export function computeDealHealth(params: {
  probability: number;
  daysSinceLastActivity: number;
  activityCount: number;
  value: number;
}): number {
  let score = params.probability; // base: 0-100

  // Staleness penalty: -4 per 7 days idle
  const stalePeriods = Math.floor(params.daysSinceLastActivity / 7);
  score -= stalePeriods * 4;

  // Engagement bonus: +3 per recent activity (up to +15)
  score += Math.min(15, params.activityCount * 3);

  // High-value bonus: up to +5
  if (params.value > 50_000) score += 5;
  else if (params.value > 10_000) score += 3;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function healthLabel(health: number): { label: string; color: string; dot: string } {
  if (health >= 70) return { label: 'Zdrowy',    color: 'text-emerald-700', dot: 'bg-emerald-500' };
  if (health >= 40) return { label: 'Uwaga',     color: 'text-amber-700',   dot: 'bg-amber-500' };
  return                   { label: 'Zagrożony', color: 'text-red-700',     dot: 'bg-red-500' };
}

// ── Upsell detection (#11) ────────────────────────────────────────────────────

export function detectUpsellOpportunity(params: {
  customerId: string;
  customerName: string;
  serviceEventCount: number;
  hasActiveContract: boolean;
  totalRevenue: number;
  lastServiceDate: any;
  tags: string[];
}): { shouldFlag: boolean; reason: string; suggestedAction: string; estimatedValue: number } {
  if (params.serviceEventCount >= 3 && !params.hasActiveContract) {
    return {
      shouldFlag: true,
      reason: `${params.serviceEventCount} wizyt serwisowych bez kontraktu abonamentowego`,
      suggestedAction: 'Zaproponuj kontrakt abonamentowy',
      estimatedValue: Math.round(params.totalRevenue * 0.8),
    };
  }
  if (params.serviceEventCount >= 6) {
    return {
      shouldFlag: true,
      reason: `${params.serviceEventCount} wizyt — klient lojalny, możliwy upgrade`,
      suggestedAction: 'Zaproponuj rozszerzoną umowę serwisową',
      estimatedValue: Math.round(params.totalRevenue * 1.2),
    };
  }
  return { shouldFlag: false, reason: '', suggestedAction: '', estimatedValue: 0 };
}
