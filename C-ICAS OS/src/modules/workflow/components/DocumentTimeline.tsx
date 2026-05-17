import React, { useState } from 'react';
import {
  CheckCircle2, XCircle, Clock, FileText, Archive, BookOpen,
  Banknote, ShieldCheck, Send, RotateCcw, Hash, Monitor, MessageSquare,
} from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import type { WorkflowStepRecord, StepAction, DocumentStatus } from '../types';
import { STATUS_LABELS } from '../types';

export interface DocumentComment {
  id: string;
  authorEmail: string;
  text: string;
  createdAt: any;
}

interface Props {
  records: WorkflowStepRecord[];
  compact?: boolean;
  tenantId?: string;
  documentId?: string;
  actorId?: string;
  actorEmail?: string;
  comments?: DocumentComment[];
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

export default function DocumentTimeline({ records, compact = false, tenantId, documentId, actorId, actorEmail, comments = [] }: Props) {
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

      {comments && comments.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <MessageSquare size={9} /> Komentarze ({comments.length})
          </p>
          <div className="space-y-2">
            {comments.map(c => (
              <div key={c.id} className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] font-black text-indigo-600 uppercase">{c.authorEmail}</span>
                  <span className="text-[9px] text-slate-400">{formatTimestamp(c.createdAt)}</span>
                </div>
                <p className="text-xs text-slate-700 font-medium leading-relaxed">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tenantId && documentId && actorId && (
        <CommentInput tenantId={tenantId} documentId={documentId} actorId={actorId} actorEmail={actorEmail ?? ''} />
      )}
    </div>
  );
}

function CommentInput({ tenantId, documentId, actorId, actorEmail }: {
  tenantId: string; documentId: string; actorId: string; actorEmail: string;
}) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    try {
      await addDoc(collection(db, `tenants/${tenantId}/documentComments`), {
        documentId,
        authorId: actorId,
        authorEmail: actorEmail,
        text: text.trim(),
        createdAt: serverTimestamp(),
      });
      setText('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-slate-100">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Dodaj komentarz</p>
      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(); }}
          placeholder="Wpisz komentarz... (Ctrl+Enter aby wysłać)"
          rows={2}
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none resize-none transition-all"
        />
        <button
          onClick={submit}
          disabled={!text.trim() || loading}
          className="flex-shrink-0 w-10 h-10 self-end bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-xl flex items-center justify-center transition-colors"
        >
          <Send size={13} className="text-white" />
        </button>
      </div>
    </div>
  );
}
