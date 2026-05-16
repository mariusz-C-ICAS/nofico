import React, { useState, useEffect } from 'react';
import { db } from '../../shared/lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, setDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { useAuth } from '../../shared/hooks/AuthContext';
import { Settings, CheckCircle, XCircle, Plus, LayoutGrid } from 'lucide-react';
import ArchitectAIWizard from './ArchitectAIWizard';

export default function SystemModulesAdmin() {
  const { user, userData, hasPermission } = useAuth();
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAIWizard, setShowAIWizard] = useState(false);

  const hasAccess = hasPermission('*') || hasPermission('roles.manage');

  useEffect(() => {
    if (!hasAccess) return;
    const q = query(collection(db, 'systemModules'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setModules(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsubscribe;
  }, [hasAccess]);

  const initDefaultModules = async () => {
    const defaults = [
      { key: 'time', name: 'Rejestracja Czasu', description: 'Logowanie godzin', icon: 'Clock', path: '/time', color: 'bg-blue-100 text-blue-600', isActive: true, category: 'system' },
      { key: 'projects', name: 'Projekty', description: 'Zadania Kanban', icon: 'LayoutDashboard', path: '/projects', color: 'bg-gray-100 text-gray-600', isActive: true, category: 'system' },
      { key: 'ai', name: 'AI Assistant', description: 'Zarządzanie AI', icon: 'BrainCircuit', path: '/ai', color: 'bg-fuchsia-100 text-fuchsia-600', isActive: true, category: 'system' },
      { key: 'lms', name: 'Szkolenia & LMS', description: 'Baza wiedzy i kursy', icon: 'BookOpen', path: '/lms', color: 'bg-indigo-100 text-indigo-600', isActive: true, category: 'system' },
      
      { key: 'construction', name: 'Budownictwo', description: 'Kosztorysy i nadzór', icon: 'HardHat', path: '/construction', color: 'bg-amber-100 text-amber-600', isActive: true, category: 'business' },
      { key: 'gardening', name: 'Ogrody', description: 'Nawadnianie i rośliny', icon: 'Leaf', path: '/gardening', color: 'bg-emerald-100 text-emerald-600', isActive: true, category: 'business' },
      { key: 'cleaning', name: 'Sprzątanie', description: 'KPO i chemia', icon: 'Sparkles', path: '/cleaning', color: 'bg-sky-100 text-sky-600', isActive: true, category: 'business' },
      { key: 'hr', name: 'Płace i Ewidencja', description: 'HR & Payroll', icon: 'DollarSign', path: '/hr', color: 'bg-emerald-100 text-emerald-600', isActive: true, category: 'business' },
    ];

    for (const m of defaults) {
      const docRef = doc(db, 'systemModules', m.key);
      await setDoc(docRef, { ...m, updatedAt: serverTimestamp() }, { merge: true });
    }
  };

  const toggleModuleState = async (moduleId: string, currentStatus: boolean, moduleName: string) => {
    try {
      await updateDoc(doc(db, 'systemModules', moduleId), {
        isActive: !currentStatus,
        updatedAt: serverTimestamp()
      });

      // Zapisujemy w Audit Log dla celów raportowania nieaktywnych modułów
      if (user) {
        await addDoc(collection(db, 'auditLogs'), {
          entityId: moduleId,
          collection: 'systemModules',
          action: 'update',
          userId: user.uid,
          changes: `Zmieniono status modułu ${moduleName} na ${!currentStatus ? 'Włączony' : 'Wyłączony'}`,
          createdAt: serverTimestamp()
        });
      }

    } catch(e) {
      console.error(e);
      alert('Błąd przełączania modułu.');
    }
  };

  if (!hasAccess) return null;

  return (
    <>
      {showAIWizard && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
           <div className="w-full max-w-4xl max-h-[90vh] overflow-auto rounded-[3rem] shadow-3xl border border-white/10 relative">
              <button 
                onClick={() => setShowAIWizard(false)}
                className="absolute top-8 right-8 z-20 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-md transition-all"
              >
                 <Settings size={24} className="rotate-45" />
              </button>
              <ArchitectAIWizard onComplete={() => setShowAIWizard(false)} />
           </div>
        </div>
      )}

      <div className="space-y-8 mt-6">
        {/* Systemowa Grupa */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8">
          <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center mb-10 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-slate-900 rounded-2xl shadow-xl">
                 <LayoutGrid size={24} className="text-white" />
              </div>
              <div>
                 <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Infrastruktura Systemowa</h2>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Zarządzanie rdzeniem FieldTime OS</p>
              </div>
            </div>
            
            <button 
              onClick={() => setShowAIWizard(true)}
              className="flex items-center gap-3 bg-amber-500 hover:bg-amber-600 text-slate-950 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-amber-500/20 active:scale-95"
            >
              <Plus size={16} /> Uruchom Architekta AI
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {modules.filter(m => m.category === 'system' || !m.category).map(renderModuleCard)}
          </div>
        </div>

        {/* Biznesowa Grupa */}
        <div className="bg-slate-50 rounded-[2.5rem] shadow-sm border border-slate-200 p-8">
           <div className="mb-10 pb-6 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Moduły Biznesowe (DMS)</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Włączanie logiki branżowej per Workspace</p>
              </div>
              {modules.length === 0 && !loading && (
                <button 
                  onClick={initDefaultModules}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl transition-all active:scale-95"
                >
                  <Plus size={16} /> Inicjuj Moduły Biznesowe
                </button>
              )}
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
              {modules.filter(m => m.category === 'business').map(renderModuleCard)}
           </div>
        </div>
      </div>
    </>
  );

  function renderModuleCard(m: any) {
     return (
        <div key={m.id} className="p-6 rounded-[2rem] border border-slate-200 bg-white shadow-sm flex items-center justify-between group hover:shadow-xl transition-all">
          <div className="flex items-center gap-4">
             <div className={`p-3 rounded-xl transition-all group-hover:scale-110 ${m.color || 'bg-slate-100 text-slate-500'}`}>
                {/* Fallback for icon rendering if needed, for now just show name */}
                <LayoutGrid size={20} />
             </div>
             <div>
               <div className="text-sm font-black text-slate-900 italic uppercase tracking-tight">{m.name}</div>
               <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate w-24 md:w-32">{m.path}</div>
             </div>
          </div>
          <button 
            onClick={() => toggleModuleState(m.id, m.isActive, m.name)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-sm ${
              m.isActive ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-rose-500 text-white shadow-rose-200'
            }`}
          >
            {m.isActive ? <CheckCircle size={14} /> : <XCircle size={14} />}
            {m.isActive ? 'On' : 'Off'}
          </button>
        </div>
     );
  }
}
