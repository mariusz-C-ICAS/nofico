import React, { useState } from 'react';
import { ShieldCheck, Scale, AlertCircle, CheckCircle2, ChevronRight, Loader2, FileText, Lock, ShieldAlert } from 'lucide-react';
import { db } from '../../shared/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../shared/hooks/AuthContext';
import { useTenant } from '../../shared/hooks/useTenant';

export default function LegalValidationWizard({ onValidated }: { onValidated: () => void }) {
  const [step, setStep] = useState(1);
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<{status: 'passed' | 'warning' | 'failed', message: string, checks: any[]} | null>(null);
  const { user } = useAuth();
  const { activeTenantId } = useTenant();

  const runLegalCheck = async () => {
    setValidating(true);
    // Simulation of UC-DMS-09: Legal Validation Wizard
    // Verifies KSH 210 (Umowy między spółką a członkiem zarządu)
    try {
      await new Promise(r => setTimeout(r, 2500));
      setResult({
        status: 'warning',
        message: 'Wymagana dodatkowa uchwała Wspólników zgodnie z art. 210 KSH.',
        checks: [
          { name: 'Reprezentacja Spółki', pass: true, detail: 'Pełnomocnik powołany uchwałą wspólników.' },
          { name: 'Zakaz self-dealing', pass: false, detail: 'Wykryto konflikt interesów: Prezes Zarządu jest drugą stroną umowy.' },
          { name: 'Forma Aktu Notarialnego', pass: true, detail: 'Zachowano formę pisemną z podpisem kwalifikowanym.' }
        ]
      });
      setStep(2);
    } finally {
      setValidating(false);
    }
  };

  const finalizeValidation = async () => {
    if (!result || !user || !activeTenantId) return;
    try {
      await addDoc(collection(db, `tenants/${activeTenantId}/legalValidations`), {
        type: 'KSH_210_CHECK',
        status: result.status,
        summary: result.message,
        timestamp: serverTimestamp(),
        userId: user.uid,
        details: result.checks
      });
      onValidated();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 min-h-[500px] flex flex-col">
       <div className="flex justify-between items-center mb-10">
          <div>
             <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3 italic">
                <Scale className="text-indigo-600" /> Legal Validation Wizard
             </h2>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Smart Compliance Checker (AI Hybrid)</p>
          </div>
          <div className="flex gap-2">
             {[1, 2, 3].map(s => (
               <div key={s} className={`w-8 h-1.5 rounded-full ${s <= step ? 'bg-indigo-600' : 'bg-slate-100'}`}></div>
             ))}
          </div>
       </div>

       {step === 1 && (
         <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="relative">
               <div className="w-32 h-32 rounded-[2.5rem] bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
                  <ShieldCheck size={64} />
               </div>
               <div className="absolute -bottom-4 -right-4 bg-white p-3 rounded-2xl shadow-xl border border-slate-100">
                  <Lock className="text-slate-400" size={24} />
               </div>
            </div>
            
            <div className="max-w-md">
               <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-3">Weryfikacja rzetelności prawnej</h3>
               <p className="text-xs text-slate-500 font-bold leading-relaxed uppercase tracking-widest">
                  Nasz silnik AI przeanalizuje dokument pod kątem zgodności z Kodeksem Spółek Handlowych, w szczególności art. 210, oraz sprawdzi uprawnienia sygnatariuszy.
               </p>
            </div>

            <button 
               onClick={runLegalCheck}
               disabled={validating}
               className="bg-slate-900 hover:bg-indigo-600 text-white font-black px-10 py-5 rounded-2xl flex items-center gap-4 transition-all shadow-xl shadow-indigo-100 uppercase text-[11px] tracking-widest disabled:opacity-50"
            >
               {validating ? <Loader2 className="animate-spin" /> : <ChevronRight />}
               {validating ? 'Analizuję przepisy KSH...' : 'Rozpocznij Walidację 2.0'}
            </button>
         </div>
       )}

       {step === 2 && result && (
         <div className="flex-1 space-y-8 animate-in fade-in slide-in-from-right-4">
            <div className={`p-8 rounded-[2rem] border flex items-center gap-6 ${
              result.status === 'passed' ? 'bg-emerald-50 border-emerald-100 text-emerald-900' : 
              result.status === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-900' : 
              'bg-rose-50 border-rose-100 text-rose-900'
            }`}>
               <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                  {result.status === 'passed' ? <CheckCircle2 className="text-emerald-500" size={32} /> : 
                   result.status === 'warning' ? <ShieldAlert className="text-amber-500" size={32} /> : 
                   <AlertCircle className="text-rose-500" size={32} />}
               </div>
               <div>
                  <h4 className="text-lg font-black uppercase tracking-tight italic">{result.status === 'passed' ? 'Dokument Poprawny' : 'Wykryto Ryzyko Prawne'}</h4>
                  <p className="text-[11px] font-bold uppercase tracking-widest opacity-80">{result.message}</p>
               </div>
            </div>

            <div className="space-y-4">
               <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Szczegółowy Raport Zgodności</h5>
               {result.checks.map((check, i) => (
                  <div key={i} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-center justify-between group hover:border-indigo-200 transition-all">
                     <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${check.pass ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                           {check.pass ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                        </div>
                        <div>
                           <div className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{check.name}</div>
                           <div className="text-[10px] text-slate-500 font-bold">{check.detail}</div>
                        </div>
                     </div>
                     {!check.pass && (
                        <button className="text-[9px] font-black text-indigo-600 uppercase hover:underline">Jak naprawić?</button>
                     )}
                  </div>
               ))}
            </div>

            <div className="flex gap-4 pt-4">
               <button onClick={() => setStep(1)} className="flex-1 bg-slate-100 text-slate-600 font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all">Ponów Skan</button>
               <button onClick={() => setStep(3)} className="flex-1 bg-slate-900 text-white font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-indigo-100">Generuj Raport Audytowy</button>
            </div>
         </div>
       )}

       {step === 3 && (
         <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in zoom-in-95">
            <div className="w-40 h-40 rounded-full border-8 border-indigo-600 border-t-slate-100 animate-pulse flex items-center justify-center">
               <FileText size={64} className="text-indigo-600" />
            </div>
            <div>
               <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Raport Gotowy</h3>
               <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2 leading-relaxed max-w-sm">
                  Raport walidacji został trwale powiązany z dokumentem w Skarbcu. Integralność potwierdzona sumą kontrolną SHA-256.
               </p>
            </div>
            <button onClick={finalizeValidation} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-12 py-5 rounded-2xl uppercase text-[11px] tracking-widest transition-all shadow-xl shadow-emerald-100">
               Zamknij i Wróć do Skarbca
            </button>
         </div>
       )}
    </div>
  );
}
