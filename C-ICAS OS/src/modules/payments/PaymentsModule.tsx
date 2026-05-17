/**
 * Data: 2026-05-17
 * Zmiany: Zastąpiono mock data Firestore (subscriptions, invoices, expenses, cashflow, payuTransactions).
 * Ścieżka: /src/modules/payments/PaymentsModule.tsx
 */
import React, { useState, useEffect } from 'react';
import {
  CreditCard, TrendingUp, ArrowDownCircle, ArrowUpCircle,
  DollarSign, Users, AlertCircle, ExternalLink, CheckCircle2,
  Clock, XCircle, BarChart3, Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../../shared/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useAuth } from '../../shared/hooks/AuthContext';

type PaymentsTab = 'subscriptions' | 'incoming' | 'outgoing' | 'payu' | 'cashflow';

interface Subscription {
  id: string;
  tenant: string;
  plan: string;
  seats: number;
  mrr: number;
  renewal: string;
  status: string;
}

interface Invoice {
  id: string;
  tenant: string;
  amount: number;
  issued: string;
  due: string;
  status: string;
  method: string;
}

interface Expense {
  id: string;
  vendor: string;
  amount: number;
  date: string;
  category: string;
  status: string;
}

interface CashflowMonth {
  month: string;
  income: number;
  expense: number;
}

interface PayuTransaction {
  orderId: string;
  customer: string;
  amount: number;
  status: string;
  time: string;
}

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
const PLAN_BG: Record<string, string> = {
  'Free': 'bg-slate-400',
  'Starter': 'bg-indigo-500',
  'Pro': 'bg-emerald-600',
  'Enterprise': 'bg-indigo-600',
};

export default function PaymentsModuleUI() {
  const { activeTenantId } = useAuth() as any;
  const [activeTab, setActiveTab] = useState<PaymentsTab>('subscriptions');
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cashflow, setCashflow] = useState<CashflowMonth[]>([]);
  const [payuTxs, setPayuTxs] = useState<PayuTransaction[]>([]);

  useEffect(() => {
    if (!activeTenantId) return;
    const base = `tenants/${activeTenantId}`;
    Promise.all([
      getDocs(collection(db, `${base}/subscriptions`)),
      getDocs(collection(db, `${base}/invoices`)),
      getDocs(collection(db, `${base}/expenses`)),
      getDocs(collection(db, `${base}/cashflow`)),
      getDocs(collection(db, `${base}/payuTransactions`)),
    ]).then(([subSnap, invSnap, expSnap, cfSnap, payuSnap]) => {
      setSubscriptions(subSnap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Subscription, 'id'>) })));
      setInvoices(invSnap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Invoice, 'id'>) })));
      setExpenses(expSnap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Expense, 'id'>) })));
      setCashflow(cfSnap.docs.map(d => d.data() as CashflowMonth));
      setPayuTxs(payuSnap.docs.map(d => d.data() as PayuTransaction));
    });
  }, [activeTenantId]);

  const tabs: { id: PaymentsTab; label: string; icon: React.ElementType }[] = [
    { id: 'subscriptions', label: 'Subskrypcje', icon: Users },
    { id: 'incoming', label: 'Platnosci Przychodzace', icon: ArrowDownCircle },
    { id: 'outgoing', label: 'Platnosci Wychodzace', icon: ArrowUpCircle },
    { id: 'payu', label: 'Rozliczenia PayU', icon: CreditCard },
    { id: 'cashflow', label: 'Plynnosc', icon: TrendingUp },
  ];

  const mrr = subscriptions.filter(s => s.status === 'Aktywna').reduce((acc, s) => acc + s.mrr, 0);
  const overdue = invoices.filter(i => i.status === 'Przeterminowana').reduce((acc, i) => acc + i.amount, 0);
  const cash = invoices.filter(i => i.status === 'Oplacona').reduce((acc, i) => acc + i.amount, 0)
    - expenses.filter(e => e.status === 'Oplacona').reduce((acc, e) => acc + e.amount, 0);

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
              <p className="text-slate-400 font-medium text-sm italic">Subskrypcje, faktury, rozliczenia PayU i analiza plynnosci finansowej.</p>
            </div>
            <div className="flex flex-wrap gap-4">
              {[
                { label: 'MRR', value: `${mrr.toLocaleString('pl-PL')} PLN`, icon: DollarSign, color: 'text-emerald-400' },
                { label: 'Zaleglosci', value: `${overdue.toLocaleString('pl-PL')} PLN`, icon: AlertCircle, color: 'text-rose-400' },
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
            {activeTab === 'subscriptions' && <SubscriptionsTab subscriptions={subscriptions} />}
            {activeTab === 'incoming' && <IncomingTab invoices={invoices} />}
            {activeTab === 'outgoing' && <OutgoingTab expenses={expenses} />}
            {activeTab === 'payu' && <PayuTab transactions={payuTxs} />}
            {activeTab === 'cashflow' && <CashFlowTab cashflow={cashflow} />}
          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  );
}

