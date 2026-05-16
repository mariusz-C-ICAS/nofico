import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, CheckCircle2, AlertTriangle, ChevronRight, Sparkles } from 'lucide-react';
import { useAuth } from '../../core/auth/AuthContext';
import { useTenant } from '../../core/auth/TenantContext';
import { auth } from '../../core/firebase/config';
import { createTenantWithCompany } from './onboardingService';

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

type Step = 'form' | 'review';

export default function OnboardingWizard() {
  const { user } = useAuth();
  const { refreshTenants } = useTenant();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('form');
  const [companyName, setCompanyName] = useState('');
  const [nip, setNip] = useState('');
  const [industry, setIndustry] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isValid = companyName.trim().length > 1;

  const handleSubmit = async () => {
    if (!user || !isValid) return;
    setLoading(true);
    setError('');
    try {
      await createTenantWithCompany({
        companyName: companyName.trim(),
        nip: nip.trim() || undefined,
        industry: industry || undefined,
        userId: user.uid,
        userEmail: user.email ?? '',
      });
      await refreshTenants();
      navigate('/', { replace: true });
    } catch (e: any) {
      setError(e.message ?? 'Błąd podczas tworzenia workspace.');
      setStep('form');
    } finally {
      setLoading(false);
    }
  };

  const industryLabel = INDUSTRIES.find(i => i.value === industry)?.label;

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-2xl font-black text-white tracking-tighter italic mb-1">C-ICAS.OS</div>
          <div className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Intelligent Corporate Administration System</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl">

          {/* Stepper */}
          <div className="flex gap-1 mb-8">
            {(['form', 'review'] as Step[]).map((s, i) => (
              <div key={s} className="flex-1">
                <div className={`h-1 rounded-full transition-colors ${i <= (['form', 'review'] as Step[]).indexOf(step) ? 'bg-indigo-600' : 'bg-zinc-800'}`} />
                <span className={`text-[9px] font-black uppercase tracking-widest mt-1 block ${s === step ? 'text-indigo-400' : 'text-zinc-600'}`}>
                  {s === 'form' ? 'Twoja firma' : 'Potwierdź'}
                </span>
              </div>
            ))}
          </div>

          {step === 'form' && (
            <>
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 bg-indigo-600/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Building2 size={16} className="text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white uppercase tracking-tighter leading-tight">Skonfiguruj workspace</h2>
                    <p className="text-xs text-zinc-500 font-medium">Zajmie to mniej niż minutę.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Nazwa firmy *</label>
                  <input
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="np. ABC Sp. z o.o."
                    autoFocus
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">NIP (opcjonalnie)</label>
                  <input
                    value={nip}
                    onChange={e => setNip(e.target.value)}
                    placeholder="1234567890"
                    maxLength={10}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-sm text-white font-mono placeholder-zinc-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Branża</label>
                  <select
                    value={industry}
                    onChange={e => setIndustry(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  >
                    {INDUSTRIES.map(i => (
                      <option key={i.value} value={i.value} className="bg-zinc-800">{i.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {error && (
                <div className="mt-4 flex items-center gap-2 bg-red-950/50 border border-red-800 text-red-400 rounded-2xl px-4 py-3 text-xs font-bold">
                  <AlertTriangle size={13} /> {error}
                </div>
              )}

              <button
                disabled={!isValid}
                onClick={() => setStep('review')}
                className="mt-6 w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-black px-6 py-3.5 rounded-2xl text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20"
              >
                Dalej <ChevronRight size={14} />
              </button>
            </>
          )}

          {step === 'review' && (
            <>
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 bg-emerald-600/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Sparkles size={16} className="text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white uppercase tracking-tighter leading-tight">Wszystko gotowe?</h2>
                    <p className="text-xs text-zinc-500 font-medium">Sprawdź dane przed uruchomieniem.</p>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-[1.5rem] p-5 space-y-3 mb-6">
                <Row label="Firma" value={companyName.trim()} />
                {nip.trim() && <Row label="NIP" value={nip.trim()} />}
                {industry && industryLabel && <Row label="Branża" value={industryLabel} />}
                <Row label="Plan" value="Trial (30 dni)" />
                <Row label="Rola" value="Właściciel (OWNER)" />
              </div>

              <div className="bg-indigo-950/40 border border-indigo-800/50 rounded-2xl p-4 mb-6">
                <p className="text-[10px] text-indigo-300 font-bold leading-relaxed">
                  Zostanie utworzony workspace i Twoje konto OWNER. Możesz później zaprosić użytkowników w Ustawienia → Członkowie.
                </p>
              </div>

              {error && (
                <div className="mb-4 flex items-center gap-2 bg-red-950/50 border border-red-800 text-red-400 rounded-2xl px-4 py-3 text-xs font-bold">
                  <AlertTriangle size={13} /> {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('form')}
                  className="px-5 py-3 rounded-2xl bg-zinc-800 text-zinc-400 text-xs font-black uppercase hover:bg-zinc-700 transition-all"
                >
                  ← Wstecz
                </button>
                <button
                  disabled={loading}
                  onClick={handleSubmit}
                  className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black px-6 py-3.5 rounded-2xl text-xs uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/20"
                >
                  {loading ? 'Tworzenie...' : <><CheckCircle2 size={14} /> Utwórz workspace</>}
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-[10px] text-zinc-600 mt-6 font-medium">
          {user?.email} · <button onClick={() => auth.signOut()} className="hover:text-zinc-400 transition-colors">Wyloguj</button>
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center gap-4">
      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest shrink-0">{label}</span>
      <span className="text-xs font-bold text-zinc-200 text-right">{value}</span>
    </div>
  );
}
