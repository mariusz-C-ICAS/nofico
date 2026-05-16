/**
 * Data: 2026-05-16
 * Zmiany: Rozbudowa modułu HR o zakładki Rekrutacja, Kompetencje i Retencja Danych.
 *         Przejście z useState na React Router (nawigacja zakładkowa oparta na URL).
 * Ścieżka: /src/modules/hr/HrModule.tsx
 */
import React from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import PayrollModule from './PayrollModule';
import OrgStructureModule from './OrgStructureModule';
import RecruitmentModule from './RecruitmentModule';
import HrRetentionModule from './HrRetentionModule';
import CompetencyModule from '../competencies/CompetencyModule';

export default function HrModule() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { id: 'payroll', name: 'Kadry i Płace', path: '/hr/payroll' },
    { id: 'orgstructure', name: 'Struktura Organizacyjna (OM)', path: '/hr/org-structure' },
    { id: 'recruitment', name: 'Rekrutacja', path: '/hr/recruitment' },
    { id: 'competencies', name: 'Kompetencje', path: '/hr/competencies' },
    { id: 'retention', name: 'Retencja Danych', path: '/hr/retention' },
  ];

  const activeTab = tabs.find(t => location.pathname === t.path || location.pathname.startsWith(t.path + '/'))?.id || 'payroll';

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex gap-4 sticky top-0 z-20 overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
          >
            {tab.name}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto bg-slate-50 p-6">
        <Routes>
          <Route path="payroll" element={<PayrollModule onNavigateToOM={() => navigate('/hr/org-structure')} />} />
          <Route path="org-structure" element={<OrgStructureModule />} />
          <Route path="recruitment" element={<RecruitmentModule />} />
          <Route path="competencies" element={<CompetencyModule />} />
          <Route path="retention" element={<HrRetentionModule />} />
          <Route path="/" element={<Navigate to="payroll" replace />} />
        </Routes>
      </div>
    </div>
  );
}
