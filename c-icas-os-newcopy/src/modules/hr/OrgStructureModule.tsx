import React, { useState, useEffect, useMemo } from 'react';
import { Network, Users, ChevronRight, ChevronDown, Building2, UserCircle, Search, Edit2, Plus, Briefcase, Filter, ArrowRight, CornerDownRight, Flag, ShieldCheck, Mail, Target, Award, Trash2, Download } from 'lucide-react';
import { db } from '../../shared/lib/firebase';
import { collection, addDoc, updateDoc, doc, deleteDoc, onSnapshot, query, where, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../shared/hooks/AuthContext';
import { handleFirestoreError, OperationType } from '../../shared/lib/firestoreUtils';

type ViewMode = 'tree' | 'list';

export default function OrgStructureModule() {
  const { activeTenantId, userData } = useAuth();
  
  // Data
  const [departments, setDepartments] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const hasOmLicense = userData?.subscriptionTier === 'PRO' || userData?.subscriptionTier === 'ENTERPRISE' || userData?.role === 'owner';


  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [showCodes, setShowCodes] = useState(true);

  // Multi-Modals
  const [unitModal, setUnitModal] = useState<{isOpen: boolean, data: any, initialData: any}>({isOpen: false, data: null, initialData: null});
  const [roleModal, setRoleModal] = useState<{isOpen: boolean, unitId: string, data: any, initialData: any}>({isOpen: false, unitId: '', data: null, initialData: null});
  const [empAssignModal, setEmpAssignModal] = useState<{isOpen: boolean, roleId: string | null}>({isOpen: false, roleId: null});

  useEffect(() => {
    if (!activeTenantId) return;

    const unsubDepts = onSnapshot(query(collection(db, 'hr_departments'), where('tenantId', '==', activeTenantId)), (snap) => {
      setDepartments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'hr_departments'));

    const unsubRoles = onSnapshot(query(collection(db, 'hr_roles'), where('tenantId', '==', activeTenantId)), (snap) => {
      setRoles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'hr_roles'));

    const unsubEmps = onSnapshot(query(collection(db, 'employees'), where('tenantId', '==', activeTenantId)), (snap) => {
      setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'employees'));

    return () => { unsubDepts(); unsubRoles(); unsubEmps(); }
  }, [activeTenantId]);

  // Derived state
  const topLevelUnits = useMemo(() => {
    const rootNodes = departments.filter(d => !d.parentId);
    if (searchTerm) {
       // If searching, we flatten search logic
       const term = searchTerm.toLowerCase();
       return departments.filter(d => d.name.toLowerCase().includes(term) || d.code?.toLowerCase().includes(term));
    }
    return rootNodes;
  }, [departments, searchTerm]);

  const selectedUnit = useMemo(() => departments.find(d => d.id === selectedUnitId) || null, [departments, selectedUnitId]);
  const unitRoles = useMemo(() => roles.filter(r => r.departmentId === selectedUnitId), [roles, selectedUnitId]);
  
  // Find employees whose roles are tied to the selected unit
  // or explicitly defined by department string
  const unitEmployees = useMemo(() => {
    if (!selectedUnit) return [];
    // OM maps via Roles or department name string.
    const validRoleNames = unitRoles.map(r => r.name);
    return employees.filter(e => e.department === selectedUnit.name || validRoleNames.includes(e.role));
  }, [employees, selectedUnit, unitRoles]);

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenantId || !unitModal.data?.name) return;
    const { id, ...data } = unitModal.data;
    try {
      if (id) {
        await updateDoc(doc(db, 'hr_departments', id), { ...data, updatedAt: serverTimestamp() });
      } else {
        await addDoc(collection(db, 'hr_departments'), { ...data, tenantId: activeTenantId, createdAt: serverTimestamp() });
      }
      setUnitModal({isOpen: false, data: null, initialData: null});
    } catch (err) { handleFirestoreError(err, id ? OperationType.UPDATE : OperationType.CREATE, 'hr_departments'); }
  };

  const handleDeleteUnit = async (id: string) => {
    if (!window.confirm("UWAGA! Usunięcie działu spowoduje również konieczność rekonfiguracji przypisanych stanowisk i pracowników. Usunąć?")) return;
    try {
      await deleteDoc(doc(db, 'hr_departments', id));
      if (selectedUnitId === id) setSelectedUnitId(null);
    } catch (err) { handleFirestoreError(err, OperationType.DELETE, 'hr_departments'); }
  }

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenantId || !roleModal.data?.name || !roleModal.unitId) return;
    const { id, ...data } = roleModal.data;
    try {
      if (id) {
        await updateDoc(doc(db, 'hr_roles', id), { ...data, departmentId: roleModal.unitId, updatedAt: serverTimestamp() });
      } else {
        await addDoc(collection(db, 'hr_roles'), { ...data, departmentId: roleModal.unitId, tenantId: activeTenantId, createdAt: serverTimestamp() });
      }
      setRoleModal({isOpen: false, unitId: '', data: null, initialData: null});
    } catch (err) { handleFirestoreError(err, id ? OperationType.UPDATE : OperationType.CREATE, 'hr_roles'); }
  };

  const toggleUnitManager = async (roleId: string, currentVal: boolean) => {
    try { await updateDoc(doc(db, 'hr_roles', roleId), { isManager: !currentVal, updatedAt: serverTimestamp() }); }
    catch (err) { handleFirestoreError(err, OperationType.UPDATE, 'hr_roles'); }
  };

  const handleMoveUnit = async (sourceId: string, targetParentId: string | null) => {
    if (!activeTenantId || sourceId === targetParentId) return;
    // Prevent cyclic drops later, but for now simple update:
    try {
      await updateDoc(doc(db, 'hr_departments', sourceId), { parentId: targetParentId || '', updatedAt: serverTimestamp() });
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, 'hr_departments'); }
  };

  if (loading) return <div className="p-12 text-center text-slate-500 font-bold animate-pulse">Ładowanie Struktur Organizacyjnych (OM)...</div>;

  return (
    <div className="flex flex-col h-full bg-slate-50 max-w-[1600px] mx-auto animate-in fade-in duration-500 p-2 md:p-6 pb-20">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 relative overflow-hidden mb-6 flex-shrink-0">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
           <Network size={120} />
        </div>
        <div className="relative z-10 pl-2 border-l-4 border-blue-600">
          <div className="flex items-center gap-2 mb-1">
             <h2 className="text-2xl font-black text-slate-800 tracking-tight">Organizational Management</h2>
             {hasOmLicense ? (
               <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-widest border border-emerald-200">Licencja Aktywna</span>
             ) : (
               <span className="bg-rose-100 text-rose-800 text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-widest border border-rose-200 flex items-center gap-1"><ShieldCheck size={10} /> Wersja Demo</span>
             )}
          </div>
          <p className="text-sm text-slate-500 font-medium mt-1">Struktura Jednostek (Organizational Units), Stanowisk (Positions) i Osób (Persons)</p>
        </div>
        
        <div className="flex md:flex-row flex-col gap-3 relative z-10 lg:ml-auto w-full lg:w-auto">
           <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto w-full lg:w-auto md:w-max shrink-0">
              <div className="flex items-center gap-2 px-4 py-2 border-r border-slate-200">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Firma (Jednostek)</span>
                 <span className="text-sm font-black text-slate-800">{departments.length}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 border-r border-slate-200">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stanowisk (FTE)</span>
                 <span className="text-sm font-black text-blue-600">{roles.length}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Wakatów</span>
                 <span className="text-sm font-black text-rose-500">{roles.filter(r => !employees.some(e => e.role === r.name)).length}</span>
              </div>
           </div>
           
           <button onClick={() => setShowCodes(!showCodes)} className={`flex items-center justify-center gap-2 transition-colors px-4 py-3 rounded-xl shadow-sm text-[10px] font-black uppercase tracking-widest shrink-0 border ${showCodes ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
              <Search size={16} /> {showCodes ? 'Ukryj Numery' : 'Pokaż Numery/ID'}
           </button>
           <button onClick={() => alert("Generowanie raportu struktury do PDF...")} className="flex items-center justify-center gap-2 bg-slate-900 text-white hover:bg-blue-600 transition-colors px-4 py-3 rounded-xl shadow-md text-xs font-bold uppercase tracking-widest shrink-0">
              <Download size={16} /> Raport M-OM
           </button>
        </div>
      </div>

      {/* Main Workspace - 2 Columns (Sidebar + Details) */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-[600px] h-[calc(100vh-200px)]">
         
         {/* Left Sidebar: Tree / Search */}
         <div className="w-full lg:w-1/3 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex-shrink-0 lg:max-w-md">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col gap-3">
               <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><Building2 size={16} className="text-blue-500" /> Drzewo Jednostek</h3>
                  <button onClick={() => {
                     const defaultUnit = { name: '', parentId: '', visibility: 'INTRANET', type: 'Dział', validFrom: new Date().toISOString().split('T')[0], validTo: '9999-12-31' };
                     setUnitModal({isOpen: true, data: defaultUnit, initialData: defaultUnit });
                  }} className="text-[10px] font-black text-white bg-slate-900 px-3 py-1.5 rounded-lg hover:bg-blue-600 transition-colors uppercase cursor-pointer z-10">
                     + Jednostka
                  </button>
               </div>
               <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Szukaj jednostki (Nazwa, Kod)..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors shadow-inner" />
               </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar lg:h-full h-[40vh]">
               {topLevelUnits.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 font-bold p-8">Brak jednostek organizacyjnych. Dodaj nowy element root.</p>
               ) : (
                  <div className="space-y-1 pb-4">
                     {topLevelUnits.map(unit => (
                        <UnitTreeNode key={unit.id} unit={unit} allDepts={departments} selectedId={selectedUnitId} onSelect={setSelectedUnitId} depth={0} isSearchActive={!!searchTerm} showCodes={showCodes} onMove={handleMoveUnit} />
                     ))}
                     {/* Droppable root area */}
                     <div 
                        className="py-4 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-[10px] font-black uppercase tracking-widest mt-4"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                           const sourceId = e.dataTransfer.getData('unitId');
                           if (sourceId) handleMoveUnit(sourceId, null);
                        }}
                     >
                        Upuść tutaj, aby przenieść na poziom najwyższy (Root)
                     </div>
                  </div>
               )}
            </div>
         </div>

         {/* Right Detail Pane */}
         <div className="w-full lg:flex-1 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden lg:h-full min-h-[500px]">
            {!selectedUnit ? (
               <div className="h-full flex flex-col items-center justify-center text-center p-12 relative overflow-hidden">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-[3] opacity-5 pointer-events-none"><Network /></div>
                  <div className="bg-blue-50 p-6 rounded-full text-blue-500 mb-6 border-8 border-white ring-1 ring-slate-100 z-10"><Target size={48} /></div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight z-10">Zarządzanie Organizacją (OM)</h3>
                  <p className="text-sm text-slate-500 font-medium max-w-sm mt-3 z-10">Wybierz jednostkę organizacyjną z drzewa po lewej stronie, aby zarządzać jej detalami, stanowiskami (Positions) oraz pracownikami (Persons).</p>
               </div>
            ) : (
               <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300 relative">
                  
                  {/* Unit Header */}
                  <div className="bg-slate-900 p-6 md:p-8 flex flex-col gap-4 text-white shrink-0 shadow-lg z-20">
                     <div className="flex justify-between items-start">
                        <div>
                           <div className="flex items-center gap-2 mb-2">
                              <span className="bg-blue-600 font-black px-2 py-0.5 rounded text-[10px] uppercase tracking-widest">{selectedUnit.type || 'Dział'}</span>
                              {showCodes && <span className="bg-white/20 font-black px-2 py-0.5 rounded text-[10px] uppercase tracking-widest">{selectedUnit.code || 'Brak Kodu'}</span>}
                              <span className="bg-slate-800 font-black px-2 py-0.5 rounded text-[10px] uppercase tracking-widest shadow-inner">{selectedUnit.visibility || 'INTRANET'}</span>
                           </div>
                           <h3 className="text-2xl md:text-3xl font-black tracking-tighter">{selectedUnit.name}</h3>
                           <div className="flex flex-wrap gap-4 mt-2">
                              <p className="text-sm text-slate-400 font-medium">MPK: <strong className="text-slate-200">{selectedUnit.costCenter || 'Brak'}</strong></p>
                              {selectedUnit.companyId && <p className="text-sm text-slate-400 font-medium">Firma: <strong className="text-slate-200">{selectedUnit.companyId}</strong></p>}
                              {selectedUnit.businessUnit && <p className="text-sm text-slate-400 font-medium">BU: <strong className="text-slate-200">{selectedUnit.businessUnit}</strong></p>}
                           </div>
                        </div>
                        <button onClick={() => setUnitModal({isOpen: true, data: selectedUnit, initialData: selectedUnit})} className="bg-white/10 hover:bg-white/20 p-2.5 rounded-xl transition-colors cursor-pointer" title="Edytuj Jednostkę"><Edit2 size={18} /></button>
                     </div>
                  </div>

                  {/* Detale i Stanowiska */}
                  <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 relative custom-scrollbar">
                     
                     <div className="mb-8 relative z-10">
                        <div className="flex justify-between items-center mb-4">
                           <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><Briefcase size={16} className="text-amber-500" /> Stanowiska w Jednostce (Positions)</h4>
                           <button onClick={() => {
                              const defaultRole = {name: '', isManager: false, validFrom: new Date().toISOString().split('T')[0], validTo: '9999-12-31', parentId: ''};
                              setRoleModal({isOpen: true, unitId: selectedUnit.id, data: defaultRole, initialData: defaultRole });
                           }} className="text-[10px] font-black text-white bg-blue-600 px-3 py-1.5 rounded-lg uppercase hover:bg-blue-700 transition-colors shadow-md cursor-pointer">
                              + Nowe Stanowisko
                           </button>
                        </div>
                        {unitRoles.length === 0 ? (
                           <div className="bg-white border text-center border-slate-200 p-8 rounded-2xl flex flex-col items-center shadow-sm">
                              <ShieldCheck size={32} className="text-slate-300 mb-2" />
                              <p className="text-xs font-bold text-slate-500">Brak zdefiniowanych stanowisk w tej jednostce.</p>
                           </div>
                        ) : (
                           <div className="flex flex-col gap-2">
                              {unitRoles.filter(r => !r.parentId).sort((a,b) => (b.isManager === a.isManager) ? 0 : b.isManager ? 1 : -1).map(role => (
                                 <RoleTreeNode key={role.id} role={role} allRoles={unitRoles} depth={0} onEdit={(r: any) => setRoleModal({isOpen: true, unitId: selectedUnit.id, data: r, initialData: r})} onDelete={async (id: string) => { if(window.confirm('Usunąć stanowisko?')) { await deleteDoc(doc(db, 'hr_roles', id)); } }} onToggleManager={toggleUnitManager} employees={employees} showCodes={showCodes} onAssignEmployee={(role: any) => setEmpAssignModal({isOpen: true, roleId: role.id})} />
                              ))}
                           </div>
                        )}
                     </div>

                     <div className="mb-4 relative z-10">
                        <div className="flex justify-between items-center mb-4">
                           <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><Users size={16} className="text-emerald-500" /> Profil Osobowy (Persons)</h4>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                           {unitEmployees.length === 0 ? (
                              <p className="text-xs font-bold text-slate-500 p-6 text-center italic">Brak przypisanych pracowników. Pracownicy przypisywani są poprzez ustawienie odpowiedniego stanowiska (Roli) i Działu w Profilu Pracownika.</p>
                           ) : (
                              <div className="overflow-x-auto">
                                 <table className="w-full text-left min-w-[500px]">
                                    <thead className="bg-slate-50">
                                       <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                          <th className="px-4 py-3 border-b border-slate-100">Imię i Nazwisko</th>
                                          <th className="px-4 py-3 border-b border-slate-100">Stanowisko (Role)</th>
                                          <th className="px-4 py-3 border-b border-slate-100 text-right">Status</th>
                                       </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                       {unitEmployees.map(e => {
                                          const today = new Date().toISOString().split('T')[0];
                                          const isEmpHistorical = e.roleValidTo && e.roleValidTo < today;
                                          const isEmpPlanned = e.roleValidFrom && e.roleValidFrom > today;

                                          return (
                                          <tr key={e.id} className={`hover:bg-slate-50 transition-colors ${isEmpHistorical ? 'opacity-60 grayscale' : ''}`}>
                                             <td className="px-4 py-3 font-bold text-slate-800 text-xs flex items-center gap-2">
                                                <div className="bg-slate-100 p-1 rounded-full"><UserCircle size={16} className="text-slate-500" /></div>
                                                <div className="flex flex-col">
                                                   <div className="flex items-center gap-2">
                                                      <span>{e.firstName} {e.lastName}</span>
                                                      {e.employeeType === 'K' && <span className="bg-purple-100 text-purple-700 text-[8px] px-1.5 py-0.5 rounded uppercase tracking-widest">Kandydat</span>}
                                                      {e.employeeType === 'Z' && <span className="bg-amber-100 text-amber-700 text-[8px] px-1.5 py-0.5 rounded uppercase tracking-widest">B2B / Zewn.</span>}
                                                   </div>
                                                   {(e.roleValidFrom || e.roleValidTo) && (
                                                      <span className="text-[9px] text-slate-400 font-bold mt-0.5">
                                                         {isEmpHistorical ? 'Był na stanowisku:' : isEmpPlanned ? 'Planowany od:' : 'Ważne:'} {e.roleValidFrom || '...'} do {e.roleValidTo || '...'}
                                                      </span>
                                                   )}
                                                </div>
                                             </td>
                                             <td className="px-4 py-3 font-bold text-slate-500 text-[11px]">{e.role || 'Nieokreślone'}</td>
                                             <td className="px-4 py-3 text-right">
                                                <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${e.status === 'ACTIVE' && !isEmpHistorical && !isEmpPlanned ? 'bg-emerald-100 text-emerald-700' : isEmpHistorical ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                                                   {isEmpHistorical ? 'Zakończone' : isEmpPlanned ? 'Planowany' : e.status || 'ACTIVE'}
                                                </span>
                                             </td>
                                          </tr>
                                       )})}
                                    </tbody>
                                 </table>
                              </div>
                           )}
                        </div>
                     </div>

                  </div>
               </div>
            )}
         </div>
      </div>

      {/* MODALS */}
      
      {/* Unit Modal */}
      {unitModal.isOpen && (
         <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[99]">
            <form onSubmit={handleSaveUnit} className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
               <div className="bg-slate-900 p-6 flex items-center gap-4 text-white">
                  <div className="bg-white/10 p-3 rounded-2xl"><Building2 size={24} /></div>
                  <div>
                     <h2 className="text-xl font-black">{unitModal.data?.id ? 'Edytuj Jednostkę' : 'Nowa Jednostka Organizacyjna'}</h2>
                     <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Węzeł Drzewa OM</p>
                  </div>
               </div>
               <div className="p-6 space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                     <div className="col-span-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pach (Manager Węzła Nadrzędnego)</label>
                        <select value={unitModal.data?.parentId || ''} onChange={e => setUnitModal(prev => ({...prev, data: {...prev.data, parentId: e.target.value}}))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500">
                           <option value="">-- JEDNOSTKA ROOT (Główna) --</option>
                           {departments.filter(d => d.id !== unitModal.data?.id).map(d => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                           ))}
                        </select>
                     </div>
                     <div className="col-span-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pełna Nazwa Jednostki *</label>
                        <input required type="text" value={unitModal.data?.name || ''} onChange={e => setUnitModal(prev => ({...prev, data: {...prev.data, name: e.target.value}}))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500" placeholder="np. Oddział Warszawa / Zespół Płynności..." />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Typ Jednostki</label>
                        <select value={unitModal.data?.type || 'Dział'} onChange={e => setUnitModal(prev => ({...prev, data: {...prev.data, type: e.target.value}}))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500">
                           <option value="Firma">Firma (Company)</option>
                           <option value="Pion">Pion (Division)</option>
                           <option value="Departament">Departament</option>
                           <option value="Dział">Dział (Department)</option>
                           <option value="Zespół">Zespół (Team)</option>
                           <option value="Sekcja">Sekcja (Section)</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Krótki Kod</label>
                        <input type="text" value={unitModal.data?.code || ''} onChange={e => setUnitModal(prev => ({...prev, data: {...prev.data, code: e.target.value}}))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 uppercase" placeholder="np. IT-SEC" />
                     </div>
                     <div className="col-span-2 border-t border-slate-100 pt-4 mt-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Domyślne MPK (Miejsce Powstawania Kosztów)</label>
                        <input type="text" value={unitModal.data?.costCenter || ''} onChange={e => setUnitModal(prev => ({...prev, data: {...prev.data, costCenter: e.target.value}}))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500" placeholder="np. MPK-12345" />
                     </div>
                     <div className="col-span-1">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Firma / Spółka (NIP)</label>
                        <div className="flex gap-2">
                           <input type="text" value={unitModal.data?.companyId || ''} onChange={e => setUnitModal(prev => ({...prev, data: {...prev.data, companyId: e.target.value}}))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500" placeholder="np. 1234567890" />
                           <button type="button" onClick={() => {
                              const nip = unitModal.data?.companyId;
                              if(!nip || nip.length < 10) { alert('Proszę podać prawidłowy NIP w polu powyżej.'); return; }
                              // Mock KRS API
                              setUnitModal(prev => ({...prev, data: {...prev.data, name: 'Pobrana Nazwa Spółki z KRS Sp. z o.o.', type: 'Firma'}}));
                           }} className="bg-slate-800 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 shrink-0">Z KRS</button>
                        </div>
                     </div>
                     <div className="col-span-1">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Jednostka Gospodarcza (Business Unit)</label>
                        <input type="text" value={unitModal.data?.businessUnit || ''} onChange={e => setUnitModal(prev => ({...prev, data: {...prev.data, businessUnit: e.target.value}}))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500" placeholder="np. BU-Retail" />
                     </div>
                     <div className="col-span-1 border-t border-slate-100 pt-4 mt-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ważne Od (Valid From)</label>
                        <input type="date" value={unitModal.data?.validFrom || ''} onChange={e => setUnitModal(prev => ({...prev, data: {...prev.data, validFrom: e.target.value}}))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500" />
                     </div>
                     <div className="col-span-1 border-t border-slate-100 pt-4 mt-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ważne Do (Valid To)</label>
                        <input type="date" value={unitModal.data?.validTo || ''} onChange={e => setUnitModal(prev => ({...prev, data: {...prev.data, validTo: e.target.value}}))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500" />
                     </div>
                  </div>
               </div>
               <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                  {unitModal.data?.id ? (
                     <button type="button" onClick={() => handleDeleteUnit(unitModal.data.id)} className="px-4 py-2 text-xs font-bold text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors">Usuń Całkowicie</button>
                  ) : <div />}
                  <div className="flex gap-2">
                     <button type="button" onClick={() => setUnitModal({isOpen: false, data: null, initialData: null})} className="px-6 py-3 rounded-xl text-xs font-black text-slate-500 uppercase tracking-widest hover:bg-slate-200/50 transition-colors">Anuluj</button>
                     <button type="submit" disabled={JSON.stringify(unitModal.data) === JSON.stringify(unitModal.initialData)} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-colors ${JSON.stringify(unitModal.data) !== JSON.stringify(unitModal.initialData) ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>Zapisz Jednostkę</button>
                  </div>
               </div>
            </form>
         </div>
      )}

      {/* Role Modal */}
      {roleModal.isOpen && (
         <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[99]">
            <form onSubmit={handleSaveRole} className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
               <div className="bg-blue-600 p-6 flex flex-col items-center text-center gap-3 text-white">
                  <div className="bg-white/20 p-4 rounded-full"><Award size={32} /></div>
                  <h2 className="text-xl font-black">{roleModal.data?.id ? 'Edytuj Stanowisko' : 'Nowy Profil Stanowiska'}</h2>
               </div>
               <div className="p-6 space-y-4">
                  <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pełna Nazwa Stanowiska (Job Title) *</label>
                     <input required type="text" value={roleModal.data?.name || ''} onChange={e => setRoleModal(prev => ({...prev, data: {...prev.data, name: e.target.value}}))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500" placeholder="np. Starszy Specjalista ds. Sprzedaży" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="col-span-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Stanowisko Nadrzędne (Raportuje do)</label>
                        <select value={roleModal.data?.parentId || ''} onChange={e => setRoleModal(prev => ({...prev, data: {...prev.data, parentId: e.target.value}}))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500">
                           <option value="">-- BRAK (Raportuje do Kierownika Jednostki) --</option>
                           {roles.filter(r => r.departmentId === roleModal.unitId && r.id !== roleModal.data?.id).map(r => (
                              <option key={r.id} value={r.id}>{r.name} {r.code ? `(${r.code})` : ''}</option>
                           ))}
                        </select>
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Maksymalnie FTE</label>
                        <input type="number" min="0" step="0.5" value={roleModal.data?.maxFte || ''} onChange={e => setRoleModal(prev => ({...prev, data: {...prev.data, maxFte: parseFloat(e.target.value) || 0}}))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500" placeholder="np. 1.5, puste = bez limitu" />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Kod Stanowiska</label>
                        <input type="text" value={roleModal.data?.code || ''} onChange={e => setRoleModal(prev => ({...prev, data: {...prev.data, code: e.target.value}}))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 uppercase" placeholder="np. POS-1" />
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                     <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ważne Od (Valid From)</label>
                        <input type="date" value={roleModal.data?.validFrom || ''} onChange={e => setRoleModal(prev => ({...prev, data: {...prev.data, validFrom: e.target.value}}))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500" />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ważne Do (Valid To)</label>
                        <input type="date" value={roleModal.data?.validTo || ''} onChange={e => setRoleModal(prev => ({...prev, data: {...prev.data, validTo: e.target.value}}))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500" />
                     </div>
                  </div>
                  <div className="mt-4">
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Wymagania (Requirements)</label>
                     <textarea rows={3} value={roleModal.data?.requirements || ''} onChange={e => setRoleModal(prev => ({...prev, data: {...prev.data, requirements: e.target.value}}))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:border-blue-500" placeholder="np. Studia wyższe, znajomość języka..." />
                  </div>
                  <div className="mt-4">
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Kwalifikacje (Qualifications)</label>
                     <textarea rows={3} value={roleModal.data?.qualifications || ''} onChange={e => setRoleModal(prev => ({...prev, data: {...prev.data, qualifications: e.target.value}}))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:border-blue-500" placeholder="np. Certyfikat PMP, Prawo jazdy B..." />
                  </div>
                  <label className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer mt-4">
                     <input type="checkbox" checked={roleModal.data?.isManager || false} onChange={e => setRoleModal(prev => ({...prev, data: {...prev.data, isManager: e.target.checked}}))} className="w-5 h-5 rounded border-amber-300 accent-amber-600" />
                     <div className="flex flex-col">
                        <span className="text-xs font-black text-amber-900">Stanowisko Kierownicze</span>
                        <span className="text-[10px] font-bold text-amber-700">Wymagane do obiegu akceptacji (np. Urlopy)</span>
                     </div>
                  </label>
               </div>
               <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                  <button type="button" onClick={() => setRoleModal({isOpen: false, unitId: '', data: null, initialData: null})} className="px-5 py-2.5 rounded-xl text-xs font-black text-slate-500 uppercase tracking-widest hover:bg-slate-200/50 transition-colors">Anuluj</button>
                  <button type="submit" disabled={JSON.stringify(roleModal.data) === JSON.stringify(roleModal.initialData)} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-colors ${JSON.stringify(roleModal.data) !== JSON.stringify(roleModal.initialData) ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>Zapisz Stanowisko</button>
               </div>
            </form>
         </div>
      )}

      {/* Employee Assign Modal */}
      {empAssignModal.isOpen && (
         <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[99]">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
               <div className="bg-emerald-600 p-6 flex flex-col items-center text-center gap-3 text-white">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center shadow-inner">
                     <Users size={24} className="text-white" />
                  </div>
                  <div>
                     <h3 className="font-black text-lg tracking-tight">Przypisz Pracownika</h3>
                     <p className="text-emerald-100 text-xs font-medium">Wybierz pracownika z bazy, aby przypisać go do stanowiska.</p>
                  </div>
               </div>
               <div className="p-6">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Wybierz Pracownika</label>
                  <select onChange={async (e) => {
                     const empId = e.target.value;
                     if (!empId) return;
                     const role = roles.find(r => r.id === empAssignModal.roleId);
                     const dept = departments.find(d => d.id === role?.departmentId);
                     if (!role) return;
                     try {
                        await updateDoc(doc(db, 'employees', empId), {
                           role: role.name,
                           department: dept?.name || '',
                           departmentId: dept?.id || ''
                        });
                        setEmpAssignModal({isOpen: false, roleId: null});
                     } catch (err) {
                        handleFirestoreError(err, OperationType.UPDATE, 'employees');
                     }
                  }} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500">
                     <option value="">-- WYBIERZ --</option>
                     {employees.map(e => (
                        <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.email})</option>
                     ))}
                  </select>
               </div>
               <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                  <button type="button" onClick={() => setEmpAssignModal({isOpen: false, roleId: null})} className="px-5 py-2.5 rounded-xl text-xs font-black text-slate-500 uppercase tracking-widest hover:bg-slate-200/50 transition-colors">Anuluj</button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
}

// Rekurencyjny Node Drzewa (Tree View)
function UnitTreeNode({ unit, allDepts, selectedId, onSelect, depth, isSearchActive, showCodes, onMove }: { unit: any, allDepts: any[], selectedId: string | null, onSelect: (id: string) => void, depth: number, isSearchActive: boolean, showCodes: boolean, onMove: (sourceId: string, targetId: string) => void }) {
   const [expanded, setExpanded] = useState(depth < 1);
   const [isDragOver, setIsDragOver] = useState(false);
   const children = allDepts.filter(d => d.parentId === unit.id);
   const isSelected = selectedId === unit.id;

   // Force expand if searching
   useEffect(() => {
      if (isSearchActive) setExpanded(true);
   }, [isSearchActive]);

   const today = new Date().toISOString().split('T')[0];
   const isHistorical = unit.validTo && unit.validTo < today;
   const isPlanned = unit.validFrom && unit.validFrom > today;
   const isActive = !isHistorical && !isPlanned;

   return (
      <div className="flex flex-col">
         {/* Node Row */}
         <div 
            onClick={() => onSelect(unit.id)}
            draggable
            onDragStart={(e) => {
               e.dataTransfer.setData('unitId', unit.id);
               // Wait for next tick to collapse so the user doesn't drag a collapsed tree if expanded
               setTimeout(() => setExpanded(false), 0);
            }}
            onDragOver={(e) => {
               e.preventDefault();
               setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
               setIsDragOver(false);
               const sourceId = e.dataTransfer.getData('unitId');
               if (sourceId && sourceId !== unit.id) {
                  onMove(sourceId, unit.id);
               }
            }}
            className={`flex items-center group py-2 px-2 pr-4 rounded-xl cursor-pointer select-none transition-all ${isSelected ? 'bg-blue-50 border border-blue-200/50 shadow-sm' : 'hover:bg-slate-100/50 border border-transparent'} ${isHistorical ? 'opacity-50 grayscale' : ''} ${isDragOver ? 'ring-2 ring-blue-500 bg-blue-50/50' : ''}`} 
            style={{ paddingLeft: `${depth * 1.5 + 0.5}rem` }}
         >
            {/* Expand / Collapse Icon (only if has children) */}
            <div 
               className={`w-6 h-6 flex items-center justify-center rounded hover:bg-slate-200 transition-colors shrink-0 ${children.length === 0 ? 'opacity-0 pointer-events-none' : 'text-slate-400 hover:text-slate-700'}`}
               onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            >
               {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>

            {/* Icon */}
            <div className={`p-1.5 rounded-lg shrink-0 mx-2 transition-colors ${isSelected ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-200 text-slate-500 group-hover:bg-slate-800 group-hover:text-white'}`}>
               <Building2 size={12} />
            </div>

            {/* Title */}
            <div className={`flex-1 truncate text-sm transition-all flex items-center gap-2 ${isSelected ? 'font-black text-blue-900' : 'font-bold text-slate-700 group-hover:text-slate-900'}`}>
               {showCodes && unit.code ? <span className="text-[10px] bg-slate-200 text-slate-500 px-1 py-0.5 rounded uppercase tracking-widest">{unit.code}</span> : null}
               {unit.name}
            </div>

            {/* Badges */}
            {isHistorical && <span className="text-[8px] font-black bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded ml-2 uppercase shrink-0">Archiwum</span>}
            {isPlanned && <span className="text-[8px] font-black bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded ml-2 uppercase shrink-0">Planowane</span>}

            {/* Children count / Hint */}
            {children.length > 0 && (
               <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded ml-2 shrink-0">{children.length} sub</span>
            )}
         </div>

         {/* Recursive Children rendering */}
         {expanded && children.length > 0 && (
            <div className="flex flex-col relative before:absolute before:left-[22px] before:top-0 before:bottom-0 before:w-px before:bg-slate-200">
               {children.map(child => (
                  <div key={child.id} className="relative">
                     {/* Horizontal line connector */}
                     <div className="absolute left-[22px] top-[20px] w-[14px] h-px bg-slate-200" />
                     <UnitTreeNode unit={child} allDepts={allDepts} selectedId={selectedId} onSelect={onSelect} depth={depth + 1} isSearchActive={isSearchActive} showCodes={showCodes} onMove={onMove} />
                  </div>
               ))}
            </div>
         )}
      </div>
   )
}

function RoleTreeNode({ role, allRoles, depth, onEdit, onDelete, onToggleManager, employees, showCodes, onAssignEmployee }: any) {
   const [expanded, setExpanded] = useState(true);
   const children = allRoles.filter((r: any) => r.parentId === role.id);
   const empsInRole = employees.filter((e: any) => e.role === role.name);
   const today = new Date().toISOString().split('T')[0];
   const isRoleHistorical = role.validTo && role.validTo < today;
   const isRolePlanned = role.validFrom && role.validFrom > today;

   return (
      <div className="flex flex-col">
         <div className={`mt-2 bg-white border rounded-2xl p-4 flex flex-col justify-between relative shadow-sm ${role.isManager ? 'border-amber-200 bg-gradient-to-br from-amber-50/30 to-white' : 'border-slate-200'} ${isRoleHistorical ? 'opacity-60' : ''}`} style={{ marginLeft: `${depth * 2}rem` }}>
            {role.isManager && <div className="absolute top-0 right-0 bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-bl-lg rounded-tr-xl uppercase tracking-widest shadow-sm flex items-center gap-1"><Award size={10} /> Kierownictwo</div>}
            {isRoleHistorical && <div className="absolute top-0 right-0 bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-bl-lg rounded-tr-xl uppercase tracking-widest shadow-sm flex items-center gap-1">Archiwum</div>}
            {isRolePlanned && <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-bl-lg rounded-tr-xl uppercase tracking-widest shadow-sm flex items-center gap-1">Planowane</div>}
            
            <div className="pr-16 md:pr-24 flex items-start gap-4">
               {children.length > 0 && (
                  <button onClick={() => setExpanded(!expanded)} className="mt-1 p-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-500 transition-colors">
                     {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
               )}
               <div className="flex-1">
                  <h5 className="font-black text-slate-800 text-sm leading-tight flex flex-wrap gap-2 items-center">
                     {role.name}
                     {(!showCodes && role.code) ? null : role.code && <span className="bg-slate-100 text-slate-500 text-[9px] px-1.5 py-0.5 rounded">{role.code}</span>}
                  </h5>
                  <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Zajmowane: {empsInRole.length} / {role.maxFte || '∞'} FTE</p>
                  
                  {(role.requirements || role.qualifications) && (
                     <div className="mt-3 space-y-2">
                        {role.requirements && (
                           <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Wymagania</p>
                              <p className="text-xs text-slate-600 mt-1 line-clamp-2" title={role.requirements}>{role.requirements}</p>
                           </div>
                        )}
                        {role.qualifications && (
                           <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Kwalifikacje</p>
                              <p className="text-xs text-slate-600 mt-1 line-clamp-2" title={role.qualifications}>{role.qualifications}</p>
                           </div>
                        )}
                     </div>
                  )}
               </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                     {empsInRole.slice(0, 4).map((e: any) => (
                        <div key={e.id} className="w-8 h-8 rounded-full border-2 border-white bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shadow-sm" title={`${e.firstName} ${e.lastName}`}>
                           {e.firstName?.[0]}{e.lastName?.[0]}
                        </div>
                     ))}
                     {empsInRole.length > 4 && (
                        <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-black shadow-sm">
                           +{empsInRole.length - 4}
                        </div>
                     )}
                     {empsInRole.length === 0 && <span className="text-[10px] font-bold text-slate-400 italic">Wakat (Brak pracownika)</span>}
                  </div>
                  <button onClick={() => onAssignEmployee(role)} className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors">
                     + Przypisz Pracownika
                  </button>
               </div>
               
               <div className="flex gap-2">
                  <button onClick={() => onToggleManager(role.id, !!role.isManager)} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${role.isManager ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`} title="Oznacz/Odznacz jako stanowisko kierownicze">
                     <Award size={16} />
                  </button>
                  <button onClick={() => onEdit(role)} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer" title="Edytuj parametry stanowiska">
                     <Edit2 size={16} />
                  </button>
                  <button onClick={() => onDelete(role.id)} className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer" title="Usuń stanowisko">
                     <Trash2 size={16} />
                  </button>
               </div>
            </div>
         </div>
         {expanded && children.length > 0 && (
            <div className="flex flex-col relative before:absolute before:left-[1rem] before:top-0 before:bottom-0 before:w-px before:bg-slate-200">
               {children.sort((a: any, b: any) => (b.isManager === a.isManager) ? 0 : b.isManager ? 1 : -1).map((childRole: any) => (
                  <div key={childRole.id} className="relative">
                     <div className="absolute left-[1rem] top-[30px] w-[1rem] h-px bg-slate-200" />
                     <RoleTreeNode role={childRole} allRoles={allRoles} depth={depth + 1} onEdit={onEdit} onDelete={onDelete} onToggleManager={onToggleManager} employees={employees} showCodes={showCodes} onAssignEmployee={onAssignEmployee} />
                  </div>
               ))}
            </div>
         )}
      </div>
   );
}
