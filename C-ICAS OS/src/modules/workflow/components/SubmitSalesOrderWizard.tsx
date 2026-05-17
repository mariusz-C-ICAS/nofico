import React, { useState } from 'react';
import { ArrowLeft, Check, AlertTriangle, ShoppingBag, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { useCompany } from '../../../core/auth/CompanyContext';
import { createDocumentInstance, transitionDocument } from '../services/workflowEngine';

interface Props { onComplete: (docId: string) => void; onCancel: () => void; }
interface OrderItem { id: string; desc: string; qty: number; price: number; }

const INPUT = 'w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-all';
const CURRENCIES = ['PLN', 'EUR', 'USD'];
const DELIVERY_TERMS = ['FCA', 'EXW', 'DAP', 'DDP', 'CIF', 'Na koszt klienta', 'Na koszt firmy'];
const PAYMENT_TERMS = ['Przedpłata 100%', '7 dni', '14 dni', '21 dni', '30 dni', '60 dni'];

export default function SubmitSalesOrderWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [customer, setCustomer] = useState('');
  const [customerNip, setCustomerNip] = useState('');
  const [quoteNumber, setQuoteNumber] = useState('');
  const [deliveryTerms, setDeliveryTerms] = useState(DELIVERY_TERMS[0]);
  const [paymentTerms, setPaymentTerms] = useState(PAYMENT_TERMS[2]);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [currency, setCurrency] = useState('PLN');
  const [items, setItems] = useState<OrderItem[]>([{ id: '1', desc: '', qty: 1, price: 0 }]);

  const addItem = () => setItems(p => [...p, { id: Date.now().toString(), desc: '', qty: 1, price: 0 }]);
  const removeItem = (id: string) => setItems(p => p.filter(i => i.id !== id));
  const setItem = (id: string, patch: Partial<OrderItem>) => setItems(p => p.map(i => i.id === id ? { ...i, ...patch } : i));
  const total = items.reduce((s, i) => s + i.qty * i.price, 0);
  const isValid = customer.trim().length > 1 && items.every(i => i.desc.trim().length > 0);

  const handleSubmit = async () => {
    if (!user || !activeTenantId || !isValid) return;
    setLoading(true); setError('');
    try {
      const itemsText = items.map(i => `${i.desc} × ${i.qty} × ${i.price} ${currency}`).join('\n');
      const docId = await createDocumentInstance(
        activeTenantId, user.uid, user.email ?? '',
        'SALES_ORDER', 'default-sales-order',
        {
          title: `SO – ${customer}${quoteNumber ? ` / Oferta ${quoteNumber}` : ''}`,
          amount: total, currency, vendor: customer,
          invoiceDate: new Date().toISOString().split('T')[0],
          description: `NIP klienta: ${customerNip}\nNr oferty: ${quoteNumber}\nWarunki dostawy: ${deliveryTerms}\nWarunki płatności: ${paymentTerms}\nAdres dostawy: ${deliveryAddress}\n\nPozycje:\n${itemsText}`,
        },
        [], currentCompany?.id
      );
      await transitionDocument(activeTenantId, docId, 'SUBMIT', user.uid, user.email ?? '', 'SUBMITTED', {
        stepDefId: 'step-submit', stepType: 'APPROVAL', note: 'Zamówienie sprzedaży wysłane do akceptacji Sales Managera.',
      });
      onComplete(docId);
    } catch (e: any) { setError(e.message ?? 'Błąd podczas wysyłania.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center"><ShoppingBag size={18} className="text-blue-600" /></div>
        <div>
          <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">SALES ORDER</span>
          <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 leading-none">Zamówienie Sprzedaży</h3>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Klient *"><input value={customer} onChange={e => setCustomer(e.target.value)} placeholder="Nazwa klienta" className={INPUT} /></Field>
          <Field label="NIP Klienta"><input value={customerNip} onChange={e => setCustomerNip(e.target.value)} placeholder="0000000000" className={INPUT} /></Field>
        </div>

        <Field label="Nr oferty (opcjonalnie)"><input value={quoteNumber} onChange={e => setQuoteNumber(e.target.value)} placeholder="OF/2026/05/001" className={INPUT} /></Field>

        <Field label="Pozycje zamówienia *">
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.id} className="flex gap-2 items-center">
                <input value={item.desc} onChange={e => setItem(item.id, { desc: e.target.value })} placeholder="Produkt / usługa" className={INPUT + ' flex-[3]'} />
                <input type="number" min="1" value={item.qty} onChange={e => setItem(item.id, { qty: Number(e.target.value) })} className={INPUT + ' w-16 text-center'} />
                <input type="number" min="0" step="0.01" value={item.price} onChange={e => setItem(item.id, { price: Number(e.target.value) })} placeholder="Cena" className={INPUT + ' flex-1'} />
                {items.length > 1 && <button onClick={() => removeItem(item.id)} className="text-rose-400 hover:text-rose-600"><Trash2 size={14} /></button>}
              </div>
            ))}
            <button onClick={addItem} className="flex items-center gap-2 text-blue-600 text-xs font-black uppercase hover:underline"><Plus size={12} />Dodaj pozycję</button>
          </div>
        </Field>

        <div className="flex items-center justify-between bg-blue-50 rounded-2xl px-4 py-3 border border-blue-100">
          <span className="text-[10px] font-black text-blue-700 uppercase">Wartość zamówienia</span>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black text-blue-700">{total.toFixed(2)}</span>
            <select value={currency} onChange={e => setCurrency(e.target.value)} className="bg-transparent text-blue-700 font-black text-sm outline-none">
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Warunki dostawy">
            <select value={deliveryTerms} onChange={e => setDeliveryTerms(e.target.value)} className={INPUT}>
              {DELIVERY_TERMS.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Warunki płatności">
            <select value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} className={INPUT}>
              {PAYMENT_TERMS.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Adres dostawy"><input value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder="ul. Przykładowa 1, 00-001 Warszawa" className={INPUT} /></Field>
      </div>

      {error && <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-2xl px-4 py-3 text-xs font-bold"><AlertTriangle size={13} />{error}</div>}

      <div className="flex gap-3">
        <button onClick={onCancel} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 text-slate-600 text-xs font-black uppercase hover:bg-slate-200 transition-all"><ArrowLeft size={13} />Anuluj</button>
        <button onClick={handleSubmit} disabled={loading || !isValid} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-blue-600 text-white text-xs font-black uppercase hover:bg-blue-700 disabled:opacity-40 transition-all">
          {loading ? 'Wysyłanie...' : <><Check size={13} />Wyślij do Sales Managera</>}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>{children}</div>;
}
