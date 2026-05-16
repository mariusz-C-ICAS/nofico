/**
 * Data: 2026-05-12
 * Zmiany: Formularz wystawiania faktury z AI i NBP.
 * Ścieżka: /src/modules/finance/invoicing/InvoiceForm.tsx
 */
import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Trash2, Calculator, Sparkles, 
  Coins, Calendar, Building2, User, Save,
  Send, HelpCircle, Loader2, Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InvoiceItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  priceBrutto: number;
  vatRate: number;
}

export default function InvoiceForm({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', name: '', quantity: 1, unit: 'szt.', priceBrutto: 0, vatRate: 23 }
  ]);
  const [currency, setCurrency] = useState('PLN');
  const [exchangeRate, setExchangeRate] = useState(1);

  // Simulate NBP Fetch
  useEffect(() => {
    if (currency !== 'PLN') {
       setLoading(true);
       setTimeout(() => {
         setExchangeRate(currency === 'EUR' ? 4.32 : 4.02);
         setLoading(false);
       }, 800);
    } else {
       setExchangeRate(1);
    }
  }, [currency]);

  const totalBrutto = items.reduce((sum, item) => sum + (item.quantity * item.priceBrutto), 0);
  const totalNetto = items.reduce((sum, item) => sum + (item.quantity * (item.priceBrutto / (1 + item.vatRate/100))), 0);

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), name: '', quantity: 1, unit: 'szt.', priceBrutto: 0, vatRate: 23 }]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[80] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[4rem] w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
      >
        <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
           <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Kreator Dokumentu</div>
              <h3 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Nowa Faktura Sprzedaży</h3>
           </div>
           <button onClick={onClose} className="bg-white text-slate-400 hover:text-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 transition-colors">
              <X size={24} />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 space-y-12">
           {/* Section 1: Header Info */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <div className="space-y-6">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 px-1">Kontrahent (NIP lub Nazwa)</label>
                    <div className="relative">
                       <Building2 className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                       <input 
                         type="text" 
                         placeholder="770-XX-XX..."
                         className="w-full bg-slate-50 border-none rounded-2xl pl-16 pr-8 py-5 text-sm font-black uppercase italic tracking-tighter focus:ring-2 focus:ring-indigo-500"
                       />
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 px-1">Nr Faktury</label>
                        <input className="w-full bg-slate-100 border-none rounded-2xl px-6 py-5 text-xs font-black text-slate-500 italic" value="FV/2026/05/042" readOnly />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 px-1">Waluta</label>
                        <select 
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                          className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 text-xs font-black uppercase italic"
                        >
                           <option value="PLN">PLN</option>
                           <option value="EUR">EUR</option>
                           <option value="USD">USD</option>
                        </select>
                    </div>
                 </div>
              </div>

              <div className="md:col-span-2 space-y-6">
                 <div className="grid grid-cols-3 gap-6">
                    <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 px-1">Data Wystawienia</label>
                       <input type="date" value="2026-05-12" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 text-xs font-black italic" />
                    </div>
                    <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 px-1">Data Sprzedaży</label>
                       <input type="date" value="2026-05-12" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 text-xs font-black italic" />
                    </div>
                    <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 px-1">Termin Płatności</label>
                       <select className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 text-xs font-black uppercase italic">
                          <option>7 dni (19.05.2026)</option>
                          <option>14 dni (26.05.2026)</option>
                          <option>Gotówka</option>
                       </select>
                    </div>
                 </div>
                 {currency !== 'PLN' && (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-6 flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <div className="bg-white p-3 rounded-xl shadow-sm">
                             <Globe className="text-indigo-600" size={20} />
                          </div>
                          <div>
                             <div className="text-[10px] font-black text-indigo-400 uppercase leading-none mb-1">Kurs NBP z dnia poprzedniego</div>
                             <div className="text-sm font-black text-indigo-900 uppercase italic tracking-tighter">1 {currency} = {exchangeRate.toFixed(4)} PLN</div>
                          </div>
                       </div>
                       {loading && <Loader2 className="animate-spin text-indigo-400" size={18} />}
                    </div>
                 )}
              </div>
           </div>

           {/* Section 2: Line Items */}
           <div className="space-y-6">
              <div className="flex justify-between items-end mb-4">
                 <h5 className="text-sm font-black text-slate-900 uppercase italic tracking-widest flex items-center gap-2">
                    Pozycje Faktury
                    <div className="bg-indigo-600/10 text-indigo-600 px-3 py-1 rounded-full text-[9px] font-black">AI OPTIMIZED</div>
                 </h5>
                 <button className="flex items-center gap-2 text-[10px] font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-colors uppercase italic">
                    <Sparkles size={14} /> Sugeruj z historii
                 </button>
              </div>

              <div className="space-y-4">
                 {items.map((item, idx) => (
                    <div key={item.id} className="grid grid-cols-12 gap-4 items-end bg-slate-50/30 p-6 rounded-[2rem] border border-slate-100 group transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-100">
                       <div className="col-span-1 text-center">
                          <div className="text-[9px] font-black text-slate-300 uppercase mb-2">LP</div>
                          <div className="text-xs font-black text-slate-900">{idx + 1}</div>
                       </div>
                       <div className="col-span-4">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Nazwa towaru lub usługi</label>
                          <input 
                            value={item.name}
                            onChange={e => {
                               const newItems = [...items];
                               newItems[idx].name = e.target.value;
                               setItems(newItems);
                            }}
                            placeholder="np. Doradztwo strategiczne - Maj 2026"
                            className="w-full bg-slate-50 border-none rounded-xl px-4 py-4 text-xs font-bold focus:ring-2 focus:ring-indigo-500 uppercase tracking-tighter italic"
                          />
                       </div>
                       <div className="col-span-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Ilość</label>
                          <input type="number" className="w-full bg-slate-50 border-none rounded-xl px-4 py-4 text-xs font-bold text-center" />
                       </div>
                       <div className="col-span-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">VAT</label>
                          <select className="w-full bg-slate-50 border-none rounded-xl px-4 py-4 text-[10px] font-bold">
                             <option>23%</option>
                             <option>8%</option>
                             <option>5%</option>
                             <option>0%</option>
                             <option>zw.</option>
                          </select>
                       </div>
                       <div className="col-span-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Cena Brutto</label>
                          <div className="relative">
                             <input 
                               type="number" 
                               value={item.priceBrutto}
                               onChange={e => {
                                  const newItems = [...items];
                                  newItems[idx].priceBrutto = parseFloat(e.target.value) || 0;
                                  setItems(newItems);
                               }}
                               className="w-full bg-slate-50 border-none rounded-xl px-4 py-4 text-xs font-bold font-mono text-right pr-12" 
                             />
                             <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 uppercase">{currency}</span>
                          </div>
                       </div>
                       <div className="col-span-2">
                          <div className="text-[9px] font-black text-slate-400 uppercase mb-2 text-right">Razem Brutto</div>
                          <div className="text-sm font-black text-slate-900 text-right italic">
                             {(item.quantity * item.priceBrutto).toLocaleString('pl-PL', { minimumFractionDigits: 2 })}
                          </div>
                       </div>
                       <div className="col-span-1 flex justify-center">
                          <button onClick={() => removeItem(item.id)} className="text-slate-200 hover:text-rose-500 transition-colors p-3">
                             <Trash2 size={18} />
                          </button>
                       </div>
                    </div>
                 ))}
              </div>

              <button 
                onClick={addItem}
                className="w-full border-2 border-dashed border-slate-200 rounded-[2rem] py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-indigo-500 hover:text-indigo-600 transition-all flex items-center justify-center gap-2"
              >
                 <Plus size={16} /> Dodaj Nową Pozycję
              </button>
           </div>
        </div>

        {/* Footer Summary */}
        <div className="p-10 bg-slate-900 text-white flex flex-col md:flex-row justify-between items-center gap-10">
           <div className="flex gap-12">
              <div className="text-center md:text-left">
                 <div className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-1 italic">Razem Netto</div>
                 <div className="text-xl font-black italic tracking-tighter">{totalNetto.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} {currency}</div>
              </div>
              <div className="text-center md:text-left">
                 <div className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-1 italic">Kwota VAT</div>
                 <div className="text-xl font-black italic tracking-tighter">{(totalBrutto - totalNetto).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} {currency}</div>
              </div>
              <div className="text-center md:text-left scale-110 origin-left">
                 <div className="text-[10px] font-black text-white uppercase tracking-widest mb-1 italic">Do Zapłaty</div>
                 <div className="text-4xl font-black italic tracking-tighter text-emerald-400">{totalBrutto.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} {currency}</div>
              </div>
           </div>

           <div className="flex items-center gap-4">
              <button className="bg-white/10 hover:bg-white/20 text-white px-8 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                 Zapisz Szkic
              </button>
              <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-10 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all flex items-center gap-2">
                 <Send size={16} /> Wystaw i Wyślij
              </button>
           </div>
        </div>
      </motion.div>
    </div>
  );
}
