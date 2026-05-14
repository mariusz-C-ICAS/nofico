/**
 * Data: 2026-05-14
 * Ścieżka: /src/modules/eRecruitment/components/OnboardingChecklist.tsx
 */
import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  UserCheck, Monitor, Key, Users, BookOpen,
  Target, CheckCircle2, Circle, ChevronDown, ChevronUp
} from 'lucide-react';

type Owner  = 'IT' | 'HR' | 'Manager' | 'Pracownik';
type Phase  = 'pre' | 'day1' | 'week1' | 'month1' | 'month3';

interface Task {
  id: string;
  label: string;
  owner: Owner;
  done: boolean;
}

interface PhaseData {
  id: Phase;
  label: string;
  icon: React.ElementType;
  tasks: Task[];
}

interface Employee {
  id: string;
  name: string;
  position: string;
  startDate: string;
  avatar: string;
  phases: PhaseData[];
}

const OWNER_STYLE: Record<Owner, string> = {
  IT:         'bg-indigo-100 text-indigo-700',
  HR:         'bg-pink-100 text-pink-700',
  Manager:    'bg-amber-100 text-amber-700',
  Pracownik:  'bg-emerald-100 text-emerald-700',
};

const initPhases = (doneMap: Partial<Record<string, boolean>>): PhaseData[] => [
  {
    id: 'pre', label: 'Pre-arrival', icon: Monitor,
    tasks: [
      { id: 'p1', label: 'Konfiguracja konta domenowego AD',        owner: 'IT',      done: doneMap['p1'] ?? false },
      { id: 'p2', label: 'Zamowienie sprzetu (laptop, telefon)',     owner: 'IT',      done: doneMap['p2'] ?? false },
      { id: 'p3', label: 'Podpisanie umowy o prace (e-podpis)',      owner: 'HR',      done: doneMap['p3'] ?? false },
      { id: 'p4', label: 'Wyslanie pakietu powitalnego',             owner: 'HR',      done: doneMap['p4'] ?? false },
    ],
  },
  {
    id: 'day1', label: 'Dzien 1', icon: Key,
    tasks: [
      { id: 'd1', label: 'Wydanie przepustki / badge dostepowej',    owner: 'IT',      done: doneMap['d1'] ?? false },
      { id: 'd2', label: 'Konfiguracja VPN i 2FA',                  owner: 'IT',      done: doneMap['d2'] ?? false },
      { id: 'd3', label: 'Spotkanie z HR (polityki, BHP)',           owner: 'HR',      done: doneMap['d3'] ?? false },
      { id: 'd4', label: 'Przedstawienie zespolowi (wideo-call)',    owner: 'Manager', done: doneMap['d4'] ?? false },
    ],
  },
  {
    id: 'week1', label: 'Tydzien 1', icon: Users,
    tasks: [
      { id: 'w1', label: 'Intro z kluczowymi interesariuszami',     owner: 'Manager', done: doneMap['w1'] ?? false },
      { id: 'w2', label: 'Dostep do systemow (CRM, ERP, Slack)',    owner: 'IT',      done: doneMap['w2'] ?? false },
      { id: 'w3', label: 'Szkolenie RODO + compliance',             owner: 'HR',      done: doneMap['w3'] ?? false },
      { id: 'w4', label: 'Konfiguracja przestrzeni roboczej',       owner: 'Pracownik', done: doneMap['w4'] ?? false },
    ],
  },
  {
    id: 'month1', label: 'Miesiac 1', icon: BookOpen,
    tasks: [
      { id: 'm1', label: 'Ukonczenie szkolenia produktowego (LMS)', owner: 'Pracownik', done: doneMap['m1'] ?? false },
      { id: 'm2', label: 'Przeglad 30-dniowy z managerem',          owner: 'Manager',   done: doneMap['m2'] ?? false },
      { id: 'm3', label: 'Uzupelnienie profilu HRMS',               owner: 'HR',        done: doneMap['m3'] ?? false },
    ],
  },
  {
    id: 'month3', label: 'Miesiac 3', icon: Target,
    tasks: [
      { id: 'q1', label: 'Ustalenie celow OKR na kwartał',         owner: 'Manager',   done: doneMap['q1'] ?? false },
      { id: 'q2', label: 'Ocena okresu probnego',                  owner: 'HR',        done: doneMap['q2'] ?? false },
      { id: 'q3', label: 'Plan rozwoju (IDP)',                     owner: 'Manager',   done: doneMap['q3'] ?? false },
    ],
  },
];

