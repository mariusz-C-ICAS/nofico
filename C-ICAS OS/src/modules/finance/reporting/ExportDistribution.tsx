/**
 * Data: 2026-05-15
 * Zmiany: Eksport i dystrybucja danych dla ksiegowej (ZIP/CSV/XML/XLSX/FEC/GoBD, Drive, OneDrive, NAS).
 * Sciezka: /src/modules/finance/reporting/ExportDistribution.tsx
 */
import React, { useState } from 'react';
import {
  Download, Send, Calendar, HardDrive, Cloud,
  Mail, CheckCircle2, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
type ExportFormat = 'ZIP' | 'CSV' | 'XML (JPK-VAT)' | 'XLSX' | 'FEC' | 'GoBD';
type DateRange = 'Miesiac' | 'Kwartal' | 'Rok';
type ChannelId = 'email' | 'gdrive' | 'onedrive' | 'nas';

interface Channel {
  id: ChannelId;
  label: string;
  icon: React.ElementType;
  detail: string;
  active: boolean;
}

interface HistoryEntry {
  id: string;
  date: string;
  format: string;
  channel: string;
  status: 'ok' | 'error';
}

// --- Constants ---
const FORMATS: ExportFormat[] = ['ZIP', 'CSV', 'XML (JPK-VAT)', 'XLSX', 'FEC', 'GoBD'];
const DATE_RANGES: DateRange[] = ['Miesiac', 'Kwartal', 'Rok'];

const CONTENT_OPTIONS = [
  { key: 'invoices', label: 'Faktury' },
  { key: 'bank', label: 'Wyciagi bankowe' },
  { key: 'vat', label: 'Rejestr VAT' },
  { key: 'kpir', label: 'KPiR' },
  { key: 'mpk', label: 'Zestawienie MPK' },
];

const MOCK_HISTORY: HistoryEntry[] = [
  { id: 'exp-001', date: '2026-05-01', format: 'XML (JPK-VAT)', channel: 'Email', status: 'ok' },
  { id: 'exp-002', date: '2026-04-01', format: 'XLSX', channel: 'Google Drive', status: 'ok' },
  { id: 'exp-003', date: '2026-03-01', format: 'ZIP', channel: 'OneDrive', status: 'error' },
  { id: 'exp-004', date: '2026-02-01', format: 'CSV', channel: 'NAS', status: 'ok' },
];

// --- Sub-components ---
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm">
      <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter mb-8">{title}</h3>
      {children}
    </div>
  );
}

