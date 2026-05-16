import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, MapPin, Clock, CheckCircle2, AlertTriangle, Loader2, X } from 'lucide-react';
import { resolveToken, submitChangeRequest } from '../services/clientTokenService';
import { checkWorkerFeasibility } from '../services/availabilityService';
import type { ServiceEvent, ServiceLocation, EventChangeRequest } from '../types';
import { EVENT_STATUS_META } from '../types';

type Mode = 'loading' | 'error' | 'view' | 'reschedule' | 'location' | 'success';

export default function ClientReschedulePortal() {
  const { tenantId, tokenId } = useParams<{ tenantId: string; tokenId: string }>();
  const [event,   setEvent]   = useState<ServiceEvent | null>(null);
  const [mode,    setMode]    = useState<Mode>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  // reschedule state
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [feasibility, setFeasibility] = useState<any>(null);
  const [checking, setChecking] = useState(false);

  // location state
  const [addr, setAddr]   = useState('');
  const [city, setCity]   = useState('');
  const [postal, setPostal] = useState('');

  const [note, setNote]        = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!tenantId || !tokenId) { setErrorMsg('Nieprawidłowy link.'); setMode('error'); return; }
    resolveToken(tenantId, tokenId)
      .then(result => {
        if (!result) { setErrorMsg('Link wygasł lub jest nieprawidłowy.'); setMode('error'); return; }
        setEvent(result.event);
        setMode('view');
      })
      .catch(() => { setErrorMsg('Błąd serwera. Spróbuj ponownie.'); setMode('error'); });
  }, [tenantId, tokenId]);

  const fmtDT = (ts: any) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  };

  const checkFeasibility = async () => {
    if (!tenantId || !event || !date || !time) return;
    setChecking(true);
    try {
      const [h, m] = time.split(':').map(Number);
      const proposed = new Date(date); proposed.setHours(h, m, 0, 0);
      const proposedEnd = new Date(proposed.getTime() + event.estimatedDurationMinutes * 60_000);
      const workerId = event.assignedWorkers[0]?.uid;
      if (!workerId) { setFeasibility({ workerAvailable: true, travelFeasible: true, warnings: [], estimatedArrivalMinutes: 0, proposed, proposedEnd }); return; }
      const res = await checkWorkerFeasibility(
        tenantId, workerId, proposed, proposedEnd,
        event.location.lat, event.location.lng, event.id
      );
      setFeasibility({ ...res, proposed, proposedEnd });
    } finally { setChecking(false); }
  };

  const submitReschedule = async () => {
    if (!tenantId || !tokenId || !event || !feasibility) return;
    setSubmitting(true);
    try {
      const req: Omit<EventChangeRequest, 'id' | 'status' | 'feasibilityOk' | 'createdAt' | 'resolvedAt' | 'resolvedBy'> = {
        tenantId, eventId: event.id, tokenId,
        requestType: 'RESCHEDULE',
        proposedStart: feasibility.proposed,
        proposedEnd:   feasibility.proposedEnd,
        workerAvailable: feasibility.workerAvailable,
        travelFeasible:  feasibility.travelFeasible,
        estimatedArrivalMinutes: feasibility.estimatedArrivalMinutes,
        warnings: feasibility.warnings,
        clientNote: note,
      };
      await submitChangeRequest(tenantId, req);
      setMode('success');
    } finally { setSubmitting(false); }
  };

  const submitLocation = async () => {
    if (!tenantId || !tokenId || !event || !addr) return;
    setSubmitting(true);
    try {
      const newLoc: ServiceLocation = { address: addr, city, postalCode: postal };
      await submitChangeRequest(tenantId, {
        tenantId, eventId: event.id, tokenId,
        requestType: 'LOCATION_CHANGE',
        proposedLocation: newLoc,
        workerAvailable: true, travelFeasible: true, estimatedArrivalMinutes: 0,
        clientNote: note,
      });
      setMode('success');
    } finally { setSubmitting(false); }
  };

  if (mode === 'loading') return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 size={32} className="animate-spin text-emerald-500"/>
    </div>
  );

  if (mode === 'error') return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full text-center shadow-xl">
        <AlertTriangle size={32} className="text-rose-400 mx-auto mb-4"/>
        <h2 className="text-lg font-black text-slate-900 mb-2">Link nieważny</h2>
        <p className="text-sm text-slate-500">{errorMsg}</p>
      </div>
    </div>
  );

  if (mode === 'success') return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full text-center shadow-xl">
        <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-4"/>
        <h2 className="text-xl font-black text-slate-900 mb-2">Prośba wysłana!</h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          Twoja prośba o zmianę została przekazana do naszego zespołu.
          Potwierdzimy ją wiadomością e-mail.
        </p>
      </div>
    </div>
  );

  if (!event) return null;
  const meta = EVENT_STATUS_META[event.status];

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-lg mx-auto space-y-4">{children}</div>
    </div>
  );

  if (mode === 'view') return (
    <Wrapper>
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="h-2" style={{ background: event.serviceTypeColor }}/>
        <div className="p-6 space-y-4">
          <div>
            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>{meta.label}</span>
            <h1 className="text-2xl font-black text-slate-900 mt-2">{event.serviceTypeName}</h1>
            <p className="text-slate-500 text-sm">{event.clientName}</p>
          </div>
          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3">
              <Clock size={14} className="text-slate-400 mt-0.5 flex-shrink-0"/>
              <div>
                <p className="text-xs font-black text-slate-700">{fmtDT(event.scheduledStart)}</p>
                <p className="text-[10px] text-slate-400">{event.estimatedDurationMinutes} min</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin size={14} className="text-emerald-500 mt-0.5 flex-shrink-0"/>
              <p className="text-xs text-slate-700">
                {event.location.address}, {event.location.postalCode} {event.location.city}
              </p>
            </div>
            {event.description && (
              <p className="text-xs text-slate-600 bg-slate-50 rounded-2xl p-3">{event.description}</p>
            )}
          </div>
        </div>
      </div>

      {['SCHEDULED', 'CONFIRMED'].includes(event.status) && (
        <div className="space-y-2">
          <button onClick={() => setMode('reschedule')}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl text-sm uppercase tracking-widest">
            <Calendar size={16}/> Zmień termin
          </button>
          <button onClick={() => setMode('location')}
            className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black py-4 rounded-2xl text-sm uppercase tracking-widest">
            <MapPin size={16}/> Zmień lokalizację
          </button>
        </div>
      )}
    </Wrapper>
  );

  if (mode === 'reschedule') return (
    <Wrapper>
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-900">Nowy termin</h2>
          <button onClick={() => setMode('view')} className="p-1.5 rounded-xl hover:bg-slate-100"><X size={16} className="text-slate-400"/></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Data</label>
            <input type="date" value={date} onChange={e => { setDate(e.target.value); setFeasibility(null); }}
              min={new Date().toISOString().split('T')[0]}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-400"/>
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Godzina</label>
            <input type="time" value={time} onChange={e => { setTime(e.target.value); setFeasibility(null); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-400"/>
          </div>
        </div>
        <button onClick={checkFeasibility} disabled={!date || !time || checking}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-black py-3 rounded-2xl text-xs uppercase tracking-widest">
          {checking ? <Loader2 size={14} className="animate-spin"/> : <Clock size={14}/>}
          Sprawdź dostępność
        </button>
        {feasibility && (
          <div className={`rounded-2xl p-4 border ${feasibility.workerAvailable && feasibility.travelFeasible ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
            <div className="flex items-center gap-2 mb-1">
              {feasibility.workerAvailable && feasibility.travelFeasible
                ? <CheckCircle2 size={14} className="text-emerald-600"/>
                : <AlertTriangle size={14} className="text-rose-600"/>
              }
              <p className="text-xs font-black text-slate-700">
                {feasibility.workerAvailable && feasibility.travelFeasible ? 'Termin dostępny' : 'Termin problematyczny — prośba zostanie zweryfikowana'}
              </p>
            </div>
            {feasibility.warnings?.map((w: string, i: number) => (
              <p key={i} className="text-[10px] text-rose-700 mt-1">⚠ {w}</p>
            ))}
            {feasibility.estimatedArrivalMinutes > 0 && (
              <p className="text-[10px] text-slate-600 mt-1">Szacowany czas dojazdu: {feasibility.estimatedArrivalMinutes} min</p>
            )}
          </div>
        )}
        <div>
          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Uwagi (opcjonalnie)</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none resize-none"/>
        </div>
        <button onClick={submitReschedule} disabled={!feasibility || submitting}
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-black py-3 rounded-2xl text-xs uppercase tracking-widest">
          {submitting ? <Loader2 size={12} className="animate-spin"/> : <CheckCircle2 size={12}/>}
          Wyślij prośbę o zmianę
        </button>
      </div>
    </Wrapper>
  );

  return (
    <Wrapper>
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-900">Nowa lokalizacja</h2>
          <button onClick={() => setMode('view')} className="p-1.5 rounded-xl hover:bg-slate-100"><X size={16} className="text-slate-400"/></button>
        </div>
        {[
          { label: 'Ulica i numer *', val: addr, set: setAddr, placeholder: 'ul. Przykładowa 1' },
          { label: 'Kod pocztowy', val: postal, set: setPostal, placeholder: '00-000' },
          { label: 'Miasto *', val: city, set: setCity, placeholder: 'Warszawa' },
        ].map(({ label, val, set, placeholder }) => (
          <div key={label}>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</label>
            <input value={val} onChange={e => set(e.target.value)} placeholder={placeholder}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-400"/>
          </div>
        ))}
        <div>
          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Uwagi / instrukcje dojazdu</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none resize-none"/>
        </div>
        <button onClick={submitLocation} disabled={!addr || !city || submitting}
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-black py-3 rounded-2xl text-xs uppercase tracking-widest">
          {submitting ? <Loader2 size={12} className="animate-spin"/> : <CheckCircle2 size={12}/>}
          Wyślij prośbę o zmianę
        </button>
      </div>
    </Wrapper>
  );
}
