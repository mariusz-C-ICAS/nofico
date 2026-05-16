/**
 * Data: 2026-05-14
 * Sciezka: src/modules/projects/components/GanttView.tsx
 */
import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Diamond } from 'lucide-react';

type ZoomLevel = 'week' | 'month' | 'quarter';

interface GanttTask {
  id: string;
  name: string;
  project: string;
  start: Date;
  end: Date;
  color: string;
  progress: number;
  dependencies?: string[];
  milestones?: { date: Date; label: string }[];
  assignee: string;
}

const TASKS: GanttTask[] = [
  {
    id: 't1',
    name: 'Analiza Wymagan i Architektura',
    project: 'RuFlo V3',
    start: new Date(2026, 3, 1),
    end: new Date(2026, 3, 21),
    color: '#6366f1',
    progress: 100,
    assignee: 'MC',
    milestones: [{ date: new Date(2026, 3, 21), label: 'Spec. zatwierdzona' }],
  },
  {
    id: 't2',
    name: 'Implementacja Core Modules',
    project: 'RuFlo V3',
    start: new Date(2026, 3, 14),
    end: new Date(2026, 5, 15),
    color: '#6366f1',
    progress: 68,
    dependencies: ['t1'],
    assignee: 'PZ',
    milestones: [{ date: new Date(2026, 4, 14), label: 'Alpha release' }],
  },
  {
    id: 't3',
    name: 'Przebudowa Sali A — Etap I',
    project: 'Willa Magnolia',
    start: new Date(2026, 3, 7),
    end: new Date(2026, 4, 31),
    color: '#f59e0b',
    progress: 45,
    assignee: 'TP',
    milestones: [{ date: new Date(2026, 4, 31), label: 'Etap I zakonczony' }],
  },
  {
    id: 't4',
    name: 'Instalacje Elektryczne i Sanitarne',
    project: 'Willa Magnolia',
    start: new Date(2026, 4, 7),
    end: new Date(2026, 5, 30),
    color: '#f59e0b',
    progress: 12,
    dependencies: ['t3'],
    assignee: 'KW',
  },
  {
    id: 't5',
    name: 'Kampania Marketing Q2 2026',
    project: 'Marketing',
    start: new Date(2026, 3, 1),
    end: new Date(2026, 5, 30),
    color: '#10b981',
    progress: 55,
    assignee: 'MN',
    milestones: [
      { date: new Date(2026, 3, 30), label: 'Brief zatwierdzony' },
      { date: new Date(2026, 5, 30), label: 'Kampania zamknieta' },
    ],
  },
];

const PROJECT_COLORS: Record<string, string> = {
  'RuFlo V3': '#6366f1',
  'Willa Magnolia': '#f59e0b',
  'Marketing': '#10b981',
};

