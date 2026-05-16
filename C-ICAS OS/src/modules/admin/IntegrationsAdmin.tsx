/**
 * IntegrationsAdminModule.tsx
 * UI Zarządzania Integracjami Zewnętrznymi.
 */
import React, { useState, useEffect } from 'react';
import {
  Zap, Shield, Globe, Landmark, ShoppingBag,
  Settings, ChevronRight, CheckCircle2, AlertCircle,
  Link2, Link2Off, Loader2, Search, Filter,
  ExternalLink, Key, RefreshCw, ToggleLeft, ToggleRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { IntegrationService, AVAILABLE_PROVIDERS, IntegrationProvider } from './services/IntegrationService';
import { useAuth } from '../../shared/hooks/AuthContext';
import { db } from '../../shared/lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

const KSEF_TEST_URL  = 'https://ksef-test.mf.gov.pl/api';
const KSEF_PROD_URL  = 'https://ksef.mf.gov.pl/api';

export default function IntegrationsAdminModule() {
  const { activeTenantId } = useAuth();
  const [activeIntegrations, setActiveIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string | 'all'>('all');
  const [showConfigModal, setShowConfigModal] = useState<IntegrationProvider | null>(null);
  const [configValue, setConfigValue] = useState('');

  // KSeF-specific state
  const [ksefToken, setKsefToken] = useState('');
  const [ksefNip, setKsefNip] = useState('');
  const [ksefEnv, setKsefEnv] = useState<'test' | 'prod'>('test');
  const [ksefSim, setKsefSim] = useState(true);
  const [ksefSaving, setKsefSaving] = useState(false);

  useEffect(() => {
    if (activeTenantId) {
      loadIntegrations();
    }
  }, [activeTenantId]);

  const loadIntegrations = async () => {
    setLoading(true);
    try {
      if (activeTenantId) {
        const data = await IntegrationService.getTenantIntegrations(activeTenantId);
        setActiveIntegrations(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!showConfigModal || !activeTenantId) return;
    
    try {
      await IntegrationService.connectIntegration(
        activeTenantId,
        showConfigModal.id,
        showConfigModal.name,
        showConfigModal.category,
        { apiKey: configValue }
      );
      setShowConfigModal(null);
      setConfigValue('');
      loadIntegrations();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDisconnect = async (id: string) => {
    if (!confirm('Czy na pewno chcesz rozłączyć tę integrację?')) return;
    try {
      await IntegrationService.disconnectIntegration(id);
      loadIntegrations();
    } catch (err) {
      console.error(err);
    }
  };

  const openModal = async (p: IntegrationProvider) => {
    setShowConfigModal(p);
    if (p.id === 'ksef' && activeTenantId) {
      const snap = await getDoc(doc(db, 'tenants', activeTenantId, 'integrations', 'ksef'));
      if (snap.exists()) {
        const d = snap.data();
        setKsefToken(d.token || '');
        setKsefNip(d.nip || '');
        setKsefEnv(d.env || 'test');
        setKsefSim(d.simulationMode ?? true);
      }
    }
  };

  const handleKsefSave = async () => {
    if (!activeTenantId || !ksefToken || !ksefNip) return;
    setKsefSaving(true);
    await setDoc(doc(db, 'tenants', activeTenantId, 'integrations', 'ksef'), {
      token: ksefToken,
      nip: ksefNip,
      env: ksefEnv,
      apiUrl: ksefEnv === 'prod' ? KSEF_PROD_URL : KSEF_TEST_URL,
      simulationMode: ksefSim,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    await IntegrationService.connectIntegration(activeTenantId, 'ksef', 'KSeF MF', 'government', { token: ksefToken });
    setKsefSaving(false);
    setShowConfigModal(null);
    loadIntegrations();
  };

  const categories = [
    { id: 'all', name: 'Wszystkie', icon: Zap },
    { id: 'government', name: 'Administracja', icon: Shield },
    { id: 'banking', name: 'Bankowość', icon: Landmark },
    { id: 'payment', name: 'Płatności', icon: Globe },
    { id: 'accounting', name: 'Księgowość', icon: Settings },
    { id: 'ecommerce', name: 'E-commerce', icon: ShoppingBag }
  ];

  const filteredProviders = AVAILABLE_PROVIDERS.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === 'all' || p.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const getStatus = (providerId: string) => {
    const active = activeIntegrations.find(a => a.providerId === providerId);
    return active ? active.status : 'not_connected';
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 font-sans tracking-tight">Katalog Integracji</h2>
          <p className="text-sm text-gray-500 font-mono italic">Centralny Hub Połączeń Zewnętrznych (INT-01 do INT-36)</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
          <RefreshCw size={16} />
          Synchronizuj Wszystkie
        </button>
      </div>

      {/* Navigation & Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-grow relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text"
            placeholder="Szukaj integracji (np. KSeF, Stripe, Tink...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                filterCategory === cat.id 
                  ? 'bg-indigo-600 text-white shadow-lg' 
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <cat.icon size={14} />
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProviders.map((p) => {
          const status = getStatus(p.id);
          const active = activeIntegrations.find(a => a.providerId === p.id);

          return (
            <motion.div 
              layout
              key={p.id}
              className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all ${
                status === 'connected' ? 'border-emerald-200 bg-emerald-50/10' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-2 bg-gray-50 rounded-xl border border-gray-100">
                  <Globe size={24} className="text-indigo-600" />
                </div>
                {status === 'connected' ? (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                    <CheckCircle2 size={12} />
                    Połączono
                  </div>
                ) : (
                  <div className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">
                    Gotowe do startu
                  </div>
                )}
              </div>

              <h4 className="font-bold text-gray-900 mb-1">{p.name}</h4>
              <p className="text-xs text-gray-500 mb-6 min-h-[32px]">{p.description}</p>

              <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono uppercase tracking-widest">
                  <Key size={12} />
                  {p.authType.replace('_', ' ')}
                </div>
                {status === 'connected' ? (
                  <button 
                    onClick={() => handleDisconnect(active.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Rozłącz"
                  >
                    <Link2Off size={18} />
                  </button>
                ) : (
                  <button
                    onClick={() => openModal(p)}
                    className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    Konfiguruj
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
        </div>
      )}

      {/* Config Modal */}
      <AnimatePresence>
        {showConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg font-bold">
                    <Zap size={20} />
                  </div>
                  <h3 className="font-bold text-gray-900">Konfiguracja: {showConfigModal.name}</h3>
                </div>
                <button onClick={() => setShowConfigModal(null)} className="text-gray-400 hover:text-gray-600">
                  <X />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {showConfigModal.id === 'ksef' ? (
                  /* ── KSeF dedicated UI ── */
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {(['test', 'prod'] as const).map(env => (
                        <button key={env} onClick={() => setKsefEnv(env)}
                          className={`py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${ksefEnv === env ? (env === 'prod' ? 'bg-rose-600 text-white border-rose-600' : 'bg-emerald-600 text-white border-emerald-600') : 'bg-white text-slate-500 border-slate-200'}`}>
                          {env === 'test' ? 'Środowisko TEST' : 'Produkcja (PROD)'}
                        </button>
                      ))}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
                      {ksefEnv === 'prod' ? KSEF_PROD_URL : KSEF_TEST_URL}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-600">NIP firmy</label>
                      <input value={ksefNip} onChange={e => setKsefNip(e.target.value)} placeholder="1234567890"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-600">Token autoryzacyjny</label>
                      <input type="password" value={ksefToken} onChange={e => setKsefToken(e.target.value)}
                        placeholder="Token z portalu KSeF MF..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <button onClick={() => setKsefSim(v => !v)}
                      className="flex items-center gap-3 w-full text-left px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
                      {ksefSim
                        ? <ToggleRight size={20} className="text-indigo-600 flex-shrink-0" />
                        : <ToggleLeft size={20} className="text-slate-400 flex-shrink-0" />}
                      <div>
                        <div className="text-xs font-black uppercase tracking-widest text-slate-700">Tryb symulacji</div>
                        <div className="text-[10px] text-slate-400">{ksefSim ? 'Faktury nie trafiają do KSeF (bezpieczne testy)' : 'Tryb produkcyjny — faktury trafiają do systemu MF'}</div>
                      </div>
                    </button>
                    {ksefEnv === 'prod' && !ksefSim && (
                      <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl">
                        <AlertCircle size={14} className="text-rose-500 flex-shrink-0 mt-0.5" />
                        <p className="text-[10px] text-rose-700">Tryb produkcyjny bez symulacji — faktury będą wysyłane do KSeF Ministerstwa Finansów.</p>
                      </div>
                    )}
                    <button onClick={handleKsefSave} disabled={ksefSaving || !ksefToken || !ksefNip}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2">
                      <Link2 size={14} /> {ksefSaving ? 'Zapisuję...' : 'Zapisz konfigurację KSeF'}
                    </button>
                  </>
                ) : (
                  /* ── Generic UI ── */
                  <>
                    <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-3">
                      <AlertCircle className="text-indigo-600 mt-1" size={20} />
                      <div className="text-xs text-indigo-900 leading-relaxed">
                        Używasz bezpiecznego tunelu API. Twój klucz zostanie zaszyfrowany i przechowywany zgodnie ze standardem SOC2.
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        {showConfigModal.authType === 'api_key' ? 'API Key / Token' : 'Poświadczenie'}
                      </label>
                      <div className="relative">
                        <input type="password" value={configValue} onChange={(e) => setConfigValue(e.target.value)}
                          placeholder="Wklej tutaj klucz dostępu..."
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:outline-none font-mono" />
                        <Key className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                      </div>
                    </div>
                    <button onClick={handleConnect} disabled={!configValue}
                      className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                      <Link2 size={18} /> Połącz usługę
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

function X() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12"/>
    </svg>
  );
}
