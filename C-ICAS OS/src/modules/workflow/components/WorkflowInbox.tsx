import React, { useEffect, useState } from 'react';
import {
  Clock, CheckCircle2, XCircle, Banknote, ChevronRight,
  Inbox, RefreshCw, User, Calendar, Hash, AlertTriangle, Building2, ChevronDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import { useCompany } from '../../../core/auth/CompanyContext';
import type { DocumentInstance } from '../types';
import { STATUS_LABELS, STATUS_COLORS, DOC_TYPE_LABELS } from '../types';

interface Props {
  tenantId: string;
  userId: string;
  onSelectDocument: (doc: DocumentInstance) => void;
}

type InboxTab = 'pending' | 'mine' | 'all';

const TAB_LABELS: Record<InboxTab, string> = {
  pending: 'Do zatwierdzenia',
  mine: 'Moje dokumenty',
  all: 'Wszystkie',
};

export default function WorkflowInbox({ tenantId, userId, onSelectDocument }: Props) {
  const { currentCompany, availableCompanies } = useCompany();
  const [tab, setTab] = useState<InboxTab>('pending');
  const [documents, setDocuments] = useState<DocumentInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyFilter, setCompanyFilter] = useState<string | 'all'>('all');
  const [showCompanyMenu, setShowCompanyMenu] = useState(false);

  useEffect(() => {
    setLoading(true);
    const basePath = `tenants/${tenantId}/documentInstances`;

    let q;
    if (tab === 'pending') {
      q = query(
        collection(db, basePath),
        where('assignedTo', 'array-contains', userId),
        where('status', 'in', ['SUBMITTED', 'PENDING_APPROVAL', 'UNDER_INVESTIGATION']),
        orderBy('createdAt', 'desc')
      );
    } else if (tab === 'mine') {
      q = query(
        collection(db, basePath),
        where('submittedBy', '==', userId),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(db, basePath),
        orderBy('createdAt', 'desc')
      );
    }

    const unsub = onSnapshot(q, snap => {
      setDocuments(snap.docs.map(d => ({ id: d.id, ...d.data() }) as DocumentInstance));
      setLoading(false);
    });

    return unsub;
  }, [tenantId, userId, tab]);

  const filteredDocuments = companyFilter === 'all'
    ? documents
    : documents.filter(d => !d.companyId || d.companyId === companyFilter);

  const pendingCount = documents.filter(
    d => d.status === 'PENDING_APPROVAL' || d.status === 'SUBMITTED' || d.status === 'UNDER_INVESTIGATION'
  ).length;

  const selectedCompanyName = companyFilter === 'all'
    ? 'Wszystkie firmy'
    : availableCompanies.find(c => c.id === companyFilter)?.name ?? 'Firma';

  return (
    <div className="flex flex-col gap-4">
      {/* Company filter — visible only when user has multiple companies */}
      {availableCompanies.length > 1 && (
        <div className="relative">
          <button
            onClick={() => setShowCompanyMenu(v => !v)}
            className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black text-slate-700 hover:border-indigo-300 transition-colors"
          >
            <Building2 size={12} className="text-indigo-500" />
            {selectedCompanyName}
            <ChevronDown size={11} className={`text-slate-400 transition-transform ${showCompanyMenu ? 'rotate-180' : ''}`} />
          </button>
          {showCompanyMenu && (
            <div className="absolute z-20 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden min-w-[180px]">
              <button
                onClick={() => { setCompanyFilter('all'); setShowCompanyMenu(false); }}
                className={`w-full px-4 py-2.5 text-xs font-black text-left hover:bg-slate-50 ${companyFilter === 'all' ? 'text-indigo-600' : 'text-slate-700'}`}
              >Wszystkie firmy</button>
              {availableCompanies.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setCompanyFilter(c.id); setShowCompanyMenu(false); }}
                  className={`w-full px-4 py-2.5 text-xs font-black text-left hover:bg-slate-50 ${companyFilter === c.id ? 'text-indigo-600' : 'text-slate-700'}`}
                >{c.name}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1">
        {(Object.keys(TAB_LABELS) as InboxTab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              tab === t
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {TAB_LABELS[t]}
            {t === 'pending' && pendingCount > 0 && (
              <span className="bg-indigo-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Document list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-300">
          <RefreshCw className="animate-spin" size={24} />
        </div>
      ) : filteredDocuments.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <div className="space-y-2">
          {filteredDocuments.map(doc => (
            <DocumentRow
              key={doc.id}
              document={doc}
              userId={userId}
              companies={availableCompanies}
              onClick={() => onSelectDocument(doc)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DocumentRow({
  document: doc,
  userId,
  companies,
  onClick,
}: {
  document: DocumentInstance;
  userId: string;
  companies: { id: string; name: string }[];
  onClick: () => void;
}) {
  const isAssignedToMe = doc.assignedTo?.includes(userId);
  const createdDate = doc.createdAt?.toDate
    ? format(doc.createdAt.toDate(), 'dd MMM', { locale: pl })
    : '—';

  const isUrgent = ['PENDING_APPROVAL', 'SUBMITTED', 'UNDER_INVESTIGATION'].includes(doc.status);
  const companyName = doc.companyId ? companies.find(c => c.id === doc.companyId)?.name : null;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-5 rounded-[1.75rem] border text-left group transition-all hover:shadow-lg ${
        isUrgent && isAssignedToMe
          ? 'bg-amber-50 border-amber-200 hover:border-amber-300 hover:shadow-amber-100'
          : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-slate-100'
      }`}
    >
      <StatusIcon status={doc.status} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-sm font-black text-slate-900 truncate">
            {doc.metadata.title}
          </span>
          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${STATUS_COLORS[doc.status]}`}>
            {STATUS_LABELS[doc.status]}
          </span>
          {isAssignedToMe && isUrgent && (
            <span className="text-[9px] font-black uppercase bg-amber-600 text-white px-2 py-0.5 rounded-full">
              Twoja akcja
            </span>
          )}
          {companyName && (
            <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 flex items-center gap-1">
              <Building2 size={8} />{companyName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase flex-wrap">
          <span className="flex items-center gap-1">
            <Hash size={9} /> {DOC_TYPE_LABELS[doc.type]}
          </span>
          {doc.metadata.vendor && (
            <span className="flex items-center gap-1">
              <User size={9} /> {doc.metadata.vendor}
            </span>
          )}
          {doc.metadata.amount != null && (
            <span className="flex items-center gap-1 font-black text-slate-700">
              <Banknote size={9} />
              {doc.metadata.amount.toFixed(2)} {doc.metadata.currency ?? 'PLN'}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar size={9} /> {createdDate}
          </span>
        </div>
      </div>

      <ChevronRight
        size={18}
        className="text-slate-300 group-hover:text-slate-500 flex-shrink-0 transition-colors"
      />
    </button>
  );
}

function StatusIcon({ status }: { status: DocumentInstance['status'] }) {
  const map: Partial<Record<DocumentInstance['status'], React.ReactNode>> = {
    PENDING_APPROVAL: <Clock size={20} className="text-amber-500" />,
    SUBMITTED: <Clock size={20} className="text-blue-500" />,
    UNDER_INVESTIGATION: <AlertTriangle size={20} className="text-purple-500" />,
    APPROVED: <CheckCircle2 size={20} className="text-emerald-500" />,
    REJECTED: <XCircle size={20} className="text-red-500" />,
    SETTLED: <Banknote size={20} className="text-teal-500" />,
  };
  return (
    <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center flex-shrink-0">
      {map[status] ?? <Hash size={20} className="text-slate-300" />}
    </div>
  );
}

function EmptyState({ tab }: { tab: InboxTab }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-300">
      <Inbox size={36} className="mb-4" />
      <p className="text-sm font-black uppercase tracking-widest">
        {tab === 'pending' ? 'Brak dokumentów do zatwierdzenia' : 'Brak dokumentów'}
      </p>
    </div>
  );
}
