/**
 * Data: 2026-05-14
 * Ścieżka: /src/modules/compliance/components/ConsentManager.tsx
 */
import React, { useState } from 'react';
import {
  ToggleLeft, ToggleRight, History, Settings, UserCheck,
  UserX, Mail, Globe, FileText, BarChart3, Plus, Trash2
} from 'lucide-react';
import { motion } from 'motion/react';

type ConsentTab = 'active' | 'history' | 'config';
type ConsentType = 'Marketing' | 'Cookies' | 'Newsletter' | 'Data Sharing';
type ConsentChannel = 'web' | 'paper' | 'email';

interface ConsentRecord {
  id: string;
  subject: string;
  email: string;
  type: ConsentType;
  dateGiven: string;
  channel: ConsentChannel;
  active: boolean;
}

const MOCK_CONSENTS: ConsentRecord[] = [
  { id: 'CON-001', subject: 'Jan Kowalski', email: 'jan.kowalski@example.com', type: 'Marketing', dateGiven: '2026-01-15', channel: 'web', active: true },
  { id: 'CON-002', subject: 'Anna Nowak', email: 'anna.nowak@example.com', type: 'Newsletter', dateGiven: '2026-02-10', channel: 'email', active: true },
  { id: 'CON-003', subject: 'Piotr Wiśniewski', email: 'piotr.w@example.com', type: 'Cookies', dateGiven: '2026-03-05', channel: 'web', active: true },
  { id: 'CON-004', subject: 'Maria Wójcik', email: 'maria.wojcik@example.com', type: 'Data Sharing', dateGiven: '2026-01-20', channel: 'paper', active: false },
  { id: 'CON-005', subject: 'Tomasz Kaczmarek', email: 'tkaczmarek@example.com', type: 'Marketing', dateGiven: '2026-04-01', channel: 'web', active: true },
  { id: 'CON-006', subject: 'Katarzyna Zielińska', email: 'kzielinska@example.com', type: 'Newsletter', dateGiven: '2026-04-15', channel: 'email', active: true },
  { id: 'CON-007', subject: 'Robert Szymański', email: 'rszymanski@example.com', type: 'Marketing', dateGiven: '2025-12-01', channel: 'web', active: false },
  { id: 'CON-008', subject: 'Alicja Dąbrowska', email: 'adabrowska@example.com', type: 'Cookies', dateGiven: '2026-05-01', channel: 'web', active: true },
  { id: 'CON-009', subject: 'Marcin Lewandowski', email: 'mlewandowski@example.com', type: 'Data Sharing', dateGiven: '2026-03-20', channel: 'paper', active: true },
  { id: 'CON-010', subject: 'Zofia Kamińska', email: 'zkaminska@example.com', type: 'Newsletter', dateGiven: '2026-05-10', channel: 'email', active: true },
];

const TYPE_CFG: Record<ConsentType, string> = {
  Marketing: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
  Cookies: 'bg-amber-50 text-amber-600 border border-amber-100',
  Newsletter: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
  'Data Sharing': 'bg-rose-50 text-rose-600 border border-rose-100',
};

const CHANNEL_ICON: Record<ConsentChannel, React.ReactNode> = {
  web: <Globe size={12} />,
  paper: <FileText size={12} />,
  email: <Mail size={12} />,
};

const HISTORY_EVENTS = [
  { date: '2026-05-10', subject: 'Zofia Kamińska', action: 'Udzielono zgody', type: 'Newsletter', by: 'System (web)' },
  { date: '2026-05-01', subject: 'Alicja Dąbrowska', action: 'Udzielono zgody', type: 'Cookies', by: 'System (web)' },
  { date: '2026-04-20', subject: 'Robert Szymański', action: 'Cofnięto zgodę', type: 'Marketing', by: 'Użytkownik' },
  { date: '2026-04-15', subject: 'Katarzyna Zielińska', action: 'Udzielono zgody', type: 'Newsletter', by: 'System (email)' },
  { date: '2026-04-01', subject: 'Tomasz Kaczmarek', action: 'Udzielono zgody', type: 'Marketing', by: 'System (web)' },
  { date: '2026-02-15', subject: 'Maria Wójcik', action: 'Cofnięto zgodę', type: 'Data Sharing', by: 'Admin (Anna Nowak)' },
];

interface ConsentTypeConfig {
  id: string;
  name: ConsentType;
  description: string;
  required: boolean;
  active: boolean;
}

const DEFAULT_CONFIG: ConsentTypeConfig[] = [
  { id: 'c1', name: 'Marketing', description: 'Zgoda na otrzymywanie materiałów marketingowych drogą elektroniczną.', required: false, active: true },
  { id: 'c2', name: 'Newsletter', description: 'Subskrypcja biuletynu informacyjnego C-ICAS.', required: false, active: true },
  { id: 'c3', name: 'Cookies', description: 'Zgoda na wykorzystanie plików cookie analitycznych i marketingowych.', required: false, active: true },
  { id: 'c4', name: 'Data Sharing', description: 'Udostępnianie danych partnerom handlowym w celach analitycznych.', required: false, active: true },
];

const TABS: { id: ConsentTab; label: string; icon: React.ReactNode }[] = [
  { id: 'active', label: 'Zgody Aktywne', icon: <UserCheck size={14} /> },
  { id: 'history', label: 'Historia', icon: <History size={14} /> },
  { id: 'config', label: 'Konfiguracja', icon: <Settings size={14} /> },
];

