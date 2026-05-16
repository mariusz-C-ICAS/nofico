/**
 * Data: 2026-05-14
 * Sciezka: /src/modules/settings/SettingsModule.tsx
 */
import React, { useState } from 'react';
import {
  Building2, Users, Shield, Bell, Plug, Palette, Database, CreditCard,
  Sun, Moon, Monitor, Mail, Zap, MessageSquare, CheckCircle2, Upload,
  Plus, Trash2, Globe, Lock, Clock, Server, Languages, Eye, EyeOff,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { lazy, Suspense } from 'react';

const MultimailSettings = lazy(() => import('./components/MultimailSettings'));
const CompaniesSection = lazy(() => import('./components/CompaniesSection'));
const MembersSection = lazy(() => import('./components/MembersSection'));
const ApiPublicModule = lazy(() => import('../api/ApiPublicModule'));

type SettingsSection =
  | 'profil'
  | 'firmy'
  | 'uzytkownicy'
  | 'bezpieczenstwo'
  | 'powiadomienia'
  | 'integracje'
  | 'wyglad'
  | 'dane'
  | 'licencja'
  | 'multimail'
  | 'api';

/* ── Mock users ── */
const MOCK_USERS = [
  { id: 'U-001', name: 'Mariusz Czaja', email: 'marius@c-icas.gg', role: 'Super Admin', status: 'Aktywny', lastLogin: 'Dzisiaj 09:12' },
  { id: 'U-002', name: 'Anna Nowak', email: 'anna.nowak@c-icas.gg', role: 'Admin', status: 'Aktywny', lastLogin: 'Wczoraj 16:40' },
  { id: 'U-003', name: 'Tomasz Wisniewski', email: 'tomasz.w@c-icas.gg', role: 'Manager', status: 'Aktywny', lastLogin: '2026-05-12' },
  { id: 'U-004', name: 'Karolina Lis', email: 'k.lis@c-icas.gg', role: 'Uzytkownik', status: 'Oczekujacy', lastLogin: '—' },
];

const ROLE_COLORS: Record<string, string> = {
  'Super Admin': 'bg-indigo-600 text-white',
  'Admin': 'bg-slate-900 text-white',
  'Manager': 'bg-emerald-50 text-emerald-700',
  'Uzytkownik': 'bg-slate-100 text-slate-600',
};

const NAV_ITEMS: { id: SettingsSection; label: string; icon: React.ElementType }[] = [
  { id: 'profil', label: 'Profil Firmy', icon: Building2 },
  { id: 'firmy', label: 'Firmy w grupie', icon: Building2 },
  { id: 'uzytkownicy', label: 'Uzytkownicy & Role', icon: Users },
  { id: 'bezpieczenstwo', label: 'Bezpieczenstwo', icon: Shield },
  { id: 'powiadomienia', label: 'Powiadomienia', icon: Bell },
  { id: 'multimail', label: 'Multi-Email (OAuth2)', icon: Mail },
  { id: 'integracje', label: 'Integracje', icon: Plug },
  { id: 'wyglad', label: 'Wyglad', icon: Palette },
  { id: 'dane', label: 'Dane & Backup', icon: Database },
  { id: 'licencja', label: 'Licencja', icon: CreditCard },
  { id: 'api', label: 'API & Webhooki', icon: Globe },
];

export default function SettingsModule() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('profil');

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
                {activeSection === 'profil' && <ProfilSection />}
                {activeSection === 'firmy' && (
                  <Suspense fallback={<div className="h-48 flex items-center justify-center text-slate-400 text-sm">Ładowanie...</div>}>
                    <CompaniesSection />
                  </Suspense>
                )}
                {activeSection === 'uzytkownicy' && (
                  <Suspense fallback={<div className="h-48 flex items-center justify-center text-slate-400 text-sm">Ładowanie...</div>}>
                    <MembersSection />
                  </Suspense>
                )}
                {activeSection === 'bezpieczenstwo' && <BezpieczenstwoSection />}
                {activeSection === 'powiadomienia' && <PowiadomieniaSection />}
                {activeSection === 'integracje' && <IntegracjeSection />}
                {activeSection === 'wyglad' && <WyglądSection />}
                {activeSection === 'dane' && <DaneSection />}
                {activeSection === 'licencja' && <LicencjaSection />}
                {activeSection === 'multimail' && (
                  <Suspense fallback={<div className="h-48 flex items-center justify-center text-slate-400 text-sm">Ładowanie...</div>}>
                    <MultimailSettings />
                  </Suspense>
                )}
                {activeSection === 'api' && (
                  <Suspense fallback={<div className="h-48 flex items-center justify-center text-slate-400 text-sm">Ładowanie...</div>}>
                    <ApiPublicModule />
                  </Suspense>
                )}
              </motion.div>
            </AnimatePresence>
          </main>

        </div>
      </div>
    </div>
  );
}

