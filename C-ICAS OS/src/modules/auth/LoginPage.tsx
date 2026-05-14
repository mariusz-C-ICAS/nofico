import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../core/firebase/config";
import { useNavigate, Link } from "react-router-dom";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Użytkownik zalogowany - App.tsx przechwyci zmianę stanu i wyrenderuje odpowiednią ścieżkę
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Błąd logowania");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
      <div className="w-full max-w-md p-8 bg-zinc-900 rounded-xl shadow-2xl border border-zinc-800">
        <h2 className="text-3xl font-bold mb-6 text-center text-zinc-100">C-ICAS.OS</h2>
        <p className="text-sm text-zinc-400 mb-8 text-center">Zaloguj się do swojego konta</p>
        
        {error && <div className="bg-red-900/50 text-red-400 p-3 rounded mb-4 text-sm">{error}</div>}
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-zinc-300">Adres Email</label>
            <input 
              type="email" 
              className="w-full p-3 rounded bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
              value={email} onChange={e => setEmail(e.target.value)} required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-zinc-300">Hasło</label>
            <input 
              type="password" 
              className="w-full p-3 rounded bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
              value={password} onChange={e => setPassword(e.target.value)} required 
            />
          </div>
          <button type="submit" className="w-full py-3 mt-4 bg-blue-600 hover:bg-blue-500 transition-colors rounded font-semibold text-white">
            Zaloguj się
          </button>
        </form>
        <div className="mt-6 text-center text-sm text-zinc-500">
          Nie masz konta? <Link to="/register" className="text-blue-400 hover:text-blue-300">Zarejestruj się</Link>
        </div>
      </div>
    </div>
  );
}
