import React, { useState, useEffect } from 'react';
import {
  Brain, RefreshCw, ChevronRight, Target, Phone, Mail,
  FileText, Calendar, TrendingUp, AlertTriangle, Star, Zap
} from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface Props { tenantId: string; onSelectCustomer?: (c: any) => void }

interface Customer {
  id: string;
  name: string;
  status: string;
  leadScore?: number;
  totalRevenue?: number;
  lastContactDate?: any;
  lastServiceDate?: any;
  tags?: string[];
  industry?: string;
}

interface Deal {
  id: string;
  customerId?: string;
  stage: string;
  value?: number;
  probability?: number;
  updatedAt?: any;
}

interface Suggestion {
  customerId: string;
  customerName: string;
  score: number;
  priority: 'critical' | 'high' | 'medium';
  actions: Action[];
  insight: string;
}

interface Action {
  type: 'call' | 'email' | 'meeting' | 'quote' | 'upsell' | 'followup';
  label: string;
  reason: string;
}

const ACTION_ICONS: Record<string, React.ElementType> = {
  call: Phone, email: Mail, meeting: Calendar, quote: FileText,
  upsell: TrendingUp, followup: Zap,
};

const ACTION_COLORS: Record<string, string> = {
  call: 'text-blue-700 bg-blue-50',
  email: 'text-indigo-700 bg-indigo-50',
  meeting: 'text-violet-700 bg-violet-50',
  quote: 'text-amber-700 bg-amber-50',
  upsell: 'text-emerald-700 bg-emerald-50',
  followup: 'text-orange-700 bg-orange-50',
};

