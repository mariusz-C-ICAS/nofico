/**
 * Data: 2026-05-10 13:13
 * Utworzył: Agent AI
 * Zmiany: Utworzenie globalnego kontekstu autoryzacji z Firebase
 * Opis: AuthContext zapewnia dostęp do użytkownika. Dostarcza metody logowania via Google i Wylogowywania.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleProvider, db } from '../../shared/lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';

interface UserData {
  id?: string;
  email: string;
  name?: string;
  displayName: string;
  companyId?: string;
  role?: string;
  roles?: string[];
  permissions?: string[];
  subscriptionTier?: string;
  photoURL?: string;
  mfaEnabled?: boolean;
  biometricEnabled?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
  showTechnicalNames?: boolean;
  notifications?: {
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
  createdAt: any;
  lastLoginAt?: any;
  activeTenantId?: string; // Currently selected tenant
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
  owner: { id: 'owner', name: 'Właściciel', description: 'Pełny dostęp do organizacji', permissions: ['*'], isSystemRole: true },
  admin: { id: 'admin', name: 'Administrator', description: 'Zarządzanie projektami i personelem', permissions: ['projects.manage', 'users.manage', 'reports.view'], isSystemRole: true },
  manager: { id: 'manager', name: 'Manager', description: 'Zarządzanie operacyjne', permissions: ['projects.view', 'tasks.manage', 'reports.view'], isSystemRole: true },
  employee: { id: 'employee', name: 'Pracownik', description: 'Podstawowy dostęp', permissions: ['time.log', 'tasks.view'], isSystemRole: true }
};

interface AuthContextType {
  user: FirebaseUser | null;
  userData: UserData | null;
  memberships: Record<string, TenantMembership>;
  activeTenantId: string | null;
  roleData: RoleData | null;
  isGlobalAdmin: boolean;
  loading: boolean;
  hasPermission: (permission: string) => boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string, name: string, tenantData?: any) => Promise<void>;
  logout: () => Promise<void>;
  setActiveTenant: (tenantId: string) => void;
  updateUserSettings: (settings: Partial<UserData>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  memberships: {},
  activeTenantId: null,
  roleData: null,
  loading: true,
  isGlobalAdmin: false,
  hasPermission: () => false,
  loginWithGoogle: async () => {},
  loginWithEmail: async () => {},
  signupWithEmail: async () => {},
  logout: async () => {},
  setActiveTenant: () => {},
  updateUserSettings: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [memberships, setMemberships] = useState<Record<string, TenantMembership>>({});
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);
  const [roleData, setRoleData] = useState<RoleData | null>(null);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchRole = async (roleId: string) => {
    return DEFAULT_ROLES[roleId] || DEFAULT_ROLES['employee'];
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Natychmiastowe sprawdzenie uprawnień globalnego admina po e-mailu
        if (currentUser.email === 'Mariusz.Czaja@gmail.com' || currentUser.email === 'mariusz@c-icas.gg' || currentUser.email === 'lena@c-icas.gg') {
          setIsGlobalAdmin(true);
        }

        const userRef = doc(db, 'users', currentUser.uid);
        try {
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const data = userSnap.data() as UserData;
            setUserData(data);

            if (data.language) {
              const { default: i18n } = await import('../../app/i18n');
              i18n.changeLanguage(data.language);
            }
            
            // Check if user has explicit isGlobalAdmin flag in database
            // @ts-ignore
            if (data.isGlobalAdmin) {
              setIsGlobalAdmin(true);
            }
            
            // Fetch memberships
            const membershipsRef = collection(db, `users/${currentUser.uid}/tenantMemberships`);
            try {
              const membershipsSnap = await getDocs(membershipsRef);
              const mbs: Record<string, TenantMembership> = {};
              membershipsSnap.forEach(doc => {
                mbs[doc.id] = doc.data() as TenantMembership;
              });
              setMemberships(mbs);

              // Set active tenant
              const savedTenant = localStorage.getItem('lastTenantId');
              const tenantId = data.activeTenantId || savedTenant || Object.keys(mbs)[0] || null;
              setActiveTenantId(tenantId);
              if (tenantId) localStorage.setItem('lastTenantId', tenantId);

              if (tenantId && mbs[tenantId]) {
                const roleInfo = await fetchRole(mbs[tenantId].roleId);
                setRoleData(roleInfo);
              }
            } catch (mbError) {
              handleFirestoreError(mbError, OperationType.LIST, `users/${currentUser.uid}/tenantMemberships`);
            }
          } else {
             // New user from Google
             const newUser: UserData = {
               email: currentUser.email || '',
               displayName: currentUser.displayName || '',
               photoURL: currentUser.photoURL || '',
               createdAt: serverTimestamp(),
               lastLoginAt: serverTimestamp(),
             };
             try {
               await setDoc(userRef, newUser);
               setUserData(newUser);
             } catch (setErr) {
               handleFirestoreError(setErr, OperationType.CREATE, `users/${currentUser.uid}`);
             }
          }
        } catch (error) {
          console.error("Auth sync error:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setUserData(null);
        setMemberships({});
        setActiveTenantId(null);
        setRoleData(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Błąd logowania Google:', error);
      throw error;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signupWithEmail = async (email: string, pass: string, name: string, tenantData?: any) => {
    const { createUserWithEmailAndPassword } = await import('firebase/auth');
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    if (res.user) {
      const userRef = doc(db, 'users', res.user.uid);
      const newUser: UserData = {
        email,
        displayName: name,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      };
      
      // If tenant data provided (like from JDG signup)
      if (tenantData && tenantData.name && tenantData.nip) {
        const tenantRef = doc(collection(db, 'tenants'));
        try {
          await setDoc(tenantRef, {
            ...tenantData,
            createdAt: serverTimestamp(),
            ownerId: res.user.uid,
            activeModules: ['dashboard', 'crm', 'projects', 'time', 'finance'] // Default modules
          });
        } catch (tErr) {
          handleFirestoreError(tErr, OperationType.CREATE, 'tenants');
        }
        
        newUser.activeTenantId = tenantRef.id;
        
        // Add membership
        const membershipRef = doc(db, `users/${res.user.uid}/tenantMemberships`, tenantRef.id);
        try {
          await setDoc(membershipRef, {
            roleId: 'owner',
            status: 'active',
            joinedAt: serverTimestamp()
          });
        } catch (mErr) {
          handleFirestoreError(mErr, OperationType.CREATE, `users/${res.user.uid}/tenantMemberships`);
        }
      }

      try {
        await setDoc(userRef, newUser);
        setUserData(newUser);
      } catch (uErr) {
        handleFirestoreError(uErr, OperationType.CREATE, `users/${res.user.uid}`);
      }
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const setActiveTenant = (tenantId: string) => {
    setActiveTenantId(tenantId);
    localStorage.setItem('lastTenantId', tenantId);
    if (memberships[tenantId]) {
      fetchRole(memberships[tenantId].roleId).then(setRoleData);
    }
    // Sync to user profile for persistence
    if (user) {
      setDoc(doc(db, 'users', user.uid), { activeTenantId: tenantId }, { merge: true })
        .catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`));
      
      // Log audit event
      import('../lib/audit').then(({ logAudit, AuditEventType }) => {
        logAudit(user.uid, user.email || '', AuditEventType.TENANT_SWITCHED, tenantId, {
          previousTenantId: activeTenantId
        });
      });
    }
  };

  const hasPermission = (permission: string) => {
    if (isGlobalAdmin) return true;
    if (!roleData) return false;
    if (roleData.permissions.includes('*')) return true;
    return roleData.permissions.includes(permission);
  };

  const updateUserSettings = async (settings: Partial<UserData>) => {
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      try {
        await setDoc(userRef, { ...settings }, { merge: true });
        if (userData) setUserData({ ...userData, ...settings });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, userData, memberships, activeTenantId, roleData, loading, isGlobalAdmin,
      hasPermission, loginWithGoogle, loginWithEmail, signupWithEmail, 
      logout, setActiveTenant, updateUserSettings 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
