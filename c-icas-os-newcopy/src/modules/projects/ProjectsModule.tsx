import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import KanbanBoard from './KanbanBoard';
import AuditEvidence from './AuditEvidence';
import { db } from '../../shared/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../shared/hooks/AuthContext';
import { 
  Briefcase, Clock, FileText, CheckSquare, Settings2, 
  ShieldCheck, Leaf, HardHat, Car, Plus, ChevronRight,
  TrendingUp, X, Check, PieChart, BarChart2, DollarSign,
  AlertCircle, ArrowUpRight, ArrowDownRight, Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

function EconomicDashboard({ project }: { project: any }) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!project?.mpk) {
      setLoading(false);
      return;
    }
    // UC-PRJ-04/07: Real-time view of costs per project via MPK
    const q = query(collection(db, 'transactions'), where('mpk', '==', project.mpk));
    const unsub = onSnapshot(q, (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [project?.mpk]);

  const totalCosts = transactions.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const budget = project.budget || 0;
  const progress = budget > 0 ? (totalCosts / budget) * 100 : 0;
  const isOverBudget = totalCosts > budget;
  const isNearLimit = progress > 80;

  // Mock data for Burnup Chart
  const chartData = [
    { day: 'Pn', budget: budget, actual: totalCosts * 0.4 },
    { day: 'Wt', budget: budget, actual: totalCosts * 0.6 },
    { day: 'Śr', budget: budget, actual: totalCosts * 0.75 },
    { day: 'Cz', budget: budget, actual: totalCosts * 0.9 },
    { day: 'Pt', budget: budget, actual: totalCosts },
  ];

  if (loading) return <div className="p-8 text-center animate-pulse">Analizowanie przepływów MPK...</div>;

  return (
    <div className="p-6 space-y-6">
       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
             <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase">Budżet MPK</span>
                <DollarSign size={14} className="text-slate-300" />
             </div>
             <div className="text-xl font-black text-slate-900">{budget.toLocaleString()} PLN</div>
             <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Kod: {project.mpk || 'BRAK'}</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
             <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase">Koszty Faktyczne</span>
                <ArrowDownRight size={14} className={isOverBudget ? 'text-rose-500' : 'text-emerald-500'} />
             </div>
             <div className={`text-xl font-black ${isOverBudget ? 'text-rose-600' : 'text-slate-900'}`}>{totalCosts.toLocaleString()} PLN</div>
             <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${isOverBudget ? 'bg-rose-500' : isNearLimit ? 'bg-amber-500' : 'bg-indigo-500'}`}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
             </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
             <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase">Rentowność (Est.)</span>
                <PieChart size={14} className="text-slate-300" />
             </div>
             <div className="text-xl font-black text-emerald-600">+{(budget - totalCosts).toLocaleString()} PLN</div>
             <div className="text-[10px] font-bold text-emerald-500 mt-1 uppercase italic">Marża: {budget > 0 ? (((budget-totalCosts)/budget)*100).toFixed(1) : 0}%</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
             <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase">Stan Finansowy</span>
             </div>
             {isOverBudget ? (
               <div className="flex items-center gap-2 text-rose-600">
                  <AlertCircle size={16} />
                  <span className="text-xs font-black uppercase">Przekroczenie</span>
               </div>
             ) : (
               <div className="flex items-center gap-2 text-emerald-600">
                  <Check size={16} />
                  <span className="text-xs font-black uppercase">W Normie</span>
               </div>
             )}
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
             <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                <TrendingUp size={14} /> Wykres Burnup Zadania vs Budżet
             </h4>
             <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                      />
                      <Area type="monotone" dataKey="actual" stroke="#6366f1" fillOpacity={1} fill="url(#colorActual)" strokeWidth={3} />
                      <Area type="monotone" dataKey="budget" stroke="#e2e8f0" fill="transparent" strokeDasharray="5 5" />
                   </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div className="bg-slate-900 rounded-3xl p-6 text-white overflow-hidden relative">
             <div className="absolute top-0 right-0 p-8 opacity-10">
                <BarChart2 size={120} />
             </div>
             <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">Analiza Rentowności (P&L)</h4>
             <p className="text-xs text-slate-400 mb-6">Projekt: {project.name}</p>
             
             <div className="space-y-4 relative z-10">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                   <span className="text-[10px] font-bold text-slate-500 uppercase">Przychody (Umowa)</span>
                   <span className="font-black text-sm">{budget.toLocaleString()} PLN</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                   <span className="text-[10px] font-bold text-slate-500 uppercase">Koszty Materiałowe (MPK)</span>
                   <span className="font-black text-sm">-{totalCosts.toLocaleString()} PLN</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-800 pb-3 text-rose-400">
                   <span className="text-[10px] font-bold uppercase">Koszty Roboczo-godzin</span>
                   <span className="font-black text-sm">-12,450 PLN</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                   <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Marża Operacyjna</span>
                   <span className="text-xl font-black text-emerald-400">{(budget - totalCosts - 12450).toLocaleString()} PLN</span>
                </div>
             </div>
             
             <div className="mt-8 bg-slate-800/50 p-4 rounded-2xl flex items-center gap-3 border border-slate-700/50">
                <Sparkles size={20} className="text-indigo-400" />
                <div>
                   <div className="text-[9px] font-black uppercase tracking-widest text-indigo-300">Sugestia AI Architekt</div>
                   <div className="text-[10px] font-medium text-slate-400 leading-tight mt-1">Podnieś stawkę roboczogodziny o 12% dla kolejnego etapu, aby utrzymać marżę docelową 25%.</div>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
}

export default function ProjectsModule() {
  const { t } = useTranslation();
  const { userData, roleData, activeTenantId } = useAuth();
  
  const [projects, setProjects] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [activeProject, setActiveProject] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProject, setNewProject] = useState({ 
    name: '', 
    description: '', 
    moduleType: 'general',
    customerId: '',
    budget: 0,
    mpk: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: ''
  });

  useEffect(() => {
    if (!activeTenantId) return;
    // Load customers for project assignment
    const qCust = query(collection(db, 'customers'), where('tenantId', '==', activeTenantId));
    const unsubCust = onSnapshot(qCust, (snap) => {
      setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsubCust;
  }, [activeTenantId]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenantId || !newProject.name) return;

    try {
      const projRef = await addDoc(collection(db, 'projects'), {
        ...newProject,
        tenantId: activeTenantId,
        status: 'active',
        createdAt: serverTimestamp(),
        clientName: customers.find(c => c.id === newProject.customerId)?.name || 'Brak'
      });
      
      // UC-PRJ-01: Auto-create MPK in finance
      if (newProject.mpk) {
        await addDoc(collection(db, 'costCenters'), {
          mpk: newProject.mpk,
          projectId: projRef.id,
          projectName: newProject.name,
          tenantId: activeTenantId,
          budget: newProject.budget,
          createdAt: serverTimestamp()
        });
      }

      setShowAddModal(false);
      setNewProject({ 
        name: '', description: '', moduleType: 'general', 
        customerId: '', budget: 0, mpk: '', startDate: format(new Date(), 'yyyy-MM-dd'), endDate: '' 
      });
    } catch (error) {
      console.error("Error adding project:", error);
    }
  };

  useEffect(() => {
    if (!activeTenantId) return;
    const q = query(collection(db, 'projects'), where('tenantId', '==', activeTenantId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const p = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProjects(p);
      if (p.length > 0 && !activeProject) {
        setActiveProject(p[0]);
      }
    });
    return unsubscribe;
  }, [activeTenantId]);

  const renderModuleIcon = (moduleType: string) => {
    switch(moduleType) {
      case 'construction': return <HardHat size={18} className="text-amber-500" />;
      case 'gardening': return <Leaf size={18} className="text-emerald-500" />;
      case 'workshop': return <Car size={18} className="text-neutral-500" />;
      default: return <Briefcase size={18} className="text-indigo-500" />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-140px)]">
      {/* Master List */}
      <div className="w-full md:w-80 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col shrink-0 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="font-bold text-slate-800">Moje Projekty</h2>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white p-1.5 rounded-lg transition-colors shadow-lg shadow-indigo-100"
          >
            <Plus size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {projects.length === 0 ? (
             <div className="text-center p-4 text-xs text-slate-500">
               Brak projektów. Wygeneruj ofertę w CRM lub utwórz projekt ręcznie.
             </div>
          ) : (
            projects.map(p => (
              <button 
                key={p.id}
                onClick={() => setActiveProject(p)}
                className={`w-full text-left p-3 rounded-lg mb-1 flex items-center justify-between group transition-all ${activeProject?.id === p.id ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50 border border-transparent'}`}
              >
                <div>
                  <div className={`font-semibold ${activeProject?.id === p.id ? 'text-indigo-900' : 'text-slate-700'}`}>{p.name}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                    {renderModuleIcon(p.moduleType)}
                    <span className="capitalize">{p.moduleType || 'Ogólny'}</span>
                  </div>
                </div>
                <ChevronRight size={18} className={`${activeProject?.id === p.id ? 'text-indigo-600' : 'text-slate-300 opacity-0 group-hover:opacity-100'}`} />
              </button>
            ))
          )}
          
          {/* Mocked defaults to show UI concept even without db data */}
          {projects.length === 0 && (
             <div className="opacity-50 mt-4 border-t border-slate-100 pt-4 cursor-not-allowed">
               <div className="px-2 text-[10px] font-bold text-slate-400 uppercase mb-2">Przykładowe / Szablony</div>
               <div className="w-full text-left p-3 rounded-lg mb-1 flex items-center justify-between border border-transparent pointer-events-none">
                 <div>
                   <div className="font-semibold text-slate-700">Willa Magnolia (Kostka)</div>
                   <div className="text-xs text-slate-500 flex items-center gap-1 mt-1"><HardHat size={14} className="text-amber-500"/> Budownictwo</div>
                 </div>
               </div>
               <div className="w-full text-left p-3 rounded-lg mb-1 flex items-center justify-between border border-transparent pointer-events-none">
                 <div>
                   <div className="font-semibold text-slate-700">Audi A4 - Wymiana Rozrządu</div>
                   <div className="text-xs text-slate-500 flex items-center gap-1 mt-1"><Car size={14} className="text-neutral-500"/> Warsztat</div>
                 </div>
               </div>
             </div>
          )}
        </div>
      </div>

      {/* Detail View */}
      {activeProject ? (
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col min-w-0 overflow-hidden">
          <div className="p-8 border-b border-slate-100 bg-white">
             <div className="flex items-center gap-3 mb-4">
               <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">Aktywny</span>
               <div className="h-4 w-[1px] bg-slate-200"></div>
               <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Klient: <span className="text-slate-900">{activeProject.clientName || 'Brak powiązania'}</span></span>
             </div>
             <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">{activeProject.name}</h1>
             <p className="text-slate-500 text-sm mt-3 max-w-2xl font-medium leading-relaxed">{activeProject.description}</p>
          </div>
          
              <div className="flex bg-slate-50 border-b border-slate-200 overflow-x-auto hide-scrollbar px-4">
                <button onClick={() => setActiveTab('overview')} className={`px-5 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${activeTab === 'overview' ? 'bg-white border-indigo-600 text-indigo-600' : 'border-transparent text-slate-600 hover:bg-slate-50'}`}>Cross-Referencje (Hub)</button>
                <button onClick={() => setActiveTab('kanban')} className={`px-5 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'kanban' ? 'bg-white border-indigo-600 text-indigo-600' : 'border-transparent text-slate-600 hover:bg-slate-50'}`}><CheckSquare size={16}/> Zadania (Kanban)</button>
                <button onClick={() => setActiveTab('finance')} className={`px-5 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'finance' ? 'bg-white border-indigo-600 text-indigo-600' : 'border-transparent text-slate-600 hover:bg-slate-50'}`}><DollarSign size={16}/> Budżet vs Fakty (MPK)</button>
                <button onClick={() => setActiveTab('time')} className={`px-5 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'time' ? 'bg-white border-indigo-600 text-indigo-600' : 'border-transparent text-slate-600 hover:bg-slate-50'}`}><Clock size={16}/> Rejestracja Czasu</button>
              </div>

              <div className="flex-1 overflow-y-auto bg-slate-50/30">
                 {activeTab === 'overview' && (
                    <div className="p-6">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="font-extrabold text-slate-800 uppercase text-xs tracking-widest">Węzeł Operacyjny (Cross-Reference)</h3>
                        <div className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Aktywne Połączenia: 3</div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                         <Link to="/crm" className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-indigo-500 hover:shadow-xl transition-all cursor-pointer group shadow-sm bg-gradient-to-b from-white to-slate-50">
                           <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                             <FileText size={24} />
                           </div>
                           <h4 className="font-black text-slate-800 uppercase text-sm tracking-tight">Karta Klienta i Umowa</h4>
                           <p className="text-xs text-slate-500 mt-2 font-medium">Klient: {activeProject.clientName || 'Brak'}</p>
                         </Link>

                         <Link to="/finance/vault" className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-500 hover:shadow-xl transition-all cursor-pointer group shadow-sm bg-gradient-to-b from-white to-slate-50">
                           <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-all">
                             <DollarSign size={24} />
                           </div>
                           <h4 className="font-black text-slate-800 uppercase text-sm tracking-tight">Budżetowanie i MPK</h4>
                           <p className="text-xs text-slate-500 mt-2 font-medium">MPK: {activeProject.mpk || 'Nie przypisano'}</p>
                         </Link>

                         <Link to="/custom/fleet" className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-xl transition-all cursor-pointer group shadow-sm bg-gradient-to-b from-white to-slate-50">
                           <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                             <Car size={24} />
                           </div>
                           <h4 className="font-black text-slate-800 uppercase text-sm tracking-tight">Zasoby i Logistyka</h4>
                           <p className="text-xs text-slate-500 mt-2 font-medium">Status aktywów: Monitoring GPS</p>
                         </Link>
                      </div>

                      <div className="mt-10 p-6 bg-slate-900 rounded-3xl text-white relative overflow-hidden group">
                         <div className="absolute right-0 top-0 p-8 opacity-10 group-hover:rotate-12 transition-transform">
                           <ShieldCheck size={120} />
                         </div>
                         <h4 className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-2">Audyt i Monitoring AI</h4>
                         <p className="text-sm font-medium text-slate-300 max-w-lg">
                           System AI Architekt automatycznie analizuje wpisy w tym projekcie i porównuje je z rynkowymi standardami wydajności.
                         </p>
                         <button className="mt-4 text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-indigo-500 rounded-lg hover:bg-indigo-600 transition-colors">Uruchom Analizę Główną</button>
                      </div>
                    </div>
                 )}
             
             {activeTab === 'kanban' && (
                <div className="h-full">
                   <KanbanBoard projectId={activeProject.id} />
                </div>
             )}

             {activeTab === 'finance' && (
                <EconomicDashboard project={activeProject} />
             )}

             {activeTab === 'time' && (
                <div className="p-6 flex flex-col gap-6">
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 items-center md:items-start">
                    <div className="bg-orange-50 p-4 rounded-full shrink-0">
                       <Clock size={48} className="text-orange-500" />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <h3 className="text-lg font-bold text-slate-800">Szybkie Rejestrowanie Czasu (Ten Projekt)</h3>
                      <p className="text-slate-500 text-sm mt-1 max-w-xl mx-auto md:mx-0 mb-4">Podaj ile godzin spędziłeś nad projektem i kogo z zespołu dotyczy to zgłoszenie. Integrator zliczy to do automatycznych stawek.</p>
                      
                      <div className="flex flex-col sm:flex-row gap-3">
                        <select className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-lg text-sm text-slate-700 outline-none focus:border-orange-500">
                          <option>Prace Ogólnobudowlane</option>
                          <option>Prace Wykończeniowe</option>
                          <option>Nadzór i Diagnostyka</option>
                          <option>Dojazd / Zaopatrzenie</option>
                        </select>
                        <input type="number" placeholder="Ile godzin? (np. 8)" className="w-full sm:w-40 bg-slate-50 border border-slate-200 px-4 py-2 rounded-lg text-sm outline-none focus:border-orange-500"/>
                        <button className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm transition-colors whitespace-nowrap">
                           Zapisz loga
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                     <div className="bg-slate-50 border-b border-slate-100 p-4 font-semibold text-slate-700 flex justify-between items-center">
                        Ostatnie Logi Pracy (Ten Projekt)
                        <span className="text-xs bg-slate-200 px-2 py-1 rounded text-slate-600">Ostatnie 7 dni</span>
                     </div>
                     <div className="p-0">
                       <table className="w-full text-left text-sm text-slate-600">
                          <tbody>
                            <tr className="border-b border-slate-100 opacity-60 pointer-events-none">
                              <td className="p-4 font-medium text-slate-800">Ty ({roleData?.name || userData?.role})</td>
                              <td className="p-4">Prace Ogólnobudowlane</td>
                              <td className="p-4 font-bold text-slate-800">8h</td>
                              <td className="p-4 text-xs text-slate-400">Dziś, 14:30</td>
                            </tr>
                            <tr className="border-b border-slate-100 opacity-60 pointer-events-none">
                              <td className="p-4 font-medium text-slate-800">Tomasz P.</td>
                              <td className="p-4">Dojazd / Zaopatrzenie</td>
                              <td className="p-4 font-bold text-slate-800">2.5h</td>
                              <td className="p-4 text-xs text-slate-400">Wczoraj, 18:00</td>
                            </tr>
                          </tbody>
                       </table>
                     </div>
                  </div>
                </div>
             )}

             {activeTab === 'evidence' && (
                <div className="p-6">
                   <AuditEvidence projectId={activeProject.id} />
                </div>
             )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 p-6 text-center">
           <Briefcase size={64} className="mb-4 opacity-50" />
           <p className="font-semibold text-lg max-w-sm text-slate-500">Wybierz projekt z listy, lub utwórz nowy aby zarządzać jego procesami.</p>
        </div>
      )}
      {/* Add Project Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in duration-300">
              <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                 <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Nowy Projekt</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inicjalizacja Węzła Operacyjnego</p>
                 </div>
                 <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-400">
                    <X size={20} />
                 </button>
              </div>
              <form onSubmit={handleCreateProject} className="p-8 space-y-4 max-h-[70vh] overflow-y-auto">
                 <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Nazwa Projektu</label>
                    <input 
                      required
                      value={newProject.name}
                      onChange={e => setNewProject({...newProject, name: e.target.value})}
                      placeholder="np. Willa Magnolia 2026"
                      className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 ring-indigo-500 outline-none font-bold"
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Typ Branżowy</label>
                      <select 
                        value={newProject.moduleType}
                        onChange={e => setNewProject({...newProject, moduleType: e.target.value})}
                        className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 ring-indigo-500 outline-none font-bold appearance-none"
                      >
                         <option value="general">Ogólny</option>
                         <option value="construction">Budownictwo</option>
                         <option value="gardening">Ogrody</option>
                         <option value="workshop">Warsztat</option>
                      </select>
                   </div>
                   <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Klient (CRM)</label>
                      <select 
                        value={newProject.customerId}
                        onChange={e => setNewProject({...newProject, customerId: e.target.value})}
                        className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 ring-indigo-500 outline-none font-bold appearance-none"
                      >
                         <option value="">Wybierz klienta...</option>
                         {customers.map(c => (
                           <option key={c.id} value={c.id}>{c.name}</option>
                         ))}
                      </select>
                   </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Kod MPK (Finance)</label>
                      <input 
                        value={newProject.mpk}
                        onChange={e => setNewProject({...newProject, mpk: e.target.value})}
                        placeholder="np. PRJ-2026-01"
                        className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 ring-indigo-500 outline-none font-bold"
                      />
                   </div>
                   <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Budżet PLN</label>
                      <input 
                        type="number"
                        value={newProject.budget}
                        onChange={e => setNewProject({...newProject, budget: parseFloat(e.target.value)})}
                        className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 ring-indigo-500 outline-none font-bold"
                      />
                   </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Start</label>
                      <input 
                        type="date"
                        value={newProject.startDate}
                        onChange={e => setNewProject({...newProject, startDate: e.target.value})}
                        className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 ring-indigo-500 outline-none font-bold"
                      />
                   </div>
                   <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Koniec</label>
                      <input 
                        type="date"
                        value={newProject.endDate}
                        onChange={e => setNewProject({...newProject, endDate: e.target.value})}
                        className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 ring-indigo-500 outline-none font-bold"
                      />
                   </div>
                 </div>

                 <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Opis Krótki</label>
                    <textarea 
                      value={newProject.description}
                      onChange={e => setNewProject({...newProject, description: e.target.value})}
                      className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 ring-indigo-500 outline-none font-medium h-20 resize-none"
                    />
                 </div>
                 <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl flex items-center justify-center gap-2">
                    <Check size={18} /> Utwórz Projekt i MPK
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
