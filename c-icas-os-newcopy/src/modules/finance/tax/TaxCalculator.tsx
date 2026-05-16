/**
 * Data: 2026-05-16
 * Zmiany: Real-time kalkulator PIT/ZUS/PPK — pełny engine 2026.
 * Ścieżka: /src/modules/finance/tax/TaxCalculator.tsx
 */
import React, { useState, useMemo } from 'react';
import {
  TrendingDown, TrendingUp, Calculator,
  ShieldAlert, RefreshCw, BarChart,
  Activity, ArrowRight, AlertTriangle
} from 'lucide-react';
import { motion } from 'motion/react';
import { calculateTax, type TaxInput } from '../services/taxEngine';

const TAX_FORM_OPTIONS: { value: TaxInput['taxForm']; label: string }[] = [
  { value: 'scale',    label: 'Skala 12/32%' },
  { value: 'linear',   label: 'Liniowy 19%' },
  { value: 'lump_8_5', label: 'Ryczałt 8.5%' },
  { value: 'lump_12',  label: 'Ryczałt 12%' },
  { value: 'lump_15',  label: 'Ryczałt 15%' },
];

const ZUS_OPTIONS: { value: TaxInput['zusBase']; label: string }[] = [
  { value: 'standard',      label: 'Standardowy' },
  { value: 'preferential',  label: 'Preferencyjny (24 mies.)' },
  { value: 'small_business', label: 'Mały ZUS Plus' },
];

