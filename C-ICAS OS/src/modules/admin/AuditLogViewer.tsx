import React, { useState, useEffect } from 'react';
import {
  collection, query, where, orderBy, limit, getDocs, startAfter, QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../../shared/lib/firebase';
import { useAuth } from '../../shared/hooks/AuthContext';
import { AuditEventType } from '../../shared/lib/audit';
import { Search, RefreshCw, ChevronDown } from 'lucide-react';

interface AuditEntry {
  id: string;
  userId: string;
  userEmail?: string;
  type: string;
  tenantId: string | null;
  category?: string;
  details: any;
  timestamp: any;
}

const PAGE_SIZE = 25;

const EVENT_COLORS: Record<string, string> = {
  'user.login': 'bg-emerald-50 text-emerald-700',
  'user.logout': 'bg-slate-100 text-slate-500',
  'data.create': 'bg-blue-50 text-blue-700',
  'data.update': 'bg-amber-50 text-amber-700',
  'data.delete': 'bg-rose-50 text-rose-700',
  'permission.denied': 'bg-rose-100 text-rose-800',
  'security.sensitive': 'bg-red-100 text-red-800',
};

export default function AuditLogViewer() {
  const { activeTenantId } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchPage = async (after?: QueryDocumentSnapshot) => {
    setLoading(true);
    try {
      const constraints: any[] = [orderBy('timestamp', 'desc'), limit(PAGE_SIZE)];
      if (activeTenantId) constraints.unshift(where('tenantId', '==', activeTenantId));
      if (filterType) constraints.unshift(where('type', '==', filterType));
      if (filterCategory) constraints.unshift(where('category', '==', filterCategory));
      if (after) constraints.push(startAfter(after));

      const snap = await getDocs(query(collection(db, 'auditLogs'), ...constraints));
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditEntry));
      setEntries(prev => after ? [...prev, ...docs] : docs);
      setLastDoc(snap.docs[snap.docs.length - 1] ?? null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error('AuditLogViewer fetch error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPage(); }, [activeTenantId, filterType, filterCategory]);

  const formatTs = (ts: any) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'medium' });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-black uppercase italic tracking-tight text-slate-900">Logi Audytowe</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Wszystkie zdarzenia systemowe
            </p>
          </div>
          <button
            onClick={() => fetchPage()}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Odśwież
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 px-6 py-4 border-b border-slate-100">
          <div className="relative flex-1 max-w-xs">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={filterType}
              onChange={e => { setFilterType(e.target.value); setEntries([]); }}
              className="w-full pl-8 pr-3 py-2 text-[11px] font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 appearance-none"
            >
              <option value="">Wszystkie typy</option>
              {Object.values(AuditEventType).map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="relative flex-1 max-w-xs">
            <select
              value={filterCategory}
              onChange={e => { setFilterCategory(e.target.value); setEntries([]); }}
              className="w-full px-3 py-2 text-[11px] font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 appearance-none"
            >
              <option value="">Wszystkie kategorie</option>
              {['documents', 'users', 'transactions', 'master_data', 'system', 'general'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-slate-100">
                {['Czas', 'Typ', 'Kategoria', 'Użytkownik', 'Szczegóły'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-black uppercase tracking-widest text-slate-400 text-[9px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {entries.map(e => (
                <React.Fragment key={e.id}>
                  <tr
                    className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                    onClick={() => setExpanded(expanded === e.id ? null : e.id)}
                  >
                    <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">{formatTs(e.timestamp)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full font-black text-[9px] uppercase ${EVENT_COLORS[e.type] ?? 'bg-slate-100 text-slate-600'}`}>
                        {e.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-bold">{e.category ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600 font-semibold truncate max-w-[180px]">{e.userEmail ?? e.userId}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-slate-400">
                        <ChevronDown size={11} className={`transition-transform ${expanded === e.id ? 'rotate-180' : ''}`} />
                        JSON
                      </span>
                    </td>
                  </tr>
                  {expanded === e.id && (
                    <tr>
                      <td colSpan={5} className="px-6 py-3 bg-slate-50">
                        <pre className="text-[10px] text-slate-600 font-mono whitespace-pre-wrap break-all max-h-40 overflow-auto">
                          {JSON.stringify(e.details, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          {loading && (
            <div className="py-8 text-center text-[10px] font-black uppercase text-slate-400 tracking-widest">
              Ładowanie...
            </div>
          )}
          {!loading && entries.length === 0 && (
            <div className="py-12 text-center text-[10px] font-black uppercase text-slate-300 tracking-widest">
              Brak logów
            </div>
          )}
        </div>

        {/* Load more */}
        {hasMore && !loading && (
          <div className="flex justify-center p-4 border-t border-slate-100">
            <button
              onClick={() => lastDoc && fetchPage(lastDoc)}
              className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              Załaduj więcej →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
