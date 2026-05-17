import React, { useState } from 'react';
import { ArrowLeft, Check, AlertTriangle, Globe } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { useCompany } from '../../../core/auth/CompanyContext';
import { createDocumentInstance, transitionDocument } from '../services/workflowEngine';

interface Props { onComplete: (docId: string) => void; onCancel: () => void; }

const INPUT = 'w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none transition-all';
const CURRENCIES = ['PLN', 'EUR', 'USD', 'GBP', 'CHF', 'CNY'];
const INCOTERMS = ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'];

export default function SubmitCustomsDeclarationWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [direction, setDirection] = useState<'IMPORT' | 'EXPORT'>('IMPORT');
  const [hsCode, setHsCode] = useState('');
  const [goodsDescription, setGoodsDescription] = useState('');
  const [countryOrigin, setCountryOrigin] = useState('');
  const [countryDestination, setCountryDestination] = useState('');
  const [customsValue, setCustomsValue] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [incoterms, setIncoterms] = useState('CIF');
  const [weightKg, setWeightKg] = useState('');
  const [invoiceRef, setInvoiceRef] = useState('');
  const [customsAgent, setCustomsAgent] = useState('');

  const isValid = hsCode.trim().length >= 6 && goodsDescription.trim().length > 3 && Number(customsValue) > 0;

  const handleSubmit = async () => {
    if (!user || !activeTenantId || !isValid) return;
    setLoading(true); setError('');
    try {
      const docId = await createDocumentInstance(
        activeTenantId, user.uid, user.email ?? '',
        'CUSTOMS_DECLARATION', 'default-customs-declaration',
        {
          title: `Zgłoszenie celne [${direction}]: ${goodsDescription.substring(0, 40)} — HS ${hsCode}`,
          amount: Number(customsValue), currency,
          invoiceDate: new Date().toISOString().split('T')[0],
          description: `Kierunek: ${direction}\nKod HS: ${hsCode}\nTowar: ${goodsDescription}\nKraj pochodzenia: ${countryOrigin}\nKraj przeznaczenia: ${countryDestination}\nWartość celna: ${customsValue} ${currency}\nIncoterms: ${incoterms}\nWaga: ${weightKg} kg\nRef. faktury: ${invoiceRef}\nAgent celny: ${customsAgent}`,
        },
        [], currentCompany?.id
      );
      await transitionDocument(activeTenantId, docId, 'SUBMIT', user.uid, user.email ?? '', 'PENDING_APPROVAL', {
        stepDefId: 'step-submit', stepType: 'APPROVAL', note: `Zgłoszenie celne ${direction}: HS ${hsCode}, wartość ${customsValue} ${currency}.`,
      });
      onComplete(docId);
    } catch (e: any) { setError(e.message ?? 'Błąd podczas wysyłania.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center"><Globe size={18} className="text-indigo-600" /></div>
        <div>
          <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">CUSTOMS DECLARATION</span>
          <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 leading-none">Zgłoszenie Celne</h3>
        </div>
      </div>

      <div className="space-y-4">
        <Field label="Kierunek *">
          <div className="flex gap-3">
            {(['IMPORT', 'EXPORT'] as const).map(d => (
              <button key={d} type="button" onClick={() => setDirection(d)}
                className={`flex-1 py-3 rounded-2xl text-xs font-black uppercase border transition-all ${direction === d ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-indigo-200'}`}>
                {d}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Kod HS (min. 6 cyfr) *"><input value={hsCode} onChange={e => setHsCode(e.target.value)} placeholder="8471.30.00" className={INPUT} /></Field>
          <Field label="Incoterms">
            <select value={incoterms} onChange={e => setIncoterms(e.target.value)} className={INPUT}>
              {INCOTERMS.map(i => <option key={i}>{i}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Opis towaru *"><textarea value={goodsDescription} onChange={e => setGoodsDescription(e.target.value)} rows={2} placeholder="Szczegółowy opis towaru, materiał, zastosowanie..." className={INPUT + ' resize-none'} /></Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Kraj pochodzenia"><input value={countryOrigin} onChange={e => setCountryOrigin(e.target.value)} placeholder="DE, CN, PL..." className={INPUT} /></Field>
          <Field label="Kraj przeznaczenia"><input value={countryDestination} onChange={e => setCountryDestination(e.target.value)} placeholder="PL, DE, US..." className={INPUT} /></Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Wartość celna *">
            <input type="number" min="0" step="0.01" value={customsValue} onChange={e => setCustomsValue(e.target.value)} placeholder="0.00" className={INPUT} />
          </Field>
          <Field label="Waluta">
            <select value={currency} onChange={e => setCurrency(e.target.value)} className={INPUT}>
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Waga (kg)"><input type="number" min="0" step="0.1" value={weightKg} onChange={e => setWeightKg(e.target.value)} placeholder="0" className={INPUT} /></Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Ref. faktury handlowej"><input value={invoiceRef} onChange={e => setInvoiceRef(e.target.value)} placeholder="INV-2026-001" className={INPUT} /></Field>
          <Field label="Agent celny"><input value={customsAgent} onChange={e => setCustomsAgent(e.target.value)} placeholder="Nazwa agenta celnego" className={INPUT} /></Field>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-2xl px-4 py-3 text-xs font-bold"><AlertTriangle size={13} />{error}</div>}

      <div className="flex gap-3">
        <button onClick={onCancel} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 text-slate-600 text-xs font-black uppercase hover:bg-slate-200 transition-all"><ArrowLeft size={13} />Anuluj</button>
        <button onClick={handleSubmit} disabled={loading || !isValid} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-600 text-white text-xs font-black uppercase hover:bg-indigo-700 disabled:opacity-40 transition-all">
          {loading ? 'Wysyłanie...' : <><Check size={13} />Wyślij do zatwierdzenia</>}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex-1"><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>{children}</div>;
}
