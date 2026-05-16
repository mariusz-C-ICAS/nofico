import { useTenant as useTenantFromContext } from '../../app/providers/TenantProvider';

/**
 * Hook do zarządzania aktywnym tenantem (miejscem pracy).
 */
export const useTenant = () => {
  return useTenantFromContext();
};

export default useTenant;
