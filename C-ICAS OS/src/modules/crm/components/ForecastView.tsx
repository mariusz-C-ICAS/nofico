import React, { useState, useEffect } from 'react';
import { TrendingUp, RefreshCw, Target, DollarSign, Percent } from 'lucide-react';
import { getDealsForForecast } from '../services/crmService';
import { computeDealHealth, healthLabel } from '../services/leadScoringService';

interface Props { tenantId: string }

const STAGE_LABELS: Record<string, string> = {
  lead: 'Leady', meeting: 'Spotkania', quote: 'Oferta',
  negotiation: 'Negocjacje', closed_won: 'Wygrane',
};

export default function ForecastView({ tenantId }: Props) {
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDealsForForecast(tenantId).then(d => { setDeals(d); setLoading(false); });
  }, [tenantId]);

  if (loading) return (
    <div className="flex justify-center py-20"><RefreshCw size={20} className="animate-spin text-indigo-400" /></div>
  );

  const totalPipeline = deals.reduce((s, d) => s + (d.value ?? 0), 0);
  const weightedTotal = deals.reduce((s, d) => s + ((d.value ?? 0) * ((d.probability ?? 0) / 100)), 0);
  const bestCase = deals.filter(d => (d.probability ?? 0) >= 50).reduce((s, d) => s + (d.value ?? 0), 0);

  // Group by stage
  const byStage: Record<string, { count: number; value: number; weighted: number }> = {};
  deals.forEach(d => {
    const s = d.stage ?? 'lead';
    if (!byStage[s]) byStage[s] = { count: 0, value: 0, weighted: 0 };
    byStage[s].count++;
    byStage[s].value += d.value ?? 0;
    byStage[s].weighted += (d.value ?? 0) * ((d.probability ?? 0) / 100);
  });

  const fmt = (n: number) => n.toLocaleString('pl-PL', { maximumFractionDigits: 0 });

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Prognoza Sprzedaży</h3>
        <p className="text-xs text-slate-500 mt-0.5">Ważona wartość pipeline na podstawie prawdopodobieństwa zamknięcia</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Target,     label: 'Total Pipeline', value: fmt(totalPipeline) + ' PLN', color: 'text-slate-800', bg: 'bg-slate-50' },
          { icon: DollarSign, label: 'Ważony forecast', value: fmt(weightedTotal) + ' PLN', color: 'text-indigo-700', bg: 'bg-indigo-50' },
          { icon: TrendingUp, label: 'Best case (≥50%)', value: fmt(bestCase) + ' PLN', color: 'text-emerald-700', bg: 'bg-emerald-50' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-2xl p-5 border border-slate-200`}>
            <Icon size={16} className={`${color} mb-2`} />
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
            <p className={`text-lg font-black ${color} mt-1`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Stage breakdown */}
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Rozkład po etapach</p>
        <div className="space-y-2">
          {Object.entries(byStage).map(([stage, data]) => (
            <div key={stage} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4">
              <div className="w-24 flex-shrink-0">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{STAGE_LABELS[stage] ?? stage}</p>
                <p className="text-xs font-black text-slate-700">{data.count} deal{data.count !== 1 ? 'e' : ''}</p>
              </div>
              <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full"
                  style={{ width: `${totalPipeline > 0 ? (data.value / totalPipeline) * 100 : 0}%` }} />
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-black text-slate-800">{fmt(data.value)} PLN</p>
                <p className="text-[9px] text-indigo-600 font-bold">{fmt(data.weighted)} ważony</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Deal health table */}
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Deal Health Score (AI)</p>
        <div className="space-y-2">
          {deals.slice(0, 15).map(deal => {
            const health = computeDealHealth({
              probability: deal.probability ?? 0,
              daysSinceLastActivity: 14,
              activityCount: 2,
              value: deal.value ?? 0,
            });
            const hl = healthLabel(health);
            return (
              <div key={deal.id} className="flex items-center gap-4 p-3 bg-white rounded-xl border border-slate-200">
                <div className={`w-1.5 h-8 rounded-full ${hl.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-slate-800 truncate">{deal.title}</p>
                  <p className="text-[9px] text-slate-500">{deal.customer ?? 'Nieznany'} · {STAGE_LABELS[deal.stage] ?? deal.stage}</p>
                </div>
                <div className="flex items-center gap-3 text-right flex-shrink-0">
                  <div>
                    <p className="text-[9px] text-slate-400">Wartość</p>
                    <p className="text-xs font-black text-slate-700">{fmt(deal.value ?? 0)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400">Prawd.</p>
                    <p className="text-xs font-black text-indigo-600">{deal.probability ?? 0}%</p>
                  </div>
                  <div className="w-16 text-right">
                    <p className="text-[9px] text-slate-400">Health</p>
                    <p className={`text-xs font-black ${hl.color}`}>{health} · {hl.label}</p>
                  </div>
                </div>
              </div>
            );
          })}
          {deals.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-6">Brak aktywnych dealów w pipeline.</p>
          )}
        </div>
      </div>
    </div>
  );
}
