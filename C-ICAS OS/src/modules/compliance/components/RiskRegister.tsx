/**
 * Data: 2026-05-14
 * Ścieżka: /src/modules/compliance/components/RiskRegister.tsx
 */
import React, { useState } from 'react';
import {
  ShieldAlert, Plus, Grid3X3, List, Calendar,
  AlertTriangle, CheckCircle2, User, XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type RiskCategory = 'Data Breach' | 'Access Control' | 'Physical' | 'Operational' | 'Legal' | 'Third Party';
type RiskStatus = 'Open' | 'Mitigated' | 'Accepted' | 'Closed';

interface Risk {
  id: string;
  category: RiskCategory;
  description: string;
  likelihood: number;
  impact: number;
  owner: string;
  mitigation: string;
  residualScore: number;
  status: RiskStatus;
  reviewDate: string;
}

const MOCK_RISKS: Risk[] = [
  {
    id: 'RSK-001', category: 'Data Breach', description: 'Wyciek danych klientów przez atak SQL Injection',
    likelihood: 3, impact: 5, owner: 'CTO', mitigation: 'WAF, prepared statements, code review',
    residualScore: 6, status: 'Mitigated', reviewDate: '2026-08-01',
  },
  {
    id: 'RSK-002', category: 'Access Control', description: 'Nieautoryzowany dostęp przez skradzione poświadczenia',
    likelihood: 4, impact: 4, owner: 'CISO', mitigation: 'MFA dla wszystkich kont, PAM solution',
    residualScore: 8, status: 'Open', reviewDate: '2026-06-15',
  },
  {
    id: 'RSK-003', category: 'Physical', description: 'Nieautoryzowany dostęp fizyczny do serwerowni',
    likelihood: 2, impact: 5, owner: 'Facilities', mitigation: 'Biometria + karta dostępu + monitoring CCTV',
    residualScore: 4, status: 'Mitigated', reviewDate: '2026-09-01',
  },
  {
    id: 'RSK-004', category: 'Operational', description: 'Brak ciągłości działania — awaria głównego centrum danych',
    likelihood: 2, impact: 5, owner: 'IT Director', mitigation: 'DR site + backup w chmurze (RPO 1h)',
    residualScore: 6, status: 'Open', reviewDate: '2026-07-01',
  },
  {
    id: 'RSK-005', category: 'Legal', description: 'Naruszenie RODO — brak realizacji wniosków DSR w terminie',
    likelihood: 3, impact: 4, owner: 'IOD', mitigation: 'Wdrożenie systemu DSR z automatycznym alertem',
    residualScore: 6, status: 'Open', reviewDate: '2026-06-01',
  },
  {
    id: 'RSK-006', category: 'Third Party', description: 'Naruszenie u dostawcy chmurowego (AWS outage)',
    likelihood: 3, impact: 3, owner: 'CTO', mitigation: 'Multi-cloud architecture, SLA monitoring',
    residualScore: 4, status: 'Accepted', reviewDate: '2026-08-15',
  },
];

const CATEGORY_CFG: Record<RiskCategory, string> = {
  'Data Breach': 'bg-rose-50 text-rose-600 border-rose-100',
  'Access Control': 'bg-indigo-50 text-indigo-600 border-indigo-100',
  'Physical': 'bg-amber-50 text-amber-600 border-amber-100',
  'Operational': 'bg-blue-50 text-blue-600 border-blue-100',
  'Legal': 'bg-purple-50 text-purple-600 border-purple-100',
  'Third Party': 'bg-slate-100 text-slate-600 border-slate-200',
};

const STATUS_CFG: Record<RiskStatus, string> = {
  'Open': 'bg-rose-50 text-rose-600 border border-rose-100',
  'Mitigated': 'bg-emerald-50 text-emerald-600 border border-emerald-100',
  'Accepted': 'bg-amber-50 text-amber-600 border border-amber-100',
  'Closed': 'bg-slate-100 text-slate-500',
};

function riskLevel(score: number): { label: string; color: string; bg: string } {
  if (score >= 20) return { label: 'Krytyczne', color: 'text-rose-600', bg: 'bg-rose-600' };
  if (score >= 12) return { label: 'Wysokie', color: 'text-orange-600', bg: 'bg-orange-500' };
  if (score >= 6) return { label: 'Średnie', color: 'text-amber-600', bg: 'bg-amber-400' };
  return { label: 'Niskie', color: 'text-emerald-600', bg: 'bg-emerald-400' };
}

function cellColor(l: number, i: number): string {
  const s = l * i;
  if (s >= 20) return 'bg-rose-600';
  if (s >= 12) return 'bg-orange-500';
  if (s >= 6) return 'bg-amber-400';
  return 'bg-emerald-400';
}

function HeatMap({ risks }: { risks: Risk[] }) {
  return (
    <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm">
      <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter mb-2">Mapa Ryzyk</h3>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Prawdopodobieństwo × Wpływ</p>
      <div className="flex gap-3">
        {/* Y axis label */}
        <div className="flex flex-col justify-between py-2">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Wpływ</span>
        </div>
        <div className="flex-1">
          <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gridTemplateRows: 'repeat(5, 1fr)' }}>
            {[5, 4, 3, 2, 1].map(i =>
              [1, 2, 3, 4, 5].map(l => {
                const score = l * i;
                const level = riskLevel(score);
                const cellRisks = risks.filter(r => r.likelihood === l && r.impact === i);
                return (
                  <div
                    key={`${l}-${i}`}
                    className={`${cellColor(l, i)} rounded-xl h-14 flex items-center justify-center relative opacity-80 hover:opacity-100 transition-opacity`}
                    title={`L:${l} I:${i} Score:${score}`}
                  >
                    <span className="text-[9px] font-black text-white">{score}</span>
                    {cellRisks.length > 0 && (
                      <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-md">
                        <span className="text-[8px] font-black text-slate-700">{cellRisks.length}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
          <div className="flex gap-1 mt-2">
            {[1, 2, 3, 4, 5].map(l => (
              <div key={l} className="flex-1 text-center text-[9px] font-black text-slate-400">{l}</div>
            ))}
          </div>
          <div className="text-center text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Prawdopodobieństwo</div>
        </div>
        <div className="flex items-center">
          <div className="flex flex-col gap-2">
            {[
              { bg: 'bg-rose-600', label: 'Krytyczne (≥20)' },
              { bg: 'bg-orange-500', label: 'Wysokie (12-19)' },
              { bg: 'bg-amber-400', label: 'Średnie (6-11)' },
              { bg: 'bg-emerald-400', label: 'Niskie (<6)' },
            ].map(lg => (
              <div key={lg.label} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${lg.bg}`} />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">{lg.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RiskRegister() {
  const [view, setView] = useState<'list' | 'heatmap'>('list');
  const [showForm, setShowForm] = useState(false);
  const [risks] = useState<Risk[]>(MOCK_RISKS);

  const stats = {
    critical: risks.filter(r => r.likelihood * r.impact >= 20).length,
    high: risks.filter(r => { const s = r.likelihood * r.impact; return s >= 12 && s < 20; }).length,
    medium: risks.filter(r => { const s = r.likelihood * r.impact; return s >= 6 && s < 12; }).length,
    low: risks.filter(r => r.likelihood * r.impact < 6).length,
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-rose-600 p-2 rounded-xl shadow-lg shadow-rose-200">
              <ShieldAlert className="text-white" size={18} />
            </div>
            <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Rejestr Ryzyk</h2>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Information Security Risk Register — ISO 27005</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-white border border-slate-100 rounded-2xl p-1">
            <button onClick={() => setView('list')} className={`p-2.5 rounded-xl transition-all ${view === 'list' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50'}`}><List size={16} /></button>
            <button onClick={() => setView('heatmap')} className={`p-2.5 rounded-xl transition-all ${view === 'heatmap' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50'}`}><Grid3X3 size={16} /></button>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-rose-600 text-white px-8 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-200"
          >
            <Plus size={16} /> Dodaj Ryzyko
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Krytyczne', value: stats.critical, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
          { label: 'Wysokie', value: stats.high, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
          { label: 'Średnie', value: stats.medium, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
          { label: 'Niskie', value: stats.low, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
        ].map(s => (
          <div key={s.label} className={`rounded-[2rem] border p-7 shadow-sm ${s.bg} ${s.border}`}>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{s.label}</div>
            <div className={`text-3xl font-black italic ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {view === 'heatmap' && <HeatMap risks={risks} />}

      {view === 'list' && (
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-100">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{risks.length} ryzyk w rejestrze</span>
          </div>
          <div className="divide-y divide-slate-50">
            {risks.map(risk => {
              const score = risk.likelihood * risk.impact;
              const lvl = riskLevel(score);
              const residual = riskLevel(risk.residualScore);
              return (
                <motion.div key={risk.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 hover:bg-slate-50 transition-all">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{risk.id}</span>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${CATEGORY_CFG[risk.category]}`}>{risk.category}</span>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${STATUS_CFG[risk.status]}`}>{risk.status}</span>
                      </div>
                      <p className="text-sm font-black text-slate-700 italic mb-3">{risk.description}</p>
                      <p className="text-[11px] text-slate-500 mb-4">Mitygacja: {risk.mitigation}</p>
                      <div className="flex items-center gap-6">
                        <div>
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Właściciel</div>
                          <div className="text-[11px] font-black text-slate-600 flex items-center gap-1"><User size={10} /> {risk.owner}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Przegląd</div>
                          <div className="text-[11px] font-black text-slate-600 flex items-center gap-1"><Calendar size={10} /> {risk.reviewDate}</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ryzyko</div>
                        <div className={`text-2xl font-black italic ${lvl.color}`}>{score}</div>
                        <div className={`text-[9px] font-black uppercase tracking-widest ${lvl.color}`}>{lvl.label}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Rezydualne</div>
                        <div className={`text-lg font-black italic ${residual.color}`}>{risk.residualScore}</div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${residual.bg} rounded-full`} style={{ width: `${(risk.residualScore / 25) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quarterly review notice */}
      <div className="bg-slate-900 rounded-[3rem] p-10">
        <div className="flex items-center gap-4 mb-4">
          <Calendar className="text-indigo-400" size={20} />
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Harmonogram Przeglądów Kwartalnych</h3>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {['Q1 2026 — Stycz.', 'Q2 2026 — Kwiec.', 'Q3 2026 — Lipiec', 'Q4 2026 — Pazdz.'].map((q, i) => (
            <div key={q} className={`p-5 rounded-2xl ${i < 2 ? 'bg-emerald-900/40 border border-emerald-700/40' : 'bg-slate-800'}`}>
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{q}</div>
              <div className={`text-[10px] font-black uppercase tracking-widest ${i < 2 ? 'text-emerald-400' : 'text-slate-500'}`}>
                {i < 2 ? 'Zakończony' : 'Zaplanowany'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Risk Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl p-10">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Nowe Ryzyko</h3>
                <button onClick={() => setShowForm(false)} className="p-2 rounded-2xl hover:bg-slate-100 transition-all"><XCircle size={20} className="text-slate-400" /></button>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Opis Ryzyka</label>
                  <textarea rows={3} className="w-full border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-700 focus:outline-none focus:border-rose-400" placeholder="Opisz ryzyko bezpieczeństwa..." />
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Kategoria</label>
                    <select className="w-full border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-700 focus:outline-none focus:border-rose-400 bg-white">
                      {(['Data Breach', 'Access Control', 'Physical', 'Operational', 'Legal', 'Third Party'] as RiskCategory[]).map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Właściciel</label>
                    <input className="w-full border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-700 focus:outline-none focus:border-rose-400" placeholder="np. CISO" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Prawdopodobieństwo (1-5)</label>
                    <input type="range" min={1} max={5} defaultValue={3} className="w-full accent-rose-600" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Wpływ (1-5)</label>
                    <input type="range" min={1} max={5} defaultValue={3} className="w-full accent-rose-600" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Plan Mitygacji</label>
                  <textarea rows={2} className="w-full border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-700 focus:outline-none focus:border-rose-400" placeholder="Opisz działania mitygujące..." />
                </div>
              </div>
              <div className="flex gap-4 mt-8">
                <button onClick={() => setShowForm(false)} className="flex-1 py-5 rounded-3xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50">Anuluj</button>
                <button onClick={() => setShowForm(false)} className="flex-1 py-5 rounded-3xl bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 shadow-lg shadow-rose-200">Zapisz Ryzyko</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
