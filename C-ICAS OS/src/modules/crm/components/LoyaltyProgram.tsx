import React, { useState, useEffect } from 'react';
import { Star, RefreshCw, Plus, Gift, Users, X, CheckCircle2, Award } from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

interface Props { tenantId: string }

interface LoyaltyAccount {
  id: string;
  customerId: string;
  customerName: string;
  points: number;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  totalEarned: number;
  totalRedeemed: number;
  createdAt?: any;
  updatedAt?: any;
}

interface Coupon {
  id: string;
  code: string;
  description: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  minPoints: number;
  expiresAt?: string;
  active: boolean;
  usedCount: number;
}

interface Customer { id: string; name: string }

const TIERS: { name: LoyaltyAccount['tier']; minPoints: number; color: string; bg: string }[] = [
  { name: 'Bronze',   minPoints: 0,    color: 'text-orange-700', bg: 'bg-orange-100' },
  { name: 'Silver',   minPoints: 500,  color: 'text-slate-600',  bg: 'bg-slate-100'  },
  { name: 'Gold',     minPoints: 1500, color: 'text-yellow-700', bg: 'bg-yellow-100' },
  { name: 'Platinum', minPoints: 5000, color: 'text-violet-700', bg: 'bg-violet-100' },
];

function getTier(points: number): LoyaltyAccount['tier'] {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (points >= TIERS[i].minPoints) return TIERS[i].name;
  }
  return 'Bronze';
}

function nextTier(tier: LoyaltyAccount['tier']): { name: string; needed: number } | null {
  const idx = TIERS.findIndex(t => t.name === tier);
  if (idx >= TIERS.length - 1) return null;
  return { name: TIERS[idx + 1].name, needed: TIERS[idx + 1].minPoints };
}

