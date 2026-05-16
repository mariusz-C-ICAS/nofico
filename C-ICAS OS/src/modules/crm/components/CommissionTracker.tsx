import React, { useState, useEffect } from 'react';
import {
  BadgeDollarSign, RefreshCw, TrendingUp, Users,
  CheckCircle2, Clock, AlertTriangle, ChevronDown, ChevronUp, Download
} from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface Props { tenantId: string }

interface Deal {
  id: string;
  name?: string;
  customer?: string;
  value: number;
  stage: string;
  owner?: string;
  closedAt?: any;
  updatedAt?: any;
}

interface CommissionRule {
  minValue: number;
  maxValue: number | null;
  rate: number;
}

const DEFAULT_RULES: CommissionRule[] = [
  { minValue: 0, maxValue: 10000, rate: 5 },
  { minValue: 10000, maxValue: 50000, rate: 7 },
  { minValue: 50000, maxValue: null, rate: 10 },
];

function computeCommission(value: number, rules: CommissionRule[]): number {
  const rule = rules.find(r => value >= r.minValue && (r.maxValue === null || value < r.maxValue))
    ?? rules[rules.length - 1];
  return Math.round((value * rule.rate) / 100 * 100) / 100;
}

function fmtDate(ts: any): string {
  const d = ts?.toDate?.() ?? (ts ? new Date(ts) : null);
  if (!d) return '—';
  return d.toLocaleDateString('pl-PL');
}

function periodLabel(p: string): string {
  const [y, m] = p.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
}

