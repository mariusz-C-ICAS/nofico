/**
 * Data: 2026-05-11 19:35
 * Utworzył: Agent AI
 * Zmiany: Inicjalizacja Modułu Informacyjnego (Kokpitu Technicznego).
 * Opis: Moduł techniczny służący do monitorowania zadań, przypomnień, alertów systemowych, statusu płacowego, logistyki itp.
 * Tylko admin ma dostęp do opcji globalnych. Zwykli userzy widzą tylko powiadomienia i alerty osobiste.
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../shared/hooks/AuthContext';
import { Bell, AlertTriangle, CheckCircle, Clock, Package, Briefcase, ChevronRight, Settings, ShieldAlert, Zap } from 'lucide-react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../shared/lib/firebase';
import { KanbanModule } from '../tasks/KanbanModule';

export default function SystemInfoModule() {
  const { userData, hasPermission } = useAuth();
  const isAdmin = hasPermission('*') || hasPermission('finance.manage') || hasPermission('roles.manage');
  const [activeTab, setActiveTab] = useState<'alerts' | 'tasks' | 'logistics' | 'payroll' | 'global'>('alerts');
  
  // Zależnie od uprawnień pokazujemy różne zakładki
  const tabs = [
    { id: 'alerts', label: 'Powiadomienia', icon: Bell },
    { id: 'tasks', label: 'Moje Zadania', icon: CheckCircle },
    ...(isAdmin ? [
      { id: 'payroll', label: 'Alerty Płacowe / HR', icon: Briefcase },
      { id: 'logistics', label: 'Logistyka i Magazyn', icon: Package },
      { id: 'global', label: 'Ustawienia Globalne', icon: Settings },
    ] : [])
  ];

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="bg-gradient-to-r from-slate-900 to-indigo-900 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 opacity-20 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter mb-2 flex items-center gap-3">
              <Zap className="text-amber-400" size={32} />
              Panel Informacyjny
            </h1>
            <p className="text-indigo-200 font-medium max-w-2xl">
              {isAdmin 
                ? "Globalne centrum dowodzenia. Monitoruj alerty z działu HR, logistyki, otwarte taski i zarządaj powiadomieniami dla całej organizacji."
                : "Osobiste centrum powiadomień. Śledź swoje zadania, przypomnienia oraz najważniejsze komunikaty systemowe."}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/20 text-right">
            <div className="text-xs font-black text-indigo-300 uppercase tracking-widest mb-1">Status Systemu</div>
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              Wszystkie moduły operacyjne
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Nawigacja Boczna */}
        <div className="lg:w-1/4">
          <div className="bg-white rounded-[2rem] p-4 shadow-sm border border-slate-100 flex lg:flex-col gap-2 overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-3 px-4 py-4 md:py-3 rounded-2xl transition-all font-bold text-sm whitespace-nowrap ${
                    isActive 
                      ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
                  {tab.label}
                  {isActive && <ChevronRight size={16} className="ml-auto opacity-50 hidden lg:block" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Zawartość Zakładek */}
        <div className="lg:w-3/4">
          {activeTab === 'alerts' && (
            <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-6 flex items-center gap-2">
                <Bell className="text-amber-500" /> Najnowsze Powiadomienia
              </h2>
              <div className="space-y-4">
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex gap-4">
                  <AlertTriangle className="text-rose-500 shrink-0" />
                  <div>
                    <h4 className="font-bold text-rose-800 text-sm">Braki w badaniach BHP (Alert Testowy)</h4>
                    <p className="text-xs text-rose-600 mt-1">Dla 3 pracowników upływa termin ważności badań BHP w najbliższych 7 dniach. Proszę zweryfikować kartoteki.</p>
                  </div>
                </div>
                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex gap-4">
                  <Clock className="text-indigo-500 shrink-0" />
                  <div>
                    <h4 className="font-bold text-indigo-800 text-sm">Niezaakceptowane wnioski urlopowe</h4>
                    <p className="text-xs text-indigo-600 mt-1">Oczekujące wnioski w systemie HR od 2 dni. Wymagana akceptacja Kierownika.</p>
                  </div>
                </div>
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex gap-4">
                  <CheckCircle className="text-emerald-500 shrink-0" />
                  <div>
                    <h4 className="font-bold text-emerald-800 text-sm">Rozliczenie projektu "Budowa XYZ" zakończone</h4>
                    <p className="text-xs text-emerald-600 mt-1">Generowanie dokumentów do KSeF przebiegło pomyślnie. Status: Wysłane do księgowości.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tasks' && (
            <KanbanModule />
          )}

          {activeTab === 'payroll' && isAdmin && (
            <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100">
               <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-6 flex items-center gap-2">
                <Briefcase className="text-fuchsia-500" /> Alerty Płacowe, ZUS, Wykaz NIP
              </h2>
              <div className="space-y-4">
                 <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl">
                    <h4 className="font-black text-amber-800 text-xs uppercase tracking-widest mb-2">Biała Księga (VIES / MF)</h4>
                    <p className="text-sm text-amber-900 font-medium">1 kontrakt B2B posiada NIP, który oczekuje na ponowną weryfikację. Uruchom proces cron w ustawieniach HR.</p>
                 </div>
                 <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl">
                    <h4 className="font-black text-slate-800 text-xs uppercase tracking-widest mb-2">Potrącenia Komornicze</h4>
                    <p className="text-sm text-slate-600 font-medium">Brak nowych pism zlecających blokady na rachunkach. Listy płac mogą zostać z wygenerowane standardowo.</p>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'logistics' && isAdmin && (
            <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100">
               <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-6 flex items-center gap-2">
                <Package className="text-blue-500" /> Logistyka i Magazyn (Cross-Module)
              </h2>
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl">
                    <div className="text-3xl font-black text-blue-600 mb-1">0</div>
                    <div className="text-xs font-bold text-blue-800 uppercase tracking-widest">Braki Sprzętowe</div>
                 </div>
                 <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-2xl">
                    <div className="text-3xl font-black text-indigo-600 mb-1">12</div>
                    <div className="text-xs font-bold text-indigo-800 uppercase tracking-widest">Aktywnych Pojazdów w Trasie</div>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'global' && isAdmin && (
            <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100">
               <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-6 flex items-center gap-2">
                <Settings className="text-slate-600" /> Globalne Zasady Powiadomień
              </h2>
              
              <div className="space-y-6">
                 <div>
                    <label className="flex items-center justify-between p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                       <div>
                          <div className="font-bold text-slate-800 text-sm">Zintegrowany Alerting Slack / Discord</div>
                          <div className="text-xs text-slate-500 font-medium mt-1">Wysyłaj krytyczne anomalie na webhook (np. braki w Białej Księdze, przekroczone limity L4)</div>
                       </div>
                       <input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" />
                    </label>
                 </div>
                 <div>
                    <label className="flex items-center justify-between p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                       <div>
                          <div className="font-bold text-slate-800 text-sm">Moduł Automatycznego Generowania Monitów (Email)</div>
                          <div className="text-xs text-slate-500 font-medium mt-1">Codzienne powiadomienia dla pracowników o wygasających badaniach (30 dni przed, 7 dni przed)</div>
                       </div>
                       <input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" defaultChecked />
                    </label>
                 </div>
                 
                 <div className="p-4 bg-rose-50 border-l-4 border-rose-500 rounded-r-xl">
                    <h4 className="text-xs font-black text-rose-800 uppercase tracking-widest mb-1 flex items-center gap-1"><ShieldAlert size={14}/> STREFA ZAAWANSOWANA</h4>
                    <p className="text-xs text-rose-700 font-medium">Ustawienia integracji zewnętrznych (e-Nadawca Poczta Polska, ZUS PUE bot) zarządza się z poziomu zakładki 'Integracje'.</p>
                 </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
