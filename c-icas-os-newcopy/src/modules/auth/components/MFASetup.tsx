import React, { useState } from 'react';
import { Shield, Smartphone, ArrowRight, Loader2 } from 'lucide-react';

export const MFASetup: React.FC = () => {
  const [step, setStep] = useState(1);
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="w-full max-w-md p-8 bg-white rounded-3xl shadow-xl border border-slate-100">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center h-16 w-16 bg-blue-50 rounded-2xl mb-4">
          <Shield className="h-8 w-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Zabezpiecz konto (MFA)</h1>
        <p className="text-slate-500 text-sm">Dwuetapowa weryfikacja chroni Twoje dane finansowe i dostęp do projektów.</p>
      </div>

      {step === 1 && (
        <div className="space-y-6">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-start gap-3">
            <Smartphone className="h-5 w-5 text-slate-400 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Użyj aplikacji uwierzytelniającej</p>
              <p className="text-xs text-slate-500">Zainstaluj Google Authenticator lub Microsoft Authenticator.</p>
            </div>
          </div>
          
          <div className="flex justify-center p-4 bg-white border-2 border-dashed border-slate-200 rounded-2xl">
            {/* Placeholder for QR Code */}
            <div className="h-40 w-40 bg-slate-100 rounded-xl flex items-center justify-center text-slate-300">
              QR CODE
            </div>
          </div>

          <button 
            onClick={() => setStep(2)}
            className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2"
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
               maxLength={6} 
               value={code}
               onChange={(e) => setCode(e.target.value)}
               className="w-40 text-center text-3xl font-black tracking-[0.5em] p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900"
               placeholder="000000"
             />
          </div>
          <button 
            onClick={() => {
              setIsLoading(true);
              setTimeout(() => { setIsLoading(false); setStep(3); }, 1500);
            }}
            className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Zweryfikuj i włącz'}
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="text-center space-y-6">
          <p className="text-sm text-green-600 font-bold">MFA zostało pomyślnie włączone!</p>
          <a href="/dashboard" className="block w-full py-3 bg-slate-900 text-white rounded-xl font-bold">Przejdź do panelu</a>
        </div>
      )}
    </div>
  );
};
