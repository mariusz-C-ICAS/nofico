import { useState, useEffect } from 'react';
import { db } from '../../../shared/lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useAuth } from '../../../shared/hooks/AuthContext';

export interface FieldPermission {
  id: string;
  roleId: string;
  moduleName: string;
  fieldName: string;
  accessType: 'HIDDEN' | 'READ_ONLY' | 'EDIT';
}

export const useFieldAuth = (moduleName: string) => {
  const { activeTenantId, userData } = useAuth();
  const [permissions, setPermissions] = useState<FieldPermission[]>([]);

  useEffect(() => {
    if (!activeTenantId || !userData?.roles) return;

    const unsub = onSnapshot(query(
      collection(db, 'field_permissions'), 
      where('tenantId', '==', activeTenantId),
      where('moduleName', '==', moduleName)
    ), (snap) => {
      const allPerms = snap.docs.map(d => ({ id: d.id, ...d.data() } as FieldPermission));
      // Filter for roles the user actually has
      const userPerms = allPerms.filter(p => userData.roles.includes(p.roleId));
      setPermissions(userPerms);
    });

    return () => unsub();
  }, [activeTenantId, userData, moduleName]);

  const getFieldAccess = (fieldName: string): 'HIDDEN' | 'READ_ONLY' | 'EDIT' => {
    const fieldPerms = permissions.filter(p => p.fieldName === fieldName);
    if (fieldPerms.length === 0) return 'EDIT'; // Default is full access if no rule

    // If multiple roles define access, prioritize the most restrictive? 
    // Usually, in security, if one role says HIDDEN, it's HIDDEN.
    if (fieldPerms.some(p => p.accessType === 'HIDDEN')) return 'HIDDEN';
    if (fieldPerms.some(p => p.accessType === 'READ_ONLY')) return 'READ_ONLY';
    return 'EDIT';
  };

  return { getFieldAccess };
};
