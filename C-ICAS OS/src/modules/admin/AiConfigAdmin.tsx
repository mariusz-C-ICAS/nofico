import React, { useEffect, useState } from 'react';
import { toast } from '../../shared/utils/toast';
import {
  Bot, Key, Zap, BarChart3, Save, CheckCircle2, XCircle,
  Loader2, AlertTriangle, TrendingUp, Users, Cpu, ChevronDown,
} from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../shared/lib/firebase';
import { useAuth } from '../../shared/hooks/AuthContext';
import { getAiConfig, getUsageStats } from '../../shared/lib/aiService';
import type { AiConfig, AiProvider } from '../../shared/lib/aiService';

// ── Provider catalog ──────────────────────────────────────────────────────────

const PROVIDERS: {
  id: AiProvider; name: string; badge: string; color: string;
  models: string[]; visionModels: string[]; transcriptionModels: string[];
  needsBaseUrl?: boolean; needsDeployment?: boolean;
}[] = [
  {
    id: 'anthropic', name: 'Anthropic (Claude)', badge: 'ANT', color: 'bg-amber-100 text-amber-800',
    models: ['claude-sonnet-4-6', 'claude-opus-4-7', 'claude-haiku-4-5'],
    visionModels: ['claude-sonnet-4-6', 'claude-opus-4-7'],
    transcriptionModels: [],
  },
  {
    id: 'openai', name: 'OpenAI (GPT / Whisper)', badge: 'OAI', color: 'bg-emerald-100 text-emerald-800',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1', 'o1-mini'],
    visionModels: ['gpt-4o', 'gpt-4-turbo'],
    transcriptionModels: ['whisper-1'],
  },
  {
    id: 'groq', name: 'Groq (LLaMA / Whisper)', badge: 'GRQ', color: 'bg-violet-100 text-violet-800',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
    visionModels: ['meta-llama/llama-4-scout-17b-16e-instruct', 'llama-3.2-11b-vision-preview'],
    transcriptionModels: ['whisper-large-v3', 'distil-whisper-large-v3-en'],
  },
  {
    id: 'gemini', name: 'Google Gemini', badge: 'GEM', color: 'bg-blue-100 text-blue-800',
    models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    visionModels: ['gemini-2.0-flash', 'gemini-1.5-pro'],
    transcriptionModels: [],
  },
  {
    id: 'azure_openai', name: 'Azure OpenAI', badge: 'AZ', color: 'bg-sky-100 text-sky-800',
    models: ['gpt-4o', 'gpt-4-turbo', 'gpt-35-turbo'],
    visionModels: ['gpt-4o', 'gpt-4-turbo'],
    transcriptionModels: ['whisper'],
    needsBaseUrl: true, needsDeployment: true,
  },
  {
    id: 'custom', name: 'Własny / Self-hosted (OpenAI-compatible)', badge: 'OWN', color: 'bg-slate-100 text-slate-700',
    models: [],
    visionModels: [],
    transcriptionModels: [],
    needsBaseUrl: true,
  },
  {
    id: 'custom_full', name: 'Własny — pełna konfiguracja', badge: 'FULL', color: 'bg-orange-100 text-orange-800',
    models: [],
    visionModels: [],
    transcriptionModels: [],
    needsBaseUrl: true,
  },
];

const MODULE_LABELS: Record<string, string> = {
  workflow: 'Obieg dokumentów', hr: 'HR', crm: 'CRM', finance: 'Finanse',
  compliance: 'Compliance', admin: 'Admin', timeTracking: 'Czas pracy',
};

// ── Main component ────────────────────────────────────────────────────────────

