import React, { useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Settings2, Fuel, User, Wrench } from 'lucide-react';
import { estimateEventCost, DEFAULT_COST_CONFIG, type CostConfig } from '../services/costEstimationService';
import type { ServiceEvent } from '../types';

interface Props {
  event: ServiceEvent;
  distanceKm?: number;
}

export default function CostEstimatePanel({ event, distanceKm = 20 }: Props) {
  const [config, setConfig] = useState<CostConfig>({ ...DEFAULT_COST_CONFIG });
  const [showConfig, setShowConfig] = useState(false);
  const est = estimateEventCost(event, distanceKm, config);

  const setC = (k: keyof CostConfig) => (v: number) =>
    setConfig(c => ({ ...c, [k]: v }));

  const profitColor = est.profitMarginPercent >= 30 ? 'text-emerald-600'
    : est.profitMarginPercent >= 0 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="bg-slate-50 rounded-[1.5rem] border border-slate-100 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign size={14} className="text-slate-500" />
          <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Analiza kosztów</h4>
        </div>
        <button onClick={() => setShowConfig(v => !v)}
          className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors" title="Konfiguracja kosztów">
          <Settings2 size={12} className="text-slate-400" />
        </button>
      </div>

      {showConfig && (
        <div className="grid grid-cols-2 gap-2 bg-white rounded-2xl p-3 border border-slate-200">
          {([
            { key: 'fuelCostPerKm',                  label: 'PLN/km paliwo',      min: 0.1, step: 0.05 },
            { key: 'workerHourlyRate',                label: 'PLN/h pracownik',    min: 10,  step: 5 },
            { key: 'equipmentAmortizationPerHour',   label: 'PLN/h sprzęt',       min: 0,   step: 5 },
            { key: 'tollCost',                        label: 'Opłaty autostr. PLN', min: 0,  step: 10 },
          ] as { key: keyof CostConfig; label: string; min: number; step: number }[]).map(({ key, label, min, step }) => (
            <div key={key}>
              <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</label>
              <input type="number" min={min} step={step} value={(config as any)[key]}
                onChange={e => setC(key)(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none" />
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {[
          { icon: Fuel, label: `Paliwo (${distanceKm} km × 2)`, value: est.fuelCost, color: 'text-orange-600' },
          { icon: User, label: `Pracownicy (${est.workerHours.toFixed(1)}h × ${event.assignedWorkers.length})`, value: est.workerCost, color: 'text-blue-600' },
          { icon: Wrench, label: 'Amortyzacja sprzętu', value: est.equipmentCost, color: 'text-purple-600' },
          ...(est.tollCost > 0 ? [{ icon: DollarSign, label: 'Opłaty dodatkowe', value: est.tollCost, color: 'text-slate-600' }] : []),
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[10px] text-slate-600">
              <Icon size={10} className={color} />{label}
            </span>
            <span className="text-xs font-black text-slate-700">
              {value.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} {est.currency}
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200 pt-3 space-y-1.5">
        <div className="flex justify-between">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Koszty łącznie</span>
          <span className="text-sm font-black text-slate-900">
            {est.totalCost.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} {est.currency}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Przychód</span>
          <span className="text-sm font-black text-emerald-700">
            {est.revenue.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} {est.currency}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Zysk</span>
          <div className="flex items-center gap-1.5">
            {est.profit >= 0
              ? <TrendingUp size={12} className="text-emerald-500" />
              : <TrendingDown size={12} className="text-red-500" />
            }
            <span className={`text-sm font-black ${profitColor}`}>
              {est.profit.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} {est.currency}
            </span>
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
              est.profitMarginPercent >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }`}>{est.profitMarginPercent}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