// --- Section 1: Export File ---
function ExportSection() {
  const [range, setRange] = useState<DateRange>('Miesiac');
  const [format, setFormat] = useState<ExportFormat>('XML (JPK-VAT)');
  const [content, setContent] = useState<Record<string, boolean>>({ invoices: true, vat: true });
  const [generating, setGenerating] = useState(false);
  const [ready, setReady] = useState(false);

  const toggleContent = (key: string) =>
    setContent(prev => ({ ...prev, [key]: !prev[key] }));

  const handleGenerate = () => {
    setGenerating(true);
    setReady(false);
    setTimeout(() => {
      setGenerating(false);
      setReady(true);
    }, 2500);
  };

  return (
    <SectionCard title="Eksport pliku">
      <div className="space-y-6">
        {/* Date range */}
        <div>
          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Zakres dat</label>
          <div className="flex gap-2">
            {DATE_RANGES.map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-5 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all
                  ${range === r ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Format */}
        <div>
          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Format</label>
          <div className="relative">
            <select
              value={format}
              onChange={e => setFormat(e.target.value as ExportFormat)}
              className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-[11px] font-black text-slate-900 uppercase tracking-tight pr-10 focus:outline-none focus:border-indigo-400"
            >
              {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Content checkboxes */}
        <div>
          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Zawartosc</label>
          <div className="grid grid-cols-2 gap-2">
            {CONTENT_OPTIONS.map(opt => (
              <label key={opt.key} className="flex items-center gap-2 cursor-pointer p-3 rounded-xl hover:bg-slate-50 transition-all">
                <input
                  type="checkbox"
                  checked={!!content[opt.key]}
                  onChange={() => toggleContent(opt.key)}
                  className="w-4 h-4 rounded accent-indigo-600"
                />
                <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full bg-indigo-600 text-white py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 transition-all"
        >
          {generating ? 'Generowanie...' : 'Generuj paczke'}
        </button>

        <AnimatePresence>
          {ready && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-between p-5 bg-emerald-50 border border-emerald-200 rounded-2xl"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 size={20} className="text-emerald-600" />
                <span className="text-[11px] font-black text-emerald-800 uppercase tracking-tight">
                  Gotowe — {format} ({range})
                </span>
              </div>
              <button className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all">
                <Download size={14} /> Pobierz
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SectionCard>
  );
}

// --- Section 2: Distribution Channels ---
function DistributionSection() {
  const [channels, setChannels] = useState<Channel[]>([
    { id: 'email', label: 'Email (token URL)', icon: Mail, detail: 'ksiegowa@firma.pl', active: true },
    { id: 'gdrive', label: 'Google Drive', icon: Cloud, detail: '/Finanse/Eksporty', active: true },
    { id: 'onedrive', label: 'OneDrive', icon: HardDrive, detail: 'Shared/Accounting', active: false },
    { id: 'nas', label: 'NAS (IP/path)', icon: HardDrive, detail: '192.168.1.50/exports', active: false },
  ]);

  const toggle = (id: ChannelId) =>
    setChannels(prev => prev.map(c => c.id === id ? { ...c, active: !c.active } : c));

  return (
    <SectionCard title="Dystrybucja automatyczna">
      <div className="space-y-4">
        <div className="bg-indigo-50 rounded-2xl px-5 py-3 border border-indigo-100 flex items-center gap-3">
          <Calendar size={16} className="text-indigo-600 shrink-0" />
          <span className="text-[10px] font-black text-indigo-800 uppercase tracking-tight">
            Harmonogram: 1. dzien miesiaca o 6:00
          </span>
        </div>

        {channels.map(ch => (
          <div
            key={ch.id}
            className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${ch.active ? 'bg-indigo-100' : 'bg-slate-100'}`}>
                <ch.icon size={20} className={ch.active ? 'text-indigo-600' : 'text-slate-400'} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{ch.label}</p>
                <p className="text-[9px] text-slate-400 mt-0.5 font-mono">{ch.detail}</p>
              </div>
            </div>
            <div
              onClick={() => toggle(ch.id)}
              className={`w-12 h-6 rounded-full cursor-pointer transition-all relative ${ch.active ? 'bg-indigo-600' : 'bg-slate-200'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${ch.active ? 'left-7' : 'left-1'}`} />
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// --- Section 3: History ---
function HistorySection() {
  return (
    <SectionCard title="Historia wysylek">
      <div className="space-y-3">
        {MOCK_HISTORY.map(entry => (
          <div
            key={entry.id}
            className="grid grid-cols-4 items-center gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100"
          >
            <div>
              <p className="text-[10px] font-black text-slate-700 uppercase tracking-tight">{entry.date}</p>
              <p className="text-[8px] text-slate-400 mt-0.5">{entry.id}</p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-tight">{entry.format}</p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-tight">{entry.channel}</p>
            </div>
            <div className="flex justify-end">
              {entry.status === 'ok' ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 text-[8px] font-black uppercase tracking-widest">
                  <CheckCircle2 size={9} /> OK
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-500/10 text-red-700 text-[8px] font-black uppercase tracking-widest">
                  Blad
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// --- Main Export ---
export default function ExportDistribution() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-10">
      {/* Header */}
      <div className="bg-slate-900 rounded-[3rem] px-10 py-8 mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">Eksport & Dystrybucja</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mt-1">
            Financial Data Export for Accountant
          </p>
        </div>
        <div className="flex items-center gap-3 bg-slate-800 px-5 py-3 rounded-2xl">
          <Send size={16} className="text-indigo-400" />
          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Auto-send Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
        <div className="space-y-10">
          <ExportSection />
          <HistorySection />
        </div>
        <DistributionSection />
      </div>
    </div>
  );
}
