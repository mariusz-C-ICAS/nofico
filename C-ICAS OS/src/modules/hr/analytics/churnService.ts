import { GoogleGenAI } from '@google/genai';

export interface ChurnFactor {
  label: string;
  score: number;   // 0-100 contribution
  weight: number;  // factor weight in total
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ChurnResult {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  department: string;
  role: string;
  contractType: string;
  salary: number;
  tenureMonths: number;
  riskScore: number;       // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: ChurnFactor[];
  leaveCount30d: number;
  skillCount: number;
}

export type RiskLevel = ChurnResult['riskLevel'];

const RISK_COLORS: Record<RiskLevel, { bg: string; text: string; border: string; label: string }> = {
  low:      { bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-200', label: 'Niskie' },
  medium:   { bg: 'bg-amber-50',    text: 'text-amber-700',   border: 'border-amber-200',   label: 'Średnie' },
  high:     { bg: 'bg-orange-50',   text: 'text-orange-700',  border: 'border-orange-200',  label: 'Wysokie' },
  critical: { bg: 'bg-rose-50',     text: 'text-rose-700',    border: 'border-rose-200',    label: 'Krytyczne' },
};

export function getRiskColors(level: RiskLevel) { return RISK_COLORS[level]; }

export function calcChurnRisk(emp: any, leaveRecords: any[]): ChurnResult {
  const factors: ChurnFactor[] = [];

  // 1. Tenure (waga 25%)
  const now = Date.now();
  const hireDate = emp.createdAt?.toDate?.() || new Date(emp.createdAt?.seconds ? emp.createdAt.seconds * 1000 : now);
  const tenureMs = now - hireDate.getTime();
  const tenureMonths = Math.max(0, Math.floor(tenureMs / (1000 * 60 * 60 * 24 * 30)));
  let tenureScore = 0;
  let tenureDesc = '';
  if (tenureMonths < 3) { tenureScore = 90; tenureDesc = 'Nowy pracownik (<3 mies.) — najwyższe ryzyko odejścia'; }
  else if (tenureMonths < 6) { tenureScore = 75; tenureDesc = 'Pierwsze pół roku — period próbny/adaptacja'; }
  else if (tenureMonths < 12) { tenureScore = 55; tenureDesc = 'Mniej niż rok — jeszcze nieustabilizowany'; }
  else if (tenureMonths < 24) { tenureScore = 35; tenureDesc = 'Rok-dwa — stabilizacja, umiarkowane ryzyko'; }
  else if (tenureMonths < 60) { tenureScore = 20; tenureDesc = 'Ponad 2 lata — lojalna kadra'; }
  else { tenureScore = 10; tenureDesc = 'Ponad 5 lat — bardzo lojalna kadra'; }
  factors.push({ label: 'Staż pracy', score: tenureScore, weight: 0.25, description: tenureDesc, severity: tenureScore > 60 ? 'high' : tenureScore > 35 ? 'medium' : 'low' });

  // 2. Typ umowy (waga 20%)
  const contractMap: Record<string, number> = {
    'B2B': 80, 'Zlecenie': 65, 'Dzieło': 70, 'Stażysta': 75,
    'Umowa o pracę': 25, 'UoP': 25,
  };
  const contractScore = contractMap[emp.contractType] ?? 40;
  const contractDesc = emp.contractType === 'B2B'
    ? 'B2B — wysoka mobilność rynkowa, brak wiązania umową'
    : emp.contractType === 'Umowa o pracę'
    ? 'Umowa o pracę — stabilne zatrudnienie, niższa mobilność'
    : `${emp.contractType} — ograniczona lojalność`;
  factors.push({ label: 'Typ umowy', score: contractScore, weight: 0.20, description: contractDesc, severity: contractScore > 60 ? 'high' : contractScore > 40 ? 'medium' : 'low' });

  // 3. Absencje w ostatnich 30 dniach (waga 20%)
  const cutoff30d = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const leaveCount30d = leaveRecords.filter(l => {
    if (l.employeeId !== emp.id) return false;
    const d = l.createdAt?.toDate?.() || new Date(l.startDate || 0);
    return d >= cutoff30d;
  }).length;
  const absenceScore = Math.min(100, leaveCount30d * 20);
  const absenceDesc = leaveCount30d === 0 ? 'Brak nieobecności w ostatnich 30 dniach' : `${leaveCount30d} wniosek(i) urlopowe w ostatnich 30 dniach`;
  factors.push({ label: 'Absencje (30 dni)', score: absenceScore, weight: 0.20, description: absenceDesc, severity: absenceScore > 40 ? 'high' : absenceScore > 0 ? 'medium' : 'low' });

  // 4. Poziom wynagrodzenia (waga 20%) — niskie wynagrodzenie = wyższe ryzyko
  const salary = emp.baseSalary || emp.hourlyRate * 160 || 0;
  let salaryScore = 50; // default mid-risk
  if (salary === 0) { salaryScore = 70; }
  else if (salary < 4000) { salaryScore = 80; }
  else if (salary < 6000) { salaryScore = 60; }
  else if (salary < 10000) { salaryScore = 35; }
  else if (salary < 20000) { salaryScore = 20; }
  else { salaryScore = 10; }
  const salaryDesc = salary === 0 ? 'Brak danych o wynagrodzeniu' : salary < 4000 ? 'Wynagrodzenie poniżej mediany rynkowej' : salary > 10000 ? 'Wynagrodzenie powyżej mediany rynkowej' : 'Wynagrodzenie w okolicach mediany rynkowej';
  factors.push({ label: 'Wynagrodzenie vs rynek', score: salaryScore, weight: 0.20, description: salaryDesc, severity: salaryScore > 55 ? 'high' : salaryScore > 35 ? 'medium' : 'low' });

  // 5. Kompetencje (waga 15%) — wysoko wykwalifikowani z niskim wynagrodzeniem = wysokie ryzyko
  const skillCount = (emp.skills || []).length;
  const avgSkillLevel = skillCount > 0 ? (emp.skills as any[]).reduce((s: number, sk: any) => s + (sk.level || 1), 0) / skillCount : 0;
  let skillScore = 25; // default
  if (skillCount > 8 && avgSkillLevel > 3) { skillScore = 65; }
  else if (skillCount > 5 && avgSkillLevel > 2) { skillScore = 45; }
  else if (skillCount < 2) { skillScore = 30; }
  const skillDesc = skillCount === 0 ? 'Brak zdefiniowanych kompetencji w profilu' : `${skillCount} kompetencji, śr. poziom ${avgSkillLevel.toFixed(1)}/5 — ${skillScore > 55 ? 'wysoki profil rynkowy' : 'standardowy profil'}`;
  factors.push({ label: 'Profil kompetencyjny', score: skillScore, weight: 0.15, description: skillDesc, severity: skillScore > 50 ? 'high' : skillScore > 35 ? 'medium' : 'low' });

  const riskScore = Math.round(factors.reduce((s, f) => s + f.score * f.weight, 0));
  const riskLevel: RiskLevel =
    riskScore >= 70 ? 'critical' :
    riskScore >= 50 ? 'high' :
    riskScore >= 30 ? 'medium' : 'low';

  return {
    employeeId: emp.id,
    employeeName: emp.name || emp.email || '',
    employeeEmail: emp.email || '',
    department: emp.department || emp.departmentName || '—',
    role: emp.role || emp.roleName || '—',
    contractType: emp.contractType || '—',
    salary,
    tenureMonths,
    riskScore,
    riskLevel,
    factors,
    leaveCount30d,
    skillCount,
  };
}

export async function getAiRetentionAdvice(result: ChurnResult): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: (import.meta as any).env?.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '' });
  const highFactors = result.factors.filter(f => f.severity === 'high').map(f => `- ${f.label}: ${f.description}`).join('\n');
  const prompt = `Jesteś ekspertem HR. Pracownik "${result.employeeName}" ma ryzyko odejścia ${result.riskScore}% (${result.riskLevel}).
Kluczowe czynniki ryzyka:
${highFactors || 'Brak krytycznych czynników.'}
Staż: ${result.tenureMonths} miesięcy. Umowa: ${result.contractType}. Wynagrodzenie: ${result.salary > 0 ? result.salary.toLocaleString('pl-PL') + ' PLN' : 'nieznane'}.

Podaj 3-5 konkretnych działań retencyjnych do podjęcia w ciągu 30 dni. Odpowiedź w języku polskim, w formacie punktowym (bez markdown nagłówków).`;
  const resp = await ai.models.generateContent({ model: 'gemini-2.0-flash', contents: prompt });
  return resp.text || 'Brak odpowiedzi AI.';
}
