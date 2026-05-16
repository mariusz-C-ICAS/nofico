import React, { useState, useEffect } from 'react';
import { RefreshCw, Plus, Gift, CheckCircle2, Search, Copy } from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

interface Props { tenantId: string }
interface Voucher {
  id: string; code: string; type: 'amount' | 'service'; value: number; serviceId?: string;
  recipientName: string; message?: string; purchaserName: string;
  status: 'active' | 'redeemed' | 'expired';
  expiresAt: string; redeemedAt?: any; createdAt?: any;
}
interface BookingService { id: string; name: string; color: string }

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  redeemed: 'bg-slate-100 text-slate-500',
  expired: 'bg-red-100 text-red-500',
};

function generateCode(): string {
  return Math.random().toString(36).slice(2, 6).toUpperCase() +
         Math.random().toString(36).slice(2, 6).toUpperCase();
}

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function GiftVouchers({ tenantId }: Props) {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [services, setServices] = useState<BookingService[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'redeem'>('list');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState('');

  const [form, setForm] = useState({
    recipientName: '', message: '', purchaserName: '',
    type: 'amount' as 'amount' | 'service', value: 100, serviceId: '', validDays: 365,
  });

  const [redeemCode, setRedeemCode] = useState('');
  const [redeemResult, setRedeemResult] = useState<Voucher | null | 'not_found'>(null);
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    const unsubs = [
      onSnapshot(query(collection(db, `tenants/${tenantId}/giftVouchers`), where('tenantId', '==', tenantId)), snap => {
        setVouchers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Voucher))
          .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)));
        setLoading(false);
      }),
      onSnapshot(query(collection(db, `tenants/${tenantId}/bookingServices`), where('tenantId', '==', tenantId)), snap => {
        setServices(snap.docs.map(d => ({ id: d.id, ...d.data() } as BookingService)));
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, [tenantId]);

  const handleCreate = async () => {
    if (!form.recipientName.trim() || !form.purchaserName.trim()) return;
    setSaving(true);
    const code = generateCode();
    await addDoc(collection(db, `tenants/${tenantId}/giftVouchers`), {
      tenantId, code,
      type: form.type,
      value: form.type === 'amount' ? form.value : 0,
      serviceId: form.type === 'service' ? form.serviceId : null,
      recipientName: form.recipientName.trim(),
      message: form.message.trim() || null,
      purchaserName: form.purchaserName.trim(),
      expiresAt: addDays(form.validDays),
      status: 'active',
      createdAt: serverTimestamp(),
    });
    setSaving(false);
    setShowForm(false);
    setForm({ recipientName: '', message: '', purchaserName: '', type: 'amount', value: 100, serviceId: '', validDays: 365 });
  };

  const handleSearch = () => {
    const found = vouchers.find(v => v.code === redeemCode.toUpperCase().trim());
    setRedeemResult(found ?? 'not_found');
  };

  const handleRedeem = async (v: Voucher) => {
    setRedeeming(true);
    await updateDoc(doc(db, `tenants/${tenantId}/giftVouchers`, v.id), {
      status: 'redeemed', redeemedAt: serverTimestamp(),
    });
    setRedeeming(false);
    setRedeemResult(null);
    setRedeemCode('');
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(''), 2000);
  };

  if (loading) return <div className="flex justify-center py-20"><RefreshCw size={20} className="animate-spin text-indigo-400" /></div>;

  const active = vouchers.filter(v => v.status === 'active');
  const used = vouchers.filter(v => v.status !== 'active');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Vouchery podarunkowe</h3>
          <p className="text-xs text-slate-500 mt-0.5">Sprzedaj i realizuj vouchery wartościowe oraz usługowe</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-pink-600 text-white font-black text-xs px-5 py-2.5 rounded-xl hover:bg-pink-700 transition-all">
          <Plus size={12} /> Nowy voucher
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Aktywnych', val: active.length, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
          { label: 'Wartość aktywnych', val: active.filter(v => v.type === 'amount').reduce((s, v) => s + v.value, 0) + ' PLN', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
          { label: 'Zrealizowanych', val: vouchers.filter(v => v.status === 'redeemed').length, color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border p-4 ${s.bg}`}>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
            <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl w-fit">
        {(['list', 'redeem'] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === v ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}>
            {v === 'list' ? 'Vouchery' : 'Realizacja'}
          </button>
        ))}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nowy voucher</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nabywca</label>
              <input value={form.purchaserName} onChange={e => setForm(p => ({ ...p, purchaserName: e.target.value }))}
                placeholder="Kto kupuje"
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dla kogo</label>
              <input value={form.recipientName} onChange={e => setForm(p => ({ ...p, recipientName: e.target.value }))}
                placeholder="Imię obdarowanego"
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
            </div>
            <div className="col-span-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Rodzaj</label>
              <div className="flex gap-2 mt-1">
                {(['amount', 'service'] as const).map(t => (
                  <button key={t} onClick={() => setForm(p => ({ ...p, type: t }))}
                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black border-2 transition-all ${form.type === t ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-slate-200 text-slate-500'}`}>
                    {t === 'amount' ? 'Kwotowy (PLN)' : 'Usługowy'}
                  </button>
                ))}
              </div>
            </div>
            {form.type === 'amount' ? (
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Wartość PLN</label>
                <input type="number" value={form.value} onChange={e => setForm(p => ({ ...p, value: Number(e.target.value) }))}
                  className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
              </div>
            ) : (
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Usługa</label>
                <select value={form.serviceId} onChange={e => setForm(p => ({ ...p, serviceId: e.target.value }))}
                  className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                  <option value="">— wybierz —</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ważność (dni)</label>
              <div className="flex gap-2 mt-1">
                {[180, 365].map(d => (
                  <button key={d} onClick={() => setForm(p => ({ ...p, validDays: d }))}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-black border-2 transition-all ${form.validDays === d ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-slate-200 text-slate-500'}`}>
                    {d === 180 ? '6 mies.' : '12 mies.'}
                  </button>
                ))}
              </div>
            </div>
            <div className="col-span-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Wiadomość (opcjonalnie)</label>
              <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} rows={2}
                placeholder="Życzenia dla obdarowanego"
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none resize-none" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleCreate} disabled={!form.recipientName.trim() || !form.purchaserName.trim() || saving}
              className="bg-pink-600 text-white font-black text-xs px-5 py-2.5 rounded-xl hover:bg-pink-700 disabled:opacity-50">
              Wygeneruj voucher
            </button>
            <button onClick={() => setShowForm(false)} className="text-slate-500 text-xs font-black px-4 py-2.5">Anuluj</button>
          </div>
        </div>
      )}

      {/* Voucher list */}
      {view === 'list' && (
        <div className="space-y-3">
          {[...active, ...used].length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <Gift size={24} className="text-slate-300 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Brak voucherów</p>
            </div>
          ) : [...active, ...used].map(v => {
            const svc = services.find(s => s.id === v.serviceId);
            return (
              <div key={v.id} className={`bg-white rounded-2xl border-2 p-5 transition-all ${v.status === 'active' ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Gift size={13} className="text-pink-500" />
                      <span className="font-black text-slate-900">{v.recipientName}</span>
                      <span className="text-[9px] text-slate-400">od {v.purchaserName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <code className="text-sm font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg tracking-widest">
                        {v.code}
                      </code>
                      <button onClick={() => copyCode(v.code)} className="text-slate-400 hover:text-slate-600">
                        {copied === v.code ? <CheckCircle2 size={13} className="text-emerald-500" /> : <Copy size={13} />}
                      </button>
                    </div>
                    {v.message && <p className="text-xs text-slate-400 italic mt-1">"{v.message}"</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-pink-600">
                      {v.type === 'amount' ? `${v.value} PLN` : (svc?.name ?? 'Usługa')}
                    </p>
                    <p className="text-[9px] text-slate-400 mt-0.5">do {v.expiresAt}</p>
                    <span className={`text-[8px] font-black px-2 py-1 rounded-lg mt-1 inline-block ${STATUS_COLORS[v.status]}`}>
                      {v.status === 'active' ? 'Aktywny' : v.status === 'redeemed' ? 'Zrealizowany' : 'Wygasły'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Redeem panel */}
      {view === 'redeem' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Realizacja vouchera</p>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={redeemCode} onChange={e => setRedeemCode(e.target.value.toUpperCase())}
                placeholder="Wpisz kod vouchera..."
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-black tracking-widest outline-none focus:border-pink-400" />
            </div>
            <button onClick={handleSearch}
              className="bg-pink-600 text-white font-black text-xs px-5 rounded-xl hover:bg-pink-700">
              Sprawdź
            </button>
          </div>

          {redeemResult === 'not_found' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm font-bold">
              Voucher nie znaleziony lub nieprawidłowy kod.
            </div>
          )}

          {redeemResult && redeemResult !== 'not_found' && (
            <div className="space-y-4">
              <div className={`rounded-2xl border-2 p-5 ${
                redeemResult.status === 'active' ? 'border-emerald-300 bg-emerald-50' :
                redeemResult.status === 'redeemed' ? 'border-slate-200 bg-slate-50' : 'border-red-200 bg-red-50'
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-black text-slate-900 flex items-center gap-2">
                      <Gift size={14} className="text-pink-500" />
                      {redeemResult.recipientName}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Wystawiony przez: {redeemResult.purchaserName}</p>
                    {redeemResult.message && <p className="text-xs italic text-slate-400 mt-1">"{redeemResult.message}"</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-pink-600">
                      {redeemResult.type === 'amount' ? `${redeemResult.value} PLN` : (services.find(s => s.id === redeemResult.serviceId)?.name ?? 'Usługa')}
                    </p>
                    <p className="text-xs text-slate-400">Ważny do {redeemResult.expiresAt}</p>
                    <span className={`text-[9px] font-black px-2 py-1 rounded-lg mt-1 inline-block ${STATUS_COLORS[redeemResult.status]}`}>
                      {redeemResult.status === 'active' ? 'Aktywny' : redeemResult.status === 'redeemed' ? 'Już zrealizowany' : 'Wygasły'}
                    </span>
                  </div>
                </div>
              </div>
              {redeemResult.status === 'active' && (
                <button onClick={() => redeemResult !== 'not_found' && handleRedeem(redeemResult as Voucher)}
                  disabled={redeeming}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-2xl disabled:opacity-50">
                  {redeeming ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Realizuj voucher
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
