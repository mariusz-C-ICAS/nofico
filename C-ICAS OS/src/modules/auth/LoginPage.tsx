import { useState } from "react";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../../core/firebase/config";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleGoogle = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      navigate("/");
    } catch (err: any) {
      setError(err.message || t('auth.login.errorGoogle'));
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Użytkownik zalogowany - App.tsx przechwyci zmianę stanu i wyrenderuje odpowiednią ścieżkę
      navigate("/");
    } catch (err: any) {
      setError(err.message || t('auth.login.errorLogin'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
      <div className="w-full max-w-md p-8 bg-zinc-900 rounded-xl shadow-2xl border border-zinc-800">
        <h2 className="text-3xl font-bold mb-6 text-center text-zinc-100">{t('auth.login.title')}</h2>
        <p className="text-sm text-zinc-400 mb-8 text-center">{t('auth.login.subtitle')}</p>
        
        {error && <div className="bg-red-900/50 text-red-400 p-3 rounded mb-4 text-sm">{error}</div>}
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-zinc-300">{t('auth.login.emailLabel')}</label>
            <input
              type="email"
              className="w-full p-3 rounded bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={email} onChange={e => setEmail(e.target.value)} required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-zinc-300">{t('auth.login.passwordLabel')}</label>
            <input
              type="password"
              className="w-full p-3 rounded bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={password} onChange={e => setPassword(e.target.value)} required
            />
          </div>
          <button type="submit" className="w-full py-3 mt-4 bg-blue-600 hover:bg-blue-500 transition-colors rounded font-semibold text-white">
            {t('auth.login.submitButton')}
          </button>
        </form>
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-700" /></div>
          <div className="relative flex justify-center text-xs text-zinc-500"><span className="bg-zinc-900 px-3">{t('auth.login.orSeparator')}</span></div>
        </div>
        <button
          type="button"
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 py-3 bg-white hover:bg-zinc-100 transition-colors rounded font-semibold text-zinc-800"
        >
          <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
          {t('auth.login.googleButton')}
        </button>
        <div className="mt-4 text-center text-sm text-zinc-500">
          {t('auth.login.noAccount')} <Link to="/register" className="text-blue-400 hover:text-blue-300">{t('auth.login.registerLink')}</Link>
        </div>
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={() => navigate('/internal-login')}
            className="text-[10px] text-zinc-500 hover:text-indigo-400 font-bold uppercase tracking-widest transition-colors"
          >
            {t('auth.login.pinLoginButton')}
          </button>
        </div>
      </div>
    </div>
  );
}
