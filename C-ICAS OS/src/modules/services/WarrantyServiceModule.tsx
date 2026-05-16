import React, { useState, useEffect } from 'react';
import { db } from '../../shared/lib/firebase';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { 
  Shield, AlertTriangle, PenTool, Search, 
  Calendar, User, List, Clock, CheckCircle2,
  Wrench, Zap, FileText, Plus
} from 'lucide-react';
import { useAuth } from '../../shared/hooks/AuthContext';

export default function WarrantyServiceModule() {
  const { userData, activeTenantId } = useAuth();
  const [services, setServices] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'sla' | 'history'>('all');
  
  const [newService, setNewService] = useState({ 
    title: '', 
    clientId: '', 
    type: 'warranty', 
    priority: 'medium',
    status: 'new',
    assignedTo: '',
    description: '',
    slaDeadline: ''
  });

  useEffect(() => {
    if (!activeTenantId) return;
    const q = query(collection(db, 'services'), where('tenantId', '==', activeTenantId), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, []);

  const handleSave = async () => {
    if (!newService.title.trim()) return alert("Tytuł zgłoszenia jest wymagany.");
    try {
      await addDoc(collection(db, 'services'), {
        ...newService,
        reportedBy: userData?.name || userData?.email,
        createdAt: serverTimestamp(),
        lastUpdate: serverTimestamp()
      });
      setIsAdding(false);
      setNewService({ title: '', clientId: '', type: 'warranty', priority: 'medium', status: 'new', assignedTo: '', description: '', slaDeadline: '' });
    } catch(err) {
      console.error(err);
    }
  };

  const getPriorityStyle = (p: string) => {
    switch(p) {
      case 'high': return 'bg-red-50 text-red-700 border-red-100';
      case 'medium': return 'bg-amber-50 text-amber-700 border-amber-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 flex flex-col md:flex-row justify-between items-center gap-6 shadow-sm">
        <div className="flex items-center gap-4">
           <div className="w-16 h-16 bg-slate-900 rounded-[1.5rem] flex items-center justify-center shadow-2xl rotate-2">
              <Shield size={32} className="text-white" />
           </div>
           <div>
              <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Serwis & Gwarancje ELITE</h2>
              <p className="text-sm text-slate-500 font-medium tracking-tight">System zarządzania zgłoszeniami SLA i ewidencja przeglądów okresowych.</p>
           </div>
        </div>
        <div className="flex gap-4">
           {!isAdding && (
             <button onClick={() => setIsAdding(true)} className="bg-slate-900 text-white px-8 py-4 rounded-3xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl flex items-center gap-2">
               <Plus size={18} /> Nowe Zgłoszenie
             </button>
           )}
        </div>
      </div>

      <div className="flex bg-slate-100 p-1 w-fit rounded-2xl border border-slate-200 mb-2">
         <button onClick={() => setActiveTab('all')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'all' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400'}`}>Aktywne</button>
         <button onClick={() => setActiveTab('sla')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'sla' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400'}`}>SLA / Monitoring</button>
         <button onClick={() => setActiveTab('history')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'history' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400'}`}>Archiwum</button>
      </div>

      {isAdding ? (
        <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-500">
           <div className="flex justify-between items-center mb-8 border-b border-slate-50 pb-6">
              <h3 className="text-xl font-black text-slate-900 uppercase italic">Formularz Zgłoszenia Serwisowego</h3>
              <button onClick={() => setIsAdding(false)} className="p-3 hover:bg-slate-100 rounded-2xl"><X size={20} /></button>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
              <div className="md:col-span-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Tytuł Zgłoszenia (Problem)</label>
                 <input value={newService.title} onChange={e => setNewService({...newService, title: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none ring-indigo-500 focus:ring-4 font-bold text-lg" placeholder="np. Wyciek z separatora oleju" />
              </div>
              <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Typ Obsługi</label>
                 <select value={newService.type} onChange={e => setNewService({...newService, type: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none ring-indigo-500 focus:ring-4 font-bold">
                    <option value="warranty">Gwarancja / Rękojmia</option>
                    <option value="adhoc">Serwis Ad-Hoc (Płatny)</option>
                    <option value="preventive">Przegląd Prewencyjny</option>
                    <option value="legal">Usterka Prawna / Dokumentacja</option>
                 </select>
              </div>
              <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Priorytet (SLA Impact)</label>
                 <select value={newService.priority} onChange={e => setNewService({...newService, priority: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none ring-indigo-500 focus:ring-4 font-bold">
                    <option value="low">Niski (Kolejka)</option>
                    <option value="medium">Standard (48h)</option>
                    <option value="high">KRYTYCZNY (ASAP)</option>
                 </select>
              </div>
              <div className="md:col-span-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Szczegółowy Opis Usterki</label>
                 <textarea value={newService.description} onChange={e => setNewService({...newService, description: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none ring-indigo-500 focus:ring-4 font-medium h-32" />
              </div>
           </div>

           <div className="flex justify-end gap-4 p-8 bg-slate-50 rounded-[2rem]">
              <button onClick={() => setIsAdding(false)} className="px-8 py-3 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:bg-slate-100">Porzuć</button>
              <button onClick={handleSave} className="px-12 py-4 bg-slate-900 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl">Rejestruj Zgłoszenie</button>
           </div>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
           <table className="w-full text-left">
              <thead>
                 <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-8 py-5">Podmiot & Tytuł</th>
                    <th className="px-8 py-5">Typ / Priorytet</th>
                    <th className="px-8 py-5">Status / Technik</th>
                    <th className="px-8 py-5 text-right">Ostatnia Akcja</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                 {services.length === 0 ? (
                   <tr>
                      <td colSpan={4} className="p-20 text-center flex flex-col items-center opacity-30">
                         <Zap size={48} className="text-slate-300" />
                         <p className="mt-4 font-black uppercase tracking-widest text-xs italic">Baza zgłoszeń jest pusta. Wszystkie systemy pod kontrolą.</p>
                      </td>
                   </tr>
                 ) : services.map(s => (
                   <tr key={s.id} className="hover:bg-slate-50 transition-colors group cursor-pointer">
                      <td className="px-8 py-6">
                         <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.type === 'warranty' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>
                               {s.type === 'warranty' ? <Shield size={20}/> : <PenTool size={20}/>}
                            </div>
                            <div>
                               <div className="text-sm font-black text-slate-900 uppercase italic tracking-tight">{s.title}</div>
                               <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">Tenant ID: {activeTenantId || 'N/A'}</div>
                            </div>
                         </div>
                      </td>
                      <td className="px-8 py-6">
                         <div className="flex flex-col gap-2">
                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded w-fit">{s.type}</span>
                            <span className={`text-[9px] font-black uppercase tracking-widest border px-2 py-0.5 rounded w-fit ${getPriorityStyle(s.priority)}`}>{s.priority} priority</span>
                         </div>
                      </td>
                      <td className="px-8 py-6">
                         <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center text-[10px] font-black italic">AS</div>
                            <div>
                               <div className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Niezapisany</div>
                               <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-600 uppercase mt-1">
                                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div> W Realizacji
                               </div>
                            </div>
                         </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                         <div className="text-xs font-black text-slate-900 uppercase tracking-tighter italic">2026-05-10</div>
                         <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase italic">Przez asystenta AI</div>
                      </td>
                   </tr>
                 ))}
              </tbody>
           </table>
        </div>
      )}
    </div>
  );
}

function X(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
  );
}
