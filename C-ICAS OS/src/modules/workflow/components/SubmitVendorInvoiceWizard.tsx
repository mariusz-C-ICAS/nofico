import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, AlertTriangle, FileText } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { createDocumentInstance, transitionDocument } from '../services/workflowEngine';
import { nipErrorMessage, validateKsefNumber } from '../../../shared/utils/validation';
import type { DocumentMetadata } from '../types';

interface Props {
  onComplete: (docId: string) => void;
  onCancel: () => void;
}

const CURRENCIES = ['PLN', 'EUR', 'USD', 'GBP', 'CHF'];

type Step = 'invoice' | 'amount' | 'ksef' | 'review';
const STEPS: { id: Step; label: string }[] = [
  { id: 'invoice', label: 'Faktura' },
  { id: 'amount', label: 'Kwota' },
  { id: 'ksef', label: 'KSeF & Plik' },
  { id: 'review', label: 'Przegląd' },
];

export default function SubmitVendorInvoiceWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const [step, setStep] = useState<Step>('invoice');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [meta, setMeta] = useState<DocumentMetadata & { invoiceNumber?: string; nip?: string }>({
    title: '',
    vendor: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    amount: undefined,
    currency: 'PLN',
    ksefNumber: '',
    description: '',
  });
  const [nip, setNip] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [hasAttachment, setHasAttachment] = useState(false);

  const set = (patch: Partial<typeof meta>) => setMeta(prev => ({ ...prev, ...patch }));
  const nipError = nip ? nipErrorMessage(nip) : null;
  const ksefError = meta.ksefNumber && !validateKsefNumber(meta.ksefNumber) ? 'Nieprawidłowy format numeru KSeF' : null;

  const stepIndex = STEPS.findIndex(s => s.id === step);

  const invoiceValid =
    meta.vendor!.trim().length > 0 &&
    meta.invoiceDate!.length > 0 &&
    !nipError;

  const amountValid = (meta.amount ?? 0) > 0;

  const canAdvance = () => {
    if (step === 'invoice') return invoiceValid;
    if (step === 'amount') return amountValid;
    return true;
  };

  const next = () => {
    const order: Step[] = ['invoice', 'amount', 'ksef', 'review'];
    const i = order.indexOf(step);
    if (i < order.length - 1) setStep(order[i + 1]);
  };

  const back = () => {
    const order: Step[] = ['invoice', 'amount', 'ksef', 'review'];
    const i = order.indexOf(step);
    if (i > 0) setStep(order[i - 1]);
  };

  const handleSubmit = async () => {
    if (!user || !activeTenantId) return;
    setLoading(true);
    setError('');
    try {
      const fullTitle = meta.title?.trim() || `Faktura ${meta.vendor} ${meta.invoiceDate}`;
      const fullDescription = [
        invoiceNumber ? `Nr faktury: ${invoiceNumber}` : '',
        nip ? `NIP: ${nip}` : '',
        meta.description,
      ].filter(Boolean).join(' | ');

      const docId = await createDocumentInstance(
        activeTenantId,
        user.uid,
        user.email ?? '',
        'VENDOR_INVOICE',
        'default-vendor-invoice',
        { ...meta, title: fullTitle, description: fullDescription },
        hasAttachment ? [{ id: 'tmp', name: 'faktura.pdf', size: 0, mimeType: 'application/pdf', hash: '', isLocalOnly: true, uploadedAt: null, uploadedBy: user.uid }] : []
      );
      await transitionDocument(activeTenantId, docId, 'SUBMIT', user.uid, user.email ?? '', 'SUBMITTED', {
        stepDefId: 'step-submit', stepType: 'APPROVAL',
        note: 'Faktura wysłana do zatwierdzenia.',
      });
      onComplete(docId);
    } catch (e: any) {
      setError(e.message ?? 'Błąd podczas wysyłania faktury.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.id}>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase transition-all ${
              s.id === step ? 'bg-indigo-600 text-white' : i < stepIndex ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
            }`}>
              {i < stepIndex ? <Check size={10} /> : null}
              {s.label}
            </div>
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-slate-200" />}
          </React.Fragment>
        ))}
      </div>

      {/* Step: invoice */}
      {step === 'invoice' && (
        <div className="space-y-4">
          <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900">Dane faktury</h3>
          <Field label="Dostawca *">
            <input value={meta.vendor} onChange={e => set({ vendor: e.target.value })} placeholder="Nazwa firmy lub osoby" className={INPUT} />
          </Field>
          <Field label="NIP dostawcy" hint={nipError ?? undefined}>
            <input value={nip} onChange={e => setNip(e.target.value)} placeholder="np. 1234567890" className={`${INPUT} ${nipError ? 'ring-red-300 focus:ring-red-500' : ''}`} />
          </Field>
          <Field label="Numer faktury">
            <input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="np. FV/2026/001" className={INPUT} />
          </Field>
          <Field label="Data faktury *">
            <input type="date" value={meta.invoiceDate} onChange={e => set({ invoiceDate: e.target.value })} className={INPUT} />
          </Field>
          <Field label="Tytuł dokumentu (opcjonalnie)">
            <input value={meta.title} onChange={e => set({ title: e.target.value })} placeholder="Auto: Faktura [Dostawca] [Data]" className={INPUT} />
          </Field>
        </div>
      )}

      {/* Step: amount */}
      {step === 'amount' && (
        <div className="space-y-4">
          <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900">Kwota i centrum kosztowe</h3>
          <div className="flex gap-3">
            <Field label="Kwota brutto *" className="flex-1">
              <input type="number" step="0.01" min="0" value={meta.amount ?? ''} onChange={e => set({ amount: e.target.value ? Number(e.target.value) : undefined })} placeholder="0.00" className={INPUT} />
            </Field>
            <Field label="Waluta">
              <select value={meta.currency} onChange={e => set({ currency: e.target.value })} className={INPUT}>
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Centrum kosztowe">
            <input value={meta.costCenter ?? ''} onChange={e => set({ costCenter: e.target.value })} placeholder="np. IT, Marketing, Sprzedaż" className={INPUT} />
          </Field>
          <Field label="Projekt">
            <input value={meta.projectId ?? ''} onChange={e => set({ projectId: e.target.value })} placeholder="ID projektu (opcjonalnie)" className={INPUT} />
          </Field>
          <Field label="Opis">
            <textarea value={meta.description ?? ''} onChange={e => set({ description: e.target.value })} rows={3} placeholder="Za co jest ta faktura..." className={INPUT + ' resize-none'} />
          </Field>
        </div>
      )}

      {/* Step: ksef + attachment */}
      {step === 'ksef' && (
        <div className="space-y-4">
          <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900">KSeF i załącznik</h3>
          <Field label="Numer KSeF (opcjonalnie)" hint={ksefError ?? undefined}>
            <input value={meta.ksefNumber ?? ''} onChange={e => set({ ksefNumber: e.target.value })} placeholder="np. 1234567890-20260101-AB123" className={`${INPUT} font-mono text-[11px] ${ksefError ? 'ring-red-300 focus:ring-red-500' : ''}`} />
          </Field>
          <div className="bg-violet-50 border border-violet-200 rounded-2xl px-5 py-4 text-[11px] text-violet-700 font-medium">
            Numer KSeF przyspieszy weryfikację i zapewni pełną zgodność z ustawą o podatku VAT.
            Dla JDG i małych firm pole jest opcjonalne.
          </div>
          <Field label="Skan faktury">
            <label className={`${INPUT} flex items-center gap-2 cursor-pointer ${hasAttachment ? 'ring-emerald-300 bg-emerald-50' : ''}`}>
              <FileText size={14} className={hasAttachment ? 'text-emerald-600' : 'text-slate-400'} />
              <span className={`text-xs ${hasAttachment ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                {hasAttachment ? 'Plik wybrany (symulacja)' : 'Kliknij aby wybrać plik PDF lub obraz'}
              </span>
              <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => setHasAttachment(!!e.target.files?.length)} />
            </label>
          </Field>
        </div>
      )}

      {/* Step: review */}
      {step === 'review' && (
        <div className="space-y-4">
          <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900">Przegląd i wysłanie</h3>
          <div className="bg-slate-50 rounded-[2rem] p-6 space-y-3">
            {[
              ['Dostawca', meta.vendor],
              ['NIP', nip || '—'],
              ['Nr faktury', invoiceNumber || '—'],
              ['Data faktury', meta.invoiceDate],
              ['Kwota', `${meta.amount?.toFixed(2) ?? '—'} ${meta.currency}`],
              ['Centrum kosztowe', meta.costCenter || '—'],
              ['Numer KSeF', meta.ksefNumber || '—'],
              ['Załącznik', hasAttachment ? 'Tak' : 'Brak'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
                <span className="text-xs font-bold text-slate-800">{value}</span>
              </div>
            ))}
          </div>
          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-2xl px-4 py-3 text-xs font-bold">
              <AlertTriangle size={13} /> {error}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 mt-8">
        <button onClick={step === 'invoice' ? onCancel : back} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
          <ArrowLeft size={13} /> {step === 'invoice' ? 'Anuluj' : 'Wstecz'}
        </button>
        {step !== 'review' ? (
          <button onClick={next} disabled={!canAdvance()} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-600 text-white text-xs font-black uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-40 transition-all">
            Dalej <ArrowRight size={13} />
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={loading} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-600 text-white text-xs font-black uppercase tracking-widest hover:bg-emerald-700 disabled:opacity-40 transition-all">
            {loading ? 'Wysyłanie...' : <><Check size={13} /> Wyślij do zatwierdzenia</>}
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, hint, children, className = '' }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-red-500 font-bold mt-1">{hint}</p>}
    </div>
  );
}

const INPUT = 'w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none transition-all';
