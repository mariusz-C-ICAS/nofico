import React, { useState } from 'react';
import { ArrowLeft, Check, AlertTriangle, PackageCheck, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { useCompany } from '../../../core/auth/CompanyContext';
import { createDocumentInstance, transitionDocument } from '../services/workflowEngine';

interface Props { onComplete: (docId: string) => void; onCancel: () => void; }
interface GrItem { id: string; name: string; expected: number; received: number; }

const INPUT = 'w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-green-400 focus:border-transparent outline-none transition-all';

export default function SubmitGoodsReceiptWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [poNumber, setPoNumber] = useState('');
  const [vendor, setVendor] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [warehouse, setWarehouse] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<GrItem[]>([{ id: '1', name: '', expected: 0, received: 0 }]);

  const addItem = () => setItems(p => [...p, { id: Date.now().toString(), name: '', expected: 0, received: 0 }]);
  const removeItem = (id: string) => setItems(p => p.filter(i => i.id !== id));
  const setItem = (id: string, patch: Partial<GrItem>) => setItems(p => p.map(i => i.id === id ? { ...i, ...patch } : i));

  const hasDeviations = items.some(i => i.received !== i.expected && i.expected > 0);
  const isValid = vendor.trim().length > 1 && items.every(i => i.name.trim().length > 0);

  const handleSubmit = async () => {
    if (!user || !activeTenantId || !isValid) return;
    setLoading(true); setError('');
    try {
      const itemsText = items.map(i => {
        const dev = i.received - i.expected;
        return `${i.name}: oczekiwano ${i.expected}, przyjęto ${i.received}${dev !== 0 ? ` [RÓŻNICA: ${dev > 0 ? '+' : ''}${dev}]` : ''}`;
      }).join('\n');
      const docId = await createDocumentInstance(
        activeTenantId, user.uid, user.email ?? '',
        'GOODS_RECEIPT', 'default-goods-receipt',
        {
          title: `PZ – ${vendor}${poNumber ? ` / PO ${poNumber}` : ''}`,
          vendor,
          invoiceDate: deliveryDate,
          description: `Nr PO: ${poNumber}\nDostawca: ${vendor}\nData dostawy: ${deliveryDate}\nMagazyn: ${warehouse}\n${hasDeviations ? '⚠️ WYKRYTO ROZBIEŻNOŚCI!\n' : ''}\nPozycje:\n${itemsText}\n\nUwagi: ${notes}`,
        },
        [], currentCompany?.id
      );
      await transitionDocument(activeTenantId, docId, 'SUBMIT', user.uid, user.email ?? '', 'PENDING_APPROVAL', {
        stepDefId: 'step-submit', stepType: 'APPROVAL',
        note: `Przyjęcie towaru (PZ) zarejestrowane.${hasDeviations ? ' UWAGA: wykryto rozbieżności ilościowe.' : ''}`,
      });
      onComplete(docId);
    } catch (e: any) { setError(e.message ?? 'Błąd podczas wysyłania.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-green-50 rounded-2xl flex items-center justify-center"><PackageCheck size={18} className="text-green-600" /></div>
        <div>
          <span className="text-[9px] font-black text-green-600 uppercase tracking-widest">GOODS RECEIPT (PZ)</span>
          <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 leading-none">Przyjęcie Towaru</h3>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nr zamówienia (PO)"><input value={poNumber} onChange={e => setPoNumber(e.target.value)} placeholder="PO/2026/05/001" className={INPUT} /></Field>
          <Field label="Dostawca *"><input value={vendor} onChange={e => setVendor(e.target.value)} placeholder="Nazwa dostawcy" className={INPUT} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data dostawy"><input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className={INPUT} /></Field>
          <Field label="Magazyn / lokalizacja"><input value={warehouse} onChange={e => setWarehouse(e.target.value)} placeholder="np. Magazyn A, Rząd 3" className={INPUT} /></Field>
        </div>

        <Field label="Pozycje przyjęcia * (oczekiwano vs. odebrano)">
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_80px_80px_20px] gap-2 px-1">
              <span className="text-[8px] font-black text-slate-400 uppercase">Artykuł</span>
              <span className="text-[8px] font-black text-slate-400 uppercase text-center">Oczek.</span>
              <span className="text-[8px] font-black text-slate-400 uppercase text-center">Odebr.</span>
              <span />
            </div>
            {items.map(item => {
              const dev = item.received - item.expected;
              const hasDeviation = dev !== 0 && item.expected > 0;
              return (
                <div key={item.id} className={`grid grid-cols-[1fr_80px_80px_20px] gap-2 items-center ${hasDeviation ? 'bg-amber-50 rounded-2xl p-2 -mx-2' : ''}`}>
                  <input value={item.name} onChange={e => setItem(item.id, { name: e.target.value })} placeholder="Nazwa artykułu" className={INPUT} />
                  <input type="number" min="0" value={item.expected} onChange={e => setItem(item.id, { expected: Number(e.target.value) })} className={INPUT + ' text-center'} />
                  <input type="number" min="0" value={item.received} onChange={e => setItem(item.id, { received: Number(e.target.value) })}
                    className={`${INPUT} text-center ${hasDeviation ? 'ring-2 ring-amber-400 bg-amber-50' : ''}`} />
                  {items.length > 1 && <button onClick={() => removeItem(item.id)} className="text-rose-400 hover:text-rose-600"><Trash2 size={14} /></button>}
                </div>
              );
            })}
            <button onClick={addItem} className="flex items-center gap-2 text-green-600 text-xs font-black uppercase hover:underline"><Plus size={12} />Dodaj pozycję</button>
          </div>
        </Field>

        {hasDeviations && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-600 shrink-0" />
            <p className="text-[10px] font-black text-amber-700 uppercase">Wykryto rozbieżności ilościowe — dokument trafi do weryfikacji magazyniera i kierownika zakupów.</p>
          </div>
        )}

        <Field label="Uwagi"><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Stan dostawy, uszkodzenia, braki w dokumentacji..." className={INPUT + ' resize-none'} /></Field>
      </div>

      {error && <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-2xl px-4 py-3 text-xs font-bold"><AlertTriangle size={13} />{error}</div>}

      <div className="flex gap-3">
        <button onClick={onCancel} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 text-slate-600 text-xs font-black uppercase hover:bg-slate-200 transition-all"><ArrowLeft size={13} />Anuluj</button>
        <button onClick={handleSubmit} disabled={loading || !isValid} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-green-600 text-white text-xs font-black uppercase hover:bg-green-700 disabled:opacity-40 transition-all">
          {loading ? 'Wysyłanie...' : <><Check size={13} />Zatwierdź przyjęcie PZ</>}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>{children}</div>;
}
