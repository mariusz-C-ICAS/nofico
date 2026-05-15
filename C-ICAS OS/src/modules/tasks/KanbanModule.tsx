import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../../shared/lib/firebase';
import { useAuth } from '../../shared/hooks/AuthContext';
import { handleFirestoreError, OperationType } from '../../shared/lib/firestoreUtils';

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  status: 'todo' | 'in_progress' | 'done';
  customBucket?: string;
  dueDate?: Date | null;
  sourceNotificationId?: string;
  isPrivate?: boolean;
}

export function KanbanModule() {
  const { user, hasPermission } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [managerMode, setManagerMode] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isPrivateTask, setIsPrivateTask] = useState(false);
  const [teamFilter, setTeamFilter] = useState<string>('ALL');
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string | null>(null);

  const analyzeKanban = async () => {
     setIsAnalyzingAi(true);
     setAiAnalysisResult(null);
     try {
        const taskSummary = tasks.map(t => `${t.assignedTo} - ${t.status} - ${t.isPrivate ? 'PRIVATE (BLOCKER)' : t.title}`).join('\n');

        const res = await fetch('/api/v1/ai/chat', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
              message: `Jesteś analitykiem HR/Managerem. Przeanalizuj poniższe zadania Kanban zespołu:\n\n${taskSummary}\n\nWskaż zwięźle (max 3 pkt), kto jest przeciążony zadaniami (np. dużo w IN PROGRESS / TODO w stosunku do innych), a kto ma luźniej, i zwróć uwagę na osoby posiadające prywatne blokery.`
           })
        });
        const data = await res.json();
        setAiAnalysisResult(data.reply);
     } catch (err: any) {
        setAiAnalysisResult('Błąd AI. Zobacz konsolę.');
     } finally {
        setIsAnalyzingAi(false);
     }
  };

  // Example buckets map
  const columns = [
    { id: 'todo', label: 'Do zrobienia' },
    { id: 'in_progress', label: 'W przygotowaniu / Robione' },
    { id: 'done', label: 'Zrobione' }
  ];

  useEffect(() => {
    if (!user) return;
    fetchTasks();
  }, [user, managerMode, teamFilter]);

  const fetchTasks = async () => {
    try {
      // In manager mode we might fetch team's tasks (mocked here, we just fetch all for demo if admin/manager or just user's)
      const tasksRef = collection(db, 'tasks');
      let q = query(tasksRef, where('assignedTo', '==', user?.uid)); // Domyślnie prywatne

      if (managerMode) {
         if (teamFilter === 'ALL') {
            q = query(tasksRef);
         } else {
            q = query(tasksRef, where('assignedTo', '==', teamFilter));
         }
      }

      const snap = await getDocs(q);
      const items = snap.docs.map(t => ({ id: t.id, ...t.data() } as Task));
      setTasks(items);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'tasks');
    }
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !user) return;
    try {
      const payload = {
        title: newTaskTitle,
        description: '',
        assignedTo: user.uid,
        status: 'todo',
        isPrivate: isPrivateTask,
        createdAt: serverTimestamp(),
      };
      const ref = await addDoc(collection(db, 'tasks'), payload);
      setTasks([...tasks, { id: ref.id, ...payload } as unknown as Task]);
      setNewTaskTitle('');
      setIsPrivateTask(false);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'tasks');
    }
  };

  const moveTask = async (taskId: string, newStatus: Task['status']) => {
    try {
      await updateDoc(doc(db, 'tasks', taskId), { status: newStatus });
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    } catch (e) {
      console.error(e);
    }
  };

  return (
      <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
            <div className="flex items-center gap-6">
               <div className="w-16 h-16 bg-blue-100 rounded-[2rem] flex items-center justify-center -rotate-6 shadow-sm border border-blue-200">
                  <span className="text-blue-600 font-bold">KBN</span>
               </div>
               <div>
                  <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase leading-none">Moje Zadania</h1>
                  <p className="text-slate-400 text-sm font-medium mt-2 italic max-w-xl">
                     Tablica Kanban z opcją customowych sub-bucketów. Powiadomienia z AI mogą trafiać bezpośrednio tutaj.
                  </p>
               </div>
            </div>
            {/* Manager Toggle Simulation */}
            <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-2">
               <span className="text-[10px] font-black uppercase text-slate-400 pl-4">Widok:</span>
               <button onClick={() => setManagerMode(false)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${!managerMode ? 'bg-blue-600 text-white' : 'hover:bg-slate-50'}`}>Prywatny</button>
               <button onClick={() => setManagerMode(true)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${managerMode ? 'bg-blue-600 text-white' : 'hover:bg-slate-50'}`}>Zespołu (Manager)</button>
            </div>
         </div>

         {managerMode && (
           <div className="bg-slate-50 border border-slate-100 p-4 rounded-3xl mb-4 flex items-center gap-4">
             <span className="text-[10px] font-black uppercase text-slate-400">Filtr Zespołu / Pracownika:</span>
             <select
               className="bg-white border border-slate-200 px-4 py-2 flex-1 rounded-xl text-sm font-bold text-slate-700 outline-none"
               value={teamFilter}
               onChange={e => setTeamFilter(e.target.value)}
             >
               <option value="ALL">Wszyscy pracownicy (Global)</option>
               <option value="user_123">Kowalski Jan</option>
               <option value="user_456">Nowak Anna</option>
               {/* Dodatkowe dynamiczne dane w przyszłości */}
             </select>
             <button onClick={analyzeKanban} disabled={isAnalyzingAi} className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-6 py-2 rounded-xl text-[10px] font-black uppercase shadow-sm hover:bg-emerald-100 transition-all disabled:opacity-50">
               <span className="flex items-center gap-2">🧠 {isAnalyzingAi ? 'Analizowanie...' : 'AI Analiza Obłożenia Zespołu'}</span>
             </button>
           </div>
         )}

         {aiAnalysisResult && (
           <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-3xl mb-4 text-sm font-medium text-slate-700 whitespace-pre-wrap">
             {aiAnalysisResult}
             <div className="mt-4 flex justify-end">
                <button onClick={() => setAiAnalysisResult(null)} className="text-[10px] uppercase font-black text-slate-400 hover:text-slate-600">Zamknij to okno</button>
             </div>
           </div>
         )}

         <form onSubmit={addTask} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
            <input
               type="text"
               className="flex-1 bg-transparent px-4 py-3 outline-none font-medium italic w-full"
               placeholder="Szybko dodaj zadanie (Enter)"
               value={newTaskTitle}
               onChange={e => setNewTaskTitle(e.target.value)}
            />
            <div className="flex items-center gap-4 w-full md:w-auto">
               <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase cursor-pointer">
                  <input type="checkbox" checked={isPrivateTask} onChange={e => setIsPrivateTask(e.target.checked)} className="rounded border-slate-300 text-rose-500 focus:ring-rose-500" />
                  <span className={isPrivateTask ? "text-rose-500" : ""}>Zablokowany blok czasu (Private)</span>
               </label>
               <button className="bg-slate-900 text-white px-8 py-3 w-full md:w-40 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-md">Dodaj</button>
            </div>
         </form>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {columns.map(col => (
               <div key={col.id} className="bg-slate-50/50 border border-slate-100 rounded-[2.5rem] p-6 flex flex-col gap-4">
                  <div className="flex items-center justify-between px-2">
                     <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">{col.label}</h3>
                     <span className="text-xs font-black text-slate-400">{tasks.filter(t => t.status === col.id).length}</span>
                  </div>

                  <div className="flex-1 space-y-4">
                     {tasks.filter(t => t.status === col.id).map(task => {
                        // Manager widzi cudze zadanie prywatne jako zablokowane
                        const isMaskedPrivate = task.isPrivate && task.assignedTo !== user?.uid;

                        return (
                        <div key={task.id} className={`bg-white p-6 rounded-3xl border shadow-sm group ${isMaskedPrivate ? 'border-rose-100 bg-rose-50/30' : 'border-slate-100'}`}>
                           <h4 className={`font-bold italic leading-snug ${isMaskedPrivate ? 'text-rose-400' : 'text-slate-800'}`}>
                              {isMaskedPrivate ? "🔒 Zablokowany blok czasu (Niedostępny)" : task.title}
                           </h4>
                           {(managerMode || task.customBucket || task.isPrivate) && (
                              <div className="mt-3 flex gap-2 flex-wrap">
                                 {task.isPrivate && !isMaskedPrivate && <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-lg text-[9px] font-black uppercase">🔒 Prywatne</span>}
                                 {!isMaskedPrivate && task.customBucket && <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase">{task.customBucket}</span>}
                                 {managerMode && <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase">UID: {task.assignedTo.substring(0, 4)}</span>}
                              </div>
                           )}

                           {/* Quick Actions */}
                           {!isMaskedPrivate && (
                              <div className="mt-6 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                 {col.id !== 'todo' && <button onClick={() => moveTask(task.id, 'todo')} className="text-[9px] font-black text-slate-400 hover:text-blue-600 uppercase">Wstecz</button>}
                                 {col.id !== 'in_progress' && <button onClick={() => moveTask(task.id, 'in_progress')} className="text-[9px] font-black text-slate-400 hover:text-blue-600 uppercase">W Toku</button>}
                                 {col.id !== 'done' && <button onClick={() => moveTask(task.id, 'done')} className="text-[9px] font-black text-emerald-400 hover:text-emerald-600 uppercase">Gotowe</button>}
                              </div>
                           )}
                        </div>
                     )})}
                     {tasks.filter(t => t.status === col.id).length === 0 && (
                        <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl">
                           <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Pusty sub-bucket</span>
                        </div>
                     )}
                  </div>
               </div>
            ))}
         </div>
      </div>
  );
}
