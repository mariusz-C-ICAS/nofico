import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { db } from "../firebase/config";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";

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
  hasRealTenants: boolean;
  fetchError: string | null;
  refreshTenants: () => Promise<void>;
}

const LS_KEY = 'cicas_active_tenant';

const TenantContext = createContext<TenantContextType>({
  currentTenant: null,
  setCurrentTenant: () => {},
  switchTenant: () => {},
  availableTenants: [],
  loadingTenants: true,
  hasRealTenants: false,
  fetchError: null,
  refreshTenants: async () => {},
});

export const useTenant = () => useContext(TenantContext);

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [currentTenant, setCurrentTenantState] = useState<Tenant | null>(null);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [hasRealTenants, setHasRealTenants] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  // undefined = never fetched; null = fetched for unauthenticated user
  const [fetchedForUid, setFetchedForUid] = useState<string | null | undefined>(undefined);

  const setCurrentTenant = useCallback((tenant: Tenant | null) => {
    setCurrentTenantState(tenant);
    if (tenant) localStorage.setItem(LS_KEY, tenant.id);
    else localStorage.removeItem(LS_KEY);
  }, []);

  const switchTenant = useCallback((id: string) => {
    const found = availableTenants.find(t => t.id === id);
    if (found) setCurrentTenant(found);
  }, [availableTenants, setCurrentTenant]);

  const fetchTenants = useCallback(async () => {
    if (!user) {
      setAvailableTenants([]);
      setCurrentTenantState(null);
      setHasRealTenants(false);
      setLoadingTenants(false);
      setFetchError(null);
      setFetchedForUid(null);
      return;
    }

    setLoadingTenants(true);
    setFetchError(null);

    let tenants: Tenant[] = [];

    try {
      // Primary: query tenantMemberships by userId
      const q = query(collection(db, "tenantMemberships"), where("userId", "==", user.uid));
      const snapshot = await getDocs(q);
      tenants = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Tenant));
    } catch (err: any) {
      console.error("fetchTenants (memberships query) error:", err);
      setFetchError(err?.message ?? "Błąd pobierania danych");
      setLoadingTenants(false);
      setFetchedForUid(user.uid);
      return; // don't change hasRealTenants — preserve previous state
    }

    // Fallback: if membership query returned 0, check localStorage for a saved tenant ID
    // and try to load it directly — handles cases where the membership write propagation
    // is delayed or the query index isn't ready yet.
    if (tenants.length === 0) {
      const savedId = localStorage.getItem(LS_KEY);
      if (savedId) {
        try {
          const tenantDoc = await getDoc(doc(db, "tenants", savedId));
          if (tenantDoc.exists() && (tenantDoc.data() as any).ownerId === user.uid) {
            tenants = [{ id: savedId, name: (tenantDoc.data() as any).name ?? '', role: 'OWNER' }];
          }
        } catch {
          // fallback also failed — leave tenants as []
        }
      }
    }

    const real = tenants.length > 0;
    setHasRealTenants(real);

    if (!real) {
      setAvailableTenants([]);
      setCurrentTenantState(null);
      setLoadingTenants(false);
      setFetchedForUid(user.uid);
      return;
    }

    setAvailableTenants(tenants);

    const savedId = localStorage.getItem(LS_KEY);
    const restored = savedId ? tenants.find(t => t.id === savedId) : null;
    setCurrentTenantState(restored ?? tenants[0] ?? null);
    setLoadingTenants(false);
    setFetchedForUid(user.uid);
  }, [user]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  // True whenever we haven't finished fetching for the current user yet.
  // This prevents TenantProtectedRoute from redirecting to /onboarding
  // during the null→user auth transition (race condition).
  const effectiveLoading = loadingTenants || fetchedForUid !== (user?.uid ?? null);

  return (
    <TenantContext.Provider value={{
      currentTenant, setCurrentTenant, switchTenant,
      availableTenants, loadingTenants: effectiveLoading,
      hasRealTenants, fetchError,
      refreshTenants: fetchTenants,
    }}>
      {children}
    </TenantContext.Provider>
  );
};
