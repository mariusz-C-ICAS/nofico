import React, { useState, useEffect, useMemo } from 'react';
import { Filter, Tag, X, Building2, TrendingUp, RefreshCw, Users } from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { computeLeadScore, scoreLabel } from '../services/leadScoringService';
import type { CustomerStatus } from '../types';

interface Props {
  tenantId: string;
  onSelectCustomer?: (cust: any) => void;
}

interface ActiveFilter {
  type: 'status' | 'tag' | 'score' | 'industry' | 'revenue';
  value: string;
  label: string;
}

const STATUS_LABELS: Record<CustomerStatus, string> = {
  prospect: 'Prospect', active: 'Aktywny', churned: 'Utracony', blocked: 'Zablokowany',
};
const STATUS_COLOR: Record<CustomerStatus, string> = {
  prospect: 'bg-amber-100 text-amber-700 border-amber-200',
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  churned: 'bg-slate-100 text-slate-500 border-slate-200',
  blocked: 'bg-red-100 text-red-700 border-red-200',
};

export default function SegmentView({ tenantId, onSelectCustomer }: Props) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ActiveFilter[]>([]);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (!tenantId) return;
    const q = query(collection(db, 'customers'), where('tenantId', '==', tenantId));
    return onSnapshot(q, snap => {
      setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, [tenantId]);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    customers.forEach(c => (c.tags ?? []).forEach((t: string) => s.add(t)));
    return Array.from(s).sort();
  }, [customers]);

  const allIndustries = useMemo(() => {
    const s = new Set<string>();
    customers.forEach(c => c.industry && s.add(c.industry));
    return Array.from(s).sort();
  }, [customers]);

  const addFilter = (f: ActiveFilter) => {
    if (!filters.find(x => x.type === f.type && x.value === f.value)) {
      setFilters(p => [...p, f]);
    }
  };
  const removeFilter = (f: ActiveFilter) =>
    setFilters(p => p.filter(x => !(x.type === f.type && x.value === f.value)));

  const filtered = useMemo(() => {
    return customers.filter(c => {
      const score = computeLeadScore({
        lastActivityMs: c.lastActivityAt?.toDate?.()?.getTime() ?? 0,
        totalRevenue: c.totalRevenue ?? 0,
        hasActiveDeal: false,
        serviceEventCount: c.serviceEventCount ?? 0,
        activityCount30Days: 0,
      }).total;

      return filters.every(f => {
        if (f.type === 'status') return c.status === f.value;
        if (f.type === 'tag') return (c.tags ?? []).includes(f.value);
        if (f.type === 'industry') return c.industry === f.value;
        if (f.type === 'revenue') {
          const r = c.totalRevenue ?? 0;
          if (f.value === '0') return r === 0;
          if (f.value === '1k') return r > 0 && r < 10000;
          if (f.value === '10k') return r >= 10000 && r < 100000;
          if (f.value === '100k') return r >= 100000;
        }
        if (f.type === 'score') {
          if (f.value === 'hot') return score >= 70;
          if (f.value === 'warm') return score >= 40 && score < 70;
          if (f.value === 'cold') return score < 40;
        }
        return true;
      });
    });
  }, [customers, filters]);

  const handleTagSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      addFilter({ type: 'tag', value: tagInput.trim(), label: `Tag: ${tagInput.trim()}` });
      setTagInput('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Segmentacja Klientów</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {filtered.length} z {customers.length} klientów · filtry dynamiczne
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
        <div className="flex flex-wrap gap-2">
          {/* Status */}
          {(Object.entries(STATUS_LABELS) as [CustomerStatus, string][]).map(([k, v]) => (
            <button key={k} onClick={() => addFilter({ type: 'status', value: k, label: `Status: ${v}` })}
              className="text-[9px] font-black px-2 py-1 rounded-full border bg-white hover:bg-slate-100 transition-colors">
              {v}
            </button>
          ))}
          <span className="text-[9px] text-slate-300 self-center">|</span>
          {/* Lead score */}
          {[{ v: 'hot', l: 'Gorący (≥70)' }, { v: 'warm', l: 'Ciepły (40-69)' }, { v: 'cold', l: 'Zimny (<40)' }].map(s => (
            <button key={s.v} onClick={() => addFilter({ type: 'score', value: s.v, label: `Score: ${s.l}` })}
              className="text-[9px] font-black px-2 py-1 rounded-full border bg-white hover:bg-slate-100 transition-colors">
              {s.l}
            </button>
          ))}
          <span className="text-[9px] text-slate-300 self-center">|</span>
          {/* Revenue */}
          {[{ v: '0', l: 'Brak przychodu' }, { v: '1k', l: '<10k PLN' }, { v: '10k', l: '10k-100k' }, { v: '100k', l: '≥100k PLN' }].map(r => (
            <button key={r.v} onClick={() => addFilter({ type: 'revenue', value: r.v, label: `Przychód: ${r.l}` })}
              className="text-[9px] font-black px-2 py-1 rounded-full border bg-white hover:bg-slate-100 transition-colors">
              {r.l}
            </button>
          ))}
        </div>

        {/* Tag search */}
        <div className="flex gap-2">
          <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleTagSearch}
            placeholder="Szukaj po tagu (Enter aby dodać filtr)..."
            className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none" />
          <div className="flex flex-wrap gap-1">
            {allTags.slice(0, 8).map(t => (
              <button key={t} onClick={() => addFilter({ type: 'tag', value: t, label: `Tag: ${t}` })}
                className="text-[9px] font-black px-2 py-1 rounded-full border bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100">
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Industry */}
        {allIndustries.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {allIndustries.map(ind => (
              <button key={ind} onClick={() => addFilter({ type: 'industry', value: ind, label: `Branża: ${ind}` })}
                className="text-[9px] font-black px-2 py-1 rounded-full border bg-white text-slate-600 hover:bg-slate-100">
                {ind}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Active filters */}
      {filters.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Aktywne filtry:</span>
          {filters.map(f => (
            <span key={`${f.type}-${f.value}`}
              className="flex items-center gap-1 text-[9px] font-black bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">
              {f.label}
              <button onClick={() => removeFilter(f)}><X size={8} /></button>
            </span>
          ))}
          <button onClick={() => setFilters([])} className="text-[9px] text-red-500 font-black hover:underline">Wyczyść</button>
        </div>
      )}

      {loading && <div className="flex justify-center py-10"><RefreshCw size={20} className="animate-spin text-indigo-400" /></div>}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-10 text-slate-400">
          <Users size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-xs font-black uppercase tracking-widest">Brak klientów spełniających kryteria</p>
        </div>
      )}

      {/* Results */}
      <div className="space-y-2">
        {filtered.map(c => {
          const score = computeLeadScore({
            lastActivityMs: c.lastActivityAt?.toDate?.()?.getTime() ?? 0,
            totalRevenue: c.totalRevenue ?? 0,
            hasActiveDeal: false,
            serviceEventCount: c.serviceEventCount ?? 0,
            activityCount30Days: 0,
          }).total;
          const sl = scoreLabel(score);
          const st = (c.status as CustomerStatus) ?? 'prospect';
          return (
            <div key={c.id}
              onClick={() => onSelectCustomer?.(c)}
              className={`flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-200 transition-all ${onSelectCustomer ? 'cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30' : ''}`}>
              <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center flex-shrink-0 border border-slate-100">
                <Building2 size={16} className="text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-slate-900 truncate">{c.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{c.industry ?? ''} {c.city ? `· ${c.city}` : ''}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border ${STATUS_COLOR[st]}`}>
                  {STATUS_LABELS[st]}
                </span>
                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${sl.bg} ${sl.color}`}>
                  {score} · {sl.label}
                </span>
                {(c.tags ?? []).slice(0, 2).map((t: string) => (
                  <span key={t} className="text-[8px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {t}
                  </span>
                ))}
                {(c.totalRevenue ?? 0) > 0 && (
                  <span className="text-[8px] font-black text-emerald-700 flex items-center gap-0.5">
                    <TrendingUp size={9} />{(c.totalRevenue as number).toLocaleString('pl-PL')} PLN
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
