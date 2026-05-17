/**
 * Data: 2026-05-17
 * Ścieżka: /src/modules/workflow/components/SubmitContractWizard.tsx
 */
import React, { useState } from 'react';
import { ArrowLeft, Check, AlertTriangle, FileSignature } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { useCompany } from '../../../core/auth/CompanyContext';
import { createDocumentInstance, transitionDocument } from '../services/workflowEngine';
import type { DocumentMetadata } from '../types';

const CONTRACT_TYPES = ['B2B', 'UoP', 'UoZ', 'Usługowa', 'NDA', 'Najem', 'Inne'];
const CURRENCIES = ['PLN', 'EUR', 'USD', 'GBP', 'CHF'];
const INPUT = 'w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-rose-400 focus:border-transparent outline-none transition-all';

interface Props { onComplete: (docId: string) => void; onCancel: () => void; }

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export default function SubmitContractWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasFile, setHasFile] = useState(false);
  const [form, setForm] = useState({
    title: '', contractType: 'B2B', counterparty: '', nip: '',
    amount: '', currency: 'PLN',
    signedDate: new Date().toISOString().split('T')[0],
    expiresDate: '', description: '', requiresLegal: true, hasNda: false,
  });
  const set = (patch: Partial<typeof form>) => setForm(p => ({ ...p, ...patch }));
  const isValid = form.title.trim().length > 2 && form.counterparty.trim().length > 1;

  const handleSubmit = async () => {
    if (!user || !activeTenantId || !isValid) return;
    setLoading(true); setError('');
    try {
      const meta: DocumentMetadata = {
        title: form.title,
        vendor: form.counterparty,
        amount: form.amount ? parseFloat(form.amount) : undefined,
        currency: form.currency,
        invoiceDate: form.signedDate,
        description: [
          `[${form.contractType}]`,
          form.description,
          form.hasNda ? '| NDA' : '',
          form.requiresLegal ? '| Wymaga przeglądu prawnego' : '',
        ].filter(Boolean).join(' '),
        costCenter: form.nip,
      };
      const docId = await createDocumentInstance(
        activeTenantId, user.uid, user.email ?? '',
        'CONTRACT', 'default-contract', meta,
        hasFile ? [{ id: 'tmp', name: 'umowa.pdf', size: 0, mimeType: 'application/pdf', hash: '', isLocalOnly: true, uploadedAt: null, uploadedBy: user.uid }] : [],
        currentCompany?.id
      );
      await transitionDocument(activeTenantId, docId, 'SUBMIT', user.uid, user.email ?? '', 'SUBMITTED', {
        stepDefId: 'step-submit', stepType: 'APPROVAL',
        note: `Umowa ${form.contractType} z ${form.counterparty} wysłana do akceptacji prawnej.`,
      });
      onComplete(docId);
    } catch (e: any) {
      setError(e.message ?? 'Błąd podczas wysyłania.');
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest flex items-center gap-2">
          <FileSignature size={12} /> Umowa / Kontrakt
        </span>
        <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 mt-1">Nowa umowa</h3>
      </div>

      <div className="space-y-4">
        <Field label="Tytuł umowy *">
          <input value={form.title} onChange={e => set({ title: e.target.value })} placeholder="np. Umowa B2B z X sp. z o.o." className={INPUT} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Typ umowy">
            <select value={form.contractType} onChange={e => set({ contractType: e.target.value })} className={INPUT}>
              {CONTRACT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Waluta">
            <select value={form.currency} onChange={e => set({ currency: e.target.value })} className={INPUT}>
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Kontrahent / strona *">
          <input value={form.counterparty} onChange={e => set({ counterparty: e.target.value })} placeholder="Nazwa firmy lub osoby" className={INPUT} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="NIP kontrahenta">
            <input value={form.nip} onChange={e => set({ nip: e.target.value })} placeholder="0000000000" className={INPUT} />
          </Field>
          <Field label="Wartość umowy">
            <input type="number" step="0.01" min="0" value={form.amount} onChange={e => set({ amount: e.target.value })} placeholder="0.00" className={INPUT} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Data zawarcia">
            <input type="date" value={form.signedDate} onChange={e => set({ signedDate: e.target.value })} className={INPUT} />
          </Field>
          <Field label="Data wygaśnięcia">
            <input type="date" value={form.expiresDate} onChange={e => set({ expiresDate: e.target.value })} className={INPUT} />
          </Field>
        </div>

        <Field label="Przedmiot umowy">
          <textarea value={form.description} onChange={e => set({ description: e.target.value })} rows={3} placeholder="Opis zakresu i przedmiotu umowy..." className={INPUT + ' resize-none'} />
        </Field>

        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.requiresLegal} onChange={e => set({ requiresLegal: e.target.checked })} className="w-5 h-5 rounded accent-rose-600" />
            <span className="text-[10px] font-black text-rose-800 uppercase tracking-tight">Wymagana akceptacja prawna</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.hasNda} onChange={e => set({ hasNda: e.target.checked })} className="w-5 h-5 rounded accent-rose-600" />
            <span className="text-[10px] font-black text-rose-800 uppercase tracking-tight">Klauzula poufności (NDA)</span>
          </label>
        </div>

        <Field label="Plik umowy (PDF / DOCX)">
          <label className={`${INPUT} flex items-center gap-2 cursor-pointer ${hasFile ? 'bg-emerald-50 border-emerald-200' : ''}`}>
            <FileSignature size={14} className={hasFile ? 'text-emerald-600' : 'text-slate-400'} />
            <span className={`text-xs ${hasFile ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>{hasFile ? 'Plik wybrany' : 'Kliknij aby wybrać PDF'}</span>
            <input type="file" accept=".pdf,.docx" className="hidden" onChange={e => setHasFile(!!e.target.files?.length)} />
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
        <button onClick={handleSubmit} disabled={loading || !isValid} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-rose-600 text-white text-xs font-black uppercase hover:bg-rose-700 disabled:opacity-40 transition-all">
          {loading ? 'Wysyłanie...' : <><Check size={13} /> Wyślij do akceptacji prawnej</>}
        </button>
      </div>
    </div>
  );
}
