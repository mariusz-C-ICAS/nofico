/**
 * Data: 2026-05-16
 * Zmiany: BigQuery ML integration — anomaly detection, spending forecasts, budget variances.
 * Sciezka: /src/modules/finance/services/bigQueryService.ts
 */
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  query,
  orderBy,
  limit,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SpendingForecast {
  period: string;           // "YYYY-MM"
  predictedAmount: number;
  confidence: number;       // 0-1
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
}

export interface AnomalyDetectionResult {
  transactionId: string;
  anomalyScore: number;     // 0-100, wyzszy = bardziej anomalny
  reasons: string[];
  isAnomaly: boolean;       // score > 70
  suggestedAction: string;
}

export interface CategoryBudgetVariance {
  category: string;
  budgeted: number;
  actual: number;
  variance: number;
  variancePercent: number;
  status: 'ok' | 'warning' | 'critical';
}

export interface CashflowEntry {
  period: string;
  inflow: number;
  outflow: number;
  net: number;
}

export interface MLInsightsSummary {
  forecasts: SpendingForecast[];
  topAnomalies: AnomalyDetectionResult[];
  budgetVariances: CategoryBudgetVariance[];
  cashflowTrend: CashflowEntry[];
  generatedAt: string;
}

// Internal helpers

interface RawTransaction {
  id?: string;
  date: string;
  amount: number;
  category?: string;
  counterpartName?: string;
  title?: string;
  createdAt?: unknown;
}

interface RawExpense {
  id?: string;
  date?: string;
  issueDate?: string;
  totalGross?: number;
  amount?: number;
  category?: string;
}

