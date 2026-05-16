/**
 * Data: 2026-05-16
 * Zmiany: ML Insights Dashboard — prognozy, anomalie, budzet, cashflow.
 * Sciezka: /src/modules/finance/reporting/MLInsightsModule.tsx
 */
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BrainCircuit, RefreshCw, TrendingUp, TrendingDown,
  Minus, AlertTriangle, ShieldAlert, CheckCircle2,
  ArrowRight, Clock, BarChart2,
} from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import useTenant from '../../../shared/hooks/useTenant';
import {
  generateMLInsights,
  type MLInsightsSummary,
  type SpendingForecast,
  type AnomalyDetectionResult,
  type CategoryBudgetVariance,
} from '../services/bigQueryService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPLN(v: number): string {
  return v.toLocaleString('pl-PL', { maximumFractionDigits: 0 }) + ' PLN';
}

function formatPeriod(p: string): string {
  const [year, month] = p.split('-');
  const months = [
    'STY', 'LUT', 'MAR', 'KWI', 'MAJ', 'CZE',
    'LIP', 'SIE', 'WRZ', 'PAZ', 'LIS', 'GRU',
  ];
  return `${months[parseInt(month) - 1]} ${year}`;
}

function minutesAgo(isoStr: string): string {
  const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 60_000);
  if (diff < 1) return 'przed chwila';
  if (diff === 1) return '1 minute temu';
  if (diff < 60) return `${diff} minut temu`;
  const h = Math.floor(diff / 60);
  return `${h}h temu`;
}

function anomalyColor(score: number): string {
  if (score > 70) return 'bg-rose-100 text-rose-700 border-rose-200';
  if (score > 40) return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-emerald-100 text-emerald-700 border-emerald-200';
}

function statusColor(status: CategoryBudgetVariance['status']): string {
  if (status === 'critical') return 'bg-rose-50 border-rose-100';
  if (status === 'warning') return 'bg-amber-50 border-amber-100';
  return 'bg-emerald-50 border-emerald-100';
}

function statusTextColor(status: CategoryBudgetVariance['status']): string {
  if (status === 'critical') return 'text-rose-600';
  if (status === 'warning') return 'text-amber-600';
  return 'text-emerald-600';
}

