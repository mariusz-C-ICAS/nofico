import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../../shared/hooks/AuthContext';

interface TenantContextType {
  activeTenantId: string | null;
  activeTenantName: string | null;
  switchTenant: (id: string) => void;
  isLoading: boolean;
}

const TenantContext = createContext<TenantContextType>({
  activeTenantId: null,
  activeTenantName: null,
  switchTenant: () => {},
  isLoading: true,
});

export const useTenant = () => useContext(TenantContext);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { memberships, activeTenantId: authTenantId, setActiveTenant } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authTenantId) {
      setIsLoading(false);
    } else if (Object.keys(memberships).length === 0) {
      setIsLoading(false);
    }
  }, [authTenantId, memberships]);

  const activeTenantName = authTenantId ? `Workspace ${authTenantId.slice(0, 6)}` : null;

  const switchTenant = (id: string) => {
    setActiveTenant(id);
    // Here we could also trigger a cache clear for TanStack Query if used
    console.log(`Switched to tenant: ${id}`);
  };

  return (
    <TenantContext.Provider value={{ 
      activeTenantId: authTenantId, 
      activeTenantName, 
      switchTenant, 
      isLoading 
    }}>
      {children}
    </TenantContext.Provider>
  );
};
