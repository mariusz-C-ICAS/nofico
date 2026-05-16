/**
 * Data: 2026-05-14
 * Ścieżka: /src/modules/crm/portal/CustomerPortalModule.tsx
 * Opis: Portal samoobsługowy klienta — projekty, faktury, dokumenty, komunikacja, support.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, FolderOpen, FileText, FolderArchive,
  MessageSquare, Headphones, Settings, LogOut, Bell,
  Download, Send, Plus, ChevronRight, ExternalLink,
  CheckCircle, Clock, AlertCircle, XCircle, ArrowUpRight,
  Paperclip, User, Building2
} from 'lucide-react';

// --- TYPES ---
type Tab = 'dashboard' | 'projects' | 'invoices' | 'documents' | 'messages' | 'support' | 'account';

// --- MOCK DATA ---
const customer = {
  name: 'Acme Corporation Sp. z o.o.',
  short: 'Acme Corp',
  logo: 'AC',
  manager: 'Mariusz Czaja',
  managerEmail: 'marius@c-icas.gg',
  since: '2024-03-15',
};

const projects = [
  { id: 'PRJ-001', name: 'Wdrożenie ERP', status: 'active', progress: 68, deadline: '2026-07-31', pm: 'Anna Nowak' },
  { id: 'PRJ-002', name: 'Audyt IT Infrastruktury', status: 'done', progress: 100, deadline: '2026-04-30', pm: 'Tomasz Wróbel' },
  { id: 'PRJ-003', name: 'Migracja do Chmury', status: 'pending', progress: 12, deadline: '2026-09-15', pm: 'Mariusz Czaja' },
];

const invoices = [
  { id: 'FV/2026/05/042', amount: '18 400 PLN', date: '2026-05-01', due: '2026-05-15', status: 'overdue' },
  { id: 'FV/2026/04/031', amount: '24 800 PLN', date: '2026-04-01', due: '2026-04-30', status: 'paid' },
  { id: 'FV/2026/03/019', amount: '11 200 PLN', date: '2026-03-01', due: '2026-03-31', status: 'paid' },
  { id: 'FV/2026/02/008', amount: '32 000 PLN', date: '2026-02-01', due: '2026-02-28', status: 'paid' },
];

const documents = [
  { name: 'Umowa Ramowa 2024', type: 'PDF', size: '2.4 MB', date: '2024-03-15', category: 'Kontrakty' },
  { name: 'Protokół Odbioru — Audyt IT', type: 'PDF', size: '0.8 MB', date: '2026-04-30', category: 'Protokoły' },
  { name: 'Specyfikacja ERP v2.1', type: 'DOCX', size: '1.2 MB', date: '2026-02-10', category: 'Specyfikacje' },
  { name: 'NDA — C-ICAS & Acme', type: 'PDF', size: '0.3 MB', date: '2024-03-10', category: 'Kontrakty' },
];

const messages = [
  { id: 1, from: 'manager', name: 'Mariusz Czaja', text: 'Dzień dobry! Raport z audytu został wysłany — proszę sprawdzić zakładkę Dokumenty.', time: '09:15', date: 'Dziś' },
  { id: 2, from: 'client', name: 'Jan Kowalski', text: 'Dziękuję, sprawdziłem. Mam pytanie dot. faktury FV/2026/05/042 — czy termin płatności można przesunąć?', time: '10:32', date: 'Dziś' },
  { id: 3, from: 'manager', name: 'Mariusz Czaja', text: 'Oczywiście, mogę wystawić korektę z nowym terminem. Proszę potwierdzić do kiedy.', time: '10:48', date: 'Dziś' },
];

const tickets = [
  { id: 'TKT-0018', title: 'Problem z dostępem do raportu ERP', status: 'open', priority: 'high', created: '2026-05-13' },
  { id: 'TKT-0014', title: 'Pytanie o harmonogram wdrożenia', status: 'resolved', priority: 'low', created: '2026-05-02' },
];

// --- HELPERS ---
const statusConfig: Record<string, { label: string; color: string; icon: React.FC<any> }> = {
  active: { label: 'W toku', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20', icon: Clock },
  done: { label: 'Ukończony', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle },
  pending: { label: 'Oczekuje', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: AlertCircle },
  paid: { label: 'Zapłacona', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle },
  overdue: { label: 'Przeterminowana', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20', icon: XCircle },
  open: { label: 'Otwarte', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: AlertCircle },
  resolved: { label: 'Rozwiązane', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle },
};

const StatusPill = ({ status }: { status: string }) => {
  const cfg = statusConfig[status] ?? statusConfig.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${cfg.color}`}>
      <cfg.icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
};

// --- TAB PANELS ---
const DashboardPanel = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[
        { label: 'Aktywne Projekty', value: '2', sub: '1 oczekuje na start', icon: FolderOpen, color: 'indigo' },
        { label: 'Niezapłacone Faktury', value: '18 400 PLN', sub: '1 faktura przeterminowana', icon: FileText, color: 'rose' },
        { label: 'Otwarte Tickety', value: '1', sub: '1 wysoki priorytet', icon: Headphones, color: 'amber' },
      ].map(card => (
        <div key={card.label} className={`bg-slate-800/40 rounded-[1.25rem] border border-white/5 p-5`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">{card.label}</span>
            <card.icon className="w-4 h-4 text-slate-500" />
          </div>
          <p className="text-2xl font-black text-white tracking-tighter">{card.value}</p>
          <p className="text-slate-500 text-xs mt-1">{card.sub}</p>
        </div>
      ))}
    </div>

    <div className="bg-slate-800/40 rounded-[1.25rem] border border-white/5 p-5">
      <h3 className="text-white font-black uppercase italic tracking-tighter mb-4 text-sm">Ostatnie Aktywności</h3>
      <div className="space-y-3">
        {[
          { text: 'Dokument "Protokół Odbioru — Audyt IT" dostępny', time: '30 kwi 2026' },
          { text: 'Wystawiono fakturę FV/2026/05/042 na kwotę 18 400 PLN', time: '1 maj 2026' },
          { text: 'Ticket TKT-0018 "Problem z dostępem" zarejestrowany', time: '13 maj 2026' },
          { text: 'Wiadomość od opiekuna konta: Mariusz Czaja', time: 'Dziś, 09:15' },
        ].map((a, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
            <div className="flex-1 flex items-center justify-between">
              <p className="text-slate-300 text-sm">{a.text}</p>
              <span className="text-slate-600 text-xs ml-4 whitespace-nowrap">{a.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const ProjectsPanel = () => (
  <div className="space-y-4">
    {projects.map((p, i) => (
      <motion.div
        key={p.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.06 }}
        className="bg-slate-800/40 rounded-[1.25rem] border border-white/5 p-5"
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-indigo-400 text-xs font-bold">{p.id}</span>
              <StatusPill status={p.status} />
            </div>
            <h4 className="text-white font-black text-lg tracking-tighter">{p.name}</h4>
          </div>
          <ExternalLink className="w-4 h-4 text-slate-600 flex-shrink-0 mt-1" />
        </div>
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-500">Postęp</span>
            <span className="text-slate-300 font-bold">{p.progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{ width: `${p.progress}%` }}
            />
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1"><User className="w-3 h-3" /> PM: {p.pm}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Termin: {p.deadline}</span>
        </div>
      </motion.div>
    ))}
  </div>
);

const InvoicesPanel = () => (
  <div className="space-y-3">
    {invoices.map((inv, i) => (
      <div key={inv.id} className="bg-slate-800/40 rounded-[1.25rem] border border-white/5 p-4 flex items-center gap-4">
        <div className="bg-slate-700/50 p-2.5 rounded-xl flex-shrink-0">
          <FileText className="w-4 h-4 text-slate-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm">{inv.id}</p>
          <p className="text-slate-500 text-xs">Wystawiona: {inv.date} · Termin: {inv.due}</p>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-white font-black text-base tracking-tighter">{inv.amount}</p>
          <StatusPill status={inv.status} />
          <button className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors">
            <Download className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>
    ))}
  </div>
);

const DocumentsPanel = () => (
  <div className="space-y-3">
    {documents.map((doc, i) => (
      <div key={i} className="bg-slate-800/40 rounded-[1.25rem] border border-white/5 p-4 flex items-center gap-4">
        <div className="bg-indigo-500/10 p-2.5 rounded-xl flex-shrink-0 border border-indigo-500/20">
          <Paperclip className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm">{doc.name}</p>
          <p className="text-slate-500 text-xs">{doc.category} · {doc.size} · {doc.date}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-700 text-slate-400 border border-white/10">{doc.type}</span>
          <button className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
            <Download className="w-3.5 h-3.5" /> Pobierz
          </button>
        </div>
      </div>
    ))}
  </div>
);

const MessagesPanel = () => {
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState(messages);

  return (
    <div className="bg-slate-800/40 rounded-[1.25rem] border border-white/5 flex flex-col" style={{ height: '480px' }}>
      <div className="p-4 border-b border-white/5 flex items-center gap-3">
        <div className="bg-indigo-500/20 w-8 h-8 rounded-full flex items-center justify-center text-indigo-400 font-black text-sm">MC</div>
        <div>
          <p className="text-white font-bold text-sm">Mariusz Czaja</p>
          <p className="text-slate-500 text-xs">Opiekun konta · {customer.managerEmail}</p>
        </div>
        <div className="ml-auto w-2 h-2 rounded-full bg-emerald-400" title="Online" />
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {msgs.map(msg => (
          <div key={msg.id} className={`flex ${msg.from === 'client' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] ${msg.from === 'client' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
              <span className="text-slate-600 text-[10px] px-1">{msg.name} · {msg.time}</span>
              <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.from === 'client'
                  ? 'bg-indigo-600 text-white rounded-br-sm'
                  : 'bg-slate-700 text-slate-200 rounded-bl-sm border border-white/5'
              }`}>
                {msg.text}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="p-4 border-t border-white/5 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && input.trim()) {
              setMsgs(prev => [...prev, { id: Date.now(), from: 'client', name: 'Ja', text: input, time: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }), date: 'Dziś' }]);
              setInput('');
            }
          }}
          placeholder="Wpisz wiadomość..."
          className="flex-1 bg-slate-700/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 transition-colors"
        />
        <button className="bg-indigo-600 hover:bg-indigo-500 text-white p-2.5 rounded-xl transition-colors">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const SupportPanel = () => {
  const [showNew, setShowNew] = useState(false);
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowNew(!showNew)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> Nowy Ticket
        </button>
      </div>
      {showNew && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/40 rounded-[1.25rem] border border-indigo-500/20 p-5 space-y-3"
        >
          <h4 className="text-white font-bold text-sm">Nowe Zgłoszenie</h4>
          <input className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 transition-colors" placeholder="Tytuł zgłoszenia" />
          <textarea className="w-full bg-slate-700/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 transition-colors resize-none h-24" placeholder="Opis problemu..." />
          <div className="flex gap-2">
            <button className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-4 py-2 rounded-xl transition-colors">Wyślij</button>
            <button onClick={() => setShowNew(false)} className="bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold text-sm px-4 py-2 rounded-xl transition-colors">Anuluj</button>
          </div>
        </motion.div>
      )}
      {tickets.map((t, i) => (
        <div key={t.id} className="bg-slate-800/40 rounded-[1.25rem] border border-white/5 p-4 flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-indigo-400 text-xs font-bold">{t.id}</span>
              <StatusPill status={t.status} />
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${t.priority === 'high' ? 'text-rose-400 border-rose-500/30 bg-rose-500/10' : 'text-slate-500 border-slate-600'}`}>
                {t.priority === 'high' ? 'WYSOKI' : 'NISKI'}
              </span>
            </div>
            <p className="text-white font-semibold text-sm">{t.title}</p>
            <p className="text-slate-600 text-xs mt-0.5">Zgłoszono: {t.created}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </div>
      ))}
    </div>
  );
};

const AccountPanel = () => (
  <div className="space-y-5">
    <div className="bg-slate-800/40 rounded-[1.25rem] border border-white/5 p-5">
      <h3 className="text-white font-black uppercase italic tracking-tighter mb-4 text-sm">Dane Firmy</h3>
      {[
        { label: 'Nazwa', value: customer.name },
        { label: 'Opiekun konta', value: customer.manager },
        { label: 'Email opiekuna', value: customer.managerEmail },
        { label: 'Klient od', value: customer.since },
      ].map(f => (
        <div key={f.label} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
          <span className="text-slate-500 text-sm">{f.label}</span>
          <span className="text-slate-200 text-sm font-semibold">{f.value}</span>
        </div>
      ))}
    </div>
    <div className="bg-slate-800/40 rounded-[1.25rem] border border-white/5 p-5">
      <h3 className="text-white font-black uppercase italic tracking-tighter mb-4 text-sm">Powiadomienia</h3>
      {[
        { label: 'Nowe faktury', enabled: true },
        { label: 'Zmiany statusu projektu', enabled: true },
        { label: 'Odpowiedzi na tickety', enabled: true },
        { label: 'Newsletter C-ICAS', enabled: false },
      ].map(n => (
        <div key={n.label} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
          <span className="text-slate-400 text-sm">{n.label}</span>
          <div className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${n.enabled ? 'bg-indigo-600' : 'bg-slate-700'}`}>
            <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.75 transition-all ${n.enabled ? 'left-5' : 'left-0.75'}`} style={{ top: '3px', left: n.enabled ? '22px' : '3px' }} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// --- NAVIGATION ---
const NAV: { key: Tab; label: string; icon: React.FC<any> }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'projects', label: 'Projekty', icon: FolderOpen },
  { key: 'invoices', label: 'Faktury', icon: FileText },
  { key: 'documents', label: 'Dokumenty', icon: FolderArchive },
  { key: 'messages', label: 'Wiadomości', icon: MessageSquare },
  { key: 'support', label: 'Support', icon: Headphones },
  { key: 'account', label: 'Konto', icon: Settings },
];

// --- MAIN ---
export default function CustomerPortalModule() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* SIDEBAR */}
      <aside className="fixed left-0 top-0 bottom-0 w-72 bg-slate-900 border-r border-white/5 flex flex-col z-40">
        {/* Brand */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-sm italic">CI</div>
            <div>
              <p className="text-white font-black text-sm uppercase italic tracking-tighter leading-none">Portal Klienta</p>
              <p className="text-indigo-400 text-[10px] font-semibold">C-ICAS OS</p>
            </div>
          </div>
          {/* Customer logo card */}
          <div className="bg-slate-800/60 rounded-2xl p-4 border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-xl border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-sm">
                {customer.logo}
              </div>
              <div className="min-w-0">
                <p className="text-white font-bold text-sm truncate">{customer.short}</p>
                <p className="text-slate-500 text-[10px]">Klient premium</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-white/5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <p className="text-slate-500 text-[10px]">Opiekun: <span className="text-slate-300">{customer.manager}</span></p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAV.map(item => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left ${
                activeTab === item.key
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
              {item.key === 'invoices' && (
                <span className="ml-auto text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1.5 py-0.5 rounded-full">1</span>
              )}
              {item.key === 'support' && (
                <span className="ml-auto text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-full">1</span>
              )}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/5">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-400 hover:bg-slate-800 transition-colors">
            <LogOut className="w-4 h-4" /> Wyloguj
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="ml-72 flex-1 min-h-screen">
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur border-b border-white/5 px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-white font-black uppercase italic tracking-tighter text-xl leading-none">
              {NAV.find(n => n.key === activeTab)?.label}
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">Portal Klienta · {customer.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500" />
            </button>
            <div className="flex items-center gap-2 bg-slate-800/60 rounded-xl px-3 py-2 border border-white/5">
              <div className="w-6 h-6 bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400 font-black text-[10px]">JK</div>
              <span className="text-slate-300 text-xs font-semibold">Jan Kowalski</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Welcome banner (only on dashboard) */}
          {activeTab === 'dashboard' && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900 rounded-[1.75rem] border border-indigo-500/20 p-6 mb-6 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-indigo-500/20 rounded-2xl border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-xl">
                  {customer.logo}
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Witaj w Portalu Klienta</p>
                  <h2 className="text-white font-black text-2xl uppercase italic tracking-tighter">{customer.short}</h2>
                  <p className="text-indigo-400 text-xs mt-0.5">Opiekun: {customer.manager} · {customer.managerEmail}</p>
                </div>
                <button className="ml-auto flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-colors">
                  <MessageSquare className="w-4 h-4" /> Napisz do opiekuna
                </button>
              </div>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {activeTab === 'dashboard' && <DashboardPanel />}
              {activeTab === 'projects' && <ProjectsPanel />}
              {activeTab === 'invoices' && <InvoicesPanel />}
              {activeTab === 'documents' && <DocumentsPanel />}
              {activeTab === 'messages' && <MessagesPanel />}
              {activeTab === 'support' && <SupportPanel />}
              {activeTab === 'account' && <AccountPanel />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
