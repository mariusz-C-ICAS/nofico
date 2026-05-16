/**
 * Data: 2026-05-12
 * Utworzył: Agent AI
 * Opis: Moduł Startowy z odświeżoną typografią i układem (Outfit / Inter).
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { useAuth } from '../../shared/hooks/AuthContext';
import { db } from '../../shared/lib/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';

export default function DashboardModule() {
  const { userData, roleData, activeTenantId } = useAuth();
  const [activeModules, setActiveModules] = useState<any[]>([]);

  useEffect(() => {
    if (!userData) return;
    const q = query(collection(db, 'systemModules'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allModules = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setActiveModules(allModules.filter(m => m.isActive));
    }, (error) => {
      console.error("Dashboard modules fetch error:", error);
    });
    return unsubscribe;
  }, [userData]);

  const isModuleActive = (key: string) => {
    const module = activeModules.find(m => m.key === key);
    return module !== undefined;
  };
  
  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-16 py-8">
      {/* Hero Header Section */}
      <div className="bg-[#020617] rounded-[2.5rem] shadow-2xl p-10 md:p-20 text-white relative overflow-hidden flex flex-col md:flex-row items-center md:items-end justify-between gap-12 border border-white/5">
        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-blue-600/20 rounded-full blur-[120px] -mr-40 -mt-40"></div>
        <div className="absolute bottom-0 left-0 w-[40rem] h-[40rem] bg-indigo-600/10 rounded-full blur-[120px] -ml-40 -mb-40"></div>
        
        <div className="relative z-10 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 mb-8 backdrop-blur-sm">
             <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">System Operacyjny Firmy</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tighter mb-8 leading-[0.95]">
            Twoja Firma <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">OS</span>
          </h1>
          <p className="text-slate-400 md:text-xl font-medium leading-relaxed max-w-2xl mx-auto md:mx-0">
            Zarządzaj całym cyklem życia projektów. Od pozyskania kontaktu, przez operacje w terenie, aż po inteligentne rozliczenia finansowe.
          </p>
        </div>

        <div className="relative z-10 p-1 bg-white/5 hover:bg-white/10 transition-colors rounded-[2.5rem] shadow-2xl border border-white/10">
          <div className="bg-slate-900/40 backdrop-blur-3xl p-8 rounded-[2.3rem] flex flex-col gap-6 min-w-[280px]">
             <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white text-2xl shadow-lg border border-white/10">
                   {roleData && roleData.permissions.includes('*') ? 'AD' : 'UI'}
                </div>
                <div>
                   <div className="text-sm font-display font-bold text-white tracking-wide">{roleData?.name || 'Użytkownik'}</div>
                   <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Tenant ID: {activeTenantId?.slice(0,8) || 'Domyślna'}</div>
                </div>
             </div>
             <div className="pt-6 border-t border-white/5 flex flex-col gap-2">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
                   <span>Status Systemu</span>
                   <span className="text-emerald-500 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Online</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
                   <span>Aktywne Moduły</span>
                   <span className="text-white">{activeModules.length}</span>
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-20 relative px-4 xl:px-0">
         {/* Vertical Timeline Line */}
         <div className="absolute left-[39px] top-12 bottom-12 w-[2px] bg-slate-200 hidden md:block"></div>

         {/* ETAP 1 */}
         <div className="relative md:pl-28">
            <div className="hidden md:flex absolute left-0 top-0 w-20 h-20 bg-white border-2 border-slate-200 rounded-3xl z-10 items-center justify-center shadow-sm">
               <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center font-display font-black text-blue-600 text-xl">01</div>
            </div>
            <div className="mb-10">
               <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-3 tracking-tight">Kanalizacja Sprzedaży</h2>
               <p className="text-lg text-slate-500 max-w-2xl font-medium">CRM, Lead Management i ofertowanie. Pierwszy punkt styku z klientem.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
               <Link to="/crm" className="group bg-white border border-slate-200 p-8 rounded-[2rem] hover:border-blue-500 hover:shadow-elevated transition-all flex flex-col gap-6 relative overflow-hidden">
                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 group-hover:rotate-12 transition-transform">
                     <Icons.Users size={120} />
                  </div>
                  <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:rotate-6 shadow-sm">
                     <Icons.Users size={28} />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-slate-900 text-xl tracking-tight">CRM & Pipeline</h3>
                    <p className="text-sm text-slate-500 mt-2 leading-relaxed">Centralna baza klientów, historia relacji i proces sprzedażowy.</p>
                  </div>
               </Link>
               <Link to="/crm" className="group bg-white border border-slate-200 p-8 rounded-[2rem] hover:border-blue-500 hover:shadow-elevated transition-all flex flex-col gap-6 relative overflow-hidden">
                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 group-hover:-rotate-12 transition-transform">
                     <Icons.FileText size={120} />
                  </div>
                  <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:rotate-6 shadow-sm">
                     <Icons.FileText size={28} />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-slate-900 text-xl tracking-tight">Oferty & Umowy</h3>
                    <p className="text-sm text-slate-500 mt-2 leading-relaxed">Generator profesjonalnych ofert handlowych i dokumentacji prawnej.</p>
                  </div>
               </Link>
            </div>
         </div>

         {/* ETAP 2 */}
         <div className="relative md:pl-28">
            <div className="hidden md:flex absolute left-0 top-0 w-20 h-20 bg-white border-2 border-slate-200 rounded-3xl z-10 items-center justify-center shadow-sm">
               <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center font-display font-black text-indigo-600 text-xl">02</div>
            </div>
            <div className="mb-10">
               <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-3 tracking-tight">Rdzeń Operacyjny</h2>
               <p className="text-lg text-slate-500 max-w-2xl font-medium">Realizacja projektów, logistyka i specjalizacja branżowa.</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
               {/* Core Group */}
               <div className="bg-white border border-slate-200 p-10 rounded-[2.5rem] shadow-sm flex flex-col gap-10">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                     <div className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Moduły Systemowe (Shared Core)</div>
                     <Icons.Cpu size={16} className="text-slate-300" />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    {[
                      { to: '/projects', icon: Icons.LayoutDashboard, label: 'Projekty', sub: 'Kanban & Gantt', color: 'indigo' },
                      { to: '/custom/fleet', icon: Icons.Wrench, label: 'Zasoby', sub: 'Sprzęt & Flota', color: 'blue' },
                      { to: '/services', icon: Icons.ShieldCheck, label: 'Serwis', sub: 'Tickety & SLA', color: 'emerald' },
                      { to: '/reports', icon: Icons.BarChart3, label: 'Analityka', sub: 'KPI Real-Time', color: 'fuchsia' },
                    ].map((item, idx) => (
                      <Link key={idx} to={item.to} className="group p-5 bg-slate-50 hover:bg-white hover:shadow-card rounded-2xl transition-all border border-transparent hover:border-slate-100">
                         <div className={`p-2.5 rounded-xl bg-white shadow-sm mb-4 inline-block group-hover:scale-110 transition-transform`}>
                            <item.icon size={20} className={`text-${item.color}-600`} />
                         </div>
                         <div className="font-display font-bold text-slate-900 tracking-tight">{item.label}</div>
                         <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{item.sub}</div>
                      </Link>
                    ))}
                  </div>
                  <Link to="/system" className="mt-2 flex flex-col md:flex-row items-center justify-between p-6 bg-slate-900 rounded-3xl hover:bg-black transition-all group shadow-xl">
                      <div className="flex items-center gap-4 mb-4 md:mb-0">
                         <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                            <Icons.Zap size={24} className="text-amber-400 fill-amber-400" />
                         </div>
                         <div className="text-left">
                            <div className="text-sm font-display font-bold text-white tracking-wide uppercase">Centrum Dowodzenia AI</div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Automatyczne raporty poranne</div>
                         </div>
                      </div>
                      <Icons.ArrowRight size={20} className="text-slate-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </Link>
               </div>

               {/* Industry Group */}
               <div className="bg-[#0f172a] p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                  <div className="absolute right-0 top-0 w-80 h-80 bg-blue-600 opacity-10 rounded-full blur-[100px]"></div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-6 mb-10">
                     <div className="text-[10px] font-black uppercase text-blue-400 tracking-[0.2em]">Piony Branżowe (Verticals)</div>
                     <Icons.Layers size={16} className="text-white/20" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 h-full content-start">
                     {isModuleActive('construction') && (
                       <Link to="/construction" className="bg-white/5 hover:bg-white/10 border border-white/5 rounded-3xl p-6 transition-all group/card flex flex-col h-full">
                          <Icons.HardHat size={32} className="text-amber-500 mb-6 group-hover/card:scale-110 transition-transform" />
                          <div className="mt-auto">
                            <div className="text-white font-display font-bold text-lg">Budownictwo</div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">Dziennik & Koszty</div>
                          </div>
                       </Link>
                     )}
                     {isModuleActive('gardening') && (
                       <Link to="/gardening" className="bg-white/5 hover:bg-white/10 border border-white/5 rounded-3xl p-6 transition-all group/card flex flex-col h-full">
                          <Icons.Leaf size={32} className="text-emerald-500 mb-6 group-hover/card:scale-110 transition-transform" />
                          <div className="mt-auto">
                            <div className="text-white font-display font-bold text-lg">Ogrody</div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">Harmonogram Bio</div>
                          </div>
                       </Link>
                     )}
                     <Link to="/industry-dms" className="col-span-2 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 border border-white/5 hover:border-white/10 p-5 rounded-2xl flex items-center justify-between group/add mt-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aktywuj moduły dodatkowe</span>
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center group-hover/add:bg-white/20 transition-all">
                           <Icons.Plus size={16} className="text-white" />
                        </div>
                     </Link>
                  </div>
               </div>
            </div>
         </div>

         {/* ETAP 3 */}
         <div className="relative md:pl-28">
            <div className="hidden md:flex absolute left-0 top-0 w-20 h-20 bg-white border-2 border-slate-200 rounded-3xl z-10 items-center justify-center shadow-sm">
               <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center font-display font-black text-orange-600 text-xl">03</div>
            </div>
            <div className="mb-10">
               <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-3 tracking-tight">Kapitał Ludzki</h2>
               <p className="text-lg text-slate-500 max-w-2xl font-medium">Ewidencja czasu pracy, płace i ścieżki edukacyjne BHP.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
               {[
                 { to: '/time', icon: Icons.Clock, label: 'Czas Pracy', sub: 'Logowanie & GPS', color: 'orange' },
                 { to: '/hr', icon: Icons.DollarSign, label: 'Płace', sub: 'Wynagrodzenia & Bonusy', color: 'orange' },
                 { to: '/lms', icon: Icons.BookOpen, label: 'Akademia', sub: 'Szkolenia & VOD', color: 'orange' },
               ].map((item, idx) => (
                 <Link key={idx} to={item.to} className="group bg-white border border-slate-200 p-8 rounded-[2rem] hover:border-orange-500 hover:shadow-elevated transition-all flex flex-col gap-6">
                    <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-all transform group-hover:scale-105 shadow-sm">
                       <item.icon size={32} />
                    </div>
                    <div>
                       <h3 className="font-display font-bold text-slate-900 text-xl tracking-tight">{item.label}</h3>
                       <p className="text-sm text-slate-500 mt-2 font-medium">{item.sub}</p>
                    </div>
                 </Link>
               ))}
            </div>
         </div>

         {/* ETAP 4 */}
         <div className="relative md:pl-28 pb-10">
            <div className="hidden md:flex absolute left-0 top-0 w-20 h-20 bg-white border-2 border-slate-200 rounded-3xl z-10 items-center justify-center shadow-sm">
               <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center font-display font-black text-emerald-600 text-xl">04</div>
            </div>
            <div className="mb-10">
               <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-3 tracking-tight">Finanse & Controlling</h2>
               <p className="text-lg text-slate-500 max-w-2xl font-medium text-balance">Zamknięcie procesu. Rozliczenia bilingowe, KSeF i bezpieczny skarbiec plików.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               <Link to="/vault" className="group bg-emerald-50 border border-emerald-100 p-10 rounded-[2.5rem] hover:bg-white hover:border-emerald-500 hover:shadow-elevated transition-all flex flex-col gap-8">
                  <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center text-emerald-600 group-hover:rotate-6 transition-all border border-emerald-50">
                     <Icons.Receipt size={40} />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-emerald-950 text-2xl tracking-tight">Vault Intelligence</h3>
                    <p className="text-sm text-emerald-700 mt-4 leading-relaxed font-medium">Inteligentne rozpoznawanie kosztów i przypisywanie ich do centrów zysku.</p>
                  </div>
               </Link>

               <Link to="/payments" className="group bg-emerald-50 border border-emerald-100 p-10 rounded-[2.5rem] hover:bg-white hover:border-emerald-500 hover:shadow-elevated transition-all flex flex-col gap-8">
                  <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center text-emerald-600 group-hover:rotate-6 transition-all border border-emerald-50">
                     <Icons.CreditCard size={40} />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-emerald-950 text-2xl tracking-tight">Płatności & KSeF</h3>
                    <p className="text-sm text-emerald-700 mt-4 leading-relaxed font-medium">Bramka płatności, paczki Elixir i automatyczne wysyłanie do MF.</p>
                  </div>
               </Link>

               <Link to="/dms" className="group bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] hover:border-blue-500 hover:shadow-elevated transition-all flex flex-col gap-8 relative overflow-hidden">
                  <div className="absolute right-0 top-0 opacity-10 p-8 transform rotate-12 group-hover:scale-110 transition-transform">
                     <Icons.Shield size={100} className="text-blue-500" />
                  </div>
                  <div className="w-20 h-20 bg-white/10 rounded-3xl shadow-sm flex items-center justify-center text-white group-hover:bg-blue-600 transition-all border border-white/5">
                     <Icons.Shield size={40} />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-white text-2xl tracking-tight">Skarbiec DMS</h3>
                    <p className="text-sm text-slate-400 mt-4 leading-relaxed font-medium uppercase tracking-wider">Ultra-Secure WORM Storage</p>
                  </div>
               </Link>
            </div>
         </div>
      </div>
    </div>
  );

}
