/**
 * Data: 2026-05-16
 * Zmiany: Rozbudowa modułu HR o zakładki Rekrutacja, Kompetencje i Retencja Danych.
 *         Przejście z useState na React Router (nawigacja zakładkowa oparta na URL).
 * Data: 2026-05-19
 * Zmiany: Dodano zakładki Multisport, PPK, ZUS PUE (lazy import).
 * Ścieżka: /src/modules/hr/HrModule.tsx
 */
import React, { lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PayrollModule from './PayrollModule';
import OrgStructureModule from './OrgStructureModule';
import RecruitmentModule from './RecruitmentModule';
import HrRetentionModule from './HrRetentionModule';
import CompetencyModule from '../competencies/CompetencyModule';
import IdesGenerateButton from '../../shared/components/IdesGenerateButton';
import EmployeeSelfView from './components/EmployeeSelfView';
import { useAuth } from '../../shared/hooks/AuthContext';

const ChurnPredictor = lazy(() => import('./analytics/ChurnPredictor'));
const MultisportPanel = lazy(() => import('./components/MultisportPanel'));
const PpkPanel = lazy(() => import('./components/PpkPanel'));
const ZusPanel = lazy(() => import('./components/ZusPanel'));

export default function HrModule() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { roleData } = useAuth() as any;
  const isEmployee = roleData?.id === 'employee';

  const tabs = [
    ...(isEmployee ? [{ id: 'myprofil', name: t('hr.tabs.myProfile'), path: '/hr/my-profile' }] : []),
    { id: 'payroll', name: t('hr.tabs.payroll'), path: '/hr/payroll' },
    { id: 'orgstructure', name: t('hr.tabs.orgStructure'), path: '/hr/org-structure' },
    { id: 'recruitment', name: t('hr.tabs.recruitment'), path: '/hr/recruitment' },
    { id: 'competencies', name: t('hr.tabs.competencies'), path: '/hr/competencies' },
    { id: 'retention', name: t('hr.tabs.retention'), path: '/hr/retention' },
    { id: 'analytics', name: t('hr.tabs.analytics'), path: '/hr/analytics' },
    { id: 'multisport', name: t('hr.tabs.multisport', 'Multisport'), path: '/hr/multisport' },
    { id: 'ppk', name: t('hr.tabs.ppk', 'PPK'), path: '/hr/ppk' },
    { id: 'zus', name: t('hr.tabs.zus', 'ZUS PUE'), path: '/hr/zus' },
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
        <div className="ml-auto shrink-0 flex items-center">
          <IdesGenerateButton moduleKey="hr" />
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-slate-50 p-6">
        <Routes>
          <Route path="payroll" element={<PayrollModule onNavigateToOM={() => navigate('/hr/org-structure')} />} />
          <Route path="org-structure" element={<OrgStructureModule />} />
          <Route path="recruitment" element={<RecruitmentModule />} />
          <Route path="competencies" element={<CompetencyModule />} />
          <Route path="retention" element={<HrRetentionModule />} />
          <Route path="analytics" element={
            <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"/></div>}>
              <ChurnPredictor />
            </Suspense>
          } />
          <Route path="my-profile" element={<EmployeeSelfView />} />
          <Route path="multisport" element={
            <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"/></div>}>
              <MultisportPanel />
            </Suspense>
          } />
          <Route path="ppk" element={
            <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"/></div>}>
              <PpkPanel />
            </Suspense>
          } />
          <Route path="zus" element={
            <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"/></div>}>
              <ZusPanel />
            </Suspense>
          } />
          <Route path="/" element={<Navigate to={isEmployee ? 'my-profile' : 'payroll'} replace />} />
        </Routes>
      </div>
    </div>
  );
}
