/**
 * Data: 2026-05-16
 * Zmiany: Inicjalizacja Panelu Biura Rachunkowego — multi-client dashboard + task board.
 * Sciezka: /src/modules/finance/bureau/BureauModule.tsx
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2, Users, FileWarning, Send, ClipboardList,
  Plus, X, ChevronRight, Clock, Calendar, AlertTriangle,
  CheckCircle2, Loader2, ArrowRight, Briefcase, MoreHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  collection, onSnapshot, doc, updateDoc, addDoc,
  query, orderBy, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import useTenant from '../../../shared/hooks/useTenant';

// ─── Types ───────────────────────────────────────────────────────────────────

type TaxForm = 'JDG_Scale' | 'JDG_Linear' | 'JDG_Lump' | 'LLC';
type ClientStatus = 'active' | 'inactive' | 'overdue';
type TaskType = 'bookkeeping' | 'jpk' | 'document_missing' | 'tax_deadline';
type TaskPriority = 'high' | 'medium' | 'low';
type TaskStatus = 'todo' | 'in_progress' | 'done';
type FilterType = 'all' | 'urgent' | 'jpk';

interface BureauClient {
  id: string;
  clientName: string;
  nip: string;
  taxForm: TaxForm;
  unprocessedDocs: number;
  pendingJpk: boolean;
  jpkDueDate: string;
  lastActivity: Timestamp | null;
  status: ClientStatus;
  assignedTo?: string;
}

interface BureauTask {
  id: string;
  title: string;
  clientId: string;
  clientName: string;
  type: TaskType;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignedTo?: string;
  createdAt?: unknown;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TAX_FORM_LABELS: Record<TaxForm, string> = {
  JDG_Scale: 'JDG Skala',
  JDG_Linear: 'JDG Liniowy',
  JDG_Lump: 'JDG Ryczalt',
  LLC: 'Sp. z o.o.',
};

const CLIENT_STATUS_STYLES: Record<ClientStatus, string> = {
  active: 'bg-emerald-50 text-emerald-600',
  inactive: 'bg-slate-100 text-slate-500',
  overdue: 'bg-rose-50 text-rose-600',
};

const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  active: 'Aktywny',
  inactive: 'Nieaktywny',
  overdue: 'Zalegly',
};

const TASK_TYPE_LABELS: Record<TaskType, string> = {
  bookkeeping: 'Ksiegowanie',
  jpk: 'JPK',
  document_missing: 'Brak dok.',
  tax_deadline: 'Termin podatk.',
};

const TASK_PRIORITY_STYLES: Record<TaskPriority, string> = {
  high: 'bg-rose-50 text-rose-600',
  medium: 'bg-amber-50 text-amber-600',
  low: 'bg-slate-100 text-slate-500',
};

const TASK_STATUS_COLS: { id: TaskStatus; label: string }[] = [
  { id: 'todo', label: 'Todo' },
  { id: 'in_progress', label: 'W toku' },
  { id: 'done', label: 'Gotowe' },
];

// ─── Add Task Modal ───────────────────────────────────────────────────────────

interface AddTaskModalProps {
  clients: BureauClient[];
  onClose: () => void;
  onSave: (task: Omit<BureauTask, 'id'>) => Promise<void>;
}

function AddTaskModal({ clients, onClose, onSave }: AddTaskModalProps) {
  const [title, setTitle] = useState('');
  const [clientId, setClientId] = useState('');
  const [type, setType] = useState<TaskType>('bookkeeping');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [saving, setSaving] = useState(false);

  const selectedClient = clients.find(c => c.id === clientId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;
    setSaving(true);
    await onSave({
      title: title.trim(),
      clientId,
      clientName: selectedClient?.clientName ?? '',
      type,
      dueDate,
      priority,
      status: 'todo',
    });
    onClose();
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-[2.5rem] p-10 w-full max-w-lg shadow-2xl border border-slate-100"
      >
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-black uppercase tracking-widest italic text-slate-900">
            Nowe Zadanie
          </h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
            <X size={18} className="text-slate-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Tytul zadania
            </label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              placeholder="np. Zaksiegowac faktury za kwiecien"
              className="w-full border border-slate-200 rounded-xl px-5 py-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Klient
            </label>
            <select
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-5 py-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
            >
              <option value="">Biuro (globalne)</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.clientName}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                Typ
              </label>
              <select
                value={type}
                onChange={e => setType(e.target.value as TaskType)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              >
                {(Object.keys(TASK_TYPE_LABELS) as TaskType[]).map(t => (
                  <option key={t} value={t}>{TASK_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                Priorytet
              </label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as TaskPriority)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              >
                <option value="high">Wysoki</option>
                <option value="medium">Sredni</option>
                <option value="low">Niski</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Termin
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              required
              className="w-full border border-slate-200 rounded-xl px-5 py-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-colors"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-4 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Dodaj zadanie
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: BureauTask;
  onStatusChange: (id: string, status: TaskStatus) => void;
}

function TaskCard({ task, onStatusChange }: TaskCardProps) {
  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = task.dueDate < today && task.status !== 'done';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="bg-white rounded-[1.5rem] p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-xs font-black text-slate-800 leading-snug">{task.title}</p>
        <span className={`shrink-0 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${TASK_PRIORITY_STYLES[task.priority]}`}>
          {task.priority === 'high' ? 'Wysoki' : task.priority === 'medium' ? 'Sredni' : 'Niski'}
        </span>
      </div>
      {task.clientName && (
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
          <Building2 size={10} /> {task.clientName}
        </p>
      )}
      <div className="flex items-center justify-between mt-3">
        <span className={`text-[10px] font-bold flex items-center gap-1 ${isOverdue ? 'text-rose-500' : 'text-slate-400'}`}>
          <Calendar size={10} />
          {task.dueDate}
          {isOverdue && <AlertTriangle size={10} />}
        </span>
        <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-slate-100 text-slate-500">
          {TASK_TYPE_LABELS[task.type]}
        </span>
      </div>
      {/* Status change buttons */}
      <div className="flex gap-2 mt-4 pt-3 border-t border-slate-50">
        {TASK_STATUS_COLS.filter(col => col.id !== task.status).map(col => (
          <button
            key={col.id}
            onClick={() => onStatusChange(task.id, col.id)}
            className="flex-1 text-[10px] font-black uppercase tracking-widest py-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
          >
            <ArrowRight size={10} className="inline mr-1" />
            {col.label}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Client Card ──────────────────────────────────────────────────────────────

interface ClientCardProps {
  client: BureauClient;
}

function ClientCard({ client }: ClientCardProps) {
  const today = new Date().toISOString().slice(0, 10);
  const jpkSoon = client.jpkDueDate && client.jpkDueDate <= new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  function formatLastActivity(ts: Timestamp | null): string {
    if (!ts) return 'brak danych';
    const d = ts.toDate();
    return d.toLocaleDateString('pl-PL');
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col gap-4"
    >
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-sm font-black uppercase tracking-widest italic text-slate-900 leading-tight">
            {client.clientName}
          </h4>
          <p className="text-[10px] font-bold text-slate-400 mt-1">NIP: {client.nip}</p>
        </div>
        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl ${CLIENT_STATUS_STYLES[client.status]}`}>
          {CLIENT_STATUS_LABELS[client.status]}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500">
          {TAX_FORM_LABELS[client.taxForm]}
        </span>
        {client.unprocessedDocs > 0 && (
          <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl bg-amber-50 text-amber-600 flex items-center gap-1">
            <FileWarning size={10} />
            {client.unprocessedDocs} dok.
          </span>
        )}
        {client.pendingJpk && (
          <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl flex items-center gap-1 ${jpkSoon ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
            <Send size={10} />
            JPK {client.jpkDueDate}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        <Clock size={10} />
        Ostatnia aktywnosc: {formatLastActivity(client.lastActivity)}
      </div>

      <button
        onClick={() => alert('Switching to client workspace...')}
        className="w-full mt-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest py-4 rounded-2xl hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2"
      >
        Otworz Workspace <ChevronRight size={14} />
      </button>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BureauModule() {
  const { activeTenantId } = useTenant();

  const [clients, setClients] = useState<BureauClient[]>([]);
  const [tasks, setTasks] = useState<BureauTask[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [showAddTask, setShowAddTask] = useState(false);

  // ── Firestore: Clients ──
  useEffect(() => {
    if (!activeTenantId) return;
    const ref = collection(db, `tenants/${activeTenantId}/bureauClients`);
    const unsubscribe = onSnapshot(ref, snap => {
      setClients(snap.docs.map(d => ({ id: d.id, ...d.data() } as BureauClient)));
      setLoadingClients(false);
    });
    return unsubscribe;
  }, [activeTenantId]);

  // ── Firestore: Tasks ──
  useEffect(() => {
    if (!activeTenantId) return;
    const ref = query(
      collection(db, `tenants/${activeTenantId}/bureauTasks`),
      orderBy('dueDate', 'asc')
    );
    const unsubscribe = onSnapshot(ref, snap => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as BureauTask)));
      setLoadingTasks(false);
    });
    return unsubscribe;
  }, [activeTenantId]);

  // ── Computed stats ──
  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    return {
      activeClients: clients.filter(c => c.status === 'active').length,
      totalUnprocessed: clients.reduce((acc, c) => acc + (c.unprocessedDocs || 0), 0),
      jpkThisWeek: clients.filter(c => c.pendingJpk && c.jpkDueDate >= today && c.jpkDueDate <= nextWeek).length,
      overdueTasks: tasks.filter(t => t.dueDate < today && t.status !== 'done').length,
    };
  }, [clients, tasks]);

  // ── Filtered clients ──
  const filteredClients = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    if (filter === 'urgent') return clients.filter(c => c.unprocessedDocs > 0 || c.status === 'overdue');
    if (filter === 'jpk') return clients.filter(c => c.pendingJpk && c.jpkDueDate >= today && c.jpkDueDate <= nextWeek);
    return clients;
  }, [clients, filter]);

  // ── Task CRUD ──
  async function handleStatusChange(id: string, status: TaskStatus) {
    if (!activeTenantId) return;
    await updateDoc(doc(db, `tenants/${activeTenantId}/bureauTasks`, id), { status });
  }

  async function handleAddTask(task: Omit<BureauTask, 'id'>) {
    if (!activeTenantId) return;
    await addDoc(collection(db, `tenants/${activeTenantId}/bureauTasks`), {
      ...task,
      createdAt: serverTimestamp(),
    });
  }

  // ── Tasks by column ──
  const tasksByStatus = useMemo(() => {
    const map: Record<TaskStatus, BureauTask[]> = { todo: [], in_progress: [], done: [] };
    tasks.forEach(t => { map[t.status]?.push(t); });
    return map;
  }, [tasks]);

  return (
    <div className="flex flex-col gap-10">

      {/* Header stats */}
      <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl border border-slate-800">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6 bg-slate-800/80 w-fit px-5 py-2 rounded-full border border-slate-700">
            <Building2 className="text-indigo-400" size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-100">
              Bureau Multi-Client Dashboard
            </span>
          </div>
          <h2 className="text-4xl font-black uppercase tracking-tighter italic mb-8">
            Panel Biura <span className="text-indigo-500">Rachunkowego</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Aktywni klienci', value: stats.activeClients, icon: Users, accent: 'text-emerald-400' },
              { label: 'Niezaksieg. dok.', value: stats.totalUnprocessed, icon: FileWarning, accent: 'text-amber-400' },
              { label: 'JPK ten tydzien', value: stats.jpkThisWeek, icon: Send, accent: 'text-rose-400' },
              { label: 'Zadania zaglegle', value: stats.overdueTasks, icon: AlertTriangle, accent: 'text-orange-400' },
            ].map(stat => (
              <div key={stat.label} className="bg-slate-800/60 rounded-[2rem] p-6 border border-slate-700/50">
                <stat.icon size={20} className={`${stat.accent} mb-3`} />
                <p className="text-3xl font-black">{stat.value}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Client list section */}
      <div>
        {/* Filter bar */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-2">Filtr:</p>
          {([
            { id: 'all', label: 'Wszyscy' },
            { id: 'urgent', label: 'Pilne (niezaksieg.)' },
            { id: 'jpk', label: 'JPK do wyslania' },
          ] as { id: FilterType; label: string }[]).map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`text-[10px] font-black uppercase tracking-widest px-5 py-3 rounded-xl transition-colors ${
                filter === f.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-100 text-slate-400 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Client grid */}
        {loadingClients ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-indigo-400" />
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
            <Briefcase size={40} className="text-slate-200" />
            <p className="text-xs font-black uppercase tracking-widest">Brak klientow dla wybranego filtra</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredClients.map(client => (
                <ClientCard key={client.id} client={client} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Task Board */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <ClipboardList size={20} className="text-indigo-400" />
            <h3 className="text-xl font-black uppercase tracking-widest italic text-slate-900">
              Zadania Biura
            </h3>
          </div>
          <button
            onClick={() => setShowAddTask(true)}
            className="bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <Plus size={14} /> Nowe zadanie
          </button>
        </div>

        {loadingTasks ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-indigo-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TASK_STATUS_COLS.map(col => (
              <div key={col.id} className="bg-slate-50 rounded-[2.5rem] p-6 border border-slate-100 min-h-[300px]">
                <div className="flex items-center justify-between mb-5">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    {col.label}
                  </h4>
                  <span className="text-[10px] font-black bg-slate-200 text-slate-600 px-2.5 py-1 rounded-full">
                    {tasksByStatus[col.id].length}
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  <AnimatePresence mode="popLayout">
                    {tasksByStatus[col.id].map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onStatusChange={handleStatusChange}
                      />
                    ))}
                  </AnimatePresence>
                  {tasksByStatus[col.id].length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-300">
                      <CheckCircle2 size={24} className="mb-2" />
                      <p className="text-[10px] font-bold uppercase tracking-widest">Brak zadan</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Task Modal */}
      <AnimatePresence>
        {showAddTask && (
          <AddTaskModal
            clients={clients}
            onClose={() => setShowAddTask(false)}
            onSave={handleAddTask}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
