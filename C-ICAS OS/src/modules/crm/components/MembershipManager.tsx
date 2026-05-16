import React, { useState, useEffect } from 'react';
import { CreditCard, RefreshCw, Plus, X, CheckCircle2, Users, AlertTriangle } from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

interface Props { tenantId: string }

interface MembershipPlan {
  id: string;
  name: string;
  period: 'monthly' | 'quarterly' | 'annual';
  price: number;
  currency: string;
  features: string[];
  color: string;
  active: boolean;
  maxVisits?: number;
}

interface Membership {
  id: string;
  customerId: string;
  customerName: string;
  planId: string;
  planName: string;
  status: 'active' | 'expired' | 'cancelled' | 'pending';
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  visitsUsed: number;
  price: number;
  currency: string;
}

interface Customer { id: string; name: string }

const PERIODS: { id: MembershipPlan['period']; label: string; months: number }[] = [
  { id: 'monthly', label: 'Miesięczna', months: 1 },
  { id: 'quarterly', label: 'Kwartalna', months: 3 },
  { id: 'annual', label: 'Roczna', months: 12 },
];
const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  expired: 'bg-red-100 text-red-600',
  cancelled: 'bg-slate-100 text-slate-500',
  pending: 'bg-amber-100 text-amber-700',
};

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function daysLeft(endDate: string): number {
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
}