/* ── Subscriptions ── */
function SubscriptionsTab({ subscriptions }: { subscriptions: Subscription[] }) {
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
      {subscriptions.length === 0 ? (
        <div className="text-center py-12">
          <Users size={32} className="mx-auto text-slate-200 mb-3" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Brak subskrypcji</p>
        </div>
      ) : (
        <div className="space-y-4">
          {subscriptions.map(s => (
            <div key={s.id} className="flex items-center justify-between p-7 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all">
              <div className="flex items-center gap-5">
                <div className={`w-12 h-12 ${PLAN_BG[s.plan] ?? 'bg-slate-500'} rounded-xl flex items-center justify-center`}>
                  <Users size={20} className="text-white" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.id}</div>
                  <div className="text-base font-black text-slate-900 italic">{s.tenant}</div>
                  <div className="text-[10px] text-slate-400 font-bold mt-1">{s.seats} uzytkownikow • odnowienie: {s.renewal}</div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${PLAN_COLORS[s.plan] ?? 'bg-slate-100 text-slate-600'}`}>{s.plan}</span>
                <div className="text-right">
                  <div className="text-lg font-black text-slate-900 italic">{s.mrr.toLocaleString('pl-PL')} PLN</div>
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">/miesiac</div>
                </div>
                <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                  s.status === 'Aktywna' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}>{s.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Incoming ── */
function IncomingTab({ invoices }: { invoices: Invoice[] }) {
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
            {invoices.map(inv => {
              const StatusIcon = INV_STATUS_ICON[inv.status] ?? Clock;
              return (
                <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-6 font-black text-indigo-600 italic">{inv.id}</td>
                  <td className="py-4 px-6 font-black text-slate-900">{inv.tenant}</td>
                  <td className="py-4 px-6 font-black text-slate-900">{inv.amount.toLocaleString('pl-PL')} PLN</td>
                  <td className="py-4 px-6 text-slate-400 font-bold">{inv.issued}</td>
                  <td className="py-4 px-6 text-slate-500 font-bold">{inv.due}</td>
                  <td className="py-4 px-6">
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[9px] font-black uppercase">{inv.method}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${INV_STATUS_COLORS[inv.status] ?? 'bg-slate-50 text-slate-600'}`}>
                      <StatusIcon size={10} />
                      {inv.status}
                    </span>
                  </td>
                </tr>
              );
            })}
            {invoices.length === 0 && (
              <tr><td colSpan={7} className="py-12 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Brak faktur</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Outgoing ── */
function OutgoingTab({ expenses }: { expenses: Expense[] }) {
  const total = expenses.reduce((acc, e) => acc + e.amount, 0);

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
              {expenses.map(exp => (
                <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-6 font-black text-indigo-600 italic">{exp.id}</td>
                  <td className="py-4 px-6 font-black text-slate-900">{exp.vendor}</td>
                  <td className="py-4 px-6 font-black text-slate-900">{exp.amount.toLocaleString('pl-PL')} PLN</td>
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
              {expenses.length === 0 && (
                <tr><td colSpan={6} className="py-12 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Brak wydatków</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── PayU ── */
function PayuTab({ transactions }: { transactions: PayuTransaction[] }) {
  const completed = transactions.filter(t => t.status === 'COMPLETED');
  const totalAmount = completed.reduce((acc, t) => acc + t.amount, 0);
  const rejectedPct = transactions.length > 0
    ? ((transactions.filter(t => t.status === 'REJECTED').length / transactions.length) * 100).toFixed(1)
    : '0.0';
  const avgValue = completed.length > 0 ? Math.round(totalAmount / completed.length) : 0;

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 rounded-[3rem] p-12 text-white border border-slate-800">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
                <CreditCard size={18} className="text-white" />
              </div>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter">PayU Dashboard</h3>
            </div>
            <p className="text-slate-400 text-sm font-bold">Integracja PayU REST API — sklep: c-icas.gg</p>
          </div>
          <button className="bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest px-8 py-4 rounded-2xl flex items-center gap-2 hover:bg-emerald-500 transition-all">
            <ExternalLink size={14} /> PayU Panel
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Obrót miesięczny', value: `${totalAmount.toLocaleString('pl-PL')} PLN` },
            { label: 'Transakcje', value: String(transactions.length) },
            { label: 'Odmowy płatności', value: `${rejectedPct}%` },
            { label: 'Avg wartość', value: `${avgValue.toLocaleString('pl-PL')} PLN` },
          ].map(m => (
            <div key={m.label} className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{m.label}</div>
              <div className="text-xl font-black italic text-white">{m.value}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10">
        <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter mb-6">Ostatnie transakcje PayU</h3>
        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard size={32} className="mx-auto text-slate-200 mb-3" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Brak transakcji</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((ev, i) => (
              <div key={ev.orderId ?? i} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <div className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1 font-mono">{ev.orderId}</div>
                  <div className="text-sm font-black text-slate-900 italic">{ev.customer}</div>
                </div>
                <div className="text-right flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                    ev.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' :
                    ev.status === 'REJECTED' ? 'bg-rose-50 text-rose-600' :
                    'bg-amber-50 text-amber-600'
                  }`}>{ev.status}</span>
                  <div>
                    <div className="font-black text-slate-900 text-sm">{ev.amount.toLocaleString('pl-PL')} PLN</div>
                    <div className="text-[9px] text-slate-400 font-bold mt-1">{ev.time}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Cash Flow ── */
function CashFlowTab({ cashflow }: { cashflow: CashflowMonth[] }) {
  const maxVal = cashflow.length > 0 ? Math.max(...cashflow.flatMap(m => [m.income, m.expense])) : 1;
  const lastMonth = cashflow[cashflow.length - 1];
  const net = lastMonth ? lastMonth.income - lastMonth.expense : 0;

  return (
    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10">
      <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter mb-8">Plynnosc Finansowa</h3>
      {cashflow.length === 0 ? (
        <div className="text-center py-12">
          <TrendingUp size={32} className="mx-auto text-slate-200 mb-3" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Brak danych cashflow</p>
        </div>
      ) : (
        <>
          <div className="flex items-end gap-6 h-48 mb-8">
            {cashflow.map(m => (
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
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Net ({lastMonth?.month ?? '—'})</div>
              <div className={`text-xl font-black italic ${net < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {net.toLocaleString('pl-PL')} PLN
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
