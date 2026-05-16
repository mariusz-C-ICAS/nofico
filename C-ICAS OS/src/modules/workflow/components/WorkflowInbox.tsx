import React, { useEffect, useState, useCallback } from 'react';
import {
  Clock, CheckCircle2, XCircle, Banknote, ChevronRight,
  Inbox, RefreshCw, User, Calendar, Hash, AlertTriangle, Building2, ChevronDown,
  Filter, X, ThumbsUp, ThumbsDown, Timer,
} from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import { useCompany } from '../../../core/auth/CompanyContext';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { transitionDocument } from '../services/workflowEngine';
import type { DocumentInstance, DocumentType } from '../types';
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

// SLA in hours per status
const SLA_HOURS: Partial<Record<string, number>> = {
  SUBMITTED: 72,
  PENDING_APPROVAL: 48,
  UNDER_INVESTIGATION: 168,
  PENDING_SETTLEMENT: 120,
};

function getWaitingHours(createdAt: any): number {
  if (!createdAt?.toDate) return 0;
  return (Date.now() - createdAt.toDate().getTime()) / 3_600_000;
}

function getSlaHours(status: string): number | null {
  return SLA_HOURS[status] ?? null;
}

function isDocOverdue(doc: DocumentInstance): boolean {
  const sla = getSlaHours(doc.status);
  return sla !== null && getWaitingHours(doc.createdAt) > sla;
}

