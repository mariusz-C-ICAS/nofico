import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, ArrowRight, Check, Camera, FileText, Hash,
  AlertTriangle, Wallet, X, WifiOff, Wifi,
} from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { createDocumentInstance, getDefaultTemplate } from '../services/workflowEngine';
import { transitionDocument } from '../services/workflowEngine';
import { dispatchToMany, NOTIF_MESSAGES } from '../services/notificationService';
import {
  saveDraftOffline, isOnline, createOnlineListener, syncPendingDrafts,
} from '../services/offlineDraftStorage';
import type { DocumentMetadata } from '../types';

interface Props {
  onComplete: (docId: string) => void;
  onCancel: () => void;
}

type WizardStep = 'details' | 'attachment' | 'review' | 'done';

const STEPS: { id: WizardStep; label: string }[] = [
  { id: 'details', label: 'Szczegóły' },
  { id: 'attachment', label: 'Załącznik' },
  { id: 'review', label: 'Przegląd' },
];

const CURRENCIES = ['PLN', 'EUR', 'USD', 'GBP', 'CHF'];

export default function SubmitExpenseWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const [step, setStep] = useState<WizardStep>('details');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [online, setOnline] = useState(isOnline());

  const [meta, setMeta] = useState<DocumentMetadata>({
    title: '',
    amount: undefined,
    currency: 'PLN',
    vendor: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    description: '',
    tags: [],
  });

  const [attachmentName, setAttachmentName] = useState('');
  const [hasAttachment, setHasAttachment] = useState(false);

  useEffect(() => {
    return createOnlineListener(
      () => {
        setOnline(true);
        if (user && activeTenantId) {
          syncPendingDrafts(activeTenantId, user.uid, user.email ?? '').catch(console.warn);
        }
      },
      () => setOnline(false)
    );
  }, [user, activeTenantId]);

  const currentIndex = STEPS.findIndex(s => s.id === step);

  const isDetailsValid =
    meta.title.trim().length > 2 &&
    meta.amount != null &&
    meta.amount > 0 &&
    meta.vendor!.trim().length > 0;

  const handleNext = () => {
    if (step === 'details') setStep('attachment');
    else if (step === 'attachment') setStep('review');
  };

  const handleBack = () => {
    if (step === 'attachment') setStep('details');
    else if (step === 'review') setStep('attachment');
  };

  const handleSubmit = async () => {
    if (!user || !activeTenantId) return;
    setLoading(true);
    setError('');
    try {
      // Offline path: save draft locally, sync when back online
      if (!online) {
        const template = await getDefaultTemplate(activeTenantId, 'OUT_OF_POCKET').catch(() => null);
        await saveDraftOffline({
          tenantId: activeTenantId,
          userId: user.uid,
          userEmail: user.email ?? '',
          type: 'OUT_OF_POCKET',
          templateId: template?.id ?? 'default-out-of-pocket',
          metadata: meta,
          attachments: [],
        });
        setStep('done');
        onComplete('offline-draft');
        return;
      }

      // Online path: create in Firestore and submit
      const template = await getDefaultTemplate(activeTenantId, 'OUT_OF_POCKET');
      const templateId = template?.id ?? 'default-out-of-pocket';

      const docId = await createDocumentInstance(
        activeTenantId,
        user.uid,
        user.email ?? '',
        'OUT_OF_POCKET',
        templateId,
        meta
      );

      await transitionDocument(
        activeTenantId,
        docId,
        'SUBMIT',
        user.uid,
        user.email ?? '',
        'PENDING_APPROVAL',
        {
          note: `Wydatek własny: ${meta.vendor}, ${meta.amount} ${meta.currency}`,
          stepType: 'APPROVAL',
          stepDefId: 'step-1',
        }
      );

      setStep('done');
      onComplete(docId);
    } catch (e: any) {
      setError(e.message ?? 'Błąd wysyłania dokumentu.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'done') {
    const wasOffline = !online;
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${wasOffline ? 'bg-amber-100' : 'bg-emerald-100'}`}>
          {wasOffline ? <WifiOff size={36} className="text-amber-600" /> : <Check size={36} className="text-emerald-600" />}
        </div>
        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight italic mb-3">
          {wasOffline ? 'Zapisano offline!' : 'Wysłano!'}
        </h3>
        <p className="text-slate-500 text-sm font-medium max-w-sm">
          {wasOffline
            ? 'Dokument zapisany lokalnie. Zostanie automatycznie wysłany po przywróceniu połączenia.'
            : 'Dokument trafił do kolejki zatwierdzenia. Otrzymasz powiadomienie po decyzji managera.'}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      {/* Offline banner */}
      {!online && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 mb-6 animate-in fade-in">
          <WifiOff size={16} className="text-amber-600 flex-shrink-0" />
          <p className="text-xs font-bold text-amber-800">
            Tryb offline — dokument zostanie zapisany lokalnie i wysłany automatycznie po przywróceniu sieci.
          </p>
        </div>
      )}
      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.id}>
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                  i < currentIndex
                    ? 'bg-indigo-600 text-white'
                    : i === currentIndex
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {i < currentIndex ? <Check size={14} /> : i + 1}
              </div>
              <span className={`text-xs font-bold uppercase tracking-widest ${i === currentIndex ? 'text-slate-900' : 'text-slate-400'}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px ${i < currentIndex ? 'bg-indigo-600' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step: Details */}
      {step === 'details' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Tytuł wydatku *
            </label>
            <input
              value={meta.title}
              onChange={e => setMeta(p => ({ ...p, title: e.target.value }))}
              className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
              placeholder="np. Materiały budowlane — projekt X"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Kwota *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={meta.amount ?? ''}
                onChange={e => setMeta(p => ({ ...p, amount: e.target.value ? parseFloat(e.target.value) : undefined }))}
                className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 tabular-nums"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Waluta
              </label>
              <select
                value={meta.currency}
                onChange={e => setMeta(p => ({ ...p, currency: e.target.value }))}
                className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
              >
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Sprzedawca / Vendor *
              </label>
              <input
                value={meta.vendor ?? ''}
                onChange={e => setMeta(p => ({ ...p, vendor: e.target.value }))}
                className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                placeholder="Nazwa firmy"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Data faktury
              </label>
              <input
                type="date"
                value={meta.invoiceDate ?? ''}
                onChange={e => setMeta(p => ({ ...p, invoiceDate: e.target.value }))}
                className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Opis (opcjonalny)
            </label>
            <textarea
              value={meta.description ?? ''}
              onChange={e => setMeta(p => ({ ...p, description: e.target.value }))}
              rows={2}
              className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Dodatkowy kontekst..."
            />
          </div>
        </div>
      )}

      {/* Step: Attachment */}
      {step === 'attachment' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div
            onClick={() => setHasAttachment(!hasAttachment)}
            className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all ${
              hasAttachment
                ? 'border-indigo-400 bg-indigo-50'
                : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
            }`}
          >
            {hasAttachment ? (
              <>
                <Check size={36} className="text-indigo-600 mx-auto mb-3" />
                <p className="font-black text-slate-800 text-sm uppercase">Załącznik dodany</p>
                <p className="text-xs text-slate-500 mt-1">{attachmentName || 'faktura.pdf'}</p>
              </>
            ) : (
              <>
                <Camera size={36} className="text-slate-300 mx-auto mb-3" />
                <p className="font-black text-slate-500 text-sm uppercase">Dodaj skan / zdjęcie faktury</p>
                <p className="text-xs text-slate-400 mt-2">PDF, JPG, PNG — max 10 MB</p>
              </>
            )}
          </div>

          {hasAttachment && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 flex items-center gap-3">
              <FileText size={20} className="text-indigo-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-slate-800 uppercase">{attachmentName || 'faktura.pdf'}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Hash size={9} className="text-slate-400" />
                  <span className="text-[9px] font-mono text-slate-400">SHA-256: a4f3c9...mock</span>
                </div>
              </div>
              <button onClick={() => setHasAttachment(false)} className="p-1.5 hover:bg-white rounded-lg">
                <X size={14} className="text-slate-400" />
              </button>
            </div>
          )}

          <p className="text-[10px] text-slate-400 font-bold text-center">
            Brak załącznika? Możesz dodać go później przed zatwierdzeniem.
          </p>
        </div>
      )}

      {/* Step: Review */}
      {step === 'review' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-slate-50 rounded-3xl p-6 space-y-3">
            <Row label="Tytuł" value={meta.title} />
            <Row label="Kwota" value={`${meta.amount?.toFixed(2)} ${meta.currency}`} highlight />
            <Row label="Sprzedawca" value={meta.vendor ?? '—'} />
            <Row label="Data faktury" value={meta.invoiceDate ?? '—'} />
            {meta.description && <Row label="Opis" value={meta.description} />}
            <Row label="Załącznik" value={hasAttachment ? 'Tak' : 'Brak (do uzupełnienia)'} />
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex items-start gap-3">
            <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-amber-800 leading-relaxed">
              Po wysłaniu dokument trafi do kolejki zatwierdzenia managera. Historia każdego kroku jest niezmienialnie zapisywana.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm font-bold bg-red-50 rounded-2xl px-5 py-4">
              <AlertTriangle size={14} /> {error}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 mt-8 pt-6 border-t border-slate-100">
        <button
          onClick={step === 'details' ? onCancel : handleBack}
          className="flex items-center gap-2 px-6 py-4 rounded-2xl text-xs font-black uppercase text-slate-500 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft size={14} /> {step === 'details' ? 'Anuluj' : 'Wstecz'}
        </button>
        <div className="flex-1" />
        {step !== 'review' ? (
          <button
            onClick={handleNext}
            disabled={step === 'details' && !isDetailsValid}
            className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xl"
          >
            Dalej <ArrowRight size={14} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`flex items-center gap-2 px-8 py-4 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 shadow-xl ${online ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-amber-600 hover:bg-amber-700'}`}
          >
            {online ? <Wallet size={14} /> : <WifiOff size={14} />}
            {loading ? 'Przetwarzanie...' : online ? 'Wyślij do zatwierdzenia' : 'Zapisz offline'}
          </button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      <span className={`text-sm font-black ${highlight ? 'text-indigo-600' : 'text-slate-800'}`}>
        {value}
      </span>
    </div>
  );
}
