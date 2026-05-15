import React, { useEffect, useState, useMemo } from 'react';
import {
  Search, Filter, Download, AlertTriangle,
  Calendar, Banknote, Hash, ChevronRight, X,
  Loader2, Archive,
} from 'lucide-react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { db } from '../../../shared/lib/firebase';
import type { DocumentInstance, DocumentStatus, DocumentType } from '../types';
import { STATUS_LABELS, STATUS_COLORS, DOC_TYPE_LABELS } from '../types';

interface Props {
  tenantId: string;
  onSelectDocument: (doc: DocumentInstance) => void;
}

const ALL_STATUSES: DocumentStatus[] = [
  'DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED',
  'KSEF_VERIFIED', 'BOOKED', 'PENDING_SETTLEMENT', 'SETTLED', 'ARCHIVED',
];
const ALL_TYPES: DocumentType[] = [
  'OUT_OF_POCKET', 'VENDOR_INVOICE', 'CONTRACT', 'TIMESHEET',
  'PURCHASE_ORDER', 'TRAVEL_EXPENSE', 'CUSTOM',
];

export default function DocumentArchive({ tenantId, onSelectDocument }: Props) {
  const [docs, setDocs] = useState<DocumentInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus[]>([]);
  const [typeFilter, setTypeFilter] = useState<DocumentType[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [displayCount, setDisplayCount] = useState(50);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    getDocs(query(
      collection(db, `tenants/${tenantId}/documentInstances`),
      orderBy('createdAt', 'desc')
    )).then(snap => {
      setDocs(snap.docs.map(d => ({ id: d.id, ...d.data() }) as DocumentInstance));
      setLoading(false);
    });
  }, [tenantId]);

  const filtered = useMemo(() => {
    return docs.filter(doc => {
      const sq = search.toLowerCase();
      if (sq) {
        const title = doc.metadata.title?.toLowerCase() ?? '';
        const vendor = doc.metadata.vendor?.toLowerCase() ?? '';
        if (!title.includes(sq) && !vendor.includes(sq)) return false;
      }
      if (statusFilter.length > 0 && !statusFilter.includes(doc.status)) return false;
      if (typeFilter.length > 0 && !typeFilter.includes(doc.type)) return false;
      if (dateFrom) {
        const ts = doc.createdAt?.toDate?.();
        if (ts && ts < new Date(dateFrom)) return false;
      }
      if (dateTo) {
        const ts = doc.createdAt?.toDate?.();
        if (ts && ts > new Date(dateTo + 'T23:59:59')) return false;
      }
      if (amountMin && (doc.metadata.amount ?? 0) < Number(amountMin)) return false;
      if (amountMax && (doc.metadata.amount ?? Infinity) > Number(amountMax)) return false;
      return true;
    });
  }, [docs, search, statusFilter, typeFilter, dateFrom, dateTo, amountMin, amountMax]);

  // Duplicate detection: same vendor + amount + invoiceDate
  const duplicates = useMemo(() => {
    const groups: Record<string, DocumentInstance[]> = {};
    for (const doc of docs) {
      const { vendor, amount, invoiceDate } = doc.metadata;
      if (!vendor || amount == null || !invoiceDate) continue;
      const key = `${vendor.trim().toLowerCase()}|${amount}|${invoiceDate}`;
      groups[key] = [...(groups[key] ?? []), doc];
    }
    return Object.values(groups).filter(g => g.length > 1);
  }, [docs]);

  const duplicateIds = useMemo(() => new Set(duplicates.flat().map(d => d.id)), [duplicates]);

  const toggleSelect = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const selectAll = () => setSelectedIds(new Set(filtered.slice(0, displayCount).map(d => d.id)));
  const deselectAll = () => setSelectedIds(new Set());

  const exportCsv = (docsToExport = filtered) => {
    const headers = ['ID', 'Tytuł', 'Typ', 'Status', 'Dostawca', 'Kwota', 'Waluta', 'Data faktury', 'Email', 'Data utworzenia'];
    const rows = filtered.map(doc => [
      doc.id,
      `"${(doc.metadata.title ?? '').replace(/"/g, '""')}"`,
      DOC_TYPE_LABELS[doc.type],
      STATUS_LABELS[doc.status],
      `"${(doc.metadata.vendor ?? '').replace(/"/g, '""')}"`,
      doc.metadata.amount ?? '',
      doc.metadata.currency ?? 'PLN',
      doc.metadata.invoiceDate ?? '',
      doc.submittedByEmail,
      doc.createdAt?.toDate?.() ? format(doc.createdAt.toDate(), 'yyyy-MM-dd') : '',
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `archiwum-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportSelected = () => {
    const sel = filtered.filter(d => selectedIds.has(d.id));
    if (sel.length > 0) exportCsv(sel);
  };

  const clearFilters = () => {
    setStatusFilter([]); setTypeFilter([]);
    setDateFrom(''); setDateTo('');
    setAmountMin(''); setAmountMax('');
    setSearch('');
  };

  const activeFilterCount = [
    statusFilter.length > 0, typeFilter.length > 0,
    !!dateFrom, !!dateTo, !!amountMin, !!amountMax,
  ].filter(Boolean).length;

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="animate-spin text-slate-400" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Duplicate warning */}
      {duplicates.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-black text-amber-800 uppercase">
              Wykryto {duplicates.length} potencjalnych duplikat{duplicates.length === 1 ? '' : 'ów'} faktur
            </p>
            <p className="text-[10px] text-amber-600 mt-0.5">
              Ten sam dostawca + kwota + data faktury — sprawdź czy nie złożono dwukrotnie.
            </p>
            <div className="mt-2 space-y-0.5">
              {duplicates.slice(0, 3).map((group, i) => (
                <p key={i} className="text-[9px] text-amber-700 font-mono">
                  {group.map(d => d.metadata.title).join(' · ')}
                </p>
              ))}
              {duplicates.length > 3 && (
                <p className="text-[9px] text-amber-500 font-bold">+ {duplicates.length - 3} więcej</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search + controls */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Szukaj po tytule lub dostawcy..."
            className="w-full bg-slate-50 rounded-2xl pl-10 pr-10 py-3 text-sm focus:ring-2 focus:ring-indigo-500 border-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2">
              <X size={12} className="text-slate-400" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black uppercase transition-all ${
            activeFilterCount > 0 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Filter size={12} />
          Filtry{activeFilterCount > 0 && ` (${activeFilterCount})`}
        </button>
        <button
          onClick={() => exportCsv()}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-black uppercase transition-all disabled:opacity-40"
        >
          <Download size={12} /> CSV
        </button>
        {selectedIds.size > 0 && (
          <button
            onClick={exportSelected}
            className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase transition-all hover:bg-indigo-700"
          >
            <Download size={12} /> Zaznaczone ({selectedIds.size})
          </button>
        )}
        {filtered.length > 0 && (
          <button
            onClick={selectedIds.size === filtered.slice(0, displayCount).length ? deselectAll : selectAll}
            className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-indigo-600 transition-colors px-3 py-3"
          >
            {selectedIds.size === filtered.slice(0, displayCount).length ? 'Odznacz' : 'Zaznacz wszystkie'}
          </button>
        )}
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="bg-slate-50 rounded-[2rem] p-6 space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Filtry</p>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="text-[9px] text-indigo-600 font-black uppercase hover:underline">
                Wyczyść wszystko
              </button>
            )}
          </div>

          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Status</p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                  className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-full transition-all ${
                    statusFilter.includes(s) ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Typ dokumentu</p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}
                  className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-full transition-all ${
                    typeFilter.includes(t) ? 'bg-violet-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-violet-300'
                  }`}
                >
                  {DOC_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Data od', type: 'date', value: dateFrom, set: setDateFrom },
              { label: 'Data do', type: 'date', value: dateTo, set: setDateTo },
              { label: 'Kwota min', type: 'number', value: amountMin, set: setAmountMin, placeholder: '0' },
              { label: 'Kwota max', type: 'number', value: amountMax, set: setAmountMax, placeholder: '∞' },
            ].map(({ label, type, value, set, placeholder }) => (
              <div key={label}>
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{label}</p>
                <input
                  type={type}
                  value={value}
                  onChange={e => set(e.target.value)}
                  placeholder={placeholder}
                  className="w-full bg-white rounded-xl px-3 py-2 text-xs border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results count */}
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
        {filtered.length} dokumentów{filtered.length !== docs.length && ` z ${docs.length}`}
      </p>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-slate-300">
          <Archive size={36} className="mb-4" />
          <p className="text-sm font-black uppercase tracking-widest">Brak wyników</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {filtered.slice(0, displayCount).map(doc => (
              <ArchiveRow
                key={doc.id}
                document={doc}
                isDuplicate={duplicateIds.has(doc.id)}
                isSelected={selectedIds.has(doc.id)}
                onToggleSelect={() => toggleSelect(doc.id)}
                onClick={() => onSelectDocument(doc)}
              />
            ))}
          </div>
          {filtered.length > displayCount && (
            <button
              onClick={() => setDisplayCount(c => c + 50)}
              className="w-full py-4 text-xs font-black text-indigo-600 uppercase hover:bg-indigo-50 rounded-2xl transition-all"
            >
              Załaduj więcej ({filtered.length - displayCount} pozostałych)
            </button>
          )}
        </>
      )}
    </div>
  );
}

