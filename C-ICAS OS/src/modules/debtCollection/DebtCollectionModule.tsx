import React, { useEffect, useState } from 'react';
import { useAuth } from '../../shared/hooks/AuthContext';
import { getDebtCases } from './services/debtService';
import { DebtCase, DebtStage } from './types';
import { Scale, DollarSign, AlertTriangle, TrendingDown } from 'lucide-react';

const STAGE_META: Record<DebtStage, { label: string; color: string }> = {
  SOFT_REMINDER:  { label: 'Miękkie przypomnienie', color: 'bg-yellow-100 text-yellow-700' },
  FORMAL_DEMAND:  { label: 'Wezwanie formalne',      color: 'bg-orange-100 text-orange-700' },
  PRE_LEGAL:      { label: 'Przedsądowe',            color: 'bg-red-100 text-red-700' },
  LEGAL:          { label: 'Sądowe',                 color: 'bg-red-200 text-red-800' },
  WRITE_OFF:      { label: 'Umorzenie',              color: 'bg-gray-100 text-gray-600' },
  SETTLED:        { label: 'Spłacona',               color: 'bg-emerald-100 text-emerald-700' },
};

const dpdColor = (dpd: number) => dpd > 90 ? 'text-red-700 font-bold' : dpd > 30 ? 'text-orange-600 font-semibold' : 'text-amber-600';

export default function DebtCollectionModule() {
  const { activeTenantId } = useAuth() as any;
  const [cases, setCases]   = useState<DebtCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState<DebtStage | 'ALL'>('ALL');

  useEffect(() => {
    if (!activeTenantId) return;
    setLoading(true);
    getDebtCases(activeTenantId, stageFilter === 'ALL' ? undefined : stageFilter)
      .then(setCases)
      .finally(() => setLoading(false));
  }, [activeTenantId, stageFilter]);

  const active       = cases.filter(c => c.stage !== 'SETTLED' && c.stage !== 'WRITE_OFF');
  const outstanding  = active.reduce((s, c) => s + c.outstandingAmount, 0);
  const critical     = active.filter(c => c.dpd > 90).length;

  const kpis = [
    { label: 'Łączne zaległości',  value: `${outstanding.toLocaleString('pl-PL', { maximumFractionDigits: 0 })} PLN`, Icon: DollarSign,    color: 'rose' },
    { label: 'Spraw aktywnych',    value: active.length,                                                                Icon: TrendingDown,  color: 'indigo' },
    { label: 'Krytyczne (>90 DPD)', value: critical,                                                                   Icon: AlertTriangle, color: 'red' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Scale className="w-7 h-7 text-rose-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Windykacja</h1>
          <p className="text-sm text-gray-500">Należności przeterminowane i sprawy windykacyjne</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {kpis.map(({ label, value, Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 text-${color}-500`} />
              <span className="text-xs text-gray-500 font-medium">{label}</span>
            </div>
            <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600 font-medium">Etap:</label>
        <select
          value={stageFilter}
          onChange={e => setStageFilter(e.target.value as DebtStage | 'ALL')}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5"
        >
          <option value="ALL">Wszystkie</option>
          {(Object.keys(STAGE_META) as DebtStage[]).map(s => (
            <option key={s} value={s}>{STAGE_META[s].label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-6 py-3 text-left">Klient</th>
              <th className="px-6 py-3 text-left">Nr faktury</th>
              <th className="px-6 py-3 text-right">Zaległość</th>
              <th className="px-6 py-3 text-right">DPD</th>
              <th className="px-6 py-3 text-left">Etap</th>
              <th className="px-6 py-3 text-right">Kontakty</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">Ładowanie…</td></tr>}
            {!loading && !cases.length && <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">Brak spraw windykacyjnych</td></tr>}
            {cases.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{c.customerName}</td>
                <td className="px-6 py-4 font-mono text-sm text-gray-600">{c.invoiceNumber}</td>
                <td className="px-6 py-4 text-right font-bold text-rose-600">
                  {c.outstandingAmount.toLocaleString('pl-PL', { maximumFractionDigits: 2 })} {c.currency}
                </td>
                <td className={`px-6 py-4 text-right ${dpdColor(c.dpd)}`}>{c.dpd}d</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${STAGE_META[c.stage].color}`}>
                    {STAGE_META[c.stage].label}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-gray-500">{c.contactAttempts.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
