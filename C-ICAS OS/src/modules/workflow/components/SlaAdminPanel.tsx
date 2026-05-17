import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, Bell, CheckCircle2, Clock } from 'lucide-react';
import { useTenant } from '../../../shared/hooks/useTenant';
import { runSlaScan } from '../services/slaTriggerService';
import type { SlaViolation } from '../services/slaTriggerService';

export default function SlaAdminPanel() {
  const { activeTenantId } = useTenant();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ violations: SlaViolation[]; dispatched: number } | null>(null);
  const [error, setError] = useState('');
  const [timeoutHours, setTimeoutHours] = useState(48);

  const run = async () => {
    if (!activeTenantId) return;
    setLoading(true);
    setError('');
    try {
      const res = await runSlaScan(activeTenantId, timeoutHours);
      setResult(res);
    } catch (e: any) {
      setError(e.message ?? 'Błąd skanowania SLA');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">SLA Monitor</p>
          <p className="text-xs text-slate-400">Skanuje dokumenty PENDING_APPROVAL/SUBMITTED i wysyła powiadomienia do approverów</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-[9px] font-black text-slate-400 uppercase whitespace-nowrap">Próg (h):</label>
            <input
              type="number"
              value={timeoutHours}
              onChange={e => setTimeoutHours(Math.max(1, Number(e.target.value)))}
              min={1}
              className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-violet-400 text-center"
            />
          </div>
          <button
            onClick={run}
            disabled={loading}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
          >
            {loading
              ? <><RefreshCw size={11} className="animate-spin" /> Skanowanie...</>
              : <><Bell size={11} /> Uruchom skan SLA</>
            }
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 rounded-2xl px-4 py-3 text-xs font-bold">
          <AlertTriangle size={13} /> {error}
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 border ${
            result.violations.length === 0
              ? 'bg-emerald-50 border-emerald-100'
              : 'bg-amber-50 border-amber-100'
          }`}>
            {result.violations.length === 0 ? (
              <>
                <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0" />
                <span className="text-xs font-black text-emerald-800">Brak naruszeń SLA — wszystkie dokumenty w normie</span>
              </>
            ) : (
              <>
                <AlertTriangle size={15} className="text-amber-600 flex-shrink-0" />
                <span className="text-xs font-black text-amber-800">
                  {result.violations.length} {result.violations.length === 1 ? 'naruszenie' : 'naruszenia'} SLA —
                  wysłano {result.dispatched} powiadomień
                </span>
              </>
            )}
          </div>

          {result.violations.length > 0 && (
            <div className="space-y-2">
              {result.violations.map(v => (
                <div key={v.documentId} className="flex items-center justify-between bg-white border border-slate-100 rounded-2xl px-4 py-3 gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-800 truncate">{v.documentTitle}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                      {v.status} · {v.assignedTo.length} approver{v.assignedTo.length !== 1 ? 'ów' : ''}
                    </p>
                  </div>
                  <span className="text-[9px] font-black bg-red-100 text-red-700 px-3 py-1.5 rounded-full flex-shrink-0 flex items-center gap-1">
                    <Clock size={9} /> +{v.hoursOverdue}h ponad SLA
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!result && !loading && (
        <div className="text-center py-10 text-slate-300">
          <AlertTriangle size={32} className="mx-auto mb-3" />
          <p className="text-xs font-bold uppercase tracking-widest">Kliknij "Uruchom skan SLA" aby sprawdzić naruszenia</p>
        </div>
      )}
    </div>
  );
}
