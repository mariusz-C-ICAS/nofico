import React, { useState, useEffect } from 'react';
import { Shield, Smartphone, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { multiFactor, TotpMultiFactorGenerator, TotpSecret } from 'firebase/auth';
import { useAuth } from '../../../core/auth/AuthContext';

type ErrorCode =
  | 'auth/requires-recent-login'
  | 'auth/invalid-verification-code'
  | 'auth/totp-challenge-timeout'
  | string;

const ERROR_MESSAGES: Record<string, string> = {
  'auth/requires-recent-login': 'Sesja wygasła — zaloguj się ponownie i spróbuj ponownie.',
  'auth/invalid-verification-code': 'Nieprawidłowy kod — spróbuj ponownie.',
  'auth/totp-challenge-timeout': 'Czas weryfikacji upłynął — wygeneruj nowy QR kod.',
};

function resolveError(code: ErrorCode): string {
  return ERROR_MESSAGES[code] ?? 'Wystąpił błąd. Spróbuj ponownie.';
}

export const MFASetup: React.FC = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [totpSecret, setTotpSecret] = useState<TotpSecret | null>(null);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const init = async () => {
      try {
        const multiFactorUser = multiFactor(user);
        const session = await multiFactorUser.getSession();
        const secret = await TotpMultiFactorGenerator.generateSecret(session);
        if (cancelled) return;
        const url = secret.generateQrCodeUrl(user.email ?? 'user', 'C-ICAS OS');
        setTotpSecret(secret);
        setQrUrl(url);
      } catch (err: unknown) {
        if (cancelled) return;
        const code = (err as { code?: string }).code ?? 'unknown';
        setError(resolveError(code));
      }
    };

    init();
    return () => { cancelled = true; };
  }, [user]);

  const handleVerify = async () => {
    if (!totpSecret || !user || code.length !== 6) return;
    setIsLoading(true);
    setError(null);
    try {
      const assertion = TotpMultiFactorGenerator.assertionForEnrollment(totpSecret, code);
      const multiFactorUser = multiFactor(user);
      await multiFactorUser.enroll(assertion, 'TOTP');
      setStep(3);
    } catch (err: unknown) {
      const errCode = (err as { code?: string }).code ?? 'unknown';
      setError(resolveError(errCode));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 bg-white rounded-3xl shadow-xl border border-slate-100">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center h-16 w-16 bg-blue-50 rounded-2xl mb-4">
          <Shield className="h-8 w-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Zabezpiecz konto (MFA)</h1>
        <p className="text-slate-500 text-sm">Dwuetapowa weryfikacja chroni Twoje dane finansowe i dostęp do projektów.</p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-6">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-start gap-3">
            <Smartphone className="h-5 w-5 text-slate-400 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Użyj aplikacji uwierzytelniającej</p>
              <p className="text-xs text-slate-500">Zainstaluj Google Authenticator lub Microsoft Authenticator.</p>
            </div>
          </div>

          <div className="flex justify-center p-4 bg-white border-2 border-dashed border-slate-200 rounded-2xl min-h-[176px] items-center">
            {qrUrl ? (
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`}
                alt="QR Code dla aplikacji TOTP"
                className="h-40 w-40 rounded-xl"
              />
            ) : error ? (
              <p className="text-xs text-red-500 text-center">Nie udało się wygenerować kodu QR.</p>
            ) : (
              <Loader2 className="h-8 w-8 text-slate-300 animate-spin" />
            )}
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={!qrUrl}
            className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Skanowałem, wpisz kod <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <p className="text-sm text-center text-slate-600">Wpisz 6-cyfrowy kod z aplikacji:</p>
          <div className="flex gap-2 justify-center">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="w-40 text-center text-3xl font-black tracking-[0.5em] p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900"
              placeholder="000000"
            />
          </div>
          <button
            onClick={handleVerify}
            disabled={isLoading || code.length !== 6}
            className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Zweryfikuj i włącz'}
          </button>
          <button
            onClick={() => { setStep(1); setCode(''); setError(null); }}
            className="w-full text-xs text-slate-400 hover:text-slate-600"
          >
            Wróć do kodu QR
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center h-16 w-16 bg-green-50 rounded-2xl">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <p className="text-sm text-green-600 font-bold">MFA zostało pomyslnie wlaczone!</p>
          <a href="/dashboard" className="block w-full py-3 bg-slate-900 text-white rounded-xl font-bold">Przejdz do panelu</a>
        </div>
      )}
    </div>
  );
};
