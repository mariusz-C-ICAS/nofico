/**
 * Data: 2026-05-14
 * Zmiany: Pełny routing dla wszystkich modułów C-ICAS.OS v2.
 * Ścieżka: /src/app/App.tsx
 */
import React, { Suspense, lazy } from 'react';
import { Toaster } from 'sonner';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../core/auth/AuthContext';
import { useTenant } from '../core/auth/TenantContext';

import LoginPage from '../modules/auth/LoginPage';
import RegisterPage from '../modules/auth/RegisterPage';
import TenantSelectorPage from '../modules/auth/TenantSelectorPage';
import OnboardingWizard from '../modules/onboarding/OnboardingWizard';
import { AppLayout } from './AppLayout';
import DashboardPage from '../modules/dashboard/DashboardPage';
import HomePage from '../modules/home/HomePage';

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
const LmsModule = lazy(() => import('../modules/lms/LmsModule'));

// --- Public iFrame Views ---
const OmIframeView = lazy(() => import('../modules/hr/OmIframeView'));
const CareersIframeView = lazy(() => import('../modules/hr/CareersIframeView'));
const WellnessModule = lazy(() => import('../modules/wellness/WellnessModule'));

// --- Compliance ---
const ComplianceModule = lazy(() => import('../modules/compliance/ComplianceModule'));
const QualityModule = lazy(() => import('../modules/quality/QualityModule'));

// --- Field Service ---
const FieldServiceModule = lazy(() => import('../modules/fieldService/FieldServiceModule'));

// --- Booking ---
const BookingModule = lazy(() => import('../modules/booking/BookingModule'));
const BookingPublicPage = lazy(() => import('../modules/booking/BookingPublicPage'));

// --- Documents ---
const WorkflowModule = lazy(() => import('../modules/workflow/WorkflowModule'));
const MarketingModule = lazy(() => import('../modules/marketing/MarketingModule'));
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

// --- Orphaned modules (restored routes) ---
const VoiceLogModule = lazy(() => import('../modules/ai/VoiceLogModule'));
const SafetyModule = lazy(() => import('../modules/departments/SafetyModule'));
const WarrantyServiceModule = lazy(() => import('../modules/services/WarrantyServiceModule'));

// --- Shop / E-commerce ---
const ShopModule = lazy(() => import('../modules/shop/ShopModule'));

// --- Leads to Cash ---
const LeadsToCashModule = lazy(() => import('../modules/leadsToCash/LeadsToCashModule'));

// --- Cross-company & System ---
const CrossCompanyModule = lazy(() => import('../modules/crossCompany/CrossCompanyModule'));
const AdminModule = lazy(() => import('../modules/admin/AdminModule'));
const AiCopilotModule = lazy(() => import('../modules/aiCopilot/AiCopilotModule'));

// --- Finance submodules ---
const ContractorsModule = lazy(() => import('../modules/finance/contractors/ContractorsModule'));
const AssetsModule = lazy(() => import('../modules/finance/assets/AssetsModule'));
const BureauModule = lazy(() => import('../modules/finance/bureau/BureauModule'));
const ExpenseModule = lazy(() => import('../modules/finance/expenses/ExpenseModule'));
const RecurringModule = lazy(() => import('../modules/finance/invoicing/RecurringModule'));
const PurchaseModule = lazy(() => import('../modules/finance/purchasing/PurchaseModule'));

// --- NoFiCo Core Features ---
const AiGuardianModule = lazy(() => import('../modules/finance/ai-guardian/AiGuardianModule'));
const SwipeMatchModule = lazy(() => import('../modules/finance/swipe/SwipeMatchModule'));
const ExpensesModule = lazy(() => import('../modules/expenses/ExpensesModule'));
const LegalVaultModule = lazy(() => import('../modules/compliance/legal/LegalVaultModule'));
const ExportDistributionModule = lazy(() => import('../modules/finance/reporting/ExportDistribution'));

// --- Public iFrame: Booking ---
const BookingsIframeView = lazy(() => import('../modules/crm/BookingsIframeView'));

// --- Customer Portal ---
const CustomerPortalModule = lazy(() => import('../modules/crm/portal/CustomerPortal'));

// --- Field Service Client Portal ---
const ClientReschedulePortal = lazy(() => import('../modules/fieldService/components/ClientReschedulePortal'));

const LoadingScreen = () => (
  <div className="flex h-full min-h-screen items-center justify-center" style={{ backgroundColor: '#0c0d12', color: '#fff' }}>
    <div className="text-center">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
      <div className="text-xs uppercase tracking-widest font-bold" style={{ color: '#52525b' }}>Ładowanie modułu...</div>
    </div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const HomeRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <HomePage />;
};

const TenantProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentTenant, loadingTenants, hasRealTenants, fetchError } = useTenant();
  const { userData, userDataLoaded } = useAuth();

  // Wait for both tenant fetch and user profile to finish loading
  if (loadingTenants || !userDataLoaded) return <LoadingScreen />;

  if (hasRealTenants) {
    if (!currentTenant) return <Navigate to="/select-tenant" replace />;
    return <>{children}</>;
  }

  // No tenants found. Determine why:

  // No tenants found (or fetch error) — go to selector where user can create org
  // Never auto-redirect to /onboarding: avoids infinite loops when Firestore fallbacks fail
  return <Navigate to="/select-tenant" replace />;
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
        {/* Public home — landing page for unauthenticated, redirect to /dashboard for authenticated */}
        <Route path="/" element={<HomeRoute />} />

        {/* Public auth */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/select-tenant" element={<ProtectedRoute><TenantSelectorPage /></ProtectedRoute>} />

        {/* Onboarding — potrzebuje auth, nie wymaga tenanta */}
        <Route path="/onboarding" element={<ProtectedRoute><OnboardingWizard /></ProtectedRoute>} />

        {/* Customer Portal (public link with token) */}
        <Route path="/portal/:token" element={<Lazy component={CustomerPortalModule} />} />

        {/* Field Service Client Reschedule Portal (public, token-based) */}
        <Route path="/client-event/:tenantId/:tokenId" element={<Lazy component={ClientReschedulePortal} />} />

        {/* Public iFrame embeds (no auth required) */}
        <Route path="/iframe/om/:configId" element={<Lazy component={OmIframeView} />} />
        <Route path="/iframe/careers/:configId" element={<Lazy component={CareersIframeView} />} />
        <Route path="/iframe/bookings/:configId" element={<Lazy component={BookingsIframeView} />} />

        {/* Booking Public Page (public, no auth) */}
        <Route path="/book/:tenantId" element={<Lazy component={BookingPublicPage} />} />

        {/* Protected app routes */}
        <Route element={
          <ProtectedRoute>
            <TenantProtectedRoute>
              <AppLayout />
            </TenantProtectedRoute>
          </ProtectedRoute>
        }>
          {/* Dashboard */}
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/ai-copilot" element={<Lazy component={AiCopilotModule} />} />

          {/* Operations */}
          <Route path="/time" element={<Lazy component={TimeTrackingPage} />} />
          <Route path="/kanban" element={<Lazy component={KanbanPage} />} />
          <Route path="/projects" element={<Lazy component={ProjectsModule} />} />
          <Route path="/crm" element={<Lazy component={CrmModule} />} />
          <Route path="/communication" element={<Lazy component={CommunicationModule} />} />

          {/* Finance */}
          <Route path="/finance" element={<Lazy component={FinanceCoreModule} />} />
          <Route path="/finance/contractors" element={<Lazy component={ContractorsModule} />} />
          <Route path="/finance/assets" element={<Lazy component={AssetsModule} />} />
          <Route path="/finance/bureau" element={<Lazy component={BureauModule} />} />
          <Route path="/finance/expenses" element={<Lazy component={ExpenseModule} />} />
          <Route path="/finance/recurring" element={<Lazy component={RecurringModule} />} />
          <Route path="/finance/purchasing" element={<Lazy component={PurchaseModule} />} />
          <Route path="/controlling" element={<Lazy component={ControllingModule} />} />
          <Route path="/payments" element={<Lazy component={PaymentsModule} />} />

          {/* HR */}
          <Route path="/hr/*" element={<Lazy component={HrModule} />} />
          <Route path="/lms" element={<Lazy component={LmsModule} />} />
          <Route path="/wellness" element={<Lazy component={WellnessModule} />} />

          {/* Compliance */}
          <Route path="/compliance" element={<Lazy component={ComplianceModule} />} />
          <Route path="/esg" element={<Lazy component={EsgModule} />} />
          <Route path="/quality" element={<Lazy component={QualityModule} />} />

          {/* Documents */}
          <Route path="/workflow" element={<Lazy component={WorkflowModule} />} />
          <Route path="/marketing" element={<Lazy component={MarketingModule} />} />
          <Route path="/dms" element={<Lazy component={DmsModule} />} />
          <Route path="/esignature" element={<Lazy component={ESignatureModule} />} />

          {/* Field Service */}
          <Route path="/field-service" element={<Lazy component={FieldServiceModule} />} />

          {/* Booking */}
          <Route path="/booking" element={<Lazy component={BookingModule} />} />

          {/* Logistics */}
          <Route path="/logistics" element={<Lazy component={LogisticsModule} />} />

          {/* Industry */}
          <Route path="/industry/construction" element={<Lazy component={ConstructionModule} />} />
          <Route path="/industry/gardening" element={<Lazy component={GardeningModule} />} />
          <Route path="/industry/cleaning" element={<Lazy component={CleaningModule} />} />
          <Route path="/industry/fleet" element={<Lazy component={FleetModule} />} />
          <Route path="/industry/mechanics" element={<Lazy component={WarrantyServiceModule} />} />
          <Route path="/industry/safety" element={<Lazy component={SafetyModule} />} />
          <Route path="/voice-log" element={<Lazy component={VoiceLogModule} />} />

          {/* System */}
          <Route path="/cross-company" element={<Lazy component={CrossCompanyModule} />} />
          <Route path="/admin/*" element={<Lazy component={AdminModule} />} />
          <Route path="/settings" element={<Lazy component={SettingsModule} />} />

          {/* Shop / E-commerce */}
          <Route path="/shop" element={<Lazy component={ShopModule} />} />

          {/* Leads to Cash */}
          <Route path="/leads-to-cash" element={<Lazy component={LeadsToCashModule} />} />

          {/* NoFiCo Core */}
          <Route path="/ai-guardian" element={<Lazy component={AiGuardianModule} />} />
          <Route path="/swipe" element={<Lazy component={SwipeMatchModule} />} />
          <Route path="/expenses" element={<Lazy component={ExpensesModule} />} />
          <Route path="/legal-vault" element={<Lazy component={LegalVaultModule} />} />
          <Route path="/export" element={<Lazy component={ExportDistributionModule} />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster richColors position="top-right" />
    </Suspense>
  );
}
