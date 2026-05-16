import React, { useState, useRef, useEffect } from 'react';
import { Briefcase, ChevronDown, Check, RefreshCw, Plus } from 'lucide-react';
import { useCompany } from '../../core/auth/CompanyContext';

interface Props { collapsed?: boolean }

export const CompanySwitcher: React.FC<Props> = ({ collapsed = false }) => {
  const { currentCompany, availableCompanies, switchCompany, loadingCompanies } = useCompany();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (loadingCompanies) return null;

  const multi = availableCompanies.length > 1;

  if (collapsed) {
    return (
      <div ref={ref} className="relative">
        <button
          onClick={() => multi && setOpen(v => !v)}
          title={currentCompany?.name ?? 'Firma'}
          className="w-10 h-10 mx-auto flex items-center justify-center rounded-xl hover:bg-zinc-800 transition-colors text-zinc-600 hover:text-zinc-400 relative"
        >
          <Briefcase size={13} />
          {multi && (
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-cyan-500 rounded-full" />
          )}
        </button>
        {open && <Dropdown ref={ref} companies={availableCompanies} current={currentCompany} onSelect={id => { switchCompany(id); setOpen(false); }} position="left-12 top-0" />}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => multi && setOpen(v => !v)}
        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-xl transition-colors group ${multi ? 'hover:bg-zinc-800/50 cursor-pointer' : 'cursor-default'}`}
      >
        <Briefcase size={11} className="text-zinc-600 flex-shrink-0" />
        <span className="flex-1 min-w-0 text-[10px] font-bold text-zinc-500 truncate text-left leading-none">
          {currentCompany?.name ?? '—'}
        </span>
        {multi && (
          <ChevronDown size={10} className={`text-zinc-700 group-hover:text-zinc-500 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {open && (
        <Dropdown
          ref={ref}
          companies={availableCompanies}
          current={currentCompany}
          onSelect={id => { switchCompany(id); setOpen(false); }}
          position="top-full left-0 right-0 mt-1"
        />
      )}
    </div>
  );
};

interface DropdownProps {
  companies: ReturnType<typeof useCompany>['availableCompanies'];
  current: ReturnType<typeof useCompany>['currentCompany'];
  onSelect: (id: string) => void;
  position: string;
}

const Dropdown = React.forwardRef<HTMLDivElement, DropdownProps>(
  ({ companies, current, onSelect, position }, _ref) => (
    <div className={`absolute z-50 bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden min-w-[200px] ${position}`}>
      <div className="px-3 py-2 border-b border-zinc-800">
        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Firmy w grupie</span>
      </div>
      <div className="py-1 max-h-48 overflow-y-auto">
        {companies.map(c => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-zinc-800 transition-colors ${c.id === current?.id ? 'bg-cyan-600/10' : ''}`}
          >
            <div className="flex-1 min-w-0">
              <div className={`text-[11px] font-bold truncate ${c.id === current?.id ? 'text-cyan-300' : 'text-zinc-300'}`}>{c.name}</div>
              {c.nip && <div className="text-[9px] text-zinc-600 font-mono">NIP {c.nip}</div>}
            </div>
            {c.id === current?.id && <Check size={11} className="text-cyan-400 flex-shrink-0" />}
          </button>
        ))}
      </div>
      <div className="border-t border-zinc-800 p-1">
        <button
          onClick={() => window.location.href = '/settings?section=firmy'}
          className="w-full flex items-center gap-2 px-3 py-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-xl transition-colors"
        >
          <Plus size={11} />
          <span className="text-[10px] font-bold">Zarządzaj firmami</span>
        </button>
      </div>
    </div>
  )
);
Dropdown.displayName = 'CompanyDropdown';

export default CompanySwitcher;
