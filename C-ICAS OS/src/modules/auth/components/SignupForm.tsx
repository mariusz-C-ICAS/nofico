import React, { useState } from 'react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { validateNIP, validatePassword } from '../../../shared/utils/validators';
import { Mail, Lock, Building2, User, Loader2, CheckCircle2 } from 'lucide-react';

export const SignupForm: React.FC = () => {
  const { signupWithEmail } = useAuth();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('email') || '';
  });
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [nip, setNip] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.isValid) {
      setError(passwordCheck.message || 'Niepoprawne hasło');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateNIP(nip)) {
      setError('Niepoprawny numer NIP. Sprawdź sumę kontrolną.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      console.log('Registering tenant:', { email, companyName, nip });
      const tenantData = {
        name: companyName,
        nip: nip.replace(/[\s-]/g, ""),
        country: 'PL',
        legalForm: 'JDG'
      };
      await signupWithEmail(email, password, displayName, tenantData);
      setStep(3); // Success step
    } catch (err: any) {
      setError(err.message || 'Błąd rejestracji');
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 3) {
    return (
      <div className="w-full max-w-md p-8 bg-white rounded-3xl shadow-xl text-center border border-slate-100">
        <div className="flex justify-center mb-6">
          <div className="h-20 w-20 bg-green-50 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Gotowe!</h1>
        <p className="text-slate-500 mb-8">
          Konto zostało utworzone. Wysłaliśmy link aktywacyjny na Twój adres email.
        </p>
        <a 
          href="/auth/login"
          className="block w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all"
        >
          Przejdź do logowania
        </a>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md p-8 bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Dołącz do nas</h1>
        <p className="text-slate-500">Zautomatyzuj swój serwis terenowy w kilka minut</p>
      </div>

      <div className="flex justify-between mb-8 relative">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -z-10 -translate-y-1/2"></div>
        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 1 ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>1</div>
        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 2 ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>2</div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {step === 1 && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Imię i Nazwisko</label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none"
                  placeholder="Jan Kowalski"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none"
                  placeholder="twoj@email.com"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Hasło</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">Min. 8 znaków, wielka litera i cyfra.</p>
            </div>
            <button
              type="button"
              onClick={handleNext}
              className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all"
            >
              Kontynuuj
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nazwa firmy / JDG</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none"
                  placeholder="Nazwa Twojej firmy"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">NIP</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                  maxLength={13}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none"
                  placeholder="123-456-78-90"
                  required
                />
              </div>
            </div>
            
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
              >
                Wstecz
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Zarejestruj'}
              </button>
            </div>
          </>
        )}
      </form>

      <p className="mt-8 text-center text-sm text-slate-500">
        Masz już konto?{' '}
        <a href="/auth/login" className="text-slate-900 font-bold hover:underline">
          Zaloguj się
        </a>
      </p>
    </div>
  );
};
