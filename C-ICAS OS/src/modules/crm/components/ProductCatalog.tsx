import React, { useState, useEffect } from 'react';
import { Package, Plus, Edit2, Trash2, RefreshCw, Tag, DollarSign, Search, ChevronDown, ChevronUp, Save, X } from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

interface Props { tenantId: string }

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  pricingType: 'flat' | 'per_hour' | 'per_unit' | 'subscription';
  price: number;
  currency: string;
  unit?: string;
  taxRate: number;
  sku?: string;
  active: boolean;
  tags: string[];
  createdAt?: any;
}

const CATEGORIES = ['Oprogramowanie', 'Usługi IT', 'Konsulting', 'Szkolenia', 'Wsparcie techniczne', 'Licencje', 'Hardware', 'Inne'];
const PRICING_LABELS: Record<string, string> = {
  flat: 'Ryczałt', per_hour: 'Za godzinę', per_unit: 'Za sztukę', subscription: 'Abonament/mc',
};
const CURRENCIES = ['PLN', 'EUR', 'USD'];

const empty = (): Omit<Product, 'id'> => ({
  name: '', description: '', category: '', pricingType: 'flat',
  price: 0, currency: 'PLN', unit: 'szt.', taxRate: 23,
  sku: '', active: true, tags: [],
});

