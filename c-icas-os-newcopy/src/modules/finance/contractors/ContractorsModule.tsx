/**
 * Data: 2026-05-15
 * Ścieżka: /src/modules/finance/contractors/ContractorsModule.tsx
 * Opis: Powłoka modułu kontrahentów — stats, AI insight, przełączanie widoków.
 */
import React, { useState, useEffect } from 'react';
import { Loader2, Sparkles, Users, TrendingUp, Plus, ArrowLeft } from 'lucide-react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import { useTenant } from '../../../shared/hooks/useTenant';
import { askAI } from '../../../shared/services/geminiService';
import ContractorList from './ContractorList';
import ContractorForm from './ContractorForm';
import type { Contractor } from '../types/fiTypes';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtPLN(val: number): string {
  return val.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type View = 'list' | 'add' | 'edit';

// ─── Component ────────────────────────────────────────────────────────────────
export default function ContractorsModule() {
  const { activeTenantId } = useTenant();
  const [view, setView] = useState<View>('list');
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);

  // Header stats
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [outstanding, setOutstanding] = useState<number | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // AI insight
  const [aiInsight, setAiInsight] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Fetch stats once on mount / tenant change
  useEffect(() => {
    if (!activeTenantId) return;

    const load = async () => {
      setStatsLoading(true);
      try {
        const snap = await getDocs(
          query(
            collection(db, 'tenants', activeTenantId, 'contractors'),
            where('status', '!=', 'blocked'),
            orderBy('status'),
            orderBy('name', 'asc')
          )
        );

        const contractors = snap.docs.map(d => ({ id: d.id, ...d.data() } as Contractor));
        const count = contractors.length;
        const totalOut = contractors.reduce((sum, c) => sum + (c.totalOutstanding ?? 0), 0);

        setTotalCount(count);
        setOutstanding(totalOut);
        setStatsLoading(false);

        // Fetch AI insight
        if (count > 0) {
          setAiLoading(true);
          try {
            const insight = await askAI(
              `Jako asystent finansowy, w 1 krótkim zdaniu po polsku oceń sytuację z kontrahentami: ` +
              `liczba aktywnych: ${count}, łączne zaległości: ${fmtPLN(totalOut)} PLN. ` +
              `Zaproponuj jedną konkretną akcję. Bądź zwięzły.`
            );
            setAiInsight(insight);
          } catch {
            setAiInsight('Regularnie weryfikuj kontrahentów na Białej Liście i monitoruj zaległe płatności.');
          } finally {
            setAiLoading(false);
          }
        } else {
          setAiInsight('Dodaj pierwszego kontrahenta, aby system zaczął analizować Twoje relacje handlowe.');
          setAiLoading(false);
        }
      } catch (err) {
        console.error('[ContractorsModule] stats error:', err);
        setStatsLoading(false);
      }
    };

    load();
  }, [activeTenantId]);

  function handleEdit(c: Contractor) {
    setEditingContractor(c);
    setView('edit');
  }

  function handleAdd() {
    setEditingContractor(null);
    setView('add');
  }

  function handleFormDone() {
    setEditingContractor(null);
    setView('list');
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">

      {/* Dark header */}
      <div className="bg-slate-900 rounded-[3rem] p-8 text-white relative overflow-hidden shadow-2xl">
        {/* Decorative blob */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-indigo-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          {/* Left: title + stats */}
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">NoFiCo / Kontrahenci</div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white mb-4 flex items-center gap-3">
              <Users className="text-indigo-400" size={32} />
              Kontrahenci
            </h1>

            {/* Stats row */}
            <div className="flex flex-wrap gap-6">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Aktywni</div>
                {statsLoading
                  ? <div className="h-7 w-16 bg-slate-800 rounded-full animate-pulse" />
                  : <div className="text-2xl font-black italic tracking-tighter text-white">{totalCount ?? 0}</div>
                }
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Zaległości łącznie</div>
                {statsLoading
                  ? <div className="h-7 w-28 bg-slate-800 rounded-full animate-pulse" />
                  : <div className={`text-2xl font-black italic tracking-tighter ${(outstanding ?? 0) > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {fmtPLN(outstanding ?? 0)} PLN
                    </div>
                }
              </div>
            </div>
          </div>

          {/* Right: AI + CTA */}
          <div className="flex flex-col gap-3 items-end min-w-0 md:max-w-sm w-full">
            {/* AI card */}
            <div className="w-full bg-indigo-600/80 backdrop-blur-sm border border-indigo-500/30 rounded-2xl px-5 py-4 flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {aiLoading
                  ? <Loader2 size={16} className="animate-spin text-indigo-300" />
                  : <Sparkles size={16} className="text-indigo-300" />
                }
              </div>
              <div className="min-w-0">
                <div className="text-[9px] font-black uppercase tracking-widest text-indigo-300 mb-1">AI Rekomendacja</div>
                {aiLoading
                  ? <div className="h-4 bg-indigo-500/50 rounded-full animate-pulse w-48" />
                  : <p className="text-xs font-bold text-white leading-snug">{aiInsight}</p>
                }
              </div>
            </div>

            {view !== 'list' ? (
              <button
                onClick={handleFormDone}
                className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-black uppercase tracking-widest px-5 py-2.5 rounded-xl transition-colors"
              >
                <ArrowLeft size={14} /> Powrót do listy
              </button>
            ) : (
              <button
                onClick={handleAdd}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black uppercase tracking-widest px-6 py-3 rounded-xl shadow-xl shadow-indigo-500/20 transition-all"
              >
                <Plus size={14} /> Dodaj Kontrahenta
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      {view === 'list' && (
        <ContractorList onEdit={handleEdit} onAdd={handleAdd} />
      )}

      {(view === 'add' || view === 'edit') && (
        <ContractorForm
          initialData={view === 'edit' ? (editingContractor ?? undefined) : undefined}
          onSave={handleFormDone}
          onCancel={handleFormDone}
        />
      )}
    </div>
  );
}
