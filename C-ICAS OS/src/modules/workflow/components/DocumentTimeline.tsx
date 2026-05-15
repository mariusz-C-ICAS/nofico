import React from 'react';
import {
  CheckCircle2, XCircle, Clock, FileText, Archive, BookOpen,
  Banknote, ShieldCheck, Send, RotateCcw, Hash, Monitor,
} from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { WorkflowStepRecord, StepAction, DocumentStatus } from '../types';
import { STATUS_LABELS } from '../types';

interface Props {
  records: WorkflowStepRecord[];
  compact?: boolean;
}

const ACTION_CONFIG: Record<StepAction, { icon: React.ReactNode; color: string; label: string }> = {
  CREATE: {
    icon: <FileText size={16} />,
    color: 'bg-slate-100 text-slate-600 border-slate-200',
    label: 'Utworzono',
  },
  SUBMIT: {
    icon: <Send size={16} />,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    label: 'Wysłano',
  },
  APPROVE: {
    icon: <CheckCircle2 size={16} />,
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    label: 'Zatwierdzono',
  },
  REJECT: {
    icon: <XCircle size={16} />,
    color: 'bg-red-100 text-red-700 border-red-200',
    label: 'Odrzucono',
  },
  REQUEST_CHANGES: {
    icon: <RotateCcw size={16} />,
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    label: 'Żądanie poprawek',
  },
  VERIFY: {
    icon: <ShieldCheck size={16} />,
    color: 'bg-violet-100 text-violet-700 border-violet-200',
    label: 'Zweryfikowano',
  },
  BOOK: {
    icon: <BookOpen size={16} />,
    color: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    label: 'Zaksięgowano',
  },
  SETTLE: {
    icon: <Banknote size={16} />,
    color: 'bg-teal-100 text-teal-700 border-teal-200',
    label: 'Rozliczono',
  },
  ARCHIVE: {
    icon: <Archive size={16} />,
    color: 'bg-slate-200 text-slate-600 border-slate-300',
    label: 'Zarchiwizowano',
  },
  RESUBMIT: {
    icon: <RotateCcw size={16} />,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    label: 'Ponowne wysłanie',
  },
  CANCEL: {
    icon: <XCircle size={16} />,
    color: 'bg-rose-100 text-rose-700 border-rose-200',
    label: 'Anulowano',
  },
};

function formatTimestamp(ts: any): string {
  if (!ts) return '—';
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  return format(date, 'dd MMM yyyy, HH:mm', { locale: pl });
}

function StatusBadge({ status }: { status: DocumentStatus }) {
  return (
    <span className="text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200">
      → {STATUS_LABELS[status]}
    </span>
  );
}

export default function DocumentTimeline({ records, compact = false }: Props) {
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-300">
        <Clock size={32} className="mb-3" />
        <span className="text-xs font-bold uppercase tracking-widest">Brak historii</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-100" />

      <div className="space-y-1">
        {records.map((record, index) => {
          const config = ACTION_CONFIG[record.action] ?? ACTION_CONFIG.CREATE;
          const isLast = index === records.length - 1;

          return (
            <div key={record.id} className="relative flex gap-4 pl-3">
              <div
                className={`relative z-10 w-10 h-10 rounded-2xl border flex items-center justify-center flex-shrink-0 ${config.color} ${isLast ? 'shadow-md' : ''}`}
              >
                {config.icon}
              </div>

              <div
                className={`flex-1 pb-6 ${compact ? 'pb-3' : ''}`}
              >
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-sm font-black text-slate-800 uppercase tracking-tight">
                    {config.label}
                  </span>
                  <StatusBadge status={record.newStatus} />
                  {record.isOffline && (
                    <span className="text-[9px] font-black bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full border border-amber-200 uppercase">
                      Offline
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-3 text-[10px] font-bold text-slate-400 uppercase mb-2">
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    {formatTimestamp(record.timestamp)}
                  </span>
                  <span className="flex items-center gap-1 font-mono">
                    <Hash size={10} />
                    {record.actorEmail}
                  </span>
                  {record.actorRole && (
                    <span className="bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                      {record.actorRole}
                    </span>
                  )}
                </div>

                {record.note && (
                  <p className="text-xs text-slate-600 font-medium bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 leading-relaxed italic">
                    "{record.note}"
                  </p>
                )}

                {!compact && record.deviceInfo && (
                  <div className="flex items-center gap-1.5 mt-2 text-[9px] text-slate-300 font-bold uppercase">
                    <Monitor size={9} />
                    <span className="truncate max-w-[200px]">{record.deviceInfo}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100">
        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
          <ShieldCheck size={10} />
          Historia niezmienialna — zgodna z GoBD / GoBS / GDPR
        </p>
      </div>
    </div>
  );
}
