/**
 * Data: 2026-05-18
 * Sciezka: /src/modules/settings/SettingsModule.tsx
 */
import React, { useState } from 'react';
import {
  Building2, Users, Shield, Bell, Plug, Palette, Database, CreditCard,
  Sun, Moon, Monitor, Mail, Zap, MessageSquare, CheckCircle2, Upload,
  Globe, Lock, Clock, Server, Languages, User, Key, Webhook,
  ChevronRight, Download, AlertTriangle, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { lazy, Suspense, useEffect, useState as useStateReact } from 'react';
import { requestPushPermission, getPushPermissionState } from '../../shared/services/fcmService';
import { useAuth } from '../../shared/hooks/AuthContext';
import { useTheme } from '../../app/providers/ThemeProvider';
import { db } from '../../shared/lib/firebase';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { useTenant } from '../../core/auth/TenantContext';

const MultimailSettings = lazy(() => import('./components/MultimailSettings'));
const CompaniesSection = lazy(() => import('./components/CompaniesSection'));
const MembersSection = lazy(() => import('./components/MembersSection'));
const RoleViewsSection = lazy(() => import('./components/RoleViewsSection'));
const KontoSection = lazy(() => import('./components/KontoSection'));
const ProfilFirmySection = lazy(() => import('./components/ProfilFirmySection'));

type SettingsSection =
  | 'konto'
  | 'profil'
  | 'firmy'
  | 'uzytkownicy'
  | 'role_views'
  | 'bezpieczenstwo'
  | 'powiadomienia'
  | 'integracje'
  | 'wyglad'
  | 'dane'
  | 'licencja'
  | 'multimail';

const NAV_ITEMS: { id: SettingsSection; label: string; icon: React.ElementType }[] = [
  { id: 'konto', label: 'Konto', icon: User },
  { id: 'profil', label: 'Profil Firmy', icon: Building2 },
  { id: 'firmy', label: 'Firmy w grupie', icon: Building2 },
  { id: 'uzytkownicy', label: 'Użytkownicy & Role', icon: Users },
  { id: 'role_views', label: 'Widoki ról', icon: Shield },
  { id: 'bezpieczenstwo', label: 'Bezpieczeństwo', icon: Shield },
  { id: 'powiadomienia', label: 'Powiadomienia', icon: Bell },
  { id: 'multimail', label: 'Multi-Email (OAuth2)', icon: Mail },
  { id: 'integracje', label: 'Integracje & API', icon: Plug },
  { id: 'wyglad', label: 'Wygląd', icon: Palette },
  { id: 'dane', label: 'Dane & Backup', icon: Database },
  { id: 'licencja', label: 'Licencja', icon: CreditCard },
];

export default function SettingsModule() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('konto');

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-12">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl border border-slate-800 mb-10">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4" />
          <div className="relative z-10">
            <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3">C-ICAS OS — Konfiguracja systemu</div>
            <h1 className="text-4xl font-black uppercase tracking-tighter italic">Ustawienia</h1>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">

          {/* Sidebar */}
          <aside className="lg:w-72 space-y-2 shrink-0">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center justify-between px-7 py-5 rounded-[2rem] transition-all font-black text-xs uppercase tracking-widest ${
                  activeSection === item.id
                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100'
                    : 'bg-white text-slate-400 border border-slate-100 hover:text-indigo-600 hover:border-indigo-100'
                }`}
              >
                <span className="flex items-center gap-4">
                  <item.icon size={16} />
                  {item.label}
                </span>
                <ChevronRight size={14} className={activeSection === item.id ? 'opacity-100' : 'opacity-30'} />
              </button>
            ))}
          </aside>

          {/* Main panel */}
          <main className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.22 }}
              >
                {activeSection === 'konto' && (
                  <Suspense fallback={<Loader />}><KontoSection /></Suspense>
                )}
                {activeSection === 'profil' && (
                  <Suspense fallback={<Loader />}><ProfilFirmySection /></Suspense>
                )}
                {activeSection === 'firmy' && (
                  <Suspense fallback={<Loader />}><CompaniesSection /></Suspense>
                )}
                {activeSection === 'uzytkownicy' && (
                  <Suspense fallback={<Loader />}><MembersSection /></Suspense>
                )}
                {activeSection === 'role_views' && (
                  <Suspense fallback={<Loader />}><RoleViewsSection /></Suspense>
                )}
                {activeSection === 'bezpieczenstwo' && <BezpieczenstwoSection />}
                {activeSection === 'powiadomienia' && <PowiadomieniaSection />}
                {activeSection === 'integracje' && <IntegracjeSection />}
                {activeSection === 'wyglad' && <WyglądSection />}
                {activeSection === 'dane' && <DaneSection />}
                {activeSection === 'licencja' && <LicencjaSection />}
                {activeSection === 'multimail' && (
                  <Suspense fallback={<Loader />}><MultimailSettings /></Suspense>
                )}
              </motion.div>
            </AnimatePresence>
          </main>

        </div>
      </div>
    </div>
  );
}

function Loader() {
  return <div className="h-48 flex items-center justify-center text-slate-400 text-sm font-bold">Ładowanie...</div>;
}

/* ── Section: Bezpieczenstwo ── */
function BezpieczenstwoSection() {
  const [mfa, setMfa] = useState(true);
  const [ipAllow, setIpAllow] = useState(false);

  return (
    <div className="space-y-6">
      <SectionCard title="Polityka Bezpieczenstwa" icon={Shield}>
        <div className="space-y-5">
          <ToggleRow
            label="Wymóg MFA (Uwierzytelnianie 2-sk.)"
            desc="Wszyscy uzytkownicy musza skonfigurowac aplikacje TOTP lub klucz sprzetowy."
            active={mfa}
            onToggle={() => setMfa(!mfa)}
            color="indigo"
          />
          <ToggleRow
            label="IP Allowlist"
            desc="Ogranicza dostep do zdefiniowanych adresow IP."
            active={ipAllow}
            onToggle={() => setIpAllow(!ipAllow)}
            color="indigo"
          />

          <div className="pt-4 border-t border-slate-50">
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Clock size={12} /> Timeout sesji (minuty)
            </label>
            <input type="number" defaultValue={60} className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-black text-slate-900 focus:outline-none focus:border-indigo-400 w-40" />
          </div>

          <div className="pt-4 border-t border-slate-50">
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Lock size={12} /> Minimalna dlugosc hasla
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
                <Globe size={12} /> Dozwolone adresy IP (jeden per linia)
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
  const { user, activeTenantId } = useAuth();
  const [pushState, setPushState] = useStateReact<NotificationPermission>('default');
  const [pushLoading, setPushLoading] = useStateReact(false);

  useStateReact; // satisfy lint — already used above via alias
  useEffect(() => {
    getPushPermissionState().then(setPushState);
  }, []);

  const activatePush = async () => {
    if (!user || !activeTenantId) return;
    setPushLoading(true);
    const token = await requestPushPermission(user.uid, activeTenantId);
    setPushState(token ? 'granted' : 'denied');
    setPushLoading(false);
  };

  type NotifKey = 'email' | 'push' | 'sms';
  const events = [
    { id: 'new_invoice', label: 'Nowa faktura', desc: 'Klient wystawil fakture' },
    { id: 'payment_overdue', label: 'Zalegla platnosc', desc: 'Platnosc przeterminowana >7 dni' },
    { id: 'new_user', label: 'Nowy uzytkownik', desc: 'Rejestracja nowego konta' },
    { id: 'system_alert', label: 'Alert systemowy', desc: 'Blad krytyczny lub downtime' },
    { id: 'report_ready', label: 'Raport gotowy', desc: 'Raport miesiac/kwartalny wygenerowany' },
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
          <p className="text-xs font-black uppercase tracking-widest text-slate-700">Powiadomienia push (FCM)</p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {pushState === 'granted' ? 'Aktywne — przeglądarka zarejestrowana do odbioru powiadomień.' : pushState === 'denied' ? 'Zablokowane — odblokuj w ustawieniach przeglądarki.' : 'Nieaktywne — kliknij aby włączyć powiadomienia push.'}
          </p>
        </div>
        {pushState !== 'granted' && pushState !== 'denied' && (
          <button onClick={activatePush} disabled={pushLoading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">
            {pushLoading ? 'Aktywuję...' : 'Aktywuj push'}
          </button>
        )}
      </div>
      <SectionCard title="Preferencje Powiadomien" icon={Bell}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-[9px] text-slate-400 uppercase tracking-widest text-left py-3 pr-8 font-black">Zdarzenie</th>
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
  const [tab, setTab] = useStateReact<'uslugi' | 'api' | 'webhooki'>('uslugi');
  const { activeTenantId } = useAuth();
  const [apiKeys, setApiKeys] = useStateReact<{ id: string; name: string; key: string; createdAt: string }[]>([]);
  const [newKeyName, setNewKeyName] = useStateReact('');

  const INTEGRATIONS = [
    { name: 'Stripe', desc: 'Płatności i subskrypcje', color: 'bg-indigo-600', configKey: 'stripe' },
    { name: 'Google Workspace', desc: 'SSO, Drive, Calendar', color: 'bg-blue-500', configKey: 'google' },
    { name: 'KSeF / MF', desc: 'e-Faktury Ministerstwo Finansów', color: 'bg-red-600', configKey: 'ksef' },
    { name: 'Microsoft 365', desc: 'SSO, Teams, Calendar (wkrótce)', color: 'bg-sky-600', configKey: 'ms365' },
    { name: 'Twilio SMS', desc: 'Powiadomienia SMS', color: 'bg-rose-500', configKey: 'twilio' },
    { name: 'Slack', desc: 'Alerty i powiadomienia', color: 'bg-purple-600', configKey: 'slack' },
    { name: 'SendGrid', desc: 'Transakcyjny email', color: 'bg-teal-600', configKey: 'sendgrid' },
    { name: 'GUS / REGON API', desc: 'Weryfikacja danych firm', color: 'bg-emerald-600', configKey: 'gus' },
  ];

  const generateKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return 'cicas_' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => chars[b % chars.length]).join('');
  };

  const addApiKey = () => {
    if (!newKeyName.trim()) return;
    setApiKeys(prev => [...prev, {
      id: crypto.randomUUID(),
      name: newKeyName.trim(),
      key: generateKey(),
      createdAt: new Date().toLocaleDateString('pl-PL'),
    }]);
    setNewKeyName('');
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 bg-white rounded-2xl border border-slate-100 p-2 shadow-sm">
        {([
          { id: 'uslugi', label: 'Usługi zewnętrzne', icon: Plug },
          { id: 'api', label: 'Klucze API', icon: Key },
          { id: 'webhooki', label: 'Webhooki', icon: Globe },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 flex-1 justify-center py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === t.id ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-indigo-600'}`}
          >
            <t.icon size={12} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'uslugi' && (
        <SectionCard title="Usługi zewnętrzne" icon={Plug}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {INTEGRATIONS.map(int => (
              <div key={int.name} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-lg transition-all">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 ${int.color} rounded-xl flex items-center justify-center text-white font-black text-[10px]`}>
                    {int.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-black text-slate-900 italic">{int.name}</div>
                    <div className="text-[9px] text-slate-400 font-bold">{int.desc}</div>
                  </div>
                </div>
                <button className="px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-900 text-white hover:bg-indigo-600 transition-all">
                  Konfiguruj
                </button>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {tab === 'api' && (
        <SectionCard title="Klucze API" icon={Key}>
          <div className="space-y-4">
            <div className="text-[9px] text-slate-500 font-bold">Klucze API pozwalają zewnętrznym systemom komunikować się z C-ICAS OS. Przechowuj je bezpiecznie.</div>
            <div className="flex gap-2">
              <input
                value={newKeyName}
                onChange={e => setNewKeyName(e.target.value)}
                placeholder="Nazwa klucza (np. ERP Integration)"
                onKeyDown={e => e.key === 'Enter' && addApiKey()}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-black text-slate-900 focus:outline-none focus:border-indigo-400"
              />
              <button onClick={addApiKey} className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all">
                + Generuj
              </button>
            </div>
            {apiKeys.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs font-bold">Brak kluczy API. Wygeneruj pierwszy klucz.</div>
            ) : (
              <div className="space-y-3">
                {apiKeys.map(k => (
                  <div key={k.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm text-slate-900">{k.name}</span>
                      <span className="text-[9px] text-slate-400 font-bold">{k.createdAt}</span>
                    </div>
                    <code className="block text-[10px] font-mono text-slate-600 bg-slate-100 px-3 py-2 rounded-xl break-all">{k.key}</code>
                    <button onClick={() => setApiKeys(prev => prev.filter(x => x.id !== k.id))} className="text-[9px] text-red-500 font-black hover:text-red-700">Usuń klucz</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {tab === 'webhooki' && (
        <SectionCard title="Webhooki" icon={Globe}>
          <div className="space-y-4">
            <div className="text-[9px] text-slate-500 font-bold">Webhooki wysyłają powiadomienia HTTP POST do zewnętrznych systemów przy wybranych zdarzeniach.</div>
            <div className="py-12 text-center">
              <Globe size={32} className="mx-auto text-slate-200 mb-3" />
              <div className="text-slate-400 text-sm font-bold">Konfiguracja webhooków — wkrótce</div>
              <div className="text-[9px] text-slate-400 font-bold mt-1">Zdarzenia: nowa faktura, nowy pracownik, zmiana statusu, płatność</div>
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

/* ── Section: Wyglad ── */
function WyglądSection() {
  const { theme, setTheme } = useTheme();
  const { userData, updateUserSettings } = useAuth();
  const [lang, setLangState] = useStateReact(userData?.language ?? 'pl');
  const [dateFormat, setDateFormatState] = useStateReact((userData as any)?.dateFormat ?? 'DD.MM.YYYY');
  const [saving, setSaving] = useStateReact(false);
  const [success, setSuccess] = useStateReact('');

  const THEME_MAP: Record<string, 'light' | 'dark' | 'auto'> = { jasny: 'light', ciemny: 'dark', system: 'auto' };
  const THEME_REVERSE: Record<string, string> = { light: 'jasny', dark: 'ciemny', auto: 'system' };
  const currentThemeKey = THEME_REVERSE[theme] ?? 'system';

  const handleSave = async () => {
    setSaving(true); setSuccess('');
    try {
      await updateUserSettings({ language: lang, dateFormat } as any);
      import('../../app/i18n').then(({ default: i18n }) => i18n.changeLanguage(lang));
      setSuccess('Ustawienia zapisane.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard title="Wyglad & Jezyk" icon={Palette}>
        <div className="space-y-8">
          {/* Theme */}
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Motyw</label>
            <div className="grid grid-cols-3 gap-3 max-w-xs">
              {[
                { id: 'jasny', themeVal: 'light' as const, icon: Sun, label: 'Jasny' },
                { id: 'ciemny', themeVal: 'dark' as const, icon: Moon, label: 'Ciemny' },
                { id: 'system', themeVal: 'auto' as const, icon: Monitor, label: 'System' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.themeVal)}
                  className={`flex flex-col items-center gap-2 py-4 rounded-2xl border font-black text-[9px] uppercase tracking-widest transition-all ${
                    currentThemeKey === t.id ? 'bg-slate-900 text-white border-slate-900 shadow-xl' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-indigo-200'
                  }`}
                >
                  <t.icon size={18} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div className="border-t border-slate-50 pt-6">
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Languages size={12} /> Jezyk interfejsu
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
                  onClick={() => setLangState(l.code)}
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
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Format daty</label>
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
            <CheckCircle2 size={14} /> {saving ? 'Zapisuję...' : 'Zapisz ustawienia'}
          </button>
        </div>
      </SectionCard>
    </div>
  );
}

/* ── Section: Dane & Backup ── */
function DaneSection() {
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
      setStatus('Eksport zakończony.');
    } catch (e: any) {
      setStatus(`Błąd: ${e.message}`);
    } finally { setExporting(false); }
  };

  const handleExportEncrypted = async () => {
    if (!encPass) { setStatus('Podaj hasło szyfrowania.'); return; }
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
      setStatus('Zaszyfrowany backup gotowy.');
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
      if (!data.tenantId || !data.data) { setStatus('Nieprawidłowy format pliku.'); return; }
      setStatus(`Plik importu wczytany: tenant ${data.tenantId}, ${Object.keys(data.data).join(', ')}. Funkcja zapisu w przygotowaniu.`);
    } catch (e: any) {
      setStatus(`Błąd importu: ${e.message}`);
    } finally { setImporting(false); }
  };

  return (
    <div className="space-y-6">
      <SectionCard title="Dane & Backup" icon={Database}>
        <div className="space-y-5">
          <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                <Server size={18} />
              </div>
              <div>
                <div className="font-black text-sm text-slate-900 italic">Backup Firestore</div>
                <div className="text-[9px] text-slate-500 font-bold">Dane przechowywane w Google Cloud Firestore (multi-region). Eksport poniżej.</div>
              </div>
            </div>
          </div>

          {/* Export */}
          <div>
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Eksport danych</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={handleExportJSON}
                disabled={exporting}
                className="flex items-center gap-3 justify-center bg-slate-900 hover:bg-indigo-600 disabled:opacity-50 text-white font-black text-[10px] uppercase tracking-widest px-6 py-4 rounded-2xl transition-all"
              >
                <Download size={14} /> {exporting ? 'Eksportuję...' : 'Eksportuj JSON'}
              </button>
              <button
                onClick={() => setShowEncrypt(!showEncrypt)}
                className="flex items-center gap-3 justify-center bg-slate-700 hover:bg-slate-600 text-white font-black text-[10px] uppercase tracking-widest px-6 py-4 rounded-2xl transition-all"
              >
                <Lock size={14} /> Zaszyfrowany backup
              </button>
            </div>
            {showEncrypt && (
              <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hasło szyfrowania AES-256-GCM</div>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={encPass}
                    onChange={e => setEncPass(e.target.value)}
                    placeholder="Hasło backupu..."
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-900 focus:outline-none focus:border-indigo-400"
                  />
                  <button
                    onClick={handleExportEncrypted}
                    disabled={exporting || !encPass}
                    className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-all"
                  >
                    Pobierz .cicas
                  </button>
                </div>
                <div className="text-[8px] text-slate-400 font-bold">Pamiętaj hasło — bez niego odszyfrowanie jest niemożliwe.</div>
              </div>
            )}
          </div>

          {/* Import */}
          <div className="border-t border-slate-50 pt-4">
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Import danych</div>
            <button
              onClick={() => importRef.current?.click()}
              disabled={importing}
              className="flex items-center gap-3 justify-center bg-white text-slate-700 border border-slate-200 hover:border-indigo-300 disabled:opacity-50 font-black text-[10px] uppercase tracking-widest px-6 py-4 rounded-2xl transition-all"
            >
              <Upload size={14} /> {importing ? 'Wczytuję...' : 'Importuj dane (JSON)'}
            </button>
            <input ref={importRef} type="file" accept=".json,.cicas" className="hidden" onChange={handleImport} />
          </div>

          {status && (
            <p className={`flex items-center gap-2 text-xs font-bold ${status.startsWith('Błąd') ? 'text-red-600' : 'text-emerald-600'}`}>
              {status.startsWith('Błąd') ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />} {status}
            </p>
          )}

          <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl">
            <div className="font-black text-rose-700 text-[10px] uppercase tracking-widest mb-2">Strefa niebezpieczna</div>
            <div className="text-[9px] text-rose-500 font-bold mb-4">Usuniecie danych jest akcja nieodwracalna. Wymagane jest potwierdzenie haslem administratora.</div>
            <button className="bg-rose-600 text-white font-black text-[9px] uppercase tracking-widest px-5 py-3 rounded-xl hover:bg-rose-700 transition-all">
              Usun wszystkie dane tenanta
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
              <button className="bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-2xl hover:bg-indigo-600 transition-all">
                Zmień plan
              </button>
              <button className="bg-white text-slate-500 border border-slate-200 font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-2xl hover:border-indigo-300 transition-all">
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
