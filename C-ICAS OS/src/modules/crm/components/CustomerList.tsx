import React, { useEffect, useState } from 'react';
import {
  Building2, Mail, ShieldCheck, MoreVertical, Activity, TrendingUp
} from 'lucide-react';
import { motion } from 'motion/react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../../shared/lib/firestoreUtils';
import { useTenant } from '../../../shared/hooks/useTenant';
import { computeLeadScore, scoreLabel } from '../services/leadScoringService';

interface Props {
  onSelectCustomer?: (cust: any) => void;
}

export default function CustomerList({ onSelectCustomer }: Props) {
  const { activeTenantId } = useTenant();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeTenantId) return;
    const q = query(
      collection(db, 'customers'),
      where('tenantId', '==', activeTenantId),
      orderBy('name', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setCustomers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'customers'));

    return () => unsubscribe();
  }, [activeTenantId]);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'prospect': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'blocked': return 'bg-rose-50 text-rose-600 border-rose-100';
      default: return 'bg-slate-50 text-slate-400 border-slate-100';
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
       {customers.length === 0 && (
         <div className="col-span-full bg-slate-50 rounded-[3rem] p-20 text-center border-2 border-dashed border-slate-200">
            <Building2 className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Brak klientów w bazie. Dodaj pierwszego kontrahenta.</p>
         </div>
       )}
       {customers.map(cust => {
         const score = computeLeadScore({
           lastActivityMs: cust.lastActivityAt?.toDate?.()?.getTime() ?? 0,
           totalRevenue: cust.totalRevenue ?? 0,
           hasActiveDeal: false,
           serviceEventCount: cust.serviceEventCount ?? 0,
           activityCount30Days: 0,
         }).total;
         const sl = scoreLabel(score);
         return (
           <motion.div
              key={cust.id}
              whileHover={{ scale: 1.01 }}
              className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm relative group overflow-hidden"
           >
              <div className="flex gap-8">
                 <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center border-4 border-white shadow-xl flex-shrink-0 relative">
                    <Building2 size={40} className="text-slate-300" />
                    <span className={`absolute -top-1 -right-1 text-[8px] font-black px-1.5 py-0.5 rounded-full ${sl.bg} ${sl.color}`}>
                      {score}
                    </span>
                 </div>

                 <div className="flex-1 space-y-4">
                    <div className="flex justify-between items-start">
                       <div>
                          <h4 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter leading-none mb-2">{cust.name}</h4>
                          <div className="flex items-center gap-3">
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">NIP: {cust.nip || 'BRAK'}</span>
                             {cust.whiteListValid && <ShieldCheck size={14} className="text-emerald-500" />}
                          </div>
                       </div>
                       <div className="flex flex-col items-end gap-1">
                         <div className={`px-4 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${getStatusStyle(cust.status)}`}>
                           {cust.status}
                         </div>
                         <span className={`text-[8px] font-black ${sl.color}`}>{sl.label}</span>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-3 border border-slate-100">
                          <Mail size={16} className="text-slate-400" />
                          <span className="text-[10px] font-black text-slate-700 truncate">{cust.email || 'brak@email.pl'}</span>
                       </div>
                       <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-3 border border-slate-100">
                          <TrendingUp size={16} className="text-indigo-500" />
                          <span className="text-[10px] font-black text-slate-700">
                            {cust.totalRevenue ? `${(cust.totalRevenue as number).toLocaleString('pl-PL')} PLN` : (cust.value || '0 PLN')}
                          </span>
                       </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-50">
                       <button
                         onClick={() => onSelectCustomer?.(cust)}
                         className="flex-1 bg-slate-900 text-white py-4 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center justify-center gap-2">
                          <Activity size={14} /> Karta Klienta
                       </button>
                       <button className="px-6 border border-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 transition-all">
                          <MoreVertical size={16} />
                       </button>
                    </div>
                 </div>
              </div>
           </motion.div>
         );
       })}
    </div>
  );
}
