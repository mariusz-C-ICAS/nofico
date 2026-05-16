import React, { useState, useEffect, useMemo } from 'react';
import { BarChart2, RefreshCw, User, Phone, Mail, Users, Calendar, TrendingUp } from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { ActivityType } from '../types';
import { ACTIVITY_META } from '../types';

interface Props { tenantId: string }

interface UserStat {
  email: string;
  uid: string;
  counts: Partial<Record<ActivityType, number>>;
  total: number;
  lastActivity?: Date;
}

const PERIODS = [
  { label: '7 dni',    days: 7 },
  { label: '30 dni',   days: 30 },
  { label: '90 dni',   days: 90 },
  { label: 'Wszystko', days: 0 },
];

export default function SalesActivityReport({ tenantId }: Props) {
  const [stats, setStats] = useState<UserStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState(30);
  const [typeFilter, setTypeFilter] = useState<ActivityType | 'all'>('all');

  const load = async () => {
    setLoading(true);
    const cutoff = period > 0 ? new Date(Date.now() - period * 86400000) : null;
    const snap = await getDocs(
      query(collection(db, `tenants/${tenantId}/crmActivities`), where('tenantId', '==', tenantId))
    );
    const activities = snap.docs.map(d => d.data());
    const byUser: Record<string, UserStat> = {};

    activities.forEach(a => {
      const createdAt = a.createdAt?.toDate?.() ?? null;
      if (cutoff && createdAt && createdAt < cutoff) return;
      if (typeFilter !== 'all' && a.type !== typeFilter) return;
      const uid = a.createdBy ?? 'unknown';
      const email = a.createdByEmail ?? uid;
      if (!byUser[uid]) byUser[uid] = { email, uid, counts: {}, total: 0 };
      byUser[uid].counts[a.type as ActivityType] = (byUser[uid].counts[a.type as ActivityType] ?? 0) + 1;
      byUser[uid].total++;
      if (createdAt && (!byUser[uid].lastActivity || createdAt > byUser[uid].lastActivity!)) {
        byUser[uid].lastActivity = createdAt;
      }
    });

    setStats(Object.values(byUser).sort((a, b) => b.total - a.total));
    setLoading(false);
  };

  useEffect(() => { load(); }, [tenantId, period, typeFilter]);

  const totalActivities = useMemo(() => stats.reduce((s, u) => s + u.total, 0), [stats]);

  const ACTIVITY_TYPES: ActivityType[] = ['call', 'email', 'meeting', 'note', 'follow_up' as any, 'quote_sent'];

  const fmtDate = (d?: Date) => d ? d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' }) : '—';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Raport Aktywności Handlowca</h3>
          <p className="text-xs text-slate-500 mt-0.5">{totalActivities} aktywności · {stats.length} handlowców</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-black text-xs uppercase tracking-widest">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Odśwież
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl">
          {PERIODS.map(p => (
            <button key={p.days} onClick={() => setPeriod(p.days)}
              className={`text-[9px] font-black px-3 py-1.5 rounded-xl transition-all ${
                period === p.days ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:text-slate-700'
              }`}>{p.label}</button>
          ))}
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none">
          <option value="all">Wszystkie typy</option>
          {ACTIVITY_TYPES.map(t => (
            <option key={t} value={t}>{ACTIVITY_META[t]?.label ?? t}</option>
          ))}
        </select>
      </div>

      {loading && <div className="flex justify-center py-10"><RefreshCw size={20} className="animate-spin text-indigo-400" /></div>}

      {!loading && stats.length === 0 && (
        <div className="text-center py-10 text-slate-400">
          <BarChart2 size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-xs font-black uppercase tracking-widest">Brak aktywności w tym okresie</p>
        </div>
      )}

      {/* Summary bar */}
      {!loading && stats.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Łącznie aktywności', val: totalActivities, icon: TrendingUp, color: 'text-indigo-700 bg-indigo-50' },
            { label: 'Handlowcy aktywni', val: stats.length, icon: Users, color: 'text-emerald-700 bg-emerald-50' },
            { label: 'Śr. na handlowca', val: stats.length > 0 ? Math.round(totalActivities / stats.length) : 0, icon: BarChart2, color: 'text-amber-700 bg-amber-50' },
          ].map(({ label, val, icon: Icon, color }) => (
            <div key={label} className={`rounded-2xl p-4 border border-slate-200 ${color.split(' ')[1]}`}>
              <Icon size={14} className={`${color.split(' ')[0]} mb-2`} />
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
              <p className={`text-2xl font-black ${color.split(' ')[0]}`}>{val}</p>
            </div>
          ))}
        </div>
      )}

      {/* Per-user table */}
      <div className="space-y-3">
        {stats.map((user, rank) => (
          <div key={user.uid} className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-4">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-sm ${
                rank === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {rank + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-slate-800 truncate">{user.email}</p>
                <p className="text-[10px] text-slate-500">Ostatnia aktywność: {fmtDate(user.lastActivity)}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="text-lg font-black text-indigo-700">{user.total}</span>
                <span className="text-[9px] text-slate-400 font-bold">akt.</span>
              </div>
            </div>
            {/* Activity breakdown */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {ACTIVITY_TYPES.filter(t => (user.counts[t] ?? 0) > 0).map(t => {
                const meta = ACTIVITY_META[t];
                return (
                  <span key={t} className={`text-[9px] font-black px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
                    {meta.label}: {user.counts[t]}
                  </span>
                );
              })}
            </div>
            {/* Bar */}
            <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full"
                style={{ width: `${totalActivities > 0 ? (user.total / totalActivities) * 100 : 0}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