export default function MembershipManager({ tenantId }: Props) {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'memberships' | 'plans'>('memberships');
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [planForm, setPlanForm] = useState({
    name: '', period: 'monthly' as MembershipPlan['period'], price: '',
    features: '', color: '#6366f1', maxVisits: '',
  });
  const [memberForm, setMemberForm] = useState({
    customerId: '', planId: '', startDate: new Date().toISOString().slice(0, 10), autoRenew: true,
  });

  useEffect(() => {
    const unsubs = [
      onSnapshot(query(collection(db, `tenants/${tenantId}/membershipPlans`), where('tenantId', '==', tenantId)), snap => {
        setPlans(snap.docs.map(d => ({ id: d.id, ...d.data() } as MembershipPlan)));
        setLoading(false);
      }),
      onSnapshot(query(collection(db, `tenants/${tenantId}/memberships`), where('tenantId', '==', tenantId)), snap => {
        setMemberships(snap.docs.map(d => ({ id: d.id, ...d.data() } as Membership)));
      }),
      onSnapshot(query(collection(db, 'customers'), where('tenantId', '==', tenantId)), snap => {
        setCustomers(snap.docs.map(d => ({ id: d.id, name: (d.data() as any).name })));
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, [tenantId]);

  const handleSavePlan = async () => {
    if (!planForm.name || !planForm.price) return;
    setSaving(true);
    await addDoc(collection(db, `tenants/${tenantId}/membershipPlans`), {
      tenantId, name: planForm.name.trim(), period: planForm.period,
      price: parseFloat(planForm.price), currency: 'PLN', color: planForm.color,
      features: planForm.features ? planForm.features.split('\n').map(f => f.trim()).filter(Boolean) : [],
      maxVisits: planForm.maxVisits ? parseInt(planForm.maxVisits) : null,
      active: true, createdAt: serverTimestamp(),
    });
    setSaving(false);
    setShowPlanForm(false);
    setPlanForm({ name: '', period: 'monthly', price: '', features: '', color: '#6366f1', maxVisits: '' });
  };

  const handleAssign = async () => {
    if (!memberForm.customerId || !memberForm.planId) return;
    const plan = plans.find(p => p.id === memberForm.planId);
    const customer = customers.find(c => c.id === memberForm.customerId);
    if (!plan || !customer) return;
    const periodMonths = PERIODS.find(p => p.id === plan.period)?.months ?? 1;
    setSaving(true);
    await addDoc(collection(db, `tenants/${tenantId}/memberships`), {
      tenantId, customerId: customer.id, customerName: customer.name,
      planId: plan.id, planName: plan.name,
      startDate: memberForm.startDate,
      endDate: addMonths(memberForm.startDate, periodMonths),
      status: 'active', autoRenew: memberForm.autoRenew,
      visitsUsed: 0, price: plan.price, currency: plan.currency,
      createdAt: serverTimestamp(),
    });
    setSaving(false);
    setShowMemberForm(false);
  };

  const cancelMembership = async (id: string) => {
    await updateDoc(doc(db, `tenants/${tenantId}/memberships`, id), { status: 'cancelled', updatedAt: serverTimestamp() });
  };

  // KPIs
  const active = memberships.filter(m => m.status === 'active');
  const expiringSoon = active.filter(m => daysLeft(m.endDate) <= 14);
  const mrr = active.reduce((s, m) => {
    const plan = plans.find(p => p.id === m.planId);
    const months = PERIODS.find(p => p.id === plan?.period)?.months ?? 1;
    return s + m.price / months;
  }, 0);

  if (loading) return <div className="flex justify-center py-20"><RefreshCw size={20} className="animate-spin text-indigo-400" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Karnety & Abonamenty</h3>
          <p className="text-xs text-slate-500 mt-0.5">Zarządzaj planami członkowskimi i subskrypcjami</p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
            <button onClick={() => setView('memberships')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${view === 'memberships' ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}>Karnety</button>
            <button onClick={() => setView('plans')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${view === 'plans' ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}>Plany</button>
          </div>
          <button onClick={() => view === 'plans' ? setShowPlanForm(true) : setShowMemberForm(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-4 py-2.5 rounded-xl">
            <Plus size={12} /> {view === 'plans' ? 'Nowy plan' : 'Przypisz karnet'}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Aktywne karnety', value: String(active.length), color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
          { label: 'Wygasa w 14 dni', value: String(expiringSoon.length), color: expiringSoon.length > 0 ? 'text-red-600' : 'text-slate-600', bg: expiringSoon.length > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200' },
          { label: 'MRR (szacunkowo)', value: Math.round(mrr).toLocaleString('pl-PL') + ' PLN', color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
          { label: 'Plany', value: String(plans.length), color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
        ].map(k => (
          <div key={k.label} className={`rounded-2xl border p-5 ${k.bg}`}>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{k.label}</p>
            <p className={`text-2xl font-black mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {expiringSoon.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
          <p className="text-xs text-amber-700 font-bold">
            {expiringSoon.length} karnety(-ów) wygasa w ciągu 14 dni: {expiringSoon.slice(0, 3).map(m => m.customerName).join(', ')}{expiringSoon.length > 3 ? ` i ${expiringSoon.length - 3} więcej` : ''}
          </p>
        </div>
      )}

      {view === 'plans' && (
        <>
          {showPlanForm && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nowy plan</p>
                <button onClick={() => setShowPlanForm(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={14} /></button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nazwa planu *</label>
                  <input value={planForm.name} onChange={e => setPlanForm(p => ({ ...p, name: e.target.value }))}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Okres</label>
                  <select value={planForm.period} onChange={e => setPlanForm(p => ({ ...p, period: e.target.value as any }))}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                    {PERIODS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cena (PLN)</label>
                  <input type="number" min={0} value={planForm.price} onChange={e => setPlanForm(p => ({ ...p, price: e.target.value }))}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Max wizyt (puste = bez limitu)</label>
                  <input type="number" min={0} value={planForm.maxVisits} onChange={e => setPlanForm(p => ({ ...p, maxVisits: e.target.value }))}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cechy (każda w nowej linii)</label>
                  <textarea value={planForm.features} onChange={e => setPlanForm(p => ({ ...p, features: e.target.value }))} rows={3}
                    placeholder="Nielimitowane wejścia&#10;Sauna i jacuzzi&#10;Konsultacja trenera"
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none resize-none" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Kolor</label>
                  <div className="mt-1 flex gap-2">
                    {COLORS.map(c => (
                      <button key={c} onClick={() => setPlanForm(p => ({ ...p, color: c }))}
                        className={`w-7 h-7 rounded-lg border-2 ${planForm.color === c ? 'border-slate-900 scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={handleSavePlan} disabled={!planForm.name || !planForm.price || saving}
                className="flex items-center gap-2 bg-indigo-600 disabled:opacity-40 text-white font-black text-xs px-5 py-3 rounded-xl">
                {saving ? <RefreshCw size={11} className="animate-spin" /> : <CheckCircle2 size={11} />} Utwórz plan
              </button>
            </div>
          )}
          {plans.length === 0 ? <div className="text-center py-16 text-slate-400 text-sm">Brak planów — utwórz pierwszy</div> : (
            <div className="grid lg:grid-cols-3 gap-4">
              {plans.map(p => {
                const memberCount = memberships.filter(m => m.planId === p.id && m.status === 'active').length;
                return (
                  <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-10 rounded-full" style={{ backgroundColor: p.color }} />
                      <div>
                        <div className="font-black text-slate-900">{p.name}</div>
                        <div className="text-[10px] text-slate-500">{PERIODS.find(pp => pp.id === p.period)?.label}</div>
                      </div>
                    </div>
                    <div className="text-3xl font-black text-slate-900">{p.price} <span className="text-sm text-slate-400">PLN</span></div>
                    {p.maxVisits && <div className="text-[10px] text-slate-500">Max {p.maxVisits} wizyt</div>}
                    {p.features.length > 0 && (
                      <ul className="space-y-1">
                        {p.features.map((f, i) => <li key={i} className="text-[10px] text-slate-600 flex items-center gap-1.5"><span className="text-emerald-500">✓</span>{f}</li>)}
                      </ul>
                    )}
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                      <Users size={10} /> {memberCount} aktywnych
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {view === 'memberships' && (
        <>
          {showMemberForm && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Przypisz karnet</p>
                <button onClick={() => setShowMemberForm(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={14} /></button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Klient *</label>
                  <select value={memberForm.customerId} onChange={e => setMemberForm(p => ({ ...p, customerId: e.target.value }))}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                    <option value="">— wybierz klienta —</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Plan *</label>
                  <select value={memberForm.planId} onChange={e => setMemberForm(p => ({ ...p, planId: e.target.value }))}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                    <option value="">— wybierz plan —</option>
                    {plans.filter(p => p.active).map(p => <option key={p.id} value={p.id}>{p.name} — {p.price} PLN</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Data rozpoczęcia</label>
                  <input type="date" value={memberForm.startDate} onChange={e => setMemberForm(p => ({ ...p, startDate: e.target.value }))}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
                </div>
                <div className="flex items-center gap-3 pt-5">
                  <button onClick={() => setMemberForm(p => ({ ...p, autoRenew: !p.autoRenew }))}
                    className={`w-12 h-6 rounded-full transition-all relative ${memberForm.autoRenew ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${memberForm.autoRenew ? 'left-7' : 'left-1'}`} />
                  </button>
                  <span className="text-xs font-black text-slate-700">Auto-odnowienie</span>
                </div>
              </div>
              <button onClick={handleAssign} disabled={!memberForm.customerId || !memberForm.planId || saving}
                className="flex items-center gap-2 bg-indigo-600 disabled:opacity-40 text-white font-black text-xs px-5 py-3 rounded-xl">
                {saving ? <RefreshCw size={11} className="animate-spin" /> : <CreditCard size={11} />} Przypisz karnet
              </button>
            </div>
          )}
          {memberships.length === 0 ? <div className="text-center py-16 text-slate-400 text-sm">Brak aktywnych karnetów</div> : (
            <div className="space-y-3">
              {memberships.sort((a, b) => a.endDate.localeCompare(b.endDate)).map(m => {
                const left = daysLeft(m.endDate);
                const plan = plans.find(p => p.id === m.planId);
                return (
                  <div key={m.id} className={`bg-white rounded-2xl border p-5 flex items-center gap-4 ${left <= 7 && m.status === 'active' ? 'border-red-200' : 'border-slate-200'}`}>
                    <div className="w-3 h-12 rounded-full flex-shrink-0" style={{ backgroundColor: plan?.color ?? '#6366f1' }} />
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-slate-900">{m.customerName}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{m.planName} · {m.price} PLN</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black text-slate-700">{new Date(m.endDate + 'T12:00').toLocaleDateString('pl-PL')}</div>
                      <div className={`text-[9px] font-black ${left <= 7 ? 'text-red-600' : left <= 14 ? 'text-amber-600' : 'text-slate-400'}`}>
                        {m.status === 'active' ? `${left > 0 ? `${left} dni` : 'wygasło'}` : m.status}
                      </div>
                    </div>
                    <span className={`text-[9px] font-black px-2.5 py-1.5 rounded-lg ${STATUS_COLORS[m.status] ?? 'bg-slate-100 text-slate-500'}`}>{m.status}</span>
                    {m.status === 'active' && (
                      <button onClick={() => cancelMembership(m.id)} className="text-[9px] font-black text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg">Anuluj</button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
