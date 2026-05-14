/**
 * Data: 2026-05-14
 * Ścieżka: /src/modules/eRecruitment/components/JobPostingList.tsx
 */
import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  MapPin, Clock, Users, ChevronDown, Plus,
  Eye, Edit2, Send, X, Briefcase, Building2, Tag
} from 'lucide-react';

type Status       = 'Aktywna' | 'Szkic' | 'Zamknięta';
type Contract     = 'UoP' | 'B2B' | 'Zlecenie' | 'UoP / B2B';
type WorkMode     = 'Zdalnie' | 'Hybrydowo' | 'Stacjonarnie';
type Department   = 'IT' | 'HR' | 'Finanse' | 'Sprzedaz' | 'Operations';

interface JobPosting {
  id: string;
  title: string;
  department: Department;
  location: string;
  workMode: WorkMode;
  contract: Contract;
  postedDate: string;
  applications: number;
  status: Status;
}

const MOCK_JOBS: JobPosting[] = [
  { id: 'j1', title: 'Senior Full-Stack Developer', department: 'IT',         location: 'Warszawa',  workMode: 'Hybrydowo',      contract: 'UoP / B2B', postedDate: '2026-05-01', applications: 34, status: 'Aktywna'   },
  { id: 'j2', title: 'HR Business Partner',         department: 'HR',         location: 'Krakow',    workMode: 'Stacjonarnie',   contract: 'UoP',       postedDate: '2026-04-28', applications: 18, status: 'Aktywna'   },
  { id: 'j3', title: 'Account Manager B2B',         department: 'Sprzedaz',   location: 'Gdansk',    workMode: 'Hybrydowo',      contract: 'UoP',       postedDate: '2026-05-07', applications: 9,  status: 'Aktywna'   },
  { id: 'j4', title: 'DevOps Engineer',             department: 'IT',         location: 'Remote',    workMode: 'Zdalnie',        contract: 'B2B',       postedDate: '2026-05-10', applications: 47, status: 'Aktywna'   },
  { id: 'j5', title: 'Kontroler Finansowy',         department: 'Finanse',    location: 'Warszawa',  workMode: 'Hybrydowo',      contract: 'UoP',       postedDate: '2026-04-15', applications: 22, status: 'Zamknięta' },
  { id: 'j6', title: 'Operations Specialist',       department: 'Operations', location: 'Wroclaw',   workMode: 'Stacjonarnie',   contract: 'Zlecenie',  postedDate: '2026-05-12', applications: 0,  status: 'Szkic'     },
];

const STATUS_STYLE: Record<Status, string> = {
  'Aktywna':    'bg-emerald-100 text-emerald-700',
  'Szkic':      'bg-slate-100 text-slate-500',
  'Zamknięta':  'bg-rose-100 text-rose-600',
};

const MODE_STYLE: Record<WorkMode, string> = {
  'Zdalnie':       'bg-indigo-100 text-indigo-600',
  'Hybrydowo':     'bg-amber-100 text-amber-700',
  'Stacjonarnie':  'bg-slate-100 text-slate-600',
};

const DEPARTMENTS: ('Wszystkie' | Department)[] = ['Wszystkie', 'IT', 'HR', 'Finanse', 'Sprzedaz', 'Operations'];
const STATUSES: ('Wszystkie' | Status)[] = ['Wszystkie', 'Aktywna', 'Szkic', 'Zamknięta'];
const CONTRACTS: ('Wszystkie' | Contract)[] = ['Wszystkie', 'UoP', 'B2B', 'Zlecenie', 'UoP / B2B'];

export default function JobPostingList() {
  const [filterDept,     setFilterDept]     = useState<string>('Wszystkie');
  const [filterStatus,   setFilterStatus]   = useState<string>('Wszystkie');
  const [filterContract, setFilterContract] = useState<string>('Wszystkie');

  const filtered = MOCK_JOBS.filter(j =>
    (filterDept     === 'Wszystkie' || j.department === filterDept) &&
    (filterStatus   === 'Wszystkie' || j.status     === filterStatus) &&
    (filterContract === 'Wszystkie' || j.contract   === filterContract)
  );

  return (
    <div className="space-y-8">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-wrap gap-3">
          {/* Department filter */}
          <div className="relative">
            <select
              value={filterDept}
              onChange={e => setFilterDept(e.target.value)}
              className="appearance-none bg-slate-100 border-none rounded-[2rem] px-6 py-3 pr-10 text-[10px] font-black uppercase tracking-widest text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
            >
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <Building2 size={12} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Status filter */}
          <div className="relative">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="appearance-none bg-slate-100 border-none rounded-[2rem] px-6 py-3 pr-10 text-[10px] font-black uppercase tracking-widest text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
            >
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <Tag size={12} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Contract filter */}
          <div className="relative">
            <select
              value={filterContract}
              onChange={e => setFilterContract(e.target.value)}
              className="appearance-none bg-slate-100 border-none rounded-[2rem] px-6 py-3 pr-10 text-[10px] font-black uppercase tracking-widest text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
            >
              {CONTRACTS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <button className="bg-slate-900 text-white px-10 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-indigo-600 transition-all shadow-2xl shadow-slate-200">
          <Plus size={16} /> Dodaj Oferte
        </button>
      </div>

      {/* Count */}
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
        {filtered.length} ofert{filtered.length !== 1 ? 'y' : 'a'}
      </p>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map((job, i) => (
          <motion.div
            key={job.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-white border-2 border-slate-100 rounded-[3rem] p-8 shadow-sm hover:shadow-lg hover:border-indigo-100 transition-all group"
          >
            {/* Top row */}
            <div className="flex justify-between items-start mb-5">
              <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${STATUS_STYLE[job.status]}`}>
                {job.status}
              </span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{job.department}</span>
            </div>

            {/* Title */}
            <h3 className="text-lg font-black text-slate-900 italic tracking-tighter leading-tight mb-4">
              {job.title}
            </h3>

            {/* Meta */}
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                <MapPin size={11} className="text-slate-300" />
                {job.location}
                <span className={`ml-2 px-2 py-0.5 rounded-full text-[9px] ${MODE_STYLE[job.workMode]}`}>
                  {job.workMode}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                <Briefcase size={11} className="text-slate-300" />
                {job.contract}
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                <Clock size={11} className="text-slate-300" />
                Dodano: {job.postedDate}
              </div>
            </div>

            {/* Applications count */}
            <div className="flex items-center gap-2 bg-slate-50 rounded-2xl px-5 py-3 mb-6">
              <Users size={14} className="text-indigo-600" />
              <span className="text-sm font-black text-slate-900 italic">{job.applications}</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">aplikacji</span>
            </div>

            {/* Actions */}
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-600 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all">
                <Eye size={12} /> Aplikacje
              </button>
              <button className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-600 px-4 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all">
                <Edit2 size={12} />
              </button>
              {job.status === 'Szkic' && (
                <button className="flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 px-4 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all">
                  <Send size={12} />
                </button>
              )}
              {job.status === 'Aktywna' && (
                <button className="flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 px-4 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all">
                  <X size={12} />
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
