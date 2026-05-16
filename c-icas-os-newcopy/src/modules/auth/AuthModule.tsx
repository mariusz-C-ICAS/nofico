import React from 'react';
import { LoginForm } from './components/LoginForm';
import { SignupForm } from './components/SignupForm';
import { MFASetup } from './components/MFASetup';

interface AuthModuleProps {
  mode: 'login' | 'signup' | 'forgot' | 'verify' | 'mfa-setup';
}

export const AuthModule: React.FC<AuthModuleProps> = ({ mode }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-blue-100 rounded-full blur-[120px] opacity-30 select-none pointer-events-none"></div>
      <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-slate-200 rounded-full blur-[120px] opacity-30 select-none pointer-events-none"></div>
      
      <div className="z-10 w-full flex flex-col items-center">
        <div className="mb-12 flex items-center gap-3">
          <div className="h-12 w-12 bg-slate-900 rounded-2xl flex items-center justify-center rotate-3 border-4 border-white shadow-xl">
             <span className="text-white font-black text-xl">FS</span>
          </div>
          <span className="text-2xl font-black tracking-tighter text-slate-900">FieldService OS</span>
        </div>

        {mode === 'login' && <LoginForm />}
        {mode === 'signup' && <SignupForm />}
        {mode === 'mfa-setup' && <MFASetup />}
        {mode === 'forgot' && (
          <div className="w-full max-w-md p-8 bg-white rounded-3xl shadow-xl text-center border border-slate-100">
             <h1 className="text-2xl font-bold mb-4">Resetowanie hasła</h1>
             <p className="text-slate-500 mb-6">Wpisz swój email, aby otrzymać instrukcje.</p>
             <input type="email" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl mb-4" placeholder="email@example.com" />
             <button className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all">Wyślij</button>
             <a href="/auth/login" className="block mt-4 text-sm text-slate-500 hover:underline">Wróć do logowania</a>
          </div>
        )}
      </div>
      
      <footer className="mt-12 text-slate-400 text-xs text-center z-10">
        &copy; 2026 FieldService OS. Wszystkie prawa zastrzeżone.<br/>
        Bezpieczeństwo potwierdzone przez Identity Platform.
      </footer>
    </div>
  );
};

export default AuthModule;
