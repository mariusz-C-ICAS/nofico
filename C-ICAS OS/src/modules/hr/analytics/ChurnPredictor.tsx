import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { TrendingDown, AlertTriangle, ShieldCheck, Users, Sparkles, ChevronDown, ChevronUp, RefreshCw, Brain, BarChart3, Filter } from 'lucide-react';
import { calcChurnRisk, getAiRetentionAdvice, getRiskColors, type ChurnResult, type RiskLevel } from './churnService';
import { handleFirestoreError, OperationType } from '../../../shared/lib/firestoreUtils';

const RISK_ORDER: RiskLevel[] = ['critical', 'high', 'medium', 'low'];

function RiskBadge({ level, score }: { level: RiskLevel; score: number }) {
  const c = getRiskColors(level);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${c.bg} ${c.text} ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${level === 'critical' ? 'bg-rose-500 animate-pulse' : level === 'high' ? 'bg-orange-500' : level === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'}`}/>
      {c.label} {score}%
    </span>
  );
}

function FactorBar({ label, score, description, severity }: { label: string; score: number; description: string; severity: string }) {
  const color = severity === 'high' ? 'bg-rose-500' : severity === 'medium' ? 'bg-amber-400' : 'bg-emerald-400';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
        <span className="font-bold text-slate-700">{label}</span>
        <span className="font-mono text-slate-500">{score}%</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
      <p className="text-[9px] text-slate-400">{description}</p>
    </div>
  );
}

