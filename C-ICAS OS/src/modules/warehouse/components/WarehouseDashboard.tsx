import React, { useEffect, useState } from 'react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { useTenant } from '../../../shared/hooks/useTenant';
import { WarehouseProduct } from '../types';
import { Package, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';

export default function WarehouseDashboard() {
  const { activeTenantId } = useTenant();
  const [products, setProducts] = useState<WarehouseProduct[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!activeTenantId) return;
    getDocs(
      query(
        collection(db, `tenants/${activeTenantId}/warehouseProducts`),
        where('status', '==', 'ACTIVE'),
        orderBy('name'),
      ),
    )
      .then(snap => setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as WarehouseProduct))))
      .finally(() => setLoading(false));
  }, [activeTenantId]);

  const totalValue = products.reduce((s, p) => s + p.currentStock * p.unitCostAverage, 0);
  const lowStock   = products.filter(p => p.currentStock <= p.minStock && p.currentStock > 0).length;
  const outStock   = products.filter(p => p.currentStock === 0).length;

  const kpis = [
    { label: 'Wartość stanów',      value: `${totalValue.toLocaleString('pl-PL', { maximumFractionDigits: 0 })} PLN`, Icon: Package,       color: 'indigo' },
    { label: 'Produkty aktywne',    value: products.length,                                                             Icon: TrendingUp,    color: 'emerald' },
    { label: 'Poniżej min. stanu',  value: lowStock,                                                                    Icon: AlertTriangle, color: 'amber' },
    { label: 'Brak na stanie',      value: outStock,                                                                    Icon: TrendingDown,  color: 'rose' },
  ];

  if (loading) return <div className="text-center py-16 text-gray-400">Ładowanie…</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(({ label, value, Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 text-${color}-500`} />
              <span className="text-xs text-gray-500 font-medium">{label}</span>
            </div>
            <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Produkty na stanie</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-6 py-3 text-left">SKU / Nazwa</th>
                <th className="px-6 py-3 text-right">Stan</th>
                <th className="px-6 py-3 text-right">Min</th>
                <th className="px-6 py-3 text-right">Śr. koszt</th>
                <th className="px-6 py-3 text-right">Wartość</th>
                <th className="px-6 py-3 text-center">ABC/XYZ</th>
                <th className="px-6 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map(p => {
                const isLow = p.currentStock <= p.minStock;
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.sku}</p>
                    </td>
                    <td className={`px-6 py-4 text-right font-semibold ${isLow ? 'text-rose-600' : 'text-gray-900'}`}>
                      {p.currentStock} {p.unit}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-500">{p.minStock}</td>
                    <td className="px-6 py-4 text-right text-gray-600">{p.unitCostAverage.toFixed(2)} PLN</td>
                    <td className="px-6 py-4 text-right font-medium">
                      {(p.currentStock * p.unitCostAverage).toLocaleString('pl-PL', { maximumFractionDigits: 0 })} PLN
                    </td>
                    <td className="px-6 py-4 text-center">
                      {p.abcClass && p.xyzClass
                        ? <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">{p.abcClass}{p.xyzClass}</span>
                        : '—'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isLow ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {isLow ? 'Niski stan' : 'OK'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!products.length && (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-400">Brak produktów</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
