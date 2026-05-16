/**
 * Data: 2026-05-12
 * Zmiany: Utworzenie Contextu do obsługi Dynamicznych Modułów "Wariant 1"
 * Ścieżka: /src/core/modules/ModuleContext.tsx
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../../shared/hooks/AuthContext';
import { MODULE_REGISTRY, getModuleDef } from './ModuleRegistry';
import { SystemModuleDefinition } from './types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../shared/lib/firebase';

interface ModuleContextType {
  activeAuthModules: SystemModuleDefinition[]; // Moduły aktywne i dozwolone dla usera
  loadingModules: boolean;
  isModuleActive: (moduleId: string) => boolean;
}

const ModuleContext = createContext<ModuleContextType>({
  activeAuthModules: [],
  loadingModules: true,
  isModuleActive: () => false,
});

export const useModules = () => useContext(ModuleContext);

export const ModuleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userData, roleData, hasPermission, activeTenantId } = useAuth();
  const [activeAuthModules, setActiveAuthModules] = useState<SystemModuleDefinition[]>([]);
  const [loadingModules, setLoadingModules] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchModules = async () => {
      if (!user) {
        setActiveAuthModules([]);
        setLoadingModules(false);
        return;
      }
      
      try {
        let activeModuleIds: string[] = [];

        // Próba pobrania aktywnych modułów z wpisu firmowego / dzierżawcy
        if (activeTenantId) {
          const tenantRef = doc(db, 'tenants', activeTenantId);
          const tenantSnap = await getDoc(tenantRef);
          if (tenantSnap.exists() && tenantSnap.data().activeModules) {
            activeModuleIds = tenantSnap.data().activeModules;
            
            // Auto append new defaultActive modules that might be missing from older tenant setups
            MODULE_REGISTRY.filter(m => m.defaultActive).forEach(m => {
              if (!activeModuleIds.includes(m.id)) {
                // If the app architecture expands, we might need a separate 'deactivatedModules' list.
                // For now, assume if it's defaultActive and missing, it's newly created.
                activeModuleIds.push(m.id);
              }
            });
          } else {
             // Defaults if tenant missing setting
             activeModuleIds = MODULE_REGISTRY.filter(m => m.defaultActive).map(m => m.id);
          }
        } else {
           // Default fallback
           activeModuleIds = MODULE_REGISTRY.filter(m => m.defaultActive).map(m => m.id);
        }

        // Filtrowanie z Rejestru - weryfikacja praw dostępu
        const allowedModules = MODULE_REGISTRY.filter(mod => {
          // 1. Sprawdź czy moduł jest wykupiony / aktywny na firmie
          if (!activeModuleIds.includes(mod.id)) return false;

          // 2. Sprawdź czy użytkownik ma uprawnienia do tego modułu
          if (mod.requiredPermissions && mod.requiredPermissions.length > 0) {
            // Logika OR: Wystarczy, że ma jedno wymagane uprawnienie, żeby zobaczyć moduł,
            // Albo musi mieć globalnego admina '*'
            const hasAccess = mod.requiredPermissions.some(perm => hasPermission(perm) || hasPermission('*'));
            if (!hasAccess) return false;
          }

          return true;
        });

        if (isMounted) {
           setActiveAuthModules(allowedModules);
        }
      } catch (error) {
        console.error("Błąd podczas ładowania modułów:", error);
        // Fallback w przypadku błędu
        if (isMounted) {
           setActiveAuthModules(MODULE_REGISTRY.filter(m => m.defaultActive));
        }
      } finally {
        if (isMounted) setLoadingModules(false);
      }
    };

    fetchModules();

    return () => { isMounted = false; };
  }, [user, activeTenantId, roleData]); // Odśwież gdy zmieni się firma lub uprawnienia rolowe

  const isModuleActive = (moduleId: string) => {
    return activeAuthModules.some(m => m.id === moduleId);
  };

  return (
    <ModuleContext.Provider value={{ activeAuthModules, loadingModules, isModuleActive }}>
      {children}
    </ModuleContext.Provider>
  );
};
