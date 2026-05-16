/**
 * Data: 2026-05-10 13:14
 * Utworzył: Agent AI
 * Zmiany: Inicjalizacja modularnego shella aplikacji z react-router, AppLayout i Lazy Loading oraz Auth.
 * Opis: Punkt wejścia do funkcjonalności; renderuje strukturę główną z izolowanymi
 * modułami działów ładowanymi asynchronicznie, co spełnia wymóg całkowitej izolacji działów.
 */
import React, { Suspense, useState, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from '../shared/hooks/AuthContext';
import { ModuleProvider } from '../core/modules/ModuleContext';
import { TenantProvider } from './providers/TenantProvider';
import { ThemeProvider } from './providers/ThemeProvider';
import { AppLayout } from './AppLayout';
import * as Sentry from "@sentry/react";
import StatusPage from './StatusPage';
import { TenantSelector } from '../modules/auth/components/TenantSelector';
import { useTenant } from '../shared/hooks/useTenant';
import { BrandLogo } from '../shared/components/BrandLogo';

const TimeTrackingModule = lazy(() => import('../modules/timeTracking/TimeTrackingModule'));
const ProjectsModule = lazy(() => import('../modules/projects/ProjectsModule'));
const AiAssistantModule = lazy(() => import('../modules/aiAssistant/AiAssistantModule'));
const ReportsModule = lazy(() => import('../modules/reports/ReportsModule'));
const AdminModule = lazy(() => import('../modules/admin/AdminModule'));
const DashboardModule = lazy(() => import('../modules/dashboard/DashboardModule'));
const ConstructionModule = lazy(() => import('../modules/departments/ConstructionModule'));
const GardeningModule = lazy(() => import('../modules/departments/GardeningModule'));
const CleaningModule = lazy(() => import('../modules/departments/CleaningModule'));
const SettingsModule = lazy(() => import('../modules/settings/SettingsModule'));
const ClientCrmModule = lazy(() => import('../modules/crm/ClientCrmModule'));
const CustomerPortal = lazy(() => import('../modules/crm/portal/CustomerPortal'));
const WarrantyServiceModule = lazy(() => import('../modules/services/WarrantyServiceModule'));
const VoiceLogModule = lazy(() => import('../modules/ai/VoiceLogModule'));
const ComplianceModule = lazy(() => import('../modules/compliance/ComplianceModule'));
const PremiumPaymentsModule = lazy(() => import('../modules/payments/PaymentsModule'));

// Dodatkowe dynamiczne moduły dla AI Architekta
const FleetModule = lazy(() => import('../modules/departments/FleetModule'));
const SafetyModule = lazy(() => import('../modules/departments/SafetyModule'));
const TrainingModule = lazy(() => import('../modules/lms/TrainingModule'));
const HrModule = lazy(() => import('../modules/hr/HrModule'));
const VaultModule = lazy(() => import('../modules/finance/VaultModule'));
const AccountsModule = lazy(() => import('../modules/finance/PaymentsModule'));
const FinanceCoreModule = lazy(() => import('../modules/finance/core/FinanceCoreModule'));
const TenantSettingsModule = lazy(() => import('../modules/tenancy/TenantSettingsModule'));
const DocumentManagementModule = lazy(() => import('../modules/dms/DocumentManagementModule'));
const ESignatureModule = lazy(() => import('../modules/dms/ESignatureModule'));
const LandingPage = lazy(() => import('../modules/landing/LandingPage'));
const IndustryDmsModule = lazy(() => import('../modules/admin/IndustryDmsModule'));
const TenantAdminModule = lazy(() => import('../modules/admin/TenantAdminModule'));
const SystemInfoModule = lazy(() => import('../modules/system/SystemInfoModule'));
const CrossCompanyModule = lazy(() => import('../modules/crossCompany/CrossCompanyModule'));
const AiCopilotModule = lazy(() => import('../modules/aiCopilot/AiCopilotModule'));

const AuthModule = lazy(() => import('../modules/auth/AuthModule'));

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center">Wczytywanie...</div>;
  if (!user) return <Navigate to="/auth/login" replace />;
  return <>{children}</>;
};

import { OnboardingWizard } from '../modules/auth/components/OnboardingWizard';

