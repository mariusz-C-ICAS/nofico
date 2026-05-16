import React from 'react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { motion } from 'motion/react';
import { Building2, ChevronRight, LogOut, Plus } from 'lucide-react';

export const TenantSelector: React.FC = () => {
  const { memberships, logout } = useAuth();
  const { switchTenant } = useTenant();
  const membershipList = Object.entries(memberships);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="h-20 w-20 bg-slate-900 rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-2xl shadow-slate-200/50">
             <Building2 className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">Wybierz firmę</h1>
          <p className="text-slate-500">Masz dostęp do wielu organizacji. Wybierz tę, w której chcesz pracować.</p>
        </div>

        <div className="space-y-3">
          {membershipList.map(([id, m]) => (
            <motion.button
              key={id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => switchTenant(id)}
              className="w-full bg-white border border-slate-200 p-5 rounded-3xl flex items-center gap-4 text-left shadow-lg shadow-slate-200/20 hover:shadow-xl hover:border-slate-300 transition-all group"
            >
              <div className="h-12 w-12 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                {id.slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="text-lg font-black text-slate-900">Workspace {id.slice(0, 6)}</div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                   {m.roleId} • Aktywny
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-slate-900 transition-colors" />
            </motion.button>
          ))}

          <button 
            onClick={() => window.location.href = '/auth/signup'}
            className="w-full border-2 border-dashed border-slate-200 p-5 rounded-3xl flex items-center justify-center gap-3 text-slate-500 hover:border-slate-400 hover:text-slate-900 transition-all font-bold group"
          >
            <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform" />
            Dodaj nową firmę
          </button>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-200 text-center">
          <button 
            onClick={logout}
            className="text-sm font-bold text-slate-400 hover:text-red-500 flex items-center gap-2 mx-auto transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Wyloguj się
          </button>
        </div>
      </div>
    </div>
  );
};

export default TenantSelector;
