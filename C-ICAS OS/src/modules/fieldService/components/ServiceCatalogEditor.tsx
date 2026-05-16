import React, { useState } from 'react';
import { Plus, Pencil, Trash2, CheckCircle2, X, Loader2 } from 'lucide-react';
import { createServiceType, updateServiceType, deleteServiceType } from '../services/calendarService';
import type { ServiceType } from '../types';
import { SERVICE_CATEGORIES, CURRENCY_OPTIONS } from '../types';
import { useTenant } from '../../../shared/hooks/useTenant';

const SERVICE_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#84cc16',
  '#ec4899', '#6b7280',
];

interface Props { serviceTypes: ServiceType[]; }

interface FormState {
  name: string;
  description: string;
  defaultDurationMinutes: string;
  defaultPrice: string;
  currency: string;
  travelBufferMinutes: string;
  color: string;
  category: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  name: '', description: '', defaultDurationMinutes: '120',
  defaultPrice: '0', currency: 'PLN', travelBufferMinutes: '15',
  color: SERVICE_COLORS[0], category: SERVICE_CATEGORIES[0], isActive: true,
};

export default function ServiceCatalogEditor({ serviceTypes }: Props) {
  const { activeTenantId } = useTenant();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const set = (k: keyof FormState) => (v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }));

  const openNew = () => { setForm(EMPTY_FORM); setEditId(null); setShowForm(true); setError(''); };
  const openEdit = (t: ServiceType) => {
    setForm({
      name: t.name, description: t.description ?? '',
      defaultDurationMinutes: String(t.defaultDurationMinutes),
      defaultPrice: String(t.defaultPrice),
      currency: t.currency, travelBufferMinutes: String(t.travelBufferMinutes),
      color: t.color, category: t.category, isActive: t.isActive,
    });
    setEditId(t.id);
    setShowForm(true);
    setError('');
  };

  const handleSave = async () => {
    if (!activeTenantId || !form.name.trim()) return;
    setLoading(true); setError('');
    try {
      const data: Omit<ServiceType, 'id' | 'createdAt'> = {
        tenantId: activeTenantId,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        defaultDurationMinutes: parseInt(form.defaultDurationMinutes),
        defaultPrice: parseFloat(form.defaultPrice),
        currency: form.currency,
        travelBufferMinutes: parseInt(form.travelBufferMinutes),
        color: form.color,
        category: form.category,
        isActive: form.isActive,
      };
      if (editId) {
        await updateServiceType(activeTenantId, editId, data);
      } else {
        await createServiceType(activeTenantId, data);
      }
      setShowForm(false); setEditId(null);
    } catch (e: any) { setError(e.message ?? 'Błąd zapisu.'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!activeTenantId) return;
    setLoading(true);
    try { await deleteServiceType(activeTenantId, id); setDeleteId(null); }
    catch (e: any) { setError(e.message ?? 'Błąd usuwania.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-700 uppercase tracking-tight">Katalog usług</h3>
        <button onClick={openNew}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-5 py-2.5 rounded-2xl text-xs uppercase tracking-widest">
          <Plus size={14} /> Dodaj usługę
        </button>
      </div>

      {error && <p className="text-red-600 text-xs font-bold">{error}</p>}

      {/* Form */}
      {showForm && (
        <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-200 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-xs font-black text-slate-700 uppercase">{editId ? 'Edytuj usługę' : 'Nowa usługa'}</h4>
            <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-slate-200">
              <X size={14} className="text-slate-400" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Nazwa *</label>
              <input value={form.name} onChange={e => set('name')(e.target.value)}
                placeholder="np. Koszenie trawy"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Czas (min)</label>
              <input type="number" value={form.defaultDurationMinutes} onChange={e => set('defaultDurationMinutes')(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Bufor dojazdu (min)</label>
              <input type="number" value={form.travelBufferMinutes} onChange={e => set('travelBufferMinutes')(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Cena domyślna</label>
              <input type="number" value={form.defaultPrice} onChange={e => set('defaultPrice')(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Waluta</label>
              <select value={form.currency} onChange={e => set('currency')(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                {CURRENCY_OPTIONS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Kategoria</label>
              <select value={form.category} onChange={e => set('category')(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                {SERVICE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Kolor</label>
              <div className="flex gap-2 flex-wrap">
                {SERVICE_COLORS.map(c => (
                  <button key={c} onClick={() => set('color')(c)}
                    className={`w-7 h-7 rounded-lg transition-all ${form.color === c ? 'ring-2 ring-offset-1 ring-slate-400 scale-110' : ''}`}
                    style={{ background: c }} />
                ))}
              </div>
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={e => set('isActive')(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500" />
                <span className="text-xs font-bold text-slate-600">Aktywna (widoczna w kalendarzu)</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowForm(false)} className="text-xs font-black text-slate-400 uppercase hover:text-slate-600 px-4 py-2">
              Anuluj
            </button>
            <button disabled={loading || !form.name.trim()} onClick={handleSave}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-black px-6 py-2.5 rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2">
              {loading ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
              Zapisz
            </button>
          </div>
        </div>
      )}

      {/* Types list */}
      <div className="space-y-2">
        {serviceTypes.length === 0 && !showForm && (
          <div className="bg-slate-50 rounded-[2rem] p-8 text-center">
            <p className="text-slate-300 font-black uppercase tracking-widest text-xs">Brak zdefiniowanych usług — dodaj pierwszą</p>
          </div>
        )}
        {serviceTypes.map(t => (
          <div key={t.id} className="bg-white rounded-[2rem] border border-slate-100 px-5 py-4 flex items-center gap-4">
            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: t.color }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-slate-800">{t.name}</p>
              <p className="text-[9px] text-slate-400 font-bold uppercase">
                {t.category} · {t.defaultDurationMinutes} min · {t.defaultPrice} {t.currency} · bufor {t.travelBufferMinutes} min
              </p>
            </div>
            {!t.isActive && <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase">Nieaktywna</span>}
            <div className="flex gap-1">
              <button onClick={() => openEdit(t)} className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center">
                <Pencil size={13} className="text-slate-400" />
              </button>
              {deleteId === t.id ? (
                <div className="flex gap-1">
                  <button onClick={() => handleDelete(t.id)} className="text-[9px] font-black text-red-600 hover:underline px-2">Tak, usuń</button>
                  <button onClick={() => setDeleteId(null)} className="text-[9px] font-black text-slate-400 hover:underline px-2">Anuluj</button>
                </div>
              ) : (
                <button onClick={() => setDeleteId(t.id)} className="w-8 h-8 rounded-xl hover:bg-red-50 flex items-center justify-center">
                  <Trash2 size={13} className="text-slate-400 hover:text-red-500" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