function AppContent() {
  const { t } = useTranslation();
  const { user, memberships, hasPermission } = useAuth();
  const { activeTenantId, isLoading: tenantLoading } = useTenant();
  
  if (user && !tenantLoading) {
    const hasTenants = Object.values(memberships).length > 0;
    const isSystemAdmin = hasPermission('roles.manage') || hasPermission('*');

    if (!hasTenants && !isSystemAdmin) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col pt-20">
          <div className="text-center mb-12">
             <BrandLogo />
          </div>
          <OnboardingWizard />
        </div>
      );
    }
    
    if (!activeTenantId && !isSystemAdmin) {
      return <TenantSelector />;
    }
  }

  return (
    <Router>
      <Suspense fallback={<div className="h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div></div>}>
        <Routes>
          <Route path="/" element={
            user ? <Navigate to="/dashboard" replace /> : <LandingPage />
          } />
          
          {/* Auth Routes */}
          <Route path="/auth/login" element={<AuthModule mode="login" />} />
          <Route path="/auth/signup" element={<AuthModule mode="signup" />} />
          <Route path="/auth/forgot" element={<AuthModule mode="forgot" />} />
          <Route path="/auth/verify" element={<AuthModule mode="verify" />} />
          
          {/* Alias for old login path */}
          <Route path="/login" element={<Navigate to="/auth/login" replace />} />

          <Route path="/status" element={<StatusPage />} />
          
          <Route element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }>
          <Route path="dashboard/*" element={
            <Suspense fallback={<div className="flex h-full items-center justify-center text-gray-400">{t('loading')}</div>}>
              <DashboardModule />
            </Suspense>
          } />
          <Route path="construction/*" element={<Suspense fallback={null}><ConstructionModule /></Suspense>} />
          <Route path="gardening/*" element={<Suspense fallback={null}><GardeningModule /></Suspense>} />
          <Route path="cleaning/*" element={<Suspense fallback={null}><CleaningModule /></Suspense>} />
          <Route path="settings/*" element={<Suspense fallback={null}><SettingsModule /></Suspense>} />
          <Route path="custom/fleet/*" element={<Suspense fallback={null}><FleetModule /></Suspense>} />
          <Route path="custom/safety/*" element={<Suspense fallback={null}><SafetyModule /></Suspense>} />
          <Route path="lms/*" element={<Suspense fallback={null}><TrainingModule /></Suspense>} />
          <Route path="hr/*" element={<Suspense fallback={null}><HrModule /></Suspense>} />
          <Route path="compliance/*" element={<Suspense fallback={null}><ComplianceModule /></Suspense>} />
          <Route path="payments/*" element={<Suspense fallback={null}><PremiumPaymentsModule /></Suspense>} />
          <Route path="portal/customer/*" element={<Suspense fallback={null}><CustomerPortal /></Suspense>} />
          <Route path="finance/*" element={<Suspense fallback={null}><FinanceCoreModule /></Suspense>} />
          <Route path="vault/*" element={<Suspense fallback={null}><VaultModule /></Suspense>} />
          <Route path="finance/settlements/*" element={<Suspense fallback={null}><AccountsModule /></Suspense>} />
          <Route path="tenancy/*" element={<Suspense fallback={null}><TenantSettingsModule /></Suspense>} />
          <Route path="time/*" element={<Suspense fallback={null}><TimeTrackingModule /></Suspense>} />
          <Route path="projects/*" element={<Suspense fallback={null}><ProjectsModule /></Suspense>} />
          <Route path="crm/*" element={<Suspense fallback={null}><ClientCrmModule /></Suspense>} />
          <Route path="services/*" element={<Suspense fallback={null}><WarrantyServiceModule /></Suspense>} />
          <Route path="voice/*" element={<Suspense fallback={null}><VoiceLogModule /></Suspense>} />
          <Route path="ai/*" element={<Suspense fallback={null}><AiAssistantModule /></Suspense>} />
          <Route path="reports/*" element={<Suspense fallback={null}><ReportsModule /></Suspense>} />
          <Route path="admin/*" element={<Suspense fallback={null}><AdminModule /></Suspense>} />
          <Route path="admin/tenants" element={<Suspense fallback={null}><TenantAdminModule /></Suspense>} />
          <Route path="admin/tenants/manage" element={<Suspense fallback={null}><TenantAdminModule /></Suspense>} />
          <Route path="system/*" element={<Suspense fallback={null}><SystemInfoModule /></Suspense>} />
          <Route path="dms/*" element={<Suspense fallback={null}><DocumentManagementModule /></Suspense>} />
          <Route path="esignature/*" element={<Suspense fallback={null}><ESignatureModule /></Suspense>} />
          <Route path="industry-dms/*" element={<Suspense fallback={null}><IndustryDmsModule /></Suspense>} />
          <Route path="cross-company/*" element={<Suspense fallback={null}><CrossCompanyModule /></Suspense>} />
          <Route path="ai-copilot/*" element={<Suspense fallback={null}><AiCopilotModule /></Suspense>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </Suspense>
  </Router>
);
}


export default function App() {
  return (
    <Sentry.ErrorBoundary fallback={<div className="p-8 text-rose-500">Krytyczny błąd aplikacji. Odśwież stronę.</div>}>
      <AuthProvider>
        <TenantProvider>
          <ThemeProvider>
            <ModuleProvider>
              <AppContent />
            </ModuleProvider>
          </ThemeProvider>
        </TenantProvider>
      </AuthProvider>
    </Sentry.ErrorBoundary>
  );
}
