import React, { useState, useEffect, useMemo } from 'react';
import { Network, Users, ChevronRight, ChevronLeft, MousePointer2, ChevronDown, Building2, UserCircle, Search, Edit2, Plus, Briefcase, Filter, ArrowRight, CornerDownRight, Flag, ShieldCheck, Mail, Target, Award, Trash2, Download, Lock, Monitor, X } from 'lucide-react';
import { db } from '../../shared/lib/firebase';
import { collection, addDoc, updateDoc, doc, deleteDoc, onSnapshot, query, where, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../shared/hooks/AuthContext';
import { handleFirestoreError, OperationType } from '../../shared/lib/firestoreUtils';

type ViewMode = 'tree' | 'list';

const Tree3DNode = ({ unit, allUnits, roles, employees, displayOptions, selectedId, onSelect, isMaximized, onEdit, onMoveUnit, onMoveRole, onMoveEmployee, canEdit }: any) => {
   const children = allUnits.filter((u: any) => u.parentId === unit.id);
   const itemRoles = roles.filter((r: any) => r.departmentId === unit.id);
   const [isDragOver, setIsDragOver] = useState(false);

   return (
      <div className="flex flex-col items-center group/node relative">
         <div className={`p-4 bg-white/95 backdrop-blur-sm rounded-2xl border ${selectedId === unit.id ? 'border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.4)] scale-110 z-10' : 'border-slate-200 shadow-xl'} ${isMaximized ? 'w-[320px]' : 'w-[260px]'} ${isDragOver ? 'ring-2 ring-emerald-500 bg-emerald-50' : ''} flex flex-col gap-3 cursor-pointer select-none transition-all duration-300 hover:-translate-y-4 hover:shadow-2xl hover:border-indigo-400 hover:bg-white relative z-10 max-h-[60vh] overflow-y-auto custom-scrollbar`}
              onClick={(e) => { e.stopPropagation(); onSelect(unit.id); }}
              draggable={canEdit}
              onDragStart={(e) => {
                 if (!canEdit) return;
                 e.stopPropagation();
                 e.dataTransfer.setData('unitId', unit.id);
              }}
              onDragOver={(e) => {
                 if (!canEdit) return;
                 e.preventDefault();
                 e.stopPropagation();
                 setIsDragOver(true);
              }}
              onDragLeave={(e) => {
                 e.stopPropagation();
                 setIsDragOver(false);
              }}
              onDrop={(e) => {
                 if (!canEdit) return;
                 e.preventDefault();
                 e.stopPropagation();
                 setIsDragOver(false);
                 const sourceUnitId = e.dataTransfer.getData('unitId');
                 const sourceRoleId = e.dataTransfer.getData('roleId');
                 const sourceEmpId = e.dataTransfer.getData('empId');
                 if (sourceUnitId && sourceUnitId !== unit.id && onMoveUnit) {
                    onMoveUnit(sourceUnitId, unit.id);
                 } else if (sourceRoleId && onMoveRole) {
                    onMoveRole(sourceRoleId, unit.id);
                 } else if (sourceEmpId && onMoveEmployee) {
                    onMoveEmployee(sourceEmpId, '', unit.name);
                 }
              }}>
            
            <div className="flex justify-between items-start">
               <div className="w-12 h-12 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl flex items-center justify-center text-indigo-600 border border-indigo-100 mb-1 shadow-inner shrink-0">
                  <Building2 size={24} />
               </div>
               {canEdit && (
                  <button 
                     onClick={(e) => { e.stopPropagation(); if (onEdit) onEdit(unit); }} 
                     className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors opacity-0 group-hover/node:opacity-100"
                     title="Edytuj Jednostkę"
                  >
                     <Edit2 size={14} />
                  </button>
               )}
            </div>
            
            <div>
               {displayOptions?.showUnits ? (
                  <h3 className={`${isMaximized ? 'text-lg' : 'text-base'} font-black text-slate-800 tracking-tight leading-tight`}>{unit.name}</h3>
               ) : (
                  <h3 className={`${isMaximized ? 'text-lg' : 'text-base'} font-bold text-slate-400 italic`}>-- Ukryto --</h3>
               )}
               {displayOptions?.showUnits && <p className="text-[10px] uppercase font-black text-slate-400 mt-1 tracking-wider">{unit.code || 'Brak kodu'}</p>}
               {displayOptions?.showMPK && unit.costCenter && <p className="text-[10px] uppercase font-black text-indigo-600 mt-1 bg-indigo-50/80 px-2 py-0.5 rounded w-max border border-indigo-100">MPK: {unit.costCenter}</p>}
               
               {(displayOptions?.showRoles || displayOptions?.showPersons) && itemRoles.length > 0 && (
                  <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4">
                     {itemRoles.map((r:any) => {
                        const assigned = employees.filter((e:any) => e.department === unit.name || e.role === r.name);
                        return (
                           <div key={r.id} 
                                draggable={canEdit}
                                onDragStart={(e) => { 
                                   if (!canEdit) return;
                                   e.stopPropagation(); 
                                   e.dataTransfer.setData('roleId', r.id); 
                                }}
                                onDragOver={(e) => { 
                                   if (!canEdit) return;
                                   e.preventDefault(); 
                                   e.stopPropagation(); 
                                }}
                                onDrop={(e) => {
                                   if (!canEdit) return;
                                   e.preventDefault();
                                   e.stopPropagation();
                                   const sourceEmpId = e.dataTransfer.getData('empId');
                                   if (sourceEmpId && onMoveEmployee) {
                                      onMoveEmployee(sourceEmpId, r.name, unit.name);
                                   }
                                }}
                                className={`text-left bg-slate-50 border border-slate-100 p-2 rounded-xl hover:bg-slate-100 transition-colors ${canEdit ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}>
                              {displayOptions?.showRoles && <div className="text-xs font-black text-slate-800 tracking-tight">{r.name}</div>}
                              {displayOptions?.showPersons && assigned.map((e:any) => (
                                 <div key={e.id} draggable={canEdit} onDragStart={(ev) => { if (!canEdit) return; ev.stopPropagation(); ev.dataTransfer.setData('empId', e.id); }} className={`text-[10px] font-medium text-slate-600 mt-1 flex items-center gap-1.5 bg-white p-1 rounded shadow-sm border border-slate-100 ${canEdit ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}><UserCircle size={12} className="text-slate-400"/> {e.firstName ? `${e.firstName} ${e.lastName || ''}` : e.name || e.email}</div>
                              ))}
                           </div>
                        )
                     })}
                  </div>
               )}
            </div>
         </div>

         {children.length > 0 && (
            <div className="flex gap-8 relative pt-8 mt-2 transition-opacity duration-300 opacity-90 group-hover/node:opacity-100 items-start">
               {/* Vertical line coming down from parent to the horizontal bracket */}
               <div className="absolute top-0 left-1/2 w-0.5 h-8 bg-slate-300 -translate-x-1/2 -mt-2"></div>
               
               {children.map((child: any, idx: number) => (
                  <div key={child.id} className="relative flex flex-col items-center">
                     {/* Horizontal bracket line piece for this child */}
                     {children.length > 1 && (
                         <div className={`absolute -top-8 h-0.5 bg-slate-300 
                            ${idx === 0 ? 'left-1/2 right-0' : idx === children.length - 1 ? 'left-0 right-1/2' : 'left-0 right-0'}
                         `}></div>
                     )}
                     {/* Vertical line from bracket down to this child */}
                     <div className="absolute -top-8 left-1/2 w-0.5 h-8 bg-slate-300 -translate-x-1/2"></div>
                     
                     <Tree3DNode unit={child} allUnits={allUnits} roles={roles} employees={employees} displayOptions={displayOptions} selectedId={selectedId} onSelect={onSelect} isMaximized={isMaximized} onEdit={onEdit} onMoveUnit={onMoveUnit} onMoveRole={onMoveRole} onMoveEmployee={onMoveEmployee} canEdit={canEdit} />
                  </div>
               ))}
            </div>
         )}
      </div>
   );
};

