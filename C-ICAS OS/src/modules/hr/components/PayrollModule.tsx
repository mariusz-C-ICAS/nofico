/**
 * Data: 2026-05-14
 * Ścieżka: /src/modules/hr/components/PayrollModule.tsx
 */
import React, { useState } from 'react';
import { Banknote, ChevronLeft, ChevronRight, Download, FileText, Play, CheckCircle2, Clock, Send } from 'lucide-react';
import { motion } from 'motion/react';

interface PayrollRow {
  id: string;
  name: string;
  contractType: 'UoP' | 'B2B' | 'UoZ';
  baseSalary: number;
  hoursWorked: number;
  overtime: number;
  bonuses: number;
  deductions: number;
  zusEmployer: number;
  netPay: number;
  status: 'generated' | 'pending' | 'sent';
}

const MONTHS = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'];

function buildMockPayroll(monthIndex: number): PayrollRow[] {
  const base = [
    { id: 'EMP-001', name: 'Adam Kowalski',      contractType: 'B2B' as const, baseSalary: 22000 },
    { id: 'EMP-002', name: 'Anna Nowak',          contractType: 'UoP' as const, baseSalary: 12500 },
    { id: 'EMP-003', name: 'Marek Zając',         contractType: 'UoP' as const, baseSalary:  9800 },
    { id: 'EMP-005', name: 'Piotr Wiśniewski',   contractType: 'UoP' as const, baseSalary: 14200 },
    { id: 'EMP-006', name: 'Joanna Lewandowska', contractType: 'UoP' as const, baseSalary:  8900 },
  ];

  const statusCycle: PayrollRow['status'][] = ['generated', 'sent', 'pending', 'generated', 'sent'];

  return base.map((e, i) => {
    const overtime    = Math.round((monthIndex % 3 === 0 ? 800 : 0) + i * 200);
    const bonuses     = i === 1 ? 1500 : 0;
    const deductions  = e.contractType === 'UoP' ? Math.round(e.baseSalary * 0.1363) : 0;
    const zusEmployer = e.contractType === 'UoP' ? Math.round(e.baseSalary * 0.2081) : 0;
    const gross       = e.baseSalary + overtime + bonuses;
    const netPay      = e.contractType === 'B2B'
      ? gross
      : Math.round(gross - deductions - gross * 0.12);

    return {
      ...e,
      hoursWorked: 168 + (i % 2 === 0 ? 8 : 0),
      overtime,
      bonuses,
      deductions,
      zusEmployer,
      netPay,
      status: statusCycle[i],
    };
  });
}

