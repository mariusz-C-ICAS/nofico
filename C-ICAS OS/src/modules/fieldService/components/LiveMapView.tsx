import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Users, RefreshCw, Navigation, Circle } from 'lucide-react';
import { useTenant } from '../../../shared/hooks/useTenant';
import { subscribeToEvents } from '../services/calendarService';
import { subscribeWorkerPositions } from '../services/workerTrackingService';
import type { ServiceEvent, GpsPosition } from '../types';
import { EVENT_STATUS_META } from '../types';

// Lazy-load Leaflet to avoid SSR issues
let L: any = null;

async function getLeaflet() {
  if (L) return L;
  L = await import('leaflet');
  await import('leaflet/dist/leaflet.css');
  // Fix default marker icon path for bundlers
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
  return L;
}

function makeColorIcon(lf: any, color: string, label: string) {
  return lf.divIcon({
    className: '',
    html: `<div style="background:${color};width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center">
      <span style="transform:rotate(45deg);font-size:10px;font-weight:900;color:white">${label}</span>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -36],
  });
}

function makeWorkerIcon(lf: any, initials: string) {
  return lf.divIcon({
    className: '',
    html: `<div style="background:#1e293b;width:36px;height:36px;border-radius:50%;border:3px solid #10b981;box-shadow:0 2px 12px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center">
      <span style="font-size:11px;font-weight:900;color:white">${initials}</span>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

function getInitials(name: string): string {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

function fmtTime(ts: any): string {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

export default function LiveMapView() {
  const { activeTenantId } = useTenant();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const [events, setEvents] = useState<ServiceEvent[]>([]);
  const [positions, setPositions] = useState<Record<string, GpsPosition>>({});
  const [loading, setLoading] = useState(true);

  // Load today's events (live subscription)
  useEffect(() => {
    if (!activeTenantId) return;
    setLoading(true);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const end   = new Date(); end.setHours(23, 59, 59, 999);
    const unsub = subscribeToEvents(activeTenantId, today, end, ev => {
      setEvents(ev.filter(e => !['CANCELLED', 'ARCHIVED'].includes(e.status)));
      setLoading(false);
    });
    return unsub;
  }, [activeTenantId]);

  // Subscribe to worker positions
  useEffect(() => {
    if (!activeTenantId || events.length === 0) return;
    const workerIds = [...new Set(events.flatMap(e => e.assignedWorkers.map(w => w.uid)))];
    if (workerIds.length === 0) return;
    return subscribeWorkerPositions(activeTenantId, workerIds, setPositions);
  }, [activeTenantId, events]);

  // Init map
  useEffect(() => {
    if (!mapRef.current) return;
    getLeaflet().then(lf => {
      if (mapInstanceRef.current) return;
      const map = lf.map(mapRef.current!, {
        center: [52.2297, 21.0122], // Warsaw default
        zoom: 11,
        zoomControl: true,
      });
      lf.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);
      mapInstanceRef.current = map;
    });
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when data changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    getLeaflet().then(lf => {
      // Clear old markers
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      const bounds: [number, number][] = [];

      // Event location markers
      events.forEach(event => {
        if (!event.location.lat || !event.location.lng) return;
        const { lat, lng } = event.location;
        const meta = EVENT_STATUS_META[event.status];
        const colorHex = event.serviceTypeColor || '#6366f1';
        const icon = makeColorIcon(lf, colorHex, fmtTime(event.scheduledStart));
        const marker = lf.marker([lat, lng], { icon }).addTo(map);
        marker.bindPopup(`
          <div style="font-family:system-ui;min-width:180px">
            <p style="font-size:11px;font-weight:900;color:${colorHex};margin:0 0 4px">${meta.label}</p>
            <p style="font-size:13px;font-weight:700;margin:0 0 2px">${event.clientName}</p>
            <p style="font-size:11px;color:#64748b;margin:0">${event.serviceTypeName}</p>
            <p style="font-size:11px;color:#64748b;margin:2px 0">${fmtTime(event.scheduledStart)} · ${event.estimatedDurationMinutes} min</p>
            <p style="font-size:10px;color:#94a3b8;margin:0">${event.location.address}</p>
          </div>
        `);
        markersRef.current.push(marker);
        bounds.push([lat, lng]);
      });

      // Worker position markers
      Object.entries(positions).forEach(([uid, pos]) => {
        const worker = events.flatMap(e => e.assignedWorkers).find(w => w.uid === uid);
        if (!worker) return;
        const initials = getInitials(worker.displayName || worker.email);
        const icon = makeWorkerIcon(lf, initials);
        const ageMs = Date.now() - (pos.timestamp?.toDate ? pos.timestamp.toDate().getTime() : Date.now());
        const ageMin = Math.round(ageMs / 60000);
        const marker = lf.marker([pos.lat, pos.lng], { icon, zIndexOffset: 1000 }).addTo(map);
        marker.bindPopup(`
          <div style="font-family:system-ui;min-width:160px">
            <p style="font-size:13px;font-weight:900;margin:0 0 2px">🟢 ${worker.displayName || worker.email}</p>
            <p style="font-size:10px;color:#64748b;margin:0">Pozycja sprzed ${ageMin < 1 ? '<1' : ageMin} min</p>
          </div>
        `);
        markersRef.current.push(marker);
        bounds.push([pos.lat, pos.lng]);
      });

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      }
    });
  }, [events, positions]);

  const activeWorkers = Object.keys(positions).length;
  const eventCounts = {
    confirmed: events.filter(e => e.status === 'CONFIRMED').length,
    inTransit: events.filter(e => e.status === 'IN_TRANSIT').length,
    onSite:    events.filter(e => e.status === 'ON_SITE').length,
    completed: events.filter(e => e.status === 'COMPLETED').length,
  };

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 bg-emerald-50 rounded-2xl px-4 py-2 border border-emerald-200">
          <Users size={13} className="text-emerald-600" />
          <span className="text-xs font-black text-emerald-700">{activeWorkers} w terenie</span>
        </div>
        {[
          { label: 'W drodze', count: eventCounts.inTransit, color: 'bg-amber-50 border-amber-200 text-amber-700' },
          { label: 'Na miejscu', count: eventCounts.onSite, color: 'bg-green-50 border-green-200 text-green-700' },
          { label: 'Zakończone', count: eventCounts.completed, color: 'bg-teal-50 border-teal-200 text-teal-700' },
        ].map(({ label, count, color }) => (
          <div key={label} className={`flex items-center gap-2 rounded-2xl px-4 py-2 border ${color}`}>
            <Circle size={8} className="fill-current opacity-60" />
            <span className="text-xs font-black">{count} · {label}</span>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-2 text-slate-400 text-[10px] font-bold">
          {loading
            ? <><RefreshCw size={11} className="animate-spin" /> Ładowanie...</>
            : <><Circle size={8} className="fill-emerald-500 text-emerald-500" /> Live</>
          }
        </div>
      </div>

      {/* Map */}
      <div className="relative rounded-[2rem] overflow-hidden border border-slate-200 shadow-sm"
           style={{ height: '520px' }}>
        {loading && (
          <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center rounded-[2rem]">
            <RefreshCw className="animate-spin text-emerald-500" size={24} />
          </div>
        )}
        <div ref={mapRef} className="w-full h-full" />
      </div>

      {/* Legend */}
      <div className="flex gap-6 flex-wrap text-[10px] font-bold text-slate-500">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-slate-900 border-2 border-emerald-500" />
          Serwisant (GPS live)
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow" />
          Lokalizacja wizyty
        </div>
        <div className="flex items-center gap-1.5">
          <Navigation size={12} className="text-slate-400" />
          Mapa: OpenStreetMap
        </div>
      </div>

      {/* Events without coordinates */}
      {events.filter(e => !e.location.lat).length > 0 && (
        <div className="bg-amber-50 rounded-2xl p-3 border border-amber-200">
          <p className="text-xs font-black text-amber-700 mb-1">
            {events.filter(e => !e.location.lat).length} zdarzeń bez geolokalizacji
          </p>
          <div className="space-y-0.5">
            {events.filter(e => !e.location.lat).map(e => (
              <p key={e.id} className="text-[10px] text-amber-600">
                {e.clientName} · {e.location.address}, {e.location.city} — brak lat/lng
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
