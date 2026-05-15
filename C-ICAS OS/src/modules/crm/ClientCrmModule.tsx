import React, { useState } from 'react';
import {
  Users, Target, FileText,
  Plus, Search, CheckSquare,
  BarChart2, Zap, Star, ArrowUpCircle, Filter,
  Map, Upload, AlertTriangle, PenLine, Activity, TrendingDown,
  LayoutGrid, ChevronLeft
} from 'lucide-react';
import { useAuth } from '../../shared/hooks/AuthContext';
import CustomerList from './components/CustomerList';
import DealsPipeline from './components/DealsPipeline';
import QuoteEditor from './components/QuoteEditor';
import TaskManager from './components/TaskManager';
import ForecastView from './components/ForecastView';
import AutomationRules from './components/AutomationRules';
import NpsPanel from './components/NpsPanel';
import UpsellBoard from './components/UpsellBoard';
import SegmentView from './components/SegmentView';
import CustomerCard from './components/CustomerCard';
import CustomerMapView from './components/CustomerMapView';
import CustomerImportExport from './components/CustomerImportExport';
import DuplicateDetector from './components/DuplicateDetector';
import SalesTargets from './components/SalesTargets';
import QuoteESign from './components/QuoteESign';
import SalesActivityReport from './components/SalesActivityReport';
import ChurnPredictor from './components/ChurnPredictor';
import CustomerKanban from './components/CustomerKanban';
import CrmDashboard from './components/CrmDashboard';
import AddCustomerModal from './components/AddCustomerModal';
import ProductCatalog from './components/ProductCatalog';
import WinLossAnalysis from './components/WinLossAnalysis';
import ContractRenewal from './components/ContractRenewal';

type CrmTab =
  | 'dashboard' | 'pipeline' | 'customers' | 'quotes' | 'tasks'
  | 'forecast' | 'automation' | 'nps' | 'upsell' | 'segments' | 'map'
  | 'import' | 'duplicates' | 'targets' | 'esign' | 'activity' | 'churn' | 'kanban' | 'catalog' | 'winloss' | 'contracts';

const TABS: { id: CrmTab; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard',  label: 'Dashboard',     icon: BarChart2 },
  { id: 'pipeline',   label: 'Pipeline',      icon: Target },
  { id: 'customers',  label: 'Klienci',       icon: Users },
  { id: 'map',        label: 'Mapa',          icon: Map },
  { id: 'segments',   label: 'Segmenty',      icon: Filter },
  { id: 'tasks',      label: 'Zadania',       icon: CheckSquare },
  { id: 'forecast',   label: 'Prognoza',      icon: BarChart2 },
  { id: 'quotes',     label: 'Oferty',        icon: FileText },
  { id: 'nps',        label: 'NPS',           icon: Star },
  { id: 'upsell',     label: 'Upsell',        icon: ArrowUpCircle },
  { id: 'automation', label: 'Automatyzacje', icon: Zap },
  { id: 'import',     label: 'Import/Export', icon: Upload },
  { id: 'duplicates', label: 'Duplikaty',     icon: AlertTriangle },
  { id: 'targets',    label: 'Cele',          icon: Target },
  { id: 'esign',      label: 'E-Sign',        icon: PenLine },
  { id: 'activity',   label: 'Aktywność',     icon: Activity },
  { id: 'churn',      label: 'Churn AI',      icon: TrendingDown },
  { id: 'kanban',     label: 'Kanban',        icon: LayoutGrid },
  { id: 'catalog',   label: 'Cennik',        icon: FileText },
  { id: 'winloss',   label: 'Win/Loss',      icon: BarChart2 },
  { id: 'contracts', label: 'Kontrakty',     icon: FileText },
];