function daysSince(ts: any): number | null {
  const d = ts?.toDate?.() ?? (ts ? new Date(ts) : null);
  if (!d) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function generateSuggestions(customers: Customer[], deals: Deal[]): Suggestion[] {
  const suggestions: Suggestion[] = [];

  customers.forEach(c => {
    const actions: Action[] = [];
    let score = 0;
    const insights: string[] = [];

    const daysSinceContact = daysSince(c.lastContactDate);
    const daysSinceService = daysSince(c.lastServiceDate);
    const custDeals = deals.filter(d => d.customerId === c.id);
    const openDeals = custDeals.filter(d => !['closed_won', 'closed_lost'].includes(d.stage ?? ''));
    const staleDeals = openDeals.filter(d => {
      const ds = daysSince(d.updatedAt);
      return ds !== null && ds > 14;
    });

    if (c.status === 'prospect') {
      if (daysSinceContact === null || daysSinceContact > 7) {
        actions.push({ type: 'call', label: 'Zadzwoń do prospektu', reason: 'Brak kontaktu >7 dni' });
        score += 30;
        insights.push('Prospekt bez kontaktu');
      }
      if (openDeals.length === 0) {
        actions.push({ type: 'quote', label: 'Wyślij ofertę', reason: 'Brak aktywnych dealów' });
        score += 20;
      }
    }

    if (c.status === 'active') {
      if (daysSinceContact !== null && daysSinceContact > 30) {
        actions.push({ type: 'email', label: 'Wyślij email check-in', reason: `${daysSinceContact}d bez kontaktu` });
        score += 25;
        insights.push(`${daysSinceContact}d bez kontaktu`);
      }
      if ((c.totalRevenue ?? 0) > 50000 && (daysSinceContact === null || daysSinceContact > 14)) {
        actions.push({ type: 'meeting', label: 'Zaproponuj spotkanie', reason: 'Klient premium bez wizyty' });
        score += 20;
      }
      if (c.tags?.includes('vip') || c.tags?.includes('premium')) {
        actions.push({ type: 'upsell', label: 'Zbadaj możliwości upsell', reason: 'Klient VIP/Premium' });
        score += 15;
      }
    }

    if (staleDeals.length > 0) {
      actions.push({ type: 'followup', label: `Follow-up: ${staleDeals[0].stage}`, reason: `Deal stagnuje ${daysSince(staleDeals[0].updatedAt)}d` });
      score += 35;
      insights.push(`${staleDeals.length} deal${staleDeals.length > 1 ? 'e' : ''} bez postępu`);
    }

    if (c.status === 'churned') {
      if (daysSinceContact === null || daysSinceContact > 30) {
        actions.push({ type: 'call', label: 'Win-back call', reason: 'Były klient — szansa reaktywacji' });
        score += 40;
        insights.push('Potencjalny win-back');
      }
    }

    const highProbDeals = openDeals.filter(d => (d.probability ?? 0) >= 70);
    if (highProbDeals.length > 0) {
      actions.push({ type: 'meeting', label: 'Zamknij deal (prob ≥70%)', reason: `${highProbDeals.length} deal gotowy do zamknięcia` });
      score += 50;
      insights.push(`${highProbDeals.length} deal z prob ≥70%`);
    }

    if (actions.length === 0) return;

    score = Math.min(score, 100);
    const priority: Suggestion['priority'] = score >= 70 ? 'critical' : score >= 40 ? 'high' : 'medium';
    const insight = insights.length > 0 ? insights.join(' · ') : 'Standardowe działanie';

    suggestions.push({
      customerId: c.id, customerName: c.name, score, priority,
      actions: actions.slice(0, 3), insight,
    });
  });

  return suggestions.sort((a, b) => b.score - a.score);
}

const PRIORITY_COLORS = {
  critical: 'border-red-300 bg-red-50',
  high: 'border-amber-300 bg-amber-50',
  medium: 'border-slate-200 bg-white',
};

const PRIORITY_LABELS = {
  critical: { label: 'Krytyczne', color: 'text-red-700 bg-red-100' },
  high: { label: 'Wysokie', color: 'text-amber-700 bg-amber-100' },
  medium: { label: 'Średnie', color: 'text-slate-600 bg-slate-100' },
};

export default function AiCoaching({ tenantId, onSelectCustomer }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium'>('all');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const analyze = async () => {
    setLoading(true);
    const [custSnap, dealSnap] = await Promise.all([
      getDocs(query(collection(db, 'customers'), where('tenantId', '==', tenantId))),
      getDocs(query(collection(db, 'deals'), where('tenantId', '==', tenantId))),
    ]);
    const customers = custSnap.docs.map(d => ({ id: d.id, ...d.data() } as Customer));
    const deals = dealSnap.docs.map(d => ({ id: d.id, ...d.data() } as Deal));
    setSuggestions(generateSuggestions(customers, deals));
    setLastRefresh(new Date());
    setLoading(false);
  };

  useEffect(() => { analyze(); }, [tenantId]);

  const filtered = suggestions.filter(s => filter === 'all' || s.priority === filter);
  const critCount = suggestions.filter(s => s.priority === 'critical').length;
  const highCount = suggestions.filter(s => s.priority === 'high').length;

  if (loading) return <div className="flex justify-center py-20"><RefreshCw size={20} className="animate-spin text-indigo-400" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 bg-violet-600 rounded-xl flex items-center justify-center">
              <Brain size={16} className="text-white" />
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">AI Sales Coaching</h3>
          </div>
          <p className="text-xs text-slate-500">
            Next Best Action · {suggestions.length} sugestii · odśwież: {lastRefresh.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <button onClick={analyze} disabled={loading}
          className="flex items-center gap-2 text-violet-600 hover:text-violet-800 font-black text-xs uppercase tracking-widest">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Analizuj
        </button>
      </div>

      {/* Alerts */}
      {critCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle size={14} className="text-red-600 flex-shrink-0" />
          <p className="text-xs font-black text-red-700">{critCount} klientów wymaga natychmiastowego działania</p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Krytyczne', value: critCount, icon: AlertTriangle, color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
          { label: 'Wysokie', value: highCount, icon: Star, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
          { label: 'Do działania łącznie', value: suggestions.length, icon: Target, color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
        ].map(k => (
          <div key={k.label} className={`rounded-2xl border p-5 ${k.bg}`}>
            <k.icon size={16} className={`${k.color} mb-2`} />
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{k.label}</p>
            <p className={`text-2xl font-black mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {(['all', 'critical', 'high', 'medium'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}>
            {f === 'all' ? 'Wszystkie' : PRIORITY_LABELS[f].label}
          </button>
        ))}
      </div>

      {/* Suggestions */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          Brak sugestii — wszystkie relacje z klientami są aktualne
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(s => {
            const pLabel = PRIORITY_LABELS[s.priority];
            return (
              <div key={s.customerId} className={`rounded-2xl border p-5 ${PRIORITY_COLORS[s.priority]}`}>
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <button onClick={() => onSelectCustomer?.({ id: s.customerId, name: s.customerName })}
                        className="text-sm font-black text-slate-900 hover:text-indigo-700 transition-colors">
                        {s.customerName}
                      </button>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${pLabel.color}`}>{pLabel.label}</span>
                      <span className="text-[9px] font-black text-slate-400">Score: {s.score}/100</span>
                    </div>
                    <p className="text-[10px] text-slate-600 mb-3 italic">{s.insight}</p>

                    <div className="flex flex-wrap gap-2">
                      {s.actions.map((a, i) => {
                        const Icon = ACTION_ICONS[a.type];
                        return (
                          <div key={i} className={`flex items-center gap-2 rounded-xl px-3 py-2 ${ACTION_COLORS[a.type]}`}>
                            <Icon size={12} />
                            <div>
                              <p className="text-[10px] font-black leading-none">{a.label}</p>
                              <p className="text-[8px] opacity-70 mt-0.5">{a.reason}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 relative">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                        <circle cx="18" cy="18" r="15.9" fill="none"
                          stroke={s.priority === 'critical' ? '#ef4444' : s.priority === 'high' ? '#f59e0b' : '#8b5cf6'}
                          strokeWidth="3"
                          strokeDasharray={`${s.score} ${100 - s.score}`}
                          strokeLinecap="round" />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-slate-700">{s.score}</span>
                    </div>
                  </div>
                </div>

                {onSelectCustomer && (
                  <button onClick={() => onSelectCustomer({ id: s.customerId, name: s.customerName })}
                    className="mt-3 flex items-center gap-1 text-[9px] font-black text-slate-500 hover:text-indigo-700">
                    Otwórz kartę klienta <ChevronRight size={10} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
