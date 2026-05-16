import React, { useEffect, useState } from 'react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { StockMovement, MovementType, MovementStatus } from '../types';
import { Filter } from 'lucide-react';

const TYPE_LABELS: Record<MovementType, { label: string; color: string }> = {
  PZ:                   { label: 'PZ Przyjęcie',          color: 'bg-emerald-100 text-emerald-700' },
  WZ:                   { label: 'WZ Wydanie',            color: 'bg-rose-100 text-rose-700' },
  MM_IN:                { label: 'MM Przesunięcie IN',    color: 'bg-blue-100 text-blue-700' },
  MM_OUT:               { label: 'MM Przesunięcie OUT',   color: 'bg-blue-50 text-blue-600' },
  RW:                   { label: 'RW Rozchód wewn.',      color: 'bg-amber-100 text-amber-700' },
  PW:                   { label: 'PW Przychód wewn.',     color: 'bg-purple-100 text-purple-700' },
  INVENTORY_ADJUSTMENT: { label: 'Korekta remanentowa',  color: 'bg-gray-100 text-gray-700' },
};

const STATUS_LABELS: Record<MovementStatus, { label: string; color: string }> = {
  DRAFT:     { label: 'Szkic',        color: 'bg-gray-100 text-gray-600' },
  CONFIRMED: { label: 'Potwierdzone', color: 'bg-emerald-100 text-emerald-700' },
  CANCELLED: { label: 'Anulowane',   color: 'bg-red-100 text-red-600' },
};

export default function StockMovementList() {
  const { activeTenantId } = useAuth() as any;
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filterType, setFilterType] = useState<MovementType | 'ALL'>('ALL');

  useEffect(() => {
    if (!activeTenantId) return;
    setLoading(true);
    const q = filterType === 'ALL'
      ? query(collection(db, `tenants/${activeTenantId}/stockMovements`), orderBy('createdAt', 'desc'), limit(100))
      : query(collection(db, `tenants/${activeTenantId}/stockMovements`), where('type', '==', filterType), orderBy('createdAt', 'desc'), limit(100));
    getDocs(q)
      .then(snap => setMovements(snap.docs.map(d => ({ id: d.id, ...d.data() } as StockMovement))))
      .finally(() => setLoading(false));
  }, [activeTenantId, filterType]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as MovementType | 'ALL')}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Wszystkie typy</option>
            {(Object.keys(TYPE_LABELS) as MovementType[]).map(t => (
              <option key={t} value={t}>{TYPE_LABELS[t].label}</option>
            ))}
          </select>
        </div>
        <span className="text-xs text-gray-400">Ostatnie 100 ruchów</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-6 py-3 text-left">Nr dokumentu</th>
              <th className="px-6 py-3 text-left">Typ</th>
              <th className="px-6 py-3 text-right">Poz.</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Data</th>
              <th className="px-6 py-3 text-left">Wystawił</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">Ładowanie…</td></tr>}
            {!loading && !movements.length && <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">Brak ruchów</td></tr>}
            {movements.map(m => {
              const tInfo = TYPE_LABELS[m.type];
              const sInfo = STATUS_LABELS[m.status];
              return (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-sm font-medium">{m.documentNumber}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${tInfo.color}`}>{tInfo.label}</span>
                  </td>
                  <td className="px-6 py-4 text-right text-gray-500">{m.items.length}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sInfo.color}`}>{sInfo.label}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs">{(m.createdAt as any)?.toDate?.()?.toLocaleDateString('pl-PL') ?? '—'}</td>
                  <td className="px-6 py-4 text-gray-400 text-xs font-mono truncate max-w-[8rem]">{m.createdBy}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
