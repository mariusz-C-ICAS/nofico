/**
 * Data: 2026-05-14
 * Sciezka: /src/modules/logistics/components/FleetModule.tsx
 */
import React, { useState } from 'react';
import {
  Truck, Plus, Filter, Gauge, Calendar, User, ShieldCheck,
  Car, Wrench
} from 'lucide-react';
import { motion } from 'motion/react';

type VehicleStatus = 'Dostepny' | 'W uzyciu' | 'W serwisie' | 'Wycofany';
type VehicleType = 'Samochod' | 'Van' | 'Ciezarowka' | 'Maszyna';

interface Vehicle {
  id: string;
  plate: string;
  model: string;
  year: number;
  type: VehicleType;
  status: VehicleStatus;
  driver: string;
  mileage: string;
  insuranceExpiry: string;
  nextService: string;
  color: string;
}

const VEHICLES: Vehicle[] = [
  { id: 'V-001', plate: 'WA 12345', model: 'Ford Transit Custom', year: 2022, type: 'Van', status: 'W uzyciu', driver: 'Jan Kowalski', mileage: '145.200 km', insuranceExpiry: '2026-09-15', nextService: '2026-05-20', color: 'bg-indigo-500' },
  { id: 'V-002', plate: 'WB 56789', model: 'VW Crafter 35', year: 2021, type: 'Van', status: 'Dostepny', driver: '—', mileage: '98.500 km', insuranceExpiry: '2026-11-30', nextService: '2026-07-01', color: 'bg-slate-700' },
  { id: 'V-003', plate: 'WC 11111', model: 'Toyota Hilux DC', year: 2020, type: 'Samochod', status: 'Dostepny', driver: '—', mileage: '201.000 km', insuranceExpiry: '2026-05-31', nextService: '2026-06-15', color: 'bg-emerald-600' },
  { id: 'V-004', plate: 'WD 22222', model: 'Mercedes Sprinter', year: 2023, type: 'Van', status: 'W serwisie', driver: 'Serwis AutoFix', mileage: '67.800 km', insuranceExpiry: '2027-01-10', nextService: 'W trakcie', color: 'bg-amber-500' },
  { id: 'V-005', plate: 'WE 33333', model: 'Volvo FH 500', year: 2019, type: 'Ciezarowka', status: 'W uzyciu', driver: 'Marek Zielinski', mileage: '540.000 km', insuranceExpiry: '2026-08-20', nextService: '2026-06-01', color: 'bg-rose-600' },
  { id: 'V-006', plate: 'WF 44444', model: 'JCB 3CX Eco', year: 2020, type: 'Maszyna', status: 'Wycofany', driver: '—', mileage: '8.900 mth', insuranceExpiry: '2025-12-31', nextService: '—', color: 'bg-slate-400' },
];

const STATUS_COLORS: Record<VehicleStatus, string> = {
  'Dostepny':  'bg-emerald-50 text-emerald-600',
  'W uzyciu':  'bg-indigo-50 text-indigo-600',
  'W serwisie': 'bg-amber-50 text-amber-600',
  'Wycofany':  'bg-slate-100 text-slate-500',
};

const STATUS_DOT: Record<VehicleStatus, string> = {
  'Dostepny':  'bg-emerald-500',
  'W uzyciu':  'bg-indigo-500',
  'W serwisie': 'bg-amber-500',
  'Wycofany':  'bg-slate-400',
};

const TYPE_ICON: Record<VehicleType, React.ElementType> = {
  'Samochod': Car,
  'Van': Truck,
  'Ciezarowka': Truck,
  'Maszyna': Wrench,
};

const STATUSES: VehicleStatus[] = ['Dostepny', 'W uzyciu', 'W serwisie', 'Wycofany'];
const TYPES: VehicleType[] = ['Samochod', 'Van', 'Ciezarowka', 'Maszyna'];

export default function FleetModule() {
  const [filterStatus, setFilterStatus] = useState<VehicleStatus | 'Wszystkie'>('Wszystkie');
  const [filterType, setFilterType] = useState<VehicleType | 'Wszystkie'>('Wszystkie');

  const filtered = VEHICLES.filter(v => {
    const statusOk = filterStatus === 'Wszystkie' || v.status === filterStatus;
    const typeOk   = filterType === 'Wszystkie'  || v.type === filterType;
    return statusOk && typeOk;
  });

  return (
    <div className="space-y-8">

      {/* Filters & actions */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-8">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex items-center gap-2 text-slate-400">
            <Filter size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">Filtry</span>
          </div>

          {/* Status filter */}
          <div className="flex flex-wrap gap-2">
            {(['Wszystkie', ...STATUSES] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${
                  filterStatus === s
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-indigo-300 hover:text-slate-900'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-slate-200 hidden md:block" />

          {/* Type filter */}
          <div className="flex flex-wrap gap-2">
            {(['Wszystkie', ...TYPES] as const).map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${
                  filterType === t
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-indigo-300 hover:text-slate-900'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="ml-auto">
            <button className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-xl shadow-indigo-100">
              <Plus size={14} /> Dodaj Pojazd
            </button>
          </div>
        </div>
      </div>

      {/* Vehicle grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map((v, i) => {
          const Icon = TYPE_ICON[v.type];
          return (
            <motion.div
              key={v.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-100 transition-all overflow-hidden group"
            >
              {/* Vehicle photo placeholder */}
              <div className={`${v.color} h-36 flex flex-col items-center justify-center gap-3 relative`}>
                <Icon size={40} className="text-white/80" />
                <div className="text-white font-black text-sm tracking-widest uppercase italic">{v.plate}</div>
                {/* Status dot */}
                <div className={`absolute top-4 right-4 w-4 h-4 rounded-full border-2 border-white shadow ${STATUS_DOT[v.status]}`} />
              </div>

              {/* Info */}
              <div className="p-7 space-y-4">
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{v.type} • {v.year}</div>
                  <h4 className="text-lg font-black text-slate-900 italic tracking-tight">{v.model}</h4>
                </div>

                <span className={`inline-block px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${STATUS_COLORS[v.status]}`}>
                  {v.status}
                </span>

                <div className="space-y-2 pt-2 border-t border-slate-50">
                  <InfoRow icon={User} label="Kierowca" value={v.driver} />
                  <InfoRow icon={Gauge} label="Przebieg" value={v.mileage} />
                  <InfoRow icon={ShieldCheck} label="Ubezp. do" value={v.insuranceExpiry} />
                  <InfoRow icon={Calendar} label="Nast. serwis" value={v.nextService} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="bg-white rounded-[3rem] border border-slate-100 p-16 text-center">
          <Truck size={40} className="mx-auto text-slate-200 mb-4" />
          <div className="text-sm font-black text-slate-400 uppercase tracking-widest">Brak pojazdow dla wybranych filtrow</div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-slate-400">
        <Icon size={12} />
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <span className="text-[10px] font-black text-slate-700">{value}</span>
    </div>
  );
}