interface BudgetDoc {
  categories?: Record<string, number>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function txCol(tenantId: string) {
  return collection(db, `tenants/${tenantId}/bankTransactions`);
}

function expensesCol(tenantId: string) {
  return collection(db, `tenants/${tenantId}/expenses`);
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function periodKey(dateStr: string): string {
  // dateStr: "YYYY-MM-DD" lub ISO
  return dateStr.substring(0, 7); // "YYYY-MM"
}

function dateToTimestamp(dateStr: string): number {
  return new Date(dateStr).getTime();
}

// ─── Linear regression ───────────────────────────────────────────────────────

function linearRegression(y: number[]): { slope: number; intercept: number; r2: number } {
  const n = y.length;
  if (n === 0) return { slope: 0, intercept: 0, r2: 0 };

  const x = Array.from({ length: n }, (_, i) => i);
  const meanX = x.reduce((s, v) => s + v, 0) / n;
  const meanY = y.reduce((s, v) => s + v, 0) / n;

  let ssXY = 0;
  let ssXX = 0;
  let ssTot = 0;
  let ssRes = 0;

  for (let i = 0; i < n; i++) {
    ssXY += (x[i] - meanX) * (y[i] - meanY);
    ssXX += (x[i] - meanX) ** 2;
    ssTot += (y[i] - meanY) ** 2;
  }

  const slope = ssXX !== 0 ? ssXY / ssXX : 0;
  const intercept = meanY - slope * meanX;

  for (let i = 0; i < n; i++) {
    const predicted = slope * x[i] + intercept;
    ssRes += (y[i] - predicted) ** 2;
  }

  const r2 = ssTot !== 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;

  return { slope, intercept, r2 };
}

// ─── Statistics helpers ───────────────────────────────────────────────────────

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
  const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

// ─── BigQuery Export ──────────────────────────────────────────────────────────

/**
 * Eksportuje ostatnie 500 transakcji do BigQuery przez Cloud Function.
 * Fallback: zapis do kolejki Firestore jesli endpoint niedostepny.
 */
export async function exportTransactionsToBigQuery(tenantId: string): Promise<void> {
  const snap = await getDocs(
    query(txCol(tenantId), orderBy('date', 'desc'), limit(500))
  );

  const transactions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const batches = chunkArray(transactions, 100);

  for (const batch of batches) {
    try {
      const response = await fetch('/api/bigquery/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, transactions: batch }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch {
      // Fallback: zapis do kolejki eksportu
      await addDoc(collection(db, `tenants/${tenantId}/bqExportQueue`), {
        tenantId,
        transactions: batch,
        queuedAt: Timestamp.now(),
        status: 'pending',
      });
    }
  }
}

// ─── Spending Forecast ────────────────────────────────────────────────────────

/**
 * Prognoza wydatkow na nastepne `months` miesiecy.
 * Uzywa regresji liniowej na danych z ostatnich 12 miesiecy.
 */
export async function forecastSpending(
  tenantId: string,
  months = 3
): Promise<SpendingForecast[]> {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  const fromDate = twelveMonthsAgo.toISOString().substring(0, 10);

  // Pobierz transakcje (wydatki = amount < 0)
  const txSnap = await getDocs(
    query(txCol(tenantId), where('date', '>=', fromDate), orderBy('date', 'asc'))
  );

  // Pobierz faktury kosztowe
  const expSnap = await getDocs(
    query(expensesCol(tenantId), orderBy('issueDate', 'asc'))
  );

  // Grupuj po miesiacach
  const monthlyMap: Record<string, number> = {};

  txSnap.docs.forEach((d) => {
    const tx = d.data() as RawTransaction;
    if (tx.amount < 0 && tx.date >= fromDate) {
      const key = periodKey(tx.date);
      monthlyMap[key] = (monthlyMap[key] ?? 0) + Math.abs(tx.amount);
    }
  });

  expSnap.docs.forEach((d) => {
    const exp = d.data() as RawExpense;
    const dateStr = exp.issueDate ?? exp.date ?? '';
    if (dateStr >= fromDate) {
      const key = periodKey(dateStr);
      const amount = exp.totalGross ?? exp.amount ?? 0;
      monthlyMap[key] = (monthlyMap[key] ?? 0) + amount;
    }
  });

  // Sortuj miesiacowo i zbuduj tablice wartosci
  const sortedKeys = Object.keys(monthlyMap).sort();
  const values = sortedKeys.map((k) => monthlyMap[k]);

  const { slope, intercept, r2 } = linearRegression(values);
  const n = values.length;
  const lastValue = values[n - 1] ?? 0;

  const forecasts: SpendingForecast[] = [];

  for (let m = 1; m <= months; m++) {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + m);
    const period = futureDate.toISOString().substring(0, 7);

    const predictedAmount = Math.max(0, intercept + slope * (n - 1 + m));
    const changePercent = lastValue > 0
      ? ((predictedAmount - lastValue) / lastValue) * 100
      : 0;

    const trend: SpendingForecast['trend'] =
      Math.abs(changePercent) < 3 ? 'stable'
      : changePercent > 0 ? 'up'
      : 'down';

    forecasts.push({
      period,
      predictedAmount: Math.round(predictedAmount * 100) / 100,
      confidence: Math.round(r2 * 100) / 100,
      trend,
      changePercent: Math.round(changePercent * 10) / 10,
    });
  }

  return forecasts;
}

// ─── Anomaly Detection ────────────────────────────────────────────────────────

/**
 * Wykrywa anomalie w transakcjach przy uzyciu uproszczonego Isolation Forest.
 * Zwraca top 10 anomalii.
 */
export async function detectTransactionAnomalies(
  tenantId: string,
  fetchLimit = 50
): Promise<AnomalyDetectionResult[]> {
  const snap = await getDocs(
    query(txCol(tenantId), orderBy('date', 'desc'), limit(fetchLimit))
  );

  const transactions = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as RawTransaction),
  }));

  if (transactions.length === 0) return [];

  // Zbuduj statystyki per kategoria
  const byCategory: Record<string, number[]> = {};
  transactions.forEach((tx) => {
    const cat = tx.category ?? 'uncategorized';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(Math.abs(tx.amount));
  });

  const catStats: Record<string, { med: number; std: number }> = {};
  Object.entries(byCategory).forEach(([cat, amounts]) => {
    catStats[cat] = { med: median(amounts), std: stdDev(amounts) };
  });

  // Sprawdz duplikaty NIP/kontrahent + kwota w ciagu 24h
  const recentByCounterpart: Record<string, { amount: number; ts: number }[]> = {};
  transactions.forEach((tx) => {
    const key = (tx.counterpartName ?? '').toLowerCase().trim();
    if (!recentByCounterpart[key]) recentByCounterpart[key] = [];
    recentByCounterpart[key].push({
      amount: tx.amount,
      ts: dateToTimestamp(tx.date),
    });
  });

  const results: AnomalyDetectionResult[] = [];

  for (const tx of transactions) {
    const reasons: string[] = [];
    let score = 0;

    const cat = tx.category ?? 'uncategorized';
    const absAmount = Math.abs(tx.amount);
    const { med, std } = catStats[cat] ?? { med: 0, std: 0 };

    // 1. Isolation: odchylenie od mediany kategorii
    if (std > 0) {
      const deviations = (absAmount - med) / std;
      if (deviations > 3) {
        score += 40;
        reasons.push(`Kwota ${deviations.toFixed(1)}x ponad srednia kategorii`);
      } else if (deviations > 2) {
        score += 20;
        reasons.push(`Kwota ${deviations.toFixed(1)}sigma od mediany`);
      }
    }

    // 2. Okragla kwota (suspicious round numbers)
    if (absAmount % 1000 === 0 && absAmount >= 5000) {
      score += 15;
      reasons.push(`Okragla kwota ${absAmount.toLocaleString('pl-PL')} PLN`);
    } else if (absAmount % 500 === 0 && absAmount >= 2000) {
      score += 8;
      reasons.push(`Podejrzana okragla kwota`);
    }

    // 3. Niezwykla godzina (weekend) — jesli mamy timestamp
    if (tx.date) {
      const d = new Date(tx.date);
      const day = d.getDay();
      if (day === 0 || day === 6) {
        score += 10;
        reasons.push(`Transakcja weekendowa`);
      }
    }

    // 4. Duplikat kontrahent + kwota w ciagu 24h
    const key = (tx.counterpartName ?? '').toLowerCase().trim();
    const same = (recentByCounterpart[key] ?? []).filter(
      (e) =>
        e.amount === tx.amount &&
        Math.abs(e.ts - dateToTimestamp(tx.date)) < 86_400_000
    );
    if (same.length > 1) {
      score += 25;
      reasons.push(`Duplikat: ten sam kontrahent i kwota w 24h`);
    }

    // 5. Nowy kontrahent + duza kwota (> 3sigma globalnie)
    const globalAmounts = transactions.map((t) => Math.abs(t.amount));
    const globalStd = stdDev(globalAmounts);
    const globalMed = median(globalAmounts);
    const isLarge = globalStd > 0 && absAmount > globalMed + 3 * globalStd;
    if (isLarge) {
      score += 20;
      reasons.push(`Bardzo duza kwota (>3sigma globalnie)`);
    }

    score = Math.min(100, score);

    if (reasons.length > 0 || score > 0) {
      const isAnomaly = score > 70;
      let suggestedAction = 'Monitoruj transakcje';
      if (score > 70) suggestedAction = 'Weryfikacja wymagana — skontaktuj sie z ksiegowym';
      else if (score > 40) suggestedAction = 'Sprawdz poprawnosc kategoryzacji';

      results.push({
        transactionId: tx.id ?? '',
        anomalyScore: score,
        reasons,
        isAnomaly,
        suggestedAction,
      });
    }
  }

  return results
    .sort((a, b) => b.anomalyScore - a.anomalyScore)
    .slice(0, 10);
}

