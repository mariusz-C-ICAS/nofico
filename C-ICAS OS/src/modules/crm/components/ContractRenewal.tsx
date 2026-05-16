import React, { useState, useEffect } from 'react';
import {
  FileSignature, Plus, RefreshCw, AlertTriangle, CheckCircle2,
  Clock, Calendar, Edit2, Trash2, Bell, X, Save
} from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import {
  collection, query, where, getDocs, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp
} from 'firebase/firestore';

interface Props { tenantId: string }

interface Contract {
  id: string;
  customerId?: string;
  customerName: string;
  title: string;
  value: number;
  currency: string;
  startDate: string;
  endDate: string;
  autoRenewal: boolean;
  renewalNoticeDays: number;
  status: 'active' | 'expired' | 'cancelled' | 'renewed';
  notes?: string;
  createdAt?: any;
}

const CURRENCIES = ['PLN', 'EUR', 'USD'];

function daysUntil(dateStr: string): number {
  const end = new Date(dateStr);
  const now = new Date();
  return Math.round((end.getTime() - now.getTime()) / 86400000);
}

function urgencyColor(days: number, status: string): string {
  if (status === 'expired') return 'border-red-300 bg-red-50';
  if (status === 'cancelled') return 'border-slate-200 bg-slate-50 opacity-60';
  if (status === 'renewed') return 'border-emerald-200 bg-emerald-50';
  if (days < 0) return 'border-red-300 bg-red-50';
  if (days <= 30) return 'border-amber-300 bg-amber-50';
  if (days <= 90) return 'border-yellow-200 bg-yellow-50';
  return 'border-slate-200 bg-white';
}

function urgencyBadge(days: number, status: string): { label: string; color: string } {
  if (status === 'expired') return { label: 'Wygasł', color: 'text-red-700 bg-red-100' };
  if (status === 'cancelled') return { label: 'Anulowany', color: 'text-slate-500 bg-slate-100' };
  if (status === 'renewed') return { label: 'Odnowiony', color: 'text-emerald-700 bg-emerald-100' };
  if (days < 0) return { label: `Wygasł ${Math.abs(days)}d temu`, color: 'text-red-700 bg-red-100' };
  if (days === 0) return { label: 'Wygasa dziś!', color: 'text-red-700 bg-red-100' };
  if (days <= 30) return { label: `${days}d do wygaśnięcia`, color: 'text-amber-700 bg-amber-100' };
  if (days <= 90) return { label: `${days}d do wygaśnięcia`, color: 'text-yellow-700 bg-yellow-100' };
  return { label: `${days}d do wygaśnięcia`, color: 'text-slate-500 bg-slate-100' };
}

const emptyForm = () => ({
  customerName: '', title: '', value: '', currency: 'PLN',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  autoRenewal: false, renewalNoticeDays: 30,
  status: 'active' as Contract['status'], notes: '',
});

