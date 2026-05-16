/**
 * Data: 2026-05-14
 * Sciezka: /src/modules/logistics/components/AssetInventory.tsx
 */
import React, { useState } from 'react';
import {
  Package, ScanLine, Filter, TrendingDown, CheckCircle2,
  AlertTriangle, Clock, Wrench
} from 'lucide-react';
import { motion } from 'motion/react';

type AssetStatus = 'Aktywny' | 'W naprawie' | 'Wycofany' | 'Zagubiony';
type AssetCategory = 'Elektronika' | 'Narzedzia' | 'Maszyny' | 'PPE' | 'Meble biurowe';

interface Asset {
  id: string;
  name: string;
  category: AssetCategory;
  location: string;
  assignedTo: string;
  purchaseDate: string;
  value: string;
  depreciationPct: number;
  status: AssetStatus;
  lastInspection: string;
}

const ASSETS: Asset[] = [
  { id: 'AST-001', name: 'Laptop Dell XPS 15', category: 'Elektronika', location: 'Biuro / Desk 12', assignedTo: 'Jan Kowalski', purchaseDate: '2024-03-01', value: '8.500 PLN', depreciationPct: 28, status: 'Aktywny', lastInspection: '2026-02-15' },
  { id: 'AST-002', name: 'Wiertarka Bosch GBH 5-40 D', category: 'Narzedzia', location: 'Magazyn / Regał B2', assignedTo: 'Ekipa A', purchaseDate: '2023-06-10', value: '2.200 PLN', depreciationPct: 45, status: 'Aktywny', lastInspection: '2026-01-10' },
  { id: 'AST-003', name: 'Kamera inspekcyjna RIDGID', category: 'Elektronika', location: 'Magazyn / Regał C1', assignedTo: '—', purchaseDate: '2022-09-15', value: '12.000 PLN', depreciationPct: 60, status: 'W naprawie', lastInspection: '2025-11-20' },
  { id: 'AST-004', name: 'Agregat pradotworczy Honda', category: 'Maszyny', location: 'Plac Sp. / Boks 3', assignedTo: 'Brygada Zewn.', purchaseDate: '2021-04-22', value: '5.500 PLN', depreciationPct: 75, status: 'Aktywny', lastInspection: '2026-03-01' },
  { id: 'AST-005', name: 'Kamizelka BHP klasa 3 (x20)', category: 'PPE', location: 'Szafka BHP P1', assignedTo: 'Wszyscy', purchaseDate: '2025-01-05', value: '1.800 PLN', depreciationPct: 10, status: 'Aktywny', lastInspection: '2026-04-15' },
  { id: 'AST-006', name: 'Monitor LG 27UK850', category: 'Elektronika', location: 'Biuro / Sala konf.', assignedTo: 'Biuro', purchaseDate: '2023-02-14', value: '2.800 PLN', depreciationPct: 40, status: 'Aktywny', lastInspection: '2026-01-28' },
  { id: 'AST-007', name: 'Biurko elektryczne Flexispot', category: 'Meble biurowe', location: 'Biuro / Desk 7', assignedTo: 'Anna Nowak', purchaseDate: '2024-11-01', value: '3.200 PLN', depreciationPct: 8, status: 'Aktywny', lastInspection: '2026-05-01' },
  { id: 'AST-008', name: 'Spawarka MIG Fronius', category: 'Maszyny', location: 'Hala Prod. / St. 2', assignedTo: 'Tomasz Wis', purchaseDate: '2020-07-30', value: '18.000 PLN', depreciationPct: 80, status: 'Aktywny', lastInspection: '2026-02-28' },
  { id: 'AST-009', name: 'Tablet Getac F110', category: 'Elektronika', location: 'Nieznana', assignedTo: '—', purchaseDate: '2023-05-15', value: '6.500 PLN', depreciationPct: 50, status: 'Zagubiony', lastInspection: '2025-08-10' },
  { id: 'AST-010', name: 'Szafa serwerowa 19" 12U', category: 'Elektronika', location: 'Serwerownia', assignedTo: 'IT Dept.', purchaseDate: '2022-01-20', value: '4.200 PLN', depreciationPct: 55, status: 'Aktywny', lastInspection: '2026-04-01' },
];

const STATUS_COLORS: Record<AssetStatus, string> = {
  'Aktywny':    'bg-emerald-50 text-emerald-600',
  'W naprawie': 'bg-amber-50 text-amber-600',
  'Wycofany':   'bg-slate-100 text-slate-500',
  'Zagubiony':  'bg-rose-50 text-rose-600',
};