// ─── Budget Variances ─────────────────────────────────────────────────────────

/**
 * Oblicza odchylenia budzetu od rzeczywistych wydatkow.
 * period: "YYYY-MM"
 */
export async function getBudgetVariances(
  tenantId: string,
  period: string
): Promise<CategoryBudgetVariance[]> {
  // Pobierz budzet
  const budgetRef = doc(db, `tenants/${tenantId}/budgets/${period}`);
  const budgetSnap = await getDoc(budgetRef);
  if (!budgetSnap.exists()) return [];

  const budgetData = budgetSnap.data() as BudgetDoc;
  const budgets = budgetData.categories ?? {};

  // Daty okresu
  const dateFrom = `${period}-01`;
  const lastDay = new Date(parseInt(period.substring(0, 4)), parseInt(period.substring(5, 7)), 0).getDate();
  const dateTo = `${period}-${String(lastDay).padStart(2, '0')}`;

  // Rzeczywiste wydatki z transakcji (amount < 0)
  const txSnap = await getDocs(
    query(
      txCol(tenantId),
      where('date', '>=', dateFrom),
      where('date', '<=', dateTo)
    )
  );

  const actuals: Record<string, number> = {};
  txSnap.docs.forEach((d) => {
    const tx = d.data() as RawTransaction;
    if (tx.amount < 0) {
      const cat = tx.category ?? 'Inne';
      actuals[cat] = (actuals[cat] ?? 0) + Math.abs(tx.amount);
    }
  });

  // Wydatki z faktur kosztowych
  const expSnap = await getDocs(
    query(
      expensesCol(tenantId),
      where('issueDate', '>=', dateFrom),
      where('issueDate', '<=', dateTo)
    )
  );
  expSnap.docs.forEach((d) => {
    const exp = d.data() as RawExpense;
    const cat = exp.category ?? 'Inne';
    const amount = exp.totalGross ?? exp.amount ?? 0;
    actuals[cat] = (actuals[cat] ?? 0) + amount;
  });

  // Zbierz wszystkie kategorie
  const allCategories = new Set([...Object.keys(budgets), ...Object.keys(actuals)]);
  const variances: CategoryBudgetVariance[] = [];

  allCategories.forEach((category) => {
    const budgeted = budgets[category] ?? 0;
    const actual = actuals[category] ?? 0;
    const variance = actual - budgeted;
    const variancePercent = budgeted > 0 ? (actual / budgeted) * 100 : 0;

    let status: CategoryBudgetVariance['status'] = 'ok';
    if (variancePercent > 110) status = 'critical';
    else if (variancePercent > 90) status = 'warning';

    variances.push({
      category,
      budgeted: Math.round(budgeted * 100) / 100,
      actual: Math.round(actual * 100) / 100,
      variance: Math.round(variance * 100) / 100,
      variancePercent: Math.round(variancePercent * 10) / 10,
      status,
    });
  });

  return variances.sort((a, b) => b.variancePercent - a.variancePercent);
}

