/**
 * Data: 2026-05-15
 * Sciezka: /src/modules/expenses/ExpensesModule.tsx
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Receipt, Plus, Check, X, Mic, Upload,
  Clock, DollarSign, User, Filter,
  CheckCircle, XCircle, AlertCircle, Banknote, CreditCard,
} from 'lucide-react';
import ExpenseApprovalCard, { type PendingExpense } from './components/ExpenseApprovalCard';

// ─── Types ──────────────────────────────────────────────────────────────────

type ExpenseStatus = 'pending' | 'approved' | 'rejected';
type ExpensesTab = 'moje' | 'akceptacja' | 'historia' | 'nowy' | 'rozliczenia';

interface SettlementItem {
  id: string;
  employee: string;
  department: string;
  items: { desc: string; amount: number; date: string; category: string }[];
  total: number;
  status: 'pending' | 'settled';
  settledAt?: string;
}

interface MyExpense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  status: ExpenseStatus;
}

interface NewExpenseForm {
  description: string;
  amount: string;
  date: string;
  category: string;
  project: string;
  voiceNote: string;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_MY_EXPENSES: MyExpense[] = [
  { id: 'm1', description: 'Paliwo — delegacja Krakow', amount: 285.40, date: '2026-05-12', category: 'Transport', status: 'approved' },
  { id: 'm2', description: 'Hotel Marriott — konferencja', amount: 620.00, date: '2026-05-10', category: 'Noclegi', status: 'pending' },
  { id: 'm3', description: 'Lunch z klientem PKO BP', amount: 195.00, date: '2026-05-08', category: 'Reprezentacja', status: 'approved' },
  { id: 'm4', description: 'Narzedzia — zestaw kluczy', amount: 340.00, date: '2026-05-05', category: 'Wyposazenie', status: 'rejected' },
  { id: 'm5', description: 'Kurs React Advanced — Udemy', amount: 149.00, date: '2026-05-02', category: 'Szkolenia', status: 'pending' },
];

const MOCK_PENDING: PendingExpense[] = [
  { id: 'p1', employee: 'Anna Kowalska', department: 'Sprzedaz', submittedAt: '2026-05-14', category: 'Transport', project: 'PRJ-2024', amount: 410.50, description: 'Bilet lotniczy Warszawa–Berlin', note: '' },
  { id: 'p2', employee: 'Tomasz Wrobel', department: 'IT', submittedAt: '2026-05-13', category: 'Wyposazenie', project: 'IT-INFRA', amount: 1290.00, description: 'Monitor 27" do home office', note: '' },
  { id: 'p3', employee: 'Karolina Nowak', department: 'Marketing', submittedAt: '2026-05-12', category: 'Reprezentacja', project: 'MKT-Q2', amount: 530.00, description: 'Kolacja partnerska z agencja', note: '' },
];

const MOCK_HISTORY: MyExpense[] = [
  { id: 'h1', description: 'Toner do drukarki', amount: 89.00, date: '2026-04-28', category: 'Biuro', status: 'approved' },
  { id: 'h2', description: 'Taxi — klient Wroclaw', amount: 127.00, date: '2026-04-22', category: 'Transport', status: 'approved' },
  { id: 'h3', description: 'Szkolenie BHP online', amount: 0.00, date: '2026-04-15', category: 'Szkolenia', status: 'approved' },
];

const CATEGORIES = ['Transport', 'Noclegi', 'Reprezentacja', 'Wyposazenie', 'Szkolenia', 'Biuro', 'Inne'];
const PROJECTS = ['PRJ-2024', 'IT-INFRA', 'MKT-Q2', 'HR-ONBOARDING', 'BRAK (ogolny)'];

const MOCK_SETTLEMENTS: SettlementItem[] = [
  { id: 's1', employee: 'Anna Kowalska', department: 'Sprzedaz', status: 'pending', total: 695.50,
    items: [
      { desc: 'Bilet lotniczy Warszawa–Berlin', amount: 410.50, date: '2026-05-14', category: 'Transport' },
      { desc: 'Parking lotnisko — 2 dni', amount: 285.00, date: '2026-05-14', category: 'Transport' },
    ] },
  { id: 's2', employee: 'Tomasz Wrobel', department: 'IT', status: 'pending', total: 1290.00,
    items: [{ desc: 'Monitor 27" do home office', amount: 1290.00, date: '2026-05-13', category: 'Wyposazenie' }] },
  { id: 's3', employee: 'Karolina Nowak', department: 'Marketing', status: 'settled', settledAt: '2026-05-10', total: 530.00,
    items: [{ desc: 'Kolacja partnerska z agencja', amount: 530.00, date: '2026-05-09', category: 'Reprezentacja' }] },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ExpenseStatus }) {
  const cfg = {
    pending:  { icon: Clock,        label: 'Oczekuje',    cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    approved: { icon: CheckCircle,  label: 'Zatwierdzone', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    rejected: { icon: XCircle,      label: 'Odrzucone',   cls: 'bg-rose-50 text-rose-600 border-rose-200' },
  }[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${cfg.cls}`}>
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

function ExpenseRow({ expense }: { expense: MyExpense }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all group"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-slate-100 group-hover:bg-indigo-50 rounded-2xl flex items-center justify-center transition-colors">
          <Receipt size={16} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
        </div>
        <div>
          <p className="text-sm font-black text-slate-800 uppercase italic tracking-tight">{expense.description}</p>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{expense.date} &middot; {expense.category}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-base font-black text-slate-900">
          {expense.amount.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN
        </span>
        <StatusBadge status={expense.status} />
      </div>
    </motion.div>
  );
}

// ─── Tab: Moje ───────────────────────────────────────────────────────────────

function TabMoje({ expenses }: { expenses: MyExpense[] }) {
  const [filter, setFilter] = useState<ExpenseStatus | 'all'>('all');

  const filtered = filter === 'all' ? expenses : expenses.filter(e => e.status === filter);

  return (
    <div className="space-y-6">
      {/* Filtr */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
          <Filter size={11} /> Filtr:
        </div>
        {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          >
            {f === 'all' ? 'Wszystkie' : f === 'pending' ? 'Oczekuje' : f === 'approved' ? 'Zatwierdzone' : 'Odrzucone'}
          </button>
        ))}
      </div>

      <AnimatePresence mode="popLayout">
        {filtered.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-40 flex items-center justify-center text-slate-300 text-[10px] font-black uppercase tracking-widest"
          >
            Brak wnioskow dla wybranego filtra
          </motion.div>
        ) : (
          filtered.map(e => <ExpenseRow key={e.id} expense={e} />)
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Tab: Akceptacja ─────────────────────────────────────────────────────────

function TabAkceptacja({
  pending,
  onApprove,
  onReject,
}: {
  pending: PendingExpense[];
  onApprove: (id: string, comment: string) => void;
  onReject: (id: string, comment: string) => void;
}) {
  if (pending.length === 0) {
    return (
      <div className="h-60 flex flex-col items-center justify-center gap-4">
        <CheckCircle size={48} className="text-emerald-200" />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Brak wnioskow do zatwierdzenia
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AnimatePresence mode="popLayout">
        {pending.map(expense => (
          <ExpenseApprovalCard
            key={expense.id}
            expense={expense}
            onApprove={onApprove}
            onReject={onReject}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Tab: Historia ────────────────────────────────────────────────────────────

function TabHistoria() {
  return (
    <div className="space-y-3">
      {MOCK_HISTORY.map(e => <ExpenseRow key={e.id} expense={e} />)}
    </div>
  );
}

// ─── Tab: Nowy Wniosek ───────────────────────────────────────────────────────

interface TabNowyProps {
  onSubmit: (expense: MyExpense) => void;
  onSwitchToMoje: () => void;
}

function TabNowy({ onSubmit, onSwitchToMoje }: TabNowyProps) {
  const [form, setForm] = useState<NewExpenseForm>({
    description: '', amount: '', date: new Date().toISOString().split('T')[0],
    category: '', project: '', voiceNote: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof NewExpenseForm, string>>>({});
  const [recording, setRecording] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (k: keyof NewExpenseForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const startRecording = () => {
    setRecording(true);
    setTimeout(() => {
      setRecording(false);
      setForm(f => ({ ...f, voiceNote: 'Zakup paliwa na stacji BP przy autostradzie A1, delegacja do klienta w Lodzi, kwota 285 zlotych 40 groszy.' }));
    }, 3000);
  };

  const validate = () => {
    const e: typeof errors = {};
    if (!form.description.trim()) e.description = 'Opis jest wymagany';
    if (!form.amount || parseFloat(form.amount) <= 0) e.amount = 'Kwota musi byc wieksza od 0';
    if (!form.category) e.category = 'Wybierz kategorie';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    const newExpense: MyExpense = {
      id: `m${Date.now()}`,
      description: form.description,
      amount: parseFloat(form.amount),
      date: form.date,
      category: form.category,
      status: 'pending',
    };
    onSubmit(newExpense);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onSwitchToMoje();
    }, 1200);
  };

  const fieldCls = (k: keyof NewExpenseForm) =>
    `w-full bg-slate-50 border rounded-2xl px-4 py-3 text-sm font-black text-slate-800 placeholder:text-slate-300 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all ${errors[k] ? 'border-rose-300 focus:border-rose-400' : 'border-slate-200 focus:border-indigo-300'}`;

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">

      {/* Opis */}
      <div>
        <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">
          Opis wydatku *
        </label>
        <input
          type="text"
          value={form.description}
          onChange={set('description')}
          placeholder="np. Paliwo — delegacja Krakow"
          className={fieldCls('description')}
        />
        {errors.description && <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mt-1">{errors.description}</p>}
      </div>

      {/* Kwota + Data */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">
            Kwota PLN *
          </label>
          <div className="relative">
            <DollarSign size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={set('amount')}
              placeholder="0.00"
              className={`${fieldCls('amount')} pl-10`}
            />
          </div>
          {errors.amount && <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mt-1">{errors.amount}</p>}
        </div>
        <div>
          <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">
            Data
          </label>
          <input
            type="date"
            value={form.date}
            onChange={set('date')}
            className={fieldCls('date')}
          />
        </div>
      </div>

      {/* Kategoria + Projekt */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">
            Kategoria *
          </label>
          <select value={form.category} onChange={set('category')} className={fieldCls('category')}>
            <option value="">Wybierz...</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {errors.category && <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mt-1">{errors.category}</p>}
        </div>
        <div>
          <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">
            Projekt / MPK
          </label>
          <select value={form.project} onChange={set('project')} className={fieldCls('project')}>
            <option value="">Wybierz...</option>
            {PROJECTS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* Upload faktury */}
      <div>
        <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">
          Zdjecie faktury
        </label>
        <label className="flex items-center justify-center gap-3 w-full border-2 border-dashed border-slate-200 bg-slate-50 rounded-2xl py-6 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group">
          <Upload size={18} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover:text-indigo-500 transition-colors">
            Przeciagnij lub kliknij aby wybrac plik
          </span>
          <input type="file" accept="image/*,application/pdf" className="hidden" />
        </label>
      </div>

      {/* Notatka glosowa */}
      <div>
        <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">
          Notatka glosowa
        </label>
        <div className="flex gap-3 mb-3">
          <button
            type="button"
            onClick={startRecording}
            disabled={recording}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${recording ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-900 text-white hover:bg-indigo-600'}`}
          >
            <Mic size={13} />
            {recording ? 'Nagrywanie...' : 'Nagraj notatke'}
          </button>
          {recording && <span className="flex items-center text-[9px] font-black text-rose-500 uppercase tracking-widest animate-pulse">Slucham...</span>}
        </div>
        {form.voiceNote && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <textarea
              value={form.voiceNote}
              onChange={set('voiceNote')}
              rows={3}
              className="w-full bg-indigo-50 border border-indigo-200 rounded-2xl px-4 py-3 text-sm font-black text-indigo-900 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
            />
            <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mt-1">Transkrypcja AI — mozesz edytowac</p>
          </motion.div>
        )}
      </div>

      {/* Submit */}
      <div className="pt-2">
        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl py-4"
            >
              <CheckCircle size={18} className="text-emerald-600" />
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                Wniosek zlozony — przekierowanie...
              </span>
            </motion.div>
          ) : (
            <motion.button
              key="btn"
              type="submit"
              whileTap={{ scale: 0.97 }}
              className="flex items-center justify-center gap-3 w-full bg-slate-900 hover:bg-indigo-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-slate-200"
            >
              <Plus size={14} />
              Zloz wniosek
            </motion.button>
          )}
        </AnimatePresence>
      </div>

    </form>
  );
}

// ─── Tab: Rozliczenia (Settlement Tracker) ───────────────────────────────────

function TabRozliczenia({
  items,
  onSettle,
}: {
  items: SettlementItem[];
  onSettle: (id: string) => void;
}) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'settled'>('all');
  const filtered = filter === 'all' ? items : items.filter(s => s.status === filter);
  const pendingTotal = items.filter(s => s.status === 'pending').reduce((sum, s) => sum + s.total, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Filtr:</span>
          {(['all', 'pending', 'settled'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
              {f === 'all' ? 'Wszystkie' : f === 'pending' ? 'Do wypłaty' : 'Wypłacone'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-2.5">
          <Banknote size={14} className="text-amber-600" />
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">
            Do wypłaty: {pendingTotal.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN
          </span>
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        {filtered.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="h-40 flex items-center justify-center text-slate-300 text-[10px] font-black uppercase tracking-widest">
            Brak rozliczen
          </motion.div>
        ) : filtered.map(s => (
          <motion.div key={s.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center">
                  <User size={15} className="text-indigo-500" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-800 uppercase italic tracking-tight">{s.employee}</p>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.department}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-lg font-black text-slate-900">{s.total.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN</span>
                {s.status === 'pending' ? (
                  <button onClick={() => onSettle(s.id)}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-200">
                    <CreditCard size={12} /> Wypłać
                  </button>
                ) : (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full text-[9px] font-black uppercase tracking-widest">
                    <CheckCircle size={10} /> Wypłacono {s.settledAt}
                  </span>
                )}
              </div>
            </div>
            <div className="p-4 space-y-2">
              {s.items.map((it, i) => (
                <div key={i} className="flex items-center justify-between text-[10px]">
                  <span className="font-black text-slate-600 uppercase tracking-wide">{it.desc}</span>
                  <span className="font-black text-slate-400">{it.date} · {it.amount.toFixed(2)} PLN · {it.category}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Module ──────────────────────────────────────────────────────────────

const TABS: { id: ExpensesTab; label: string; icon: React.ElementType }[] = [
  { id: 'moje',         label: 'Moje wnioski', icon: User     },
  { id: 'akceptacja',   label: 'Akceptacja',   icon: Check    },
  { id: 'rozliczenia',  label: 'Rozliczenia',  icon: Banknote },
  { id: 'historia',     label: 'Historia',     icon: Clock    },
  { id: 'nowy',         label: 'Nowy wniosek', icon: Plus     },
];

export default function ExpensesModule() {
  const [activeTab, setActiveTab] = useState<ExpensesTab>('moje');
  const [myExpenses, setMyExpenses] = useState<MyExpense[]>(MOCK_MY_EXPENSES);
  const [pending, setPending] = useState<PendingExpense[]>(MOCK_PENDING);
  const [settlements, setSettlements] = useState<SettlementItem[]>(MOCK_SETTLEMENTS);

  const pendingCount = pending.length;
  const pendingSettlements = settlements.filter(s => s.status === 'pending').length;

  const handleApprove = (id: string, _comment: string) => {
    setPending(p => p.filter(e => e.id !== id));
  };

  const handleReject = (id: string, _comment: string) => {
    setPending(p => p.filter(e => e.id !== id));
  };

  const handleNewExpense = (expense: MyExpense) => {
    setMyExpenses(prev => [expense, ...prev]);
  };

  const handleSettle = (id: string) => {
    const today = new Date().toISOString().split('T')[0];
    setSettlements(prev => prev.map(s => s.id === id ? { ...s, status: 'settled', settledAt: today } : s));
  };

  const stats = [
    { label: 'Moje wnioski',     value: myExpenses.length,                        unit: 'szt.',  color: 'text-slate-900' },
    { label: 'Do zatwierdzenia', value: pendingCount,                              unit: 'szt.',  color: 'text-amber-600' },
    { label: 'Do wyplaty',       value: pendingSettlements,                        unit: 'szt.',  color: 'text-indigo-600' },
    { label: 'Wyplacone',        value: `${myExpenses.filter(e => e.status === 'approved').reduce((s, e) => s + e.amount, 0).toFixed(0)}`, unit: 'PLN', color: 'text-emerald-600' },
  ];

  return (
    <div className="max-w-[1600px] mx-auto p-10 space-y-10 animate-in fade-in duration-500">

      {/* Header */}
      <div className="bg-slate-900 rounded-[3rem] p-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative overflow-hidden shadow-2xl shadow-slate-200">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div>
          <div className="flex items-center gap-4 mb-3">
            <div className="bg-indigo-600 p-3 rounded-[1.5rem] shadow-lg shadow-indigo-900/40">
              <Receipt className="text-white" size={22} />
            </div>
            <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">
              Wydatki Out-of-Pocket
            </h1>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">
            Modul Rozliczen Pracowniczych — C-ICAS OS V5
          </p>
        </div>

        {/* Stats */}
        <div className="flex gap-6 flex-wrap">
          {stats.map(s => (
            <div key={s.label} className="text-right">
              <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">{s.unit}</p>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xl shadow-slate-200'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              <Icon size={13} />
              {tab.label}
              {tab.id === 'akceptacja' && pendingCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-500 rounded-full text-[8px] font-black text-white flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
              {tab.id === 'rozliczenia' && pendingSettlements > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-indigo-500 rounded-full text-[8px] font-black text-white flex items-center justify-center">
                  {pendingSettlements}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {activeTab === 'moje' && <TabMoje expenses={myExpenses} />}
          {activeTab === 'akceptacja' && (
            <TabAkceptacja
              pending={pending}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          )}
          {activeTab === 'rozliczenia' && (
            <TabRozliczenia items={settlements} onSettle={handleSettle} />
          )}
          {activeTab === 'historia' && <TabHistoria />}
          {activeTab === 'nowy' && (
            <TabNowy
              onSubmit={handleNewExpense}
              onSwitchToMoje={() => setActiveTab('moje')}
            />
          )}
        </motion.div>
      </AnimatePresence>

    </div>
  );
}
