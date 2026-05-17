import React, { useState } from 'react';
import { ArrowLeft, Check, AlertTriangle, Send, Plus, X } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { useCompany } from '../../../core/auth/CompanyContext';
import { createDocumentInstance, transitionDocument } from '../services/workflowEngine';

interface Props { onComplete: (docId: string) => void; onCancel: () => void; }

const INPUT = 'w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none transition-all';

export default function SubmitRfqWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [supplierInput, setSupplierInput] = useState('');
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [scope, setScope] = useState('');
  const [specification, setSpecification] = useState('');
  const [deadline, setDeadline] = useState('');
  const [criteria, setCriteria] = useState('Cena, termin dostawy, referencje');

  const addSupplier = () => {
    const email = supplierInput.trim();
    if (email.includes('@') && !suppliers.includes(email)) {
      setSuppliers(p => [...p, email]);
      setSupplierInput('');
    }
  };
  const removeSupplier = (email: string) => setSuppliers(p => p.filter(s => s !== email));

  const isValid = title.trim().length > 2 && suppliers.length > 0 && scope.trim().length > 10;

  const handleSubmit = async () => {
    if (!user || !activeTenantId || !isValid) return;
    setLoading(true); setError('');
    try {
      const docId = await createDocumentInstance(
        activeTenantId, user.uid, user.email ?? '',
        'RFQ', 'default-rfq',
        {
          title,
          invoiceDate: new Date().toISOString().split('T')[0],
          description: `Dostawcy (${suppliers.length}): ${suppliers.join(', ')}\nTermin odpowiedzi: ${deadline}\nKryteria oceny: ${criteria}\n\nZakres:\n${scope}\n\nSpecyfikacja:\n${specification}`,
        },
        [], currentCompany?.id
      );
      await transitionDocument(activeTenantId, docId, 'SUBMIT', user.uid, user.email ?? '', 'PENDING_APPROVAL', {
        stepDefId: 'step-submit', stepType: 'APPROVAL', note: `RFQ wysłane do ${suppliers.length} dostawców. Termin: ${deadline}.`,
      });
      onComplete(docId);
    } catch (e: any) { setError(e.message ?? 'Błąd podczas wysyłania.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-cyan-50 rounded-2xl flex items-center justify-center"><Send size={18} className="text-cyan-600" /></div>
        <div>
          <span className="text-[9px] font-black text-cyan-600 uppercase tracking-widest">RFQ – REQUEST FOR QUOTATION</span>
          <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 leading-none">Zapytanie Ofertowe</h3>
        </div>
      </div>

      <div className="space-y-4">
        <Field label="Tytuł zapytania *"><input value={title} onChange={e => setTitle(e.target.value)} placeholder="RFQ: Zakup serwerów 2026" className={INPUT} /></Field>

        <Field label="Dostawcy * (dodaj email i naciśnij Enter)">
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                value={supplierInput}
                onChange={e => setSupplierInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSupplier(); } }}
                placeholder="dostawca@firma.pl"
                className={INPUT + ' flex-1'}
              />
              <button type="button" onClick={addSupplier} className="px-4 py-3 bg-cyan-600 text-white rounded-2xl font-black text-xs hover:bg-cyan-700 transition-all flex items-center gap-1">
                <Plus size={14} />
              </button>
            </div>
            {suppliers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {suppliers.map(s => (
                  <span key={s} className="flex items-center gap-1.5 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-full px-3 py-1 text-[10px] font-black">
                    {s}
                    <button onClick={() => removeSupplier(s)} className="hover:text-red-500 transition-colors"><X size={10} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Termin odpowiedzi"><input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className={INPUT} /></Field>
          <Field label="Kryteria oceny"><input value={criteria} onChange={e => setCriteria(e.target.value)} placeholder="Cena, termin, referencje" className={INPUT} /></Field>
        </div>

        <Field label="Zakres zapytania * (min. 10 znaków)"><textarea value={scope} onChange={e => setScope(e.target.value)} rows={3} placeholder="Co zamawiamy, ilości, parametry minimalne..." className={INPUT + ' resize-none'} /></Field>
        <Field label="Specyfikacja techniczna (opcjonalnie)"><textarea value={specification} onChange={e => setSpecification(e.target.value)} rows={4} placeholder="Szczegółowe wymagania techniczne, standardy, certyfikaty..." className={INPUT + ' resize-none'} /></Field>
      </div>

      {error && <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-2xl px-4 py-3 text-xs font-bold"><AlertTriangle size={13} />{error}</div>}

      <div className="flex gap-3">
        <button onClick={onCancel} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 text-slate-600 text-xs font-black uppercase hover:bg-slate-200 transition-all"><ArrowLeft size={13} />Anuluj</button>
        <button onClick={handleSubmit} disabled={loading || !isValid} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-cyan-600 text-white text-xs font-black uppercase hover:bg-cyan-700 disabled:opacity-40 transition-all">
          {loading ? 'Wysyłanie...' : <><Check size={13} />Wyślij do {suppliers.length || '?'} dostawców</>}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>{children}</div>;
}