/* ── Section: Profil Firmy ── */
function ProfilSection() {
  return (
    <div className="space-y-6">
      <SectionCard title="Profil Firmy" icon={Building2}>
        {/* Logo */}
        <div className="flex items-center gap-6 pb-6 border-b border-slate-50">
          <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl italic">CI</div>
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Logo firmy</div>
            <button className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-widest px-5 py-3 rounded-xl transition-all">
              <Upload size={13} /> Wgraj nowe logo
            </button>
          </div>
        </div>
        {/* Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4">
          {[
            { label: 'Nazwa firmy', value: 'C-ICAS Sp. z o.o.', wide: true },
            { label: 'NIP', value: '1234567890' },
            { label: 'REGON', value: '987654321' },
            { label: 'Adres', value: 'ul. Pulawska 14, Warszawa', wide: true },
            { label: 'Kod pocztowy', value: '02-512' },
            { label: 'Miasto', value: 'Warszawa' },
            { label: 'Branza', value: 'Budownictwo / PropTech', wide: true },
            { label: 'Email kontaktowy', value: 'biuro@c-icas.gg' },
            { label: 'Telefon', value: '+48 22 123 45 67' },
          ].map(f => (
            <div key={f.label} className={f.wide ? 'md:col-span-2' : ''}>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{f.label}</label>
              <input
                defaultValue={f.value}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-black text-slate-900 focus:outline-none focus:border-indigo-400 transition-colors"
              />
            </div>
          ))}
        </div>
        <SaveButton />
      </SectionCard>
    </div>
  );
}

/* ── Section: Uzytkownicy ── */
function UzytkownicySection() {
  const [showInvite, setShowInvite] = useState(false);

  return (
    <div className="space-y-6">
      <SectionCard title="Lista Uzytkownikow" icon={Users}>
        <div className="space-y-3">
          {MOCK_USERS.map(u => (
            <div key={u.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-lg transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xs italic">
                  {u.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="text-sm font-black text-slate-900 italic">{u.name}</div>
                  <div className="text-[9px] text-slate-400 font-bold">{u.email} • ostatnio: {u.lastLogin}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${ROLE_COLORS[u.role]}`}>{u.role}</span>
                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${u.status === 'Aktywny' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{u.status}</span>
                <button className="text-slate-300 hover:text-rose-500 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => setShowInvite(!showInvite)}
          className="mt-4 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-2xl transition-all"
        >
          <Plus size={14} /> Zapros uzytkownika
        </button>
        {showInvite && (
          <div className="mt-4 p-6 bg-indigo-50 border border-indigo-100 rounded-2xl space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Email</label>
                <input placeholder="nowy@firma.pl" className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-3 text-sm font-black text-slate-900 focus:outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Rola</label>
                <select className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-3 text-sm font-black text-slate-900 focus:outline-none">
                  <option>Uzytkownik</option>
                  <option>Manager</option>
                  <option>Admin</option>
                </select>
              </div>
            </div>
            <button className="bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-xl">
              Wyslij zaproszenie
            </button>
          </div>
        )}
      </SectionCard>
    </div>
  );
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

/* ── Section: Integracje ── */
function IntegracjeSection() {
  const integrations = [
    { name: 'Stripe', desc: 'Platnosci i subskrypcje', status: 'Polaczony', color: 'bg-indigo-600' },
    { name: 'HubSpot CRM', desc: 'Synchronizacja kontaktow', status: 'Polaczony', color: 'bg-orange-500' },
    { name: 'Google Workspace', desc: 'SSO, Drive, Calendar', status: 'Polaczony', color: 'bg-blue-500' },
    { name: 'KSeF MF', desc: 'e-Faktury Ministerstwo Finansow', status: 'Polaczony', color: 'bg-red-600' },
    { name: 'Twilio SMS', desc: 'Powiadomienia SMS', status: 'Niepolaczony', color: 'bg-rose-500' },
    { name: 'Slack', desc: 'Alerty i powiadomienia', status: 'Niepolaczony', color: 'bg-purple-600' },
  ];

  return (
    <div className="space-y-6">
      <SectionCard title="Integracje zewnetrzne" icon={Plug}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrations.map(int => (
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
              <button className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
                int.status === 'Polaczony'
                  ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                  : 'bg-slate-900 text-white hover:bg-indigo-600'
              }`}>
                {int.status === 'Polaczony' ? 'Polaczony' : 'Polacz'}
              </button>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

/* ── Section: Wyglad ── */
function WyglądSection() {
  const [theme, setTheme] = useState<'jasny' | 'ciemny' | 'system'>('system');
  const [lang, setLang] = useState('pl');
  const [dateFormat, setDateFormat] = useState('DD.MM.YYYY');

  return (
    <div className="space-y-6">
      <SectionCard title="Wyglad & Jezyk" icon={Palette}>
        <div className="space-y-8">
          {/* Theme */}
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Motyw</label>
            <div className="grid grid-cols-3 gap-3 max-w-xs">
              {[
                { id: 'jasny' as const, icon: Sun, label: 'Jasny' },
                { id: 'ciemny' as const, icon: Moon, label: 'Ciemny' },
                { id: 'system' as const, icon: Monitor, label: 'System' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`flex flex-col items-center gap-2 py-4 rounded-2xl border font-black text-[9px] uppercase tracking-widest transition-all ${
                    theme === t.id ? 'bg-slate-900 text-white border-slate-900 shadow-xl' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-indigo-200'
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
                  onClick={() => setLang(l.code)}
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
                  onClick={() => setDateFormat(fmt)}
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
        <SaveButton />
      </SectionCard>
    </div>
  );
}

/* ── Section: Dane & Backup ── */
function DaneSection() {
  return (
    <div className="space-y-6">
      <SectionCard title="Dane & Backup" icon={Database}>
        <div className="space-y-5">
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <Server size={18} />
              </div>
              <div>
                <div className="font-black text-sm text-slate-900 italic">Ostatni backup</div>
                <div className="text-[9px] text-slate-400 font-bold">2026-05-14 03:00 UTC • 2,4 GB • Szyfrowany (AES-256)</div>
              </div>
            </div>
            <span className="px-4 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase">OK</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button className="flex items-center gap-3 justify-center bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest px-6 py-4 rounded-2xl hover:bg-indigo-600 transition-all">
              <Database size={14} /> Wyeksportuj dane (JSON)
            </button>
            <button className="flex items-center gap-3 justify-center bg-white text-slate-700 border border-slate-200 font-black text-[10px] uppercase tracking-widest px-6 py-4 rounded-2xl hover:border-indigo-300 transition-all">
              <Upload size={14} /> Importuj dane
            </button>
          </div>

          <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl">
            <div className="font-black text-rose-700 text-[10px] uppercase tracking-widest mb-2">Strefa niebezpieczna</div>
            <div className="text-[9px] text-rose-500 font-bold mb-4">Usuniecie danych jest akcja nieodwracalna. Wymagane jest ponowne potwierdzenie haslem administratora.</div>
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
  return (
    <div className="space-y-6">
      <SectionCard title="Licencja & Plan" icon={CreditCard}>
        <div className="space-y-5">
          <div className="p-6 bg-indigo-600 rounded-2xl text-white">
            <div className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-80">Aktualny plan</div>
            <div className="text-3xl font-black italic tracking-tighter">Enterprise</div>
            <div className="text-[10px] font-bold mt-2 opacity-70">Nielimitowani uzytkownicy • SLA 99,9% • Wsparcie dedykowane</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Uzytkownicy', value: 'Bez limitu' },
              { label: 'Storage', value: '500 GB' },
              { label: 'Odnowienie', value: '2027-01-01' },
              { label: 'Cena', value: '4.500 PLN/mc' },
            ].map(m => (
              <div key={m.label} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{m.label}</div>
                <div className="text-base font-black text-slate-900 italic">{m.value}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-4 pt-2">
            <button className="bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-2xl hover:bg-indigo-600 transition-all">
              Zmien plan
            </button>
            <button className="bg-white text-slate-500 border border-slate-200 font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-2xl hover:border-indigo-300 transition-all">
              Historia platnosci
            </button>
          </div>
        </div>
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