export default function ProductCatalog({ tenantId }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('active');
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(empty());
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const snap = await getDocs(query(collection(db, `tenants/${tenantId}/products`), where('tenantId', '==', tenantId)));
    setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    setLoading(false);
  };

  useEffect(() => { load(); }, [tenantId]);

  const upd = (k: keyof typeof form, v: any) => setForm(p => ({ ...p, [k]: v }));

  const openCreate = () => { setForm(empty()); setEditing(null); setCreating(true); };
  const openEdit = (p: Product) => {
    setForm({ name: p.name, description: p.description, category: p.category, pricingType: p.pricingType,
      price: p.price, currency: p.currency, unit: p.unit ?? '', taxRate: p.taxRate,
      sku: p.sku ?? '', active: p.active, tags: p.tags });
    setEditing(p); setCreating(false);
  };
  const closeForm = () => { setCreating(false); setEditing(null); };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = { ...form, tenantId, price: Number(form.price), taxRate: Number(form.taxRate), updatedAt: serverTimestamp() };
    try {
      if (editing) {
        await updateDoc(doc(db, `tenants/${tenantId}/products`, editing.id), payload);
      } else {
        await addDoc(collection(db, `tenants/${tenantId}/products`), { ...payload, createdAt: serverTimestamp() });
      }
      closeForm();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Usunąć produkt?')) return;
    await deleteDoc(doc(db, `tenants/${tenantId}/products`, id));
    setProducts(p => p.filter(x => x.id !== id));
  };

  const toggleActive = async (p: Product) => {
    await updateDoc(doc(db, `tenants/${tenantId}/products`, p.id), { active: !p.active, updatedAt: serverTimestamp() });
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, active: !x.active } : x));
  };

  const filtered = products.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.sku?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCat && p.category !== filterCat) return false;
    if (filterActive === 'active' && !p.active) return false;
    if (filterActive === 'inactive' && p.active) return false;
    return true;
  });

  const fmt = (n: number, cur: string) => n.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + cur;
  const priceWithTax = (price: number, tax: number) => price * (1 + tax / 100);

  const FormPanel = () => (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-sm font-black text-slate-900 uppercase tracking-tighter">
          {editing ? 'Edytuj produkt' : 'Nowy produkt / usługa'}
        </h4>
        <button onClick={closeForm} className="p-1 hover:bg-slate-100 rounded-lg"><X size={14} /></button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nazwa *</label>
          <input value={form.name} onChange={e => upd('name', e.target.value)}
            className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">SKU</label>
          <input value={form.sku} onChange={e => upd('sku', e.target.value)}
            className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none font-mono" />
        </div>
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Kategoria</label>
          <select value={form.category} onChange={e => upd('category', e.target.value)}
            className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
            <option value="">— wybierz —</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Model cenowy</label>
          <select value={form.pricingType} onChange={e => upd('pricingType', e.target.value as any)}
            className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
            {Object.entries(PRICING_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cena netto</label>
          <input type="number" min={0} step={0.01} value={form.price} onChange={e => upd('price', e.target.value)}
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
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">VAT (%)</label>
          <select value={form.taxRate} onChange={e => upd('taxRate', Number(e.target.value))}
            className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
            {[0, 5, 8, 23].map(r => <option key={r} value={r}>{r}%</option>)}
          </select>
        </div>
        {(form.pricingType === 'per_unit' || form.pricingType === 'per_hour') && (
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Jednostka</label>
            <input value={form.unit} onChange={e => upd('unit', e.target.value)}
              placeholder="szt. / godz. / mb."
              className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
          </div>
        )}
        <div className="col-span-2">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Opis</label>
          <textarea value={form.description} onChange={e => upd('description', e.target.value)} rows={2}
            className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none resize-none" />
        </div>
        <div className="col-span-2">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tagi (przecinek)</label>
          <input value={form.tags.join(', ')} onChange={e => upd('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
            placeholder="premium, nowe, rabat"
            className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
        </div>
        <div className="col-span-2 flex items-center gap-3">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Aktywny</label>
          <button onClick={() => upd('active', !form.active)}
            className={`w-10 h-5 rounded-full transition-colors ${form.active ? 'bg-emerald-500' : 'bg-slate-200'}`}>
            <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-0.5 ${form.active ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={closeForm} className="flex-1 border border-slate-200 text-slate-500 font-black text-xs py-3 rounded-xl">Anuluj</button>
        <button onClick={handleSave} disabled={!form.name.trim() || saving}
          className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-black text-xs py-3 rounded-xl">
          {saving ? <RefreshCw size={11} className="animate-spin" /> : <Save size={11} />}
          Zapisz
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Katalog Produktów</h3>
          <p className="text-xs text-slate-500 mt-0.5">{filtered.length} pozycji cennikowych</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-slate-900 hover:bg-indigo-600 text-white font-black text-xs px-6 py-3 rounded-2xl transition-all">
          <Plus size={14} /> Nowy produkt
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Szukaj..."
            className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-400 w-48" />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none">
          <option value="">Wszystkie kategorie</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {(['all', 'active', 'inactive'] as const).map(v => (
            <button key={v} onClick={() => setFilterActive(v)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filterActive === v ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}>
              {v === 'all' ? 'Wszystkie' : v === 'active' ? 'Aktywne' : 'Nieaktywne'}
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      {(creating || editing) && <FormPanel />}

      {/* Product list */}
      {loading ? (
        <div className="flex justify-center py-16"><RefreshCw size={20} className="animate-spin text-indigo-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">Brak produktów / usług</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => {
            const isExp = expanded === p.id;
            const gross = priceWithTax(p.price, p.taxRate);
            return (
              <div key={p.id} className={`bg-white rounded-2xl border transition-all ${p.active ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
                <div className="flex items-center gap-4 px-5 py-4 cursor-pointer" onClick={() => setExpanded(isExp ? null : p.id)}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${p.active ? 'bg-indigo-50' : 'bg-slate-100'}`}>
                    <Package size={16} className={p.active ? 'text-indigo-600' : 'text-slate-400'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black text-slate-900">{p.name}</span>
                      {p.sku && <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{p.sku}</span>}
                      {p.category && <span className="text-[9px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">{p.category}</span>}
                      {!p.active && <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Nieaktywny</span>}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">{PRICING_LABELS[p.pricingType]} · {p.taxRate}% VAT</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-black text-slate-900">{fmt(gross, p.currency)}</p>
                    <p className="text-[9px] text-slate-400">brutto · netto {fmt(p.price, p.currency)}</p>
                  </div>
                  {isExp ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                </div>

                {isExp && (
                  <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-3">
                    {p.description && <p className="text-sm text-slate-600">{p.description}</p>}
                    {p.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {p.tags.map(t => (
                          <span key={t} className="flex items-center gap-1 text-[9px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                            <Tag size={8} /> {t}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-3">
                      <button onClick={() => openEdit(p)}
                        className="flex items-center gap-2 text-[10px] font-black text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl transition-all">
                        <Edit2 size={11} /> Edytuj
                      </button>
                      <button onClick={() => toggleActive(p)}
                        className="flex items-center gap-2 text-[10px] font-black text-slate-600 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl transition-all">
                        {p.active ? 'Dezaktywuj' : 'Aktywuj'}
                      </button>
                      <button onClick={() => handleDelete(p.id)}
                        className="flex items-center gap-2 text-[10px] font-black text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl transition-all">
                        <Trash2 size={11} /> Usuń
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