export default function AiConfigAdmin() {
  const { activeTenantId, user } = useAuth();
  const [cfg, setCfg] = useState<Partial<AiConfig>>({ provider: 'openai', enabled: true, maxTokens: 1024, temperature: 0.3 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null);
  const [testMsg, setTestMsg] = useState('');
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getUsageStats>> | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const prov = PROVIDERS.find(p => p.id === cfg.provider) ?? PROVIDERS[1];

  useEffect(() => {
    if (!activeTenantId) return;
    getAiConfig(activeTenantId).then(c => { if (c) setCfg(c); }).finally(() => setLoading(false));
    setStatsLoading(true);
    getUsageStats(activeTenantId, 30).then(setStats).finally(() => setStatsLoading(false));
  }, [activeTenantId]);

  const handleSave = async () => {
    if (!activeTenantId || !user) return;
    if (!cfg.apiKey?.trim()) { toast.info('Wpisz klucz API'); return; }
    if (!cfg.model?.trim()) { toast.info('Wybierz lub wpisz model'); return; }
    setSaving(true);
    await setDoc(doc(db, `tenants/${activeTenantId}/integrations/ai`), {
      ...cfg,
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
    });
    setSaving(false);
  };

  const handleTest = async () => {
    if (!activeTenantId || !cfg.apiKey || !cfg.model) return;
    setTesting(true);
    setTestResult(null);
    try {
      const { chatCompletion, getAiConfig } = await import('../../shared/lib/aiService');
      // Save temporarily for test
      await setDoc(doc(db, `tenants/${activeTenantId}/integrations/ai`), { ...cfg, enabled: true, updatedAt: serverTimestamp(), updatedBy: user?.uid ?? 'test' });
      const reply = await chatCompletion(activeTenantId, user?.uid ?? 'test', 'admin', 'connection_test',
        [{ role: 'user', content: 'Powiedz "OK" — test połączenia.' }],
        { maxTokens: 20 }
      );
      setTestMsg(reply.slice(0, 100));
      setTestResult('ok');
    } catch (e: any) {
      setTestMsg(e.message ?? 'Błąd połączenia');
      setTestResult('fail');
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-slate-400" /></div>;

  const totalCostFormatted = stats ? `$${stats.totalCostUsd.toFixed(4)}` : '—';
  const maxModuleCost = stats ? Math.max(...Object.values(stats.byModule).map(v => v.costUsd), 0.0001) : 1;

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Bot size={18} className="text-indigo-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Admin — Konfiguracja AI</span>
        </div>
        <h2 className="text-3xl font-black uppercase tracking-tighter italic">Asystent AI — Provider</h2>
        <p className="text-slate-400 text-sm mt-2">
          Jeden provider AI obsługuje cały system. Każdy tenant konfiguruje własne API.
        </p>
      </div>

      {/* Provider selection */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 space-y-6">
        <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">Provider AI</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {PROVIDERS.map(p => (
            <button
              key={p.id}
              onClick={() => setCfg(prev => ({ ...prev, provider: p.id, model: p.models[0] ?? '', visionModel: p.visionModels[0], transcriptionModel: p.transcriptionModels[0] }))}
              className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                cfg.provider === p.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 hover:border-slate-300 bg-slate-50'
              }`}
            >
              <span className={`text-[10px] font-black px-2 py-1 rounded-lg flex-shrink-0 ${p.color}`}>{p.badge}</span>
              <span className="text-xs font-black text-slate-800 leading-tight">{p.name}</span>
            </button>
          ))}
        </div>

        {/* API Key */}
        <div className="space-y-2">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
            <Key size={10} /> Klucz API
          </label>
          <input
            type="password"
            value={cfg.apiKey ?? ''}
            onChange={e => setCfg(p => ({ ...p, apiKey: e.target.value }))}
            placeholder={`${prov.name} API key`}
            className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-mono text-slate-800 focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Azure/Custom extra fields */}
        {(prov.needsBaseUrl || prov.needsDeployment) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {prov.needsBaseUrl && (
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                  Base URL
                </label>
                <input
                  value={cfg.baseUrl ?? ''}
                  onChange={e => setCfg(p => ({ ...p, baseUrl: e.target.value }))}
                  placeholder={cfg.provider === 'azure_openai' ? 'https://{resource}.openai.azure.com' : 'https://my-llm.internal/v1'}
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 text-xs font-mono focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
            {prov.needsDeployment && (
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                  Deployment name
                </label>
                <input
                  value={cfg.azureDeployment ?? ''}
                  onChange={e => setCfg(p => ({ ...p, azureDeployment: e.target.value }))}
                  placeholder="mój-gpt4o-deployment"
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 text-xs font-mono focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
          </div>
        )}

        {/* Custom Full — template editor */}
        {cfg.provider === 'custom_full' && (
          <div className="space-y-4 bg-orange-50 rounded-2xl p-5">
            <p className="text-[9px] font-black text-orange-700 uppercase tracking-widest">
              Pełna konfiguracja żądania API
            </p>

            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                Template body (JSON) — dostępne placeholdery
              </label>
              <p className="text-[9px] text-slate-400 mb-2">
                {`{{messages_json}} {{prompt}} {{system}} {{model}} {{max_tokens}} {{temperature}} {{image_url}}`}
              </p>
              <textarea
                rows={6}
                value={cfg.customRequestTemplate ?? ''}
                onChange={e => setCfg(p => ({ ...p, customRequestTemplate: e.target.value }))}
                placeholder={`{"model":"{{model}}","messages":{{messages_json}},"max_tokens":{{max_tokens}},"temperature":{{temperature}}}`}
                className="w-full bg-white border border-orange-200 rounded-xl px-4 py-3 text-xs font-mono text-slate-700 focus:ring-2 focus:ring-orange-400 resize-y"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                  Ścieżka odpowiedzi (dot-notation)
                </label>
                <input
                  value={cfg.customResponsePath ?? ''}
                  onChange={e => setCfg(p => ({ ...p, customResponsePath: e.target.value }))}
                  placeholder="choices.0.message.content"
                  className="w-full bg-white border border-orange-200 rounded-xl px-4 py-3 text-xs font-mono focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                  Dodatkowe nagłówki (JSON)
                </label>
                <input
                  value={cfg.customHeaders ?? ''}
                  onChange={e => setCfg(p => ({ ...p, customHeaders: e.target.value }))}
                  placeholder={`{"X-My-Header":"value"}`}
                  className="w-full bg-white border border-orange-200 rounded-xl px-4 py-3 text-xs font-mono focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                  Nazwa nagłówka autoryzacji
                </label>
                <input
                  value={cfg.customAuthHeader ?? ''}
                  onChange={e => setCfg(p => ({ ...p, customAuthHeader: e.target.value }))}
                  placeholder="Authorization"
                  className="w-full bg-white border border-orange-200 rounded-xl px-4 py-3 text-xs font-mono focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                  Prefix wartości autoryzacji
                </label>
                <input
                  value={cfg.customAuthPrefix ?? ''}
                  onChange={e => setCfg(p => ({ ...p, customAuthPrefix: e.target.value }))}
                  placeholder="Bearer "
                  className="w-full bg-white border border-orange-200 rounded-xl px-4 py-3 text-xs font-mono focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>
          </div>
        )}

        {/* Models */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['model', 'visionModel', 'transcriptionModel'] as const).map((field, i) => {
            const opts = i === 0 ? prov.models : i === 1 ? prov.visionModels : prov.transcriptionModels;
            const labels = ['Model domyślny *', 'Model Vision (OCR)', 'Model Transkrypcji'];
            return (
              <div key={field}>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">{labels[i]}</label>
                {opts.length > 0 ? (
                  <select
                    value={cfg[field] ?? ''}
                    onChange={e => setCfg(p => ({ ...p, [field]: e.target.value }))}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                  >
                    {opts.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                ) : (
                  <input
                    value={cfg[field] ?? ''}
                    onChange={e => setCfg(p => ({ ...p, [field]: e.target.value }))}
                    placeholder={i === 2 ? (cfg.provider === 'anthropic' || cfg.provider === 'gemini' ? 'N/A' : 'whisper-1') : 'nazwa-modelu'}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 text-xs font-mono focus:ring-2 focus:ring-indigo-500"
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Advanced */}
        <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase">
          <ChevronDown size={12} className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          Zaawansowane (limity i temperatura)
        </button>
        {showAdvanced && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Max tokens</label>
              <input type="number" value={cfg.maxTokens ?? 1024} onChange={e => setCfg(p => ({ ...p, maxTokens: Number(e.target.value) }))}
                className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Temperatura (0–1)</label>
              <input type="number" min="0" max="1" step="0.05" value={cfg.temperature ?? 0.3} onChange={e => setCfg(p => ({ ...p, temperature: Number(e.target.value) }))}
                className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
        )}

        {/* Enable toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCfg(p => ({ ...p, enabled: !p.enabled }))}
            className={`w-12 h-6 rounded-full transition-colors ${cfg.enabled ? 'bg-indigo-600' : 'bg-slate-200'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full shadow mx-0.5 transition-transform ${cfg.enabled ? 'translate-x-6' : ''}`} />
          </button>
          <span className="text-xs font-black text-slate-700 uppercase">AI {cfg.enabled ? 'włączone' : 'wyłączone'}</span>
        </div>

        {/* Test & Save */}
        <div className="flex gap-3 pt-2 border-t border-slate-100">
          <button onClick={handleTest} disabled={testing || !cfg.apiKey} className="flex items-center gap-2 px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase transition-all disabled:opacity-40">
            {testing ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
            Test połączenia
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 shadow-xl shadow-indigo-200">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Zapisz konfigurację
          </button>
        </div>

        {testResult && (
          <div className={`flex items-start gap-2 p-4 rounded-2xl text-xs font-bold ${testResult === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
            {testResult === 'ok' ? <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" /> : <XCircle size={14} className="flex-shrink-0 mt-0.5" />}
            {testResult === 'ok' ? `Połączenie OK — odpowiedź: "${testMsg}"` : `Błąd: ${testMsg}`}
          </div>
        )}
      </div>

      {/* Usage Dashboard */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
            <BarChart3 size={14} className="text-indigo-500" /> Zużycie tokenów — ostatnie 30 dni
          </h3>
          {statsLoading && <Loader2 size={14} className="animate-spin text-slate-400" />}
        </div>

        {stats && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard icon={<Cpu size={16} />} label="Tokeny łącznie" value={stats.totalTokens.toLocaleString()} color="text-indigo-600" />
              <StatCard icon={<TrendingUp size={16} />} label="Szac. koszt (USD)" value={totalCostFormatted} color="text-emerald-600" />
              <StatCard icon={<Users size={16} />} label="Użytkownicy" value={`${stats.byUser.length}`} color="text-violet-600" />
            </div>

            {/* By module */}
            {Object.keys(stats.byModule).length > 0 && (
              <div className="space-y-3">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Zużycie według modułu</p>
                {Object.entries(stats.byModule).sort((a, b) => b[1].tokens - a[1].tokens).map(([mod, v]) => (
                  <div key={mod} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-700">{MODULE_LABELS[mod] ?? mod}</span>
                      <span className="text-[10px] font-black text-slate-500">{v.tokens.toLocaleString()} tok · ${v.costUsd.toFixed(4)}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${Math.min(100, (v.costUsd / maxModuleCost) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* By user */}
            {stats.byUser.length > 0 && (
              <div className="space-y-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Top użytkownicy</p>
                <div className="divide-y divide-slate-50">
                  {stats.byUser.slice(0, 5).map(u => (
                    <div key={u.userId} className="flex justify-between items-center py-2.5">
                      <span className="text-xs font-mono text-slate-500">{u.userId.slice(0, 12)}…</span>
                      <div className="text-right">
                        <span className="text-xs font-black text-slate-800 block">{u.tokens.toLocaleString()} tok</span>
                        <span className="text-[9px] text-slate-400">${u.costUsd.toFixed(4)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stats.totalTokens === 0 && (
              <p className="text-center text-[10px] text-slate-400 font-bold uppercase py-4">
                Brak zużycia w ostatnich 30 dniach
              </p>
            )}
          </>
        )}

        {!stats && !statsLoading && (
          <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-2xl p-4">
            <AlertTriangle size={14} /> Brak danych statystycznych
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="bg-slate-50 rounded-2xl p-4 flex items-start gap-3">
      <span className={color}>{icon}</span>
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase">{label}</p>
        <p className={`text-xl font-black ${color}`}>{value}</p>
      </div>
    </div>
  );
}
