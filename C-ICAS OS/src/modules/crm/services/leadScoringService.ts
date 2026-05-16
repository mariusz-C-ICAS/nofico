interface LeadScoreInput {
  lastActivityMs: number;
  totalRevenue: number;
  hasActiveDeal: boolean;
  serviceEventCount: number;
  activityCount30Days: number;
}

export function computeLeadScore(input: LeadScoreInput): { total: number } {
  let total = 0;
  const now = Date.now();
  const daysSinceActivity = input.lastActivityMs > 0 ? (now - input.lastActivityMs) / 86400000 : 999;

  if (daysSinceActivity < 7) total += 30;
  else if (daysSinceActivity < 30) total += 15;
  else if (daysSinceActivity < 90) total += 5;

  if (input.totalRevenue > 50000) total += 30;
  else if (input.totalRevenue > 10000) total += 20;
  else if (input.totalRevenue > 1000) total += 10;

  if (input.hasActiveDeal) total += 20;
  total += Math.min(input.serviceEventCount * 2, 10);
  total += Math.min(input.activityCount30Days * 3, 10);

  return { total: Math.min(total, 100) };
}

export function scoreLabel(score: number): { bg: string; color: string; label: string } {
  if (score >= 70) return { bg: 'bg-emerald-100', color: 'text-emerald-700', label: 'Hot' };
  if (score >= 40) return { bg: 'bg-amber-100', color: 'text-amber-700', label: 'Warm' };
  return { bg: 'bg-slate-100', color: 'text-slate-500', label: 'Cold' };
}