const MOCK_EMPLOYEES: Employee[] = [
  {
    id: 'e1',
    name: 'Ewa Mazur',
    position: 'Kontroler Finansowy',
    startDate: '2026-05-05',
    avatar: 'EM',
    phases: initPhases({ p1: true, p2: true, p3: true, p4: true, d1: true, d2: true, d3: false, d4: false }),
  },
  {
    id: 'e2',
    name: 'Kamil Baran',
    position: 'DevOps Engineer',
    startDate: '2026-05-12',
    avatar: 'KB',
    phases: initPhases({ p1: true, p2: false, p3: true, p4: false }),
  },
];

const AVATAR_COLORS = ['bg-indigo-600', 'bg-emerald-600', 'bg-amber-600', 'bg-rose-600'];

function calcProgress(phases: PhaseData[]) {
  const all = phases.flatMap(p => p.tasks);
  const done = all.filter(t => t.done).length;
  return { done, total: all.length, pct: Math.round((done / all.length) * 100) };
}

export default function OnboardingChecklist() {
  const [employees, setEmployees] = useState<Employee[]>(MOCK_EMPLOYEES);
  const [expanded, setExpanded] = useState<Record<string, Phase | null>>({ e1: 'pre', e2: 'pre' });

  const toggleTask = (empId: string, phaseId: Phase, taskId: string) => {
    setEmployees(prev => prev.map(emp => {
      if (emp.id !== empId) return emp;
      return {
        ...emp,
        phases: emp.phases.map(ph => {
          if (ph.id !== phaseId) return ph;
          return {
            ...ph,
            tasks: ph.tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t),
          };
        }),
      };
    }));
  };

  const togglePhase = (empId: string, phaseId: Phase) => {
    setExpanded(prev => ({
      ...prev,
      [empId]: prev[empId] === phaseId ? null : phaseId,
    }));
  };

  return (
    <div className="space-y-10">
      {employees.map((emp, empIdx) => {
        const prog = calcProgress(emp.phases);
        const avatarColor = AVATAR_COLORS[empIdx % AVATAR_COLORS.length];

        return (
          <motion.div
            key={emp.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: empIdx * 0.1 }}
            className="bg-white border-2 border-slate-100 rounded-[3rem] shadow-sm overflow-hidden"
          >
            {/* Employee header */}
            <div className="p-8 flex flex-col md:flex-row justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className={`${avatarColor} w-14 h-14 rounded-full flex items-center justify-center text-white font-black text-sm flex-shrink-0`}>
                  {emp.avatar}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 italic tracking-tighter">{emp.name}</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{emp.position}</p>
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-0.5">
                    Start: {emp.startDate}
                  </p>
                </div>
              </div>

              {/* Progress */}
              <div className="flex flex-col justify-center gap-2 min-w-[200px]">
                <div className="flex justify-between">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Postep onboardingu</span>
                  <span className="text-[9px] font-black text-slate-900">{prog.done}/{prog.total}</span>
                </div>
                <div className="bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <motion.div
                    className="h-2.5 bg-indigo-600 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${prog.pct}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
                <div className="text-right text-[10px] font-black text-indigo-600 italic">{prog.pct}%</div>
              </div>
            </div>

            {/* Phases */}
            <div className="border-t border-slate-100">
              {emp.phases.map(phase => {
                const phaseDone = phase.tasks.filter(t => t.done).length;
                const isOpen = expanded[emp.id] === phase.id;

                return (
                  <div key={phase.id} className="border-b border-slate-50 last:border-b-0">
                    <button
                      onClick={() => togglePhase(emp.id, phase.id)}
                      className="w-full flex items-center justify-between px-8 py-5 hover:bg-slate-50 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <phase.icon size={14} className="text-slate-500" />
                        </div>
                        <div className="text-left">
                          <div className="text-[11px] font-black text-slate-900 uppercase tracking-widest">{phase.label}</div>
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                            {phaseDone}/{phase.tasks.length} zadan
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-1.5 bg-indigo-600 rounded-full transition-all"
                            style={{ width: `${(phaseDone / phase.tasks.length) * 100}%` }}
                          />
                        </div>
                        {isOpen
                          ? <ChevronUp size={16} className="text-slate-400" />
                          : <ChevronDown size={16} className="text-slate-400" />
                        }
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-8 pb-6 space-y-3">
                        {phase.tasks.map(task => (
                          <div
                            key={task.id}
                            onClick={() => toggleTask(emp.id, phase.id, task.id)}
                            className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 cursor-pointer transition-all group"
                          >
                            {task.done
                              ? <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
                              : <Circle size={18} className="text-slate-300 flex-shrink-0 group-hover:text-indigo-400 transition-colors" />
                            }
                            <span className={`flex-1 text-[11px] font-black uppercase tracking-wider ${task.done ? 'text-slate-300 line-through' : 'text-slate-700'}`}>
                              {task.label}
                            </span>
                            <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full flex-shrink-0 ${OWNER_STYLE[task.owner]}`}>
                              {task.owner}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
