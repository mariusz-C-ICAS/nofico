/**
 * Data: 2026-05-14
 * Sciezka: /src/modules/payments/PaymentsModule.tsx
 */
import React, { useState } from 'react';
import {
  CreditCard, TrendingUp, ArrowDownCircle, ArrowUpCircle,
  DollarSign, Users, AlertCircle, ExternalLink, CheckCircle2,
  Clock, XCircle, BarChart3, Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type PaymentsTab = 'subscriptions' | 'incoming' | 'outgoing' | 'stripe' | 'cashflow';

/* ── Mock data ── */
const SUBSCRIPTIONS = [
  { id: 'SUB-001', tenant: 'Budmar Sp. z o.o.', plan: 'Enterprise', seats: 45, mrr: '4.500 PLN', renewal: '2026-06-01', status: 'Aktywna', color: 'bg-indigo-600' },
  { id: 'SUB-002', tenant: 'LogiPol S.A.', plan: 'Pro', seats: 12, mrr: '1.200 PLN', renewal: '2026-06-15', status: 'Aktywna', color: 'bg-emerald-600' },
  { id: 'SUB-003', tenant: 'Archicom', plan: 'Starter', seats: 5, mrr: '299 PLN', renewal: '2026-05-31', status: 'Zalegla', color: 'bg-amber-500' },
  { id: 'SUB-004', tenant: 'Demo Klient', plan: 'Free', seats: 2, mrr: '0 PLN', renewal: '—', status: 'Aktywna', color: 'bg-slate-400' },
  { id: 'SUB-005', tenant: 'FastBuild Grp.', plan: 'Pro', seats: 18, mrr: '1.800 PLN', renewal: '2026-07-10', status: 'Aktywna', color: 'bg-emerald-600' },
];

const INCOMING = [
  { id: 'INV-4421', tenant: 'Budmar Sp. z o.o.', amount: '4.500 PLN', issued: '2026-05-01', due: '2026-05-15', status: 'Oplacona', method: 'Przelew' },
  { id: 'INV-4420', tenant: 'LogiPol S.A.', amount: '1.200 PLN', issued: '2026-05-01', due: '2026-05-15', status: 'Oplacona', method: 'Stripe' },
  { id: 'INV-4419', tenant: 'Archicom', amount: '299 PLN', issued: '2026-05-01', due: '2026-05-10', status: 'Przeterminowana', method: 'Przelew' },
  { id: 'INV-4418', tenant: 'FastBuild Grp.', amount: '1.800 PLN', issued: '2026-05-01', due: '2026-05-15', status: 'Oczekujaca', method: 'Stripe' },
  { id: 'INV-4417', tenant: 'NordHaus', amount: '950 PLN', issued: '2026-04-01', due: '2026-04-15', status: 'Oplacona', method: 'Stripe' },
];

const OUTGOING = [
  { id: 'EXP-881', vendor: 'AWS Cloud', amount: '12.400 PLN', date: '2026-05-01', category: 'Infrastruktura', status: 'Oplacona' },
  { id: 'EXP-880', vendor: 'Stripe Inc.', amount: '340 PLN', date: '2026-05-01', category: 'Oplaty procesora', status: 'Oplacona' },
  { id: 'EXP-879', vendor: 'Maleware Protect', amount: '890 PLN', date: '2026-05-05', category: 'Bezpieczenstwo', status: 'Oczekujaca' },
  { id: 'EXP-878', vendor: 'Biuro Rachunkowe', amount: '2.500 PLN', date: '2026-05-10', category: 'Ksiegowosc', status: 'Oplacona' },
  { id: 'EXP-877', vendor: 'Hubspot CRM', amount: '1.200 PLN', date: '2026-05-01', category: 'Marketing', status: 'Oplacona' },
];

const CASHFLOW_MONTHS = [
  { month: 'Sty', income: 7200, expense: 14800 },
  { month: 'Lut', income: 8500, expense: 15200 },
  { month: 'Mar', income: 9800, expense: 15600 },
  { month: 'Kwi', income: 12400, expense: 16100 },
  { month: 'Maj', income: 16200, expense: 17300 },
];

const INV_STATUS_COLORS: Record<string, string> = {
  'Oplacona': 'bg-emerald-50 text-emerald-600',
  'Oczekujaca': 'bg-indigo-50 text-indigo-600',
  'Przeterminowana': 'bg-rose-50 text-rose-600',
};
const INV_STATUS_ICON: Record<string, React.ElementType> = {
  'Oplacona': CheckCircle2,
  'Oczekujaca': Clock,
  'Przeterminowana': XCircle,
};

const PLAN_COLORS: Record<string, string> = {
  'Free': 'bg-slate-100 text-slate-600',
  'Starter': 'bg-indigo-50 text-indigo-600',
  'Pro': 'bg-emerald-50 text-emerald-600',
  'Enterprise': 'bg-amber-50 text-amber-700',
};

export default function PaymentsModuleUI() {
  const [activeTab, setActiveTab] = useState<PaymentsTab>('subscriptions');

  const tabs: { id: PaymentsTab; label: string; icon: React.ElementType }[] = [
    { id: 'subscriptions', label: 'Subskrypcje', icon: Users },
    { id: 'incoming', label: 'Platnosci Przychodzace', icon: ArrowDownCircle },
    { id: 'outgoing', label: 'Platnosci Wychodzace', icon: ArrowUpCircle },
    { id: 'stripe', label: 'Rozliczenia Stripe', icon: CreditCard },
    { id: 'cashflow', label: 'Plynnosc', icon: TrendingUp },
  ];

  const mrr = 7799;
  const overdue = 299;
  const cash = 48200;

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-12">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="bg-slate-900 rounded-[3rem] p-12 text-white relative overflow-hidden shadow-2xl border border-slate-800 mb-12">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
            <div>
              <div className="flex items-center gap-3 mb-6 bg-slate-800/80 w-fit px-5 py-2 rounded-full border border-slate-700">
                <CreditCard className="text-indigo-400" size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-100">Billing & Revenue Management</span>
              </div>
              <h1 className="text-5xl font-black uppercase tracking-tighter mb-4 italic">
                Pay<span className="text-indigo-500">ments</span>
              </h1>
              <p className="text-slate-400 font-medium text-sm italic">Subskrypcje, faktury, rozliczenia Stripe i analiza plynnosci finansowej.</p>
            </div>

            <div className="flex flex-wrap gap-4">
              {[
                { label: 'MRR', value: `${mrr.toLocaleString('pl-PL')} PLN`, icon: DollarSign, color: 'text-emerald-400' },
                { label: 'Zaleglosci', value: `${overdue} PLN`, icon: AlertCircle, color: 'text-rose-400' },
                { label: 'Stan kasy', value: `${cash.toLocaleString('pl-PL')} PLN`, icon: BarChart3, color: 'text-indigo-400' },
              ].map(s => (
                <div key={s.label} className="bg-slate-800/60 border border-slate-700 rounded-2xl px-6 py-4 flex items-center gap-3">
                  <s.icon size={18} className={s.color} />
                  <div>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.label}</div>
                    <div className="text-lg font-black text-white italic">{s.value}</div>
                  </div>
                </div>
              ))}
              <button className="bg-slate-800 text-white font-black p-4 rounded-2xl border border-slate-700 hover:bg-indigo-600 transition-all">
                <Settings size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-3 mb-12">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-8 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${
                activeTab === t.id
                  ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200'
                  : 'bg-white text-slate-400 hover:text-indigo-600 border border-slate-100'
              }`}
            >
              <t.icon size={15} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
          >
            {activeTab === 'subscriptions' && <SubscriptionsTab />}
            {activeTab === 'incoming' && <IncomingTab />}
            {activeTab === 'outgoing' && <OutgoingTab />}
            {activeTab === 'stripe' && <StripeTab />}
            {activeTab === 'cashflow' && <CashFlowTab />}
          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  );
}

/* ── Subscriptions ── */
function SubscriptionsTab() {
  return (
    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Plany Subskrypcji Tenantow</h3>
        <div className="flex gap-3">
          {['Free', 'Starter', 'Pro', 'Enterprise'].map(p => (
            <span key={p} className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${PLAN_COLORS[p]}`}>{p}</span>
          ))}
        </div>
      </div>
      <div className="space-y-4">
        {SUBSCRIPTIONS.map(s => (
          <div key={s.id} className="flex items-center justify-between p-7 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all">
            <div className="flex items-center gap-5">
              <div className={`w-12 h-12 ${s.color} rounded-xl flex items-center justify-center`}>
                <Users size={20} className="text-white" />
              </div>
              <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.id}</div>
                <div className="text-base font-black text-slate-900 italic">{s.tenant}</div>
                <div className="text-[10px] text-slate-400 font-bold mt-1">{s.seats} uzytkownikow • odnowienie: {s.renewal}</div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${PLAN_COLORS[s.plan]}`}>{s.plan}</span>
              <div className="text-right">
                <div className="text-lg font-black text-slate-900 italic">{s.mrr}</div>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">/miesiac</div>
              </div>
              <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                s.status === 'Aktywna' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}>{s.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Incoming ── */
function IncomingTab() {
  return (
    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-8 border-b border-slate-50 flex items-center justify-between">
        <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Faktury Przychodzace</h3>
        <button className="bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-2xl flex items-center gap-2">
          <ArrowDownCircle size={14} /> Wystaw Fakture
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {['Nr faktury', 'Klient', 'Kwota', 'Wystawiona', 'Termin', 'Metoda', 'Status'].map(h => (
                <th key={h} className="text-[9px] text-slate-400 uppercase tracking-widest text-left py-4 px-6 font-black whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {INCOMING.map(inv => {
              const StatusIcon = INV_STATUS_ICON[inv.status];
              return (
                <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-6 font-black text-indigo-600 italic">{inv.id}</td>
                  <td className="py-4 px-6 font-black text-slate-900">{inv.tenant}</td>
                  <td className="py-4 px-6 font-black text-slate-900">{inv.amount}</td>
                  <td className="py-4 px-6 text-slate-400 font-bold">{inv.issued}</td>
                  <td className="py-4 px-6 text-slate-500 font-bold">{inv.due}</td>
                  <td className="py-4 px-6">
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[9px] font-black uppercase">{inv.method}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${INV_STATUS_COLORS[inv.status]}`}>
                      <StatusIcon size={10} />
                      {inv.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Outgoing ── */
function OutgoingTab() {
  const total = OUTGOING.reduce((acc, e) => {
    const v = parseFloat(e.amount.replace(/[^\d,]/g, '').replace(',', '.'));
    return acc + v;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-8 flex items-center gap-5">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
          <ArrowUpCircle size={22} />
        </div>
        <div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lacznie wydatkow (biezacy miesiac)</div>
          <div className="text-2xl font-black text-slate-900 italic">{total.toLocaleString('pl-PL')} PLN</div>
        </div>
      </div>
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50">
          <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Platnosci Wychodzace</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['ID', 'Dostawca', 'Kwota', 'Data', 'Kategoria', 'Status'].map(h => (
                  <th key={h} className="text-[9px] text-slate-400 uppercase tracking-widest text-left py-4 px-6 font-black">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {OUTGOING.map(exp => (
                <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-6 font-black text-indigo-600 italic">{exp.id}</td>
                  <td className="py-4 px-6 font-black text-slate-900">{exp.vendor}</td>
                  <td className="py-4 px-6 font-black text-slate-900">{exp.amount}</td>
                  <td className="py-4 px-6 text-slate-400 font-bold">{exp.date}</td>
                  <td className="py-4 px-6">
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[9px] font-black uppercase">{exp.category}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                      exp.status === 'Oplacona' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                    }`}>{exp.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── Stripe ── */
function StripeTab() {
  return (
    <div className="space-y-6">
      <div className="bg-slate-900 rounded-[3rem] p-12 text-white border border-slate-800">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                <CreditCard size={18} className="text-white" />
              </div>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter">Stripe Dashboard</h3>
            </div>
            <p className="text-slate-400 text-sm font-bold">Polaczony z kontem: c-icas@stripe.com</p>
          </div>
          <button className="bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest px-8 py-4 rounded-2xl flex items-center gap-2 hover:bg-indigo-500 transition-all">
            <ExternalLink size={14} /> Otwórz Stripe
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'MRR', value: '7.799 PLN', delta: '+12%' },
            { label: 'ARR', value: '93.588 PLN', delta: '+12%' },
            { label: 'Churn rate', value: '1,8%', delta: '-0,2%' },
            { label: 'Aktywne subskrypcje', value: '5', delta: '+1' },
          ].map(m => (
            <div key={m.label} className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{m.label}</div>
              <div className="text-xl font-black italic text-white">{m.value}</div>
              <div className="text-[9px] font-black text-emerald-400 mt-1">{m.delta} vs prev</div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10">
        <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter mb-6">Ostatnie zdarzenia Stripe</h3>
        <div className="space-y-3">
          {[
            { event: 'invoice.paid', customer: 'Budmar Sp. z o.o.', amount: '4.500 PLN', time: 'Dzisiaj 09:12' },
            { event: 'invoice.paid', customer: 'LogiPol S.A.', amount: '1.200 PLN', time: 'Dzisiaj 08:55' },
            { event: 'invoice.payment_failed', customer: 'Archicom', amount: '299 PLN', time: 'Wczoraj 18:30' },
            { event: 'customer.subscription.updated', customer: 'FastBuild Grp.', amount: '—', time: '2026-05-10' },
          ].map((ev, i) => (
            <div key={i} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
              <div>
                <div className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-1 font-mono">{ev.event}</div>
                <div className="text-sm font-black text-slate-900 italic">{ev.customer}</div>
              </div>
              <div className="text-right">
                <div className="font-black text-slate-900 text-sm">{ev.amount}</div>
                <div className="text-[9px] text-slate-400 font-bold mt-1">{ev.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Cash Flow ── */
function CashFlowTab() {
  const maxVal = Math.max(...CASHFLOW_MONTHS.flatMap(m => [m.income, m.expense]));

  return (
    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10">
      <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter mb-8">Plynnosc Finansowa — 2026</h3>
      <div className="flex items-end gap-6 h-48 mb-8">
        {CASHFLOW_MONTHS.map(m => (
          <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-full flex gap-1 items-end" style={{ height: '160px' }}>
              <div
                className="flex-1 bg-emerald-400 rounded-t-lg transition-all"
                style={{ height: `${(m.income / maxVal) * 100}%` }}
                title={`Przychody: ${m.income.toLocaleString('pl-PL')} PLN`}
              />
              <div
                className="flex-1 bg-rose-400 rounded-t-lg transition-all"
                style={{ height: `${(m.expense / maxVal) * 100}%` }}
                title={`Wydatki: ${m.expense.toLocaleString('pl-PL')} PLN`}
              />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.month}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-6 pt-6 border-t border-slate-50">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-emerald-400 rounded-sm" />
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Przychody</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-rose-400 rounded-sm" />
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Wydatki</span>
        </div>
        <div className="ml-auto text-right">
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Net (Maj)</div>
          <div className={`text-xl font-black italic ${(16200 - 17300) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {(16200 - 17300).toLocaleString('pl-PL')} PLN
          </div>
        </div>
      </div>
    </div>
  );
}
