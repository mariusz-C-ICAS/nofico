import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, MapPin, Eye, Clock, Crosshair } from 'lucide-react';
import { useTenant } from '../../../shared/hooks/useTenant';
import { getTrackingConfig, saveTrackingConfig } from '../services/workerTrackingService';
import type { WorkerTrackingConfig } from '../services/workerTrackingService';

export default function WorkerTrackingConfig() {
  const { activeTenantId } = useTenant();
  const [cfg, setCfg] = useState<WorkerTrackingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!activeTenantId) return;
    getTrackingConfig(activeTenantId).then(c => { setCfg(c); setLoading(false); });
  }, [activeTenantId]);

  const update = <K extends keyof WorkerTrackingConfig>(k: K, v: WorkerTrackingConfig[K]) =>
    setCfg(prev => prev ? { ...prev, [k]: v } : prev);

  const handleSave = async () => {
    if (!cfg) return;
    setSaving(true); setError(''); setSaved(false);
    try {
      await saveTrackingConfig(cfg);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) { setError(e.message ?? 'Błąd zapisu.'); }
    finally { setSaving(false); }
  };

  if (loading || !cfg) return (
    <div className="flex items-center justify-center py-20">
      <RefreshCw className="animate-spin text-emerald-500" size={20} />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
          Śledzenie GPS serwisanta
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          Klient widzi przybliżoną pozycję serwisanta w oknie czasowym przed wizytą.
        </p>
      </div>

      {/* Master switch */}
      <div className="bg-slate-50 rounded-[2rem] p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center">
              <MapPin size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-800">Aktywne śledzenie klienta</p>
              <p className="text-[10px] text-slate-500">Klient widzi pozycję serwisanta na portalu</p>
            </div>
          </div>
          <button
            onClick={() => update('enabled', !cfg.enabled)}
            className={`w-14 h-7 rounded-full transition-colors relative ${cfg.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
            <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-1 transition-transform ${cfg.enabled ? 'translate-x-8' : 'translate-x-1'}`} />
          </button>
        </div>

        {cfg.enabled && (
          <div className="space-y-5 pt-4 border-t border-slate-200">
            {/* Window */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock size={13} className="text-slate-400" />
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Okno śledzenia (minuty przed wizytą)
                </label>
              </div>
              <div className="flex gap-2">
                {[30, 60, 90, 120].map(m => (
                  <button key={m} onClick={() => update('windowMinutesBefore', m)}
                    className={`flex-1 py-2 rounded-xl text-xs font-black border transition-all ${
                      cfg.windowMinutesBefore === m
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
                    }`}>
                    {m} min
                  </button>
                ))}
              </div>
            </div>

            {/* Client accuracy */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Crosshair size={13} className="text-slate-400" />
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Dokładność dla klienta
                </label>
              </div>
              <div className="flex gap-2">
                {[
                  { m: 500,  label: '500 m' },
                  { m: 1000, label: '1 km' },
                  { m: 2000, label: '2 km' },
                  { m: 5000, label: '5 km' },
                ].map(({ m, label }) => (
                  <button key={m} onClick={() => update('clientAccuracyMeters', m)}
                    className={`flex-1 py-2 rounded-xl text-xs font-black border transition-all ${
                      cfg.clientAccuracyMeters === m
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Refresh interval */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw size={13} className="text-slate-400" />
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Odświeżanie pozycji (minuty)
                </label>
              </div>
              <div className="flex gap-2">
                {[1, 2, 5, 10].map(m => (
                  <button key={m} onClick={() => update('refreshIntervalMinutes', m)}
                    className={`flex-1 py-2 rounded-xl text-xs font-black border transition-all ${
                      cfg.refreshIntervalMinutes === m
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300'
                    }`}>
                    {m} min
                  </button>
                ))}
              </div>
            </div>

            {/* Scope filters */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Eye size={13} className="text-slate-400" />
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Filtrowanie zakresu (opcjonalne — puste = wszystkie)
                </p>
              </div>
              <div>
                <label className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1 block">
                  ID typów usług (przecinek)
                </label>
                <input
                  value={(cfg.serviceTypeIds ?? []).join(', ')}
                  onChange={e => update('serviceTypeIds', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  placeholder="serviceType1, serviceType2 — puste = wszystkie"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-emerald-400 outline-none font-mono"
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1 block">
                  ID klientów (przecinek)
                </label>
                <input
                  value={(cfg.clientIds ?? []).join(', ')}
                  onChange={e => update('clientIds', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  placeholder="clientId1 — puste = wszyscy klienci"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-emerald-400 outline-none font-mono"
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1 block">
                  ID projektów (przecinek)
                </label>
                <input
                  value={(cfg.projectIds ?? []).join(', ')}
                  onChange={e => update('projectIds', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  placeholder="projectId1 — puste = wszystkie projekty"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-emerald-400 outline-none font-mono"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-red-600 text-xs font-bold flex items-center gap-1.5"><AlertTriangle size={12}/>{error}</p>}

      {/* Summary */}
      {cfg.enabled && (
        <div className="bg-blue-50 rounded-2xl p-4 text-[10px] text-blue-700 space-y-1">
          <p className="font-black text-xs">Klient zobaczy:</p>
          <p>Pozycję serwisanta {cfg.windowMinutesBefore} min przed wizytą, z dokładnością {cfg.clientAccuracyMeters >= 1000 ? `${cfg.clientAccuracyMeters / 1000} km` : `${cfg.clientAccuracyMeters} m`}. Odświeżanie co {cfg.refreshIntervalMinutes} min.</p>
        </div>
      )}

      <button onClick={handleSave} disabled={saving}
        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-black px-8 py-3 rounded-2xl text-xs uppercase tracking-widest">
        {saving ? <RefreshCw size={12} className="animate-spin" /> : saved ? <CheckCircle2 size={12} /> : null}
        {saved ? 'Zapisano!' : 'Zapisz konfigurację'}
      </button>
    </div>
  );
}
