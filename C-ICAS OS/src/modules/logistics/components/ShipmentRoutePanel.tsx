/**
 * Data: 2026-05-19
 * Sciezka: src/modules/logistics/components/ShipmentRoutePanel.tsx
 * Opis: Mapa tras i routing — planowanie trasy z Google Maps (mapsService).
 */

import React, { useState } from 'react';
import { MapPin, Plus, Trash2, Navigation, Loader2, AlertCircle, ExternalLink, Settings2 } from 'lucide-react';
import { useTenant } from '../../../shared/hooks/useTenant';
import { getMapsConfig, optimizeRoute, type LatLng } from '../../fieldService/services/mapsService';

// ── Typy ─────────────────────────────────────────────────────────────────────

interface Waypoint {
  id: string;
  address: string;
  lat: string;
  lng: string;
}

interface RouteResult {
  totalDistanceKm: number;
  totalDurationMin: number;
  mapsUrl: string;
  orderedAddresses: string[];
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m} min`;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${meters} m`;
}

// ── Komponent ─────────────────────────────────────────────────────────────────

export default function ShipmentRoutePanel() {
  const { activeTenantId } = useTenant();

  const [waypoints, setWaypoints] = useState<Waypoint[]>([
    { id: crypto.randomUUID(), address: '', lat: '', lng: '' },
    { id: crypto.randomUUID(), address: '', lat: '', lng: '' },
  ]);

  const [result, setResult]   = useState<RouteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [noApiKey, setNoApiKey] = useState(false);

  function addWaypoint() {
    setWaypoints(prev => [...prev, { id: crypto.randomUUID(), address: '', lat: '', lng: '' }]);
  }

  function removeWaypoint(id: string) {
    if (waypoints.length <= 2) return;
    setWaypoints(prev => prev.filter(w => w.id !== id));
  }

  function updateWaypoint(id: string, field: keyof Omit<Waypoint, 'id'>, value: string) {
    setWaypoints(prev => prev.map(w => w.id === id ? { ...w, [field]: value } : w));
  }

  async function handlePlan() {
    if (!activeTenantId) return;

    const filled = waypoints.filter(w => w.lat.trim() && w.lng.trim());
    if (filled.length < 2) {
      setError('Podaj wspolrzedne (lat/lng) dla co najmniej 2 punktow.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setNoApiKey(false);

    try {
      const config = await getMapsConfig(activeTenantId);

      const points: LatLng[] = filled.map(w => ({
        lat: parseFloat(w.lat),
        lng: parseFloat(w.lng),
      }));

      const optimized = await optimizeRoute(points, config.apiKey);

      const orderedAddresses = optimized.orderedIndices.map(i => filled[i]?.address || `Punkt ${i + 1}`);

      setResult({
        totalDistanceKm:  optimized.totalDistanceMeters / 1000,
        totalDurationMin: optimized.totalDurationSeconds / 60,
        mapsUrl:          optimized.mapsUrl,
        orderedAddresses,
      });

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Blad planowania trasy';
      if (msg.toLowerCase().includes('brak konfiguracji') || msg.toLowerCase().includes('brak klucza')) {
        setNoApiKey(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">

      {/* Info — brak API */}
      {noApiKey && (
        <div className="bg-amber-50 border border-amber-200 rounded-[2rem] p-8 flex items-start gap-5">
          <AlertCircle size={24} className="text-amber-500 shrink-0 mt-1" />
          <div>
            <h4 className="text-sm font-black text-amber-900 uppercase tracking-widest mb-2">Google Maps nie skonfigurowane</h4>
            <p className="text-sm text-amber-700 font-bold mb-4">
              Aby korzystac z routingu, skonfiguruj integracje Google Maps Platform (Directions API + Maps JS).
            </p>
            <a
              href="/dashboard/settings/integrations"
              className="inline-flex items-center gap-2 bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl hover:bg-amber-600 transition-colors"
            >
              <Settings2 size={13} /> Przejdz do Integracji
            </a>
          </div>
        </div>
      )}

      {/* Panel punktow */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">
            <Navigation size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Planowanie Trasy</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dodaj punkty trasy — optymalizacja kolejnosci przez Google Maps</p>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-100 rounded-2xl mb-6">
            <AlertCircle size={16} className="text-rose-500 mt-0.5 shrink-0" />
            <p className="text-sm text-rose-700 font-bold">{error}</p>
          </div>
        )}

        {/* Lista punktow */}
        <div className="space-y-4 mb-6">
          {waypoints.map((wp, idx) => (
            <div key={wp.id} className="flex items-start gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center justify-center w-8 h-8 bg-indigo-600 rounded-lg shrink-0 mt-1">
                <MapPin size={14} className="text-white" />
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    {idx === 0 ? 'Start' : idx === waypoints.length - 1 ? 'Koniec' : `Punkt ${idx + 1}`}
                  </label>
                  <input
                    value={wp.address}
                    onChange={e => updateWaypoint(wp.id, 'address', e.target.value)}
                    placeholder="Opis lokalizacji"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-400 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Szerokosc (lat)</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={wp.lat}
                    onChange={e => updateWaypoint(wp.id, 'lat', e.target.value)}
                    placeholder="np. 52.2297"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-400 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Dlugosc (lng)</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={wp.lng}
                    onChange={e => updateWaypoint(wp.id, 'lng', e.target.value)}
                    placeholder="np. 21.0122"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-400 bg-white"
                  />
                </div>
              </div>

              <button
                onClick={() => removeWaypoint(wp.id)}
                disabled={waypoints.length <= 2}
                className="mt-1 p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                title="Usun punkt"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>

        {/* Przyciski */}
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={addWaypoint}
            className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-colors"
          >
            <Plus size={14} /> Dodaj Punkt
          </button>

          <button
            onClick={handlePlan}
            disabled={loading || !activeTenantId}
            className="flex items-center gap-2 px-10 py-4 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-200 hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? <><Loader2 size={14} className="animate-spin" /> Planowanie...</>
              : <><Navigation size={14} /> Zaplanuj Trase</>
            }
          </button>
        </div>
      </div>

      {/* Wynik */}
      {result && (
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10">
          <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter mb-8">Wynik Optymalizacji</h3>

          <div className="flex flex-wrap gap-4 mb-8">
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-8 py-5 flex items-center gap-4">
              <Navigation size={20} className="text-indigo-600" />
              <div>
                <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Dystans</div>
                <div className="text-2xl font-black text-indigo-700 italic">{formatDistance(result.totalDistanceKm * 1000)}</div>
              </div>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-8 py-5 flex items-center gap-4">
              <MapPin size={20} className="text-emerald-600" />
              <div>
                <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Czas przejazdu</div>
                <div className="text-2xl font-black text-emerald-700 italic">{formatDuration(result.totalDurationMin * 60)}</div>
              </div>
            </div>
          </div>

          <div className="space-y-3 mb-8">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kolejnosc Punktow</h4>
            {result.orderedAddresses.map((addr, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-[10px] font-black shrink-0">{i + 1}</div>
                <span className="text-sm font-bold text-slate-700">{addr || `Punkt ${i + 1}`}</span>
              </div>
            ))}
          </div>

          <a
            href={result.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest px-8 py-4 rounded-2xl hover:bg-slate-800 transition-colors"
          >
            <ExternalLink size={14} /> Otworz w Google Maps
          </a>
        </div>
      )}
    </div>
  );
}
