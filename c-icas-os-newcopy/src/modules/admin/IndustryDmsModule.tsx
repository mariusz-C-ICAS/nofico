import React, { useState, useEffect } from 'react';
import { db } from '../../shared/lib/firebase';
import { collection, query, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '../../shared/hooks/AuthContext';
import { Layers, Plus, Trash2, CheckCircle2, Globe, Building2, Briefcase, Zap, Shield } from 'lucide-react';

export default function IndustryDmsModule() {
  const { userData, activeTenantId } = useAuth();
  const [industries, setIndustries] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newIndustry, setNewIndustry] = useState({ name: '', icon: 'Building2', color: 'indigo', description: '', countryCode: 'PL' });

  useEffect(() => {
    const q = query(collection(db, 'industries'));
    const un = onSnapshot(q, (snap) => {
      setIndustries(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return un;
  }, []);

  const handleAdd = async () => {
    if (!newIndustry.name) return;
    try {
      await addDoc(collection(db, 'industries'), {
        ...newIndustry,
        createdAt: serverTimestamp(),
        tenantId: activeTenantId || 'global'
      });
      setShowAdd(false);
      setNewIndustry({ name: '', icon: 'Building2', color: 'indigo', description: '', countryCode: 'PL' });
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (iconName: string) => {
    switch(iconName) {
      case 'Building2': return <Building2 size={24} />;
      case 'Zap': return <Zap size={24} />;
      case 'Shield': return <Shield size={24} />;
      case 'Globe': return <Globe size={24} />;
      default: return <Briefcase size={24} />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Baza Branż & Profili (DMS)</h2>
          <p className="text-sm text-slate-500 font-medium tracking-tight">Zarządzaj specjalizacjami operacyjnymi w systemie C-ICAS Elite</p>
        </div>
        <button 
          onClick={() => setShowAdd(true)}
          className="bg-slate-900 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-2xl flex items-center gap-2"
        >
          <Plus size={18} /> Dodaj Branżę
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {/* Static Default Industries */}
         <StaticCard icon={<Building2 className="text-amber-500"/>} title="Budownictwo i Wykończenia" count={4} />
         <StaticCard icon={<Globe className="text-emerald-500"/>} title="Architektura Krajobrazu" count={2} />
         <StaticCard icon={<Shield className="text-blue-500"/>} title="Cleaning & Maintenance" count={7} />

         {industries.map(ind => (
           <div key={ind.id} className="bg-white border border-slate-200 p-8 rounded-[2rem] hover:shadow-2xl transition-all relative group">
              <button 
                onClick={() => deleteDoc(doc(db, 'industries', ind.id))}
                className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 transition-all"
              >
                <Trash2 size={16} />
              </button>
              <div className={`w-14 h-14 bg-${ind.color}-50 text-${ind.color}-600 rounded-2xl flex items-center justify-center mb-6`}>
                 {getIcon(ind.icon)}
              </div>
              <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tight mb-2">{ind.name}</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6">{ind.description || 'Brak opisu branżowego.'}</p>
              <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                 <div className="flex gap-2 items-center">
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded-md">{ind.countryCode || 'EU'}</span>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Aktywny Moduł</span>
                 </div>
                 <CheckCircle2 size={16} className="text-emerald-500" />
              </div>
           </div>
         ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                 <h3 className="text-xl font-black text-slate-900 uppercase italic">Nowa Branża DMS</h3>
                 <button onClick={() => setShowAdd(false)} className="p-2 hover:bg-slate-200 rounded-xl transition-colors"><Plus size={24} className="rotate-45" /></button>
              </div>
              <div className="p-8 space-y-6">
                 <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Nazwa Specjalizacji</label>
                    <input value={newIndustry.name} onChange={e => setNewIndustry({...newIndustry, name: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 outline-none ring-blue-500 focus:ring-2 font-bold text-sm" placeholder="np. Montaż Reklam" />
                 </div>
                 <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Opis (Dla AI)</label>
                    <textarea value={newIndustry.description} onChange={e => setNewIndustry({...newIndustry, description: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 outline-none ring-blue-500 focus:ring-2 font-medium text-sm h-24" placeholder="W czym specjalizuje się ten profil?" />
                 </div>
                 <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Kod Kraju</label>
                    <select value={newIndustry.countryCode} onChange={e => setNewIndustry({...newIndustry, countryCode: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 outline-none ring-blue-500 focus:ring-2 font-bold text-sm">
                       <option value="PL">Polska (PL)</option>
                       <option value="DE">Niemcy (DE)</option>
                       <option value="EU">Unia Europejska (EU) - Ogólne</option>
                       <option value="CS">Czechy (CS)</option>
                       <option value="SK">Słowacja (SK)</option>
                    </select>
                 </div>
                 <button onClick={handleAdd} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-600 shadow-xl transition-all">Dodaj Branżę Elite</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

function StaticCard({ icon, title, count }: { icon: any, title: string, count: number }) {
  return (
    <div className="bg-slate-50 border border-slate-100 p-8 rounded-[2rem] opacity-60">
      <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm">
        {icon}
      </div>
      <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tight mb-2">{title}</h3>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Wbudowany Moduł Core</p>
      <div className="mt-6 pt-6 border-t border-slate-200/50 flex justify-between items-center">
         <span className="text-[9px] font-black text-slate-400 uppercase">Projekty: {count}</span>
         <CheckCircle2 size={16} className="text-slate-300" />
      </div>
    </div>
  )
}
