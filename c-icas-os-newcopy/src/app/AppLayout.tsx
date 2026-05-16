/**
 * Data: 2026-05-12
 * Zmiany: Inicjalizacja AppLayout (Core Layout) z myślą o PWA, NavBar.
 * Ścieżka: /src/app/AppLayout.tsx
 */
import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useTransition } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../shared/hooks/AuthContext';
import { useModules } from '../core/modules/ModuleContext';
import { useGlobalShortcuts } from '../shared/hooks/useGlobalShortcuts';
import { LogOut, BrainCircuit, WifiOff, LayoutGrid, ChevronDown, Settings, Globe, Shield, Home, Clock, Briefcase, Zap } from 'lucide-react';
import { BrandLogo } from '../shared/components/BrandLogo';
import { Breadcrumbs } from '../shared/components/Breadcrumbs';
import { Footer } from '../shared/components/Footer';
import AiCopilotChat from '../modules/aiCopilot/components/AiCopilotChat';
import { TenantSwitcher } from '../shared/components/TenantSwitcher';
import { ShortcutCommandMenu } from '../shared/components/ShortcutCommandMenu';
import { Command } from 'lucide-react';

export function AppLayout() {
  const { i18n } = useTranslation();
  const { logout, user, hasPermission } = useAuth();
  const { activeAuthModules } = useModules();
  const [isOnline, setIsOnline] = useState(window.navigator.onLine);
  
  const location = useLocation();
  
  // Inicjalizacja globalnych skrótów klawiszowych (Alt+1, Ctrl+K, Esc itp.)
  useGlobalShortcuts();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        document.body.classList.add('no-tooltips');
        // keep tooltips hidden for 2 seconds even if mouse moves slightly
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          document.body.classList.remove('no-tooltips');
        }, 2000);
      }
    };
    const handleMouse = () => {
      // only remove it if not in blackout period (managed by timeout)
      // Actually giving it a 2-second timeout is a simpler way than complex distance checking.
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      clearTimeout(timeout);
      document.body.classList.remove('no-tooltips');
    };
  }, []);

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'pl' ? 'en' : 'pl';
    i18n.changeLanguage(nextLang);
  };

  const isActive = (path: string) => location.pathname.startsWith(path);
  const tooltipClass = `absolute left-1/2 top-full mt-2 -translate-x-1/2 opacity-0 invisible transition-opacity z-[70] bg-slate-800 text-white text-xs py-2 px-3 rounded-lg shadow-xl whitespace-nowrap border border-slate-700 font-normal select-text group-hover:opacity-100 group-hover:visible`;
  const rightTooltipClass = `absolute right-0 top-full mt-2 opacity-0 invisible transition-opacity z-[70] bg-slate-800 text-white text-xs py-2 px-3 rounded-lg shadow-xl whitespace-nowrap border border-slate-700 font-normal select-text group-hover:opacity-100 group-hover:visible`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans w-full">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 md:px-8 h-20 flex flex-row items-center justify-between shadow-sm sticky top-0 z-50 w-full">
        <div className="flex items-center gap-10">
          <Link to="/dashboard" className="hover:opacity-90 transition-opacity shrink-0">
             <BrandLogo />
          </Link>
          
          <nav className="hidden lg:flex items-center gap-1">
            <div className="relative group shrink-0 z-[60]">
              <Link 
                to="/dashboard" 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-display font-bold transition-all duration-300 ${
                  location.pathname === '/dashboard' 
                  ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' 
                  : 'text-slate-500 hover:bg-white hover:text-blue-600 hover:shadow-[0_0_15px_rgba(37,99,235,0.15)] hover:-translate-y-0.5'
                }`}
              >
                Pulpit
              </Link>
              <div className={tooltipClass}>
                Główny pulpit i podsumowanie aktywności.
                <div className="absolute -top-2 left-0 right-0 h-2 rounded bg-transparent"></div>
              </div>
            </div>
            
            {/* Primary Modules Group */}
            <div className="h-4 w-[1px] bg-slate-200 mx-2"></div>
            
            <div className="flex items-center gap-1">
              {activeAuthModules.slice(0, 6).map((mod) => (
                <div key={mod.id} className="relative group shrink-0 z-[60]">
                  <Link 
                    to={mod.path} 
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-display font-medium transition-all duration-300 ${
                      isActive(mod.path)
                      ? 'bg-fuchsia-50 text-fuchsia-700 shadow-sm border border-fuchsia-100'
                      : 'text-slate-500 hover:bg-white hover:text-fuchsia-600 hover:shadow-[0_0_15px_rgba(192,38,211,0.15)] hover:-translate-y-0.5'
                    }`}
                  >
                    {mod.name.split(' ')[0]} {/* Shorten the name to save space e.g. "HR & Płace" -> "HR" */}
                  </Link>
                  <div className={`${tooltipClass} text-center`}>
                    Moduł: {mod.name}. <br/><span className="text-slate-300">Kliknij aby uzyskać dostęp.</span>
                    <div className="absolute -top-2 left-0 right-0 h-2 bg-transparent"></div>
                  </div>
                </div>
              ))}
              
              {activeAuthModules.length > 6 && (
                <div className="relative group cursor-pointer shrink-0 z-[60]">
                  <div className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-display font-medium text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-[0_0_15px_rgba(148,163,184,0.2)] hover:-translate-y-0.5 transition-all duration-300">
                    <span>Inne</span>
                    <ChevronDown size={14} className="group-hover:rotate-180 transition-transform" />
                  </div>
                  <div className={`absolute top-full left-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-elevated opacity-0 invisible transition-all py-2 z-[60] group-hover:opacity-100 group-hover:visible`}>
                    {activeAuthModules.slice(6).map((mod) => (
                      <Link 
                        key={mod.id} 
                        to={mod.path} 
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                      >
                        <LayoutGrid size={16} className="text-slate-400" />
                        {mod.name}
                      </Link>
                    ))}
                    <div className="absolute -top-2 left-0 right-0 h-2 bg-transparent"></div>
                  </div>
                </div>
              )}
            </div>

            {user && (hasPermission('*') || hasPermission('roles.manage')) && (
              <div className="relative group shrink-0 z-[60] ml-4">
                <Link 
                  to="/admin" 
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-display font-bold transition-all duration-300 ${
                    isActive('/admin')
                    ? 'bg-red-50 text-red-700 shadow-sm border border-red-100'
                    : 'text-red-500 hover:bg-white hover:shadow-[0_0_15px_rgba(220,38,38,0.15)] hover:-translate-y-0.5'
                  }`}
                >
                  <Shield size={16} />
                  Panel Admina
                </Link>
                <div className={`${tooltipClass} text-center`}>
                  Centrum dowodzenia systemem.<br/><span className="text-slate-300">Zarządzaj użytkownikami i systemem.</span>
                  <div className="absolute -top-2 left-0 right-0 h-2 bg-transparent"></div>
                </div>
              </div>
            )}
          </nav>
        </div>
        
        <div className="flex items-center gap-3 md:gap-4">
          <ShortcutCommandMenu />

          <div className="relative group z-[60]">
            <TenantSwitcher />
            <div className={rightTooltipClass}>
              Przełącz konetkst (Firma)
              <div className="absolute -top-2 right-4 h-2 w-4 bg-transparent"></div>
            </div>
          </div>
          
          <div className="relative group z-[60]">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-2xl">
              <button 
                onClick={toggleLanguage}
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 px-3 py-1.5 rounded-xl hover:bg-white transition-all cursor-pointer"
              >
                <Globe size={14} />
                {i18n.language}
              </button>
            </div>
            <div className={rightTooltipClass}>
              Zmień język systemu
              <div className="absolute -top-2 right-4 h-2 w-4 bg-transparent"></div>
            </div>
          </div>

          <div className="relative group z-[60]">
            <Link 
              to="/settings" 
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all hidden md:flex"
            >
              <Settings size={20} />
            </Link>
            <div className={rightTooltipClass}>
              Ustawienia użytkownika
              <div className="absolute -top-2 right-4 h-2 w-4 bg-transparent"></div>
            </div>
          </div>
          
          {user && (
            <div className="relative group z-[60]">
              <button 
                onClick={logout}
                className="flex items-center justify-center w-10 h-10 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all cursor-pointer border border-transparent hover:border-red-100 shadow-sm md:shadow-none"
              >
                <LogOut size={18} />
              </button>
              <div className={rightTooltipClass}>
                Wyloguj się
                <div className="absolute -top-2 right-4 h-2 w-4 bg-transparent"></div>
              </div>
            </div>
          )}

          {!isOnline && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-full border border-rose-100 animate-pulse shrink-0">
               <WifiOff size={14} />
               <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Offline</span>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-auto flex flex-col relative w-full">
        <div className="p-4 md:p-8 pb-20 md:pb-12 flex-1 w-full max-w-7xl mx-auto">
          {user && <Breadcrumbs />}
          {user && <AiCopilotChat />}
          <Outlet />
        </div>
        <Footer />
      </main>
      
      {/* PWA Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200 flex justify-around p-3 pb-safe z-[49] shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
        <Link to="/dashboard" className={`flex flex-col items-center ${location.pathname==='/dashboard' ? 'text-blue-600' : 'text-slate-400'}`}>
           <Home className="w-6 h-6" />
           <span className="text-[10px] mt-1 font-bold">Start</span>
        </Link>
        <Link to="/time" className={`flex flex-col items-center ${location.pathname.startsWith('/time') ? 'text-blue-600' : 'text-slate-400'}`}>
           <Clock className="w-6 h-6" />
           <span className="text-[10px] mt-1 font-bold">Czas</span>
        </Link>
        <Link to="/projects" className={`flex flex-col items-center ${isActive('/projects') ? 'text-blue-600' : 'text-slate-400'}`}>
           <Briefcase className="w-6 h-6" />
           <span className="text-[10px] mt-1 font-bold">Projekty</span>
        </Link>
        <Link to="/ai" className={`flex flex-col items-center ${isActive('/ai') ? 'text-purple-600' : 'text-slate-400'}`}>
           <Zap className="w-6 h-6" />
           <span className="text-[10px] mt-1 font-bold">AI</span>
        </Link>
      </div>
    </div>
  );
}

