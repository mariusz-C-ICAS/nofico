import React, { useEffect, useState } from 'react';
import {
  BarChart3, Clock, AlertTriangle, Zap, CheckCircle2,
  FileText, Loader2, Activity,
} from 'lucide-react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import { differenceInHours, differenceInDays, subDays } from 'date-fns';
import type { DocumentInstance, DocumentStatus, DocumentType } from '../types';
import { STATUS_LABELS, STATUS_COLORS, DOC_TYPE_LABELS } from '../types';

interface Props {
  tenantId: string;
  onSelectDocument: (doc: DocumentInstance) => void;
}

interface Metrics {
  total: number;
  pendingCount: number;
  avgCycleDays: number | null;
  byType: Partial<Record<DocumentType, number>>;
  byStatus: Partial<Record<DocumentStatus, number>>;
  atRisk: DocumentInstance[];
  recentCompleted: DocumentInstance[];
}

function compute(docs: DocumentInstance[], periodDays: number): Metrics {
  const since = subDays(new Date(), periodDays);
  const inPeriod = docs.filter(d => {
    const ts = d.createdAt?.toDate?.() ?? new Date(0);
    return ts >= since;
  });

  const now = new Date();
  const byType: Partial<Record<DocumentType, number>> = {};
  const byStatus: Partial<Record<DocumentStatus, number>> = {};
  let cycleSum = 0, cycleCount = 0;
  const atRisk: DocumentInstance[] = [];
  const recentCompleted: DocumentInstance[] = [];

  for (const doc of inPeriod) {
    byType[doc.type] = (byType[doc.type] ?? 0) + 1;
    byStatus[doc.status] = (byStatus[doc.status] ?? 0) + 1;

    const createdTs = doc.createdAt?.toDate?.() ?? now;
    const updatedTs = doc.updatedAt?.toDate?.() ?? now;

    if (doc.status === 'ARCHIVED' || doc.status === 'SETTLED') {
      cycleSum += differenceInHours(updatedTs, createdTs);
      cycleCount++;
      recentCompleted.push(doc);
    }

    if ((doc.status === 'PENDING_APPROVAL' || doc.status === 'SUBMITTED') &&
        differenceInHours(now, createdTs) > 72) {
      atRisk.push(doc);
    }
  }

  return {
    total: inPeriod.length,
    pendingCount: (byStatus['PENDING_APPROVAL'] ?? 0) + (byStatus['SUBMITTED'] ?? 0),
    avgCycleDays: cycleCount > 0 ? Math.round(cycleSum / cycleCount / 24) : null,
    byType,
    byStatus,
    atRisk: atRisk.slice(0, 5),
    recentCompleted: recentCompleted.slice(0, 5),
  };
}

