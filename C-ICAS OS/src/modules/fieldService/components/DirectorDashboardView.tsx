import React, { useEffect, useState } from 'react';
import { BarChart3, CheckCircle2, TrendingUp, Calendar, Users } from 'lucide-react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import { useTenant } from '../../../shared/hooks/useTenant';
import type { ServiceEvent } from '../types';
import { EVENT_STATUS_META } from '../types';

interface Stats {
  todayTotal: number;
  todayCompleted: number;
  todayRevenue: number;
  monthRevenue: number;
  completionRate: number;
  byStatus: Record<string, number>;
  workers: { uid: string; name: string; events: number }[];
}

export default function DirectorDashboardView() {
  const { activeTenantId } = useTenant();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeTenantId) return;
    load();
  }, [activeTenantId]);

  async function load() {
    if (!activeTenantId) return;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    try {
      const todaySnap = await getDocs(query(
        collection(db, `tenants/${activeTenantId}/serviceEvents`),
        where('scheduledStart', '>=', Timestamp.fromDate(today)),
        where('scheduledStart', '<=', Timestamp.fromDate(todayEnd)),
      ));
      const todayEvents = todaySnap.docs.map(d => ({ id: d.id, ...d.data() }) as ServiceEvent);

      const monthSnap = await getDocs(query(
        collection(db, `tenants/${activeTenantId}/serviceEvents`),
        where('scheduledStart', '>=', Timestamp.fromDate(monthStart)),
        where('status', '==', 'COMPLETED'),
      ));
      const monthEvents = monthSnap.docs.map(d => ({ id: d.id, ...d.data() }) as ServiceEvent);

      const byStatus: Record<string, number> = {};
      const workerMap = new Map<string, { uid: string; name: string; events: number }>();

      for (const e of todayEvents) {
        byStatus[e.status] = (byStatus[e.status] ?? 0) + 1;
        for (const w of e.assignedWorkers) {
          const entry = workerMap.get(w.uid) ?? { uid: w.uid, name: w.displayName || w.email, events: 0 };
          entry.events++;
          workerMap.set(w.uid, entry);
        }
      }

      const todayCompleted = todayEvents.filter(e => e.status === 'COMPLETED').length;
      setStats({
        todayTotal: todayEvents.length,
        todayCompleted,
        todayRevenue: todayEvents.filter(e => e.status === 'COMPLETED').reduce((s, e) => s + (e.price ?? 0), 0),
        monthRevenue: monthEvents.reduce((s, e) => s + (e.price ?? 0), 0),
        completionRate: todayEvents.length > 0 ? Math.round((todayCompleted / todayEvents.length) * 100) : 0,
        byStatus,
        workers: Array.from(workerMap.values()).sort((a, b) => b.events - a.events),
      });
    } finally { setLoading(false); }
  }

  if (loading) return (
    <div className="py-16 text-center text-slate-400 text-xs font-black uppercase animate-pulse">
      Ładowanie dashboardu dyrektora...
    </div>
  );
  if (!stats) return null;

  const statusOrder = ['SCHEDULED', 'CONFIRMED', 'IN_TRANSIT', 'ON_SITE', 'COMPLETED', 'CANCELLED'] as const;
  const maxCount = Math.max(1, ...Object.values(stats.byStatus));

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Zdarzenia dziś',    value: String(stats.todayTotal),  Icon: Calendar,      color: 'text-blue-600',   bg: 'bg-blue-50' },
          { label: 'Realizacja',        value: `${stats.completionRate}%`, Icon: CheckCircle2,  color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Przychód dziś',     value: `${stats.todayRevenue.toLocaleString('pl-PL')} PLN`, Icon: TrendingUp, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: 'Przychód (mies.)',  value: `${stats.monthRevenue.toLocaleString('pl-PL')} PLN`, Icon: BarChart3,  color: 'text-indigo-600', bg: 'bg-indigo-50' },
        ].map(({ label, value, Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm">
            <div className={`w-10 h-10 ${bg} rounded-2xl flex items-center justify-center mb-3`}>
              <Icon size={18} className={color} />
            </div>
            <p className="text-2xl font-black text-slate-900 truncate">{value}</p>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status distribution */}
        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
          <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Rozkład statusów (dziś)</h4>
          {Object.keys(stats.byStatus).length === 0
            ? <p className="text-slate-300 text-xs font-black uppercase text-center py-6">Brak zdarzeń na dziś</p>
            : <div className="space-y-3">
                {statusOrder.map(s => {
                  const count = stats.byStatus[s] ?? 0;
                  if (!count) return null;
                  const meta = EVENT_STATUS_META[s];
                  return (
                    <div key={s}>
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-[10px] font-black ${meta.color}`}>{meta.label}</span>
                        <span className="text-xs font-black text-slate-700">{count}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${meta.dot} rounded-full transition-all`}
                          style={{ width: `${(count / maxCount) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
          }
        </div>

        {/* Workers today */}
        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
          <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">
            <Users size={10} className="inline mr-1" /> Pracownicy (dziś)
          </h4>
          {stats.workers.length === 0
            ? <p className="text-slate-300 text-xs font-black uppercase text-center py-6">Brak przypisanych pracowników</p>
            : <div className="space-y-2">
                {stats.workers.map(w => (
                  <div key={w.uid} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                    <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center text-[10px] font-black text-indigo-600 flex-shrink-0">
                      {w.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-700 truncate">{w.name}</p>
                      <p className="text-[9px] text-slate-400">{w.events} zdarzeń</p>
                    </div>
                    <div className="w-2 h-2 bg-emerald-400 rounded-full flex-shrink-0" />
                  </div>
                ))}
              </div>
          }
        </div>
      </div>
    </div>
  );
}
