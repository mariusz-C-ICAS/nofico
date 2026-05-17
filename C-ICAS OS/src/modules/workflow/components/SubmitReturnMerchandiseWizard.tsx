import React, { useState } from 'react';
import { ArrowLeft, Check, AlertTriangle, RotateCcw, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { useCompany } from '../../../core/auth/CompanyContext';
import { createDocumentInstance, transitionDocument } from '../services/workflowEngine';

interface Props { onComplete: (docId: string) => void; onCancel: () => void; }
interface ReturnItem { id: string; name: string; qty: number; reason: string; }

const INPUT = 'w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-slate-400 focus:border-transparent outline-none transition-all';
const RETURN_REASONS = ['Wada towaru', 'Niezgodność z zamówieniem', 'Uszkodzenie w transporcie', 'Nadwyżka dostawy', 'Błędna dostawa'];

export default function SubmitReturnMerchandiseWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [vendor, setVendor] = useState('');
  const [poRef, setPoRef] = useState('');
  const [grRef, setGrRef] = useState('');
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [mainReason, setMainReason] = useState(RETURN_REASONS[0]);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ReturnItem[]>([{ id: '1', name: '', qty: 1, reason: '' }]);

  const addItem = () => setItems(p => [...p, { id: Date.now().toString(), name: '', qty: 1, reason: '' }]);
  const removeItem = (id: string) => setItems(p => p.filter(i => i.id !== id));
  const setItem = (id: string, patch: Partial<ReturnItem>) => setItems(p => p.map(i => i.id === id ? { ...i, ...patch } : i));

  const isValid = vendor.trim().length > 1 && items.every(i => i.name.trim().length > 0);

  const handleSubmit = async () => {
    if (!user || !activeTenantId || !isValid) return;
    setLoading(true); setError('');
    try {
      const itemsText = items.map(i => `${i.name}: ${i.qty} szt. — ${i.reason || mainReason}`).join('\n');
      const docId = await createDocumentInstance(
        activeTenantId, user.uid, user.email ?? '',
        'RETURN_MERCHANDISE', 'default-return-merchandise',
        {
          title: `Zwrot towaru – ${vendor}${poRef ? ` / PO ${poRef}` : ''}`,
          vendor,
          invoiceDate: returnDate,
          description: `Dostawca: ${vendor}\nRef. PO: ${poRef}\nRef. PZ: ${grRef}\nData zwrotu: ${returnDate}\nGłówna przyczyna: ${mainReason}\n\nPozycje:\n${itemsText}\n\nUwagi: ${notes}`,
        },
        [], currentCompany?.id
      );
      await transitionDocument(activeTenantId, docId, 'SUBMIT', user.uid, user.email ?? '', 'PENDING_APPROVAL', {
        stepDefId: 'step-submit', stepType: 'APPROVAL', note: `Zwrot towaru do ${vendor} — ${items.length} pozycji.`,
      });
      onComplete(docId);
    } catch (e: any) { setError(e.message ?? 'Błąd podczas wysyłania.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center"><RotateCcw size={18} className="text-slate-600" /></div>
        <div>
          <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">RETURN MERCHANDISE</span>
          <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 leading-none">Zwrot Towaru</h3>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Dostawca *"><input value={vendor} onChange={e => setVendor(e.target.value)} placeholder="Nazwa dostawcy" className={INPUT} /></Field>
          <Field label="Data zwrotu"><input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} className={INPUT} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ref. PO"><input value={poRef} onChange={e => setPoRef(e.target.value)} placeholder="PO/2026/05/001" className={INPUT} /></Field>
          <Field label="Ref. PZ"><input value={grRef} onChange={e => setGrRef(e.target.value)} placeholder="PZ/2026/05/001" className={INPUT} /></Field>
        </div>

        <Field label="Główna przyczyna zwrotu">
          <select value={mainReason} onChange={e => setMainReason(e.target.value)} className={INPUT}>
            {RETURN_REASONS.map(r => <option key={r}>{r}</option>)}
          </select>
        </Field>

        <Field label="Pozycje do zwrotu *">
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.id} className="grid grid-cols-[2fr_60px_2fr_20px] gap-2 items-center">
                <input value={item.name} onChange={e => setItem(item.id, { name: e.target.value })} placeholder="Nazwa artykułu" className={INPUT} />
                <input type="number" min="1" value={item.qty} onChange={e => setItem(item.id, { qty: Number(e.target.value) })} className={INPUT + ' text-center'} />
                <input value={item.reason} onChange={e => setItem(item.id, { reason: e.target.value })} placeholder="Przyczyna (opt.)" className={INPUT} />
                {items.length > 1 && <button onClick={() => removeItem(item.id)} className="text-rose-400 hover:text-rose-600"><Trash2 size={14} /></button>}
              </div>
            ))}
            <button onClick={addItem} className="flex items-center gap-2 text-slate-600 text-xs font-black uppercase hover:underline"><Plus size={12} />Dodaj pozycję</button>
          </div>
        </Field>

        <Field label="Uwagi"><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Dokumentacja zwrotu, stan towaru, protokół..." className={INPUT + ' resize-none'} /></Field>
      </div>

      {error && <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-2xl px-4 py-3 text-xs font-bold"><AlertTriangle size={13} />{error}</div>}

      <div className="flex gap-3">
        <button onClick={onCancel} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 text-slate-600 text-xs font-black uppercase hover:bg-slate-200 transition-all"><ArrowLeft size={13} />Anuluj</button>
        <button onClick={handleSubmit} disabled={loading || !isValid} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-slate-900 text-white text-xs font-black uppercase hover:bg-slate-700 disabled:opacity-40 transition-all">
          {loading ? 'Wysyłanie...' : <><Check size={13} />Wyślij do zatwierdzenia</>}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>{children}</div>;
}
