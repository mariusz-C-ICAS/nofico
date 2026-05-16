import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe, Key, Webhook, Activity, Building2, RefreshCw,
  ShieldAlert, ChevronDown, CheckCircle2, XCircle, Trash2,
  Copy, AlertTriangle, Users,
} from 'lucide-react';
import { db } from '../../shared/lib/firebase';
import {
  collection, query, getDocs, orderBy, limit, where,
  updateDoc, doc,
} from 'firebase/firestore';
import { listApiKeys, listApiLogs, revokeApiKey, type ApiKey, type ApiLog } from './apiKeyService';

interface TenantRow { id: string; name: string; }

function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div className={`rounded-2xl border p-5 ${color}`}>
      <div className="text-3xl font-black">{value}</div>
      <div className="text-[9px] font-black uppercase tracking-widest mt-1">{label}</div>
      {sub && <div className="text-[9px] mt-1 opacity-60">{sub}</div>}
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="text-slate-400 hover:text-indigo-600 transition-colors">
      {copied ? <CheckCircle2 size={13} className="text-emerald-500" /> : <Copy size={13} />}
    </button>
  );
}

// ── Tenant API Keys ────────────────────────────────────────────────────────
function TenantKeysPanel({ tenantId }: { tenantId: string }) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setKeys(await listApiKeys(tenantId));
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const handleRevoke = async (id: string) => {
    if (!confirm('Odwołać klucz API?')) return;
    await revokeApiKey(id);
    load();
  };

  if (loading) return <div className="flex justify-center py-6"><RefreshCw size={18} className="animate-spin text-slate-300" /></div>;
  if (keys.length === 0) return <p className="text-xs text-slate-400 italic px-1">Brak kluczy API dla tego tenanta.</p>;

  return (
    <div className="space-y-2">
      {keys.map(k => (
        <div key={k.id} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3">
          <div className={`w-2 h-6 rounded-full flex-shrink-0 ${k.active ? 'bg-emerald-400' : 'bg-slate-200'}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-slate-800">{k.name}</span>
              {!k.active && <span className="text-[9px] font-black uppercase text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-full">Odwołany</span>}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="font-mono text-[10px] text-slate-400">{k.keyPrefix}••••••</span>
              <CopyBtn text={k.keyPrefix} />
              <div className="flex gap-1">
                {k.scopes.slice(0, 3).map(s => (
                  <span key={s} className="text-[8px] font-bold bg-indigo-50 text-indigo-500 px-1 py-0.5 rounded border border-indigo-100">{s}</span>
                ))}
                {k.scopes.length > 3 && <span className="text-[8px] text-slate-400">+{k.scopes.length - 3}</span>}
              </div>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 flex-shrink-0">{k.callCount} wywołań</span>
          {k.active && (
            <button onClick={() => handleRevoke(k.id)} className="text-slate-300 hover:text-rose-500 transition-colors flex-shrink-0">
              <Trash2 size={13} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Tenant Webhooks ────────────────────────────────────────────────────────
function TenantWebhooksPanel({ tenantId }: { tenantId: string }) {
  const [hooks, setHooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(query(collection(db, 'webhooks'), where('tenantId', '==', tenantId)))
      .then(snap => setHooks(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .finally(() => setLoading(false));
  }, [tenantId]);

  const toggle = async (id: string, active: boolean) => {
    await updateDoc(doc(db, 'webhooks', id), { active: !active });
    setHooks(prev => prev.map(h => h.id === id ? { ...h, active: !active } : h));
  };

  if (loading) return <div className="flex justify-center py-6"><RefreshCw size={18} className="animate-spin text-slate-300" /></div>;
  if (hooks.length === 0) return <p className="text-xs text-slate-400 italic px-1">Brak webhooków dla tego tenanta.</p>;

  return (
    <div className="space-y-2">
      {hooks.map(h => (
        <div key={h.id} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3">
          <div className={`w-2 h-6 rounded-full flex-shrink-0 ${h.active ? 'bg-emerald-400' : 'bg-slate-200'}`} />
          <div className="flex-1 min-w-0">
            <span className="font-bold text-xs text-slate-800">{h.name}</span>
            <div className="font-mono text-[10px] text-slate-400 truncate">{h.url}</div>
          </div>
          {h.failCount > 2 && <AlertTriangle size={12} className="text-amber-500 flex-shrink-0" />}
          <button onClick={() => toggle(h.id, h.active)}
            className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg border flex-shrink-0 transition-all ${h.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
            {h.active ? 'Aktywny' : 'Wstrzymany'}
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Global Logs ────────────────────────────────────────────────────────────
function GlobalLogsPanel({ tenantId }: { tenantId: string | 'all' }) {
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const base = collection(db, 'api_logs');
    const q = tenantId === 'all'
      ? query(base, orderBy('createdAt', 'desc'), limit(100))
      : query(base, where('tenantId', '==', tenantId), orderBy('createdAt', 'desc'), limit(50));
    getDocs(q)
      .then(snap => setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as ApiLog))))
      .finally(() => setLoading(false));
  }, [tenantId]);

  const METHOD_COLOR: Record<string, string> = {
    GET: 'bg-emerald-100 text-emerald-700', POST: 'bg-indigo-100 text-indigo-700',
    PUT: 'bg-amber-100 text-amber-700', DELETE: 'bg-rose-100 text-rose-700',
  };

  if (loading) return <div className="flex justify-center py-8"><RefreshCw size={18} className="animate-spin text-slate-300" /></div>;
  if (logs.length === 0) return <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-xs">Brak logów API.</div>;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <table className="w-full text-xs">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="text-left p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Endpoint</th>
            <th className="text-left p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Tenant</th>
            <th className="text-left p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Klucz</th>
            <th className="text-left p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
            <th className="text-left p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">ms</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {logs.map(l => (
            <tr key={l.id} className="hover:bg-slate-50">
              <td className="p-3">
                <span className={`font-mono text-[9px] font-black px-1.5 py-0.5 rounded ${METHOD_COLOR[l.method] || 'bg-slate-100 text-slate-600'}`}>{l.method}</span>
                <span className="font-mono text-slate-700 ml-2">{l.endpoint}</span>
              </td>
              <td className="p-3 text-slate-400 font-mono text-[10px]">{l.tenantId?.slice(0, 8)}…</td>
              <td className="p-3 text-slate-500">{l.keyName}</td>
              <td className="p-3"><span className={`font-black ${l.statusCode < 400 ? 'text-emerald-600' : 'text-rose-600'}`}>{l.statusCode}</span></td>
              <td className="p-3 text-slate-400">{l.durationMs}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'keys',     label: 'Klucze API', icon: Key },
  { id: 'webhooks', label: 'Webhooki',   icon: Webhook },
  { id: 'logs',     label: 'Logi',       icon: Activity },
] as const;

export default function GlobalApiAdminPanel() {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [stats, setStats] = useState({ totalKeys: 0, activeKeys: 0, totalWebhooks: 0, tenantsWithApi: 0 });
  const [tab, setTab] = useState<typeof TABS[number]['id']>('keys');
  const [loadingTenants, setLoadingTenants] = useState(true);

  useEffect(() => {
    Promise.all([
      getDocs(collection(db, 'tenants')),
      getDocs(collection(db, 'api_keys')),
      getDocs(collection(db, 'webhooks')),
    ]).then(([tSnap, kSnap, wSnap]) => {
      const ts: TenantRow[] = tSnap.docs.map(d => ({ id: d.id, name: (d.data().name || d.id) as string }));
      setTenants(ts);
      if (ts.length > 0) setSelectedTenantId(ts[0].id);

      const keys = kSnap.docs.map(d => d.data());
      const tenantSet = new Set(keys.map(k => k.tenantId));
      setStats({
        totalKeys: keys.length,
        activeKeys: keys.filter(k => k.active).length,
        totalWebhooks: wSnap.size,
        tenantsWithApi: tenantSet.size,
      });
    }).finally(() => setLoadingTenants(false));
  }, []);

  const selectedTenant = tenants.find(t => t.id === selectedTenantId);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 p-10 opacity-10"><Globe size={130} /></div>
        <div className="relative z-10">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1 flex items-center gap-2">
            <ShieldAlert size={12}/> Global Admin
          </h3>
          <h2 className="text-2xl font-black uppercase text-white tracking-tight">Zarządzanie API — wszystkie tenants</h2>
          <p className="text-xs text-slate-400 mt-2 max-w-xl">Widok globalny: klucze API, webhooki i logi wywołań dla wszystkich organizacji w systemie.</p>
        </div>
      </div>

      {/* Global stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Wszystkich kluczy" value={stats.totalKeys} color="bg-white border-slate-200 text-slate-800" />
        <StatCard label="Aktywnych kluczy" value={stats.activeKeys} color="bg-emerald-50 border-emerald-200 text-emerald-700" />
        <StatCard label="Webhooków" value={stats.totalWebhooks} color="bg-indigo-50 border-indigo-200 text-indigo-700" />
        <StatCard label="Tenants z API" value={stats.tenantsWithApi} color="bg-amber-50 border-amber-200 text-amber-700" />
      </div>

      {/* Tenant selector */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Building2 size={14} className="text-slate-500" />
          <h4 className="font-black text-sm uppercase tracking-tight text-slate-800">Wybierz organizację</h4>
        </div>
        {loadingTenants ? (
          <div className="flex items-center gap-2 text-slate-400 text-xs"><RefreshCw size={14} className="animate-spin" /> Ładowanie tenantów…</div>
        ) : tenants.length === 0 ? (
          <p className="text-xs text-slate-400 italic">Brak organizacji w bazie.</p>
        ) : (
          <div className="relative">
            <select
              value={selectedTenantId}
              onChange={e => setSelectedTenantId(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white appearance-none pr-8"
            >
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.id.slice(0, 8)}…)</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
          </div>
        )}
      </div>

      {/* Tenant detail */}
      {selectedTenantId && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h4 className="font-black text-sm uppercase tracking-tight text-slate-800 flex items-center gap-2">
              <Users size={13}/> {selectedTenant?.name || selectedTenantId}
            </h4>
            <span className="font-mono text-[10px] text-slate-400">{selectedTenantId}</span>
          </div>

          {/* Sub-tabs */}
          <div className="flex gap-2 border-b border-slate-200">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest border-b-2 -mb-px transition-colors ${tab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                <t.icon size={12}/>{t.label}
              </button>
            ))}
          </div>

          {tab === 'keys'     && <TenantKeysPanel     tenantId={selectedTenantId} />}
          {tab === 'webhooks' && <TenantWebhooksPanel tenantId={selectedTenantId} />}
          {tab === 'logs'     && <GlobalLogsPanel     tenantId={selectedTenantId} />}
        </div>
      )}
    </div>
  );
}
