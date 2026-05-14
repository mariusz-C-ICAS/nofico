/**
 * Data: 2026-05-14
 * Ścieżka: /src/modules/hr/components/LeaveManagement.tsx
 */
import React, { useState } from 'react';
import {
  Plane, Heart, Coffee, Baby, Briefcase, Umbrella,
  Clock, CheckCircle2, XCircle, Plus, Calendar,
  ChevronLeft, ChevronRight, Users
} from 'lucide-react';
import { motion } from 'motion/react';

type LeaveStatus = 'pending' | 'approved' | 'rejected';
type LeaveType =
  | 'Urlop wypoczynkowy'
  | 'Urlop na żądanie'
  | 'L4 (zwolnienie)'
  | 'Opieka (Art. 188)'
  | 'Urlop bezpłatny'
  | 'Urlop macierzyński/ojcowski'
  | 'Urlop okolicznościowy';

interface LeaveRequest {
  id: string;
  employee: string;
  position: string;
  type: LeaveType;
  from: string;
  to: string;
  days: number;
  status: LeaveStatus;
  manager: string;
}

interface EmployeeBalance {
  name: string;
  available: number;
  used: number;
  remaining: number;
}

const TYPE_CONFIG: Record<LeaveType, { icon: React.ReactNode; color: string; dot: string }> = {
  'Urlop wypoczynkowy':       { icon: <Plane size={16} />,    color: 'bg-indigo-50 text-indigo-600 border-indigo-200',  dot: 'bg-indigo-500' },
  'Urlop na żądanie':         { icon: <Clock size={16} />,    color: 'bg-amber-50 text-amber-600 border-amber-200',     dot: 'bg-amber-500' },
  'L4 (zwolnienie)':          { icon: <Heart size={16} />,    color: 'bg-rose-50 text-rose-600 border-rose-200',        dot: 'bg-rose-500' },
  'Opieka (Art. 188)':        { icon: <Coffee size={16} />,   color: 'bg-sky-50 text-sky-600 border-sky-200',           dot: 'bg-sky-500' },
  'Urlop bezpłatny':          { icon: <Briefcase size={16} />,color: 'bg-slate-50 text-slate-600 border-slate-200',     dot: 'bg-slate-400' },
  'Urlop macierzyński/ojcowski':{ icon: <Baby size={16} />,   color: 'bg-pink-50 text-pink-600 border-pink-200',        dot: 'bg-pink-500' },
  'Urlop okolicznościowy':    { icon: <Umbrella size={16} />, color: 'bg-emerald-50 text-emerald-600 border-emerald-200', dot: 'bg-emerald-500' },
};

const INITIAL_REQUESTS: LeaveRequest[] = [
  { id: 'LR-001', employee: 'Marek Zając',      position: 'Inżynier',     type: 'Urlop wypoczynkowy',         from: '2026-05-20', to: '2026-05-30', days: 8,  status: 'pending',  manager: 'Jan Kowalczyk' },
  { id: 'LR-002', employee: 'Anna Kowalska',    position: 'PM',            type: 'Urlop na żądanie',           from: '2026-05-16', to: '2026-05-16', days: 1,  status: 'pending',  manager: 'Jan Kowalczyk' },
  { id: 'LR-003', employee: 'Piotr Nowak',      position: 'Analityk',     type: 'L4 (zwolnienie)',            from: '2026-05-10', to: '2026-05-17', days: 6,  status: 'approved', manager: 'Jan Kowalczyk' },
  { id: 'LR-004', employee: 'Katarzyna Wilk',   position: 'HR Specialist',type: 'Opieka (Art. 188)',          from: '2026-05-21', to: '2026-05-21', days: 1,  status: 'pending',  manager: 'Jan Kowalczyk' },
  { id: 'LR-005', employee: 'Tomasz Wiśniewski',position: 'Dev',          type: 'Urlop wypoczynkowy',         from: '2026-06-02', to: '2026-06-13', days: 10, status: 'approved', manager: 'Jan Kowalczyk' },
  { id: 'LR-006', employee: 'Monika Dąbrowska', position: 'Designer',     type: 'Urlop macierzyński/ojcowski',from: '2026-05-25', to: '2026-11-25', days: 126,status: 'approved', manager: 'Jan Kowalczyk' },
  { id: 'LR-007', employee: 'Adam Lewandowski', position: 'QA',           type: 'Urlop okolicznościowy',      from: '2026-05-15', to: '2026-05-15', days: 1,  status: 'rejected', manager: 'Jan Kowalczyk' },
];

const BALANCES: EmployeeBalance[] = [
  { name: 'Marek Zając',       available: 26, used: 8,  remaining: 18 },
  { name: 'Anna Kowalska',     available: 26, used: 5,  remaining: 21 },
  { name: 'Piotr Nowak',       available: 26, used: 12, remaining: 14 },
  { name: 'Katarzyna Wilk',    available: 20, used: 3,  remaining: 17 },
  { name: 'Tomasz Wiśniewski', available: 26, used: 16, remaining: 10 },
];

const CALENDAR_LEAVES: Record<number, string> = {
  10: 'bg-rose-400', 11: 'bg-rose-400', 12: 'bg-rose-400', 13: 'bg-rose-400', 14: 'bg-rose-400', 15: 'bg-rose-400', 16: 'bg-rose-400', 17: 'bg-rose-400',
  20: 'bg-indigo-400', 21: 'bg-indigo-400', 22: 'bg-indigo-400', 23: 'bg-indigo-400', 24: 'bg-indigo-400', 25: 'bg-indigo-400', 26: 'bg-indigo-400', 27: 'bg-indigo-400', 28: 'bg-indigo-400', 29: 'bg-indigo-400', 30: 'bg-indigo-400',
  21: 'bg-sky-400',
};

