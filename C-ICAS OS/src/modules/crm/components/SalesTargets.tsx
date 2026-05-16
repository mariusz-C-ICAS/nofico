import React, { useState, useEffect } from 'react';
import { Target, Plus, Trash2, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import {
  collection, query, where, onSnapshot, addDoc, deleteDoc,
  doc, getDocs, serverTimestamp
} from 'firebase/firestore';

interface Props { tenantId: string }

interface SalesTarget {
  id: string;
  tenantId: string;
  period: string;        // 'YYYY-MM' or 'YYYY-QN'
  periodType: 'month' | 'quarter';
  targetRevenue: number;
  targetDeals: number;
  currency: string;
  createdAt: any;
}

interface ActualData {
  revenue: number;
  deals: number;
}

function periodLabel(p: string, type: 'month' | 'quarter'): string {
  if (type === 'month') {
    const [y, m] = p.split('-');
    return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
  }
  const [y, q] = p.split('-Q');
  return `Q${q} ${y}`;
}

function currentPeriods(): { month: string; quarter: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return { month: `${y}-${m}`, quarter: `${y}-Q${q}` };
}

export default function SalesTargets({ tenantId }: Props) {
  const [targets, setTargets] = useState<SalesTarget[]>([]);
  const [actuals, setActuals] = useState<Record<string, ActualData>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    periodType: 'month' as 'month' | 'quarter',
    period: currentPeriods().month,
    targetRevenue: '',
    targetDeals: '',
    currency: 'PLN',
  });

  useEffect(() => {
    return onSnapshot(
      query(collection(db, `tenants/${tenantId}/salesTargets`), where('tenantId', '==', tenantId)),
      snap => {
        setTargets(snap.docs.map(d => ({ id: d.id, ...d.data() } as SalesTarget)));
        setLoading(false);
      }
    );
  }, [tenantId]);

  // Compute actuals from deals closed in period
  useEffect(() => {
    if (targets.length === 0) return;
    getDocs(query(collection(db, 'deals'), where('tenantId', '==', tenantId))).then(snap => {
      const deals = snap.docs.map(d => d.data());
      const result: Record<string, ActualData> = {};
      targets.forEach(t => {
        const [y, rest] = t.period.split('-');
        const isQ = rest?.startsWith('Q');
        const q = isQ ? parseInt(rest.slice(1)) : null;
        const m = !isQ ? parseInt(rest) : null;
        let revenue = 0, count = 0;
        deals.filter(d => d.stage === 'closed_won').forEach(d => {
          const date = d.closedAt?.toDate?.() ?? (d.updatedAt?.toDate?.());
          if (!date) return;
          const dy = date.getFullYear(), dm = date.getMonth() + 1;
          const dq = Math.ceil(dm / 3);
          const match = isQ
            ? dy === parseInt(y) && dq === q
            : dy === parseInt(y) && dm === m;
          if (match) { revenue += d.value ?? 0; count++; }
        });
        result[t.period] = { revenue, deals: count };
      });
      setActuals(result);
    });
  }, [targets, tenantId]);

  const handleSave = async () => {
    if (!form.targetRevenue || !form.period) return;
    setSaving(true);
    await addDoc(collection(db, `tenants/${tenantId}/salesTargets`), {
      tenantId,
      period: form.period,
      periodType: form.periodType,
      targetRevenue: parseFloat(form.targetRevenue) || 0,
      targetDeals: parseInt(form.targetDeals) || 0,
      currency: form.currency,
      createdAt: serverTimestamp(),
    });
    setShowForm(false);
    setForm(p => ({ ...p, targetRevenue: '', targetDeals: '' }));
    setSaving(false);
  };

  const fmt = (n: number) => n.toLocaleString('pl-PL', { maximumFractionDigits: 0 });
  const pct = (actual: number, target: number) => target > 0 ? Math.round((actual / target) * 100) : 0;

  const { month: curMonth, quarter: curQ } = currentPeriods();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Cele Sprzedażowe</h3>
          <p className="text-xs text-slate-500 mt-0.5">Targets miesięczne i kwartalne vs realizacja</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black px-5 py-2.5 rounded-2xl text-xs uppercase tracking-widest">
          <Plus size={13} /> Nowy cel
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Typ okresu</p>
              <select value={form.periodType}
                onChange={e => {
                  const t = e.target.value as 'month' | 'quarter';
                  setForm(p => ({ ...p, periodType: t, period: t === 'month' ? curMonth : curQ }));
                }}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                <option value="month">Miesiąc</option>
                <option value="quarter">Kwartał</option>
              </select>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Okres</p>
              {form.periodType === 'month' ? (
                <input type="month" value={form.period} onChange={e => setForm(p => ({ ...p, period: e.target.value }))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
              ) : (
                <select value={form.period} onChange={e => setForm(p => ({ ...p, period: e.target.value }))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                  {[1, 2, 3, 4].map(q => {
                    const y = new Date().getFullYear();
                    return <option key={q} value={`${y}-Q${q}`}>Q{q} {y}</option>;
                  })}
                </select>
              )}
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Cel przychód (PLN)</p>
              <input type="number" value={form.targetRevenue} onChange={e => setForm(p => ({ ...p, targetRevenue: e.target.value }))}
                placeholder="np. 100000"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Cel liczba dealów</p>
              <input type="number" value={form.targetDeals} onChange={e => setForm(p => ({ ...p, targetDeals: e.target.value }))}
                placeholder="np. 10"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="text-xs font-bold text-slate-400 px-3 py-1.5">Anuluj</button>
            <button onClick={handleSave} disabled={saving || !form.targetRevenue}
              className="flex items-center gap-1.5 bg-indigo-600 disabled:opacity-40 text-white font-black text-xs px-5 py-2 rounded-xl">
              {saving && <RefreshCw size={10} className="animate-spin" />} Zapisz cel
            </button>
          </div>
        </div>
      )}

      {loading && <div className="flex justify-center py-10"><RefreshCw size={20} className="animate-spin text-indigo-400" /></div>}

      <div className="space-y-4">
        {targets.map(t => {
          const actual = actuals[t.period] ?? { revenue: 0, deals: 0 };
          const revPct = pct(actual.revenue, t.targetRevenue);
          const dealPct = pct(actual.deals, t.targetDeals);
          const isCurrent = t.period === curMonth || t.period === curQ;
          const overRevenue = actual.revenue >= t.targetRevenue;
          const Icon = revPct > 100 ? TrendingUp : revPct < 50 ? TrendingDown : Minus;
          const iconColor = revPct > 100 ? 'text-emerald-600' : revPct < 50 ? 'text-red-500' : 'text-amber-500';
          return (
            <div key={t.id} className={`rounded-2xl border overflow-hidden ${isCurrent ? 'border-indigo-300' : 'border-slate-200'}`}>
              <div className={`px-5 py-3 flex items-center gap-3 ${isCurrent ? 'bg-indigo-50' : 'bg-slate-50'} border-b ${isCurrent ? 'border-indigo-200' : 'border-slate-200'}`}>
                <Icon size={16} className={iconColor} />
                <div className="flex-1">
                  <p className="text-sm font-black text-slate-800">
                    {periodLabel(t.period, t.periodType)}
                    {isCurrent && <span className="ml-2 text-[8px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded-full">Bieżący</span>}
                  </p>
                </div>
                <button onClick={() => deleteDoc(doc(db, `tenants/${tenantId}/salesTargets`, t.id))}
                  className="p-1 text-slate-300 hover:text-red-500">
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="px-5 py-4 grid grid-cols-2 gap-6">
                {/* Revenue */}
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-1.5">
                    <span>Przychód</span>
                    <span className={overRevenue ? 'text-emerald-600' : 'text-slate-700'}>
                      {fmt(actual.revenue)} / {fmt(t.targetRevenue)} PLN
                    </span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${revPct >= 100 ? 'bg-emerald-500' : revPct >= 70 ? 'bg-amber-400' : 'bg-red-400'}`}
                      style={{ width: `${Math.min(revPct, 100)}%` }} />
                  </div>
                  <p className={`text-[9px] font-black mt-1 ${revPct >= 100 ? 'text-emerald-600' : 'text-slate-500'}`}>{revPct}%</p>
                </div>
                {/* Deals */}
                {t.targetDeals > 0 && (
                  <div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-1.5">
                      <span>Deale</span>
                      <span>{actual.deals} / {t.targetDeals}</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${dealPct >= 100 ? 'bg-emerald-500' : dealPct >= 70 ? 'bg-amber-400' : 'bg-red-400'}`}
                        style={{ width: `${Math.min(dealPct, 100)}%` }} />
                    </div>
                    <p className={`text-[9px] font-black mt-1 ${dealPct >= 100 ? 'text-emerald-600' : 'text-slate-500'}`}>{dealPct}%</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {!loading && targets.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-8">Brak zdefiniowanych celów. Dodaj pierwszy cel sprzedażowy.</p>
        )}
      </div>
    </div>
  );
}
