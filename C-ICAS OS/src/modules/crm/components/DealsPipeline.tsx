/**
 * Data: 2026-05-12
 * Zmiany: Kanban szans sprzedażowych (Pipeline).
 * Ścieżka: /src/modules/crm/components/DealsPipeline.tsx
 */
import React, { useEffect, useState } from 'react';
import { 
  Building2, TrendingUp, Clock, User, 
  MoreVertical, CheckCircle2, AlertCircle,
  Plus
} from 'lucide-react';
import { motion } from 'motion/react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, onSnapshot, orderBy, updateDoc, doc, where } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../../shared/lib/firestoreUtils';
import { useAuth } from '../../../shared/hooks/AuthContext';

interface Deal {
  id: string;
  title: string;
  customer?: string;
  customerId: string;
  value: number;
  probability: number;
  stage: 'lead' | 'meeting' | 'quote' | 'negotiation' | 'closed_won' | 'closed_lost';
}

export default function DealsPipeline() {
  const { userData, activeTenantId } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  const stages = [
    { id: 'lead', title: 'Leady', color: 'bg-slate-100 text-slate-500' },
    { id: 'meeting', title: 'Spotkania', color: 'bg-indigo-50 text-indigo-600' },
    { id: 'quote', title: 'Oferta', color: 'bg-amber-50 text-amber-600' },
    { id: 'negotiation', title: 'Negocjacje', color: 'bg-rose-50 text-rose-600' }
  ];

  useEffect(() => {
    if (!activeTenantId) return;
    const q = query(
      collection(db, 'deals'), 
      where('tenantId', '==', activeTenantId),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setDeals(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Deal)));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'deals'));

    return () => unsubscribe();
  }, [activeTenantId]);

  const handleStageChange = async (dealId: string, newStage: string) => {
    try {
      await updateDoc(doc(db, 'deals', dealId), { stage: newStage });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `deals/${dealId}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-40">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 h-full min-h-[600px]">
       {stages.map(stage => (
         <div key={stage.id} className="flex flex-col gap-6">
            <div className={`p-6 rounded-[2rem] flex justify-between items-center border border-slate-100 shadow-sm ${stage.color}`}>
               <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${stage.color.split(' ')[1].replace('text', 'bg')}`}></div>
                  <h5 className="text-[11px] font-black uppercase tracking-[0.2em]">{stage.title}</h5>
               </div>
               <span className="text-[10px] font-black opacity-60">
                 {deals.filter(d => d.stage === stage.id).length}
               </span>
            </div>

            <div className="flex-1 space-y-4">
               {deals.filter(d => d.stage === stage.id).map(deal => (
                 <motion.div 
                    key={deal.id}
                    layoutId={deal.id}
                    whileHover={{ scale: 1.02 }}
                    className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-100 transition-all cursor-grab active:cursor-grabbing group"
                 >
                    <div className="flex justify-between items-start mb-6">
                       <h6 className="text-[14px] font-black text-slate-900 uppercase italic leading-tight group-hover:text-indigo-600 transition-colors">
                          {deal.title}
                       </h6>
                       <button className="text-slate-200 hover:text-slate-900 transition-colors">
                          <MoreVertical size={16} />
                       </button>
                    </div>

                    <div className="flex items-center gap-3 mb-6">
                       <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center">
                          <Building2 size={14} className="text-slate-400" />
                       </div>
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{deal.customer || 'Nieznany Klient'}</span>
                    </div>

                    <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 mb-6">
                       <div className="flex justify-between items-center mb-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase">Wartość</span>
                          <span className="text-xs font-black text-slate-900 italic">{(deal.value || 0).toLocaleString()} PLN</span>
                       </div>
                       <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black text-slate-400 uppercase">Prawdopodobieństwo</span>
                          <span className="text-[10px] font-black text-indigo-600">{deal.probability || 0}%</span>
                       </div>
                    </div>

                    <div className="flex justify-between items-center">
                       <div className="flex -space-x-2">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center">
                             <User size={12} className="text-indigo-600" />
                          </div>
                       </div>
                    </div>
                 </motion.div>
               ))}
               
               <button className="w-full py-6 rounded-[2rem] border-2 border-dashed border-slate-100 text-slate-300 hover:text-indigo-600 hover:border-indigo-100 hover:bg-slate-50 transition-all flex items-center justify-center gap-3 group">
                  <Plus size={18} className="group-hover:scale-125 transition-transform" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Dodaj Szansę</span>
               </button>
            </div>
         </div>
       ))}
    </div>
  );
}
