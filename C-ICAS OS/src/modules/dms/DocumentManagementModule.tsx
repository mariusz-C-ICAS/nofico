import React, { useState, useEffect } from 'react';
import { 
  FileText, Shield, EyeOff, Search, HardDrive, Lock, FileCheck, 
  ChevronRight, Upload, X, LayoutGrid, List, Filter, Plus, Wallet, 
  Camera, Scale, History, Trash2, Hash, ShieldCheck, Calendar, Bell, ExternalLink, Loader2
} from 'lucide-react';
import { db } from '../../shared/lib/firebase';
import { collection, query, onSnapshot, addDoc, serverTimestamp, orderBy, doc, updateDoc, getDocs, where } from 'firebase/firestore';
import { useAuth } from '../../shared/hooks/AuthContext';
import { useTenant } from '../../shared/hooks/useTenant';
import ScannerView from './ScannerView';
import LegalValidationWizard from './LegalValidationWizard';
import SignatureWizard from './SignatureWizard';
import { TimeTrackingDB } from '../timeTracking/services/offlineStorage';

const dexieDb = new TimeTrackingDB();

interface DMSSourceDoc {
  id: string;
  name: string;
  type: string;
  date: string;
  status: string;
  size: string;
  createdAt: any;
  isPrivate?: boolean;
  version?: number;
  hash?: string;
  retentionUntil?: string;
  reviewCycleMonths?: number;
  lastReviewAt?: string;
}

interface DocVersion {
  id: string;
  version: number;
  createdAt: any;
  createdBy: string;
  action: string;
  note: string;
}

