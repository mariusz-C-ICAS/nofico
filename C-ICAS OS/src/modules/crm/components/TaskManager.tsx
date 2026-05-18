import React, { useState, useEffect } from 'react';
import {
  CheckCircle2, Clock, Plus, RefreshCw, Trash2, AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { subscribeAllTasks, addTask, completeTask, deleteTask } from '../services/crmService';
import type { CrmTask, TaskType, TaskPriority } from '../types';
import { TASK_TYPE_META } from '../types';

interface Props { tenantId: string }

const PRIORITIES: { id: TaskPriority; label: string; color: string }[] = [
  { id: 'high',   label: 'Wysoki',  color: 'bg-red-100 text-red-700' },
  { id: 'medium', label: 'Średni',  color: 'bg-amber-100 text-amber-700' },
  { id: 'low',    label: 'Niski',   color: 'bg-slate-100 text-slate-500' },
];

export default function TaskManager({ tenantId }: Props) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [completing, setCompleting] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    title: '', type: 'follow_up' as TaskType, priority: 'medium' as TaskPriority,
    customerId: '', customerName: '', dueDate: '', note: '',
  });

  useEffect(() => {
    return subscribeAllTasks(tenantId, tasks => { setTasks(tasks); setLoading(false); });
  }, [tenantId]);

  const upd = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleAdd = async () => {
    if (!form.title || !form.dueDate || !user) return;
    await addTask(tenantId, {
      tenantId, title: form.title, type: form.type, priority: form.priority,
      customerId: form.customerId || '_unassigned',
      customerName: form.customerName || 'Ogólne',
      dueDate: new Date(form.dueDate),
      assignedTo: user.uid, assignedToEmail: user.email ?? '',
      note: form.note || undefined,
    });
    setForm({ title: '', type: 'follow_up', priority: 'medium', customerId: '', customerName: '', dueDate: '', note: '' });
    setShowForm(false);
  };

  const handleComplete = async (taskId: string) => {
    setCompleting(taskId);
    await completeTask(tenantId, taskId);
    setCompleting(null);
  };

  const now = new Date();
  const overdue = tasks.filter(t => { const d = t.dueDate?.toDate ? t.dueDate.toDate() : new Date(t.dueDate); return d < now; });
  const today   = tasks.filter(t => { const d = t.dueDate?.toDate ? t.dueDate.toDate() : new Date(t.dueDate); return d >= now && d.toDateString() === now.toDateString(); });
  const upcoming = tasks.filter(t => { const d = t.dueDate?.toDate ? t.dueDate.toDate() : new Date(t.dueDate); return d > now && d.toDateString() !== now.toDateString(); });

  const fmtDate = (ts: any) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const TaskRow = ({ task }: { task: CrmTask }) => {
    const tm = TASK_TYPE_META[task.type];
    const isOverdue = (() => { const d = task.dueDate?.toDate ? task.dueDate.toDate() : new Date(task.dueDate); return d < now; })();
    const pri = PRIORITIES.find(p => p.id === task.priority)!;
    return (
      <div className={`flex items-start gap-3 p-4 rounded-2xl border transition-all ${isOverdue ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
        <button onClick={() => handleComplete(task.id)} disabled={completing === task.id}
          className="w-5 h-5 rounded-full border-2 border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 flex-shrink-0 mt-0.5 transition-all flex items-center justify-center">
          {completing === task.id ? <RefreshCw size={10} className="animate-spin text-emerald-500" /> : null}
        </button>
        <span className="text-base flex-shrink-0">{tm.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black text-slate-800">{task.title}</p>
          <p className="text-[10px] text-slate-500">{task.customerName}</p>
          <p className={`text-[9px] flex items-center gap-1 mt-0.5 ${isOverdue ? 'text-red-600 font-bold' : 'text-slate-400'}`}>
            <Clock size={9} /> {fmtDate(task.dueDate)} {isOverdue ? '· PRZETERMINOWANE' : ''}
          </p>
        </div>
        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${pri.color}`}>{pri.label}</span>
        <button onClick={() => deleteTask(tenantId, task.id)}
          className="p-1 text-slate-300 hover:text-red-500 transition-colors">
          <Trash2 size={12} />
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Zadania & Follow-upy</h3>
          <p className="text-xs text-slate-500 mt-0.5">{tasks.length} otwartych · {overdue.length} przeterminowanych</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black px-5 py-2.5 rounded-2xl text-xs uppercase tracking-widest">
          <Plus size={13} /> Nowe zadanie
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <input value={form.title} onChange={e => upd('title', e.target.value)}
                placeholder="Tytuł zadania *"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <select value={form.type} onChange={e => upd('type', e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                {Object.entries(TASK_TYPE_META).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <select value={form.priority} onChange={e => upd('priority', e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <input value={form.customerName} onChange={e => upd('customerName', e.target.value)}
                placeholder="Klient (opcjonalnie)"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
            </div>
            <div>
              <input type="datetime-local" value={form.dueDate} onChange={e => upd('dueDate', e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
            </div>
            <div className="col-span-2">
              <textarea value={form.note} onChange={e => upd('note', e.target.value)} rows={2}
                placeholder="Notatka..."
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none resize-none" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="text-xs font-bold text-slate-400 hover:text-slate-600 px-3 py-1.5">Anuluj</button>
            <button onClick={handleAdd} disabled={!form.title || !form.dueDate}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-black text-xs px-5 py-1.5 rounded-xl">
              Zapisz
            </button>
          </div>
        </div>
      )}

      {loading && <div className="flex justify-center py-10"><RefreshCw size={20} className="animate-spin text-indigo-400" /></div>}

      {overdue.length > 0 && (
        <div>
          <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <AlertTriangle size={10} /> Przeterminowane ({overdue.length})
          </p>
          <div className="space-y-2">{overdue.map(t => <TaskRow key={t.id} task={t} />)}</div>
        </div>
      )}
      {today.length > 0 && (
        <div>
          <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-2">Dziś ({today.length})</p>
          <div className="space-y-2">{today.map(t => <TaskRow key={t.id} task={t} />)}</div>
        </div>
      )}
      {upcoming.length > 0 && (
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Nadchodzące ({upcoming.length})</p>
          <div className="space-y-2">{upcoming.map(t => <TaskRow key={t.id} task={t} />)}</div>
        </div>
      )}
      {!loading && tasks.length === 0 && (
        <div className="text-center py-10 text-slate-400 text-xs">Brak otwartych zadań.</div>
      )}
    </div>
  );
}