function Carousel3D({ items, allUnits, selectedId, onSelect, displayOptions, roles = [], employees = [], isMaximized = false }: any) {
   const [rotation, setRotation] = useState(0);
   const [isDragging, setIsDragging] = useState(false);
   const [startX, setStartX] = useState(0);
   const [showTooltip, setShowTooltip] = useState(() => localStorage.getItem('om-3d-tooltip-closed') !== 'true');

   // Increase the radius and scale since nodes are now entire trees!
   const radius = Math.max(isMaximized ? 800 : 600, items.length * (isMaximized ? 400 : 300)); 
   const angleStep = 360 / Math.max(1, items.length);

   const handleMouseDown = (e: any) => {
      setIsDragging(true);
      setStartX(e.clientX || (e.touches && e.touches[0].clientX) || 0);
   };

   const handleMouseMove = (e: any) => {
      if (!isDragging) return;
      const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      const dx = clientX - startX;
      setRotation(r => r + dx * 0.2);
      setStartX(clientX);
   };

   const handleMouseUp = () => {
      setIsDragging(false);
   };

   const dismissTooltip = (e: any) => {
      e.stopPropagation();
      setShowTooltip(false);
      localStorage.setItem('om-3d-tooltip-closed', 'true');
   };

   return (
      <div 
         className={`relative w-full overflow-hidden cursor-grab active:cursor-grabbing [perspective:2000px] flex items-center justify-center ${isMaximized ? 'h-[85vh] min-h-[700px]' : 'h-full min-h-[600px]'}`}
         onMouseDown={handleMouseDown}
         onMouseMove={handleMouseMove}
         onMouseUp={handleMouseUp}
         onMouseLeave={handleMouseUp}
         onTouchStart={handleMouseDown}
         onTouchMove={handleMouseMove}
         onTouchEnd={handleMouseUp}
      >
         {showTooltip && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/40 backdrop-blur-md text-white/90 pl-3 pr-2 py-1 rounded-full text-[9px] font-bold flex items-center gap-2 z-20 shadow-sm border border-white/10 uppercase tracking-widest cursor-default">
               <MousePointer2 size={10} className="animate-pulse" />
               <span>Przeciągnij myszą aby obrócić</span>
               <button 
                  onClick={dismissTooltip} 
                  className="ml-1 hover:bg-white/20 p-0.5 rounded-full transition-colors cursor-pointer"
                  title="Nie pokazuj więcej"
               >
                  <X size={10} />
               </button>
            </div>
         )}
         
         {selectedId && (
            <button 
               onClick={(e) => { e.stopPropagation(); onSelect(null); }}
               className="absolute top-6 right-6 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-slate-900 transition-colors z-20 flex items-center gap-2"
            >
               <Target size={16} /> Powrót do widoku głównego
            </button>
         )}

         <div className="absolute w-full h-full flex transform-gpu items-center justify-center [transform-style:preserve-3d] transition-transform duration-75"
              style={{ transform: `scale(${isMaximized ? 0.8 : 0.6}) translateZ(${-radius}px) rotateY(${rotation}deg) translateY(-20%)` }}>
            {items.map((item: any, i: number) => {
               const angle = angleStep * i;
               
               return (
                  <div key={item.id} className="absolute [transform-style:preserve-3d] transition-all origin-top flexjustify-center"
                       style={{ transform: `rotateY(${angle}deg) translateZ(${radius}px)` }}>
                     <Tree3DNode 
                        unit={item} 
                        allUnits={allUnits} 
                        roles={roles} 
                        employees={employees} 
                        displayOptions={displayOptions} 
                        selectedId={selectedId} 
                        onSelect={onSelect} 
                        isMaximized={isMaximized}
                        canEdit={onEdit !== undefined} // Simplified for Carousel
                        onEdit={onEdit}
                        onMoveUnit={onMoveUnit}
                        onMoveRole={onMoveRole}
                        onMoveEmployee={onMoveEmployee}
                     />
                  </div>
               );
            })}
         </div>

         <div className="absolute bottom-8 flex gap-6 z-20">
            <button onClick={(e) => { e.stopPropagation(); setRotation(r => r + angleStep); }} className="bg-white/90 backdrop-blur-md p-4 rounded-full shadow-xl hover:shadow-2xl hover:scale-110 transition-all cursor-pointer text-slate-600 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200">
               <ChevronLeft size={28} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); setRotation(r => r - angleStep); }} className="bg-white/90 backdrop-blur-md p-4 rounded-full shadow-xl hover:shadow-2xl hover:scale-110 transition-all cursor-pointer text-slate-600 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200">
               <ChevronRight size={28} />
            </button>
         </div>
      </div>
   );
}

