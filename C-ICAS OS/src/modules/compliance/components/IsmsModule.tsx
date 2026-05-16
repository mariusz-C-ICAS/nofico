/**
 * Data: 2026-05-14
 * Ścieżka: /src/modules/compliance/components/IsmsModule.tsx
 */
import React, { useState } from 'react';
import {
  ShieldCheck, ShieldAlert, FileText, Server, Users, Building2,
  ClipboardCheck, AlertTriangle, CheckCircle2, Clock, ChevronRight,
  Lock, Activity, Award, BarChart3
} from 'lucide-react';
import { motion } from 'motion/react';

type IsmsTab = 'overview' | 'policies' | 'assets' | 'risk' | 'incidents' | 'audits' | 'status';

type ControlStatus = 'Implemented' | 'Partial' | 'Not Implemented';

interface Control {
  id: string;
  name: string;
  section: string;
  status: ControlStatus;
  owner: string;
}

const CONTROLS: Control[] = [
  { id: 'A.5.1', name: 'Polityki bezpieczeństwa informacji', section: 'A.5 Organizational', status: 'Implemented', owner: 'CISO' },
  { id: 'A.5.2', name: 'Role i odpowiedzialności', section: 'A.5 Organizational', status: 'Implemented', owner: 'CISO' },
  { id: 'A.5.3', name: 'Segregacja obowiązków', section: 'A.5 Organizational', status: 'Partial', owner: 'HR' },
  { id: 'A.5.4', name: 'Odpowiedzialność zarządu', section: 'A.5 Organizational', status: 'Implemented', owner: 'Board' },
  { id: 'A.6.1', name: 'Weryfikacja przed zatrudnieniem', section: 'A.6 People', status: 'Implemented', owner: 'HR' },
  { id: 'A.6.2', name: 'Szkolenia z bezpieczeństwa', section: 'A.6 People', status: 'Partial', owner: 'HR' },
  { id: 'A.6.3', name: 'Proces dyscyplinarny', section: 'A.6 People', status: 'Implemented', owner: 'HR' },
  { id: 'A.7.1', name: 'Fizyczne strefy bezpieczeństwa', section: 'A.7 Physical', status: 'Implemented', owner: 'Facilities' },
  { id: 'A.7.2', name: 'Kontrola dostępu fizycznego', section: 'A.7 Physical', status: 'Implemented', owner: 'Security' },
  { id: 'A.7.3', name: 'Ochrona przed zagrożeniami środowiskowymi', section: 'A.7 Physical', status: 'Partial', owner: 'IT' },
  { id: 'A.8.1', name: 'Zarządzanie urządzeniami końcowymi', section: 'A.8 Technological', status: 'Implemented', owner: 'IT' },
  { id: 'A.8.2', name: 'Uprzywilejowany dostęp', section: 'A.8 Technological', status: 'Partial', owner: 'IT' },
  { id: 'A.8.3', name: 'Ograniczenie dostępu do informacji', section: 'A.8 Technological', status: 'Implemented', owner: 'IT' },
  { id: 'A.8.4', name: 'Dostęp do kodu źródłowego', section: 'A.8 Technological', status: 'Not Implemented', owner: 'Dev' },
  { id: 'A.8.5', name: 'Bezpieczne uwierzytelnianie', section: 'A.8 Technological', status: 'Implemented', owner: 'IT' },
];