function getMonths(deals: Deal[]): string[] {
  const set = new Set<string>();
  deals.forEach(d => {
    const dt = d.closedAt?.toDate?.() ?? d.updatedAt?.toDate?.();
    if (dt) set.add(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`);
  });
  return Array.from(set).sort().reverse();
}

export default function CommissionTracker({ tenantId }: Props) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [expandedOwner, setExpandedOwner] = useState<string | null>(null);
  const [rules] = useState<CommissionRule[]>(DEFAULT_RULES);

  const load = async () => {
    setLoading(true);
    const snap = await getDocs(query(collection(db, 'deals'), where('tenantId', '==', tenantId)));
    const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Deal));
    const won = all.filter(d => d.stage === 'closed_won');
    setDeals(won);
    const months = getMonths(won);
    if (months.length > 0) setSelectedPeriod(months[0]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [tenantId]);

  const months = getMonths(deals);

  const periodDeals = deals.filter(d => {
    if (!selectedPeriod) return true;
    const dt = d.closedAt?.toDate?.() ?? d.updatedAt?.toDate?.();
    if (!dt) return false;
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    return key === selectedPeriod;
  });

  const byOwner: Record<string, { deals: (Deal & { commission: number })[]; totalValue: number; totalCommission: number }> = {};
  periodDeals.forEach(d => {
    const owner = d.owner || 'Nieprzypisany';
    if (!byOwner[owner]) byOwner[owner] = { deals: [], totalValue: 0, totalCommission: 0 };
    const commission = computeCommission(d.value ?? 0, rules);
    byOwner[owner].deals.push({ ...d, commission });
    byOwner[owner].totalValue += d.value ?? 0;
    byOwner[owner].totalCommission += commission;
  });

  const ownerList = Object.entries(byOwner).sort((a, b) => b[1].totalCommission - a[1].totalCommission);
  const totalCommission = ownerList.reduce((s, [, v]) => s + v.totalCommission, 0);
  const totalRevenue = ownerList.reduce((s, [, v]) => s + v.totalValue, 0);
  const fmt = (n: number) => n.toLocaleString('pl-PL', { maximumFractionDigits: 0 });

  const exportCSV = () => {
    const rows = [['Handlowiec', 'Deal', 'Wartość', 'Prowizja %', 'Prowizja PLN', 'Data']];
    ownerList.forEach(([owner, data]) => {
      data.deals.forEach(d => {
        const rule = rules.find(r => (d.value ?? 0) >= r.minValue && (r.maxValue === null || (d.value ?? 0) < r.maxValue)) ?? rules[rules.length - 1];
        rows.push([owner, d.name || d.customer || d.id, String(d.value ?? 0), String(rule.rate) + '%', String(d.commission), fmtDate(d.closedAt ?? d.updatedAt)]);
      });
    });
    const csv = '﻿' + rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `prowizje_${selectedPeriod}.csv`; a.click();
  };

  if (loading) return <div className="flex justify-center py-20"><RefreshCw size={20} className="animate-spin text-indigo-400" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Prowizje Handlowców</h3>
          <p className="text-xs text-slate-500 mt-0.5">Na podstawie dealów closed_won</p>
        </div>
        <div className="flex gap-3">
          <select value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black outline-none">
            <option value="">Wszystkie okresy</option>
            {months.map(m => <option key={m} value={m}>{periodLabel(m)}</option>)}
          </select>
          <button onClick={exportCSV}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs px-4 py-2.5 rounded-xl transition-all">
            <Download size={13} /> CSV
          </button>
        </div>
      </div>

      {/* Commission rules info */}
      <div className="bg-indigo-50 rounded-2xl border border-indigo-200 p-4">
        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2">Tabela prowizji</p>
        <div className="flex flex-wrap gap-4">
          {rules.map(r => (
            <div key={r.minValue} className="text-[10px] font-black text-indigo-700">
              {fmt(r.minValue)} – {r.maxValue !== null ? fmt(r.maxValue) : '∞'} PLN → {r.rate}%
            </div>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Łączna prowizja', value: fmt(totalCommission) + ' PLN', icon: BadgeDollarSign, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
          { label: 'Przychód ze sprzedaży', value: fmt(totalRevenue) + ' PLN', icon: TrendingUp, color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
          { label: 'Handlowców', value: String(ownerList.length), icon: Users, color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
        ].map(k => (
          <div key={k.label} className={`rounded-2xl border p-5 ${k.bg}`}>
            <k.icon size={16} className={`${k.color} mb-2`} />
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{k.label}</p>
            <p className={`text-2xl font-black mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Per-owner breakdown */}
      {ownerList.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">Brak wygranych dealów w wybranym okresie</div>
      ) : (
        <div className="space-y-3">
          {ownerList.map(([owner, data], idx) => {
            const isExp = expandedOwner === owner;
            const share = totalCommission > 0 ? (data.totalCommission / totalCommission) * 100 : 0;
            return (
              <div key={owner} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="flex items-center gap-4 px-5 py-4 cursor-pointer" onClick={() => setExpandedOwner(isExp ? null : owner)}>
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-black text-indigo-700">
                    #{idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-900">{owner}</p>
                    <div className="mt-1.5 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${share}%` }} />
                    </div>
                    <p className="text-[9px] text-slate-500 mt-0.5">{data.deals.length} dealów · {fmt(data.totalValue)} PLN obrotu</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-black text-emerald-700">{fmt(data.totalCommission)} PLN</p>
                    <p className="text-[9px] text-slate-400">{share.toFixed(0)}% puli</p>
                  </div>
                  {isExp ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                </div>

                {isExp && (
                  <div className="border-t border-slate-100 px-5 pb-4 pt-3 space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Deale</p>
                    {data.deals.map(d => (
                      <div key={d.id} className="flex items-center gap-3 text-xs text-slate-700">
                        <CheckCircle2 size={12} className="text-emerald-500 flex-shrink-0" />
                        <span className="flex-1 truncate">{d.name || d.customer || 'Deal'}</span>
                        <span className="text-slate-400">{fmtDate(d.closedAt ?? d.updatedAt)}</span>
                        <span className="font-black text-slate-700">{fmt(d.value ?? 0)} PLN</span>
                        <span className="font-black text-emerald-700">+{fmt(d.commission)} PLN</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
