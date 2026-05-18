import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, googleProvider, db } from '../../shared/lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../shared/lib/firestoreUtils';

interface UserData {
  id?: string;
  email: string;
  name?: string;
  displayName: string;
  companyId?: string;
  role?: string;
  photoURL?: string;
  mfaEnabled?: boolean;
  biometricEnabled?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
  showTechnicalNames?: boolean;
  notifications?: { email: boolean; push: boolean; inApp: boolean; };
  createdAt: any;
  lastLoginAt?: any;
  activeTenantId?: string;
  onboardingCompleted?: boolean;
}

export interface TenantMembership {
  roleId: string;
  status: 'active' | 'suspended' | 'left';
  joinedAt: any;
  invitedBy?: string;
  attributes?: Record<string, any>;
}

export interface RoleData {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystemRole?: boolean;
}

export const DEFAULT_ROLES: Record<string, RoleData> = {
  owner:    { id: 'owner',    name: 'Właściciel',    description: 'Pełny dostęp do organizacji',        permissions: ['*'],                                                    isSystemRole: true },
  admin:    { id: 'admin',    name: 'Administrator',  description: 'Zarządzanie projektami i personelem', permissions: ['projects.manage', 'users.manage', 'reports.view'],     isSystemRole: true },
  manager:  { id: 'manager',  name: 'Manager',        description: 'Zarządzanie operacyjne',              permissions: ['projects.view', 'tasks.manage', 'reports.view'],       isSystemRole: true },
  employee: { id: 'employee', name: 'Pracownik',      description: 'Podstawowy dostęp',                  permissions: ['time.log', 'tasks.view'],                               isSystemRole: true },
};

