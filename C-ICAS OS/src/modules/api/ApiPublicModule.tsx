import React, { useState, useEffect, useCallback } from 'react';
import {
  Key, Plus, Trash2, Copy, CheckCircle2, XCircle, RefreshCw,
  Globe, Code2, Activity, Webhook, ChevronDown, ChevronRight,
  ShieldCheck, AlertTriangle, Clock, Zap,
} from 'lucide-react';
import { useAuth } from '../../shared/hooks/AuthContext';
import {
  generateApiKey, listApiKeys, revokeApiKey, listApiLogs,
  API_SCOPES, type ApiKey, type ApiLog,
} from './apiKeyService';
import {
  collection, query, where, getDocs, addDoc, updateDoc,
  deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../shared/lib/firebase';

// ── types ──────────────────────────────────────────────────────────────────
interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  secret?: string;
  failCount: number;
  lastStatus?: 'success' | 'error';
}

const ALL_EVENTS = [
  'customer.created', 'customer.updated',
  'invoice.created', 'invoice.paid',
  'employee.created', 'employee.updated',
  'leave.approved', 'deal.won', 'deal.lost',
  'booking.confirmed', 'booking.cancelled',
];

const API_DOCS: { group: string; endpoints: { method: string; path: string; desc: string; scopes: string[] }[] }[] = [
  {
    group: 'Klienci (CRM)',
    endpoints: [
      { method: 'GET',    path: '/api/v1/customers',     desc: 'Lista klientów z paginacją',         scopes: ['customers:read'] },
      { method: 'GET',    path: '/api/v1/customers/{id}',desc: 'Szczegóły klienta',                  scopes: ['customers:read'] },
      { method: 'POST',   path: '/api/v1/customers',     desc: 'Utwórz klienta',                     scopes: ['customers:write'] },
      { method: 'PUT',    path: '/api/v1/customers/{id}',desc: 'Zaktualizuj klienta',                 scopes: ['customers:write'] },
    ],
  },
  {
    group: 'Faktury',
    endpoints: [
      { method: 'GET',    path: '/api/v1/invoices',      desc: 'Lista faktur (filtr: period, status)', scopes: ['invoices:read'] },
      { method: 'GET',    path: '/api/v1/invoices/{id}', desc: 'Pobierz fakturę (JSON + PDF link)',   scopes: ['invoices:read'] },
      { method: 'POST',   path: '/api/v1/invoices',      desc: 'Wystaw nową fakturę',                 scopes: ['invoices:write'] },
    ],
  },
  {
    group: 'HR',
    endpoints: [
      { method: 'GET',    path: '/api/v1/employees',           desc: 'Lista pracowników',            scopes: ['employees:read'] },
      { method: 'GET',    path: '/api/v1/hr/churn-predictions',desc: 'Predykcje rotacji (AI)',        scopes: ['hr:analytics'] },
      { method: 'GET',    path: '/api/v1/hr/payslips',         desc: 'Paski płac (per pracownik)',    scopes: ['employees:read'] },
    ],
  },
  {
    group: 'Finanse',
    endpoints: [
      { method: 'GET',    path: '/api/v1/finance/balance',     desc: 'Saldo kont',                   scopes: ['finance:read'] },
      { method: 'GET',    path: '/api/v1/finance/cashflow',    desc: 'Cash flow (miesięczny)',        scopes: ['finance:read'] },
    ],
  },
  {
    group: 'Webhooki',
    endpoints: [
      { method: 'POST',   path: '/api/v1/webhooks/test',       desc: 'Wyślij testowe zdarzenie',     scopes: ['webhooks:manage'] },
    ],
  },
];

const METHOD_COLOR: Record<string, string> = {
  GET:    'bg-emerald-100 text-emerald-700',
  POST:   'bg-indigo-100 text-indigo-700',
  PUT:    'bg-amber-100 text-amber-700',
  DELETE: 'bg-rose-100 text-rose-700',
};

