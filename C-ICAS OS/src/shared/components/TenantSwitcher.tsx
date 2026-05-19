import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, ChevronDown, Check, RefreshCw, Plus } from 'lucide-react';
import { useTenant } from '../../core/auth/TenantContext';

const ROLE_STYLE: Record<string, string> = {
  ADMIN:    'bg-indigo-500/20 text-indigo-300',
  OWNER:    'bg-violet-500/20 text-violet-300',
  MANAGER:  'bg-cyan-500/20 text-cyan-300',
  EMPLOYEE: 'bg-zinc-600/40 text-zinc-400',
  VIEWER:   'bg-zinc-700/40 text-zinc-500',
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Admin', OWNER: 'Owner', MANAGER: 'Manager',
  EMPLOYEE: 'Pracownik', VIEWER: 'Podgląd',
};

interface Props { collapsed?: boolean }

export const TenantSwitcher: React.FC<Props> = ({ collapsed = false }) => {
  const { t } = useTranslation();
  const { currentTenant, availableTenants, switchTenant, loadingTenants } = useTenant();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (loadingTenants) {
    return (
      <div className={`flex items-center gap-2 px-2 py-2 ${collapsed ? 'justify-center' : ''}`}>
        <RefreshCw size={13} className="animate-spin text-zinc-600" />
        {!collapsed && <span className="text-[10px] text-zinc-600 font-bold">{t('tenantSwitcher.loading')}</span>}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      {collapsed ? (
        <button
          onClick={() => setOpen(v => !v)}
          title={currentTenant?.name ?? t('tenantSwitcher.select_company')}
          className="w-10 h-10 mx-auto flex items-center justify-center rounded-xl hover:bg-zinc-800 transition-colors text-zinc-500 hover:text-zinc-300 relative"
        >
          <Building2 size={16} />
          {availableTenants.length > 1 && (
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-indigo-500 rounded-full" />
          )}
        </button>
      ) : (
        <button
          onClick={() => setOpen(v => !v)}
          className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-zinc-800/70 transition-colors group"
        >
          <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center flex-shrink-0">
            <Building2 size={13} className="text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="text-[11px] font-bold text-zinc-200 truncate leading-tight">
              {currentTenant?.name ?? t('tenantSwitcher.select_company')}
            </div>
            {currentTenant?.role && (
              <span className={`inline-flex text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full mt-0.5 ${ROLE_STYLE[currentTenant.role] ?? ROLE_STYLE.VIEWER}`}>
                {ROLE_LABEL[currentTenant.role] ?? currentTenant.role}
              </span>
            )}
          </div>
          <ChevronDown
            size={12}
            className={`text-zinc-600 group-hover:text-zinc-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </button>
      )}

      {open && (
        <div className={`absolute z-50 bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden min-w-[220px] ${
          collapsed ? 'left-12 top-0' : 'top-full left-0 right-0 mt-1'
        }`}>
          <div className="px-3 py-2 border-b border-zinc-800">
            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">{t('tenantSwitcher.my_companies')}</span>
          </div>

          <div className="py-1 max-h-64 overflow-y-auto">
            {availableTenants.map(t => (
              <button
                key={t.id}
                onClick={() => { switchTenant(t.id); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-zinc-800 transition-colors ${
                  t.id === currentTenant?.id ? 'bg-indigo-600/10' : ''
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700/50 flex items-center justify-center flex-shrink-0">
                  <Building2 size={12} className={t.id === currentTenant?.id ? 'text-indigo-400' : 'text-zinc-500'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-[11px] font-bold truncate ${t.id === currentTenant?.id ? 'text-indigo-300' : 'text-zinc-300'}`}>
                    {t.name}
                  </div>
                  <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full inline-flex mt-0.5 ${ROLE_STYLE[t.role] ?? ROLE_STYLE.VIEWER}`}>
                    {ROLE_LABEL[t.role] ?? t.role}
                  </span>
                </div>
                {t.id === currentTenant?.id && <Check size={12} className="text-indigo-400 flex-shrink-0" />}
              </button>
            ))}

            {availableTenants.length === 0 && (
              <div className="py-6 text-center text-[10px] text-zinc-600 font-bold uppercase">
                {t('tenantSwitcher.no_companies')}
              </div>
            )}
          </div>

          <div className="border-t border-zinc-800 p-1">
            <button
              onClick={() => { setOpen(false); window.location.href = '/settings/organizations/new'; }}
              className="w-full flex items-center gap-3 px-3 py-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-xl transition-colors"
            >
              <div className="w-7 h-7 rounded-lg border border-zinc-700 border-dashed flex items-center justify-center flex-shrink-0">
                <Plus size={12} />
              </div>
              <span className="text-[11px] font-bold">{t('tenantSwitcher.add_company')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantSwitcher;
