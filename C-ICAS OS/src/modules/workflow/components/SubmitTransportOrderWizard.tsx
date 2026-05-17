import React, { useState } from 'react';
import { ArrowLeft, Check, AlertTriangle, Package2 } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { useCompany } from '../../../core/auth/CompanyContext';
import { createDocumentInstance, transitionDocument } from '../services/workflowEngine';

interface Props { onComplete: (docId: string) => void; onCancel: () => void; }

const INPUT = 'w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none transition-all';
const TRANSPORT_TYPES = ['Drogowy (FTL)', 'Drogowy (LTL)', 'Lotniczy', 'Morski', 'Kolejowy', 'Kurier ekspresowy'];
const CURRENCIES = ['PLN', 'EUR', 'USD'];

export default function SubmitTransportOrderWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [carrier, setCarrier] = useState('');
  const [transportType, setTransportType] = useState(TRANSPORT_TYPES[0]);
  const [fromAddress, setFromAddress] = useState('');
  const [toAddress, setToAddress] = useState('');
  const [goodsDescription, setGoodsDescription] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [pallets, setPallets] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [freightCost, setFreightCost] = useState('');
  const [currency, setCurrency] = useState('PLN');
  const [notes, setNotes] = useState('');

  const isValid = carrier.trim().length > 1 && fromAddress.trim().length > 3 && toAddress.trim().length > 3 && goodsDescription.trim().length > 3 && deliveryDate.length > 0;

  const handleSubmit = async () => {
    if (!user || !activeTenantId || !isValid) return;
    setLoading(true); setError('');
    try {
      const docId = await createDocumentInstance(
        activeTenantId, user.uid, user.email ?? '',
        'TRANSPORT_ORDER', 'default-transport-order',
        {
          title: `ZT: ${carrier} — ${fromAddress.split(',')[0]} → ${toAddress.split(',')[0]}`,
          amount: freightCost ? Number(freightCost) : undefined,
          currency, vendor: carrier,
          invoiceDate: new Date().toISOString().split('T')[0],
          description: `Przewoźnik: ${carrier}\nTyp: ${transportType}\nZ: ${fromAddress}\nDo: ${toAddress}\nTermin dostawy: ${deliveryDate}\nTowar: ${goodsDescription}\nWaga: ${weightKg} kg | Palety: ${pallets}\nKoszt frachtu: ${freightCost} ${currency}\n\nUwagi: ${notes}`,
        },
        [], currentCompany?.id
      );
      await transitionDocument(activeTenantId, docId, 'SUBMIT', user.uid, user.email ?? '', 'PENDING_APPROVAL', {
        stepDefId: 'step-submit', stepType: 'APPROVAL', note: `Zlecenie transportowe: ${carrier}, ${transportType}. Termin dostawy: ${deliveryDate}.`,
      });
      onComplete(docId);
    } catch (e: any) { setError(e.message ?? 'Błąd podczas wysyłania.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-cyan-50 rounded-2xl flex items-center justify-center"><Package2 size={18} className="text-cyan-600" /></div>
        <div>
          <span className="text-[9px] font-black text-cyan-600 uppercase tracking-widest">TRANSPORT ORDER (ZT)</span>
          <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 leading-none">Zlecenie Transportowe</h3>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Przewoźnik *"><input value={carrier} onChange={e => setCarrier(e.target.value)} placeholder="Nazwa firmy transportowej" className={INPUT} /></Field>
          <Field label="Typ transportu *">
            <select value={transportType} onChange={e => setTransportType(e.target.value)} className={INPUT}>
              {TRANSPORT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Adres załadunku *"><input value={fromAddress} onChange={e => setFromAddress(e.target.value)} placeholder="ul. Przykładowa 1, 00-001 Warszawa" className={INPUT} /></Field>
        <Field label="Adres dostawy *"><input value={toAddress} onChange={e => setToAddress(e.target.value)} placeholder="ul. Docelowa 5, 40-001 Katowice" className={INPUT} /></Field>

        <Field label="Opis ładunku *"><textarea value={goodsDescription} onChange={e => setGoodsDescription(e.target.value)} rows={2} placeholder="Co transportujemy, kategoria, wartość celna..." className={INPUT + ' resize-none'} /></Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Waga (kg)"><input type="number" min="0" value={weightKg} onChange={e => setWeightKg(e.target.value)} placeholder="0" className={INPUT} /></Field>
          <Field label="Palety / szt."><input type="number" min="0" value={pallets} onChange={e => setPallets(e.target.value)} placeholder="0" className={INPUT} /></Field>
          <Field label="Termin dostawy *"><input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className={INPUT} /></Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Koszt frachtu">
            <input type="number" min="0" step="0.01" value={freightCost} onChange={e => setFreightCost(e.target.value)} placeholder="0.00" className={INPUT} />
          </Field>
          <Field label="Waluta">
            <select value={currency} onChange={e => setCurrency(e.target.value)} className={INPUT}>
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Uwagi"><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Specjalne warunki przewozu, ADR, chłodnia, ubezpieczenie..." className={INPUT + ' resize-none'} /></Field>
      </div>

      {error && <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-2xl px-4 py-3 text-xs font-bold"><AlertTriangle size={13} />{error}</div>}

      <div className="flex gap-3">
        <button onClick={onCancel} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 text-slate-600 text-xs font-black uppercase hover:bg-slate-200 transition-all"><ArrowLeft size={13} />Anuluj</button>
        <button onClick={handleSubmit} disabled={loading || !isValid} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-cyan-600 text-white text-xs font-black uppercase hover:bg-cyan-700 disabled:opacity-40 transition-all">
          {loading ? 'Wysyłanie...' : <><Check size={13} />Wyślij zlecenie transportowe</>}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex-1"><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>{children}</div>;
}
