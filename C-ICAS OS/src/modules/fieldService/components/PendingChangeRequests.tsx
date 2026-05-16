import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, X, AlertTriangle, MapPin, Calendar, Loader2 } from 'lucide-react';
import { getPendingChangeRequests, resolveChangeRequest } from '../services/clientTokenService';
import { updateServiceEvent } from '../services/calendarService';
import { useTenant } from '../../../shared/hooks/useTenant';
import { useAuth } from '../../../shared/hooks/AuthContext';
import type { EventChangeRequest } from '../types';

const TYPE_LABEL: Record<EventChangeRequest['requestType'], string> = {
  RESCHEDULE:      'Zmiana terminu',
  LOCATION_CHANGE: 'Zmiana lokalizacji',
  WORKER_CHANGE:   'Zmiana pracownika',
};

export default function PendingChangeRequests() {
  const { activeTenantId } = useTenant();
  const { user }           = useAuth();
  const [requests, setRequests] = useState<EventChangeRequest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!activeTenantId) return;
    getPendingChangeRequests(activeTenantId).then(setRequests).finally(() => setLoading(false));
  }, [activeTenantId]);

  const handle = async (req: EventChangeRequest, approve: boolean) => {
    if (!activeTenantId || !user) return;
    setResolving(req.id); setError('');
    try {
      await resolveChangeRequest(activeTenantId, req.id, approve, user.uid);
      if (approve) {
        const patch: any = {};
        if (req.requestType === 'RESCHEDULE' && req.proposedStart) {
          patch.scheduledStart = req.proposedStart;
          if (req.proposedEnd) patch.scheduledEnd = req.proposedEnd;
        }
        if (req.requestType === 'LOCATION_CHANGE' && req.proposedLocation) {
          patch.location = req.proposedLocation;
        }
        if (Object.keys(patch).length) {
          await updateServiceEvent(activeTenantId, req.eventId, patch);
        }
      }
      setRequests(prev => prev.filter(r => r.id !== req.id));
    } catch (e: any) { setError(e.message ?? 'Błąd.'); }
    finally { setResolving(null); }
  };

  const fmt = (ts: any) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return (
    <div className="py-16 text-center text-slate-400 text-xs font-black uppercase animate-pulse">Ładowanie...</div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-700 uppercase tracking-tight">Prośby klientów o zmianę</h3>
        {requests.length > 0 && (
          <span className="bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
            {requests.length} oczekujących
          </span>
        )}
      </div>
      {error && <p className="text-red-600 text-xs font-bold flex items-center gap-1"><AlertTriangle size={12}/>{error}</p>}

      {requests.length === 0 ? (
        <div className="bg-slate-50 rounded-[2rem] p-10 text-center border border-slate-100">
          <CheckCircle2 size={24} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-300 font-black uppercase tracking-widest text-xs">Brak oczekujących próśb</p>
        </div>
      ) : requests.map(req => (
        <div key={req.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                req.requestType === 'RESCHEDULE'      ? 'bg-blue-100 text-blue-700' :
                req.requestType === 'LOCATION_CHANGE' ? 'bg-amber-100 text-amber-700' :
                'bg-purple-100 text-purple-700'
              }`}>{TYPE_LABEL[req.requestType]}</span>
              <p className="text-[9px] text-slate-400 mt-1 flex items-center gap-1"><Clock size={9}/>{fmt(req.createdAt)}</p>
            </div>
            {(req.warnings?.length ?? 0) > 0 && (
              <AlertTriangle size={16} className="text-rose-400 flex-shrink-0" />
            )}
          </div>

          {req.requestType === 'RESCHEDULE' && req.proposedStart && (
            <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-3">
              <Calendar size={12} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-700">{fmt(req.proposedStart)}</span>
              <span className={`text-[9px] font-black ml-auto ${
                req.workerAvailable && req.travelFeasible ? 'text-emerald-600' : 'text-rose-600'
              }`}>{req.workerAvailable && req.travelFeasible ? 'Pracownik wolny' : 'Możliwy konflikt'}</span>
            </div>
          )}

          {req.requestType === 'LOCATION_CHANGE' && req.proposedLocation && (
            <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-3">
              <MapPin size={12} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-700">
                {req.proposedLocation.address}, {req.proposedLocation.city}
              </span>
            </div>
          )}

          {req.warnings?.map((w, i) => (
            <p key={i} className="text-[10px] text-rose-600 flex items-center gap-1">
              <AlertTriangle size={9}/> {w}
            </p>
          ))}

          {req.clientNote && (
            <p className="text-xs text-slate-500 italic bg-slate-50 rounded-xl p-3">"{req.clientNote}"</p>
          )}

          <div className="flex gap-2 pt-1">
            <button disabled={!!resolving} onClick={() => handle(req, false)}
              className="flex-1 flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 font-black py-2.5 rounded-2xl text-xs uppercase tracking-widest transition-colors">
              <X size={12}/> Odrzuć
            </button>
            <button disabled={!!resolving} onClick={() => handle(req, true)}
              className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-black py-2.5 rounded-2xl text-xs uppercase tracking-widest">
              {resolving === req.id ? <Loader2 size={12} className="animate-spin"/> : <CheckCircle2 size={12}/>}
              Zatwierdź i zastosuj
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
