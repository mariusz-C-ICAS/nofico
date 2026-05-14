/**
 * Data: 2026-05-14
 * Ścieżka: /src/modules/compliance/components/DpiaManager.tsx
 */
import React, { useState } from 'react';
import {
  FileSearch, Plus, Filter, AlertTriangle, CheckCircle2,
  Clock, XCircle, ChevronDown, Sparkles, User, Shield,
  Database, Globe, Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type RiskLevel = 'Low' | 'Medium' | 'High';
type DpiaStatus = 'Draft' | 'In Review' | 'Approved' | 'Overdue';

interface Dpia {
  id: string;
  name: string;
  activity: string;
  riskLevel: RiskLevel;
  status: DpiaStatus;
  created: string;
  nextReview: string;
  dpo: string;
}

const MOCK_DPIAS: Dpia[] = [
  { id: 'DPIA-001', name: 'System Monitoringu Pracowników', activity: 'Monitoring czasu pracy i aktywności', riskLevel: 'High', status: 'Approved', created: '2026-01-10', nextReview: '2026-07-10', dpo: 'Anna Nowak' },
  { id: 'DPIA-002', name: 'Profilowanie Klientów CRM', activity: 'Analiza zachowań zakupowych', riskLevel: 'Medium', status: 'In Review', created: '2026-03-15', nextReview: '2026-09-15', dpo: 'Anna Nowak' },
  { id: 'DPIA-003', name: 'Transfer Danych do USA', activity: 'Synchronizacja z Salesforce US', riskLevel: 'High', status: 'Overdue', created: '2025-11-01', nextReview: '2026-05-01', dpo: 'Anna Nowak' },
  { id: 'DPIA-004', name: 'Biometria — Kontrola Dostępu', activity: 'Odcisk palca wejście do budynku', riskLevel: 'High', status: 'Draft', created: '2026-05-01', nextReview: '2026-11-01', dpo: 'Nieprzypisany' },
];

const RISK_CFG: Record<RiskLevel, string> = {
  Low: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  Medium: 'bg-amber-50 text-amber-600 border-amber-100',
  High: 'bg-rose-50 text-rose-600 border-rose-100',
};

const STATUS_CFG: Record<DpiaStatus, { cls: string; icon: React.ReactNode }> = {
  Draft: { cls: 'bg-slate-100 text-slate-500', icon: <Clock size={12} /> },
  'In Review': { cls: 'bg-indigo-50 text-indigo-600 border border-indigo-100', icon: <Shield size={12} /> },
  Approved: { cls: 'bg-emerald-50 text-emerald-600 border border-emerald-100', icon: <CheckCircle2 size={12} /> },
  Overdue: { cls: 'bg-rose-50 text-rose-600 border border-rose-100', icon: <AlertTriangle size={12} /> },
};

interface NewDpiaForm {
  name: string;
  activity: string;
  dataSubjects: string[];
  dataCategories: string[];
  purpose: string;
  legalBasis: string;
  processors: string;
  securityMeasures: string;
  likelihood: number;
  impact: number;
  dpoApproval: boolean;
}

const EMPTY_FORM: NewDpiaForm = {
  name: '', activity: '', dataSubjects: [], dataCategories: [],
  purpose: '', legalBasis: '', processors: '', securityMeasures: '',
  likelihood: 3, impact: 3, dpoApproval: false,
};

const DATA_SUBJECTS = ['Pracownicy', 'Klienci', 'Dzieci', 'Pacjenci', 'Kandydaci'];
const DATA_CATEGORIES = ['Dane kontaktowe', 'Dane zdrowotne', 'Dane finansowe', 'Dane biometryczne', 'Dane lokalizacyjne'];
const LEGAL_BASES = ['Art. 6(1)(a) — Zgoda', 'Art. 6(1)(b) — Umowa', 'Art. 6(1)(c) — Obowiązek prawny', 'Art. 6(1)(f) — Prawnie uzasadniony interes'];

export default function DpiaManager() {
  const [dpias] = useState<Dpia[]>(MOCK_DPIAS);
  const [filterRisk, setFilterRisk] = useState<RiskLevel | 'All'>('All');
  const [filterStatus, setFilterStatus] = useState<DpiaStatus | 'All'>('All');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewDpiaForm>(EMPTY_FORM);
  const [aiLoading, setAiLoading] = useState(false);

  const filtered = dpias.filter(d =>
    (filterRisk === 'All' || d.riskLevel === filterRisk) &&
    (filterStatus === 'All' || d.status === filterStatus)
  );

  const riskScore = form.likelihood * form.impact;
  const riskLabel = riskScore <= 6 ? 'Niskie' : riskScore <= 14 ? 'Średnie' : 'Wysokie';
  const riskColor = riskScore <= 6 ? 'text-emerald-600' : riskScore <= 14 ? 'text-amber-600' : 'text-rose-600';

  function toggleMulti<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];
  }

  function handleAiGenerate() {
    setAiLoading(true);
    setTimeout(() => {
      setForm(f => ({
        ...f,
        purpose: 'Monitoring aktywności pracowników w celu optymalizacji procesów pracy i zapewnienia bezpieczeństwa informacji.',
        securityMeasures: 'Szyfrowanie AES-256, kontrola dostępu oparta na rolach, pseudonimizacja danych, regularne audyty.',
        processors: 'C-ICAS Sp. z o.o. (administrator), dostawca oprogramowania (podmiot przetwarzający — DPA podpisana).',
      }));
      setAiLoading(false);
    }, 1500);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-rose-600 p-2 rounded-xl shadow-lg shadow-rose-200">
              <FileSearch className="text-white" size={18} />
            </div>
            <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Menedżer DPIA</h2>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Data Protection Impact Assessments</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-indigo-600 text-white px-8 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-200"
        >
          <Plus size={16} /> Nowa DPIA
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-2xl px-5 py-3">
          <Filter size={14} className="text-slate-400" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ryzyko:</span>
          {(['All', 'Low', 'Medium', 'High'] as const).map(r => (
            <button key={r} onClick={() => setFilterRisk(r)} className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full transition-all ${filterRisk === r ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>{r === 'All' ? 'Wszystkie' : r}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-2xl px-5 py-3">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status:</span>
          {(['All', 'Draft', 'In Review', 'Approved', 'Overdue'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full transition-all ${filterStatus === s ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>{s === 'All' ? 'Wszystkie' : s}</button>
          ))}
        </div>
      </div>

      {/* DPIA List */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{filtered.length} DPIA</span>
        </div>
        <div className="divide-y divide-slate-50">
          {filtered.map(dpia => {
            const sc = STATUS_CFG[dpia.status];
            return (
              <motion.div
                key={dpia.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-8 hover:bg-slate-50 transition-all"
              >
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{dpia.id}</span>
                      <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${RISK_CFG[dpia.riskLevel]} border`}>
                        {dpia.riskLevel}
                      </div>
                    </div>
                    <h4 className="text-base font-black text-slate-900 italic mb-1">{dpia.name}</h4>
                    <p className="text-[11px] text-slate-500 mb-3">{dpia.activity}</p>
                    <div className="flex items-center gap-6">
                      <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Utworzono</div>
                        <div className="text-[11px] font-black text-slate-600">{dpia.created}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Następny Przegląd</div>
                        <div className="text-[11px] font-black text-slate-600">{dpia.nextReview}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">IOD</div>
                        <div className="text-[11px] font-black text-slate-600">{dpia.dpo}</div>
                      </div>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full whitespace-nowrap ${sc.cls}`}>
                    {sc.icon} {dpia.status}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* New DPIA Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-[3rem] shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-10 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Nowa Ocena DPIA</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Ocena Skutków dla Ochrony Danych</p>
                </div>
                <button onClick={() => setShowForm(false)} className="p-3 rounded-2xl hover:bg-slate-100 transition-all">
                  <XCircle size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="p-10 space-y-8">
                {/* AI Button */}
                <button
                  onClick={handleAiGenerate}
                  disabled={aiLoading}
                  className="w-full flex items-center justify-center gap-3 py-5 rounded-3xl border-2 border-dashed border-indigo-200 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all disabled:opacity-50"
                >
                  <Sparkles size={16} />
                  {aiLoading ? 'Generowanie Gemini AI...' : 'Auto-generuj DPIA (Gemini AI)'}
                </button>

                <div className="space-y-5">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nazwa Czynności Przetwarzania</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-700 focus:outline-none focus:border-indigo-400" placeholder="np. System Monitoringu..." />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Kategorie Osób</label>
                    <div className="flex gap-2 flex-wrap">
                      {DATA_SUBJECTS.map(s => (
                        <button key={s} onClick={() => setForm(f => ({ ...f, dataSubjects: toggleMulti(f.dataSubjects, s) }))} className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full border transition-all ${form.dataSubjects.includes(s) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'}`}>{s}</button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Kategorie Danych</label>
                    <div className="flex gap-2 flex-wrap">
                      {DATA_CATEGORIES.map(c => (
                        <button key={c} onClick={() => setForm(f => ({ ...f, dataCategories: toggleMulti(f.dataCategories, c) }))} className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full border transition-all ${form.dataCategories.includes(c) ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-500 border-slate-200 hover:border-rose-300'}`}>{c}</button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Cel i Podstawa Prawna</label>
                    <select value={form.legalBasis} onChange={e => setForm(f => ({ ...f, legalBasis: e.target.value }))} className="w-full border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-700 focus:outline-none focus:border-indigo-400 bg-white mb-3">
                      <option value="">Wybierz podstawę prawną...</option>
                      {LEGAL_BASES.map(lb => <option key={lb} value={lb}>{lb}</option>)}
                    </select>
                    <textarea value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} rows={3} className="w-full border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-700 focus:outline-none focus:border-indigo-400" placeholder="Opisz cel przetwarzania..." />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Podmioty Przetwarzające / Transfery</label>
                    <textarea value={form.processors} onChange={e => setForm(f => ({ ...f, processors: e.target.value }))} rows={2} className="w-full border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-700 focus:outline-none focus:border-indigo-400" placeholder="Lista podmiotów przetwarzających..." />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Środki Bezpieczeństwa</label>
                    <textarea value={form.securityMeasures} onChange={e => setForm(f => ({ ...f, securityMeasures: e.target.value }))} rows={2} className="w-full border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-700 focus:outline-none focus:border-indigo-400" placeholder="Szyfrowanie, pseudonimizacja, kontrola dostępu..." />
                  </div>

                  {/* Risk Matrix */}
                  <div className="bg-slate-50 rounded-3xl p-8">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Ocena Ryzyka</div>
                    <div className="grid grid-cols-2 gap-8">
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-3">Prawdopodobieństwo (1-5): <span className="text-indigo-600">{form.likelihood}</span></label>
                        <input type="range" min={1} max={5} value={form.likelihood} onChange={e => setForm(f => ({ ...f, likelihood: Number(e.target.value) }))} className="w-full accent-indigo-600" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-3">Wpływ (1-5): <span className="text-rose-600">{form.impact}</span></label>
                        <input type="range" min={1} max={5} value={form.impact} onChange={e => setForm(f => ({ ...f, impact: Number(e.target.value) }))} className="w-full accent-rose-600" />
                      </div>
                    </div>
                    <div className="mt-6 p-5 bg-white rounded-2xl border border-slate-200 flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Wynik Ryzyka: {form.likelihood} × {form.impact}</span>
                      <span className={`text-xl font-black italic ${riskColor}`}>{riskScore} — {riskLabel}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-5 bg-indigo-50 rounded-2xl border border-indigo-100">
                    <input type="checkbox" id="dpo" checked={form.dpoApproval} onChange={e => setForm(f => ({ ...f, dpoApproval: e.target.checked }))} className="w-5 h-5 accent-indigo-600" />
                    <label htmlFor="dpo" className="text-sm font-black text-indigo-700">Zatwierdzone przez Inspektora Ochrony Danych (IOD)</label>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button onClick={() => setShowForm(false)} className="flex-1 py-5 rounded-3xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all">Anuluj</button>
                  <button onClick={() => setShowForm(false)} className="flex-1 py-5 rounded-3xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">Zapisz DPIA</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
