import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../shared/lib/firebase';
import { collection, query, onSnapshot, orderBy, where, getDocs, getDoc, doc, setDoc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../shared/hooks/AuthContext';
import { handleFirestoreError, OperationType } from '../../shared/lib/firestoreUtils';
import { useFieldAuth } from '../auth/hooks/useFieldAuth';
import { MODULE_REGISTRY } from '../../core/modules/ModuleRegistry';
import { 
  DollarSign, FileText, Users, TrendingUp, 
  Calendar, CreditCard, Briefcase, UserPlus, 
  Settings, FolderKanban, ShieldAlert, CheckCircle2,
  Download, FileArchive, Save, Sparkles, X, PlusCircle, Search, Cpu, FastForward, Network, ShieldCheck, Paperclip, Target, Filter, Heart, Activity
} from 'lucide-react';

function EmployeeRow({ emp, openEmployeeModal, setPromptOverlay, setShowProjectModal, isComplianceMode }: any) {
  const [offsetX, setOffsetX] = useState(0);
  const [startX, setStartX] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<any>(null);

  const handleTouchStart = (e: any) => {
     setStartX(e.touches[0].clientX);
     const timer = setTimeout(() => {
        setIsMenuOpen(true);
        if (window.navigator.vibrate) window.navigator.vibrate(50);
     }, 600); // 600ms long press
     setLongPressTimer(timer);
  };

  const handleTouchMove = (e: any) => {
     if (longPressTimer) clearTimeout(longPressTimer);
     const dx = e.touches[0].clientX - startX;
     if (dx < 0 && dx > -120) setOffsetX(dx);
  };

  const handleTouchEnd = () => {
     if (longPressTimer) clearTimeout(longPressTimer);
     if (offsetX < -50) setIsMenuOpen(true);
     setOffsetX(0);
  };

  const hasComplianceProblem = emp.status === 'INCOMPLETE' || (emp.contractType === 'B2B' && (!emp.nip || emp.nip.trim() === '' || emp.nip.length !== 10)) || (emp.contractType === 'Umowa o pracę' && emp.nationality === 'PL' && (!emp.pesel || emp.pesel.length !== 11 || !isValidPesel(emp.pesel)));
  const isErrRow = isComplianceMode && hasComplianceProblem;

  return (
    <tr key={emp.id} className={`transition-colors group relative ${isErrRow ? 'bg-rose-50' : 'hover:bg-slate-50'}`}>
       <td colSpan={4} className="p-0">
          <div 
             className={`flex items-center w-full px-6 py-4 cursor-pointer relative ${isErrRow ? 'border-l-4 border-rose-500' : 'border-l-4 border-transparent'}`}
             onClick={() => openEmployeeModal(emp, isErrRow)}
             onTouchStart={handleTouchStart}
             onTouchMove={handleTouchMove}
             onTouchEnd={handleTouchEnd}
             style={{ transform: `translateX(${isMenuOpen ? -120 : offsetX}px)`, transition: offsetX === 0 ? 'transform 0.2s ease-out' : 'none' }}
          >
             {/* Menu Actions (Behind) */}
             {isMenuOpen && (
                <div className="absolute top-0 bottom-0 -right-[120px] w-[120px] bg-slate-900 border-l border-slate-700 flex items-center justify-center gap-2 px-4 shadow-inner text-white z-10" onClick={(e) => e.stopPropagation()}>
                   <button onClick={() => { 
                      setIsMenuOpen(false); 
                      setShowProjectModal({isOpen: true, employeeId: emp.id});
                   }} className="p-2 hover:bg-slate-700 rounded-lg text-white" title="Przypisz Projekt"><FolderKanban size={18} /></button>
                   <button onClick={() => { setIsMenuOpen(false); openEmployeeModal(emp, isErrRow); }} className="p-2 hover:bg-slate-700 rounded-lg text-white" title="Edytuj Profil"><Edit2 size={18} /></button>
                   <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400"><X size={18} /></button>
                </div>
             )}

             {/* Main Columns Content inside flex row */}
             <div className="flex-1 min-w-0 flex items-center gap-3 pr-4">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-[10px] font-black text-indigo-600 uppercase shrink-0">{emp.name?.[0] || 'X'}</div>
                <div className="min-w-0">
                   <div className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2 truncate">
                     {emp.name || emp.email}
                     {emp.status === 'INCOMPLETE' && <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-[8px] tracking-widest hidden md:inline-block shrink-0">BRAKI DANYCH</span>}
                   </div>
                   <div className="text-[10px] text-slate-400 font-bold truncate mt-0.5">{emp.email} {emp.paymentMethod === 'CASH' && <span className="bg-amber-100 text-amber-800 px-1 py-0.5 rounded ml-1">KASY</span>}</div>
                </div>
             </div>

             <div className="flex-1 min-w-0 hidden md:block px-4">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-tighter mb-1 truncate">{emp.role === 'manager' ? 'Kierownik Kontraktu' : (emp.role || 'Specjalista')}</div>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded">{emp.contractType || 'Brak Umowy'}</span>
             </div>

             <div className="flex-1 min-w-0 hidden lg:block px-4">
                <div className="flex flex-col gap-1 w-48">
                  {(!emp.financeAllocations || emp.financeAllocations.length === 0) ? (
                     <span className="text-[9px] font-bold text-slate-400 italic">Brak projektów</span>
                  ) : (
                     emp.financeAllocations.map((alloc: any, idx: number) => (
                        <span key={idx} className="text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded truncate w-full text-left inline-block" title={alloc.projectName || alloc.projectId}>
                          {alloc.projectName || alloc.projectId} ({alloc.percentage}%)
                        </span>
                     ))
                  )}
                  <span className="text-[9px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded flex items-center justify-center gap-1 hover:bg-slate-50 cursor-pointer transition-colors mt-1" onClick={(e) => { 
                      e.stopPropagation(); 
                      setIsMenuOpen(false); 
                      setShowProjectModal({isOpen: true, employeeId: emp.id});
                  }}>
                    <FolderKanban size={10} /> + Przypisz
                  </span>
                </div>
             </div>

             <div className="w-[100px] text-right ml-auto hidden sm:block shrink-0 px-4">
                <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-800 transition-colors" onClick={(e) => { e.stopPropagation(); openEmployeeModal(emp, isErrRow); }}>Profil</button>
             </div>
          </div>
       </td>
    </tr>
  );
}

export default function PayrollModule({ onNavigateToOM }: { onNavigateToOM?: () => void }) {
  const { userData, activeTenantId } = useAuth();
  const { getFieldAccess } = useFieldAuth('PAYROLL');
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'employees' | 'leaves' | 'payslips' | 'components' | 'reports' | 'dashboard' | 'recruitment' | 'retention'>('employees');
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  
  // AI State
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<{message: string, legalBasis: string, hasError: boolean} | null>(null);
  const [isComplianceMode, setIsComplianceMode] = useState(false);

  // Employee Modal State
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [promptOverlay, setPromptOverlay] = useState<{isOpen: boolean, config: {title: string, onSave: (val: string) => void}} | null>(null);
  const [showProjectModal, setShowProjectModal] = useState<{isOpen: boolean, employeeId: string | null}>({isOpen: false, employeeId: null});
  const [finProjects, setFinProjects] = useState<any[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [omNavigationOverlay, setOmNavigationOverlay] = useState<{isOpen: boolean, type: 'department' | 'role'} | null>(null);
  const [isModalMaximized, setIsModalMaximized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [employeeModalTab, setEmployeeModalTab] = useState<'HR0002' | 'HR0001' | 'HR0008' | 'HR0200' | 'HR0024' | 'HR0032' | 'ZHR001'>('HR0002');
  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
  const [skillsDictionary, setSkillsDictionary] = useState<any[]>([]);
  const [newEmployee, setNewEmployee] = useState<any>({ 
    firstName: '', lastName: '', middleName: '', namePronunciation: '', employeeNumber: '', employeeType: 'P',
    personalDataValidFrom: new Date().toISOString().split('T')[0], personalDataValidTo: '9999-12-31',
    email: '', privateEmail: '', privatePhone: '', pesel: '', nip: '', nationality: 'PL', role: '', roleValidFrom: '', roleValidTo: '9999-12-31', department: '', departmentValidFrom: '', departmentValidTo: '9999-12-31', manager: '', companyCode: '',
    schedules: [], workHistory: [], financeAllocations: [],
    contractType: 'Umowa o pracę', hourlyRate: 50, baseSalary: 0, salaryType: 'GROSS',
    whatsappNumber: '', whatsappConsent: false,
    vatType: 'STANDARD', vatRate: 23, 
    paymentMethod: 'BTR', bankAccount: '', swiftBic: '', isForeignBankAccount: false,
    workPermitType: '', workPermitValidTo: '',
    isStudent: false, isPensioner: false, pitZero: false, authorCosts: false,
    educationLevel: 'Wyższe', drivingLicenses: [],
    languages: [], skills: [],
    ohsTrainingType: 'Wstępne', ohsTrainingValidFrom: '', ohsTrainingValidTo: '', 
    medicalExamType: 'Wstępne', medicalExamValidFrom: '', medicalExamValidTo: '', 
    certificates: '', issuedEquipment: '',
    additions: [], deductions: [],
    status: 'INCOMPLETE',
    customFields: [] 
  });
  const [initialEmployee, setInitialEmployee] = useState<any>(null);

  const isSaveDisabled = useMemo(() => {
    // Check required fields
    if (!newEmployee?.firstName?.trim() || !newEmployee?.lastName?.trim() || !newEmployee?.email?.trim()) return true;
    
    // Check if anything changed
    if (initialEmployee && JSON.stringify(initialEmployee) === JSON.stringify(newEmployee)) return true;
    
    return false;
  }, [newEmployee, initialEmployee]);
  const [employeeAiHelper, setEmployeeAiHelper] = useState<{message: string, isError: boolean} | null>(null);

  const defaultComponents = {
    enableZusTaxes: true,
    enableReports: true,
    enableAiAssistance: true,
    aiLicenseTier: 'ENTERPRISE', // BASIC, PRO, ENTERPRISE
    zusEmerytalna: 9.76,
    zusRentowa: 6.50,
    zdrowotna: 9.00,
    funduszPracy: 2.45,
    ppk: 1.50,
    taxProg1: 12.00,
    taxProg2: 32.00,
    kwotaWolna: 30000,
    kosztyUzyskania: 250.00
  };

  const [components, setComponents] = useState(defaultComponents);
  const [isEditingComponents, setIsEditingComponents] = useState(false);

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [newLeave, setNewLeave] = useState<any>({ employeeId: '', type: 'Wypoczynkowy', startDate: '', endDate: '', status: 'ACTIVE' });
  const [leaves, setLeaves] = useState<any[]>([]);

  useEffect(() => {
    if (!activeTenantId) return;

    // Load HR components settings
    const compRef = doc(db, 'hrSettings', activeTenantId);
    const unComp = onSnapshot(compRef, (docSnap) => {
      if (docSnap.exists()) {
        setComponents({...defaultComponents, ...docSnap.data()});
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'hrSettings'));

    const unProj = onSnapshot(query(collection(db, 'projects'), where('tenantId', '==', activeTenantId)), (snap) => {
      setFinProjects(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'projects'));

    const unEmp = onSnapshot(query(collection(db, 'employees'), where('tenantId', '==', activeTenantId)), (snap) => {
      setEmployees(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'employees'));

    const unTime = onSnapshot(query(collection(db, 'timeEntries'), where('tenantId', '==', activeTenantId)), (snap) => {
       setTimeEntries(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'timeEntries'));

    const unLeaves = onSnapshot(query(collection(db, 'leaves'), where('tenantId', '==', activeTenantId)), (snap) => {
       setLeaves(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'leaves'));

    const unDepts = onSnapshot(query(collection(db, 'hr_departments'), where('tenantId', '==', activeTenantId)), (snap) => {
      setDepartments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'hr_departments'));

    const unRoles = onSnapshot(query(collection(db, 'hr_roles'), where('tenantId', '==', activeTenantId)), (snap) => {
      setRoles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'hr_roles'));

    const unSettings = onSnapshot(doc(db, 'hrSettings', activeTenantId + '_skills'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSkillsDictionary(data.skills || []);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'hrSettings'));

    return () => {
      unComp();
      unProj();
      unEmp();
      unTime();
      unLeaves();
      unDepts();
      unRoles();
      unSettings();
    };
  }, [activeTenantId]);

  const b2bErrors = useMemo(() => employees.filter(e => e.contractType === 'B2B' && (!e.nip || e.nip.trim() === '' || e.nip.length !== 10)), [employees]);
  const uopErrors = useMemo(() => employees.filter(e => e.contractType === 'Umowa o pracę' && e.nationality === 'PL' && (!e.pesel || e.pesel.length !== 11 || !isValidPesel(e.pesel))), [employees]);
  const complianceIssuesCount = useMemo(() => employees.filter(e => e.status === 'INCOMPLETE').length + b2bErrors.length + uopErrors.length, [employees, b2bErrors, uopErrors]);

  useEffect(() => {
    if (!activeTenantId) return;
    const unsub = onSnapshot(query(collection(db, 'fin_projects'), where('tenantId', '==', activeTenantId)), (snap) => {
      setFinProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [activeTenantId]);

  const handleCreateProject = async (employeeId: string) => {
    if (!newProjectName.trim() || !activeTenantId) return;
    try {
       const docRef = await addDoc(collection(db, 'fin_projects'), {
          name: newProjectName.trim(),
          status: 'ACTIVE',
          tenantId: activeTenantId,
          createdAt: serverTimestamp()
       });
       await handleAssignProjectToEmployee(employeeId, { id: docRef.id, name: newProjectName.trim() });
       setNewProjectName('');
       setShowProjectModal({isOpen: false, employeeId: null});
    } catch (err) {
       handleFirestoreError(err, OperationType.CREATE, 'fin_projects');
    }
  };

  const handleAssignProjectToEmployee = async (employeeId: string, project: any) => {
     try {
        const emp = employees.find(e => e.id === employeeId);
        const currentAllocations = emp?.financeAllocations || [];
        const newAllocation = { 
           projectId: project.id, 
           projectName: project.name,
           percentage: 100, 
           costCenter: project.id, 
           validFrom: new Date().toISOString().split('T')[0], 
           validTo: '9999-12-31' 
        };
        await updateDoc(doc(db, 'employees', employeeId), {
           financeAllocations: [...currentAllocations, newAllocation],
           updatedAt: serverTimestamp()
        });
        setShowProjectModal({isOpen: false, employeeId: null});
     } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, 'employees');
     }
  };

  const openEmployeeModal = (emp?: any, forceErrorFocus?: boolean) => {
    const defaultData = { 
        firstName: '', lastName: '', middleName: '', namePronunciation: '', employeeNumber: '', employeeType: 'P',
        personalDataValidFrom: new Date().toISOString().split('T')[0], personalDataValidTo: '9999-12-31',
        email: '', privateEmail: '', privatePhone: '', pesel: '', nip: '', nationality: 'PL', role: '', roleValidFrom: new Date().toISOString().split('T')[0], roleValidTo: '9999-12-31', department: '', departmentValidFrom: new Date().toISOString().split('T')[0], departmentValidTo: '9999-12-31', manager: '', companyCode: '',
        schedules: [], workHistory: [], financeAllocations: [],
        contractType: 'Umowa o pracę', hourlyRate: 50, baseSalary: 0, salaryType: 'GROSS',
        whatsappNumber: '', whatsappConsent: false,
        vatType: 'STANDARD', vatRate: 23, 
        paymentMethod: 'BTR', bankAccount: '', swiftBic: '', isForeignBankAccount: false,
        workPermitType: '', workPermitValidTo: '',
        isStudent: false, isPensioner: false, pitZero: false, authorCosts: false,
        educationLevel: 'Wyższe', drivingLicenses: [],
        languages: [], skills: [],
        ohsTrainingType: 'Wstępne', ohsTrainingValidFrom: new Date().toISOString().split('T')[0], ohsTrainingValidTo: '9999-12-31', 
        medicalExamType: 'Wstępne', medicalExamValidFrom: new Date().toISOString().split('T')[0], medicalExamValidTo: '9999-12-31', 
        certificates: '', issuedEquipment: '',
        additions: [], deductions: [],
        status: 'INCOMPLETE',
        customFields: [] 
    };
    const employeeData = emp ? JSON.parse(JSON.stringify(emp)) : defaultData;
    if (typeof employeeData.skills === 'string') {
        employeeData.skills = employeeData.skills ? employeeData.skills.split(',').map((s: string) => ({ name: s.trim() })) : [];
    }
    
    if (forceErrorFocus && emp) {
       if (!emp.firstName || !emp.lastName) {
           setEmployeeModalTab('HR0002');
           setTimeout(() => {
               const el = document.getElementById(!emp.firstName ? 'input-firstname' : 'input-lastname');
               if (el) el.focus();
           }, 300);
       } else if (emp.contractType === 'Umowa o pracę' && emp.nationality === 'PL' && (!emp.pesel || emp.pesel.length !== 11 || !isValidPesel(emp.pesel))) {
           setEmployeeModalTab('HR0200');
           setTimeout(() => {
               const el = document.getElementById('input-pesel');
               if (el) el.focus();
           }, 300);
       } else if (emp.contractType === 'B2B' && (!emp.nip || emp.nip.trim() === '' || emp.nip.length !== 10)) {
           setEmployeeModalTab('HR0008');
           setTimeout(() => {
               const el = document.getElementById('input-nip');
               if (el) el.focus();
           }, 300);
       } else if (emp.nationality !== 'PL' && !emp.workPermitType) {
           setEmployeeModalTab('HR0200');
           setTimeout(() => {
               const el = document.getElementById('input-workpermit');
               if (el) el.focus();
           }, 300);
       } else {
           setEmployeeModalTab('HR0002');
       }
    } else if (!emp) {
       setEmployeeModalTab('HR0002');
    } else {
       setEmployeeModalTab('HR0002');
    }
    
    setNewEmployee(employeeData);
    setInitialEmployee(employeeData);
    setEmployeeAiHelper(null);
    setShowEmployeeModal(true);
  };

  const handleQuickAddDepartment = async () => {
     if (!activeTenantId) return;
     setOmNavigationOverlay({ isOpen: true, type: 'department' });
  };

  const handleQuickAddRole = async () => {
     if (!activeTenantId) return;
     setOmNavigationOverlay({ isOpen: true, type: 'role' });
  };

  const saveComponents = async () => {
    if (!activeTenantId) return;
    try {
      await setDoc(doc(db, 'hrSettings', activeTenantId), components, { merge: true });
      setIsEditingComponents(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'hrSettings');
    }
  };

  const calculateTotalHours = (userId: string) => {
     return timeEntries.filter(t => t.userId === userId).reduce((acc, curr) => acc + (curr.duration || 0), 0) / 60; // duration in minutes to hours
  };

  const generatePayslips = () => {
    // Generate simple blob and download for Payslips (list) mapping through employees and timeEntries
    let csv = "Employee,ContractType,TotalHours,BaseSalary,ZUS_Emerytalna,ZUS_Rentowa,Zdrowotna,TaxPIT,NetSalary,BruttoVAT(B2B),TypVAT\n";
    let errorFound = false;

    employees.forEach(emp => {
      if (!emp.hourlyRate && !emp.baseSalary) {
          setIsAnalyzingAi(true);
          setTimeout(() => {
              setAiFeedback({
                  message: `Przerwano kalkulację: Pracownik ${emp.name || emp.email} nie posiada zdefiniowanej stawki godzinowej ani podstawy. Zaktualizuj kartotekę.`,
                  legalBasis: "Wymóg wew. (Baza Wynagrodzeń)",
                  hasError: true
              });
              setIsAnalyzingAi(false);
          }, 1000);
          errorFound = true;
          return;
      }
    });

    if (errorFound) return;

    employees.forEach(emp => {
      const hrs = calculateTotalHours(emp.id);
      const isB2B = emp.contractType === 'B2B';
      
      // Calculate Gross Base Salary
      let baseSalary = 0;
      if (emp.baseSalary && emp.baseSalary > 0) {
          baseSalary = emp.baseSalary; // Has fixed monthly
      } else {
          baseSalary = hrs * (emp.hourlyRate || 50); // Hourly
      }

      // Very simple "net to gross" approx if salaryType === 'NET'
      if (emp.salaryType === 'NET' && !isB2B) {
         // rough approx, typically gross is ~1.35 * net in PL without exemptions
         let factor = 1.35;
         if (emp.isStudent || emp.pitZero) factor = 1.15; // lower multiplier
         baseSalary = baseSalary * factor;
      }

      let emer = 0, rent = 0, zdr = 0, pit = 0, netSalary = baseSalary, bruttoVAT = baseSalary;

      if (!isB2B && components.enableZusTaxes) {
         if (!emp.isStudent) { // Students < 26 standard exempt from ZUS
            emer = baseSalary * (components.zusEmerytalna / 100);
            rent = baseSalary * (components.zusRentowa / 100);
         }
         
         const baseForHealth = baseSalary - emer - rent;
         if (!emp.isStudent) {
            zdr = baseForHealth * (components.zdrowotna / 100);
         }

         const incomeTaxBase = baseSalary - emer - rent - (emp.authorCosts ? components.kosztyUzyskania * 2 : components.kosztyUzyskania);
         if (emp.pitZero || emp.isStudent) {
             pit = 0; // PIT-0 standard
         } else {
             pit = Math.max(0, incomeTaxBase * (components.taxProg1 / 100) - (components.kwotaWolna / 12));
         }

         netSalary = baseSalary - emer - rent - zdr - pit;
      }

      if (isB2B) {
          netSalary = baseSalary; // Netto is the calculated net base
          if (emp.vatType === 'EXEMPT' || emp.vatType === 'REVERSE_CHARGE') {
              bruttoVAT = baseSalary; // No VAT added
          } else {
              bruttoVAT = baseSalary * (1 + (emp.vatRate || 23) / 100); // B2B Brutto (w/ VAT)
          }
      }

      const vatInfo = isB2B ? (emp.vatType === 'EXEMPT' ? 'ZW' : emp.vatType === 'REVERSE_CHARGE' ? 'RC/Zagranica' : `${emp.vatRate || 23}%`) : '-';

      csv += `${emp.name || emp.email},${emp.contractType},${hrs.toFixed(2)},${baseSalary.toFixed(2)},${emer.toFixed(2)},${rent.toFixed(2)},${zdr.toFixed(2)},${pit.toFixed(2)},${netSalary.toFixed(2)},${isB2B ? bruttoVAT.toFixed(2) : '-'},${vatInfo}\n`;
    });
    downloadBlob(csv, 'lista_plac.csv', 'text/csv');
  };

  const generateXML = (type: string) => {
    let errorFound = false;
    employees.forEach(emp => {
      if (!emp.hourlyRate && !emp.baseSalary) {
          setIsAnalyzingAi(true);
          setTimeout(() => {
              setAiFeedback({
                  message: `Błąd eksportu do KEDU: Pracownik ${emp.name || emp.email} nie posiada zdefiniowanej stawki godzinowej ani podstawy. Zaktualizuj kartotekę przed wysyłką do ZUS.`,
                  legalBasis: "Wymóg wew. (Baza Wynagrodzeń)",
                  hasError: true
              });
              setIsAnalyzingAi(false);
          }, 1000);
          errorFound = true;
          return;
      }
    });

    if(errorFound) return;

    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const miesiac_rok = `${mm}${yyyy}`;
    
    if (type === 'KEDU') {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<KEDU wersja="5.0" xmlns="http://www.zus.pl/2019/KEDU_5_0">
\t<naglowek>
\t\t<program>
\t\t\t<producent>NoFiCo</producent>
\t\t\t<nazwa>Work OS</nazwa>
\t\t\t<wersja>1.0</wersja>
\t\t</program>
\t</naglowek>
\t<zestaw_dokumentow>
\t\t<dokument>
\t\t\t<ZUS_RCA id_dokumentu="1">
\t\t\t\t<naglowek>
\t\t\t\t\t<identyfikator_raportu>01 ${miesiac_rok}</identyfikator_raportu>
\t\t\t\t</naglowek>
\t\t\t\t<dane_platnika>
\t\t\t\t\t<nip>${activeTenantId?.replace(/[^0-9]/g, '') || '0000000000'}</nip>
\t\t\t\t\t<regon>000000000</regon>
\t\t\t\t\t<nazwa_skrocona>WSPÓLNIK</nazwa_skrocona>
\t\t\t\t</dane_platnika>
${employees.map((emp, index) => {
  if (emp.contractType === 'B2B') return ''; // Skip B2B to RCA
  const hrs = calculateTotalHours(emp.id);
  const salary = hrs * (emp.hourlyRate || emp.baseSalary);
  const emer = (salary * components.zusEmerytalna / 100).toFixed(2);
  const rent = (salary * components.zusRentowa / 100).toFixed(2);
  const zdr = (salary * components.zdrowotna / 100).toFixed(2);

  return `\t\t\t\t<raporty_imienne>
\t\t\t\t\t<ZUS_RCA_raport_imienny id_bloku="${index + 1}">
\t\t\t\t\t\t<dane_ubezpieczonego>
\t\t\t\t\t\t\t<pesel>${emp.pesel || '00000000000'}</pesel>
\t\t\t\t\t\t\t<nazwisko>${(emp.name || 'Kowalski').split(' ').pop()}</nazwisko>
\t\t\t\t\t\t\t<imie_pierwsze>${(emp.name || 'Jan').split(' ')[0]}</imie_pierwsze>
\t\t\t\t\t\t</dane_ubezpieczonego>
\t\t\t\t\t\t<zestawienie_naleznych_skladek>
\t\t\t\t\t\t\t<kod_tytulu_ubezpieczenia>011000</kod_tytulu_ubezpieczenia>
\t\t\t\t\t\t\t<podstawa_wymiaru_skladek_ubezp_spoleczne>${salary.toFixed(2)}</podstawa_wymiaru_skladek_ubezp_spoleczne>
\t\t\t\t\t\t\t<podstawa_wymiaru_skladek_ubezp_zdrowotne>${salary.toFixed(2)}</podstawa_wymiaru_skladek_ubezp_zdrowotne>
\t\t\t\t\t\t\t<skladka_na_ubezpieczenie_emerytalne>${emer}</skladka_na_ubezpieczenie_emerytalne>
\t\t\t\t\t\t\t<skladka_na_ubezpieczenie_rentowe>${rent}</skladka_na_ubezpieczenie_rentowe>
\t\t\t\t\t\t\t<skladka_na_ubezpieczenie_zdrowotne>${zdr}</skladka_na_ubezpieczenie_zdrowotne>
\t\t\t\t\t\t</zestawienie_naleznych_skladek>
\t\t\t\t\t</ZUS_RCA_raport_imienny>
\t\t\t\t</raporty_imienne>`;
}).join('\n')}
\t\t\t</ZUS_RCA>
\t\t</dokument>
\t</zestaw_dokumentow>
</KEDU>`;
      downloadBlob(xml, `KEDU_export_${miesiac_rok}.xml`, 'application/xml');
    } else if (type === 'PIT_11') {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Deklaracja xmlns="http://crd.gov.pl/wzor/2022/10/21/11838/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Naglowek>
    <KodFormularza>PIT-11</KodFormularza>
    <WariantFormularza>29</WariantFormularza>
    <Rok>${yyyy}</Rok>
  </Naglowek>
  <Podmiot1>
    <OsobaNiefizyczna>
      <NIP>${activeTenantId?.replace(/[^0-9]/g, '') || '0000000000'}</NIP>
      <PelnaNazwa>PODMIOT PODATKOWY (Z WORK OS)</PelnaNazwa>
    </OsobaNiefizyczna>
  </Podmiot1>
</Deklaracja>`;
      downloadBlob(xml, `PIT11_export_${yyyy}.xml`, 'application/xml');
    } else {
        const payload = `Płatnik: ${activeTenantId}\nTyp: ${type}\nRaport PFRON/MT940 bazuje na przeliczonych składnikach wynagrodzeń (${components.zusEmerytalna}%, itd.).`;
        downloadBlob(payload, `${type}_export.txt`, 'text/plain');
    }
  };

  const downloadBlob = (content: string, filename: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isValidPesel = (pesel: string) => {
    if (!/^\d{11}$/.test(pesel)) return false;
    const weights = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];
    let sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(pesel[i]) * weights[i];
    return (10 - (sum % 10)) % 10 === parseInt(pesel[10]);
  };

  const handleAnalyzeCompliance = () => {
    let err = false;
    const messages = [];

    if (!newEmployee.firstName && !newEmployee.lastName) {
      messages.push("- Brak Imienia i Nazwiska.");
      err = true;
    }
    if (newEmployee.contractType === 'Umowa o pracę' && newEmployee.nationality === 'PL' && !isValidPesel(newEmployee.pesel)) {
       messages.push("- Błędny lub brakujący numer PESEL (wymagany do RCA).");
       err = true;
    }
    if (newEmployee.contractType === 'B2B' && (!newEmployee.nip || newEmployee.nip.length < 10)) {
       messages.push("- B2B wymaga prawidłowego NIPu.");
       err = true;
    }
    if (newEmployee.contractType === 'B2B' && newEmployee.nip && newEmployee.nip.match(/^[A-Z]{2}/) && (!newEmployee.vatType || newEmployee.vatType === 'STANDARD')) {
       messages.push("- Wykryto NIP EU (zagraniczny). Podatnik B2B powinien prawdopodobnie używać Odwrotnego Obciążenia (VAT). Zweryfikuj typ VAT.");
    }
    if (newEmployee.nationality !== 'PL' && !newEmployee.workPermitType) {
       messages.push("- Cudzoziemiec wymaga określenia tytułu/pozwolenia na pracę.");
       err = true;
    }

    if (newEmployee.whatsappNumber && !newEmployee.whatsappConsent) {
       messages.push("- [UWAGA] Podano numer WhatsApp, ale brak zgody. Asystent wymaga aktualizacji polityki prywatności/RODO i wew. regulaminu pracy o 'komunikację via komunikatory'. Ostrzeżenie wysłane do HR.");
       // W pełnej wersji RODO NotificationService zarejestrowałby ten fakt w logach asystenta
       // i poinformował właściciela i HR.
    }

    if (err) {
      setEmployeeAiHelper({
        message: `Status: Niekompletne. Zapisanie utworzy szkic (DRAFT).\nZnaleziono braki blokujące pełne rozliczenie:\n${messages.join('\n')}`,
        isError: true
      });
      setNewEmployee({ ...newEmployee, status: 'INCOMPLETE' });
    } else {
      setEmployeeAiHelper({
        message: "Analiza prawno-formalna: Dane kandydata są kompletne. Gotowość do pełnej rejestracji i rozliczeń.",
        isError: false
      });
      setNewEmployee({ ...newEmployee, status: 'ACTIVE' });
    }
  };

  const handleAddLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenantId || !newLeave.employeeId || !newLeave.startDate || !newLeave.endDate) return;

    try {
      await addDoc(collection(db, 'leaves'), {
        ...newLeave,
        tenantId: activeTenantId,
        createdAt: serverTimestamp()
      });
      setShowLeaveModal(false);
      setNewLeave({ employeeId: '', type: 'Wypoczynkowy', startDate: '', endDate: '', status: 'ACTIVE' });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'leaves');
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenantId || (!newEmployee.firstName && !newEmployee.lastName)) return;

    // Combine name for backwards compatibility
    const combinedName = `${newEmployee.firstName} ${newEmployee.middleName ? newEmployee.middleName + ' ' : ''}${newEmployee.lastName}`.trim();

    setIsSaving(true);
    try {
      // Determine final status if AI verification wasn't clicked
      const finalStatus = employeeAiHelper?.isError ? 'INCOMPLETE' : (!employeeAiHelper ? 'INCOMPLETE' : newEmployee.status);
      
      const payload = {
        ...newEmployee,
        status: finalStatus,
        name: combinedName || 'Brak Imienia',
        tenantId: activeTenantId,
        updatedAt: serverTimestamp()
      };
      
      if (newEmployee.id) {
         await updateDoc(doc(db, 'employees', newEmployee.id), payload);
      } else {
         const { id, ...dataToSave } = payload as any;
         await addDoc(collection(db, 'employees'), {
            ...dataToSave,
            createdAt: serverTimestamp()
         });
      }
      
      setShowEmployeeModal(false);
      setNewEmployee({ 
        firstName: '', lastName: '', middleName: '', namePronunciation: '', employeeNumber: '', employeeType: 'P',
        personalDataValidFrom: new Date().toISOString().split('T')[0], personalDataValidTo: '9999-12-31',
        email: '', privateEmail: '', privatePhone: '', pesel: '', nip: '', nationality: 'PL', role: '', roleValidFrom: '', roleValidTo: '9999-12-31', department: '', departmentValidFrom: '', departmentValidTo: '9999-12-31', manager: '', companyCode: '',
        schedules: [], workHistory: [], financeAllocations: [],
        whatsappNumber: '', whatsappConsent: false,
        contractType: 'Umowa o pracę', hourlyRate: 50, baseSalary: 0, salaryType: 'GROSS',
        vatType: 'STANDARD', vatRate: 23, 
        paymentMethod: 'BTR', bankAccount: '', swiftBic: '', isForeignBankAccount: false,
        workPermitType: '', workPermitValidTo: '',
        isStudent: false, isPensioner: false, pitZero: false, authorCosts: false,
        educationLevel: 'Wyższe', drivingLicenses: [],
        languages: [], skills: [],
        ohsTrainingType: 'Wstępne', ohsTrainingValidFrom: '', ohsTrainingValidTo: '', 
        medicalExamType: 'Wstępne', medicalExamValidFrom: '', medicalExamValidTo: '', 
        certificates: '', issuedEquipment: '',
        additions: [], deductions: [],
        status: 'INCOMPLETE',
        customFields: [] 
      });
      setEmployeeAiHelper(null);
    } catch (err) {
      console.error(err);
      alert("Wystąpił błąd podczas zapisywania profilu pracownika.");
      handleFirestoreError(err, newEmployee.id ? OperationType.UPDATE : OperationType.CREATE, 'employees');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {isSkillModalOpen && (
         <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
               <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <div>
                     <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Słownik Umiejętności</h3>
                     <p className="text-xs text-slate-500 font-medium mt-1">Definicje krzyżowe (Cross-mapping) z modułami biznesowymi</p>
                  </div>
                  <button onClick={() => setIsSkillModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
               </div>
               <div className="p-6 overflow-y-auto flex-1">
                  <div className="space-y-4">
                     {skillsDictionary.map((skill, index) => (
                        <div key={skill.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                           <div className="flex items-center gap-4 mb-3">
                              <div className="flex-1">
                                 <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">Nazwa umiejętności</label>
                                 <input type="text" value={skill.name} onChange={(e) => {
                                    const arr = [...skillsDictionary];
                                    arr[index].name = e.target.value;
                                    setSkillsDictionary(arr);
                                 }} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 outline-none" />
                              </div>
                              <div className="w-10 flex flex-col items-center justify-center mt-3">
                                 <button onClick={() => {
                                    setSkillsDictionary(skillsDictionary.filter((_, i) => i !== index));
                                 }} className="text-rose-500 hover:text-rose-700"><X size={18}/></button>
                              </div>
                           </div>
                           <div>
                              <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">Dostępność per moduł (Cross-mapping)</label>
                              <div className="flex flex-wrap gap-2">
                                 {['Wszystkie', ...MODULE_REGISTRY.map(m => m.name)].map(mod => {
                                    const isSelected = skill.modules?.includes(mod);
                                    return (
                                       <button key={mod} onClick={() => {
                                          const arr = [...skillsDictionary];
                                          if (isSelected) {
                                             arr[index].modules = skill.modules.filter((m: string) => m !== mod);
                                          } else {
                                             if (mod === 'Wszystkie') arr[index].modules = ['Wszystkie'];
                                             else {
                                                arr[index].modules = [mod, ...skill.modules.filter((m: string) => m !== 'Wszystkie')];
                                             }
                                          }
                                          setSkillsDictionary(arr);
                                       }} className={`text-[10px] px-2 py-1 rounded-full font-bold transition-all ${isSelected ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-white text-slate-400 border border-slate-200 hover:border-indigo-200'}`}>
                                          {mod}
                                       </button>
                                    );
                                 })}
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
                  <button onClick={() => {
                     setSkillsDictionary([...skillsDictionary, { id: 'S' + Date.now(), name: '', modules: ['Wszystkie'] }]);
                  }} className="mt-4 w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold text-xs transition-colors">+ Dodaj Nową Umiejętność</button>
               </div>
               <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
                  <button onClick={async () => {
                     try {
                        const loadingToast = document.createElement('div');
                        loadingToast.textContent = 'Zapisywanie...';
                        await setDoc(doc(db, 'hrSettings', activeTenantId + '_skills'), { skills: skillsDictionary }, { merge: true });
                        setIsSkillModalOpen(false);
                     } catch (err) {
                        handleFirestoreError(err, OperationType.UPDATE, 'hrSettings');
                     }
                  }} className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors">
                    Zapisz Słownik
                  </button>
               </div>
            </div>
         </div>
      )}
      {showEmployeeModal && (
        <div className={`fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all ${isModalMaximized ? 'p-0' : 'p-4'}`}>
          <div className={`bg-white shadow-2xl flex flex-col w-full overflow-hidden animate-in zoom-in-95 duration-300 ${isModalMaximized ? 'h-full max-w-full rounded-none' : 'max-w-4xl h-[90vh] rounded-[2rem]'}`}>
             <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50 relative overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 p-6 opacity-5"><UserPlus size={100} /></div>
                <div className="relative z-10">
                   <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Nowy Pracownik</h3>
                   <p className="text-xs text-slate-500 font-medium mt-1">Uzupełnij kartotekę i uaktywnij AI do weryfikacji.</p>
                </div>
                <div className="flex items-center gap-2 relative z-10">
                   <button type="button" onClick={() => setIsModalMaximized(!isModalMaximized)} className="text-slate-400 hover:text-slate-600 bg-white px-4 py-2 rounded-[2rem] shadow-sm text-[10px] font-black uppercase tracking-widest border border-slate-100">{isModalMaximized ? 'Powiększ (0) - Powrót' : 'Powiększ (+)'}</button>
                   <button type="button" onClick={() => setShowEmployeeModal(false)} className="text-slate-400 hover:text-slate-600 bg-white p-2 rounded-full shadow-sm border border-slate-100"><X size={20} /></button>
                </div>
             </div>
             <div className="bg-slate-50 border-b border-slate-200 px-8 flex gap-2 overflow-x-auto shrink-0 scrollbar-hide">
                {[
                   { id: 'HR0002', code: 'HR0002', name: 'Dane Osobowe', requiredTier: 'FREE' },
                   { id: 'HR0001', code: 'HR0001', name: 'Zatrudnienie', requiredTier: 'FREE' },
                   { id: 'HR0008', code: 'HR0008', name: 'Wynagrodzenie', requiredTier: 'FREE' },
                   { id: 'HR0200', code: 'HR0200', name: 'Prawne/ZUS', requiredTier: 'PRO' },
                   { id: 'HR0024', code: 'HR0024', name: 'Kwalifikacje', requiredTier: 'PRO' },
                   { id: 'HR0032', code: 'HR0032', name: 'Majątek (Logistyka)', requiredTier: 'ENTERPRISE' },
                   { id: 'ZHR001', code: 'ZHR001', name: 'Custom Fields', requiredTier: 'ENTERPRISE' }
                ].filter(tab => {
                   // Tutaj w przyszłości można zastosować sprawdzanie uprawnień / licencji (np. PRO / ENTERPRISE)
                   // aby u JDG ukrywać skomplikowane zakładki, których nie potrzebują.
                   // np. if (tab.requiredTier === 'ENTERPRISE' && currentTier !== 'ENTERPRISE') return false;
                   return true;
                }).map((tab) => (
                   <button 
                      key={tab.id}
                      type="button"
                      onClick={() => setEmployeeModalTab(tab.id as any)}
                      className={`py-3 px-2 flex flex-col items-center justify-center min-w-[80px] border-b-2 transition-colors ${employeeModalTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                   >
                      <span className="text-[9px] font-black opacity-50 mb-0.5 tracking-widest">{tab.code}</span>
                      <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">{tab.name}</span>
                   </button>
                ))}
             </div>
             <form onSubmit={handleAddEmployee} className="p-8 space-y-6 overflow-y-auto flex-1">
                {employeeModalTab === 'HR0002' && (
                  <div className={`grid gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300 ${isModalMaximized ? 'grid-cols-3' : 'grid-cols-2'}`}>
                     <div>
                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${isComplianceMode && !newEmployee.firstName ? 'text-rose-600' : 'text-slate-400'}`}>Imię *</label>
                        <input id="input-firstname" required type="text" value={newEmployee.firstName} onChange={e => setNewEmployee({...newEmployee, firstName: e.target.value})} className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-colors ${isComplianceMode && !newEmployee.firstName ? 'border-rose-500 bg-rose-50 placeholder-rose-300 animate-[pulse_2s_ease-in-out_infinite] ring-2 ring-rose-200 focus:ring-0' : 'border-slate-200 focus:border-blue-500'}`} placeholder="Jan" />
                     </div>
                     <div>
                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${isComplianceMode && !newEmployee.lastName ? 'text-rose-600' : 'text-slate-400'}`}>Nazwisko *</label>
                        <input id="input-lastname" required type="text" value={newEmployee.lastName} onChange={e => setNewEmployee({...newEmployee, lastName: e.target.value})} className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-colors ${isComplianceMode && !newEmployee.lastName ? 'border-rose-500 bg-rose-50 placeholder-rose-300 animate-[pulse_2s_ease-in-out_infinite] ring-2 ring-rose-200 focus:ring-0' : 'border-slate-200 focus:border-blue-500'}`} placeholder="Kowalski" />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Drugie Imię (Opcj.)</label>
                        <input type="text" value={newEmployee.middleName} onChange={e => setNewEmployee({...newEmployee, middleName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors" placeholder="Piotr" />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Wymowa (np. zagraniczne)</label>
                        <input type="text" value={newEmployee.namePronunciation} onChange={e => setNewEmployee({...newEmployee, namePronunciation: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors" placeholder="Dżon" />
                     </div>
                     <div className="col-span-2 grid grid-cols-2 gap-6 bg-white p-4 rounded-xl border border-slate-200">
                        <div>
                           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Metoda Płatności</label>
                           <select value={newEmployee.paymentMethod} onChange={e => setNewEmployee({...newEmployee, paymentMethod: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors">
                              <option value="BTR">Przelew bankowy</option>
                              <option value="CASH">Gotówka (kasa firmowa)</option>
                           </select>
                        </div>
                        {newEmployee.paymentMethod === 'BTR' && (
                           <div>
                              <div className="flex justify-between items-center mb-2">
                                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Numer Konta Bankowego</label>
                                 <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                                    <input type="checkbox" checked={newEmployee.isForeignBankAccount} onChange={e => setNewEmployee({...newEmployee, isForeignBankAccount: e.target.checked})} className="rounded text-blue-600" />
                                    Zagraniczne
                                 </label>
                              </div>
                              <div className="space-y-3">
                                 <input type="text" value={newEmployee.bankAccount} onChange={e => {
                                    let val = e.target.value.replace(/\s+/g, '');
                                    if (!newEmployee.isForeignBankAccount && !isNaN(Number(val)) && val.length > 0) {
                                       val = val.match(/.{1,4}/g)?.join(' ') || val; // simple formatting for PL
                                    }
                                    setNewEmployee({...newEmployee, bankAccount: val});
                                 }} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors" placeholder={newEmployee.isForeignBankAccount ? "IBAN (bez przedrostka PL)" : "00 0000 0000 0000 0000 0000 0000"} />
                                 {newEmployee.isForeignBankAccount && (
                                    <input type="text" value={newEmployee.swiftBic || ''} onChange={e => setNewEmployee({...newEmployee, swiftBic: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors" placeholder="KOD SWIFT / BIC" />
                                 )}
                              </div>
                           </div>
                        )}
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Email Służbowy</label>
                        <input type="email" value={newEmployee.email} onChange={e => setNewEmployee({...newEmployee, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors" placeholder="jan@firma.pl" />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Email Prywatny</label>
                        <input type="email" value={newEmployee.privateEmail || ''} onChange={e => setNewEmployee({...newEmployee, privateEmail: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors" placeholder="jan.prywatny@gmail.com" />
                        <p className="mt-1 text-[9px] text-slate-400 font-bold">Wymagana zgoda (RODO) na wykorzystywanie do celów służbowych.</p>
                     </div>
                     <div className={`${isModalMaximized ? 'col-span-3' : 'col-span-2'} grid grid-cols-2 gap-4 border border-slate-100 p-4 rounded-xl bg-slate-50 relative`}>
                        <div className="col-span-2 md:col-span-1">
                           <label className="block text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Służbowy WhatsApp Business API</label>
                           <input type="text" value={newEmployee.whatsappNumber || ''} onChange={e => setNewEmployee({...newEmployee, whatsappNumber: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 transition-colors mb-3" placeholder="+48 123 456 789 (Firmowy)" />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                           <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Prywatny Numer Telefonu (Kontakt)</label>
                           <input type="text" value={newEmployee.privatePhone || ''} onChange={e => setNewEmployee({...newEmployee, privatePhone: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors mb-3" placeholder="+48 987 654 321" />
                        </div>
                        <div className="col-span-2">
                           <label className="flex items-start gap-2 text-[10px] text-slate-500 font-medium">
                              <input type="checkbox" checked={newEmployee.whatsappConsent || false} onChange={e => setNewEmployee({...newEmployee, whatsappConsent: e.target.checked})} className="mt-0.5 rounded text-emerald-600 border-slate-300 focus:ring-emerald-600" />
                              <span className="leading-tight">
                                 Pracownik wyraził świadomą zgodę na służbową komunikację via prywatny nr WhatsApp (jeśli podano). Wymagane aktualizacje regulaminu pracy zgłoszone do HR. (Zaznacz, to podstawa Prawna/RODO).
                              </span>
                           </label>
                        </div>
                     </div>
                     <div className="hidden">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Stanowisko</label>
                        <input type="text" value={newEmployee.role} onChange={e => setNewEmployee({...newEmployee, role: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors" placeholder="np. Senior Developer" />
                     </div>
                     <div className="hidden">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Dział (Struktura)</label>
                        <input type="text" value={newEmployee.department} onChange={e => setNewEmployee({...newEmployee, department: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors" placeholder="IT" />
                     </div>
                     <div className="hidden">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Miejsce Pracy / Biuro</label>
                        <input type="text" value={newEmployee.workplace} onChange={e => setNewEmployee({...newEmployee, workplace: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors" placeholder="Warszawa, Złota 44" />
                     </div>
                     <div className="hidden">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Przypisany Projekt</label>
                        <input type="text" value={newEmployee.assignedProject} onChange={e => setNewEmployee({...newEmployee, assignedProject: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors" placeholder="Projekt X" />
                     </div>
                  </div>
                )}

                {employeeModalTab === 'HR0001' && (
                  <div className={`grid gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300 ${isModalMaximized ? 'grid-cols-3' : 'grid-cols-2'}`}>
                     <div className="col-span-full ring-1 ring-slate-200 bg-white p-4 rounded-xl flex gap-4 md:flex-row flex-col">
                        <div className="flex-1">
                           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Typ Obiektu</label>
                           <select value={newEmployee.employeeType} onChange={e => setNewEmployee({...newEmployee, employeeType: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors">
                              <option value="P">Pracownik Wybrany (P)</option>
                              <option value="K">Kandydat Wstępny (K)</option>
                              <option value="Z">Zewnętrzny B2B/Kontraktor (Z)</option>
                           </select>
                        </div>
                        <div className="flex-1">
                           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Numer SAP/SAP HR (Opcj.)</label>
                           <input type="text" value={newEmployee.employeeNumber || ''} onChange={e => setNewEmployee({...newEmployee, employeeNumber: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors uppercase" placeholder="np. ERP-1004" />
                        </div>
                     </div>
                     <div className="col-span-full border-t border-slate-100 pt-2"></div>
                     <div className="flex flex-col gap-2 relative">
                        <div className="flex justify-between items-center bg-slate-100 p-2 rounded-t-xl border border-b-0 border-slate-200">
                           <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest pl-2">Stanowisko (Role)</label>
                           <button type="button" onClick={handleQuickAddRole} className="text-[9px] font-black text-slate-900 bg-white border border-slate-200 px-2 py-1 rounded uppercase hover:bg-slate-50 shadow-sm">+ Nowe</button>
                        </div>
                        <select value={newEmployee.role} onChange={e => setNewEmployee({...newEmployee, role: e.target.value})} className="w-full bg-white border border-slate-200 rounded-b-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors">
                           <option value="">Wybierz stanowisko...</option>
                           {roles.map(r => (
                             <option key={r.id} value={r.name}>{r.name}</option>
                           ))}
                        </select>
                        <div className="flex gap-2">
                           <div className="flex-1">
                              <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 mt-1">Ważne Od</label>
                              <input type="date" value={newEmployee.roleValidFrom || ''} onChange={e => setNewEmployee({...newEmployee, roleValidFrom: e.target.value})} className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-slate-50 font-bold" />
                           </div>
                           <div className="flex-1">
                              <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 mt-1">Ważne Do</label>
                              <input type="date" value={newEmployee.roleValidTo || ''} onChange={e => setNewEmployee({...newEmployee, roleValidTo: e.target.value})} className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-slate-50 font-bold" />
                           </div>
                        </div>
                     </div>
                     <div className="flex flex-col gap-2 relative">
                        <div className="flex justify-between items-center bg-slate-100 p-2 rounded-t-xl border border-b-0 border-slate-200">
                           <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest pl-2">Dział (Węzeł OM)</label>
                           <button type="button" onClick={handleQuickAddDepartment} className="text-[9px] font-black text-slate-900 bg-white border border-slate-200 px-2 py-1 rounded uppercase hover:bg-slate-50 shadow-sm">+ Nowy</button>
                        </div>
                        <select value={newEmployee.department} onChange={e => setNewEmployee({...newEmployee, department: e.target.value})} className="w-full bg-white border border-slate-200 rounded-b-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors">
                           <option value="">Wybierz dział...</option>
                           {departments.map(d => (
                             <option key={d.id} value={d.name}>{d.name}</option>
                           ))}
                        </select>
                        <div className="flex gap-2">
                           <div className="flex-1">
                              <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 mt-1">Ważne Od</label>
                              <input type="date" value={newEmployee.departmentValidFrom || ''} onChange={e => setNewEmployee({...newEmployee, departmentValidFrom: e.target.value})} className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-slate-50 font-bold" />
                           </div>
                           <div className="flex-1">
                              <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 mt-1">Ważne Do</label>
                              <input type="date" value={newEmployee.departmentValidTo || ''} onChange={e => setNewEmployee({...newEmployee, departmentValidTo: e.target.value})} className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-slate-50 font-bold" />
                           </div>
                        </div>
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Bezpośredni Przełożony</label>
                        <input type="text" value={newEmployee.manager || ''} onChange={e => setNewEmployee({...newEmployee, manager: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors" placeholder="Jan Kowalski (Dyrektor IT)" />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Jednostka Biznesowa / Spółka z Grupy</label>
                        <input type="text" value={newEmployee.companyCode || ''} onChange={e => setNewEmployee({...newEmployee, companyCode: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors" placeholder="Global Corp Sp. z o.o." />
                     </div>
                     <div className="col-span-full border-t border-slate-100 pt-6"></div>
                     <div className="col-span-full border border-slate-100 bg-slate-50 p-4 rounded-xl mt-4">
                        <div className="flex justify-between items-center mb-4">
                           <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">Konta GL i Centra Kosztów (MPK/WBS) - Alokacje</h4>
                           <button type="button" className="text-[9px] font-black bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded uppercase" onClick={() => setNewEmployee({...newEmployee, financeAllocations: [...(newEmployee.financeAllocations || []), {type: 'MPK', code: '', percent: 100, glAccount: '', validFrom: new Date().toISOString().split('T')[0], validTo: '9999-12-31'}]})}>+ Dodaj Wymiar Finansowy</button>
                        </div>
                        {(!newEmployee.financeAllocations || newEmployee.financeAllocations.length === 0) && (
                           <p className="text-xs text-slate-400 font-medium italic">Wykorzystuje domyślne MPK ze struktury organizacyjnej działu pracownika (dziedziczenie OM).</p>
                        )}
                        <div className="space-y-3">
                           {newEmployee.financeAllocations?.map((alloc: any, idx: number) => (
                              <div key={idx} className="flex flex-col gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm relative pr-10">
                                 <button type="button" onClick={() => {
                                       const arr = newEmployee.financeAllocations.filter((_: any, i: number) => i !== idx);
                                       setNewEmployee({...newEmployee, financeAllocations: arr});
                                    }} className="absolute top-3 right-3 text-rose-500 hover:bg-rose-50 p-1.5 rounded transition-colors"><X size={16} /></button>
                                 <div className="flex flex-wrap md:flex-nowrap gap-3 items-end">
                                    <div className="w-24">
                                       <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Typ Alokacji</label>
                                       <select value={alloc.type} onChange={e => { const a = [...newEmployee.financeAllocations]; a[idx].type = e.target.value; setNewEmployee({...newEmployee, financeAllocations: a}); }} className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold">
                                          <option value="MPK">MPK</option>
                                          <option value="PROJEKT">PROJEKT (WBS)</option>
                                       </select>
                                    </div>
                                    <div className="flex-1 min-w-[120px]">
                                       <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Kod (MPK/WBS)</label>
                                       {alloc.type === 'PROJEKT' ? (
                                           <div className="flex items-center gap-1">
                                              <select value={alloc.code} onChange={e => { const a = [...newEmployee.financeAllocations]; a[idx].code = e.target.value; setNewEmployee({...newEmployee, financeAllocations: a}); }} className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold">
                                                 <option value="">Wybierz projekt...</option>
                                                 {finProjects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                              </select>
                                              <button type="button" onClick={() => setPromptOverlay({isOpen: true, config: {title: 'Nazwa nowego projektu:', onSave: async (val: string) => {
                                                  if(!val) return;
                                                  try {
                                                     await addDoc(collection(db, 'projects'), { name: val, tenantId: activeTenantId, status: 'PLANNING', createdAt: serverTimestamp() });
                                                     const a = [...newEmployee.financeAllocations]; a[idx].code = val; setNewEmployee({...newEmployee, financeAllocations: a});
                                                  } catch(err) { handleFirestoreError(err, OperationType.CREATE, 'projects'); }
                                              }}})} className="p-2 bg-slate-100 text-slate-500 hover:text-blue-600 rounded whitespace-nowrap text-xs font-bold transition-colors">+</button>
                                           </div>
                                       ) : (
                                           <select value={alloc.code} onChange={e => { const a = [...newEmployee.financeAllocations]; a[idx].code = e.target.value; setNewEmployee({...newEmployee, financeAllocations: a}); }} className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold">
                                              <option value="">Wybierz MPK...</option>
                                              {departments.map(d => <option key={d.id} value={d.costCenter || d.name}>{d.name} {d.costCenter ? `(${d.costCenter})` : ''}</option>)}
                                           </select>
                                       )}
                                    </div>
                                    <div className="flex-1 min-w-[120px]">
                                       <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Konto GL FI</label>
                                       <input type="text" value={alloc.glAccount} onChange={e => { const a = [...newEmployee.financeAllocations]; a[idx].glAccount = e.target.value; setNewEmployee({...newEmployee, financeAllocations: a}); }} className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-blue-600" placeholder="np. 404-10 (Wynagrodzenia)" />
                                    </div>
                                    <div className="w-20">
                                       <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Procent %</label>
                                       <input type="number" min="0" max="100" value={alloc.percent} onChange={e => { const a = [...newEmployee.financeAllocations]; a[idx].percent = parseInt(e.target.value) || 0; setNewEmployee({...newEmployee, financeAllocations: a}); }} className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-center" />
                                    </div>
                                    <div className="w-28">
                                       <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Od</label>
                                       <input type="date" value={alloc.validFrom} onChange={e => { const a = [...newEmployee.financeAllocations]; a[idx].validFrom = e.target.value; setNewEmployee({...newEmployee, financeAllocations: a}); }} className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold" />
                                    </div>
                                    <div className="w-28">
                                       <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Do</label>
                                       <input type="date" value={alloc.validTo} onChange={e => { const a = [...newEmployee.financeAllocations]; a[idx].validTo = e.target.value; setNewEmployee({...newEmployee, financeAllocations: a}); }} className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold" />
                                    </div>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                     <div className="col-span-full border border-slate-100 bg-slate-50 p-4 rounded-xl">
                        <div className="flex justify-between items-center mb-4">
                           <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">Harmonogram / Elastyczny Czas i Miejsca Pracy</h4>
                           <button type="button" className="text-[9px] font-black bg-blue-50 text-blue-600 px-3 py-1.5 rounded uppercase" onClick={() => setNewEmployee({...newEmployee, schedules: [...(newEmployee.schedules || []), {type: 'WEEKLY', mode: 'FIELD', location: '', daysInfo: '', timeFrom: '08:00', timeTo: '16:00'}]})}>+ Dodaj Regułę Harmonogramu</button>
                        </div>
                        {(!newEmployee.schedules || newEmployee.schedules.length === 0) && (
                           <p className="text-xs text-slate-400 font-medium italic">Wykorzystuje globalne biuro domyślne dla całej firmy.</p>
                        )}
                        <div className="space-y-3">
                           {newEmployee.schedules?.map((sch: any, idx: number) => (
                              <div key={idx} className="flex flex-col gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm relative pr-10">
                                 <button type="button" onClick={() => {
                                       const arr = newEmployee.schedules.filter((_: any, i: number) => i !== idx);
                                       setNewEmployee({...newEmployee, schedules: arr});
                                    }} className="absolute top-3 right-3 text-rose-500 hover:bg-rose-50 p-1.5 rounded transition-colors"><X size={16} /></button>
                                 <div className="flex flex-wrap md:flex-nowrap gap-3 items-end">
                                    <div className="w-36">
                                       <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Typ Reguły</label>
                                       <select value={sch.type} onChange={e => {
                                          const arr = [...newEmployee.schedules]; arr[idx].type = e.target.value; setNewEmployee({...newEmployee, schedules: arr});
                                       }} className="w-full bg-slate-50 border border-slate-100 rounded px-3 py-2 text-xs font-bold text-slate-700 outline-none">
                                          <option value="WEEKLY">Co tydzień</option>
                                          <option value="DATES">Wybrane Daty</option>
                                          <option value="PERMANENT">Stałe przypisanie</option>
                                       </select>
                                    </div>
                                    <div className="w-40">
                                       <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Miejsce / Tryb</label>
                                       <select value={sch.mode} onChange={e => {
                                          const arr = [...newEmployee.schedules]; arr[idx].mode = e.target.value; setNewEmployee({...newEmployee, schedules: arr});
                                       }} className="w-full bg-slate-50 border border-slate-100 rounded px-3 py-2 text-xs font-bold text-slate-700 outline-none">
                                          <option value="STATIONARY">Biuro (Teren Firmy)</option>
                                          <option value="REMOTE">Zdalnie (Dom)</option>
                                          <option value="FIELD">U Klienta / Serwis</option>
                                       </select>
                                    </div>
                                    <div className="flex-1 min-w-[150px]">
                                       <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{sch.mode === 'FIELD' ? 'Nazwa Klienta / Adres' : 'Uwagi / Projekt'}</label>
                                       <input type="text" value={sch.location} onChange={e => {
                                          const arr = [...newEmployee.schedules]; arr[idx].location = e.target.value; setNewEmployee({...newEmployee, schedules: arr});
                                       }} className="w-full bg-slate-50 border border-slate-100 rounded px-3 py-2 text-xs font-bold text-slate-700 outline-none" placeholder={sch.mode === 'FIELD' ? "np. Klient X - Warszawa" : "Opcjonalie..."} />
                                    </div>
                                 </div>
                                 <div className="flex flex-wrap md:flex-nowrap gap-3 items-end">
                                    <div className="flex-1">
                                       <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{sch.type === 'WEEKLY' ? 'Dni Tygodnia (np. Każdy poniedziałek i wtorek)' : (sch.type === 'DATES' ? 'W Datach (np. 5, 12, 18 i 25 czerwca)' : 'Od Kiedy')}</label>
                                       <input type="text" value={sch.daysInfo} onChange={e => {
                                          const arr = [...newEmployee.schedules]; arr[idx].daysInfo = e.target.value; setNewEmployee({...newEmployee, schedules: arr});
                                       }} className="w-full bg-slate-50 border border-slate-100 rounded px-3 py-2 text-xs font-bold text-slate-700 outline-none" placeholder={sch.type === 'WEEKLY' ? "np. Pn, Śr, Pt" : (sch.type === 'DATES' ? "5, 12, 28 listopada" : "Na stałe")} />
                                    </div>
                                    <div className="w-24">
                                       <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Godz. Od</label>
                                       <input type="time" value={sch.timeFrom} onChange={e => {
                                          const arr = [...newEmployee.schedules]; arr[idx].timeFrom = e.target.value; setNewEmployee({...newEmployee, schedules: arr});
                                       }} className="w-full bg-slate-50 border border-slate-100 rounded px-3 py-2 text-xs font-bold text-slate-700 outline-none" />
                                    </div>
                                    <div className="w-24">
                                       <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Godz. Do</label>
                                       <input type="time" value={sch.timeTo} onChange={e => {
                                          const arr = [...newEmployee.schedules]; arr[idx].timeTo = e.target.value; setNewEmployee({...newEmployee, schedules: arr});
                                       }} className="w-full bg-slate-50 border border-slate-100 rounded px-3 py-2 text-xs font-bold text-slate-700 outline-none" />
                                    </div>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                     <div className="col-span-full border border-slate-100 bg-slate-50 p-4 rounded-xl">
                        <div className="flex justify-between items-center mb-4">
                           <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">Historia Alokacji / Zrealizowanych Zadań</h4>
                           <button type="button" className="text-[9px] font-black bg-blue-50 text-blue-600 px-3 py-1.5 rounded uppercase" onClick={() => setNewEmployee({...newEmployee, workHistory: [...(newEmployee.workHistory || []), {date: new Date().toISOString().split('T')[0], location: '', timeFrom: '08:00', timeTo: '16:00', confirmed: true}]})}>+ Dodaj Wpis Historyczny</button>
                        </div>
                        {(!newEmployee.workHistory || newEmployee.workHistory.length === 0) && (
                           <p className="text-xs text-slate-400 font-medium italic">Brak zapisanej historii zrealizowanych serwisów i oddelegowań pracownika. Tutaj w przyszłości można wyświetlać faktyczne potwierdzenia z nawigacji/GPS lub odklikania przez pracownika.</p>
                        )}
                        <div className="space-y-3">
                        {newEmployee.workHistory?.map((hist: any, idx: number) => (
                           <div key={idx} className="flex flex-wrap md:flex-nowrap gap-3 items-end bg-white p-3 rounded-xl border border-slate-200">
                              <div className="w-40">
                                 <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Data</label>
                                 <input type="date" value={hist.date} onChange={e => {
                                    const arr = [...newEmployee.workHistory]; arr[idx].date = e.target.value; setNewEmployee({...newEmployee, workHistory: arr});
                                 }} className="w-full bg-slate-50 border border-slate-100 rounded px-3 py-2 text-xs font-bold text-slate-700 outline-none" />
                              </div>
                              <div className="w-24">
                                 <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Od</label>
                                 <input type="time" value={hist.timeFrom} onChange={e => {
                                    const arr = [...newEmployee.workHistory]; arr[idx].timeFrom = e.target.value; setNewEmployee({...newEmployee, workHistory: arr});
                                 }} className="w-full bg-slate-50 border border-slate-100 rounded px-3 py-2 text-xs font-bold text-slate-700 outline-none" />
                              </div>
                              <div className="w-24">
                                 <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Do</label>
                                 <input type="time" value={hist.timeTo} onChange={e => {
                                    const arr = [...newEmployee.workHistory]; arr[idx].timeTo = e.target.value; setNewEmployee({...newEmployee, workHistory: arr});
                                 }} className="w-full bg-slate-50 border border-slate-100 rounded px-3 py-2 text-xs font-bold text-slate-700 outline-none" />
                              </div>
                              <div className="flex-1 min-w-[200px]">
                                 <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Lokalizacja / Faktycznie był u...</label>
                                 <input type="text" value={hist.location} onChange={e => {
                                    const arr = [...newEmployee.workHistory]; arr[idx].location = e.target.value; setNewEmployee({...newEmployee, workHistory: arr});
                                 }} className="w-full bg-slate-50 border border-slate-100 rounded px-3 py-2 text-xs font-bold text-slate-700 outline-none" placeholder="np. Klient X - Adres" />
                              </div>
                              <div className="w-32">
                                 <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Potwierdzone?</label>
                                 <select value={hist.confirmed ? 'TAK' : 'NIE'} onChange={e => {
                                    const arr = [...newEmployee.workHistory]; arr[idx].confirmed = e.target.value === 'TAK'; setNewEmployee({...newEmployee, workHistory: arr});
                                 }} className="w-full bg-slate-50 border border-slate-100 rounded px-3 py-2 text-xs font-bold text-slate-700 outline-none">
                                    <option value="TAK">TAK (GPS/Szef)</option>
                                    <option value="NIE">NIE (Tylko Plan)</option>
                                 </select>
                              </div>
                              <button type="button" onClick={() => {
                                    const arr = newEmployee.workHistory.filter((_: any, i: number) => i !== idx);
                                    setNewEmployee({...newEmployee, workHistory: arr});
                                 }} className="text-rose-500 hover:bg-rose-50 p-2 rounded transition-colors mb-0.5"><X size={16} /></button>
                           </div>
                        ))}
                        </div>
                     </div>
                  </div>
                )}

                {employeeModalTab === 'HR0008' && (
                  <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                     <div className="col-span-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Typ Umowy</label>
                        <select value={newEmployee.contractType} onChange={e => setNewEmployee({...newEmployee, contractType: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors">
                          <option value="Umowa o pracę">Umowa o pracę (Wymaga PESEL, RCA, ZUA)</option>
                          <option value="B2B">B2B (Kontrakt, Wymaga NIP)</option>
                          <option value="Umowa Zlecenie">Umowa Zlecenie</option>
                          <option value="Umowa o Dzieło">Umowa o Dzieło</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Kwota miesięczna / Stawka</label>
                        <input type="number" step="0.01" value={newEmployee.baseSalary || ''} onChange={e => setNewEmployee({...newEmployee, baseSalary: parseFloat(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors" />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Typ Kwoty</label>
                        <select value={newEmployee.salaryType} onChange={e => setNewEmployee({...newEmployee, salaryType: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors">
                          <option value="GROSS">Kwota to Brutto (Standard)</option>
                          <option value="NET">Wynegocjowano Netto ("Na rękę")</option>
                        </select>
                     </div>
                     <div className="col-span-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Stawka godz. (Nadgodziny / Czasówka)</label>
                        <input type="number" step="0.01" value={newEmployee.hourlyRate || ''} onChange={e => setNewEmployee({...newEmployee, hourlyRate: parseFloat(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors" />
                     </div>

                     <div className="col-span-2 border-t border-slate-100 pt-6">
                        <div className="flex justify-between items-center mb-4">
                           <h4 className="text-xs font-black text-slate-700 uppercase">Dodatki do Wynagrodzenia</h4>
                           <button type="button" onClick={() => {
                              if (!userData?.roles?.includes('owner') && !userData?.permissions?.includes('hr.dictionary.manage')) {
                                 alert("ZARZĄDZANIE SŁOWNIKAMI: Brak uprawnień do edycji słowników płacowych.");
                                 return;
                              }
                              // Future: Show Dictionary Modal
                              alert("ZARZĄDZANIE SŁOWNIKAMI: Moduł definicji w przygotowaniu. (Jako osoba z uprawnieniami będziesz mógł definiować listę).");
                           }} className="text-[9px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-1 rounded cursor-pointer hover:bg-blue-100 transition-colors">Słownik Dodatków</button>
                        </div>
                        {newEmployee.additions?.map((add: any, index: number) => (
                           <div key={`add-${index}`} className="flex flex-wrap gap-2 mb-2 items-end">
                              <div className="flex-1 min-w-[150px]">
                                 <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Nazwa Dodatku</label>
                                 <select value={add.name} onChange={e => {
                                    const arr = [...newEmployee.additions];
                                    arr[index].name = e.target.value;
                                    setNewEmployee({...newEmployee, additions: arr});
                                 }} className="w-full bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none">
                                    <option value="">Wybierz...</option>
                                    <option value="Dodatek Stażowy">Dodatek Stażowy</option>
                                    <option value="Dodatek Językowy">Dodatek Językowy</option>
                                    <option value="Dodatek Funkcyjny">Dodatek Funkcyjny</option>
                                    <option value="Premia Uznaniowa">Premia Uznaniowa</option>
                                 </select>
                              </div>
                              <div className="w-24">
                                 <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Kwota</label>
                                 <input type="number" value={add.amount} onChange={e => {
                                    const arr = [...newEmployee.additions];
                                    arr[index].amount = parseFloat(e.target.value) || 0;
                                    setNewEmployee({...newEmployee, additions: arr});
                                 }} className="w-full bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none" />
                              </div>
                              <div className="w-32">
                                 <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ważne Od</label>
                                 <input type="date" value={add.validFrom || ''} onChange={e => {
                                    const arr = [...newEmployee.additions];
                                    arr[index].validFrom = e.target.value;
                                    setNewEmployee({...newEmployee, additions: arr});
                                 }} className="w-full bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none" />
                              </div>
                              <div className="w-32">
                                 <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ważne Do</label>
                                 <input type="date" value={add.validTo || '9999-12-31'} onChange={e => {
                                    const arr = [...newEmployee.additions];
                                    arr[index].validTo = e.target.value;
                                    setNewEmployee({...newEmployee, additions: arr});
                                 }} className="w-full bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none" />
                              </div>
                              <button type="button" onClick={() => {
                                 const arr = newEmployee.additions.filter((_: any, i: number) => i !== index);
                                 setNewEmployee({...newEmployee, additions: arr});
                              }} className="text-rose-500 hover:text-rose-700 font-bold px-2 py-2 mb-1"><X size={16}/></button>
                           </div>
                        ))}
                        <button type="button" onClick={() => setNewEmployee({...newEmployee, additions: [...(newEmployee.additions || []), {name: '', amount: 0, validFrom: new Date().toISOString().split('T')[0], validTo: '9999-12-31'}]})} className="text-[10px] bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg font-bold transition-all mt-2">+ Dodaj Składnik (Z listy)</button>
                     </div>

                     <div className="col-span-2 border-t border-slate-100 pt-6">
                        <div className="flex justify-between items-center mb-4">
                           <h4 className="text-xs font-black text-slate-700 uppercase">Potrącenia Osobiste i Odliczenia</h4>
                           <button type="button" onClick={() => {
                              if (!userData?.roles?.includes('owner') && !userData?.permissions?.includes('hr.dictionary.manage')) {
                                 alert("ZARZĄDZANIE SŁOWNIKAMI: Brak uprawnień do edycji słowników płacowych.");
                                 return;
                              }
                              alert("ZARZĄDZANIE SŁOWNIKAMI: Moduł definicji w przygotowaniu. (Jako osoba z uprawnieniami będziesz mógł definiować listę).");
                           }} className="text-[9px] font-black uppercase text-amber-600 bg-amber-50 px-2 py-1 rounded cursor-pointer hover:bg-amber-100 transition-colors">Słownik Potrąceń</button>
                        </div>
                        {newEmployee.deductions?.map((ded: any, index: number) => (
                           <div key={`ded-${index}`} className="flex flex-wrap gap-2 mb-2 items-end">
                              <div className="flex-1 min-w-[150px]">
                                 <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tytuł Potrącenia</label>
                                 <select value={ded.name} onChange={e => {
                                    const arr = [...newEmployee.deductions];
                                    arr[index].name = e.target.value;
                                    setNewEmployee({...newEmployee, deductions: arr});
                                 }} className="w-full bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none">
                                    <option value="">Wybierz...</option>
                                    <option value="Potrącenie Komornicze">Potrącenie Komornicze</option>
                                    <option value="Potrącenie Alimentacyjne">Potrącenie Alimentacyjne</option>
                                    <option value="Pakiet Multisport">Pakiet Multisport</option>
                                    <option value="Prywatna Opieka Medyczna">Prywatna Opieka Medyczna</option>
                                    <option value="Pożyczka Pracownicza">Pożyczka Pracownicza</option>
                                 </select>
                              </div>
                              <div className="w-24">
                                 <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Kwota</label>
                                 <input type="number" value={ded.amount} onChange={e => {
                                    const arr = [...newEmployee.deductions];
                                    arr[index].amount = parseFloat(e.target.value) || 0;
                                    setNewEmployee({...newEmployee, deductions: arr});
                                 }} className="w-full bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none" />
                              </div>
                              <div className="w-32">
                                 <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ważne Od</label>
                                 <input type="date" value={ded.validFrom || ''} onChange={e => {
                                    const arr = [...newEmployee.deductions];
                                    arr[index].validFrom = e.target.value;
                                    setNewEmployee({...newEmployee, deductions: arr});
                                 }} className="w-full bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none" />
                              </div>
                              <div className="w-32">
                                 <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ważne Do</label>
                                 <input type="date" value={ded.validTo || '9999-12-31'} onChange={e => {
                                    const arr = [...newEmployee.deductions];
                                    arr[index].validTo = e.target.value;
                                    setNewEmployee({...newEmployee, deductions: arr});
                                 }} className="w-full bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none" />
                              </div>
                              <button type="button" onClick={() => {
                                 const arr = newEmployee.deductions.filter((_: any, i: number) => i !== index);
                                 setNewEmployee({...newEmployee, deductions: arr});
                              }} className="text-amber-500 hover:text-amber-700 font-bold px-2 py-2 mb-1"><X size={16}/></button>
                           </div>
                        ))}
                        <button type="button" onClick={() => setNewEmployee({...newEmployee, deductions: [...(newEmployee.deductions || []), {name: '', amount: 0, validFrom: new Date().toISOString().split('T')[0], validTo: '9999-12-31'}]})} className="text-[10px] bg-amber-50 text-amber-700 px-3 py-2 rounded-lg font-bold transition-all mt-2">+ Wybierz Potrącenie (Z listy)</button>
                     </div>
                     
                     {newEmployee.contractType === 'B2B' && (
                       <>
                          <div className="col-span-2 bg-slate-100 p-4 rounded-xl border border-slate-200">
                             <h4 className="text-xs font-black text-slate-700 uppercase mb-3">Dane Rozliczeniowe B2B</h4>
                             <div className="grid grid-cols-2 gap-4">
                               <div>
                                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${isComplianceMode && (!newEmployee.nip || newEmployee.nip.trim() === '' || newEmployee.nip.length !== 10) ? 'text-rose-600' : 'text-slate-400'}`}>NIP</label>
                                  <input id="input-nip" type="text" value={newEmployee.nip} onChange={e => setNewEmployee({...newEmployee, nip: e.target.value})} className={`w-full border rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none transition-colors ${isComplianceMode && (!newEmployee.nip || newEmployee.nip.trim() === '' || newEmployee.nip.length !== 10) ? 'bg-rose-50 border-rose-500 placeholder-rose-300 animate-[pulse_2s_ease-in-out_infinite] ring-2 ring-rose-200 focus:ring-0' : 'bg-white border-slate-200 focus:border-blue-500'}`} placeholder="PL1234567890" />
                               </div>
                               <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Rozliczenie VAT</label>
                                  <select value={newEmployee.vatType || 'STANDARD'} onChange={e => setNewEmployee({...newEmployee, vatType: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors">
                                    <option value="STANDARD">Krajowy (Standard)</option>
                                    <option value="EXEMPT">Zwolniony z VAT (ZW)</option>
                                    <option value="REVERSE_CHARGE">Odwrotne obciążenie / Reverse Charge</option>
                                  </select>
                               </div>
                               {(!newEmployee.vatType || newEmployee.vatType === 'STANDARD') && (
                                 <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Stawka VAT (%)</label>
                                    <input type="number" step="0.1" value={newEmployee.vatRate} onChange={e => setNewEmployee({...newEmployee, vatRate: parseFloat(e.target.value)})} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors" />
                                 </div>
                               )}
                             </div>
                          </div>
                       </>
                     )}
                  </div>
                )}

                {employeeModalTab === 'HR0200' && (
                  <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                     <div className="col-span-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Obywatelstwo</label>
                        <select value={newEmployee.nationality} onChange={e => setNewEmployee({...newEmployee, nationality: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors">
                          <option value="PL">Polska (PL)</option>
                          <option value="UA">Ukraina (UA)</option>
                          <option value="EU">Inny Kraj UE</option>
                          <option value="OTHER">Inny (Wymagane pozwolenie)</option>
                        </select>
                     </div>
                     <div className="col-span-2">
                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${isComplianceMode && newEmployee.contractType === 'Umowa o pracę' && newEmployee.nationality === 'PL' && (!newEmployee.pesel || newEmployee.pesel.length !== 11 || !isValidPesel(newEmployee.pesel)) ? 'text-rose-600' : 'text-slate-400'}`}>PESEL (do PIT/ZUS)</label>
                        <input id="input-pesel" type="text" value={newEmployee.pesel} onChange={e => setNewEmployee({...newEmployee, pesel: e.target.value})} className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-bold outline-none transition-colors ${isComplianceMode && newEmployee.contractType === 'Umowa o pracę' && newEmployee.nationality === 'PL' && (!newEmployee.pesel || newEmployee.pesel.length !== 11 || !isValidPesel(newEmployee.pesel)) ? 'border-rose-500 bg-rose-50 placeholder-rose-300 animate-[pulse_2s_ease-in-out_infinite] ring-2 ring-rose-200 focus:ring-0 text-rose-700' : (newEmployee.pesel && !isValidPesel(newEmployee.pesel) ? 'border-rose-300 text-rose-600 focus:border-rose-500' : 'border-slate-200 text-slate-700 focus:border-blue-500')}`} placeholder="00000000000" />
                        {newEmployee.pesel && !isValidPesel(newEmployee.pesel) && <p className="text-rose-500 text-[10px] font-bold mt-1">Błędna suma kontrolna PESEL</p>}
                     </div>
                     <div className="col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                       <h4 className="text-[10px] font-black text-slate-500 uppercase mb-3">Właściwości Rozliczeniowe Płatnika</h4>
                       <div className="grid grid-cols-2 gap-3">
                         <label className="flex items-center gap-3 text-xs font-bold text-slate-700 cursor-pointer">
                            <input type="checkbox" checked={newEmployee.isStudent} onChange={e => setNewEmployee({...newEmployee, isStudent: e.target.checked})} className="w-4 h-4 rounded border-slate-300" /> Student &lt; 26 r.ż. (Zwolnienie ZUS/PIT)
                         </label>
                         <label className="flex items-center gap-3 text-xs font-bold text-slate-700 cursor-pointer">
                            <input type="checkbox" checked={newEmployee.isPensioner} onChange={e => setNewEmployee({...newEmployee, isPensioner: e.target.checked})} className="w-4 h-4 rounded border-slate-300" /> Emeryt / Rencista
                         </label>
                         <label className="flex items-center gap-3 text-xs font-bold text-slate-700 cursor-pointer">
                            <input type="checkbox" checked={newEmployee.pitZero} onChange={e => setNewEmployee({...newEmployee, pitZero: e.target.checked})} className="w-4 h-4 rounded border-slate-300" /> Zwolnienie z PIT (PIT-0)
                         </label>
                         <label className="flex items-center gap-3 text-xs font-bold text-slate-700 cursor-pointer">
                            <input type="checkbox" checked={newEmployee.authorCosts} onChange={e => setNewEmployee({...newEmployee, authorCosts: e.target.checked})} className="w-4 h-4 rounded border-slate-300" /> 50% KUP (Koszty Twórców)
                         </label>
                       </div>
                     </div>

                     {newEmployee.nationality !== 'PL' && (
                       <div className="col-span-2 bg-amber-50 p-4 rounded-xl border border-amber-200 grid grid-cols-2 gap-4">
                          <h4 className="col-span-2 text-xs font-black text-amber-800 uppercase">Dane Cudzoziemca</h4>
                          <div>
                             <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${isComplianceMode && (!newEmployee.workPermitType) ? 'text-rose-600' : 'text-amber-600'}`}>Rodzaj Dokumentu (Pozwolenie)</label>
                             <select id="input-workpermit" value={newEmployee.workPermitType} onChange={e => setNewEmployee({...newEmployee, workPermitType: e.target.value})} className={`w-full bg-white border rounded-xl px-4 py-2 text-sm font-bold outline-none ${isComplianceMode && (!newEmployee.workPermitType) ? 'border-rose-500 text-rose-700 animate-[pulse_2s_ease-in-out_infinite] ring-2 ring-rose-200 focus:ring-0' : 'border-amber-200 text-amber-900'}`}>
                                <option value="">Wybierz...</option>
                                <option value="Oswiadczenie">Oświadczenie o powierzeniu pracy</option>
                                <option value="ZezwolenieA">Zezwolenie Typ A</option>
                                <option value="KartaPolaka">Karta Polaka (Zwolniony z obow.)</option>
                             </select>
                          </div>
                          <div>
                             <label className="block text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2">Ważne do</label>
                             <input type="date" value={newEmployee.workPermitValidTo} onChange={e => setNewEmployee({...newEmployee, workPermitValidTo: e.target.value})} className="w-full bg-white border border-amber-200 rounded-xl px-4 py-2 text-sm font-bold text-amber-900 outline-none" />
                          </div>
                       </div>
                     )}
                  </div>
                )}
                {employeeModalTab === 'HR0024' && (
                  <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                     <div className="col-span-2 bg-blue-50 p-4 rounded-xl border border-blue-100 mb-2">
                        <p className="text-xs font-medium text-blue-800">Wykształcenie, Języki, Kursy, Uprawnienia Ciężarowe i BHP.</p>
                     </div>

                     <div className="col-span-2 grid grid-cols-2 gap-6">
                        <div>
                           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Wykształcenie (wymiar urlopu)</label>
                           <div className="flex gap-2">
                              <select value={newEmployee.educationLevel} onChange={e => setNewEmployee({...newEmployee, educationLevel: e.target.value})} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors">
                                 <option value="Wyższe">Wyższe (Lic. +8 lat stażu do urlopu)</option>
                                 <option value="Pomaturalne">Pomaturalne / Policealne (+6 lat)</option>
                                 <option value="Średnie">Średnie zawodowe (+5 lat) / ogólnok. (+4 lata)</option>
                                 <option value="Zasadnicze">Zasadnicze zawodowe (+3 lata)</option>
                                 <option value="Podstawowe">Podstawowe</option>
                              </select>
                              <button type="button" onClick={() => alert("Mockup DMS: Załączanie skanu dyplomu do systemu DMS.")} title="Załącz Certyfikat (DMS)" className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 px-4 rounded-xl flex items-center justify-center font-black transition-colors">
                                 <Paperclip size={18}/>
                              </button>
                           </div>
                        </div>
                        <div>
                           <div className="flex justify-between items-center mb-2">
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Znajomość Specjalistyczna</label>
                              <button type="button" onClick={() => setIsSkillModalOpen(true)} className="text-[9px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-1 rounded cursor-pointer hover:bg-blue-100 transition-colors flex items-center gap-1">Edytuj Słownik / Relacje</button>
                           </div>
                           <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                              {newEmployee.skills?.map((skill: any, index: number) => (
                                 <div key={index} className="flex gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                                     <select 
                                        value={skill.name || ''} 
                                        onChange={(e) => {
                                           const arr = [...newEmployee.skills];
                                           arr[index].name = e.target.value;
                                           setNewEmployee({...newEmployee, skills: arr});
                                        }}
                                        className="flex-1 bg-white border border-slate-200 rounded px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                                     >
                                        <option value="">Wybierz ze słownika...</option>
                                        {skillsDictionary.map((s, i) => <option key={i} value={s.name}>{s.name} ({s.modules.join(', ')})</option>)}
                                     </select>
                                     <button title="Dołącz certyfikat (DMS)" type="button" onClick={() => alert("Mockup DMS: Skan zostanie zapisany w module DMS.")} className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 w-8 h-8 rounded flex items-center justify-center transition-colors">
                                       <Paperclip size={14}/>
                                     </button>
                                     <button type="button" onClick={() => {
                                        const arr = newEmployee.skills.filter((_: any, i: number) => i !== index);
                                        setNewEmployee({...newEmployee, skills: arr});
                                     }} className="text-rose-500 hover:text-rose-700 w-8 h-8 flex items-center justify-center"><X size={16}/></button>
                                 </div>
                              ))}
                              <button type="button" onClick={() => setNewEmployee({...newEmployee, skills: [...(newEmployee.skills || []), {name: '', attachment: null}]})} className="text-[10px] bg-slate-100 text-slate-700 px-3 py-2 rounded-lg font-bold w-full text-center hover:bg-slate-200 transition-all">
                                 + Dodaj Umiejętność
                              </button>
                           </div>
                        </div>
                     </div>

                     <div className="col-span-2 border-t border-slate-100 pt-4">
                        <div className="flex justify-between items-center mb-4">
                           <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest">Prawo Jazdy i Uprawnienia Transportowe</label>
                           <button type="button" onClick={() => setNewEmployee({...newEmployee, drivingLicenses: [...(newEmployee.drivingLicenses || []), {category: 'B', docValidTo: '', entitlementValidTo: ''}]})} className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-bold transition-all">+ Dodaj Dokument</button>
                        </div>
                        {newEmployee.drivingLicenses?.map((dl: any, index: number) => (
                           <div key={index} className="flex gap-4 bg-slate-50 p-4 rounded-xl mb-2 items-end">
                              <div className="w-1/3">
                                 <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Kategoria / Typ</label>
                                 <select value={dl.category} onChange={e => {
                                    const numList = [...newEmployee.drivingLicenses];
                                    numList[index].category = e.target.value;
                                    setNewEmployee({...newEmployee, drivingLicenses: numList});
                                 }} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none">
                                    <option value="B">B (Osobówki)</option>
                                    <option value="C">C (Ciężarowe)</option>
                                    <option value="CE">C+E (Ciężarowe z naczepą)</option>
                                    <option value="Kwalifikacja_Wstepna">Kwalifikacja wstępna / Przyspieszona</option>
                                    <option value="Swiadectwo_Kierowcy">Świadectwo Kierowcy (Cudzoziemcy)</option>
                                    <option value="ADR">ADR (Materiały Niebezpieczne)</option>
                                 </select>
                              </div>
                              <div className="w-1/4">
                                 <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ważność Dokumentu</label>
                                 <input type="date" value={dl.docValidTo} onChange={e => {
                                    const numList = [...newEmployee.drivingLicenses];
                                    numList[index].docValidTo = e.target.value;
                                    setNewEmployee({...newEmployee, drivingLicenses: numList});
                                 }} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none" />
                              </div>
                              <div className="w-1/4">
                                 <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ważność Uprawnienia</label>
                                 <input type="date" value={dl.entitlementValidTo} onChange={e => {
                                    const numList = [...newEmployee.drivingLicenses];
                                    numList[index].entitlementValidTo = e.target.value;
                                    setNewEmployee({...newEmployee, drivingLicenses: numList});
                                 }} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none" />
                              </div>
                              <button title="Skan Prawa Jazdy (DMS)" type="button" onClick={() => alert("Mockup DMS: Załączanie dwustronnego skanu prawa jazdy.")} className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 w-10 h-9 rounded flex items-center justify-center transition-colors">
                                <Paperclip size={16}/>
                              </button>
                              <button type="button" onClick={() => {
                                 const numList = newEmployee.drivingLicenses.filter((_: any, i: number) => i !== index);
                                 setNewEmployee({...newEmployee, drivingLicenses: numList});
                              }} className="text-rose-500 hover:text-rose-700 w-8 h-9 flex items-center justify-center"><X size={16} /></button>
                           </div>
                        ))}
                     </div>

                     <div className="col-span-2 border-t border-slate-100 pt-4 grid grid-cols-4 gap-4">
                        <div>
                           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Rodzaj BHP</label>
                           <select value={newEmployee.ohsTrainingType} onChange={e => setNewEmployee({...newEmployee, ohsTrainingType: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors">
                              <option value="Wstępne">Wstępne</option>
                              <option value="Okresowe (1 rok)">Okresowe (1 r.)</option>
                              <option value="Okresowe (3 lata)">Okresowe (3 l.)</option>
                              <option value="Okresowe (5 lat)">Okresowe (5 l.)</option>
                           </select>
                        </div>
                        <div>
                           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ważne od (Data)</label>
                           <input type="date" value={newEmployee.ohsTrainingValidFrom} onChange={e => setNewEmployee({...newEmployee, ohsTrainingValidFrom: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors" />
                        </div>
                        <div className="col-span-2">
                           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ważne do</label>
                           <div className="flex gap-2">
                              <input type="date" value={newEmployee.ohsTrainingValidTo} onChange={e => setNewEmployee({...newEmployee, ohsTrainingValidTo: e.target.value})} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors" />
                              <button title="Skan Zaświadczenia BHP (DMS)" type="button" onClick={() => alert("Mockup DMS: Załączanie skanu zaświadczenia BHP.")} className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 px-4 rounded-xl flex items-center justify-center font-black transition-colors">
                                 <Paperclip size={18}/>
                              </button>
                           </div>
                        </div>
                     </div>
                     <div className="col-span-2 grid grid-cols-4 gap-4">
                        <div>
                           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Rodzaj Badań</label>
                           <select value={newEmployee.medicalExamType} onChange={e => setNewEmployee({...newEmployee, medicalExamType: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors">
                              <option value="Wstępne">Wstępne</option>
                              <option value="Okresowe">Okresowe</option>
                              <option value="Kontrolne">Kontrolne</option>
                           </select>
                        </div>
                        <div>
                           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ważne od</label>
                           <input type="date" value={newEmployee.medicalExamValidFrom} onChange={e => setNewEmployee({...newEmployee, medicalExamValidFrom: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors" />
                        </div>
                        <div className="col-span-2">
                           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ważne do</label>
                           <div className="flex gap-2">
                              <input type="date" value={newEmployee.medicalExamValidTo} onChange={e => setNewEmployee({...newEmployee, medicalExamValidTo: e.target.value})} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors" />
                              <button title="Skan Orzeczenia Lekarskiego (DMS)" type="button" onClick={() => alert("Mockup DMS: Załączanie skanu orzeczenia lekarskiego z medycyny pracy.")} className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 px-4 rounded-xl flex items-center justify-center font-black transition-colors">
                                 <Paperclip size={18}/>
                              </button>
                           </div>
                        </div>
                     </div>
                     <div className="col-span-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Inne Wymagane Certyfikaty (np. SEP, UDT)</label>
                        <div className="flex gap-2">
                           <input type="text" value={newEmployee.certificates} onChange={e => setNewEmployee({...newEmployee, certificates: e.target.value})} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors" placeholder="Koparki klasa I, SEP do 1kV" />
                           <button title="Inne Skany (DMS)" type="button" onClick={() => alert("Mockup DMS: Załączanie wielostronicowego skanu innych uprawnień.")} className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 px-4 rounded-xl flex items-center justify-center font-black transition-colors">
                              <Paperclip size={18}/>
                           </button>
                        </div>
                     </div>
                  </div>
                )}
                
                {employeeModalTab === 'HR0032' && (
                  <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                     <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 relative overflow-hidden">
                        <div className="absolute right-0 bottom-0 opacity-10"><Briefcase size={80} /></div>
                        <h4 className="text-sm font-black text-emerald-800 uppercase mb-2 relative z-10">Zarządzanie Majątkiem i Logistyką</h4>
                        <p className="text-xs font-medium text-emerald-700 relative z-10 mb-4 max-w-lg">
                           Pełna ewidencja powierzonego mienia, aut służbowych oraz kart dostępu dostępna jest w dedykowanym <strong className="font-extrabold">Module Magazyn/Flota</strong>. 
                           Ten widok stanowi jedynie szybki podgląd przypisań na koncie pracowniczym.
                        </p>
                        <button type="button" onClick={() => alert("Przejście do modułu logistyki / magazynu...")} className="relative z-10 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase px-4 py-2 rounded shadow-sm transition-colors">Wywołaj Magazyn</button>
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Szybka Ewidencja Zwykła (Notatka)</label>
                        <textarea rows={6} value={newEmployee.issuedEquipment || ''} onChange={e => setNewEmployee({...newEmployee, issuedEquipment: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 transition-colors" placeholder="MacBook Pro (S/N: 123456)&#10;Telefon S23 (Tel 500-100-200)&#10;Karta Paliwowa Orlen Nr. 153&#10;Klucze do biura wejście B"></textarea>
                     </div>
                  </div>
                )}
                
                {employeeModalTab === 'ZHR001' && (
                  <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                     <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                        <div className="flex justify-between items-center mb-4">
                           <div>
                              <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Pola Niestandardowe (Infotyp 9000)</h4>
                              <p className="text-xs text-slate-500 mt-1">Zdefiniuj specyficzne dla Twojej organizacji, dodatkowe właściwości kartoteki (np. Rozmiar obuwia roboczego, Data imienin, Domyślny Posiłek Veto, itp.).</p>
                           </div>
                           <button type="button" className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-2 rounded" onClick={() => setNewEmployee({...newEmployee, customFields: [...(newEmployee.customFields || []), {name: '', value: ''}]})}>+ Dodaj Pole</button>
                        </div>
                        <div className="space-y-3">
                           {(!newEmployee.customFields || newEmployee.customFields.length === 0) && (
                              <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-white">
                                 <p className="text-xs font-bold text-slate-400">Brak zdefiniowanych pól niestandardowych.</p>
                              </div>
                           )}
                           {newEmployee.customFields?.map((field: any, index: number) => (
                              <div key={index} className="flex gap-3 items-end bg-white p-3 rounded-lg border border-slate-200">
                                 <div className="flex-1">
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Nazwa Właściwości</label>
                                    <input type="text" value={field.name} onChange={e => {
                                       const arr = [...newEmployee.customFields];
                                       arr[index].name = e.target.value;
                                       setNewEmployee({...newEmployee, customFields: arr});
                                    }} className="w-full bg-slate-50 border border-slate-100 rounded px-3 py-2 text-xs font-bold text-slate-700 outline-none" placeholder="np. Rozmiar Koszulki" />
                                 </div>
                                 <div className="flex-[2]">
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Wartość</label>
                                    <input type="text" value={field.value} onChange={e => {
                                       const arr = [...newEmployee.customFields];
                                       arr[index].value = e.target.value;
                                       setNewEmployee({...newEmployee, customFields: arr});
                                    }} className="w-full bg-slate-50 border border-slate-100 rounded px-3 py-2 text-xs font-bold text-slate-700 outline-none" placeholder="np. XL" />
                                 </div>
                                 <button type="button" onClick={() => {
                                    const arr = newEmployee.customFields.filter((_: any, i: number) => i !== index);
                                    setNewEmployee({...newEmployee, customFields: arr});
                                 }} className="text-rose-500 hover:bg-rose-50 p-2 rounded transition-colors"><X size={16} /></button>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
                )}
                
                {components?.enableAiAssistance && (
                  <div className={`border rounded-2xl p-6 ${employeeAiHelper?.isError ? 'bg-rose-50 border-rose-100' : 'bg-indigo-50 border-indigo-100'}`}>
                     <div className="flex justify-between items-center mb-4">
                        <h4 className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${employeeAiHelper?.isError ? 'text-rose-800' : 'text-indigo-800'}`}><Cpu size={14}/> Weryfikator Kandydatów AI</h4>
                        <button type="button" onClick={handleAnalyzeCompliance} className={`text-[10px] text-white px-3 py-1.5 rounded-lg font-black uppercase tracking-widest transition-colors ${employeeAiHelper?.isError ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>Analizuj Zgodność</button>
                     </div>
                     {employeeAiHelper ? (
                       <p className={`text-xs font-medium leading-relaxed ${employeeAiHelper.isError ? 'text-rose-700' : 'text-indigo-700'} whitespace-pre-wrap`}>{employeeAiHelper.message}</p>
                     ) : (
                       <p className="text-xs text-indigo-400 font-medium italic">Kliknij analiza, aby zweryfikować czy kompletność danych pozwala legalnie zatrudnić i rozliczyć współpracownika.</p>
                     )}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                   <button type="button" onClick={() => setShowEmployeeModal(false)} className="px-6 py-3 rounded-xl text-xs font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 transition-colors">Anuluj</button>
                   <button type="submit" disabled={isSaving || isSaveDisabled} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all ${(isSaving || isSaveDisabled) ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200'}`}>
                      {isSaving ? 'Zapisywanie...' : 'Zapisz Pracownika'}
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}
      {promptOverlay?.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
             <h3 className="text-sm font-bold text-slate-800 mb-4">{promptOverlay.config.title}</h3>
             <input autoFocus type="text" id="prompt-input" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors mb-4" onKeyDown={(e) => {
               if (e.key === 'Enter') {
                 promptOverlay.config.onSave((e.target as HTMLInputElement).value);
                 setPromptOverlay(null);
               }
             }} />
             <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setPromptOverlay(null)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50">Anuluj</button>
                <button onClick={() => {
                  const val = (document.getElementById('prompt-input') as HTMLInputElement).value;
                  promptOverlay.config.onSave(val);
                  setPromptOverlay(null);
                }} className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700">Dodaj</button>
             </div>
          </div>
        </div>
      )}

      {showProjectModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="p-6 bg-slate-900 text-white flex items-center gap-3">
                <FolderKanban className="text-indigo-400" />
                <h3 className="text-lg font-black uppercase tracking-tight">Przypisz Pracownika do Projektu</h3>
             </div>
             <div className="p-8 space-y-6">
                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Wybierz Istniejący Projekt (Słownik)</label>
                   <select 
                     onChange={e => {
                        const proj = finProjects.find(p => p.id === e.target.value);
                        if (proj && showProjectModal.employeeId) handleAssignProjectToEmployee(showProjectModal.employeeId, proj);
                     }}
                     className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500"
                   >
                      <option value="">-- Wybierz projekt --</option>
                      {finProjects.map(p => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
                   </select>
                </div>
                
                <div className="relative flex items-center gap-4">
                   <div className="flex-1 h-px bg-slate-100"></div>
                   <span className="text-[10px] font-black text-slate-300 uppercase">lub utwórz nowy</span>
                   <div className="flex-1 h-px bg-slate-100"></div>
                </div>

                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nowy Projekt</label>
                   <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={newProjectName} 
                        onChange={e => setNewProjectName(e.target.value)}
                        placeholder="Nazwa projektu..."
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500"
                      />
                      <button 
                        onClick={() => handleCreateProject(showProjectModal.employeeId!)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase hover:bg-slate-900 transition-colors"
                      >
                        Dodaj
                      </button>
                   </div>
                </div>
             </div>
             <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button onClick={() => setShowProjectModal({isOpen: false, employeeId: null})} className="px-6 py-2 rounded-xl text-xs font-black text-slate-500 uppercase tracking-widest">Zamknij</button>
             </div>
          </div>
        </div>
      )}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
             <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5"><Calendar size={100} /></div>
                <div className="relative z-10">
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Nowy Wniosek Urlopowy / L4</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">Wprowadź daty nieobecności pracownika</p>
                </div>
                <button onClick={() => setShowLeaveModal(false)} className="relative z-10 text-slate-400 hover:text-slate-600 bg-white p-2 rounded-full shadow-sm"><X size={20} /></button>
             </div>
             
             <form onSubmit={handleAddLeave} className="p-8 flex flex-col gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pracownik</label>
                  <select required value={newLeave.employeeId} onChange={e => setNewLeave({...newLeave, employeeId: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors">
                     <option value="" disabled>Wybierz pracownika</option>
                     {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name || emp.email}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Rodzaj Nieobecności</label>
                  <select required value={newLeave.type} onChange={e => setNewLeave({...newLeave, type: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors">
                    <option value="Wypoczynkowy">Urlop Wypoczynkowy</option>
                    <option value="Chorobowy">Zwolnienie Chorobowe (L4)</option>
                    <option value="Nażądanie">Urlop na żądanie (UŻ)</option>
                    <option value="Bezplatny">Urlop Bezpłatny</option>
                    <option value="Okolicznosciowy">Urlop Okolicznościowy</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Data Od</label>
                      <input required type="date" value={newLeave.startDate} onChange={e => setNewLeave({...newLeave, startDate: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors" />
                   </div>
                   <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Data Do</label>
                      <input required type="date" value={newLeave.endDate} onChange={e => setNewLeave({...newLeave, endDate: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors" />
                   </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                   <button type="button" onClick={() => setShowLeaveModal(false)} className="px-6 py-3 rounded-xl text-xs font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 transition-colors">Anuluj</button>
                   <button type="submit" className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200`}>Zapisz</button>
                </div>
             </form>
          </div>
        </div>
      )}
      <div className="bg-slate-900 rounded-3xl p-10 text-white shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:scale-110 transition-transform">
           <Users size={160} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h2 className="text-4xl font-black italic tracking-tighter uppercase mb-2">Kadry & Płace (HR)</h2>
            <p className="text-slate-400 text-sm font-medium tracking-tight max-w-lg">
              Kompleksowy moduł HR gotowy na polskie standardy: urlopy, zwolnienia, przypisanie do projektów, składniki płacowe, PIT, PFRON.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 bg-white/10 p-1.5 rounded-2xl backdrop-blur-md border border-white/10 max-w-sm md:max-w-md">
             <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase transition-all flex-1 text-center ${activeTab === 'dashboard' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-white'}`}>Kokpit HR</button>
             <button onClick={() => setActiveTab('employees')} className={`px-4 py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase transition-all flex-1 text-center ${activeTab === 'employees' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-white'}`}>Pracownicy</button>
             <button onClick={() => setActiveTab('leaves')} className={`px-4 py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase transition-all flex-1 text-center ${activeTab === 'leaves' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-white'}`}>Nieobecności</button>
             <button onClick={() => setActiveTab('payslips')} className={`px-4 py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase transition-all flex-1 text-center ${activeTab === 'payslips' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-white'}`}>Płace</button>
             <button onClick={() => setActiveTab('components')} className={`px-4 py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase transition-all flex-1 text-center ${activeTab === 'components' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-white'}`}>Ustawienia Płac</button>
             {components?.enableReports && <button onClick={() => setActiveTab('reports')} className={`px-4 py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase transition-all flex-1 text-center ${activeTab === 'reports' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-white'}`}>Raporty (PIT/ZUS)</button>}
          </div>
        </div>
      </div>

      {aiFeedback && (
        <div className={`p-6 rounded-2xl relative shadow-lg ${aiFeedback.hasError ? 'bg-rose-900 text-rose-50 border border-rose-800' : 'bg-indigo-900 text-indigo-50 border border-indigo-800'} animate-in slide-in-from-top-4 duration-300`}>
           <button onClick={() => setAiFeedback(null)} className="absolute top-4 right-4 text-white/50 hover:text-white"><X size={16}/></button>
           <h4 className="font-black uppercase tracking-widest text-[10px] text-white/70 mb-2 flex items-center gap-2"><Cpu size={14} /> Asystent Prawno-Kadrowy AI</h4>
           <div className="flex gap-4">
             <div className="flex-1">
               <p className="font-medium text-sm mb-3 text-white leading-relaxed">{aiFeedback.message}</p>
               <div className="inline-block bg-black/20 text-white/80 px-3 py-1.5 rounded-lg text-xs font-mono">{aiFeedback.legalBasis}</div>
             </div>
           </div>
        </div>
      )}

      {isComplianceMode && (
         <div className="bg-rose-100 border border-rose-200 text-rose-900 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm animate-in slide-in-from-top-4 duration-300">
            <div className="flex gap-3 items-center">
               <div className="bg-rose-200 rounded-full p-2 animate-pulse">
                  <ShieldAlert size={20} className="text-rose-700" />
               </div>
               <div>
                  <h3 className="font-black text-xs uppercase tracking-widest text-rose-800">Tryb Compliance Aktywny</h3>
                  <p className="text-xs font-medium text-rose-700">System podświetla problemy wymagające weryfikacji i uzupełnienia danych na czerwono.</p>
               </div>
            </div>
            <button onClick={() => setIsComplianceMode(false)} className="bg-rose-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap shrink-0">
               <X size={14} /> Wyłącz Tryb
            </button>
         </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 tracking-tight">
        {/* Sidebar Stats */}
        <div className="lg:col-span-1 space-y-6">
           <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm text-center">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Fundusz Wynagrodzeń</div>
              <div className="text-3xl font-black text-slate-900 tracking-tighter">142,500 <span className="text-xs text-slate-400">PLN</span></div>
              <div className="mt-4 flex items-center justify-center gap-2 text-emerald-600 font-bold text-[10px]">
                 <TrendingUp size={14} /> +4.2% vs Poprzedni m-c
              </div>
           </div>
           
           <div className={`p-6 rounded-[2rem] border flex flex-col items-center text-center ${complianceIssuesCount > 0 ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
              <div className={`w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm ${complianceIssuesCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                 {complianceIssuesCount > 0 ? <ShieldAlert size={24} /> : <ShieldCheck size={24} />}
              </div>
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight mb-2">Compliance Alert</h4>
              <p className="text-[10px] text-slate-500 font-medium leading-relaxed mb-3">
                 {complianceIssuesCount > 0 
                    ? `Wykryto ${complianceIssuesCount} problemów wymagających Twojej uwagi (braki danych, błędy VAT).` 
                    : `Wszystkie wskaźniki na bieżący rok są w normie. Brak akcji wymaganych.`
                 }
              </p>
              {complianceIssuesCount > 0 && (
                 <button onClick={() => { setActiveTab('dashboard'); setIsComplianceMode(true); }} className="text-[10px] uppercase tracking-widest font-black text-rose-600 hover:text-rose-800 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-rose-100 w-full transition-colors">
                    Przejdź do problemów
                 </button>
              )}
           </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
           {activeTab === 'dashboard' && (
              <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 animate-in fade-in duration-500">
                 <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-2">Główny Kokpit Informacyjny</h3>
                 <p className="text-xs text-slate-400 font-medium mb-8">Systemowe alerty, opłaty, braki w kartotekach i weryfikacja zewnętrzna.</p>

                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
                    <div className="bg-rose-50 border border-rose-100 p-6 rounded-[2rem]">
                       <h4 className="text-[10px] font-black text-rose-800 uppercase tracking-widest mb-1">Braki w Kartotekach</h4>
                       <div className="text-3xl font-black text-rose-600 tracking-tighter mb-4">{employees.filter(e => e.status === 'INCOMPLETE').length}</div>
                       <p className="text-xs font-bold text-rose-700">Wymagane natychmiastowe uzupełnienie danych dla nowo zatrudnionych współpracowników.</p>
                       <ul className="mt-4 space-y-2">
                          {employees.filter(e => e.status === 'INCOMPLETE').map(e => (
                             <li key={e.id} className="text-[10px] font-black text-rose-500 uppercase flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-rose-500 rounded-full"></div>{e.name || e.email}</div>
                                <button onClick={() => { setActiveTab('employees'); openEmployeeModal(e, true); setIsComplianceMode(true); }} className="text-rose-800 hover:text-rose-900 border border-rose-200 bg-rose-100 px-2 py-1 rounded">Uzupełnij</button>
                             </li>
                          ))}
                          {employees.filter(e => e.status === 'INCOMPLETE').length === 0 && (
                             <li className="text-[10px] font-black text-emerald-600 uppercase flex items-center gap-2"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>Brak niekompletnych kartotek</li>
                          )}
                       </ul>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 p-6 rounded-[2rem]">
                       <h4 className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">Biała Księga (Wykaz Podatników VAT)</h4>
                       <div className="text-3xl font-black text-amber-600 tracking-tighter mb-4">{b2bErrors.length}</div>
                       <p className="text-xs font-bold text-amber-700">Weryfikacja w tle NIP dla kontraktów B2B wykazała brak lub błąd w Białej Księdze.</p>
                       <ul className="mt-4 space-y-2">
                          {b2bErrors.map(e => (
                             <li key={e.id} className="text-[10px] font-black text-amber-600 uppercase flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>{e.name || e.email} NIP: {e.nip || 'Brak'}</div>
                                <button onClick={() => { setActiveTab('employees'); openEmployeeModal(e, true); setIsComplianceMode(true); }} className="text-amber-800 hover:text-amber-900 border border-amber-200 bg-amber-100 px-2 py-1 rounded">Edytuj</button>
                             </li>
                          ))}
                          {b2bErrors.length === 0 && (
                             <li className="text-[10px] font-black text-emerald-600 uppercase flex items-center gap-2"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>Brak problemów z NIP</li>
                          )}
                       </ul>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 p-6 rounded-[2rem]">
                       <h4 className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-1">ZUS (Błędy i braki PESEL)</h4>
                       <div className={`text-3xl font-black tracking-tighter mb-4 ${uopErrors.length > 0 ? 'text-blue-600' : 'text-emerald-500'}`}>{uopErrors.length}</div>
                       <p className="text-xs font-bold text-blue-700">Wymagany poprawny numer PESEL dla pracowników na Umowie o Pracę.</p>
                       <ul className="mt-4 space-y-2">
                          {uopErrors.map(e => (
                             <li key={e.id} className="text-[10px] font-black text-blue-600 uppercase flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>{e.name || e.email}</div>
                                <button onClick={() => { setActiveTab('employees'); openEmployeeModal(e, true); setIsComplianceMode(true); }} className="text-blue-800 hover:text-blue-900 border border-blue-200 bg-blue-100 px-2 py-1 rounded">Edytuj</button>
                             </li>
                          ))}
                          {uopErrors.length === 0 && (
                             <li className="text-[10px] font-black text-emerald-600 uppercase flex items-center gap-2"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>Brak problemów z ZUS</li>
                          )}
                       </ul>
                    </div>
                    <div className="col-span-1 lg:col-span-3 bg-slate-50 border border-slate-200 p-6 rounded-[2rem]">
                       <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-1">Kasa gotówkowa (Integracja Logistyczna)</h4>
                       <div className="text-3xl font-black text-slate-600 tracking-tighter mb-4">Wypłaty CASH: {employees.filter(e => e.paymentMethod === 'CASH').length} os.</div>
                       <p className="text-xs font-bold text-slate-500">Oczekujące wypłaty w walucie lokalnej, fizycznie obsługiwane przez kasę firmową lub kierownika budowy.</p>
                    </div>
                 </div>
              </div>
           )}

           {activeTab === 'employees' && (
              <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
                 <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><Users size={18} className="text-blue-600" /> Baza Pracowników & Projekty</h3>
                      <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Zarządzanie kadrami i alokacja do inwestycji</p>
                    </div>
                    <button onClick={() => openEmployeeModal()} className="bg-slate-900 text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg">Dodaj Pracownika</button>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                             <th className="px-6 py-4">Pracownik</th>
                             <th className="px-6 py-4">Kontrakt & Stanowisko</th>
                             <th className="px-6 py-4">Przypisane Projekty</th>
                             <th className="px-6 py-4 text-right">Zarządzaj</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                          {(() => {
                             const sortedEmployees = isComplianceMode ? [...employees].sort((a, b) => {
                                const aProb = a.status === 'INCOMPLETE' || (a.contractType === 'B2B' && (!a.nip || a.nip.trim() === '' || a.nip.length !== 10)) || (a.contractType === 'Umowa o pracę' && a.nationality === 'PL' && (!a.pesel || a.pesel.length !== 11 || !isValidPesel(a.pesel)));
                                const bProb = b.status === 'INCOMPLETE' || (b.contractType === 'B2B' && (!b.nip || b.nip.trim() === '' || b.nip.length !== 10)) || (b.contractType === 'Umowa o pracę' && b.nationality === 'PL' && (!b.pesel || b.pesel.length !== 11 || !isValidPesel(b.pesel)));
                                if (aProb && !bProb) return -1;
                                if (!aProb && bProb) return 1;
                                return 0;
                             }) : employees;
                             
                             return sortedEmployees.map(emp => (
                                <EmployeeRow key={emp.id} emp={emp} openEmployeeModal={openEmployeeModal} setPromptOverlay={setPromptOverlay} setShowProjectModal={setShowProjectModal} isComplianceMode={isComplianceMode} />
                             ));
                          })()}
                          {employees.length === 0 && (
                            <tr>
                              <td colSpan={4} className="px-6 py-8 text-center text-xs text-slate-400 font-medium">Brak przypisanych pracowników.</td>
                            </tr>
                          )}
                       </tbody>
                    </table>
                 </div>
              </div>
           )}

           {activeTab === 'leaves' && (
              <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 animate-in fade-in duration-500">
                <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-800 uppercase italic tracking-tighter">Urlopy & Zwolnienia Lekarskie (L4)</h3>
                    <p className="text-xs text-slate-400 mt-1 font-medium">Rejestracja e-ZLA (PUE ZUS), urlopów wypoczynkowych, na żądanie i wychowawczych.</p>
                  </div>
                  <button className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Pobierz nowe e-ZLA</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="p-4 border border-slate-100 bg-slate-50 rounded-2xl border-l-4 border-l-rose-500">
                    <div className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Obecnie na L4</div>
                    <div className="text-2xl font-black text-slate-800 tracking-tighter">{leaves.filter(l => l.type === 'Chorobowy').length}</div>
                  </div>
                  <div className="p-4 border border-slate-100 bg-slate-50 rounded-2xl border-l-4 border-l-blue-500">
                    <div className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Urlop Wypoczynkowy</div>
                    <div className="text-2xl font-black text-slate-800 tracking-tighter">{leaves.filter(l => l.type === 'Wypoczynkowy').length}</div>
                  </div>
                  <div className="p-4 border border-slate-100 bg-slate-50 rounded-2xl flex flex-col justify-center gap-2">
                    <button onClick={() => setShowLeaveModal(true)} className="bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"><Calendar size={14} /> Wniosek Urlopowy</button>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 overflow-x-auto border border-slate-100">
                   <table className="w-full text-left text-xs">
                     <thead>
                       <tr className="text-[10px] uppercase font-black tracking-widest text-slate-400 border-b border-slate-200">
                         <th className="pb-3 text-slate-500">Pracownik</th>
                         <th className="pb-3 text-slate-500">Typ</th>
                         <th className="pb-3 text-slate-500">Okres</th>
                         <th className="pb-3 text-slate-500">Status wymiaru</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-white">
                       {leaves.map((l: any) => {
                         const emp = employees.find(e => e.id === l.employeeId);
                         return (
                           <tr key={l.id}>
                             <td className="py-3 font-bold text-slate-800">{emp?.name || emp?.email || 'Nieznany'}</td>
                             <td className="py-3">
                               <span className={`px-2 py-0.5 rounded-[4px] font-black text-[9px] uppercase tracking-widest ${l.type === 'Wypoczynkowy' ? 'bg-blue-100 text-blue-700' : l.type === 'Chorobowy' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-700'}`}>
                                 {l.type === 'Chorobowy' ? 'Zwolnienie e-ZLA' : l.type}
                               </span>
                             </td>
                             <td className="py-3 text-slate-600 font-medium">{l.startDate} do {l.endDate}</td>
                             <td className="py-3 text-slate-400 text-[10px]">
                                <button className="hover:text-indigo-600 font-bold">Edytuj</button>
                             </td>
                           </tr>
                         )
                       })}
                       {leaves.length === 0 && (
                         <tr>
                           <td colSpan={4} className="py-8 text-center text-slate-400 font-medium text-xs">Brak zarejestrowanych nieobecności</td>
                         </tr>
                       )}
                     </tbody>
                   </table>
                </div>
              </div>
           )}

           {activeTab === 'payslips' && (
              <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-12 animate-in fade-in duration-500">
                 <div className="flex flex-col md:flex-row gap-12">
                   <div className="flex-1 text-center">
                      <div className="w-20 h-20 bg-emerald-50 rounded-[2rem] flex items-center justify-center text-emerald-600 mx-auto mb-8 shadow-inner">
                         <DollarSign size={40} />
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter mb-4">Lista Płac (Maj 2026)</h3>
                      <p className="text-slate-500 font-medium mb-8 text-sm max-w-sm mx-auto">Automatyczne generowanie list płac na podstawie Czasoprzestrzeni (RCP), przypisania prowizji oraz premii na projektach.</p>
                      <div className="flex flex-col gap-3 max-w-sm mx-auto">
                         <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Zakres Obliczeń</label>
                             <select className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none focus:border-blue-500">
                                <option value="all">Cała firma (Wszyscy pracownicy)</option>
                                <option value="b2b">Tylko Kontrakty B2B</option>
                                <option value="uop">Tylko Umowy o Pracę (UoP)</option>
                                <option value="selected">Wybrani Pracownicy (Zaznacz z listy)</option>
                             </select>
                         </div>
                         <button onClick={generatePayslips} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-600 transition-all shadow-xl">Generuj Ostateczną Listę Płac</button>
                         <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => generateXML('PASKI')} className="bg-slate-100 text-slate-600 hover:bg-slate-200 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-colors"><FileText size={14}/> Paski Płac</button>
                            <button onClick={() => downloadBlob('MT940...', 'export.mt940', 'text/plain')} className="bg-slate-100 text-slate-600 hover:bg-slate-200 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-colors"><CreditCard size={14}/> Eksport MT940</button>
                         </div>
                      </div>
                   </div>
                   
                   <div className="flex-1 bg-slate-50 border border-slate-200 rounded-3xl p-8 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-6 opacity-5"><Settings size={80}/></div>
                      <h4 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-2 relative z-10">Konfiguracja Algorytmu Listy Płac</h4>
                      <p className="text-[10px] text-slate-500 font-medium mb-6 relative z-10">Zarządzaj potokiem obliczeń wybranego typu kalkulacji jako "klocki" przeliczające netto/brutto.</p>
                      
                      <div className="flex gap-2 mb-4 relative z-10">
                        <button className="px-3 py-1 bg-slate-900 text-white rounded text-[10px] font-black uppercase tracking-widest">UoP</button>
                        <button className="px-3 py-1 bg-white border border-slate-200 text-slate-500 rounded text-[10px] font-black uppercase tracking-widest">B2B</button>
                        <button className="px-3 py-1 bg-white border border-slate-200 text-slate-500 rounded text-[10px] font-black uppercase tracking-widest">Zlecenie</button>
                      </div>

                      <div className="space-y-2 relative z-10 before:absolute before:left-5 before:top-4 before:bottom-4 before:w-1 before:bg-slate-200 before:-z-10">
                         <div className="bg-white border-2 border-slate-900 shadow-md p-3 rounded-2xl flex items-center gap-4 cursor-move hover:scale-[1.02] transition-transform ml-2">
                           <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shrink-0">1</div>
                           <div className="flex-1">
                             <div className="text-xs font-black text-slate-800 uppercase tracking-tighter">Baza Wynagrodzenia (Czas × Stawka)</div>
                             <div className="text-[9px] text-slate-500 font-medium mt-0.5">Podstawa algorytmu brutto. Nie zasilamy ZUS jeszcze.</div>
                           </div>
                           <Settings size={14} className="text-slate-400" />
                         </div>

                         <div className="bg-white border border-slate-200 shadow-sm p-3 rounded-2xl flex items-center gap-4 cursor-move hover:scale-[1.02] transition-transform ml-2">
                           <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-black shrink-0">2</div>
                           <div className="flex-1">
                             <div className="text-xs font-black text-slate-800 uppercase tracking-tighter">Premie i Dodatki (Brutto)</div>
                             <div className="text-[9px] text-slate-500 font-medium mt-0.5">Zwiększenie podstawy przed opodatkowaniem.</div>
                           </div>
                           <Settings size={14} className="text-slate-400" />
                         </div>

                         <div className="bg-indigo-50 border border-indigo-200 shadow-sm p-3 rounded-2xl flex items-center gap-4 cursor-move hover:scale-[1.02] transition-transform ml-2">
                           <div className="w-6 h-6 rounded-full bg-indigo-200 text-indigo-800 flex items-center justify-center text-[10px] font-black shrink-0">3</div>
                           <div className="flex-1">
                             <div className="text-xs font-black text-indigo-900 uppercase tracking-tighter">Składki ZUS & Fundusze</div>
                             <div className="text-[9px] text-indigo-700 font-medium mt-0.5">Potrącenie 9.76% (Emeryt), 6.50% (Rent). Oblicza PIT base.</div>
                           </div>
                           <Settings size={14} className="text-slate-400" />
                         </div>

                         <div className="bg-slate-100 border border-slate-200 border-dashed shadow-sm p-3 rounded-2xl flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-200 transition-colors ml-2">
                           <PlusCircle size={14} className="text-slate-500" />
                           <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Dodaj Krok Obliczeniowy</span>
                         </div>
                      </div>

                      <div className="mt-8 bg-indigo-900 border border-indigo-800 p-5 rounded-2xl flex items-start gap-4 text-indigo-50 shadow-inner">
                        <Cpu size={24} className="text-indigo-400 shrink-0 mt-1" />
                        <div>
                          <h5 className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-1">Rekomendacja Prawno-Podatkowa AI</h5>
                          <p className="text-xs text-indigo-100 font-medium leading-relaxed">Twoja konfiguracja dla <b>UoP</b> jest w 100% zgodna z ustawą o PdOF i ubezpieczeniach (2026). Przeliczenia składek (Krok 3) poprawnie wchodzą przed naliczeniem potrąceń niestandardowych.</p>
                        </div>
                      </div>
                   </div>
                 </div>
              </div>
           )}

           {activeTab === 'components' && (
              <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 animate-in fade-in duration-500">
                 <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                   <h3 className="text-lg font-black text-slate-800 uppercase italic tracking-tighter">Ustawienia & Asystent AI Płac</h3>
                   <button 
                     onClick={() => {
                        setIsAnalyzingAi(true);
                        setTimeout(() => {
                           setAiFeedback({
                             message: "Zidentyfikowano brak aktualizacji składki rentowej (zgodnie z projektem ustawy na wrzesień 2026 r, składka rentowa pracodawcy wynosi 6.50% bez zmian, ale wprowadzono nowe ulgi dla branży IT). Podstawa: ustawa z dn. 13 paź 1998 r. o systemie ubezpieczeń społecznych z późn. zm.",
                             legalBasis: "Dz.U. 2026 poz. 1290",
                             hasError: false
                           });
                           setIsAnalyzingAi(false);
                        }, 2000);
                     }}
                     className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all">
                      <Sparkles size={14} /> Audyt AI Prawa Pracy
                   </button>
                 </div>

                 <div className="grid grid-cols-1 mt-6">
                    <div className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col gap-4 shadow-sm mb-6">
                       <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest">Aktywność Modułów (Elastyczny System)</h4>
                       <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div>
                            <div className="font-bold text-slate-800 text-sm">Rozliczanie ZUS, Podatków i PFRON</div>
                            <div className="text-[10px] text-slate-400 mt-0.5 font-medium">Jeżeli wyłączone, system będzie pokazywał tylko podstawę (np. rozliczenie B2B/godzinowe bez podatków PL).</div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={components.enableZusTaxes} onChange={(e) => {
                               const val = e.target.checked;
                               setComponents(c => ({...c, enableZusTaxes: val}));
                               saveComponents();
                            }} className="sr-only peer" />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                          </label>
                       </div>
                       <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div>
                            <div className="font-bold text-slate-800 text-sm">Integracja z Płatnikiem / Generowanie XML</div>
                            <div className="text-[10px] text-slate-400 mt-0.5 font-medium">Moduł deklaracji KEDU i PITów dla biura rachunkowego.</div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={components.enableReports} onChange={(e) => {
                               const val = e.target.checked;
                               setComponents(c => ({...c, enableReports: val}));
                               saveComponents();
                            }} className="sr-only peer" />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                          </label>
                       </div>
                       <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div>
                            <div className="font-bold text-slate-800 text-sm flex items-center gap-1"><Cpu size={14} className="text-indigo-500"/> Weryfikator Kandydatów AI (Auto-Analiza)</div>
                            <div className="text-[10px] text-slate-400 mt-0.5 font-medium">Asystent weryfikujący poprawność danych z ZUS/PIP, RODO, umowy, zgody przy operacjach HR.</div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={components.enableAiAssistance} onChange={(e) => {
                               const val = e.target.checked;
                               setComponents(c => ({...c, enableAiAssistance: val}));
                               saveComponents();
                            }} className="sr-only peer" />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                          </label>
                       </div>
                       <div className="flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-800 text-sm">Licencja i Skalowanie AI (Dla Dystrybutorów)</div>
                            <div className="text-[10px] text-slate-400 mt-0.5 font-medium">Zarządzanie licencją (Ilość użytkowników / tokenów)</div>
                          </div>
                          <select value={components.aiLicenseTier} onChange={e => {
                              setComponents(c => ({...c, aiLicenseTier: e.target.value}));
                              saveComponents();
                          }} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 outline-none">
                             <option value="BASIC">Osobista (1 HR, Podstawowa)</option>
                             <option value="PRO">PRO (do 5 HR, Audyt umów)</option>
                             <option value="ENTERPRISE">Korpo / Enterprise (nielimitowana wizja AI)</option>
                          </select>
                       </div>
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl">
                       <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4">Ustawienia Składek (Stan na 2026 r.)</h4>
                       <div className="space-y-3">
                         <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                            <span className="font-bold text-slate-600">ZUS Emerytalna (Pracodawca)</span>
                            {isEditingComponents ? <input type="number" step="0.01" value={components.zusEmerytalna} onChange={e => setComponents({...components, zusEmerytalna: parseFloat(e.target.value)})} className="w-20 px-2 py-0.5 rounded text-xs border" /> : <span className="font-mono bg-white border border-slate-100 px-2 py-0.5 rounded text-xs">{components.zusEmerytalna}%</span>}
                         </div>
                         <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                            <span className="font-bold text-slate-600">ZUS Rentowa (Pracodawca)</span>
                            {isEditingComponents ? <input type="number" step="0.01" value={components.zusRentowa} onChange={e => setComponents({...components, zusRentowa: parseFloat(e.target.value)})} className="w-20 px-2 py-0.5 rounded text-xs border" /> : <span className="font-mono bg-white border border-slate-100 px-2 py-0.5 rounded text-xs">{components.zusRentowa}%</span>}
                         </div>
                         <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                            <span className="font-bold text-slate-600">Składka Zdrowotna (Pracownik)</span>
                            {isEditingComponents ? <input type="number" step="0.01" value={components.zdrowotna} onChange={e => setComponents({...components, zdrowotna: parseFloat(e.target.value)})} className="w-20 px-2 py-0.5 rounded text-xs border" /> : <span className="font-mono bg-white border border-slate-100 px-2 py-0.5 rounded text-xs">{components.zdrowotna}%</span>}
                         </div>
                         <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                            <span className="font-bold text-slate-600">Fundusz Pracy & FS</span>
                            {isEditingComponents ? <input type="number" step="0.01" value={components.funduszPracy} onChange={e => setComponents({...components, funduszPracy: parseFloat(e.target.value)})} className="w-20 px-2 py-0.5 rounded text-xs border" /> : <span className="font-mono bg-white border border-slate-100 px-2 py-0.5 rounded text-xs">{components.funduszPracy}%</span>}
                         </div>
                         <div className="flex justify-between items-center text-sm">
                            <span className="font-bold text-emerald-600">Składka PPK (Pracodawca - Baza)</span>
                            {isEditingComponents ? <input type="number" step="0.01" value={components.ppk} onChange={e => setComponents({...components, ppk: parseFloat(e.target.value)})} className="w-20 px-2 py-0.5 rounded text-xs border border-emerald-500" /> : <span className="font-mono bg-white border border-emerald-100 px-2 py-0.5 rounded text-xs text-emerald-700">{components.ppk}%</span>}
                         </div>
                       </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl">
                       <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4">Podatki & Normy</h4>
                       <div className="space-y-3">
                         <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                            <span className="font-bold text-slate-600">I Próg Podatkowy (do 120 tys)</span>
                            {isEditingComponents ? <input type="number" step="0.01" value={components.taxProg1} onChange={e => setComponents({...components, taxProg1: parseFloat(e.target.value)})} className="w-20 px-2 py-0.5 rounded text-xs border" /> : <span className="font-mono bg-white border border-slate-100 px-2 py-0.5 rounded text-xs">{components.taxProg1}%</span>}
                         </div>
                         <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                            <span className="font-bold text-slate-600">II Próg Podatkowy (ponad prog)</span>
                            {isEditingComponents ? <input type="number" step="0.01" value={components.taxProg2} onChange={e => setComponents({...components, taxProg2: parseFloat(e.target.value)})} className="w-20 px-2 py-0.5 rounded text-xs border" /> : <span className="font-mono bg-white border border-slate-100 px-2 py-0.5 rounded text-xs">{components.taxProg2}%</span>}
                         </div>
                         <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                            <span className="font-bold text-indigo-600">Kwota Wolna (KUP Roczna)</span>
                            {isEditingComponents ? <input type="number" step="100" value={components.kwotaWolna} onChange={e => setComponents({...components, kwotaWolna: parseFloat(e.target.value)})} className="w-24 px-2 py-0.5 rounded text-xs border" /> : <span className="font-mono bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded text-xs text-indigo-700">{components.kwotaWolna} PLN</span>}
                         </div>
                         <div className="flex justify-between items-center text-sm">
                            <span className="font-bold text-slate-600">Zwykłe Koszty Uzysk. Przychodu</span>
                            {isEditingComponents ? <input type="number" step="1" value={components.kosztyUzyskania} onChange={e => setComponents({...components, kosztyUzyskania: parseFloat(e.target.value)})} className="w-24 px-2 py-0.5 rounded text-xs border" /> : <span className="font-mono bg-white border border-slate-100 px-2 py-0.5 rounded text-xs">{components.kosztyUzyskania} PLN</span>}
                         </div>
                       </div>
                    </div>
                 </div>
                 
                 <div className="mt-6 flex justify-end">
                    {isEditingComponents ? (
                       <button onClick={saveComponents} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all"><Save size={14} /> Zapisz Konfigurację</button>
                    ) : (
                       <button onClick={() => setIsEditingComponents(true)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all"><Settings size={14} /> Edytuj Płace Globalnie</button>
                    )}
                 </div>

                 {/* Kreator Składników Customowych */}
                 <div className="mt-8 pt-8 border-t border-slate-100">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h4 className="text-sm font-black uppercase tracking-widest text-slate-800">Werylizacja i Składniki Niestandardowe</h4>
                        <p className="text-[10px] text-slate-400 font-medium mt-1">Definiuj dodatki, potrącenia, premie. Zaznacz, czy wchodzą do ZUS i PIT.</p>
                      </div>
                      <button className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all"><PlusCircle size={14}/> Dodaj Składnik</button>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
                       <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100">
                             <tr className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                <th className="px-5 py-3">Nazwa składnika</th>
                                <th className="px-5 py-3">Typ</th>
                                <th className="px-5 py-3">Podstawa ZUS?</th>
                                <th className="px-5 py-3">Podstawa PIT?</th>
                                <th className="px-5 py-3 text-right">Opcje</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                             <tr>
                                <td className="px-5 py-3 font-bold text-slate-800">Premia Uznaniowa (Projektowa)</td>
                                <td className="px-5 py-3"><span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-black uppercase">Dodatek</span></td>
                                <td className="px-5 py-3"><span className="text-emerald-600 font-bold">TAK</span></td>
                                <td className="px-5 py-3"><span className="text-emerald-600 font-bold">TAK</span></td>
                                <td className="px-5 py-3 text-right"><button className="text-[10px] font-black uppercase text-indigo-600">Edytuj</button></td>
                             </tr>
                             <tr>
                                <td className="px-5 py-3 font-bold text-slate-800">Używanie własnego auta</td>
                                <td className="px-5 py-3"><span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-black uppercase">Dodatek</span></td>
                                <td className="px-5 py-3"><span className="text-rose-600 font-bold">NIE</span></td>
                                <td className="px-5 py-3"><span className="text-emerald-600 font-bold">TAK</span></td>
                                <td className="px-5 py-3 text-right"><button className="text-[10px] font-black uppercase text-indigo-600">Edytuj</button></td>
                             </tr>
                             <tr>
                                <td className="px-5 py-3 font-bold text-slate-800">Karta MultiSport (Fin. przez Pracownika)</td>
                                <td className="px-5 py-3"><span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-[10px] font-black uppercase">Potrącenie Z NETTO</span></td>
                                <td className="px-5 py-3"><span className="text-slate-400 font-bold">-</span></td>
                                <td className="px-5 py-3"><span className="text-slate-400 font-bold">-</span></td>
                                <td className="px-5 py-3 text-right"><button className="text-[10px] font-black uppercase text-indigo-600">Edytuj</button></td>
                             </tr>
                          </tbody>
                       </table>
                    </div>
                 </div>
              </div>
           )}

           {activeTab === 'reports' && (
              <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden animate-in fade-in duration-500 shadow-2xl">
                 <div className="absolute -inset-4 bg-indigo-500/20 blur-3xl rounded-full"></div>
                 <div className="relative z-10">
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-2 flex items-center gap-3">
                      <FileArchive size={28} className="text-indigo-400" /> Wymiana Danych XML / API US & ZUS
                    </h3>
                    <p className="text-indigo-200 font-medium text-sm max-w-xl mb-10">Generowanie paczek do programu Płatnik (KEDU), masowe tworzenie deklaracji rocznych (PIT-11, PIT-4R) oraz obsługa składek na PFRON na podstawie faktycznych list płac przypisanych do projektów deweloperskich i serwisowych.</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div onClick={() => generateXML('PIT_11')} className="bg-white/10 border border-white/20 p-6 rounded-3xl hover:bg-white/15 transition-all cursor-pointer group">
                          <div className="w-12 h-12 bg-rose-500 rounded-xl flex items-center justify-center text-white font-black text-xs mb-4 group-hover:scale-110 transition-transform shadow-lg">PIT</div>
                          <h4 className="font-bold uppercase tracking-widest text-xs mb-2">Deklaracje PIT</h4>
                          <p className="text-[10px] text-slate-400 mb-4 h-10">Generuj XML PIT-11, PIT-4R i PIT-8C zgodne z API e-Deklaracje MinFin.</p>
                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1"><CheckCircle2 size={12}/> Pobierz XML .xml</span>
                       </div>
                       
                       <div onClick={() => generateXML('KEDU')} className="bg-white/10 border border-white/20 p-6 rounded-3xl hover:bg-white/15 transition-all cursor-pointer group">
                          <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white font-black text-xs mb-4 group-hover:scale-110 transition-transform shadow-lg">ZUS</div>
                          <h4 className="font-bold uppercase tracking-widest text-xs mb-2">Import/Eksport Płatnik</h4>
                          <p className="text-[10px] text-slate-400 mb-4 h-10">Budowa plików KEDU: ZUS RCA, RSA, DRA i formatowanie schematów (XSD).</p>
                          <span className="text-[10px] font-black uppercase tracking-widest text-blue-300">Generuj .XML</span>
                       </div>

                       <div onClick={() => generateXML('PFRON')} className="bg-white/10 border border-white/20 p-6 rounded-3xl hover:bg-white/15 transition-all cursor-pointer group">
                          <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center text-white font-black text-xs mb-4 group-hover:scale-110 transition-transform shadow-lg">PPK<br/>PFRON</div>
                          <h4 className="font-bold uppercase tracking-widest text-xs mb-2">Raporty Dodatkowe</h4>
                          <p className="text-[10px] text-slate-400 mb-4 h-10">Zliczanie mianownika i ekspert kalkulacji składek wpłat na e-PFRON2 / platformę PPK.</p>
                          <span className="text-[10px] font-black uppercase tracking-widest text-amber-300">Pobierz Raport (.CSV/.XML)</span>
                       </div>
                    </div>
                 </div>
              </div>
           )}

        </div>
      </div>
      {omNavigationOverlay?.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
             <div className="flex items-center gap-2 mb-4 text-emerald-600">
                <Network size={24} />
                <h3 className="text-xl font-black tracking-tight">Zarządzanie Osią Czasu</h3>
             </div>
             
             <p className="text-sm font-medium text-slate-600 mb-6 leading-relaxed">
               {omNavigationOverlay.type === 'department' 
                 ? "Działy mają ramy czasowe, miejsce w strukturze M-OM. Chcesz użyć zaawansowanego widoku (OM) do tworzenia struktury, zamiast płaskiego zapisu?" 
                 : "Stanowiska mają ramy czasowe, miejsce w strukturze, przypisanych rekruterów i profile. Chcesz użyć zaawansowanego widoku (OM)?"}
             </p>

             <div className="grid grid-cols-2 gap-3 mb-6">
                <button onClick={() => {
                   setOmNavigationOverlay({ ...omNavigationOverlay, isOpen: false });
                   setPromptOverlay({
                     isOpen: true,
                     config: {
                       title: omNavigationOverlay.type === 'department' ? "Podaj płaską nazwę działu:" : "Podaj płaską nazwę stanowiska:",
                       onSave: async (name) => {
                         if (!name?.trim()) return;
                         try {
                           if (omNavigationOverlay.type === 'department') {
                             await addDoc(collection(db, 'hr_departments'), { name: name.trim(), visibility: 'INTRANET', isBoard: false, isAudit: false, tenantId: activeTenantId, createdAt: serverTimestamp() });
                             setNewEmployee((prev: any) => ({...prev, department: name.trim()}));
                           } else {
                             await addDoc(collection(db, 'hr_roles'), { name: name.trim(), departmentId: '', visibility: 'INTRANET', tenantId: activeTenantId, createdAt: serverTimestamp() });
                             setNewEmployee((prev: any) => ({...prev, role: name.trim()}));
                           }
                         } catch (err) { handleFirestoreError(err, OperationType.CREATE, omNavigationOverlay.type === 'department' ? 'hr_departments' : 'hr_roles'); }
                       }
                     }
                   })
                }} className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-amber-50 border border-amber-100 hover:bg-amber-100 transition-colors text-amber-700">
                   <FastForward size={24} />
                   <span className="text-[10px] font-black uppercase text-center">Dodaj na szybko<br/>(Płaska lista)</span>
                </button>
                <button onClick={() => {
                   setOmNavigationOverlay({ ...omNavigationOverlay, isOpen: false });
                   if (onNavigateToOM) onNavigateToOM();
                }} className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-colors text-emerald-700">
                   <Network size={24} />
                   <span className="text-[10px] font-black uppercase text-center">Przejdź do OM<br/>(Relacje, Oś Czasu)</span>
                </button>
             </div>
             
             <button onClick={() => setOmNavigationOverlay(null)} className="w-full py-3 rounded-xl border border-slate-200 text-slate-500 font-bold hover:bg-slate-50 transition-colors text-sm">
                Anuluj Akcję
             </button>
          </div>
        </div>
      )}

    </div>
  );
}
