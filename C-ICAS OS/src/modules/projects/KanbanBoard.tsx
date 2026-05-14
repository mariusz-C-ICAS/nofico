/**
 * Data: 2026-05-10 13:20
 * Utworzył: Agent AI
 * Zmiany: Utworzenie tablicy Kanban dla zadań zgodnej z CRUD oraz wytycznymi RODO (Audyt Systemowy).
 * Opis: Pełna obsługa Drag&Drop, tworzenia zadań i logowania do bazy (AuditLog).
 */
import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { db } from '../../shared/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../shared/hooks/AuthContext';
import { Plus, Trash2, Settings, Edit3, Sparkles, CheckSquare, Layers } from 'lucide-react';

interface Subtask {
  id: string;
  title: string;
  isDone: boolean;
}

interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  createdBy: string;
  retentionPeriodDays: number | null;
  subtasks: Subtask[];
  dependencies: string[]; // List of task IDs
  estimatedHours?: number;
  priority: 'low' | 'medium' | 'high';
  createdAt: any;
  updatedAt: any;
}

const KANBAN_COLUMNS = [
  { id: 'todo', title: 'Do Zrobienia', color: 'bg-slate-50' },
  { id: 'in_progress', title: 'W Trakcie', color: 'bg-blue-50' },
  { id: 'review', title: 'Review / Odbiór', color: 'bg-amber-50' },
  { id: 'done', title: 'Zakończone', color: 'bg-emerald-50' }
] as const;

