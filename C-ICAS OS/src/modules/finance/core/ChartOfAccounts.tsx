import React, { useState, useEffect } from 'react';
import { 
  Layers, Plus, Search, Folder, FileType, 
  Trash2, Edit3, Loader2 
} from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { useTenant } from '../../../shared/hooks/useTenant';

interface Account {
  id: string;
  code: string;
  name: string;
  type: 'synthetic' | 'analytic';
  category: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parentId: string | null;
  level: number;
}

export default function ChartOfAccounts() {
  const { activeTenantId } = useTenant();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAccount, setNewAccount] = useState<Partial<Account>>({
    code: '',
    name: '',
    type: 'synthetic',
    category: 'asset',
    parentId: null,
    level: 0
  });

  useEffect(() => {
    if (!activeTenantId) return;

    const coaPath = `tenants/${activeTenantId}/chartOfAccounts`;
    const q = query(collection(db, coaPath), orderBy('code', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Account[] = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() } as Account);
      });
      
      // If no accounts, seed default ones (Simulation of UC-FIN-01)
      if (data.length === 0 && !loading) {
        seedDefaultAccounts('JDG'); // Default to JDG for seeding
      }
      
      setAccounts(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activeTenantId, loading]);

  const seedDefaultAccounts = async (form: 'JDG' | 'Spółka') => {
    if (!activeTenantId) return;
    const coaPath = `tenants/${activeTenantId}/chartOfAccounts`;
    
    const jdgDefaults = [
      { code: '010', name: 'Środki trwałe', type: 'synthetic', category: 'asset', level: 0 },
      { code: '100', name: 'Kasa', type: 'synthetic', category: 'asset', level: 0 },
      { code: '130', name: 'Rachunek bieżący', type: 'synthetic', category: 'asset', level: 0 },
      { code: '201', name: 'Rozrachunki z dostawcami', type: 'synthetic', category: 'liability', level: 0 },
      { code: '401', name: 'Zużycie materiałów', type: 'synthetic', category: 'expense', level: 0 },
      { code: '701', name: 'Przychody ze sprzedaży', type: 'synthetic', category: 'revenue', level: 0 }
    ];

    const companyDefaults = [
      ...jdgDefaults,
      { code: '801', name: 'Kapitał zakładowy', type: 'synthetic', category: 'equity', level: 0 },
      { code: '860', name: 'Wynik finansowy', type: 'synthetic', category: 'equity', level: 0 }
    ];

    const defaults = form === 'JDG' ? jdgDefaults : companyDefaults;

    for (const acc of defaults) {
      await addDoc(collection(db, coaPath), {
        ...acc,
        createdAt: serverTimestamp()
      });
    }
  };

  const handleAddAccount = async () => {
    if (!activeTenantId || !newAccount.code || !newAccount.name) return;
    
    // Simple validation for hierarchy (UC-FIN-01 implementation)
    const type = newAccount.code.length <= 3 ? 'synthetic' : 'analytic';
    const level = newAccount.code.length <= 3 ? 0 : 1;

    try {
      const coaPath = `tenants/${activeTenantId}/chartOfAccounts`;
      await addDoc(collection(db, coaPath), {
        ...newAccount,
        type,
        level,
        createdAt: serverTimestamp()
      });
      setShowAddModal(false);
      setNewAccount({ code: '', name: '', type: 'synthetic', category: 'asset', parentId: null, level: 0 });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!activeTenantId) return;
    try {
      await deleteDoc(doc(db, `tenants/${activeTenantId}/chartOfAccounts/${id}`));
    } catch (err) {
      console.error(err);
    }
  };

  const filteredAccounts = accounts.filter(a => 
    a.code.includes(searchQuery) || a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight italic flex items-center gap-2">
              <Layers className="text-indigo-600" size={20} /> Plan Kont (COA)
           </h3>
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">Hierarchiczna struktura ramy finansowej</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
           <div className="relative flex-1 md:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder="Szukaj po kodzie lub nazwie..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-xl pl-10 pr-4 py-3 text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-indigo-500 transition-all"
              />
           </div>
           <button 
             onClick={() => setShowAddModal(true)}
             className="bg-slate-900 text-white px-6 py-3 rounded-xl shadow-xl hover:bg-indigo-600 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
           >
              <Plus size={16} /> Dodaj Konto
           </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
         <table className="w-full text-left border-collapse">
            <thead>
               <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kod</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nazwa Konta</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Typ</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kategoria</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Akcje</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
               {loading ? (
                 <tr>
                    <td colSpan={5} className="py-20 text-center">
                       <Loader2 className="animate-spin text-indigo-500 mx-auto mb-4" size={32} />
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Synchronizacja Planu Kont...</span>
                    </td>
                 </tr>
               ) : filteredAccounts.length === 0 ? (
                 <tr>
                    <td colSpan={5} className="py-20 text-center text-slate-300">
                       <Folder size={48} className="mx-auto mb-4 opacity-20" />
                       <span className="text-[10px] font-black uppercase tracking-widest">Brak zdefiniowanych kont księgowych</span>
                    </td>
                 </tr>
               ) : (
                 filteredAccounts.map(acc => (
                   <tr key={acc.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-5">
                         <span className="text-xs font-black text-slate-900 font-mono tracking-tighter bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                            {acc.code}
                         </span>
                      </td>
                      <td className="px-8 py-5">
                         <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${acc.type === 'synthetic' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'}`}>
                               {acc.type === 'synthetic' ? <Folder size={14} /> : <FileType size={14} />}
                            </div>
                            <span className={`text-[11px] font-black uppercase tracking-tight ${acc.type === 'synthetic' ? 'text-slate-900' : 'text-slate-600'}`}>
                               {acc.name}
                            </span>
                         </div>
                      </td>
                      <td className="px-8 py-5">
                         <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                           acc.type === 'synthetic' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'
                         }`}>
                            {acc.type === 'synthetic' ? 'Syntetyka' : 'Analityka'}
                         </span>
                      </td>
                      <td className="px-8 py-5">
                         <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                           acc.category === 'asset' ? 'bg-emerald-100 text-emerald-600' :
                           acc.category === 'liability' ? 'bg-rose-100 text-rose-600' :
                           acc.category === 'revenue' ? 'bg-blue-100 text-blue-600' :
                           'bg-amber-100 text-amber-600'
                         }`}>
                            {acc.category}
                         </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                         <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Edit3 size={14}/></button>
                            <button onClick={() => handleDelete(acc.id)} className="p-2 text-slate-400 hover:text-rose-600 transition-colors"><Trash2 size={14}/></button>
                         </div>
                      </td>
                   </tr>
                 ))
               )}
            </tbody>
         </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-8">
                 <h4 className="text-xl font-black text-slate-900 uppercase italic">Nowe Konto KH</h4>
                 <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>
              <div className="space-y-6">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Kod Konta</label>
                    <input 
                      type="text" 
                      value={newAccount.code}
                      onChange={e => setNewAccount({...newAccount, code: e.target.value})}
                      className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500" 
                      placeholder="np. 100"
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Nazwa Konta</label>
                    <input 
                      type="text" 
                      value={newAccount.name}
                      onChange={e => setNewAccount({...newAccount, name: e.target.value})}
                      className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500" 
                      placeholder="np. Kasa w PLN"
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Typ</label>
                       <select 
                         value={newAccount.type}
                         onChange={e => setNewAccount({...newAccount, type: e.target.value as any})}
                         className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                       >
                          <option value="synthetic">Syntetyka</option>
                          <option value="analytic">Analityka</option>
                       </select>
                    </div>
                    <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Kategoria</label>
                       <select 
                         value={newAccount.category}
                         onChange={e => setNewAccount({...newAccount, category: e.target.value as any})}
                         className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                       >
                          <option value="asset">Aktywa</option>
                          <option value="liability">Pasywa</option>
                          <option value="revenue">Przychody</option>
                          <option value="expense">Koszty</option>
                       </select>
                    </div>
                 </div>
                 <button 
                   onClick={handleAddAccount}
                   className="w-full bg-slate-900 text-white font-black py-4 rounded-xl text-[11px] uppercase tracking-widest shadow-xl shadow-slate-100 hover:bg-indigo-600 transition-all mt-4"
                 >
                    Zapisz w Planie Kont
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
