import React, { useState } from 'react';
import { ArrowLeft, Check, AlertTriangle, ShoppingCart, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { useCompany } from '../../../core/auth/CompanyContext';
import { createDocumentInstance, transitionDocument } from '../services/workflowEngine';

interface Props { onComplete: (docId: string) => void; onCancel: () => void; }
interface PoItem { id: string; desc: string; qty: number; price: number; }

const INPUT = 'w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-teal-400 focus:border-transparent outline-none transition-all';
const CURRENCIES = ['PLN', 'EUR', 'USD', 'GBP'];

export default function SubmitPurchaseOrderWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [vendor, setVendor] = useState('');
  const [vendorNip, setVendorNip] = useState('');
  const [costCenter, setCostCenter] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [currency, setCurrency] = useState('PLN');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<PoItem[]>([{ id: '1', desc: '', qty: 1, price: 0 }]);

  const addItem = () => setItems(p => [...p, { id: Date.now().toString(), desc: '', qty: 1, price: 0 }]);
  const removeItem = (id: string) => setItems(p => p.filter(i => i.id !== id));
  const setItem = (id: string, patch: Partial<PoItem>) => setItems(p => p.map(i => i.id === id ? { ...i, ...patch } : i));

  const total = items.reduce((s, i) => s + i.qty * i.price, 0);
  const isValid = vendor.trim().length > 1 && items.every(i => i.desc.trim().length > 0);

  const handleSubmit = async () => {
    if (!user || !activeTenantId || !isValid) return;
    setLoading(true); setError('');
    try {
      const itemsText = items.map(i => `${i.desc} × ${i.qty} × ${i.price} ${currency}`).join('\n');
      const docId = await createDocumentInstance(
        activeTenantId, user.uid, user.email ?? '',
        'PURCHASE_ORDER', 'default-purchase-order',
        { title: `PO – ${vendor}`, amount: total, currency, vendor, invoiceDate: deliveryDate || new Date().toISOString().split('T')[0], costCenter, description: `Pozycje:\n${itemsText}\n\nNIP: ${vendorNip}\nUwagi: ${notes}` },
        [], currentCompany?.id
      );
      await transitionDocument(activeTenantId, docId, 'SUBMIT', user.uid, user.email ?? '', 'SUBMITTED', {
        stepDefId: 'step-submit', stepType: 'APPROVAL', note: 'Zamówienie zakupu wysłane do akceptacji.',
      });
      onComplete(docId);
    } catch (e: any) { setError(e.message ?? 'Błąd podczas wysyłania.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-teal-50 rounded-2xl flex items-center justify-center"><ShoppingCart size={18} className="text-teal-600" /></div>
        <div>
          <span className="text-[9px] font-black text-teal-600 uppercase tracking-widest">PURCHASE ORDER</span>
          <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 leading-none">Zamówienie Zakupu</h3>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Dostawca *"><input value={vendor} onChange={e => setVendor(e.target.value)} placeholder="Nazwa firmy" className={INPUT} /></Field>
          <Field label="NIP Dostawcy"><input value={vendorNip} onChange={e => setVendorNip(e.target.value)} placeholder="0000000000" className={INPUT} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Konto kosztowe"><input value={costCenter} onChange={e => setCostCenter(e.target.value)} placeholder="np. 401/IT" className={INPUT} /></Field>
          <Field label="Termin dostawy"><input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className={INPUT} /></Field>
        </div>

        <Field label="Pozycje zamówienia *">
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.id} className="flex gap-2 items-center">
                <input value={item.desc} onChange={e => setItem(item.id, { desc: e.target.value })} placeholder="Opis pozycji" className={INPUT + ' flex-[3]'} />
                <input type="number" min="1" value={item.qty} onChange={e => setItem(item.id, { qty: Number(e.target.value) })} className={INPUT + ' w-16 text-center'} />
                <input type="number" min="0" step="0.01" value={item.price} onChange={e => setItem(item.id, { price: Number(e.target.value) })} placeholder="Cena" className={INPUT + ' flex-1'} />
                {items.length > 1 && <button onClick={() => removeItem(item.id)} className="text-rose-400 hover:text-rose-600"><Trash2 size={14} /></button>}
              </div>
            ))}
            <button onClick={addItem} className="flex items-center gap-2 text-teal-600 text-xs font-black uppercase hover:underline">
              <Plus size={12} /> Dodaj pozycję
            </button>
          </div>
        </Field>

        <div className="flex items-center justify-between bg-teal-50 rounded-2xl px-4 py-3 border border-teal-100">
          <span className="text-[10px] font-black text-teal-700 uppercase">Suma zamówienia</span>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black text-teal-700">{total.toFixed(2)}</span>
            <select value={currency} onChange={e => setCurrency(e.target.value)} className="bg-transparent text-teal-700 font-black text-sm outline-none">
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <Field label="Uwagi"><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Dodatkowe wymagania, warunki..." className={INPUT + ' resize-none'} /></Field>
      </div>

      {error && <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-2xl px-4 py-3 text-xs font-bold"><AlertTriangle size={13} />{error}</div>}

      <div className="flex gap-3">
        <button onClick={onCancel} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 text-slate-600 text-xs font-black uppercase hover:bg-slate-200 transition-all"><ArrowLeft size={13} />Anuluj</button>
        <button onClick={handleSubmit} disabled={loading || !isValid} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-teal-600 text-white text-xs font-black uppercase hover:bg-teal-700 disabled:opacity-40 transition-all">
          {loading ? 'Wysyłanie...' : <><Check size={13} />Wyślij do akceptacji</>}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>{children}</div>;
}
