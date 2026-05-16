import React, { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, Users, Calendar, DollarSign, Star } from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

interface Props { tenantId: string }

const INDUSTRY_LABELS: Record<string, string> = {
  salon: 'Salon Beauty', clinic: 'Klinika', gym: 'Siłownia / Fitness',
  restaurant: 'Gastronomia', real_estate: 'Nieruchomości', automotive: 'Motoryzacja',
  legal: 'Kancelaria', it: 'IT / SaaS', education: 'Edukacja', logistics: 'Logistyka',
};

type KpiDef = { label: string; key: string; icon: React.ElementType; color: string; bg: string };

const INDUSTRY_KPIS: Record<string, KpiDef[]> = {
  salon: [
    { label: 'Wizyty łącznie',       key: 'bookings',       icon: Calendar,    color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
    { label: 'Przychód bookingowy',  key: 'bookingRevenue', icon: DollarSign,  color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
    { label: 'Aktywni klienci',      key: 'activeCustomers',icon: Users,       color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200' },
    { label: 'Avg. wartość wizyty',  key: 'avgBooking',     icon: TrendingUp,  color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200' },
  ],
  clinic: [
    { label: 'Pacjenci łącznie',     key: 'customers',      icon: Users,       color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200' },
    { label: 'Wizyty / miesiąc',     key: 'bookingsMonth',  icon: Calendar,    color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
    { label: 'Przychód łącznie',     key: 'revenue',        icon: DollarSign,  color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
    { label: 'NPS Score',            key: 'nps',            icon: Star,        color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200' },
  ],
  gym: [
    { label: 'Aktywni członkowie',   key: 'activeCustomers',icon: Users,       color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200' },
    { label: 'MRR',                  key: 'mrr',            icon: DollarSign,  color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
    { label: 'Zajęcia / tydzień',    key: 'bookingsWeek',   icon: Calendar,    color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
    { label: 'Churn rate',           key: 'churn',          icon: TrendingUp,  color: 'text-red-700',    bg: 'bg-red-50 border-red-200' },
  ],
  it: [
    { label: 'Klienci aktywni',      key: 'activeCustomers',icon: Users,       color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200' },
    { label: 'MRR',                  key: 'mrr',            icon: DollarSign,  color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
    { label: 'Churn rate',           key: 'churn',          icon: TrendingUp,  color: 'text-red-700',    bg: 'bg-red-50 border-red-200' },
    { label: 'Przychód łącznie',     key: 'revenue',        icon: DollarSign,  color: 'text-slate-700',  bg: 'bg-slate-50 border-slate-200' },
  ],
};

const DEFAULT_KPIS: KpiDef[] = [
  { label: 'Klienci łącznie',        key: 'customers',      icon: Users,       color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200' },
  { label: 'Przychód łącznie',       key: 'revenue',        icon: DollarSign,  color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  { label: 'Wizyty łącznie',         key: 'bookings',       icon: Calendar,    color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
  { label: 'Avg. przychód / klienta',key: 'avgRevenue',     icon: TrendingUp,  color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200' },
];

export default function IndustryDashboard({ tenantId }: Props) {
  const [appliedTemplate, setAppliedTemplate] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const monthStart = today.slice(0, 7) + '-01';

    Promise.all([
      getDoc(doc(db, `tenants/${tenantId}/settings/crm`)),
      getDocs(query(collection(db, `tenants/${tenantId}/bookings`), where('tenantId', '==', tenantId))),
      getDocs(query(collection(db, 'customers'), where('tenantId', '==', tenantId))),
      getDocs(query(collection(db, `tenants/${tenantId}/transactions`), where('tenantId', '==', tenantId))),
      getDocs(query(collection(db, `tenants/${tenantId}/npsResponses`), where('tenantId', '==', tenantId))),
      getDocs(query(collection(db, `tenants/${tenantId}/memberships`), where('tenantId', '==', tenantId))),
    ]).then(([settingsSnap, bSnap, cSnap, tSnap, npsSnap, mSnap]) => {
      const tpl = settingsSnap.data()?.appliedTemplate ?? null;
      setAppliedTemplate(tpl);

      const bookings = bSnap.docs.map(d => d.data());
      const customers = cSnap.docs.map(d => d.data());
      const transactions = tSnap.docs.map(d => d.data());
      const npsResponses = npsSnap.docs.map(d => d.data());
      const memberships = mSnap.docs.map(d => d.data());

      const completedBookings = bookings.filter(b => b.status === 'completed');
      const activeCustomers = customers.filter(c => c.status === 'active').length;
      const bookingRevenue = completedBookings.reduce((s, b) => s + (b.price ?? 0), 0);
      const txRevenue = transactions.reduce((s, t) => s + (t.amount ?? 0), 0);
      const revenue = bookingRevenue + txRevenue;
      const avgBooking = completedBookings.length > 0 ? Math.round(bookingRevenue / completedBookings.length) : 0;
      const avgRevenue = customers.length > 0 ? Math.round(revenue / customers.length) : 0;
      const bookingsMonth = bookings.filter(b => (b.date ?? '') >= monthStart).length;
      const bookingsWeek = bookings.filter(b => (b.date ?? '') >= weekAgo).length;
      const mrr = memberships.filter(m => m.status === 'active').reduce((s, m) => s + (m.monthlyPrice ?? 0), 0);
      const churnedCount = customers.filter(c => c.status === 'churned').length;
      const churn = customers.length > 0 ? Math.round((churnedCount / customers.length) * 100) : 0;
      const avgNps = npsResponses.length > 0
        ? Math.round(npsResponses.reduce((s, r) => s + (r.score ?? 0), 0) / npsResponses.length)
        : 0;

      setMetrics({ customers: customers.length, activeCustomers, bookings: bookings.length,
        bookingRevenue, revenue, avgBooking, avgRevenue, bookingsMonth, bookingsWeek, mrr, churn, nps: avgNps });
      setLoading(false);
    });
  }, [tenantId]);

  const kpis = INDUSTRY_KPIS[appliedTemplate ?? ''] ?? DEFAULT_KPIS;
  const industryLabel = appliedTemplate ? (INDUSTRY_LABELS[appliedTemplate] ?? appliedTemplate) : 'Domyślny';

  const fmtVal = (key: string) => {
    const v = metrics[key] ?? 0;
    if (['revenue', 'bookingRevenue', 'mrr', 'avgBooking', 'avgRevenue'].includes(key))
      return v.toLocaleString('pl-PL') + ' PLN';
    if (key === 'churn') return v + '%';
    return String(v);
  };

  if (loading) return <div className="flex justify-center py-20"><RefreshCw size={20} className="animate-spin text-indigo-400" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Dashboard branżowy</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Szablon: <span className="font-bold text-indigo-600">{industryLabel}</span>
          </p>
        </div>
        {!appliedTemplate && (
          <span className="text-[9px] bg-amber-100 text-amber-700 font-black px-3 py-1.5 rounded-xl uppercase tracking-widest">
            Wybierz szablon w zakładce Branże
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.key} className={`rounded-2xl border p-5 ${k.bg}`}>
            <k.icon size={15} className={`${k.color} mb-2`} />
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{k.label}</p>
            <p className={`text-2xl font-black mt-1 ${k.color}`}>{fmtVal(k.key)}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Podsumowanie ogólne</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Wszystkich klientów', val: String(metrics.customers ?? 0) },
            { label: 'Aktywnych klientów',  val: String(metrics.activeCustomers ?? 0) },
            { label: 'Rezerwacji łącznie',  val: String(metrics.bookings ?? 0) },
            { label: 'Przychód łącznie',    val: (metrics.revenue ?? 0).toLocaleString('pl-PL') + ' PLN' },
          ].map(item => (
            <div key={item.label} className="text-center p-3 bg-slate-50 rounded-xl">
              <p className="text-[8px] font-black text-slate-400 uppercase">{item.label}</p>
              <p className="text-xl font-black text-slate-900 mt-1">{item.val}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
