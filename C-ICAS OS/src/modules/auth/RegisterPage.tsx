import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "../../core/firebase/config";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      await updateProfile(user, { displayName });
      
      // Zapisujemy użytkownika w głównej kolekcji users (przydatne do relacji z firmami)
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        displayName,
        createdAt: new Date().toISOString()
      });

      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Błąd rejestracji");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
      <div className="w-full max-w-md p-8 bg-zinc-900 rounded-xl shadow-2xl border border-zinc-800">
        <h2 className="text-3xl font-bold mb-6 text-center text-zinc-100">Utwórz konto</h2>
        <p className="text-sm text-zinc-400 mb-8 text-center">Dołącz do systemu C-ICAS.OS</p>
        
        {error && <div className="bg-red-900/50 text-red-400 p-3 rounded mb-4 text-sm">{error}</div>}
        
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-zinc-300">Imię i nazwisko</label>
            <input 
              type="text" 
              className="w-full p-3 rounded bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
              value={displayName} onChange={e => setDisplayName(e.target.value)} required 
            />
          </div>
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
              value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
            />
          </div>
          <button disabled={loading} type="submit" className="w-full py-3 mt-4 bg-green-600 hover:bg-green-500 disabled:bg-green-800 transition-colors rounded font-semibold text-white">
            {loading ? "Rejestracja..." : "Zarejestruj się"}
          </button>
        </form>
        <div className="mt-6 text-center text-sm text-zinc-500">
          Masz już konto? <Link to="/login" className="text-blue-400 hover:text-blue-300">Zaloguj się</Link>
        </div>
      </div>
    </div>
  );
}
