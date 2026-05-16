import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import { Clock, AlertTriangle, CheckCircle2, ArrowRight, Timer, Banknote } from 'lucide-react';
import type { DocumentInstance } from '../types';

interface Props {
  tenantId: string;
  userId: string;
}

const SLA_HOURS: Partial<Record<string, number>> = {
  SUBMITTED: 72,
  PENDING_APPROVAL: 48,
  UNDER_INVESTIGATION: 168,
};

function getWaitingHours(createdAt: any): number {
  if (!createdAt?.toDate) return 0;
  return (Date.now() - createdAt.toDate().getTime()) / 3_600_000;
}

export default function WorkflowStatsWidget({ tenantId, userId }: Props) {
  const [pending, setPending] = useState<DocumentInstance[]>([]);
  const [recentApproved, setRecentApproved] = useState<DocumentInstance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId || !userId) return;
    const base = `tenants/${tenantId}/documentInstances`;

    const unsubPending = onSnapshot(
      query(
        collection(db, base),
        where('assignedTo', 'array-contains', userId),
        where('status', 'in', ['SUBMITTED', 'PENDING_APPROVAL', 'UNDER_INVESTIGATION'])
      ),
      snap => {
        setPending(snap.docs.map(d => ({ id: d.id, ...d.data() }) as DocumentInstance));
        setLoading(false);
      }
    );

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const unsubApproved = onSnapshot(
      query(
        collection(db, base),
        where('status', 'in', ['APPROVED', 'SETTLED', 'BOOKED'])
      ),
      snap => {
        setRecentApproved(
          snap.docs
            .map(d => ({ id: d.id, ...d.data() }) as DocumentInstance)
            .filter(d => d.updatedAt?.toDate?.() >= monthStart)
        );
      }
    );

    return () => { unsubPending(); unsubApproved(); };
  }, [tenantId, userId]);

  const overdueCount = pending.filter(d => {
    const sla = SLA_HOURS[d.status];
    return sla !== undefined && getWaitingHours(d.createdAt) > sla;
  }).length;

  const totalValueApproved = recentApproved
    .reduce((sum, d) => sum + (d.metadata.amount ?? 0), 0);

  const avgWaitHours = pending.length > 0
    ? pending.reduce((sum, d) => sum + getWaitingHours(d.createdAt), 0) / pending.length
    : 0;

  if (loading) return null;

  const stats = [
    {
      label: 'Do zatwierdzenia',
      value: pending.length,
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      urgent: pending.length > 0,
    },
    {
      label: 'Przeterminowane',
      value: overdueCount,
      icon: AlertTriangle,
      color: overdueCount > 0 ? 'text-red-400' : 'text-slate-500',
      bg: overdueCount > 0 ? 'bg-red-500/10' : 'bg-zinc-800/50',
      urgent: overdueCount > 0,
    },
    {
      label: 'Avg. czas oczekiwania',
      value: avgWaitHours < 24 ? `${Math.round(avgWaitHours)}h` : `${(avgWaitHours / 24).toFixed(1)}d`,
      icon: Timer,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      urgent: false,
    },
    {
      label: 'Zatwierdzone MTD',
      value: totalValueApproved > 0
        ? `${(totalValueApproved / 1000).toFixed(1)}k zł`
        : `${recentApproved.length} dok.`,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      urgent: false,
    },
  ];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-black text-zinc-100 uppercase tracking-widest">Obieg Dokumentów</h3>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">Live · bieżący miesiąc</p>
        </div>
        <Link
          to="/workflow"
          className="flex items-center gap-1.5 text-[10px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest transition-colors"
        >
          Otwórz <ArrowRight size={11} />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((s, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
              s.urgent
                ? i === 1 && overdueCount > 0
                  ? 'border-red-800/50 bg-red-950/20'
                  : 'border-amber-800/40 bg-amber-950/20'
                : 'border-zinc-800 bg-zinc-800/30'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${s.bg}`}>
              <s.icon size={15} className={s.color} />
            </div>
            <div className="min-w-0">
              <div className={`text-base font-black leading-tight ${s.urgent ? s.color : 'text-zinc-100'}`}>
                {s.value}
              </div>
              <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold truncate">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {overdueCount > 0 && (
        <Link
          to="/workflow"
          className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 bg-red-600 hover:bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors"
        >
          <AlertTriangle size={11} /> Przejdź do przeterminowanych ({overdueCount})
        </Link>
      )}
    </div>
  );
}
