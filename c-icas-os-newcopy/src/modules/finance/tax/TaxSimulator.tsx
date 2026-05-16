/**
 * Data: 2026-05-16
 * Zmiany: Real-time kalkulator optymalizacji formy opodatkowania (engine 2026).
 * Ścieżka: /src/modules/finance/tax/TaxSimulator.tsx
 */
import React, { useState, useMemo } from 'react';
import {
  Sparkles, Info, ChevronRight, Zap,
  PieChart, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  calculateTax,
  calculateOptimalForm,
  type TaxInput,
} from '../services/taxEngine';

const TAX_FORM_LABELS: Record<TaxInput['taxForm'], string> = {
  scale:    'Skala 12/32%',
  linear:   'Liniowy 19%',
  lump_8_5: 'Ryczałt 8.5%',
  lump_12:  'Ryczałt 12%',
  lump_15:  'Ryczałt 15%',
  card:     'Karta podatkowa',
};

const FORM_COLOR: Record<TaxInput['taxForm'], string> = {
  scale:    'bg-indigo-50 text-indigo-600 border-indigo-200',
  linear:   'bg-slate-50 text-slate-600 border-slate-200',
  lump_8_5: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  lump_12:  'bg-amber-50 text-amber-600 border-amber-200',
  lump_15:  'bg-rose-50 text-rose-600 border-rose-200',
  card:     'bg-violet-50 text-violet-600 border-violet-200',
};

