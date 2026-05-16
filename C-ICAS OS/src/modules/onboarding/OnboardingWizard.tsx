import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, CheckCircle2, AlertTriangle, ChevronRight, Sparkles,
  Users, LayoutGrid, ArrowRight, Circle,
} from 'lucide-react';
import { useAuth } from '../../core/auth/AuthContext';
import { useTenant } from '../../core/auth/TenantContext';
import { auth } from '../../core/firebase/config';
import {
  createTenantWithCompany, updateCompanyProfile, createFirstDepartment,
  createMemberInvitation, markOnboardingStep,
} from './onboardingService';

const INDUSTRIES = [
  { value: '', label: 'Wybierz branżę (opcjonalnie)' },
  { value: 'construction', label: 'Budownictwo' },
  { value: 'services', label: 'Usługi ogólne' },
  { value: 'it', label: 'IT / Technologia' },
  { value: 'healthcare', label: 'Ochrona zdrowia' },
  { value: 'manufacturing', label: 'Produkcja / Przemysł' },
  { value: 'trade', label: 'Handel' },
  { value: 'transport', label: 'Transport / Logistyka' },
  { value: 'finance', label: 'Finanse / Ubezpieczenia' },
  { value: 'education', label: 'Edukacja' },
  { value: 'real_estate', label: 'Nieruchomości' },
  { value: 'hospitality', label: 'Gastronomia / Hotele' },
  { value: 'other', label: 'Inna' },
];

const DEPT_TYPES = [
  { value: 'DEPARTMENT', label: 'Dział' },
  { value: 'DIVISION', label: 'Oddział / Pion' },
  { value: 'TEAM', label: 'Zespół' },
  { value: 'LOCATION', label: 'Lokalizacja / Oddział terenowy' },
];

const MEMBER_ROLES = [
  { value: 'ADMIN', label: 'Administrator' },
  { value: 'MANAGER', label: 'Menedżer' },
  { value: 'USER', label: 'Użytkownik' },
];

type Step = 'workspace' | 'review' | 'profile' | 'structure' | 'invite' | 'done';

const VISIBLE_STEPS: Step[] = ['workspace', 'profile', 'structure', 'invite', 'done'];
const STEP_LABELS = ['Workspace', 'Profil firmy', 'Struktura', 'Zaproszenie', 'Gotowe'];

function stepIdx(s: Step) {
  if (s === 'review') return 0;
  return VISIBLE_STEPS.indexOf(s);
}