function statusIcon(status: CategoryBudgetVariance['status']) {
  if (status === 'critical') return <ShieldAlert size={14} className="text-rose-500" />;
  if (status === 'warning') return <AlertTriangle size={14} className="text-amber-500" />;
  return <CheckCircle2 size={14} className="text-emerald-500" />;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ForecastCard({ forecast }: { forecast: SpendingForecast }) {
  const TrendIcon = forecast.trend === 'up' ? TrendingUp
    : forecast.trend === 'down' ? TrendingDown
    : Minus;
  const trendColor = forecast.trend === 'up' ? 'text-rose-500'
    : forecast.trend === 'down' ? 'text-emerald-500'
    : 'text-slate-400';
  const confidencePct = Math.round(forecast.confidence * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm flex flex-col gap-4"
    >
      <div className="flex justify-between items-start">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          {formatPeriod(forecast.period)}
        </div>
        <div className={`flex items-center gap-1 ${trendColor}`}>
          <TrendIcon size={16} />
          <span className="text-[10px] font-black uppercase tracking-widest">
            {forecast.trend === 'stable' ? 'stabilny' : `${forecast.changePercent > 0 ? '+' : ''}${forecast.changePercent}%`}
          </span>
        </div>
      </div>

      <div className="text-2xl font-black text-slate-900 italic tracking-tighter">
        {formatPLN(forecast.predictedAmount)}
      </div>

      {/* Confidence bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pewnosc modelu</span>
          <span className="text-[10px] font-black text-indigo-600">{confidencePct}%</span>
        </div>
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 rounded-full"
            style={{ width: `${confidencePct}%` }}
          />
        </div>
      </div>
    </motion.div>
  );
}

function AnomalyRow({ anomaly }: { anomaly: AnomalyDetectionResult }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white border border-slate-100 rounded-[2rem] p-6 flex flex-col gap-3"
    >
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`text-[10px] font-black px-3 py-1 rounded-full border ${anomalyColor(anomaly.anomalyScore)}`}>
            Score: {anomaly.anomalyScore}
          </div>
          {anomaly.isAnomaly && (
            <div className="text-[9px] font-black px-2 py-1 rounded-full bg-rose-600 text-white uppercase tracking-widest">
              Anomalia
            </div>
          )}
        </div>
        <div className="text-[9px] font-mono text-slate-400 shrink-0">
          #{anomaly.transactionId.substring(0, 8)}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {anomaly.reasons.map((r, i) => (
          <span
            key={i}
            className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase tracking-wider"
          >
            {r}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-500 italic">{anomaly.suggestedAction}</span>
        <button className="flex items-center gap-1 text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:opacity-70 transition-opacity">
          Transakcja <ArrowRight size={11} />
        </button>
      </div>
    </motion.div>
  );
}

function BudgetRow({ v }: { v: CategoryBudgetVariance }) {
  const variancePct = v.variancePercent;
  const barWidth = Math.min(100, variancePct);
  const barColor = v.status === 'critical' ? 'bg-rose-500'
    : v.status === 'warning' ? 'bg-amber-500'
    : 'bg-emerald-500';

  return (
    <div className={`grid grid-cols-5 gap-4 items-center px-6 py-4 rounded-2xl border ${statusColor(v.status)}`}>
      <div className="col-span-1 flex items-center gap-2">
        {statusIcon(v.status)}
        <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider truncate">{v.category}</span>
      </div>
      <div className="text-[11px] font-bold text-slate-600 text-right">{formatPLN(v.budgeted)}</div>
      <div className="text-[11px] font-bold text-slate-900 text-right">{formatPLN(v.actual)}</div>
      <div className={`text-[11px] font-bold text-right ${v.variance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
        {v.variance > 0 ? '+' : ''}{formatPLN(v.variance)}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-white rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${barWidth}%` }} />
        </div>
        <span className={`text-[9px] font-black shrink-0 ${statusTextColor(v.status)}`}>
          {v.variancePercent.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

function CashflowBar({ entry, maxValue }: { entry: { period: string; inflow: number; outflow: number; net: number }; maxValue: number }) {
  const inflowPct = maxValue > 0 ? (entry.inflow / maxValue) * 100 : 0;
  const outflowPct = maxValue > 0 ? (entry.outflow / maxValue) * 100 : 0;

  return (
    <div className="flex flex-col gap-2 items-center flex-1 min-w-0">
      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">
        {formatPeriod(entry.period)}
      </div>
      <div className="flex gap-1 items-end h-20 w-full justify-center">
        <div className="flex flex-col justify-end" style={{ height: '80px' }}>
          <div
            className="w-5 bg-emerald-400 rounded-t"
            style={{ height: `${inflowPct * 0.8}px` }}
            title={`Przychody: ${formatPLN(entry.inflow)}`}
          />
        </div>
        <div className="flex flex-col justify-end" style={{ height: '80px' }}>
          <div
            className="w-5 bg-rose-400 rounded-t"
            style={{ height: `${outflowPct * 0.8}px` }}
            title={`Wydatki: ${formatPLN(entry.outflow)}`}
          />
        </div>
      </div>
      <div className={`text-[9px] font-black ${entry.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
        {entry.net >= 0 ? '+' : ''}{(entry.net / 1000).toFixed(1)}k
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MLInsightsModule() {
  const { activeTenantId: tenantId } = useTenant();
  const [data, setData] = useState<MLInsightsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subskrypcja onSnapshot na mlInsights/latest
  useEffect(() => {
    if (!tenantId) return;

    const ref = doc(db, `tenants/${tenantId}/mlInsights/latest`);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setData(snap.data() as MLInsightsSummary);
        } else {
          // Brak danych — generuj automatycznie
          handleRefresh();
        }
      },
      (err) => {
        console.error('MLInsights snapshot error:', err);
        setError('Blad ladowania danych ML.');
      }
    );

    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const handleRefresh = async () => {
    if (!tenantId || loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await generateMLInsights(tenantId);
      setData(result);
    } catch (err) {
      console.error('generateMLInsights error:', err);
      setError('Blad generowania analizy ML. Sprawdz polaczenie z Firestore.');
    } finally {
      setLoading(false);
    }
  };

  // Max value dla cashflow barchart
  const cashflowMax = data?.cashflowTrend
    ? Math.max(...data.cashflowTrend.map((e) => Math.max(e.inflow, e.outflow)), 1)
    : 1;

  // Suma budzetow do total row
  const budgetTotal = data?.budgetVariances.reduce(
    (acc, v) => ({ budgeted: acc.budgeted + v.budgeted, actual: acc.actual + v.actual }),
    { budgeted: 0, actual: 0 }
  ) ?? { budgeted: 0, actual: 0 };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-[1.25rem] bg-indigo-600 flex items-center justify-center">
            <BrainCircuit className="text-white" size={22} />
          </div>
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Modul</div>
            <div className="text-xl font-black text-slate-900 uppercase tracking-tight italic">AI &amp; ML Insights — BigQuery</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {data && (
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-2xl">
              <Clock size={12} className="text-slate-400" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Ostatnia analiza: {minutesAgo(data.generatedAt)}
              </span>
            </div>
          )}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-60"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Analizuję...' : 'Odswież'}
          </button>
        </div>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-rose-50 border border-rose-200 rounded-[2rem] px-6 py-4 text-[11px] font-bold text-rose-700 flex items-center gap-3"
          >
            <AlertTriangle size={16} /> {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading skeleton */}
      {loading && !data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-slate-100 rounded-[2.5rem] h-48 animate-pulse" />
          ))}
        </div>
      )}

      <AnimatePresence>
        {data && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            {/* === Sekcja 1: Spending Forecast === */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <BarChart2 size={16} className="text-indigo-600" />
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prognoza Wydatkow (3 miesiace)</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {data.forecasts.length > 0 ? (
                  data.forecasts.map((f) => <ForecastCard key={f.period} forecast={f} />)
                ) : (
                  <div className="col-span-3 bg-slate-50 rounded-[2.5rem] p-8 text-center text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                    Brak danych historycznych do prognozy
                  </div>
                )}
              </div>
            </section>

            {/* === Sekcja 2: Top Anomalies === */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <ShieldAlert size={16} className="text-rose-500" />
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Top Anomalie ({data.topAnomalies.filter((a) => a.isAnomaly).length} krytycznych)
                </div>
              </div>
              {data.topAnomalies.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.topAnomalies.slice(0, 6).map((a) => (
                    <AnomalyRow key={a.transactionId} anomaly={a} />
                  ))}
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-100 rounded-[2.5rem] p-8 text-center">
                  <CheckCircle2 size={24} className="text-emerald-500 mx-auto mb-2" />
                  <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Brak anomalii — transakcje wygladaja normalnie</div>
                </div>
              )}
            </section>

            {/* === Sekcja 3: Budget Variance === */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle size={16} className="text-amber-500" />
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Odchylenia Budzetu</div>
              </div>
              {data.budgetVariances.length > 0 ? (
                <div className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm">
                  {/* Header row */}
                  <div className="grid grid-cols-5 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-100">
                    {['Kategoria', 'Budzet', 'Rzeczywiste', 'Odchylenie', 'Wykonanie'].map((h) => (
                      <div key={h} className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-right first:text-left">
                        {h}
                      </div>
                    ))}
                  </div>
                  <div className="p-4 space-y-2">
                    {data.budgetVariances.map((v) => <BudgetRow key={v.category} v={v} />)}
                  </div>
                  {/* Total row */}
                  <div className="grid grid-cols-5 gap-4 px-6 py-4 bg-slate-900 rounded-b-[2.5rem]">
                    <div className="text-[10px] font-black text-white uppercase tracking-widest">RAZEM</div>
                    <div className="text-[11px] font-black text-slate-300 text-right">{formatPLN(budgetTotal.budgeted)}</div>
                    <div className="text-[11px] font-black text-white text-right">{formatPLN(budgetTotal.actual)}</div>
                    <div className={`text-[11px] font-black text-right ${budgetTotal.actual > budgetTotal.budgeted ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {budgetTotal.actual > budgetTotal.budgeted ? '+' : ''}{formatPLN(budgetTotal.actual - budgetTotal.budgeted)}
                    </div>
                    <div className="text-[9px] font-black text-slate-400 text-right">
                      {budgetTotal.budgeted > 0 ? ((budgetTotal.actual / budgetTotal.budgeted) * 100).toFixed(0) : 0}%
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-8 text-center text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                  Brak danych budzetu dla biezacego okresu
                </div>
              )}
            </section>

            {/* === Sekcja 4: Cashflow Timeline === */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <TrendingUp size={16} className="text-emerald-500" />
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cashflow — ostatnie 6 miesiecy</div>
              </div>
              {data.cashflowTrend.length > 0 ? (
                <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
                  {/* Legenda */}
                  <div className="flex gap-6 mb-6 justify-end">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-emerald-400" />
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Przychody</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-rose-400" />
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Wydatki</span>
                    </div>
                  </div>
                  <div className="flex gap-4 items-end">
                    {data.cashflowTrend.map((entry) => (
                      <CashflowBar key={entry.period} entry={entry} maxValue={cashflowMax} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-8 text-center text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                  Brak danych cashflow
                </div>
              )}
            </section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