export default function TaxSimulator() {
  const [revenue, setRevenue] = useState(25000);
  const [costs, setCosts] = useState(5000);
  const [taxForm, setTaxForm] = useState<TaxInput['taxForm']>('scale');
  const [hasChildren, setHasChildren] = useState(0);
  const [zusBase, setZusBase] = useState<TaxInput['zusBase']>('standard');

  // Bieżący wynik dla wybranej formy
  const currentResult = useMemo(
    () => calculateTax({ monthlyRevenue: revenue, monthlyCosts: costs, taxForm, hasChildren, zusBase }),
    [revenue, costs, taxForm, hasChildren, zusBase]
  );

  // Ranking wszystkich form
  const ranking = useMemo(
    () => calculateOptimalForm(revenue, costs, { hasChildren, zusBase }),
    [revenue, costs, hasChildren, zusBase]
  );

  const best = ranking[0];
  const worst = ranking[ranking.length - 1];
  const maxSavings = round2(best.result.netIncome - worst.result.netIncome);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-700">
      {/* Lewa kolumna: parametry + rekomendacja */}
      <div className="lg:col-span-1 space-y-8">
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10">
          <div className="flex items-center gap-3 mb-8">
            <Sparkles className="text-indigo-600" size={20} />
            <h4 className="text-xl font-black text-slate-900 uppercase italic">Parametry</h4>
          </div>

          <div className="space-y-8">
            {/* Przychód */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">
                Przychód Miesięczny (Netto)
              </label>
              <input
                type="range" min="3000" max="100000" step="500"
                value={revenue}
                onChange={e => setRevenue(parseInt(e.target.value))}
                className="w-full accent-indigo-600"
              />
              <div className="mt-4 text-2xl font-black text-slate-900 italic tracking-tighter">
                {revenue.toLocaleString('pl-PL')} PLN
              </div>
            </div>

            {/* Koszty */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">
                Koszty Miesięczne
              </label>
              <input
                type="range" min="0" max="80000" step="500"
                value={costs}
                onChange={e => setCosts(parseInt(e.target.value))}
                className="w-full accent-slate-400"
              />
              <div className="mt-4 text-2xl font-black text-slate-900 italic tracking-tighter">
                {costs.toLocaleString('pl-PL')} PLN
              </div>
            </div>

            {/* Forma opodatkowania */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">
                Forma Opodatkowania
              </label>
              <select
                value={taxForm}
                onChange={e => setTaxForm(e.target.value as TaxInput['taxForm'])}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-[11px] font-black text-slate-900 uppercase tracking-tight focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {(Object.keys(TAX_FORM_LABELS) as TaxInput['taxForm'][]).map(f => (
                  <option key={f} value={f}>{TAX_FORM_LABELS[f]}</option>
                ))}
              </select>
            </div>

            {/* Dzieci */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">
                Liczba Dzieci (ulga)
              </label>
              <div className="flex gap-2">
                {[0, 1, 2, 3, 4].map(n => (
                  <button
                    key={n}
                    onClick={() => setHasChildren(n)}
                    className={`flex-1 py-2 rounded-xl text-[11px] font-black uppercase transition-all border ${hasChildren === n ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-indigo-300'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* ZUS Base */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">
                Podstawa ZUS
              </label>
              <div className="space-y-2">
                {([
                  ['standard', 'Standardowy (~5 204 PLN)'],
                  ['preferential', 'Preferencyjny (~1 347 PLN)'],
                  ['small_business', 'Mały ZUS Plus (~2 700 PLN)'],
                ] as [TaxInput['zusBase'], string][]).map(([val, lbl]) => (
                  <button
                    key={val}
                    onClick={() => setZusBase(val)}
                    className={`w-full text-left px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-tight transition-all border ${zusBase === val ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-indigo-300'}`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Rekomendacja */}
        <div className="bg-emerald-500 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
          <Zap className="text-emerald-200 mb-6" size={32} />
          <h5 className="text-2xl font-black uppercase italic tracking-tighter mb-4 leading-tight">
            Najlepsza Opcja
          </h5>
          <div className="bg-white/20 p-6 rounded-3xl backdrop-blur-md border border-white/30">
            <div className="text-[10px] font-black text-emerald-100 uppercase mb-2">Rekomendacja NoFiCo</div>
            <div className="text-3xl font-black italic tracking-tighter mb-1">
              {TAX_FORM_LABELS[best.form]}
            </div>
            <div className="text-xs font-bold text-emerald-100">
              Na rękę: {best.result.netIncome.toLocaleString('pl-PL')} PLN / mies.
            </div>
            {maxSavings > 0 && (
              <div className="mt-2 text-[10px] font-black text-emerald-200 uppercase">
                Oszczędzasz ~{maxSavings.toLocaleString('pl-PL')} PLN vs najgorsze
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Prawa kolumna: ranking form + breakdown + alerty */}
      <div className="lg:col-span-2 space-y-8">
        {/* Karty rankingowe */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {ranking.slice(0, 5).map((sc, idx) => (
            <motion.div
              key={sc.form}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
              onClick={() => setTaxForm(sc.form)}
              className={`bg-white border-2 rounded-[2.5rem] p-7 shadow-sm cursor-pointer transition-all flex flex-col ${sc.form === taxForm ? 'border-indigo-500 shadow-indigo-100 shadow-xl' : 'border-slate-50 hover:border-indigo-300'}`}
            >
              <div className="flex items-center justify-between mb-5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${FORM_COLOR[sc.form]}`}>
                  <PieChart size={18} />
                </div>
                {idx === 0 && (
                  <span className="text-[8px] font-black bg-emerald-100 text-emerald-600 px-2 py-1 rounded-full uppercase tracking-widest">Najlepsza</span>
                )}
              </div>
              <h6 className="text-[12px] font-black text-slate-900 uppercase italic tracking-tight mb-1">
                {sc.label}
              </h6>
              <div className="text-[10px] font-black text-slate-400 uppercase italic mb-5">
                {TAX_FORM_LABELS[sc.form]}
              </div>

              <div className="w-full space-y-3 mb-5 bg-slate-50/60 p-5 rounded-2xl border border-slate-100 flex-1">
                <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase italic">
                  <span>Podatek</span>
                  <span className="text-slate-900">{sc.result.incomeTax.toLocaleString('pl-PL')} PLN</span>
                </div>
                <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase italic">
                  <span>Zdrowotna</span>
                  <span className="text-slate-900">{sc.result.healthContribution.toLocaleString('pl-PL')} PLN</span>
                </div>
                <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase italic">
                  <span>ZUS społ.</span>
                  <span className="text-slate-900">{sc.result.socialContributions.toLocaleString('pl-PL')} PLN</span>
                </div>
                <div className="pt-3 border-t border-slate-200 flex justify-between text-[11px] font-black text-slate-900 italic">
                  <span>Na rękę</span>
                  <span className={idx === 0 ? 'text-emerald-600' : 'text-indigo-600'}>
                    {sc.result.netIncome.toLocaleString('pl-PL')} PLN
                  </span>
                </div>
                <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase italic">
                  <span>Efekt. stopa</span>
                  <span>{sc.result.effectiveTaxRate}%</span>
                </div>
              </div>

              {sc.savings > 0 && (
                <div className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl uppercase tracking-widest text-center">
                  +{sc.savings.toLocaleString('pl-PL')} PLN vs najgorsze
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Breakdown wybranej formy */}
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10">
          <div className="flex items-center gap-3 mb-8">
            <PieChart className="text-indigo-600" size={20} />
            <h5 className="text-sm font-black text-slate-900 uppercase italic">
              Rozkład: {TAX_FORM_LABELS[taxForm]}
            </h5>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <tbody className="divide-y divide-slate-50">
                {currentResult.breakdown.map((row, i) => (
                  <tr key={i} className={`${i === currentResult.breakdown.length - 1 ? 'bg-slate-900 text-white rounded-2xl' : 'hover:bg-slate-50'} transition-colors`}>
                    <td className={`py-3 px-4 text-[10px] font-black uppercase tracking-tight italic ${i === currentResult.breakdown.length - 1 ? 'text-indigo-300 rounded-l-2xl' : 'text-slate-400'}`}>
                      {row.label}
                    </td>
                    <td className={`py-3 px-4 text-right text-[11px] font-black italic ${i === currentResult.breakdown.length - 1 ? 'text-emerald-400 rounded-r-2xl' : row.amount < 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                      {row.amount >= 0 ? '' : ''}{row.amount.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN
                    </td>
                    <td className="py-3 px-4 text-[9px] font-medium text-slate-300 italic hidden md:table-cell">
                      {row.basis ?? ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-6">
            <div className="bg-slate-50 rounded-2xl p-5">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mb-1">Tax Burn</div>
              <div className="text-2xl font-black text-rose-500 italic tracking-tighter">
                {currentResult.totalBurden.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN
              </div>
            </div>
            <div className="bg-slate-50 rounded-2xl p-5">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mb-1">Na Rękę</div>
              <div className="text-2xl font-black text-emerald-600 italic tracking-tighter">
                {currentResult.netIncome.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN
              </div>
            </div>
          </div>
        </div>

        {/* Alerty i uwagi */}
        {currentResult.notes.length > 0 && (
          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10">
            <div className="flex items-center gap-3 mb-6">
              <Info className="text-amber-500" size={20} />
              <h5 className="text-sm font-black text-slate-900 uppercase italic">Uwagi i Alerty</h5>
            </div>
            <div className="space-y-3">
              {currentResult.notes.map((note, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100"
                >
                  <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-[11px] font-medium text-amber-700 italic leading-relaxed">{note}</p>
                </motion.div>
              ))}
            </div>

            <div className="mt-8 flex items-center gap-2 text-[9px] font-black text-indigo-500 uppercase tracking-widest italic group cursor-pointer">
              Pełna baza wiedzy NoFiCo Legal <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function round2(val: number): number {
  return Math.round(val * 100) / 100;
}
