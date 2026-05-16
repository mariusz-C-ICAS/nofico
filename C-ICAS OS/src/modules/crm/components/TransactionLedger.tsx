import React, { useState, useEffect } from 'react';
import { ShoppingCart, RefreshCw, Plus, Search, Download, X, CheckCircle2 } from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';

interface Props { tenantId: string; onSelectCustomer?: (c: any) => void }

interface Transaction {
  id: string;
  customerId: string;
  customerName: string;
  type: 'purchase' | 'return' | 'service' | 'subscription';
  description: string;
  amount: number;
  currency: string;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'online' | 'other';
  status: 'completed' | 'pending' | 'refunded' | 'cancelled';
  tags: string[];
  notes?: string;
  createdAt?: any;
}

interface Customer { id: string; name: string }

const TYPES = ['purchase', 'return', 'service', 'subscription'] as const;
const PAYMENT_METHODS = ['cash', 'card', 'transfer', 'online', 'other'] as const;
const STATUSES = ['completed', 'pending', 'refunded', 'cancelled'] as const;

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  refunded: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-500',
};

const TYPE_ICONS: Record<string, string> = {
  purchase: '🛒', return: '↩️', service: '🔧', subscription: '🔄',
};

export default function TransactionLedger({ tenantId }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customerId: '', description: '', type: 'purchase' as typeof TYPES[number],
    amount: '', currency: 'PLN', paymentMethod: 'card' as typeof PAYMENT_METHODS[number],
    status: 'completed' as typeof STATUSES[number], notes: '', tags: '',
  });

  useEffect(() => {
    const unsubs = [
      onSnapshot(query(collection(db, `tenants/${tenantId}/transactions`), where('tenantId', '==', tenantId)), snap => {
        setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
        setLoading(false);
      }),
      onSnapshot(query(collection(db, 'customers'), where('tenantId', '==', tenantId)), snap => {
        setCustomers(snap.docs.map(d => ({ id: d.id, name: (d.data() as any).name })));
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, [tenantId]);

  const upd = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.customerId || !form.description.trim() || !form.amount) return;
    setSaving(true);
    const customer = customers.find(c => c.id === form.customerId);
    await addDoc(collection(db, `tenants/${tenantId}/transactions`), {
      tenantId,
      customerId: form.customerId,
      customerName: customer?.name ?? '',
      type: form.type,
      description: form.description.trim(),
      amount: parseFloat(form.amount),
      currency: form.currency,
      paymentMethod: form.paymentMethod,
      status: form.status,
      notes: form.notes.trim() || null,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      createdAt: serverTimestamp(),
    });
    setSaving(false);
    setShowForm(false);
    setForm({ customerId: '', description: '', type: 'purchase', amount: '', currency: 'PLN', paymentMethod: 'card', status: 'completed', notes: '', tags: '' });
  };

  const filtered = transactions
    .filter(t => filterType === 'all' || t.type === filterType)
    .filter(t => !search || t.customerName.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));

  const totalRevenue = transactions.filter(t => t.status === 'completed' && t.type !== 'return').reduce((s, t) => s + t.amount, 0);
  const totalReturns = transactions.filter(t => t.type === 'return' || t.status === 'refunded').reduce((s, t) => s + t.amount, 0);

  const exportCsv = () => {
    const rows = [['Data', 'Klient', 'Typ', 'Opis', 'Kwota', 'Waluta', 'Metoda', 'Status']];
    filtered.forEach(t => {
      const d = t.createdAt?.toDate?.()?.toLocaleDateString('pl-PL') ?? '';
      rows.push([d, t.customerName, t.type, t.description, String(t.amount), t.currency, t.paymentMethod, t.status]);
    });
    const csv = '﻿' + rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `transakcje_${tenantId}.csv`;
    a.click();
  };

  if (loading) return <div className="flex justify-center py-20"><RefreshCw size={20} className="animate-spin text-indigo-400" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Historia transakcji</h3>
          <p className="text-xs text-slate-500 mt-0.5">{transactions.length} transakcji</p>
        </div>
        <div className="flex gap-3">
          <button onClick={exportCsv} className="flex items-center gap-2 border border-slate-200 text-slate-600 font-black text-xs px-4 py-2.5 rounded-xl hover:bg-slate-50">
            <Download size={12} /> Eksport CSV
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-5 py-2.5 rounded-xl">
            <Plus size={13} /> Nowa transakcja
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Przychód', value: totalRevenue.toLocaleString('pl-PL') + ' PLN', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
          { label: 'Zwroty', value: totalReturns.toLocaleString('pl-PL') + ' PLN', color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
          { label: 'Transakcji', value: String(transactions.length), color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
          { label: 'Netto', value: (totalRevenue - totalReturns).toLocaleString('pl-PL') + ' PLN', color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
        ].map(k => (
          <div key={k.label} className={`rounded-2xl border p-5 ${k.bg}`}>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{k.label}</p>
            <p className={`text-2xl font-black mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nowa transakcja</p>
            <button onClick={() => setShowForm(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={14} /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Klient *</label>
              <select value={form.customerId} onChange={e => upd('customerId', e.target.value)}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                <option value="">— wybierz —</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Typ</label>
              <select value={form.type} onChange={e => upd('type', e.target.value)}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                {TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Opis *</label>
              <input value={form.description} onChange={e => upd('description', e.target.value)}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Kwota *</label>
              <input type="number" min={0} value={form.amount} onChange={e => upd('amount', e.target.value)}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Metoda płatności</label>
              <select value={form.paymentMethod} onChange={e => upd('paymentMethod', e.target.value)}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</label>
              <select value={form.status} onChange={e => upd('status', e.target.value)}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tagi</label>
              <input value={form.tags} onChange={e => upd('tags', e.target.value)} placeholder="promo, online, b2c"
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
            </div>
          </div>
          <button onClick={handleSave} disabled={!form.customerId || !form.description || !form.amount || saving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-black text-xs px-6 py-3 rounded-xl">
            {saving ? <RefreshCw size={11} className="animate-spin" /> : <CheckCircle2 size={11} />} Dodaj transakcję
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Szukaj..."
            className="pl-8 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none w-48" />
        </div>
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
          {['all', ...TYPES].map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${filterType === t ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}>
              {t === 'all' ? 'Wszystkie' : TYPE_ICONS[t] + ' ' + t}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">Brak transakcji</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                <th className="text-left px-5 py-3">Data</th>
                <th className="text-left px-4 py-3">Klient</th>
                <th className="text-left px-4 py-3">Opis</th>
                <th className="text-left px-4 py-3">Typ</th>
                <th className="text-right px-4 py-3">Kwota</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 text-xs text-slate-500">
                    {t.createdAt?.toDate?.()?.toLocaleDateString('pl-PL') ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm font-black text-slate-900">{t.customerName}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{t.description}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{TYPE_ICONS[t.type]} {t.type}</td>
                  <td className={`px-4 py-3 text-sm font-black text-right ${t.type === 'return' ? 'text-red-600' : 'text-emerald-700'}`}>
                    {t.type === 'return' ? '-' : ''}{t.amount.toLocaleString('pl-PL')} {t.currency}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg ${STATUS_COLORS[t.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
