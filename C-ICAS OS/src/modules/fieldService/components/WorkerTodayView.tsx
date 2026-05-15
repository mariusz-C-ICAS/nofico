import React, { useState, useEffect } from 'react';
import {
  Navigation, Phone, MessageSquare, Camera, CheckCircle2,
  MapPin, Clock, AlertTriangle, Car, Loader2, ChevronRight, BellRing,
} from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { getEventsForWorker, updateEventStatus } from '../services/calendarService';
import { buildMapsNavUrl, buildSmsEtaMessage, publishPositionOnce, estimateTravelTime, getGpsConsent } from '../services/gpsService';
import GpsConsentModal from './GpsConsentModal';
import type { ServiceEvent } from '../types';
import { EVENT_STATUS_META } from '../types';

export default function WorkerTodayView() {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const [events, setEvents] = useState<ServiceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [etaMap, setEtaMap] = useState<Record<string, number>>({});
  const [hasGpsConsent, setHasGpsConsent] = useState<boolean | null>(null);
  const [showConsentModal, setShowConsentModal] = useState(false);

  useEffect(() => {
    if (!user || !activeTenantId) return;
    getGpsConsent(activeTenantId, user.uid).then(consent => {
      if (consent === null) { setShowConsentModal(true); setHasGpsConsent(false); }
      else setHasGpsConsent(consent.hasConsent);
    });
  }, [user?.uid, activeTenantId]);

  useEffect(() => {
    if (!user || !activeTenantId) return;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const end   = new Date(); end.setHours(23, 59, 59, 999);
    const tomorrow = new Date(end); tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    getEventsForWorker(activeTenantId, user.uid, today, tomorrow)
      .then(ev => { setEvents(ev.filter(e => e.status !== 'CANCELLED' && e.status !== 'ARCHIVED')); })
      .finally(() => setLoading(false));
  }, [user, activeTenantId]);

  const calcEta = async (event: ServiceEvent) => {
    if (!user || !activeTenantId) return;
    const pos = await publishPositionOnce(activeTenantId, user.uid, user.email ?? '', user.displayName ?? '');
    if (!pos || !event.location.lat || !event.location.lng) return;
    const eta = estimateTravelTime(pos.lat, pos.lng, event.location.lat, event.location.lng);
    setEtaMap(prev => ({ ...prev, [event.id]: eta }));
  };

  const transition = async (event: ServiceEvent, status: ServiceEvent['status']) => {
    if (!activeTenantId) return;
    setActionLoading(event.id + status);
    try {
      await updateEventStatus(activeTenantId, event.id, status);
      setEvents(prev => prev.map(e => e.id === event.id ? { ...e, status } : e));
      if (status === 'IN_TRANSIT') calcEta(event);
    } finally { setActionLoading(null); }
  };

  const fmtTime = (ts: any): string => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  };

  const isToday = (ts: any): boolean => {
    if (!ts) return false;
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const now = new Date();
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth();
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="animate-spin text-emerald-500" size={24} />
    </div>
  );

  const shouldLeaveNow = (event: ServiceEvent): boolean => {
    if (!['SCHEDULED', 'CONFIRMED'].includes(event.status)) return false;
    if (!event.scheduledStart) return false;
    const start = event.scheduledStart.toDate ? event.scheduledStart.toDate() : new Date(event.scheduledStart);
    const travelMins = event.estimatedTravelMinutes ?? 30;
    const leaveBy = new Date(start.getTime() - (travelMins + 15) * 60_000);
    return new Date() >= leaveBy;
  };

  const todayEvents = events.filter(e => isToday(e.scheduledStart));
  const tomorrowEvents = events.filter(e => !isToday(e.scheduledStart));

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {showConsentModal && (
        <GpsConsentModal onClose={consented => { setHasGpsConsent(consented); setShowConsentModal(false); }} />
      )}
      {hasGpsConsent === false && !showConsentModal && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle size={14} className="text-amber-600 mt-0.5 flex-shrink-0"/>
          <div>
            <p className="text-xs font-black text-amber-700">GPS nieaktywny</p>
            <p className="text-[10px] text-amber-600 mt-0.5">
              Śledzenie GPS jest wyłączone — obliczanie ETA i nawigacja będą ograniczone.
              <button onClick={() => setShowConsentModal(true)} className="ml-1 underline font-bold">Włącz GPS</button>
            </p>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
            {new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Mój dzień pracy</h2>
        </div>
        <span className="text-sm font-black text-emerald-600 bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-200">
          {todayEvents.length} zdarzeń
        </span>
      </div>

      {todayEvents.length === 0 && tomorrowEvents.length === 0 && (
        <div className="bg-slate-50 rounded-[2rem] p-10 text-center">
          <p className="text-slate-300 font-black uppercase tracking-widest text-sm">Brak zaplanowanych zdarzeń</p>
        </div>
      )}

      {todayEvents.length > 0 && (
        <div className="space-y-4">
          {todayEvents.map(event => (
            <EventWorkCard
              key={event.id}
              event={event}
              eta={etaMap[event.id]}
              actionLoading={actionLoading}
              onTransition={transition}
              onCalcEta={() => calcEta(event)}
              departureAlert={shouldLeaveNow(event)}
              gpsEnabled={hasGpsConsent === true}
            />
          ))}
        </div>
      )}

      {tomorrowEvents.length > 0 && (
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Jutro</p>
          <div className="space-y-3">
            {tomorrowEvents.map(event => (
              <div key={event.id} className="bg-slate-50 rounded-[2rem] p-5 border border-slate-200 opacity-70">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ background: event.serviceTypeColor }} />
                  <div className="flex-1">
                    <p className="text-sm font-black text-slate-700">{event.clientName}</p>
                    <p className="text-xs text-slate-500">{event.serviceTypeName} · {fmtTime(event.scheduledStart)}</p>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin size={9} />{event.location.address}, {event.location.city}
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-slate-300" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EventWorkCard({
  event, eta, actionLoading, onTransition, onCalcEta, departureAlert, gpsEnabled,
}: {
  event: ServiceEvent;
  eta?: number;
  actionLoading: string | null;
  onTransition: (e: ServiceEvent, s: ServiceEvent['status']) => void;
  onCalcEta: () => void;
  departureAlert?: boolean;
  gpsEnabled?: boolean;
}) {
  const meta = EVENT_STATUS_META[event.status];
  const fmtTime = (ts: any) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  };
  const isLoading = (s: string) => actionLoading === event.id + s;

  const borderColor = event.status === 'IN_TRANSIT' ? 'border-amber-300' :
    event.status === 'ON_SITE' ? 'border-green-300' :
    event.status === 'COMPLETED' ? 'border-teal-300' : 'border-slate-200';

  return (
    <div className={`bg-white rounded-[2rem] border-2 ${borderColor} p-6 shadow-sm space-y-5`}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0" style={{ background: event.serviceTypeColor }} />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>{meta.label}</span>
            {event.isRecurring && <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">Abonament</span>}
          </div>
          <h3 className="text-lg font-black text-slate-900">{event.clientName}</h3>
          <p className="text-sm text-emerald-700 font-bold">{event.serviceTypeName}</p>
          {event.description && <p className="text-xs text-slate-500 mt-1">{event.description}</p>}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xl font-black text-slate-900">{fmtTime(event.scheduledStart)}</p>
          <p className="text-xs text-slate-400 font-bold">{event.estimatedDurationMinutes} min</p>
        </div>
      </div>

      {/* Location */}
      <div className="bg-slate-50 rounded-2xl p-4 space-y-1">
        <p className="text-xs font-black text-slate-700 flex items-center gap-1.5">
          <MapPin size={12} className="text-emerald-600" />
          {event.location.address}, {event.location.postalCode} {event.location.city}
        </p>
        {event.location.accessNotes && (
          <p className="text-[10px] text-slate-500 pl-5">{event.location.accessNotes}</p>
        )}
      </div>

      {/* Departure alert */}
      {departureAlert && (
        <div className="bg-rose-50 border-2 border-rose-400 rounded-2xl p-3 flex items-center gap-2 animate-pulse">
          <BellRing size={14} className="text-rose-600 flex-shrink-0" />
          <p className="text-xs font-black text-rose-700">
            Czas wyruszyć! Uwzględniając czas dojazdu ({event.estimatedTravelMinutes ?? 30} min) powinieneś już jechać.
          </p>
        </div>
      )}

      {/* ETA Banner */}
      {eta && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center gap-2">
          <Clock size={12} className="text-amber-600" />
          <p className="text-xs font-black text-amber-700">
            Szacowany czas dojazdu: <span className="text-lg">{eta}</span> min
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        {/* Navigate */}
        <a
          href={buildMapsNavUrl(`${event.location.address}, ${event.location.city}`)}
          target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-black px-4 py-3 rounded-2xl text-xs uppercase tracking-widest"
        >
          <Navigation size={14} /> Nawiguj
        </a>

        {/* Call with ETA */}
        {event.clientPhone ? (
          <a
            href={buildSmsEtaMessage(event.clientPhone, eta ?? 30)}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-3 rounded-2xl text-xs uppercase tracking-widest"
          >
            <MessageSquare size={14} /> SMS z ETA
          </a>
        ) : (
          <button
            onClick={onCalcEta}
            className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black px-4 py-3 rounded-2xl text-xs uppercase tracking-widest"
          >
            <Clock size={14} /> Oblicz ETA
          </button>
        )}
      </div>

      {/* Status transitions */}
      <div className="flex gap-2">
        {event.status === 'CONFIRMED' || event.status === 'SCHEDULED' ? (
          <button
            disabled={!!actionLoading}
            onClick={() => onTransition(event, 'IN_TRANSIT')}
            className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-black px-4 py-3 rounded-2xl text-xs uppercase tracking-widest"
          >
            {isLoading('IN_TRANSIT') ? <Loader2 size={14} className="animate-spin" /> : <Car size={14} />}
            Wyjeżdżam
          </button>
        ) : null}

        {event.status === 'IN_TRANSIT' ? (
          <button
            disabled={!!actionLoading}
            onClick={() => onTransition(event, 'ON_SITE')}
            className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-black px-4 py-3 rounded-2xl text-xs uppercase tracking-widest"
          >
            {isLoading('ON_SITE') ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
            Dotarłem
          </button>
        ) : null}

        {event.status === 'ON_SITE' ? (
          <button
            disabled={!!actionLoading}
            onClick={() => onTransition(event, 'COMPLETED')}
            className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white font-black px-4 py-3 rounded-2xl text-xs uppercase tracking-widest shadow-lg shadow-teal-500/20"
          >
            {isLoading('COMPLETED') ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Zakończone
          </button>
        ) : null}

        {(event.status === 'CONFIRMED' || event.status === 'SCHEDULED' || event.status === 'ON_SITE') && (
          <a
            href={`/workflow`}
            className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest"
          >
            <Camera size={14} /> Foto
          </a>
        )}
      </div>
    </div>
  );
}
