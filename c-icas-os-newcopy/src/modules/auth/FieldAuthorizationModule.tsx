import React, { useState, useEffect } from 'react';
import { Shield, Lock, Eye, EyeOff, Layout, Database, Plus, Trash2, Edit2, CheckCircle2, AlertCircle, Search } from 'lucide-react';
import { db } from '../../shared/lib/firebase';
import { collection, addDoc, updateDoc, doc, deleteDoc, onSnapshot, query, where, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../shared/hooks/AuthContext';
import { handleFirestoreError, OperationType } from '../../shared/lib/firestoreUtils';

interface FieldPermission {
  id: string;
  tenantId: string;
  roleId: string;
  moduleName: string; // e.g., 'PAYROLL'
  fieldName: string; // e.g., 'salary'
  accessType: 'HIDDEN' | 'READ_ONLY' | 'EDIT';
  restrictionType: 'FIELD' | 'UI_ELEMENT';
}

export const FieldAuthorizationModule: React.FC = () => {
  const { activeTenantId } = useAuth();
  const [permissions, setPermissions] = useState<FieldPermission[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPerm, setEditingPerm] = useState<Partial<FieldPermission> | null>(null);

  const modules = [
    { id: 'HR_PA', name: 'Infotyp: Dane Podstawowe (PA)', fields: ['firstName', 'lastName', 'birthDate', 'pesel', 'gender', 'nationality'] },
    { id: 'HR_ADDRESS', name: 'Infotyp: Adresy', fields: ['street', 'city', 'zipCode', 'country', 'phone', 'email'] },
    { id: 'HR_PAYROLL', name: 'Infotyp: Składniki Płacowe', fields: ['baseSalary', 'bonus', 'bankAccount', 'taxID', 'insuranceCode'] },
    { id: 'HR_CONTRACT', name: 'Infotyp: Umowy i Warunki', fields: ['contractType', 'position', 'grade', 'fte', 'startDate', 'endDate'] },
    { id: 'HR_EDUCATION', name: 'Infotyp: Wykształcenie', fields: ['schoolName', 'diploma', 'year', 'skillLevel'] },
    { id: 'CRM', name: 'Zarządzanie Relacjami (CRM)', fields: ['dealValue', 'leadScore', 'contactSecretNote'] },
    { id: 'FINANCE', name: 'Moduł Finansowy', fields: ['revenue', 'budget', 'costCenter', 'bankTransferDetails'] }
  ];

  useEffect(() => {
    if (!activeTenantId) return;

    const unsub = onSnapshot(query(collection(db, 'field_permissions'), where('tenantId', '==', activeTenantId)), (snap) => {
      setPermissions(snap.docs.map(d => ({ id: d.id, ...d.data() } as FieldPermission)));
    });

    return () => unsub();
  }, [activeTenantId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenantId || !editingPerm?.roleId || !editingPerm?.fieldName || !editingPerm?.moduleName) return;

    try {
      if (editingPerm.id) {
        await updateDoc(doc(db, 'field_permissions', editingPerm.id), {
          ...editingPerm,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'field_permissions'), {
          ...editingPerm,
          tenantId: activeTenantId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      setEditingPerm(null);
    } catch (err) {
      handleFirestoreError(err, editingPerm.id ? OperationType.UPDATE : OperationType.CREATE, 'field_permissions');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Usunąć to ograniczenie pola?')) return;
    try {
      await deleteDoc(doc(db, 'field_permissions', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'field_permissions');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="pl-4 border-l-4 border-rose-600">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Lock className="text-rose-600" /> Autoryzacja na Poziomie Pola
          </h1>
          <p className="text-slate-500 text-sm font-medium">Zarządzanie widocznością i edycją konkretnych pól w modułach</p>
        </div>
        <button 
          onClick={() => {
            setEditingPerm({
              moduleName: 'PAYROLL',
              accessType: 'HIDDEN',
              restrictionType: 'FIELD'
            });
            setIsModalOpen(true);
          }}
          className="bg-rose-600 text-white px-6 py-2.5 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-2 hover:bg-slate-900 transition-all shadow-lg shadow-rose-200"
        >
          <Plus size={16} /> Dodaj Restrykcję
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <th className="px-6 py-4">Rola / Grupa</th>
              <th className="px-6 py-4">Moduł</th>
              <th className="px-6 py-4">Pole / Element UI</th>
              <th className="px-6 py-4 text-center">Akcja (Access)</th>
              <th className="px-6 py-4 text-right">Zarządzaj</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {permissions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold italic">Brak zdefiniowanych restrykcji pól.</td>
              </tr>
            ) : (
              permissions.map(perm => (
                <tr key={perm.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 font-black text-slate-700">{perm.roleId}</td>
                  <td className="px-6 py-4 font-bold text-slate-500 text-xs">{perm.moduleName}</td>
                  <td className="px-6 py-4">
                    <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest border border-indigo-100">{perm.fieldName}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      perm.accessType === 'HIDDEN' ? 'bg-rose-100 text-rose-700' : 
                      perm.accessType === 'READ_ONLY' ? 'bg-amber-100 text-amber-700' : 
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {perm.accessType === 'HIDDEN' ? <EyeOff size={10} className="inline mr-1" /> : <Eye size={10} className="inline mr-1" />}
                      {perm.accessType}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                       <button onClick={() => { setEditingPerm(perm); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg"><Edit2 size={16} /></button>
                       <button onClick={() => handleDelete(perm.id)} className="p-2 text-slate-400 hover:text-rose-600 rounded-lg"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-rose-600 p-8 flex items-center gap-4 text-white">
              <div className="bg-white/20 p-4 rounded-3xl"><Shield size={32} /></div>
              <div>
                <h2 className="text-2xl font-black">{editingPerm?.id ? 'Edytuj Restrykcję' : 'Nowa Restrykcję Pola'}</h2>
                <p className="text-rose-100 text-xs font-bold uppercase tracking-widest tracking-tight">System Autoryzacji Granularnej</p>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                 <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Techniczna Rola Użytkownika</label>
                    <input 
                      required 
                      type="text" 
                      value={editingPerm?.roleId || ''} 
                      onChange={e => setEditingPerm(prev => ({...prev!, roleId: e.target.value}))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 outline-none focus:border-rose-500 transition-all"
                      placeholder="np. manager, recruiter, accountant"
                    />
                 </div>

                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Moduł Systemowy</label>
                    <select 
                      value={editingPerm?.moduleName} 
                      onChange={e => setEditingPerm(prev => ({...prev!, moduleName: e.target.value, fieldName: ''}))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 outline-none focus:border-rose-500 transition-all"
                    >
                       {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                 </div>

                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pole (DB Field)</label>
                    <select 
                      value={editingPerm?.fieldName} 
                      onChange={e => setEditingPerm(prev => ({...prev!, fieldName: e.target.value}))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 outline-none focus:border-rose-500 transition-all"
                    >
                       <option value="">-- Wybierz Pole --</option>
                       {modules.find(m => m.id === editingPerm?.moduleName)?.fields.map(f => <option key={f} value={f}>{f}</option>)}
                       <option value="CUSTOM">Inne / Custom...</option>
                    </select>
                 </div>

                 <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tryb dostępu</label>
                    <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                       {['HIDDEN', 'READ_ONLY', 'EDIT'].map(type => (
                         <button
                           key={type}
                           type="button"
                           onClick={() => setEditingPerm(prev => ({...prev!, accessType: type as any}))}
                           className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${editingPerm?.accessType === type ? 'bg-white shadow-sm text-rose-600' : 'text-slate-500 hover:bg-slate-200/50'}`}
                         >
                           {type}
                         </button>
                       ))}
                    </div>
                 </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-4 rounded-3xl text-sm font-black text-slate-500 uppercase tracking-widest">Anuluj</button>
              <button type="submit" className="px-10 py-4 bg-slate-900 text-white rounded-3xl text-sm font-black uppercase tracking-widest hover:bg-rose-600 transition-all shadow-xl">Zapisz Konfigurację</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default FieldAuthorizationModule;
