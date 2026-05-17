import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useTenant } from './TenantContext';

export type AppRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'USER';

const ROLE_ORDER: AppRole[] = ['USER', 'MANAGER', 'ADMIN', 'OWNER'];

// Default allowed paths per role (OWNER/ADMIN = all, not listed)
const DEFAULT_PATHS: Record<'MANAGER' | 'USER', string[]> = {
  MANAGER: [
    '/', '/ai-copilot', '/communication',
    '/time', '/kanban', '/projects', '/crm', '/leads-to-cash', '/expenses',
    '/hr', '/lms', '/wellness',
    '/compliance', '/quality',
    '/field-service', '/booking',
    '/dms', '/esignature', '/marketing',
    '/logistics',
    '/settings',
  ],
  USER: [
    '/', '/time', '/kanban', '/communication', '/expenses', '/wellness',
  ],
};

export interface RoleConfig {
  allowedPaths: string[];
}

export function useRole() {
  const { currentTenant, activeTenantId } = useTenant() as any;
  const tenantId: string | undefined = activeTenantId ?? currentTenant?.id;
  const role: AppRole = (currentTenant?.role as AppRole) ?? 'USER';

  const [override, setOverride] = useState<Record<string, string[]> | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    const ref = doc(db, `tenants/${tenantId}/config/rolePermissions`);
    return onSnapshot(ref, snap => {
      setOverride(snap.exists() ? (snap.data() as Record<string, string[]>) : {});
    });
  }, [tenantId]);

  const canAccess = (path: string): boolean => {
    if (role === 'OWNER' || role === 'ADMIN') return true;
    const perms: string[] =
      override?.[role] ?? DEFAULT_PATHS[role as 'MANAGER' | 'USER'] ?? [];
    return perms.some(p => path === p || (p !== '/' && path.startsWith(p)));
  };

  const isAtLeast = (minRole: AppRole): boolean =>
    ROLE_ORDER.indexOf(role) >= ROLE_ORDER.indexOf(minRole);

  const saveRoleConfig = async (targetRole: AppRole, paths: string[]) => {
    if (!tenantId) return;
    const ref = doc(db, `tenants/${tenantId}/config/rolePermissions`);
    await setDoc(ref, { [targetRole]: paths }, { merge: true });
  };

  const getEffectivePaths = (targetRole: AppRole): string[] => {
    if (targetRole === 'OWNER' || targetRole === 'ADMIN') return ['*'];
    return override?.[targetRole] ?? DEFAULT_PATHS[targetRole as 'MANAGER' | 'USER'] ?? [];
  };

  return { role, canAccess, isAtLeast, saveRoleConfig, getEffectivePaths, override };
}