const STATUS_ICON: Record<AssetStatus, React.ElementType> = {
  'Aktywny':    CheckCircle2,
  'W naprawie': Wrench,
  'Wycofany':   Clock,
  'Zagubiony':  AlertTriangle,
};

const CATEGORIES: AssetCategory[] = ['Elektronika', 'Narzedzia', 'Maszyny', 'PPE', 'Meble biurowe'];

export default function AssetInventory() {
  const [filterCategory, setFilterCategory] = useState<AssetCategory | 'Wszystkie'>('Wszystkie');
  const [filterStatus, setFilterStatus] = useState<AssetStatus | 'Wszystkie'>('Wszystkie');
  const [scanActive, setScanActive] = useState(false);

  const filtered = ASSETS.filter(a => {
    const catOk = filterCategory === 'Wszystkie' || a.category === filterCategory;
    const stOk  = filterStatus  === 'Wszystkie' || a.status === filterStatus;
    return catOk && stOk;
  });

  const totalValue = ASSETS.reduce((acc, a) => {
    const raw = parseFloat(a.value.replace(/[^\d,]/g, '').replace(',', '.'));
    return acc + raw;
  }, 0);

  return (
    <div className="space-y-8">

      {/* Summary + scan */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 flex items-center gap-5">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
            <Package size={22} />
          </div>
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lacznie aktywow</div>
            <div className="text-2xl font-black text-slate-900 italic">{ASSETS.length}</div>
          </div>
        </div>
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 flex items-center gap-5">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
            <TrendingDown size={22} />
          </div>
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Wartosc ksiegowa</div>
            <div className="text-2xl font-black text-slate-900 italic">{totalValue.toLocaleString('pl-PL')} PLN</div>
          </div>
        </div>
        <button
          onClick={() => { setScanActive(true); setTimeout(() => setScanActive(false), 2000); }}
          className={`rounded-[2.5rem] p-8 flex items-center gap-5 transition-all border font-black text-[10px] uppercase tracking-widest ${
            scanActive
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-200'
              : 'bg-white text-slate-400 border-slate-100 hover:text-indigo-600 hover:border-indigo-200'
          }`}
        >
          <ScanLine size={22} />
          {scanActive ? 'Skanowanie...' : 'Skanuj Kod QR / Barcode'}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-8">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Filter size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Kategoria</span>
          </div>
          {(['Wszystkie', ...CATEGORIES] as const).map(c => (
            <button
              key={c}
              onClick={() => setFilterCategory(c)}
              className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${
                filterCategory === c
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-indigo-300 hover:text-slate-900'
              }`}
            >
              {c}
            </button>
          ))}

          <div className="h-6 w-px bg-slate-200" />

          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</span>
          {(['Wszystkie', 'Aktywny', 'W naprawie', 'Wycofany', 'Zagubiony'] as const).map(s => (
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
      </div>

      {/* Table */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Inwentarz Aktywow</h3>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{filtered.length} pozycji</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['ID', 'Nazwa', 'Kategoria', 'Lokalizacja', 'Przypisany', 'Data zakupu', 'Wartosc', 'Amortyz.', 'Status', 'Ost. inspekcja'].map(h => (
                  <th key={h} className="text-[9px] text-slate-400 uppercase tracking-widest text-left py-4 px-5 font-black whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((a, i) => {
                const StatusIcon = STATUS_ICON[a.status];
                return (
                  <motion.tr
                    key={a.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-4 px-5 font-black text-indigo-600 italic whitespace-nowrap">{a.id}</td>
                    <td className="py-4 px-5 font-black text-slate-900 whitespace-nowrap">{a.name}</td>
                    <td className="py-4 px-5">
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap">{a.category}</span>
                    </td>
                    <td className="py-4 px-5 text-slate-500 font-bold whitespace-nowrap">{a.location}</td>
                    <td className="py-4 px-5 text-slate-700 font-bold whitespace-nowrap">{a.assignedTo}</td>
                    <td className="py-4 px-5 text-slate-400 font-bold whitespace-nowrap">{a.purchaseDate}</td>
                    <td className="py-4 px-5 font-black text-slate-900 whitespace-nowrap">{a.value}</td>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${a.depreciationPct > 70 ? 'bg-rose-400' : a.depreciationPct > 40 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                            style={{ width: `${a.depreciationPct}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-black text-slate-500">{a.depreciationPct}%</span>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${STATUS_COLORS[a.status]}`}>
                        <StatusIcon size={10} />
                        {a.status}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-slate-400 font-bold whitespace-nowrap">{a.lastInspection}</td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