function ActiveTab({ consents, onRevoke }: { consents: ConsentRecord[]; onRevoke: (id: string) => void }) {
  const active = consents.filter(c => c.active);
  const marketing = consents.filter(c => c.type === 'Marketing' && c.active).length;
  const newsletter = consents.filter(c => c.type === 'Newsletter' && c.active).length;
  const total = consents.filter(c => c.active).length;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-3 gap-6">
        {[
          { label: 'Łącznie Aktywnych', value: total, color: 'text-indigo-600' },
          { label: 'Marketing', value: `${total > 0 ? Math.round(marketing / total * 100) : 0}%`, color: 'text-emerald-600' },
          { label: 'Newsletter', value: `${total > 0 ? Math.round(newsletter / total * 100) : 0}%`, color: 'text-amber-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-[2rem] border border-slate-100 p-7 shadow-sm">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{s.label}</div>
            <div className={`text-3xl font-black italic ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-7 border-b border-slate-100">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{active.length} aktywnych zgód</span>
        </div>
        <div className="divide-y divide-slate-50">
          {active.map(c => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-between px-8 py-6 hover:bg-slate-50 transition-all"
            >
              <div className="flex-1 grid grid-cols-4 gap-4 items-center">
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{c.id}</div>
                  <div className="text-sm font-black text-slate-700">{c.subject}</div>
                  <div className="text-[10px] text-slate-400">{c.email}</div>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full w-fit ${TYPE_CFG[c.type]}`}>{c.type}</span>
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Data / Kanał</div>
                  <div className="text-[11px] font-black text-slate-600">{c.dateGiven}</div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                    {CHANNEL_ICON[c.channel]} {c.channel}
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => onRevoke(c.id)}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 border border-rose-100 px-4 py-2 rounded-full hover:bg-rose-100 transition-all"
                  >
                    <UserX size={12} /> Cofnij Zgodę
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HistoryTab() {
  return (
    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-8 border-b border-slate-100">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dziennik Zmian Zgód</h3>
      </div>
      <div className="divide-y divide-slate-50">
        {HISTORY_EVENTS.map((ev, i) => (
          <div key={i} className="px-8 py-5 flex items-center gap-6 hover:bg-slate-50 transition-all">
            <div className="w-24 text-[10px] font-black text-slate-400 shrink-0">{ev.date}</div>
            <div className="flex-1">
              <span className="text-sm font-black text-slate-700">{ev.subject}</span>
              <span className="text-slate-400 mx-2">—</span>
              <span className={`text-[10px] font-black ${ev.action.includes('Cofnięto') ? 'text-rose-600' : 'text-emerald-600'}`}>{ev.action}</span>
            </div>
            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${TYPE_CFG[ev.type as ConsentType]}`}>{ev.type}</span>
            <span className="text-[10px] text-slate-400 w-32 text-right">{ev.by}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConfigTab() {
  const [config, setConfig] = useState<ConsentTypeConfig[]>(DEFAULT_CONFIG);

  function toggle(id: string) {
    setConfig(prev => prev.map(c => c.id === id ? { ...c, active: !c.active } : c));
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Typy Zgód</h3>
          <button className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all">
            <Plus size={14} /> Dodaj Typ
          </button>
        </div>
        <div className="space-y-4">
          {config.map(c => (
            <div key={c.id} className="flex items-start justify-between p-7 bg-slate-50 rounded-3xl border border-slate-100">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${TYPE_CFG[c.name]}`}>{c.name}</span>
                  {c.required && <span className="text-[10px] font-black text-slate-500 bg-slate-200 px-2 py-1 rounded-full uppercase tracking-widest">Wymagana</span>}
                </div>
                <p className="text-[11px] text-slate-500">{c.description}</p>
              </div>
              <div className="flex items-center gap-3 ml-6">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{c.active ? 'Aktywna' : 'Nieaktywna'}</span>
                <button onClick={() => toggle(c.id)} className="transition-all">
                  {c.active
                    ? <ToggleRight size={28} className="text-indigo-600" />
                    : <ToggleLeft size={28} className="text-slate-300" />}
                </button>
                <button className="p-2 rounded-xl hover:bg-rose-50 transition-all">
                  <Trash2 size={14} className="text-rose-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ConsentManager() {
  const [activeTab, setActiveTab] = useState<ConsentTab>('active');
  const [consents, setConsents] = useState<ConsentRecord[]>(MOCK_CONSENTS);

  function handleRevoke(id: string) {
    setConsents(prev => prev.map(c => c.id === id ? { ...c, active: false } : c));
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-emerald-600 p-2 rounded-xl shadow-lg shadow-emerald-200">
              <UserCheck className="text-white" size={18} />
            </div>
            <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Menedżer Zgód</h2>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Consent Management — Art. 7 RODO</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white border border-slate-100 rounded-2xl px-6 py-3 shadow-sm">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Aktywnych Zgód</div>
            <div className="text-lg font-black text-indigo-600 italic">{consents.filter(c => c.active).length}</div>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-50'}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {activeTab === 'active' && <ActiveTab consents={consents} onRevoke={handleRevoke} />}
        {activeTab === 'history' && <HistoryTab />}
        {activeTab === 'config' && <ConfigTab />}
      </motion.div>
    </div>
  );
}
