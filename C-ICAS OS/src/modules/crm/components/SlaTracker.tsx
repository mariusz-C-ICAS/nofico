import React, { useState, useEffect } from 'react';
import {
  Shield, Plus, RefreshCw, Clock, AlertTriangle, CheckCircle2,
  XCircle, X, Save, Edit2, Trash2
} from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import {
  collection, query, where, getDocs, addDoc, updateDoc,
  deleteDoc, doc, serverTimestamp
} from 'firebase/firestore';

interface Props { tenantId: string }

interface SlaTicket {
  id: string;
  customerName: string;
  title: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'resolved' | 'breached';
  openedAt: string;
  resolvedAt?: string;
  slaDeadline: string;
  responseTime?: number;
  assignee?: string;
  notes?: string;
  createdAt?: any;
}

const PRIORITY_SLA: Record<string, number> = {
  critical: 4, high: 8, medium: 24, low: 72,
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'text-red-700 bg-red-100',
  high: 'text-orange-700 bg-orange-100',
  medium: 'text-amber-700 bg-amber-100',
  low: 'text-slate-600 bg-slate-100',
};

const STATUS_COLORS: Record<string, string> = {
  open: 'text-blue-700 bg-blue-100',
  in_progress: 'text-indigo-700 bg-indigo-100',
  resolved: 'text-emerald-700 bg-emerald-100',
  breached: 'text-red-700 bg-red-100',
};

function addHours(isoDate: string, hours: number): string {
  return new Date(new Date(isoDate).getTime() + hours * 3600000).toISOString().slice(0, 16);
}

function hoursLeft(deadline: string): number {
  return (new Date(deadline).getTime() - Date.now()) / 3600000;
}

function formatHours(h: number): string {
  if (h < 0) return `${Math.abs(Math.round(h))}h po terminie`;
  if (h < 1) return `${Math.round(h * 60)}min`;
  return `${Math.round(h)}h`;
}

const emptyForm = () => ({
  customerName: '', title: '', priority: 'high' as SlaTicket['priority'],
  status: 'open' as SlaTicket['status'], openedAt: new Date().toISOString().slice(0, 16),
  resolvedAt: '', slaDeadline: addHours(new Date().toISOString(), 8),
  assignee: '', notes: '',
});

