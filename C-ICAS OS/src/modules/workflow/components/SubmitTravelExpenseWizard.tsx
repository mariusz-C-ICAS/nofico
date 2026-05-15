import React, { useState, useMemo } from 'react';
import { ArrowLeft, ArrowRight, Check, AlertTriangle, MapPin } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { createDocumentInstance, transitionDocument } from '../services/workflowEngine';
import type { DocumentMetadata } from '../types';

interface Props {
  onComplete: (docId: string) => void;
  onCancel: () => void;
}

type Step = 'trip' | 'costs' | 'review';
const STEPS: { id: Step; label: string }[] = [
  { id: 'trip', label: 'Podróż' },
  { id: 'costs', label: 'Koszty' },
  { id: 'review', label: 'Przegląd' },
];

const PER_DIEM_RATES: Record<string, number> = {
  'Krajowa': 45,
  'Niemcy': 49,
  'Francja': 50,
  'UK': 55,
  'USA': 59,
  'Inne zagranica': 42,
};

export default function SubmitTravelExpenseWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const [step, setStep] = useState<Step>('trip');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [destination, setDestination] = useState('');
  const [purpose, setPurpose] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [tripType, setTripType] = useState<keyof typeof PER_DIEM_RATES>('Krajowa');
  const [usePerDiems, setUsePerDiems] = useState(true);

  const [transport, setTransport] = useState('');
  const [accommodation, setAccommodation] = useState('');
  const [otherCosts, setOtherCosts] = useState('');
  const [currency, setCurrency] = useState('PLN');

  const tripDays = useMemo(() => {
    if (!departureDate || !returnDate) return 0;
    const ms = new Date(returnDate).getTime() - new Date(departureDate).getTime();
    return Math.max(0, Math.ceil(ms / 86400000));
  }, [departureDate, returnDate]);

  const perDiemTotal = usePerDiems ? tripDays * (PER_DIEM_RATES[tripType] ?? 45) : 0;
  const totalAmount = perDiemTotal + Number(transport || 0) + Number(accommodation || 0) + Number(otherCosts || 0);

  const stepIndex = STEPS.findIndex(s => s.id === step);

  const tripValid = destination.trim().length > 0 && departureDate && returnDate && new Date(returnDate) >= new Date(departureDate);
  const costsValid = totalAmount > 0;

  const canAdvance = () => {
    if (step === 'trip') return tripValid;
    if (step === 'costs') return costsValid;
    return true;
  };

  const next = () => {
    const order: Step[] = ['trip', 'costs', 'review'];
    const i = order.indexOf(step);
    if (i < order.length - 1) setStep(order[i + 1]);
  };
  const back = () => {
    const order: Step[] = ['trip', 'costs', 'review'];
    const i = order.indexOf(step);
    if (i > 0) setStep(order[i - 1]);
  };

  const handleSubmit = async () => {
    if (!user || !activeTenantId) return;
    setLoading(true);
    setError('');
    try {
      const description = [
        `Cel: ${destination}`,
        purpose ? `Cel służbowy: ${purpose}` : '',
        `Wyjazd: ${departureDate} — Powrót: ${returnDate} (${tripDays} dni)`,
        usePerDiems ? `Diety: ${tripDays} × ${PER_DIEM_RATES[tripType]} PLN = ${perDiemTotal} PLN` : '',
        transport ? `Transport: ${transport} PLN` : '',
        accommodation ? `Nocleg: ${accommodation} PLN` : '',
        otherCosts ? `Inne: ${otherCosts} PLN` : '',
      ].filter(Boolean).join('\n');

      const metadata: DocumentMetadata = {
        title: `Delegacja: ${destination} (${departureDate} – ${returnDate})`,
        amount: totalAmount,
        currency,
        invoiceDate: returnDate,
        description,
        tags: ['delegacja', tripType === 'Krajowa' ? 'krajowa' : 'zagraniczna'],
      };

      const docId = await createDocumentInstance(
        activeTenantId, user.uid, user.email ?? '',
        'TRAVEL_EXPENSE', 'default-travel-expense',
        metadata
      );
      await transitionDocument(activeTenantId, docId, 'SUBMIT', user.uid, user.email ?? '', 'SUBMITTED', {
        stepDefId: 'step-submit', stepType: 'APPROVAL',
        note: 'Rozliczenie delegacji wysłane do zatwierdzenia.',
      });
      onComplete(docId);
    } catch (e: any) {
      setError(e.message ?? 'Błąd podczas wysyłania.');
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

      {/* Step: trip */}
      {step === 'trip' && (
        <div className="space-y-4">
          <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 flex items-center gap-2">
            <MapPin size={18} className="text-indigo-500" /> Dane podróży
          </h3>
          <Field label="Miejsce docelowe *">
            <input value={destination} onChange={e => setDestination(e.target.value)} placeholder="np. Warszawa, Berlin, Paryż" className={INPUT} />
          </Field>
          <Field label="Cel służbowy">
            <input value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="np. spotkanie z klientem, konferencja" className={INPUT} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data wyjazdu *">
              <input type="date" value={departureDate} onChange={e => setDepartureDate(e.target.value)} className={INPUT} />
            </Field>
            <Field label="Data powrotu *">
              <input type="date" value={returnDate} min={departureDate} onChange={e => setReturnDate(e.target.value)} className={INPUT} />
            </Field>
          </div>
          <Field label="Rodzaj podróży">
            <select value={tripType} onChange={e => setTripType(e.target.value as any)} className={INPUT}>
              {Object.keys(PER_DIEM_RATES).map(k => <option key={k}>{k}</option>)}
            </select>
          </Field>
          {tripDays > 0 && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl px-5 py-3 text-[11px] font-bold text-indigo-700">
              {tripDays} {tripDays === 1 ? 'dzień' : 'dni'} podróży · stawka diety: {PER_DIEM_RATES[tripType]} PLN/dzień
            </div>
          )}
        </div>
      )}

      {/* Step: costs */}
      {step === 'costs' && (
        <div className="space-y-4">
          <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900">Zestawienie kosztów</h3>
          <div className="flex items-center gap-3 bg-slate-50 rounded-2xl px-5 py-4">
            <input type="checkbox" id="perDiem" checked={usePerDiems} onChange={e => setUsePerDiems(e.target.checked)} className="w-4 h-4 rounded accent-indigo-600" />
            <label htmlFor="perDiem" className="text-xs font-bold text-slate-700 cursor-pointer">
              Uwzględnij diety ({tripDays} dni × {PER_DIEM_RATES[tripType]} PLN = <strong>{perDiemTotal} PLN</strong>)
            </label>
          </div>
          <Field label="Transport (PLN)">
            <input type="number" step="0.01" min="0" value={transport} onChange={e => setTransport(e.target.value)} placeholder="Bilet / paliwo / parking" className={INPUT} />
          </Field>
          <Field label="Nocleg (PLN)">
            <input type="number" step="0.01" min="0" value={accommodation} onChange={e => setAccommodation(e.target.value)} placeholder="Hotel / kwatera" className={INPUT} />
          </Field>
          <Field label="Inne koszty (PLN)">
            <input type="number" step="0.01" min="0" value={otherCosts} onChange={e => setOtherCosts(e.target.value)} placeholder="Wizyta, reprezentacja itp." className={INPUT} />
          </Field>
          <Field label="Waluta">
            <select value={currency} onChange={e => setCurrency(e.target.value)} className={INPUT}>
              {['PLN', 'EUR', 'USD', 'GBP'].map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 flex justify-between items-center">
            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Łącznie do zwrotu</span>
            <span className="text-2xl font-black text-emerald-700 tabular-nums">{totalAmount.toFixed(2)} {currency}</span>
          </div>
        </div>
      )}

      {/* Step: review */}
      {step === 'review' && (
        <div className="space-y-4">
          <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900">Przegląd wniosku</h3>
          <div className="bg-slate-50 rounded-[2rem] p-6 space-y-2">
            {[
              ['Miejsce', destination],
              ['Cel', purpose || '—'],
              ['Wyjazd', departureDate],
              ['Powrót', returnDate],
              ['Dni', tripDays.toString()],
              ['Diety', usePerDiems ? `${perDiemTotal} PLN` : 'Nie'],
              ['Transport', transport ? `${transport} PLN` : '—'],
              ['Nocleg', accommodation ? `${accommodation} PLN` : '—'],
              ['Inne', otherCosts ? `${otherCosts} PLN` : '—'],
              ['RAZEM', `${totalAmount.toFixed(2)} ${currency}`],
            ].map(([label, value]) => (
              <div key={label} className={`flex justify-between items-center py-1 border-b border-slate-100 last:border-0 ${label === 'RAZEM' ? 'pt-2' : ''}`}>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
                <span className={`text-xs font-bold ${label === 'RAZEM' ? 'text-emerald-700 text-sm' : 'text-slate-800'}`}>{value}</span>
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
        <button onClick={step === 'trip' ? onCancel : back} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 text-slate-600 text-xs font-black uppercase hover:bg-slate-200 transition-all">
          <ArrowLeft size={13} /> {step === 'trip' ? 'Anuluj' : 'Wstecz'}
        </button>
        {step !== 'review' ? (
          <button onClick={next} disabled={!canAdvance()} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-600 text-white text-xs font-black uppercase hover:bg-indigo-700 disabled:opacity-40 transition-all">
            Dalej <ArrowRight size={13} />
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={loading} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-600 text-white text-xs font-black uppercase hover:bg-emerald-700 disabled:opacity-40 transition-all">
            {loading ? 'Wysyłanie...' : <><Check size={13} /> Wyślij do zatwierdzenia</>}
          </button>
        )}
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
