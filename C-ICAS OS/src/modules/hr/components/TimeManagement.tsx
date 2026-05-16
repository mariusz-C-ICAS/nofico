/**
 * Data: 2026-05-14
 * Ścieżka: /src/modules/hr/components/TimeManagement.tsx
 */
import React, { useState } from 'react';
import {
  Clock, Users, TrendingUp, AlertTriangle,
  ChevronDown, Upload, CheckSquare, Sun,
  Moon, Laptop, Phone, Zap, Calendar
} from 'lucide-react';
import { motion } from 'motion/react';

type ShiftType = 'Regular' | 'Overtime' | 'Night' | 'Remote' | 'On-call';

interface Shift {
  day: number;
  start: string;
  end: string;
  type: ShiftType;
}

interface Employee {
  id: string;
  name: string;
  position: string;
  schedule: Shift[];
}

const SHIFT_COLORS: Record<ShiftType, string> = {
  Regular: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  Overtime: 'bg-amber-100 text-amber-700 border-amber-200',
  Night: 'bg-slate-700 text-slate-100 border-slate-600',
  Remote: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'On-call': 'bg-rose-100 text-rose-700 border-rose-200',
};

const SHIFT_ICONS: Record<ShiftType, React.ReactNode> = {
  Regular: <Sun size={10} />,
  Overtime: <Zap size={10} />,
  Night: <Moon size={10} />,
  Remote: <Laptop size={10} />,
  'On-call': <Phone size={10} />,
};

const EMPLOYEES: Employee[] = [
  {
    id: 'E01', name: 'Marek Zając', position: 'Inżynier Oprogramowania',
    schedule: [
      { day: 1, start: '08:00', end: '16:00', type: 'Regular' },
      { day: 2, start: '08:00', end: '18:00', type: 'Overtime' },
      { day: 3, start: '08:00', end: '16:00', type: 'Regular' },
      { day: 4, start: '09:00', end: '17:00', type: 'Remote' },
      { day: 5, start: '08:00', end: '16:00', type: 'Regular' },
    ],
  },
  {
    id: 'E02', name: 'Anna Kowalska', position: 'Kierownik Projektu',
    schedule: [
      { day: 1, start: '08:00', end: '16:00', type: 'Regular' },
      { day: 2, start: '08:00', end: '16:00', type: 'Regular' },
      { day: 3, start: '09:00', end: '17:00', type: 'Remote' },
      { day: 4, start: '08:00', end: '16:00', type: 'Regular' },
      { day: 5, start: '08:00', end: '20:00', type: 'Overtime' },
    ],
  },
  {
    id: 'E03', name: 'Piotr Nowak', position: 'Analityk Systemów',
    schedule: [
      { day: 1, start: '22:00', end: '06:00', type: 'Night' },
      { day: 2, start: '22:00', end: '06:00', type: 'Night' },
      { day: 3, start: '08:00', end: '16:00', type: 'Regular' },
      { day: 4, start: '08:00', end: '16:00', type: 'On-call' },
      { day: 5, start: '08:00', end: '16:00', type: 'Regular' },
    ],
  },
  {
    id: 'E04', name: 'Katarzyna Wilk', position: 'Specjalista HR',
    schedule: [
      { day: 1, start: '09:00', end: '17:00', type: 'Remote' },
      { day: 2, start: '08:00', end: '16:00', type: 'Regular' },
      { day: 3, start: '08:00', end: '16:00', type: 'Regular' },
      { day: 4, start: '08:00', end: '18:00', type: 'Overtime' },
      { day: 5, start: '09:00', end: '17:00', type: 'Remote' },
    ],
  },
];

const DAYS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];

const STATS = [
  { label: 'Śr. godzin/tydzień', value: '39.5', unit: 'h', icon: Clock, accent: 'text-indigo-600' },
  { label: 'Nadgodziny (Maj)', value: '48', unit: 'h', icon: TrendingUp, accent: 'text-amber-500' },
  { label: 'Brakujące wpisy', value: '7', unit: '', icon: AlertTriangle, accent: 'text-rose-600' },
  { label: 'Pracownicy aktywni', value: '38', unit: '', icon: Users, accent: 'text-emerald-500' },
];

function calcWeekHours(schedule: Shift[]): number {
  return schedule.reduce((total, s) => {
    const [sh, sm] = s.start.split(':').map(Number);
    const [eh, em] = s.end.split(':').map(Number);
    let diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff < 0) diff += 24 * 60;
    return total + diff / 60;
  }, 0);
}

