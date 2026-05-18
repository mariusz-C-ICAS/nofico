/**
 * Data: 2026-05-17
 * Ścieżka: /src/modules/compliance/components/SecurityPolicies.tsx
 */
import React, { useState, useEffect } from 'react';
import {
  FileText, Download, Send, History, Users,
  CheckCircle2, Clock, AlertTriangle, ChevronDown,
  ChevronUp, Tag, User, Calendar, Shield, Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../../../shared/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useTenant } from '../../../shared/hooks/useTenant';

interface Policy {
  id: string;
  name: string;
  version: string;
  owner: string;
  effectiveDate: string;
  reviewDate: string;
  status: 'Active' | 'Under Review' | 'Draft' | 'Retired';
  signed: number;
  total: number;
  history: { version: string; date: string; changes: string }[];
}

const STATUS_CFG: Record<Policy['status'], { cls: string; icon: React.ReactNode }> = {
  Active:        { cls: 'bg-emerald-50 text-emerald-600 border border-emerald-100', icon: <CheckCircle2 size={12} /> },
  'Under Review': { cls: 'bg-amber-50 text-amber-600 border border-amber-100', icon: <Clock size={12} /> },
  Draft:         { cls: 'bg-slate-100 text-slate-500', icon: <FileText size={12} /> },
  Retired:       { cls: 'bg-rose-50 text-rose-400 border border-rose-100', icon: <AlertTriangle size={12} /> },
};

function SignedBar({ signed, total }: { signed: number; total: number }) {
  const pct   = total > 0 ? Math.round((signed / total) * 100) : 0;
  const color = pct === 100 ? 'bg-emerald-500' : pct >= 80 ? 'bg-amber-400' : 'bg-rose-500';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[10px] font-black ${pct === 100 ? 'text-emerald-600' : pct >= 80 ? 'text-amber-600' : 'text-rose-600'}`}>{signed}/{total}</span>
    </div>
  );
}

function PolicyCard({ policy }: { policy: Policy }) {
  const [expanded, setExpanded] = useState(false);
  const sc            = STATUS_CFG[policy.status];
  const reviewOverdue = new Date(policy.reviewDate) < new Date();

  return (
    <motion.div layout className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden hover:shadow-xl hover:shadow-slate-100 transition-all">
      <div className="p-8">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{policy.id}</span>
              <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full uppercase tracking-widest flex items-center gap-1">
                <Tag size={9} /> v{policy.version}
              </span>
              {reviewOverdue && policy.status === 'Active' && (
                <span className="text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full uppercase tracking-widest flex items-center gap-1">
                  <AlertTriangle size={9} /> Przegląd Wymagany
                </span>
              )}
            </div>
            <h4 className="text-base font-black text-slate-900 italic mb-1">{policy.name}</h4>
          </div>
          <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full whitespace-nowrap ${sc.cls}`}>
            {sc.icon} {policy.status}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-5">
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Właściciel</div>
            <div className="text-[11px] font-black text-slate-600 flex items-center gap-1"><User size={10} /> {policy.owner}</div>
          </div>
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Obowiązuje od</div>
            <div className="text-[11px] font-black text-slate-600 flex items-center gap-1"><Calendar size={10} /> {policy.effectiveDate}</div>
          </div>
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Przegląd</div>
            <div className={`text-[11px] font-black flex items-center gap-1 ${reviewOverdue ? 'text-amber-600' : 'text-slate-600'}`}>
              <Calendar size={10} /> {policy.reviewDate}
            </div>
          </div>
        </div>

        <div className="mb-5">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Users size={10} /> Podpisano przez pracowników
          </div>
          <SignedBar signed={policy.signed} total={policy.total} />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-2xl bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all">
            <Download size={12} /> Pobierz
          </button>
          {policy.signed < policy.total && (
            <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all">
              <Send size={12} /> Wyślij do Podpisu
            </button>
          )}
          <button onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-2xl bg-slate-50 text-slate-500 hover:bg-slate-100 transition-all ml-auto"
          >
            <History size={12} /> Historia {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-8 pb-8">
              <div className="border-t border-slate-100 pt-6">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Historia Wersji</div>
                <div className="space-y-3">
                  {(policy.history ?? []).map((h, i) => (
                    <div key={i} className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="shrink-0">
                        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full">v{h.version}</span>
                      </div>
                      <div className="flex-1">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{h.date}</div>
                        <div className="text-[11px] text-slate-600">{h.changes}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function SecurityPolicies() {
  const { activeTenantId } = useTenant();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState<Policy['status'] | 'All'>('All');

  useEffect(() => {
    if (!activeTenantId) return;
    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, `tenants/${activeTenantId}/securityPolicies`));
        setPolicies(snap.docs.map(d => {
          const data = d.data() as any;
          return { id: d.id, ...data, history: data.history ?? [] } as Policy;
        }));
      } finally {
        setLoading(false);
      }
    })();
  }, [activeTenantId]);

  const filtered = policies.filter(p => filter === 'All' || p.status === filter);

  const stats = {
    active:          policies.filter(p => p.status === 'Active').length,
    fullySignedPct:  policies.length > 0
      ? Math.round((policies.filter(p => p.signed === p.total).length / policies.length) * 100)
      : 0,
    needsReview: policies.filter(p => new Date(p.reviewDate) < new Date() && p.status === 'Active').length,
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" size={24} /></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-200">
              <Shield className="text-white" size={18} />
            </div>
            <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Polityki Bezpieczeństwa</h2>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Security Policy Library — ISO 27001 A.5</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Aktywne', value: stats.active, color: 'text-emerald-600' },
            { label: 'W pełni podpisane', value: `${stats.fullySignedPct}%`, color: 'text-indigo-600' },
            { label: 'Wymaga Przeglądu', value: stats.needsReview, color: 'text-amber-600' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-slate-100 rounded-2xl px-5 py-4 shadow-sm text-center">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</div>
              <div className={`text-xl font-black italic ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['All', 'Active', 'Under Review', 'Draft', 'Retired'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-[10px] font-black uppercase tracking-widest px-5 py-3 rounded-2xl transition-all ${filter === f ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-50'}`}
          >
            {f === 'All' ? 'Wszystkie' : f}
          </button>
        ))}
      </div>

      {filtered.length === 0 && <p className="text-sm italic text-slate-400 text-center py-10">Brak polityk</p>}

      <div className="space-y-5">
        {filtered.map(policy => <PolicyCard key={policy.id} policy={policy} />)}
      </div>

      <div className="bg-slate-900 rounded-[3rem] p-10">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Pokrycie Podpisami</h3>
        <div className="space-y-4">
          {policies.filter(p => p.status === 'Active').map(p => (
            <div key={p.id} className="flex items-center gap-6">
              <span className="text-[11px] font-black text-slate-300 w-64 truncate">{p.name}</span>
              <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${p.signed === p.total ? 'bg-emerald-500' : p.signed / p.total >= 0.8 ? 'bg-amber-400' : 'bg-rose-500'}`}
                  style={{ width: `${p.total > 0 ? (p.signed / p.total) * 100 : 0}%` }}
                />
              </div>
              <span className="text-[10px] font-black text-slate-400 w-16 text-right">{p.signed}/{p.total}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
