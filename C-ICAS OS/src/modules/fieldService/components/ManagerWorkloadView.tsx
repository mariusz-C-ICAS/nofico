import React, { useState, useEffect } from 'react';
import { Users, MapPin, Clock, BarChart3, Loader2, ExternalLink, Navigation } from 'lucide-react';
import { collection, query, where, getDocs, Timestamp, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import { useTenant } from '../../../shared/hooks/useTenant';
import type { ServiceEvent, GpsPosition } from '../types';
import { EVENT_STATUS_META } from '../types';

interface WorkerRow {
  uid: string;
  email: string;
  displayName: string;
  todayEvents: ServiceEvent[];
  position?: GpsPosition;
}

export default function ManagerWorkloadView() {
  const { activeTenantId } = useTenant();
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (!activeTenantId) return;

    const from = new Date(selectedDate); from.setHours(0, 0, 0, 0);
    const to   = new Date(selectedDate); to.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, `tenants/${activeTenantId}/serviceEvents`),
      where('scheduledStart', '>=', Timestamp.fromDate(from)),
      where('scheduledStart', '<=', Timestamp.fromDate(to))
    );

    const unsub = onSnapshot(q, async (snap) => {
      const events = snap.docs.map(d => ({ id: d.id, ...d.data() }) as ServiceEvent);

      // Group by worker
      const workerMap = new Map<string, WorkerRow>();
      events.forEach(event => {
        event.assignedWorkers.forEach(w => {
          if (!workerMap.has(w.uid)) {
            workerMap.set(w.uid, { uid: w.uid, email: w.email, displayName: w.displayName, todayEvents: [] });
          }
          workerMap.get(w.uid)!.todayEvents.push(event);
        });
      });

      // Fetch GPS positions
      const posSnaps = await getDocs(collection(db, `tenants/${activeTenantId}/gpsPositions`)).catch(() => null);
      posSnaps?.docs.forEach(d => {
        const pos = d.data() as GpsPosition;
        if (workerMap.has(pos.workerId)) {
          workerMap.get(pos.workerId)!.position = pos;
        }
      });

      const rows = Array.from(workerMap.values()).sort((a, b) => b.todayEvents.length - a.todayEvents.length);
      setWorkers(rows);
      setLoading(false);
    });

    return unsub;
  }, [activeTenantId, selectedDate]);

  const fmtTime = (ts: any) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  };

  const mapsLink = (pos: GpsPosition) =>
    `https://maps.google.com/?q=${pos.lat},${pos.lng}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-emerald-600" />
          <h3 className="text-sm font-black text-slate-700 uppercase tracking-tight">Obciążenie zespołu</h3>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-400 ml-auto"
        />
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Pracownicy aktywni"
          value={workers.filter(w => w.todayEvents.some(e => ['IN_TRANSIT','ON_SITE'].includes(e.status))).length}
          of={workers.length}
          color="text-emerald-600"
        />
        <StatCard
          label="Zdarzeń łącznie"
          value={workers.reduce((s, w) => s + w.todayEvents.length, 0)}
          color="text-blue-600"
        />
        <StatCard
          label="Zakończonych"
          value={workers.reduce((s, w) => s + w.todayEvents.filter(e => e.status === 'COMPLETED').length, 0)}
          color="text-teal-600"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-400" size={24} /></div>
      ) : workers.length === 0 ? (
        <div className="bg-slate-50 rounded-[2rem] p-10 text-center">
          <p className="text-slate-300 font-black uppercase tracking-widest text-xs">Brak zdarzeń na ten dzień</p>
        </div>
      ) : (
        <div className="space-y-4">
          {workers.map(worker => (
            <WorkerCard key={worker.uid} worker={worker} fmtTime={fmtTime} mapsLink={mapsLink} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, of, color }: { label: string; value: number; of?: number; color: string }) {
  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 p-5 text-center">
      <p className={`text-3xl font-black ${color}`}>{value}{of !== undefined ? `/${of}` : ''}</p>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{label}</p>
    </div>
  );
}

function WorkerCard({ worker, fmtTime, mapsLink }: {
  worker: WorkerRow;
  fmtTime: (ts: any) => string;
  mapsLink: (pos: GpsPosition) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const activeEvent = worker.todayEvents.find(e => ['IN_TRANSIT', 'ON_SITE'].includes(e.status));
  const completedCount = worker.todayEvents.filter(e => e.status === 'COMPLETED').length;

  const initials = worker.displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden">
      <button className="w-full text-left p-5 flex items-center gap-4" onClick={() => setExpanded(v => !v)}>
        <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-black text-sm flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-slate-900">{worker.displayName}</p>
          <p className="text-[10px] text-slate-500 truncate">{worker.email}</p>
        </div>

        {/* Status indicators */}
        <div className="flex items-center gap-2">
          {activeEvent && (
            <span className={`text-[9px] font-black px-2 py-1 rounded-full ${EVENT_STATUS_META[activeEvent.status].bg} ${EVENT_STATUS_META[activeEvent.status].color}`}>
              {EVENT_STATUS_META[activeEvent.status].label}
            </span>
          )}
          <div className="text-right">
            <p className="text-lg font-black text-slate-900">{worker.todayEvents.length}</p>
            <p className="text-[9px] text-slate-400 font-bold">zdarzeń</p>
          </div>
        </div>

        {/* GPS position */}
        {worker.position && (
          <a href={mapsLink(worker.position)} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center hover:bg-blue-100 transition-colors flex-shrink-0">
            <MapPin size={14} className="text-blue-600" />
          </a>
        )}
      </button>

      {/* Load bar */}
      <div className="px-5 pb-2">
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-400 rounded-full transition-all"
            style={{ width: `${Math.min(100, (completedCount / Math.max(1, worker.todayEvents.length)) * 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[8px] text-slate-400 font-bold">{completedCount} / {worker.todayEvents.length} zakończonych</span>
          {activeEvent && <span className="text-[8px] text-emerald-600 font-bold truncate max-w-[150px]">{activeEvent.clientName}</span>}
        </div>
      </div>

      {/* Expanded events */}
      {expanded && (
        <div className="border-t border-slate-50 divide-y divide-slate-50">
          {worker.todayEvents.map(event => (
            <div key={event.id} className="px-5 py-3 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: event.serviceTypeColor }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{event.clientName}</p>
                <p className="text-[9px] text-slate-500">{event.serviceTypeName}</p>
                <p className="text-[9px] text-slate-400 flex items-center gap-1 mt-0.5">
                  <MapPin size={8} /> {event.location.address}, {event.location.city}
                </p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-xs font-black text-slate-700">{fmtTime(event.scheduledStart)}</p>
                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${EVENT_STATUS_META[event.status].bg} ${EVENT_STATUS_META[event.status].color}`}>
                  {EVENT_STATUS_META[event.status].label}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
