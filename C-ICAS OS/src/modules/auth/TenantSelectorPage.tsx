import { useTenant, Tenant } from "../../core/auth/TenantContext";
import { useAuth } from "../../core/auth/AuthContext";
import { auth } from "../../core/firebase/config";
import { useNavigate } from "react-router-dom";
import { Building2, LogOut, ArrowRight } from "lucide-react";

export default function TenantSelectorPage() {
  const { availableTenants, setCurrentTenant, loadingTenants } = useTenant();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSelectTenant = (tenant: Tenant) => {
    setCurrentTenant(tenant);
    navigate("/"); // Po wyborze firmy idziemy do dashboardu
  };

  const handleLogout = () => {
    auth.signOut();
  };

  if (loadingTenants) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p>Ładowanie dostępnych organizacji...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-4xl mx-auto pt-12">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-3xl font-bold text-zinc-100 mb-2">Wybierz organizację</h1>
            <p className="text-zinc-400">Zalogowano jako: <span className="text-zinc-200">{user?.email}</span></p>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-sm text-zinc-300"
          >
            <LogOut size={16} /> Wyloguj się
          </button>
        </div>

        {availableTenants.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900 rounded-xl border border-zinc-800">
            <Building2 className="mx-auto w-16 h-16 text-zinc-600 mb-4" />
            <h3 className="text-xl font-medium text-zinc-300 mb-2">Brak przypisanych firm</h3>
            <p className="text-zinc-500 max-w-md mx-auto mb-6">
              Twoje konto nie jest przypisane do żadnej organizacji.
            </p>
            <button
              onClick={() => navigate('/onboarding')}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
            >
              Utwórz organizację
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableTenants.map(tenant => (
              <div 
                key={tenant.id}
                onClick={() => handleSelectTenant(tenant)}
                className="group cursor-pointer bg-zinc-900 border border-zinc-800 hover:border-blue-500 p-6 rounded-xl transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-900/20"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Building2 size={24} />
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 bg-zinc-800 text-zinc-400 rounded-full">
                    {tenant.role}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-zinc-100 mb-2">{tenant.name}</h3>
                <div className="flex items-center text-sm text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity mt-4">
                  Przejdź do panelu <ArrowRight size={16} className="ml-1" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