// ── sub-components ─────────────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="text-slate-400 hover:text-indigo-600 transition-colors">
      {copied ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Copy size={14} />}
    </button>
  );
}

// ── tabs ───────────────────────────────────────────────────────────────────
function ApiKeyTab({ tenantId }: { tenantId: string }) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', scopes: [] as string[], expiresAt: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setKeys(await listApiKeys(tenantId));
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.name || form.scopes.length === 0) return;
    const { key } = await generateApiKey(tenantId, form.name, form.scopes, form.expiresAt || undefined);
    setNewKey(key);
    setShowForm(false);
    setForm({ name: '', scopes: [], expiresAt: '' });
    load();
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Odwołać klucz? Operacji nie można cofnąć.')) return;
    await revokeApiKey(id);
    load();
  };

  const toggleScope = (s: string) =>
    setForm(f => ({ ...f, scopes: f.scopes.includes(s) ? f.scopes.filter(x => x !== s) : [...f.scopes, s] }));

  return (
    <div className="space-y-4">
      {newKey && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
          <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black uppercase tracking-widest text-emerald-700 mb-1">Klucz wygenerowany — skopiuj teraz, nie zostanie pokazany ponownie</p>
            <div className="flex items-center gap-2 font-mono text-xs bg-white border border-emerald-200 rounded-xl px-3 py-2">
              <span className="flex-1 truncate text-slate-800">{newKey}</span>
              <CopyBtn text={newKey} />
            </div>
          </div>
          <button onClick={() => setNewKey(null)} className="text-slate-400 hover:text-slate-600"><XCircle size={16} /></button>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h4 className="font-black text-sm uppercase tracking-tight text-slate-800 flex items-center gap-2"><Key size={14}/> Klucze API</h4>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-all">
          <Plus size={12}/> Nowy klucz
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
          <input
            placeholder="Nazwa klucza (np. Sklep Shopify)"
            value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Uprawnienia (zakresy)</p>
            <div className="flex flex-wrap gap-2">
              {API_SCOPES.map(s => (
                <button key={s.id} onClick={() => toggleScope(s.id)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${form.scopes.includes(s.id) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-[10px] text-slate-400">Data wygaśnięcia (opcjonalnie)</span>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-all">
              Generuj klucz
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black uppercase text-[10px] tracking-widest rounded-xl transition-all">
              Anuluj
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><RefreshCw size={20} className="animate-spin text-slate-300" /></div>
      ) : keys.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-xs">Brak kluczy API. Utwórz pierwszy klucz.</div>
      ) : (
        <div className="space-y-2">
          {keys.map(k => (
            <div key={k.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4">
              <div className={`w-2 h-8 rounded-full flex-shrink-0 ${k.active ? 'bg-emerald-400' : 'bg-slate-200'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-800">{k.name}</span>
                  {!k.active && <span className="text-[9px] font-black uppercase text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">Odwołany</span>}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-[11px] text-slate-500">{k.keyPrefix}••••••••</span>
                  <div className="flex flex-wrap gap-1">
                    {k.scopes.slice(0, 4).map(s => (
                      <span key={s} className="text-[9px] font-bold bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full border border-indigo-100">{s}</span>
                    ))}
                    {k.scopes.length > 4 && <span className="text-[9px] text-slate-400">+{k.scopes.length - 4}</span>}
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-[10px] text-slate-400">{k.callCount} wywołań</div>
                {k.expiresAt && <div className="text-[9px] text-amber-500">Wygasa: {k.expiresAt}</div>}
              </div>
              {k.active && (
                <button onClick={() => handleRevoke(k.id)} className="text-slate-300 hover:text-rose-500 transition-colors flex-shrink-0">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WebhooksTab({ tenantId }: { tenantId: string }) {
  const [hooks, setHooks] = useState<WebhookConfig[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', url: '', events: [] as string[], secret: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const snap = await getDocs(query(collection(db, 'webhooks'), where('tenantId', '==', tenantId)));
    setHooks(snap.docs.map(d => ({ id: d.id, ...d.data() } as WebhookConfig)));
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.name || !form.url || form.events.length === 0) return;
    setSaving(true);
    await addDoc(collection(db, 'webhooks'), {
      ...form, tenantId, active: true, failCount: 0, createdAt: serverTimestamp(),
    });
    setForm({ name: '', url: '', events: [], secret: '' });
    setShowForm(false);
    setSaving(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Usunąć webhook?')) return;
    await deleteDoc(doc(db, 'webhooks', id));
    load();
  };

  const handleToggle = async (id: string, active: boolean) => {
    await updateDoc(doc(db, 'webhooks', id), { active: !active });
    load();
  };

  const toggleEvent = (e: string) =>
    setForm(f => ({ ...f, events: f.events.includes(e) ? f.events.filter(x => x !== e) : [...f.events, e] }));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-black text-sm uppercase tracking-tight text-slate-800 flex items-center gap-2"><Webhook size={14}/> Webhooki wychodzące</h4>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-all">
          <Plus size={12}/> Nowy webhook
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
          <input placeholder="Nazwa (np. Powiadamiaj Slack)" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <input placeholder="URL endpointu (https://...)" value={form.url}
            onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <input placeholder="Secret (opcjonalnie, do weryfikacji HMAC-SHA256)" value={form.secret}
            onChange={e => setForm(f => ({ ...f, secret: e.target.value }))}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Zdarzenia</p>
            <div className="flex flex-wrap gap-2">
              {ALL_EVENTS.map(ev => (
                <button key={ev} onClick={() => toggleEvent(ev)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${form.events.includes(ev) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>
                  {ev}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-all">
              {saving ? 'Zapisuję...' : 'Zapisz webhook'}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black uppercase text-[10px] tracking-widest rounded-xl transition-all">
              Anuluj
            </button>
          </div>
        </div>
      )}

      {hooks.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-xs">Brak webhooków. Skonfiguruj pierwszy endpoint.</div>
      ) : (
        <div className="space-y-2">
          {hooks.map(h => (
            <div key={h.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4">
              <div className={`w-2 h-8 rounded-full flex-shrink-0 ${h.active ? 'bg-emerald-400' : 'bg-slate-200'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-800">{h.name}</span>
                  {h.failCount > 2 && <AlertTriangle size={12} className="text-amber-500" />}
                </div>
                <div className="text-[11px] text-slate-400 truncate font-mono">{h.url}</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {h.events.slice(0, 5).map(ev => (
                    <span key={ev} className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{ev}</span>
                  ))}
                  {h.events.length > 5 && <span className="text-[9px] text-slate-400">+{h.events.length - 5}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {h.lastStatus === 'success' && <CheckCircle2 size={14} className="text-emerald-500" />}
                {h.lastStatus === 'error' && <XCircle size={14} className="text-rose-500" />}
                <button onClick={() => handleToggle(h.id, h.active)}
                  className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg border transition-all ${h.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                  {h.active ? 'Aktywny' : 'Wstrzymany'}
                </button>
                <button onClick={() => handleDelete(h.id)} className="text-slate-300 hover:text-rose-500 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DocsTab() {
  const [open, setOpen] = useState<string | null>(API_DOCS[0].group);
  return (
    <div className="space-y-3">
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3">
        <Code2 size={16} className="text-indigo-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-700">
          <p className="font-black uppercase tracking-widest mb-1">Base URL</p>
          <div className="flex items-center gap-2 font-mono bg-white border border-indigo-200 rounded-xl px-3 py-1.5">
            <span className="text-slate-700">https://api.c-icas.com</span>
            <CopyBtn text="https://api.c-icas.com" />
          </div>
          <p className="mt-2 text-indigo-600">Autoryzacja: <code className="bg-white px-1.5 py-0.5 rounded border border-indigo-200">Authorization: Bearer {'<api_key>'}</code></p>
        </div>
      </div>

      {API_DOCS.map(group => (
        <div key={group.group} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <button
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
            onClick={() => setOpen(open === group.group ? null : group.group)}
          >
            <span className="font-black text-sm uppercase tracking-tight text-slate-800">{group.group}</span>
            {open === group.group ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
          </button>
          {open === group.group && (
            <div className="border-t border-slate-100 divide-y divide-slate-50">
              {group.endpoints.map((ep, i) => (
                <div key={i} className="flex items-start gap-4 px-4 py-3 hover:bg-slate-50">
                  <span className={`font-mono text-[10px] font-black px-2 py-1 rounded-lg flex-shrink-0 ${METHOD_COLOR[ep.method] || 'bg-slate-100 text-slate-600'}`}>{ep.method}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs text-slate-700">{ep.path}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{ep.desc}</div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {ep.scopes.map(s => (
                      <span key={s} className="text-[9px] font-bold bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded-full border border-indigo-100">{s}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function LogsTab({ tenantId }: { tenantId: string }) {
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setLogs(await listApiLogs(tenantId));
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-black text-sm uppercase tracking-tight text-slate-800 flex items-center gap-2"><Activity size={14}/> Logi wywołań API</h4>
        <button onClick={load} className="text-slate-400 hover:text-slate-700 transition-colors"><RefreshCw size={14} /></button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><RefreshCw size={20} className="animate-spin text-slate-300" /></div>
      ) : logs.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-xs">Brak logów. Wywołania API pojawią się tutaj po pierwszym użyciu klucza.</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Endpoint</th>
                <th className="text-left p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Klucz</th>
                <th className="text-left p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                <th className="text-left p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Czas</th>
                <th className="text-left p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Kiedy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {logs.map(l => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="p-3">
                    <span className={`font-mono text-[9px] font-black px-1.5 py-0.5 rounded ${METHOD_COLOR[l.method] || 'bg-slate-100 text-slate-600'}`}>{l.method}</span>
                    <span className="font-mono text-slate-700 ml-2">{l.endpoint}</span>
                  </td>
                  <td className="p-3 text-slate-500">{l.keyName}</td>
                  <td className="p-3">
                    <span className={`font-black ${l.statusCode < 400 ? 'text-emerald-600' : 'text-rose-600'}`}>{l.statusCode}</span>
                  </td>
                  <td className="p-3 text-slate-400">{l.durationMs}ms</td>
                  <td className="p-3 text-slate-400">
                    {l.createdAt?.toDate ? l.createdAt.toDate().toLocaleString('pl-PL') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── main ───────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'keys',     label: 'Klucze API',   icon: Key },
  { id: 'webhooks', label: 'Webhooki',     icon: Webhook },
  { id: 'docs',     label: 'Dokumentacja', icon: Code2 },
  { id: 'logs',     label: 'Logi',         icon: Activity },
] as const;

export default function ApiPublicModule() {
  const { activeTenantId } = useAuth();
  const [tab, setTab] = useState<typeof TABS[number]['id']>('keys');

  if (!activeTenantId) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 p-10 opacity-10"><Globe size={130} /></div>
        <div className="relative z-10">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1 flex items-center gap-2">
            <Zap size={12}/> Integracje
          </h3>
          <h2 className="text-2xl font-black uppercase text-white tracking-tight">Publiczne API</h2>
          <p className="text-xs text-slate-400 mt-2 max-w-xl">Zarządzaj kluczami API i webhookami. Integruj C-ICAS.OS z zewnętrznymi systemami używając REST API z autoryzacją Bearer token.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-0">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest border-b-2 -mb-px transition-colors ${tab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
            <t.icon size={12}/>{t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === 'keys'     && <ApiKeyTab     tenantId={activeTenantId} />}
        {tab === 'webhooks' && <WebhooksTab   tenantId={activeTenantId} />}
        {tab === 'docs'     && <DocsTab />}
        {tab === 'logs'     && <LogsTab       tenantId={activeTenantId} />}
      </div>
    </div>
  );
}
