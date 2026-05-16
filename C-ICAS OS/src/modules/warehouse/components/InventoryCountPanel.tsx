import React, { useEffect, useState } from 'react';
import { db } from '../../../shared/lib/firebase';
import {
  collection, query, orderBy, getDocs, addDoc, updateDoc,
  doc, serverTimestamp, where,
} from 'firebase/firestore';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { InventoryCount, InventoryCountItem, InventoryCountStatus, WarehouseProduct } from '../types';
import { ClipboardList, Plus, CheckCircle2, ChevronLeft, Save, Loader2 } from 'lucide-react';

const STATUS_META: Record<InventoryCountStatus, { label: string; color: string }> = {
  OPEN:        { label: 'Otwarty',    color: 'bg-blue-100 text-blue-700' },
  IN_PROGRESS: { label: 'W toku',    color: 'bg-amber-100 text-amber-700' },
  COMPLETED:   { label: 'Zakończony', color: 'bg-emerald-100 text-emerald-700' },
  CANCELLED:   { label: 'Anulowany', color: 'bg-red-100 text-red-600' },
};

export default function InventoryCountPanel() {
  const { activeTenantId, currentUser } = useAuth() as any;
  const [counts,      setCounts]      = useState<InventoryCount[]>([]);
  const [warehouses,  setWarehouses]  = useState<{ id: string; name: string }[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [creating,    setCreating]    = useState(false);
  const [warehouseId, setWarehouseId] = useState('');
  const [selected,    setSelected]    = useState<InventoryCount | null>(null);
  const [products,    setProducts]    = useState<WarehouseProduct[]>([]);
  const [qtys,        setQtys]        = useState<Record<string, number>>({});
  const [saving,      setSaving]      = useState(false);

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

  const openCount = async (count: InventoryCount) => {
    setSelected(count);
    if (!activeTenantId) return;
    const pSnap = await getDocs(
      query(
        collection(db, `tenants/${activeTenantId}/warehouseProducts`),
        where('warehouseId', '==', count.warehouseId),
        where('status', '==', 'ACTIVE'),
      )
    );
    const prods = pSnap.docs.map(d => ({ id: d.id, ...d.data() } as WarehouseProduct));
    setProducts(prods);
    // Pre-fill from existing items
    const init: Record<string, number> = {};
    count.items.forEach(i => { init[i.productId] = i.countedQuantity; });
    prods.forEach(p => { if (!(p.id in init)) init[p.id] = 0; });
    setQtys(init);
  };

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

  const saveItems = async (finish: boolean) => {
    if (!selected || !activeTenantId) return;
    setSaving(true);
    try {
      const items: InventoryCountItem[] = products.map(p => {
        const counted      = qtys[p.id] ?? 0;
        const expected     = p.currentStock;
        const discrepancy  = counted - expected;
        return {
          productId:         p.id,
          expectedQuantity:  expected,
          countedQuantity:   counted,
          discrepancy,
          unitCost:          p.unitCostAverage,
        };
      });

      const discrepancyValue = items.reduce((s, i) => s + i.discrepancy * i.unitCost, 0);

      await updateDoc(doc(db, `tenants/${activeTenantId}/inventoryCounts`, selected.id), {
        items,
        discrepancyValue: Math.round(discrepancyValue * 100) / 100,
        status:           finish ? 'COMPLETED' : 'IN_PROGRESS',
        ...(finish ? {
          completedBy: currentUser?.uid ?? 'system',
          completedAt: serverTimestamp(),
        } : {}),
      });

      await reload();
      if (finish) setSelected(null);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-16 text-gray-400">Ładowanie…</div>;

  // Detail view
  if (selected) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ChevronLeft size={16} />
          Powrót do listy
        </button>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-indigo-500" />
              Remanent — {warehouses.find(w => w.id === selected.warehouseId)?.name ?? selected.warehouseId}
            </h2>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_META[selected.status].color}`}>
              {STATUS_META[selected.status].label}
            </span>
          </div>
          <p className="text-xs text-gray-400 mb-4">Wpisz zliczone ilości dla każdego produktu. Różnica = zliczona − systemowa.</p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">SKU</th>
                  <th className="px-4 py-3 text-left">Nazwa</th>
                  <th className="px-4 py-3 text-right">Systemowa</th>
                  <th className="px-4 py-3 text-right">Zliczona</th>
                  <th className="px-4 py-3 text-right">Różnica</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                      Brak produktów w tym magazynie
                    </td>
                  </tr>
                )}
                {products.map(p => {
                  const counted = qtys[p.id] ?? 0;
                  const diff    = counted - p.currentStock;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-400">{p.sku}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {p.currentStock} {p.unit}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          min={0}
                          step="0.001"
                          value={counted}
                          onChange={e => setQtys(prev => ({ ...prev, [p.id]: parseFloat(e.target.value) || 0 }))}
                          disabled={selected.status === 'COMPLETED' || selected.status === 'CANCELLED'}
                          className="w-24 text-right border border-gray-200 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-50"
                        />
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold text-sm ${diff < 0 ? 'text-rose-600' : diff > 0 ? 'text-amber-600' : 'text-emerald-500'}`}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(3)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {selected.status !== 'COMPLETED' && selected.status !== 'CANCELLED' && (
            <div className="flex gap-3 mt-5 pt-4 border-t border-gray-100">
              <button
                onClick={() => saveItems(false)}
                disabled={saving}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                Zapisz częściowo
              </button>
              <button
                onClick={() => saveItems(true)}
                disabled={saving || products.length === 0}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
              >
                <CheckCircle2 size={14} />
                Finalizuj remanent
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // List view
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
              <th className="px-6 py-3 text-left">Magazyn</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-right">Pozycji</th>
              <th className="px-6 py-3 text-right">Różnica wartości</th>
              <th className="px-6 py-3 text-left">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {counts.map(c => {
              const meta = STATUS_META[c.status];
              return (
                <tr key={c.id} onClick={() => openCount(c)} className="hover:bg-indigo-50 cursor-pointer transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-gray-400">{c.id.slice(0, 8)}</td>
                  <td className="px-6 py-4 text-gray-600 text-xs">
                    {warehouses.find(w => w.id === c.warehouseId)?.name ?? c.warehouseId.slice(0, 8)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`}>{meta.label}</span>
                  </td>
                  <td className="px-6 py-4 text-right text-gray-600">{c.items.length}</td>
                  <td className={`px-6 py-4 text-right font-medium ${c.discrepancyValue < 0 ? 'text-rose-600' : c.discrepancyValue > 0 ? 'text-amber-600' : 'text-emerald-500'}`}>
                    {c.discrepancyValue > 0 ? '+' : ''}{c.discrepancyValue.toFixed(2)} PLN
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs">
                    {(c.createdAt as any)?.toDate?.()?.toLocaleDateString('pl-PL') ?? '—'}
                  </td>
                </tr>
              );
            })}
            {!counts.length && <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">Brak remanentów</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