export default function OrgStructureModule() {
  const { activeTenantId, userData } = useAuth();
  const canEditStructure = userData?.roles?.includes('owner') || userData?.permissions?.includes('om.structure.edit');
  
  // Data
  const [departments, setDepartments] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const hasOmLicense = userData?.subscriptionTier === 'PRO' || userData?.subscriptionTier === 'ENTERPRISE' || userData?.roles?.includes('owner');


  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [showCodes, setShowCodes] = useState(true);
  const [isTreeMaximized, setIsTreeMaximized] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [treeLayout, setTreeLayout] = useState<'vertical' | 'horizontal' | '3d'>('vertical');
  
  const [displayOptions, setDisplayOptions] = useState({
     showUnits: true,
     showRoles: true,
     showPersons: true,
     showMPK: true,
  });

  // Multi-Modals
  const [unitModal, setUnitModal] = useState<{isOpen: boolean, data: any, initialData: any}>({isOpen: false, data: null, initialData: null});
  const [roleModal, setRoleModal] = useState<{isOpen: boolean, unitId: string, data: any, initialData: any}>({isOpen: false, unitId: '', data: null, initialData: null});
  const [empAssignModal, setEmpAssignModal] = useState<{isOpen: boolean, roleId: string | null}>({isOpen: false, roleId: null});

  useEffect(() => {
    if (!activeTenantId) {
      setLoading(false);
      return;
    }

    const timeout = setTimeout(() => setLoading(false), 8000);

    const unsubDepts = onSnapshot(query(collection(db, 'hr_departments'), where('tenantId', '==', activeTenantId)), (snap) => {
      setDepartments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => { handleFirestoreError(error, OperationType.LIST, 'hr_departments'); setLoading(false); });

    const unsubRoles = onSnapshot(query(collection(db, 'hr_roles'), where('tenantId', '==', activeTenantId)), (snap) => {
      setRoles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => { handleFirestoreError(error, OperationType.LIST, 'hr_roles'); setLoading(false); });

    const unsubEmps = onSnapshot(query(collection(db, 'employees'), where('tenantId', '==', activeTenantId)), (snap) => {
      setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      clearTimeout(timeout);
      setLoading(false);
    }, (error) => { handleFirestoreError(error, OperationType.LIST, 'employees'); setLoading(false); });

    return () => { clearTimeout(timeout); unsubDepts(); unsubRoles(); unsubEmps(); }
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
    try {
      await updateDoc(doc(db, 'hr_departments', sourceId), { parentId: targetParentId || '', updatedAt: serverTimestamp() });
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, 'hr_departments'); }
  };

  const handleMoveRole = async (sourceRoleId: string, targetUnitId: string) => {
    if (!activeTenantId || !sourceRoleId || !targetUnitId) return;
    try {
      await updateDoc(doc(db, 'hr_roles', sourceRoleId), { departmentId: targetUnitId, updatedAt: serverTimestamp() });
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, 'hr_roles'); }
  };

  const handleMoveEmployee = async (sourceEmpId: string, targetRoleName: string, targetDeptName: string) => {
    if (!activeTenantId || !sourceEmpId) return;
    try {
      await updateDoc(doc(db, 'employees', sourceEmpId), { role: targetRoleName, department: targetDeptName, updatedAt: serverTimestamp() });
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, 'employees'); }
  };

  if (loading) return <div className="p-12 text-center text-slate-500 font-bold animate-pulse">Ładowanie Struktur Organizacyjnych (OM)...</div>;

  return (
    <div className={`flex flex-col h-full bg-slate-50 max-w-[1600px] mx-auto animate-in fade-in duration-500 p-2 md:p-6 pb-20 ${isFullScreen ? 'fixed inset-0 z-50 !max-w-full !p-4 bg-slate-100 overflow-y-auto' : ''}`}>
      
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mb-6 flex-shrink-0 relative overflow-hidden">
         <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <Network size={120} />
         </div>
         <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 relative z-10 w-full">
           {/* Info (Left) */}
           <div className="pl-2 border-l-4 border-blue-600 shrink-0">
             <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Organizational Management</h2>
                {hasOmLicense ? (
                  <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-widest border border-emerald-200 whitespace-nowrap hidden sm:inline-block">Licencja Aktywna</span>
                ) : (
                  <span title="Funkcjonalność M-OM wymaga licencji klasy Enterprise." className="bg-rose-100 text-rose-800 text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-widest border border-rose-200 flex items-center gap-1 cursor-help whitespace-nowrap hidden sm:flex"><ShieldCheck size={10} /> Wersja Demo</span>
                )}
             </div>
             <p className="text-xs md:text-sm text-slate-500 font-medium">Struktura Jednostek, Stanowisk i Osób</p>
           </div>
           
           {/* Right side Container (Stats and Scrollable actions) */}
           <div className="flex w-full lg:w-auto overflow-x-auto overflow-y-hidden custom-scrollbar pb-1 items-center justify-start gap-3 flex-nowrap shrink-0 lg:shrink min-w-0 snap-x lg:ml-auto">
              {/* Stats Block - Ensure they are fully visible first */}
              <div className="flex bg-slate-100 p-1.5 rounded-xl shrink-0 snap-start">
                 <div className="flex items-center gap-2 px-3 py-1.5 border-r border-slate-200 shrink-0">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Firma (Jednostek)</span>
                    <span className="text-sm font-black text-slate-800">{departments.length}</span>
                 </div>
                 <div className="flex items-center gap-2 px-3 py-1.5 border-r border-slate-200 shrink-0">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Stanowisk (FTE)</span>
                    <span className="text-sm font-black text-blue-600">{roles.length}</span>
                 </div>
                 <div className="flex items-center gap-2 px-3 py-1.5 shrink-0">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Wakatów</span>
                    <span className="text-sm font-black text-rose-500">{roles.filter(r => !employees.some(e => e.role === r.name)).length}</span>
                 </div>
              </div>
              
              {/* Action Buttons - Push to the right and scrollable */}
              <div className="flex items-center gap-2 shrink-0 snap-end pl-2" style={{ scrollSnapAlign: 'end' }}>
                 <button onClick={() => setIsFullScreen(!isFullScreen)} className={`flex shrink-0 items-center justify-center gap-2 transition-colors px-3 py-2 rounded-xl shadow-sm text-[10px] font-black uppercase tracking-widest border ${isFullScreen ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                    <Target size={14} /> <span>{isFullScreen ? 'Wyjdź' : 'Pełny Ekran'}</span>
                 </button>
                 <button onClick={() => setShowCodes(!showCodes)} className={`flex shrink-0 items-center justify-center gap-2 transition-colors px-3 py-2 rounded-xl shadow-sm text-[10px] font-black uppercase tracking-widest border ${showCodes ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                    <Search size={14} /> <span>{showCodes ? 'Ukryj Numery' : 'Pokaż ID'}</span>
                 </button>
                 <button onClick={() => alert("Generowanie raportu struktury do PDF...")} className="flex shrink-0 items-center justify-center gap-2 bg-slate-900 text-white hover:bg-blue-600 transition-colors px-3 py-2 rounded-xl shadow-md text-[10px] font-black uppercase tracking-widest">
                    <Download size={14} /> <span>Raport M-OM</span>
                 </button>
              </div>
           </div>
         </div>
      </div>

      {/* Main Workspace - 2 Columns (Sidebar + Details) */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-[600px] h-[calc(100vh-200px)]">
         
         {/* Left Sidebar: Tree / Search */}
         <div className={`w-full ${(isTreeMaximized || treeLayout === '3d' || treeLayout === 'horizontal') ? 'lg:w-full max-w-full' : 'lg:w-1/3 lg:max-w-md'} flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex-shrink-0 transition-all duration-300`}>
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col gap-3">
               <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                     <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><Building2 size={16} className="text-blue-500" /> Drzewo Jednostek</h3>
                     {treeLayout !== '3d' && (
                        <button onClick={() => setIsTreeMaximized(!isTreeMaximized)} className="text-[10px] text-slate-400 hover:text-blue-600 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-sm transition-colors uppercase font-bold tracking-widest">{isTreeMaximized ? 'Zmniejsz' : 'Powiększ'}</button>
                     )}
                  </div>
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
               
               <div className="flex flex-col items-center gap-2 mt-1">
                 <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-max border border-slate-200">
                    <button onClick={() => { setTreeLayout('vertical'); setIsFullScreen(false); }} className={`px-3 py-1 text-[10px] uppercase tracking-widest font-black rounded-lg transition-all ${treeLayout === 'vertical' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:bg-slate-200/50'}`}>Pion</button>
                    <button onClick={() => { setTreeLayout('horizontal'); setIsFullScreen(true); }} className={`px-3 py-1 text-[10px] uppercase tracking-widest font-black rounded-lg transition-all ${treeLayout === 'horizontal' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:bg-slate-200/50'}`}>Poziom</button>
                    <button onClick={() => { setTreeLayout('3d'); setIsFullScreen(true); }} className={`px-3 py-1 text-[10px] uppercase tracking-widest font-black rounded-lg transition-all ${treeLayout === '3d' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:bg-slate-200/50'}`}>3D</button>
                 </div>
                 
                 {(treeLayout === '3d' || treeLayout === 'horizontal') && (
                    <div className="flex flex-wrap justify-center gap-2 mt-2 bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl text-[9px] uppercase font-black text-slate-500 tracking-widest">
                       <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-800 transition-colors">
                          <input type="checkbox" checked={displayOptions.showUnits} onChange={e => setDisplayOptions(prev => ({...prev, showUnits: e.target.checked}))} className="accent-blue-600 w-3 h-3" /> Nazwy Działów
                       </label>
                       <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-800 transition-colors">
                          <input type="checkbox" checked={displayOptions.showRoles} onChange={e => setDisplayOptions(prev => ({...prev, showRoles: e.target.checked}))} className="accent-blue-600 w-3 h-3" /> Stanowiska
                       </label>
                       <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-800 transition-colors">
                          <input type="checkbox" checked={displayOptions.showPersons} onChange={e => setDisplayOptions(prev => ({...prev, showPersons: e.target.checked}))} className="accent-blue-600 w-3 h-3" /> Osoby
                       </label>
                       <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-800 transition-colors">
                          <input type="checkbox" checked={displayOptions.showMPK} onChange={e => setDisplayOptions(prev => ({...prev, showMPK: e.target.checked}))} className="accent-blue-600 w-3 h-3" /> MPK
                       </label>
                    </div>
                 )}
               </div>
            </div>
            
            <div className={`flex-1 flex flex-col overflow-auto p-4 custom-scrollbar lg:h-full h-[40vh] transition-all duration-700`}>
               {selectedUnit && (treeLayout === '3d' || treeLayout === 'horizontal') && (
                  <div className="flex flex-wrap items-center gap-2 mb-4 p-2 bg-slate-50 border border-slate-200 rounded-xl relative z-20 shadow-sm shrink-0">
                     <button onClick={() => setSelectedUnitId(null)} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1">
                        <Building2 size={12} /> Root
                     </button>
                     {(() => {
                        const breadcrumbs = [];
                        let curr = selectedUnit;
                        while(curr) {
                           breadcrumbs.unshift(curr);
                           curr = departments.find(d => d.id === curr.parentId);
                        }
                        return breadcrumbs.map((b, i) => (
                           <React.Fragment key={b.id}>
                              <ChevronRight size={12} className="text-slate-300" />
                              <button 
                                 onClick={() => setSelectedUnitId(b.id)} 
                                 className={`text-[10px] font-black uppercase tracking-widest transition-colors ${i === breadcrumbs.length - 1 ? 'text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded' : 'text-slate-600 hover:text-indigo-600'}`}
                              >
                                 {b.name}
                              </button>
                           </React.Fragment>
                        ));
                     })()}
                  </div>
               )}

               {topLevelUnits.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 font-bold p-8">Brak jednostek organizacyjnych. Dodaj nowy element root.</p>
               ) : (
                  <div className={`pb-4 transition-all duration-700 origin-top flex-1
                     ${treeLayout === 'vertical' ? 'space-y-1 flex flex-col items-start' : ''}
                     ${treeLayout === 'horizontal' ? 'flex flex-row overflow-x-auto min-w-max gap-8 items-start justify-center pt-8' : ''}
                  `}>
                     {treeLayout === '3d' ? (
                        <Carousel3D 
                           items={selectedUnit ? [selectedUnit] : topLevelUnits} 
                           allUnits={departments}
                           selectedId={selectedUnitId} 
                           onSelect={setSelectedUnitId} 
                           displayOptions={displayOptions}
                           roles={roles}
                           employees={employees}
                           isMaximized={isTreeMaximized || isFullScreen}
                           onEdit={canEditStructure ? (unit: any) => setUnitModal({isOpen: true, data: unit, initialData: unit}) : undefined}
                           onMoveUnit={canEditStructure ? handleMoveUnit : undefined}
                           onMoveRole={canEditStructure ? handleMoveRole : undefined}
                           onMoveEmployee={canEditStructure ? handleMoveEmployee : undefined}
                        />
                     ) : treeLayout === 'horizontal' ? (
                        <>
                           {(selectedUnit ? [selectedUnit] : topLevelUnits).map(unit => (
                              <Tree3DNode 
                                 key={unit.id} 
                                 unit={unit} 
                                 allUnits={departments} 
                                 roles={roles} 
                                 employees={employees} 
                                 displayOptions={displayOptions} 
                                 selectedId={selectedUnitId} 
                                 onSelect={setSelectedUnitId} 
                                 isMaximized={isTreeMaximized || isFullScreen} 
                                 onEdit={canEditStructure ? (u: any) => setUnitModal({isOpen: true, data: u, initialData: u}) : undefined} 
                                 onMoveUnit={canEditStructure ? handleMoveUnit : undefined}
                                 onMoveRole={canEditStructure ? handleMoveRole : undefined}
                                 onMoveEmployee={canEditStructure ? handleMoveEmployee : undefined}
                                 canEdit={canEditStructure}
                              />
                           ))}
                        </>
                     ) : (
                        <div className="flex flex-col gap-1 w-full overflow-x-auto custom-scrollbar">
                           {topLevelUnits.map(unit => (
                              <UnitTreeNode 
                                 key={unit.id} 
                                 unit={unit} 
                                 allDepts={departments} 
                                 roles={roles}
                                 employees={employees}
                                 selectedId={selectedUnitId} 
                                 onSelect={setSelectedUnitId} 
                                 depth={0} 
                                 isSearchActive={!!searchTerm} 
                                 showCodes={showCodes} 
                                 onMove={handleMoveUnit} 
                                 onMoveRole={handleMoveRole}
                                 onMoveEmployee={handleMoveEmployee}
                                 treeLayout={treeLayout} 
                                 canEdit={canEditStructure}
                              />
                           ))}
                           {/* Droppable root area */}
                           {canEditStructure && (
                              <div 
                                 className="py-12 border-2 border-dashed border-slate-200 rounded-3xl text-center text-slate-400 text-[10px] font-black uppercase tracking-widest mt-8 w-full max-w-sm mx-auto hover:border-indigo-400 hover:text-indigo-600 transition-all cursor-default"
                                 onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-indigo-50', 'border-indigo-400'); }}
                                 onDragLeave={(e) => { e.currentTarget.classList.remove('bg-indigo-50', 'border-indigo-400'); }}
                                 onDrop={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.classList.remove('bg-indigo-50', 'border-indigo-400');
                                    const sourceId = e.dataTransfer.getData('unitId');
                                    if (sourceId) handleMoveUnit(sourceId, null);
                                 }}
                              >
                                 Upuść tutaj, aby przenieść na poziom najwyższy (Root)
                              </div>
                           )}
                        </div>
                     )}
                  </div>
               )}
            </div>
         </div>

         {/* Right Detail Pane */}
         <div className={`w-full lg:flex-1 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden lg:h-full min-h-[500px] ${(isTreeMaximized || treeLayout === '3d' || treeLayout === 'horizontal') ? 'hidden lg:hidden' : 'flex'}`}>
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
                           <button type="button" onClick={async () => {
                              const nip = unitModal.data?.companyId?.replace(/\D/g, '');
                              if(!nip || nip.length !== 10) { alert('Proszę podać prawidłowy format NIP (10 cyfr) w polu powyżej.'); return; }
                              const today = new Date().toISOString().split('T')[0];
                              try {
                                 const response = await fetch(`https://wl-api.mf.gov.pl/api/search/nip/${nip}?date=${today}`);
                                 const data = await response.json();
                                 if (data?.result?.subject?.name) {
                                    setUnitModal(prev => ({...prev, data: {...prev.data, name: data.result.subject.name, type: 'Firma'}}));
                                 } else {
                                    alert('Nie znaleziono firmy o takim NIP w bazie WL / KRS.');
                                 }
                              } catch (err) {
                                 console.error("Błąd pobierania danych z KRS/WL:", err);
                                 alert('Błąd podczas pobierania danych.');
                              }
                           }} className="bg-slate-800 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 shrink-0">Z KRS/WL</button>
                        </div>
                     </div>
                     <div className="col-span-1">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Jednostka Gospodarcza (Business Unit)</label>
                        <input type="text" value={unitModal.data?.businessUnit || ''} onChange={e => setUnitModal(prev => ({...prev, data: {...prev.data, businessUnit: e.target.value}}))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500" placeholder="np. BU-Retail" />
                     </div>
                     <div className="col-span-2 border-t border-slate-100 pt-4 mt-2">
                        <label className="block text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2 flex items-center gap-2"><Lock size={12} /> HR Business Partner (Opiekun HR) - Enterprise</label>
                        <select value={unitModal.data?.hrBusinessPartner || ''} onChange={e => setUnitModal(prev => ({...prev, data: {...prev.data, hrBusinessPartner: e.target.value}}))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-amber-500 transition-colors">
                           <option value="">-- WYBIERZ BP (Opcjonalnie) --</option>
                           {employees.map(e => (
                              <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.email})</option>
                           ))}
                        </select>
                        <p className="text-[10px] text-slate-400 font-medium mt-1">HR BP będzie przydzielony domyślnie do zgłoszeń z tej jednostki na podanej linii czasu ważności.</p>
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
function UnitTreeNode({ unit, allDepts, roles, employees, selectedId, onSelect, depth, isSearchActive, showCodes, onMove, onMoveRole, onMoveEmployee, treeLayout = 'vertical', canEdit }: any) {
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

   const isHorizontal = treeLayout === 'horizontal';

   return (
      <div className={`flex ${isHorizontal ? 'flex-col items-center shrink-0' : 'flex-col'} ${treeLayout === '3d' ? 'transition-all duration-300 hover:-translate-y-1 hover:scale-105' : ''}`}>
         {/* Node Row */}
         <div 
            onClick={() => onSelect(unit.id)}
            draggable={canEdit}
            onDragStart={(e) => {
               if (!canEdit) return;
               e.dataTransfer.setData('unitId', unit.id);
               // Wait for next tick to collapse so the user doesn't drag a collapsed tree if expanded
               setTimeout(() => setExpanded(false), 0);
            }}
            onDragOver={(e) => {
               if (!canEdit) return;
               e.preventDefault();
               setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
               if (!canEdit) return;
               setIsDragOver(false);
               const sourceId = e.dataTransfer.getData('unitId');
               const sourceRoleId = e.dataTransfer.getData('roleId');
               const sourceEmpId = e.dataTransfer.getData('empId');
               
               if (sourceId && sourceId !== unit.id) {
                  onMove(sourceId, unit.id);
               } else if (sourceRoleId && onMoveRole) {
                  onMoveRole(sourceRoleId, unit.id);
               } else if (sourceEmpId && onMoveEmployee) {
                  onMoveEmployee(sourceEmpId, '', unit.name);
               }
            }}
            className={`flex items-center group py-2 px-2 pr-4 rounded-xl cursor-pointer select-none transition-all relative z-10
               ${isSelected ? 'bg-blue-50 border border-blue-200 shadow-sm shadow-blue-100' : 'bg-white hover:bg-slate-50 border border-slate-100 hover:border-slate-200'} 
               ${isHistorical ? 'opacity-50 grayscale' : ''} 
               ${isDragOver ? 'ring-2 ring-emerald-500 bg-emerald-50' : ''}
               ${isHorizontal ? 'min-w-[200px] shadow' : ''}
               ${treeLayout === '3d' ? 'shadow-lg border-b-4 border-slate-200' : ''}
            `} 
            style={isHorizontal ? { marginTop: depth > 0 ? '2rem' : '0' } : { paddingLeft: `${depth * 1.5 + 0.5}rem` }}
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
            <div className={`relative ${isHorizontal ? 'flex flex-row justify-center gap-8 mt-8 before:absolute before:top-[-2rem] before:left-1/2 before:-translate-x-1/2 before:w-px before:h-[2rem] before:bg-slate-300' : 'flex flex-col before:absolute before:left-[22px] before:top-0 before:bottom-0 before:w-px before:bg-slate-200'}`}>
               {isHorizontal && children.length > 1 && (
                  <div className="absolute top-[-2rem] left-[100px] right-[100px] h-px bg-slate-300" /> /* Horizontal top bridge line */
               )}
               {children.map((child, index) => (
                  <div key={child.id} className="relative">
                     {/* Line connector */}
                     {!isHorizontal && <div className="absolute left-[22px] top-[20px] w-[14px] h-px bg-slate-200" />}
                     {isHorizontal && <div className="absolute top-[-2rem] left-1/2 -translate-x-1/2 w-px h-[2rem] bg-slate-300" />}
                     
                     <UnitTreeNode 
                        unit={child} 
                        allDepts={allDepts} 
                        roles={roles} 
                        employees={employees} 
                        selectedId={selectedId} 
                        onSelect={onSelect} 
                        depth={depth + 1} 
                        isSearchActive={isSearchActive} 
                        showCodes={showCodes} 
                        onMove={onMove} 
                        onMoveRole={onMoveRole}
                        onMoveEmployee={onMoveEmployee}
                        treeLayout={treeLayout} 
                        canEdit={canEdit}
                     />
                  </div>
               ))}
            </div>
         )}
      </div>
   )
}

function RoleTreeNode({ role, allRoles, depth, onEdit, onDelete, onToggleManager, employees, showCodes, onAssignEmployee, onMoveRole, onMoveEmployee, canEdit }: any) {
   const [expanded, setExpanded] = useState(true);
   const children = allRoles.filter((r: any) => r.parentId === role.id);
   const empsInRole = employees.filter((e: any) => e.role === role.name);
   const today = new Date().toISOString().split('T')[0];
   const isRoleHistorical = role.validTo && role.validTo < today;
   const isRolePlanned = role.validFrom && role.validFrom > today;
   const [isDragOver, setIsDragOver] = useState(false);

   return (
      <div className="flex flex-col">
         <div 
            draggable={canEdit}
            onDragStart={(e) => { 
               if (!canEdit) return;
               e.dataTransfer.setData('roleId', role.id); 
            }}
            onDragOver={(e) => { 
               if (!canEdit) return;
               e.preventDefault(); 
               setIsDragOver(true); 
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
               if (!canEdit) return;
               e.preventDefault();
               setIsDragOver(false);
               const sourceEmpId = e.dataTransfer.getData('empId');
               if (sourceEmpId && onMoveEmployee) {
                  onMoveEmployee(sourceEmpId, role.name, role.departmentId);
               }
            }}
            className={`mt-2 bg-white border rounded-2xl p-4 flex flex-col justify-between relative shadow-sm transition-all ${role.isManager ? 'border-amber-200 bg-gradient-to-br from-amber-50/30 to-white' : 'border-slate-200'} ${isRoleHistorical ? 'opacity-60' : ''} ${isDragOver ? 'ring-2 ring-emerald-500' : ''} ${canEdit ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`} style={{ marginLeft: `${depth * 2}rem` }}>
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
                        <div key={e.id} draggable={canEdit} onDragStart={(ev) => { if (!canEdit) return; ev.stopPropagation(); ev.dataTransfer.setData('empId', e.id); }} className={`w-8 h-8 rounded-full border-2 border-white bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shadow-sm ${canEdit ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`} title={`${e.firstName} ${e.lastName}`}>
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
               
               {canEdit && (
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
               )}
            </div>
         </div>
         {expanded && children.length > 0 && (
            <div className="flex flex-col relative before:absolute before:left-[1rem] before:top-0 before:bottom-0 before:w-px before:bg-slate-200">
               {children.sort((a: any, b: any) => (b.isManager === a.isManager) ? 0 : b.isManager ? 1 : -1).map((childRole: any) => (
                  <div key={childRole.id} className="relative">
                     <div className="absolute left-[1rem] top-[30px] w-[1rem] h-px bg-slate-200" />
                     <RoleTreeNode role={childRole} allRoles={allRoles} depth={depth + 1} onEdit={onEdit} onDelete={onDelete} onToggleManager={onToggleManager} employees={employees} showCodes={showCodes} onAssignEmployee={onAssignEmployee} onMoveRole={onMoveRole} onMoveEmployee={onMoveEmployee} canEdit={canEdit} />
                  </div>
               ))}
            </div>
         )}
      </div>
   );
}
