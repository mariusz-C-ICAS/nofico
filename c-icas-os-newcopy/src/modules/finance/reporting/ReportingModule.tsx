/**
 * Data: 2026-05-16
 * Zmiany: Dodano tab AI & ML Insights (BigQuery ML).
 * Sciezka: /src/modules/finance/reporting/ReportingModule.tsx
 */
import React, { useState } from 'react';
import {
  BarChart3, PieChart, FileSpreadsheet, Globe,
  TrendingUp, Download, Share2, Briefcase,
  Layers, Database, Sparkles, Filter, BrainCircuit
} from 'lucide-react';
import BusinessIntelligence from './BusinessIntelligence';
import FinancialStatements from './FinancialStatements';
import GlobalCompliance from './GlobalCompliance';
import DataExport from './DataExport';
import MLInsightsModule from './MLInsightsModule';

type ReportingTab = 'ml' | 'bi' | 'statements' | 'compliance' | 'exports';

export default function ReportingModule() {
  const [activeTab, setActiveTab] = useState<ReportingTab>('ml');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         {[
           { label: 'EBITDA', value: '42.5%', sub: '+2.1% vs Q1', icon: TrendingUp, color: 'text-indigo-600' },
           { label: 'Liquidity (Current)', value: '1.8', sub: 'Target: 1.5 - 2.0', icon: Briefcase, color: 'text-emerald-600' },
           { label: 'Burn Rate', value: '12k', sub: 'Burn to Date', icon: PieChart, color: 'text-rose-600' },
           { label: 'Forecast Acc.', value: '98%', sub: 'AI Match Score', icon: Sparkles, color: 'text-amber-600' }
         ].map((kpi, idx) => (
           <div key={idx} className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                 <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</div>
                 <kpi.icon className={kpi.color} size={18} />
              </div>
              <div className="text-3xl font-black text-slate-900 italic tracking-tighter mb-1">{kpi.value}</div>
              <div className="text-[9px] font-bold text-slate-400 uppercase italic opacity-60">{kpi.sub}</div>
           </div>
         ))}
      </div>

      {/* Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
         <div className="flex p-2 bg-slate-100 rounded-[2rem] w-fit">
            {[
              { id: 'ml', label: 'AI & ML Insights', icon: BrainCircuit },
              { id: 'bi', label: 'Business Intelligence', icon: BarChart3 },
              { id: 'statements', label: 'Sprawozdania Fin.', icon: FileSpreadsheet },
              { id: 'compliance', label: 'Compliance (FEC/GoBD)', icon: Globe },
              { id: 'exports', label: 'Eksporty & BI Connect', icon: Share2 }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-3 px-8 py-4 rounded-[1.75rem] transition-all text-[11px] font-black uppercase tracking-widest ${
                  activeTab === tab.id 
                    ? 'bg-white text-slate-900 shadow-xl' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                }`}
              >
                 <tab.icon size={16} />
                 {tab.label}
              </button>
            ))}
         </div>
         
         <div className="flex gap-4">
            <button className="bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all">
               <Download size={14} /> Paczka Księgowa (ZIP)
            </button>
         </div>
      </div>

      <div className="min-h-[600px]">
         {activeTab === 'ml' && <MLInsightsModule />}
         {activeTab === 'bi' && <BusinessIntelligence />}
         {activeTab === 'statements' && <FinancialStatements />}
         {activeTab === 'compliance' && <GlobalCompliance />}
         {activeTab === 'exports' && <DataExport />}
      </div>
    </div>
  );
}
