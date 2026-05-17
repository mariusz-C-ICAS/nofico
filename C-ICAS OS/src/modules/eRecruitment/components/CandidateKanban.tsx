/**
 * Data: 2026-05-16
 * Ścieżka: /src/modules/eRecruitment/components/CandidateKanban.tsx
 */
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Mail, CalendarDays, Sparkles, ChevronDown, GripVertical, Loader2,
} from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useAuth } from '../../../shared/hooks/AuthContext';

type Stage =
  | 'aplikacja'
  | 'screening'
  | 'rozmowa_hr'
  | 'test_tech'
  | 'rozmowa_finalna'
  | 'oferta'
  | 'zatrudniony'
  | 'odrzucony';

interface Candidate {
  id: string;
  name: string;
  position: string;
  email: string;
  appliedDate: string;
  aiScore: number;
  stage: Stage;
  avatar: string;
}

const COLUMNS: { id: Stage; label: string; color: string; dot: string }[] = [
  { id: 'aplikacja',       label: 'Aplikacja',        color: 'bg-slate-50',    dot: 'bg-slate-400'   },
  { id: 'screening',       label: 'Screening CV',     color: 'bg-blue-50',     dot: 'bg-blue-500'    },
  { id: 'rozmowa_hr',      label: 'Rozmowa HR',       color: 'bg-indigo-50',   dot: 'bg-indigo-600'  },
  { id: 'test_tech',       label: 'Test Techniczny',  color: 'bg-amber-50',    dot: 'bg-amber-500'   },
  { id: 'rozmowa_finalna', label: 'Rozmowa Finalna',  color: 'bg-purple-50',   dot: 'bg-purple-600'  },
  { id: 'oferta',          label: 'Oferta',           color: 'bg-emerald-50',  dot: 'bg-emerald-500' },
  { id: 'zatrudniony',     label: 'Zatrudniony',      color: 'bg-emerald-100', dot: 'bg-emerald-700' },
  { id: 'odrzucony',       label: 'Odrzucony',        color: 'bg-rose-50',     dot: 'bg-rose-500'    },
];

function scoreColor(s: number) {
  if (s >= 85) return 'text-emerald-600 bg-emerald-50';
  if (s >= 70) return 'text-amber-600 bg-amber-50';
  return 'text-rose-600 bg-rose-50';
}

function avatarColor(initials: string) {
  const colors = ['bg-indigo-600', 'bg-emerald-600', 'bg-amber-600', 'bg-rose-600', 'bg-purple-600', 'bg-blue-600'];
  return colors[initials.charCodeAt(0) % colors.length];
}

export default function CandidateKanban() {
  const { activeTenantId } = useAuth() as any;
  const [candidates,      setCandidates]      = useState<Candidate[]>([]);
  const [filterPosition,  setFilterPosition]  = useState('Wszystkie');
  const [loading,         setLoading]         = useState(true);

  useEffect(() => {
    if (!activeTenantId) return;
    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, `tenants/${activeTenantId}/candidates`));
        setCandidates(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Candidate)));
      } finally {
        setLoading(false);
      }
    })();
  }, [activeTenantId]);

  const positions = ['Wszystkie', ...Array.from(new Set(candidates.map(c => c.position)))];

  const filtered = candidates.filter(
    c => filterPosition === 'Wszystkie' || c.position === filterPosition
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative">
          <select
            value={filterPosition}
            onChange={e => setFilterPosition(e.target.value)}
            className="appearance-none bg-slate-100 border-none rounded-[2rem] px-6 py-3 pr-10 text-[10px] font-black uppercase tracking-widest text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
          >
            {positions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          {filtered.length} kandydatów
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" size={24} /></div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {COLUMNS.map(col => {
              const colCandidates = filtered.filter(c => c.stage === col.id);
              return (
                <div
                  key={col.id}
                  className={`${col.color} rounded-[2rem] p-4 w-64 flex flex-col gap-3 border border-white/60 min-h-[480px]`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${col.dot}`} />
                      <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{col.label}</span>
                    </div>
                    <span className="text-[9px] font-black bg-white text-slate-500 px-2 py-0.5 rounded-full shadow-sm">
                      {colCandidates.length}
                    </span>
                  </div>

                  {colCandidates.map((c, i) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-white rounded-[1.5rem] p-4 shadow-sm border border-slate-100 hover:border-indigo-200 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <GripVertical size={12} className="text-slate-200 group-hover:text-slate-400 transition-colors" />
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${scoreColor(c.aiScore)}`}>
                          <Sparkles size={8} /> {c.aiScore}%
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mb-3">
                        <div className={`${avatarColor(c.avatar)} w-9 h-9 rounded-full flex items-center justify-center text-white text-[10px] font-black flex-shrink-0`}>
                          {c.avatar}
                        </div>
                        <div>
                          <div className="text-xs font-black text-slate-900 leading-tight">{c.name}</div>
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-tight line-clamp-1">{c.position}</div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                          <Mail size={9} /> {c.email}
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                          <CalendarDays size={9} /> {c.appliedDate}
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {colCandidates.length === 0 && (
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Brak kandydatów</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