export default function ChurnPredictor() {
  const { activeTenantId } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [leaveRecords, setLeaveRecords] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [aiTexts, setAiTexts] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [filterLevel, setFilterLevel] = useState<RiskLevel | 'all'>('all');

  useEffect(() => {
    if (!activeTenantId) return;
    const unEmp = onSnapshot(
      query(collection(db, 'employees'), where('tenantId', '==', activeTenantId)),
      s => setEmployees(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      e => handleFirestoreError(e, OperationType.LIST, 'employees')
    );
    const unLeave = onSnapshot(
      query(collection(db, 'leaves'), where('tenantId', '==', activeTenantId)),
      s => setLeaveRecords(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => {}
    );
    return () => { unEmp(); unLeave(); };
  }, [activeTenantId]);

  const results = useMemo(
    () => employees
      .map(emp => calcChurnRisk(emp, leaveRecords))
      .sort((a, b) => b.riskScore - a.riskScore),
    [employees, leaveRecords]
  );

  const filtered = filterLevel === 'all' ? results : results.filter(r => r.riskLevel === filterLevel);

  const stats = useMemo(() => ({
    critical: results.filter(r => r.riskLevel === 'critical').length,
    high:     results.filter(r => r.riskLevel === 'high').length,
    medium:   results.filter(r => r.riskLevel === 'medium').length,
    low:      results.filter(r => r.riskLevel === 'low').length,
    avgRisk:  results.length > 0 ? Math.round(results.reduce((s, r) => s + r.riskScore, 0) / results.length) : 0,
  }), [results]);

  const handleAiAdvice = async (result: ChurnResult) => {
    setAiLoading(result.employeeId);
    try {
      const text = await getAiRetentionAdvice(result);
      setAiTexts(prev => ({ ...prev, [result.employeeId]: text }));
    } catch {
      setAiTexts(prev => ({ ...prev, [result.employeeId]: 'Błąd połączenia z AI. Sprawdź klucz GEMINI_API_KEY.' }));
    } finally {
      setAiLoading(null);
    }
  };

  // Department risk heatmap data
  const deptRisk = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    results.forEach(r => {
      if (!map[r.department]) map[r.department] = { total: 0, count: 0 };
      map[r.department].total += r.riskScore;
      map[r.department].count += 1;
    });
    return Object.entries(map)
      .map(([dept, v]) => ({ dept, avg: Math.round(v.total / v.count), count: v.count }))
      .sort((a, b) => b.avg - a.avg);
  }, [results]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 p-10 opacity-10"><TrendingDown size={130} /></div>
        <div className="relative z-10">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1 flex items-center gap-2">
            <Brain size={12} /> AI HR Analytics
          </h3>
          <h2 className="text-2xl font-black uppercase text-white tracking-tight">Predyktor Rotacji Pracowników</h2>
          <p className="text-xs text-slate-400 mt-2 max-w-xl">Model scoringowy analizuje 5 czynników ryzyka odejścia dla każdego pracownika. Kliknij "AI Rekomendacje" by uzyskać spersonalizowane działania retencyjne.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {([
          { label: 'Krytyczne', val: stats.critical, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200', level: 'critical' as RiskLevel },
          { label: 'Wysokie', val: stats.high, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', level: 'high' as RiskLevel },
          { label: 'Średnie', val: stats.medium, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', level: 'medium' as RiskLevel },
          { label: 'Niskie', val: stats.low, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', level: 'low' as RiskLevel },
        ] as const).map(s => (
          <button key={s.label} onClick={() => setFilterLevel(filterLevel === s.level ? 'all' : s.level)}
            className={`rounded-2xl border p-4 text-center transition-all ${s.bg} ${filterLevel === s.level ? 'ring-2 ring-offset-1 ring-indigo-500 scale-[1.03]' : 'hover:scale-[1.02]'}`}>
            <div className={`text-3xl font-black ${s.color}`}>{s.val}</div>
            <div className={`text-[9px] font-black uppercase tracking-widest mt-1 ${s.color}`}>{s.label}</div>
          </button>
        ))}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
          <div className="text-3xl font-black text-slate-800">{stats.avgRisk}%</div>
          <div className="text-[9px] font-black uppercase tracking-widest mt-1 text-slate-500">Śr. ryzyko</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Department heatmap */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2"><BarChart3 size={12}/> Ryzyko per dział</h4>
          {deptRisk.length === 0 && <p className="text-xs text-slate-400 italic">Brak danych działów.</p>}
          <div className="space-y-3">
            {deptRisk.map(d => {
              const level: RiskLevel = d.avg >= 70 ? 'critical' : d.avg >= 50 ? 'high' : d.avg >= 30 ? 'medium' : 'low';
              const c = getRiskColors(level);
              return (
                <div key={d.dept}>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="font-bold text-slate-700 truncate max-w-[120px]">{d.dept}</span>
                    <span className={`font-black ${c.text}`}>{d.avg}% ({d.count})</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${level === 'critical' ? 'bg-rose-500' : level === 'high' ? 'bg-orange-400' : level === 'medium' ? 'bg-amber-400' : 'bg-emerald-400'}`}
                      style={{ width: `${d.avg}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Employee list */}
        <div className="lg:col-span-3 space-y-3">
          <div className="flex items-center gap-3 mb-1">
            <h4 className="font-black text-sm text-slate-800 uppercase tracking-tight flex items-center gap-2"><Users size={14}/> Pracownicy</h4>
            {filterLevel !== 'all' && (
              <button onClick={() => setFilterLevel('all')} className="text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                Pokaż wszystkich ×
              </button>
            )}
            <span className="text-[10px] text-slate-400 ml-auto">{filtered.length} / {results.length} pracowników</span>
          </div>

          {filtered.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400 text-xs">
              Brak pracowników w wybranej kategorii ryzyka.
            </div>
          )}

          {filtered.map(result => {
            const isOpen = expanded === result.employeeId;
            const aiText = aiTexts[result.employeeId];
            return (
              <div key={result.employeeId} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Row */}
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : result.employeeId)}
                >
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black uppercase flex-shrink-0 ${getRiskColors(result.riskLevel).bg} ${getRiskColors(result.riskLevel).text}`}>
                    {result.employeeName[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-800 truncate">{result.employeeName}</span>
                      <span className="text-[10px] text-slate-400">{result.contractType}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{result.department} · {result.role}</div>
                  </div>
                  <div className="text-right flex-shrink-0 space-y-1">
                    <RiskBadge level={result.riskLevel} score={result.riskScore} />
                    <div className="text-[9px] text-slate-400">{result.tenureMonths} mies. stażu</div>
                  </div>
                  <div className="flex-shrink-0 text-slate-400">{isOpen ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</div>
                </div>

                {/* Expanded details */}
                {isOpen && (
                  <div className="border-t border-slate-100 p-5 space-y-5">
                    {/* Risk bar */}
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="font-black text-slate-700 uppercase tracking-tight">Ryzyko odejścia</span>
                        <span className={`font-black ${getRiskColors(result.riskLevel).text}`}>{result.riskScore}%</span>
                      </div>
                      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${result.riskLevel === 'critical' ? 'bg-rose-500' : result.riskLevel === 'high' ? 'bg-orange-400' : result.riskLevel === 'medium' ? 'bg-amber-400' : 'bg-emerald-400'}`}
                          style={{ width: `${result.riskScore}%` }}
                        />
                      </div>
                    </div>

                    {/* Factors */}
                    <div>
                      <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Czynniki ryzyka</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {result.factors.map(f => (
                          <FactorBar key={f.label} {...f} />
                        ))}
                      </div>
                    </div>

                    {/* AI recommendations */}
                    <div className="border-t border-slate-100 pt-4">
                      {!aiText ? (
                        <button
                          onClick={() => handleAiAdvice(result)}
                          disabled={aiLoading === result.employeeId}
                          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-sm"
                        >
                          {aiLoading === result.employeeId
                            ? <><RefreshCw size={12} className="animate-spin"/> Analizuję...</>
                            : <><Sparkles size={12}/> AI Rekomendacje retencyjne</>
                          }
                        </button>
                      ) : (
                        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                          <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-3 flex items-center gap-2">
                            <Sparkles size={10}/> Rekomendacje AI — {result.employeeName}
                          </div>
                          <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">{aiText}</p>
                          <button
                            onClick={() => handleAiAdvice(result)}
                            disabled={aiLoading === result.employeeId}
                            className="mt-3 text-[9px] text-indigo-500 hover:text-indigo-700 font-black uppercase flex items-center gap-1"
                          >
                            <RefreshCw size={9}/> Odśwież
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
