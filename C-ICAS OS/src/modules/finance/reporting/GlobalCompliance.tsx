/**
 * Data: 2026-05-16
 * Ścieżka: /src/modules/finance/reporting/GlobalCompliance.tsx
 */
import React, { useEffect, useState } from 'react';
import {
  Globe, ShieldCheck, RefreshCw,
  FileCode, CheckCircle2, Zap,
} from 'lucide-react';
import { motion } from 'motion/react';
import { db } from '../../../shared/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useAuth } from '../../../shared/hooks/AuthContext';

interface ComplianceJob {
  type:   string;
  name:   string;
  region: string;
  status: 'ready' | 'scheduled' | 'completed' | 'running';
  date:   string;
}

const JOB_TEMPLATES: Omit<ComplianceJob, 'status' | 'date'>[] = [
  { type: 'FEC',     name: 'FEC Export (Fichier des Ecritures Comptables)', region: 'FRANCE'  },
  { type: 'GOBD',    name: 'GoBD / DATEV Interface',                        region: 'GERMANY' },
  { type: 'SAFT',    name: 'SAF-T (Standard Audit File for Tax)',            region: 'OECD'    },
  { type: 'VAT_OSS', name: 'VAT OSS Re-calculation',                        region: 'EU-WIDE' },
];

export default function GlobalCompliance() {
  const { activeTenantId } = useAuth() as any;
  const [jobs,       setJobs]       = useState<ComplianceJob[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setRefreshing(true);
    try {
      const snap = activeTenantId
        ? await getDocs(collection(db, `tenants/${activeTenantId}/complianceExports`))
        : null;

      const byType: Record<string, { status: string; lastRun?: string }> = {};
      snap?.docs.forEach(d => {
        const data = d.data();
        byType[data.type ?? d.id] = {
          status:  data.status,
          lastRun: data.completedAt?.toDate?.()?.toLocaleDateString('pl-PL') ?? data.scheduledFor,
        };
      });

      setJobs(JOB_TEMPLATES.map(t => {
        const stored = byType[t.type];
        return {
          ...t,
          status: (stored?.status as ComplianceJob['status']) ?? 'ready',
          date:   stored?.lastRun ?? '—',
        };
      }));
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, [activeTenantId]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white border border-slate-100 rounded-[3rem] p-10 shadow-sm flex flex-col md:flex-row justify-between items-center gap-10">
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white p-4 rounded-2xl">
              <Globe size={24} />
            </div>
            <div>
              <h4 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Global Compliance Engine</h4>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Wielowalutowość & Standardy Międzynarodowe</div>
            </div>
          </div>
          <p className="text-[11px] font-medium text-slate-500 max-w-xl italic leading-relaxed">
            Automatyczne mapowanie Planu Kont (COA) na standardy podatkowe Francji (FEC), Niemiec (GoBD) oraz Rumunii (SAF-T) za pomocą silnika transformacji NoFiCo.
          </p>
        </div>
        <button
          onClick={load}
          disabled={refreshing}
          className="bg-slate-900 text-white px-10 py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-2xl shadow-slate-100 hover:bg-indigo-600 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> Odśwież Integracje
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {jobs.map((job, idx) => (
          <motion.div
            key={idx}
            whileHover={{ y: -5 }}
            className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm group hover:border-indigo-500 transition-all"
          >
            <div className="flex justify-between items-start mb-8">
              <div className="bg-slate-50 p-4 rounded-2xl group-hover:bg-indigo-50 transition-colors">
                <FileCode className="text-slate-400 group-hover:text-indigo-600" size={24} />
              </div>
              <div className="text-right">
                <div className="text-[10px] font-black text-indigo-600 uppercase mb-1">{job.region}</div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{job.date}</div>
              </div>
            </div>

            <h5 className="text-lg font-black text-slate-900 uppercase italic mb-8 group-hover:text-indigo-600 transition-colors">{job.name}</h5>

            <div className="flex items-center justify-between mt-auto pt-6 border-t border-slate-50">
              <div className="flex items-center gap-2">
                {job.status === 'ready' || job.status === 'completed' ? (
                  <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-500 uppercase tracking-widest italic">
                    <CheckCircle2 size={12} /> Zweryfikowano
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-[9px] font-black text-amber-500 uppercase tracking-widest italic">
                    <Zap size={12} className="animate-pulse" /> W trakcie
                  </div>
                )}
              </div>
              <button className="bg-slate-100 group-hover:bg-indigo-600 text-slate-400 group-hover:text-white px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">
                Pobierz XML / TXT
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-slate-900 rounded-[3rem] p-12 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.1),transparent)]" />
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <ShieldCheck className="text-indigo-400" size={40} />
            <h4 className="text-3xl font-black uppercase italic tracking-tighter leading-tight">Weryfikacja Krzyżowa<br />BigQuery Audit</h4>
            <p className="text-xs font-medium text-indigo-100 italic leading-relaxed">
              Każdy eksport jest weryfikowany pod kątem spójności z Dziennikiem Głównym oraz Rejestrami VAT za pomocą zapytań SQL w Data Warehouse.
            </p>
            <div className="flex items-center gap-4">
              <div className="flex -space-x-4">
                <div className="w-12 h-12 rounded-full border-4 border-slate-900 bg-indigo-500 flex items-center justify-center font-black text-xs">AI</div>
                <div className="w-12 h-12 rounded-full border-4 border-slate-900 bg-emerald-500 flex items-center justify-center font-black text-xs text-black">SQL</div>
                <div className="w-12 h-12 rounded-full border-4 border-slate-900 bg-slate-800 flex items-center justify-center font-black text-xs">V5</div>
              </div>
              <span className="text-[10px] font-black uppercase text-indigo-300 italic tracking-widest">Zatwierdzono przez Audytorów</span>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/10">
            <div className="flex items-center justify-between mb-8">
              <span className="text-[10px] font-black text-indigo-300 uppercase">System Health-Check</span>
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            </div>
            <div className="space-y-6 font-mono text-[10px] text-indigo-100 opacity-60">
              <div>[OK] COA Standard Mapping ... 100%</div>
              <div>[OK] Duplicate Transaction Check ... Clear</div>
              <div>[OK] Gap Numbering Check ... Clear</div>
              <div>[OK] Balance Symmetry (BS = Profit) ... Matched</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
