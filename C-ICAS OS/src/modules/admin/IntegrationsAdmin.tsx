/**
 * IntegrationsAdmin.tsx
 * Panel integracji zewnętrznych C-ICAS OS.
 * Grupy: Automatyczne (bez klucza) | Do skonfigurowania (URL i/lub klucz)
 */
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Zap, Shield, Globe, Landmark, ShoppingBag, Settings,
  ChevronRight, CheckCircle2, AlertCircle, Link2, Link2Off,
  Loader2, Search, ExternalLink, Key, RefreshCw,
  ToggleLeft, ToggleRight, Eye, EyeOff, Wifi,
  Pencil, RotateCcw, Check, X, Plug, Clock, History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { IntegrationService, AVAILABLE_PROVIDERS, IntegrationProvider, ConfigurationType, ApiLogEntry, logApiActivity, getApiLogs } from './services/IntegrationService';
import { useAuth } from '../../shared/hooks/AuthContext';
import { db } from '../../shared/lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

const KSEF_TEST_URL = 'https://ksef-test.mf.gov.pl/api';
const KSEF_PROD_URL  = 'https://ksef.mf.gov.pl/api';

export default function IntegrationsAdminModule() {
  const { activeTenantId } = useAuth();
  const [activeIntegrations, setActiveIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [customUrls, setCustomUrls] = useState<Record<string, string>>({});
  const [editingUrl, setEditingUrl] = useState<string | null>(null);
  const [editUrlValue, setEditUrlValue] = useState('');
  const [showHidden, setShowHidden] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showConfigModal, setShowConfigModal] = useState<IntegrationProvider | null>(null);
  const [configValue, setConfigValue] = useState('');
  const [configApiUrl, setConfigApiUrl] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [apiLogs, setApiLogs] = useState<ApiLogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  // KSeF state
  const [ksefToken, setKsefToken] = useState('');
  const [ksefNip, setKsefNip] = useState('');
  const [ksefEnv, setKsefEnv] = useState<'test' | 'prod'>('test');
  const [ksefSim, setKsefSim] = useState(true);
  const [ksefSaving, setKsefSaving] = useState(false);

  // CalSyncPro state
  const CSP_DEFAULT_URL = 'https://api.calsyncpro.com/api/v1';
  const [cspApiUrl, setCspApiUrl] = useState(CSP_DEFAULT_URL);
  const [cspApiKey, setCspApiKey] = useState('');
  // Microsoft sources
  const [cspExchange, setCspExchange] = useState(true);
  const [cspOutlookCom, setCspOutlookCom] = useState(false);
  const [cspM365, setCspM365] = useState(false);
  // Google sources
  const [cspGWorkspace, setCspGWorkspace] = useState(false);
  const [cspGmail, setCspGmail] = useState(false);
  // CalDAV sources
  const [cspApple, setCspApple] = useState(false);
  const [cspFastmail, setCspFastmail] = useState(false);
  const [cspYahoo, setCspYahoo] = useState(false);
  const [cspCalDAV, setCspCalDAV] = useState(false);
  // Output
  const [cspKanban, setCspKanban] = useState(true);
  const [cspBooking, setCspBooking] = useState(true);
  const [cspSaving, setCspSaving] = useState(false);
  const [cspSavedConfig, setCspSavedConfig] = useState<{ url: string; lastUpdated?: Date; lastTest?: { ok: boolean; ms: number; msg: string; at: string } } | null>(null);
  const [cspTestResult, setCspTestResult] = useState<{ ok: boolean; ms: number; msg: string } | null>(null);
  const [cspTesting, setCspTesting] = useState(false);

  useEffect(() => {
    if (activeTenantId) loadIntegrations();
  }, [activeTenantId]);

  const loadIntegrations = async () => {
    if (!activeTenantId) return;
    setLoading(true);
    try {
      const [data, hidden, urls] = await Promise.all([
        IntegrationService.getTenantIntegrations(activeTenantId),
        IntegrationService.getHiddenIntegrations(activeTenantId),
        IntegrationService.getCustomUrls(activeTenantId),
      ]);
      setActiveIntegrations(data);
      setHiddenIds(hidden);
      setCustomUrls(urls);
      const cspSnap = await getDoc(doc(db, 'tenants', activeTenantId, 'integrations', 'calsyncpro'));
      if (cspSnap.exists()) {
        const d = cspSnap.data();
        setCspSavedConfig({ url: d.apiUrl || '', lastUpdated: d.updatedAt?.toDate?.(), lastTest: d.lastTest });
      } else { setCspSavedConfig(null); }
      const logs = await getApiLogs(activeTenantId, 30);
      setApiLogs(logs);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const toggleHide = async (id: string) => {
    const next = hiddenIds.includes(id) ? hiddenIds.filter(h => h !== id) : [...hiddenIds, id];
    setHiddenIds(next);
    if (activeTenantId) await IntegrationService.setHiddenIntegrations(activeTenantId, next);
  };

  const handleConnect = async () => {
    if (!showConfigModal || !activeTenantId) return;
    setConnecting(true);
    try {
      await IntegrationService.connectIntegration(
        activeTenantId, showConfigModal.id, showConfigModal.name, showConfigModal.category,
        { apiKey: configValue, apiUrl: configApiUrl || showConfigModal.fixedApiUrl }
      );
      await logApiActivity(activeTenantId, { providerId: showConfigModal.id, providerName: showConfigModal.name, action: 'connect', status: 'ok' });
      toast.success(`${showConfigModal.name} — połączono`);
      setShowConfigModal(null); setConfigValue(''); setConfigApiUrl('');
      loadIntegrations();
    } catch {
      if (activeTenantId && showConfigModal) await logApiActivity(activeTenantId, { providerId: showConfigModal.id, providerName: showConfigModal.name, action: 'connect', status: 'error' });
      toast.error(`Błąd połączenia z ${showConfigModal.name}`);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async (integrationId: string, name: string) => {
    if (!confirm(`Rozłączyć ${name}?`)) return;
    setDisconnectingId(integrationId);
    try {
      const provider = AVAILABLE_PROVIDERS.find(p => p.name === name);
      await IntegrationService.disconnectIntegration(integrationId);
      if (activeTenantId && provider) await logApiActivity(activeTenantId, { providerId: provider.id, providerName: name, action: 'disconnect', status: 'ok' });
      toast.success(`${name} — rozłączono`);
      loadIntegrations();
    } catch {
      toast.error(`Błąd rozłączania ${name}`);
    } finally {
      setDisconnectingId(null);
    }
  };

  const openModal = async (p: IntegrationProvider) => {
    setShowConfigModal(p);
    setConfigValue('');
    setConfigApiUrl(p.fixedApiUrl || '');
    if (!activeTenantId) return;
    if (p.id === 'ksef') {
      const snap = await getDoc(doc(db, 'tenants', activeTenantId, 'integrations', 'ksef'));
      if (snap.exists()) { const d = snap.data(); setKsefToken(d.token || ''); setKsefNip(d.nip || ''); setKsefEnv(d.env || 'test'); setKsefSim(d.simulationMode ?? true); }
    }
    if (p.id === 'calsyncpro') {
      const snap = await getDoc(doc(db, 'tenants', activeTenantId, 'integrations', 'calsyncpro'));
      if (snap.exists()) {
        const d = snap.data();
        setCspApiUrl(d.apiUrl || CSP_DEFAULT_URL);
        setCspApiKey(d.apiKey || '');
        setCspExchange(d.syncExchange ?? true);
        setCspOutlookCom(d.syncOutlookCom ?? false);
        setCspM365(d.syncM365 ?? false);
        setCspGWorkspace(d.syncGWorkspace ?? false);
        setCspGmail(d.syncGmail ?? false);
        setCspApple(d.syncApple ?? false);
        setCspFastmail(d.syncFastmail ?? false);
        setCspYahoo(d.syncYahoo ?? false);
        setCspCalDAV(d.syncCalDAV ?? false);
        setCspKanban(d.syncToKanban ?? true);
        setCspBooking(d.syncToBooking ?? true);
      } else {
        setCspApiUrl(CSP_DEFAULT_URL);
      }
    }
  };

  const handleKsefSave = async () => {
    if (!activeTenantId || !ksefToken || !ksefNip) return;
    setKsefSaving(true);
    try {
      await setDoc(doc(db, 'tenants', activeTenantId, 'integrations', 'ksef'), {
        token: ksefToken, nip: ksefNip, env: ksefEnv,
        apiUrl: ksefEnv === 'prod' ? KSEF_PROD_URL : KSEF_TEST_URL,
        simulationMode: ksefSim, updatedAt: serverTimestamp(),
      }, { merge: true });
      await IntegrationService.connectIntegration(activeTenantId, 'ksef', 'KSeF MF', 'government', { token: ksefToken });
      await logApiActivity(activeTenantId, { providerId: 'ksef', providerName: 'KSeF MF', action: 'save', status: 'ok' });
      toast.success('Konfiguracja KSeF MF zapisana');
      setShowConfigModal(null); loadIntegrations();
    } catch {
      await logApiActivity(activeTenantId, { providerId: 'ksef', providerName: 'KSeF MF', action: 'save', status: 'error' });
      toast.error('Błąd zapisu konfiguracji KSeF');
    } finally {
      setKsefSaving(false);
    }
  };

  const handleCspSave = async () => {
    if (!activeTenantId || !cspApiUrl || !cspApiKey) return;
    setCspSaving(true);
    try {
      await setDoc(doc(db, 'tenants', activeTenantId, 'integrations', 'calsyncpro'), {
        apiUrl: cspApiUrl, apiKey: cspApiKey,
        syncExchange: cspExchange, syncOutlookCom: cspOutlookCom, syncM365: cspM365,
        syncGWorkspace: cspGWorkspace, syncGmail: cspGmail,
        syncApple: cspApple, syncFastmail: cspFastmail, syncYahoo: cspYahoo, syncCalDAV: cspCalDAV,
        syncToKanban: cspKanban, syncToBooking: cspBooking,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      await IntegrationService.connectIntegration(activeTenantId, 'calsyncpro', 'CalSyncPro', 'system', { apiUrl: cspApiUrl });
      await logApiActivity(activeTenantId, { providerId: 'calsyncpro', providerName: 'CalSyncPro', action: 'save', status: 'ok' });
      toast.success('Konfiguracja CalSyncPro zapisana');
      setCspSavedConfig({ url: cspApiUrl, lastUpdated: new Date() });
      setShowConfigModal(null); loadIntegrations();
    } catch {
      await logApiActivity(activeTenantId, { providerId: 'calsyncpro', providerName: 'CalSyncPro', action: 'save', status: 'error' });
      toast.error('Błąd zapisu konfiguracji CalSyncPro');
    } finally {
      setCspSaving(false);
    }
  };

  const testCsp = async () => {
    if (!cspApiUrl) return;
    setCspTesting(true);
    setCspTestResult(null);
    const start = Date.now();
    try {
      const res = await fetch(`${cspApiUrl}/health`, {
        headers: cspApiKey ? { Authorization: `Bearer ${cspApiKey}` } : {},
        signal: AbortSignal.timeout(8000),
      });
      const ms = Date.now() - start;
      const ok = res.ok;
      const msg = `HTTP ${res.status} — ${ok ? 'OK' : res.statusText}`;
      const at = new Date().toISOString();
      setCspTestResult({ ok, ms, msg });
      if (activeTenantId) {
        await setDoc(doc(db, 'tenants', activeTenantId, 'integrations', 'calsyncpro'), { lastTest: { ok, ms, msg, at } }, { merge: true });
        setCspSavedConfig(prev => prev ? { ...prev, lastTest: { ok, ms, msg, at } } : { url: cspApiUrl, lastTest: { ok, ms, msg, at } });
      }
      await logApiActivity(activeTenantId ?? '', { providerId: 'calsyncpro', providerName: 'CalSyncPro', action: 'test', status: ok ? 'ok' : 'error', latencyMs: ms, error: ok ? undefined : msg });
      if (ok) toast.success(`CalSyncPro API dostępne (${ms}ms)`);
      else toast.error(`CalSyncPro API błąd: ${msg}`);
    } catch (e: any) {
      const ms = Date.now() - start;
      const msg = e?.name === 'TimeoutError' ? 'Timeout (>8s)' : (e?.message || 'Błąd połączenia');
      setCspTestResult({ ok: false, ms, msg });
      toast.error(`Test nieudany: ${msg}`);
    } finally {
      setCspTesting(false);
    }
  };

  const startEditUrl = (providerId: string, current: string) => {
    setEditingUrl(providerId);
    setEditUrlValue(current);
  };

  const saveCustomUrl = async (providerId: string) => {
    if (!activeTenantId) return;
    const trimmed = editUrlValue.trim();
    const provider = AVAILABLE_PROVIDERS.find(p => p.id === providerId);
    if (trimmed && trimmed !== (provider?.fixedApiUrl || '')) {
      await IntegrationService.setCustomUrl(activeTenantId, providerId, trimmed);
      setCustomUrls(prev => ({ ...prev, [providerId]: trimmed }));
    } else if (!trimmed || trimmed === (provider?.fixedApiUrl || '')) {
      await IntegrationService.resetCustomUrl(activeTenantId, providerId);
      setCustomUrls(prev => { const n = { ...prev }; delete n[providerId]; return n; });
    }
    setEditingUrl(null);
  };

  const resetCustomUrl = async (providerId: string) => {
    if (!activeTenantId) return;
    await IntegrationService.resetCustomUrl(activeTenantId, providerId);
    setCustomUrls(prev => { const n = { ...prev }; delete n[providerId]; return n; });
    if (editingUrl === providerId) setEditingUrl(null);
  };

  const getEffectiveUrl = (p: IntegrationProvider) => customUrls[p.id] || p.fixedApiUrl || '';

  const categories = [
    { id: 'all', name: 'Wszystkie', icon: Zap },
    { id: 'government', name: 'Administracja', icon: Shield },
    { id: 'banking', name: 'Bankowość', icon: Landmark },
    { id: 'payment', name: 'Płatności', icon: Globe },
    { id: 'accounting', name: 'Księgowość', icon: Settings },
    { id: 'ecommerce', name: 'E-commerce', icon: ShoppingBag },
    { id: 'system', name: 'Systemy', icon: Settings },
    { id: 'benefits', name: 'Świadczenia', icon: Zap },
    { id: 'other', name: 'Inne', icon: Zap },
  ];

  const getStatus = (id: string) => activeIntegrations.find(a => a.providerId === id)?.status ?? 'not_connected';

  const matchesFilters = (p: IntegrationProvider) =>
    (p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase())) &&
    (filterCategory === 'all' || p.category === filterCategory) &&
    (showHidden || !hiddenIds.includes(p.id));

  const visible = AVAILABLE_PROVIDERS.filter(matchesFilters);
  const automaticProviders = visible.filter(p => p.configurationType === 'automatic');
  const configurableProviders = visible.filter(p => p.configurationType !== 'automatic');
  const hiddenCount = hiddenIds.filter(id => AVAILABLE_PROVIDERS.some(p => p.id === id)).length;

  const connectedCount = activeIntegrations.filter(a => a.status === 'connected').length;
  const configurableTotal = AVAILABLE_PROVIDERS.filter(p => p.configurationType !== 'automatic' && !p.comingSoon).length;
  const notConfiguredCount = Math.max(0, configurableTotal - connectedCount);
  const recentErrors = apiLogs.filter(l => l.status === 'error' && l.timestamp?.toDate?.()?.getTime?.() > Date.now() - 86_400_000).length;

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Katalog Integracji</h2>
          <p className="text-sm text-gray-500 font-mono italic flex items-center gap-2">
            Centralny Hub Połączeń Zewnętrznych
            {loading && <Loader2 size={12} className="animate-spin" />}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hiddenCount > 0 && (
            <button onClick={() => setShowHidden(v => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${showHidden ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
              {showHidden ? <Eye size={14} /> : <EyeOff size={14} />}
              Ukryte ({hiddenCount})
            </button>
          )}
          <button onClick={loadIntegrations} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            <RefreshCw size={16} /> Odśwież
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0" />
          <div>
            <div className="text-xl font-black text-emerald-700">{connectedCount}</div>
            <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Połączone</div>
          </div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <Settings size={20} className="text-slate-400 flex-shrink-0" />
          <div>
            <div className="text-xl font-black text-slate-600">{notConfiguredCount}</div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Do skonfigurowania</div>
          </div>
        </div>
        <div className={`border rounded-xl px-4 py-3 flex items-center gap-3 ${recentErrors > 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
          <AlertCircle size={20} className={recentErrors > 0 ? 'text-rose-500 flex-shrink-0' : 'text-slate-300 flex-shrink-0'} />
          <div>
            <div className={`text-xl font-black ${recentErrors > 0 ? 'text-rose-600' : 'text-slate-400'}`}>{recentErrors}</div>
            <div className={`text-[10px] font-black uppercase tracking-widest ${recentErrors > 0 ? 'text-rose-500' : 'text-slate-400'}`}>Błędy (24h)</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-grow relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="Szukaj integracji..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:outline-none" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setFilterCategory(cat.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${filterCategory === cat.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
              <cat.icon size={14} /> {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Section: Automatic */}
      {automaticProviders.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Wifi size={14} className="text-emerald-500" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-500">Automatyczne — publiczne API bez klucza</span>
          </div>
          <div className="space-y-2">
            {automaticProviders.map(p => {
              const effectiveUrl = getEffectiveUrl(p);
              const isCustom = !!customUrls[p.id];
              const isEditing = editingUrl === p.id;
              return (
                <div key={p.id} className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${hiddenIds.includes(p.id) ? 'opacity-40 border-dashed border-slate-200 bg-slate-50' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0 mt-1.5" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-800">{p.name}</span>
                        <span className="text-xs text-slate-400">{p.description}</span>
                      </div>
                      {effectiveUrl && (
                        <UrlRow
                          providerId={p.id}
                          defaultUrl={p.fixedApiUrl || ''}
                          customUrls={customUrls}
                          isEditing={isEditing}
                          editValue={editUrlValue}
                          onStartEdit={() => startEditUrl(p.id, effectiveUrl)}
                          onEditChange={setEditUrlValue}
                          onSave={() => saveCustomUrl(p.id)}
                          onReset={() => resetCustomUrl(p.id)}
                          onCancel={() => setEditingUrl(null)}
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    {p.comingSoon
                      ? <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">Wkrótce</span>
                      : <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">Auto</span>
                    }
                    <button onClick={() => toggleHide(p.id)} title={hiddenIds.includes(p.id) ? 'Pokaż' : 'Ukryj'}
                      className="p-1.5 text-slate-300 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                      {hiddenIds.includes(p.id) ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section: Configurable cards */}
      {configurableProviders.length > 0 && (
        <div>
          {automaticProviders.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <Key size={14} className="text-slate-400" />
              <span className="text-xs font-black uppercase tracking-widest text-slate-500">Do skonfigurowania</span>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {configurableProviders.map(p => {
              const status = getStatus(p.id);
              const active = activeIntegrations.find(a => a.providerId === p.id);
              const isHidden = hiddenIds.includes(p.id);
              const effectiveUrl = getEffectiveUrl(p);
              const isEditing = editingUrl === p.id;
              const isConnected = status === 'connected';
              const borderAccent = isHidden ? 'border-l-slate-200' : isConnected ? 'border-l-emerald-500' : p.comingSoon ? 'border-l-amber-300' : 'border-l-indigo-400';
              return (
                <motion.div layout key={p.id}
                  className={`bg-white rounded-2xl shadow-sm relative transition-all overflow-hidden flex flex-col border border-l-4
                    ${isHidden ? 'opacity-40 border-dashed border-slate-200' : isConnected ? 'border-emerald-100 hover:shadow-md' : 'border-gray-200 hover:shadow-md'}
                    ${borderAccent}`}>

                  {/* Card body */}
                  <div className="p-4 flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg border flex-shrink-0 ${isConnected ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100'}`}>
                          <Plug size={16} className={isConnected ? 'text-emerald-600' : 'text-slate-500'} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-gray-900 text-sm leading-tight">{p.name}</h4>
                          <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">{p.authType.replace('_', ' ')}</span>
                        </div>
                      </div>
                      <button onClick={() => toggleHide(p.id)} title={isHidden ? 'Pokaż' : 'Ukryj'}
                        className="p-1 text-slate-200 hover:text-slate-500 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0 ml-1">
                        {isHidden ? <Eye size={13} /> : <EyeOff size={13} />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed mb-2">{p.description}</p>
                    {p.id === 'calsyncpro' ? (
                      (cspSavedConfig?.url || p.fixedApiUrl) ? (
                        <div className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cspSavedConfig?.url ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                          <span className="text-[10px] font-mono text-slate-400 truncate max-w-[200px]">{cspSavedConfig?.url || p.fixedApiUrl}</span>
                        </div>
                      ) : null
                    ) : effectiveUrl ? (
                      <UrlRow
                        providerId={p.id}
                        defaultUrl={p.fixedApiUrl || ''}
                        customUrls={customUrls}
                        isEditing={isEditing}
                        editValue={editUrlValue}
                        onStartEdit={() => startEditUrl(p.id, effectiveUrl)}
                        onEditChange={setEditUrlValue}
                        onSave={() => saveCustomUrl(p.id)}
                        onReset={() => resetCustomUrl(p.id)}
                        onCancel={() => setEditingUrl(null)}
                      />
                    ) : null}
                    {p.configNote && (
                      <p className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg mt-2 border border-indigo-100">{p.configNote}</p>
                    )}
                  </div>

                  {/* Action bar */}
                  <div className={`px-4 py-3 border-t flex items-center gap-2 ${isConnected ? 'bg-emerald-50/60 border-emerald-100' : 'bg-slate-50/60 border-gray-100'}`}>
                    {isConnected ? (
                      <>
                        <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 flex-1">Połączono</span>
                        <button onClick={() => openModal(p)}
                          className="text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-indigo-600 px-2 py-1 rounded-lg hover:bg-white transition-colors border border-transparent hover:border-indigo-200">
                          Edytuj
                        </button>
                        <button onClick={() => handleDisconnect(active.id, p.name)} disabled={disconnectingId === active.id}
                          className="p-1 text-slate-400 hover:text-red-500 disabled:opacity-40 rounded-lg hover:bg-red-50 transition-colors" title="Rozłącz">
                          {disconnectingId === active.id ? <Loader2 size={13} className="animate-spin" /> : <Link2Off size={13} />}
                        </button>
                      </>
                    ) : p.comingSoon ? (
                      <>
                        <Clock size={13} className="text-amber-500 flex-shrink-0" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 flex-1">Wkrótce dostępne</span>
                      </>
                    ) : (
                      <button onClick={() => openModal(p)}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-1.5 transition-colors">
                        <Settings size={12} /> Konfiguruj
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {visible.length === 0 && (
        <div className="text-center py-20 text-slate-400 text-sm">Brak wyników dla wybranych filtrów.</div>
      )}

      {/* API Activity Log */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <button onClick={() => setShowLogs(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
          <div className="flex items-center gap-2">
            <History size={15} className="text-slate-500" />
            <span className="text-sm font-black uppercase tracking-widest text-slate-700">Log aktywności API</span>
            {apiLogs.length > 0 && (
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">{apiLogs.length}</span>
            )}
            {recentErrors > 0 && (
              <span className="text-[10px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full font-bold">{recentErrors} błędów (24h)</span>
            )}
          </div>
          <ChevronRight size={15} className={`text-slate-400 transition-transform duration-200 ${showLogs ? 'rotate-90' : ''}`} />
        </button>
        {showLogs && (
          <div className="border-t border-slate-100">
            {apiLogs.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">Brak wpisów. Wykonaj akcję (połącz / rozłącz / testuj).</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="py-2 px-4 text-left text-[9px] font-black uppercase tracking-widest text-slate-400">Czas</th>
                      <th className="py-2 px-4 text-left text-[9px] font-black uppercase tracking-widest text-slate-400">Provider</th>
                      <th className="py-2 px-4 text-left text-[9px] font-black uppercase tracking-widest text-slate-400">Akcja</th>
                      <th className="py-2 px-4 text-left text-[9px] font-black uppercase tracking-widest text-slate-400">Status</th>
                      <th className="py-2 px-4 text-left text-[9px] font-black uppercase tracking-widest text-slate-400">Szczegóły</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {apiLogs.map((log, i) => (
                      <tr key={log.id ?? i} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-4 font-mono text-slate-400 whitespace-nowrap text-[10px]">
                          {log.timestamp?.toDate?.()?.toLocaleString('pl-PL') ?? '—'}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-700">{log.providerName}</td>
                        <td className="py-2.5 px-4"><ApiActionBadge action={log.action} /></td>
                        <td className="py-2.5 px-4">
                          {log.status === 'ok'
                            ? <span className="flex items-center gap-1 text-emerald-600 font-bold"><CheckCircle2 size={11} /> OK{log.latencyMs ? ` · ${log.latencyMs}ms` : ''}</span>
                            : <span className="flex items-center gap-1 text-rose-600 font-bold"><AlertCircle size={11} /> Błąd</span>
                          }
                        </td>
                        <td className="py-2.5 px-4 text-slate-400 font-mono max-w-[180px] truncate text-[10px]">
                          {log.error ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Config Modal */}
      <AnimatePresence>
        {showConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
                <h3 className="font-bold text-gray-900 flex items-center gap-2"><Zap size={18} className="text-indigo-600" /> {showConfigModal.name}</h3>
                <button onClick={() => setShowConfigModal(null)} className="text-gray-400 hover:text-gray-700 p-1">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>
              <div className="p-6 space-y-4">
                {showConfigModal.id === 'calsyncpro' ? (
                  <>
                    {/* Status bar */}
                    <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getStatus('calsyncpro') === 'connected' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <span className={`text-xs font-bold ${getStatus('calsyncpro') === 'connected' ? 'text-emerald-700' : 'text-slate-500'}`}>
                          {getStatus('calsyncpro') === 'connected' ? 'Połączono' : 'Nieskonfigurowano'}
                        </span>
                      </div>
                      {cspSavedConfig?.lastUpdated && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          Zapisano: {cspSavedConfig.lastUpdated.toLocaleString('pl-PL')}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-600">CSP API URL</label>
                      <input value={cspApiUrl} onChange={e => setCspApiUrl(e.target.value)} placeholder="https://api.calsyncpro.com/api/v1"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-600">API Key</label>
                      <input type="password" value={cspApiKey} onChange={e => setCspApiKey(e.target.value)} placeholder="Bearer token lub API Key z panelu CalSyncPro..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div className="space-y-2">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 pt-1">Microsoft</div>
                      {([
                        { label: 'Exchange / Outlook (on-prem)', sub: 'Exchange Server, Outlook desktop', val: cspExchange, set: setCspExchange },
                        { label: 'Outlook.com / Live / Hotmail', sub: 'Konta osobiste Microsoft', val: cspOutlookCom, set: setCspOutlookCom },
                        { label: 'Microsoft 365', sub: 'Exchange Online, Teams Calendar', val: cspM365, set: setCspM365 },
                      ]).map(item => (
                        <button key={item.label} onClick={() => item.set((v: boolean) => !v)}
                          className="flex items-center gap-3 w-full text-left px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
                          {item.val ? <ToggleRight size={20} className="text-indigo-600 flex-shrink-0" /> : <ToggleLeft size={20} className="text-slate-400 flex-shrink-0" />}
                          <div><div className="text-xs font-black uppercase tracking-widest text-slate-700">{item.label}</div><div className="text-[9px] text-slate-400">{item.sub}</div></div>
                        </button>
                      ))}
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 pt-1">Google</div>
                      {([
                        { label: 'Google Workspace', sub: 'Google Calendar Enterprise', val: cspGWorkspace, set: setCspGWorkspace },
                        { label: 'Gmail (konta osobiste)', sub: 'calendar.google.com', val: cspGmail, set: setCspGmail },
                      ]).map(item => (
                        <button key={item.label} onClick={() => item.set((v: boolean) => !v)}
                          className="flex items-center gap-3 w-full text-left px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
                          {item.val ? <ToggleRight size={20} className="text-indigo-600 flex-shrink-0" /> : <ToggleLeft size={20} className="text-slate-400 flex-shrink-0" />}
                          <div><div className="text-xs font-black uppercase tracking-widest text-slate-700">{item.label}</div><div className="text-[9px] text-slate-400">{item.sub}</div></div>
                        </button>
                      ))}
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 pt-1">CalDAV</div>
                      {([
                        { label: 'Apple Calendar (iCloud)', sub: 'caldav.icloud.com', val: cspApple, set: setCspApple },
                        { label: 'Fastmail', sub: 'caldav.fastmail.com', val: cspFastmail, set: setCspFastmail },
                        { label: 'Yahoo Calendar', sub: 'caldav.calendar.yahoo.com', val: cspYahoo, set: setCspYahoo },
                        { label: 'CalDAV (własny serwer)', sub: 'Nextcloud, Radicale, Baikal...', val: cspCalDAV, set: setCspCalDAV },
                      ]).map(item => (
                        <button key={item.label} onClick={() => item.set((v: boolean) => !v)}
                          className="flex items-center gap-3 w-full text-left px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
                          {item.val ? <ToggleRight size={20} className="text-indigo-600 flex-shrink-0" /> : <ToggleLeft size={20} className="text-slate-400 flex-shrink-0" />}
                          <div><div className="text-xs font-black uppercase tracking-widest text-slate-700">{item.label}</div><div className="text-[9px] text-slate-400">{item.sub}</div></div>
                        </button>
                      ))}
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 pt-1">Destynacje</div>
                      <button onClick={() => setCspKanban(v => !v)} className="flex items-center gap-3 w-full text-left px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
                        {cspKanban ? <ToggleRight size={20} className="text-emerald-600 flex-shrink-0" /> : <ToggleLeft size={20} className="text-slate-400 flex-shrink-0" />}
                        <div><div className="text-xs font-black uppercase tracking-widest text-slate-700">Twórz zadania Kanban</div><div className="text-[10px] text-slate-400">Zdarzenia kalendarza → karty Kanban</div></div>
                      </button>
                      <button onClick={() => setCspBooking(v => !v)} className="flex items-center gap-3 w-full text-left px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
                        {cspBooking ? <ToggleRight size={20} className="text-emerald-600 flex-shrink-0" /> : <ToggleLeft size={20} className="text-slate-400 flex-shrink-0" />}
                        <div><div className="text-xs font-black uppercase tracking-widest text-slate-700">Synchronizuj z Booking</div><div className="text-[10px] text-slate-400">Spotkania kalendarza → rezerwacje</div></div>
                      </button>
                    </div>
                    {(!cspApiUrl || !cspApiKey) && (
                      <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                        {!cspApiUrl ? 'Wymagany adres URL API' : 'Wymagany klucz API Key — bez niego zapis jest zablokowany'}
                      </p>
                    )}
                    <button onClick={handleCspSave} disabled={cspSaving || !cspApiUrl || !cspApiKey}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-colors">
                      <Link2 size={14} /> {cspSaving ? 'Zapisuję...' : 'Zapisz konfigurację CalSyncPro'}
                    </button>
                    {/* Test connection + logs */}
                    <div className="border-t border-slate-100 pt-3 space-y-2">
                      <button onClick={testCsp} disabled={cspTesting || !cspApiUrl}
                        className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-colors">
                        {cspTesting ? <Loader2 size={13} className="animate-spin" /> : <Wifi size={13} />}
                        {cspTesting ? 'Testowanie połączenia...' : 'Testuj połączenie'}
                      </button>
                      {(() => {
                        const t = cspTestResult ?? cspSavedConfig?.lastTest ?? null;
                        if (!t) return null;
                        return (
                          <div className={`flex items-center justify-between px-3 py-2 rounded-lg border text-[10px] font-mono ${t.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                            <span>{t.ok ? '✓' : '✗'} {t.msg}</span>
                            <span className="opacity-60">{t.ms}ms{t.at ? ` · ${new Date(t.at).toLocaleTimeString('pl-PL')}` : ''}</span>
                          </div>
                        );
                      })()}
                    </div>
                  </>
                ) : showConfigModal.id === 'ksef' ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {(['test', 'prod'] as const).map(env => (
                        <button key={env} onClick={() => setKsefEnv(env)}
                          className={`py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${ksefEnv === env ? (env === 'prod' ? 'bg-rose-600 text-white border-rose-600' : 'bg-emerald-600 text-white border-emerald-600') : 'bg-white text-slate-500 border-slate-200'}`}>
                          {env === 'test' ? 'Środowisko TEST' : 'Produkcja (PROD)'}
                        </button>
                      ))}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 bg-slate-50 rounded-lg px-3 py-2">{ksefEnv === 'prod' ? KSEF_PROD_URL : KSEF_TEST_URL}</div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-600">NIP firmy</label>
                      <input value={ksefNip} onChange={e => setKsefNip(e.target.value)} placeholder="1234567890"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-600">Token autoryzacyjny</label>
                      <input type="password" value={ksefToken} onChange={e => setKsefToken(e.target.value)} placeholder="Token z portalu KSeF MF..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <button onClick={() => setKsefSim(v => !v)} className="flex items-center gap-3 w-full text-left px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
                      {ksefSim ? <ToggleRight size={20} className="text-indigo-600 flex-shrink-0" /> : <ToggleLeft size={20} className="text-slate-400 flex-shrink-0" />}
                      <div>
                        <div className="text-xs font-black uppercase tracking-widest text-slate-700">Tryb symulacji</div>
                        <div className="text-[10px] text-slate-400">{ksefSim ? 'Faktury nie trafiają do KSeF' : 'Tryb produkcyjny — faktury trafiają do MF'}</div>
                      </div>
                    </button>
                    {ksefEnv === 'prod' && !ksefSim && (
                      <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl">
                        <AlertCircle size={14} className="text-rose-500 flex-shrink-0 mt-0.5" />
                        <p className="text-[10px] text-rose-700">Tryb produkcyjny bez symulacji — faktury będą wysyłane do KSeF MF.</p>
                      </div>
                    )}
                    <button onClick={handleKsefSave} disabled={ksefSaving || !ksefToken || !ksefNip}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2">
                      <Link2 size={14} /> {ksefSaving ? 'Zapisuję...' : 'Zapisz konfigurację KSeF'}
                    </button>
                  </>
                ) : showConfigModal.configurationType === 'oauth2' ? (
                  <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-800">
                    Autoryzacja OAuth2 dla <strong>{showConfigModal.name}</strong> — funkcja wkrótce dostępna. Skontaktuj się z administratorem systemu.
                  </div>
                ) : showConfigModal.configurationType === 'certificate' ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-xs text-amber-800 font-bold mb-1">Wymagany certyfikat</p>
                    <p className="text-[10px] text-amber-700">{showConfigModal.configNote || 'Skontaktuj się z dostawcą usługi w celu uzyskania certyfikatu (.p12 / .pfx).'}</p>
                  </div>
                ) : (
                  <>
                    {showConfigModal.configurationType === 'url_and_key' && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-600">Adres API (URL)</label>
                        {showConfigModal.fixedApiUrl ? (
                          <div className="text-[10px] font-mono text-slate-500 bg-slate-50 rounded-lg px-3 py-2">{showConfigModal.fixedApiUrl}</div>
                        ) : (
                          <input value={configApiUrl} onChange={e => setConfigApiUrl(e.target.value)} placeholder="https://api.provider.com"
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        )}
                        {showConfigModal.configNote && <p className="text-[10px] text-slate-400 mt-1">{showConfigModal.configNote}</p>}
                      </div>
                    )}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                        {showConfigModal.authType === 'api_key' ? 'API Key / Token' : 'Poświadczenie'}
                      </label>
                      {showConfigModal.configurationType === 'key_only' && showConfigModal.configNote && (
                        <p className="text-[10px] text-slate-400">{showConfigModal.configNote}</p>
                      )}
                      <div className="relative">
                        <input type="password" value={configValue} onChange={e => setConfigValue(e.target.value)} placeholder="Wklej tutaj klucz dostępu..."
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:outline-none font-mono" />
                        <Key className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                      </div>
                    </div>
                    <button onClick={handleConnect}
                      disabled={connecting || !configValue || (showConfigModal.configurationType === 'url_and_key' && !showConfigModal.fixedApiUrl && !configApiUrl)}
                      className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                      {connecting ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
                      {connecting ? 'Łączę...' : 'Połącz'}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UrlRow({ providerId, defaultUrl, customUrls, isEditing, editValue, onStartEdit, onEditChange, onSave, onReset, onCancel }: {
  providerId: string; defaultUrl: string; customUrls: Record<string, string>;
  isEditing: boolean; editValue: string;
  onStartEdit: () => void; onEditChange: (v: string) => void;
  onSave: () => void; onReset: () => void; onCancel: () => void;
}) {
  const isCustom = !!customUrls[providerId];
  const effectiveUrl = customUrls[providerId] || defaultUrl;
  if (!effectiveUrl && !isEditing) return null;
  if (isEditing) {
    return (
      <div className="flex items-center gap-1 mt-1">
        <input value={editValue} onChange={e => onEditChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel(); }}
          className="text-[10px] font-mono border border-slate-300 rounded-lg px-2 py-1 w-56 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white" />
        <button onClick={onSave} title="Zapisz" className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Check size={12} /></button>
        {isCustom && <button onClick={onReset} title="Przywróć domyślny" className="p-1 text-amber-500 hover:bg-amber-50 rounded"><RotateCcw size={12} /></button>}
        <button onClick={onCancel} title="Anuluj" className="p-1 text-slate-400 hover:bg-slate-100 rounded"><X size={12} /></button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 mt-1 group">
      <a href={effectiveUrl} target="_blank" rel="noreferrer"
        className={`text-[10px] font-mono truncate max-w-[220px] hover:underline transition-colors ${isCustom ? 'text-amber-600' : 'text-slate-400'}`}>
        {effectiveUrl}
      </a>
      {isCustom && (
        <button onClick={onReset} title="Przywróć domyślny URL" className="p-0.5 text-amber-400 hover:text-amber-600 rounded hover:bg-amber-50 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <RotateCcw size={10} />
        </button>
      )}
      <button onClick={onStartEdit} title="Edytuj URL" className="p-0.5 text-slate-300 hover:text-slate-500 rounded hover:bg-slate-100 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Pencil size={10} />
      </button>
    </div>
  );
}

function ApiActionBadge({ action }: { action: ApiLogEntry['action'] }) {
  const map: Record<ApiLogEntry['action'], { label: string; cls: string }> = {
    connect:    { label: 'Połączono',     cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    disconnect: { label: 'Rozłączono',   cls: 'bg-slate-100 text-slate-600 border-slate-200' },
    test:       { label: 'Test',          cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    save:       { label: 'Konfiguracja', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  };
  const { label, cls } = map[action] ?? map.connect;
  return <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${cls}`}>{label}</span>;
}

function ConfigBadge({ type }: { type: ConfigurationType }) {
  const map: Record<ConfigurationType, { label: string; cls: string }> = {
    automatic:  { label: 'Auto',       cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    key_only:   { label: 'API Key',    cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    url_and_key:{ label: 'URL + Key',  cls: 'bg-violet-50 text-violet-700 border-violet-200' },
    oauth2:     { label: 'OAuth2',     cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    certificate:{ label: 'Certyfikat', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
    dedicated:  { label: 'Dedykowane', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  };
  const { label, cls } = map[type] ?? map.key_only;
  return <div className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${cls}`}>{label}</div>;
}
