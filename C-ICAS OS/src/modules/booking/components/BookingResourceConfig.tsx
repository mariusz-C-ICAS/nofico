import React, { useState, useEffect } from 'react';
import { RefreshCw, Plus, Trash2, Save, Box, Pencil } from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import {
  collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';

interface Props { tenantId: string }
interface BookingResource {
  id: string; name: string; type: 'room' | 'equipment' | 'other';
  color: string; capacity?: number; description?: string; active: boolean;
}
type ResourceForm = Omit<BookingResource, 'id'>;

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6'];
const TYPES: { id: BookingResource['type']; label: string }[] = [
  { id: 'room', label: 'Gabinet / Sala' },
  { id: 'equipment', label: 'Sprzęt' },
  { id: 'other', label: 'Inne' },
];
const EMPTY: ResourceForm = { name: '', type: 'room', color: COLORS[0], capacity: undefined, description: '', active: true };

export default function BookingResourceConfig({ tenantId }: Props) {
  const [resources, setResources] = useState<BookingResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ResourceForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    return onSnapshot(
      query(collection(db, `tenants/${tenantId}/bookingResources`), where('tenantId', '==', tenantId)),
      snap => {
        setResources(snap.docs.map(d => ({ id: d.id, ...d.data() } as BookingResource)));
        setLoading(false);
      }
    );
  }, [tenantId]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    if (editId) {
      await updateDoc(doc(db, `tenants/${tenantId}/bookingResources`, editId), {
        ...form, updatedAt: serverTimestamp(),
      });
    } else {
      await addDoc(collection(db, `tenants/${tenantId}/bookingResources`), {
        ...form, tenantId, createdAt: serverTimestamp(),
      });
    }
    setSaving(false);
    setShowForm(false);
    setForm(EMPTY);
    setEditId(null);
  };

  const startEdit = (r: BookingResource) => {
    setForm({ name: r.name, type: r.type, color: r.color, capacity: r.capacity, description: r.description ?? '', active: r.active });
    setEditId(r.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, `tenants/${tenantId}/bookingResources`, id));
  };

  const toggleActive = async (r: BookingResource) => {
    await updateDoc(doc(db, `tenants/${tenantId}/bookingResources`, r.id), { active: !r.active });
  };

  const cancelForm = () => { setShowForm(false); setEditId(null); setForm(EMPTY); };

  if (loading) return <div className="flex justify-center py-20"><RefreshCw size={20} className="animate-spin text-indigo-400" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Zasoby</h3>
          <p className="text-xs text-slate-500 mt-0.5">Gabinety, sale i sprzęt przypisywany do rezerwacji</p>
        </div>
        <button
          onClick={() => { cancelForm(); setShowForm(true); }}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-black text-xs px-5 py-3 rounded-2xl"
        >
          <Plus size={13} /> Dodaj zasób
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{editId ? 'Edytuj zasób' : 'Nowy zasób'}</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nazwa *</label>
              <input
                value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-violet-400"
              />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Typ</label>
              <select
                value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as BookingResource['type'] }))}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none"
              >
                {TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pojemność (opcjonalnie)</label>
              <input
                type="number" min={1}
                value={form.capacity ?? ''}
                onChange={e => setForm(p => ({ ...p, capacity: e.target.value ? Number(e.target.value) : undefined }))}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Opis</label>
              <input
                value={form.description ?? ''}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none"
              />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Kolor</label>
              <div className="mt-2 flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setForm(p => ({ ...p, color: c }))}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? 'border-slate-900 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={!form.name.trim() || saving}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white font-black text-xs px-5 py-2.5 rounded-xl">
              {saving ? <RefreshCw size={11} className="animate-spin" /> : <Save size={11} />}
              {editId ? 'Zaktualizuj' : 'Dodaj'}
            </button>
            <button onClick={cancelForm} className="text-slate-400 text-xs font-bold px-4 py-2.5">Anuluj</button>
          </div>
        </div>
      )}

      {resources.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <Box size={24} className="text-slate-300 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">Brak zasobów — dodaj gabinety lub sprzęt</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map(r => (
            <div key={r.id} className={`bg-white rounded-2xl border-2 p-5 transition-all ${r.active ? 'border-slate-200' : 'border-dashed border-slate-200 opacity-60'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
                  <div>
                    <p className="text-sm font-black text-slate-900">{r.name}</p>
                    <p className="text-[9px] text-slate-400 uppercase tracking-widest">
                      {TYPES.find(t => t.id === r.type)?.label}{r.capacity ? ` · max ${r.capacity} os.` : ''}
                    </p>
                    {r.description && <p className="text-[10px] text-slate-500 mt-0.5">{r.description}</p>}
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={() => startEdit(r)} title="Edytuj"
                    className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl transition-all">
                    <Pencil size={11} />
                  </button>
                  <button onClick={() => toggleActive(r)}
                    className={`p-2 rounded-xl transition-all text-[8px] font-black ${r.active ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                    {r.active ? 'ON' : 'OFF'}
                  </button>
                  <button onClick={() => handleDelete(r.id)} title="Usuń"
                    className="p-2 bg-red-50 hover:bg-red-100 text-red-400 rounded-xl transition-all">
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
