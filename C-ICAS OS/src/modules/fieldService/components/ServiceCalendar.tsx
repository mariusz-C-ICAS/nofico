import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, Filter, RefreshCw } from 'lucide-react';
import { subscribeToEvents } from '../services/calendarService';
import type { ServiceEvent, ServiceType } from '../types';
import { EVENT_STATUS_META } from '../types';
import { useTenant } from '../../../shared/hooks/useTenant';

interface Props {
  serviceTypes: ServiceType[];
  onEventClick: (event: ServiceEvent) => void;
  onNewEvent: (date: Date) => void;
}

type CalView = 'week' | 'month' | 'list';

const DAYS_PL = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'];
const MONTHS_PL = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'];

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function toDate(ts: any): Date {
  if (!ts) return new Date();
  return ts.toDate ? ts.toDate() : new Date(ts);
}

export default function ServiceCalendar({ serviceTypes, onEventClick, onNewEvent }: Props) {
  const { activeTenantId } = useTenant();
  const [view, setView] = useState<CalView>('week');
  const [anchor, setAnchor] = useState(new Date());
  const [events, setEvents] = useState<ServiceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  const weekStart = startOfWeek(anchor);
  const weekEnd   = addDays(weekStart, 6);

  useEffect(() => {
    if (!activeTenantId) return;
    setLoading(true);
    const from = view === 'month'
      ? new Date(anchor.getFullYear(), anchor.getMonth(), 1)
      : weekStart;
    const to = view === 'month'
      ? new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59)
      : addDays(weekEnd, 0);
    to.setHours(23, 59, 59);

    const unsub = subscribeToEvents(activeTenantId, from, to, (evs) => {
      setEvents(evs);
      setLoading(false);
    });
    return unsub;
  }, [activeTenantId, anchor, view]);

  const filtered = events.filter(e =>
    (!filterType || e.serviceTypeId === filterType) &&
    (!filterStatus || e.status === filterStatus)
  );

  const eventsOnDay = (day: Date) =>
    filtered.filter(e => isSameDay(toDate(e.scheduledStart), day));

  const navigate = (delta: number) => {
    if (view === 'month') {
      setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + delta, 1));
    } else {
      setAnchor(addDays(anchor, delta * 7));
    }
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  const headerLabel = view === 'month'
    ? `${MONTHS_PL[anchor.getMonth()]} ${anchor.getFullYear()}`
    : `${weekStart.getDate()} ${MONTHS_PL[weekStart.getMonth()]} — ${weekEnd.getDate()} ${MONTHS_PL[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center">
            <ChevronLeft size={16} className="text-slate-600" />
          </button>
          <span className="text-sm font-black text-slate-900 min-w-[200px] text-center">{headerLabel}</span>
          <button onClick={() => navigate(1)} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center">
            <ChevronRight size={16} className="text-slate-600" />
          </button>
          <button onClick={() => setAnchor(new Date())} className="text-[9px] font-black text-slate-400 hover:text-slate-700 uppercase tracking-widest px-3 py-1.5 rounded-xl hover:bg-slate-100">
            Dziś
          </button>
        </div>

        {/* View toggle */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 ml-auto">
          {(['week', 'month', 'list'] as CalView[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${view === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
              {v === 'week' ? 'Tydzień' : v === 'month' ? 'Miesiąc' : 'Lista'}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="text-[10px] font-black text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 outline-none">
            <option value="">Wszystkie usługi</option>
            {serviceTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="text-[10px] font-black text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 outline-none">
            <option value="">Wszystkie statusy</option>
            {(['SCHEDULED','CONFIRMED','IN_TRANSIT','ON_SITE','COMPLETED'] as const).map(s => (
              <option key={s} value={s}>{EVENT_STATUS_META[s].label}</option>
            ))}
          </select>
        </div>

        {loading && <RefreshCw size={14} className="text-emerald-500 animate-spin" />}
      </div>

      {/* Week View */}
      {view === 'week' && (
        <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-100">
            {weekDays.map(day => {
              const isToday_ = isSameDay(day, today);
              return (
                <div key={day.toISOString()} className={`p-3 text-center border-r border-slate-50 last:border-0 ${isToday_ ? 'bg-emerald-50' : ''}`}>
                  <p className={`text-[9px] font-black uppercase tracking-widest ${isToday_ ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {DAYS_PL[day.getDay()]}
                  </p>
                  <p className={`text-xl font-black mt-0.5 ${isToday_ ? 'text-emerald-600' : 'text-slate-700'}`}>
                    {day.getDate()}
                  </p>
                  <p className="text-[9px] text-slate-400 font-bold">{eventsOnDay(day).length > 0 ? `${eventsOnDay(day).length} zd.` : ''}</p>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-7 min-h-[400px]">
            {weekDays.map(day => (
              <div key={day.toISOString()} className={`border-r border-slate-50 last:border-0 p-2 space-y-1.5 ${isSameDay(day, today) ? 'bg-emerald-50/30' : ''}`}>
                {eventsOnDay(day).map(event => (
                  <EventChip key={event.id} event={event} onClick={() => onEventClick(event)} />
                ))}
                <button
                  onClick={() => onNewEvent(day)}
                  className="w-full h-6 rounded-lg border-2 border-dashed border-slate-200 hover:border-emerald-300 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                >
                  <Plus size={10} className="text-emerald-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Month View */}
      {view === 'month' && <MonthGrid year={anchor.getFullYear()} month={anchor.getMonth()} events={filtered} onEventClick={onEventClick} onNewEvent={onNewEvent} />}

      {/* List View */}
      {view === 'list' && (
        <div className="bg-white rounded-[2rem] border border-slate-100 divide-y divide-slate-50 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-slate-300 font-black uppercase text-xs">Brak zdarzeń</div>
          ) : filtered.map(event => (
            <button key={event.id} onClick={() => onEventClick(event)}
              className="w-full text-left px-6 py-4 hover:bg-slate-50 transition-colors flex items-center gap-4">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: event.serviceTypeColor }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-slate-900 truncate">{event.clientName} — {event.serviceTypeName}</p>
                <p className="text-[10px] text-slate-500">{toDate(event.scheduledStart).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' })} · {toDate(event.scheduledStart).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${EVENT_STATUS_META[event.status].bg} ${EVENT_STATUS_META[event.status].color}`}>
                {EVENT_STATUS_META[event.status].label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EventChip({ event, onClick }: { event: ServiceEvent; onClick: () => void }) {
  const fmtTime = (ts: any) => {
    const d = ts?.toDate ? ts.toDate() : new Date(ts ?? 0);
    return d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  };
  return (
    <button onClick={onClick}
      className="w-full text-left rounded-xl px-2 py-1.5 text-[9px] font-black truncate transition-all hover:shadow-md hover:scale-[1.02]"
      style={{ background: event.serviceTypeColor + '22', borderLeft: `3px solid ${event.serviceTypeColor}`, color: event.serviceTypeColor }}
    >
      <span className="block truncate">{fmtTime(event.scheduledStart)} {event.clientName}</span>
      <span className="block truncate opacity-70">{event.serviceTypeName}</span>
    </button>
  );
}

function MonthGrid({ year, month, events, onEventClick, onNewEvent }: {
  year: number; month: number;
  events: ServiceEvent[];
  onEventClick: (e: ServiceEvent) => void;
  onNewEvent: (d: Date) => void;
}) {
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  const startPad = (firstDay.getDay() + 6) % 7;
  const cells: (Date | null)[] = [
    ...Array(startPad).fill(null),
    ...Array.from({ length: lastDay.getDate() }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();
  const toDate_ = (ts: any) => ts?.toDate ? ts.toDate() : new Date(ts ?? 0);
  const eventsOnDay = (d: Date) => events.filter(e => {
    const ed = toDate_(e.scheduledStart);
    return ed.getDate() === d.getDate() && ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear();
  });

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-slate-100">
        {['Pon','Wt','Śr','Czw','Pt','Sob','Nd'].map(d => (
          <div key={d} className="py-2 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="border-r border-b border-slate-50 min-h-[90px] bg-slate-50/30" />;
          const dayEvents = eventsOnDay(day);
          const isToday_ = isSameDay(day, today);
          return (
            <div key={i} onClick={() => onNewEvent(day)}
              className={`border-r border-b border-slate-50 min-h-[90px] p-1.5 cursor-pointer hover:bg-slate-50 transition-colors ${isToday_ ? 'bg-emerald-50/40' : ''}`}>
              <p className={`text-xs font-black mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday_ ? 'bg-emerald-500 text-white' : 'text-slate-600'}`}>
                {day.getDate()}
              </p>
              {dayEvents.slice(0, 3).map(e => (
                <div key={e.id} onClick={ev => { ev.stopPropagation(); onEventClick(e); }}
                  className="text-[8px] font-black truncate rounded px-1 py-0.5 mb-0.5 cursor-pointer"
                  style={{ background: e.serviceTypeColor + '33', color: e.serviceTypeColor }}>
                  {e.clientName}
                </div>
              ))}
              {dayEvents.length > 3 && <p className="text-[8px] text-slate-400 font-bold">+{dayEvents.length - 3} więcej</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
