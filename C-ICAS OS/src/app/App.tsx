/**
 * Data: 2026-05-14
 * Zmiany: Pełny routing dla wszystkich modułów C-ICAS.OS v2.
 * Ścieżka: /src/app/App.tsx
 */
import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../core/auth/AuthContext';
import { useTenant } from '../core/auth/TenantContext';

import LoginPage from '../modules/auth/LoginPage';
import RegisterPage from '../modules/auth/RegisterPage';
import TenantSelectorPage from '../modules/auth/TenantSelectorPage';
import { AppLayout } from './AppLayout';
import DashboardPage from '../modules/dashboard/DashboardPage';

// --- Core Operations ---
const TimeTrackingPage = lazy(() => import('../modules/time-tracking/TimeTrackingPage'));
const KanbanPage = lazy(() => import('../modules/kanban/KanbanPage'));
const ProjectsModule = lazy(() => import('../modules/projects/ProjectsModule'));
const CrmModule = lazy(() => import('../modules/crm/CrmDashboardModule'));

// --- Finance & Controlling ---
const FinanceCoreModule = lazy(() => import('../modules/finance/core/FinanceCoreModule'));
const ControllingModule = lazy(() => import('../modules/controlling/ControllingModule'));
const PaymentsModule = lazy(() => import('../modules/payments/PaymentsModule'));

// --- HR & Development ---
const HrModule = lazy(() => import('../modules/hr/HrModule'));
const ERecruitmentModule = lazy(() => import('../modules/eRecruitment/ERecruitmentModule'));
const LmsModule = lazy(() => import('../modules/lms/LmsModule'));
const WellnessModule = lazy(() => import('../modules/wellness/WellnessModule'));

// --- Compliance ---
const ComplianceModule = lazy(() => import('../modules/compliance/ComplianceModule'));

// --- Documents ---
const DmsModule = lazy(() => import('../modules/dms/DocumentManagementModule'));
const ESignatureModule = lazy(() => import('../modules/eSignature/ESignatureModule'));

// --- Logistics ---
const LogisticsModule = lazy(() => import('../modules/logistics/LogisticsModule'));

// --- Industry specific ---
const ConstructionModule = lazy(() => import('../modules/departments/ConstructionModule'));
const GardeningModule = lazy(() => import('../modules/departments/GardeningModule'));
const CleaningModule = lazy(() => import('../modules/departments/CleaningModule'));
const FleetModule = lazy(() => import('../modules/departments/FleetModule'));

// --- Communication & Analytics ---
const CommunicationModule = lazy(() => import('../modules/communication/CommunicationModule'));
const EsgModule = lazy(() => import('../modules/esg/EsgModule'));
const SettingsModule = lazy(() => import('../modules/settings/SettingsModule'));

// --- Cross-company & System ---
const CrossCompanyModule = lazy(() => import('../modules/crossCompany/CrossCompanyModule'));
const AdminModule = lazy(() => import('../modules/admin/AdminModule'));
const AiCopilotModule = lazy(() => import('../modules/aiCopilot/AiCopilotModule'));

// --- Customer Portal ---
const CustomerPortalModule = lazy(() => import('../modules/crm/portal/CustomerPortal'));

const LoadingScreen = () => (
  <div className="flex h-full min-h-screen items-center justify-center bg-zinc-950 text-white">
    <div className="text-center">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
      <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Ładowanie modułu...</div>
    </div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const TenantProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentTenant, loadingTenants } = useTenant();
  if (loadingTenants) return <LoadingScreen />;
  if (!currentTenant) return <Navigate to="/select-tenant" replace />;
  return <>{children}</>;
};

const Lazy = ({ component: Component }: { component: React.LazyExoticComponent<any> }) => (
  <Suspense fallback={<LoadingScreen />}>
    <Component />
  </Suspense>
);

export default function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/select-tenant" element={<ProtectedRoute><TenantSelectorPage /></ProtectedRoute>} />

        {/* Customer Portal (public link with token) */}
        <Route path="/portal/:token" element={<Lazy component={CustomerPortalModule} />} />

        {/* Protected app routes */}
        <Route element={
          <ProtectedRoute>
            <TenantProtectedRoute>
              <AppLayout />
            </TenantProtectedRoute>
          </ProtectedRoute>
        }>
          {/* Dashboard */}
          <Route path="/" element={<DashboardPage />} />
          <Route path="/ai-copilot" element={<Lazy component={AiCopilotModule} />} />

          {/* Operations */}
          <Route path="/time" element={<Lazy component={TimeTrackingPage} />} />
          <Route path="/kanban" element={<Lazy component={KanbanPage} />} />
          <Route path="/projects" element={<Lazy component={ProjectsModule} />} />
          <Route path="/crm" element={<Lazy component={CrmModule} />} />
          <Route path="/communication" element={<Lazy component={CommunicationModule} />} />

          {/* Finance */}
          <Route path="/finance" element={<Lazy component={FinanceCoreModule} />} />
          <Route path="/controlling" element={<Lazy component={ControllingModule} />} />
          <Route path="/payments" element={<Lazy component={PaymentsModule} />} />

          {/* HR */}
          <Route path="/hr" element={<Lazy component={HrModule} />} />
          <Route path="/hr/recruitment" element={<Lazy component={ERecruitmentModule} />} />
          <Route path="/lms" element={<Lazy component={LmsModule} />} />
          <Route path="/wellness" element={<Lazy component={WellnessModule} />} />

          {/* Compliance */}
          <Route path="/compliance" element={<Lazy component={ComplianceModule} />} />
          <Route path="/esg" element={<Lazy component={EsgModule} />} />

          {/* Documents */}
          <Route path="/dms" element={<Lazy component={DmsModule} />} />
          <Route path="/esignature" element={<Lazy component={ESignatureModule} />} />

          {/* Logistics */}
          <Route path="/logistics" element={<Lazy component={LogisticsModule} />} />

          {/* Industry */}
          <Route path="/industry/construction" element={<Lazy component={ConstructionModule} />} />
          <Route path="/industry/gardening" element={<Lazy component={GardeningModule} />} />
          <Route path="/industry/cleaning" element={<Lazy component={CleaningModule} />} />
          <Route path="/industry/fleet" element={<Lazy component={FleetModule} />} />

          {/* System */}
          <Route path="/cross-company" element={<Lazy component={CrossCompanyModule} />} />
          <Route path="/admin" element={<Lazy component={AdminModule} />} />
          <Route path="/settings" element={<Lazy component={SettingsModule} />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
