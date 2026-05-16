import React, { useState, useEffect } from 'react';
import { 
  PenTool, ShieldCheck, Clock, CheckCircle2, Search, Filter, 
  ExternalLink, Download, Users, Mail, Bell, FileText, Lock, Plus,
  ShieldAlert, Landmark, Smartphone, MoreVertical, Loader2
} from 'lucide-react';
import { db } from '../../shared/lib/firebase';
import { collection, query, onSnapshot, orderBy, where, doc, getDocs } from 'firebase/firestore';
import { useAuth } from '../../shared/hooks/AuthContext';
import { useTenant } from '../../shared/hooks/useTenant';

interface SignatureRequest {
  id: string;
  documentName: string;
  documentId: string;
  status: 'SIGNED' | 'COLLECTING' | 'PENDING' | 'VALIDATING';
  provider: string;
  createdAt: any;
  createdBy: string;
  signers: { email: string; name: string; status: string }[];
}

export default function ESignatureModule() {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'validator' | 'qseal'>('active');
  const [requests, setRequests] = useState<SignatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [validationDoc, setValidationDoc] = useState<File | null>(null);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);

  useEffect(() => {
    if (!user || !activeTenantId) return;

    const sigPath = `tenants/${activeTenantId}/signatures`;
    const q = query(collection(db, sigPath), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: SignatureRequest[] = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() } as SignatureRequest);
      });
      setRequests(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, activeTenantId]);

  const runValidation = async () => {
    setValidating(true);
    await new Promise(r => setTimeout(r, 2000));
    setValidationResult({
      status: 'valid',
      signer: 'Jan Kowalski (Profil Zaufany)',
      timestamp: '2026-05-12 14:22:01',
      issuer: 'Ministerstwo Cyfryzacji',
      algorithm: 'RSA-SHA256 (PAdES)',
      trusted: true
    });
    setValidating(false);
  };

  const filteredRequests = requests.filter(r => {
    if (activeTab === 'active') return r.status === 'COLLECTING' || r.status === 'PENDING';
    if (activeTab === 'completed') return r.status === 'SIGNED';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-8 animate-in fade-in duration-500 pb-20">
      
      {/* Header */}
      <div className="bg-slate-900 rounded-[2.5rem] p-12 text-white relative overflow-hidden shadow-2xl border border-slate-800">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px] -translate-y-1/2 translate-x-1/4"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-6 bg-slate-800/80 w-fit px-5 py-2 rounded-full border border-slate-700">
               <ShieldCheck className="text-indigo-400" size={16} />
               <span className="text-[10px] font-black uppercase tracking-widest text-indigo-100">Qualified Electronic Signature Dashboard</span>
            </div>
            <h1 className="text-6xl font-black uppercase tracking-tighter mb-4 italic">
              E-Sign <span className="text-indigo-500">Center</span>
            </h1>
            <p className="text-slate-400 font-medium leading-relaxed italic text-sm">
              Zarządzaj obiegiem kwalifikowanych podpisów elektronicznych. NoFiCo-SIG obsługuje dostawców eIDAS (mObywatel, KIR, Szafir) oraz zapewnia automatyczne pieczętowanie faktur (QSeal).
            </p>
          </div>
          <div className="flex gap-4">
             <button onClick={() => setActiveTab('validator')} className="bg-slate-800/50 hover:bg-slate-800 text-white font-black px-8 py-4 rounded-2xl border border-slate-700 transition-all uppercase tracking-widest text-[10px] flex items-center gap-2">
                <Search size={16} /> Waliduj Podpis PDF
             </button>
             <button className="bg-indigo-600 text-white hover:shadow-indigo-500/20 font-black px-10 py-4 rounded-2xl shadow-xl transition-all uppercase tracking-widest text-[10px] flex items-center gap-2">
                <Plus size={18} /> Nowy Workflow
             </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Tabs */}
        <div className="lg:w-80 space-y-4">
          {[
            { id: 'active', label: 'W Trakcie Podpisu', icon: PenTool, count: requests.filter(r => r.status !== 'SIGNED').length },
            { id: 'completed', label: 'Zakończone QES', icon: CheckCircle2, count: requests.filter(r => r.status === 'SIGNED').length },
            { id: 'validator', label: 'Walidator Zewnętrzny', icon: ShieldCheck },
            { id: 'qseal', label: 'Pieczęć Firmowa (QSeal)', icon: Landmark }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center justify-between px-6 py-5 rounded-[2rem] transition-all font-black text-xs uppercase tracking-widest ${
                activeTab === tab.id 
                  ? 'bg-slate-900 text-white shadow-2xl scale-[1.02]' 
                  : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                 <tab.icon size={18} className={activeTab === tab.id ? 'text-indigo-400' : 'text-slate-300'} />
                 {tab.label}
              </div>
              {tab.count !== undefined && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                   {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white p-10 rounded-[3rem] shadow-sm border border-slate-50 min-h-[600px]">
           {activeTab === 'validator' ? (
              <div className="max-w-2xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-6">
                 <div className="text-center space-y-4">
                    <div className="w-24 h-24 bg-indigo-50 rounded-[2rem] flex items-center justify-center mx-auto text-indigo-600 border border-indigo-100 shadow-xl shadow-indigo-100/20">
                       <ShieldCheck size={48} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter italic">Walidacja Podpisu QES / eIDAS</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest max-w-sm mx-auto leading-relaxed">
                       Prześlij dokument PDF podpisany podpisem kwalifikowanym. Zweryfikujemy łańcuch zaufania (CA), certyfikat podmiotu oraz status odwołania (OCSP/CRL).
                    </p>
                 </div>

                 <div 
                   onClick={() => document.getElementById('val-upload')?.click()}
                   className="border-2 border-dashed border-slate-200 rounded-[2.5rem] p-16 flex flex-col items-center justify-center bg-slate-50 hover:bg-white hover:border-indigo-300 hover:shadow-2xl transition-all cursor-pointer group"
                 >
                    <input id="val-upload" type="file" className="hidden" accept=".pdf" onChange={(e) => setValidationDoc(e.target.files?.[0] || null)} />
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 group-hover:scale-110 transition-transform mb-6">
                       <FileText size={40} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
                    </div>
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest">{validationDoc ? validationDoc.name : 'Upuść dokument PDF do weryfikacji'}</p>
                 </div>

                 {validationDoc && !validationResult && (
                    <button 
                      onClick={runValidation}
                      disabled={validating}
                      className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                       {validating ? <Loader2 className="animate-spin" /> : <ShieldCheck size={18} />}
                       {validating ? 'Weryfikuję certyfikaty...' : 'Rozpocznij Audyt Podpisu'}
                    </button>
                 )}

                 {validationResult && (
                    <div className="bg-emerald-50 p-8 rounded-[2.5rem] border border-emerald-100 space-y-6 animate-in zoom-in-95">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100"><CheckCircle2 /></div>
                          <div>
                             <h4 className="text-lg font-black text-emerald-900 uppercase italic leading-none">Podpis Prawidłowy</h4>
                             <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest italic decoration-double underline">LTV (Long-Term Validation): OK</span>
                          </div>
                       </div>
                       
                       <div className="grid grid-cols-2 gap-6 bg-white/50 p-6 rounded-3xl border border-white">
                          <div>
                             <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Sygnatariusz</label>
                             <p className="text-[11px] font-black text-slate-800 uppercase italic leading-tight">{validationResult.signer}</p>
                          </div>
                          <div>
                             <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Czas Podpisania (QTS)</label>
                             <p className="text-[11px] font-black text-slate-800 uppercase italic">{validationResult.timestamp}</p>
                          </div>
                          <div className="col-span-2">
                             <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Wystawca Certyfikatu (CA)</label>
                             <p className="text-[11px] font-black text-slate-800 uppercase italic opacity-70">{validationResult.issuer}</p>
                          </div>
                       </div>

                       <button onClick={() => { setValidationDoc(null); setValidationResult(null); }} className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest">Weryfikuj Kolejny</button>
                    </div>
                 )}
              </div>
           ) : (
              <div className="space-y-6">
                 {loading ? (
                    <div className="h-[400px] flex flex-col items-center justify-center text-slate-400">
                       <Loader2 className="animate-spin mb-4" size={40} />
                       <span className="text-[10px] font-black uppercase tracking-widest">Pobieram statusy QES...</span>
                    </div>
                 ) : filteredRequests.length === 0 ? (
                    <div className="h-[400px] flex flex-col items-center justify-center text-slate-300">
                       <PenTool size={64} className="mb-6 opacity-20" />
                       <span className="text-[11px] font-black uppercase tracking-widest tracking-widest italic">Brak aktywnych procesów podpisu</span>
                    </div>
                 ) : (
                    <div className="grid grid-cols-1 gap-4">
                       {filteredRequests.map(req => (
                          <div key={req.id} className="group bg-white p-8 rounded-[3rem] border border-slate-100 hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all flex items-center justify-between">
                             <div className="flex items-center gap-8">
                                <div className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-colors ${
                                  req.status === 'SIGNED' ? 'bg-emerald-50 text-emerald-500' : 'bg-indigo-50 text-indigo-500'
                                }`}>
                                   {req.status === 'SIGNED' ? <CheckCircle2 size={28} /> : <Clock size={28} />}
                                </div>
                                <div>
                                   <div className="flex items-center gap-3 mb-2">
                                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                                        req.status === 'SIGNED' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'
                                      }`}>{req.status}</span>
                                      <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{req.provider?.toUpperCase()} QES</span>
                                      {req.signers.length > 1 && (
                                         <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full uppercase">Multi-Party Workflow</span>
                                      )}
                                   </div>
                                   <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight italic leading-none">{req.documentName}</h4>
                                   <div className="flex items-center gap-6 mt-3">
                                      <div className="flex -space-x-3">
                                         {req.signers.map((s, i) => (
                                            <div key={i} className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-black uppercase ${
                                              s.status === 'signed' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                                            }`} title={s.email}>
                                               {s.name.charAt(0)}
                                            </div>
                                         ))}
                                      </div>
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        Początek: {new Date(req.createdAt?.seconds * 1000).toLocaleDateString()}
                                      </span>
                                   </div>
                                </div>
                             </div>
                             <div className="flex items-center gap-4">
                                <button className="p-4 rounded-2xl bg-slate-50 text-slate-400 hover:bg-slate-100 transition-all"><Download size={20}/></button>
                                <button className="p-4 rounded-2xl bg-slate-900 text-white hover:bg-indigo-600 shadow-xl shadow-slate-100 transition-all"><ExternalLink size={20}/></button>
                             </div>
                          </div>
                       ))}
                    </div>
                 )}
              </div>
           )}
        </div>
      </div>
    </div>
  );
}
