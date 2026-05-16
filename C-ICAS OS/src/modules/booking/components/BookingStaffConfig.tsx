import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, RefreshCw, CheckCircle2, X } from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

interface Props { tenantId: string }

interface Staff {
  id: string;
  name: string;
  email: string;
  color: string;
  workDays: number[];
  workHoursStart: string;
  workHoursEnd: string;
  active: boolean;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6'];
const DAY_LABELS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];

const EMPTY: Omit<Staff, 'id'> = {
  name: '', email: '', color: '#6366f1',
  workDays: [1, 2, 3, 4, 5],
  workHoursStart: '08:00', workHoursEnd: '17:00', active: true,
};

export default function BookingStaffConfig({ tenantId }: Props) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [form, setForm] = useState<Omit<Staff, 'id'>>(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, `tenants/${tenantId}/bookingStaff`), where('tenantId', '==', tenantId));
    return onSnapshot(q, snap => {
      setStaff(snap.docs.map(d => ({ id: d.id, ...d.data() } as Staff)));
      setLoading(false);
    });
  }, [tenantId]);

  const openNew = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (s: Staff) => { setEditing(s); setForm({ ...s }); setShowForm(true); };
  const close = () => { setEditing(null); setForm(EMPTY); setShowForm(false); };
  const upd = (k: keyof typeof form, v: any) => setForm(p => ({ ...p, [k]: v }));

  const toggleDay = (day: number) => {
    setForm(p => ({
      ...p,
      workDays: p.workDays.includes(day) ? p.workDays.filter(d => d !== day) : [...p.workDays, day].sort(),
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = { ...form, tenantId, updatedAt: serverTimestamp() };
    if (editing) {
      await updateDoc(doc(db, `tenants/${tenantId}/bookingStaff`, editing.id), payload);
    } else {
      await addDoc(collection(db, `tenants/${tenantId}/bookingStaff`), { ...payload, createdAt: serverTimestamp() });
    }
    setSaving(false);
    close();
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, `tenants/${tenantId}/bookingStaff`, id));
  };

  if (loading) return <div className="flex justify-center py-20"><RefreshCw size={20} className="animate-spin text-indigo-400" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Personel</h3>
          <p className="text-xs text-slate-500 mt-0.5">{staff.length} osób w zespole</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-black text-xs px-5 py-3 rounded-2xl">
          <Plus size={13} /> Dodaj osobę
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{editing ? 'Edytuj pracownika' : 'Nowy pracownik'}</p>
            <button onClick={close} className="p-1 hover:bg-slate-100 rounded-lg"><X size={14} /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Imię i nazwisko *</label>
              <input value={form.name} onChange={e => upd('name', e.target.value)}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Email</label>
              <input type="email" value={form.email} onChange={e => upd('email', e.target.value)}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Godziny pracy od</label>
              <input type="time" value={form.workHoursStart} onChange={e => upd('workHoursStart', e.target.value)}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Godziny pracy do</label>
              <input type="time" value={form.workHoursEnd} onChange={e => upd('workHoursEnd', e.target.value)}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
            </div>
            <div className="col-span-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Dni robocze</label>
              <div className="flex gap-2">
                {DAY_LABELS.map((label, i) => (
                  <button key={i} onClick={() => toggleDay(i + 1)}
                    className={`w-10 h-10 rounded-xl text-[10px] font-black transition-all ${form.workDays.includes(i + 1) ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Kolor</label>
              <div className="mt-1 flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button key={c} onClick={() => upd('color', c)}
                    className={`w-7 h-7 rounded-lg border-2 transition-all ${form.color === c ? 'border-slate-900 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>
          <button onClick={handleSave} disabled={!form.name.trim() || saving}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white font-black text-xs px-6 py-3 rounded-xl">
            {saving ? <RefreshCw size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
            {editing ? 'Zapisz zmiany' : 'Dodaj pracownika'}
          </button>
        </div>
      )}

      {staff.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">Brak pracowników — dodaj pierwszego</div>
      ) : (
        <div className="grid gap-3">
          {staff.map(s => (
            <div key={s.id} className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-sm flex-shrink-0"
                style={{ backgroundColor: s.color }}>
                {s.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-black text-slate-900 text-sm">{s.name}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{s.email || '—'}</div>
              </div>
              <div className="flex gap-1">
                {DAY_LABELS.map((label, i) => (
                  <span key={i} className={`w-6 h-6 rounded flex items-center justify-center text-[8px] font-black ${s.workDays?.includes(i + 1) ? 'bg-violet-100 text-violet-700' : 'bg-slate-50 text-slate-300'}`}>
                    {label[0]}
                  </span>
                ))}
              </div>
              <div className="text-[10px] text-slate-500">{s.workHoursStart}–{s.workHoursEnd}</div>
              <div className="flex items-center gap-2">
                <button onClick={() => openEdit(s)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><Pencil size={13} /></button>
                <button onClick={() => handleDelete(s.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-400"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
