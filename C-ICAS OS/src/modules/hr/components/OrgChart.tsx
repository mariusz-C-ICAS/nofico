/**
 * Data: 2026-05-14
 * Ścieżka: /src/modules/hr/components/OrgChart.tsx
 */
import React, { useState } from 'react';
import { Plus, Users, Building2, Briefcase, ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface OrgNode {
  id: string;
  role: string;
  name: string;
  department?: string;
  children?: OrgNode[];
  vacant?: boolean;
  photoURL?: string;
}

const ORG_TREE: OrgNode = {
  id: 'ceo',
  role: 'Prezes Zarządu',
  name: 'Jan Malinowski',
  children: [
    {
      id: 'hr-dir',
      role: 'Dyrektor HR',
      name: 'Anna Nowak',
      department: 'HR',
      children: [
        { id: 'hr-spec1', role: 'Specjalista ds. Kadr', name: 'Maria Kowalczyk', department: 'HR' },
        { id: 'hr-spec2', role: 'Specjalista ds. Płac', name: 'Tomasz Witek',    department: 'HR' },
      ],
    },
    {
      id: 'fin-dir',
      role: 'Dyrektor Finansowy',
      name: 'Piotr Wiśniewski',
      department: 'Finanse',
      children: [
        { id: 'accountant',   role: 'Główny Księgowy',     name: 'Ewa Dąbrowska',  department: 'Finanse' },
        { id: 'controller',   role: 'Kontroler Finansowy', name: '— Wakat —',      department: 'Finanse', vacant: true },
      ],
    },
    {
      id: 'prod-dir',
      role: 'Dyrektor Produkcji',
      name: 'Marek Zając',
      department: 'Produkcja',
      children: [
        { id: 'shift-mgr',  role: 'Kierownik Zmiany A', name: 'Joanna Lewandowska', department: 'Produkcja' },
        { id: 'shift-mgr2', role: 'Kierownik Zmiany B', name: '— Wakat —',          department: 'Produkcja', vacant: true },
      ],
    },
    {
      id: 'sales-dir',
      role: 'Dyrektor Sprzedaży',
      name: 'Katarzyna Mazur',
      department: 'Sprzedaż',
      children: [
        { id: 'account1', role: 'Account Manager', name: 'Monika Kamińska', department: 'Sprzedaż' },
        { id: 'account2', role: 'Account Manager', name: 'Rafał Szymański', department: 'Sprzedaż' },
      ],
    },
    {
      id: 'it-dir',
      role: 'CTO',
      name: 'Adam Kowalski',
      department: 'IT',
      children: [
        { id: 'dev1',  role: 'Senior Developer', name: 'Tomasz Dąbrowski', department: 'IT' },
        { id: 'dev2',  role: 'UX Designer',      name: 'Katarzyna Wilk',   department: 'IT' },
        { id: 'devops',role: 'DevOps Engineer',  name: 'Paweł Krawczyk',   department: 'IT' },
      ],
    },
  ],
};

const DEPT_COLORS: Record<string, string> = {
  HR:        'bg-rose-50 border-rose-200 text-rose-700',
  Finanse:   'bg-emerald-50 border-emerald-200 text-emerald-700',
  Produkcja: 'bg-amber-50 border-amber-200 text-amber-700',
  Sprzedaż:  'bg-violet-50 border-violet-200 text-violet-700',
  IT:        'bg-indigo-50 border-indigo-200 text-indigo-700',
};

const DEPT_AVATAR: Record<string, string> = {
  HR:        'bg-rose-100 text-rose-700',
  Finanse:   'bg-emerald-100 text-emerald-700',
  Produkcja: 'bg-amber-100 text-amber-700',
  Sprzedaż:  'bg-violet-100 text-violet-700',
  IT:        'bg-indigo-100 text-indigo-700',
};

function getInitials(name: string) {
  const parts = name.split(' ');
  if (parts.length < 2 || name.includes('—')) return '??';
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function OrgNodeCard({ node, depth = 0 }: { node: OrgNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const colorClass  = node.department ? (DEPT_COLORS[node.department] ?? 'bg-slate-50 border-slate-200 text-slate-700') : 'bg-slate-900 border-slate-800 text-white';
  const avatarClass = node.department ? (DEPT_AVATAR[node.department] ?? 'bg-slate-100 text-slate-700') : 'bg-white/20 text-white';

  return (
    <div className="flex flex-col items-center">
      <motion.div
        whileHover={{ scale: 1.03 }}
        className={`border-2 rounded-[2rem] px-6 py-5 min-w-[180px] max-w-[220px] text-center shadow-sm cursor-pointer select-none ${colorClass} ${node.vacant ? 'opacity-50 border-dashed' : ''}`}
        onClick={() => hasChildren && setExpanded(v => !v)}
      >
        {node.photoURL && !node.vacant
          ? <img src={node.photoURL} alt={getInitials(node.name)} className="w-12 h-12 rounded-2xl object-cover mx-auto mb-3 border border-white/30" />
          : <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black mx-auto mb-3 ${avatarClass}`}>{getInitials(node.name)}</div>
        }
        <div className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-70">{node.role}</div>
        <div className="text-xs font-black uppercase italic leading-tight">{node.name}</div>
        {node.department && (
          <div className="text-[8px] font-black uppercase tracking-widest mt-2 opacity-60">{node.department}</div>
        )}
        {hasChildren && (
          <div className="mt-3 flex justify-center">
            {expanded ? <ChevronDown size={14} className="opacity-50" /> : <ChevronRight size={14} className="opacity-50" />}
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {hasChildren && expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col items-center">
              <div className="w-px h-8 bg-slate-200" />
              <div className="flex gap-6 relative">
                {node.children!.map((child, i) => (
                  <div key={child.id} className="flex flex-col items-center">
                    <div className="w-px h-8 bg-slate-200" />
                    <OrgNodeCard node={child} depth={depth + 1} />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function OrgChart() {
  const deptStats = [
    { dept: 'HR',        total: 3, filled: 3, vacant: 0 },
    { dept: 'Finanse',   total: 3, filled: 2, vacant: 1 },
    { dept: 'Produkcja', total: 3, filled: 2, vacant: 1 },
    { dept: 'Sprzedaż',  total: 3, filled: 3, vacant: 0 },
    { dept: 'IT',        total: 4, filled: 4, vacant: 0 },
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-500">

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 text-center">
          <Building2 size={28} className="text-slate-300 mx-auto mb-3" />
          <div className="text-3xl font-black text-slate-900 italic">5</div>
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Działy</div>
        </div>
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 text-center">
          <Users size={28} className="text-indigo-300 mx-auto mb-3" />
          <div className="text-3xl font-black text-indigo-600 italic">16</div>
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Stanowiska</div>
        </div>
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 text-center">
          <Briefcase size={28} className="text-emerald-300 mx-auto mb-3" />
          <div className="text-3xl font-black text-emerald-600 italic">14</div>
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Obsadzone</div>
        </div>
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 text-center">
          <Briefcase size={28} className="text-rose-300 mx-auto mb-3" />
          <div className="text-3xl font-black text-rose-500 italic">2</div>
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Wakaty</div>
        </div>
      </div>

      {/* Headcount per dept */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h4 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Struktura Organizacyjna</h4>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mt-1">Obsada etatowa według działów</p>
          </div>
          <button className="bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-600 transition-all">
            <Plus size={14} /> Dodaj Stanowisko
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-10">
          {deptStats.map(d => {
            const fillPct = Math.round((d.filled / d.total) * 100);
            const colorKey = d.dept as keyof typeof DEPT_COLORS;
            return (
              <div key={d.dept} className={`border-2 rounded-[2rem] p-6 ${DEPT_COLORS[colorKey] ?? 'bg-slate-50 border-slate-200'}`}>
                <div className="text-xs font-black uppercase italic tracking-tighter mb-4">{d.dept}</div>
                <div className="text-2xl font-black italic mb-1">{d.filled}<span className="text-sm opacity-50">/{d.total}</span></div>
                <div className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-3">obsadzone</div>
                <div className="w-full bg-black/10 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-current h-full rounded-full transition-all" style={{ width: `${fillPct}%` }} />
                </div>
                {d.vacant > 0 && (
                  <div className="mt-2 text-[8px] font-black uppercase tracking-widest opacity-70">{d.vacant} wakat{d.vacant > 1 ? 'y' : ''}</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Org tree */}
        <div className="overflow-x-auto py-6">
          <div className="flex justify-center min-w-max">
            <OrgNodeCard node={ORG_TREE} depth={0} />
          </div>
        </div>
      </div>
    </div>
  );
}
