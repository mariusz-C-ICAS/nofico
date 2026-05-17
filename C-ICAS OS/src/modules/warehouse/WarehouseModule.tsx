import React, { useState, lazy, Suspense } from 'react';
import { Package, ArrowLeftRight, ClipboardList, Bell } from 'lucide-react';
import IdesGenerateButton from '../../shared/components/IdesGenerateButton';

const WarehouseDashboard   = lazy(() => import('./components/WarehouseDashboard'));
const StockMovementList    = lazy(() => import('./components/StockMovementList'));
const InventoryCountPanel  = lazy(() => import('./components/InventoryCountPanel'));
const ReplenishmentAlerts  = lazy(() => import('./components/ReplenishmentAlerts'));

type WTab = 'dashboard' | 'movements' | 'inventory' | 'alerts';

const TABS: { id: WTab; label: string; Icon: React.ElementType }[] = [
  { id: 'dashboard',  label: 'Przegląd produktów',  Icon: Package },
  { id: 'movements',  label: 'Ruchy magazynowe',    Icon: ArrowLeftRight },
  { id: 'inventory',  label: 'Remanent',             Icon: ClipboardList },
  { id: 'alerts',     label: 'Alerty uzupełnień',   Icon: Bell },
];

export default function WarehouseModule() {
  const [tab, setTab] = useState<WTab>('dashboard');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="w-7 h-7 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Magazyn</h1>
            <p className="text-sm text-gray-500">Stany magazynowe, ruchy towarów i uzupełnienia</p>
          </div>
        </div>
        <IdesGenerateButton moduleKey="assets" />
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6 overflow-x-auto">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium whitespace-nowrap transition-colors ${
                tab === id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      <Suspense fallback={<div className="text-center py-16 text-gray-400 text-sm">Ładowanie…</div>}>
        {tab === 'dashboard' && <WarehouseDashboard />}
        {tab === 'movements' && <StockMovementList />}
        {tab === 'inventory' && <InventoryCountPanel />}
        {tab === 'alerts'    && <ReplenishmentAlerts />}
      </Suspense>
    </div>
  );
}
