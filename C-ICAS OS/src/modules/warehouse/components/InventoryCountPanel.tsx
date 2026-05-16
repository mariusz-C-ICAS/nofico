import React, { useEffect, useState } from 'react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, orderBy, getDocs, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { InventoryCount, InventoryCountStatus } from '../types';
import { ClipboardList, Plus, CheckCircle2, Clock, XCircle } from 'lucide-react';

const STATUS_META: Record<InventoryCountStatus, { label: string; color: string }> = {
  OPEN:        { label: 'Otwarty',    color: 'bg-blue-100 text-blue-700' },
  IN_PROGRESS: { label: 'W toku',    color: 'bg-amber-100 text-amber-700' },
  COMPLETED:   { label: 'Zakończony', color: 'bg-emerald-100 text-emerald-700' },
  CANCELLED:   { label: 'Anulowany', color: 'bg-red-100 text-red-600' },
};

export default function InventoryCountPanel() {
  const { activeTenantId, currentUser } = useAuth() as any;
  const [counts, setCounts]         = useState<InventoryCount[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading]       = useState(true);
  const [creating, setCreating]     = useState(false);
  const [warehouseId, setWarehouseId] = useState('');

  const reload = async () => {
    if (!activeTenantId) return;
    const [cSnap, wSnap] = await Promise.all([
      getDocs(query(collection(db, `tenants/${activeTenantId}/inventoryCounts`), orderBy('createdAt', 'desc'))),
      getDocs(query(collection(db, `tenants/${activeTenantId}/warehouses`), where('isActive', '==', true))),
    ]);
    setCounts(cSnap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryCount)));
    setWarehouses(wSnap.docs.map(d => ({ id: d.id, name: (d.data() as any).name as string })));
  };

  useEffect(() => { reload().finally(() => setLoading(false)); }, [activeTenantId]);

  const createCount = async () => {
    if (!warehouseId || !activeTenantId) return;
    setCreating(true);
    try {
      await addDoc(collection(db, `tenants/${activeTenantId}/inventoryCounts`), {
        tenantId: activeTenantId,
        warehouseId,
        status: 'OPEN',
        items: [],
        startedBy: currentUser?.uid ?? 'system',
        discrepancyValue: 0,
        createdAt: serverTimestamp(),
      });
      setWarehouseId('');
      await reload();
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="text-center py-16 text-gray-400">Ładowanie…</div>;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-indigo-500" />
          Nowy remanent
        </h2>
        <div className="flex gap-3">
          <select
            value={warehouseId}
            onChange={e => setWarehouseId(e.target.value)}
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Wybierz magazyn…</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <button
            onClick={createCount}
            disabled={!warehouseId || creating}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            {creating ? 'Tworzę…' : 'Utwórz'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Historia remanentów</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-6 py-3 text-left">ID</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-right">Pozycji</th>
              <th className="px-6 py-3 text-right">Różnica</th>
              <th className="px-6 py-3 text-left">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {counts.map(c => {
              const meta = STATUS_META[c.status];
              return (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-xs text-gray-400">{c.id.slice(0, 8)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`}>{meta.label}</span>
                  </td>
                  <td className="px-6 py-4 text-right text-gray-600">{c.items.length}</td>
                  <td className={`px-6 py-4 text-right font-medium ${c.discrepancyValue < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {c.discrepancyValue.toFixed(2)} PLN
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs">{(c.createdAt as any)?.toDate?.()?.toLocaleDateString('pl-PL') ?? '—'}</td>
                </tr>
              );
            })}
            {!counts.length && <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400">Brak remanentów</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
