import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Save, AlertCircle, CheckCircle2, Search,
  Calculator, Info, Trash2, ArrowRightLeft
} from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, getDocs, doc, serverTimestamp, orderBy, runTransaction } from 'firebase/firestore';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { useJournalEntry } from './hooks/useJournalEntry';

interface Account {
  id: string;
  code: string;
  name: string;
  balanceWn?: number;
  balanceMa?: number;
}

interface Item {
  accountId: string;
  accountCode: string;
  debit: number;
  credit: number;
  side: 'Wn' | 'Ma';
}

export default function JournalEntryModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const { validate, errors: validationErrors } = useJournalEntry();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [docNumber, setDocNumber] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<Item[]>([
    { accountId: '', accountCode: '', debit: 0, credit: 0, side: 'Wn' },
    { accountId: '', accountCode: '', debit: 0, credit: 0, side: 'Ma' }
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!activeTenantId) return;
    const fetchAccounts = async () => {
      const q = query(collection(db, `tenants/${activeTenantId}/chartOfAccounts`), orderBy('code', 'asc'));
      const snap = await getDocs(q);
      const data: Account[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as Account));
      setAccounts(data);
    };
    fetchAccounts();
  }, [activeTenantId]);

  const totalWn = items.filter(i => i.side === 'Wn').reduce((sum, item) => sum + item.debit, 0);
  const totalMa = items.filter(i => i.side === 'Ma').reduce((sum, item) => sum + item.credit, 0);
  const balance = totalWn - totalMa;

  const handleSave = async () => {
    const entryData = { date, documentNumber: docNumber, description, items };
    if (!validate(entryData)) return;
    if (!activeTenantId || !user) return;

    setSaving(true);
    try {
      await runTransaction(db, async (transaction) => {
        const journalRef = doc(collection(db, `tenants/${activeTenantId}/journals`));
        
        transaction.set(journalRef, {
          ...entryData,
          date: new Date(date),
          totalAmount: totalWn,
          status: 'posted',
          createdAt: serverTimestamp(),
          createdBy: user.uid
        });

        for (const item of items) {
          if (!item.accountId) continue;
          const accountRef = doc(db, `tenants/${activeTenantId}/chartOfAccounts/${item.accountId}`);
          const accountDoc = await transaction.get(accountRef);
          
          if (accountDoc.exists()) {
            const data = accountDoc.data();
            transaction.update(accountRef, {
              balanceWn: (data.balanceWn || 0) + (item.debit || 0),
              balanceMa: (data.balanceMa || 0) + (item.credit || 0),
              updatedAt: serverTimestamp()
            });
          }
        }
      });
      onClose();
    } catch (err) {
      console.error('Transaction failed: ', err);
      alert('Błąd podczas księgowania dekretu.');
    } finally {
      setSaving(false);
    }
  };

  const updateItem = (index: number, field: keyof Item, value: any) => {
    const newItems = [...items];
    if (field === 'accountId') {
       const acc = accounts.find(a => a.id === value);
       newItems[index].accountId = value;
       newItems[index].accountCode = acc?.code || '';
    } else {
       (newItems[index] as any)[field] = value;
    }
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { accountId: '', accountCode: '', debit: 0, credit: 0, side: 'Wn' }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
       <div className="bg-white rounded-[3rem] w-full max-w-4xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95">
          <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
             <div>
                <h3 className="text-xl font-black text-slate-800 uppercase italic flex items-center gap-2">
                   <ArrowRightLeft className="text-indigo-600" size={20} /> Nowy Dekret Księgowy
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Podwójny zapis • Weryfikacja Salda</p>
             </div>
             <button onClick={onClose} className="p-2 text-slate-400 hover:bg-white rounded-full transition-all">
                <X size={24} />
             </button>
          </div>

          <div className="p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Nr Dowodu</label>
                   <input 
                     value={docNumber}
                     onChange={e => setDocNumber(e.target.value)}
                     className={`w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500 uppercase italic ${validationErrors.documentNumber ? 'ring-2 ring-rose-500' : ''}`} 
                     placeholder="np. FV/2026/05/12"
                   />
                   {validationErrors.documentNumber && <span className="text-[9px] font-black text-rose-500 uppercase mt-1">{validationErrors.documentNumber}</span>}
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Data Księgowania</label>
                   <input 
                     type="date"
                     value={date}
                     onChange={e => setDate(e.target.value)}
                     className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500" 
                   />
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Opis Operacji</label>
                   <input 
                     value={description}
                     onChange={e => setDescription(e.target.value)}
                     className={`w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500 uppercase tracking-tighter italic ${validationErrors.description ? 'ring-2 ring-rose-500' : ''}`} 
                     placeholder="np. Zakup materiałów biurowych"
                   />
                   {validationErrors.description && <span className="text-[9px] font-black text-rose-500 uppercase mt-1">{validationErrors.description}</span>}
                </div>
             </div>

             <div className="bg-slate-50/50 rounded-[2rem] border border-slate-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                   <thead>
                      <tr className="bg-slate-100/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                         <th className="px-6 py-4">Konto</th>
                         <th className="px-6 py-4">Strona</th>
                         <th className="px-6 py-4">Kwota</th>
                         <th className="px-6 py-4">Suma</th>
                         <th className="px-6 py-4 text-right">---</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {items.map((item, index) => (
                        <tr key={index}>
                           <td className="px-6 py-4">
                              <select 
                                value={item.accountId}
                                onChange={e => updateItem(index, 'accountId', e.target.value)}
                                className="bg-white border-none rounded-xl px-4 py-2 text-[11px] font-bold w-full focus:ring-2 focus:ring-indigo-500"
                              >
                                 <option value="">Wybierz konto...</option>
                                 {accounts.map(a => (
                                   <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                                 ))}
                              </select>
                           </td>
                           <td className="px-6 py-4">
                              <div className="flex bg-white p-1 rounded-xl border border-slate-100 w-fit">
                                 {['Wn', 'Ma'].map(side => (
                                   <button 
                                     key={side}
                                     onClick={() => updateItem(index, 'side', side)}
                                     className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                                       item.side === side ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300'
                                     }`}
                                   >
                                      {side}
                                   </button>
                                 ))}
                              </div>
                           </td>
                           <td className="px-6 py-4">
                              <input 
                                type="number"
                                value={item.side === 'Wn' ? item.debit : item.credit}
                                onChange={e => {
                                  const val = parseFloat(e.target.value) || 0;
                                  if (item.side === 'Wn') updateItem(index, 'debit', val);
                                  else updateItem(index, 'credit', val);
                                }}
                                className="bg-white border-none rounded-xl px-4 py-2 text-[11px] font-black w-24 text-right focus:ring-2 focus:ring-indigo-500"
                              />
                           </td>
                           <td className="px-6 py-4">
                              <span className="text-[10px] font-black text-slate-300 uppercase italic">PLN / AUTO</span>
                           </td>
                           <td className="px-6 py-4 text-right">
                              <button onClick={() => removeItem(index)} className="text-slate-200 hover:text-rose-500 transition-colors">
                                 <Trash2 size={14} />
                              </button>
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
                <div className="p-4 bg-white border-t border-slate-100 flex justify-between items-center">
                   <button 
                     onClick={addItem}
                     className="text-indigo-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-50 px-4 py-2 rounded-xl transition-all"
                   >
                      <Plus size={14} /> Dodaj linię zapisu
                   </button>
                   <div className="flex gap-10">
                      <div className="text-right">
                         <div className="text-[9px] font-black text-slate-400 uppercase">Suma Wn</div>
                         <div className="text-sm font-black text-slate-800 italic">{totalWn.toLocaleString()}</div>
                      </div>
                      <div className="text-right">
                         <div className="text-[9px] font-black text-slate-400 uppercase">Suma Ma</div>
                         <div className="text-sm font-black text-slate-800 italic">{totalMa.toLocaleString()}</div>
                      </div>
                   </div>
                </div>
             </div>

             <div className="flex justify-between items-center">
                <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl border transition-all ${
                  balance === 0 
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                    : 'bg-rose-50 border-rose-100 text-rose-700'
                }`}>
                   {balance === 0 ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                   <div>
                      <span className="text-[10px] font-black uppercase tracking-widest block leading-none">
                        {balance === 0 ? 'Bilans Zrównoważony' : 'Błąd Bilansowania'}
                      </span>
                      <span className="text-[9px] font-bold uppercase opacity-60">
                        {balance === 0 ? 'Wn - Ma = 0.00' : `Różnica: ${balance.toFixed(2)}`}
                      </span>
                   </div>
                </div>

                <div className="flex gap-4">
                   <button onClick={onClose} className="bg-slate-100 text-slate-500 font-black px-8 py-4 rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Anuluj</button>
                   <button 
                     disabled={balance !== 0 || saving}
                     onClick={handleSave}
                     className="bg-slate-900 text-white font-black px-12 py-4 rounded-2xl text-[10px] uppercase tracking-widest shadow-xl shadow-slate-100 hover:bg-indigo-600 transition-all disabled:opacity-30 flex items-center gap-2"
                   >
                      {saving ? 'Księgowanie...' : <><Save size={16} /> Zaksięguj Dekret</>}
                   </button>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
}
