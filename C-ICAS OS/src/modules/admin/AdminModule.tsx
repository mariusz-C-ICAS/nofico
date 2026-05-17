/**
 * Data: 2026-05-10 13:43
 * Utworzył: Agent AI
 * Opis: Moduł Administracyjny (Panel dla właściciela C-ICAS). Zarządzanie użytkownikami (B2B, UoP) w wielu firmach.
 */
import React, { useState, useEffect } from 'react';
import { db } from '../../shared/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../shared/hooks/AuthContext';
import { Users, Building, ShieldCheck, CheckCircle, XCircle, UserPlus, Shield, CreditCard, Layers, Activity, Zap, Bot, Bell, Monitor, Database, Globe } from 'lucide-react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import SystemModulesAdmin from './SystemModulesAdmin';
import LicenseModule from './LicenseModule';
import IntegrationsAdmin from './IntegrationsAdmin';
import TenantAdminModule from './TenantAdminModule';
import RolesAdmin from './RolesAdmin';
import SecurityAdmin from './SecurityAdmin';
import BillingAdmin from './BillingAdmin';
import AiConfigAdmin from './AiConfigAdmin';
import NotificationRetentionAdmin from './NotificationRetentionAdmin';
import IframesAdminModule from './IframesAdminModule';
import GlobalApiAdminPanel from '../api/GlobalApiAdminPanel';
import RetentionAdmin from './RetentionAdmin';
import AuditLogViewer from './AuditLogViewer';
import TestDataAdminModule from './TestDataAdminModule';
import StructuralPermissionsModule from '../auth/StructuralPermissionsModule';
import FieldAuthorizationModule from '../auth/FieldAuthorizationModule';
import { adminService } from './services/adminService';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import firebaseConfig from '../../../firebase-applet-config.json';
import { handleFirestoreError, OperationType } from '../../shared/lib/firestoreUtils';

