import React, { useState, useEffect } from 'react';
import {
  Webhook, Plus, RefreshCw, Trash2, Edit2, Play, X, Save,
  CheckCircle2, XCircle, Clock, Copy, ExternalLink, AlertTriangle
} from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import {
  collection, query, where, getDocs, addDoc, updateDoc,
  deleteDoc, doc, serverTimestamp
} from 'firebase/firestore';

interface Props { tenantId: string }

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  secret?: string;
  headers?: string;
  lastTriggeredAt?: string;
  lastStatus?: 'success' | 'error' | 'pending';
  lastStatusCode?: number;
  failCount: number;
  createdAt?: any;
}

interface WebhookLog {
  id: string;
  webhookId: string;
  event: string;
  status: 'success' | 'error';
  statusCode?: number;
  triggeredAt: string;
  payload?: string;
  responseBody?: string;
}

const CRM_EVENTS = [
  'customer.created', 'customer.updated', 'customer.status_changed',
  'deal.created', 'deal.stage_changed', 'deal.won', 'deal.lost',
  'task.completed', 'contract.expiring', 'nps.response', 'sla.breached',
];

const emptyForm = () => ({
  name: '', url: '', events: [] as string[],
  active: true, secret: '', headers: '',
});

function generateSecret(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(20)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function WebhookOutbound({ tenantId }: Props) {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<WebhookConfig | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedWebhook, setSelectedWebhook] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [whSnap, logSnap] = await Promise.all([
      getDocs(query(collection(db, `tenants/${tenantId}/webhooks`), where('tenantId', '==', tenantId))),
      getDocs(query(collection(db, `tenants/${tenantId}/webhookLogs`), where('tenantId', '==', tenantId))),
    ]);
    setWebhooks(whSnap.docs.map(d => ({ id: d.id, ...d.data() } as WebhookConfig)));
    setLogs(logSnap.docs.map(d => ({ id: d.id, ...d.data() } as WebhookLog)).slice(-50));
    setLoading(false);
  };

  useEffect(() => { load(); }, [tenantId]);

  const upd = (k: keyof ReturnType<typeof emptyForm>, v: any) => setForm(p => ({ ...p, [k]: v }));

  const toggleEvent = (e: string) => {
    setForm(p => ({
      ...p, events: p.events.includes(e) ? p.events.filter(x => x !== e) : [...p.events, e],
    }));
  };

  const openCreate = () => { setForm({ ...emptyForm(), secret: generateSecret() }); setEditing(null); setCreating(true); };
  const openEdit = (w: WebhookConfig) => {
    setForm({ name: w.name, url: w.url, events: w.events, active: w.active, secret: w.secret ?? '', headers: w.headers ?? '' });
    setEditing(w); setCreating(false);
  };
  const closeForm = () => { setCreating(false); setEditing(null); };

  const handleSave = async () => {
    if (!form.name.trim() || !form.url.trim() || form.events.length === 0) return;
    setSaving(true);
    const payload = {
      tenantId, name: form.name.trim(), url: form.url.trim(),
      events: form.events, active: form.active,
      secret: form.secret.trim() || null,
      headers: form.headers.trim() || null,
      failCount: 0, updatedAt: serverTimestamp(),
    };
    try {
      if (editing) {
        await updateDoc(doc(db, `tenants/${tenantId}/webhooks`, editing.id), payload);
      } else {
        await addDoc(collection(db, `tenants/${tenantId}/webhooks`), { ...payload, createdAt: serverTimestamp() });
      }
      closeForm();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Usunąć webhook?')) return;
    await deleteDoc(doc(db, `tenants/${tenantId}/webhooks`, id));
    setWebhooks(p => p.filter(x => x.id !== id));
  };

  const handleToggle = async (w: WebhookConfig) => {
    await updateDoc(doc(db, `tenants/${tenantId}/webhooks`, w.id), { active: !w.active, updatedAt: serverTimestamp() });
    setWebhooks(p => p.map(x => x.id === w.id ? { ...x, active: !x.active } : x));
  };

  const handleTest = async (w: WebhookConfig) => {
    setTesting(w.id);
    const testPayload = {
      event: 'test', tenantId, timestamp: new Date().toISOString(),
      data: { message: 'Test webhook from NoFiCo CRM', webhookId: w.id },
    };
    let status: 'success' | 'error' = 'error';
    let statusCode = 0;
    let responseBody = '';
    try {
      const res = await fetch(w.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(w.secret ? { 'X-Webhook-Secret': w.secret } : {}) },
        body: JSON.stringify(testPayload),
      });
      statusCode = res.status;
      responseBody = await res.text().catch(() => '');
      status = res.ok ? 'success' : 'error';
    } catch (e: any) {
      responseBody = e?.message ?? 'Network error';
    }
    const logEntry = {
      tenantId, webhookId: w.id, event: 'test', status, statusCode,
      triggeredAt: new Date().toISOString(), payload: JSON.stringify(testPayload),
      responseBody: responseBody.slice(0, 500),
    };
    await addDoc(collection(db, `tenants/${tenantId}/webhookLogs`), logEntry);
    await updateDoc(doc(db, `tenants/${tenantId}/webhooks`, w.id), {
      lastTriggeredAt: logEntry.triggeredAt, lastStatus: status, lastStatusCode: statusCode,
      failCount: status === 'error' ? (w.failCount ?? 0) + 1 : 0, updatedAt: serverTimestamp(),
    });
    setTesting(null);
    await load();
  };

  const copyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const webhookLogs = logs.filter(l => l.webhookId === selectedWebhook);
  const activeCount = webhooks.filter(w => w.active).length;
  const errorCount = webhooks.filter(w => w.lastStatus === 'error').length;

  const FormPanel = () => (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-black text-slate-900 uppercase tracking-tighter">
          {editing ? 'Edytuj webhook' : 'Nowy webhook'}
        </h4>
        <button onClick={closeForm}><X size={14} /></button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nazwa *</label>
          <input value={form.name} onChange={e => upd('name', e.target.value)}
            placeholder="np. Zapier CRM sync"
            className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
        <div className="col-span-2 lg:col-span-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">URL docelowy *</label>
          <input value={form.url} onChange={e => upd('url', e.target.value)}
            placeholder="https://hooks.zapier.com/..."
            className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none font-mono focus:ring-2 focus:ring-indigo-400" />
        </div>
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Secret (HMAC)</label>
          <div className="mt-1 flex gap-2">
            <input value={form.secret} onChange={e => upd('secret', e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none font-mono" />
            <button onClick={() => upd('secret', generateSecret())} className="text-[9px] font-black text-slate-500 bg-slate-100 px-3 rounded-xl hover:bg-slate-200">Losuj</button>
          </div>
        </div>
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nagłówki (JSON)</label>
          <input value={form.headers} onChange={e => upd('headers', e.target.value)}
            placeholder='{"Authorization":"Bearer ..."}'
            className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none font-mono" />
        </div>
        <div className="col-span-2">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Zdarzenia * ({form.events.length} wybrano)</label>
          <div className="flex flex-wrap gap-2">
            {CRM_EVENTS.map(e => (
              <button key={e} onClick={() => toggleEvent(e)}
                className={`px-2.5 py-1 rounded-lg text-[9px] font-black transition-all ${form.events.includes(e) ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {e}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Aktywny</label>
          <button onClick={() => upd('active', !form.active)}
            className={`w-10 h-5 rounded-full transition-colors ${form.active ? 'bg-emerald-500' : 'bg-slate-200'}`}>
            <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-0.5 ${form.active ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={closeForm} className="flex-1 border border-slate-200 text-slate-500 font-black text-xs py-3 rounded-xl">Anuluj</button>
        <button onClick={handleSave} disabled={!form.name.trim() || !form.url.trim() || form.events.length === 0 || saving}
          className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-black text-xs py-3 rounded-xl">
          {saving ? <RefreshCw size={11} className="animate-spin" /> : <Save size={11} />} Zapisz
        </button>
      </div>
    </div>
  );

  if (loading) return <div className="flex justify-center py-20"><RefreshCw size={20} className="animate-spin text-indigo-400" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Webhook Outbound</h3>
          <p className="text-xs text-slate-500 mt-0.5">{webhooks.length} webhooków · {activeCount} aktywnych</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-slate-900 hover:bg-indigo-600 text-white font-black text-xs px-6 py-3 rounded-2xl transition-all">
          <Plus size={14} /> Nowy webhook
        </button>
      </div>

      {errorCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle size={14} className="text-red-600 flex-shrink-0" />
          <p className="text-xs font-black text-red-700">{errorCount} webhook{errorCount > 1 ? 'i' : ''} z błędem — sprawdź URL lub logi</p>
        </div>
      )}

      {/* Form */}
      {(creating || editing) && <FormPanel />}

      {/* Webhook list */}
      {webhooks.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          Brak webhooków — dodaj integrację z Zapier, Make lub własnym endpointem
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map(w => (
            <div key={w.id} className={`bg-white rounded-2xl border p-5 ${!w.active ? 'opacity-60 border-slate-100' : 'border-slate-200'}`}>
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${w.active ? 'bg-indigo-50' : 'bg-slate-100'}`}>
                  <Webhook size={16} className={w.active ? 'text-indigo-600' : 'text-slate-400'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-black text-slate-900">{w.name}</span>
                    {!w.active && <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Nieaktywny</span>}
                    {w.lastStatus === 'success' && <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle2 size={8} /> OK</span>}
                    {w.lastStatus === 'error' && <span className="text-[9px] font-black text-red-700 bg-red-100 px-2 py-0.5 rounded-full flex items-center gap-1"><XCircle size={8} /> Błąd {w.lastStatusCode}</span>}
                  </div>
                  <div className="flex items-center gap-2 text-[9px] text-slate-400 font-mono mb-2">
                    <span className="truncate max-w-[300px]">{w.url}</span>
                    <button onClick={() => copyUrl(w.url, w.id)} className="flex-shrink-0">
                      {copiedId === w.id ? <CheckCircle2 size={10} className="text-emerald-500" /> : <Copy size={10} />}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {w.events.map(e => (
                      <span key={e} className="text-[8px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{e}</span>
                    ))}
                  </div>
                  {w.lastTriggeredAt && (
                    <p className="text-[9px] text-slate-400 mt-1 flex items-center gap-1">
                      <Clock size={8} /> Ostatni trigger: {new Date(w.lastTriggeredAt).toLocaleString('pl-PL')}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button onClick={() => handleTest(w)} disabled={testing === w.id || !w.active}
                    className="flex items-center gap-1 text-[9px] font-black text-blue-600 bg-blue-50 hover:bg-blue-100 disabled:opacity-40 px-3 py-1.5 rounded-lg">
                    {testing === w.id ? <RefreshCw size={10} className="animate-spin" /> : <Play size={10} />} Test
                  </button>
                  <button onClick={() => setSelectedWebhook(selectedWebhook === w.id ? null : w.id)}
                    className="flex items-center gap-1 text-[9px] font-black text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg">
                    <Clock size={10} /> Logi
                  </button>
                  <button onClick={() => handleToggle(w)}
                    className="flex items-center gap-1 text-[9px] font-black text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg">
                    {w.active ? 'Wyłącz' : 'Włącz'}
                  </button>
                  <button onClick={() => openEdit(w)}
                    className="flex items-center gap-1 text-[9px] font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg">
                    <Edit2 size={10} /> Edytuj
                  </button>
                  <button onClick={() => handleDelete(w.id)}
                    className="flex items-center gap-1 text-[9px] font-black text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg">
                    <Trash2 size={10} /> Usuń
                  </button>
                </div>
              </div>

              {/* Logs panel */}
              {selectedWebhook === w.id && (
                <div className="mt-4 border-t border-slate-100 pt-4 space-y-1.5 max-h-48 overflow-y-auto">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Historia (ostatnie 50)</p>
                  {webhookLogs.length === 0 ? (
                    <p className="text-xs text-slate-400">Brak logów dla tego webhooka</p>
                  ) : (
                    webhookLogs.slice(-10).reverse().map(l => (
                      <div key={l.id} className="flex items-center gap-2 text-[9px]">
                        {l.status === 'success' ? <CheckCircle2 size={10} className="text-emerald-500" /> : <XCircle size={10} className="text-red-500" />}
                        <span className="text-slate-500">{new Date(l.triggeredAt).toLocaleString('pl-PL')}</span>
                        <span className="font-black text-slate-700">{l.event}</span>
                        <span className="text-slate-400">HTTP {l.statusCode}</span>
                        {l.responseBody && <span className="text-slate-400 truncate max-w-[200px]">{l.responseBody}</span>}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
