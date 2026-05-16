/**
 * Data: 2026-05-12
 * Zmiany: Moduł Zarządzania Rolami (RBAC)
 * Opis: Ekran pozwalający na definiowanie ról, uprawnień i korzystanie z wbudowanych ról jako szablonów.
 */
import React, { useState, useEffect } from 'react';
import { db } from '../../shared/lib/firebase';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Plus, Shield, ShieldCheck, ShieldAlert, Edit, Trash2, Save, X, Activity } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../shared/lib/firestoreUtils';
import { DEFAULT_ROLES, RoleData, useAuth } from '../../shared/hooks/AuthContext';

const AVAILABLE_PERMISSIONS = [
  { id: '*', name: 'Pełny Dostęp (Super Administrator)', group: 'System' },
  { id: 'projects.view', name: 'Podgląd Projektów', group: 'Projekty' },
  { id: 'projects.manage', name: 'Zarządzanie Projektami', group: 'Projekty' },
  { id: 'tasks.view', name: 'Podgląd Zadań', group: 'Zadania' },
  { id: 'tasks.manage', name: 'Zarządzanie Zadaniami', group: 'Zadania' },
  { id: 'time.log', name: 'Rejestracja Czasu', group: 'Czas Pracy' },
  { id: 'time.view_own', name: 'Podgląd Własnego Czasu', group: 'Czas Pracy' },
  { id: 'time.manage', name: 'Zarządzanie Czasem Pracowników', group: 'Czas Pracy' },
  { id: 'users.view', name: 'Podgląd Użytkowników', group: 'Użytkownicy' },
  { id: 'users.manage', name: 'Zarządzanie Użytkownikami', group: 'Użytkownicy' },
  { id: 'roles.manage', name: 'Zarządzanie Rolami', group: 'System' },
  { id: 'reports.view', name: 'Podgląd Raportów', group: 'Raporty' },
  { id: 'finance.view', name: 'Widok Finansów', group: 'Finanse' },
  { id: 'finance.manage', name: 'Zarządzanie Finansami', group: 'Finanse' },
  { id: 'crm.view', name: 'Podgląd CRM i Klientów', group: 'CRM' },
  { id: 'crm.manage', name: 'Zarządzanie CRM', group: 'CRM' }
];

