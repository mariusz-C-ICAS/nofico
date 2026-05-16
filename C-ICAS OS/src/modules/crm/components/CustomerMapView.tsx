import React, { useState, useEffect, useRef } from 'react';
import { MapPin, RefreshCw, Building2, Filter } from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { computeLeadScore, scoreLabel } from '../services/leadScoringService';

interface Props {
  tenantId: string;
  onSelectCustomer?: (cust: any) => void;
}

// Coordinates for major Polish cities
const CITY_COORDS: Record<string, [number, number]> = {
  'warszawa': [52.2297, 21.0122], 'kraków': [50.0647, 19.9450], 'łódź': [51.7592, 19.4559],
  'wrocław': [51.1079, 17.0385], 'poznań': [52.4064, 16.9252], 'gdańsk': [54.3520, 18.6466],
  'szczecin': [53.4285, 14.5528], 'bydgoszcz': [53.1235, 18.0084], 'lublin': [51.2465, 22.5684],
  'katowice': [50.2598, 19.0215], 'białystok': [53.1325, 23.1688], 'gdynia': [54.5189, 18.5305],
  'częstochowa': [50.8118, 19.1203], 'radom': [51.4027, 21.1474], 'sosnowiec': [50.2863, 19.1041],
  'toruń': [53.0138, 18.5981], 'kielce': [50.8661, 20.6286], 'rzeszów': [50.0412, 21.9991],
  'gliwice': [50.2945, 18.6714], 'zabrze': [50.3249, 18.7857], 'olsztyn': [53.7784, 20.4801],
  'bielsko-biała': [49.8224, 19.0584], 'bytom': [50.3483, 18.9138], 'zielona góra': [51.9356, 15.5062],
  'rybnik': [50.0971, 18.5419], 'ruda śląska': [50.2589, 18.8574], 'opole': [50.6751, 17.9213],
  'tychy': [50.1353, 18.9961], 'gorzów': [52.7325, 15.2369], 'elbląg': [54.1568, 19.4041],
  'płock': [52.5465, 19.7069], 'koszalin': [54.1944, 16.1722],
};

function getCoords(customer: any): [number, number] | null {
  if (customer.lat && customer.lng) return [customer.lat, customer.lng];
  const city = (customer.city ?? '').toLowerCase().trim();
  return CITY_COORDS[city] ?? null;
}

function jitter(coord: number, idx: number): number {
  return coord + (Math.sin(idx * 2.3) * 0.008);
}