export default function TaxCalculator() {
  const [revenue, setRevenue] = useState(25000);
  const [costs, setCosts] = useState(5000);
  const [taxForm, setTaxForm] = useState<TaxInput['taxForm']>('scale');
  const [zusBase, setZusBase] = useState<TaxInput['zusBase']>('standard');
  const [hasChildren, setHasChildren] = useState(0);
  const [hasPpk, setHasPpk] = useState(false);

  // Naliczone YTD (narastająco — uproszczone: aktualne * miesiąc w roku)
  const currentMonth = new Date().getMonth() + 1; // 1–12

  const result = useMemo(
    () =>
      calculateTax({
        monthlyRevenue: revenue,
        monthlyCosts: costs,
        taxForm,
        zusBase,
        hasChildren,
        hasPpk,
        ytdRevenue: revenue * currentMonth,
        ytdCosts: costs * currentMonth,
      }),
    [revenue, costs, taxForm, zusBase, hasChildren, hasPpk, currentMonth]
  );

  // Wykorzystanie kwoty wolnej (tylko skala — 30k rocznie = 2 500/mies)
  const taxFreeMonthly = 2500;
  const ytdIncome = revenue * currentMonth;
  const taxFreeUsed = taxForm === 'scale'
    ? Math.min(100, Math.round((ytdIncome / 30000) * 100))
    : 0;

  // Proporcja kosztów
  const costRatio = revenue > 0 ? Math.round((costs / revenue) * 100) : 0;

  // Statusy pozycji breakdown: paid / calculated
  const statusMap: Record<string, 'paid' | 'calculated'> = {
    'ZUS emerytalna': 'calculated',
    'ZUS rentowa': 'calculated',
    'ZUS chorobowa': 'calculated',
    'ZUS wypadkowa': 'calculated',
    'ZUS społeczne (łącznie)': 'calculated',
    'Fundusz Pracy': 'calculated',
    'Składka zdrowotna': 'calculated',
    'Zaliczka PIT': 'calculated',
    'Ryczałt': 'calculated',
    'PPK pracodawca': 'paid',
  };

  function getStatus(label: string): 'paid' | 'calculated' {
    const key = Object.keys(statusMap).find(k => label.includes(k));
    return key ? statusMap[key] : 'calculated';
  }

  const breakdownItems = result.breakdown.filter(
    b => b.amount < 0 && b.label !== 'Koszty' && b.label !== 'Dochód brutto'
  );

  function handleReset() {
    setRevenue(25000);
    setCosts(5000);
    setTaxForm('scale');
    setZusBase('standard');
    setHasChildren(0);
    setHasPpk(false);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-700">
      {/* Lewa kolumna: inputy + lista pozycji */}
      <div className="space-y-8">
        {/* Inputy */}
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h4 className="text-xl font-black text-slate-900 uppercase italic">Kalkulator Podatków</h4>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Okres: {new Date().toLocaleString('pl-PL', { month: 'long', year: 'numeric' })}
              </div>
            </div>
            <button
              onClick={handleReset}
              className="bg-slate-50 text-slate-400 p-3 rounded-xl hover:text-indigo-600 transition-colors"
            >
              <RefreshCw size={18} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                Przychód (PLN)
              </label>
              <input
                type="number" min="0" step="500"
                value={revenue}
                onChange={e => setRevenue(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-[13px] font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                Koszty (PLN)
              </label>
              <input
                type="number" min="0" step="500"
                value={costs}
                onChange={e => setCosts(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-[13px] font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                Forma Opodatkowania
              </label>
              <select
                value={taxForm}
                onChange={e => setTaxForm(e.target.value as TaxInput['taxForm'])}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-[11px] font-black text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {TAX_FORM_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                Podstawa ZUS
              </label>
              <select
                value={zusBase}
                onChange={e => setZusBase(e.target.value as TaxInput['zusBase'])}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-[11px] font-black text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {ZUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                Dzieci (ulga)
              </label>
              <div className="flex gap-2">
                {[0, 1, 2, 3, 4].map(n => (
                  <button
                    key={n}
                    onClick={() => setHasChildren(n)}
                    className={`w-9 h-9 rounded-xl text-[11px] font-black uppercase transition-all border ${hasChildren === n ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-indigo-300'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PPK</label>
              <button
                onClick={() => setHasPpk(!hasPpk)}
                className={`w-12 h-6 rounded-full transition-all border ${hasPpk ? 'bg-indigo-600 border-indigo-600' : 'bg-slate-100 border-slate-200'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${hasPpk ? 'translate-x-6' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Lista pozycji breakdown */}
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h4 className="text-lg font-black text-slate-900 uppercase italic">Zaliczki i Składki</h4>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bieżący miesiąc</div>
            </div>
          </div>

          <div className="space-y-4">
            {breakdownItems.map((item, idx) => {
              const status = getStatus(item.label);
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-100/50 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${status === 'paid' ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'}`}>
                      {status === 'paid' ? <ShieldAlert size={20} /> : <Calculator size={20} />}
                    </div>
                    <div>
                      <div className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{item.label}</div>
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">
                        {status === 'paid' ? 'Opłacono' : 'Do opłacenia'}
                        {item.basis ? ` · ${item.basis}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-rose-500 italic tracking-tighter">
                      {Math.abs(item.amount).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-10 p-8 bg-slate-900 rounded-[2.5rem] text-white">
            <div className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-2 italic">
              Sumaryczne Obciążenie (Tax Burn)
            </div>
            <div className="text-4xl font-black italic tracking-tighter text-emerald-400">
              {result.totalBurden.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN
            </div>
            <div className="mt-3 text-[10px] font-black text-slate-400 uppercase italic">
              Na rękę: {result.netIncome.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN
            </div>
          </div>
        </div>
      </div>

      {/* Prawa kolumna: analityka + IP Box */}
      <div className="space-y-8">
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10">
          <h5 className="text-sm font-black text-slate-900 uppercase italic tracking-widest mb-8 flex items-center gap-3">
            <Activity className="text-indigo-600" size={20} /> Analityka Podatkowa
          </h5>
          <div className="space-y-8">
            {/* Efektywna stopa */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                  Efektywna Stopa Podatkowa
                </span>
                <span className="text-[10px] font-black text-slate-900 uppercase italic">
                  {result.effectiveTaxRate}%
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <motion.div
                  className="bg-indigo-600 h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(result.effectiveTaxRate, 100)}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            {/* Kwota wolna */}
            {taxForm === 'scale' && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                    Wykorzystanie Kwoty Wolnej 30k
                  </span>
                  <span className="text-[10px] font-black text-slate-900 uppercase italic">
                    {taxFreeUsed}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <motion.div
                    className="bg-emerald-500 h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(taxFreeUsed, 100)}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                {taxFreeUsed >= 100 && (
                  <p className="mt-1 text-[9px] font-black text-rose-500 uppercase italic">
                    Kwota wolna wyczerpana — pełne stawki PIT
                  </p>
                )}
              </div>
            )}

            {/* Proporcja kosztów */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                  Proporcja Kosztów (Cost Ratio)
                </span>
                <span className="text-[10px] font-black text-slate-900 uppercase italic">
                  {costRatio}%
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <motion.div
                  className="bg-amber-500 h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(costRatio, 100)}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            {/* Tax vs Net */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                  Obciążenie vs Dochód Netto
                </span>
              </div>
              <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                <motion.div
                  className="bg-rose-500"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${revenue > 0
                      ? Math.round((result.totalBurden / (result.totalBurden + Math.max(0, result.netIncome))) * 100)
                      : 0}%`
                  }}
                  transition={{ duration: 0.5 }}
                />
                <div className="bg-emerald-400 flex-1" />
              </div>
              <div className="flex justify-between mt-1 text-[9px] font-black text-slate-400 uppercase italic">
                <span className="text-rose-400">Podatki & ZUS</span>
                <span className="text-emerald-500">Na rękę</span>
              </div>
            </div>
          </div>

          {/* Uwagi */}
          {result.notes.length > 0 && (
            <div className="mt-8 space-y-3">
              {result.notes.slice(0, 2).map((note, i) => (
                <div key={i} className="flex items-start gap-2 p-3 bg-amber-50 rounded-2xl border border-amber-100">
                  <AlertTriangle size={12} className="text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-[10px] font-medium text-amber-700 italic leading-relaxed">{note}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* IP Box banner */}
        <div className="bg-indigo-600 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-indigo-100 group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <BarChart className="text-indigo-200 mb-6" size={32} />
          <h5 className="text-2xl font-black uppercase italic tracking-tighter mb-4 leading-tight">
            IP Box & Ulga B+R <br />Klasyfikator AI
          </h5>
          <p className="text-xs font-medium text-indigo-100 italic leading-relaxed mb-8">
            Algorytm AI analizuje kody PKWiU i opisy transakcji, aby automatycznie wykryć możliwość zastosowania 5% stawki IP Box lub ulgi B+R.
          </p>
          <button className="flex items-center gap-3 bg-white text-indigo-600 px-8 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-xl">
            Uruchom Analizę Ulg <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
