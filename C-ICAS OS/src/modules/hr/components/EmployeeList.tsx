/**
 * Data: 2026-05-14
 * Ścieżka: /src/modules/hr/components/EmployeeList.tsx
 */
import React, { useState } from 'react';
import { Search, Filter, Eye, Pencil, UserMinus, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  department: string;
  position: string;
  contractType: 'UoP' | 'B2B' | 'UoZ';
  startDate: string;
  status: 'active' | 'onLeave' | 'terminated';
}

const MOCK_EMPLOYEES: Employee[] = [
  { id: 'EMP-001', firstName: 'Adam',      lastName: 'Kowalski',  department: 'IT',         position: 'Senior Developer',    contractType: 'B2B', startDate: '2021-03-01', status: 'active'     },
  { id: 'EMP-002', firstName: 'Anna',      lastName: 'Nowak',     department: 'HR',         position: 'HR Manager',          contractType: 'UoP', startDate: '2019-06-15', status: 'active'     },
  { id: 'EMP-003', firstName: 'Marek',     lastName: 'Zając',     department: 'Sprzedaż',   position: 'Business Analyst',    contractType: 'UoP', startDate: '2020-11-01', status: 'onLeave'    },
  { id: 'EMP-004', firstName: 'Katarzyna', lastName: 'Wilk',      department: 'IT',         position: 'UX Designer',         contractType: 'UoZ', startDate: '2026-04-01', status: 'active'     },
  { id: 'EMP-005', firstName: 'Piotr',     lastName: 'Wiśniewski',department: 'Finanse',    position: 'Główny Księgowy',     contractType: 'UoP', startDate: '2018-01-10', status: 'active'     },
  { id: 'EMP-006', firstName: 'Joanna',    lastName: 'Lewandowska',department: 'Produkcja', position: 'Kierownik Zmiany',    contractType: 'UoP', startDate: '2022-07-20', status: 'active'     },
  { id: 'EMP-007', firstName: 'Tomasz',    lastName: 'Dąbrowski', department: 'IT',         position: 'DevOps Engineer',     contractType: 'B2B', startDate: '2023-02-14', status: 'active'     },
  { id: 'EMP-008', firstName: 'Monika',    lastName: 'Kamińska',  department: 'Sprzedaż',   position: 'Account Manager',     contractType: 'UoP', startDate: '2024-09-01', status: 'terminated' },
];

const DEPARTMENTS = ['Wszystkie', 'IT', 'HR', 'Finanse', 'Produkcja', 'Sprzedaż'];
const CONTRACT_TYPES: ('Wszystkie' | 'UoP' | 'B2B' | 'UoZ')[] = ['Wszystkie', 'UoP', 'B2B', 'UoZ'];
const STATUSES: ('Wszystkie' | 'active' | 'onLeave' | 'terminated')[] = ['Wszystkie', 'active', 'onLeave', 'terminated'];