export default function ContractRenewal({ tenantId }: Props) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'urgent' | 'active' | 'expired'>('urgent');
  const [form, setForm] = useState(emptyForm());
  const [editing, setEditing] = useState<Contract | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const snap = await getDocs(query(
      collection(db, `tenants/${tenantId}/contracts`),
      where('tenantId', '==', tenantId)
    ));
    setContracts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Contract)));
    setLoading(false);
  };

  useEffect(() => { load(); }, [tenantId]);

  const upd = (k: keyof ReturnType<typeof emptyForm>, v: any) => setForm(p => ({ ...p, [k]: v }));

  const openCreate = () => { setForm(emptyForm()); setEditing(null); setCreating(true); };
  const openEdit = (c: Contract) => {
    setForm({
      customerName: c.customerName, title: c.title, value: String(c.value),
      currency: c.currency, startDate: c.startDate, endDate: c.endDate,
      autoRenewal: c.autoRenewal, renewalNoticeDays: c.renewalNoticeDays,
      status: c.status, notes: c.notes ?? '',
    });
    setEditing(c); setCreating(false);
  };
  const closeForm = () => { setCreating(false); setEditing(null); };

  const handleSave = async () => {
    if (!form.customerName.trim() || !form.endDate) return;
    setSaving(true);
    const payload = {
      tenantId,
      customerName: form.customerName.trim(),
      title: form.title.trim(),
      value: parseFloat(form.value) || 0,
      currency: form.currency,
      startDate: form.startDate,
      endDate: form.endDate,
      autoRenewal: form.autoRenewal,
      renewalNoticeDays: Number(form.renewalNoticeDays),
      status: form.status,
      notes: form.notes.trim(),
      updatedAt: serverTimestamp(),
    };
    try {
      if (editing) {
        await updateDoc(doc(db, `tenants/${tenantId}/contracts`, editing.id), payload);
      } else {
        await addDoc(collection(db, `tenants/${tenantId}/contracts`), { ...payload, createdAt: serverTimestamp() });
      }
      closeForm();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Usunąć kontrakt?')) return;
    await deleteDoc(doc(db, `tenants/${tenantId}/contracts`, id));
    setContracts(p => p.filter(x => x.id !== id));
  };

  const handleRenew = async (c: Contract) => {
    const newStart = c.endDate;
    const diff = new Date(c.endDate).getTime() - new Date(c.startDate).getTime();
    const newEnd = new Date(new Date(c.endDate).getTime() + diff).toISOString().slice(0, 10);
    setSaving(true);
    await updateDoc(doc(db, `tenants/${tenantId}/contracts`, c.id), { status: 'renewed', updatedAt: serverTimestamp() });
    await addDoc(collection(db, `tenants/${tenantId}/contracts`), {
      tenantId, customerName: c.customerName, title: c.title + ' (odnowiony)',
      value: c.value, currency: c.currency, startDate: newStart, endDate: newEnd,
      autoRenewal: c.autoRenewal, renewalNoticeDays: c.renewalNoticeDays,
      status: 'active', notes: `Odnowienie kontraktu z ${c.startDate}–${c.endDate}`,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    await load();
    setSaving(false);
  };

  const withDays = contracts.map(c => ({ ...c, days: daysUntil(c.endDate) }));
  const filtered = withDays.filter(c => {
    if (filter === 'urgent') return c.status === 'active' && c.days <= 90;
    if (filter === 'active') return c.status === 'active';
    if (filter === 'expired') return c.status === 'expired' || (c.status === 'active' && c.days < 0);
    return true;
  }).sort((a, b) => a.days - b.days);

  const urgentCount = withDays.filter(c => c.status === 'active' && c.days <= 30 && c.days >= 0).length;
  const expiredCount = withDays.filter(c => c.status === 'active' && c.days < 0).length;
  const fmt = (n: number) => n.toLocaleString('pl-PL', { maximumFractionDigits: 0 });

  const FormPanel = () => (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-black text-slate-900 uppercase tracking-tighter">
          {editing ? 'Edytuj kontrakt' : 'Nowy kontrakt'}
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
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tytuł kontraktu</label>
          <input value={form.title} onChange={e => upd('title', e.target.value)}
            placeholder="np. Umowa SLA 2025"
            className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Wartość</label>
          <input type="number" min={0} value={form.value} onChange={e => upd('value', e.target.value)}
            className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
        </div>
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Waluta</label>
          <select value={form.currency} onChange={e => upd('currency', e.target.value)}
            className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
            {CURRENCIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Data startu</label>
          <input type="date" value={form.startDate} onChange={e => upd('startDate', e.target.value)}
            className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
        </div>
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Data końca *</label>
          <input type="date" value={form.endDate} onChange={e => upd('endDate', e.target.value)}
            className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Alert (dni przed)</label>
          <select value={form.renewalNoticeDays} onChange={e => upd('renewalNoticeDays', Number(e.target.value))}
            className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
            {[14, 30, 60, 90].map(d => <option key={d} value={d}>{d} dni</option>)}
          </select>
        </div>
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</label>
          <select value={form.status} onChange={e => upd('status', e.target.value as any)}
            className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
            {(['active', 'expired', 'cancelled', 'renewed'] as const).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="col-span-2 flex items-center gap-3">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Auto-odnowienie</label>
          <button onClick={() => upd('autoRenewal', !form.autoRenewal)}
            className={`w-10 h-5 rounded-full transition-colors ${form.autoRenewal ? 'bg-emerald-500' : 'bg-slate-200'}`}>
            <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-0.5 ${form.autoRenewal ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
        <div className="col-span-2">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Notatki</label>
          <textarea value={form.notes} onChange={e => upd('notes', e.target.value)} rows={2}
            className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none resize-none" />
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={closeForm} className="flex-1 border border-slate-200 text-slate-500 font-black text-xs py-3 rounded-xl">Anuluj</button>
        <button onClick={handleSave} disabled={!form.customerName.trim() || !form.endDate || saving}
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
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Kontrakty & Odnowienia</h3>
          <p className="text-xs text-slate-500 mt-0.5">{contracts.length} kontraktów łącznie</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-slate-900 hover:bg-indigo-600 text-white font-black text-xs px-6 py-3 rounded-2xl transition-all">
          <Plus size={14} /> Nowy kontrakt
        </button>
      </div>

      {/* Alerts */}
      {urgentCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <Bell size={14} className="text-amber-600 flex-shrink-0" />
          <p className="text-xs font-black text-amber-700">{urgentCount} kontrakt{urgentCount > 1 ? 'y' : ''} wygasa w ciągu 30 dni</p>
        </div>
      )}
      {expiredCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle size={14} className="text-red-600 flex-shrink-0" />
          <p className="text-xs font-black text-red-700">{expiredCount} kontrakt{expiredCount > 1 ? 'y' : ''} wygasło — wymaga działania</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {([
          { id: 'urgent', label: 'Pilne (≤90d)' },
          { id: 'active', label: 'Aktywne' },
          { id: 'expired', label: 'Wygasłe' },
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

      {/* Contract list */}
      {loading ? (
        <div className="flex justify-center py-16"><RefreshCw size={20} className="animate-spin text-indigo-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">Brak kontraktów w tym widoku</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => {
            const badge = urgencyBadge(c.days, c.status);
            return (
              <div key={c.id} className={`rounded-2xl border p-5 transition-all ${urgencyColor(c.days, c.status)}`}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                    <FileSignature size={16} className="text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-black text-slate-900">{c.customerName}</span>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${badge.color}`}>{badge.label}</span>
                      {c.autoRenewal && <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1"><RefreshCw size={8} /> Auto</span>}
                    </div>
                    {c.title && <p className="text-xs text-slate-600 mb-1">{c.title}</p>}
                    <div className="flex flex-wrap gap-3 text-[9px] text-slate-500">
                      <span className="flex items-center gap-1"><Calendar size={9} /> {c.startDate} → {c.endDate}</span>
                      {c.value > 0 && <span className="font-black text-slate-700">{fmt(c.value)} {c.currency}</span>}
                      <span className="flex items-center gap-1"><Bell size={9} /> Alert {c.renewalNoticeDays}d</span>
                    </div>
                    {c.notes && <p className="text-[10px] text-slate-500 mt-1 italic">{c.notes}</p>}
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {c.status === 'active' && (
                      <button onClick={() => handleRenew(c)} disabled={saving}
                        className="flex items-center gap-1 text-[9px] font-black text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg transition-all">
                        <CheckCircle2 size={10} /> Odnów
                      </button>
                    )}
                    <button onClick={() => openEdit(c)}
                      className="flex items-center gap-1 text-[9px] font-black text-slate-600 bg-white hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition-all">
                      <Edit2 size={10} /> Edytuj
                    </button>
                    <button onClick={() => handleDelete(c.id)}
                      className="flex items-center gap-1 text-[9px] font-black text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all">
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