export default function DocumentManagementModule() {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const [activeTab, setActiveTab] = useState<'vault' | 'private_pocket' | 'upload' | 'ksef_offline' | 'worm_archive' | 'legal_validator' | 'reviews'>('vault');
  const [layoutView, setLayoutView] = useState<'full' | 'compact'>('full');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSignatureWizard, setShowSignatureWizard] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DMSSourceDoc | null>(null);
  const [docVersions, setDocVersions] = useState<DocVersion[]>([]);
  
  const [documents, setDocuments] = useState<DMSSourceDoc[]>([]);
  const [localDocs, setLocalDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [newDoc, setNewDoc] = useState({
    name: '',
    type: 'Faktura KSeF',
    date: new Date().toISOString().split('T')[0],
    isPrivate: false,
    retentionYears: 5,
    reviewCycleMonths: 12
  });

  useEffect(() => {
    if (!user || !activeTenantId) return;
    const docPath = `documents`;
    const q = query(
      collection(db, docPath), 
      where('tenantId', '==', activeTenantId),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: DMSSourceDoc[] = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() } as DMSSourceDoc);
      });
      setDocuments(data);
      setLoading(false);
    });

    const loadLocalDocs = async () => {
      const items = await dexieDb.privatePocket.toArray();
      setLocalDocs(items);
    };
    loadLocalDocs();

    return () => unsubscribe();
  }, [user, activeTenantId, activeTab]);

  useEffect(() => {
    if (previewDoc && activeTenantId) {
      const loadVersions = async () => {
        const versionsRef = collection(db, `documents/${previewDoc.id}/versions`);
        const q = query(versionsRef, orderBy('version', 'desc'));
        const snapshot = await getDocs(q);
        const data: DocVersion[] = [];
        snapshot.forEach(v => data.push({ id: v.id, ...v.data() } as DocVersion));
        setDocVersions(data);
      };
      loadVersions();
    }
  }, [previewDoc, activeTenantId]);

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeTenantId) return;
    
    const mockHash = Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
    
    if (newDoc.isPrivate) {
      await dexieDb.privatePocket.add({
        name: newDoc.name,
        type: newDoc.type,
        createdAt: Date.now(),
        blurred: false,
        blob: new Blob(["mock content"], { type: "text/plain" })
      });
      setShowAddModal(false);
      setActiveTab('private_pocket');
      return;
    }

    try {
      const retentionDate = new Date();
      retentionDate.setFullYear(retentionDate.getFullYear() + newDoc.retentionYears);
      const docPath = `documents`;

      const docRef = await addDoc(collection(db, docPath), {
        tenantId: activeTenantId,
        name: newDoc.name,
        type: newDoc.type,
        date: newDoc.date,
        isPrivate: false,
        status: ({ 'Faktura KSeF': 'WORM Locked', 'Faktura od Dostawcy': 'Weryfikacja KSeF', 'Umowa': 'Przegląd Prawny', 'Karta Czasu Pracy': 'Oczekuje Akceptacji' } as Record<string,string>)[newDoc.type] ?? 'Oczekuje Cenzury',
        size: '124 KB',
        hash: mockHash,
        version: 1,
        retentionUntil: retentionDate.toISOString(),
        reviewCycleMonths: newDoc.reviewCycleMonths,
        lastReviewAt: new Date().toISOString(),
        summary: 'Dokument zarejestrowany w chmurze.',
        createdAt: serverTimestamp(),
        createdBy: user.uid
      });

      await addDoc(collection(db, `${docPath}/${docRef.id}/versions`), {
        version: 1,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        action: 'CREATED',
        note: 'Dokument zarejestrowany przez użytkownika'
      });

      setShowAddModal(false);
      setNewDoc({ name: '', type: 'Faktura KSeF', date: new Date().toISOString().split('T')[0], isPrivate: false, retentionYears: 5, reviewCycleMonths: 12 });
    } catch (error) {
      console.error(error);
    }
  };

  const tabs = [
    { id: 'vault', label: 'Skarbiec Firmowy', icon: FileText },
    { id: 'private_pocket', label: 'Prywatna Kieszeń', icon: Wallet },
    { id: 'upload', label: 'Skaner AI & Cenzura', icon: Camera },
    { id: 'legal_validator', label: 'Legal Validator', icon: Scale },
    { id: 'reviews', label: 'Poddane Rewizji', icon: Bell },
    { id: 'worm_archive', label: 'Archiwum WORM', icon: Lock },
  ];

  const filteredDocs = documents.filter(doc => {
    if (activeTab === 'vault' && doc.isPrivate) return false;
    if (activeTab === 'private_pocket') return false; 
    if (activeTab === 'worm_archive' && doc.status !== 'WORM Locked') return false;
    
    if (activeTab === 'reviews') {
      if (!doc.reviewCycleMonths || !doc.lastReviewAt) return false;
      const lastReview = new Date(doc.lastReviewAt);
      const nextReview = new Date(lastReview.setMonth(lastReview.getMonth() + doc.reviewCycleMonths));
      const today = new Date();
      // Pokazuj tylko te, które zbliżają się do terminu (30 dni) lub są po terminie
      const diffDays = (nextReview.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays <= 30;
    }

    if (searchQuery && !doc.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
      
      {/* Nagłówek */}
      <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl border border-slate-800">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="flex items-center gap-2 mb-4 bg-slate-800/50 w-fit px-4 py-1.5 rounded-full border border-slate-700/50">
               <Shield className="text-indigo-400" size={14} />
               <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Legal Grade Compliance</span>
            </div>
            <h1 className="text-5xl font-black uppercase tracking-tighter mb-4">
              DMS <span className="text-indigo-500">&</span> Legal Vault
            </h1>
            <p className="text-slate-400 font-medium max-w-2xl leading-relaxed text-sm italic">
              Document Management System zintegrowany z polityką retencyjną Cloud WORM.
              Gwarancja niezmienności danych i audytowalność każdej wersji dokumentu.
            </p>
          </div>
          <div className="flex gap-4">
             <button onClick={() => setShowAddModal(true)} className="bg-white text-slate-900 hover:bg-indigo-50 font-black px-8 py-4 rounded-2xl flex items-center gap-3 shadow-xl transition-all uppercase tracking-widest text-xs">
                <Plus size={18} /> Nowy Dokument
             </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-1/4">
          <div className="bg-white rounded-[2.5rem] p-4 shadow-sm border border-slate-100 flex lg:flex-col gap-2 sticky top-6">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              let count = 0;
              if (tab.id === 'vault') count = documents.filter(d => !d.isPrivate).length;
              if (tab.id === 'private_pocket') count = localDocs.length;
              if (tab.id === 'worm_archive') count = documents.filter(d => d.status === 'WORM Locked').length;
              if (tab.id === 'reviews') count = documents.filter(d => d.reviewCycleMonths).length;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center justify-between px-5 py-4 rounded-2xl transition-all font-bold text-sm whitespace-nowrap ${
                    isActive ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} /> {tab.label}
                  </div>
                  {count > 0 && (
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isActive ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:w-3/4 w-full">
           {activeTab === 'upload' ? (
             <ScannerView onUploadSuccess={() => setActiveTab('vault')} />
           ) : activeTab === 'legal_validator' ? (
             <LegalValidationWizard onValidated={() => setActiveTab('vault')} />
           ) : (
             <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 min-h-[600px]">
                <div className="flex justify-between items-center mb-8 pb-6 border-b border-slate-50">
                   <div>
                      <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3 italic">
                         {activeTab === 'worm_archive' ? <Lock className="text-rose-500" /> : activeTab === 'private_pocket' ? <Wallet className="text-indigo-500" /> : <FileText className="text-indigo-500" />} 
                         {activeTab === 'worm_archive' ? 'Archiwum WORM' : activeTab === 'private_pocket' ? 'Lokalna Kieszeń (Offline)' : activeTab === 'reviews' ? 'Przeglądy Cykliczne' : 'Zasoby Skarbca'}
                      </h2>
                      <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">
                         {activeTab === 'reviews' ? 'Dokumenty wymagające okresowej weryfikacji compliance' : 'Wszystkie pliki są wersjonowane i audytowane w czasie rzeczywistym'}
                      </p>
                   </div>
                   
                   <div className="flex gap-2">
                       <button onClick={() => setLayoutView('full')} className={`p-2 rounded-xl border ${layoutView === 'full' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100'}`}><LayoutGrid size={18}/></button>
                       <button onClick={() => setLayoutView('compact')} className={`p-2 rounded-xl border ${layoutView === 'compact' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100'}`}><List size={18}/></button>
                   </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                   {(activeTab === 'private_pocket' ? localDocs : filteredDocs).map((doc) => (
                      <div 
                        key={doc.id} 
                        onClick={() => setPreviewDoc(doc)}
                        className="group bg-white p-6 rounded-[2rem] border border-slate-100 hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all cursor-pointer flex items-center justify-between"
                      >
                         <div className="flex items-center gap-5">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${activeTab === 'worm_archive' ? 'bg-rose-50 text-rose-500' : activeTab === 'private_pocket' ? 'bg-indigo-50 text-indigo-500' : 'bg-slate-50 text-slate-600'}`}>
                               {activeTab === 'worm_archive' ? <Lock size={24} /> : activeTab === 'private_pocket' ? <EyeOff size={24} /> : <FileText size={24} />}
                            </div>
                            <div>
                               <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{doc.type}</span>
                                  <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                  <span className="text-[10px] font-bold text-indigo-500 uppercase">Wersja {doc.version || 1}</span>
                                  {doc.reviewCycleMonths && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 rounded-full uppercase flex items-center gap-1"><Calendar size={10} /> Cykl: {doc.reviewCycleMonths}m</span>}
                               </div>
                               <h4 className="font-black text-slate-800 text-lg uppercase tracking-tight">{doc.name}</h4>
                               <div className="flex items-center gap-4 mt-2 text-[10px] font-bold text-slate-500 uppercase">
                                  <span className="flex items-center gap-1"><History size={12}/> {doc.date || new Date(doc.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                                  <span className="flex items-center gap-1"><Hash size={12}/> {doc.hash?.substring(0,8) || 'NoID'}</span>
                               </div>
                            </div>
                         </div>
                         <div className="flex items-center gap-3">
                            {activeTab === 'private_pocket' ? (
                               <button className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all flex items-center gap-2"><Plus size={14} /> Transfer</button>
                            ) : (
                               <div className="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-indigo-500 group-hover:border-indigo-100 transition-all"><ChevronRight size={20} /></div>
                            )}
                         </div>
                      </div>
                   ))}
                </div>
             </div>
           )}
        </div>
      </div>

      {/* Modal Add Document */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl p-10 border border-slate-100 animate-in zoom-in-95">
             <div className="flex justify-between items-start mb-8">
                <div>
                   <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight italic">Nowy Depozyt Cyfrowy</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Klasyfikacja i Retention Policy</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={24}/></button>
             </div>

             <form onSubmit={handleAddDocument} className="space-y-6">
                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nazwa Dokumentu</label>
                   <input type="text" value={newDoc.name} onChange={e => setNewDoc(p => ({ ...p, name: e.target.value }))} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-slate-900 focus:ring-2 focus:ring-indigo-500 font-black text-xs uppercase" required />
                </div>

                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Typ Dokumentu</label>
                   <select
                     value={newDoc.type}
                     onChange={e => setNewDoc(p => ({ ...p, type: e.target.value }))}
                     className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-slate-900 focus:ring-2 focus:ring-indigo-500 font-black text-xs uppercase appearance-none"
                   >
                     <option value="Faktura KSeF">Faktura KSeF</option>
                     <option value="Faktura od Dostawcy">Faktura od Dostawcy (VENDOR_INVOICE)</option>
                     <option value="Umowa">Umowa / Kontrakt (CONTRACT)</option>
                     <option value="Karta Czasu Pracy">Karta Czasu Pracy (TIMESHEET)</option>
                     <option value="Dokument Prawny">Dokument Prawny</option>
                     <option value="Inne">Inne</option>
                   </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Retencja (Lata)</label>
                      <input type="number" value={newDoc.retentionYears} onChange={e => setNewDoc(p => ({ ...p, retentionYears: parseInt(e.target.value) }))} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-slate-900 focus:ring-2 focus:ring-indigo-500 font-bold text-xs" />
                   </div>
                   <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Rewizja (Miesiące)</label>
                      <input type="number" value={newDoc.reviewCycleMonths} onChange={e => setNewDoc(p => ({ ...p, reviewCycleMonths: parseInt(e.target.value) }))} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-slate-900 focus:ring-2 focus:ring-indigo-500 font-bold text-xs" />
                   </div>
                </div>

                <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
                   <label className="flex items-start gap-4 cursor-pointer">
                      <div className="flex-1">
                         <h4 className="text-[11px] font-black text-indigo-900 uppercase">Kieszeń Prywatna (Offline)</h4>
                         <p className="text-[10px] text-indigo-700 font-bold mt-1 uppercase tracking-tight opacity-70 leading-relaxed">Plik pozostanie wyłącznie na tym urządzeniu (Edge Storage / IndexedDB).</p>
                      </div>
                      <input type="checkbox" checked={newDoc.isPrivate} onChange={e => setNewDoc(p => ({ ...p, isPrivate: e.target.checked }))} className="w-6 h-6 rounded-lg text-indigo-600 cursor-pointer" />
                   </label>
                </div>

                <button type="submit" className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-500/5 uppercase text-[11px] tracking-widest transition-all">Utwórz Depozyt Cyfrowy</button>
             </form>
          </div>
        </div>
      )}

      {/* Signature Wizard Modal Overlay */}
      {showSignatureWizard && previewDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
           <div className="relative w-full max-w-2xl">
              <button 
                onClick={() => setShowSignatureWizard(false)}
                className="absolute -top-4 -right-4 bg-white p-2 rounded-full shadow-xl text-slate-400 hover:text-red-500 transition-colors z-[70] border border-slate-100"
              >
                <X size={20}/>
              </button>
              <SignatureWizard 
                documentId={previewDoc.id}
                documentName={previewDoc.name}
                onComplete={() => {
                  setShowSignatureWizard(false);
                  setPreviewDoc(null);
                }}
              />
           </div>
        </div>
      )}

      {/* Modal Preview with Versioning History */}
      {previewDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl h-[85vh] overflow-hidden border border-slate-200 flex flex-col md:flex-row animate-in zoom-in-95">
              <div className="flex-1 bg-slate-100 relative flex flex-col">
                 <div className="p-8 bg-white/50 backdrop-blur-2xl flex justify-between items-center border-b border-slate-200">
                    <div>
                       <h3 className="text-xl font-black text-slate-800 uppercase italic leading-none tracking-tight">{previewDoc.name}</h3>
                       <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-2 px-3 py-1 bg-white rounded-lg border border-slate-100 shadow-sm inline-block">{previewDoc.type}</span>
                    </div>
                    <button onClick={() => setPreviewDoc(null)} className="p-3 hover:bg-white rounded-2xl text-slate-400 shadow-sm border border-slate-100 md:hidden"><X size={20}/></button>
                 </div>
                 <div className="flex-1 flex flex-col items-center justify-center overflow-hidden p-10 text-center">
                    <div className="bg-white p-12 rounded-[3rem] shadow-2xl border border-slate-200 mb-8 transform hover:scale-105 transition-transform cursor-pointer">
                      <FileText size={120} className="text-slate-200" />
                    </div>
                    <div className="space-y-2">
                       <p className="text-xs font-black text-slate-900 uppercase tracking-widest italic">Szyfrowany Podgląd WORM</p>
                       <p className="text-[10px] text-slate-400 font-bold max-w-xs leading-relaxed">Dostęp do pliku jest autoryzowany przez biometrię lokalną lub klucz sprzętowy.</p>
                    </div>
                    <div className="mt-10 flex gap-4">
                       <button 
                         onClick={() => setShowSignatureWizard(true)} 
                         className="bg-white text-slate-900 px-8 py-4 rounded-2xl border border-slate-200 shadow-sm text-[11px] font-black uppercase flex items-center gap-3 hover:bg-slate-50 transition-all"
                       >
                          <Scale size={16} className="text-indigo-500" /> Podpisz e-Podpis
                       </button>
                       <button className="bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-xl text-[11px] font-black uppercase flex items-center gap-3 hover:bg-indigo-600 transition-all">
                          <Plus size={16} /> Nowa Wersja
                       </button>
                    </div>
                 </div>
                 <div className="p-8 bg-white border-t border-slate-200 flex justify-between items-center">
                    <div className="flex gap-12">
                       <div><div className="text-[9px] font-black text-slate-400 uppercase mb-2">Hash SHA-256 (WORM)</div><div className="text-xs font-mono font-black text-slate-800 italic">{previewDoc.hash?.substring(0,24)}...</div></div>
                       <div><div className="text-[9px] font-black text-slate-400 uppercase mb-2">Retencja do:</div><div className="text-xs font-black text-rose-500 uppercase italic tracking-tighter">{new Date(previewDoc.retentionUntil || '').toLocaleDateString()}</div></div>
                    </div>
                 </div>
              </div>

              <div className="w-full md:w-[28rem] bg-slate-50 border-l border-slate-200 flex flex-col">
                 <div className="p-8 border-b border-slate-200 flex justify-between items-center bg-white">
                    <div>
                       <h4 className="text-sm font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3 italic"><History size={20} className="text-indigo-600" /> Historia Wersji</h4>
                       <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Niezmienny Audyt Immutable</p>
                    </div>
                    <button onClick={() => setPreviewDoc(null)} className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 hidden md:block transition-colors"><X size={24}/></button>
                 </div>
                 <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
                    {docVersions.map((v, i) => (
                       <div key={v.id} className={`p-6 rounded-3xl border relative overflow-hidden group transition-all hover:scale-[1.02] ${i === 0 ? 'bg-white border-indigo-200 shadow-xl shadow-indigo-500/5' : 'bg-slate-50/50 border-slate-200 opacity-60 hover:opacity-100'}`}>
                          {i === 0 && <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[8px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest">Active</div>}
                          <div className="flex justify-between items-center mb-4">
                             <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${i === 0 ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}><Hash size={14} /></div>
                                <span className="text-[11px] font-black text-slate-900 uppercase">Wersja {v.version}</span>
                             </div>
                             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{v.createdAt?.toDate ? v.createdAt.toDate().toLocaleString() : 'Now'}</span>
                          </div>
                          <div className="text-[11px] font-black text-slate-800 uppercase tracking-tight mb-2 flex items-center gap-2">
                             <ShieldCheck size={14} className="text-indigo-500" /> {v.action}
                          </div>
                          <p className="text-[10px] text-slate-500 font-bold leading-relaxed border-l-2 border-slate-200 pl-3 py-1">"{v.note}"</p>
                          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                             <div className="text-[9px] font-black text-slate-400 uppercase">Actor: {v.createdBy.substring(0,12)}...</div>
                             <button className="text-[9px] font-black text-indigo-600 uppercase hover:underline">Verify Hash</button>
                          </div>
                       </div>
                    ))}
                    {docVersions.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 py-20 grayscale opacity-50">
                        <Loader2 className="animate-spin mb-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Loading Audit Trail...</span>
                      </div>
                    )}
                 </div>
                 <div className="p-8 border-t border-slate-200 bg-white shadow-inner">
                    <button className="w-full bg-slate-900 hover:bg-emerald-600 text-white font-black py-5 rounded-[1.5rem] text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-2xl shadow-indigo-100">
                       <ShieldCheck size={20} /> Weryfikuj Integralność Skarbca
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