const STATUS_MAP: Record<string, { label: string; classes: string }> = {
  active:     { label: 'Aktywny',    classes: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  onLeave:    { label: 'Urlop',      classes: 'bg-amber-50 text-amber-600 border-amber-100'       },
  terminated: { label: 'Zwolniony',  classes: 'bg-rose-50 text-rose-600 border-rose-100'          },
};

function initials(e: Employee) {
  return `${e.firstName[0]}${e.lastName[0]}`.toUpperCase();
}

function AvatarCircle({ emp }: { emp: Employee }) {
  const colors: Record<string, string> = {
    IT: 'bg-indigo-100 text-indigo-700',
    HR: 'bg-rose-100 text-rose-700',
    Finanse: 'bg-emerald-100 text-emerald-700',
    Produkcja: 'bg-amber-100 text-amber-700',
    Sprzedaż: 'bg-violet-100 text-violet-700',
  };
  return (
    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xs font-black ${colors[emp.department] ?? 'bg-slate-100 text-slate-600'}`}>
      {initials(emp)}
    </div>
  );
}

export default function EmployeeList() {
  const [search, setSearch]         = useState('');
  const [deptFilter, setDeptFilter] = useState('Wszystkie');
  const [ctFilter, setCtFilter]     = useState<'Wszystkie' | 'UoP' | 'B2B' | 'UoZ'>('Wszystkie');
  const [stFilter, setStFilter]     = useState<'Wszystkie' | 'active' | 'onLeave' | 'terminated'>('Wszystkie');
  const [showModal, setShowModal]   = useState(false);

  const filtered = MOCK_EMPLOYEES.filter(e => {
    const fullName = `${e.firstName} ${e.lastName}`.toLowerCase();
    if (search && !fullName.includes(search.toLowerCase())) return false;
    if (deptFilter !== 'Wszystkie' && e.department !== deptFilter) return false;
    if (ctFilter   !== 'Wszystkie' && e.contractType !== ctFilter)  return false;
    if (stFilter   !== 'Wszystkie' && e.status !== stFilter)        return false;
    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Szukaj pracownika..."
              className="pl-10 pr-5 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-indigo-400 w-56 uppercase tracking-wide"
            />
          </div>

          {/* Department filter */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-2xl p-1">
            <Filter size={12} className="text-slate-400 ml-2" />
            {DEPARTMENTS.map(d => (
              <button
                key={d}
                onClick={() => setDeptFilter(d)}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                  deptFilter === d ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Contract type filter */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-2xl p-1">
            {CONTRACT_TYPES.map(ct => (
              <button
                key={ct}
                onClick={() => setCtFilter(ct)}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                  ctFilter === ct ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {ct}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-2xl p-1">
            {STATUSES.map(s => (
              <button
                key={s}
                onClick={() => setStFilter(s)}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                  stFilter === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {s === 'Wszystkie' ? 'Wszystkie' : s === 'active' ? 'Aktywni' : s === 'onLeave' ? 'Urlop' : 'Zwolnieni'}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="bg-slate-900 text-white px-8 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 whitespace-nowrap"
        >
          <Plus size={15} /> Dodaj Pracownika
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['Pracownik', 'Dział', 'Stanowisko', 'Kontrakt', 'Data zatrudnienia', 'Status', 'Akcje'].map(h => (
                  <th key={h} className="text-left px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp, i) => (
                <motion.tr
                  key={emp.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group"
                >
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <AvatarCircle emp={emp} />
                      <div>
                        <div className="text-xs font-black text-slate-900 uppercase italic">
                          {emp.firstName} {emp.lastName}
                        </div>
                        <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{emp.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-xs font-black text-slate-600 italic">{emp.department}</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-xs font-black text-slate-600 italic">{emp.position}</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                      emp.contractType === 'B2B'
                        ? 'bg-violet-50 text-violet-600 border-violet-100'
                        : emp.contractType === 'UoP'
                        ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                        : 'bg-slate-50 text-slate-500 border-slate-100'
                    }`}>
                      {emp.contractType}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-xs font-black text-slate-500 italic">{emp.startDate}</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${STATUS_MAP[emp.status].classes}`}>
                      {STATUS_MAP[emp.status].label}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2.5 rounded-xl bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-500 transition-all" title="Profil">
                        <Eye size={14} />
                      </button>
                      <button className="p-2.5 rounded-xl bg-slate-100 hover:bg-amber-500 hover:text-white text-slate-500 transition-all" title="Edytuj">
                        <Pencil size={14} />
                      </button>
                      <button className="p-2.5 rounded-xl bg-slate-100 hover:bg-rose-500 hover:text-white text-slate-500 transition-all" title="Dezaktywuj">
                        <UserMinus size={14} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-xs font-black text-slate-300 uppercase tracking-widest italic">Brak wyników dla podanych filtrów</p>
            </div>
          )}
        </div>

        <div className="px-8 py-5 border-t border-slate-100 flex justify-between items-center">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
            Wyświetlono {filtered.length} z {MOCK_EMPLOYEES.length} pracowników
          </span>
        </div>
      </div>

      {/* Add Employee Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-[3rem] p-10 w-full max-w-lg shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Nowy Pracownik</h3>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                {[
                  { label: 'Imię',        placeholder: 'Jan'          },
                  { label: 'Nazwisko',    placeholder: 'Kowalski'     },
                  { label: 'Stanowisko',  placeholder: 'Developer'    },
                  { label: 'Data zatrudnienia', placeholder: '2026-05-14' },
                ].map(f => (
                  <div key={f.label}>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{f.label}</label>
                    <input
                      placeholder={f.placeholder}
                      className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black text-slate-700 focus:outline-none focus:border-indigo-400 uppercase tracking-wide"
                    />
                  </div>
                ))}

                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Typ Kontraktu</label>
                  <select className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black text-slate-700 focus:outline-none focus:border-indigo-400 uppercase tracking-wide">
                    <option>UoP</option>
                    <option>B2B</option>
                    <option>UoZ</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
                >
                  Anuluj
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-indigo-600 text-white hover:bg-indigo-700 transition-all"
                >
                  Dodaj Pracownika
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
