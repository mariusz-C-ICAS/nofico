import React, { useState } from 'react';
import { ArrowLeft, Check, AlertTriangle, PackageOpen, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { useCompany } from '../../../core/auth/CompanyContext';
import { createDocumentInstance, transitionDocument } from '../services/workflowEngine';

interface Props { onComplete: (docId: string) => void; onCancel: () => void; }
interface GiItem { id: string; name: string; qty: number; unit: string; }

const INPUT = 'w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none transition-all';

export default function SubmitGoodsIssueWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [recipient, setRecipient] = useState('');
  const [destination, setDestination] = useState('');
  const [poRef, setPoRef] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<GiItem[]>([{ id: '1', name: '', qty: 1, unit: 'szt.' }]);

  const addItem = () => setItems(p => [...p, { id: Date.now().toString(), name: '', qty: 1, unit: 'szt.' }]);
  const removeItem = (id: string) => setItems(p => p.filter(i => i.id !== id));
  const setItem = (id: string, patch: Partial<GiItem>) => setItems(p => p.map(i => i.id === id ? { ...i, ...patch } : i));

  const isValid = recipient.trim().length > 1 && items.every(i => i.name.trim().length > 0);

  const handleSubmit = async () => {
    if (!user || !activeTenantId || !isValid) return;
    setLoading(true); setError('');
    try {
      const itemsText = items.map(i => `${i.name}: ${i.qty} ${i.unit}`).join('\n');
      const docId = await createDocumentInstance(
        activeTenantId, user.uid, user.email ?? '',
        'GOODS_ISSUE', 'default-goods-issue',
        {
          title: `WZ – ${recipient}${poRef ? ` / PO ${poRef}` : ''}`,
          vendor: recipient,
          invoiceDate: issueDate,
          description: `Odbiorca: ${recipient}\nDestynacja: ${destination}\nRef. PO: ${poRef}\nData wydania: ${issueDate}\n\nPozycje:\n${itemsText}`,
        },
        [], currentCompany?.id
      );
      await transitionDocument(activeTenantId, docId, 'SUBMIT', user.uid, user.email ?? '', 'PENDING_APPROVAL', {
        stepDefId: 'step-submit', stepType: 'APPROVAL', note: 'Dokument WZ — wydanie towaru z magazynu do zatwierdzenia.',
      });
      onComplete(docId);
    } catch (e: any) { setError(e.message ?? 'Błąd podczas wysyłania.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-orange-50 rounded-2xl flex items-center justify-center"><PackageOpen size={18} className="text-orange-600" /></div>
        <div>
          <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest">GOODS ISSUE (WZ)</span>
          <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 leading-none">Wydanie Towaru</h3>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Odbiorca *"><input value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="Nazwa odbiorcy / dział" className={INPUT} /></Field>
          <Field label="Ref. PO"><input value={poRef} onChange={e => setPoRef(e.target.value)} placeholder="PO/2026/05/001" className={INPUT} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data wydania"><input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className={INPUT} /></Field>
          <Field label="Destynacja / lokalizacja"><input value={destination} onChange={e => setDestination(e.target.value)} placeholder="Plac budowy A, Dział IT" className={INPUT} /></Field>
        </div>

        <Field label="Pozycje wydania *">
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_80px_80px_20px] gap-2 px-1">
              {['Artykuł', 'Ilość', 'J.m.', ''].map(h => (
                <span key={h} className="text-[8px] font-black text-slate-400 uppercase">{h}</span>
              ))}
            </div>
            {items.map(item => (
              <div key={item.id} className="grid grid-cols-[1fr_80px_80px_20px] gap-2 items-center">
                <input value={item.name} onChange={e => setItem(item.id, { name: e.target.value })} placeholder="Nazwa artykułu" className={INPUT} />
                <input type="number" min="1" value={item.qty} onChange={e => setItem(item.id, { qty: Number(e.target.value) })} className={INPUT + ' text-center'} />
                <input value={item.unit} onChange={e => setItem(item.id, { unit: e.target.value })} placeholder="szt." className={INPUT + ' text-center'} />
                {items.length > 1 && <button onClick={() => removeItem(item.id)} className="text-rose-400 hover:text-rose-600"><Trash2 size={14} /></button>}
              </div>
            ))}
            <button onClick={addItem} className="flex items-center gap-2 text-orange-600 text-xs font-black uppercase hover:underline"><Plus size={12} />Dodaj pozycję</button>
          </div>
        </Field>
      </div>

      {error && <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-2xl px-4 py-3 text-xs font-bold"><AlertTriangle size={13} />{error}</div>}

      <div className="flex gap-3">
        <button onClick={onCancel} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 text-slate-600 text-xs font-black uppercase hover:bg-slate-200 transition-all"><ArrowLeft size={13} />Anuluj</button>
        <button onClick={handleSubmit} disabled={loading || !isValid} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-orange-600 text-white text-xs font-black uppercase hover:bg-orange-700 disabled:opacity-40 transition-all">
          {loading ? 'Wysyłanie...' : <><Check size={13} />Zatwierdź wydanie WZ</>}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>{children}</div>;
}