export default function TimeManagement() {
  const [selectedEmployee, setSelectedEmployee] = useState<string>(EMPLOYEES[0].id);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [approved, setApproved] = useState(false);

  const employee = EMPLOYEES.find(e => e.id === selectedEmployee)!;
  const weekHours = calcWeekHours(employee.schedule);
  const overtimeHours = employee.schedule
    .filter(s => s.type === 'Overtime')
    .reduce((t, s) => {
      const [sh] = s.start.split(':').map(Number);
      const [eh] = s.end.split(':').map(Number);
      return t + Math.max(0, (eh - sh) - 8);
    }, 0);

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {STATS.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="bg-white rounded-[3rem] border border-slate-100 p-8 shadow-sm"
          >
            <div className="flex items-start justify-between mb-4">
              <stat.icon size={20} className={stat.accent} />
              <span className={`text-[9px] font-black uppercase tracking-widest ${stat.accent}`}>
                {stat.unit}
              </span>
            </div>
            <div className={`text-3xl font-black italic tracking-tighter ${stat.accent}`}>
              {stat.value}
            </div>
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
              {stat.label}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Week View */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <h4 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">
              Grafik Tygodniowy
            </h4>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
              Tydzień 20–26 Maj 2026
            </p>
          </div>

          <div className="flex gap-3 items-center">
            {/* Employee selector */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(v => !v)}
                className="flex items-center gap-3 bg-slate-100 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                <Users size={14} />
                {employee.name}
                <ChevronDown size={12} className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl shadow-slate-200 z-20 min-w-[220px] overflow-hidden">
                  {EMPLOYEES.map(emp => (
                    <button
                      key={emp.id}
                      onClick={() => { setSelectedEmployee(emp.id); setDropdownOpen(false); setApproved(false); }}
                      className={`w-full text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-indigo-50 hover:text-indigo-600 ${
                        emp.id === selectedEmployee ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600'
                      }`}
                    >
                      {emp.name}
                      <div className="text-[8px] font-bold text-slate-400 mt-0.5 normal-case">{emp.position}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button className="flex items-center gap-2 bg-slate-100 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
              <Upload size={14} /> Importuj z Excel
            </button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setApproved(true)}
              className={`flex items-center gap-2 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg ${
                approved
                  ? 'bg-emerald-500 text-white shadow-emerald-200'
                  : 'bg-slate-900 text-white hover:bg-indigo-600 shadow-slate-200'
              }`}
            >
              <CheckSquare size={14} />
              {approved ? 'Zatwierdzono' : 'Zatwierdz Grafik'}
            </motion.button>
          </div>
        </div>

        {/* Week grid */}
        <div className="grid grid-cols-7 gap-3 mb-6">
          {DAYS.map(day => (
            <div key={day} className="text-center text-[9px] font-black text-slate-400 uppercase tracking-widest pb-2">
              {day}
            </div>
          ))}
          {DAYS.map((_, dayIdx) => {
            const shift = employee.schedule.find(s => s.day === dayIdx + 1);
            const isWeekend = dayIdx >= 5;
            return (
              <motion.div
                key={dayIdx}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: dayIdx * 0.05 }}
                className={`rounded-2xl border min-h-[100px] p-3 flex flex-col justify-between ${
                  isWeekend
                    ? 'bg-slate-50 border-slate-100'
                    : shift
                    ? `border ${SHIFT_COLORS[shift.type]}`
                    : 'bg-white border-slate-100 border-dashed'
                }`}
              >
                {shift && !isWeekend ? (
                  <>
                    <div className="flex items-center gap-1 mb-2">
                      {SHIFT_ICONS[shift.type]}
                      <span className="text-[8px] font-black uppercase tracking-widest">{shift.type}</span>
                    </div>
                    <div>
                      <div className="text-[11px] font-black italic">{shift.start}</div>
                      <div className="text-[9px] font-bold opacity-60">do {shift.end}</div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-[8px] font-black text-slate-300 uppercase">
                    {isWeekend ? 'WD' : '---'}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Summary row */}
        <div className="flex gap-6 p-6 bg-slate-50 rounded-2xl">
          <div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Godzin w tygodniu</span>
            <div className="text-xl font-black text-indigo-600 italic">{weekHours.toFixed(1)} h</div>
          </div>
          <div className="w-px bg-slate-200" />
          <div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nadgodziny</span>
            <div className="text-xl font-black text-amber-500 italic">{overtimeHours} h</div>
          </div>
          <div className="w-px bg-slate-200" />
          <div className="flex gap-4 flex-wrap">
            {(Object.keys(SHIFT_COLORS) as ShiftType[]).map(type => (
              <div key={type} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-widest ${SHIFT_COLORS[type]}`}>
                {SHIFT_ICONS[type]} {type}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Calendar Overview */}
      <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Calendar className="text-indigo-400" size={20} />
              <h4 className="text-xl font-black uppercase italic tracking-tighter">Widok Miesięczny — Maj 2026</h4>
            </div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Wszystkich {EMPLOYEES.length} pracowników</p>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-3">
          {DAYS.map(d => (
            <div key={d} className="text-center text-[8px] font-black text-slate-500 uppercase tracking-widest">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {/* offset for May 2026 starting Thursday (index 3) */}
          {Array.from({ length: 3 }).map((_, i) => <div key={`pad-${i}`} />)}
          {Array.from({ length: 31 }).map((_, i) => {
            const dayNum = i + 1;
            const hasLeave = [10, 11, 12, 13, 14, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30].includes(dayNum);
            const isWeekend = ((i + 3) % 7) >= 5;
            return (
              <div
                key={dayNum}
                className={`h-10 rounded-xl flex items-center justify-center text-[10px] font-black transition-all ${
                  isWeekend
                    ? 'bg-white/5 text-slate-600'
                    : hasLeave
                    ? 'bg-indigo-600/60 text-white'
                    : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                {dayNum}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