function ArchiveRow({
  document: doc, isDuplicate, isSelected, onToggleSelect, onClick,
}: {
  document: DocumentInstance; isDuplicate: boolean; isSelected: boolean;
  onToggleSelect: () => void; onClick: () => void;
}) {
  const createdDate = doc.createdAt?.toDate?.()
    ? format(doc.createdAt.toDate(), 'dd MMM yyyy', { locale: pl })
    : '—';

  return (
    <div className="flex items-center gap-2">
      <div
        onClick={e => { e.stopPropagation(); onToggleSelect(); }}
        className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 cursor-pointer transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 hover:border-indigo-400'}`}
      >
        {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
      </div>
      <button
      onClick={onClick}
      className={`flex-1 flex items-center gap-4 p-5 rounded-[1.75rem] border text-left group transition-all hover:shadow-md ${
        isSelected ? 'bg-indigo-50 border-indigo-200' : isDuplicate ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100 hover:border-slate-200'
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          {isDuplicate && <AlertTriangle size={11} className="text-amber-500 flex-shrink-0" />}
          <span className="text-sm font-black text-slate-900 truncate">{doc.metadata.title}</span>
          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_COLORS[doc.status]}`}>
            {STATUS_LABELS[doc.status]}
          </span>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase flex-wrap">
          <span className="flex items-center gap-1"><Hash size={9} />{DOC_TYPE_LABELS[doc.type]}</span>
          {doc.metadata.vendor && <span className="text-slate-600">{doc.metadata.vendor}</span>}
          {doc.metadata.amount != null && (
            <span className="flex items-center gap-1 font-black text-slate-700">
              <Banknote size={9} />
              {doc.metadata.amount.toFixed(2)} {doc.metadata.currency ?? 'PLN'}
            </span>
          )}
          <span className="flex items-center gap-1"><Calendar size={9} />{createdDate}</span>
        </div>
      </div>
      <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 flex-shrink-0 transition-colors" />
    </button>
    </div>
  );
}
