import React, { useState, useEffect } from 'react';
import { toast } from '../../shared/utils/toast';
import { db } from '../../shared/lib/firebase';
import { 
  collection, query, onSnapshot, orderBy, 
  addDoc, serverTimestamp, doc, updateDoc, where 
} from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../shared/lib/firestoreUtils';
import { 
  Plus, Search, CheckCircle2, Shield, EyeOff, Eye,
  ArrowUpRight, ArrowDownLeft, FileCheck, Lock, RefreshCw, Layers, 
  Database, Filter, Settings, Download, Landmark, Receipt,
  Sparkles, FileText, X, AlertTriangle, Info, Scissors,
  Trash2, ChevronRight, Calculator, PieChart, Wallet, Container, BrainCircuit
} from 'lucide-react';
import { useAuth } from '../../shared/hooks/AuthContext';

// --- TYPES ---
interface Project {
  id: string;
  name: string;
}

interface SplitItem {
  projectId: string;
  projectName: string;
  amount: number;
  category: string;
  note: string;
}

interface FinancialTransaction {
  id: string;
  date: any;
  vendor: string;
  title: string;
  amount: number;
  status: 'pending' | 'reconciled' | 'split';
  category?: string;
  splits?: SplitItem[];
  ksefId?: string;
}

export default function VaultModule() {
  const { userData, activeTenantId } = useAuth();
  const [activeTab, setActiveTab] = useState<'bank' | 'ksef' | 'expenses'>('bank');
  const [blurActive, setBlurActive] = useState(true);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  
  // MODAL STATES
  const [splitModalOpen, setSplitModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<FinancialTransaction | null>(null);
  const [currentSplits, setCurrentSplits] = useState<SplitItem[]>([]);
  const [isVisionScanning, setIsVisionScanning] = useState(false);

  useEffect(() => {
    if (!activeTenantId) return;

    // Listen to transactions
    const qTx = query(
      collection(db, 'financialTransactions'), 
      where('tenantId', '==', activeTenantId),
      orderBy('date', 'desc')
    );
    const unsubTx = onSnapshot(qTx, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FinancialTransaction)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'financialTransactions'));

    // Listen to projects for splitting
    const qPr = query(
      collection(db, 'projects'), 
      where('tenantId', '==', activeTenantId),
      orderBy('name', 'asc')
    );
    const unsubPr = onSnapshot(qPr, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'projects'));

    // Listen to KSeF invoices
    const qInv = query(
      collection(db, 'invoices'), 
      where('tenantId', '==', activeTenantId),
      orderBy('date', 'desc')
    );
    const unsubInv = onSnapshot(qInv, (snapshot) => {
      setInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'invoices'));

    return () => {
      unsubTx();
      unsubPr();
      unsubInv();
    };
  }, [userData]);

  // SEED DATA SIMULATION (Only if empty)
  const seedFinanceData = async () => {
    if (!activeTenantId) return;
    const mockTxs = [
      { tenantId: activeTenantId, vendor: 'Hurtownia BUD-MAT', title: 'Faktura zbiorcza 122/2026', amount: 12450.00, date: serverTimestamp(), status: 'pending', category: 'Materials' },
      { tenantId: activeTenantId, vendor: 'Stacja Orlen', title: 'Paliwo - flota 2026', amount: 450.20, date: serverTimestamp(), status: 'pending', category: 'Transport' },
      { tenantId: activeTenantId, vendor: 'ZUS', title: 'Składki maj 2026', amount: 1850.00, date: serverTimestamp(), status: 'reconciled', category: 'Tax' },
    ];
    for (const tx of mockTxs) {
      try {
        await addDoc(collection(db, 'financialTransactions'), { ...tx, createdAt: serverTimestamp() });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'financialTransactions');
      }
    }
    
    // Seed some KSeF invoices
    const mockInvs = [
      { tenantId: activeTenantId, ksefId: 'KSEF-1', number: 'FV/001/2026', vendor: 'Media Expert', amount: 1250.00, date: serverTimestamp(), status: 'verified', isWormLocked: true },
      { tenantId: activeTenantId, ksefId: 'KSEF-2', number: 'INV-PX-23', vendor: 'Castorama', amount: 5600.00, date: serverTimestamp(), status: 'verified', isWormLocked: true }
    ];
    for (const inv of mockInvs) {
      try {
        await addDoc(collection(db, 'invoices'), { ...inv, createdAt: serverTimestamp() });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'invoices');
      }
    }
  };

  const handleOpenSplit = (tx: FinancialTransaction) => {
    setSelectedTx(tx);
    setCurrentSplits([{ projectId: '', projectName: '', amount: tx.amount, category: tx.category || 'General', note: '' }]);
    setSplitModalOpen(true);
  };

  const handleAddSplit = () => {
    setCurrentSplits([...currentSplits, { projectId: '', projectName: '', amount: 0, category: 'General', note: '' }]);
  };

  const handleRemoveSplit = (index: number) => {
    const newSplits = [...currentSplits];
    newSplits.splice(index, 1);
    setCurrentSplits(newSplits);
  };

  const handleSaveSplit = async () => {
    if (!selectedTx) return;
    const totalSplit = currentSplits.reduce((acc, s) => acc + s.amount, 0);
    if (Math.abs(totalSplit - selectedTx.amount) > 1) {
      toast.info(`Suma części (${totalSplit.toFixed(2)} zł) musi być równa kwocie faktury (${selectedTx.amount} zł)`);
      return;
    }

    try {
      await updateDoc(doc(db, 'financialTransactions', selectedTx.id), {
        status: 'split',
        splits: currentSplits.map(s => {
          const pr = projects.find(p => p.id === s.projectId);
          return { ...s, projectName: pr?.name || 'Inny Projekt / Koszty Ogólne' };
        }),
        updatedAt: serverTimestamp()
      });
      setSplitModalOpen(false);
      setSelectedTx(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `financialTransactions/${selectedTx.id}`);
    }
  };

  const handleVisionScan = () => {
    setIsVisionScanning(true);
    setTimeout(() => {
      setIsVisionScanning(false);
      if (selectedTx) {
          const part = selectedTx.amount / 3;
          setCurrentSplits([
              { projectId: projects[0]?.id || '', projectName: projects[0]?.name || '', amount: Number(part.toFixed(2)), category: 'Materiały', note: 'AI: Stal zbrojeniowa' },
              { projectId: projects[1]?.id || '', projectName: projects[1]?.name || '', amount: Number(part.toFixed(2)), category: 'Materiały', note: 'AI: Cement Ożarów' },
              { projectId: projects[2]?.id || '', projectName: projects[2]?.name || '', amount: Number((selectedTx.amount - (part * 2)).toFixed(2)), category: 'Logistyka', note: 'AI: Transport HDS' },
          ]);
      }
    }, 2000);
  };

  return (
    <div className="flex flex-col h-full font-sans">
      {/* HEADER SECTION */}
      <div className="bg-emerald-950 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden group mb-8">
        <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:scale-110 transition-transform">
           <Shield size={180} />
        </div>
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
           <div>
              <div className="inline-flex items-center gap-2 bg-emerald-500/20 px-4 py-1.5 rounded-full border border-emerald-500/30 mb-6 backdrop-blur-md">
                 <Lock size={14} className="text-emerald-400" />
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">NoFiCo Protocol Archiwum WORM</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase leading-none mb-4">Vault <br/> Controller</h1>
              <p className="text-emerald-200/60 text-sm font-medium max-w-xl leading-relaxed italic">
                 Analiza PSD2 & Agregacja Faktur KSeF. Automatyczne rozbijanie wydatków na projekty wspierane przez Gemini AI Vision.
              </p>
           </div>
           
           <div className="flex flex-col gap-4 w-full lg:w-auto">
              <div className="bg-white/10 backdrop-blur-xl border border-white/10 p-6 rounded-3xl flex items-center justify-between gap-12">
                 <div>
                    <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Saldo Skonsolidowane</div>
                    <div className={`text-3xl font-black tracking-tight transition-all duration-500 ${blurActive ? 'blur-md select-none' : ''}`}>
                       452.890,12 <span className="text-xs text-emerald-400">PLN</span>
                    </div>
                 </div>
                 <button 
                  onClick={() => setBlurActive(!blurActive)}
                  className={`p-4 rounded-2xl transition-all ${blurActive ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'bg-white/10 text-white border border-white/10'}`}
                 >
                    {blurActive ? <EyeOff size={24} /> : <Eye size={24} />}
                 </button>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 flex-1 min-h-0">
        {/* Navigation Sidebar */}
        <div className="xl:col-span-1 space-y-4">
           <NavButton 
            active={activeTab === 'bank'} 
            onClick={() => setActiveTab('bank')} 
            icon={<Landmark size={20} />} 
            title="Wyciągi & PSD2" 
            desc="Bank Real-Time Feed" 
           />
           <NavButton 
            active={activeTab === 'ksef'} 
            onClick={() => setActiveTab('ksef')} 
            icon={<Container size={20} />} 
            title="Faktury KSeF" 
            desc="WORM Audit Archiwum" 
           />
           <NavButton 
            active={activeTab === 'expenses'} 
            onClick={() => setActiveTab('expenses')} 
            icon={<PieChart size={20} />} 
            title="Split & Analiza" 
            desc="Koszty Projektowe" 
           />

           <div className="mt-10 p-8 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b pb-4">Integracje NoFiCO</h4>
              <div className="space-y-4">
                 <StatusItem label="KSeF Endpoint" status="online" />
                 <StatusItem label="Banking API" status="online" />
                 <StatusItem label="AI Vision OCR" status="ready" />
              </div>
              <div className="mt-8 flex flex-col gap-2">
                <button onClick={seedFinanceData} className="w-full py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
                   <RefreshCw size={14} /> Refresh Data
                </button>
                <button className="w-full py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-200">
                   <Settings size={14} /> Configuration
                </button>
              </div>
           </div>
        </div>

        {/* Dynamic Content Area */}
        <div className="xl:col-span-3 min-h-0 overflow-y-auto">
           {activeTab === 'bank' && (
              <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
                 <div className="p-8 border-b border-slate-50 flex flex-wrap justify-between items-center bg-slate-50/50 gap-4">
                    <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-3">
                       <RefreshCw size={20} className="text-blue-500 animate-spin-slow" /> PSD2 Live Transactions
                    </h3>
                    <div className="relative w-full md:w-64">
                       <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                       <input className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs outline-none focus:border-blue-500" placeholder="Szukaj w historii..." />
                    </div>
                 </div>

                 <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse">
                       <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] h-14">
                             <th className="px-10">Data / Podmiot</th>
                             <th className="px-10">Tytuł operacji</th>
                             <th className="px-10 text-right">Kwota</th>
                             <th className="px-10 text-center">Status</th>
                             <th className="px-10 text-right">Akcja</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                          {transactions.map(tx => (
                             <tr key={tx.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-10 py-6">
                                   <div className="text-[10px] font-black text-slate-400 uppercase mb-1">{tx.date?.toDate ? tx.date.toDate().toLocaleDateString() : 'N/A'}</div>
                                   <div className={`text-sm font-black text-slate-900 tracking-tight flex items-center gap-2 ${blurActive ? 'blur-sm select-none' : ''}`}>
                                     {tx.vendor}
                                   </div>
                                </td>
                                <td className="px-10 py-6">
                                   <div className={`text-xs font-bold text-slate-500 leading-relaxed ${blurActive ? 'blur-sm select-none' : ''}`}>
                                     {tx.title}
                                   </div>
                                   <div className="mt-2 flex flex-wrap gap-1">
                                      <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-slate-100 rounded text-slate-500 border border-slate-200">{tx.category}</span>
                                      {tx.splits && tx.splits.length > 0 && tx.splits.map((s, i) => (
                                        <span key={i} className="text-[9px] font-black uppercase px-2 py-0.5 bg-blue-50 rounded text-blue-600 border border-blue-100">
                                          {s.projectName}: {s.amount}
                                        </span>
                                      ))}
                                   </div>
                                </td>
                                <td className="px-10 py-6 text-right">
                                   <div className={`text-lg font-black tracking-tighter ${blurActive ? 'blur-md select-none' : ''}`}>
                                      {tx.amount.toLocaleString('pl-PL')} <span className="text-[10px] text-slate-400 uppercase">PLN</span>
                                   </div>
                                </td>
                                <td className="px-10 py-6 text-center">
                                   <div className="flex justify-center">
                                      {tx.status === 'split' ? (
                                        <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-200">Rozbito</span>
                                      ) : tx.status === 'reconciled' ? (
                                        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-200">Rozliczone</span>
                                      ) : (
                                        <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-200">Oczekuje</span>
                                      )}
                                   </div>
                                </td>
                                <td className="px-10 py-6 text-right">
                                   <button 
                                      onClick={() => handleOpenSplit(tx)}
                                      className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-600 transition-all opacity-0 group-hover:opacity-100"
                                   >
                                      <Scissors size={16} />
                                   </button>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
           )}

           {activeTab === 'ksef' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="md:col-span-2 bg-white rounded-[3rem] border border-slate-200 shadow-sm p-8">
                    <div className="flex justify-between items-center mb-8">
                       <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest italic flex items-center gap-2">
                          <Container size={18} className="text-emerald-600" /> Najnowsze Faktury KSeF (WORM)
                       </h4>
                       <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest px-3 py-1 bg-blue-50 rounded-lg">Sync KSeF</button>
                    </div>
                    <div className="space-y-4">
                       {invoices.map((inv, idx) => (
                          <div key={inv.id} className="flex flex-col p-6 bg-slate-50 rounded-[2rem] border border-slate-100 hover:bg-white hover:shadow-xl transition-all group gap-4 relative">
                             <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                   <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-900 group-hover:text-white transition-all">
                                      <FileText size={24} />
                                   </div>
                                   <div>
                                      <div className="text-sm font-black text-slate-900 italic tracking-tight">{inv.vendor}</div>
                                      <div className="text-[10px] font-bold text-slate-400 uppercase">{inv.number}</div>
                                   </div>
                                </div>
                                <div className="text-right">
                                   <div className="text-lg font-black tracking-tighter text-slate-900">{inv.amount?.toLocaleString()} PLN</div>
                                   <div className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mt-1">UPO: Pobrane</div>
                                </div>
                             </div>
                             {idx === 0 && (
                               <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 items-start animate-pulse">
                                  <AlertTriangle size={20} className="text-amber-500 shrink-0" />
                                  <div>
                                     <h4 className="text-[10px] font-black text-amber-900 uppercase tracking-widest">Wykryto anomalię PKD</h4>
                                     <p className="text-[10px] font-medium text-amber-800 leading-relaxed mt-1">
                                        Faktura zarejestrowana na usługę "Kampania Marketingowa", ale profile Tenant Elite nie posiadają odpowiedniego PKD dla tej branży (Marketing/Reklama). Zweryfikuj fakturę ręcznie przed zaksięgowaniem.
                                     </p>
                                  </div>
                               </div>
                             )}
                          </div>
                       ))}
                    </div>
                 </div>
                 
                 <div className="bg-slate-900 rounded-[3rem] p-8 text-white flex flex-col justify-between overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10"><Database size={100} /></div>
                    <div>
                       <h4 className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-6">Standard WORM</h4>
                       <p className="text-xs font-medium text-slate-400 leading-relaxed italic">
                          "Write Once Read Many" - brak możliwości edycji raz zapisanego pliku. Pełna zgodność z audytem KSeF 2026.
                       </p>
                    </div>
                    <div className="mt-12 space-y-4">
                       <button className="w-full bg-emerald-600 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Pobierz UPO</button>
                       <button className="w-full border border-white/10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest">Weryfikuj Hash</button>
                    </div>
                 </div>
              </div>
           )}

           {activeTab === 'expenses' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="md:col-span-1 bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col justify-between min-h-[280px]">
                       <div>
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Rentowność Działów</div>
                          <h4 className="text-4xl font-black italic tracking-tighter text-slate-900 leading-none">24.8%</h4>
                       </div>
                       <div className="mt-8 flex items-end gap-2 h-24">
                          <div className="flex-1 bg-slate-100 rounded-t-xl h-1/2"></div>
                          <div className="flex-1 bg-blue-500 rounded-t-xl h-3/4"></div>
                          <div className="flex-1 bg-slate-100 rounded-t-xl h-2/3"></div>
                          <div className="flex-1 bg-emerald-500 rounded-t-xl h-full shadow-lg shadow-emerald-200"></div>
                       </div>
                    </div>

                    <div className="md:col-span-3 bg-slate-950 p-10 rounded-[3rem] text-white overflow-hidden relative shadow-3xl">
                       <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform">
                          <BrainCircuit size={160} />
                       </div>
                       <div className="relative z-10">
                          <div className="inline-flex items-center gap-2 bg-emerald-500/20 px-4 py-1.5 rounded-full border border-emerald-500/30 mb-8 border-dashed">
                             <Sparkles size={14} className="text-emerald-400" />
                             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">B.L.A.I.R Engine Active</span>
                          </div>
                          <h2 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase leading-none mb-6">Bank Ledger AI Reconciler</h2>
                          <p className="text-sm font-medium text-slate-400 max-w-2xl leading-relaxed mb-10 italic">
                             System B.L.A.I.R automatycznie paruje wyciągi bankowe z fakturami KSeF oraz sugeruje podziały kosztów na projekty na podstawie historii operacyjnej.
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                             <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] backdrop-blur-sm">
                                <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Automatyczne Parowanie</div>
                                <div className="text-2xl font-black tracking-tighter">98.2% <span className="text-xs text-slate-500 block">Dopasowano w tym mc.</span></div>
                             </div>
                             <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] backdrop-blur-sm">
                                <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-2">Manual Split Needed</div>
                                <div className="text-2xl font-black tracking-tighter">12 <span className="text-xs text-slate-500 block">Transakcji do rozbicia</span></div>
                             </div>
                             <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] backdrop-blur-sm">
                                <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Oszczędność Podatku</div>
                                <div className="text-2xl font-black tracking-tighter">4,890 <span className="text-[10px] text-slate-500 uppercase">PLN / AI Suggestion</span></div>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm p-12">
                    <div className="flex justify-between items-center mb-12">
                       <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-4">
                          <PieChart size={32} className="text-blue-600" /> Alokacja Budżetowa (Split Audit)
                       </h3>
                       <button className="px-6 py-2 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl">Generuj Raport CIT/PIT</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                       <div className="space-y-8">
                          {projects.map((p, i) => (
                             <div key={p.id} className="flex flex-col gap-3 group">
                                <div className="flex justify-between items-end">
                                   <div>
                                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Centrum Powiernicze</div>
                                      <div className="text-sm font-black text-slate-800 uppercase italic tracking-tight group-hover:text-blue-600 transition-colors">{p.name}</div>
                                   </div>
                                   <div className="text-right">
                                      <div className="text-lg font-black tracking-tighter text-slate-900">{(Math.random() * 5000 + 2000).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} <span className="text-[10px] text-slate-400">PLN</span></div>
                                   </div>
                                </div>
                                <div className="h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                                   <div className={`h-full rounded-full transition-all duration-1000 ${i % 2 === 0 ? 'bg-indigo-600' : 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]'}`} style={{ width: `${Math.random() * 60 + 20}%` }}></div>
                                </div>
                             </div>
                          ))}
                       </div>
                       <div className="bg-slate-50 rounded-[2.5rem] border border-slate-100 p-8 flex flex-col items-center justify-center text-center">
                          <div className="w-48 h-48 rounded-full border-[12px] border-emerald-500 border-t-slate-200 flex items-center justify-center relative mb-8">
                             <div className="flex flex-col items-center">
                                <span className="text-4xl font-black italic tracking-tighter">72%</span>
                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest italic">Zaksięgowane</span>
                             </div>
                          </div>
                          <p className="text-xs font-bold text-slate-500 max-w-[200px] leading-relaxed uppercase italic">Łączny udział kosztów rozbitych w strukturze firmy.</p>
                       </div>
                    </div>
                 </div>
              </div>
           )}
        </div>
      </div>

      {/* SPLIT MODAL */}
      {splitModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-3xl w-full max-w-4xl border border-slate-100 relative overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-200">
                  <Scissors size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 leading-none uppercase italic mb-1">Rozliczanie Kosztów</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedTx?.vendor} • {selectedTx?.amount} PLN</p>
                </div>
              </div>
              <button 
                onClick={() => setSplitModalOpen(false)}
                className="p-3 hover:bg-white rounded-2xl text-slate-400 transition-all border border-transparent hover:border-slate-200"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              <div className="grid grid-cols-12 gap-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">
                <div className="col-span-5">Centrum Powiernicze (Projekt)</div>
                <div className="col-span-3 text-right">Kwota (PLN)</div>
                <div className="col-span-3">Kategoria / Notatka</div>
                <div className="col-span-1"></div>
              </div>

              <div className="space-y-3">
                {currentSplits.map((split, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-4 items-start bg-slate-50 p-4 rounded-3xl border border-slate-100 group transition-all hover:bg-white hover:border-blue-200">
                    <div className="col-span-5">
                      <select 
                        value={split.projectId}
                        onChange={(e) => {
                          const newS = [...currentSplits];
                          newS[idx].projectId = e.target.value;
                          setCurrentSplits(newS);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-2xl p-3 text-xs font-black uppercase tracking-tight outline-none focus:border-blue-500"
                      >
                        <option value="">Wybierz Projekt...</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="col-span-3 relative">
                      <input 
                        type="number" 
                        value={split.amount}
                        step="0.01"
                        onChange={(e) => {
                          const newS = [...currentSplits];
                          newS[idx].amount = parseFloat(e.target.value) || 0;
                          setCurrentSplits(newS);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-2xl p-3 text-right text-xs font-black outline-none focus:border-blue-500 pr-10" 
                      />
                      <span className="absolute right-4 top-3.5 text-[10px] font-black text-slate-400">zł</span>
                    </div>
                    <div className="col-span-3">
                      <input 
                        value={split.note}
                        onChange={(e) => {
                          const newS = [...currentSplits];
                          newS[idx].note = e.target.value;
                          setCurrentSplits(newS);
                        }}
                        placeholder="Notatka AI..."
                        className="w-full bg-white border border-slate-200 rounded-2xl p-3 text-xs font-bold outline-none focus:border-blue-500" 
                      />
                    </div>
                    <div className="col-span-1 flex justify-center py-2">
                       <button 
                        onClick={() => handleRemoveSplit(idx)}
                        className="p-2 text-slate-300 hover:text-rose-500 transition-all"
                       >
                         <Trash2 size={18} />
                       </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-6 border-t border-slate-100">
                <button 
                  onClick={handleAddSplit}
                  className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 px-6 py-3 rounded-2xl border border-blue-100 transition-all shadow-sm"
                >
                  <Plus size={16} /> Dodaj Pozycję
                </button>
                
                <div className="bg-slate-900 text-white p-4 rounded-3xl flex items-center gap-6 shadow-xl min-w-[280px]">
                   <div className="flex-1">
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Pozostało do rozliczenia</div>
                      <div className="text-xl font-black tracking-tighter">
                        {((selectedTx?.amount || 0) - currentSplits.reduce((acc, s) => acc + s.amount, 0)).toFixed(2)} <span className="text-[10px] text-slate-500">PLN</span>
                      </div>
                   </div>
                   <div className={`p-2 rounded-full ${Math.abs(currentSplits.reduce((acc, s) => acc + s.amount, 0) - (selectedTx?.amount || 0)) < 1 ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                      {Math.abs(currentSplits.reduce((acc, s) => acc + s.amount, 0) - (selectedTx?.amount || 0)) < 1 ? <CheckCircle2 size={16} /> : <Calculator size={16} />}
                   </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              <button 
                onClick={handleVisionScan}
                disabled={isVisionScanning}
                className={`flex items-center gap-2 font-black text-[10px] uppercase tracking-widest px-8 py-3 rounded-2xl border border-slate-200 bg-white transition-all ${isVisionScanning ? 'opacity-50' : 'text-blue-600 hover:border-blue-600'}`}
              >
                {isVisionScanning ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />} AI Vision Split
              </button>
              
              <div className="flex gap-3">
                <button 
                  onClick={handleSaveSplit}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-blue-500/40 transition-all flex items-center gap-2"
                >
                  <FileCheck size={18} /> Zatwierdź & Zaksięguj
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavButton({ active, onClick, icon, title, desc }: { active: boolean, onClick: () => void, icon: any, title: string, desc: string }) {
   return (
      <button 
        onClick={onClick}
        className={`w-full text-left p-6 rounded-[2.5rem] border transition-all duration-500 group flex items-start gap-4 ${active ? 'bg-white border-slate-200 shadow-xl scale-105 z-10' : 'bg-transparent border-transparent hover:bg-slate-100 opacity-60'}`}
      >
         <div className={`p-3 rounded-2xl transition-all ${active ? 'bg-emerald-800 text-white shadow-lg rotate-3' : 'bg-slate-200 text-slate-500 group-hover:bg-white'}`}>
            {icon}
         </div>
         <div className="flex-1 pt-1">
            <div className={`text-sm font-black uppercase italic tracking-tight leading-none mb-1.5 ${active ? 'text-slate-900' : 'text-slate-500'}`}>{title}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{desc}</div>
         </div>
      </button>
   )
}

function StatusItem({ label, status }: { label: string, status: string }) {
   return (
      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
         <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
         <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[8px] font-black text-slate-400 uppercase italic">{status}</span>
         </div>
      </div>
   )
}
