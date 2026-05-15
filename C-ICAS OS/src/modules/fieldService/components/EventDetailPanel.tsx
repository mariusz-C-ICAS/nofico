import React, { useState } from 'react';
import {
  MapPin, Phone, Clock, User, RefreshCw, Navigation, MessageSquare,
  CheckCircle2, X, AlertTriangle, Camera, Repeat, Send, Copy, Check,
} from 'lucide-react';
import { updateEventStatus } from '../services/calendarService';
import { buildMapsNavUrl, buildSmsEtaMessage } from '../services/gpsService';
import { createClientToken, buildClientPortalUrl } from '../services/clientTokenService';
import CostEstimatePanel from './CostEstimatePanel';
import type { ServiceEvent } from '../types';
import { EVENT_STATUS_META } from '../types';

interface Props {
  event: ServiceEvent;
  onClose: () => void;
  onUpdated: () => void;
}

const VALID_TRANSITIONS: Partial<Record<ServiceEvent['status'], ServiceEvent['status'][]>> = {
  SCHEDULED:  ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:  ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['ON_SITE', 'CANCELLED'],
  ON_SITE:    ['COMPLETED', 'CANCELLED'],
  COMPLETED:  ['ARCHIVED'],
};

const TRANSITION_LABELS: Partial<Record<ServiceEvent['status'], string>> = {
  CONFIRMED:  'Potwierdź',
  IN_TRANSIT: 'W drodze',
  ON_SITE:    'Na miejscu',
  COMPLETED:  'Zakończone',
  CANCELLED:  'Anuluj zdarzenie',
  ARCHIVED:   'Archiwizuj',
};