export default function CustomerMapView({ tenantId, onSelectCustomer }: Props) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selected, setSelected] = useState<any>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!tenantId) return;
    const q = query(collection(db, 'customers'), where('tenantId', '==', tenantId));
    getDocs(q).then(snap => {
      setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, [tenantId]);

  // Load Leaflet lazily
  useEffect(() => {
    import('leaflet').then(L => {
      leafletRef.current = L.default ?? L;
      setMapReady(true);
    });
  }, []);

  // Init map
  useEffect(() => {
    if (!mapReady || !mapRef.current || mapInstanceRef.current) return;
    const L = leafletRef.current;
    const map = L.map(mapRef.current, { center: [52.0, 19.5], zoom: 6 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);
    mapInstanceRef.current = map;
  }, [mapReady]);

  // Draw markers
  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady || loading) return;
    const L = leafletRef.current;
    const map = mapInstanceRef.current;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const visible = customers.filter(c => filterStatus === 'all' || c.status === filterStatus);
    let hasCoords = false;

    visible.forEach((cust, idx) => {
      const coords = getCoords(cust);
      if (!coords) return;
      hasCoords = true;

      const score = computeLeadScore({
        lastActivityMs: cust.lastActivityAt?.toDate?.()?.getTime() ?? 0,
        totalRevenue: cust.totalRevenue ?? 0,
        hasActiveDeal: false,
        serviceEventCount: cust.serviceEventCount ?? 0,
        activityCount30Days: 0,
      }).total;
      const sl = scoreLabel(score);

      const dotColor =
        cust.status === 'active' ? '#10b981' :
        cust.status === 'prospect' ? '#f59e0b' :
        cust.status === 'churned' ? '#94a3b8' :
        '#ef4444';

      const icon = L.divIcon({
        className: '',
        html: `<div style="width:14px;height:14px;background:${dotColor};border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);cursor:pointer;" title="${cust.name}"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const lat = jitter(coords[0], idx);
      const lng = jitter(coords[1], idx);
      const marker = L.marker([lat, lng], { icon }).addTo(map);

      marker.bindPopup(`
        <div style="font-family:system-ui;min-width:160px;">
          <p style="font-weight:900;font-size:12px;margin:0 0 4px">${cust.name}</p>
          <p style="font-size:10px;color:#64748b;margin:0 0 2px">${cust.city ?? ''} · ${cust.status ?? ''}</p>
          <p style="font-size:10px;font-weight:700;color:#6366f1">Score: ${score} · ${sl.label}</p>
          ${cust.totalRevenue ? `<p style="font-size:10px;color:#10b981;margin:2px 0 0">${cust.totalRevenue.toLocaleString('pl-PL')} PLN</p>` : ''}
        </div>
      `);

      marker.on('click', () => setSelected(cust));
      markersRef.current.push(marker);
    });

    if (hasCoords && markersRef.current.length > 0) {
      const group = L.featureGroup(markersRef.current);
      map.fitBounds(group.getBounds().pad(0.2));
    }
  }, [customers, filterStatus, mapReady, loading]);

  const withCoords = customers.filter(c => getCoords(c) !== null);
  const withoutCoords = customers.length - withCoords.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Mapa Klientów</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {withCoords.length} klientów z lokalizacją · {withoutCoords} bez
          </p>
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'prospect', 'churned', 'blocked'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`text-[9px] font-black px-2.5 py-1 rounded-full border transition-colors ${
                filterStatus === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400'
              }`}>
              {s === 'all' ? 'Wszyscy' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-[9px] font-black text-slate-500">
        {[
          { color: '#10b981', label: 'Aktywny' },
          { color: '#f59e0b', label: 'Prospect' },
          { color: '#94a3b8', label: 'Utracony' },
          { color: '#ef4444', label: 'Zablokowany' },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1">
            <span style={{ width: 10, height: 10, background: color, borderRadius: '50%', display: 'inline-block', border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            {label}
          </span>
        ))}
      </div>

      {/* Map */}
      {loading && (
        <div className="flex justify-center py-20"><RefreshCw size={20} className="animate-spin text-indigo-400" /></div>
      )}
      {!loading && (
        <div ref={mapRef} style={{ height: 480, borderRadius: '1rem', overflow: 'hidden', border: '1px solid #e2e8f0' }} />
      )}

      {/* Selected customer card */}
      {selected && (
        <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-200 flex items-start gap-4">
          <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Building2 size={16} className="text-indigo-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-slate-900">{selected.name}</p>
            <p className="text-[10px] text-slate-600">{selected.city ?? ''} · {selected.status ?? ''}</p>
            {selected.email && <p className="text-[10px] text-slate-500">{selected.email}</p>}
          </div>
          {onSelectCustomer && (
            <button onClick={() => onSelectCustomer(selected)}
              className="flex-shrink-0 bg-indigo-600 text-white text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest">
              Otwórz kartę
            </button>
          )}
          <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
            ✕
          </button>
        </div>
      )}

      {/* No-coords list */}
      {withoutCoords > 0 && (
        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 text-[10px] text-amber-700">
          <p className="font-black mb-1">{withoutCoords} klientów bez rozpoznanej lokalizacji:</p>
          <p className="text-amber-600">
            {customers.filter(c => !getCoords(c)).map(c => c.name).join(', ')}
          </p>
          <p className="mt-1 text-amber-500">Uzupełnij pole "Miasto" lub dodaj pola lat/lng w dokumencie Firestore.</p>
        </div>
      )}
    </div>
  );
}
