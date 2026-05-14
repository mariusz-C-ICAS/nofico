import { useTenant } from "../../core/auth/TenantContext";

export default function DashboardPage() {
  const { currentTenant } = useTenant();

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <p className="text-zinc-400">
        Witaj w panelu organizacji: <span className="font-semibold text-blue-400">{currentTenant?.name}</span>
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
          <h2 className="text-xl font-semibold mb-2">Czas pracy</h2>
          <p className="text-zinc-500 mb-4">Zarządzaj i śledź czas pracy w oparciu o strefy geofencing.</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
          <h2 className="text-xl font-semibold mb-2">Kanban</h2>
          <p className="text-zinc-500 mb-4">Zarządzaj zadaniami na przejrzystej tablicy (drag & drop).</p>
        </div>
      </div>
    </div>
  );
}
