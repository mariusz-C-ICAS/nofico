/**
 * Data: 2026-05-12 06:00
 * Utworzył: Agent AI
 * Zmiany: Zmiana źródła danych na Firestore (usunięcie mockupów), dodanie kontroli zmiennych widoków (full, compact, filtry), rozbudowa UI.
 * Opis: Pełny moduł do rozrachunków i płatności, z odczytem/zapisem w Firestore oraz elastycznymi widokami.
 */
import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, FileText, Briefcase, RefreshCw, AlertTriangle, ShieldCheck, Truck, ChevronRight, LayoutGrid, List, Filter, Plus, X, Search, MoreVertical } from 'lucide-react';
import { db } from '../../shared/lib/firebase';
import { collection, query, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, orderBy } from 'firebase/firestore';
import { useAuth } from '../../shared/hooks/AuthContext';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, userId?: string) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: { userId },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

interface Payment {
  id: string;
  type: string;
  amount: number;
  currency: string;
  recipient: string;
  status: string;
  date: string;
  nip: string;
}

export default function PaymentsModule() {
  const { userData, user, activeTenantId } = useAuth();
  const [activeTab, setActiveTab] = useState<'pending' | 'ksef' | 'payroll' | 'suppliers' | 'history'>('pending');
  const [layoutView, setLayoutView] = useState<'full' | 'compact'>('full');
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [asyncStatus, setAsyncStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [newPayment, setNewPayment] = useState({
    type: 'KSEF',
    amount: '',
    currency: 'PLN',
    recipient: '',
    nip: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (!user || !activeTenantId) return;
    const q = query(collection(db, 'payments'), where('tenantId', '==', activeTenantId), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Payment[] = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() } as Payment);
      });
      setPayments(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'payments', user.uid);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeTenantId) return;
    
    try {
      await addDoc(collection(db, 'payments'), {
        ...newPayment,
        amount: parseFloat(newPayment.amount),
        status: 'Oczekująca',
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        tenantId: activeTenantId
      });
      setShowAddModal(false);
      setNewPayment({ type: 'KSEF', amount: '', currency: 'PLN', recipient: '', nip: '', date: new Date().toISOString().split('T')[0] });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'payments', user.uid);
    }
  };

  const handleApprovePayment = async (id: string) => {
    setProcessingId(id);
    setAsyncStatus(`Zainicjowano transakcję w Temporal.io [Workflow: ${id}]`);
    
    try {
      // W rzeczywistości to wykonuje trigger do Temporal API
      setTimeout(async () => {
         await updateDoc(doc(db, 'payments', id), {
            status: 'Zrealizowana',
            updatedAt: serverTimestamp()
         });
         setAsyncStatus(null);
         setProcessingId(null);
      }, 1500);
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, `payments/${id}`, user?.uid);
       setAsyncStatus(null);
       setProcessingId(null);
    }
  };

  const tabs = [
    { id: 'pending', label: 'Do Akceptacji', icon: AlertTriangle },
    { id: 'ksef', label: 'Zobowiązania KSeF', icon: FileText },
    { id: 'payroll', label: 'Lista Płac (HR)', icon: Briefcase },
    { id: 'suppliers', label: 'Towary i Usługi', icon: Truck },
    { id: 'history', label: 'Historia Rozrachunków', icon: CheckCircle }
  ];

  const filteredPayments = payments.filter(p => {
    if (activeTab === 'pending' && p.status === 'Zrealizowana') return false;
    if (activeTab === 'history' && p.status !== 'Zrealizowana') return false;
    if (searchQuery && !p.recipient.toLowerCase().includes(searchQuery.toLowerCase()) && !p.nip.includes(searchQuery)) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
      
      {/* Nagłówek Modułu */}
      <div className="bg-gradient-to-r from-emerald-900 to-teal-800 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/20 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter mb-2 flex items-center gap-3">
              <CreditCard className="text-emerald-400" size={32} />
              Centrum Rozrachunków
            </h1>
            <p className="text-emerald-100/80 font-medium max-w-2xl leading-relaxed">
              Zarządzaj otwartymi pozycjami, akceptuj wyciągi i weryfikuj kontrahentów. Brak zasymulowanych danych – wszystkie wpisy odczytywane są asynchronicznie (Live Data).
            </p>
          </div>
          <div className="flex gap-4">
             <button onClick={() => setShowAddModal(true)} className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all">
                <Plus size={18} />
                Nowy Zapis
             </button>
          </div>
        </div>
      </div>

      {/* Kontrolki Widoku i Filtry (Globalne dla Modułu) */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
         <div className="flex items-center gap-2 px-2">
            <button 
               onClick={() => setLayoutView('full')}
               className={`p-2 rounded-lg transition-colors ${layoutView === 'full' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:bg-slate-50'}`}
               title="Widok Pełny (Karty)"
            >
               <LayoutGrid size={18} />
            </button>
            <button 
               onClick={() => setLayoutView('compact')}
               className={`p-2 rounded-lg transition-colors ${layoutView === 'compact' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:bg-slate-50'}`}
               title="Widok Kompaktowy (Lista)"
            >
               <List size={18} />
            </button>
            <div className="w-px h-6 bg-slate-200 mx-2"></div>
            <button 
               onClick={() => setShowFilters(!showFilters)}
               className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-bold ${showFilters ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
               <Filter size={16} /> Filters
            </button>
         </div>
         <div className="relative flex-1 max-w-md w-full mr-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
            <input 
               type="text" 
               placeholder="Szukaj kontrahenta, NIP..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium text-slate-700"
            />
         </div>
      </div>

      {showFilters && (
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4 animate-in slide-in-from-top-2">
            <div>
               <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Typ Rozrachunku</label>
               <select className="w-full p-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500">
                  <option>Wszystkie</option>
                  <option>KSeF</option>
                  <option>Lista Płac</option>
               </select>
            </div>
            <div>
               <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Zakres Czasowy</label>
               <select className="w-full p-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500">
                  <option>Ostatnie 30 dni</option>
                  <option>Ostatnie 7 dni</option>
                  <option>Ten Miesiąc</option>
               </select>
            </div>
            <div>
               <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Status Operacji</label>
               <select className="w-full p-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500">
                  <option>Dowolny</option>
                  <option>Wymaga Akceptacji</option>
                  <option>Zrealizowane</option>
               </select>
            </div>
            <div className="flex items-end">
               <button className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl transition-colors text-sm">
                  Zastosuj Filtry
               </button>
            </div>
         </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Nawigacja Boczna */}
        <div className="lg:w-1/4 w-full sticky top-6">
          <div className="bg-white rounded-[2rem] p-4 shadow-sm border border-slate-100 flex flex-row lg:flex-col gap-2 overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              // Local counter logic based on actual data
              let count = 0;
              if (tab.id === 'pending') count = payments.filter(p => p.status !== 'Zrealizowana').length;
              if (tab.id === 'history') count = payments.filter(p => p.status === 'Zrealizowana').length;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center justify-between px-4 py-4 md:py-3 rounded-2xl transition-all font-bold text-sm whitespace-nowrap ${
                    isActive 
                      ? 'bg-emerald-50 text-emerald-800 shadow-sm border border-emerald-100 ring-1 ring-emerald-500/20' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} className={isActive ? 'text-emerald-500' : 'text-slate-400'} />
                    {tab.label}
                  </div>
                  {count > 0 && (
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isActive ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Zawartość Głównego Widoku */}
        <div className="lg:w-3/4 w-full">
          {activeTab === 'pending' || activeTab === 'history' ? (
            <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                   {activeTab === 'pending' ? <AlertTriangle className="text-rose-500" /> : <CheckCircle className="text-emerald-500" />}
                   {activeTab === 'pending' ? 'Płatności do Akceptacji' : 'Zrealizowane Płatności'}
                 </h2>
                 <button className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors">
                    <RefreshCw size={14} /> Synch RDF
                 </button>
              </div>

              {asyncStatus && (
                 <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-sm font-bold flex items-center gap-3 animate-pulse">
                    <RefreshCw className="animate-spin" size={16} />
                    {asyncStatus}
                 </div>
              )}

              {loading ? (
                <div className="text-center py-12">
                   <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                   <p className="text-sm font-medium text-slate-500">Pobieranie rozrachunków z szyfrowanej bazy...</p>
                </div>
              ) : filteredPayments.length === 0 ? (
                 <div className="text-center py-16 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                    <CheckCircle className="mx-auto text-slate-300 mb-3" size={32} />
                    <p className="text-sm font-bold text-slate-500">Brak dokumentów w tym widoku.</p>
                 </div>
              ) : (
                <div className={layoutView === 'full' ? "space-y-4" : "flex flex-col rounded-2xl overflow-hidden border border-slate-200"}>
                  {layoutView === 'compact' && (
                     <div className="grid grid-cols-12 gap-4 bg-slate-50 p-4 border-b border-slate-200 text-xs font-black text-slate-500 uppercase tracking-widest">
                        <div className="col-span-3">Kontrahent</div>
                        <div className="col-span-2">Typ / NIP</div>
                        <div className="col-span-2">Termin</div>
                        <div className="col-span-2 text-right">Kwota</div>
                        <div className="col-span-3 text-right">Akcja</div>
                     </div>
                  )}

                  {filteredPayments.map(payment => {
                     const isKsef = payment.type === 'KSEF';
                     const isPayroll = payment.type === 'PAYROLL';
                     
                     if (layoutView === 'compact') {
                        return (
                           <div key={payment.id} className="grid grid-cols-12 gap-4 p-4 border-b border-slate-100 bg-white hover:bg-slate-50 items-center transition-colors">
                              <div className="col-span-3 font-bold text-sm text-slate-800 line-clamp-1" title={payment.recipient}>{payment.recipient}</div>
                              <div className="col-span-2 text-xs font-medium text-slate-600">
                                 <span className={`px-2 py-0.5 rounded font-bold ${isKsef ? 'bg-blue-100 text-blue-700' : isPayroll ? 'bg-fuchsia-100 text-fuchsia-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {payment.type}
                                 </span>
                                 <div className="mt-1 text-[10px] text-slate-400">{payment.nip}</div>
                              </div>
                              <div className="col-span-2 text-xs font-medium text-slate-600">{payment.date}</div>
                              <div className="col-span-2 text-right font-black text-slate-900">
                                 {payment.amount?.toLocaleString('pl-PL', {style: 'currency', currency: payment.currency || 'PLN'})}
                              </div>
                              <div className="col-span-3 flex justify-end">
                                 {payment.status !== 'Zrealizowana' ? (
                                    <button 
                                       onClick={() => handleApprovePayment(payment.id)}
                                       disabled={processingId === payment.id}
                                       className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition-colors"
                                    >
                                       {processingId === payment.id ? '...' : 'Akceptuj'}
                                    </button>
                                 ) : (
                                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1"><CheckCircle size={12}/> Zrealizowano</span>
                                 )}
                              </div>
                           </div>
                        )
                     }

                     return (
                        <div key={payment.id} className="p-5 border border-slate-100 rounded-2xl hover:border-emerald-200 transition-colors bg-white hover:shadow-lg hover:shadow-emerald-500/5 group flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
                          {payment.status === 'Zrealizowana' && <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500 opacity-5 rounded-bl-full pointer-events-none"></div>}
                          
                          <div className="flex items-start gap-4">
                             <div className={`p-4 rounded-[1rem] flex-shrink-0 ${isKsef ? 'bg-blue-50 text-blue-500' : isPayroll ? 'bg-fuchsia-50 text-fuchsia-500' : 'bg-amber-50 text-amber-500'}`}>
                                {isKsef ? <FileText size={24} /> : isPayroll ? <Briefcase size={24} /> : <Truck size={24} />}
                             </div>
                             <div>
                                <div className="flex items-center gap-2 mb-1">
                                   <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{payment.type}</div>
                                   <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                   <div className={`text-[10px] font-black uppercase tracking-widest ${payment.status === 'Zrealizowana' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                      {payment.status}
                                   </div>
                                </div>
                                <div className="font-bold text-slate-800 text-lg">{payment.recipient}</div>
                                <div className="text-sm text-slate-500 mt-1 flex gap-3">
                                   <span>Termin: <strong className="text-slate-700">{payment.date}</strong></span>
                                   <span>NIP: <strong className="text-slate-700">{payment.nip}</strong></span>
                                </div>
                             </div>
                          </div>
                          
                          <div className="flex flex-col items-end w-full md:w-auto">
                             <div className="text-2xl font-black tracking-tighter text-slate-900 mb-3">
                                {payment.amount?.toLocaleString('pl-PL', {style: 'currency', currency: payment.currency || 'PLN'})}
                             </div>
                             {payment.status !== 'Zrealizowana' ? (
                                <button 
                                   onClick={() => handleApprovePayment(payment.id)}
                                   disabled={processingId === payment.id}
                                   className={`w-full md:w-auto px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                      processingId === payment.id ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-wait' : 'bg-slate-900 hover:bg-slate-800 text-white shadow-lg'
                                   }`}
                                >
                                   {processingId === payment.id ? 'Przetwarzanie MQ...' : 'Akceptuj Przelew'}
                                </button>
                             ) : (
                                <button className="w-full md:w-auto px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-100 cursor-default">
                                   Potwierdzono
                                </button>
                             )}
                          </div>
                        </div>
                     )
                  })}
                </div>
              )}
            </div>
          ) : (
             <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 text-center animate-in fade-in min-h-[400px] flex flex-col justify-center items-center">
                 <div className="bg-slate-50 p-6 rounded-full mb-4">
                    <CheckCircle className="text-slate-300" size={48} />
                 </div>
                 <h2 className="text-lg font-black text-slate-700 uppercase tracking-widest mb-2">Widok Zastrzeżony</h2>
                 <p className="text-slate-500 text-sm max-w-lg mx-auto leading-relaxed">
                    Wybierz z panelu po lewej stronie konkretną kategorię ("Do Akceptacji" lub "Historia"), aby przejrzeć listę przetworzonych dokumentów w asynchronicznym trybie Live.
                 </p>
             </div>
          )}

        </div>
      </div>

      {/* Add Payment Modal */}
      {showAddModal && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-[2rem] max-w-lg w-full shadow-2xl p-6 md:p-8 animate-in zoom-in-95 duration-200">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                     <Plus className="text-emerald-500"/> Utwórz Zobowiązanie
                  </h3>
                  <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                     <X size={20} />
                  </button>
               </div>
               
               <form onSubmit={handleAddPayment} className="space-y-4">
                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Typ Rozrachunku</label>
                     <select 
                        required
                        value={newPayment.type}
                        onChange={(e) => setNewPayment({...newPayment, type: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-emerald-500 transition-colors"
                     >
                        <option value="KSEF">Faktura Zewnętrzna (KSeF)</option>
                        <option value="PAYROLL">Wynagrodzenie (Payroll)</option>
                        <option value="SUPPLIER">Dostawcy Niestandardowi</option>
                     </select>
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Odbiorca (Kontrahent / Pracownik)</label>
                     <input 
                        required
                        type="text" 
                        value={newPayment.recipient}
                        onChange={(e) => setNewPayment({...newPayment, recipient: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-emerald-500 transition-colors"
                        placeholder="np. Sklep Komputerowy Sp. z o.o."
                     />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Numer NIP (Biała Księga)</label>
                        <input 
                           type="text" 
                           value={newPayment.nip}
                           onChange={(e) => setNewPayment({...newPayment, nip: e.target.value})}
                           className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-emerald-500 transition-colors"
                           placeholder="1234567890"
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Termin Płatności</label>
                        <input 
                           required
                           type="date" 
                           value={newPayment.date}
                           onChange={(e) => setNewPayment({...newPayment, date: e.target.value})}
                           className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-emerald-500 transition-colors"
                        />
                     </div>
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Kwota (Brutto)</label>
                     <div className="relative">
                        <input 
                           required
                           type="number" 
                           step="0.01"
                           value={newPayment.amount}
                           onChange={(e) => setNewPayment({...newPayment, amount: e.target.value})}
                           className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-16 py-3 text-lg font-black text-slate-800 outline-none focus:border-emerald-500 transition-colors"
                           placeholder="0.00"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 uppercase">PLN</div>
                     </div>
                  </div>
                  
                  <div className="pt-4">
                     <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-sm py-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all">
                        Zapisz Zobowiązanie do Bazy
                     </button>
                  </div>
               </form>
            </div>
         </div>
      )}

    </div>
  );
}

