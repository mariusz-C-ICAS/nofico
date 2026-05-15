import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { createServiceEvent } from '../services/calendarService';
import type { ServiceType, ServiceEvent, AssignedWorker } from '../types';
import { CURRENCY_OPTIONS } from '../types';

interface Props {
  serviceTypes: ServiceType[];
  preselectedDate?: Date;
  onComplete: (eventId: string) => void;
  onCancel: () => void;
}

type Step = 'service' | 'schedule' | 'location' | 'review';

const RECUR_OPTIONS = [
  { value: '', label: 'Jednorazowe' },
  { value: 'weekly', label: 'Co tydzień' },
  { value: 'biweekly', label: 'Co 2 tygodnie' },
  { value: 'monthly', label: 'Co miesiąc' },
];

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function fmtTime(d: Date): string {
  return d.toTimeString().slice(0, 5);
}

export default function EventCreateWizard({ serviceTypes, preselectedDate, onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const [step, setStep] = useState<Step>('service');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Service
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [serviceTypeId, setServiceTypeId] = useState(serviceTypes[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('PLN');
  const [quoteId, setQuoteId] = useState('');

  // Step 2: Schedule
  const initDate = preselectedDate ?? new Date();
  const [date, setDate] = useState(fmtDate(initDate));
  const [timeStart, setTimeStart] = useState(fmtTime(initDate));
  const [durationMinutes, setDurationMinutes] = useState('120');
  const [recurrence, setRecurrence] = useState('');
  const [workerEmails, setWorkerEmails] = useState('');

  // Step 3: Location
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [accessNotes, setAccessNotes] = useState('');

  const order: Step[] = ['service', 'schedule', 'location', 'review'];
  const stepIndex = order.indexOf(step);

  const selectedType = serviceTypes.find(t => t.id === serviceTypeId);

  const canProceed = () => {
    if (step === 'service') return clientName.trim() && serviceTypeId;
    if (step === 'schedule') return date && timeStart && parseInt(durationMinutes) > 0;
    if (step === 'location') return address.trim() && city.trim();
    return true;
  };

  const handleSubmit = async () => {
    if (!user || !activeTenantId) return;
    setLoading(true); setError('');
    try {
      const startDate = new Date(`${date}T${timeStart}`);
      const endDate = new Date(startDate.getTime() + parseInt(durationMinutes) * 60000);

      const workers: AssignedWorker[] = workerEmails
        .split(',')
        .map(e => e.trim())
        .filter(Boolean)
        .map(email => ({ uid: email, email, displayName: email }));

      if (!workers.some(w => w.uid === user.uid)) {
        workers.push({ uid: user.uid, email: user.email ?? '', displayName: user.displayName ?? user.email ?? '' });
      }

      const eventData: Omit<ServiceEvent, 'id' | 'createdAt' | 'updatedAt'> = {
        tenantId: activeTenantId,
        title: title.trim() || `${clientName} — ${selectedType?.name ?? ''}`,
        clientId: clientName.toLowerCase().replace(/\s/g, '_'),
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim() || undefined,
        clientEmail: clientEmail.trim() || undefined,
        serviceTypeId,
        serviceTypeName: selectedType?.name ?? '',
        serviceTypeColor: selectedType?.color ?? '#6366f1',
        description: description.trim() || undefined,
        location: { address, city, postalCode, accessNotes: accessNotes.trim() || undefined },
        assignedWorkers: workers,
        scheduledStart: startDate,
        scheduledEnd: endDate,
        estimatedDurationMinutes: parseInt(durationMinutes),
        status: 'SCHEDULED',
        isRecurring: !!recurrence,
        recurrenceLabel: RECUR_OPTIONS.find(r => r.value === recurrence)?.label,
        createdBy: user.uid,
        createdByEmail: user.email ?? '',
        price: price ? parseFloat(price) : undefined,
        currency,
        quoteId: quoteId.trim() || undefined,
        mediaUrls: [],
      };

      const id = await createServiceEvent(activeTenantId, eventData);
      onComplete(id);
    } catch (e: any) { setError(e.message ?? 'Błąd zapisu.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div>
        <button onClick={onCancel} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 mb-4 block">← Anuluj</button>
        <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Nowe zdarzenie serwisowe</h3>
        <p className="text-slate-400 text-sm font-medium mt-1">Zaplanuj wizytę u klienta z pełnym kontekstem.</p>
      </div>

      {/* Step bar */}
      <div className="flex gap-1">
        {order.map((s, i) => (
          <div key={s} className="flex-1 flex flex-col gap-1">
            <div className={`h-1 rounded-full ${i <= stepIndex ? 'bg-emerald-500' : 'bg-slate-200'}`} />
            <span className={`text-[9px] font-black uppercase tracking-widest ${s === step ? 'text-emerald-600' : 'text-slate-400'}`}>
              {s === 'service' ? 'Usługa' : s === 'schedule' ? 'Termin' : s === 'location' ? 'Lokalizacja' : 'Wyślij'}
            </span>
          </div>
        ))}
      </div>

      {/* Step 1 — Service */}
      {step === 'service' && (
        <div className="space-y-4">
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Klient *</label>
            <input value={clientName} onChange={e => setClientName(e.target.value)}
              placeholder="Nazwa klienta lub firmy"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Telefon klienta</label>
              <input value={clientPhone} onChange={e => setClientPhone(e.target.value)}
                type="tel" placeholder="+48 600 100 200"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Email klienta</label>
              <input value={clientEmail} onChange={e => setClientEmail(e.target.value)}
                type="email" placeholder="klient@firma.pl"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Oferta / Quote ID</label>
            <input value={quoteId} onChange={e => setQuoteId(e.target.value)}
              placeholder="QT-2026-044"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Typ usługi *</label>
            <div className="grid grid-cols-2 gap-2">
              {serviceTypes.filter(t => t.isActive).map(t => (
                <button key={t.id} onClick={() => { setServiceTypeId(t.id); setDurationMinutes(String(t.defaultDurationMinutes)); setPrice(String(t.defaultPrice)); }}
                  className={`p-3 rounded-2xl border text-left transition-all ${serviceTypeId === t.id ? 'ring-2 border-emerald-400' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}
                  style={serviceTypeId === t.id ? { background: t.color + '18', borderColor: t.color, color: t.color } : {}}>
                  <p className="text-xs font-black">{t.name}</p>
                  <p className="text-[9px] opacity-70 mt-0.5">{t.defaultDurationMinutes} min · {t.defaultPrice} {t.currency}</p>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tytuł / Opis skrócony</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="np. Położenie trawy z rolki — ogród frontowy"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Cena</label>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Waluta</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none">
                {CURRENCY_OPTIONS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Step 2 — Schedule */}
      {step === 'schedule' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Data *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Godz. *</label>
              <input type="time" value={timeStart} onChange={e => setTimeStart(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Czas trwania (min) *</label>
            <div className="flex gap-2">
              {[60, 90, 120, 180, 240, 300].map(m => (
                <button key={m} onClick={() => setDurationMinutes(String(m))}
                  className={`flex-1 py-2 rounded-xl text-xs font-black border transition-all ${durationMinutes === String(m) ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-emerald-300'}`}>
                  {m}
                </button>
              ))}
            </div>
            <input type="number" value={durationMinutes} onChange={e => setDurationMinutes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none mt-2" />
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Powtarzalność</label>
            <div className="grid grid-cols-2 gap-2">
              {RECUR_OPTIONS.map(r => (
                <button key={r.value} onClick={() => setRecurrence(r.value)}
                  className={`py-3 rounded-2xl border text-xs font-black transition-all ${recurrence === r.value ? 'bg-emerald-50 border-emerald-400 text-emerald-700 ring-2 ring-emerald-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Pracownicy (e-maile, przecinek)</label>
            <input value={workerEmails} onChange={e => setWorkerEmails(e.target.value)}
              placeholder="jan@firma.pl, anna@firma.pl"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
        </div>
      )}

      {/* Step 3 — Location */}
      {step === 'location' && (
        <div className="space-y-4">
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Ulica i numer *</label>
            <input value={address} onChange={e => setAddress(e.target.value)}
              placeholder="ul. Ogrodowa 15"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Kod pocztowy</label>
              <input value={postalCode} onChange={e => setPostalCode(e.target.value)}
                placeholder="00-001"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Miasto *</label>
              <input value={city} onChange={e => setCity(e.target.value)}
                placeholder="Warszawa"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Uwagi do dojazdu</label>
            <textarea value={accessNotes} onChange={e => setAccessNotes(e.target.value)} rows={3}
              placeholder="Kod do bramy: 1234, wjazd od tyłu budynku, parking na dziedzińcu..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm resize-none focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Notatki dla klienta</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              placeholder="Proszę przygotować dostęp do ogródka..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm resize-none focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
        </div>
      )}

      {/* Step 4 — Review */}
      {step === 'review' && (
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-[2rem] p-6 space-y-3">
            {[
              { l: 'Klient', v: clientName },
              { l: 'Usługa', v: selectedType?.name ?? serviceTypeId },
              { l: 'Termin', v: `${date} ${timeStart} (${durationMinutes} min)` },
              { l: 'Adres', v: `${address}, ${postalCode} ${city}` },
              { l: 'Powtarzalność', v: RECUR_OPTIONS.find(r => r.value === recurrence)?.label ?? '-' },
              ...(price ? [{ l: 'Cena', v: `${parseFloat(price).toLocaleString('pl-PL')} ${currency}` }] : []),
              ...(quoteId ? [{ l: 'Oferta', v: quoteId }] : []),
            ].map(({ l, v }) => (
              <div key={l} className="flex justify-between gap-4">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest shrink-0">{l}</span>
                <span className="text-xs font-bold text-slate-800 text-right">{v}</span>
              </div>
            ))}
          </div>
          {error && <p className="text-red-600 text-xs font-bold flex items-center gap-1.5"><AlertTriangle size={12} />{error}</p>}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button onClick={() => { const i = order.indexOf(step); i > 0 ? setStep(order[i - 1]) : onCancel(); }}
          className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600">
          ← {step === 'service' ? 'Anuluj' : 'Wstecz'}
        </button>
        {step !== 'review' ? (
          <button disabled={!canProceed()} onClick={() => setStep(order[stepIndex + 1])}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-black px-8 py-3 rounded-2xl text-xs uppercase tracking-widest">
            Dalej →
          </button>
        ) : (
          <button disabled={loading} onClick={handleSubmit}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black px-8 py-3 rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-emerald-500/20">
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {loading ? 'Zapisuję...' : 'Utwórz zdarzenie'}
          </button>
        )}
      </div>
    </div>
  );
}
