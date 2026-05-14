/**
 * Data: 2026-05-14
 * Sciezka: /src/modules/logistics/LogisticsModule.tsx
 */
import React, { useState } from 'react';
import {
  Truck, Wrench, Package, CalendarCheck, ClipboardList, History,
  ShieldCheck, AlertTriangle, CheckCircle2, Settings2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import FleetModule from './components/FleetModule';
import AssetInventory from './components/AssetInventory';

type LogisticsTab = 'flota' | 'sprzet' | 'magazyn' | 'rezerwacje' | 'przeglady' | 'historia';

const MOCK_STATS = {
  totalVehicles: 12,
  totalAssets: 48,
  maintenanceDue: 3,
  activeReservations: 7,
};

export default function LogisticsModule() {
  const [activeTab, setActiveTab] = useState<LogisticsTab>('flota');

  const tabs: { id: LogisticsTab; label: string; icon: React.ElementType }[] = [
    { id: 'flota', label: 'Flota', icon: Truck },
    { id: 'sprzet', label: 'Sprzet & Maszyny', icon: Wrench },
    { id: 'magazyn', label: 'Magazyn', icon: Package },
    { id: 'rezerwacje', label: 'Rezerwacje', icon: CalendarCheck },
    { id: 'przeglady', label: 'Przeglady', icon: ClipboardList },
    { id: 'historia', label: 'Historia', icon: History },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-12">
      <div className="max-w-7xl mx-auto">

        {/* Dark header */}
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

            {/* Stat cards */}
            <div className="flex flex-wrap gap-4">
              {[
                { label: 'Pojazdy', value: MOCK_STATS.totalVehicles, icon: Truck, color: 'text-indigo-400' },
                { label: 'Aktywa', value: MOCK_STATS.totalAssets, icon: Package, color: 'text-emerald-400' },
                { label: 'Serwis', value: MOCK_STATS.maintenanceDue, icon: AlertTriangle, color: 'text-amber-400' },
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

        {/* Tab navigation */}
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

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
          >
            {activeTab === 'flota' && <FleetModule />}
            {activeTab === 'sprzet' && <AssetInventory />}
            {activeTab === 'magazyn' && <WarehouseTab />}
            {activeTab === 'rezerwacje' && <ReservationsTab />}
            {activeTab === 'przeglady' && <InspectionsTab />}
            {activeTab === 'historia' && <HistoryTab />}
          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  );
}

/* ── Inline placeholder tabs ── */

function WarehouseTab() {
  const items = [
    { code: 'MAG-001', name: 'Olej silnikowy 5W-40', qty: 24, unit: 'L', location: 'Regał A1', minQty: 10 },
    { code: 'MAG-002', name: 'Filtry oleju', qty: 8, unit: 'szt', location: 'Regał A2', minQty: 5 },
    { code: 'MAG-003', name: 'Tarcze hamulcowe', qty: 4, unit: 'kpl', location: 'Regał B1', minQty: 2 },
    { code: 'MAG-004', name: 'Kable holownicze', qty: 2, unit: 'szt', location: 'Regał C3', minQty: 1 },
    { code: 'MAG-005', name: 'Kamizelki odblaskowe', qty: 30, unit: 'szt', location: 'Szafka P1', minQty: 20 },
  ];

  return (
    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Magazyn Logistyki</h3>
        <button className="bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-2xl flex items-center gap-2">
          <Package size={14} /> Przyjmij Dostawe
        </button>
      </div>
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
    </div>
  );
}

function ReservationsTab() {
  const reservations = [
    { id: 'RES-441', vehicle: 'Ford Transit VAN • WA 12345', driver: 'Jan Kowalski', from: '2026-05-15 08:00', to: '2026-05-15 18:00', purpose: 'Dostawa materiałow', status: 'Potwierdzona' },
    { id: 'RES-440', vehicle: 'VW Crafter • WB 56789', driver: 'Adam Nowak', from: '2026-05-16 07:00', to: '2026-05-17 16:00', purpose: 'Transport sprzetu', status: 'Oczekujaca' },
    { id: 'RES-439', vehicle: 'Toyota Hilux • WC 11111', driver: 'Piotr Wis', from: '2026-05-14 10:00', to: '2026-05-14 14:00', purpose: 'Inspekcja budowy', status: 'W trakcie' },
  ];
  const statusColor: Record<string, string> = {
    'Potwierdzona': 'bg-emerald-50 text-emerald-600',
    'Oczekujaca': 'bg-amber-50 text-amber-600',
    'W trakcie': 'bg-indigo-50 text-indigo-600',
  };

  return (
    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Rezerwacje Pojazdow</h3>
        <button className="bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-2xl flex items-center gap-2">
          <CalendarCheck size={14} /> Nowa Rezerwacja
        </button>
      </div>
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
              <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${statusColor[r.status]}`}>{r.status}</span>
              <span className="text-[10px] text-slate-400 font-bold">{r.purpose}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InspectionsTab() {
  const inspections = [
    { plate: 'WA 12345', model: 'Ford Transit', type: 'Przeglad roczny', dueDate: '2026-05-20', mileage: '145.200 km', status: 'Wymagany' },
    { plate: 'WB 56789', model: 'VW Crafter', type: 'Wymiana oleju', dueDate: '2026-06-01', mileage: '98.500 km', status: 'Planowany' },
    { plate: 'WC 11111', model: 'Toyota Hilux', type: 'Ubezpieczenie OC', dueDate: '2026-05-31', mileage: '201.000 km', status: 'Wymagany' },
    { plate: 'WD 22222', model: 'Mercedes Sprinter', type: 'Przeglad techniczny', dueDate: '2026-07-15', mileage: '67.800 km', status: 'OK' },
  ];
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
            <AlertTriangle size={12} /> 2 wymagaja uwagi
          </div>
        </div>
      </div>
      <div className="space-y-4">
        {inspections.map(ins => (
          <div key={ins.plate} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-lg transition-all">
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
            <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${statusColor[ins.status]}`}>{ins.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HistoryTab() {
  const events = [
    { id: 'LOG-2201', date: '2026-05-13', type: 'Serwis', vehicle: 'Ford Transit WA 12345', desc: 'Wymiana oleju + filtrów', cost: '850 PLN', tech: 'AutoSerwis Sp. z o.o.' },
    { id: 'LOG-2200', date: '2026-05-10', type: 'Wynajem', vehicle: 'VW Crafter WB 56789', desc: 'Transport na budowę Warszawa-Praga', cost: '—', tech: 'Adam Nowak' },
    { id: 'LOG-2199', date: '2026-05-08', type: 'Naprawa', vehicle: 'Toyota Hilux WC 11111', desc: 'Wymiana klocków hamulcowych', cost: '1.200 PLN', tech: 'Mechanika Pojazdowa' },
    { id: 'LOG-2198', date: '2026-05-05', type: 'Przeglad', vehicle: 'Mercedes Sprinter WD 22222', desc: 'Przeglad okresowy — zaliczony', cost: '400 PLN', tech: 'Stacja Kontroli' },
    { id: 'LOG-2197', date: '2026-05-01', type: 'Awaria', vehicle: 'Ford Transit WA 12345', desc: 'Awaria alternator — holowanie', cost: '2.500 PLN', tech: 'Assistance 24h' },
  ];
  const typeColor: Record<string, string> = {
    'Serwis': 'bg-indigo-600 text-white',
    'Wynajem': 'bg-slate-900 text-white',
    'Naprawa': 'bg-amber-500 text-white',
    'Przeglad': 'bg-emerald-600 text-white',
    'Awaria': 'bg-rose-600 text-white',
  };

  return (
    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10">
      <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter mb-8">Historia Zdarzen Flotowych</h3>
      <div className="space-y-4">
        {events.map(ev => (
          <div key={ev.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all">
            <div className="flex items-center gap-5">
              <div className={`w-14 h-12 rounded-xl flex items-center justify-center font-black text-[9px] ${typeColor[ev.type]}`}>
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
    </div>
  );
}