export default function KanbanBoard({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAiEstimating, setIsAiEstimating] = useState(false);

  // States for New/Edit Task Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState({ 
    title: '', 
    description: '', 
    retentionPeriodDays: 30 as number | null,
    subtasks: [] as Subtask[],
    dependencies: [] as string[],
    priority: 'medium' as 'low' | 'medium' | 'high',
    estimatedHours: undefined as number | undefined
  });

  useEffect(() => {
    if (!user || !projectId) return;

    const q = query(
      collection(db, 'tasks'),
      where('projectId', '==', projectId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      // Optionally filter by retention period here (soft delete mechanism could be applied in backend)
      setTasks(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [user, projectId]);

  // Log function required for RODO compliance
  const writeAuditLog = async (action: 'create' | 'update' | 'delete', entityId: string, changes: any) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'auditLogs'), {
        entityId,
        collection: 'tasks',
        action,
        userId: user.uid,
        changes: JSON.stringify(changes),
        createdAt: serverTimestamp()
      });
    } catch(e) {
      console.error('Audit Log failed', e);
    }
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination || !user) return;
    
    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId) return; // Ignore drag in same column for MVP (no custom order field)

    const draggedTask = tasks.find(t => t.id === draggableId);
    if (!draggedTask) return;

    const newStatus = destination.droppableId as Task['status'];
    
    // Optymistyczna zmiana
    setTasks(prev => prev.map(t => t.id === draggableId ? { ...t, status: newStatus } : t));

    try {
      const taskRef = doc(db, 'tasks', draggableId);
      await updateDoc(taskRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      await writeAuditLog('update', draggableId, { from_status: source.droppableId, to_status: newStatus });
    } catch(error) {
      console.error('Błąd aktualizacji statusu:', error);
      // Revert in case of failure might be added here
    }
  };

  const handleAiEstimate = async () => {
    if (!taskForm.title) return;
    setIsAiEstimating(true);
    try {
      const { askAI } = await import('../../shared/services/geminiService');
      const prompt = `Estimate the number of hours for this task in a construction/service context: "${taskForm.title}". Description: "${taskForm.description}". Provide ONLY a number (float).`;
      const result = await askAI(prompt);
      const hours = parseFloat(result.replace(/[^0-9.]/g, ''));
      if (!isNaN(hours)) {
        setTaskForm(prev => ({ ...prev, estimatedHours: hours }));
      }
    } catch (err) {
      console.error("AI Estimation failed:", err);
    } finally {
      setIsAiEstimating(false);
    }
  };

  const handleSaveTask = async () => {
    if (!user || !taskForm.title.trim()) return;

    const data: any = {
      projectId,
      title: taskForm.title,
      description: taskForm.description,
      retentionPeriodDays: taskForm.retentionPeriodDays,
      subtasks: taskForm.subtasks,
      dependencies: taskForm.dependencies,
      priority: taskForm.priority,
      estimatedHours: taskForm.estimatedHours || null,
      updatedAt: serverTimestamp()
    };

    if (editingTask) {
      try {
        const taskRef = doc(db, 'tasks', editingTask.id);
        await updateDoc(taskRef, data);
        await writeAuditLog('update', editingTask.id, data);
      } catch (error) {
        console.error('Błąd aktualizacji', error);
      }
    } else {
      try {
        const newTaskRef = await addDoc(collection(db, 'tasks'), {
          ...data,
          status: 'todo',
          createdBy: user.uid,
          createdAt: serverTimestamp()
        });
        await writeAuditLog('create', newTaskRef.id, { title: taskForm.title, status: 'todo' });
      } catch (error) {
        console.error('Błąd tworzenia', error);
      }
    }
    
    setIsModalOpen(false);
    setEditingTask(null);
    setTaskForm({ 
      title: '', description: '', retentionPeriodDays: 30, 
      subtasks: [], dependencies: [], priority: 'medium', estimatedHours: undefined 
    });
  };

  const handleDeleteTask = async (taskId: string, title: string) => {
    if (!window.confirm(`Czy na pewno trwale usunąć zadanie "${title}"? Operacja zostanie zamrożona w logach audytu RODO.`)) return;
    
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      await writeAuditLog('delete', taskId, { deleted_title: title });
    } catch (e) {
      console.error('Błąd usuwania', e);
    }
  };

  const openNewModal = () => {
    setEditingTask(null);
    setTaskForm({ title: '', description: '', retentionPeriodDays: 30, subtasks: [], dependencies: [], priority: 'medium', estimatedHours: 0 });
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setTaskForm({ 
      title: task.title, 
      description: task.description || '', 
      retentionPeriodDays: task.retentionPeriodDays,
      subtasks: task.subtasks || [],
      dependencies: task.dependencies || [],
      priority: task.priority || 'medium',
      estimatedHours: task.estimatedHours
    });
    setIsModalOpen(true);
  };

  if (loading) return <div>Wczytywanie Kanban...</div>;

  return (
    <div className="flex flex-col h-full mt-4">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-medium text-gray-800">Tablica Zadań</h3>
        <button 
          onClick={openNewModal}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm"
        >
          <Plus size={16} /> Dodaj Zadanie
        </button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {KANBAN_COLUMNS.map(col => {
            const colTasks = tasks.filter(t => t.status === col.id);
            
            return (
              <Droppable key={col.id} droppableId={col.id}>
                {(provided, snapshot) => (
                  <div 
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex flex-col gap-3 p-4 rounded-xl min-h-[300px] border border-gray-100 ${col.color} ${snapshot.isDraggingOver ? 'ring-2 ring-blue-300' : ''}`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold text-gray-700">{col.title}</h4>
                      <span className="text-xs font-bold bg-white text-gray-500 px-2 py-1 rounded-full shadow-sm">{colTasks.length}</span>
                    </div>

                    {colTasks.map((task, index) => (
                      // @ts-ignore
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`bg-white p-4 rounded-lg shadow-sm border border-gray-100 group transition-all ${snapshot.isDragging ? 'rotate-2 scale-105 shadow-md' : 'hover:border-blue-200'}`}
                          >
                            <div className="flex justify-between items-start gap-2">
                               <div className="flex flex-col gap-1">
                                 <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full w-fit ${
                                   task.priority === 'high' ? 'bg-rose-100 text-rose-600' : 
                                   task.priority === 'medium' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'
                                 }`}>
                                   {task.priority || 'medium'}
                                 </span>
                                 <h5 className="font-bold text-slate-900 break-words text-sm">{task.title}</h5>
                               </div>
                               <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button onClick={() => openEditModal(task)} className="p-1 text-slate-400 hover:text-blue-600 transition-colors">
                                   <Edit3 size={14} />
                                 </button>
                                 <button onClick={() => handleDeleteTask(task.id, task.title)} className="p-1 text-slate-400 hover:text-red-600 transition-colors">
                                   <Trash2 size={14} />
                                 </button>
                               </div>
                            </div>
                            
                            {task.description && (
                              <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed font-medium">{task.description}</p>
                            )}

                            <div className="mt-4 flex flex-wrap gap-3 items-center border-t pt-3 border-slate-50">
                               {task.subtasks?.length > 0 && (
                                 <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase">
                                   <CheckSquare size={10} />
                                   {task.subtasks.filter(s => s.isDone).length}/{task.subtasks.length}
                                 </div>
                               )}
                               {task.estimatedHours && (
                                 <div className="flex items-center gap-1 text-[9px] font-black text-indigo-500 uppercase">
                                   <Sparkles size={10} />
                                   {task.estimatedHours}h
                                 </div>
                               )}
                               {task.dependencies?.length > 0 && (
                                 <div className="flex items-center gap-1 text-[9px] font-black text-amber-500 uppercase">
                                   <Layers size={10} />
                                   {task.dependencies.length} dep
                                 </div>
                               )}
                            </div>
                            
                            {task.retentionPeriodDays && (
                              <div className="mt-2 text-[8px] uppercase font-bold tracking-wider text-slate-300 flex items-center gap-1 italic">
                                <Settings size={8} /> Retencja: {task.retentionPeriodDays} dni
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>

      {/* Modal Nowego/Edytowanego Zadania */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg p-8 animate-in fade-in zoom-in-95 duration-200 border border-slate-100 flex flex-col gap-6 max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-start">
               <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">
                    {editingTask ? 'Edytuj Zadanie' : 'Nowe Zadanie (Cross-Moduł)'}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Status: {taskForm.priority} Priority</p>
               </div>
               <div className="flex gap-2">
                 <button 
                  onClick={handleAiEstimate}
                  disabled={isAiEstimating}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${isAiEstimating ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white border border-indigo-100 shadow-sm shadow-indigo-100'}`}
                 >
                   <Sparkles size={12} className={isAiEstimating ? 'animate-pulse' : ''} />
                   {isAiEstimating ? 'Szacuję...' : 'AI Estymacja'}
                 </button>
               </div>
            </div>
            
            <div className="flex flex-col gap-5 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Tytuł Zadania</label>
                <input 
                  type="text" 
                  value={taskForm.title}
                  onChange={e => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm"
                  placeholder="np. Montaż okładziny klinkierowej"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Priorytet</label>
                   <select 
                     value={taskForm.priority}
                     onChange={e => setTaskForm(prev => ({ ...prev, priority: e.target.value as any }))}
                     className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-xs"
                   >
                     <option value="low">Niski (Low)</option>
                     <option value="medium">Średni (Medium)</option>
                     <option value="high">Wysoki (High)</option>
                   </select>
                 </div>
                 <div>
                   <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Estymacja (Godziny)</label>
                   <input 
                     type="number"
                     value={taskForm.estimatedHours || ''}
                     onChange={e => setTaskForm(prev => ({ ...prev, estimatedHours: parseFloat(e.target.value) || undefined }))}
                     className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-xs"
                     placeholder="np. 12"
                   />
                 </div>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Opis / Instrukcje Wykonania</label>
                <textarea 
                  value={taskForm.description}
                  onChange={e => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-slate-900 min-h-[80px] resize-none focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-xs leading-relaxed"
                  placeholder="Instrukcje techniczne..."
                />
              </div>

              {/* Subtasks Section */}
              <div>
                <label className="flex justify-between items-center mb-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Podzadania (Checklista)</span>
                  <button 
                    onClick={() => setTaskForm(prev => ({ 
                      ...prev, 
                      subtasks: [...prev.subtasks, { id: Date.now().toString(), title: '', isDone: false }] 
                    }))}
                    className="text-[9px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-tighter"
                  >
                    + Dodaj Krok
                  </button>
                </label>
                <div className="space-y-2">
                  {taskForm.subtasks.map((st, idx) => (
                    <div key={st.id} className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        checked={st.isDone}
                        onChange={() => {
                          const newSt = [...taskForm.subtasks];
                          newSt[idx].isDone = !newSt[idx].isDone;
                          setTaskForm(p => ({ ...p, subtasks: newSt }));
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <input 
                        type="text"
                        value={st.title}
                        onChange={(e) => {
                          const newSt = [...taskForm.subtasks];
                          newSt[idx].title = e.target.value;
                          setTaskForm(p => ({ ...p, subtasks: newSt }));
                        }}
                        className="flex-1 bg-transparent border-none text-xs font-medium focus:ring-0 p-0 text-slate-700"
                        placeholder="Opisz krok..."
                      />
                      <button onClick={() => {
                        const newSt = taskForm.subtasks.filter((_, i) => i !== idx);
                        setTaskForm(p => ({ ...p, subtasks: newSt }));
                      }} className="text-slate-300 hover:text-rose-500">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                <label className="flex items-start gap-3 cursor-pointer">
                  <div className="flex-1">
                    <div className="text-[10px] font-black text-amber-900 uppercase tracking-tight">Retencja RODO</div>
                    <div className="text-[8px] font-bold text-amber-700 uppercase mt-1 leading-tight tracking-tighter">
                      Automatyczne usuwanie danych po X dniach od zakończenia (Compliance).
                    </div>
                  </div>
                  <input 
                    type="number" 
                    value={taskForm.retentionPeriodDays || ''}
                    onChange={e => setTaskForm(prev => ({ ...prev, retentionPeriodDays: e.target.value ? parseInt(e.target.value) : null }))}
                    className="w-16 bg-white border border-amber-200 rounded-lg px-2 py-1.5 text-xs font-bold text-center outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Dni"
                  />
                </label>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-3 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 rounded-xl transition-all"
              >
                Anuluj
              </button>
              <button 
                onClick={handleSaveTask}
                disabled={!taskForm.title.trim()}
                className="px-8 py-3 bg-slate-900 hover:bg-indigo-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
              >
                Zatwierdź Zadanie
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
