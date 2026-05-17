import React, { useState } from 'react';
import { ArrowLeft, Check, AlertTriangle, FileText } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { useCompany } from '../../../core/auth/CompanyContext';
import { createDocumentInstance, transitionDocument } from '../services/workflowEngine';
import type { DocumentType, DocumentMetadata } from '../types';
import { DOC_TYPE_LABELS } from '../types';

interface Props {
  type: DocumentType;
  onComplete: (docId: string) => void;
  onCancel: () => void;
}

const CURRENCIES = ['PLN', 'EUR', 'USD', 'GBP', 'CHF'];

export default function SubmitGenericDocumentWizard({ type, onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasAttachment, setHasAttachment] = useState(false);

  const [meta, setMeta] = useState<DocumentMetadata>({
    title: '',
    amount: undefined,
    currency: 'PLN',
    vendor: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    description: '',
  });

  const set = (patch: Partial<DocumentMetadata>) => setMeta(prev => ({ ...prev, ...patch }));

  const isValid = meta.title.trim().length > 2;

  const handleSubmit = async () => {
    if (!user || !activeTenantId || !isValid) return;
    setLoading(true);
    setError('');
    try {
      const docId = await createDocumentInstance(
        activeTenantId, user.uid, user.email ?? '',
        type, `default-${type.toLowerCase().replace(/_/g, '-')}`,
        meta,
        hasAttachment ? [{ id: 'tmp', name: 'zalacznik', size: 0, mimeType: 'application/octet-stream', hash: '', isLocalOnly: true, uploadedAt: null, uploadedBy: user.uid }] : [],
        currentCompany?.id
      );
      await transitionDocument(activeTenantId, docId, 'SUBMIT', user.uid, user.email ?? '', 'PENDING_APPROVAL', {
        stepDefId: 'step-submit', stepType: 'APPROVAL',
        note: `${DOC_TYPE_LABELS[type]} wysłany do zatwierdzenia.`,
      });
      onComplete(docId);
    } catch (e: any) {
      setError(e.message ?? 'Błąd podczas wysyłania.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">{DOC_TYPE_LABELS[type]}</span>
        <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 mt-1">Nowy dokument</h3>
      </div>

      <div className="space-y-4">
        <Field label="Tytuł dokumentu *">
          <input
            value={meta.title}
            onChange={e => set({ title: e.target.value })}
            placeholder={`Tytuł ${DOC_TYPE_LABELS[type].toLowerCase()}...`}
            className={INPUT}
          />
        </Field>

        {type !== 'TIMESHEET' && (
          <>
            <Field label="Kontrahent / strona">
              <input value={meta.vendor ?? ''} onChange={e => set({ vendor: e.target.value })} placeholder="Nazwa firmy lub osoby" className={INPUT} />
            </Field>
            <div className="flex gap-3">
              <Field label="Kwota (opcjonalnie)" className="flex-1">
                <input type="number" step="0.01" min="0" value={meta.amount ?? ''} onChange={e => set({ amount: e.target.value ? Number(e.target.value) : undefined })} placeholder="0.00" className={INPUT} />
              </Field>
              <Field label="Waluta">
                <select value={meta.currency} onChange={e => set({ currency: e.target.value })} className={INPUT}>
                  {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
            </div>
          </>
        )}

        {type === 'TIMESHEET' && (
          <Field label="Okres rozliczeniowy">
            <input type="month" value={meta.invoiceDate?.substring(0, 7) ?? ''} onChange={e => set({ invoiceDate: e.target.value + '-01' })} className={INPUT} />
          </Field>
        )}

        <Field label="Data dokumentu">
          <input type="date" value={meta.invoiceDate ?? ''} onChange={e => set({ invoiceDate: e.target.value })} className={INPUT} />
        </Field>

        <Field label="Centrum kosztowe">
          <input value={meta.costCenter ?? ''} onChange={e => set({ costCenter: e.target.value })} placeholder="Opcjonalnie" className={INPUT} />
        </Field>

        <Field label="Opis / notatka">
          <textarea value={meta.description ?? ''} onChange={e => set({ description: e.target.value })} rows={4} placeholder="Szczegóły dokumentu..." className={INPUT + ' resize-none'} />
        </Field>

        <Field label="Załącznik">
          <label className={`${INPUT} flex items-center gap-2 cursor-pointer ${hasAttachment ? 'ring-emerald-300 bg-emerald-50' : ''}`}>
            <FileText size={14} className={hasAttachment ? 'text-emerald-600' : 'text-slate-400'} />
            <span className={`text-xs ${hasAttachment ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
              {hasAttachment ? 'Plik wybrany' : 'Kliknij aby wybrać plik'}
            </span>
            <input type="file" className="hidden" onChange={e => setHasAttachment(!!e.target.files?.length)} />
          </label>
        </Field>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-2xl px-4 py-3 text-xs font-bold">
          <AlertTriangle size={13} /> {error}
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onCancel} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 text-slate-600 text-xs font-black uppercase hover:bg-slate-200 transition-all">
          <ArrowLeft size={13} /> Anuluj
        </button>
        <button onClick={handleSubmit} disabled={loading || !isValid} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-600 text-white text-xs font-black uppercase hover:bg-emerald-700 disabled:opacity-40 transition-all">
          {loading ? 'Wysyłanie...' : <><Check size={13} /> Wyślij do zatwierdzenia</>}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const INPUT = 'w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none transition-all';