const ZOOM_CONFIG: Record<ZoomLevel, { cellWidth: number; headerFn: (d: Date) => string; stepDays: number; cells: number }> = {
  week:    { cellWidth: 60, headerFn: d => `${d.getDate()}`, stepDays: 1, cells: 28 },
  month:   { cellWidth: 40, headerFn: d => `${d.getDate()}`, stepDays: 1, cells: 90 },
  quarter: { cellWidth: 80, headerFn: d => d.toLocaleString('pl-PL', { month: 'short' }), stepDays: 7, cells: 13 },
};

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export default function GanttView() {
  const [zoom, setZoom] = useState<ZoomLevel>('month');
  const [offset, setOffset] = useState(0);

  const cfg = ZOOM_CONFIG[zoom];

  const viewStart = useMemo(() => {
    const base = new Date(2026, 3, 1);
    return addDays(base, offset * cfg.stepDays * cfg.cells);
  }, [zoom, offset, cfg]);

  const headers = useMemo(() => {
    return Array.from({ length: cfg.cells }, (_, i) => addDays(viewStart, i * cfg.stepDays));
  }, [viewStart, cfg]);

  const today = new Date(2026, 4, 14);
  const todayOffset = daysBetween(viewStart, today);
  const todayPx = (todayOffset / cfg.stepDays) * cfg.cellWidth;

  const getBarStyle = (task: GanttTask) => {
    const start = daysBetween(viewStart, task.start) / cfg.stepDays;
    const duration = daysBetween(task.start, task.end) / cfg.stepDays;
    return {
      left: `${start * cfg.cellWidth}px`,
      width: `${duration * cfg.cellWidth}px`,
    };
  };

  const getMilestoneLeft = (date: Date) => {
    const d = daysBetween(viewStart, date) / cfg.stepDays;
    return `${d * cfg.cellWidth}px`;
  };

  const totalWidth = cfg.cells * cfg.cellWidth;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl">
          {(['week', 'month', 'quarter'] as ZoomLevel[]).map(z => (
            <button key={z} onClick={() => { setZoom(z); setOffset(0); }}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                zoom === z ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {z === 'week' ? 'Tydzien' : z === 'month' ? 'Miesiac' : 'Kwartal'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setOffset(o => o - 1)} className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:border-indigo-400 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest min-w-[120px] text-center">
            {viewStart.toLocaleString('pl-PL', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => setOffset(o => o + 1)} className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:border-indigo-400 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {Object.entries(PROJECT_COLORS).map(([name, color]) => (
            <div key={name} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-[9px] font-black uppercase tracking-widest text-slate-400">
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-3 rounded-full bg-indigo-600 relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 w-3/4 bg-white/20 rounded-full" />
          </div>
          Postep zadania
        </div>
        <div className="flex items-center gap-1.5">
          <Diamond size={10} className="text-rose-500 fill-rose-500" />
          Kamien milowy
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-px h-4 bg-rose-500 border-dashed" />
          Dzis
        </div>
      </div>

      {/* Gantt grid */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <div style={{ minWidth: `${240 + totalWidth}px` }}>
            {/* Header row */}
            <div className="flex border-b border-slate-100 bg-slate-50/80 sticky top-0 z-10">
              <div className="w-60 shrink-0 px-5 py-4 flex items-center border-r border-slate-100">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Zadanie / Projekt</span>
              </div>
              <div className="relative flex" style={{ width: `${totalWidth}px` }}>
                {headers.map((d, i) => (
                  <div key={i} style={{ width: `${cfg.cellWidth}px`, minWidth: `${cfg.cellWidth}px` }}
                    className={`text-center text-[9px] font-black uppercase py-4 border-r border-slate-100 ${
                      d.getDay() === 0 || d.getDay() === 6 ? 'text-slate-300' : 'text-slate-400'
                    }`}
                  >
                    {cfg.headerFn(d)}
                  </div>
                ))}
                {/* Today line in header */}
                {todayPx >= 0 && todayPx <= totalWidth && (
                  <div className="absolute top-0 bottom-0 w-px bg-rose-400 z-20" style={{ left: `${todayPx}px` }}>
                    <div className="absolute -top-0 left-1 text-[8px] font-black text-rose-500 uppercase tracking-widest whitespace-nowrap">Dzis</div>
                  </div>
                )}
              </div>
            </div>

            {/* Task rows */}
            {TASKS.map((task, rowIdx) => {
              const barStyle = getBarStyle(task);
              const progressWidth = `${task.progress}%`;
              return (
                <motion.div key={task.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: rowIdx * 0.06 }}
                  className="flex items-center border-b border-slate-50 hover:bg-slate-50/50 transition-colors group"
                >
                  <div className="w-60 shrink-0 px-5 py-4 border-r border-slate-100">
                    <div className="font-bold text-xs text-slate-800 truncate">{task.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: task.color }} />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{task.project}</span>
                    </div>
                  </div>

                  {/* Bar area */}
                  <div className="relative" style={{ width: `${totalWidth}px`, height: '60px' }}>
                    {/* Grid lines */}
                    {headers.map((d, i) => (
                      <div key={i} className={`absolute top-0 bottom-0 border-r ${d.getDay() === 0 ? 'border-slate-200' : 'border-slate-50'}`}
                        style={{ left: `${i * cfg.cellWidth}px`, width: `${cfg.cellWidth}px` }}
                      />
                    ))}

                    {/* Today line */}
                    {todayPx >= 0 && todayPx <= totalWidth && (
                      <div className="absolute top-0 bottom-0 w-px bg-rose-300 z-10" style={{ left: `${todayPx}px` }} />
                    )}

                    {/* Task bar */}
                    {parseFloat(barStyle.left) < totalWidth && parseFloat(barStyle.left) + parseFloat(barStyle.width) > 0 && (
                      <div className="absolute top-1/2 -translate-y-1/2 h-8 rounded-[1rem] overflow-hidden group/bar cursor-pointer"
                        style={{ ...barStyle, backgroundColor: `${task.color}20`, border: `1.5px solid ${task.color}40` }}
                        title={`${task.name} — ${task.progress}%`}
                      >
                        <div className="absolute inset-y-0 left-0 rounded-l-[1rem] transition-all duration-700"
                          style={{ width: progressWidth, backgroundColor: task.color }}
                        />
                        <div className="absolute inset-0 flex items-center px-3 z-10">
                          <span className="text-[9px] font-black text-white drop-shadow uppercase tracking-wide whitespace-nowrap">
                            {task.assignee} — {task.progress}%
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Milestones */}
                    {task.milestones?.map((m, mi) => {
                      const ml = getMilestoneLeft(m.date);
                      return (
                        <div key={mi} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 group/ms" style={{ left: ml }}>
                          <div className="relative">
                            <Diamond size={16} className="fill-rose-500 text-rose-500 drop-shadow" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg opacity-0 group-hover/ms:opacity-100 transition-opacity">
                              {m.label}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
