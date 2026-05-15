/**
 * Data: 2026-05-14
 * Zmiany: Zastąpienie makiety HR pełnowymiarowym modułem PayrollModule, który jest kompletnym systemem kadrowym.
 * Ścieżka: /src/modules/hr/HrModule.tsx
 */
import React, { useState } from 'react';
import PayrollModule from './PayrollModule';
import OrgStructureModule from './OrgStructureModule';

export default function HrModule() {
  const [activeTab, setActiveTab] = useState<'payroll' | 'orgstructure'>('payroll');

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex gap-4 sticky top-0 z-20">
        <button 
          onClick={() => setActiveTab('payroll')} 
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${activeTab === 'payroll' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
        >
          Kadry i Płace
        </button>
        <button 
          onClick={() => setActiveTab('orgstructure')} 
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${activeTab === 'orgstructure' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
        >
          Struktura Organizacyjna
        </button>
      </div>
      <div className="flex-1 overflow-auto bg-slate-50 p-6">
        {activeTab === 'payroll' && <PayrollModule onNavigateToOM={() => setActiveTab('orgstructure')} />}
        {activeTab === 'orgstructure' && <OrgStructureModule />}
      </div>
    </div>
  );
}
