import React, { useState, useEffect, useMemo } from 'react';
import {
  Database, Download, ArrowUpRight, ArrowDownLeft, Calculator,
  Loader2, BookOpen, ChevronDown, ChevronRight, ChevronUp
} from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import {
  collection, query, onSnapshot, orderBy, where, Timestamp
} from 'firebase/firestore';
import { useTenant } from '../../../shared/hooks/useTenant';

interface Account {
  id: string;
  code: string;
  name: string;
  balanceWn: number;
  balanceMa: number;
  category: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
}

interface JournalEntry {
  id: string;
  date: any;
  documentNumber: string;
  description: string;
  totalAmount: number;
  status: string;
  items: {
    accountId: string;
    accountCode: string;
    debit: number;
    credit: number;
    side: 'Wn' | 'Ma';
  }[];
}

const MONTHS_PL = [
  'Styczen','Luty','Marzec','Kwiecien','Maj','Czerwiec',
  'Lipiec','Sierpien','Wrzesien','Pazdziernik','Listopad','Grudzien'
];

const GROUP_LABELS: Record<string, string> = {
  asset: 'AKTYWA',
  liability: 'PASYWA',
  equity: 'KAPITAL',
  revenue: 'PRZYCHODY',
  expense: 'KOSZTY',
};

const GROUP_ORDER: Account['category'][] = ['asset', 'liability', 'equity', 'revenue', 'expense'];