interface AuthContextType {
  user: FirebaseUser | null;
  userData: UserData | null;
  memberships: Record<string, TenantMembership>;
  activeTenantId: string | null;
  roleData: RoleData | null;
  isGlobalAdmin: boolean;
  loading: boolean;
  userDataLoaded: boolean;
  hasPermission: (permission: string) => boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string, name: string, tenantData?: any) => Promise<void>;
  logout: () => Promise<void>;
  setActiveTenant: (tenantId: string) => void;
  updateUserSettings: (settings: Partial<UserData>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null, userData: null, memberships: {}, activeTenantId: null,
  roleData: null, loading: true, userDataLoaded: false, isGlobalAdmin: false,
  hasPermission: () => false,
  loginWithGoogle: async () => {}, loginWithEmail: async () => {},
  signupWithEmail: async () => {}, logout: async () => {},
  setActiveTenant: () => {}, updateUserSettings: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser]               = useState<FirebaseUser | null>(null);
  const [userData, setUserData]       = useState<UserData | null>(null);
  const [memberships, setMemberships] = useState<Record<string, TenantMembership>>({});
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);
  const [roleData, setRoleData]       = useState<RoleData | null>(null);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const [loading, setLoading]         = useState(true);
  const [userDataLoaded, setUserDataLoaded] = useState(false);

  const fetchRole = async (roleId: string): Promise<RoleData> =>
    DEFAULT_ROLES[roleId] || DEFAULT_ROLES['employee'];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Hardcoded global admins — set immediately, no Firestore needed
        if (['Mariusz.Czaja@gmail.com', 'mariusz@c-icas.gg', 'marius@c-icas.gg', 'lena@c-icas.gg'].includes(currentUser.email || '')) {
          setIsGlobalAdmin(true);
        }
        // Unblock routing immediately — profile loads async below
        setLoading(false);

        // Load profile data in background (does NOT affect routing)
        const userRef = doc(db, 'users', currentUser.uid);
        getDoc(userRef).then(async (userSnap) => {
          if (userSnap.exists()) {
            const data = userSnap.data() as UserData;
            setUserData(data);
            if (data.language) {
              import('../../app/i18n').then(({ default: i18n }) => i18n.changeLanguage(data.language!));
            }
            if ((data as any).isGlobalAdmin) setIsGlobalAdmin(true);

            try {
              const membershipsRef = collection(db, `users/${currentUser.uid}/tenantMemberships`);
              const membershipsSnap = await getDocs(membershipsRef);
              const mbs: Record<string, TenantMembership> = {};
              membershipsSnap.forEach(d => { mbs[d.id] = d.data() as TenantMembership; });
              setMemberships(mbs);

              const savedTenant = localStorage.getItem('lastTenantId');
              const tenantId = data.activeTenantId || savedTenant || Object.keys(mbs)[0] || null;
              setActiveTenantId(tenantId);
              if (tenantId) localStorage.setItem('lastTenantId', tenantId);
              if (tenantId && mbs[tenantId]) {
                const roleInfo = await fetchRole(mbs[tenantId].roleId);
                setRoleData(roleInfo);
              }
            } catch (mbError) {
              console.warn('[AuthContext] memberships fetch failed (non-fatal):', mbError);
            }
          } else {
            const newUser: UserData = {
              email: currentUser.email || '',
              displayName: currentUser.displayName || '',
              photoURL: currentUser.photoURL || '',
              createdAt: serverTimestamp(),
              lastLoginAt: serverTimestamp(),
            };
            setDoc(userRef, newUser)
              .then(() => setUserData(newUser))
              .catch(err => handleFirestoreError(err, OperationType.CREATE, `users/${currentUser.uid}`));
          }
          setUserDataLoaded(true);
        }).catch(error => {
          console.error('Auth profile sync error:', error);
          setUserDataLoaded(true); // even on error — unblock routing
        });
      } else {
        setUserData(null); setMemberships({}); setActiveTenantId(null);
        setRoleData(null); setIsGlobalAdmin(false); setLoading(false);
        setUserDataLoaded(false);
      }
    });
    return unsubscribe;
  }, []);

  const hasPermission = (permission: string): boolean => {
    if (isGlobalAdmin) return true;
    if (!roleData) return false;
    if (roleData.permissions.includes('*')) return true;
    return roleData.permissions.includes(permission);
  };

  const loginWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const loginWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signupWithEmail = async (email: string, pass: string, name: string, tenantData?: any) => {
    const { createUserWithEmailAndPassword } = await import('firebase/auth');
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    if (res.user) {
      const userRef = doc(db, 'users', res.user.uid);
      const newUser: UserData = { email, displayName: name, createdAt: serverTimestamp(), lastLoginAt: serverTimestamp() };
      if (tenantData?.name && tenantData?.nip) {
        const tenantRef = doc(collection(db, 'tenants'));
        try {
          await setDoc(tenantRef, { ...tenantData, createdAt: serverTimestamp(), ownerId: res.user.uid, activeModules: ['dashboard', 'crm', 'projects', 'time', 'finance'] });
        } catch (tErr) { handleFirestoreError(tErr, OperationType.CREATE, 'tenants'); }
        newUser.activeTenantId = tenantRef.id;
        const membershipRef = doc(db, `users/${res.user.uid}/tenantMemberships`, tenantRef.id);
        try { await setDoc(membershipRef, { roleId: 'owner', status: 'active', joinedAt: serverTimestamp() }); }
        catch (mErr) { handleFirestoreError(mErr, OperationType.CREATE, `users/${res.user.uid}/tenantMemberships`); }
      }
      try { await setDoc(userRef, newUser); setUserData(newUser); }
      catch (uErr) { handleFirestoreError(uErr, OperationType.CREATE, `users/${res.user.uid}`); }
    }
  };

  const logout = async () => { await signOut(auth); };

  const setActiveTenant = (tenantId: string) => {
    setActiveTenantId(tenantId);
    localStorage.setItem('lastTenantId', tenantId);
    if (memberships[tenantId]) fetchRole(memberships[tenantId].roleId).then(setRoleData);
    if (user) {
      setDoc(doc(db, 'users', user.uid), { activeTenantId: tenantId }, { merge: true })
        .catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`));
      import('../../shared/lib/audit').then(({ logAudit, AuditEventType }) => {
        logAudit(user.uid, user.email || '', AuditEventType.TENANT_SWITCHED, tenantId, { previousTenantId: activeTenantId });
      }).catch(() => {});
    }
  };

  const updateUserSettings = async (settings: Partial<UserData>) => {
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      try {
        await setDoc(userRef, { ...settings }, { merge: true });
        if (userData) setUserData({ ...userData, ...settings });
      } catch (err) { handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`); }
    }
  };

  return (
    <AuthContext.Provider value={{
      user, userData, memberships, activeTenantId, roleData, loading, userDataLoaded, isGlobalAdmin,
      hasPermission, loginWithGoogle, loginWithEmail, signupWithEmail,
      logout, setActiveTenant, updateUserSettings,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
