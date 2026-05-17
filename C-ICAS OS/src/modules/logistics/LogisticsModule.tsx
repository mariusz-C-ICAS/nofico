/**
 * Data: 2026-05-16
 * Sciezka: /src/modules/logistics/LogisticsModule.tsx
 */
import React, { useState, useEffect } from 'react';
import {
  Truck, Wrench, Package, CalendarCheck, ClipboardList, History,
  AlertTriangle, Settings2, Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../../shared/lib/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { useAuth } from '../../shared/hooks/AuthContext';
import FleetModule from './components/FleetModule';
import AssetInventory from './components/AssetInventory';
import IdesGenerateButton from '../../shared/components/IdesGenerateButton';

type LogisticsTab = 'flota' | 'sprzet' | 'magazyn' | 'rezerwacje' | 'przeglady' | 'historia';

interface Stats { totalVehicles: number; totalAssets: number; maintenanceDue: number; activeReservations: number }

export default function LogisticsModule() {
  const { activeTenantId } = useAuth() as any;
  const [activeTab, setActiveTab] = useState<LogisticsTab>('flota');
  const [stats, setStats] = useState<Stats>({ totalVehicles: 0, totalAssets: 0, maintenanceDue: 0, activeReservations: 0 });

  useEffect(() => {
    if (!activeTenantId) return;
    (async () => {
      const [vSnap, aSnap, mSnap, rSnap] = await Promise.all([
        getDocs(collection(db, `tenants/${activeTenantId}/vehicles`)),
        getDocs(collection(db, `tenants/${activeTenantId}/assets`)),
        getDocs(query(collection(db, `tenants/${activeTenantId}/vehicleMaintenances`), where('status', '==', 'Wymagany'))),
        getDocs(query(collection(db, `tenants/${activeTenantId}/vehicleReservations`), where('status', 'in', ['Potwierdzona', 'Oczekujaca', 'W trakcie']))),
      ]);
      setStats({
        totalVehicles:    vSnap.size,
        totalAssets:      aSnap.size,
        maintenanceDue:   mSnap.size,
        activeReservations: rSnap.size,
      });
    })();
  }, [activeTenantId]);

  const tabs: { id: LogisticsTab; label: string; icon: React.ElementType }[] = [
    { id: 'flota',      label: 'Flota',          icon: Truck         },
    { id: 'sprzet',     label: 'Sprzet & Maszyny',icon: Wrench        },
    { id: 'magazyn',    label: 'Magazyn',         icon: Package       },
    { id: 'rezerwacje', label: 'Rezerwacje',      icon: CalendarCheck },
    { id: 'przeglady',  label: 'Przeglady',       icon: ClipboardList },
    { id: 'historia',   label: 'Historia',        icon: History       },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-12">
      <div className="max-w-7xl mx-auto">

        <div className="bg-slate-900 rounded-[3rem] p-12 text-white relative overflow-hidden shadow-2xl border border-slate-800 mb-12">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
            <div>
              <div className="flex items-center gap-3 mb-6 bg-slate-800/80 w-fit px-5 py-2 rounded-full border border-slate-700">
                <Truck className="text-indigo-400" size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-100">Fleet & Asset Management</span>
              </div>
              <h1 className="text-5xl font-black uppercase tracking-tighter mb-4 italic">
                Logi<span className="text-indigo-500">styka</span>
              </h1>
              <p className="text-slate-400 font-medium text-sm italic">
                Zarzadzanie flota pojazdow, sprzetem, magazynem i rezerwacjami w jednym miejscu.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <IdesGenerateButton moduleKey="assets" />
              {[
                { label: 'Pojazdy', value: stats.totalVehicles,    icon: Truck,          color: 'text-indigo-400' },
                { label: 'Aktywa',  value: stats.totalAssets,      icon: Package,        color: 'text-emerald-400' },
                { label: 'Serwis',  value: stats.maintenanceDue,   icon: AlertTriangle,  color: 'text-amber-400' },
              ].map(s => (
                <div key={s.label} className="bg-slate-800/60 border border-slate-700 rounded-2xl px-6 py-4 flex items-center gap-4">
                  <s.icon size={20} className={s.color} />
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</div>
                    <div className="text-2xl font-black text-white italic">{s.value}</div>
                  </div>
                </div>
              ))}
              <button className="bg-indigo-600 text-white hover:bg-indigo-500 font-black px-8 py-4 rounded-2xl shadow-xl transition-all uppercase tracking-widest text-[10px] flex items-center gap-2">
                <Settings2 size={16} /> Konfiguracja
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-12">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-8 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200'
                  : 'bg-white text-slate-400 hover:text-indigo-600 border border-slate-100'
              }`}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
          >
            {activeTab === 'flota'      && <FleetModule />}
            {activeTab === 'sprzet'     && <AssetInventory />}
            {activeTab === 'magazyn'    && <WarehouseTab />}
            {activeTab === 'rezerwacje' && <ReservationsTab />}
            {activeTab === 'przeglady'  && <InspectionsTab />}
            {activeTab === 'historia'   && <HistoryTab />}
          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  );
}

/* ── Inline placeholder tabs ── */

interface WarehouseProduct {
  code: string; name: string; qty: number; unit: string; location: string; minQty: number;
}

function WarehouseTab() {
  const { activeTenantId } = useAuth() as any;
  const [items, setItems]     = useState<WarehouseProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeTenantId) return;
    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, `tenants/${activeTenantId}/warehouseProducts`));
        setItems(snap.docs.map(d => ({ code: d.id, ...d.data() } as WarehouseProduct)));
      } finally {
        setLoading(false);
      }
    })();
  }, [activeTenantId]);

  return (
    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Magazyn Logistyki</h3>
        <button className="bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-2xl flex items-center gap-2">
          <Package size={14} /> Przyjmij Dostawe
        </button>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={24} /></div>
      ) : items.length === 0 ? (
        <p className="text-sm italic text-slate-400 text-center py-8">Brak pozycji w magazynie</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-black">
            <thead>
              <tr className="border-b border-slate-100">
                {['Kod', 'Nazwa', 'Ilosc', 'Jm', 'Lokalizacja', 'Min. stan', 'Status'].map(h => (
                  <th key={h} className="text-[10px] text-slate-400 uppercase tracking-widest text-left py-3 pr-6 font-black">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map(item => (
                <tr key={item.code} className="hover:bg-slate-50 transition-colors">
                  <td className="py-4 pr-6 text-indigo-600 italic">{item.code}</td>
                  <td className="py-4 pr-6 text-slate-900">{item.name}</td>
                  <td className="py-4 pr-6 text-slate-700">{item.qty}</td>
                  <td className="py-4 pr-6 text-slate-400">{item.unit}</td>
                  <td className="py-4 pr-6 text-slate-500">{item.location}</td>
                  <td className="py-4 pr-6 text-slate-400">{item.minQty}</td>
                  <td className="py-4 pr-6">
                    <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      item.qty > item.minQty ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {item.qty > item.minQty ? 'OK' : 'Niski stan'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface Reservation {
  id: string; vehicle: string; driver: string; from: string; to: string; purpose: string; status: string;
}

function ReservationsTab() {
  const { activeTenantId } = useAuth() as any;
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    if (!activeTenantId) return;
    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, `tenants/${activeTenantId}/vehicleReservations`));
        setReservations(snap.docs.map(d => ({ id: d.id, ...d.data() } as Reservation)));
      } finally {
        setLoading(false);
      }
    })();
  }, [activeTenantId]);

  const statusColor: Record<string, string> = {
    'Potwierdzona': 'bg-emerald-50 text-emerald-600',
    'Oczekujaca':   'bg-amber-50 text-amber-600',
    'W trakcie':    'bg-indigo-50 text-indigo-600',
  };

  return (
    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Rezerwacje Pojazdow</h3>
        <button className="bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-2xl flex items-center gap-2">
          <CalendarCheck size={14} /> Nowa Rezerwacja
        </button>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={24} /></div>
      ) : reservations.length === 0 ? (
        <p className="text-sm italic text-slate-400 text-center py-8">Brak rezerwacji</p>
      ) : (
        <div className="space-y-4">
          {reservations.map(r => (
            <div key={r.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all">
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">
                  <Truck size={20} className="text-white" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{r.id} • {r.driver}</div>
                  <div className="text-sm font-black text-slate-900 italic">{r.vehicle}</div>
                  <div className="text-[10px] text-slate-400 font-bold mt-1">{r.from} → {r.to}</div>
                </div>
              </div>
              <div className="text-right flex flex-col items-end gap-2">
                <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${statusColor[r.status] ?? 'bg-slate-50 text-slate-500'}`}>{r.status}</span>
                <span className="text-[10px] text-slate-400 font-bold">{r.purpose}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface Inspection {
  id: string; plate: string; model: string; type: string; dueDate: string; mileage: string; status: string;
}

function InspectionsTab() {
  const { activeTenantId } = useAuth() as any;
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    if (!activeTenantId) return;
    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, `tenants/${activeTenantId}/vehicleMaintenances`));
        setInspections(snap.docs.map(d => ({ id: d.id, ...d.data() } as Inspection)));
      } finally {
        setLoading(false);
      }
    })();
  }, [activeTenantId]);

  const statusColor: Record<string, string> = {
    'Wymagany': 'bg-rose-50 text-rose-600',
    'Planowany': 'bg-amber-50 text-amber-600',
    'OK': 'bg-emerald-50 text-emerald-600',
  };

  return (
    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Harmonogram Przeglądow</h3>
        <div className="flex items-center gap-3">
          <div className="px-5 py-2 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
            <AlertTriangle size={12} /> {inspections.filter(i => i.status === 'Wymagany').length} wymagaja uwagi
          </div>
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={24} /></div>
      ) : inspections.length === 0 ? (
        <p className="text-sm italic text-slate-400 text-center py-8">Brak przeglądów</p>
      ) : (
        <div className="space-y-4">
          {inspections.map(ins => (
            <div key={ins.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-lg transition-all">
              <div className="flex items-center gap-5">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  ins.status === 'Wymagany' ? 'bg-rose-100' : ins.status === 'Planowany' ? 'bg-amber-100' : 'bg-emerald-100'
                }`}>
                  <ClipboardList size={20} className={ins.status === 'Wymagany' ? 'text-rose-600' : ins.status === 'Planowany' ? 'text-amber-600' : 'text-emerald-600'} />
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{ins.plate} • {ins.model}</div>
                  <div className="text-sm font-black text-slate-900 italic">{ins.type}</div>
                  <div className="text-[10px] text-slate-400 font-bold mt-1">Termin: {ins.dueDate} • {ins.mileage}</div>
                </div>
              </div>
              <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${statusColor[ins.status] ?? 'bg-slate-50 text-slate-500'}`}>{ins.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface FleetEvent {
  id: string; date: string; type: string; vehicle: string; desc: string; cost: string; tech: string;
}

function HistoryTab() {
  const { activeTenantId } = useAuth() as any;
  const [events, setEvents]   = useState<FleetEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeTenantId) return;
    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(query(
          collection(db, `tenants/${activeTenantId}/fleetEvents`),
          orderBy('date', 'desc'),
        ));
        setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() } as FleetEvent)));
      } finally {
        setLoading(false);
      }
    })();
  }, [activeTenantId]);

  const typeColor: Record<string, string> = {
    'Serwis':  'bg-indigo-600 text-white',
    'Wynajem': 'bg-slate-900 text-white',
    'Naprawa': 'bg-amber-500 text-white',
    'Przeglad':'bg-emerald-600 text-white',
    'Awaria':  'bg-rose-600 text-white',
  };

  return (
    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10">
      <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter mb-8">Historia Zdarzen Flotowych</h3>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={24} /></div>
      ) : events.length === 0 ? (
        <p className="text-sm italic text-slate-400 text-center py-8">Brak zdarzeń flotowych</p>
      ) : (
        <div className="space-y-4">
          {events.map(ev => (
            <div key={ev.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all">
              <div className="flex items-center gap-5">
                <div className={`w-14 h-12 rounded-xl flex items-center justify-center font-black text-[9px] ${typeColor[ev.type] ?? 'bg-slate-200 text-slate-700'}`}>
                  {ev.type}
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{ev.id} • {ev.date}</div>
                  <div className="text-sm font-black text-slate-900 italic">{ev.vehicle}</div>
                  <div className="text-[10px] text-slate-500 font-bold mt-1">{ev.desc}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-black text-slate-900 italic">{ev.cost}</div>
                <div className="text-[10px] text-slate-400 font-bold mt-1">{ev.tech}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
