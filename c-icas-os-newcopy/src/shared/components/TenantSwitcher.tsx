import React from 'react';
import { useAuth } from '../hooks/AuthContext';
import { useTenant } from '../hooks/useTenant';
import { Building2, ChevronDown, Plus, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const TenantSwitcher: React.FC = () => {
  const { memberships } = useAuth();
  const { activeTenantId, activeTenantName, switchTenant } = useTenant();
  const [isOpen, setIsOpen] = React.useState(false);

  const membershipList = Object.entries(memberships);

  if (membershipList.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl transition-all group"
      >
        <div className="h-8 w-8 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-sm ring-2 ring-white">
           <Building2 className="h-4 w-4" />
        </div>
        <div className="text-left hidden md:block">
          <div className="text-xs font-black text-slate-900 uppercase tracking-wider">
            {activeTenantName || (activeTenantId ? `Tenant ${activeTenantId.slice(0, 6)}` : 'Wybierz firmę')}
          </div>
          <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
             <ShieldCheck className="h-3 w-3" /> Professional Plan
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 rounded-3xl shadow-2xl shadow-slate-200/50 z-50 overflow-hidden"
            >
              <div className="p-2 border-b border-slate-100">
                <p className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Twoje Organizacje</p>
                <div className="space-y-1">
                  {membershipList.map(([id, m]) => (
                    <button
                      key={id}
                      onClick={() => {
                        switchTenant(id);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all ${
                        activeTenantId === id ? 'bg-slate-50 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                        activeTenantId === id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'
                      }`}>
                         {id.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-bold truncate">Tenant {id.slice(0, 8)}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">{m.roleId}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-2 bg-slate-50/50">
                <button 
                  onClick={() => window.location.href = '/auth/signup'}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-white hover:shadow-sm rounded-2xl transition-all border border-transparent hover:border-slate-100"
                >
                  <div className="h-8 w-8 bg-white border border-slate-200 border-dashed rounded-lg flex items-center justify-center text-slate-400">
                    <Plus className="h-4 w-4" />
                  </div>
                  <div className="text-sm font-bold">Nowa firma</div>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
