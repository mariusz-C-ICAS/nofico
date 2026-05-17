/**
 * Data: 2026-05-16
 * Ścieżka: /src/modules/crm/components/QuoteEditor.tsx
 */
import React, { useState } from 'react';
import {
  Download, Send, Plus,
  Trash2, Briefcase, Calculator,
  ChevronRight, ArrowUpRight, Loader2,
} from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '../../../shared/hooks/AuthContext';

interface QuoteItem { id: number; name: string; qty: number; price: number }

const DEFAULT_ITEMS: QuoteItem[] = [
  { id: 1, name: 'Analiza przedwdrożeniowa',       qty: 1, price: 4500   },
  { id: 2, name: 'Licencja NoFiCo V5 (Unlimited)', qty: 1, price: 120000 },
  { id: 3, name: 'Szkolenie zespołu (10 os.)',      qty: 3, price: 2500   },
];

export default function QuoteEditor() {
  const { activeTenantId } = useAuth() as any;
  const [items,  setItems]  = useState<QuoteItem[]>(DEFAULT_ITEMS);
  const [saving, setSaving] = useState(false);

  const nextId = () => Math.max(0, ...items.map(i => i.id)) + 1;

  const updateItem = (id: number, field: keyof QuoteItem, value: string | number) =>
    setItems(prev => prev.map(it => it.id === id
      ? { ...it, [field]: field === 'name' ? value : Number(value) }
      : it
    ));

  const removeItem = (id: number) => setItems(prev => prev.filter(it => it.id !== id));

  const addItem = () =>
    setItems(prev => [...prev, { id: nextId(), name: '', qty: 1, price: 0 }]);

  const total = items.reduce((acc, item) => acc + item.qty * item.price, 0);

  const handleSend = async () => {
    if (!activeTenantId || saving) return;
    setSaving(true);
    try {
      await addDoc(collection(db, `tenants/${activeTenantId}/quotes`), {
        items:      items.map(({ id: _id, ...rest }) => rest),
        totalNet:   total,
        totalGross: Math.round(total * 1.23),
        status:     'Wysłana',
        createdAt:  Timestamp.now(),
      });
    } finally {
      setSaving(false);
    }
  };

  const now = new Date();
  const quoteNo = `OFE/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/NEW`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
      {/* Editor Panel */}
      <div className="lg:col-span-8 space-y-8">
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10">
          <div className="flex justify-between items-center mb-12">
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Nowa Oferta / Draft</div>
              <h4 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">{quoteNo}</h4>
            </div>
            <div className="flex gap-4">
              <button className="bg-slate-100 text-slate-400 p-4 rounded-2xl hover:bg-slate-900 hover:text-white transition-all">
                <Download size={20} />
              </button>
              <button
                onClick={handleSend}
                disabled={saving}
                className="bg-indigo-600 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-slate-900 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} Wyślij Ofertę
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-12 gap-4 pb-4 border-b border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">
              <div className="col-span-6 italic">Pozycja / Usługa</div>
              <div className="col-span-2 text-center italic">Ilość</div>
              <div className="col-span-3 text-right italic">Cena (PLN)</div>
              <div className="col-span-1"></div>
            </div>

            {items.map(item => (
              <div key={item.id} className="grid grid-cols-12 gap-4 p-4 bg-slate-50 rounded-2xl items-center border border-transparent hover:border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all group">
                <div className="col-span-6 flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-300">
                    <ChevronRight size={16} />
                  </div>
                  <input
                    type="text"
                    value={item.name}
                    onChange={e => updateItem(item.id, 'name', e.target.value)}
                    className="bg-transparent text-sm font-black text-slate-900 focus:outline-none w-full italic"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    value={item.qty}
                    onChange={e => updateItem(item.id, 'qty', e.target.value)}
                    className="bg-white border border-slate-100 rounded-xl px-4 py-2 text-center text-xs font-black w-full"
                  />
                </div>
                <div className="col-span-3 text-right">
                  <input
                    type="number"
                    value={item.price}
                    onChange={e => updateItem(item.id, 'price', e.target.value)}
                    className="bg-transparent text-right text-sm font-black text-slate-900 focus:outline-none w-full italic"
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  <button onClick={() => removeItem(item.id)} className="text-slate-200 hover:text-rose-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}

            <button
              onClick={addItem}
              className="w-full py-6 rounded-2xl border-2 border-dashed border-slate-100 text-slate-300 hover:text-indigo-600 hover:border-indigo-100 transition-all flex items-center justify-center gap-3 mt-8"
            >
              <Plus size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest">Dodaj Kolejną Pozycję</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Panel */}
      <div className="lg:col-span-4 space-y-8">
        <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
          <Calculator className="text-indigo-400 mb-8" size={32} />
          <h5 className="text-xl font-black uppercase italic tracking-tighter mb-8">Podsumowanie <br />Kosztowe</h5>
          <div className="space-y-6">
            <div className="flex justify-between items-center opacity-60">
              <span className="text-[10px] font-black uppercase tracking-widest">Wartość Netto</span>
              <span className="text-sm font-bold">{total.toLocaleString()} PLN</span>
            </div>
            <div className="flex justify-between items-center opacity-60">
              <span className="text-[10px] font-black uppercase tracking-widest">VAT (23%)</span>
              <span className="text-sm font-bold">{(total * 0.23).toLocaleString()} PLN</span>
            </div>
            <div className="h-px bg-white/10 my-4"></div>
            <div className="flex justify-between items-center">
              <span className="text-[12px] font-black uppercase italic tracking-widest">Suma Brutto</span>
              <span className="text-2xl font-black italic">{(total * 1.23).toLocaleString()} PLN</span>
            </div>
          </div>
          <div className="mt-12 p-6 bg-white/10 rounded-[2rem] border border-white/10">
            <div className="flex justify-between items-center mb-6">
              <span className="text-[10px] font-black uppercase italic opacity-60 tracking-widest">Status Finansowy</span>
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-400/10 px-3 py-1 rounded">Rentowny</span>
            </div>
            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
              <div className="bg-indigo-400 h-full w-[82%]"></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[3rem] border border-slate-100 p-8 shadow-sm">
          <h6 className="text-sm font-black text-slate-900 uppercase italic mb-6">Ustawienia Oferty</h6>
          <div className="space-y-4">
            {[
              { label: 'Data Ważności',    value: '2026-06-12', icon: Briefcase },
              { label: 'Osoba kontaktowa', value: 'M. Czaja',   icon: ArrowUpRight },
            ].map((pref, i) => (
              <div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-indigo-50 transition-colors">
                <div className="flex items-center gap-3">
                  <pref.icon size={16} className="text-slate-400" />
                  <span className="text-[10px] font-black text-slate-500 uppercase italic">{pref.label}</span>
                </div>
                <span className="text-[10px] font-black text-slate-900 italic">{pref.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