function downloadCSV(accounts: Account[], periodLabel: string) {
  const header = 'Kod;Nazwa;Obroty Wn;Obroty Ma;Saldo;Strona\n';
  const rows = accounts.map(a => {
    const balance = (a.balanceWn || 0) - (a.balanceMa || 0);
    const side = balance >= 0 ? 'Wn' : 'Ma';
    return `${a.code};${a.name};${(a.balanceWn||0).toFixed(2)};${(a.balanceMa||0).toFixed(2)};${Math.abs(balance).toFixed(2)};${side}`;
  }).join('\n');
  const blob = new Blob(['﻿' + header + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ksiega-glowna-${periodLabel.replace(' ', '-')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function GeneralLedger() {
  const { activeTenantId } = useTenant();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  // Listener 1: Chart of Accounts
  useEffect(() => {
    if (!activeTenantId) return;
    const q = query(collection(db, `tenants/${activeTenantId}/chartOfAccounts`), orderBy('code', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const data: Account[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as Account));
      setAccounts(data);
      setLoading(false);
    });
    return () => unsub();
  }, [activeTenantId]);

  // Listener 2: Journals filtered by period
  useEffect(() => {
    if (!activeTenantId) return;
    const start = new Date(selectedYear, selectedMonth, 1);
    const end = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
    const q = query(
      collection(db, `tenants/${activeTenantId}/journals`),
      where('date', '>=', Timestamp.fromDate(start)),
      where('date', '<=', Timestamp.fromDate(end)),
      orderBy('date', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const data: JournalEntry[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as JournalEntry));
      setJournals(data);
    });
    return () => unsub();
  }, [activeTenantId, selectedMonth, selectedYear]);

  const totalWn = accounts.reduce((s, a) => s + (a.balanceWn || 0), 0);
  const totalMa = accounts.reduce((s, a) => s + (a.balanceMa || 0), 0);
  const assets = accounts
    .filter(a => a.category === 'asset')
    .reduce((s, a) => s + ((a.balanceWn || 0) - (a.balanceMa || 0)), 0);
  const liabilities = accounts
    .filter(a => a.category === 'liability')
    .reduce((s, a) => s + ((a.balanceMa || 0) - (a.balanceWn || 0)), 0);
  const isBalanced = Math.abs(totalWn - totalMa) < 0.01;

  const grouped = useMemo(() => {
    const map: Record<string, Account[]> = {};
    GROUP_ORDER.forEach(cat => { map[cat] = []; });
    accounts.forEach(a => {
      if (map[a.category]) map[a.category].push(a);
    });
    return map;
  }, [accounts]);

  // Journal entries related to a specific account code
  const getAccountJournals = (code: string) => {
    return journals.filter(j => j.items?.some(i => i.accountCode === code));
  };

  const periodLabel = `${MONTHS_PL[selectedMonth]} ${selectedYear}`;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight italic flex items-center gap-2">
            <Database className="text-indigo-600" size={20} /> Ksiega Glowna (General Ledger)
          </h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">Zapisy systematyczne — Obroty i salda</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Period selector */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2">
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent text-[10px] font-black uppercase tracking-widest text-slate-700 focus:outline-none appearance-none pr-5 cursor-pointer"
              >
                {MONTHS_PL.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <ChevronDown size={10} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-[10px] font-black uppercase tracking-widest text-slate-700 focus:outline-none appearance-none pr-5 cursor-pointer"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <ChevronDown size={10} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <button
            onClick={() => downloadCSV(accounts, periodLabel)}
            className="bg-white text-slate-500 px-6 py-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm"
          >
            <Download size={16} /> Eksport CSV
          </button>
        </div>
      </div>

      {/* Trial Balance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-4">
        <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-[100px]"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <Calculator className="text-indigo-400" size={20} />
              <span className="text-[11px] font-black uppercase tracking-widest text-indigo-200">Bilans Probny — {periodLabel}</span>
            </div>
            <div className="flex justify-between items-end gap-10">
              <div>
                <div className="text-5xl font-black tracking-tighter italic mb-2">
                  {totalWn.toLocaleString('pl-PL', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Suma Obrotow Wn / Ma</div>
              </div>
              <div className={`px-6 py-4 rounded-3xl border ${isBalanced ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-rose-500/20 border-rose-500/30'}`}>
                <div className="text-[9px] font-black uppercase mb-1">{isBalanced ? 'Status' : 'Blad'}</div>
                <div className={`text-lg font-black italic tracking-tighter uppercase leading-none ${isBalanced ? 'text-emerald-100' : 'text-rose-100'}`}>
                  {isBalanced ? 'Zbilansowano' : 'Rozbieznosc'}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
            <ArrowUpRight className="text-emerald-500 mb-4" size={24} />
            <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Laczne Aktywa</div>
            <div className="text-2xl font-black text-slate-900 italic tracking-tighter">
              {assets.toLocaleString('pl-PL', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
            <ArrowDownLeft className="text-rose-500 mb-4" size={24} />
            <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Laczne Pasywa</div>
            <div className="text-2xl font-black text-slate-900 italic tracking-tighter">
              {liabilities.toLocaleString('pl-PL', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Accounts table with grouping and drill-down */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Konto</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nazwa</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Obroty Wn</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Obroty Ma</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Saldo</th>
              <th className="px-8 py-5 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-20 text-center">
                  <Loader2 className="animate-spin text-indigo-500 mx-auto" size={32} />
                </td>
              </tr>
            ) : accounts.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-20 text-center text-slate-300">
                  <BookOpen size={48} className="mx-auto mb-4 opacity-10" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Brak danych w Ksiedze Glownej</span>
                </td>
              </tr>
            ) : (
              GROUP_ORDER.flatMap(cat => {
                const group = grouped[cat];
                if (!group || group.length === 0) return [];
                return [
                  // Group header row
                  <tr key={`group-${cat}`} className="bg-slate-900">
                    <td colSpan={6} className="px-8 py-3">
                      <span className="text-[10px] font-black text-white uppercase tracking-widest italic">
                        {GROUP_LABELS[cat]}
                      </span>
                    </td>
                  </tr>,
                  // Account rows
                  ...group.flatMap(acc => {
                    const balance = (acc.balanceWn || 0) - (acc.balanceMa || 0);
                    const absoluteBalance = Math.abs(balance);
                    const side = balance >= 0 ? 'Wn' : 'Ma';
                    const isExpanded = expandedAccount === acc.id;
                    const relatedJournals = getAccountJournals(acc.code);

                    return [
                      <tr
                        key={acc.id}
                        className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                        onClick={() => setExpandedAccount(isExpanded ? null : acc.id)}
                      >
                        <td className="px-8 py-5">
                          <span className="text-xs font-black text-slate-900 font-mono tracking-tighter bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 uppercase">
                            {acc.code}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-[11px] font-black uppercase text-slate-700 tracking-tight">{acc.name}</span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <span className={`text-[12px] font-black italic tracking-tighter ${(acc.balanceWn || 0) > 0 ? 'text-slate-900' : 'text-slate-300'}`}>
                            {(acc.balanceWn || 0).toLocaleString('pl-PL', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <span className={`text-[12px] font-black italic tracking-tighter ${(acc.balanceMa || 0) > 0 ? 'text-slate-900' : 'text-slate-300'}`}>
                            {(acc.balanceMa || 0).toLocaleString('pl-PL', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex flex-col items-end">
                            <span className={`text-sm font-black tracking-tighter italic ${balance > 0 ? 'text-emerald-600' : balance < 0 ? 'text-rose-600' : 'text-slate-300'}`}>
                              {absoluteBalance.toLocaleString('pl-PL', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{side}</span>
                          </div>
                        </td>
                        <td className="px-4 py-5 text-slate-400">
                          {relatedJournals.length > 0
                            ? (isExpanded ? <ChevronUp size={14} /> : <ChevronRight size={14} />)
                            : null
                          }
                        </td>
                      </tr>,
                      // Drill-down rows
                      ...(isExpanded && relatedJournals.length > 0 ? [
                        <tr key={`${acc.id}-drilldown`}>
                          <td colSpan={6} className="px-8 pb-4 pt-0 bg-indigo-50/40">
                            <div className="rounded-2xl border border-indigo-100 overflow-hidden">
                              <table className="w-full text-left">
                                <thead>
                                  <tr className="bg-indigo-50 border-b border-indigo-100">
                                    <th className="px-5 py-3 text-[9px] font-black text-indigo-400 uppercase tracking-widest">Data</th>
                                    <th className="px-5 py-3 text-[9px] font-black text-indigo-400 uppercase tracking-widest">Nr Dokumentu</th>
                                    <th className="px-5 py-3 text-[9px] font-black text-indigo-400 uppercase tracking-widest">Opis</th>
                                    <th className="px-5 py-3 text-[9px] font-black text-indigo-400 uppercase tracking-widest text-right">Kwota</th>
                                    <th className="px-5 py-3 text-[9px] font-black text-indigo-400 uppercase tracking-widest">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-indigo-50">
                                  {relatedJournals.map(j => (
                                    <tr key={j.id} className="hover:bg-indigo-50/60">
                                      <td className="px-5 py-3">
                                        <span className="text-[10px] font-black text-slate-600 italic">
                                          {j.date?.seconds ? new Date(j.date.seconds * 1000).toLocaleDateString('pl-PL') : '—'}
                                        </span>
                                      </td>
                                      <td className="px-5 py-3">
                                        <span className="text-[10px] font-black text-indigo-600 uppercase italic">{j.documentNumber}</span>
                                      </td>
                                      <td className="px-5 py-3">
                                        <span className="text-[10px] font-bold text-slate-700 uppercase max-w-xs block truncate">{j.description}</span>
                                      </td>
                                      <td className="px-5 py-3 text-right">
                                        <span className="text-[11px] font-black text-slate-800 italic">
                                          {(j.totalAmount ?? 0).toLocaleString('pl-PL', { minimumFractionDigits: 2 })}
                                        </span>
                                      </td>
                                      <td className="px-5 py-3">
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                                          j.status === 'posted' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                                        }`}>
                                          {j.status === 'posted' ? 'OK' : 'Draft'}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      ] : []),
                    ];
                  }),
                ];
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