export default function RolesAdmin() {
  const { hasPermission } = useAuth();
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [editingRole, setEditingRole] = useState<RoleData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We subscribe to custom roles in DB
    const q = query(collection(db, 'roles'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const dbRoles = snap.docs.map(d => ({ id: d.id, ...d.data() } as RoleData));
      
      // Merge with default roles (if they are not in DB, pretend they exist as templates)
      const mergedRoles: RoleData[] = [];
      const dbRoleIds = new Set(dbRoles.map(r => r.id));
      
      Object.keys(DEFAULT_ROLES).forEach(defaultRoleId => {
        if (!dbRoleIds.has(defaultRoleId)) {
          mergedRoles.push(DEFAULT_ROLES[defaultRoleId]);
        }
      });
      
      setRoles([...mergedRoles, ...dbRoles]);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'roles');
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleSyncDefaults = async () => {
    if (!confirm('Czy chcesz zapisać wbudowane role jako dokumenty w Firestore? Pomoże to w zarządzaniu regułami security oles.')) return;
    try {
      setLoading(true);
      for (const defaultRoleId of Object.keys(DEFAULT_ROLES)) {
         const r = DEFAULT_ROLES[defaultRoleId];
         await setDoc(doc(db, 'roles', r.id), {
            name: r.name,
            description: r.description,
            permissions: r.permissions,
            isSystemRole: r.isSystemRole || false,
            createdAt: serverTimestamp()
         }, { merge: true });
      }
      alert('Role zostały zsynchronizowane z bazą danych Firestore!');
      setLoading(false);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'roles');
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingRole) return;
    try {
      if (!editingRole.id) {
        editingRole.id = editingRole.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      }
      
      await setDoc(doc(db, 'roles', editingRole.id), {
        name: editingRole.name,
        description: editingRole.description,
        permissions: editingRole.permissions,
        isSystemRole: editingRole.isSystemRole || false,
        createdAt: serverTimestamp()
      }, { merge: true });
      
      setEditingRole(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `roles/${editingRole?.id}`);
    }
  };

  const handleDelete = async (id: string, isSystemRole?: boolean) => {
    if (isSystemRole) {
      alert('Nie można usunąć wbudowanego szablonu/roli.');
      return;
    }
    if (confirm('Czy na pewno chcesz usunąć tę rolę? Użytkownicy z tą rolą mogą stracić dostęp.')) {
      try {
        await deleteDoc(doc(db, 'roles', id));
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, `roles/${id}`);
      }
    }
  };

  const handleTogglePermission = (permissionId: string) => {
    if (!editingRole) return;
    const current = editingRole.permissions || [];
    let updated;
    if (current.includes(permissionId)) {
       updated = current.filter(p => p !== permissionId);
    } else {
       updated = [...current, permissionId];
    }
    setEditingRole({ ...editingRole, permissions: updated });
  };

  if (!hasPermission('roles.manage') && !hasPermission('*')) {
     return <div className="p-6 text-red-600">Brak uprawnień do widoku zarządzania rolami.</div>;
  }

  const groupedPermissions = AVAILABLE_PERMISSIONS.reduce((acc, perm) => {
    if (!acc[perm.group]) acc[perm.group] = [];
    acc[perm.group].push(perm);
    return acc;
  }, {} as Record<string, typeof AVAILABLE_PERMISSIONS>);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Shield className="text-indigo-600" />
            Zarządzanie Rolami (RBAC)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Definiuj role i uprawnienia użytkowników. Główne role służą jako niezmienne szablony.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSyncDefaults}
            className="flex items-center gap-2 bg-white border border-indigo-200 text-indigo-700 px-4 py-2 rounded-lg hover:bg-indigo-50 transition"
            title="Kliknij, aby fizycznie zapisać role pracownik, admin itp. w bazie Firestore"
          >
            <ShieldCheck size={18} />
            Zsynchronizuj Role
          </button>
          <button
            onClick={() => setEditingRole({ id: '', name: '', description: '', permissions: [], isSystemRole: false })}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            <Plus size={18} />
            Nowa Rola
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 animate-pulse text-indigo-400">
           <Activity className="mx-auto mb-2 animate-spin" size={32} />
           Wczytywanie ról...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map(role => (
            <div key={role.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  {role.isSystemRole ? <ShieldCheck className="text-emerald-500" size={20} /> : <ShieldAlert className="text-amber-500" size={20} />}
                  <h3 className="font-semibold text-slate-800 text-lg">{role.name}</h3>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingRole(role)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded bg-slate-50 hover:bg-indigo-50" title="Edytuj">
                    <Edit size={16} />
                  </button>
                  {!role.isSystemRole && (
                    <button onClick={() => handleDelete(role.id, role.isSystemRole)} className="p-1.5 text-slate-400 hover:text-red-600 rounded bg-slate-50 hover:bg-red-50" title="Usuń">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
              
              <p className="text-sm text-slate-500 mb-4 flex-1">
                {role.description || 'Brak opisu'}
              </p>
              
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
                  Uprawnienia ({role.permissions.includes('*') ? 'Wszystkie' : role.permissions.length})
                </span>
                <div className="flex flex-wrap gap-1">
                  {role.permissions.includes('*') ? (
                    <span className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs font-medium border border-red-100">
                      * (Global Admin)
                    </span>
                  ) : (
                    role.permissions.slice(0, 5).map(p => (
                      <span key={p} className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                        {p}
                      </span>
                    ))
                  )}
                  {role.permissions.length > 5 && !role.permissions.includes('*') && (
                    <span className="px-2 py-1 bg-slate-50 text-slate-400 rounded text-xs">
                      +{role.permissions.length - 5} więcej
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL EDYCJI ROLI */}
      {editingRole && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
              <h3 className="font-bold text-lg text-slate-800">
                {editingRole.id ? `Edycja Roli: ${editingRole.name}` : 'Nowa Rola'}
              </h3>
              <button onClick={() => setEditingRole(null)} className="text-slate-400 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nazwa roli</label>
                  <input 
                    type="text" 
                    value={editingRole.name}
                    onChange={e => setEditingRole({...editingRole, name: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="Niestandardowa nazwa"
                  />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Klucz (ID)</label>
                   <input 
                      type="text" 
                      value={editingRole.id || editingRole.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}
                      disabled={!!editingRole.id}
                      className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-slate-500"
                   />
                </div>
                <div className="col-span-2">
                   <label className="block text-sm font-medium text-slate-700 mb-1">Opis roli</label>
                   <textarea 
                      value={editingRole.description}
                      onChange={e => setEditingRole({...editingRole, description: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none h-20"
                      placeholder="Krótki opis przeznaczenia..."
                   />
                </div>
              </div>

              <h4 className="font-semibold text-slate-800 border-b border-slate-200 pb-2 mb-4">Uprawnienia</h4>
              
              <div className="space-y-6">
                {Object.entries(groupedPermissions).map(([group, perms]) => (
                  <div key={group}>
                    <h5 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">{group}</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {perms.map(perm => (
                        <label key={perm.id} className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition">
                           <input 
                              type="checkbox" 
                              checked={editingRole.permissions.includes(perm.id) || editingRole.permissions.includes('*')}
                              disabled={editingRole.permissions.includes('*') && perm.id !== '*'}
                              onChange={() => handleTogglePermission(perm.id)}
                              className="mt-1 flex-shrink-0 text-indigo-600 rounded bg-slate-100 border-slate-300 focus:ring-indigo-500"
                           />
                           <div>
                              <div className="text-sm font-medium text-slate-800">{perm.name}</div>
                              <div className="text-xs text-slate-500 font-mono mt-0.5">{perm.id}</div>
                           </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
              <button 
                onClick={() => setEditingRole(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg font-medium transition"
              >
                Anuluj
              </button>
              <button 
                onClick={handleSave}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center gap-2 transition"
              >
                <Save size={18} />
                Zatwierdź Role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
