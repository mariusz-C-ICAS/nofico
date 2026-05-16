import React, { useState, useEffect } from 'react';
import { Shield, Layers, User, Briefcase, Plus, Trash2, Edit2, ChevronRight, ChevronDown, CheckCircle2, AlertCircle } from 'lucide-react';
import { db } from '../../shared/lib/firebase';
import { collection, addDoc, updateDoc, doc, deleteDoc, onSnapshot, query, where, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../shared/hooks/AuthContext';
import { handleFirestoreError, OperationType } from '../../shared/lib/firestoreUtils';

type PathType = 'O-S-P' | 'O-O' | 'S-P' | 'O-P';
type AccessLevel = 'READ' | 'WRITE' | 'DELETE' | 'ADMIN';

interface StructuralPermission {
  id: string;
  tenantId: string;
  userId?: string;
  roleId?: string;
  startNodeId: string;
  pathType: PathType;
  depth: number;
  accessLevel: AccessLevel;
  objectTypes: string[];
  fieldRestrictions?: Record<string, string[]>;
}

export const StructuralPermissionsModule: React.FC = () => {
  const { activeTenantId } = useAuth();
  const [permissions, setPermissions] = useState<StructuralPermission[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPerm, setEditingPerm] = useState<Partial<StructuralPermission> | null>(null);

  useEffect(() => {
    if (!activeTenantId) return;

    const unsubPerms = onSnapshot(query(collection(db, 'structural_permissions'), where('tenantId', '==', activeTenantId)), (snap) => {
      setPermissions(snap.docs.map(d => ({ id: d.id, ...d.data() } as StructuralPermission)));
    });

    const unsubDepts = onSnapshot(query(collection(db, 'hr_departments'), where('tenantId', '==', activeTenantId)), (snap) => {
      setDepartments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubUsers = onSnapshot(query(collection(db, 'tenant_memberships'), where('tenantId', '==', activeTenantId)), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubPerms(); unsubDepts(); unsubUsers(); };
  }, [activeTenantId]);

  const [users, setUsers] = useState<any[]>([]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenantId || !editingPerm?.startNodeId || !editingPerm?.pathType || !editingPerm?.accessLevel) return;

    try {
      if (editingPerm.id) {
        await updateDoc(doc(db, 'structural_permissions', editingPerm.id), {
          ...editingPerm,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'structural_permissions'), {
          ...editingPerm,
          tenantId: activeTenantId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      setEditingPerm(null);
    } catch (err) {
      handleFirestoreError(err, editingPerm.id ? OperationType.UPDATE : OperationType.CREATE, 'structural_permissions');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Czy na pewno chcesz usunąć to uprawnienie strukturalne?')) return;
    try {
      await deleteDoc(doc(db, 'structural_permissions', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'structural_permissions');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="pl-4 border-l-4 border-indigo-600">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Shield className="text-indigo-600" /> Uprawnienia Strukturalne
          </h1>
          <p className="text-slate-500 text-sm font-medium">Zarządzanie ścieżkami ewaluacyjnymi SAP-like w module OM</p>
        </div>
        <button 
          onClick={() => {
            setEditingPerm({
              pathType: 'O-S-P',
              accessLevel: 'READ',
              depth: -1,
              objectTypes: ['UNIT', 'ROLE', 'EMPLOYEE']
            });
            setIsModalOpen(true);
          }}
          className="bg-indigo-600 text-white px-6 py-2.5 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-2 hover:bg-slate-900 transition-all shadow-lg shadow-indigo-200"
        >
          <Plus size={16} /> Nowa Ścieżka
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {permissions.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 p-12 rounded-3xl text-center">
            <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <Shield size={32} />
            </div>
            <h3 className="text-slate-800 font-black text-lg mb-2">Brak zdefiniowanych uprawnień</h3>
            <p className="text-slate-500 text-sm max-w-sm mx-auto font-medium">Uprawnienia strukturalne pozwalają na dynamiczne przydzielanie dostępu do gałęzi drzewa organizacyjnego na podstawie ról lub konkretnych użytkowników.</p>
          </div>
        ) : (
          permissions.map(perm => {
            const dept = departments.find(d => d.id === perm.startNodeId);
            const userMatch = users.find(u => u.userId === perm.userId);
            
            return (
              <div key={perm.id} className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-md transition-shadow group">
                <div className="flex items-center gap-4 flex-1">
                  <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    {perm.accessLevel === 'ADMIN' ? <Shield size={24} /> : <div className="text-xs font-black">{perm.accessLevel}</div>}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 px-2 py-0.5 rounded">Ścieżka: {perm.pathType}</span>
                      <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded">Głębokość: {perm.depth === -1 ? '∞' : perm.depth}</span>
                    </div>
                    <h3 className="text-sm font-black text-slate-800">
                      Dostęp dla: <span className="text-indigo-600">{userMatch?.email || perm.roleId || 'Pusty User/Rola'}</span>
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">Od jednostki: <span className="text-slate-800 font-bold">{dept?.name || 'Nieznana'}</span></p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 flex-1 justify-center">
                  {perm.objectTypes.map(obj => (
                    <span key={obj} className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[9px] font-black text-slate-600 uppercase tracking-widest">{obj}</span>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { setEditingPerm(perm); setIsModalOpen(true); }}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-all"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(perm.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded-xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-white rounded-[40px] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
            <div className="bg-indigo-600 p-8 flex items-center gap-4 text-white">
              <div className="bg-white/20 p-4 rounded-3xl"><Shield size={32} /></div>
              <div>
                <h2 className="text-2xl font-black">{editingPerm?.id ? 'Edytuj Ścieżkę' : 'Definiowanie Ścieżki Ewaluacyjnej'}</h2>
                <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest">Advanced Structural Permissions (m-SAP)</p>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pracownik (Wybór użytkownika)</label>
                  <select 
                    value={editingPerm?.userId || ''} 
                    onChange={e => setEditingPerm(prev => ({ ...prev!, userId: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all"
                  >
                    <option value="">-- Wybierz Użytkownika Systemu --</option>
                    {users.map(u => <option key={u.id} value={u.userId}>{u.email} ({u.roleId})</option>)}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Punkt startowy struktury (Jednostka)</label>
                  <select 
                    value={editingPerm?.startNodeId || ''} 
                    onChange={e => setEditingPerm(prev => ({ ...prev!, startNodeId: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all"
                  >
                    <option value="">-- Wybierz Jednostkę --</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
                  </select>
                </div>

                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Typ Ścieżki (S-Path)</label>
                   <select 
                    value={editingPerm?.pathType} 
                    onChange={e => setEditingPerm(prev => ({ ...prev!, pathType: e.target.value as PathType }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all"
                  >
                    <option value="O-S-P">O-S-P (Org-Slot-Person)</option>
                    <option value="O-O">O-O (Org i Podlegle)</option>
                    <option value="S-P">S-P (Slot i Osoba)</option>
                    <option value="O-P">O-P (Org i Osoba)</option>
                  </select>
                </div>

                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Głębokość (Depth)</label>
                   <input 
                    type="number" 
                    value={editingPerm?.depth} 
                    onChange={e => setEditingPerm(prev => ({ ...prev!, depth: parseInt(e.target.value) }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all"
                    placeholder="-1 dla nieskończoności"
                  />
                  <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">0 = tylko node, -1 = cała gałąź</p>
                </div>

                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Poziom Dostępu</label>
                   <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                      {['READ', 'WRITE', 'DELETE', 'ADMIN'].map(lvl => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setEditingPerm(prev => ({ ...prev!, accessLevel: lvl as AccessLevel }))}
                          className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${editingPerm?.accessLevel === lvl ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:bg-slate-200/50'}`}
                        >
                          {lvl}
                        </button>
                      ))}
                   </div>
                </div>

                <div className="col-span-2">
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Widoczne Obiekty</label>
                   <div className="flex flex-wrap gap-2">
                      {['UNIT', 'ROLE', 'EMPLOYEE', 'PROJECT', 'DOCUMENT', 'FINANCE', 'CLIENT'].map(obj => (
                        <label key={obj} className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${editingPerm?.objectTypes?.includes(obj) ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'}`}>
                          <input 
                            type="checkbox" 
                            hidden 
                            checked={editingPerm?.objectTypes?.includes(obj)} 
                            onChange={e => {
                              const types = [...(editingPerm?.objectTypes || [])];
                              if (e.target.checked) types.push(obj);
                              else types.splice(types.indexOf(obj), 1);
                              setEditingPerm(prev => ({ ...prev!, objectTypes: types }));
                            }}
                          />
                          {editingPerm?.objectTypes?.includes(obj) && <CheckCircle2 size={12} />}
                          {obj}
                        </label>
                      ))}
                   </div>
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="px-8 py-4 rounded-3xl text-sm font-black text-slate-500 uppercase tracking-widest hover:bg-slate-200 transition-all font-mono"
              >
                Anuluj
              </button>
              <button 
                type="submit"
                className="px-10 py-4 bg-indigo-600 text-white rounded-3xl text-sm font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-indigo-100 font-mono"
              >
                Zapisz Uprawnienie
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default StructuralPermissionsModule;
