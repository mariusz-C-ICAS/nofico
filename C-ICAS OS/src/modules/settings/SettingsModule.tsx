/**
 * Data: 2026-05-19
 * Sciezka: /src/modules/settings/SettingsModule.tsx
 * Zmiana: tab-state → React Router subroutes (spójność z /admin)
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Building2, Users, Shield, Bell, Plug, Palette, Database, CreditCard,
  Sun, Moon, Monitor, Mail, Zap, MessageSquare, CheckCircle2, Upload,
  Globe, Lock, Clock, Server, Languages, User, Key,
  ChevronRight, Download, AlertTriangle, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { lazy, Suspense, useEffect, useState as useStateReact } from 'react';
import { Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom';
import { requestPushPermission, getPushPermissionState } from '../../shared/services/fcmService';
import { useAuth } from '../../shared/hooks/AuthContext';
import { useTheme } from '../../app/providers/ThemeProvider';
import { db } from '../../shared/lib/firebase';
import { doc, getDoc, collection, getDocs, query, where, addDoc, deleteDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useTenant } from '../../core/auth/TenantContext';

const MultimailSettings = lazy(() => import('./components/MultimailSettings'));
const MembersSection = lazy(() => import('./components/MembersSection'));
const RoleViewsSection = lazy(() => import('./components/RoleViewsSection'));
const KontoSection = lazy(() => import('./components/KontoSection'));
const OrganizacjaSection = lazy(() => import('./components/OrganizacjaSection'));

const NAV_ITEMS = [
  { path: 'account',       labelKey: 'settings.tabs.account',       icon: User      },
  { path: 'org',           labelKey: 'settings.tabs.organization',   icon: Building2 },
  { path: 'users',         labelKey: 'settings.tabs.users',          icon: Users     },
  { path: 'role-views',    labelKey: 'settings.tabs.roleViews',      icon: Shield    },
  { path: 'security',      labelKey: 'settings.tabs.security',       icon: Shield    },
  { path: 'notifications', labelKey: 'settings.tabs.notifications',  icon: Bell      },
  { path: 'mail',          labelKey: 'settings.tabs.multimail',      icon: Mail      },
  { path: 'integrations',  labelKey: 'settings.tabs.integrations',   icon: Plug      },
  { path: 'theme',         labelKey: 'settings.tabs.appearance',     icon: Palette   },
  { path: 'data',          labelKey: 'settings.tabs.data',           icon: Database  },
  { path: 'license',       labelKey: 'settings.tabs.license',        icon: CreditCard},
] as const;

export default function SettingsModule() {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-12">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl border border-slate-800 mb-10">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4" />
          <div className="relative z-10">
            <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3">{t('settings.systemConfig')}</div>
            <h1 className="text-4xl font-black uppercase tracking-tighter italic">{t('settings.title')}</h1>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">

          {/* Sidebar */}
          <aside className="lg:w-72 space-y-2 shrink-0">
            {NAV_ITEMS.map(item => (
              <NavLink
                key={item.path}
                to={`/settings/${item.path}`}
                className={({ isActive }) =>
                  `w-full flex items-center justify-between px-7 py-5 rounded-[2rem] transition-all font-black text-xs uppercase tracking-widest ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100'
                      : 'bg-white text-slate-400 border border-slate-100 hover:text-indigo-600 hover:border-indigo-100'
                  }`
                }
              >
                <span className="flex items-center gap-4">
                  <item.icon size={16} />
                  {t(item.labelKey)}
                </span>
                <ChevronRight size={14} className="opacity-30" />
              </NavLink>
            ))}
          </aside>

          {/* Main panel */}
          <main className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.22 }}
              >
                <Routes>
                  <Route index element={<Navigate to="/settings/org" replace />} />
                  <Route path="account"       element={<Suspense fallback={<Loader />}><KontoSection /></Suspense>} />
                  <Route path="org"           element={<Suspense fallback={<Loader />}><OrganizacjaSection /></Suspense>} />
                  <Route path="users"         element={<Suspense fallback={<Loader />}><MembersSection /></Suspense>} />
                  <Route path="role-views"    element={<Suspense fallback={<Loader />}><RoleViewsSection /></Suspense>} />
                  <Route path="security"      element={<BezpieczenstwoSection />} />
                  <Route path="notifications" element={<PowiadomieniaSection />} />
                  <Route path="integrations"  element={<IntegracjeSection />} />
                  <Route path="theme"         element={<WyglądSection />} />
                  <Route path="data"          element={<DaneSection />} />
                  <Route path="license"       element={<LicencjaSection />} />
                  <Route path="mail"          element={<Suspense fallback={<Loader />}><MultimailSettings /></Suspense>} />
                </Routes>
              </motion.div>
            </AnimatePresence>
          </main>

        </div>
      </div>
    </div>
  );
}