export default function AdminModule() {
  const { user, userData, activeTenantId, hasPermission, isGlobalAdmin } = useAuth();
  const location = useLocation();
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('employee');
  const [availableRoles, setAvailableRoles] = useState<{id: string, name: string}[]>([]);
  const [isCreatingInternal, setIsCreatingInternal] = useState(false);
  const [error, setError] = useState('');

  // isGlobalAdmin = pełny dostęp do całej instancji
  // tenant OWNER/ADMIN = dostęp tylko do własnej organizacji
  const hasAccess = hasPermission('*') || hasPermission('users.manage') || hasPermission('roles.manage');

  useEffect(() => {
    if (!hasAccess) return;
    // Global admin widzi wszystkich — tenant admin tylko swoją organizację
    const q = isGlobalAdmin
      ? query(collection(db, 'users'))
      : query(collection(db, 'users'), where('tenantId', '==', activeTenantId));
    const unsubscribeUsers = onSnapshot(q, (snapshot) => {
      setUsersList(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error('Error fetching users:', err);
      setLoading(false);
    });

    const qr = query(collection(db, 'roles'));
    const unsubscribeRoles = onSnapshot(qr, (snap) => {
       const dbRoles = snap.docs.map(d => ({ id: d.id, name: d.data().name }));
       const merged = [...dbRoles];
       
       // Add defaults if missing
       const dbRoleIds = new Set(dbRoles.map(r => r.id));
       import('../../shared/hooks/AuthContext').then(({ DEFAULT_ROLES }) => {
          Object.values(DEFAULT_ROLES).forEach(dr => {
             if (!dbRoleIds.has(dr.id)) {
                merged.push({ id: dr.id, name: dr.name });
             }
          });
          setAvailableRoles(merged);
       }).catch(console.error);
    }, (err) => {
       console.error('Error fetching roles:', err);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeRoles();
    };
  }, [hasAccess]);

  const toggleUserActive = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        isActive: !currentStatus,
        updatedAt: serverTimestamp()
      });
    } catch(e) {
      console.error(e);
      alert('Błąd aktualizacji statusu użytkownika.');
    }
  };

  const updateCompanyId = async (userId: string, newCompanyId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        tenantId: newCompanyId,
        updatedAt: serverTimestamp()
      });
    } catch(e) {
      console.error(e);
      alert('Błąd aktualizacji firmy.');
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      await adminService.updateUserRole(userId, newRole);
    } catch (err) {
      console.error('Error updating role:', err);
      alert('Błąd aktualizacji roli.');
    }
  };

  const handleCreateInternalUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword) return;
    
    setIsCreatingInternal(true);
    setError('');
    let secondaryApp;
    try {
      if (!/^[a-z0-9._-]+$/.test(newUsername)) {
        throw new Error('Nazwa użytkownika może zawierać tylko małe litery, cyfry, kropki i myślniki.');
      }

      secondaryApp = initializeApp(firebaseConfig, `SecondaryApp_${Date.now()}`);
      const secondaryAuth = getAuth(secondaryApp);
      
      const internalEmail = `${newUsername}@internal.c-icas.com`;
      const cred = await createUserWithEmailAndPassword(secondaryAuth, internalEmail, newPassword);
      
      const userPath = `users/${cred.user.uid}`;
      try {
        await setDoc(doc(db, 'users', cred.user.uid), {
           email: cred.user.email,
           displayName: newUsername,
           role: newUserRole,
           isActive: true,
           tenantId: activeTenantId || 'default',
           type: 'internal',
           createdAt: serverTimestamp()
        });
      } catch(dbErr) {
        handleFirestoreError(dbErr, OperationType.CREATE, userPath);
      }
      
      alert(`Konto wewnętrzne (${newUsername}) utworzone pomyślnie!`);
      setNewUsername('');
      setNewPassword('');
    } catch (err: any) {
      console.error(err);
      setError(`Błąd: ${err.message}`);
    } finally {
      if (secondaryApp) {
        await deleteApp(secondaryApp).catch(console.error);
      }
      setIsCreatingInternal(false);
    }
  };

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center p-10 h-[50vh] text-gray-500">
        <ShieldCheck size={48} className="mb-4 text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-700">Dostęp zastrzeżony</h2>
        <p className="mt-2">Ten moduł jest przeznaczony wyłącznie dla administratorów C-ICAS.OS.</p>
      </div>
    );
  }

  const allNavItems = [
    { label: 'Użytkownicy',   path: '/admin',               icon: Users,      globalOnly: false },
    { label: 'Autoryzacje',   path: '/admin/auth',           icon: ShieldCheck,globalOnly: false },
    { label: 'Zabezpieczenia',path: '/admin/security',       icon: Shield,     globalOnly: false },
    { label: 'Billing',       path: '/admin/billing',        icon: CreditCard, globalOnly: false },
    { label: 'Organizacje',   path: '/admin/tenants',        icon: Building,   globalOnly: true  },
    { label: 'Widoki iFrame', path: '/admin/iframes',        icon: Monitor,    globalOnly: false },
    { label: 'Dane Wzorcowe', path: '/admin/testdata',       icon: Database,   globalOnly: false },
    { label: 'System',        path: '/admin/system',         icon: Layers,     globalOnly: true  },
    { label: 'Integracje',    path: '/admin/integrations',   icon: Zap,        globalOnly: false },
    { label: 'Retencja GDPR', path: '/admin/retention',      icon: ShieldCheck,globalOnly: true  },
    { label: 'AI',            path: '/admin/ai',             icon: Bot,        globalOnly: true  },
    { label: 'Powiadomienia', path: '/admin/notifications',  icon: Bell,       globalOnly: false },
    { label: 'Aktualizacje',  path: '/admin/updates',        icon: Activity,   globalOnly: false },
    { label: 'Public API',    path: '/admin/api',            icon: Globe,      globalOnly: true  },
    { label: 'Logi Audytu',   path: '/admin/audit',          icon: Activity,   globalOnly: true  },
  ];
  const navItems = allNavItems.filter(item => isGlobalAdmin || !item.globalOnly);

  const handleInviteUser = async () => {
    const email = prompt('Wpisz email zapraszanego użytkownika:');
    if (!email) return;
    try {
      await adminService.inviteUser(email, 'employee', 'default');
      alert('Zaproszenie wysłane pomyślnie!');
    } catch (err) {
      console.error(err);
      alert('Błąd podczas wysyłania zaproszenia.');
    }
  };

  const currentNav = navItems.find(item => {
    if (item.path === '/admin') return location.pathname === '/admin' || location.pathname === '/admin/';
    return location.pathname.startsWith(item.path);
  })?.label || 'Użytkownicy';

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Nav */}
          <div className="lg:w-64 space-y-2">
            <div className="mb-8 px-4">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">Admin Panel</h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">C-ICAS.OS v2.6.4</p>
              {!isGlobalAdmin && (
                <div className="mt-3 px-2 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-[9px] font-black uppercase tracking-widest text-amber-600">Widok: tylko Twoja organizacja</p>
                </div>
              )}
            </div>
            {navItems.map((item) => (
              <Link 
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all ${
                  (item.path === '/admin' ? (location.pathname === '/admin' || location.pathname === '/admin/') : location.pathname.startsWith(item.path))
                    ? 'bg-slate-900 text-white shadow-xl'
                    : 'text-slate-400 hover:bg-white hover:text-slate-900'
                }`}
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1">
            <Routes>
              <Route index element={
                <div className="space-y-8">
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-8">
                      <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-100 justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-900 rounded-lg">
                            <Users size={20} className="text-white" />
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Pracownicy i Role</h2>
                            <p className="text-sm text-slate-500">Zarządzanie kontami użytkowników i ich uprawnieniami</p>
                          </div>
                        </div>
                        <button 
                          onClick={handleInviteUser}
                          className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100"
                        >
                          <UserPlus size={16} /> Zaproś Mailem
                        </button>
                      </div>

                    {loading ? (
                      <div className="py-10 text-center text-gray-400">Ładowanie bazy pracowników...</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-600 text-sm font-semibold border-y border-gray-200">
                              <th className="p-4 rounded-tl-lg">Pracownik</th>
                              <th className="p-4">Email</th>
                              <th className="p-4">Firma (ID)</th>
                              <th className="p-4">Rola</th>
                              <th className="p-4 rounded-tr-lg">Aktywny (Dostęp)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-sm font-bold">
                            {usersList.map(u => (
                              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 text-gray-900 flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white font-black text-[10px] uppercase">
                                    {u.displayName?.substring(0,2) || 'UK'}
                                  </div>
                                  <span className="uppercase tracking-tight">{u.displayName || 'Nieznany'}</span>
                                </td>
                                <td className="p-4 text-slate-400 text-xs lowercase">{u.email}</td>
                                <td className="p-4">
                                  <input 
                                    className="border-none bg-slate-50 rounded-xl px-3 py-2 text-xs font-black uppercase text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none w-full max-w-[120px]"
                                    defaultValue={u.tenantId || ''}
                                    onBlur={(e) => {
                                      if(e.target.value !== u.tenantId) updateCompanyId(u.id, e.target.value);
                                    }}
                                    placeholder="n/d"
                                  />
                                </td>
                                <td className="p-4">
                                  <select 
                                    value={u.role || 'employee'}
                                    onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                                    className="bg-indigo-50 text-indigo-700 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-widest outline-none border-none focus:ring-2 focus:ring-indigo-500"
                                  >
                                    {availableRoles.map(r => (
                                      <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="p-4">
                                  <button 
                                    onClick={() => toggleUserActive(u.id, u.isActive ?? true)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all ${
                                      (u.isActive ?? true) 
                                        ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' 
                                        : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                                    }`}
                                  >
                                    {(u.isActive ?? true) ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                    {(u.isActive ?? true) ? 'Aktywne' : 'Zablokowane'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-8">
                    <h3 className="font-black uppercase italic text-slate-900 flex items-center gap-3 mb-6 tracking-tighter text-xl">
                      <UserPlus size={24} className="text-indigo-600" />
                      Inicjuj Nowy Profil
                    </h3>
                    {error && <div className="mb-4 p-4 bg-rose-50 text-rose-600 text-xs rounded-2xl font-bold uppercase border border-rose-100">{error}</div>}
                    <form onSubmit={handleCreateInternalUser} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <div>
                         <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Rola Systemowa</label>
                         <select 
                           value={newUserRole} 
                           onChange={e => setNewUserRole(e.target.value)}
                           className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-black uppercase tracking-widest"
                         >
                            {availableRoles.map(role => (
                               <option key={role.id} value={role.id}>{role.name}</option>
                            ))}
                         </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Nazwa użytkownika (ID)</label>
                        <input 
                          type="text" 
                          value={newUsername}
                          onChange={e => setNewUsername(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold placeholder:font-normal"
                          placeholder="np. jan.kowalski"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Hasło początkowe</label>
                        <input 
                          type="password" 
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="••••••"
                          required
                        />
                      </div>
                      <div className="md:col-span-4 flex justify-end pt-4">
                        <button 
                          type="submit"
                          disabled={isCreatingInternal}
                          className="bg-slate-900 text-white font-black uppercase tracking-widest py-4 px-10 rounded-2xl transition-all shadow-xl hover:bg-indigo-600 disabled:opacity-50 text-xs flex items-center gap-3"
                        >
                          {isCreatingInternal ? 'Budowanie konta...' : <><UserPlus size={18}/> Aktywuj Konto</>}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              } />
              <Route path="security" element={<SecurityAdmin />} />
              <Route path="auth/*" element={
                <div className="space-y-6">
                  <div className="flex gap-4 border-b border-slate-200 pb-4 mb-4">
                    <Link to="/admin/auth/structural" className="text-sm font-bold text-slate-600 hover:text-slate-900">Uprawnienia Strukturalne</Link>
                    <Link to="/admin/auth/fields" className="text-sm font-bold text-slate-600 hover:text-slate-900">Autoryzacja Pól</Link>
                  </div>
                  <Routes>
                    <Route index element={<StructuralPermissionsModule />} />
                    <Route path="structural" element={<StructuralPermissionsModule />} />
                    <Route path="fields" element={<FieldAuthorizationModule />} />
                  </Routes>
                </div>
              } />
              <Route path="billing" element={<BillingAdmin />} />
              <Route path="tenants" element={<TenantAdminModule />} />
              <Route path="roles" element={<RolesAdmin />} />
              <Route path="system" element={<SystemModulesAdmin />} />
              <Route path="updates" element={<LicenseModule />} />
              <Route path="integrations" element={<IntegrationsAdmin />} />
              <Route path="iframes" element={<IframesAdminModule />} />
              <Route path="testdata" element={<TestDataAdminModule />} />
              <Route path="retention" element={<RetentionAdmin />} />
              <Route path="ai" element={<AiConfigAdmin />} />
              <Route path="notifications" element={<NotificationRetentionAdmin />} />
              <Route path="api" element={<GlobalApiAdminPanel />} />
              <Route path="audit" element={<AuditLogViewer />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
}