export default function OnboardingWizard() {
  const { user } = useAuth();
  const { refreshTenants } = useTenant();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('workspace');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1
  const [companyName, setCompanyName] = useState('');
  const [nip, setNip] = useState('');
  const [industry, setIndustry] = useState('');

  // Step 2 — profil firmy
  const [regon, setRegon] = useState('');
  const [phone, setPhone] = useState('');
  const [profEmail, setProfEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [zip, setZip] = useState('');

  // Step 3 — struktura
  const [deptName, setDeptName] = useState('');
  const [deptType, setDeptType] = useState('DEPARTMENT');

  // Step 4 — zaproszenie
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('USER');

  // IDs po utworzeniu
  const [tenantId, setTenantId] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [doneSteps, setDoneSteps] = useState<Set<string>>(new Set(['workspace']));

  const markDone = (key: string) => setDoneSteps(prev => new Set([...prev, key]));

  const go = (s: Step) => { setError(''); setStep(s); };

  // ── handlers ────────────────────────────────────────────────────────────────

  const handleCreateWorkspace = async () => {
    if (!user) return;
    setLoading(true); setError('');
    try {
      const { tenantId: tid, companyId: cid } = await createTenantWithCompany({
        companyName: companyName.trim(), nip: nip.trim() || undefined,
        industry: industry || undefined, userId: user.uid, userEmail: user.email ?? '',
      });
      setTenantId(tid); setCompanyId(cid);
      await refreshTenants();
      go('profile');
    } catch (e: any) {
      setError(e.message ?? 'Błąd tworzenia workspace.');
      go('workspace');
    } finally { setLoading(false); }
  };

  const handleSaveProfile = async (skip = false) => {
    if (skip) { go('structure'); return; }
    setLoading(true); setError('');
    try {
      await updateCompanyProfile(companyId, {
        regon: regon.trim() || undefined, phone: phone.trim() || undefined,
        email: profEmail.trim() || undefined, website: website.trim() || undefined,
        address: { street: street.trim() || undefined, city: city.trim() || undefined, zip: zip.trim() || undefined, country: 'PL' },
      });
      await markOnboardingStep(tenantId, 'profile');
      markDone('profile'); go('structure');
    } catch (e: any) { setError(e.message ?? 'Błąd zapisu profilu.'); }
    finally { setLoading(false); }
  };

  const handleSaveStructure = async (skip = false) => {
    if (skip) { go('invite'); return; }
    if (!deptName.trim()) { setError('Podaj nazwę działu.'); return; }
    setLoading(true); setError('');
    try {
      await createFirstDepartment(tenantId, deptName.trim(), deptType);
      await markOnboardingStep(tenantId, 'structure');
      markDone('structure'); go('invite');
    } catch (e: any) { setError(e.message ?? 'Błąd tworzenia działu.'); }
    finally { setLoading(false); }
  };

  const handleSaveInvite = async (skip = false) => {
    if (skip) { go('done'); return; }
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) { setError('Podaj poprawny email.'); return; }
    setLoading(true); setError('');
    try {
      await createMemberInvitation(tenantId, inviteEmail.trim(), inviteRole, user?.email ?? '');
      await markOnboardingStep(tenantId, 'invite');
      markDone('invite'); go('done');
    } catch (e: any) { setError(e.message ?? 'Błąd zaproszenia.'); }
    finally { setLoading(false); }
  };

  const idx = stepIdx(step);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div className="text-2xl font-black text-white tracking-tighter italic mb-1">C-ICAS.OS</div>
          <div className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Intelligent Corporate Administration System</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl">

          {/* Stepper */}
          <div className="flex gap-1 mb-8">
            {VISIBLE_STEPS.map((s, i) => (
              <div key={s} className="flex-1">
                <div className={`h-1 rounded-full transition-all duration-300 ${i <= idx ? 'bg-indigo-600' : 'bg-zinc-800'}`} />
                <span className={`text-[8px] font-black uppercase tracking-widest mt-1 block truncate ${i === idx ? 'text-indigo-400' : i < idx ? 'text-zinc-500' : 'text-zinc-700'}`}>
                  {STEP_LABELS[i]}
                </span>
              </div>
            ))}
          </div>

          {/* ─── STEP: workspace ─────────────────────────────────────────────────── */}
          {step === 'workspace' && (
            <>
              <StepHeader icon={Building2} bg="bg-indigo-600/20" color="text-indigo-400"
                title="Utwórz workspace" sub="Twój dedykowany obszar w C-ICAS OS." />
              <div className="space-y-4">
                <Field label="Nazwa firmy *" value={companyName} set={setCompanyName} placeholder="np. ABC Sp. z o.o." autoFocus />
                <Field label="NIP (opcjonalnie)" value={nip} set={setNip} placeholder="1234567890" mono maxLen={10} />
                <SelectF label="Branża" value={industry} set={setIndustry} opts={INDUSTRIES} />
              </div>
              {error && <ErrBox msg={error} />}
              <Btn disabled={companyName.trim().length < 2} onClick={() => go('review')} label="Dalej" icon={<ChevronRight size={14} />} mt />
            </>
          )}

          {/* ─── STEP: review ─────────────────────────────────────────────────────── */}
          {step === 'review' && (
            <>
              <StepHeader icon={Sparkles} bg="bg-emerald-600/20" color="text-emerald-400"
                title="Wszystko gotowe?" sub="Sprawdź dane i utwórz workspace." />
              <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-[1.5rem] p-5 space-y-3 mb-5">
                <KV k="Firma" v={companyName.trim()} />
                {nip.trim() && <KV k="NIP" v={nip.trim()} />}
                {industry && <KV k="Branża" v={INDUSTRIES.find(i => i.value === industry)?.label ?? industry} />}
                <KV k="Plan" v="Trial (30 dni)" />
                <KV k="Rola" v="Właściciel (OWNER)" />
              </div>
              <div className="bg-indigo-950/40 border border-indigo-800/50 rounded-2xl p-4 mb-5">
                <p className="text-[10px] text-indigo-300 font-bold leading-relaxed">
                  Kolejne kroki: profil firmy, struktura, zaproszenia. Każdy możesz pominąć i uzupełnić później.
                </p>
              </div>
              {error && <ErrBox msg={error} />}
              <div className="flex gap-3">
                <BtnSec onClick={() => go('workspace')} label="← Wstecz" />
                <Btn loading={loading} onClick={handleCreateWorkspace} label="Utwórz workspace" icon={<CheckCircle2 size={14} />} />
              </div>
            </>
          )}

          {/* ─── STEP: profile ────────────────────────────────────────────────────── */}
          {step === 'profile' && (
            <>
              <StepHeader icon={Building2} bg="bg-blue-600/20" color="text-blue-400"
                title="Profil firmy" sub="Dane rejestrowe i kontaktowe. Zmienisz w Ustawienia → Firmy." />
              <div className="space-y-3">
                <Field label="REGON (opcjonalnie)" value={regon} set={setRegon} placeholder="123456789" mono maxLen={9} />
                <Field label="Telefon" value={phone} set={setPhone} placeholder="+48 123 456 789" />
                <Field label="Email firmowy" value={profEmail} set={setProfEmail} placeholder="biuro@firma.pl" type="email" />
                <Field label="Strona WWW" value={website} set={setWebsite} placeholder="https://firma.pl" />
                <div className="pt-2 border-t border-zinc-800">
                  <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2">Adres siedziby</label>
                  <div className="space-y-2">
                    <Field label="" value={street} set={setStreet} placeholder="Ulica i numer" />
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="" value={zip} set={setZip} placeholder="00-000" maxLen={6} />
                      <Field label="" value={city} set={setCity} placeholder="Miasto" />
                    </div>
                  </div>
                </div>
              </div>
              {error && <ErrBox msg={error} />}
              <div className="flex gap-3 mt-5">
                <BtnSkip onClick={() => handleSaveProfile(true)} />
                <Btn loading={loading} onClick={() => handleSaveProfile(false)} label="Zapisz i dalej" />
              </div>
            </>
          )}

          {/* ─── STEP: structure ──────────────────────────────────────────────────── */}
          {step === 'structure' && (
            <>
              <StepHeader icon={LayoutGrid} bg="bg-violet-600/20" color="text-violet-400"
                title="Struktura organizacyjna" sub="Pierwszy dział. Edytujesz w HR → Struktura Org." />
              <div className="space-y-4">
                <Field label="Nazwa działu *" value={deptName} set={setDeptName} placeholder="np. Biuro Zarządu" autoFocus />
                <SelectF label="Typ jednostki" value={deptType} set={setDeptType} opts={DEPT_TYPES} />
              </div>
              {error && <ErrBox msg={error} />}
              <div className="flex gap-3 mt-5">
                <BtnSkip onClick={() => handleSaveStructure(true)} />
                <Btn loading={loading} onClick={() => handleSaveStructure(false)} label="Dodaj dział" />
              </div>
            </>
          )}

          {/* ─── STEP: invite ─────────────────────────────────────────────────────── */}
          {step === 'invite' && (
            <>
              <StepHeader icon={Users} bg="bg-amber-600/20" color="text-amber-400"
                title="Zaproś użytkownika" sub="Dodaj współpracownika. Zarządzasz w Ustawienia → Członkowie." />
              <div className="space-y-4">
                <Field label="Email *" value={inviteEmail} set={setInviteEmail} placeholder="user@firma.pl" type="email" autoFocus />
                <SelectF label="Rola" value={inviteRole} set={setInviteRole} opts={MEMBER_ROLES} />
              </div>
              {error && <ErrBox msg={error} />}
              <div className="flex gap-3 mt-5">
                <BtnSkip onClick={() => handleSaveInvite(true)} />
                <Btn loading={loading} onClick={() => handleSaveInvite(false)} label="Wyślij zaproszenie" />
              </div>
            </>
          )}

          {/* ─── STEP: done ───────────────────────────────────────────────────────── */}
          {step === 'done' && (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-emerald-600/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={28} className="text-emerald-400" />
                </div>
                <h2 className="text-xl font-black text-white uppercase tracking-tighter">Workspace gotowy!</h2>
                <p className="text-xs text-zinc-500 font-medium mt-1">
                  Nieukończone kroki widoczne są jako checklist na Dashboardzie.
                </p>
              </div>

              <div className="space-y-2 mb-6">
                {[
                  { key: 'workspace', label: 'Utwórz workspace', hint: '' },
                  { key: 'profile', label: 'Uzupełnij profil firmy', hint: 'Ustawienia → Firmy' },
                  { key: 'structure', label: 'Dodaj strukturę organizacyjną', hint: 'HR → Struktura Org.' },
                  { key: 'invite', label: 'Zaproś użytkownika', hint: 'Ustawienia → Członkowie' },
                  { key: 'workflow', label: 'Skonfiguruj pierwszy workflow', hint: 'Moduł Workflow' },
                ].map(item => {
                  const done = doneSteps.has(item.key);
                  return (
                    <div key={item.key} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${done ? 'border-emerald-800/30 bg-emerald-950/20' : 'border-zinc-800 bg-zinc-800/30'}`}>
                      {done
                        ? <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
                        : <Circle size={14} className="text-zinc-700 flex-shrink-0" />}
                      <span className={`text-xs font-bold flex-1 ${done ? 'text-zinc-300' : 'text-zinc-600'}`}>{item.label}</span>
                      {!done && item.hint && <span className="text-[9px] text-zinc-700 font-bold">{item.hint}</span>}
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => navigate('/', { replace: true })}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black px-6 py-3.5 rounded-2xl text-xs uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/20"
              >
                Przejdź do systemu <ArrowRight size={14} />
              </button>
            </>
          )}
        </div>

        <p className="text-center text-[10px] text-zinc-600 mt-6 font-medium">
          {user?.email} ·{' '}
          <button onClick={() => auth.signOut()} className="hover:text-zinc-400 transition-colors">Wyloguj</button>
        </p>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function StepHeader({ icon: Icon, bg, color, title, sub }: { icon: any; bg: string; color: string; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className={`w-9 h-9 ${bg} rounded-2xl flex items-center justify-center flex-shrink-0`}>
        <Icon size={16} className={color} />
      </div>
      <div>
        <h2 className="text-lg font-black text-white uppercase tracking-tighter leading-tight">{title}</h2>
        <p className="text-[10px] text-zinc-500 font-medium">{sub}</p>
      </div>
    </div>
  );
}

function Field({ label, value, set, placeholder, autoFocus, mono, maxLen, type = 'text' }: {
  label: string; value: string; set: (v: string) => void; placeholder: string;
  autoFocus?: boolean; mono?: boolean; maxLen?: number; type?: string;
}) {
  return (
    <div>
      {label && <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">{label}</label>}
      <input
        value={value}
        onChange={e => set(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        maxLength={maxLen}
        type={type}
        className={`w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all ${mono ? 'font-mono' : ''}`}
      />
    </div>
  );
}

function SelectF({ label, value, set, opts }: { label: string; value: string; set: (v: string) => void; opts: { value: string; label: string }[] }) {
  return (
    <div>
      {label && <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">{label}</label>}
      <select value={value} onChange={e => set(e.target.value)}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all">
        {opts.map(o => <option key={o.value} value={o.value} className="bg-zinc-800">{o.label}</option>)}
      </select>
    </div>
  );
}

function ErrBox({ msg }: { msg: string }) {
  return (
    <div className="mt-4 flex items-center gap-2 bg-red-950/50 border border-red-800 text-red-400 rounded-2xl px-4 py-3 text-xs font-bold">
      <AlertTriangle size={13} /> {msg}
    </div>
  );
}

function Btn({ onClick, label, icon, loading, disabled, mt }: { onClick: () => void; label: string; icon?: React.ReactNode; loading?: boolean; disabled?: boolean; mt?: boolean }) {
  return (
    <button onClick={onClick} disabled={loading || disabled}
      className={`flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-black px-6 py-3.5 rounded-2xl text-xs uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/20 ${mt ? 'mt-6 w-full' : ''}`}>
      {loading ? 'Zapisywanie...' : <>{icon} {label}</>}
    </button>
  );
}

function BtnSec({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="px-5 py-3 rounded-2xl bg-zinc-800 text-zinc-400 text-xs font-black uppercase hover:bg-zinc-700 transition-all">
      {label}
    </button>
  );
}

function BtnSkip({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="px-5 py-3 rounded-2xl bg-zinc-800 text-zinc-500 text-xs font-black uppercase hover:bg-zinc-700 hover:text-zinc-300 transition-all whitespace-nowrap">
      Pomiń →
    </button>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between items-center gap-4">
      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest shrink-0">{k}</span>
      <span className="text-xs font-bold text-zinc-200 text-right">{v}</span>
    </div>
  );
}
