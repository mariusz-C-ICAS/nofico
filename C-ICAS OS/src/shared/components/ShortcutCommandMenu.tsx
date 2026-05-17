/**
 * Data: 2026-05-17
 * Zmiany: Globalny system skrótów — 55+ tras, grupowanie kategoriami, pole `keys`.
 * ZASADA: każdy nowy ekran, raport i funkcja MUSI mieć unikalny wpis w SHORTCUTS.
 */
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, Command, X, ArrowRight, Star, History, Hash, LayoutGrid } from 'lucide-react';
import { useAuth } from '../hooks/AuthContext';

export interface Shortcut {
  code: string;
  label: string;
  path: string;
  description: string;
  category: string;
  permission?: string;
  pin?: boolean;
  keys?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// KATALOG SKRÓTÓW — ZASADA: każdy nowy ekran/raport/funkcja dostaje unikalny
// kod (max 4 znaki). Bez wpisu tutaj funkcja jest niewidoczna w Command Bar.
// ─────────────────────────────────────────────────────────────────────────────
export const SHORTCUTS: Shortcut[] = [
  // PULPIT
  { code: '/db',   label: 'Dashboard',           path: '/',                       description: 'Główny pulpit systemowy',         category: 'Pulpit',              keys: 'Alt+1' },
  { code: '/ai',   label: 'AI Copilot',           path: '/ai-copilot',             description: 'Asystent AI (Gemini)',            category: 'Pulpit' },
  // OPERACJE
  { code: '/tm',   label: 'Czas Pracy',           path: '/time',                   description: 'Rejestracja czasu pracy',         category: 'Operacje' },
  { code: '/kb',   label: 'Kanban',               path: '/kanban',                 description: 'Tablica zadań',                   category: 'Operacje' },
  { code: '/pr',   label: 'Projekty',             path: '/projects',               description: 'Zarządzanie projektami',          category: 'Operacje' },
  { code: '/cr',   label: 'CRM & Sprzedaż',       path: '/crm',                    description: 'Leady, pipeline, klienci',        category: 'Operacje',            keys: 'Alt+2' },
  { code: '/cm',   label: 'Komunikacja',           path: '/communication',          description: 'Wiadomości i ogłoszenia',         category: 'Operacje' },
  // FINANSE
  { code: '/fi',   label: 'Finanse (FI)',          path: '/finance',                description: 'Operacje i księgowość',           category: 'Finanse',             keys: 'Alt+3' },
  { code: '/fco',  label: 'Kontrahenci',           path: '/finance/contractors',    description: 'Baza kontrahentów',               category: 'Finanse' },
  { code: '/fas',  label: 'Środki Trwałe',         path: '/finance/assets',         description: 'Ewidencja majątku',               category: 'Finanse' },
  { code: '/fbr',  label: 'Biuro Rachunkowe',      path: '/finance/bureau',         description: 'Obsługa biura rachunkowego',      category: 'Finanse' },
  { code: '/fex',  label: 'Koszty FI',             path: '/finance/expenses',       description: 'Wydatki finansowe',               category: 'Finanse' },
  { code: '/frec', label: 'Faktury Cykliczne',     path: '/finance/recurring',      description: 'Automatyczne faktury cykliczne',  category: 'Finanse' },
  { code: '/fpu',  label: 'Zakupy (PO)',           path: '/finance/purchasing',     description: 'Zamówienia zakupowe',             category: 'Finanse' },
  { code: '/co',   label: 'Controlling (CO)',      path: '/controlling',            description: 'Budżety, KPI, analiza kosztów',   category: 'Finanse' },
  { code: '/py',   label: 'Płatności',             path: '/payments',               description: 'Przelewy i transakcje',           category: 'Finanse' },
  { code: '/sw',   label: 'Swipe & Match',         path: '/swipe',                  description: 'Kwalifikacja wydatków',           category: 'Finanse' },
  { code: '/exp',  label: 'Wydatki & Zwroty',      path: '/expenses',               description: 'Wnioski out-of-pocket',           category: 'Finanse' },
  { code: '/ag',   label: 'AI Guardian',           path: '/ai-guardian',            description: 'Cenzura zrzutów ekranu (Edge AI)',category: 'Finanse' },
  { code: '/xp',   label: 'Eksport Danych',        path: '/export',                 description: 'ZIP, XML, FEC, GoBD, NAS',        category: 'Finanse' },
  // HR & SZKOLENIA
  { code: '/hr',   label: 'HR & Płace',            path: '/hr',                     description: 'Kadry, wypłaty, czas pracy',      category: 'HR & Szkolenia',      keys: 'Alt+4' },
  { code: '/hrp',  label: 'Płace & Wynagrodzenia', path: '/hr/payroll',             description: 'Wynagrodzenia, ZUS, PIT-11',      category: 'HR & Szkolenia' },
  { code: '/hro',  label: 'Struktura Org.',        path: '/hr/org-structure',       description: 'Hierarchia organizacyjna',        category: 'HR & Szkolenia' },
  { code: '/hrr',  label: 'eRekrutacja (ATS)',     path: '/hr/recruitment',         description: 'Oferty pracy, kandydaci',         category: 'HR & Szkolenia' },
  { code: '/hrc',  label: 'Kompetencje',           path: '/hr/competencies',        description: 'Słownik i matryca kompetencji',   category: 'HR & Szkolenia' },
  { code: '/hrn',  label: 'Retencja HR',           path: '/hr/retention',           description: 'Analiza odejść pracowników',      category: 'HR & Szkolenia' },
  { code: '/lm',   label: 'Szkolenia (LMS)',       path: '/lms',                    description: 'Kursy, certyfikaty, quizy',       category: 'HR & Szkolenia' },
  { code: '/wl',   label: 'Wellbeing',             path: '/wellness',               description: 'Aktywność, benefity, ankiety',    category: 'HR & Szkolenia' },
  // COMPLIANCE & ESG
  { code: '/cp',   label: 'Compliance / RODO',     path: '/compliance',             description: 'GDPR, ISMS, NIS2, BHP',           category: 'Compliance & ESG',    permission: 'compliance.view' },
  { code: '/eg',   label: 'ESG Reporting',         path: '/esg',                    description: 'Środowisko, ESG, CSRD',           category: 'Compliance & ESG' },
  { code: '/ql',   label: 'Jakość (NCR/CAPA)',     path: '/quality',                description: 'Niezgodności i działania korygujące', category: 'Compliance & ESG' },
  { code: '/lv',   label: 'Legal Vault (KSH)',     path: '/legal-vault',            description: 'Art. 210 KSH, generator umów',    category: 'Compliance & ESG' },
  // DOKUMENTY & PROCESY
  { code: '/dm',   label: 'Skarbiec (DMS)',         path: '/dms',                   description: 'Dokumenty, WORM, archiwum',       category: 'Dokumenty',           keys: 'Alt+5' },
  { code: '/es',   label: 'E-Podpis',              path: '/esignature',             description: 'Podpisywanie elektroniczne',      category: 'Dokumenty' },
  { code: '/wf',   label: 'Workflow / Obieg',      path: '/workflow',               description: 'Automatyzacja procesów',          category: 'Dokumenty' },
  { code: '/mk',   label: 'Marketing Review',      path: '/marketing',              description: 'Treści, kampanie, materiały',     category: 'Dokumenty' },
  // SERWISY & LOGISTYKA
  { code: '/fs',   label: 'Field Service',         path: '/field-service',          description: 'Zlecenia terenowe, kalendarz',    category: 'Serwisy & Logistyka' },
  { code: '/bk',   label: 'Booking',               path: '/booking',                description: 'Rezerwacje, wizyty, pakiety',     category: 'Serwisy & Logistyka' },
  { code: '/lg',   label: 'Logistyka & Flota',     path: '/logistics',              description: 'Transport, magazyn, flota',       category: 'Serwisy & Logistyka' },
  // BRANŻOWE
  { code: '/icon', label: 'Budownictwo',           path: '/industry/construction',  description: 'Moduł branżowy — budowlany',      category: 'Branżowe' },
  { code: '/igar', label: 'Ogrodnictwo',           path: '/industry/gardening',     description: 'Moduł branżowy — ogrodniczy',     category: 'Branżowe' },
  { code: '/icln', label: 'Sprzątanie',            path: '/industry/cleaning',      description: 'Moduł branżowy — cleaning',       category: 'Branżowe' },
  { code: '/iflt', label: 'Flota Branżowa',        path: '/industry/fleet',         description: 'Moduł branżowy — flota',          category: 'Branżowe' },
  // SYSTEM
  { code: '/st',   label: 'Ustawienia',            path: '/settings',               description: 'Preferencje użytkownika',         category: 'System' },
  { code: '/xc',   label: 'Multi-Firma',           path: '/cross-company',          description: 'Zarządzanie wielofirmowe',         category: 'System' },
  // ADMIN
  { code: '/ad',   label: 'Panel Admina',          path: '/admin',                  description: 'Centrum dowodzenia systemem',     category: 'Admin',               permission: 'roles.manage' },
  { code: '/asc',  label: 'Admin: Bezpieczeństwo', path: '/admin/security',         description: 'Logi, polityki, 2FA',             category: 'Admin',               permission: 'roles.manage' },
  { code: '/arl',  label: 'Admin: Role',           path: '/admin/roles',            description: 'Role i uprawnienia użytkowników', category: 'Admin',               permission: 'roles.manage' },
  { code: '/abi',  label: 'Admin: Billing',        path: '/admin/billing',          description: 'Plan, faktury, licencja',         category: 'Admin',               permission: 'roles.manage' },
  { code: '/atn',  label: 'Admin: Tenants',        path: '/admin/tenants',          description: 'Zarządzanie tenantami',           category: 'Admin',               permission: 'roles.manage' },
  { code: '/asy',  label: 'Admin: Moduły',         path: '/admin/system',           description: 'Włącz/wyłącz moduły systemu',    category: 'Admin',               permission: 'roles.manage' },
  { code: '/aup',  label: 'Admin: Aktualizacje',   path: '/admin/updates',          description: 'Wersja, licencja, changelog',     category: 'Admin',               permission: 'roles.manage' },
  { code: '/aint', label: 'Admin: Integracje',     path: '/admin/integrations',     description: 'API, KSeF, OAuth, webhooks',      category: 'Admin',               permission: 'roles.manage' },
  { code: '/aifr', label: 'Admin: iFrames',        path: '/admin/iframes',          description: 'Konfiguracja embedów zewnętrznych', category: 'Admin',             permission: 'roles.manage' },
  { code: '/aai',  label: 'Admin: AI Config',      path: '/admin/ai',               description: 'Modele AI, klucze, limity',       category: 'Admin',               permission: 'roles.manage' },
  { code: '/art',  label: 'Admin: Retencja',       path: '/admin/retention',        description: 'Polityki retencji danych',        category: 'Admin',               permission: 'roles.manage' },
  { code: '/anot', label: 'Admin: Powiadomienia',  path: '/admin/notifications',    description: 'Kanały push, email, SMS',         category: 'Admin',               permission: 'roles.manage' },
  { code: '/aust', label: 'Admin: Auth Struct.',   path: '/admin/auth/structural',  description: 'Uprawnienia strukturalne',        category: 'Admin',               permission: 'roles.manage' },
  { code: '/aufi', label: 'Admin: Auth Pól',       path: '/admin/auth/fields',      description: 'Autoryzacja na poziomie pól',     category: 'Admin',               permission: 'roles.manage' },
  { code: '/atd',  label: 'Admin: Dane Testowe',   path: '/admin/testdata',         description: 'Generator danych testowych',      category: 'Admin',               permission: 'roles.manage' },
];

export function ShortcutCommandMenu({ alwaysVisible = false }: { alwaysVisible?: boolean } = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isInlineOpen, setIsInlineOpen] = useState(() => {
    try { return localStorage.getItem('c-icas-inline-open') === 'true'; }
    catch { return false; }
  });
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);

  const inlineInputRef = useRef<HTMLInputElement>(null);
  const modalInputRef = useRef<HTMLInputElement>(null);
  const isInitialMount = useRef(true);
  const navigate = useNavigate();
  const { hasPermission, user } = useAuth();

  useEffect(() => {
    localStorage.setItem('c-icas-inline-open', isInlineOpen.toString());
  }, [isInlineOpen]);

  useEffect(() => {
    try {
      const savedRecent = localStorage.getItem('c-icas-recent-shortcuts');
      const savedFavs = localStorage.getItem('c-icas-fav-shortcuts');
      if (savedRecent) {
        const p = JSON.parse(savedRecent);
        if (Array.isArray(p)) setRecent(p.filter(r => typeof r === 'string'));
      }
      if (savedFavs) {
        const p = JSON.parse(savedFavs);
        if (Array.isArray(p)) setFavorites(p.filter(r => typeof r === 'string'));
      }
    } catch { /* ignore */ }
  }, []);

  const allowedShortcuts = SHORTCUTS.filter(s =>
    !s.permission || hasPermission(s.permission) || hasPermission('*')
  );

  const filteredShortcuts = allowedShortcuts.filter(s => {
    if (!query) return true;
    const q = query.toLowerCase();
    return s.code.toLowerCase().includes(q) || s.label.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
  });

  const grouped = filteredShortcuts.reduce<Record<string, Shortcut[]>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  const recentShortcuts = allowedShortcuts.filter(s => recent.includes(s.code));
  const favoriteShortcuts = allowedShortcuts.filter(s => favorites.includes(s.code));

  const saveRecent = (code: string) => {
    if (!code) return;
    const next = [code, ...recent.filter(c => c !== code)].slice(0, 20);
    setRecent(next);
    localStorage.setItem('c-icas-recent-shortcuts', JSON.stringify(next));
  };

  const toggleFavorite = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    const next = favorites.includes(code) ? favorites.filter(c => c !== code) : [...favorites, code];
    setFavorites(next);
    localStorage.setItem('c-icas-fav-shortcuts', JSON.stringify(next));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) setIsOpen(false);
        else setIsInlineOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        if (isOpen) setIsOpen(false);
        else if (isInlineOpen) setIsInlineOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, isInlineOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isInlineOpen || isOpen) return;
      if (e.key === 'Enter' && query.trim()) {
        e.preventDefault();
        const best = filteredShortcuts[0];
        if (best) { handleSelect(best); setHistoryIndex(-1); }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (recent.length > 0) {
          const i = Math.min(historyIndex + 1, recent.length - 1);
          setHistoryIndex(i); setQuery(recent[i]);
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex > 0) { const i = historyIndex - 1; setHistoryIndex(i); setQuery(recent[i]); }
        else if (historyIndex === 0) { setHistoryIndex(-1); setQuery(''); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isInlineOpen, isOpen, query, filteredShortcuts, historyIndex, recent]);

  useEffect(() => {
    if (isInitialMount.current) { isInitialMount.current = false; return; }
    if (isOpen) setTimeout(() => modalInputRef.current?.focus(), 50);
    else if (isInlineOpen) setTimeout(() => inlineInputRef.current?.focus(), 50);
  }, [isOpen, isInlineOpen]);

  if (!user) return null;

  const handleSelect = (s: Shortcut) => {
    navigate(s.path);
    saveRecent(s.code);
    setHistoryIndex(-1);
    setQuery('');
    setIsOpen(false);
    setShowDropdown(false);
  };

  return (
    <>
      {/* PRZYCISK (stan zamknięty / mobile) — ukryty gdy alwaysVisible */}
      {!alwaysVisible && (
        <div className={`relative group z-[60] ${isInlineOpen ? 'lg:hidden' : ''}`}>
          <button
            className="flex items-center justify-center w-8 h-8 lg:w-10 lg:h-10 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-full transition-all cursor-pointer border border-transparent"
            onClick={() => window.innerWidth < 1024 ? setIsOpen(true) : setIsInlineOpen(true)}
          >
            <Command size={18} className="hidden lg:block" />
            <Search size={18} className="lg:hidden" />
          </button>
          <div className="absolute right-0 top-full mt-2 opacity-0 invisible transition-opacity z-[70] bg-slate-800 text-white text-xs py-2 px-3 rounded-lg shadow-xl whitespace-nowrap border border-slate-700 font-normal group-hover:opacity-100 group-hover:visible">
            Szybkie transakcje (Ctrl+K)
          </div>
        </div>
      )}

      {/* INLINE COMMAND BAR */}
      {(isInlineOpen || alwaysVisible) && (
        <div className={alwaysVisible ? 'relative w-full' : 'relative z-[100] hidden lg:block'}>
          <div className={`${alwaysVisible ? 'flex w-full' : 'hidden lg:flex w-[350px]'} items-center bg-slate-100/80 rounded-xl px-1.5 h-10 border border-slate-200 transition-all focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:bg-white animate-in slide-in-from-right-4 fade-in duration-200 shadow-sm relative`}>
            {alwaysVisible ? (
              <span className="p-1.5 text-indigo-500 shrink-0"><Command size={16} /></span>
            ) : (
              <button onClick={() => setIsInlineOpen(false)} className="p-1.5 text-indigo-500 hover:bg-slate-200 rounded-lg transition-colors shrink-0" title="Zamknij linię komend">
                <Command size={16} />
              </button>
            )}
            <input
              ref={inlineInputRef}
              type="text"
              className="flex-1 bg-transparent px-2 py-1 outline-none text-slate-800 placeholder-slate-400 font-bold text-sm"
              placeholder="Wpisz skrót np. /hrp, /fi, /arl..."
              value={query}
              onChange={e => { setQuery(e.target.value); setHistoryIndex(-1); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            />
            {query && filteredShortcuts[0] && (
              <div
                className="px-2 py-1 mr-1 bg-white text-indigo-600 rounded-md shadow-sm border border-slate-200 flex items-center gap-1 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition-colors shrink-0 text-[10px]"
                onClick={() => handleSelect(filteredShortcuts[0])}
              >
                <span className="font-bold font-mono">uruchom: {filteredShortcuts[0].code}</span>
                <ArrowRight size={12} className="text-indigo-400" />
              </div>
            )}
            <div className="w-[1px] h-4 bg-slate-300 mx-1 shrink-0" />
            <button
              onClick={() => { setIsOpen(true); setIsInlineOpen(false); setQuery(''); }}
              title="Otwórz pełny katalog (#)"
              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <Hash size={16} />
            </button>
          </div>

          {/* DROPDOWN — ostatnie komendy */}
          {!query && recentShortcuts.length > 0 && showDropdown && (
            <div className={`absolute top-full ${alwaysVisible ? 'left-0 w-full max-w-[640px]' : 'right-0 w-[350px]'} bg-white border border-slate-200 rounded-xl shadow-xl z-[110] py-2 overflow-hidden animate-in fade-in slide-in-from-top-2`}>
              <div className="px-3 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Ostatnie komendy</div>
              <div className="max-h-[200px] overflow-y-auto">
                {recentShortcuts.slice(0, 5).map(s => (
                  <button key={`inline-rec-${s.code}`} onClick={() => handleSelect(s)}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 text-left transition-colors border-l-2 border-transparent hover:border-indigo-500 group"
                  >
                    <div className="flex flex-col">
                      <span className="font-bold text-xs text-slate-700">{s.label}</span>
                      <span className="text-[10px] text-slate-500 line-clamp-1">{s.description}</span>
                    </div>
                    <span className="font-mono text-[10px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors whitespace-nowrap ml-2">
                      {s.code}{s.keys && <span className="opacity-60 ml-1">({s.keys})</span>}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* FULL MODAL SPOTLIGHT */}
      {isOpen && createPortal(
        <div className="fixed inset-0 z-[110] flex items-start justify-center pt-20 bg-slate-900/40 backdrop-blur-sm sm:px-6 md:px-0">
          <div className="fixed inset-0 cursor-pointer" onClick={() => setIsOpen(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[85vh] z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center px-4 py-4 border-b border-slate-100 bg-slate-50/50">
              <Search size={22} className="text-indigo-500 shrink-0" />
              <input
                ref={modalInputRef}
                type="text"
                className="flex-1 bg-transparent px-4 py-2 outline-none text-slate-800 placeholder-slate-400 font-bold text-lg"
                placeholder="Szukaj ekranu, skrótu, kategorii..."
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shrink-0 shadow-sm">
                <Command size={12} /> K
              </div>
              <button onClick={() => setIsOpen(false)} className="ml-3 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto p-3 bg-slate-50/50 flex-1">
              {/* Ulubione i ostatnie — tylko gdy brak zapytania */}
              {!query && (
                <>
                  {favoriteShortcuts.length > 0 && (
                    <div className="mb-4">
                      <div className="px-3 pb-2 text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <Star size={12} className="text-amber-400" /> Ulubione
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {favoriteShortcuts.map(s => (
                          <ShortcutItem key={`fav-${s.code}`} s={s} onSelect={() => handleSelect(s)} isFav={true} onToggleFav={e => toggleFavorite(e, s.code)} />
                        ))}
                      </div>
                    </div>
                  )}
                  {recentShortcuts.length > 0 && (
                    <div className="mb-4">
                      <div className="px-3 pb-2 text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <History size={12} /> Ostatnio używane
                      </div>
                      <div className="space-y-1">
                        {recentShortcuts.map(s => (
                          <ShortcutItem key={`rec-${s.code}`} s={s} onSelect={() => handleSelect(s)} isFav={favorites.includes(s.code)} onToggleFav={e => toggleFavorite(e, s.code)} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Katalog pogrupowany kategoriami */}
              {Object.keys(grouped).length > 0 ? (
                Object.entries(grouped).map(([category, items]) => (
                  <div key={category} className="mb-4">
                    <div className="px-3 pb-2 text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <LayoutGrid size={12} /> {category}
                    </div>
                    <div className="space-y-1">
                      {items.map(s => (
                        <ShortcutItem key={s.code} s={s} onSelect={() => handleSelect(s)} isFav={favorites.includes(s.code)} onToggleFav={e => toggleFavorite(e, s.code)} />
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-100 shadow-sm mt-2">
                  <Hash size={32} className="mx-auto mb-3 text-slate-200" />
                  <p className="text-sm font-bold text-slate-600">Nie znaleziono dla „{query}"</p>
                  <p className="text-xs text-slate-400 mt-1">Sprawdź uprawnienia lub wpisz inny skrót.</p>
                </div>
              )}
            </div>

            <div className="px-5 py-3 bg-white border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>{allowedShortcuts.length} skrótów dostępnych · Zero-Trust auth</span>
              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[10px]">↑ ↓ ↵</span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

function ShortcutItem({ s, onSelect, isFav, onToggleFav }: {
  s: Shortcut; onSelect: () => void; isFav: boolean; onToggleFav: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-xl hover:bg-indigo-50 hover:border-indigo-100 border border-transparent hover:shadow-sm text-left transition-all group cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <div
          role="button"
          onClick={onToggleFav}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isFav ? 'text-amber-400 hover:bg-amber-50' : 'text-slate-300 hover:text-amber-400 hover:bg-slate-100 opacity-0 group-hover:opacity-100'}`}
        >
          <Star size={16} fill={isFav ? 'currentColor' : 'none'} />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm text-slate-700 group-hover:text-indigo-700 transition-colors">{s.label}</span>
          <span className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{s.description}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono text-[11px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors whitespace-nowrap">
          {s.code}{s.keys && <span className="opacity-60 ml-1">({s.keys})</span>}
        </span>
        <ArrowRight size={14} className="text-indigo-400 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
      </div>
    </button>
  );
}
