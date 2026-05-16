import React, { useState, useEffect } from 'react';
import { Zap, TrendingUp, RefreshCw, CheckCircle2, Building2 } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { db } from '../../../shared/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { getCustomerServiceEvents, addActivity } from '../services/crmService';
import { detectUpsellOpportunity } from '../services/leadScoringService';
import type { UpsellOpportunity } from '../types';

interface Props { tenantId: string }

export default function UpsellBoard({ tenantId }: Props) {
  const { user } = useAuth() as any;
  const [opportunities, setOpportunities] = useState<UpsellOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioned, setActioned] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!tenantId) return;
    detectOpportunities();
  }, [tenantId]);

  const detectOpportunities = async () => {
    setLoading(true);
    try {
      // Fetch all customers
      const q = query(collection(db, 'customers'), where('tenantId', '==', tenantId));
      const snap = await getDocs(q);
      const customers = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));

      const opps: UpsellOpportunity[] = [];

      await Promise.all(customers.map(async (cust: any) => {
        const events = await getCustomerServiceEvents(tenantId, cust.id);
        const completedEvents = events.filter((e: any) => e.status === 'COMPLETED');

        const result = detectUpsellOpportunity({
          customerId: cust.id,
          customerName: cust.name,
          serviceEventCount: completedEvents.length,
          hasActiveContract: false, // would check deals in real impl
          totalRevenue: cust.totalRevenue ?? 0,
          lastServiceDate: completedEvents[0]?.scheduledStart ?? null,
          tags: cust.tags ?? [],
        });

        if (result.shouldFlag) {
          opps.push({
            customerId: cust.id,
            customerName: cust.name,
            reason: result.reason,
            serviceEventCount: completedEvents.length,
            estimatedValue: result.estimatedValue,
            suggestedAction: result.suggestedAction,
            tags: cust.tags ?? [],
            lastServiceDate: completedEvents[0]?.scheduledStart ?? null,
          });
        }
      }));

      // Sort by service count desc
      opps.sort((a, b) => b.serviceEventCount - a.serviceEventCount);
      setOpportunities(opps);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (opp: UpsellOpportunity) => {
    if (!user) return;
    await addActivity(tenantId, {
      tenantId,
      customerId: opp.customerId,
      type: 'note',
      title: `Upsell flagged: ${opp.suggestedAction}`,
      body: opp.reason,
      createdBy: user.uid,
      createdByEmail: user.email ?? '',
    });
    setActioned(prev => new Set([...prev, opp.customerId]));
  };

  const fmtDate = (ts: any) => {
    if (!ts) return 'brak daty';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Upsell Opportunities</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Automatycznie wykryte szanse na rozszerzenie kontraktu
          </p>
        </div>
        <button onClick={detectOpportunities} disabled={loading}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-black text-xs uppercase tracking-widest">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Odśwież
        </button>
      </div>

      {/* How it works */}
      <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-200 space-y-2">
        <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Jak działa detekcja?</p>
        <div className="grid grid-cols-2 gap-2 text-[10px] text-indigo-600">
          <div className="flex items-start gap-1.5">
            <Zap size={10} className="mt-0.5 flex-shrink-0" />
            <span>≥3 wizyty serwisowe bez kontraktu abonamentowego</span>
          </div>
          <div className="flex items-start gap-1.5">
            <TrendingUp size={10} className="mt-0.5 flex-shrink-0" />
            <span>≥6 wizyt → klient lojalny, możliwy upgrade usługi</span>
          </div>
        </div>
      </div>

      {loading && <div className="flex justify-center py-10"><RefreshCw size={20} className="animate-spin text-indigo-400" /></div>}

      {!loading && opportunities.length === 0 && (
        <div className="text-center py-10 text-slate-400">
          <Zap size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-black uppercase tracking-widest">Brak wykrytych szans upsell</p>
          <p className="text-xs mt-1">Klienci nie spełniają kryteriów lub brak danych wizyt serwisowych.</p>
        </div>
      )}

      <div className="space-y-3">
        {opportunities.map(opp => {
          const done = actioned.has(opp.customerId);
          return (
            <div key={opp.customerId} className={`p-5 rounded-2xl border transition-all ${done ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:border-indigo-200'}`}>
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${done ? 'bg-emerald-100' : 'bg-yellow-100'}`}>
                  {done ? <CheckCircle2 size={18} className="text-emerald-600" /> : <Building2 size={18} className="text-yellow-700" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black text-slate-900">{opp.customerName}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">{opp.reason}</p>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className="text-[9px] bg-emerald-50 text-emerald-700 font-black px-2 py-0.5 rounded-full border border-emerald-200">
                      {opp.serviceEventCount} wizyt
                    </span>
                    {opp.estimatedValue && opp.estimatedValue > 0 && (
                      <span className="text-[9px] bg-indigo-50 text-indigo-700 font-black px-2 py-0.5 rounded-full border border-indigo-200">
                        ~{opp.estimatedValue.toLocaleString('pl-PL')} PLN est.
                      </span>
                    )}
                    <span className="text-[9px] text-slate-400">Ostatnia wizyta: {fmtDate(opp.lastServiceDate)}</span>
                  </div>
                  <p className="text-[10px] font-bold text-indigo-700 mt-2">→ {opp.suggestedAction}</p>
                </div>
                {!done && (
                  <button onClick={() => handleAction(opp)}
                    className="flex-shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] px-4 py-2 rounded-xl uppercase tracking-widest">
                    Działaj
                  </button>
                )}
                {done && (
                  <span className="flex-shrink-0 text-[9px] font-black text-emerald-600 uppercase tracking-widest">
                    ✓ Zanotowane
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
