/**
 * Data: 2026-05-16
 * Ścieżka: /src/modules/finance/psd2/TransactionList.tsx
 */
import React, { useState, useEffect } from 'react';
import {
  ArrowUpRight, ArrowDownLeft, Search,
  CheckCircle2, AlertCircle, RefreshCw,
  Sparkles, MoreVertical, Loader2,
} from 'lucide-react';
import { motion } from 'motion/react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '../../../shared/hooks/AuthContext';

interface Transaction {
  id:               string;
  date:             string;
  counterpart:      string;
  title:            string;
  amount:           number;
  type:             'incoming' | 'outgoing';
  status:           'matched' | 'unmatched' | 'suggested';
  suggestedInvoice?: string;
  matchScore?:       number;
}

export default function TransactionList() {
  const { activeTenantId } = useAuth() as any;
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');

  const load = async () => {
    if (!activeTenantId) return;
    setLoading(true);
    try {
      const snap = await getDocs(query(
        collection(db, `tenants/${activeTenantId}/bankTransactions`),
        orderBy('date', 'desc'),
        limit(200),
      ));
      setTransactions(snap.docs.map(d => {
        const data = d.data();
        const amt  = data.amount ?? 0;
        return {
          id:               d.id,
          date:             data.date?.toDate?.()?.toLocaleDateString('pl-PL') ?? data.date ?? '—',
          counterpart:      data.counterpart ?? '—',
          title:            data.title ?? '—',
          amount:           amt,
          type:             data.type ?? (amt >= 0 ? 'incoming' : 'outgoing'),
          status:           data.status ?? 'unmatched',
          suggestedInvoice: data.suggestedInvoice,
          matchScore:       data.matchScore,
        } as Transaction;
      }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [activeTenantId]);

  const filtered = transactions.filter(tx =>
    !search ||
    tx.counterpart.toLowerCase().includes(search.toLowerCase()) ||
    tx.title.toLowerCase().includes(search.toLowerCase()) ||
    String(Math.abs(tx.amount)).includes(search)
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex-1 w-full relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Szukaj w historii (kontrahent, tytuł, kwota...)"
            className="w-full bg-slate-50 border-none rounded-2xl pl-16 pr-8 py-5 text-sm font-black uppercase italic tracking-tighter"
          />
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <button
            onClick={load}
            disabled={loading}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-50 text-slate-500 px-8 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-100 hover:bg-slate-100 transition-all"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-8 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">
            <Sparkles size={16} /> Auto-Match AI
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Informacje</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kontrahent / Tytuł</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kwota</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Powiązanie (NoFiCo Match)</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading && (
              <tr><td colSpan={5} className="px-8 py-12 text-center text-slate-400 text-sm">
                <Loader2 className="animate-spin inline mr-2" size={16} /> Ładowanie transakcji…
              </td></tr>
            )}
            {!loading && !filtered.length && (
              <tr><td colSpan={5} className="px-8 py-12 text-center text-slate-400 text-sm">
                {transactions.length === 0
                  ? 'Brak transakcji — zainicjuj połączenie bankowe przez moduł PSD2'
                  : 'Brak wyników dla podanej frazy'}
              </td></tr>
            )}
            {filtered.map(tx => (
              <motion.tr
                key={tx.id}
                whileHover={{ backgroundColor: 'rgba(248, 250, 252, 0.5)' }}
                className="group transition-colors"
              >
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-2xl ${tx.type === 'incoming' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {tx.type === 'incoming' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                    </div>
                    <div>
                      <div className="text-[11px] font-black text-slate-900 italic">{tx.date}</div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">ID: {tx.id.slice(0, 8)}</div>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="max-w-md">
                    <div className="text-[11px] font-black text-slate-900 uppercase tracking-tight mb-1 truncate">{tx.counterpart}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tight truncate leading-none italic">{tx.title}</div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className={`text-sm font-black tracking-tighter italic ${tx.amount > 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                    {tx.amount.toLocaleString('pl-PL', { minimumFractionDigits: 2, signDisplay: 'always' })} PLN
                  </div>
                </td>
                <td className="px-8 py-6">
                  {tx.status === 'matched' ? (
                    <div className="flex items-center gap-3 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl border border-emerald-100 w-fit">
                      <CheckCircle2 size={14} />
                      <span className="text-[10px] font-black uppercase tracking-tight italic">{tx.suggestedInvoice}</span>
                    </div>
                  ) : tx.status === 'suggested' ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-3 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl border border-indigo-100 w-fit">
                        <Sparkles size={14} className="animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-tight italic">{tx.suggestedInvoice}</span>
                        <span className="text-[9px] font-bold bg-indigo-200 px-1.5 rounded">{tx.matchScore}%</span>
                      </div>
                      <div className="flex gap-2">
                        <button className="text-[9px] font-black text-indigo-600 uppercase underline decoration-double">Potwierdź</button>
                        <span className="text-slate-300">|</span>
                        <button className="text-[9px] font-black text-slate-400 uppercase underline">Szukaj innej</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 bg-slate-50 text-slate-400 px-4 py-2 rounded-xl border border-slate-100 w-fit">
                      <AlertCircle size={14} />
                      <button className="text-[10px] font-black uppercase tracking-tight italic hover:text-indigo-600 transition-colors">Połącz z fakturą</button>
                    </div>
                  )}
                </td>
                <td className="px-8 py-6 text-right">
                  <button className="text-slate-200 hover:text-slate-500 transition-colors">
                    <MoreVertical size={20} />
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        {!loading && filtered.length > 0 && (
          <div className="px-8 py-4 border-t border-slate-100 text-[10px] text-slate-400 font-medium">
            {filtered.length} transakcji
          </div>
        )}
      </div>
    </div>
  );
}
