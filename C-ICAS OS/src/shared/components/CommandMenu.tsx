/**
 * Data: 2026-05-14
 * Ścieżka: /src/shared/components/CommandMenu.tsx
 * Cel: Global ⌘K Command Palette — nawigacja, akcje, AI w jednym oknie.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, LayoutDashboard, Users, Landmark, ShieldCheck, GraduationCap,
  UserSearch, Truck, BarChart3, MessageSquare, Heart, Leaf, Settings,
  BrainCircuit, FileText, Plus, ArrowRight, Clock, Building2, Briefcase,
  Shield, CreditCard, Receipt, Scale, Download
} from 'lucide-react';

interface Command {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  action: () => void;
  category: string;
  shortcut?: string;
}

interface CommandMenuProps {
  open: boolean;
  onClose: () => void;
}

export function CommandMenu({ open, onClose }: CommandMenuProps) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState(0);

  const nav = (path: string) => { navigate(path); onClose(); };

  const commands: Command[] = [
    // Navigation
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, action: () => nav('/'), category: 'Nawigacja' },
    { id: 'hr', label: 'HR & Płace', description: 'Pracownicy, struktura org, payroll', icon: Users, action: () => nav('/hr'), category: 'Nawigacja' },
    { id: 'finance', label: 'Finanse (FI)', description: 'Księgowość, faktury, KSeF, PSD2', icon: Landmark, action: () => nav('/finance'), category: 'Nawigacja' },
    { id: 'compliance', label: 'Compliance / RODO', description: 'GDPR, ISMS, NIS2, BHP', icon: ShieldCheck, action: () => nav('/compliance'), category: 'Nawigacja' },
    { id: 'lms', label: 'Szkolenia (LMS)', description: 'Kursy, certyfikaty, quizy', icon: GraduationCap, action: () => nav('/lms'), category: 'Nawigacja' },
    { id: 'recruitment', label: 'eRekrutacja (ATS)', description: 'Oferty, kandydaci, onboarding', icon: UserSearch, action: () => nav('/hr/recruitment'), category: 'Nawigacja' },
    { id: 'logistics', label: 'Logistyka & Flota', icon: Truck, action: () => nav('/logistics'), category: 'Nawigacja' },
    { id: 'controlling', label: 'Controlling (CO)', description: 'Budżety, analiza kosztów, KPI', icon: BarChart3, action: () => nav('/controlling'), category: 'Nawigacja' },
    { id: 'communication', label: 'Komunikacja', description: 'Wiadomości, ogłoszenia, kanały', icon: MessageSquare, action: () => nav('/communication'), category: 'Nawigacja' },
    { id: 'wellness', label: 'Wellbeing', description: 'Aktywność, benefity, ankiety', icon: Heart, action: () => nav('/wellness'), category: 'Nawigacja' },
    { id: 'esg', label: 'ESG Reporting', description: 'Środowisko, ESG, CSRD', icon: Leaf, action: () => nav('/esg'), category: 'Nawigacja' },
    { id: 'crm', label: 'CRM & Sprzedaż', description: 'Leady, pipeline, oferty', icon: Building2, action: () => nav('/crm'), category: 'Nawigacja' },
    { id: 'dms', label: 'Skarbiec (DMS)', description: 'Dokumenty, e-podpis, WORM', icon: Briefcase, action: () => nav('/dms'), category: 'Nawigacja' },
    { id: 'ai', label: 'AI Copilot', description: 'Asystent AI (Gemini)', icon: BrainCircuit, action: () => nav('/ai-copilot'), category: 'Nawigacja' },
    { id: 'settings', label: 'Ustawienia', icon: Settings, action: () => nav('/settings'), category: 'Nawigacja' },
    { id: 'ai-guardian', label: 'AI Guardian', description: 'Cenzura zrzutów ekranu (Edge AI)', icon: Shield, action: () => nav('/ai-guardian'), category: 'Nawigacja', badge: 'AI' },
    { id: 'swipe', label: 'Swipe & Match', description: 'Kwalifikacja wydatków firmowe/prywatne', icon: CreditCard, action: () => nav('/swipe'), category: 'Nawigacja' },
    { id: 'expenses', label: 'Wydatki & Zwroty', description: 'Out-of-Pocket, akceptacja managera', icon: Receipt, action: () => nav('/expenses'), category: 'Nawigacja' },
    { id: 'legal-vault', label: 'Legal Vault (Art. 210 KSH)', description: 'Strażnik prawny, generator umów', icon: Scale, action: () => nav('/legal-vault'), category: 'Nawigacja' },
    { id: 'export', label: 'Eksport Danych', description: 'ZIP, XML, FEC, GoBD, NAS, GDrive', icon: Download, action: () => nav('/export'), category: 'Nawigacja' },
    // Quick Actions
    { id: 'new-invoice', label: 'Nowa Faktura', icon: FileText, action: () => nav('/finance'), category: 'Szybkie Akcje', shortcut: '⌘N' },
    { id: 'new-employee', label: 'Dodaj Pracownika', icon: Plus, action: () => nav('/hr'), category: 'Szybkie Akcje' },
    { id: 'log-time', label: 'Zaloguj Czas', icon: Clock, action: () => nav('/time'), category: 'Szybkie Akcje' },
    { id: 'new-expense', label: 'Nowy Wniosek o Zwrot', icon: Receipt, action: () => nav('/expenses'), category: 'Szybkie Akcje' },
    { id: 'ask-ai', label: 'Zapytaj AI Copilot', icon: BrainCircuit, action: () => nav('/ai-copilot'), category: 'Szybkie Akcje', shortcut: '⌘A' },
  ];

  const filtered = query.trim()
    ? commands.filter(c =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.description?.toLowerCase().includes(query.toLowerCase()) ||
        c.category.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  const grouped = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {});

  const flatFiltered = Object.values(grouped).flat();

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, flatFiltered.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      if (e.key === 'Enter' && flatFiltered[selected]) { flatFiltered[selected].action(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, selected, flatFiltered, onClose]);

  useEffect(() => { setSelected(0); }, [query]);

  let globalIndex = 0;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-zinc-950/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.12 }}
            onClick={e => e.stopPropagation()}
            className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800">
              <Search size={18} className="text-zinc-500 flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Szukaj modułów, akcji, dokumentów..."
                className="flex-1 bg-transparent text-zinc-100 text-sm font-medium placeholder-zinc-600 outline-none"
              />
              <kbd className="text-[10px] text-zinc-600 border border-zinc-700 px-2 py-1 rounded-lg font-mono">ESC</kbd>
            </div>

            {/* Results */}
            <div className="max-h-[420px] overflow-y-auto p-2">
              {Object.entries(grouped).length === 0 ? (
                <div className="text-center py-10 text-zinc-600 text-sm">Brak wyników dla "{query}"</div>
              ) : (
                Object.entries(grouped).map(([category, items]) => (
                  <div key={category} className="mb-2">
                    <div className="px-3 py-1.5 text-[9px] font-black text-zinc-600 uppercase tracking-widest">{category}</div>
                    {items.map(cmd => {
                      const idx = globalIndex++;
                      const isSelected = selected === idx;
                      return (
                        <button
                          key={cmd.id}
                          onClick={cmd.action}
                          onMouseEnter={() => setSelected(idx)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${isSelected ? 'bg-indigo-600/15 border border-indigo-500/20' : 'hover:bg-zinc-800'}`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-indigo-600/20' : 'bg-zinc-800'}`}>
                            <cmd.icon size={16} className={isSelected ? 'text-indigo-400' : 'text-zinc-400'} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-[13px] font-semibold ${isSelected ? 'text-zinc-100' : 'text-zinc-300'}`}>{cmd.label}</div>
                            {cmd.description && <div className="text-[10px] text-zinc-500 truncate">{cmd.description}</div>}
                          </div>
                          {cmd.shortcut && (
                            <kbd className="text-[9px] text-zinc-600 border border-zinc-700 px-1.5 py-0.5 rounded font-mono">{cmd.shortcut}</kbd>
                          )}
                          {isSelected && <ArrowRight size={14} className="text-indigo-400 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-zinc-800 px-5 py-3 flex items-center gap-4 text-[10px] text-zinc-600">
              <span>↑↓ Nawigacja</span>
              <span>↵ Wybierz</span>
              <span>ESC Zamknij</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