export default function WorkflowDashboard({ tenantId, onSelectDocument }: Props) {
  const [all, setAll] = useState<DocumentInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<30 | 90>(30);

  useEffect(() => {
    setLoading(true);
    getDocs(query(
      collection(db, `tenants/${tenantId}/documentInstances`),
      orderBy('createdAt', 'desc')
    )).then(snap => {
      setAll(snap.docs.map(d => ({ id: d.id, ...d.data() }) as DocumentInstance));
      setLoading(false);
    });
  }, [tenantId]);

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="animate-spin text-slate-400" />
    </div>
  );

  const m = compute(all, period);
  const maxType = Math.max(...Object.values(m.byType).map(v => v ?? 0), 1);

  return (
    <div className="space-y-6">
      {/* Header + period */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <BarChart3 size={14} /> Dashboard KPI
        </p>
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {([30, 90] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                period === p ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              {p} dni
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={<FileText size={18} />} label="Dokumenty łącznie" value={String(m.total)} color="text-slate-800" />
        <KpiCard
          icon={<Clock size={18} />}
          label="W toku / oczekują"
          value={String(m.pendingCount)}
          color={m.pendingCount > 0 ? 'text-amber-600' : 'text-emerald-600'}
        />
        <KpiCard
          icon={<AlertTriangle size={18} />}
          label="Zagrożone (>3 dni)"
          value={String(m.atRisk.length)}
          color={m.atRisk.length > 0 ? 'text-red-600' : 'text-emerald-600'}
        />
        <KpiCard
          icon={<Zap size={18} />}
          label="Śr. czas cyklu"
          value={m.avgCycleDays != null ? `${m.avgCycleDays} dni` : '—'}
          color="text-indigo-600"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By type */}
        <div className="bg-slate-50 rounded-[2rem] p-6 space-y-3">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Wolumen według typu</p>
          {(Object.keys(m.byType) as DocumentType[])
            .sort((a, b) => (m.byType[b] ?? 0) - (m.byType[a] ?? 0))
            .map(type => (
            <div key={type} className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700">{DOC_TYPE_LABELS[type]}</span>
                <span className="text-[10px] font-black text-slate-500">{m.byType[type]}</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full transition-all"
                  style={{ width: `${((m.byType[type] ?? 0) / maxType) * 100}%` }}
                />
              </div>
            </div>
          ))}
          {Object.keys(m.byType).length === 0 && (
            <p className="text-xs text-slate-300 text-center py-4 font-bold uppercase">Brak danych</p>
          )}
        </div>

        {/* By status */}
        <div className="bg-slate-50 rounded-[2rem] p-6 space-y-2">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Rozkład statusów</p>
          {(Object.keys(m.byStatus) as DocumentStatus[])
            .sort((a, b) => (m.byStatus[b] ?? 0) - (m.byStatus[a] ?? 0))
            .map(status => (
            <div key={status} className="flex items-center gap-3">
              <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full whitespace-nowrap ${STATUS_COLORS[status]}`}>
                {STATUS_LABELS[status]}
              </span>
              <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-500 rounded-full"
                  style={{ width: `${((m.byStatus[status] ?? 0) / Math.max(m.total, 1)) * 100}%` }}
                />
              </div>
              <span className="text-xs font-black text-slate-700 w-6 text-right">{m.byStatus[status]}</span>
            </div>
          ))}
          {Object.keys(m.byStatus).length === 0 && (
            <p className="text-xs text-slate-300 text-center py-4 font-bold uppercase">Brak danych</p>
          )}
        </div>
      </div>

      {/* At risk */}
      {m.atRisk.length > 0 && (
        <div className="bg-red-50 rounded-[2rem] p-6">
          <p className="text-[9px] font-black text-red-600 uppercase tracking-widest mb-4 flex items-center gap-2">
            <AlertTriangle size={12} /> Dokumenty zagrożone — oczekują ponad 3 dni
          </p>
          <div className="space-y-2">
            {m.atRisk.map(doc => {
              const createdTs = doc.createdAt?.toDate?.();
              const daysWaiting = createdTs ? differenceInDays(new Date(), createdTs) : '?';
              return (
                <button
                  key={doc.id}
                  onClick={() => onSelectDocument(doc)}
                  className="w-full flex items-center justify-between p-4 bg-white rounded-2xl hover:shadow-md transition-all text-left"
                >
                  <div>
                    <p className="text-xs font-black text-slate-800">{doc.metadata.title}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                      {DOC_TYPE_LABELS[doc.type]} · {doc.submittedByEmail}
                    </p>
                  </div>
                  <span className="text-[9px] font-black bg-red-100 text-red-700 px-3 py-1.5 rounded-full flex-shrink-0">
                    {daysWaiting} dni
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Recently completed */}
      {m.recentCompleted.length > 0 && (
        <div className="bg-emerald-50 rounded-[2rem] p-6">
          <p className="text-[9px] font-black text-emerald-700 uppercase tracking-widest mb-4 flex items-center gap-2">
            <CheckCircle2 size={12} /> Ostatnio zakończone
          </p>
          <div className="space-y-2">
            {m.recentCompleted.map(doc => {
              const createdTs = doc.createdAt?.toDate?.();
              const updatedTs = doc.updatedAt?.toDate?.();
              const cycleDays = createdTs && updatedTs ? differenceInDays(updatedTs, createdTs) : null;
              return (
                <button
                  key={doc.id}
                  onClick={() => onSelectDocument(doc)}
                  className="w-full flex items-center justify-between p-4 bg-white rounded-2xl hover:shadow-md transition-all text-left"
                >
                  <div>
                    <p className="text-xs font-black text-slate-800">{doc.metadata.title}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                      {STATUS_LABELS[doc.status]} · {doc.metadata.vendor ?? doc.submittedByEmail}
                    </p>
                  </div>
                  {cycleDays != null && (
                    <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full flex-shrink-0">
                      {cycleDays}d cyklu
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {m.total === 0 && (
        <div className="text-center py-16 text-slate-300">
          <Activity size={36} className="mx-auto mb-4" />
          <p className="text-sm font-black uppercase tracking-widest">Brak danych w tym okresie</p>
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string; color: string;
}) {
  return (
    <div className="bg-slate-50 rounded-[2rem] p-5 flex items-start gap-3">
      <span className={color}>{icon}</span>
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wide">{label}</p>
        <p className={`text-2xl font-black ${color}`}>{value}</p>
      </div>
    </div>
  );
}
