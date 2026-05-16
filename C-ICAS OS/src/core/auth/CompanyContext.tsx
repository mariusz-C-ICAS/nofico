import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { useTenant } from "./TenantContext";
import { db } from "../firebase/config";
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";

export interface Company {
  id: string;
  tenantId: string;
  name: string;
  nip?: string;
  regon?: string;
  address?: { street?: string; city?: string; zip?: string; country?: string };
  industry?: string;
  isActive: boolean;
  createdAt?: any;
}

export interface CompanyInput {
  name: string;
  nip?: string;
  regon?: string;
  address?: { street?: string; city?: string; zip?: string; country?: string };
  industry?: string;
}

interface CompanyContextType {
  currentCompany: Company | null;
  availableCompanies: Company[];
  switchCompany: (id: string) => void;
  loadingCompanies: boolean;
  refreshCompanies: () => Promise<void>;
  createCompany: (input: CompanyInput) => Promise<string>;
  updateCompany: (id: string, input: Partial<CompanyInput>) => Promise<void>;
  deactivateCompany: (id: string) => Promise<void>;
}

const LS_KEY = 'cicas_active_company';

const CompanyContext = createContext<CompanyContextType>({
  currentCompany: null,
  availableCompanies: [],
  switchCompany: () => {},
  loadingCompanies: true,
  refreshCompanies: async () => {},
  createCompany: async () => '',
  updateCompany: async () => {},
  deactivateCompany: async () => {},
});

export const useCompany = () => useContext(CompanyContext);

export const CompanyProvider = ({ children }: { children: ReactNode }) => {
  const { currentTenant } = useTenant();
  const [currentCompany, setCurrentCompanyState] = useState<Company | null>(null);
  const [availableCompanies, setAvailableCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);

  const fetchCompanies = useCallback(async () => {
    if (!currentTenant) {
      setAvailableCompanies([]);
      setCurrentCompanyState(null);
      setLoadingCompanies(false);
      return;
    }
    setLoadingCompanies(true);
    try {
      const q = query(
        collection(db, "companies"),
        where("tenantId", "==", currentTenant.id),
        where("isActive", "==", true)
      );
      const snap = await getDocs(q);
      let companies: Company[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as Company));

      if (companies.length === 0) {
        companies = [{
          id: `demo_${currentTenant.id}`,
          tenantId: currentTenant.id,
          name: currentTenant.name,
          isActive: true,
        }];
      }

      setAvailableCompanies(companies);
      const savedId = localStorage.getItem(LS_KEY);
      const restored = savedId
        ? companies.find(c => c.id === savedId && c.tenantId === currentTenant.id)
        : null;
      setCurrentCompanyState(restored ?? companies[0] ?? null);
    } catch (e) {
      console.error("Błąd pobierania firm:", e);
    } finally {
      setLoadingCompanies(false);
    }
  }, [currentTenant]);

  const switchCompany = useCallback((id: string) => {
    const found = availableCompanies.find(c => c.id === id);
    if (found) {
      setCurrentCompanyState(found);
      localStorage.setItem(LS_KEY, found.id);
    }
  }, [availableCompanies]);

  const createCompany = useCallback(async (input: CompanyInput): Promise<string> => {
    if (!currentTenant) throw new Error("Brak aktywnego tenanta");
    const ref = await addDoc(collection(db, "companies"), {
      ...input,
      tenantId: currentTenant.id,
      isActive: true,
      createdAt: serverTimestamp(),
    });
    await fetchCompanies();
    return ref.id;
  }, [currentTenant, fetchCompanies]);

  const updateCompany = useCallback(async (id: string, input: Partial<CompanyInput>) => {
    await updateDoc(doc(db, "companies", id), { ...input });
    await fetchCompanies();
  }, [fetchCompanies]);

  const deactivateCompany = useCallback(async (id: string) => {
    await updateDoc(doc(db, "companies", id), { isActive: false });
    await fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  return (
    <CompanyContext.Provider value={{
      currentCompany, availableCompanies, switchCompany,
      loadingCompanies, refreshCompanies: fetchCompanies,
      createCompany, updateCompany, deactivateCompany,
    }}>
      {children}
    </CompanyContext.Provider>
  );
};
