/**
 * Data: 2026-05-13
 * Zmiany: Rozbudowa Command Menu (Spotlight) do modelu dwuetapowego (inline + modal). 
 * Dodano funkcję ostatnio używanych i ulubionych skrótów, uwierzytelnianie uprawnień, logikę zachowania historii w localStorage.
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
  permission?: string;
  pin?: boolean;
}

export const SHORTCUTS: Shortcut[] = [
  { code: '/dash', label: 'Start', path: '/dashboard', description: 'Główny pulpit systemowy' },
  { code: '/admin', label: 'Panel Dowodzenia', path: '/admin', description: 'Zarządzanie systemem', permission: 'roles.manage' },
  { code: '/crm', label: 'Sprzedaż i CRM', path: '/crm', description: 'Moduł sprzedaży i klientów' },
  { code: '/hr', label: 'HR i Płace', path: '/hr', description: 'Kadry, wypłaty, czas pracy' },
  { code: '/finance', label: 'Finanse', path: '/finance', description: 'Operacje i księgowość' },
  { code: '/dms', label: 'Skarbiec (DMS)', path: '/dms', description: 'Obieg dokumentów' },
  { code: '/settings', label: 'Ustawienia', path: '/settings', description: 'Preferencje' },
];

export function ShortcutCommandMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [isInlineOpen, setIsInlineOpen] = useState(() => {
    try {
      return localStorage.getItem('c-icas-inline-open') === 'true';
    } catch(e) {
      return false;
    }
  });
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  
  const inlineInputRef = useRef<HTMLInputElement>(null);
  const modalInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { hasPermission, user } = useAuth();

  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    localStorage.setItem('c-icas-inline-open', isInlineOpen.toString());
  }, [isInlineOpen]);

  const allowedShortcuts = SHORTCUTS.filter(s => {
    if (s.permission && !hasPermission(s.permission) && !hasPermission('*')) return false;
    return true;
  });

  const filteredShortcuts = allowedShortcuts.filter(s => {
    if (!query) return true;
    const searchLow = query.toLowerCase();
    return s.code.toLowerCase().includes(searchLow) || s.label.toLowerCase().includes(searchLow) || s.description.toLowerCase().includes(searchLow);
  });

  const recentShortcuts = allowedShortcuts.filter(s => recent.includes(s.code));
  const favoriteShortcuts = allowedShortcuts.filter(s => favorites.includes(s.code));

  useEffect(() => {
    // Load from local storage safely
    try {
      const savedRecent = localStorage.getItem('c-icas-recent-shortcuts');
      const savedFavs = localStorage.getItem('c-icas-fav-shortcuts');
      if (savedRecent) {
        const parsed = JSON.parse(savedRecent);
        if (Array.isArray(parsed)) setRecent(parsed.filter(r => typeof r === 'string'));
      }
      if (savedFavs) {
        const parsed = JSON.parse(savedFavs);
        if (Array.isArray(parsed)) setFavorites(parsed.filter(r => typeof r === 'string'));
      }
    } catch(e) {
      console.error("Failed to parse shortcuts", e);
    }
  }, []);

  const saveRecent = (code: string) => {
    if (!code) return;
    const newRecent = [code, ...recent.filter(c => c !== code)].slice(0, 20);
    setRecent(newRecent);
    localStorage.setItem('c-icas-recent-shortcuts', JSON.stringify(newRecent));
  };

  const toggleFavorite = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    const newFavs = favorites.includes(code) ? favorites.filter(c => c !== code) : [...favorites, code];
    setFavorites(newFavs);
    localStorage.setItem('c-icas-fav-shortcuts', JSON.stringify(newFavs));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          setIsOpen(false);
        } else {
          setIsInlineOpen(prev => !prev);
        }
      }
      if (e.key === 'Escape') {
        if (isOpen) setIsOpen(false);
        else if (isInlineOpen) setIsInlineOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isInlineOpen]);

  // Handle keyboard events in inline input
  useEffect(() => {
    const handleInlineKeys = (e: KeyboardEvent) => {
      if (isInlineOpen && !isOpen) {
        if (e.key === 'Enter' && query.trim()) {
          e.preventDefault();
          const bestMatch = filteredShortcuts[0];
          if (bestMatch) {
            handleSelect(bestMatch);
            setHistoryIndex(-1);
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (recent.length > 0) {
            const newIndex = Math.min(historyIndex + 1, recent.length - 1);
            setHistoryIndex(newIndex);
            setQuery(recent[newIndex]);
          }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setQuery(recent[newIndex]);
          } else if (historyIndex === 0) {
            setHistoryIndex(-1);
            setQuery(''); // Reset to empty if we go past the most recent
          }
        }
      }
    };
    window.addEventListener('keydown', handleInlineKeys);
    return () => window.removeEventListener('keydown', handleInlineKeys);
  }, [isInlineOpen, isOpen, query, filteredShortcuts, historyIndex, recent]);

  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    if (isOpen) {
      setTimeout(() => modalInputRef.current?.focus(), 50);
    } else if (isInlineOpen) {
      setTimeout(() => inlineInputRef.current?.focus(), 50);
    }
  }, [isOpen, isInlineOpen]);

  if (!user) return null;

  const handleSelect = (s: Shortcut) => {
    navigate(s.path);
    saveRecent(s.code);
    setHistoryIndex(-1);
    setQuery(''); // Wyczyść tekst po skrócie wg: "on musi zniknąć, przejść do historii"
    setIsOpen(false); // Musimy zamknąć full modal (ciemny ekran)
    // Zgodnie z zasadami ergonomii chowamy tylko dropdown, aby user mógł kontynuować pracę bez klikania
    setShowDropdown(false); 
  };

  return (
    <>
      {/* COMMAND BUTTON (CLOSED STATE OR MOBILE) */}
      <div className={`relative group z-[60] ${isInlineOpen ? 'lg:hidden' : ''}`}>
        <button 
          className="flex items-center justify-center w-8 h-8 lg:w-10 lg:h-10 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-full transition-all cursor-pointer border border-transparent"
          onClick={() => {
            if (window.innerWidth < 1024) {
              setIsOpen(true);
            } else {
              setIsInlineOpen(true);
            }
          }}
        >
          <Command size={18} className="hidden lg:block" />
          <Search size={18} className="lg:hidden" />
        </button>
        <div className="absolute right-0 top-full mt-2 opacity-0 invisible transition-opacity z-[70] bg-slate-800 text-white text-xs py-2 px-3 rounded-lg shadow-xl whitespace-nowrap border border-slate-700 font-normal group-hover:opacity-100 group-hover:visible">
          Szybkie transakcje (Ctrl+K)
          <div className="absolute -top-2 right-4 h-2 w-4 bg-transparent"></div>
        </div>
      </div>

      {/* INLINE COMMAND BAR */}
      {isInlineOpen && (
        <div className="relative z-[100] hidden lg:block">
          <div className="hidden lg:flex items-center bg-slate-100/80 rounded-xl px-1.5 h-10 w-[350px] border border-slate-200 transition-all focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:bg-white animate-in slide-in-from-right-4 fade-in duration-200 shadow-sm relative">
            <button
              onClick={() => setIsInlineOpen(false)}
              className="p-1.5 text-indigo-500 hover:bg-slate-200 rounded-lg transition-colors shrink-0"
              title="Zamknij linię komend"
            >
              <Command size={16} />
            </button>
            <input
              ref={inlineInputRef}
              type="text"
              className="flex-1 bg-transparent px-2 py-1 outline-none text-slate-800 placeholder-slate-400 font-bold text-sm"
              placeholder="Wpisz komendę np. /admin..."
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
            <div className="w-[1px] h-4 bg-slate-300 mx-1 shrink-0"></div>
            <button
              onClick={() => { setIsOpen(true); setIsInlineOpen(false); setQuery(''); }}
              title="Otwórz pełny katalog transakcji"
              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <Hash size={16} />
            </button>
          </div>
          
          {/* OSTATNIE WYNIKI (DROPDOWN INLINE) */}
          {!query && recentShortcuts.length > 0 && showDropdown && (
            <div className="absolute top-full right-0 mt-2 w-[350px] bg-white border border-slate-200 rounded-xl shadow-xl z-[110] py-2 overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="px-3 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                Ostatnie komendy
              </div>
              <div className="max-h-[200px] overflow-y-auto">
                {recentShortcuts.slice(0, 5).map((s) => (
                  <button
                    key={`inline-rec-${s.code}`}
                    onClick={() => handleSelect(s)}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 text-left transition-colors border-l-2 border-transparent hover:border-indigo-500 group"
                  >
                    <div className="flex flex-col">
                      <span className="font-bold text-xs text-slate-700">{s.label}</span>
                      <span className="text-[10px] text-slate-500 line-clamp-1">{s.description}</span>
                    </div>
                    <span className="font-mono text-[10px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors whitespace-nowrap ml-2">
                      {s.code}
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
          <div className="fixed inset-0 cursor-pointer" onClick={() => setIsOpen(false)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[85vh] z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center px-4 py-4 border-b border-slate-100 bg-slate-50/50">
              <Search size={22} className="text-indigo-500 shrink-0" />
              <input
                ref={modalInputRef}
                type="text"
                className="flex-1 bg-transparent px-4 py-2 outline-none text-slate-800 placeholder-slate-400 font-bold text-lg"
                placeholder="Szukaj transakcji, wpisz komendę..."
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shrink-0 shadow-sm">
                <Command size={12} /> K
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="ml-3 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="overflow-y-auto p-3 bg-slate-50/50 flex-1">
              {!query && (
                <>
                  {favoriteShortcuts.length > 0 && (
                    <div className="mb-4">
                      <div className="px-3 pb-2 text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <Star size={12} className="text-amber-400" /> Ulubione
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {favoriteShortcuts.map((s) => (
                           <ShortcutItem key={`fav-${s.code}`} s={s} onSelect={() => handleSelect(s)} isFav={true} onToggleFav={(e) => toggleFavorite(e, s.code)} />
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
                        {recentShortcuts.map((s) => (
                           <ShortcutItem key={`rec-${s.code}`} s={s} onSelect={() => handleSelect(s)} isFav={favorites.includes(s.code)} onToggleFav={(e) => toggleFavorite(e, s.code)} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="mb-4">
                <div className="px-3 pb-2 text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <LayoutGrid size={12} /> {query ? 'Wyniki wyszukiwania' : 'Wszystkie dostępne'}
                </div>
                {filteredShortcuts.length > 0 ? (
                  <div className="space-y-1">
                    {filteredShortcuts.map((s) => (
                      <ShortcutItem key={s.code} s={s} onSelect={() => handleSelect(s)} isFav={favorites.includes(s.code)} onToggleFav={(e) => toggleFavorite(e, s.code)} />
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-100 shadow-sm mt-2">
                     <Hash size={32} className="mx-auto mb-3 text-slate-200" />
                     <p className="text-sm font-bold text-slate-600">Nie znaleziono transakcji dla "{query}"</p>
                     <p className="text-xs text-slate-400 mt-1">Upewnij się, że masz odpowiednie uprawnienia.</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="px-5 py-3 bg-white border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
               <span>Prywatny asystent transakcyjny zintegrowany z autoryzacją ról (Zero-Trust).</span>
               <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[10px]">&uarr; &darr; &crarr;</span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

function ShortcutItem({ s, onSelect, isFav, onToggleFav }: { s: Shortcut; onSelect: () => void; isFav: boolean; onToggleFav: (e: React.MouseEvent) => void }) {
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
          <Star size={16} fill={isFav ? "currentColor" : "none"} />
        </div>
        <div className="flex flex-col">
           <span className="font-bold text-sm text-slate-700 group-hover:text-indigo-700 transition-colors">{s.label}</span>
           <span className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{s.description}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono text-[11px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors whitespace-nowrap">
          {s.code}
        </span>
        <ArrowRight size={14} className="text-indigo-400 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
      </div>
    </button>
  );
}

