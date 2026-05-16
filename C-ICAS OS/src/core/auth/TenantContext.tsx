import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { db } from "../firebase/config";
import { collection, query, where, getDocs } from "firebase/firestore";

export interface Tenant {
  id: string;
  name: string;
  role: string;
}

interface TenantContextType {
  currentTenant: Tenant | null;
  setCurrentTenant: (tenant: Tenant | null) => void;
  switchTenant: (id: string) => void;
  availableTenants: Tenant[];
  loadingTenants: boolean;
}

const LS_KEY = 'cicas_active_tenant';

const TenantContext = createContext<TenantContextType>({
  currentTenant: null,
  setCurrentTenant: () => {},
  switchTenant: () => {},
  availableTenants: [],
  loadingTenants: true,
});

export const useTenant = () => useContext(TenantContext);

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [currentTenant, setCurrentTenantState] = useState<Tenant | null>(null);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(true);

  const setCurrentTenant = useCallback((tenant: Tenant | null) => {
    setCurrentTenantState(tenant);
    if (tenant) localStorage.setItem(LS_KEY, tenant.id);
    else localStorage.removeItem(LS_KEY);
  }, []);

  const switchTenant = useCallback((id: string) => {
    const found = availableTenants.find(t => t.id === id);
    if (found) setCurrentTenant(found);
  }, [availableTenants, setCurrentTenant]);

  useEffect(() => {
    const fetchTenants = async () => {
      if (!user) {
        setAvailableTenants([]);
        setCurrentTenantState(null);
        setLoadingTenants(false);
        return;
      }

      setLoadingTenants(true);
      try {
        const q = query(collection(db, "tenantMemberships"), where("userId", "==", user.uid));
        const snapshot = await getDocs(q);
        const tenants: Tenant[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Tenant));

        if (tenants.length === 0) {
          tenants.push(
            { id: "tenant_demo_1", name: "Firma Budowlana Demo", role: "ADMIN" },
            { id: "tenant_demo_2", name: "Firma Sprzątająca Demo", role: "EMPLOYEE" }
          );
        }

        setAvailableTenants(tenants);

        // Przywróć ostatnio wybrany tenant lub ustaw pierwszy
        const savedId = localStorage.getItem(LS_KEY);
        const restored = savedId ? tenants.find(t => t.id === savedId) : null;
        setCurrentTenantState(restored ?? tenants[0] ?? null);
      } catch (error) {
        console.error("Błąd podczas pobierania tenantów:", error);
      } finally {
        setLoadingTenants(false);
      }
    };

    fetchTenants();
  }, [user]);

  return (
    <TenantContext.Provider value={{ currentTenant, setCurrentTenant, switchTenant, availableTenants, loadingTenants }}>
      {children}
    </TenantContext.Provider>
  );
};
