import React, { useState, useEffect, useMemo } from 'react';
import {
  BookText, Plus, Search, Filter, Download, Calendar,
  CheckCircle2, AlertCircle, Loader2, Printer, ChevronDown, X
} from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import {
  collection, query, onSnapshot, orderBy, where,
  getDocs, updateDoc, doc, Timestamp
} from 'firebase/firestore';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import JournalEntryModal from './JournalEntryModal';

interface JournalEntry {
  id: string;
  date: any;
  documentNumber: string;
  description: string;
  items: {
    accountId: string;
    accountCode: string;
    debit: number;
    credit: number;
    side: 'Wn' | 'Ma';
  }[];
  totalAmount: number;
  status: 'posted' | 'draft' | 'reversed';
  createdBy: string;
}

type StatusFilter = 'all' | 'posted' | 'draft';

const MONTHS_PL = [
  'Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec',
  'Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'
];

function downloadCSV(entries: JournalEntry[]) {
  const header = 'Nr dokumentu;Data;Opis;Suma PLN\n';
  const rows = entries.map(e => {
    const date = e.date?.seconds
      ? new Date(e.date.seconds * 1000).toLocaleDateString('pl-PL')
      : '';
    const amount = (e.totalAmount ?? 0).toFixed(2);
    const desc = (e.description ?? '').replace(/;/g, ',');
    return `${e.documentNumber};${date};${desc};${amount}`;
  }).join('\n');
  const blob = new Blob(['﻿' + header + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dziennik-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Journal() {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [closingMonth, setClosingMonth] = useState(false);

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  useEffect(() => {
    if (!activeTenantId) return;

    const start = new Date(selectedYear, selectedMonth, 1);
    const end = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);

    const journalPath = `tenants/${activeTenantId}/journals`;
    const q = query(
      collection(db, journalPath),
      where('date', '>=', Timestamp.fromDate(start)),
      where('date', '<=', Timestamp.fromDate(end)),
      orderBy('date', 'desc')
    );

    setLoading(true);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: JournalEntry[] = [];
      snapshot.forEach(d => data.push({ id: d.id, ...d.data() } as JournalEntry));
      setEntries(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activeTenantId, selectedMonth, selectedYear]);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return entries;
    return entries.filter(e => e.status === statusFilter);
  }, [entries, statusFilter]);

  const stats = useMemo(() => {
    const totalAmount = entries.reduce((s, e) => s + (e.totalAmount ?? 0), 0);
    const drafts = entries.filter(e => e.status === 'draft');
    const draftAmount = drafts.reduce((s, e) => s + (e.totalAmount ?? 0), 0);
    return { totalAmount, draftAmount, draftCount: drafts.length };
  }, [entries]);

  const handleCloseMonth = async () => {
    if (!activeTenantId) return;
    const drafts = entries.filter(e => e.status === 'draft');
    if (drafts.length === 0) return;
    if (!window.confirm(`Czy na pewno chcesz zatwierdzić ${drafts.length} dekret(ów) za ${MONTHS_PL[selectedMonth]} ${selectedYear}?`)) return;

    setClosingMonth(true);
    try {
      await Promise.all(
        drafts.map(e =>
          updateDoc(doc(db, `tenants/${activeTenantId}/journals/${e.id}`), { status: 'posted' })
        )
      );
    } finally {
      setClosingMonth(false);
    }
  };

  const periodLabel = `${MONTHS_PL[selectedMonth]} ${selectedYear}`;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight italic flex items-center gap-2">
            <BookText className="text-indigo-600" size={20} /> Dziennik Ksiegowań
          </h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">Chronologiczny zapis zdarzeń gospodarczych</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => downloadCSV(filtered)}
            className="bg-white text-slate-500 px-5 py-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm"
          >
            <Download size={14} /> Export CSV
          </button>
          <button className="bg-white text-slate-500 px-5 py-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm">
            <Printer size={14} /> Drukuj
          </button>
          <button
            onClick={handleCloseMonth}
            disabled={closingMonth || stats.draftCount === 0}
            className="bg-amber-500 text-white px-5 py-3 rounded-xl shadow-md hover:bg-amber-600 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {closingMonth ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Zamknij Miesiąc
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-slate-900 text-white px-6 py-3 rounded-xl shadow-xl hover:bg-indigo-600 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
          >
            <Plus size={16} /> Nowy Dekret
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-indigo-600 rounded-[2rem] p-8 text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4 opacity-70">
              <CheckCircle2 size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Obroty — {periodLabel}</span>
            </div>
            <div className="text-3xl font-black tracking-tighter italic mb-1">
              {stats.totalAmount.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest opacity-60">Suma zapisów Wn/Ma</div>
          </div>
        </div>
        <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4 text-slate-400">
              <AlertCircle size={16} className="text-amber-500" />
              <span className="text-[10px] font-black uppercase tracking-widest">Oczekujące (Draft)</span>
            </div>
            <div className="text-3xl font-black tracking-tighter italic mb-1 text-slate-900">
              {stats.draftAmount.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {stats.draftCount} {stats.draftCount === 1 ? 'dekret' : stats.draftCount < 5 ? 'dekrety' : 'dekretów'} do zatwierdzenia
            </div>
          </div>
        </div>
        <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100 relative overflow-hidden border-dashed">
          <div className="relative z-10 flex flex-col justify-center h-full">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 italic">Zautomatyzowane księgowanie</div>
            <button className="bg-indigo-50 text-indigo-600 font-black py-3 px-6 rounded-xl text-[10px] uppercase tracking-widest self-start border border-indigo-100 hover:bg-white transition-all">
              Synchronizuj z KSeF
            </button>
          </div>
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 flex flex-wrap items-center gap-4 bg-slate-50/30">
          {/* Period selector */}
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-slate-400" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Okres:</span>
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700 focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
              >
                {MONTHS_PL.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700 focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="w-px h-4 bg-slate-200 hidden md:block"></div>

          {/* Status filter */}
          <div className="flex gap-1">
            {(['all', 'posted', 'draft'] as StatusFilter[]).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                  statusFilter === s
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                }`}
              >
                {s === 'all' ? 'Wszystkie' : s === 'posted' ? 'Zatwierdzone' : 'Draft'}
              </button>
            ))}
          </div>

          <div className="ml-auto text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
            {filtered.length} wpisów
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Poz / Dokument</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Opis operacji</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Konto Wn</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Konto Ma</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Suma</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-slate-300">
                    <Loader2 className="animate-spin text-indigo-500 mx-auto mb-4" size={32} />
                    <span className="text-[10px] font-black uppercase tracking-widest italic">Pobieram dziennik...</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-slate-300">
                    <BookText size={48} className="mx-auto mb-4 opacity-20" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Dziennik jest pusty w tym okresie</span>
                  </td>
                </tr>
              ) : (
                filtered.map((entry, idx) => (
                  <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5 align-top">
                      <span className="text-[11px] font-black text-slate-700 italic">
                        {entry.date?.seconds
                          ? new Date(entry.date.seconds * 1000).toLocaleDateString('pl-PL')
                          : '—'}
                      </span>
                    </td>
                    <td className="px-8 py-5 align-top">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">POZ. {filtered.length - idx}</span>
                        <span className="text-[11px] font-black text-indigo-600 uppercase tracking-tighter leading-none italic">{entry.documentNumber}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 align-top">
                      <span className="text-[11px] font-bold text-slate-800 uppercase leading-relaxed max-w-xs block">{entry.description}</span>
                    </td>
                    <td className="px-8 py-5 align-top">
                      {entry.items?.filter(i => i.side === 'Wn').map((i, j) => (
                        <div key={j} className="flex flex-col gap-1 mb-2 last:mb-0">
                          <span className="text-[11px] font-black text-slate-800">{i.accountCode}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Wn</span>
                        </div>
                      ))}
                    </td>
                    <td className="px-8 py-5 align-top">
                      {entry.items?.filter(i => i.side === 'Ma').map((i, j) => (
                        <div key={j} className="flex flex-col gap-1 mb-2 last:mb-0">
                          <span className="text-[11px] font-black text-slate-800">{i.accountCode}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Ma</span>
                        </div>
                      ))}
                    </td>
                    <td className="px-8 py-5 align-top text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[13px] font-black text-slate-900 tracking-tighter italic">
                          {(entry.totalAmount ?? 0).toLocaleString('pl-PL', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[9px] font-black text-slate-400 uppercase">PLN</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 align-top">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                        entry.status === 'posted' ? 'bg-emerald-100 text-emerald-600' :
                        entry.status === 'draft' ? 'bg-amber-100 text-amber-600' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {entry.status === 'posted' ? 'Zatwierdzone' : entry.status === 'draft' ? 'Draft' : 'Cofnięte'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && <JournalEntryModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}
