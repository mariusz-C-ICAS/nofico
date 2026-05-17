import React, { useState } from 'react';
import { ArrowLeft, Check, AlertTriangle, Factory } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { useCompany } from '../../../core/auth/CompanyContext';
import { createDocumentInstance, transitionDocument } from '../services/workflowEngine';

interface Props { onComplete: (docId: string) => void; onCancel: () => void; }

const INPUT = 'w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-slate-400 focus:border-transparent outline-none transition-all';
const SHIFTS = ['Zmiana I (06:00–14:00)', 'Zmiana II (14:00–22:00)', 'Zmiana III (22:00–06:00)', 'Dzień (08:00–16:00)'];
const PRIORITIES = ['Normalny', 'Pilny', 'Bardzo pilny'];

export default function SubmitProductionOrderWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [productName, setProductName] = useState('');
  const [productCode, setProductCode] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('szt.');
  const [machine, setMachine] = useState('');
  const [shift, setShift] = useState(SHIFTS[0]);
  const [targetDate, setTargetDate] = useState('');
  const [bomRef, setBomRef] = useState('');
  const [priority, setPriority] = useState('Normalny');
  const [notes, setNotes] = useState('');

  const isValid = productName.trim().length > 1 && Number(quantity) > 0 && targetDate.length > 0;

  const handleSubmit = async () => {
    if (!user || !activeTenantId || !isValid) return;
    setLoading(true); setError('');
    try {
      const docId = await createDocumentInstance(
        activeTenantId, user.uid, user.email ?? '',
        'PRODUCTION_ORDER', 'default-production-order',
        {
          title: `ZP: ${productName}${productCode ? ` (${productCode})` : ''} × ${quantity} ${unit}`,
          amount: Number(quantity),
          invoiceDate: new Date().toISOString().split('T')[0],
          description: `Produkt: ${productName}\nKod: ${productCode}\nIlość: ${quantity} ${unit}\nMaszyna/linia: ${machine}\nZmiana: ${shift}\nTermin realizacji: ${targetDate}\nRef. BOM: ${bomRef}\nPriorytet: ${priority}\n\nUwagi: ${notes}`,
        },
        [], currentCompany?.id
      );
      await transitionDocument(activeTenantId, docId, 'SUBMIT', user.uid, user.email ?? '', 'PENDING_APPROVAL', {
        stepDefId: 'step-submit', stepType: 'APPROVAL', note: `Zlecenie produkcyjne: ${productName} × ${quantity} ${unit}. Priorytet: ${priority}.`,
      });
      onComplete(docId);
    } catch (e: any) { setError(e.message ?? 'Błąd podczas wysyłania.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center"><Factory size={18} className="text-slate-600" /></div>
        <div>
          <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">PRODUCTION ORDER (ZP)</span>
          <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 leading-none">Zlecenie Produkcyjne</h3>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Produkt *"><input value={productName} onChange={e => setProductName(e.target.value)} placeholder="Nazwa produktu" className={INPUT} /></Field>
          <Field label="Kod produktu"><input value={productCode} onChange={e => setProductCode(e.target.value)} placeholder="SKU/Part number" className={INPUT} /></Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Ilość *"><input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0" className={INPUT} /></Field>
          <Field label="J.m."><input value={unit} onChange={e => setUnit(e.target.value)} placeholder="szt." className={INPUT} /></Field>
          <Field label="Priorytet">
            <select value={priority} onChange={e => setPriority(e.target.value)} className={INPUT}>
              {PRIORITIES.map(p => <option key={p}>{p}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Maszyna / linia prod."><input value={machine} onChange={e => setMachine(e.target.value)} placeholder="Linia A, Maszyna CNC-1" className={INPUT} /></Field>
          <Field label="Termin realizacji *"><input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className={INPUT} /></Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Zmiana robocza">
            <select value={shift} onChange={e => setShift(e.target.value)} className={INPUT}>
              {SHIFTS.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Ref. BOM"><input value={bomRef} onChange={e => setBomRef(e.target.value)} placeholder="BOM-2026-001" className={INPUT} /></Field>
        </div>

        <Field label="Uwagi"><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Specjalne wymagania, materiały, operacje dodatkowe..." className={INPUT + ' resize-none'} /></Field>
      </div>

      {error && <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-2xl px-4 py-3 text-xs font-bold"><AlertTriangle size={13} />{error}</div>}

      <div className="flex gap-3">
        <button onClick={onCancel} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 text-slate-600 text-xs font-black uppercase hover:bg-slate-200 transition-all"><ArrowLeft size={13} />Anuluj</button>
        <button onClick={handleSubmit} disabled={loading || !isValid} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-slate-900 text-white text-xs font-black uppercase hover:bg-slate-700 disabled:opacity-40 transition-all">
          {loading ? 'Wysyłanie...' : <><Check size={13} />Wyślij do Production Managera</>}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex-1"><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>{children}</div>;
}
