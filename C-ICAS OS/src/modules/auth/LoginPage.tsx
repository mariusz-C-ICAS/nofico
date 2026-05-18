import { useState } from "react";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../../core/firebase/config";
import { useNavigate, Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

const FEATURES = [
  "HR, Kadry i Płace — pełny cykl życia pracownika",
  "CRM, Sprzedaż i Szanse sprzedaży",
  "Finanse, Faktury, KSeF i Kontroling",
  "Projekty, Zadania i Time Tracking",
  "Compliance, RODO, Sygnalista i ESG",
  "AI Copilot wbudowany w każdy moduł",
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogle = async () => {
    setError(null); setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Błąd logowania Google");
    } finally { setLoading(false); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/");
    } catch (err: any) {
      setError("Nieprawidłowy email lub hasło");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex">

      {/* Left panel — brand + features */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 text-white flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/40">
              <span className="font-black text-white text-sm">CI</span>
            </div>
            <span className="text-xl font-black tracking-tight">C-ICAS OS</span>
          </div>

          <h1 className="text-4xl font-extrabold leading-tight mb-4">
            Jeden system<br />
            <span className="text-indigo-300">dla całej firmy</span>
          </h1>
          <p className="text-indigo-200/70 text-lg mb-10 max-w-sm">
            Modułowy ERP/OS dla polskich MŚP. 100+ modułów, AI Copilot i pełna zgodność z polskim prawem.
          </p>

          <ul className="space-y-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm text-indigo-100/80">
                <CheckCircle2 size={16} className="text-indigo-400 flex-shrink-0 mt-0.5" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10">
          <div className="flex gap-4 mb-6">
            {[
              { value: "100+", label: "modułów" },
              { value: "14+", label: "krajów" },
              { value: "99.9%", label: "uptime" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-black text-indigo-300">{s.value}</div>
                <div className="text-xs text-indigo-400/70 uppercase tracking-wide">{s.label}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-indigo-400/50">
            Bezpłatny trial 14 dni · Brak karty kredytowej · Dane w EU
          </p>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="font-black text-white text-xs">CI</span>
            </div>
            <span className="text-lg font-black text-slate-900 tracking-tight">C-ICAS OS</span>
          </div>

          <h2 className="text-2xl font-black text-slate-900 mb-1">Zaloguj się</h2>
          <p className="text-sm text-slate-500 mb-8">
            Nie masz konta?{" "}
            <Link to="/register" className="text-indigo-600 font-semibold hover:text-indigo-700">
              Zarejestruj się bezpłatnie
            </Link>
          </p>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all mb-6 disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
            Zaloguj się przez Google
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
            <div className="relative flex justify-center text-xs text-slate-400"><span className="bg-white px-3">lub email i hasło</span></div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                autoComplete="email"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all"
                placeholder="twoj@email.pl"
                value={email} onChange={e => setEmail(e.target.value)} required
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold text-slate-700">Hasło</label>
                <a href="#" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">Zapomniałeś hasła?</a>
              </div>
              <input
                type="password"
                autoComplete="current-password"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all"
                placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-sm hover:shadow-indigo-500/30 hover:shadow-lg disabled:opacity-50 mt-2"
            >
              {loading ? "Logowanie…" : "Zaloguj się"}
            </button>
          </form>

          <p className="mt-8 text-xs text-center text-slate-400">
            Logując się akceptujesz{" "}
            <a href="https://os.c-icas.eu/terms" target="_blank" rel="noreferrer" className="underline hover:text-slate-600">Regulamin</a>
            {" "}i{" "}
            <a href="https://os.c-icas.eu/privacy" target="_blank" rel="noreferrer" className="underline hover:text-slate-600">Politykę Prywatności</a>
          </p>
        </div>
      </div>

    </div>
  );
}