function Loader() {
  const { t } = useTranslation();
  return <div className="h-48 flex items-center justify-center text-slate-400 text-sm font-bold">{t('settings.loading')}</div>;
}

/* ── Section: Bezpieczenstwo ── */
function BezpieczenstwoSection() {
  const { t } = useTranslation();
  const [mfa, setMfa] = useState(true);
  const [ipAllow, setIpAllow] = useState(false);

  return (
    <div className="space-y-6">
      <SectionCard title={t('settings.security.title')} icon={Shield}>
        <div className="space-y-5">
          <ToggleRow
            label={t('settings.security.mfaLabel')}
            desc={t('settings.security.mfaDesc')}
            active={mfa}
            onToggle={() => setMfa(!mfa)}
            color="indigo"
          />
          <ToggleRow
            label={t('settings.security.ipAllowlistLabel')}
            desc={t('settings.security.ipAllowlistDesc')}
            active={ipAllow}
            onToggle={() => setIpAllow(!ipAllow)}
            color="indigo"
          />

          <div className="pt-4 border-t border-slate-50">
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Clock size={12} /> {t('settings.security.sessionTimeout')}
            </label>
            <input type="number" defaultValue={60} className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-black text-slate-900 focus:outline-none focus:border-indigo-400 w-40" />
          </div>

          <div className="pt-4 border-t border-slate-50">
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Lock size={12} /> {t('settings.security.passwordLength')}
            </label>
            <div className="flex gap-3">
              {[8, 10, 12, 16].map(n => (
                <button key={n} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${n === 12 ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-indigo-300'}`}>{n}</button>
              ))}
            </div>
          </div>

          {ipAllow && (
            <div className="pt-4 border-t border-slate-50">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Globe size={12} /> {t('settings.security.allowedIPs')}
              </label>
              <textarea
                rows={4}
                defaultValue="89.64.12.1&#10;195.117.0.0/24"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-mono font-bold text-slate-700 focus:outline-none focus:border-indigo-400 resize-none"
              />
            </div>
          )}
        </div>
        <SaveButton />
      </SectionCard>
    </div>
  );
}

/* ── Section: Powiadomienia ── */
function PowiadomieniaSection() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const activeTenantId = currentTenant?.id ?? null;
  const [pushState, setPushState] = useStateReact<NotificationPermission>('default');
  const [pushLoading, setPushLoading] = useStateReact(false);
  const [pushError, setPushError] = useStateReact('');

  useStateReact; // satisfy lint — already used above via alias
  useEffect(() => {
    getPushPermissionState().then(setPushState);
  }, []);

  const activatePush = async () => {
    if (!user) { setPushError('Nie jesteś zalogowany.'); return; }
    setPushLoading(true); setPushError('');
    try {
      const token = await requestPushPermission(user.uid, activeTenantId ?? 'unknown');
      setPushState(token ? 'granted' : 'denied');
    } catch (e: any) {
      setPushError(e.message ?? 'Nieznany błąd aktywacji powiadomień.');
      getPushPermissionState().then(setPushState);
    } finally {
      setPushLoading(false);
    }
  };

  type NotifKey = 'email' | 'push' | 'sms';
  const events = [
    { id: 'new_invoice', label: t('settings.notifications.events.new_invoice'), desc: t('settings.notifications.events.new_invoice_desc') },
    { id: 'payment_overdue', label: t('settings.notifications.events.payment_overdue'), desc: t('settings.notifications.events.payment_overdue_desc') },
    { id: 'new_user', label: t('settings.notifications.events.new_user'), desc: t('settings.notifications.events.new_user_desc') },
    { id: 'system_alert', label: t('settings.notifications.events.system_alert'), desc: t('settings.notifications.events.system_alert_desc') },
    { id: 'report_ready', label: t('settings.notifications.events.report_ready'), desc: t('settings.notifications.events.report_ready_desc') },
  ];

  const [prefs, setPrefs] = useState<Record<string, Record<NotifKey, boolean>>>({
    new_invoice: { email: true, push: false, sms: false },
    payment_overdue: { email: true, push: true, sms: true },
    new_user: { email: true, push: false, sms: false },
    system_alert: { email: true, push: true, sms: false },
    report_ready: { email: true, push: false, sms: false },
  });

  const toggle = (eventId: string, channel: NotifKey) => {
    setPrefs(prev => ({
      ...prev,
      [eventId]: { ...prev[eventId], [channel]: !prev[eventId][channel] }
    }));
  };

  return (
    <div className="space-y-6">
      {/* FCM Push permission banner */}
      <div className={`rounded-2xl border p-4 flex items-center gap-4 ${pushState === 'granted' ? 'bg-emerald-50 border-emerald-200' : pushState === 'denied' ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'}`}>
        <Zap size={18} className={pushState === 'granted' ? 'text-emerald-500' : pushState === 'denied' ? 'text-rose-500' : 'text-amber-500'} />
        <div className="flex-1">
          <p className="text-xs font-black uppercase tracking-widest text-slate-700">{t('settings.notifications.pushTitle')}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {pushState === 'granted' ? t('settings.notifications.pushActive') : pushState === 'denied' ? t('settings.notifications.pushDenied') : t('settings.notifications.pushInactive')}
          </p>
        </div>
        {pushState === 'default' && (
          <button onClick={activatePush} disabled={pushLoading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shrink-0">
            {pushLoading ? t('settings.notifications.activating') : t('settings.notifications.activatePush')}
          </button>
        )}
        {pushState === 'denied' && (
          <button onClick={() => window.open('chrome://settings/content/notifications', '_blank') || alert('Otwórz: Ustawienia przeglądarki → Prywatność → Powiadomienia → odblokuj tę stronę')}
            className="px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shrink-0">
            {t('settings.notifications.unblockInSettings')}
          </button>
        )}
        {pushState === 'granted' && (
          <button onClick={activatePush} disabled={pushLoading}
            className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shrink-0">
            {pushLoading ? t('settings.notifications.renewing') : t('settings.notifications.renewToken')}
          </button>
        )}
      </div>
      {pushError && (
        <div className="flex items-center gap-2 px-4 py-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-[10px] font-bold">
          <AlertTriangle size={14} className="shrink-0" /> {pushError}
        </div>
      )}
      <SectionCard title={t('settings.notifications.title')} icon={Bell}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-[9px] text-slate-400 uppercase tracking-widest text-left py-3 pr-8 font-black">{t('settings.notifications.event')}</th>
                {(['email', 'push', 'sms'] as NotifKey[]).map(ch => (
                  <th key={ch} className="text-[9px] text-slate-400 uppercase tracking-widest text-center py-3 px-6 font-black">
                    {ch === 'email' ? <Mail size={14} className="mx-auto" /> : ch === 'push' ? <Zap size={14} className="mx-auto" /> : <MessageSquare size={14} className="mx-auto" />}
                    <div className="mt-1">{ch.toUpperCase()}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {events.map(ev => (
                <tr key={ev.id} className="hover:bg-slate-50">
                  <td className="py-4 pr-8">
                    <div className="font-black text-slate-900 text-[11px]">{ev.label}</div>
                    <div className="text-[9px] text-slate-400 font-bold">{ev.desc}</div>
                  </td>
                  {(['email', 'push', 'sms'] as NotifKey[]).map(ch => (
                    <td key={ch} className="py-4 px-6 text-center">
                      <button
                        onClick={() => toggle(ev.id, ch)}
                        className={`w-8 h-8 rounded-xl border transition-all mx-auto flex items-center justify-center ${
                          prefs[ev.id][ch]
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'bg-slate-50 border-slate-200 text-slate-300'
                        }`}
                      >
                        <CheckCircle2 size={14} />
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <SaveButton />
      </SectionCard>
    </div>
  );
}

/* ── Section: Integracje & API ── */
function IntegracjeSection() {
  const { t } = useTranslation();
  const [tab, setTab] = useStateReact<'uslugi' | 'api' | 'webhooki'>('uslugi');
  const { activeTenantId } = useAuth();
  const [apiKeys, setApiKeys] = useStateReact<{ id: string; name: string; key: string; createdAt: string }[]>([]);
  const [newKeyName, setNewKeyName] = useStateReact('');

  useEffect(() => {
    if (!activeTenantId) return;
    getDocs(collection(db, 'tenants', activeTenantId, 'apiKeys')).then(snap => {
      setApiKeys(snap.docs.map(d => ({
        id: d.id,
        name: d.data().name ?? '',
        key: d.data().key ?? '',
        createdAt: d.data().createdAt ?? '',
      })));
    });
  }, [activeTenantId]);

  const generateKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return 'cicas_' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => chars[b % chars.length]).join('');
  };

  const addApiKey = async () => {
    if (!newKeyName.trim() || !activeTenantId) return;
    const newKey = { name: newKeyName.trim(), key: generateKey(), createdAt: new Date().toLocaleDateString('pl-PL') };
    const ref = await addDoc(collection(db, 'tenants', activeTenantId, 'apiKeys'), newKey);
    setApiKeys(prev => [...prev, { id: ref.id, ...newKey }]);
    setNewKeyName('');
  };

  const removeApiKey = async (k: { id: string }) => {
    if (!activeTenantId) return;
    await deleteDoc(doc(db, 'tenants', activeTenantId, 'apiKeys', k.id));
    setApiKeys(prev => prev.filter(x => x.id !== k.id));
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 bg-white rounded-2xl border border-slate-100 p-2 shadow-sm">
        {([
          { id: 'uslugi', label: t('settings.integrations.tabServices'), icon: Plug },
          { id: 'api', label: t('settings.integrations.tabApi'), icon: Key },
          { id: 'webhooki', label: t('settings.integrations.tabWebhooks'), icon: Globe },
        ] as const).map(tab2 => (
          <button
            key={tab2.id}
            onClick={() => setTab(tab2.id)}
            className={`flex items-center gap-2 flex-1 justify-center py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === tab2.id ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-indigo-600'}`}
          >
            <tab2.icon size={12} /> {tab2.label}
          </button>
        ))}
      </div>

      {tab === 'uslugi' && (
        <SectionCard title={t('settings.integrations.tabServices')} icon={Plug}>
          <div className="flex flex-col items-center justify-center py-14 gap-6 text-center">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center">
              <Plug size={28} className="text-indigo-500" />
            </div>
            <div>
              <p className="font-black text-slate-800 text-lg mb-2">Zarządzaj integracjami w Panelu Admina</p>
              <p className="text-sm text-slate-500 max-w-md leading-relaxed">
                Konfiguracja wszystkich połączeń zewnętrznych (KSeF, Stripe, GUS REGON, CalSyncPro i pozostałe 18 integracji) jest dostępna w Katalogu Integracji z pełną klasyfikacją i opcją ukrywania.
              </p>
            </div>
            <a
              href="/admin/integrations"
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest px-8 py-4 rounded-2xl shadow-lg transition-all"
            >
              <ExternalLink size={14} /> Otwórz Katalog Integracji
            </a>
          </div>
        </SectionCard>
      )}

      {tab === 'api' && (
        <SectionCard title={t('settings.integrations.apiTitle')} icon={Key}>
          <div className="space-y-4">
            <div className="text-[9px] text-slate-500 font-bold">{t('settings.integrations.apiDesc')}</div>
            <div className="flex gap-2">
              <input
                value={newKeyName}
                onChange={e => setNewKeyName(e.target.value)}
                placeholder={t('settings.integrations.apiKeyPlaceholder')}
                onKeyDown={e => e.key === 'Enter' && addApiKey()}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-black text-slate-900 focus:outline-none focus:border-indigo-400"
              />
              <button onClick={addApiKey} className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all">
                {t('settings.integrations.generate')}
              </button>
            </div>
            {apiKeys.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs font-bold">{t('settings.integrations.noApiKeys')}</div>
            ) : (
              <div className="space-y-3">
                {apiKeys.map(k => (
                  <div key={k.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm text-slate-900">{k.name}</span>
                      <span className="text-[9px] text-slate-400 font-bold">{k.createdAt}</span>
                    </div>
                    <code className="block text-[10px] font-mono text-slate-600 bg-slate-100 px-3 py-2 rounded-xl break-all">{k.key}</code>
                    <button onClick={() => removeApiKey(k)} className="text-[9px] text-red-500 font-black hover:text-red-700">{t('settings.integrations.deleteKey')}</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {tab === 'webhooki' && (
        <SectionCard title={t('settings.integrations.webhooksTitle')} icon={Globe}>
          <div className="space-y-4">
            <div className="text-[9px] text-slate-500 font-bold">{t('settings.integrations.webhooksDesc')}</div>
            <div className="py-12 text-center">
              <Globe size={32} className="mx-auto text-slate-200 mb-3" />
              <div className="text-slate-400 text-sm font-bold">{t('settings.integrations.webhooksComing')}</div>
              <div className="text-[9px] text-slate-400 font-bold mt-1">{t('settings.integrations.webhooksEvents')}</div>
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

/* ── Section: Wyglad ── */
function WyglądSection() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme, fontSize, setFontSize, radius, setRadius, density, setDensity, preset, setPreset } = useTheme();
  const { userData, updateUserSettings } = useAuth();
  const [lang, setLangState] = useStateReact(userData?.language ?? 'pl');
  const [dateFormat, setDateFormatState] = useStateReact((userData as any)?.dateFormat ?? 'DD.MM.YYYY');
  const [saving, setSaving] = useStateReact(false);
  const [success, setSuccess] = useStateReact('');

  const THEME_REVERSE: Record<string, string> = { light: 'jasny', dark: 'ciemny', auto: 'system' };
  const currentThemeKey = THEME_REVERSE[theme] ?? 'system';

  const PRESETS_UI = [
    { id: 'corporate', label: 'Corporate', desc: 'Biznesowy, czysty' },
    { id: 'minimal', label: 'Minimal', desc: 'Zero ozdobników' },
    { id: 'dark-pro', label: 'Dark Pro', desc: 'Dla power userów' },
    { id: 'vibrant', label: 'Vibrant', desc: 'Energetyczny' },
  ];

  const handleSave = async () => {
    setSaving(true); setSuccess('');
    try {
      await updateUserSettings({ language: lang, dateFormat } as any);
      i18n.changeLanguage(lang);
      setSuccess(t('settings.appearance.saved'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard title={t('settings.appearance.title')} icon={Palette}>
        <div className="space-y-8">

          {/* Preset packs */}
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Preset motywu</label>
            <div className="grid grid-cols-2 gap-3 max-w-sm">
              {PRESETS_UI.map(p => (
                <button
                  key={p.id}
                  onClick={() => setPreset(p.id)}
                  className={`flex flex-col gap-1 px-4 py-3 rounded-2xl border text-left transition-all ${
                    preset === p.id ? 'bg-slate-900 text-white border-slate-900 shadow-xl' : 'bg-slate-50 border-slate-100 hover:border-indigo-200'
                  }`}
                >
                  <span className={`text-[10px] font-black uppercase tracking-widest ${preset === p.id ? 'text-white' : 'text-slate-700'}`}>{p.label}</span>
                  <span className={`text-[9px] ${preset === p.id ? 'text-slate-300' : 'text-slate-400'}`}>{p.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div className="border-t border-slate-50 pt-6">
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">{t('settings.appearance.theme')}</label>
            <div className="grid grid-cols-3 gap-3 max-w-xs">
              {[
                { id: 'jasny', themeVal: 'light' as const, icon: Sun, label: t('settings.appearance.themeLight') },
                { id: 'ciemny', themeVal: 'dark' as const, icon: Moon, label: t('settings.appearance.themeDark') },
                { id: 'system', themeVal: 'auto' as const, icon: Monitor, label: t('settings.appearance.themeSystem') },
              ].map(themeItem => (
                <button
                  key={themeItem.id}
                  onClick={() => setTheme(themeItem.themeVal)}
                  className={`flex flex-col items-center gap-2 py-4 rounded-2xl border font-black text-[9px] uppercase tracking-widest transition-all ${
                    currentThemeKey === themeItem.id ? 'bg-slate-900 text-white border-slate-900 shadow-xl' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-indigo-200'
                  }`}
                >
                  <themeItem.icon size={18} />
                  {themeItem.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font size */}
          <div className="border-t border-slate-50 pt-6">
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">
              Rozmiar czcionki — <span className="text-indigo-600">{fontSize}px</span>
            </label>
            <div className="flex items-center gap-4 max-w-xs">
              <span className="text-[10px] text-slate-400 w-6">12</span>
              <input
                type="range"
                min={12}
                max={20}
                step={1}
                value={fontSize}
                onChange={e => setFontSize(Number(e.target.value))}
                className="flex-1 accent-indigo-600"
              />
              <span className="text-[10px] text-slate-400 w-6 text-right">20</span>
            </div>
            <div className="flex gap-2 mt-3 flex-wrap">
              {[12, 13, 14, 16, 18, 20].map(s => (
                <button
                  key={s}
                  onClick={() => setFontSize(s)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black border transition-all ${
                    fontSize === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-indigo-200'
                  }`}
                >
                  {s === 12 ? 'XS' : s === 13 ? 'S' : s === 14 ? 'M' : s === 16 ? 'L' : s === 18 ? 'XL' : 'XXL'}
                </button>
              ))}
            </div>
          </div>

          {/* Radius */}
          <div className="border-t border-slate-50 pt-6">
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Kształt elementów</label>
            <div className="flex gap-3 flex-wrap">
              {([
                { id: 'sharp', label: 'Ostry', preview: '■' },
                { id: 'rounded', label: 'Zaokrąglony', preview: '▢' },
                { id: 'pill', label: 'Pigułka', preview: '⬬' },
              ] as { id: 'sharp' | 'rounded' | 'pill'; label: string; preview: string }[]).map(r => (
                <button
                  key={r.id}
                  onClick={() => setRadius(r.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                    radius === r.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-indigo-200'
                  }`}
                >
                  <span className="text-base leading-none">{r.preview}</span> {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Density */}
          <div className="border-t border-slate-50 pt-6">
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Gęstość UI</label>
            <div className="flex gap-3 flex-wrap">
              {([
                { id: 'compact', label: 'Kompakt', desc: 'Więcej danych' },
                { id: 'comfortable', label: 'Komfort', desc: 'Domyślny' },
                { id: 'spacious', label: 'Luźny', desc: 'Więcej przestrzeni' },
              ] as { id: 'compact' | 'comfortable' | 'spacious'; label: string; desc: string }[]).map(d => (
                <button
                  key={d.id}
                  onClick={() => setDensity(d.id)}
                  className={`flex flex-col gap-0.5 px-4 py-2.5 rounded-2xl border text-left transition-all ${
                    density === d.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 border-slate-100 hover:border-indigo-200'
                  }`}
                >
                  <span className={`text-[10px] font-black uppercase tracking-widest ${density === d.id ? 'text-white' : 'text-slate-700'}`}>{d.label}</span>
                  <span className={`text-[9px] ${density === d.id ? 'text-slate-300' : 'text-slate-400'}`}>{d.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div className="border-t border-slate-50 pt-6">
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Languages size={12} /> {t('settings.appearance.language')}
            </label>
            <div className="flex flex-wrap gap-3">
              {[
                { code: 'pl', label: 'Polski' },
                { code: 'en', label: 'English' },
                { code: 'de', label: 'Deutsch' },
                { code: 'ua', label: 'Ukr.' },
              ].map(l => (
                <button
                  key={l.code}
                  onClick={() => { setLangState(l.code); i18n.changeLanguage(l.code); }}
                  className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                    lang === l.code ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-indigo-200'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date format */}
          <div className="border-t border-slate-50 pt-6">
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">{t('settings.appearance.dateFormat')}</label>
            <div className="flex flex-wrap gap-3">
              {['DD.MM.YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'].map(fmt => (
                <button
                  key={fmt}
                  onClick={() => setDateFormatState(fmt)}
                  className={`px-5 py-2 rounded-2xl text-[10px] font-black font-mono tracking-widest border transition-all ${
                    dateFormat === fmt ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-indigo-200'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

        </div>
        {success && <p className="flex items-center gap-2 text-emerald-600 text-xs font-bold"><CheckCircle2 size={12} />{success}</p>}
        <div className="pt-4 border-t border-slate-50">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-slate-900 hover:bg-indigo-600 disabled:opacity-50 text-white font-black text-[10px] uppercase tracking-widest px-8 py-4 rounded-2xl transition-all shadow-xl flex items-center gap-2"
          >
            <CheckCircle2 size={14} /> {saving ? t('settings.saving') : t('settings.saveChanges')}
          </button>
        </div>
      </SectionCard>
    </div>
  );
}

/* ── Section: Dane & Backup ── */
function DaneSection() {
  const { t } = useTranslation();
  const { activeTenantId, user } = useAuth();
  const { currentTenant } = useTenant();
  const [exporting, setExporting] = useStateReact(false);
  const [importing, setImporting] = useStateReact(false);
  const [encPass, setEncPass] = useStateReact('');
  const [showEncrypt, setShowEncrypt] = useStateReact(false);
  const [status, setStatus] = useStateReact('');
  const importRef = React.useRef<HTMLInputElement>(null);

  const collectExportData = async () => {
    if (!activeTenantId) return {};
    const collections = ['companies', 'tenantMemberships', 'hr_employees', 'hr_departments'];
    const result: Record<string, any[]> = {};
    await Promise.all(collections.map(async col => {
      try {
        const q = query(collection(db, col), where('tenantId', '==', activeTenantId));
        const snap = await getDocs(q);
        result[col] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch { result[col] = []; }
    }));
    return {
      exportedAt: new Date().toISOString(),
      tenantId: activeTenantId,
      tenantName: currentTenant?.name,
      exportedBy: user?.email,
      data: result,
    };
  };

  const handleExportJSON = async () => {
    setExporting(true); setStatus('');
    try {
      const data = await collectExportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `cicas-backup-${activeTenantId}-${Date.now()}.json`;
      a.click(); URL.revokeObjectURL(url);
      setStatus(t('settings.data.exportDone'));
    } catch (e: any) {
      setStatus(`Błąd: ${e.message}`);
    } finally { setExporting(false); }
  };

  const handleExportEncrypted = async () => {
    if (!encPass) { setStatus(t('settings.data.passwordRequired')); return; }
    setExporting(true); setStatus('');
    try {
      const data = await collectExportData();
      const json = JSON.stringify(data);
      const enc = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(encPass), 'PBKDF2', false, ['deriveKey']);
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const key = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt']
      );
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(json));
      const buf = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
      buf.set(salt, 0); buf.set(iv, salt.length); buf.set(new Uint8Array(encrypted), salt.length + iv.length);
      const b64 = btoa(String.fromCharCode(...buf));
      const blob = new Blob([b64], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `cicas-backup-enc-${Date.now()}.cicas`;
      a.click(); URL.revokeObjectURL(url);
      setStatus(t('settings.data.exportEncryptedDone'));
    } catch (e: any) {
      setStatus(`Błąd: ${e.message}`);
    } finally { setExporting(false); }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setStatus('');
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.tenantId || !data.data) { setStatus(t('settings.data.invalidFormat')); return; }

      let imported = 0;
      const batch = writeBatch(db);

      for (const [colName, records] of Object.entries(data.data)) {
        if (!Array.isArray(records)) continue;
        for (const record of records as any[]) {
          const { id, ...rest } = record;
          if (id) {
            batch.set(doc(db, colName, id), { ...rest, importedAt: serverTimestamp() }, { merge: true });
            imported++;
          }
        }
      }

      await batch.commit();
      setStatus(t('settings.data.importDone', { count: imported }));
    } catch (e: any) {
      setStatus(`Błąd importu: ${e.message}`);
    } finally { setImporting(false); if (importRef.current) importRef.current.value = ''; }
  };

  return (
    <div className="space-y-6">
      <SectionCard title={t('settings.data.title')} icon={Database}>
        <div className="space-y-5">
          <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                <Server size={18} />
              </div>
              <div>
                <div className="font-black text-sm text-slate-900 italic">{t('settings.data.firestoreBackup')}</div>
                <div className="text-[9px] text-slate-500 font-bold">{t('settings.data.firestoreDesc')}</div>
              </div>
            </div>
          </div>

          {/* Export */}
          <div>
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">{t('settings.data.exportTitle')}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={handleExportJSON}
                disabled={exporting}
                className="flex items-center gap-3 justify-center bg-slate-900 hover:bg-indigo-600 disabled:opacity-50 text-white font-black text-[10px] uppercase tracking-widest px-6 py-4 rounded-2xl transition-all"
              >
                <Download size={14} /> {exporting ? t('settings.data.exporting') : t('settings.data.exportJSON')}
              </button>
              <button
                onClick={() => setShowEncrypt(!showEncrypt)}
                className="flex items-center gap-3 justify-center bg-slate-700 hover:bg-slate-600 text-white font-black text-[10px] uppercase tracking-widest px-6 py-4 rounded-2xl transition-all"
              >
                <Lock size={14} /> {t('settings.data.encryptedBackup')}
              </button>
            </div>
            {showEncrypt && (
              <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('settings.data.encryptionPassword')}</div>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={encPass}
                    onChange={e => setEncPass(e.target.value)}
                    placeholder={t('settings.data.passwordPlaceholder')}
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-900 focus:outline-none focus:border-indigo-400"
                  />
                  <button
                    onClick={handleExportEncrypted}
                    disabled={exporting || !encPass}
                    className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-all"
                  >
                    {t('settings.data.downloadCicas')}
                  </button>
                </div>
                <div className="text-[8px] text-slate-400 font-bold">{t('settings.data.encryptionWarning')}</div>
              </div>
            )}
          </div>

          {/* Import */}
          <div className="border-t border-slate-50 pt-4">
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">{t('settings.data.importTitle')}</div>
            <button
              onClick={() => importRef.current?.click()}
              disabled={importing}
              className="flex items-center gap-3 justify-center bg-white text-slate-700 border border-slate-200 hover:border-indigo-300 disabled:opacity-50 font-black text-[10px] uppercase tracking-widest px-6 py-4 rounded-2xl transition-all"
            >
              <Upload size={14} /> {importing ? t('settings.data.importing') : t('settings.data.importJSON')}
            </button>
            <input ref={importRef} type="file" accept=".json,.cicas" className="hidden" onChange={handleImport} />
          </div>

          {status && (
            <p className={`flex items-center gap-2 text-xs font-bold ${status.startsWith('Błąd') || status.startsWith('Error') ? 'text-red-600' : 'text-emerald-600'}`}>
              {status.startsWith('Błąd') || status.startsWith('Error') ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />} {status}
            </p>
          )}

          <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl">
            <div className="font-black text-rose-700 text-[10px] uppercase tracking-widest mb-2">{t('settings.data.dangerZone')}</div>
            <div className="text-[9px] text-rose-500 font-bold mb-4">{t('settings.data.dangerDesc')}</div>
            <button className="bg-rose-600 text-white font-black text-[9px] uppercase tracking-widest px-5 py-3 rounded-xl hover:bg-rose-700 transition-all">
              {t('settings.data.deleteTenant')}
            </button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

/* ── Section: Licencja ── */
function LicencjaSection() {
  const { activeTenantId } = useAuth();
  const [planData, setPlanData] = useStateReact<any>(null);
  const [loading, setLoading] = useStateReact(true);

  useEffect(() => {
    if (!activeTenantId) return;
    getDoc(doc(db, 'tenants', activeTenantId))
      .then(snap => { if (snap.exists()) setPlanData(snap.data()); })
      .finally(() => setLoading(false));
  }, [activeTenantId]);

  const plan = planData?.plan ?? 'trial';
  const PLAN_LABELS: Record<string, string> = { trial: 'Trial', starter: 'Starter', pro: 'Pro', enterprise: 'Enterprise' };
  const PLAN_DESC: Record<string, string> = {
    trial: '14-dniowy okres próbny · 5 użytkowników',
    starter: 'Do 10 użytkowników · podstawowe moduły',
    pro: 'Do 50 użytkowników · wszystkie moduły',
    enterprise: 'Nielimitowani użytkownicy · SLA 99,9% · wsparcie dedykowane',
  };

  return (
    <div className="space-y-6">
      <SectionCard title="Licencja & Plan" icon={CreditCard}>
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm font-bold">Ładowanie...</div>
        ) : (
          <div className="space-y-5">
            <div className="p-6 bg-indigo-600 rounded-2xl text-white">
              <div className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-80">Aktualny plan</div>
              <div className="text-3xl font-black italic tracking-tighter">{PLAN_LABELS[plan] ?? plan}</div>
              <div className="text-[10px] font-bold mt-2 opacity-70">{PLAN_DESC[plan] ?? ''}</div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Plan', value: PLAN_LABELS[plan] ?? plan },
                { label: 'Tenant ID', value: activeTenantId?.slice(0, 12) + '...' },
                { label: 'Właściciel', value: planData?.ownerId ? 'Skonfigurowany' : 'Brak' },
              ].map(m => (
                <div key={m.label} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{m.label}</div>
                  <div className="text-sm font-black text-slate-900 italic">{m.value}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-4 pt-2">
              <button
                onClick={() => window.open(`mailto:support@c-icas.gg?subject=Zmiana planu&body=Tenant: ${activeTenantId}`, '_blank')}
                className="bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-2xl hover:bg-indigo-600 transition-all"
              >
                Zmień plan
              </button>
              <button
                onClick={() => window.open(`mailto:support@c-icas.gg?subject=Historia płatności&body=Tenant: ${activeTenantId}`, '_blank')}
                className="bg-white text-slate-500 border border-slate-200 font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-2xl hover:border-indigo-300 transition-all"
              >
                Historia płatności
              </button>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

/* ── Shared helpers ── */
function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-8 border-b border-slate-50 flex items-center gap-4">
        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
          <Icon size={18} />
        </div>
        <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">{title}</h3>
      </div>
      <div className="p-8 space-y-6">{children}</div>
    </div>
  );
}

function SaveButton() {
  return (
    <div className="pt-4 border-t border-slate-50">
      <button className="bg-slate-900 hover:bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest px-8 py-4 rounded-2xl transition-all shadow-xl flex items-center gap-2">
        <CheckCircle2 size={14} /> Zapisz zmiany
      </button>
    </div>
  );
}

function ToggleRow({
  label, desc, active, onToggle, color = 'indigo'
}: { label: string; desc: string; active: boolean; onToggle: () => void; color?: string }) {
  return (
    <div
      onClick={onToggle}
      className={`flex items-center justify-between p-5 rounded-2xl border cursor-pointer transition-all ${
        active ? `bg-${color}-50 border-${color}-100` : 'bg-slate-50 border-slate-100 hover:border-indigo-100'
      }`}
    >
      <div>
        <div className="font-black text-sm text-slate-900 italic">{label}</div>
        <div className="text-[9px] text-slate-400 font-bold mt-1">{desc}</div>
      </div>
      <div className={`w-12 h-6 rounded-full relative transition-all ${active ? 'bg-indigo-600' : 'bg-slate-300'}`}>
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${active ? 'left-7' : 'left-1'}`} />
      </div>
    </div>
  );
}