export default function LoyaltyProgram({ tenantId }: Props) {
  const [accounts, setAccounts] = useState<LoyaltyAccount[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'accounts' | 'coupons'>('accounts');
  const [showAddPoints, setShowAddPoints] = useState<LoyaltyAccount | null>(null);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pointsForm, setPointsForm] = useState({ points: '', reason: '' });
  const [newAccountForm, setNewAccountForm] = useState({ customerId: '' });
  const [couponForm, setCouponForm] = useState({
    code: '', description: '', discountType: 'percent' as 'percent' | 'fixed',
    discountValue: '', minPoints: '0', expiresAt: '',
  });

  useEffect(() => {
    const unsubs = [
      onSnapshot(query(collection(db, `tenants/${tenantId}/loyaltyAccounts`), where('tenantId', '==', tenantId)), snap => {
        setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() } as LoyaltyAccount)));
        setLoading(false);
      }),
      onSnapshot(query(collection(db, `tenants/${tenantId}/loyaltyCoupons`), where('tenantId', '==', tenantId)), snap => {
        setCoupons(snap.docs.map(d => ({ id: d.id, ...d.data() } as Coupon)));
      }),
      onSnapshot(query(collection(db, 'customers'), where('tenantId', '==', tenantId)), snap => {
        setCustomers(snap.docs.map(d => ({ id: d.id, name: (d.data() as any).name })));
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, [tenantId]);

  const handleAddPoints = async () => {
    if (!showAddPoints || !pointsForm.points) return;
    setSaving(true);
    const delta = parseInt(pointsForm.points);
    const newPoints = showAddPoints.points + delta;
    await updateDoc(doc(db, `tenants/${tenantId}/loyaltyAccounts`, showAddPoints.id), {
      points: newPoints,
      tier: getTier(newPoints),
      totalEarned: showAddPoints.totalEarned + Math.max(0, delta),
      updatedAt: serverTimestamp(),
    });
    setSaving(false);
    setShowAddPoints(null);
    setPointsForm({ points: '', reason: '' });
  };

  const handleNewAccount = async () => {
    if (!newAccountForm.customerId) return;
    const customer = customers.find(c => c.id === newAccountForm.customerId);
    if (!customer) return;
    setSaving(true);
    await addDoc(collection(db, `tenants/${tenantId}/loyaltyAccounts`), {
      tenantId, customerId: customer.id, customerName: customer.name,
      points: 0, tier: 'Bronze', totalEarned: 0, totalRedeemed: 0,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    setSaving(false);
    setShowNewAccount(false);
  };

  const handleAddCoupon = async () => {
    if (!couponForm.code.trim() || !couponForm.discountValue) return;
    setSaving(true);
    await addDoc(collection(db, `tenants/${tenantId}/loyaltyCoupons`), {
      tenantId, code: couponForm.code.toUpperCase().trim(),
      description: couponForm.description.trim(),
      discountType: couponForm.discountType,
      discountValue: parseFloat(couponForm.discountValue),
      minPoints: parseInt(couponForm.minPoints) || 0,
      expiresAt: couponForm.expiresAt || null,
      active: true, usedCount: 0,
      createdAt: serverTimestamp(),
    });
    setSaving(false);
    setShowCouponForm(false);
  };

  const toggleCoupon = async (c: Coupon) => {
    await updateDoc(doc(db, `tenants/${tenantId}/loyaltyCoupons`, c.id), { active: !c.active });
  };

  const totalMembers = accounts.length;
  const tierCounts = TIERS.map(t => ({ ...t, count: accounts.filter(a => a.tier === t.name).length }));

  if (loading) return <div className="flex justify-center py-20"><RefreshCw size={20} className="animate-spin text-indigo-400" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Program Lojalnościowy</h3>
          <p className="text-xs text-slate-500 mt-0.5">{totalMembers} aktywnych kont</p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
            <button onClick={() => setView('accounts')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${view === 'accounts' ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}>Konta</button>
            <button onClick={() => setView('coupons')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${view === 'coupons' ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}>Kupony</button>
          </div>
          {view === 'accounts' ? (
            <button onClick={() => setShowNewAccount(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-4 py-2.5 rounded-xl">
              <Plus size={12} /> Dodaj konto
            </button>
          ) : (
            <button onClick={() => setShowCouponForm(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-4 py-2.5 rounded-xl">
              <Plus size={12} /> Nowy kupon
            </button>
          )}
        </div>
      </div>

      {/* Tier stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {tierCounts.map(t => (
          <div key={t.name} className={`rounded-2xl border p-5 ${t.bg} border-transparent`}>
            <div className="flex items-center gap-2 mb-1">
              <Award size={14} className={t.color} />
              <p className={`text-[9px] font-black uppercase tracking-widest ${t.color}`}>{t.name}</p>
            </div>
            <p className={`text-2xl font-black ${t.color}`}>{t.count}</p>
            <p className="text-[9px] text-slate-400 mt-0.5">od {t.minPoints} pkt</p>
          </div>
        ))}
      </div>

      {view === 'accounts' && (
        <>
          {showNewAccount && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nowe konto lojalnościowe</p>
                <button onClick={() => setShowNewAccount(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={14} /></button>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Klient *</label>
                <select value={newAccountForm.customerId} onChange={e => setNewAccountForm({ customerId: e.target.value })}
                  className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                  <option value="">— wybierz klienta —</option>
                  {customers.filter(c => !accounts.find(a => a.customerId === c.id)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <button onClick={handleNewAccount} disabled={!newAccountForm.customerId || saving}
                className="flex items-center gap-2 bg-indigo-600 disabled:opacity-40 text-white font-black text-xs px-5 py-3 rounded-xl">
                {saving ? <RefreshCw size={11} className="animate-spin" /> : <CheckCircle2 size={11} />} Utwórz konto
              </button>
            </div>
          )}

          {showAddPoints && (
            <div className="bg-white rounded-2xl border border-indigo-200 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Dodaj / odejmij punkty — {showAddPoints.customerName}</p>
                <button onClick={() => setShowAddPoints(null)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={14} /></button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Punkty (ujemne = odejmij)</label>
                  <input type="number" value={pointsForm.points} onChange={e => setPointsForm(p => ({ ...p, points: e.target.value }))}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Powód</label>
                  <input value={pointsForm.reason} onChange={e => setPointsForm(p => ({ ...p, reason: e.target.value }))}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
                </div>
              </div>
              <button onClick={handleAddPoints} disabled={!pointsForm.points || saving}
                className="flex items-center gap-2 bg-indigo-600 disabled:opacity-40 text-white font-black text-xs px-5 py-3 rounded-xl">
                {saving ? <RefreshCw size={11} className="animate-spin" /> : <Star size={11} />} Zaktualizuj punkty
              </button>
            </div>
          )}

          {accounts.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">Brak kont lojalnościowych</div>
          ) : (
            <div className="space-y-3">
              {accounts.sort((a, b) => b.points - a.points).map(acc => {
                const tierInfo = TIERS.find(t => t.name === acc.tier)!;
                const next = nextTier(acc.tier);
                const progress = next ? Math.min(100, (acc.points / next.needed) * 100) : 100;
                return (
                  <div key={acc.id} className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${tierInfo.bg}`}>
                      <Award size={20} className={tierInfo.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-slate-900">{acc.customerName}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg ${tierInfo.bg} ${tierInfo.color}`}>{acc.tier}</span>
                        {next && <span className="text-[9px] text-slate-400">{next.needed - acc.points} pkt do {next.name}</span>}
                      </div>
                      {next && (
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1.5 w-48">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${progress}%` }} />
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-slate-900">{acc.points.toLocaleString('pl-PL')}</div>
                      <div className="text-[9px] text-slate-400">punktów</div>
                    </div>
                    <button onClick={() => setShowAddPoints(acc)}
                      className="flex items-center gap-2 border border-indigo-200 text-indigo-600 font-black text-[10px] px-3 py-2 rounded-xl hover:bg-indigo-50">
                      <Plus size={11} /> Punkty
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {view === 'coupons' && (
        <>
          {showCouponForm && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nowy kupon</p>
                <button onClick={() => setShowCouponForm(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={14} /></button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Kod kuponu *</label>
                  <input value={couponForm.code} onChange={e => setCouponForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none font-mono" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Min. punktów</label>
                  <input type="number" min={0} value={couponForm.minPoints} onChange={e => setCouponForm(p => ({ ...p, minPoints: e.target.value }))}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Opis</label>
                  <input value={couponForm.description} onChange={e => setCouponForm(p => ({ ...p, description: e.target.value }))}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Typ rabatu</label>
                  <select value={couponForm.discountType} onChange={e => setCouponForm(p => ({ ...p, discountType: e.target.value as any }))}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                    <option value="percent">% procent</option>
                    <option value="fixed">Kwota (PLN)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Wartość rabatu</label>
                  <input type="number" min={0} value={couponForm.discountValue} onChange={e => setCouponForm(p => ({ ...p, discountValue: e.target.value }))}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Wygasa (data)</label>
                  <input type="date" value={couponForm.expiresAt} onChange={e => setCouponForm(p => ({ ...p, expiresAt: e.target.value }))}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
                </div>
              </div>
              <button onClick={handleAddCoupon} disabled={!couponForm.code || !couponForm.discountValue || saving}
                className="flex items-center gap-2 bg-indigo-600 disabled:opacity-40 text-white font-black text-xs px-5 py-3 rounded-xl">
                {saving ? <RefreshCw size={11} className="animate-spin" /> : <Gift size={11} />} Utwórz kupon
              </button>
            </div>
          )}

          {coupons.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">Brak kuponów</div>
          ) : (
            <div className="grid gap-3">
              {coupons.map(c => (
                <div key={c.id} className={`bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4 ${!c.active ? 'opacity-50' : ''}`}>
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <Gift size={20} className="text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 font-mono text-lg">{c.code}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{c.description}</div>
                    {c.minPoints > 0 && <div className="text-[9px] text-slate-400">Min. {c.minPoints} pkt</div>}
                  </div>
                  <div className="text-right">
                    <div className="font-black text-slate-900 text-lg">
                      {c.discountValue}{c.discountType === 'percent' ? '%' : ' PLN'}
                    </div>
                    <div className="text-[9px] text-slate-400">użyto: {c.usedCount}×</div>
                  </div>
                  {c.expiresAt && <div className="text-[9px] text-slate-400">do {c.expiresAt}</div>}
                  <button onClick={() => toggleCoupon(c)}
                    className={`text-[9px] font-black px-3 py-1.5 rounded-lg ${c.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {c.active ? 'Aktywny' : 'Wyłączony'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
