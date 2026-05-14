/**
 * GlobalDashboard.tsx
 * Widok skonsolidowany dla Doradcy / Zarządu (Multi-tenant).
 * CC-IMP-01
 */
import React, { useState, useEffect } from 'react';
import { 
  Globe, BarChart3, TrendingUp, AlertCircle, 
  ArrowUpRight, Building2, ShieldCheck, Users,
  Search, Filter, ExternalLink, RefreshCw, ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { CrossCompanyService } from '../services/CrossCompanyService';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';

export default function GlobalDashboard() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Listener na członkostwa w tenantach
    const q = query(collection(db, `users/${user.uid}/tenantMemberships`), where('status', '==', 'active'));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const tenantIds = snapshot.docs.map(doc => doc.id);
      if (tenantIds.length > 0) {
        const insights = await CrossCompanyService.getGlobalTenantInsights(tenantIds);
        setTenants(insights);
        // Symulacja przychodu zagregowanego
        setTotalRevenue(tenantIds.length * 450000);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) return <div className="p-8 text-gray-500">Inicjalizacja widoku globalnego...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 font-sans tracking-tight">Konsolidator Globalny</h2>
          <p className="text-sm text-gray-500 font-mono">CC-IMP-01: Multi-tenant Firestore Monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            <Filter size={16} />
            Filtruj Grupy
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            <ArrowUpRight size={16} />
            Raport Skonsolidowany
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={<Building2 className="text-indigo-600" />}
          label="Zarządzane Podmioty"
          value={tenants.length.toString()}
          trend="+1 w tym miesiącu"
        />
        <StatCard 
          icon={<TrendingUp className="text-emerald-600" />}
          label="Przychód Skonsolidowany"
          value={`${(totalRevenue / 1000000).toFixed(2)}M PLN`}
          trend="+12.4% vs LTM"
        />
        <StatCard 
          icon={<ShieldCheck className="text-blue-600" />}
          label="Średnia Zgodność"
          value="94%"
          trend="+2% poprawa"
        />
        <StatCard 
          icon={<Users className="text-orange-600" />}
          label="Suma Zatrudnienia"
          value={(tenants.length * 12).toString()}
          trend="Stabilna"
        />
      </div>

      {/* Tenant List */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-bottom border-gray-200 bg-gray-50 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 italic font-serif">Status Operacyjny Podmiotów</h3>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Szukaj NIP/Nazwa..." 
              className="pl-9 pr-4 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 w-64"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-400 font-mono">
                <th className="px-6 py-3 font-medium">Podmiot / NIP</th>
                <th className="px-6 py-3 font-medium">Status Systemu</th>
                <th className="px-6 py-3 font-medium">Compliance</th>
                <th className="px-6 py-3 font-medium">Ostatnia Akcja</th>
                <th className="px-6 py-3 font-medium">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-indigo-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center font-bold text-gray-500 text-xs uppercase">
                        {tenant.name?.substring(0, 2)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{tenant.name}</div>
                        <div className="text-[10px] text-gray-500 font-mono">NIP: {tenant.nip}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800 capitalize">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Operacyjny
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                         <div className="h-full bg-indigo-500" style={{ width: '85%' }} />
                       </div>
                       <span className="text-[10px] font-mono text-gray-600">85%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500 font-mono">
                    2h temu (Audyt)
                  </td>
                  <td className="px-6 py-4">
                    <button className="p-1.5 hover:bg-white rounded border border-transparent hover:border-gray-200 text-gray-400 hover:text-indigo-600 transition-all">
                      <ExternalLink size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Intercompany Transactions - CC-IMP-04 */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 italic font-serif flex items-center gap-2">
              <RefreshCw size={16} className="text-gray-400" />
              Rozliczenia Międzyfirmowe
            </h3>
            <span className="text-[10px] font-mono text-gray-400 uppercase">Temporal/Workflow Active</span>
          </div>
          <div className="p-0">
            {[
              { id: '1', from: 'BudPol', to: 'Logistix', amt: '12,500 PLN', status: 'Pending Approval' },
              { id: '2', from: 'GardenDesign', to: 'BudPol', amt: '3,200 PLN', status: 'Executed' }
            ].map(tx => (
              <div key={tx.id} className="px-6 py-3 border-b border-gray-50 last:border-0 flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-gray-700">{tx.from}</span>
                      <ChevronRight size={10} className="text-gray-300" />
                      <span className="text-xs font-bold text-gray-700">{tx.to}</span>
                   </div>
                </div>
                <div className="flex items-center gap-4">
                   <span className="text-xs font-mono font-bold text-gray-900">{tx.amt}</span>
                   <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                     tx.status === 'Executed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                   }`}>
                     {tx.status}
                   </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Global Compliance Alerts */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-800 italic font-serif flex items-center gap-2">
              <AlertCircle size={16} className="text-orange-400" />
              Alerty Grupy
            </h3>
          </div>
          <div className="p-4 space-y-3">
             <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                <AlertCircle className="text-red-500 mt-0.5" size={16} />
                <div className="text-xs text-red-800">
                   <strong>Wygasający certyfikat:</strong> Logistix S.A. wymaga odnowienia certyfikatu ISO za 4 dni.
                </div>
             </div>
             <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <Globe className="text-blue-500 mt-0.5" size={16} />
                <div className="text-xs text-blue-800">
                   <strong>TP Documentation:</strong> Rozpoczęto automatyczne generowanie raportu TP dla GardenDesign.
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, trend }: any) {
  return (
    <motion.div 
      whileHover={{ y: -2 }}
      className="p-5 bg-white border border-gray-200 rounded-xl shadow-sm space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="p-2 bg-gray-50 rounded-lg">{icon}</div>
        <span className="text-[10px] font-mono font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
          {trend}
        </span>
      </div>
      <div>
        <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</div>
        <div className="text-2xl font-bold text-gray-900 font-mono">{value}</div>
      </div>
    </motion.div>
  );
}