export default function WorkflowInbox({ tenantId, userId, onSelectDocument }: Props) {
  const { user } = useAuth();
  const { availableCompanies } = useCompany();
  const [tab, setTab] = useState<InboxTab>('pending');
  const [documents, setDocuments] = useState<DocumentInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyFilter, setCompanyFilter] = useState<string | 'all'>('all');
  const [showCompanyMenu, setShowCompanyMenu] = useState(false);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState<DocumentType | ''>('');
  const [filterOverdueOnly, setFilterOverdueOnly] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setSelectedIds(new Set());
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
      q = query(collection(db, basePath), orderBy('createdAt', 'desc'));
    }

    const unsub = onSnapshot(q, snap => {
      setDocuments(snap.docs.map(d => ({ id: d.id, ...d.data() }) as DocumentInstance));
      setLoading(false);
    });

    return unsub;
  }, [tenantId, userId, tab]);

  const byCompany = companyFilter === 'all'
    ? documents
    : documents.filter(d => !d.companyId || d.companyId === companyFilter);

  const displayDocuments = byCompany
    .filter(d => !filterType || d.type === filterType)
    .filter(d => !filterOverdueOnly || isDocOverdue(d));

  const pendingCount = documents.filter(
    d => d.status === 'PENDING_APPROVAL' || d.status === 'SUBMITTED' || d.status === 'UNDER_INVESTIGATION'
  ).length;

  const overdueCount = documents.filter(isDocOverdue).length;

  const selectedCompanyName = companyFilter === 'all'
    ? 'Wszystkie firmy'
    : availableCompanies.find(c => c.id === companyFilter)?.name ?? 'Firma';

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = () => {
    if (selectedIds.size === displayDocuments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayDocuments.map(d => d.id)));
    }
  };

  const handleBulkApprove = async () => {
    if (!user) return;
    setBulkLoading(true);
    const toApprove = displayDocuments.filter(
      d => selectedIds.has(d.id) && d.status === 'PENDING_APPROVAL'
    );
    try {
      await Promise.all(
        toApprove.map(d =>
          transitionDocument(tenantId, d.id, 'APPROVE', user.uid, user.email ?? '', 'APPROVED', {
            note: 'Zatwierdzone zbiorczo',
          })
        )
      );
    } finally {
      setSelectedIds(new Set());
      setBulkLoading(false);
    }
  };

  const handleBulkReject = async () => {
    if (!user) return;
    setBulkLoading(true);
    const toReject = displayDocuments.filter(
      d => selectedIds.has(d.id) && ['PENDING_APPROVAL', 'SUBMITTED'].includes(d.status)
    );
    try {
      await Promise.all(
        toReject.map(d =>
          transitionDocument(tenantId, d.id, 'REJECT', user.uid, user.email ?? '', 'REJECTED', {
            note: 'Odrzucone zbiorczo',
          })
        )
      );
    } finally {
      setSelectedIds(new Set());
      setBulkLoading(false);
    }
  };

  const canBulkApprove = displayDocuments.some(
    d => selectedIds.has(d.id) && d.status === 'PENDING_APPROVAL'
  );
  const canBulkReject = displayDocuments.some(
    d => selectedIds.has(d.id) && ['PENDING_APPROVAL', 'SUBMITTED'].includes(d.status)
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Overdue banner */}
      {overdueCount > 0 && tab === 'pending' && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
          <Timer size={14} className="text-red-600 flex-shrink-0" />
          <p className="text-[10px] font-black text-red-700 uppercase tracking-wider">
            {overdueCount} {overdueCount === 1 ? 'dokument przekroczył' : 'dokumenty przekroczyły'} SLA —
            wymagają natychmiastowej akcji
          </p>
          <button
            onClick={() => setFilterOverdueOnly(v => !v)}
            className={`ml-auto text-[9px] font-black uppercase px-2 py-1 rounded-full transition-colors ${filterOverdueOnly ? 'bg-red-600 text-white' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}
          >
            {filterOverdueOnly ? 'Pokaż wszystkie' : 'Tylko przeterminowane'}
          </button>
        </div>
      )}

      {/* Toolbar: company filter + filter toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        {availableCompanies.length > 1 && (
          <div className="relative">
            <button
              onClick={() => setShowCompanyMenu(v => !v)}
              className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-700 hover:border-indigo-300 transition-colors"
            >
              <Building2 size={11} className="text-indigo-500" />
              {selectedCompanyName}
              <ChevronDown size={10} className={`text-slate-400 transition-transform ${showCompanyMenu ? 'rotate-180' : ''}`} />
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

        <button
          onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-black uppercase tracking-widest transition-colors ${showFilters || filterType || filterOverdueOnly ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
        >
          <Filter size={11} /> Filtry
          {(filterType || filterOverdueOnly) && <span className="bg-indigo-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">!</span>}
        </button>

        {(filterType || filterOverdueOnly) && (
          <button
            onClick={() => { setFilterType(''); setFilterOverdueOnly(false); }}
            className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-black text-slate-500 hover:text-rose-600 hover:border-rose-200 transition-colors"
          >
            <X size={10} /> Wyczyść
          </button>
        )}
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 flex flex-wrap gap-3 items-center">
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as DocumentType | '')}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-400 outline-none"
          >
            <option value="">Wszystkie typy</option>
            {(Object.entries(DOC_TYPE_LABELS) as [DocumentType, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filterOverdueOnly}
              onChange={e => setFilterOverdueOnly(e.target.checked)}
              className="w-3.5 h-3.5 accent-red-600 rounded"
            />
            <span className="text-xs font-black text-slate-600">Tylko przeterminowane</span>
          </label>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1">
        {(Object.keys(TAB_LABELS) as InboxTab[]).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setSelectedIds(new Set()); }}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
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

      {/* Bulk select bar — visible when on pending tab and items exist */}
      {tab === 'pending' && displayDocuments.length > 0 && (
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 hover:text-slate-700 uppercase tracking-wider"
          >
            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${selectedIds.size > 0 ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`}>
              {selectedIds.size > 0 && <span className="text-white text-[8px]">✓</span>}
            </div>
            {selectedIds.size === 0 ? 'Zaznacz wszystkie' : `Zaznaczono ${selectedIds.size}`}
          </button>
        </div>
      )}

      {/* Document list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-300">
          <RefreshCw className="animate-spin" size={24} />
        </div>
      ) : displayDocuments.length === 0 ? (
        <EmptyState tab={tab} filtered={!!(filterType || filterOverdueOnly)} />
      ) : (
        <div className="space-y-2">
          {displayDocuments.map(doc => (
            <DocumentRow
              key={doc.id}
              document={doc}
              userId={userId}
              companies={availableCompanies}
              onClick={() => onSelectDocument(doc)}
              showCheckbox={tab === 'pending'}
              selected={selectedIds.has(doc.id)}
              onSelect={() => toggleSelect(doc.id)}
              waitingHours={getWaitingHours(doc.createdAt)}
              slaHours={getSlaHours(doc.status)}
            />
          ))}
        </div>
      )}

      {/* Floating bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-slate-900 text-white rounded-[2rem] px-5 py-3 shadow-2xl border border-slate-700">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            {selectedIds.size} zaznaczonych
          </span>
          <div className="w-px h-4 bg-slate-700" />
          <button
            disabled={!canBulkApprove || bulkLoading}
            onClick={handleBulkApprove}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-colors"
          >
            <ThumbsUp size={11} /> {bulkLoading ? '...' : 'Zatwierdź'}
          </button>
          <button
            disabled={!canBulkReject || bulkLoading}
            onClick={handleBulkReject}
            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-colors"
          >
            <ThumbsDown size={11} /> Odrzuć
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="p-2 text-slate-400 hover:text-white transition-colors"
          >
            <X size={13} />
          </button>
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
  showCheckbox,
  selected,
  onSelect,
  waitingHours,
  slaHours,
}: {
  document: DocumentInstance;
  userId: string;
  companies: { id: string; name: string }[];
  onClick: () => void;
  showCheckbox: boolean;
  selected: boolean;
  onSelect: () => void;
  waitingHours: number;
  slaHours: number | null;
}) {
  const isAssignedToMe = doc.assignedTo?.includes(userId);
  const createdDate = doc.createdAt?.toDate
    ? format(doc.createdAt.toDate(), 'dd MMM', { locale: pl })
    : '—';

  const isUrgent = ['PENDING_APPROVAL', 'SUBMITTED', 'UNDER_INVESTIGATION'].includes(doc.status);
  const companyName = doc.companyId ? companies.find(c => c.id === doc.companyId)?.name : null;

  const isOverdue = slaHours !== null && waitingHours > slaHours;
  const isWarning = slaHours !== null && !isOverdue && waitingHours > slaHours * 0.7;
  const waitingLabel = waitingHours < 24
    ? `${Math.round(waitingHours)}h`
    : `${Math.round(waitingHours / 24)}d`;

  return (
    <div className={`flex items-center gap-3 rounded-[1.75rem] border transition-all group ${
      isOverdue
        ? 'bg-red-50 border-red-200 hover:border-red-300'
        : isUrgent && isAssignedToMe
          ? 'bg-amber-50 border-amber-200 hover:border-amber-300'
          : 'bg-white border-slate-100 hover:border-slate-200'
    } ${selected ? 'ring-2 ring-indigo-400 ring-offset-1' : ''}`}>
      {showCheckbox && (
        <button
          onClick={e => { e.stopPropagation(); onSelect(); }}
          className="pl-4 py-5 flex-shrink-0"
        >
          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${selected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 hover:border-indigo-400'}`}>
            {selected && <span className="text-white text-[8px]">✓</span>}
          </div>
        </button>
      )}

      <button onClick={onClick} className="flex-1 flex items-center gap-4 p-5 pl-0 text-left min-w-0">
        <StatusIcon status={doc.status} isOverdue={isOverdue} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-black text-slate-900 truncate">{doc.metadata.title}</span>
            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${STATUS_COLORS[doc.status]}`}>
              {STATUS_LABELS[doc.status]}
            </span>
            {isOverdue && (
              <span className="text-[9px] font-black uppercase bg-red-600 text-white px-2 py-0.5 rounded-full animate-pulse">
                Przeterminowane
              </span>
            )}
            {isWarning && !isOverdue && (
              <span className="text-[9px] font-black uppercase bg-orange-500 text-white px-2 py-0.5 rounded-full">
                Pilne
              </span>
            )}
            {isAssignedToMe && isUrgent && !isOverdue && !isWarning && (
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
            {slaHours !== null && (
              <span className={`flex items-center gap-1 font-black ${isOverdue ? 'text-red-600' : isWarning ? 'text-orange-500' : 'text-slate-400'}`}>
                <Timer size={9} /> {waitingLabel} / {slaHours}h SLA
              </span>
            )}
          </div>
        </div>

        <ChevronRight size={18} className="text-slate-300 group-hover:text-slate-500 flex-shrink-0 transition-colors" />
      </button>
    </div>
  );
}

function StatusIcon({ status, isOverdue }: { status: DocumentInstance['status']; isOverdue: boolean }) {
  const map: Partial<Record<DocumentInstance['status'], React.ReactNode>> = {
    PENDING_APPROVAL: <Clock size={20} className="text-amber-500" />,
    SUBMITTED: <Clock size={20} className="text-blue-500" />,
    UNDER_INVESTIGATION: <AlertTriangle size={20} className="text-purple-500" />,
    APPROVED: <CheckCircle2 size={20} className="text-emerald-500" />,
    REJECTED: <XCircle size={20} className="text-red-500" />,
    SETTLED: <Banknote size={20} className="text-teal-500" />,
  };
  return (
    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${isOverdue ? 'bg-red-100' : 'bg-slate-50'}`}>
      {map[status] ?? <Hash size={20} className="text-slate-300" />}
    </div>
  );
}

function EmptyState({ tab, filtered }: { tab: InboxTab; filtered: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-300">
      <Inbox size={36} className="mb-4" />
      <p className="text-sm font-black uppercase tracking-widest">
        {filtered
          ? 'Brak wyników dla wybranych filtrów'
          : tab === 'pending'
            ? 'Brak dokumentów do zatwierdzenia'
            : 'Brak dokumentów'}
      </p>
    </div>
  );
}