const STATUS_CONFIG: Record<ControlStatus, { color: string; bg: string; icon: React.ReactNode }> = {
  'Implemented': { color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100', icon: <CheckCircle2 size={14} /> },
  'Partial': { color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100', icon: <Clock size={14} /> },
  'Not Implemented': { color: 'text-rose-600', bg: 'bg-rose-50 border-rose-100', icon: <AlertTriangle size={14} /> },
};

const TABS: { id: IsmsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Przegląd', icon: <BarChart3 size={14} /> },
  { id: 'policies', label: 'Polityki', icon: <FileText size={14} /> },
  { id: 'assets', label: 'Zasoby Informacyjne', icon: <Server size={14} /> },
  { id: 'risk', label: 'Zarządzanie Ryzykiem', icon: <ShieldAlert size={14} /> },
  { id: 'incidents', label: 'Incydenty', icon: <AlertTriangle size={14} /> },
  { id: 'audits', label: 'Audyty', icon: <ClipboardCheck size={14} /> },
  { id: 'status', label: 'SOC2/ISO Status', icon: <Award size={14} /> },
];

function complianceScore(controls: Control[]) {
  const impl = controls.filter(c => c.status === 'Implemented').length;
  const partial = controls.filter(c => c.status === 'Partial').length;
  return Math.round(((impl + partial * 0.5) / controls.length) * 100);
}

function OverviewTab() {
  const score = complianceScore(CONTROLS);
  const sections = ['A.5 Organizational', 'A.6 People', 'A.7 Physical', 'A.8 Technological'];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Wynik ISO 27001', value: `${score}%`, color: 'text-indigo-600', icon: <ShieldCheck size={18} /> },
          { label: 'Ostatni Audyt', value: '2026-02-15', color: 'text-slate-700', icon: <ClipboardCheck size={18} /> },
          { label: 'Niezgodności', value: '3', color: 'text-rose-600', icon: <AlertTriangle size={18} /> },
          { label: 'Wynik Ryzyka', value: 'Średni', color: 'text-amber-600', icon: <Activity size={18} /> },
        ].map(m => (
          <div key={m.label} className="bg-white rounded-[2rem] border border-slate-100 p-7 shadow-sm flex items-center gap-5">
            <div className="bg-slate-50 p-3 rounded-2xl text-slate-500">{m.icon}</div>
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{m.label}</div>
              <div className={`text-xl font-black italic ${m.color}`}>{m.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter mb-1">Kontrole ISO 27001</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Wynik zgodności: {score}%</p>
          </div>
          <div className="w-16 h-16 rounded-full border-4 border-indigo-600 flex items-center justify-center">
            <span className="text-sm font-black text-indigo-600">{score}%</span>
          </div>
        </div>

        {sections.map(section => {
          const sectionControls = CONTROLS.filter(c => c.section === section);
          return (
            <div key={section} className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{section}</div>
                <div className="flex-1 h-px bg-slate-100" />
              </div>
              <div className="space-y-3">
                {sectionControls.map(ctrl => {
                  const cfg = STATUS_CONFIG[ctrl.status];
                  return (
                    <motion.div
                      key={ctrl.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-lg hover:shadow-slate-100 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase w-12">{ctrl.id}</span>
                        <span className="text-sm font-black text-slate-700">{ctrl.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] text-slate-400">{ctrl.owner}</span>
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${cfg.color} ${cfg.bg}`}>
                          {cfg.icon} {ctrl.status}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PoliciesTab() {
  return (
    <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm">
      <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter mb-8">Polityki ISMS</h3>
      <div className="space-y-4">
        {['Polityka Bezpieczeństwa Informacji', 'Polityka Kontroli Dostępu', 'Polityka Klasyfikacji Danych', 'Polityka Incydentów', 'Polityka BYOD'].map(p => (
          <div key={p} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-4">
              <FileText size={16} className="text-indigo-600" />
              <span className="text-sm font-black text-slate-700">{p}</span>
            </div>
            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full uppercase tracking-widest">Aktywna</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AssetsTab() {
  const assets = [
    { id: 'AST-001', name: 'Serwer ERP', type: 'Hardware', owner: 'IT', classification: 'Poufne', risk: 'High' },
    { id: 'AST-002', name: 'Baza danych CRM', type: 'Software', owner: 'Sales', classification: 'Ściśle Tajne', risk: 'Critical' },
    { id: 'AST-003', name: 'Repozytorium Git', type: 'Software', owner: 'Dev', classification: 'Poufne', risk: 'Medium' },
    { id: 'AST-004', name: 'Dokumentacja HR', type: 'Data', owner: 'HR', classification: 'Ściśle Tajne', risk: 'High' },
    { id: 'AST-005', name: 'Sieć biurowa LAN', type: 'Network', owner: 'IT', classification: 'Wewnętrzne', risk: 'Medium' },
  ];
  return (
    <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm">
      <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter mb-8">Rejestr Zasobów Informacyjnych</h3>
      <div className="space-y-3">
        {assets.map(a => (
          <div key={a.id} className="grid grid-cols-6 gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100 items-center">
            <span className="text-[10px] font-black text-slate-400 uppercase">{a.id}</span>
            <span className="text-sm font-black text-slate-700 col-span-2">{a.name}</span>
            <span className="text-[10px] font-black text-slate-500">{a.type}</span>
            <span className="text-[10px] font-black text-slate-500">{a.classification}</span>
            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full text-center ${a.risk === 'Critical' ? 'bg-rose-50 text-rose-600 border border-rose-100' : a.risk === 'High' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>{a.risk}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function IncidentsTab() {
  const incidents = [
    { id: 'INC-2026-001', title: 'Podejrzany login z Rosji', severity: 'High', status: 'Closed', date: '2026-04-10' },
    { id: 'INC-2026-002', title: 'Phishing na pracownika HR', severity: 'Critical', status: 'In Progress', date: '2026-05-01' },
    { id: 'INC-2026-003', title: 'Utrata klucza dostępu', severity: 'Medium', status: 'Closed', date: '2026-03-22' },
  ];
  return (
    <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm">
      <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter mb-8">Rejestr Incydentów</h3>
      <div className="space-y-4">
        {incidents.map(inc => (
          <div key={inc.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100">
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{inc.id} — {inc.date}</div>
              <div className="text-sm font-black text-slate-700">{inc.title}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${inc.severity === 'Critical' ? 'bg-rose-50 text-rose-600 border border-rose-100' : inc.severity === 'High' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>{inc.severity}</span>
              <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${inc.status === 'Closed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>{inc.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuditsTab() {
  const audits = [
    { id: 'AUD-2026-01', name: 'Audyt Wewnętrzny ISO 27001', date: '2026-02-15', auditor: 'Jan Kowalski', status: 'Completed', findings: 3 },
    { id: 'AUD-2025-04', name: 'Audyt Certyfikacyjny', date: '2025-11-20', auditor: 'TUV Rheinland', status: 'Completed', findings: 1 },
    { id: 'AUD-2026-02', name: 'Audyt Nadzoru', date: '2026-11-20', auditor: 'TUV Rheinland', status: 'Planned', findings: 0 },
  ];
  return (
    <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm">
      <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter mb-8">Harmonogram Audytów</h3>
      <div className="space-y-4">
        {audits.map(a => (
          <div key={a.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100">
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{a.id} — {a.date}</div>
              <div className="text-sm font-black text-slate-700">{a.name}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Audytor: {a.auditor}</div>
            </div>
            <div className="flex items-center gap-3">
              {a.findings > 0 && <span className="text-[10px] font-black text-rose-600 bg-rose-50 border border-rose-100 px-3 py-1.5 rounded-full uppercase tracking-widest">{a.findings} ustalenia</span>}
              <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${a.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-500'}`}>{a.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusTab() {
  const certs = [
    { name: 'ISO 27001:2022', status: 'Certified', validUntil: '2027-11-20', body: 'TUV Rheinland', score: 94 },
    { name: 'SOC 2 Type II', status: 'In Progress', validUntil: '—', body: 'KPMG', score: 72 },
    { name: 'ISO 27701 (Privacy)', status: 'Planned', validUntil: '—', body: '—', score: 40 },
  ];
  return (
    <div className="space-y-6">
      {certs.map(c => (
        <div key={c.name} className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{c.body}</div>
              <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">{c.name}</h3>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ważny do</div>
                <div className="text-sm font-black text-slate-700">{c.validUntil}</div>
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full ${c.status === 'Certified' ? 'bg-emerald-600 text-white' : c.status === 'In Progress' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-slate-100 text-slate-500'}`}>{c.status}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-600 rounded-full transition-all" style={{ width: `${c.score}%` }} />
            </div>
            <span className="text-sm font-black text-indigo-600">{c.score}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}

const TAB_COMPONENTS: Record<IsmsTab, React.ReactNode> = {
  overview: <OverviewTab />,
  policies: <PoliciesTab />,
  assets: <AssetsTab />,
  risk: <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm"><p className="text-slate-400 font-black text-sm">Przejdź do Rejestru Ryzyk po pełne zarządzanie.</p></div>,
  incidents: <IncidentsTab />,
  audits: <AuditsTab />,
  status: <StatusTab />,
};

export default function IsmsModule() {
  const [activeTab, setActiveTab] = useState<IsmsTab>('overview');

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-200">
              <Lock className="text-white" size={18} />
            </div>
            <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">ISMS — ISO 27001</h2>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Information Security Management System</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full flex items-center gap-2">
            <Award size={12} /> Certyfikat Aktywny
          </div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-50'}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {TAB_COMPONENTS[activeTab]}
      </motion.div>
    </div>
  );
}
