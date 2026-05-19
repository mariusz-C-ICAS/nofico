/**
 * Data: 2026-05-14
 * Ścieżka: /src/shared/components/CommandMenu.tsx
 * Cel: Global ⌘K Command Palette — nawigacja, akcje, AI w jednym oknie.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState(0);

  const nav = (path: string) => { navigate(path); onClose(); };

  const catNav = t('commandMenu.category_navigation');
  const catQuick = t('commandMenu.category_quick_actions');

  const commands: Command[] = [
    // Navigation
    { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard, action: () => nav('/'), category: catNav },
    { id: 'hr', label: t('nav.hr'), description: t('commandMenu.desc_hr'), icon: Users, action: () => nav('/hr'), category: catNav },
    { id: 'finance', label: t('nav.finance'), description: t('commandMenu.desc_finance'), icon: Landmark, action: () => nav('/finance'), category: catNav },
    { id: 'compliance', label: t('nav.compliance'), description: t('commandMenu.desc_compliance'), icon: ShieldCheck, action: () => nav('/compliance'), category: catNav },
    { id: 'lms', label: t('nav.lms'), description: t('commandMenu.desc_lms'), icon: GraduationCap, action: () => nav('/lms'), category: catNav },
    { id: 'recruitment', label: t('nav.recruitment'), description: t('commandMenu.desc_recruitment'), icon: UserSearch, action: () => nav('/hr/recruitment'), category: catNav },
    { id: 'logistics', label: t('nav.logistics'), icon: Truck, action: () => nav('/logistics'), category: catNav },
    { id: 'controlling', label: t('nav.controlling'), description: t('commandMenu.desc_controlling'), icon: BarChart3, action: () => nav('/controlling'), category: catNav },
    { id: 'communication', label: t('nav.communication'), description: t('commandMenu.desc_communication'), icon: MessageSquare, action: () => nav('/communication'), category: catNav },
    { id: 'wellness', label: t('nav.wellbeing'), description: t('commandMenu.desc_wellbeing'), icon: Heart, action: () => nav('/wellness'), category: catNav },
    { id: 'esg', label: t('nav.esg'), description: t('commandMenu.desc_esg'), icon: Leaf, action: () => nav('/esg'), category: catNav },
    { id: 'crm', label: t('nav.crm'), description: t('commandMenu.desc_crm'), icon: Building2, action: () => nav('/crm'), category: catNav },
    { id: 'dms', label: t('nav.dms'), description: t('commandMenu.desc_dms'), icon: Briefcase, action: () => nav('/dms'), category: catNav },
    { id: 'ai', label: t('nav.ai_copilot'), description: t('commandMenu.desc_ai'), icon: BrainCircuit, action: () => nav('/ai-copilot'), category: catNav },
    { id: 'settings', label: t('nav.settings'), icon: Settings, action: () => nav('/settings'), category: catNav },
    { id: 'ai-guardian', label: t('nav.ai_guardian'), description: t('commandMenu.desc_ai_guardian'), icon: Shield, action: () => nav('/ai-guardian'), category: catNav, badge: 'AI' },
    { id: 'swipe', label: t('nav.swipe'), description: t('commandMenu.desc_swipe'), icon: CreditCard, action: () => nav('/swipe'), category: catNav },
    { id: 'expenses', label: t('nav.expenses'), description: t('commandMenu.desc_expenses'), icon: Receipt, action: () => nav('/expenses'), category: catNav },
    { id: 'legal-vault', label: t('nav.legal_vault'), description: t('commandMenu.desc_legal_vault'), icon: Scale, action: () => nav('/legal-vault'), category: catNav },
    { id: 'export', label: t('nav.export'), description: t('commandMenu.desc_export'), icon: Download, action: () => nav('/export'), category: catNav },
    // Quick Actions
    { id: 'new-invoice', label: t('commandMenu.cmd_new_invoice'), icon: FileText, action: () => nav('/finance'), category: catQuick, shortcut: '⌘N' },
    { id: 'new-employee', label: t('commandMenu.cmd_new_employee'), icon: Plus, action: () => nav('/hr'), category: catQuick },
    { id: 'log-time', label: t('commandMenu.cmd_log_time'), icon: Clock, action: () => nav('/time'), category: catQuick },
    { id: 'new-expense', label: t('commandMenu.cmd_new_expense'), icon: Receipt, action: () => nav('/expenses'), category: catQuick },
    { id: 'ask-ai', label: t('commandMenu.cmd_ask_ai'), icon: BrainCircuit, action: () => nav('/ai-copilot'), category: catQuick, shortcut: '⌘A' },
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
                placeholder={t('commandMenu.search_placeholder')}
                className="flex-1 bg-transparent text-zinc-100 text-sm font-medium placeholder-zinc-600 outline-none"
              />
              <kbd className="text-[10px] text-zinc-600 border border-zinc-700 px-2 py-1 rounded-lg font-mono">ESC</kbd>
            </div>

            {/* Results */}
            <div className="max-h-[420px] overflow-y-auto p-2">
              {Object.entries(grouped).length === 0 ? (
                <div className="text-center py-10 text-zinc-600 text-sm">{t('commandMenu.no_results', { query })}</div>
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
              <span>{t('commandMenu.nav_hint')}</span>
              <span>{t('commandMenu.select_hint')}</span>
              <span>{t('commandMenu.close_hint')}</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
