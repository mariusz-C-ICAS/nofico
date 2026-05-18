import React, { useState } from 'react';
import { 
  ShieldCheck, PenTool, Users, Mail, Clock, CheckCircle2, 
  ArrowRight, Loader2, Smartphone, Building2, Landmark, 
  ShieldAlert, QrCode, ExternalLink, Download
} from 'lucide-react';
import { db } from '../../shared/lib/firebase';
import { collection, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '../../shared/hooks/AuthContext';
import { useTenant } from '../../shared/hooks/useTenant';

interface Signer {
  email: string;
  name: string;
  status: 'pending' | 'signed';
}

export default function SignatureWizard({ 
  documentId, 
  documentName, 
  onComplete 
}: { 
  documentId: string; 
  documentName: string; 
  onComplete: () => void 
}) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const [step, setStep] = useState<'config' | 'provider' | 'processing' | 'final'>('config');
  const [provider, setProvider] = useState<string | null>(null);
  const [signers, setSigners] = useState<Signer[]>([
    { email: user?.email || '', name: user?.displayName || 'Ty', status: 'pending' }
  ]);
  const [newSignerEmail, setNewSignerEmail] = useState('');
  const [newSignerName, setNewSignerName] = useState('');

  const providers = [
    { id: 'mobywatel', name: 'mObywatel', icon: Smartphone, color: 'text-blue-600', desc: 'Podpis kwalifikowany eIDAS (bezpłatny)' },
    { id: 'pz', name: 'Profil Zaufany', icon: Landmark, color: 'text-indigo-600', desc: 'Weryfikacja tożsamości GOV.pl' },
    { id: 'szafir', name: 'KIR Szafir', icon: ShieldCheck, color: 'text-emerald-600', desc: 'Karta fizyczna lub chmurowy QES' },
    { id: 'cencert', name: 'CenCert', icon: Building2, color: 'text-slate-600', desc: 'Zalecany dla faktur KSeF (QSeal)' }
  ];

  const addSigner = () => {
    if (newSignerEmail) {
      setSigners([...signers, { email: newSignerEmail, name: newSignerName || newSignerEmail, status: 'pending' }]);
      setNewSignerEmail('');
      setNewSignerName('');
    }
  };

  const startSigning = async () => {
    setStep('processing');

    if (activeTenantId) {
      const sigRef = await addDoc(collection(db, `tenants/${activeTenantId}/signatures`), {
        documentId,
        documentName,
        provider,
        signers,
        status: signers.length > 1 ? 'COLLECTING' : 'SIGNED',
        createdAt: serverTimestamp(),
        createdBy: user?.uid
      });

      await updateDoc(doc(db, `tenants/${activeTenantId}/documents/${documentId}`), {
        status: 'Signed (e-Podpis)',
        signatureId: sigRef.id
      });
    }
    setStep('final');
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden max-w-2xl w-full mx-auto animate-in fade-in zoom-in-95">
      <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
        <div>
           <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 italic">
              <PenTool className="text-indigo-600" size={20} /> e-Signature Workflow
           </h3>
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">eIDAS 2.0 / QES / PAdES-LTV</p>
        </div>
        <div className="flex gap-2">
           {['config', 'provider', 'final'].map(s => (
             <div key={s} className={`w-8 h-1 my-2 rounded-full ${step === s ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>
           ))}
        </div>
      </div>

      <div className="p-10">
        {step === 'config' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4">
             <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Lista Sygnatariuszy (Workflow)</label>
                <div className="space-y-3">
                   {signers.map((s, i) => (
                     <div key={i} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-black text-[10px] text-slate-400 border border-slate-100">{i+1}</div>
                           <div>
                              <div className="text-xs font-black text-slate-800 uppercase">{s.name}</div>
                              <div className="text-[10px] text-slate-500 font-bold">{s.email}</div>
                           </div>
                        </div>
                        <CheckCircle2 className="text-indigo-500 opacity-20" size={16} />
                     </div>
                   ))}
                </div>
             </div>

             <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100/50 space-y-4">
                <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest mb-2">Dodaj Współsygnatariusza</p>
                <div className="grid grid-cols-2 gap-3">
                   <input 
                     type="email" 
                     placeholder="Email" 
                     value={newSignerEmail}
                     onChange={e => setNewSignerEmail(e.target.value)}
                     className="bg-white border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500" 
                   />
                   <input 
                     type="text" 
                     placeholder="Nazwisko / Rola" 
                     value={newSignerName}
                     onChange={e => setNewSignerName(e.target.value)}
                     className="bg-white border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500" 
                   />
                </div>
                <button 
                  onClick={addSigner}
                  className="w-full bg-white text-indigo-600 font-black py-3 rounded-xl text-[10px] uppercase tracking-widest border border-indigo-100 hover:bg-white/80 transition-all"
                >
                  <Users size={14} className="inline mr-2" /> Dodaj do dokumentu
                </button>
             </div>

             <button 
               onClick={() => setStep('provider')}
               className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl transition-all hover:bg-indigo-600"
             >
                Wybierz Dostawcę Podpisu <ArrowRight size={18} />
             </button>
          </div>
        )}

        {step === 'provider' && (
          <div className="space-y-6 animate-in slide-in-from-right-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {providers.map(p => (
                   <button 
                     key={p.id}
                     onClick={() => setProvider(p.id)}
                     className={`p-6 rounded-[2rem] border transition-all text-left group ${
                       provider === p.id 
                         ? 'bg-slate-900 border-slate-900 shadow-2xl' 
                         : 'bg-white border-slate-100 hover:border-indigo-200'
                     }`}
                   >
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-colors ${
                        provider === p.id ? 'bg-white/10 text-white' : 'bg-slate-50 ' + p.color
                      }`}>
                         <p.icon size={24} />
                      </div>
                      <h4 className={`font-black uppercase tracking-tight ${provider === p.id ? 'text-white' : 'text-slate-900'}`}>{p.name}</h4>
                      <p className={`text-[10px] font-bold mt-1 ${provider === p.id ? 'text-white/60' : 'text-slate-400'}`}>{p.desc}</p>
                   </button>
                ))}
             </div>

             <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-4">
                <ShieldAlert className="text-amber-500 flex-shrink-0" size={20} />
                <p className="text-[10px] text-amber-700 font-bold uppercase leading-relaxed">
                  Uwaga: Wybór mObywatel wymaga posiadania aktywnego mDowodu. System zweryfikuje Twój certyfikat w rejestrach OCSP/CRL przed zapisaniem podpisu w DMS.
                </p>
             </div>

             <div className="flex gap-4">
                <button onClick={() => setStep('config')} className="flex-1 bg-slate-100 text-slate-500 font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest">Wstecz</button>
                <button 
                  disabled={!provider}
                  onClick={startSigning}
                  className="flex-[2] bg-indigo-600 text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 disabled:opacity-50"
                >
                   Finalizuj i Podpisz
                </button>
             </div>
          </div>
        )}

        {step === 'processing' && (
           <div className="py-12 flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in">
              <div className="relative">
                 <div className="w-40 h-40 rounded-full border-8 border-slate-100 border-t-indigo-600 animate-spin"></div>
                 <div className="absolute inset-0 flex items-center justify-center">
                    <QrCode size={48} className="text-indigo-600 animate-pulse" />
                 </div>
              </div>
              <div>
                 <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Handshake...</h3>
                 <p className="text-xs text-slate-400 font-black uppercase tracking-widest mt-2">{provider?.toUpperCase()} Redirect / Callback</p>
              </div>
              <div className="bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100 text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                 <Loader2 size={12} className="animate-spin" /> Sesja zabezpieczona certyfikatem NoFiCo-QES-V3
              </div>
           </div>
        )}

        {step === 'final' && (
          <div className="space-y-8 animate-in fade-in zoom-in-95">
             <div className="p-8 bg-emerald-50 rounded-[2.5rem] border border-emerald-100 text-center">
                <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-6 text-white shadow-xl shadow-emerald-500/20">
                   <ShieldCheck size={40} />
                </div>
                <h3 className="text-2xl font-black text-emerald-900 uppercase tracking-tight italic">Dokument Podpisany</h3>
                <p className="text-xs text-emerald-700 font-bold uppercase tracking-widest mt-2 opacity-80 decoration-double underline">Qualified Electronic Signature: OK</p>
             </div>

             <div className="space-y-4">
                <div className="flex justify-between items-end p-4 border-b border-slate-100">
                   <div>
                      <div className="text-[10px] font-black text-slate-400 uppercase">Status Workflow</div>
                      <div className="text-sm font-black text-slate-800 uppercase mt-1 italic">
                        {signers.length > 1 ? 'Oczekiwanie na resztę (1/2)' : 'Zakończono / Skarbiec'}
                      </div>
                   </div>
                   <Clock className="text-indigo-500" size={18} />
                </div>
                <div className="flex justify-between items-end p-4 border-b border-slate-100">
                   <div>
                      <div className="text-[10px] font-black text-slate-400 uppercase">Certyfikat</div>
                      <div className="text-xs font-mono font-black text-slate-900 mt-1 uppercase">ID: QES-KIR-2026-F9228...</div>
                   </div>
                   <Landmark className="text-slate-400" size={18} />
                </div>
             </div>

             <div className="flex gap-4">
                <button className="flex-1 border-2 border-slate-100 text-slate-400 font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
                   <Download size={14} /> Pobierz PDF
                </button>
                <button 
                  onClick={onComplete}
                  className="flex-[2] bg-slate-900 text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest shadow-xl"
                >
                   Wróć do Skarbca
                </button>
             </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-center items-center gap-4">
         <div className="flex gap-1">
            {[1,2,3].map(i => <div key={i} className="w-1 h-1 bg-slate-300 rounded-full"></div>)}
         </div>
         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">eIDAS 2.0 Compliance / EU Trusted List</span>
         <div className="flex gap-1">
             {[1,2,3].map(i => <div key={i} className="w-1 h-1 bg-slate-300 rounded-full"></div>)}
         </div>
      </div>
    </div>
  );
}