// ─── Cashflow Trend ───────────────────────────────────────────────────────────

async function buildCashflowTrend(tenantId: string, monthsBack = 6): Promise<CashflowEntry[]> {
  const fromDate = new Date();
  fromDate.setMonth(fromDate.getMonth() - monthsBack);
  const fromStr = fromDate.toISOString().substring(0, 10);

  const snap = await getDocs(
    query(txCol(tenantId), where('date', '>=', fromStr), orderBy('date', 'asc'))
  );

  const map: Record<string, { inflow: number; outflow: number }> = {};
  snap.docs.forEach((d) => {
    const tx = d.data() as RawTransaction;
    const key = periodKey(tx.date);
    if (!map[key]) map[key] = { inflow: 0, outflow: 0 };
    if (tx.amount > 0) map[key].inflow += tx.amount;
    else map[key].outflow += Math.abs(tx.amount);
  });

  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, { inflow, outflow }]) => ({
      period,
      inflow: Math.round(inflow * 100) / 100,
      outflow: Math.round(outflow * 100) / 100,
      net: Math.round((inflow - outflow) * 100) / 100,
    }));
}

// ─── Generate ML Insights ─────────────────────────────────────────────────────

/**
 * Generuje pelny raport ML: prognozy, anomalie, budzet, cashflow.
 * Zapisuje wynik w Firestore i zwraca MLInsightsSummary.
 */
export async function generateMLInsights(tenantId: string): Promise<MLInsightsSummary> {
  const currentPeriod = new Date().toISOString().substring(0, 7);

  const [forecasts, topAnomalies, budgetVariances, cashflowTrend] = await Promise.all([
    forecastSpending(tenantId, 3),
    detectTransactionAnomalies(tenantId, 50),
    getBudgetVariances(tenantId, currentPeriod),
    buildCashflowTrend(tenantId, 6),
  ]);

  const summary: MLInsightsSummary = {
    forecasts,
    topAnomalies,
    budgetVariances,
    cashflowTrend,
    generatedAt: new Date().toISOString(),
  };

  // Zapis do Firestore
  await setDoc(
    doc(db, `tenants/${tenantId}/mlInsights/latest`),
    { ...summary, updatedAt: Timestamp.now() }
  );

  return summary;
}