const STATUS_CONFIG = {
  pending:  { label: 'Oczekuje',    cls: 'bg-amber-50 text-amber-600 border-amber-200' },
  approved: { label: 'Zatwierdzony',cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  rejected: { label: 'Odrzucony',   cls: 'bg-rose-50 text-rose-600 border-rose-200' },
};

const DAYS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];

export default function LeaveManagementAdvanced() {
  const [requests, setRequests] = useState<LeaveRequest[]>(INITIAL_REQUESTS);
  const [filterStatus, setFilterStatus] = useState<LeaveStatus | 'all'>('all');

  const handleApprove = (id: string) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r));
  };
  const handleReject = (id: string) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' } : r));
  };

  const filtered = filterStatus === 'all' ? requests : requests.filter(r => r.status === filterStatus);
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Header stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Łączna pula dni', value: '420', accent: 'text-slate-900', sub: 'wszystkich pracowników' },
          { label: 'Wykorzystano',    value: '44',  accent: 'text-indigo-600', sub: 'w tym miesiącu' },
          { label: 'Pozostało',       value: '376', accent: 'text-emerald-600', sub: 'do końca roku' },
          { label: 'Oczekujące',      value: String(pendingCount), accent: 'text-amber-500', sub: 'wymaga decyzji' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="bg-white rounded-[3rem] border border-slate-100 p-8 shadow-sm"
          >
            <div className={`text-3xl font-black italic tracking-tighter ${s.accent} mb-1`}>{s.value}</div>
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.label}</div>
            <div className="text-[8px] text-slate-300 font-bold mt-1 uppercase">{s.sub}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left: Request table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h4 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Wnioski Urlopowe</h4>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Maj 2026</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilterStatus(f)}
                    className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                      filterStatus === f
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-500 border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    {f === 'all' ? 'Wszystkie' : STATUS_CONFIG[f].label}
                  </button>
                ))}
                <button className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-600 transition-all">
                  <Plus size={12} /> Złóż Wniosek
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {filtered.map((req, i) => {
                const cfg = TYPE_CONFIG[req.type];
                const sCfg = STATUS_CONFIG[req.status];
                return (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between p-5 bg-slate-50 rounded-[2rem] border border-slate-100 hover:bg-white hover:shadow-lg hover:shadow-slate-100 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${cfg.color}`}>
                        {cfg.icon}
                      </div>
                      <div>
                        <div className="text-[11px] font-black text-slate-900 uppercase italic">{req.employee}</div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase">{req.type}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[8px] font-black text-slate-400">{req.from} – {req.to}</span>
                          <span className="text-[8px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded uppercase">{req.days} dni</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className={`hidden md:block px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border ${sCfg.cls}`}>
                        {sCfg.label}
                      </div>
                      {req.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(req.id)}
                            className="bg-emerald-500 text-white p-2.5 rounded-xl hover:scale-110 transition-transform shadow-sm shadow-emerald-200"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                          <button
                            onClick={() => handleReject(req.id)}
                            className="bg-white border border-slate-200 text-slate-400 p-2.5 rounded-xl hover:text-rose-500 hover:border-rose-200 transition-all"
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Employee balances */}
          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10">
            <h4 className="text-base font-black text-slate-900 uppercase italic tracking-tighter mb-6">
              Salda Urlopowe Pracowników
            </h4>
            <div className="space-y-4">
              {BALANCES.map(b => (
                <div key={b.name} className="flex items-center gap-4">
                  <div className="w-36 text-[9px] font-black text-slate-700 uppercase italic">{b.name}</div>
                  <div className="flex-1">
                    <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase mb-1">
                      <span>Wykorzystano: {b.used}/{b.available}</span>
                      <span className="text-emerald-600">Pozostało: {b.remaining}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all duration-700"
                        style={{ width: `${(b.used / b.available) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Calendar + Legend */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="text-indigo-400" size={16} />
                  <h5 className="text-sm font-black uppercase italic tracking-tighter">Maj 2026</h5>
                </div>
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Kto jest nieobecny</p>
              </div>
              <div className="flex gap-1">
                <button className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all"><ChevronLeft size={12} /></button>
                <button className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all"><ChevronRight size={12} /></button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS.map(d => (
                <div key={d} className="text-center text-[7px] font-black text-slate-500 uppercase">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 3 }).map((_, i) => <div key={`pad-${i}`} />)}
              {Array.from({ length: 31 }).map((_, i) => {
                const day = i + 1;
                const leaveColor = CALENDAR_LEAVES[day];
                const isWeekend = ((i + 3) % 7) >= 5;
                return (
                  <div
                    key={day}
                    className={`h-8 rounded-lg flex items-center justify-center text-[9px] font-black transition-all ${
                      isWeekend
                        ? 'bg-white/5 text-slate-600'
                        : leaveColor
                        ? `${leaveColor} text-white`
                        : 'bg-white/10 text-slate-300 hover:bg-white/20 cursor-pointer'
                    }`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-8">
            <h5 className="text-[10px] font-black text-slate-900 uppercase italic tracking-widest mb-5">Typy Nieobecności</h5>
            <div className="space-y-3">
              {(Object.entries(TYPE_CONFIG) as [LeaveType, typeof TYPE_CONFIG[LeaveType]][]).map(([type, cfg]) => (
                <div key={type} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center border flex-shrink-0 ${cfg.color}`}>
                    {cfg.icon}
                  </div>
                  <span className="text-[9px] font-black text-slate-600 uppercase italic">{type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
