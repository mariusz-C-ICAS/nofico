import { useTenant as useTenantFromContext } from '../../core/auth/TenantContext';

export const useTenant = () => {
  const { currentTenant, switchTenant, loadingTenants } = useTenantFromContext();
  return {
    activeTenantId: currentTenant?.id ?? null,
    activeTenantName: currentTenant?.name ?? null,
    switchTenant,
    isLoading: loadingTenants,
  };
};

export default useTenant;
