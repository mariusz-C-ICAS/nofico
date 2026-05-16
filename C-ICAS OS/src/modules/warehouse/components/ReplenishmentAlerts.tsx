import React, { useEffect, useState } from 'react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, where, orderBy, getDocs, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { ReplenishmentAlert, ReplenishmentStatus } from '../types';
import { Bell, ShoppingCart, X } from 'lucide-react';

const STATUS_META: Record<ReplenishmentStatus, { label: string; color: string }> = {
  PENDING:   { label: 'Oczekujący', color: 'bg-amber-100 text-amber-700' },
  ORDERED:   { label: 'Zamówiono',  color: 'bg-blue-100 text-blue-700' },
  DISMISSED: { label: 'Odrzucony', color: 'bg-gray-100 text-gray-500' },
};

export default function ReplenishmentAlerts() {
  const { activeTenantId } = useAuth() as any;
  const [alerts, setAlerts] = useState<ReplenishmentAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<ReplenishmentStatus | 'ALL'>('PENDING');

  const load = () => {
    if (!activeTenantId) return;
    setLoading(true);
    const q = filter === 'ALL'
      ? query(collection(db, `tenants/${activeTenantId}/replenishmentAlerts`), orderBy('createdAt', 'desc'))
      : query(collection(db, `tenants/${activeTenantId}/replenishmentAlerts`), where('status', '==', filter), orderBy('createdAt', 'desc'));
    getDocs(q)
      .then(snap => setAlerts(snap.docs.map(d => ({ id: d.id, ...d.data() } as ReplenishmentAlert))))
      .finally(() => setLoading(false));
  };

  useEffect(load, [activeTenantId, filter]);

  const updateStatus = async (alertId: string, status: ReplenishmentStatus) => {
    await updateDoc(doc(db, `tenants/${activeTenantId}/replenishmentAlerts/${alertId}`), { status });
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status } : a));
  };

  const pending = alerts.filter(a => a.status === 'PENDING').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-500" />
          <span className="font-medium text-gray-800">Alerty uzupełnień</span>
          {pending > 0 && (
            <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{pending}</span>
          )}
        </div>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value as ReplenishmentStatus | 'ALL')}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5"
        >
          <option value="PENDING">Oczekujące</option>
          <option value="ORDERED">Zamówione</option>
          <option value="DISMISSED">Odrzucone</option>
          <option value="ALL">Wszystkie</option>
        </select>
      </div>

      {loading && <div className="text-center py-16 text-gray-400">Ładowanie…</div>}
      {!loading && !alerts.length && (
        <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-100">Brak alertów</div>
      )}

      <div className="space-y-3">
        {alerts.map(a => (
          <div key={a.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_META[a.status].color}`}>
                  {STATUS_META[a.status].label}
                </span>
                <span className="text-xs text-gray-400">{(a.createdAt as any)?.toDate?.()?.toLocaleDateString('pl-PL')}</span>
              </div>
              <p className="text-xs text-gray-400 font-mono mb-1">{a.productId.slice(0, 12)}</p>
              <div className="flex gap-4 text-sm">
                <span>Stan: <strong className="text-rose-600">{a.currentStock}</strong></span>
                <span>Min: <strong>{a.minStock}</strong></span>
                <span>Zamów: <strong className="text-indigo-600">{a.suggestedOrderQuantity}</strong></span>
              </div>
            </div>
            {a.status === 'PENDING' && (
              <div className="flex gap-2">
                <button
                  onClick={() => updateStatus(a.id, 'ORDERED')}
                  className="flex items-center gap-1 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg font-medium"
                >
                  <ShoppingCart className="w-3 h-3" /> Zamów
                </button>
                <button
                  onClick={() => updateStatus(a.id, 'DISMISSED')}
                  className="flex items-center gap-1 text-xs bg-gray-50 hover:bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg font-medium"
                >
                  <X className="w-3 h-3" /> Odrzuć
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
