import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, RefreshCw, CheckCircle2, X, Clock, DollarSign } from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

interface Props { tenantId: string }

interface BookingService {
  id: string;
  name: string;
  duration: number;
  price: number;
  currency: string;
  color: string;
  bufferAfter: number;
  maxDaysAdvance: number;
  active: boolean;
  category: string;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6'];
const CATEGORIES = ['Salon urody', 'Medycyna', 'Fitness', 'Konsultacje', 'Naprawa', 'Edukacja', 'Gastronomia', 'Inne'];

const EMPTY: Omit<BookingService, 'id'> = {
  name: '', duration: 60, price: 0, currency: 'PLN', color: '#6366f1',
  bufferAfter: 0, maxDaysAdvance: 30, active: true, category: 'Inne',
};

export default function BookingServiceConfig({ tenantId }: Props) {
  const [services, setServices] = useState<BookingService[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BookingService | null>(null);
  const [form, setForm] = useState<Omit<BookingService, 'id'>>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, `tenants/${tenantId}/bookingServices`), where('tenantId', '==', tenantId));
    return onSnapshot(q, snap => {
      setServices(snap.docs.map(d => ({ id: d.id, ...d.data() } as BookingService)));
      setLoading(false);
    });
  }, [tenantId]);

  const openNew = () => { setEditing(null); setForm(EMPTY); };
  const openEdit = (s: BookingService) => { setEditing(s); setForm({ ...s }); };
  const upd = (k: keyof typeof form, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = { ...form, tenantId, updatedAt: serverTimestamp() };
    if (editing) {
      await updateDoc(doc(db, `tenants/${tenantId}/bookingServices`, editing.id), payload);
    } else {
      await addDoc(collection(db, `tenants/${tenantId}/bookingServices`), { ...payload, createdAt: serverTimestamp() });
    }
    setSaving(false);
    setEditing(null);
    setForm(EMPTY);
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, `tenants/${tenantId}/bookingServices`, id));
  };

  const toggleActive = async (s: BookingService) => {
    await updateDoc(doc(db, `tenants/${tenantId}/bookingServices`, s.id), { active: !s.active });
  };

  if (loading) return <div className="flex justify-center py-20"><RefreshCw size={20} className="animate-spin text-indigo-400" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Usługi & Cennik</h3>
          <p className="text-xs text-slate-500 mt-0.5">{services.length} usług skonfigurowanych</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-black text-xs px-5 py-3 rounded-2xl">
          <Plus size={13} /> Nowa usługa
        </button>
      </div>

      {/* Form panel */}
      {(editing !== null || form.name !== EMPTY.name || form.name !== '') && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{editing ? 'Edytuj usługę' : 'Nowa usługa'}</p>
            <button onClick={() => { setEditing(null); setForm(EMPTY); }} className="p-1 hover:bg-slate-100 rounded-lg"><X size={14} /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nazwa usługi *</label>
              <input value={form.name} onChange={e => upd('name', e.target.value)}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Czas trwania (min)</label>
              <input type="number" min={5} step={5} value={form.duration} onChange={e => upd('duration', Number(e.target.value))}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Przerwa po (min)</label>
              <input type="number" min={0} step={5} value={form.bufferAfter} onChange={e => upd('bufferAfter', Number(e.target.value))}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cena (PLN)</label>
              <input type="number" min={0} value={form.price} onChange={e => upd('price', Number(e.target.value))}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Rezerwacja z wyprzedzeniem (dni)</label>
              <input type="number" min={1} value={form.maxDaysAdvance} onChange={e => upd('maxDaysAdvance', Number(e.target.value))}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Kategoria</label>
              <select value={form.category} onChange={e => upd('category', e.target.value)}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
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
          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={!form.name.trim() || saving}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white font-black text-xs px-6 py-3 rounded-xl">
              {saving ? <RefreshCw size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
              {editing ? 'Zapisz zmiany' : 'Dodaj usługę'}
            </button>
          </div>
        </div>
      )}

      {services.length === 0 && !form.name ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          Brak usług — dodaj pierwszą klikając "Nowa usługa"
        </div>
      ) : (
        <div className="grid gap-3">
          {services.map(s => (
            <div key={s.id} className={`bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4 ${!s.active ? 'opacity-50' : ''}`}>
              <div className="w-4 h-12 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
              <div className="flex-1 min-w-0">
                <div className="font-black text-slate-900 text-sm">{s.name}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{s.category}</div>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                <Clock size={11} /> {s.duration} min
              </div>
              <div className="flex items-center gap-1 text-[10px] text-slate-700 font-black">
                <DollarSign size={11} /> {s.price} PLN
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleActive(s)} className={`text-[9px] font-black px-3 py-1.5 rounded-lg ${s.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {s.active ? 'Aktywna' : 'Nieaktywna'}
                </button>
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
