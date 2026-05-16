import React, { useState } from 'react';
import { MessageSquareX, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { useCompany } from '../../../core/auth/CompanyContext';
import { createDocumentInstance, transitionDocument } from '../services/workflowEngine';

interface Props { onComplete: (docId: string) => void; onCancel: () => void; }
type Step = 'details' | 'contact' | 'review';

const CATEGORIES = [
  { id: 'product', label: 'Produkt / jakość' },
  { id: 'service', label: 'Usługa / realizacja' },
  { id: 'delivery', label: 'Dostawa / termin' },
  { id: 'billing', label: 'Fakturowanie / płatność' },
  { id: 'communication', label: 'Komunikacja / obsługa' },
  { id: 'other', label: 'Inne' },
];

export default function SubmitCustomerComplaintWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const { currentCompany } = useCompany();
  const [step, setStep] = useState<Step>('details');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('product');
  const [description, setDescription] = useState('');
  const [complaintRef, setComplaintRef] = useState('');
  const [amount, setAmount] = useState('');
  const [complainantName, setComplainantName] = useState('');
  const [complainantEmail, setComplainantEmail] = useState('');
  const [resolutionDeadline, setResolutionDeadline] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canProceedStep1 = title.trim().length > 3 && description.trim().length > 10;
  const canProceedStep2 = complainantName.trim().length > 1;

  const handleSubmit = async () => {
    if (!user || !activeTenantId) return;
    setLoading(true); setError('');
    try {
      const docId = await createDocumentInstance(
        activeTenantId, user.uid, user.email ?? '', 'CUSTOMER_COMPLAINT', 'default-complaint',
        {
          title: title.trim(),
          complaintCategory: category,
          description: description.trim(),
          complaintRef: complaintRef.trim() || undefined,
          amount: amount ? parseFloat(amount) : undefined,
          currency: 'PLN',
          complainantName: complainantName.trim(),
          complainantEmail: complainantEmail.trim() || undefined,
          resolutionDeadline,
        },
        [],
        currentCompany?.id
      );
      await transitionDocument(
        activeTenantId, docId, 'SUBMIT', user.uid, user.email ?? '', 'PENDING_APPROVAL',
        { stepType: 'APPROVAL', note: `Reklamacja od: ${complainantName}. Kategoria: ${CATEGORIES.find(c => c.id === category)?.label}. Termin: ${resolutionDeadline}.` }
      );
      onComplete(docId);
    } catch (e: any) { setError(e.message ?? 'Błąd wysyłania.'); }
    finally { setLoading(false); }
  };

  const steps: Step[] = ['details', 'contact', 'review'];
  const stepLabels: Record<Step, string> = { details: 'Szczegóły', contact: 'Klient', review: 'Wyślij' };

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <button onClick={onCancel} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 block">← Anuluj</button>

      <div className="flex items-center gap-3">
        <MessageSquareX size={20} className="text-rose-600" />
        <div>
          <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Reklamacja klienta</h3>
          <p className="text-slate-400 text-sm font-medium">Rejestracja i obsługa reklamacji z SLA 30 dni.</p>
        </div>
      </div>

      <div className="flex gap-1">
        {steps.map((s, i) => (
          <div key={s} className="flex-1 flex flex-col gap-1">
            <div className={`h-1 rounded-full ${i <= steps.indexOf(step) ? 'bg-rose-600' : 'bg-slate-200'}`} />
            <span className={`text-[9px] font-black uppercase tracking-widest ${s === step ? 'text-rose-600' : 'text-slate-400'}`}>{stepLabels[s]}</span>
          </div>
        ))}
      </div>

      {step === 'details' && (
        <div className="space-y-5">
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Kategoria reklamacji *</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map(c => (
                <button key={c.id} onClick={() => setCategory(c.id)}
                  className={`p-3 rounded-2xl border text-xs font-black text-left transition-all ${category === c.id ? 'bg-rose-50 border-rose-400 text-rose-700 ring-2 ring-rose-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tytuł reklamacji *</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="np. Uszkodzony produkt — zamówienie #1234"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-rose-500 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nr referencyjny (opcjonalnie)</label>
              <input value={complaintRef} onChange={e => setComplaintRef(e.target.value)}
                placeholder="Nr zamówienia / faktury"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-rose-500 outline-none" />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Wartość roszczenia (PLN)</label>
              <input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Opis reklamacji *</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={5}
              placeholder="Opisz problem szczegółowo. Co się stało? Kiedy? Jakie są oczekiwania klienta?"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm resize-none focus:ring-2 focus:ring-rose-500 outline-none" />
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Termin rozwiązania</label>
            <input type="date" value={resolutionDeadline} onChange={e => setResolutionDeadline(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500 outline-none" />
          </div>
        </div>
      )}

      {step === 'contact' && (
        <div className="space-y-5">
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Imię i nazwisko klienta *</label>
            <input value={complainantName} onChange={e => setComplainantName(e.target.value)}
              placeholder="Jan Kowalski / ABC Sp. z o.o."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-rose-500 outline-none" />
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">E-mail klienta (opcjonalnie)</label>
            <input type="email" value={complainantEmail} onChange={e => setComplainantEmail(e.target.value)}
              placeholder="klient@firma.pl"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-rose-500 outline-none" />
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-[2rem] p-6 space-y-3">
            <Row label="Kategoria" value={CATEGORIES.find(c => c.id === category)?.label ?? ''} />
            <Row label="Tytuł" value={title} />
            <Row label="Klient" value={complainantName} />
            {complainantEmail && <Row label="E-mail" value={complainantEmail} />}
            {complaintRef && <Row label="Ref" value={complaintRef} />}
            {amount && <Row label="Wartość" value={`${parseFloat(amount).toFixed(2)} PLN`} />}
            <Row label="Termin" value={resolutionDeadline} />
          </div>
          <div className="bg-rose-50 rounded-[2rem] p-4 border border-rose-100">
            <p className="text-[10px] text-rose-700 font-bold">
              Reklamacja zostanie przekazana do Customer Service. Klient powinien otrzymać odpowiedź do {resolutionDeadline}.
            </p>
          </div>
          {error && <p className="text-red-600 text-xs font-bold flex items-center gap-1.5"><AlertTriangle size={12} />{error}</p>}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button
          onClick={() => {
            if (step === 'details') onCancel();
            else if (step === 'contact') setStep('details');
            else setStep('contact');
          }}
          className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600">
          ← {step === 'details' ? 'Anuluj' : 'Wstecz'}
        </button>
        {step === 'details' && (
          <button disabled={!canProceedStep1} onClick={() => setStep('contact')}
            className="bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-black px-8 py-3 rounded-2xl text-xs uppercase tracking-widest">
            Dalej →
          </button>
        )}
        {step === 'contact' && (
          <button disabled={!canProceedStep2} onClick={() => setStep('review')}
            className="bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-black px-8 py-3 rounded-2xl text-xs uppercase tracking-widest">
            Dalej →
          </button>
        )}
        {step === 'review' && (
          <button disabled={loading} onClick={handleSubmit}
            className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black px-8 py-3 rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-rose-500/20">
            {loading ? 'Wysyłanie...' : <><CheckCircle2 size={14} /> Zarejestruj reklamację</>}
          </button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest shrink-0">{label}</span>
      <span className="text-xs font-bold text-slate-800 text-right">{value}</span>
    </div>
  );
}