export default function SlaTracker({ tenantId }: Props) {
  const [tickets, setTickets] = useState<SlaTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'breached' | 'resolved'>('open');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<SlaTicket | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const snap = await getDocs(query(
      collection(db, `tenants/${tenantId}/slaTickets`),
      where('tenantId', '==', tenantId)
    ));
    setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() } as SlaTicket)));
    setLoading(false);
  };

  useEffect(() => { load(); }, [tenantId]);

  const upd = (k: keyof ReturnType<typeof emptyForm>, v: any) => {
    setForm(p => {
      const next = { ...p, [k]: v };
      if (k === 'priority' || k === 'openedAt') {
        next.slaDeadline = addHours(next.openedAt || new Date().toISOString(), PRIORITY_SLA[next.priority] ?? 8);
      }
      return next;
    });
  };

  const openCreate = () => { setForm(emptyForm()); setEditing(null); setCreating(true); };
  const openEdit = (t: SlaTicket) => {
    setForm({
      customerName: t.customerName, title: t.title, priority: t.priority, status: t.status,
      openedAt: t.openedAt, resolvedAt: t.resolvedAt ?? '', slaDeadline: t.slaDeadline,
      assignee: t.assignee ?? '', notes: t.notes ?? '',
    });
    setEditing(t); setCreating(false);
  };
  const closeForm = () => { setCreating(false); setEditing(null); };

  const handleSave = async () => {
    if (!form.customerName.trim() || !form.title.trim()) return;
    setSaving(true);
    const payload = {
      tenantId,
      customerName: form.customerName.trim(),
      title: form.title.trim(),
      priority: form.priority,
      status: form.status,
      openedAt: form.openedAt,
      resolvedAt: form.resolvedAt || null,
      slaDeadline: form.slaDeadline,
      assignee: form.assignee.trim() || null,
      notes: form.notes.trim() || null,
      updatedAt: serverTimestamp(),
    };
    try {
      if (editing) {
        await updateDoc(doc(db, `tenants/${tenantId}/slaTickets`, editing.id), payload);
      } else {
        await addDoc(collection(db, `tenants/${tenantId}/slaTickets`), { ...payload, createdAt: serverTimestamp() });
      }
      closeForm();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleResolve = async (t: SlaTicket) => {
    const resolvedAt = new Date().toISOString().slice(0, 16);
    const hrs = hoursLeft(t.slaDeadline);
    const status = hrs >= 0 ? 'resolved' : 'breached';
    await updateDoc(doc(db, `tenants/${tenantId}/slaTickets`, t.id), {
      status, resolvedAt, updatedAt: serverTimestamp(),
    });
    setTickets(p => p.map(x => x.id === t.id ? { ...x, status, resolvedAt } : x));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Usunąć zgłoszenie?')) return;
    await deleteDoc(doc(db, `tenants/${tenantId}/slaTickets`, id));
    setTickets(p => p.filter(x => x.id !== id));
  };

  const now = new Date();
  const withMeta = tickets.map(t => ({
    ...t,
    hrs: hoursLeft(t.slaDeadline),
    isBreached: t.status !== 'resolved' && new Date(t.slaDeadline) < now,
  }));

  const filtered = withMeta.filter(t => {
    if (filter === 'open') return t.status === 'open' || t.status === 'in_progress';
    if (filter === 'breached') return t.isBreached || t.status === 'breached';
    if (filter === 'resolved') return t.status === 'resolved';
    return true;
  }).sort((a, b) => a.hrs - b.hrs);

  const openCount = withMeta.filter(t => t.status === 'open' || t.status === 'in_progress').length;
  const breachedCount = withMeta.filter(t => t.isBreached || t.status === 'breached').length;
  const resolvedCount = withMeta.filter(t => t.status === 'resolved').length;
  const avgResolutionHrs = (() => {
    const resolved = withMeta.filter(t => t.resolvedAt && t.openedAt);
    if (!resolved.length) return null;
    const avg = resolved.reduce((s, t) => s + (new Date(t.resolvedAt!).getTime() - new Date(t.openedAt).getTime()) / 3600000, 0) / resolved.length;
    return Math.round(avg);
  })();

  const FormPanel = () => (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-black text-slate-900 uppercase tracking-tighter">
          {editing ? 'Edytuj zgłoszenie' : 'Nowe zgłoszenie SLA'}
        </h4>
        <button onClick={closeForm} className="p-1 hover:bg-slate-100 rounded-lg"><X size={14} /></button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Klient *</label>
          <input value={form.customerName} onChange={e => upd('customerName', e.target.value)}
            className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
        <div className="col-span-2">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tytuł problemu *</label>
          <input value={form.title} onChange={e => upd('title', e.target.value)}
            className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Priorytet</label>
          <select value={form.priority} onChange={e => upd('priority', e.target.value as any)}
            className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
            <option value="critical">Krytyczny (4h)</option>
            <option value="high">Wysoki (8h)</option>
            <option value="medium">Średni (24h)</option>
            <option value="low">Niski (72h)</option>
          </select>
        </div>
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</label>
          <select value={form.status} onChange={e => upd('status', e.target.value as any)}
            className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
            <option value="open">Otwarte</option>
            <option value="in_progress">W trakcie</option>
            <option value="resolved">Rozwiązane</option>
            <option value="breached">Naruszone SLA</option>
          </select>
        </div>
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Zgłoszone</label>
          <input type="datetime-local" value={form.openedAt} onChange={e => upd('openedAt', e.target.value)}
            className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
        </div>
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Deadline SLA</label>
          <input type="datetime-local" value={form.slaDeadline} onChange={e => upd('slaDeadline', e.target.value)}
            className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
        </div>
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Przypisany</label>
          <input value={form.assignee} onChange={e => upd('assignee', e.target.value)}
            placeholder="Imię i nazwisko"
            className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
        </div>
        <div className="col-span-2">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Notatki</label>
          <textarea value={form.notes} onChange={e => upd('notes', e.target.value)} rows={2}
            className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none resize-none" />
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={closeForm} className="flex-1 border border-slate-200 text-slate-500 font-black text-xs py-3 rounded-xl">Anuluj</button>
        <button onClick={handleSave} disabled={!form.customerName.trim() || !form.title.trim() || saving}
          className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-black text-xs py-3 rounded-xl">
          {saving ? <RefreshCw size={11} className="animate-spin" /> : <Save size={11} />} Zapisz
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">SLA Tracker</h3>
          <p className="text-xs text-slate-500 mt-0.5">{tickets.length} zgłoszeń łącznie</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-slate-900 hover:bg-indigo-600 text-white font-black text-xs px-6 py-3 rounded-2xl transition-all">
          <Plus size={14} /> Nowe zgłoszenie
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Otwarte', value: openCount, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: Clock },
          { label: 'Naruszone SLA', value: breachedCount, color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: AlertTriangle },
          { label: 'Rozwiązane', value: resolvedCount, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
          { label: 'Śr. czas resol.', value: avgResolutionHrs !== null ? `${avgResolutionHrs}h` : '—', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200', icon: Shield },
        ].map(k => (
          <div key={k.label} className={`rounded-2xl border p-5 ${k.bg}`}>
            <k.icon size={16} className={`${k.color} mb-2`} />
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{k.label}</p>
            <p className={`text-2xl font-black mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {breachedCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle size={14} className="text-red-600 flex-shrink-0" />
          <p className="text-xs font-black text-red-700">{breachedCount} zgłoszenie naruszyło SLA — wymaga eskalacji</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {([
          { id: 'open', label: 'Otwarte' },
          { id: 'breached', label: 'Naruszone' },
          { id: 'resolved', label: 'Zamknięte' },
          { id: 'all', label: 'Wszystkie' },
        ] as const).map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === f.id ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Form */}
      {(creating || editing) && <FormPanel />}

      {/* Ticket list */}
      {loading ? (
        <div className="flex justify-center py-16"><RefreshCw size={20} className="animate-spin text-indigo-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">Brak zgłoszeń SLA</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(t => {
            const isBreached = t.isBreached;
            const borderColor = isBreached ? 'border-red-300 bg-red-50' : t.hrs < 4 && t.status !== 'resolved' ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white';
            return (
              <div key={t.id} className={`rounded-2xl border p-4 ${borderColor}`}>
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-black text-slate-900">{t.customerName}</span>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${PRIORITY_COLORS[t.priority]}`}>{t.priority.toUpperCase()}</span>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${STATUS_COLORS[t.status]}`}>{t.status.replace('_', ' ')}</span>
                    </div>
                    <p className="text-xs text-slate-700 mb-1">{t.title}</p>
                    <div className="flex flex-wrap gap-3 text-[9px] text-slate-500">
                      <span className="flex items-center gap-1"><Clock size={9} />
                        {t.status === 'resolved' ? `Rozwiązano: ${t.resolvedAt?.slice(0, 16).replace('T', ' ')}` : `Deadline: ${t.slaDeadline.slice(0, 16).replace('T', ' ')}`}
                      </span>
                      {t.status !== 'resolved' && (
                        <span className={`font-black ${t.hrs < 0 ? 'text-red-600' : t.hrs < 4 ? 'text-amber-600' : 'text-slate-600'}`}>
                          {formatHours(t.hrs)}
                        </span>
                      )}
                      {t.assignee && <span>Przypisany: {t.assignee}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {(t.status === 'open' || t.status === 'in_progress') && (
                      <button onClick={() => handleResolve(t)}
                        className="flex items-center gap-1 text-[9px] font-black text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg">
                        <CheckCircle2 size={10} /> Zamknij
                      </button>
                    )}
                    <button onClick={() => openEdit(t)}
                      className="flex items-center gap-1 text-[9px] font-black text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg">
                      <Edit2 size={10} /> Edytuj
                    </button>
                    <button onClick={() => handleDelete(t.id)}
                      className="flex items-center gap-1 text-[9px] font-black text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg">
                      <Trash2 size={10} /> Usuń
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
