import { createContext, useContext, useState, ReactNode, useEffect } from "react";
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
  availableTenants: Tenant[];
  loadingTenants: boolean;
}

const TenantContext = createContext<TenantContextType>({
  currentTenant: null,
  setCurrentTenant: () => {},
  availableTenants: [],
  loadingTenants: true,
});

export const useTenant = () => useContext(TenantContext);

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(true);

  useEffect(() => {
    const fetchTenants = async () => {
      if (!user) {
        setAvailableTenants([]);
        setCurrentTenant(null);
        setLoadingTenants(false);
        return;
      }

      setLoadingTenants(true);
      try {
        // Docelowo powinieneś szukać w kolekcji tenantMemberships lub podobnej relacyjnej strukturze
        // Poniżej mock/szablon pytający o firmy przypisane do danego uid
        const q = query(collection(db, "tenantMemberships"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        
        const tenants: Tenant[] = [];
        querySnapshot.forEach((doc) => {
          tenants.push({ id: doc.id, ...doc.data() } as Tenant);
        });

        // Obejście dla emulatora / braku danych (Mocking fallback)
        if (tenants.length === 0) {
          tenants.push(
            { id: "tenant_demo_1", name: "Firma Budowlana Demo", role: "ADMIN" },
            { id: "tenant_demo_2", name: "Firma Sprzątająca Demo", role: "EMPLOYEE" }
          );
        }

        setAvailableTenants(tenants);
      } catch (error) {
        console.error("Błąd podczas pobierania tenantów:", error);
      } finally {
        setLoadingTenants(false);
      }
    };

    fetchTenants();
  }, [user]);

  return (
    <TenantContext.Provider value={{ currentTenant, setCurrentTenant, availableTenants, loadingTenants }}>
      {children}
    </TenantContext.Provider>
  );
};
