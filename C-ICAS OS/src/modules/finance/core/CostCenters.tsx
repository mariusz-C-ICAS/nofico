import React, { useState, useEffect } from 'react';
import { 
  Briefcase, Plus, PieChart, BarChart3,
  TrendingUp, Layers, Target,
} from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { useTenant } from '../../../shared/hooks/useTenant';

interface CostCenter {
  id: string;
  code: string;
  name: string;
  budget: number;
  spent: number;
  parentId: string | null;
  type: 'DIAL' | 'PROJECT' | 'TASK' | 'FIRM';
}

export default function CostCenters() {
  const { activeTenantId } = useTenant();
  const [centers, setCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCenter, setNewCenter] = useState<Partial<CostCenter>>({
    code: '',
    name: '',
    budget: 0,
    spent: 0,
    type: 'DIAL',
    parentId: null
  });

  useEffect(() => {
    if (!activeTenantId) return;

    const mpkPath = `tenants/${activeTenantId}/costCenters`;
    const q = query(collection(db, mpkPath), orderBy('code', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: CostCenter[] = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() } as CostCenter);
      });
      setCenters(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activeTenantId]);

  const handleAddCenter = async () => {
    if (!activeTenantId || !newCenter.code || !newCenter.name) return;
    try {
      const mpkPath = `tenants/${activeTenantId}/costCenters`;
      await addDoc(collection(db, mpkPath), {
        ...newCenter,
        createdAt: serverTimestamp()
      });
      setShowAddModal(false);
      setNewCenter({ code: '', name: '', budget: 0, spent: 0, type: 'DIAL', parentId: null });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight italic flex items-center gap-2">
              <Target className="text-indigo-600" size={20} /> Miejsca Powstania Kosztów (MPK)
           </h3>
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">Analityka kosztowa • Budżetowanie per dział/projekt</p>
        </div>
        <div className="flex gap-3">
           <button 
             onClick={() => setShowAddModal(true)}
             className="bg-slate-900 text-white px-8 py-3 rounded-xl shadow-xl hover:bg-indigo-600 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
           >
              <Plus size={16} /> Nowe MPK
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {centers.length === 0 && !loading ? (
             <div className="col-span-3 py-20 text-center bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200 text-slate-300">
                <PieChart size={64} className="mx-auto mb-4 opacity-10" />
                <p className="text-[10px] font-black uppercase tracking-widest">Brak zdefiniowanych centrów kosztowych</p>
             </div>
         ) : (
           centers.map(mpk => {
             const progress = (mpk.spent / mpk.budget) * 100;
             const isOver = progress > 100;

             return (
               <div key={mpk.id} className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/5 transition-all group relative overflow-hidden">
                  <div className={`absolute top-0 right-0 w-2 h-full ${isOver ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                  <div className="flex justify-between items-start mb-6">
                     <div className="bg-slate-50 p-3 rounded-2xl text-slate-400">
                        {mpk.type === 'PROJECT' ? <Briefcase size={20} /> : <Layers size={20} />}
                     </div>
                     <span className="text-[9px] font-black px-3 py-1 bg-slate-100 text-slate-400 rounded-full uppercase tracking-widest italic">{mpk.code}</span>
                  </div>
                  <div>
                     <h4 className="text-lg font-black text-slate-800 uppercase italic tracking-tighter leading-tight mb-2">{mpk.name}</h4>
                     <div className="flex justify-between items-center mb-6">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Wykorzystanie Budżetu</span>
                        <span className={`text-[10px] font-black uppercase italic ${isOver ? 'text-rose-600' : 'text-emerald-600'}`}>{progress.toFixed(1)}%</span>
                     </div>
                     <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-8">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${isOver ? 'bg-rose-500' : 'bg-indigo-600'}`}
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        ></div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Budżet</div>
                           <div className="text-sm font-black text-slate-700 italic">{mpk.budget.toLocaleString()} PLN</div>
                        </div>
                        <div className="text-right">
                           <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Wydano</div>
                           <div className="text-sm font-black text-slate-900 italic">{mpk.spent.toLocaleString()} PLN</div>
                        </div>
                     </div>
                  </div>
               </div>
             )
           })
         )}
      </div>

      <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden shadow-2xl">
         <div className="absolute inset-0 bg-indigo-600/5 blur-3xl rounded-full translate-x-1/2"></div>
         <div className="relative z-10 max-w-lg">
            <h4 className="text-2xl font-black uppercase tracking-tighter italic mb-4">Konsolidacja Wielopoziomowa</h4>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest leading-relaxed">
               System NoFiCo-FIN pozwala na przypisywanie każdego zapisu księgowego do MPK. Dane są agregowane w czasie rzeczywistym, dając pełen obraz rentowności poszczególnych komórek firmy.
            </p>
         </div>
         <div className="relative z-10 flex gap-4 w-full md:w-auto">
            <button className="flex-1 md:flex-none border border-slate-700 px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2">
               <BarChart3 size={16} /> Raport Rentowności
            </button>
            <button className="flex-1 md:flex-none bg-indigo-600 px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-500/10 hover:bg-indigo-500 transition-all flex items-center gap-2">
               <TrendingUp size={16} /> Analiza Odchyleń
            </button>
         </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-8">
                 <h4 className="text-xl font-black text-slate-900 uppercase italic">Nowe MPK</h4>
                 <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>
              <div className="space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Symbol</label>
                       <input 
                         type="text" 
                         value={newCenter.code}
                         onChange={e => setNewCenter({...newCenter, code: e.target.value})}
                         className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500" 
                         placeholder="np. D/01"
                       />
                    </div>
                    <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Typ</label>
                       <select 
                         value={newCenter.type}
                         onChange={e => setNewCenter({...newCenter, type: e.target.value as any})}
                         className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                       >
                          <option value="DIAL">Dział</option>
                          <option value="PROJECT">Projekt</option>
                          <option value="TASK">Zadanie</option>
                          <option value="FIRM">Firma</option>
                       </select>
                    </div>
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Nazwa MPK</label>
                    <input 
                      type="text" 
                      value={newCenter.name}
                      onChange={e => setNewCenter({...newCenter, name: e.target.value})}
                      className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500" 
                      placeholder="np. Dział Marketingu"
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Budżet Roczny (PLN)</label>
                    <input 
                      type="number" 
                      value={newCenter.budget}
                      onChange={e => setNewCenter({...newCenter, budget: parseFloat(e.target.value) || 0})}
                      className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500" 
                    />
                 </div>
                 <button 
                   onClick={handleAddCenter}
                   className="w-full bg-slate-900 text-white font-black py-4 rounded-xl text-[11px] uppercase tracking-widest shadow-xl shadow-slate-100 hover:bg-indigo-600 transition-all mt-4"
                 >
                    Zapisz MPK
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
