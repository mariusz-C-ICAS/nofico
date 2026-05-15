/**
 * Data: 2026-05-14
 * Sciezka: src/modules/projects/ProjectsModule.tsx
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Briefcase, LayoutGrid, Users, DollarSign, BarChart3,
  FileText, Plus, X, Search, Filter, TrendingUp, TrendingDown,
  Clock, AlertCircle, CheckCircle2, Pause, ChevronRight,
  Calendar, Target
} from 'lucide-react';
import GanttView from './components/GanttView';

type Tab = 'projekty' | 'kanban' | 'zasoby' | 'budzety' | 'harmonogram' | 'raporty';
type ProjectStatus = 'active' | 'on-hold' | 'completed' | 'overdue';

interface Project {
  id: string;
  name: string;
  client: string;
  status: ProjectStatus;
  progress: number;
  budgetUsed: number;
  budget: number;
  teamSize: number;
  deadline: string;
  startDate: string;
  pm: string;
  pmInitials: string;
  pmColor: string;
  description: string;
  tags: string[];
}

const MOCK_PROJECTS: Project[] = [
  {
    id: 'p1', name: 'RuFlo V3 — System C-ICAS OS', client: 'C-ICAS Sp. z o.o.',
    status: 'active', progress: 68, budgetUsed: 124500, budget: 200000, teamSize: 8,
    deadline: '2026-08-31', startDate: '2026-03-01', pm: 'Mariusz Czaja', pmInitials: 'MC', pmColor: 'bg-indigo-600',
    description: 'Kompleksowy system ERP nowej generacji oparty o React 19 i architekture DDD.',
    tags: ['IT', 'ERP', 'Frontend'],
  },
  {
    id: 'p2', name: 'Willa Magnolia — Kostka Brukowa', client: 'Jan Kowalski',
    status: 'active', progress: 45, budgetUsed: 38200, budget: 85000, teamSize: 5,
    deadline: '2026-09-15', startDate: '2026-04-07', pm: 'Tomasz Piotr', pmInitials: 'TP', pmColor: 'bg-amber-500',
    description: 'Kompleksowa przebudowa nawierzchni wraz z instalacjami sanitarnymi i oswietleniem.',
    tags: ['Budownictwo', 'Zewnetrzne'],
  },
  {
    id: 'p3', name: 'Kampania Digital Marketing Q2', client: 'MediaNow Sp. z o.o.',
    status: 'overdue', progress: 55, budgetUsed: 22100, budget: 35000, teamSize: 3,
    deadline: '2026-05-01', startDate: '2026-03-15', pm: 'Maria Nowak', pmInitials: 'MN', pmColor: 'bg-rose-500',
    description: 'Kampania reklamowa w kanalach social media i Google Ads dla klienta z branzy mediowej.',
    tags: ['Marketing', 'Digital'],
  },
  {
    id: 'p4', name: 'Audi A4 — Przeglad i Wymiana Rozrzadu', client: 'Auto Serwis Zgierz',
    status: 'completed', progress: 100, budgetUsed: 4800, budget: 4800, teamSize: 2,
    deadline: '2026-05-10', startDate: '2026-05-08', pm: 'Kasia Wrona', pmInitials: 'KW', pmColor: 'bg-emerald-500',
    description: 'Kompleksowy przeglad serwisowy wraz z wymiana rozrzadu i plynow eksploatacyjnych.',
    tags: ['Warsztat', 'Serwis'],
  },
  {
    id: 'p5', name: 'Ogrody Zatoki — Projekt Zieleni', client: 'Deweloper Zatoka Sp.',
    status: 'on-hold', progress: 20, budgetUsed: 8400, budget: 60000, teamSize: 4,
    deadline: '2026-11-30', startDate: '2026-05-01', pm: 'Piotr Zaleski', pmInitials: 'PZ', pmColor: 'bg-violet-500',
    description: 'Projekt i realizacja terenow zielonych dla osiedla mieszkaniowego. Wstrzymany — decyzja inwestora.',
    tags: ['Ogrody', 'Zewnetrzne'],
  },
];

const STATUS_CONFIG: Record<ProjectStatus, { label: string; icon: React.ElementType; bg: string; text: string; border: string }> = {
  active:    { label: 'Aktywny',     icon: CheckCircle2, bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'on-hold': { label: 'Wstrzymany',  icon: Pause,        bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
  completed: { label: 'Ukonczony',   icon: CheckCircle2, bg: 'bg-sky-50',     text: 'text-sky-700',     border: 'border-sky-200' },
  overdue:   { label: 'Opozniony',   icon: AlertCircle,  bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200' },
};

const TABS_CONFIG: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'projekty',     label: 'Projekty',     icon: Briefcase   },
  { id: 'kanban',       label: 'Kanban',       icon: LayoutGrid  },
  { id: 'zasoby',       label: 'Zasoby',       icon: Users       },
  { id: 'budzety',      label: 'Budzety',      icon: DollarSign  },
  { id: 'harmonogram',  label: 'Harmonogram',  icon: Calendar    },
  { id: 'raporty',      label: 'Raporty',      icon: BarChart3   },
];

function CreateProjectModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: '', client: '', budget: '', deadline: '', description: '', pm: '' });
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden border border-slate-100"
      >
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Nowy Projekt</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inicjalizacja wegla operacyjnego</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-400"><X size={20} /></button>
        </div>
        <div className="p-8 space-y-4">
          {[
            { label: 'Nazwa Projektu', key: 'name', placeholder: 'np. Willa Magnolia 2026' },
            { label: 'Klient', key: 'client', placeholder: 'np. Jan Kowalski' },
            { label: 'Kierownik Projektu', key: 'pm', placeholder: 'np. Mariusz Czaja' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">{f.label}</label>
              <input value={form[f.key as keyof typeof form]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                placeholder={f.placeholder}
                className="w-full bg-slate-100 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 ring-indigo-500 outline-none font-bold"
              />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Budzet PLN</label>
              <input type="number" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })}
                className="w-full bg-slate-100 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 ring-indigo-500 outline-none font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Termin</label>
              <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })}
                className="w-full bg-slate-100 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 ring-indigo-500 outline-none font-bold"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Opis</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full bg-slate-100 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 ring-indigo-500 outline-none font-medium resize-none"
            />
          </div>
          <button onClick={onClose} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl">
            Utworz Projekt
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function ProjectsListView() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | 'all'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Project | null>(null);

  const filtered = MOCK_PROJECTS.filter(p =>
    (filterStatus === 'all' || p.status === filterStatus) &&
    (p.name.toLowerCase().includes(search.toLowerCase()) ||
     p.client.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2.5">
            <Search size={14} className="text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Szukaj projektow, klientow..."
              className="text-sm outline-none text-slate-700 font-medium placeholder-slate-400 w-48 bg-transparent"
            />
          </div>
          <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl">
            <button onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterStatus === 'all' ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}
            >Wszystkie</button>
            {(Object.keys(STATUS_CONFIG) as ProjectStatus[]).map(s => {
              const cfg = STATUS_CONFIG[s];
              return (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={`flex items-center gap-1 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterStatus === s ? `bg-white shadow ${cfg.text}` : 'text-slate-500'}`}
                >
                  <cfg.icon size={10} /> {cfg.label}
                </button>
              );
            })}
          </div>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-600 transition-all shadow-lg"
        >
          <Plus size={14} /> Nowy Projekt
        </button>
      </div>

      <div className="space-y-3">
        {filtered.map((p, i) => {
          const cfg = STATUS_CONFIG[p.status];
          const budgetPct = Math.round((p.budgetUsed / p.budget) * 100);
          const overBudget = p.budgetUsed > p.budget;
          return (
            <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              onClick={() => setSelected(selected?.id === p.id ? null : p)}
              className="bg-white border border-slate-100 rounded-[2rem] px-8 py-6 hover:border-indigo-200 hover:shadow-lg transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                      <cfg.icon size={9} /> {cfg.label}
                    </span>
                    {p.tags.map(t => (
                      <span key={t} className="bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full">{t}</span>
                    ))}
                  </div>
                  <h3 className="font-black text-slate-900 uppercase italic tracking-tight text-base">{p.name}</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">{p.client}</p>
                </div>

                <div className="flex items-center gap-8 shrink-0 flex-wrap">
                  <div className="text-center">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Postep</div>
                    <div className="relative w-14 h-14">
                      <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                        <circle cx="18" cy="18" r="15" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                        <circle cx="18" cy="18" r="15" fill="none" stroke="#6366f1" strokeWidth="3"
                          strokeDasharray={`${p.progress * 0.942} 94.2`} strokeLinecap="round" />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-slate-900">{p.progress}%</span>
                    </div>
                  </div>

                  <div>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Budzet</div>
                    <div className={`text-sm font-black ${overBudget ? 'text-rose-600' : 'text-slate-900'}`}>
                      {p.budgetUsed.toLocaleString()} PLN
                    </div>
                    <div className="text-[9px] text-slate-400 font-bold">z {p.budget.toLocaleString()}</div>
                    <div className="mt-1 w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${overBudget ? 'bg-rose-500' : budgetPct > 80 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(budgetPct, 100)}%` }}
                      />
                    </div>
                    <div className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${overBudget ? 'text-rose-500' : 'text-slate-400'}`}>
                      {budgetPct}% {overBudget ? '— PRZEKROCZENIE' : 'wykorzystane'}
                    </div>
                  </div>

                  <div>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Zespol</div>
                    <div className="text-xl font-black text-slate-900">{p.teamSize}<span className="text-xs text-slate-400 ml-1">os.</span></div>
                  </div>

                  <div>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Termin</div>
                    <div className={`text-sm font-black ${p.status === 'overdue' ? 'text-rose-600' : 'text-slate-800'}`}>{p.deadline}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-xl ${p.pmColor} flex items-center justify-center text-white text-[10px] font-black`}>{p.pmInitials}</div>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {selected?.id === p.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-6 pt-6 border-t border-slate-100">
                      <p className="text-sm text-slate-600 font-medium mb-4">{p.description}</p>
                      <div className="flex gap-3 flex-wrap">
                        <button className="bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-2xl hover:bg-indigo-700 transition-colors">
                          Otworz Projekt
                        </button>
                        <button className="bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-2xl hover:bg-slate-200 transition-colors">
                          Edytuj
                        </button>
                        <button className="bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-2xl hover:bg-slate-200 transition-colors">
                          Raport
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>{showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} />}</AnimatePresence>
    </div>
  );
}

function BudgetView() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Calkowity Budzet', value: '384 800', unit: 'PLN', icon: DollarSign, color: 'text-slate-900', bg: 'bg-indigo-50', iconColor: 'text-indigo-600' },
          { label: 'Wykorzystano', value: '198 000', unit: 'PLN', icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50', iconColor: 'text-amber-500' },
          { label: 'Pozostalo', value: '186 800', unit: 'PLN', icon: TrendingDown, color: 'text-emerald-600', bg: 'bg-emerald-50', iconColor: 'text-emerald-500' },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-slate-100 rounded-[2rem] p-8 flex items-center gap-5">
            <div className={`w-14 h-14 rounded-[1.5rem] ${s.bg} flex items-center justify-center`}>
              <s.icon size={24} className={s.iconColor} />
            </div>
            <div>
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</div>
              <div className={`text-2xl font-black italic ${s.color}`}>{s.value} <span className="text-sm text-slate-400">{s.unit}</span></div>
            </div>
          </div>
        ))}
      </div>

      {MOCK_PROJECTS.map((p, i) => {
        const pct = Math.round((p.budgetUsed / p.budget) * 100);
        const over = p.budgetUsed > p.budget;
        return (
          <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }}
            className="bg-white border border-slate-100 rounded-[2rem] px-8 py-6"
          >
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div>
                <div className="font-black text-slate-900 uppercase italic tracking-tight">{p.name}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.client}</div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Wykonanie</div>
                  <div className={`font-black text-lg ${over ? 'text-rose-600' : 'text-slate-900'}`}>{p.budgetUsed.toLocaleString()} PLN</div>
                </div>
                <div className="text-slate-300">/</div>
                <div className="text-right">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Budzet</div>
                  <div className="font-black text-lg text-slate-500">{p.budget.toLocaleString()} PLN</div>
                </div>
                <div className={`text-2xl font-black italic ${over ? 'text-rose-600' : pct > 80 ? 'text-amber-500' : 'text-emerald-600'}`}>{pct}%</div>
              </div>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(pct, 100)}%` }} transition={{ duration: 0.8, delay: i * 0.1 }}
                className={`h-full rounded-full ${over ? 'bg-rose-500' : pct > 80 ? 'bg-amber-400' : 'bg-emerald-500'}`}
              />
            </div>
            {over && (
              <div className="mt-2 flex items-center gap-2 text-[10px] font-black text-rose-600 uppercase tracking-widest">
                <AlertCircle size={12} /> Przekroczenie budzetu o {(p.budgetUsed - p.budget).toLocaleString()} PLN
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

function ResourcesView() {
  const resources = [
    { name: 'Mariusz Czaja', role: 'Lead Dev', projects: ['RuFlo V3'], load: 85, initials: 'MC', color: 'bg-indigo-600' },
    { name: 'Tomasz Piotr', role: 'Kierownik Budowy', projects: ['Willa Magnolia'], load: 70, initials: 'TP', color: 'bg-amber-500' },
    { name: 'Maria Nowak', role: 'Marketing Manager', projects: ['Kampania Q2'], load: 95, initials: 'MN', color: 'bg-rose-500' },
    { name: 'Kasia Wrona', role: 'QA Engineer', projects: ['RuFlo V3', 'Audi A4'], load: 60, initials: 'KW', color: 'bg-emerald-500' },
    { name: 'Piotr Zaleski', role: 'Backend Dev', projects: ['RuFlo V3', 'Ogrody Zatoki'], load: 50, initials: 'PZ', color: 'bg-violet-500' },
  ];
  return (
    <div className="space-y-3">
      {resources.map((r, i) => (
        <motion.div key={r.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
          className="bg-white border border-slate-100 rounded-[2rem] px-8 py-6 flex items-center gap-6 hover:border-indigo-200 transition-all"
        >
          <div className={`w-12 h-12 rounded-[1.5rem] ${r.color} flex items-center justify-center text-white font-black`}>{r.initials}</div>
          <div className="flex-1">
            <div className="font-black text-slate-900 uppercase italic tracking-tight">{r.name}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{r.role}</div>
            <div className="flex gap-2 mt-2 flex-wrap">
              {r.projects.map(p => (
                <span key={p} className="bg-indigo-50 text-indigo-700 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full">{p}</span>
              ))}
            </div>
          </div>
          <div className="text-right w-40">
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Obciazenie</div>
            <div className={`text-xl font-black italic mb-1 ${r.load >= 90 ? 'text-rose-600' : r.load >= 75 ? 'text-amber-500' : 'text-emerald-600'}`}>{r.load}%</div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${r.load >= 90 ? 'bg-rose-500' : r.load >= 75 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                style={{ width: `${r.load}%` }}
              />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function PlaceholderView({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="h-[420px] flex flex-col items-center justify-center text-center space-y-6">
      <Icon size={64} className="text-slate-200" />
      <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">{title}</h3>
      <p className="text-xs font-black text-slate-400 uppercase tracking-widest max-w-sm leading-relaxed">{desc}</p>
    </div>
  );
}

export default function ProjectsModule() {
  const [activeTab, setActiveTab] = useState<Tab>('projekty');

  const stats = [
    { label: 'Aktywne', value: `${MOCK_PROJECTS.filter(p => p.status === 'active').length}`, unit: 'projektow', color: 'text-white' },
    { label: 'Opoznione', value: `${MOCK_PROJECTS.filter(p => p.status === 'overdue').length}`, unit: 'projektow', color: 'text-rose-400' },
    { label: 'Ukonczono', value: `${MOCK_PROJECTS.filter(p => p.status === 'completed').length}`, unit: 'projektow', color: 'text-emerald-400' },
  ];

  return (
    <div className="max-w-[1600px] mx-auto p-10 space-y-10 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-slate-900 rounded-[3rem] p-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative overflow-hidden shadow-2xl shadow-slate-200">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div>
          <div className="flex items-center gap-4 mb-3">
            <div className="bg-indigo-600 p-3 rounded-[1.5rem] shadow-lg shadow-indigo-900/40">
              <Briefcase className="text-white" size={22} />
            </div>
            <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">Projekty</h1>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">
            Zarzadzanie Projektami i Portfelem — C-ICAS OS V5
          </p>
        </div>
        <div className="flex gap-6 flex-wrap">
          {stats.map((s, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-[2rem] px-8 py-6 text-right backdrop-blur-sm">
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</div>
              <div className={`text-2xl font-black italic ${s.color}`}>
                {s.value} <span className="text-[10px] text-slate-500">{s.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 p-2 bg-slate-100 rounded-[2.5rem] w-fit">
        {TABS_CONFIG.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-4 rounded-[2rem] transition-all text-[10px] font-black uppercase tracking-widest ${
              activeTab === tab.id ? 'bg-white text-slate-900 shadow-xl scale-[1.02]' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
            }`}
          >
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
          {activeTab === 'projekty'    && <ProjectsListView />}
          {activeTab === 'kanban'      && <PlaceholderView icon={LayoutGrid} title="Tablica Kanban" desc="Wizualizacja zadan wszystkich projektow na jednej tablicy drag-and-drop." />}
          {activeTab === 'zasoby'      && <ResourcesView />}
          {activeTab === 'budzety'     && <BudgetView />}
          {activeTab === 'harmonogram' && <GanttView />}
          {activeTab === 'raporty'     && <PlaceholderView icon={BarChart3} title="Raporty Portfela" desc="Zestawienia zaawansowania, rentownosci i alokacji zasobow dla wszystkich projektow." />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