const STATUS_MAP: Record<PayrollRow['status'], { label: string; icon: React.ElementType; classes: string }> = {
  generated: { label: 'Wygenerowana', icon: CheckCircle2, classes: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  pending:   { label: 'Oczekuje',     icon: Clock,        classes: 'bg-amber-50 text-amber-600 border-amber-100'       },
  sent:      { label: 'Wysłana',      icon: Send,         classes: 'bg-indigo-50 text-indigo-600 border-indigo-100'    },
};

function fmt(n: number) {
  return n.toLocaleString('pl-PL') + ' PLN';
}

export default function PayrollModule() {
  const currentMonth = new Date().getMonth();
  const [monthIndex, setMonthIndex] = useState(currentMonth);
  const [year, setYear]             = useState(2026);

  const rows = buildMockPayroll(monthIndex);

  const totals = rows.reduce(
    (acc, r) => ({
      base:     acc.base     + r.baseSalary,
      overtime: acc.overtime + r.overtime,
      bonuses:  acc.bonuses  + r.bonuses,
      deduct:   acc.deduct   + r.deductions,
      zus:      acc.zus      + r.zusEmployer,
      net:      acc.net      + r.netPay,
    }),
    { base: 0, overtime: 0, bonuses: 0, deduct: 0, zus: 0, net: 0 }
  );

  const prevMonth = () => {
    if (monthIndex === 0) { setMonthIndex(11); setYear(y => y - 1); }
    else setMonthIndex(m => m - 1);
  };

  const nextMonth = () => {
    if (monthIndex === 11) { setMonthIndex(0); setYear(y => y + 1); }
    else setMonthIndex(m => m + 1);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        {/* Month selector */}
        <div className="flex items-center gap-4 bg-white border border-slate-100 rounded-[2.5rem] px-6 py-4 shadow-sm">
          <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-400">
            <ChevronLeft size={18} />
          </button>
          <div className="text-center min-w-[160px]">
            <div className="text-sm font-black text-slate-900 uppercase italic tracking-tighter">
              {MONTHS[monthIndex]} {year}
            </div>
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lista Płac</div>
          </div>
          <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-400">
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="flex gap-3 flex-wrap">
          <button className="flex items-center gap-2 px-6 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm">
            <FileText size={14} /> Eksport PDF
          </button>
          <button className="flex items-center gap-2 px-6 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest bg-white border border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-600 transition-all shadow-sm">
            <Download size={14} /> Eksport CSV
          </button>
          <button className="flex items-center gap-2 px-8 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200">
            <Play size={14} /> Generuj Liste Plac
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900 text-white">
                {['Pracownik', 'Kontrakt', 'Wynagrodzenie bazowe', 'Godz.', 'Nadgodziny', 'Premie', 'Potrącenia', 'ZUS Pracodawca', 'Netto', 'Status'].map(h => (
                  <th key={h} className="px-6 py-5 text-[9px] font-black uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const { icon: StatusIcon, label, classes } = STATUS_MAP[row.status];
                return (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="px-6 py-5">
                      <div className="text-xs font-black text-slate-900 uppercase italic">{row.name}</div>
                      <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{row.id}</div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                        row.contractType === 'B2B'
                          ? 'bg-violet-50 text-violet-600 border-violet-100'
                          : row.contractType === 'UoP'
                          ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                          : 'bg-slate-50 text-slate-500 border-slate-100'
                      }`}>
                        {row.contractType}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-xs font-black text-slate-700 italic whitespace-nowrap">{fmt(row.baseSalary)}</td>
                    <td className="px-6 py-5 text-xs font-black text-slate-500 italic">{row.hoursWorked}h</td>
                    <td className="px-6 py-5 text-xs font-black text-slate-500 italic whitespace-nowrap">
                      {row.overtime > 0 ? <span className="text-amber-600">+{fmt(row.overtime)}</span> : '—'}
                    </td>
                    <td className="px-6 py-5 text-xs font-black text-slate-500 italic whitespace-nowrap">
                      {row.bonuses > 0 ? <span className="text-emerald-600">+{fmt(row.bonuses)}</span> : '—'}
                    </td>
                    <td className="px-6 py-5 text-xs font-black text-slate-500 italic whitespace-nowrap">
                      {row.deductions > 0 ? <span className="text-rose-500">-{fmt(row.deductions)}</span> : '—'}
                    </td>
                    <td className="px-6 py-5 text-xs font-black text-slate-500 italic whitespace-nowrap">
                      {row.zusEmployer > 0 ? fmt(row.zusEmployer) : '—'}
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-sm font-black text-slate-900 italic whitespace-nowrap">{fmt(row.netPay)}</span>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border w-fit ${classes}`}>
                        <StatusIcon size={12} />
                        {label}
                      </span>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>

            {/* Totals */}
            <tfoot>
              <tr className="bg-slate-50 border-t-2 border-slate-200">
                <td colSpan={2} className="px-6 py-5">
                  <div className="flex items-center gap-2">
                    <Banknote size={16} className="text-slate-400" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Suma miesięczna</span>
                  </div>
                </td>
                <td className="px-6 py-5 text-sm font-black text-slate-900 italic whitespace-nowrap">{fmt(totals.base)}</td>
                <td className="px-6 py-5" />
                <td className="px-6 py-5 text-sm font-black text-amber-600 italic whitespace-nowrap">
                  {totals.overtime > 0 ? `+${fmt(totals.overtime)}` : '—'}
                </td>
                <td className="px-6 py-5 text-sm font-black text-emerald-600 italic whitespace-nowrap">
                  {totals.bonuses > 0 ? `+${fmt(totals.bonuses)}` : '—'}
                </td>
                <td className="px-6 py-5 text-sm font-black text-rose-500 italic whitespace-nowrap">
                  {totals.deduct > 0 ? `-${fmt(totals.deduct)}` : '—'}
                </td>
                <td className="px-6 py-5 text-sm font-black text-slate-700 italic whitespace-nowrap">{fmt(totals.zus)}</td>
                <td className="px-6 py-5">
                  <span className="text-base font-black text-indigo-600 italic whitespace-nowrap">{fmt(totals.net)}</span>
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: 'Łączny fundusz płac', value: fmt(totals.base + totals.overtime + totals.bonuses), color: 'text-slate-900' },
          { label: 'ZUS Pracodawcy',      value: fmt(totals.zus),                                     color: 'text-rose-600'  },
          { label: 'Premie wypłacone',    value: fmt(totals.bonuses),                                  color: 'text-emerald-600' },
          { label: 'Wypłata netto',       value: fmt(totals.net),                                      color: 'text-indigo-600' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8">
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">{c.label}</div>
            <div className={`text-xl font-black italic ${c.color}`}>{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
