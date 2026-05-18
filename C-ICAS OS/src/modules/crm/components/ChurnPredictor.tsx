import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, TrendingDown, Building2, CheckCircle2, Phone, Mail } from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { addActivity } from '../services/crmService';
import { useAuth } from '../../../shared/hooks/AuthContext';

interface Props {
  tenantId: string;
  onSelectCustomer?: (cust: any) => void;
}

interface ChurnRisk {
  customer: any;
  score: number;          // 0-100, higher = more at risk
  reasons: string[];
  daysSinceActivity: number;
  daysSinceService: number;
  recommendation: string;
}

function daysSince(ts: any): number {
  if (!ts) return 999;
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function computeChurnScore(cust: any, serviceEvents: any[]): ChurnRisk {
  const reasons: string[] = [];
  let score = 0;

  const daysActivity = daysSince(cust.lastActivityAt);
  const lastService = serviceEvents.sort((a, b) => {
    const ta = a.scheduledStart?.toDate?.() ?? new Date(0);
    const tb = b.scheduledStart?.toDate?.() ?? new Date(0);
    return tb - ta;
  })[0]?.scheduledStart;
  const daysService = daysSince(lastService);

  // No activity
  if (daysActivity > 180) { score += 40; reasons.push(`Brak aktywności od ${daysActivity} dni`); }
  else if (daysActivity > 90) { score += 25; reasons.push(`Brak aktywności od ${daysActivity} dni`); }
  else if (daysActivity > 60) { score += 15; reasons.push(`Brak aktywności od ${daysActivity} dni`); }

  // No service
  if (daysService > 365) { score += 30; reasons.push(`Brak wizyty serwisowej od ${daysService} dni`); }
  else if (daysService > 180) { score += 20; reasons.push(`Brak wizyty od ${daysService} dni`); }

  // Status churned
  if (cust.status === 'churned') { score += 20; reasons.push('Status: Utracony'); }
  if (cust.status === 'blocked') { score += 10; reasons.push('Status: Zablokowany'); }

  // Low revenue + many services = low value
  if ((cust.totalRevenue ?? 0) === 0 && serviceEvents.length >= 3) {
    score += 10; reasons.push('Zerowy przychód przy wielu wizytach');
  }

  // Tags: churned, inactive, at-risk
  const tags: string[] = cust.tags ?? [];
  if (tags.some(t => ['churned', 'inactive', 'odejście', 'at-risk'].includes(t.toLowerCase()))) {
    score += 10; reasons.push('Tag wskazujący ryzyko churnu');
  }

  const recommendation =
    score >= 70 ? 'Natychmiast zadzwoń i zaproponuj ofertę retencji' :
    score >= 50 ? 'Wyślij email reaktywacyjny z rabatem lub nowym produktem' :
    score >= 30 ? 'Zaplanuj follow-up w ciągu 7 dni' :
    'Obserwuj — brak pilnych działań';

  return {
    customer: cust,
    score: Math.min(score, 100),
    reasons,
    daysSinceActivity: daysActivity,
    daysSinceService: daysService === 999 ? 0 : daysService,
    recommendation,
  };
}

export default function ChurnPredictor({ tenantId, onSelectCustomer }: Props) {
  const { user } = useAuth();
  const [risks, setRisks] = useState<ChurnRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState(30);
  const [actioned, setActioned] = useState<Set<string>>(new Set());

  const scan = async () => {
    setLoading(true);
    const [custSnap, evtSnap] = await Promise.all([
      getDocs(query(collection(db, 'customers'), where('tenantId', '==', tenantId))),
      getDocs(query(collection(db, `tenants/${tenantId}/serviceEvents`), where('tenantId', '==', tenantId))),
    ]);
    const customers = custSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const events = evtSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const result = customers
      .map(c => {
        const custEvents = events.filter((e: any) => e.clientId === c.id || e.customerId === c.id);
        return computeChurnScore(c, custEvents);
      })
      .filter(r => r.score >= threshold && r.reasons.length > 0)
      .sort((a, b) => b.score - a.score);

    setRisks(result);
    setLoading(false);
  };

  useEffect(() => { scan(); }, [tenantId, threshold]);

  const handleAction = async (risk: ChurnRisk) => {
    if (!user) return;
    await addActivity(tenantId, {
      tenantId,
      customerId: risk.customer.id,
      type: 'note',
      title: `Działanie retencyjne (churn score ${risk.score})`,
      body: risk.recommendation,
      createdBy: user.uid,
      createdByEmail: user.email ?? '',
    });
    setActioned(prev => new Set([...prev, risk.customer.id]));
  };

  const riskColor = (score: number) =>
    score >= 70 ? 'text-red-700 bg-red-50 border-red-200' :
    score >= 50 ? 'text-amber-700 bg-amber-50 border-amber-200' :
    'text-blue-700 bg-blue-50 border-blue-200';

  const riskBar = (score: number) =>
    score >= 70 ? 'bg-red-500' : score >= 50 ? 'bg-amber-500' : 'bg-blue-400';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Predykcja Churnu AI</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {risks.length} klientów z ryzykiem churnu (próg: {threshold})
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl">
            {[20, 30, 50, 70].map(t => (
              <button key={t} onClick={() => setThreshold(t)}
                className={`text-[9px] font-black px-3 py-1.5 rounded-xl transition-all ${
                  threshold === t ? 'bg-white text-slate-900 shadow' : 'text-slate-500'
                }`}>Próg {t}</button>
            ))}
          </div>
          <button onClick={scan} disabled={loading}
            className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Risk summary */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Wysokie ryzyko (≥70)', count: risks.filter(r => r.score >= 70).length, color: 'text-red-700 bg-red-50 border-red-200' },
            { label: 'Średnie ryzyko (50-69)', count: risks.filter(r => r.score >= 50 && r.score < 70).length, color: 'text-amber-700 bg-amber-50 border-amber-200' },
            { label: 'Niskie ryzyko (<50)', count: risks.filter(r => r.score < 50).length, color: 'text-blue-700 bg-blue-50 border-blue-200' },
          ].map(({ label, count, color }) => (
            <div key={label} className={`rounded-2xl p-4 border ${color}`}>
              <p className="text-[9px] font-black uppercase tracking-widest mb-1">{label}</p>
              <p className="text-2xl font-black">{count}</p>
            </div>
          ))}
        </div>
      )}

      {loading && <div className="flex justify-center py-10"><RefreshCw size={20} className="animate-spin text-indigo-400" /></div>}

      {!loading && risks.length === 0 && (
        <div className="text-center py-10 text-slate-400">
          <CheckCircle2 size={32} className="mx-auto mb-3 text-emerald-400" />
          <p className="text-xs font-black uppercase tracking-widest">Brak klientów z ryzykiem churnu</p>
        </div>
      )}

      <div className="space-y-3">
        {risks.map(risk => {
          const done = actioned.has(risk.customer.id);
          return (
            <div key={risk.customer.id} className={`rounded-2xl border overflow-hidden ${done ? 'opacity-60' : ''}`}>
              <div className={`px-5 py-3 border-b flex items-center gap-3 ${riskColor(risk.score)}`}>
                <TrendingDown size={14} className="flex-shrink-0" />
                <div className="flex-1">
                  <span className="text-[9px] font-black uppercase tracking-widest">
                    Ryzyko churnu: {risk.score}/100
                  </span>
                  <div className="h-1.5 bg-white/50 rounded-full mt-1 overflow-hidden">
                    <div className={`h-full rounded-full ${riskBar(risk.score)}`} style={{ width: `${risk.score}%` }} />
                  </div>
                </div>
              </div>
              <div className="bg-white px-5 py-4 flex items-start gap-4">
                <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Building2 size={14} className="text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-slate-900 cursor-pointer hover:text-indigo-700"
                    onClick={() => onSelectCustomer?.(risk.customer)}>
                    {risk.customer.name}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {risk.reasons.map((r, i) => (
                      <span key={i} className="text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{r}</span>
                    ))}
                  </div>
                  <p className="text-[10px] font-bold text-indigo-700 mt-2">→ {risk.recommendation}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {risk.customer.phone && (
                    <a href={`tel:${risk.customer.phone}`}
                      className="p-2 bg-slate-100 hover:bg-emerald-100 rounded-xl text-slate-500 hover:text-emerald-700">
                      <Phone size={12} />
                    </a>
                  )}
                  {risk.customer.email && (
                    <a href={`mailto:${risk.customer.email}`}
                      className="p-2 bg-slate-100 hover:bg-indigo-100 rounded-xl text-slate-500 hover:text-indigo-700">
                      <Mail size={12} />
                    </a>
                  )}
                  {!done ? (
                    <button onClick={() => handleAction(risk)}
                      className="text-[9px] font-black bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-xl uppercase tracking-widest">
                      Działaj
                    </button>
                  ) : (
                    <span className="text-[9px] font-black text-emerald-600">✓ Zanotowano</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
