/**
 * Data: 2026-05-14
 * Ścieżka: /src/modules/controlling/components/BudgetPlanning.tsx
 */
import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Upload, CheckCircle2, ChevronDown, AlertTriangle,
  Download, RefreshCw, Save, FileSpreadsheet
} from 'lucide-react';

type BudgetVersion = 'plan' | 'revised' | 'forecast';

const categories = [
  'Wynagrodzenia',
  'ZUS/Swiadczenia',
  'Usugi Zewnetrzne',
  'IT / Licencje',
  'Marketing',
  'Podrze Sluzbowe',
  'Biuro / Najem',
  'Inne Koszty',
];

const months = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paz', 'Lis', 'Gru'];

function generateBudget(seed: number): number[][] {
  return categories.map((_, ci) =>
    months.map((_, mi) => Math.round((18000 + ci * 3000 + mi * 200 + seed * 100) / 100) * 100)
  );
}

function generateActual(): (number | null)[][] {
  return categories.map((_, ci) =>
    months.map((_, mi) => {
      if (mi >= 5) return null;
      const base = 18000 + ci * 3000 + mi * 200;
      return Math.round((base + (Math.random() - 0.4) * 2000) / 100) * 100;
    })
  );
}

const planData = generateBudget(0);
const revisedData = generateBudget(1);
const forecastData = generateBudget(2);
const actualData = generateActual();

const versionLabels: Record<BudgetVersion, string> = {
  plan: 'Plan Roczny',
  revised: 'Plan Skorygowany',
  forecast: 'Prognoza Biezaca',
};

export default function BudgetPlanning() {
  const [version, setVersion] = useState<BudgetVersion>('plan');
  const [showImportStub, setShowImportStub] = useState(false);
  const [approved, setApproved] = useState(false);

  const budgetData = version === 'plan' ? planData : version === 'revised' ? revisedData : forecastData;

  const totalByMonth = months.map((_, mi) =>
    categories.reduce((sum, _, ci) => sum + budgetData[ci][mi], 0)
  );
  const actualTotalByMonth = months.map((_, mi) =>
    categories.reduce((sum, _, ci) => sum + (actualData[ci][mi] ?? 0), 0)
  );

  const grandTotal = totalByMonth.reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm">
        <div className="flex gap-2">
          {(Object.keys(versionLabels) as BudgetVersion[]).map(v => (
            <button
              key={v}
              onClick={() => setVersion(v)}
              className={`px-4 py-2 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${
                version === v
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {versionLabels[v]}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportStub(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
          >
            <Upload size={12} /> Importuj Excel
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all">
            <Download size={12} /> Eksport
          </button>
          <button
            onClick={() => setApproved(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${
              approved
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-indigo-600 text-white shadow-md shadow-indigo-200 hover:bg-indigo-700'
            }`}
          >
            {approved ? <><CheckCircle2 size={12} /> Zatwierdzony</> : <><Save size={12} /> Zatwierdz Budzet</>}
          </button>
        </div>
      </div>

      {showImportStub && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-indigo-50 border border-indigo-100 rounded-[2rem] p-6 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <FileSpreadsheet size={20} className="text-indigo-600" />
            <div>
              <div className="text-[11px] font-black text-indigo-800 uppercase tracking-widest">Import Budzetu z Excel</div>
              <div className="text-[11px] text-slate-500">Szablon: budzet_2026.xlsx — format: kategoria x miesiac</div>
            </div>
          </div>
          <button onClick={() => setShowImportStub(false)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50">Zamknij</button>
        </motion.div>
      )}

      {/* Budget Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Budzet Roczny 2026 — {versionLabels[version]}</div>
          <div className="text-[11px] font-black text-slate-700">Lacznie: {grandTotal.toLocaleString('pl-PL')} PLN</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-40 sticky left-0 bg-slate-50">Kategoria</th>
                {months.map(m => (
                  <th key={m} className="text-right px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[80px]">{m}</th>
                ))}
                <th className="text-right px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Razem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {categories.map((cat, ci) => {
                const rowTotal = budgetData[ci].reduce((a, b) => a + b, 0);
                return (
                  <tr key={cat} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 font-black text-slate-800 sticky left-0 bg-white">{cat}</td>
                    {months.map((_, mi) => {
                      const bVal = budgetData[ci][mi];
                      const aVal = actualData[ci][mi];
                      const over = aVal !== null && aVal > bVal * 1.1;
                      return (
                        <td key={mi} className="px-3 py-3 text-right">
                          <div className={`font-semibold ${over ? 'text-rose-600' : 'text-slate-700'}`}>{bVal.toLocaleString('pl-PL')}</div>
                          {aVal !== null && (
                            <div className={`text-[9px] font-bold ${over ? 'text-rose-500' : 'text-emerald-600'}`}>
                              {over && <AlertTriangle size={8} className="inline mr-0.5" />}
                              {aVal.toLocaleString('pl-PL')}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-6 py-3 text-right font-black text-slate-900">{rowTotal.toLocaleString('pl-PL')}</td>
                  </tr>
                );
              })}
              <tr className="bg-indigo-50 font-black">
                <td className="px-6 py-4 text-[10px] font-black text-indigo-700 uppercase tracking-widest sticky left-0 bg-indigo-50">RAZEM</td>
                {totalByMonth.map((total, mi) => {
                  const aTotal = actualTotalByMonth[mi];
                  const over = aTotal > 0 && aTotal > total * 1.05;
                  return (
                    <td key={mi} className="px-3 py-4 text-right">
                      <div className="font-black text-slate-900">{total.toLocaleString('pl-PL')}</div>
                      {aTotal > 0 && (
                        <div className={`text-[9px] font-bold ${over ? 'text-rose-600' : 'text-emerald-600'}`}>{aTotal.toLocaleString('pl-PL')}</div>
                      )}
                    </td>
                  );
                })}
                <td className="px-6 py-4 text-right font-black text-indigo-700">{grandTotal.toLocaleString('pl-PL')}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-slate-50 flex gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400 inline-block" /> Plan</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Wykonanie (ponizej planu)</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Przekroczenie &gt;10%</span>
        </div>
      </div>
    </div>
  );
}