export default function ClientCrmModule() {
  const { activeTenantId } = useAuth() as any;
  const [activeTab, setActiveTab] = useState<CrmTab>('dashboard');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  if (!activeTenantId) {
    return (
      <div className="p-10 text-center text-slate-400 text-sm">
        Brak aktywnego tenanta.
      </div>
    );
  }

  if (selectedCustomer) {
    return (
      <div className="max-w-[1400px] mx-auto p-10 animate-in fade-in duration-300">
        <button
          onClick={() => setSelectedCustomer(null)}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-black text-xs uppercase tracking-widest mb-6">
          <ChevronLeft size={14} /> Powrót do CRM
        </button>
        <CustomerCard
          customer={selectedCustomer}
          tenantId={activeTenantId}
          onClose={() => setSelectedCustomer(null)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto p-10 space-y-10 animate-in fade-in duration-500">
      {showAddModal && <AddCustomerModal tenantId={activeTenantId} onClose={() => setShowAddModal(false)} />}
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-200">
              <Target className="text-white" size={20} />
            </div>
            <h1 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">CRM & Growth</h1>
          </div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] italic">System Relacji NoFiCo V5</p>
        </div>

        <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 shadow-sm flex items-center gap-6">
          <div className="text-right">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Pipeline Value</div>
            <div className="text-xl font-black text-slate-900 italic">2.4M <span className="text-[10px] text-slate-400">PLN</span></div>
          </div>
          <div className="w-px h-10 bg-slate-100" />
          <div className="text-right">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Win Rate</div>
            <div className="text-xl font-black text-indigo-600 italic">64%</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-slate-100 pb-6">
        <div className="flex flex-wrap gap-1 p-2 bg-slate-100 rounded-[2.5rem] w-fit">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-[2rem] transition-all text-[10px] font-black uppercase tracking-widest ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-lg scale-[1.02]'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
              }`}
            >
              <tab.icon size={13} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Szukaj..."
              className="bg-white border-2 border-slate-100 rounded-[2rem] pl-12 pr-6 py-4 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-indigo-600 transition-all w-56"
            />
          </div>
          <button onClick={() => setShowAddModal(true)}
            className="bg-slate-900 text-white px-8 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-600 transition-all">
            <Plus size={16} /> Nowy Klient
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[600px]">
        {activeTab === 'dashboard' && <CrmDashboard tenantId={activeTenantId} />}
        {activeTab === 'pipeline' && <DealsPipeline />}
        {activeTab === 'customers' && (
          <CustomerList onSelectCustomer={setSelectedCustomer} />
        )}
        {activeTab === 'map' && (
          <CustomerMapView tenantId={activeTenantId} onSelectCustomer={setSelectedCustomer} />
        )}
        {activeTab === 'segments' && (
          <SegmentView tenantId={activeTenantId} onSelectCustomer={setSelectedCustomer} />
        )}
        {activeTab === 'tasks' && (
          <TaskManager tenantId={activeTenantId} />
        )}
        {activeTab === 'forecast' && (
          <ForecastView tenantId={activeTenantId} />
        )}
        {activeTab === 'quotes' && <QuoteEditor />}
        {activeTab === 'nps' && (
          <NpsPanel tenantId={activeTenantId} />
        )}
        {activeTab === 'upsell' && (
          <UpsellBoard tenantId={activeTenantId} />
        )}
        {activeTab === 'automation' && (
          <AutomationRules tenantId={activeTenantId} />
        )}
        {activeTab === 'import' && (
          <CustomerImportExport tenantId={activeTenantId} />
        )}
        {activeTab === 'duplicates' && (
          <DuplicateDetector tenantId={activeTenantId} />
        )}
        {activeTab === 'targets' && (
          <SalesTargets tenantId={activeTenantId} />
        )}
        {activeTab === 'esign' && (
          <QuoteESign tenantId={activeTenantId} />
        )}
        {activeTab === 'activity' && (
          <SalesActivityReport tenantId={activeTenantId} />
        )}
        {activeTab === 'churn' && (
          <ChurnPredictor tenantId={activeTenantId} onSelectCustomer={setSelectedCustomer} />
        )}
        {activeTab === 'kanban' && (
          <CustomerKanban tenantId={activeTenantId} onSelectCustomer={setSelectedCustomer} />
        )}
        {activeTab === 'catalog' && (
          <ProductCatalog tenantId={activeTenantId} />
        )}
        {activeTab === 'winloss' && (
          <WinLossAnalysis tenantId={activeTenantId} />
        )}
        {activeTab === 'contracts' && (
          <ContractRenewal tenantId={activeTenantId} />
        )}
      </div>
    </div>
  );
}