export default function EventDetailPanel({ event, onClose, onUpdated }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [portalUrl, setPortalUrl]   = useState('');
  const [sendingLink, setSendingLink] = useState(false);
  const [copied, setCopied] = useState(false);

  const fmtTime = (ts: any) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  };
  const fmtDate = (ts: any) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const nextStatuses = VALID_TRANSITIONS[event.status] ?? [];

  const handleSendToClient = async () => {
    if (!event.tenantId) return;
    setSendingLink(true); setError('');
    try {
      const tokenId = await createClientToken(event.tenantId, event.id, event.clientEmail ?? '');
      const url = buildClientPortalUrl(event.tenantId, tokenId);
      setPortalUrl(url);
    } catch (e: any) { setError(e.message ?? 'Błąd generowania linku.'); }
    finally { setSendingLink(false); }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTransition = async (status: ServiceEvent['status']) => {
    setLoading(status); setError('');
    try {
      await updateEventStatus(event.tenantId, event.id, status);
      onUpdated();
    } catch (e: any) { setError(e.message ?? 'Błąd.'); }
    finally { setLoading(null); }
  };

  const meta = EVENT_STATUS_META[event.status];

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 flex items-start gap-3">
        <div className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0" style={{ background: event.serviceTypeColor }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>{meta.label}</span>
            {event.isRecurring && (
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 flex items-center gap-1">
                <Repeat size={8} /> {event.recurrenceLabel}
              </span>
            )}
          </div>
          <h3 className="text-base font-black text-slate-900">{event.title || event.clientName}</h3>
          <p className="text-sm text-emerald-700 font-bold">{event.serviceTypeName}</p>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100">
          <X size={16} className="text-slate-400" />
        </button>
      </div>

      <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
        {/* Time */}
        <div className="flex items-start gap-3">
          <Clock size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-black text-slate-700">{fmtDate(event.scheduledStart)}</p>
            <p className="text-sm font-black text-slate-900">{fmtTime(event.scheduledStart)} – {fmtTime(event.scheduledEnd)}</p>
            <p className="text-[10px] text-slate-400">{event.estimatedDurationMinutes} min · {event.estimatedTravelMinutes ? `+${event.estimatedTravelMinutes} min dojazd` : 'dojazd nie obliczony'}</p>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-start gap-3">
          <MapPin size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-black text-slate-700">{event.location.address}</p>
            <p className="text-xs text-slate-500">{event.location.postalCode} {event.location.city}</p>
            {event.location.accessNotes && (
              <p className="text-[10px] text-slate-400 mt-1 italic">{event.location.accessNotes}</p>
            )}
          </div>
          <a href={buildMapsNavUrl(`${event.location.address}, ${event.location.city}`)} target="_blank" rel="noopener noreferrer"
            className="w-9 h-9 rounded-xl bg-blue-50 hover:bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Navigation size={14} className="text-blue-600" />
          </a>
        </div>

        {/* Client */}
        <div className="flex items-center gap-3">
          <User size={14} className="text-slate-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-black text-slate-700">{event.clientName}</p>
            {event.clientPhone && (
              <p className="text-[10px] text-slate-500">{event.clientPhone}</p>
            )}
          </div>
          {event.clientPhone && (
            <div className="flex gap-1">
              <a href={`tel:${event.clientPhone}`}
                className="w-9 h-9 rounded-xl bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center">
                <Phone size={14} className="text-emerald-600" />
              </a>
              <a href={buildSmsEtaMessage(event.clientPhone, event.estimatedTravelMinutes ?? 30)}
                className="w-9 h-9 rounded-xl bg-blue-50 hover:bg-blue-100 flex items-center justify-center">
                <MessageSquare size={14} className="text-blue-600" />
              </a>
            </div>
          )}
        </div>

        {/* Workers */}
        {event.assignedWorkers.length > 0 && (
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Pracownicy</p>
            <div className="flex flex-wrap gap-2">
              {event.assignedWorkers.map(w => (
                <span key={w.uid} className="text-[10px] font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                  {w.displayName || w.email}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Description / notes */}
        {event.description && (
          <div className="bg-slate-50 rounded-2xl p-4">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Zakres prac</p>
            <p className="text-xs text-slate-700">{event.description}</p>
          </div>
        )}

        {/* Price */}
        {event.price && (
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cena</span>
            <span className="text-sm font-black text-slate-900">{event.price.toLocaleString('pl-PL')} {event.currency}</span>
          </div>
        )}

        {/* Quote reference */}
        {event.quoteId && (
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Oferta</span>
            <span className="text-xs font-bold text-blue-700 font-mono">{event.quoteId}</span>
          </div>
        )}

        {/* Send to client */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Portal klienta</p>
          {portalUrl ? (
            <div className="flex items-center gap-2 bg-blue-50 rounded-2xl p-3">
              <a href={portalUrl} target="_blank" rel="noopener noreferrer"
                className="text-[10px] text-blue-700 font-bold break-all flex-1 hover:underline">{portalUrl}</a>
              <button onClick={handleCopyUrl}
                className="w-8 h-8 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center flex-shrink-0">
                {copied ? <Check size={12} className="text-blue-700"/> : <Copy size={12} className="text-blue-600"/>}
              </button>
            </div>
          ) : (
            <button disabled={sendingLink} onClick={handleSendToClient}
              className="flex items-center justify-center gap-2 w-full font-black px-4 py-2.5 rounded-2xl text-xs uppercase tracking-widest bg-blue-50 hover:bg-blue-100 text-blue-600 disabled:opacity-40">
              {sendingLink ? <RefreshCw size={12} className="animate-spin"/> : <Send size={12}/>}
              Generuj link dla klienta
            </button>
          )}
        </div>

        {/* Cost estimate */}
        <CostEstimatePanel event={event} distanceKm={event.estimatedTravelMinutes ? Math.round(((event.estimatedTravelMinutes - 15) * 40) / 60) : 20} />

        {error && <p className="text-red-600 text-xs font-bold flex items-center gap-1.5"><AlertTriangle size={12} />{error}</p>}

        {/* Transitions */}
        {nextStatuses.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Zmień status</p>
            <div className="flex flex-col gap-2">
              {nextStatuses.map(s => {
                const sm = EVENT_STATUS_META[s];
                const isCritical = s === 'CANCELLED';
                return (
                  <button key={s} disabled={!!loading} onClick={() => handleTransition(s)}
                    className={`flex items-center justify-center gap-2 font-black px-4 py-3 rounded-2xl text-xs uppercase tracking-widest disabled:opacity-40 transition-all ${
                      isCritical
                        ? 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200'
                        : `${sm.bg} hover:opacity-80 ${sm.color}`
                    }`}>
                    {loading === s ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                    {TRANSITION_LABELS[s] ?? s}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
