import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../../shared/lib/firebase';
import { collection, query, where, getDocs, addDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { Calendar, Clock, ChevronLeft, ChevronRight, CheckCircle2, User, RefreshCw } from 'lucide-react';

interface BookingService { id: string; name: string; duration: number; price: number; color: string; bufferAfter: number }
interface Staff { id: string; name: string; workDays: number[]; workHoursStart: string; workHoursEnd: string }
interface BookingSettingsData { publicEnabled: boolean; requireApproval: boolean; businessName: string; welcomeMessage: string; confirmationMessage: string; minBookingNoticeHours: number }

function generateSlots(start: string, end: string, durationMin: number, bufferMin: number): string[] {
  const slots: string[] = [];
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let cur = sh * 60 + sm;
  const endMins = eh * 60 + em;
  while (cur + durationMin <= endMins) {
    slots.push(`${String(Math.floor(cur / 60)).padStart(2, '0')}:${String(cur % 60).padStart(2, '0')}`);
    cur += durationMin + bufferMin;
  }
  return slots;
}

function addMins(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number);
  const t = h * 60 + m + mins;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

export default function BookingPublicPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [settings, setSettings] = useState<BookingSettingsData | null>(null);
  const [services, setServices] = useState<BookingService[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState<'service' | 'datetime' | 'details' | 'done'>('service');
  const [selectedService, setSelectedService] = useState<BookingService | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [weekOffset, setWeekOffset] = useState(0);
  const [form, setForm] = useState({ name: '', email: '', phone: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const today = new Date();

  useEffect(() => {
    if (!tenantId) return;
    Promise.all([
      getDoc(doc(db, `tenants/${tenantId}/bookingSettings/main`)),
      getDocs(query(collection(db, `tenants/${tenantId}/bookingServices`), where('active', '==', true))),
      getDocs(query(collection(db, `tenants/${tenantId}/bookingStaff`), where('tenantId', '==', tenantId))),
    ]).then(([settSnap, svcSnap, staffSnap]) => {
      if (settSnap.exists()) setSettings(settSnap.data() as BookingSettingsData);
      setServices(svcSnap.docs.map(d => ({ id: d.id, ...d.data() } as BookingService)));
      setStaff(staffSnap.docs.map(d => ({ id: d.id, ...d.data() } as Staff)));
      setLoading(false);
    });
  }, [tenantId]);

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - ((today.getDay() + 6) % 7) + weekOffset * 7);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  }).filter(d => d >= today);
  const DAY_LABELS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];

  const availableStaff = selectedDate ? staff.filter(s => {
    const dow = ((new Date(selectedDate + 'T12:00').getDay() + 6) % 7) + 1;
    return s.workDays?.includes(dow);
  }) : staff;

  const staffForSlots = selectedStaff ?? availableStaff[0];
  const slots = selectedService && staffForSlots && selectedDate
    ? generateSlots(staffForSlots.workHoursStart, staffForSlots.workHoursEnd, selectedService.duration, selectedService.bufferAfter ?? 0)
    : [];

  const handleBook = async () => {
    if (!form.name.trim() || !selectedService || !selectedDate || !selectedSlot || !tenantId) return;
    setSaving(true);
    await addDoc(collection(db, `tenants/${tenantId}/bookings`), {
      tenantId,
      customerName: form.name.trim(),
      customerEmail: form.email.trim() || null,
      customerPhone: form.phone.trim() || null,
      serviceId: selectedService.id,
      staffId: staffForSlots?.id ?? null,
      date: selectedDate,
      startTime: selectedSlot,
      endTime: addMins(selectedSlot, selectedService.duration),
      price: selectedService.price,
      status: settings?.requireApproval ? 'pending' : 'confirmed',
      notes: form.notes.trim() || null,
      source: 'online',
      createdAt: serverTimestamp(),
    });
    setSaving(false);
    setStep('done');
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-white flex items-center justify-center">
      <RefreshCw size={24} className="animate-spin text-violet-500" />
    </div>
  );

  if (!settings?.publicEnabled) return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-white flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">🚫</div>
        <h2 className="text-2xl font-black text-slate-900">Rezerwacje wyłączone</h2>
        <p className="text-slate-500 mt-2">Właściciel wyłączył możliwość rezerwacji online.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50">
      <div className="max-w-xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-violet-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-200">
            <Calendar className="text-white" size={28} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">{settings?.businessName || 'Rezerwacja online'}</h1>
          {settings?.welcomeMessage && <p className="text-slate-500 mt-2 text-sm">{settings.welcomeMessage}</p>}
        </div>

        {/* Step: service */}
        {step === 'service' && (
          <div className="space-y-4">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Wybierz usługę</h2>
            {services.length === 0 ? (
              <div className="text-center text-slate-400 py-8">Brak dostępnych usług</div>
            ) : services.map(s => (
              <button key={s.id} onClick={() => { setSelectedService(s); setStep('datetime'); }}
                className="w-full flex items-center gap-4 bg-white rounded-2xl border-2 border-slate-100 p-5 hover:border-violet-400 hover:shadow-lg hover:shadow-violet-100 transition-all text-left group">
                <div className="w-3 h-12 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <div className="flex-1">
                  <div className="font-black text-slate-900">{s.name}</div>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-1">
                    <span className="flex items-center gap-1"><Clock size={10} /> {s.duration} min</span>
                  </div>
                </div>
                <div className="font-black text-violet-600 text-lg">{s.price > 0 ? `${s.price} PLN` : 'Bezpłatna'}</div>
              </button>
            ))}
          </div>
        )}

        {/* Step: datetime */}
        {step === 'datetime' && selectedService && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setStep('service')} className="p-2 hover:bg-white rounded-xl"><ChevronLeft size={18} /></button>
              <div>
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Wybierz termin</h2>
                <p className="text-sm font-black text-slate-900">{selectedService.name}</p>
              </div>
            </div>

            {/* Staff selector */}
            {staff.length > 1 && (
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Pracownik (opcjonalnie)</p>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => setSelectedStaff(null)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black border-2 transition-all ${!selectedStaff ? 'border-violet-600 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-500'}`}>
                    <User size={11} /> Dowolny
                  </button>
                  {staff.map(s => (
                    <button key={s.id} onClick={() => setSelectedStaff(s)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black border-2 transition-all ${selectedStaff?.id === s.id ? 'border-violet-600 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-500'}`}>
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Date picker */}
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Data</p>
              <div className="flex items-center gap-2 mb-3">
                <button onClick={() => setWeekOffset(w => Math.max(0, w - 1))} className="p-2 hover:bg-white rounded-xl"><ChevronLeft size={16} /></button>
                <div className="flex-1 grid grid-cols-7 gap-1">
                  {weekDays.map(d => {
                    const dateStr = d.toISOString().slice(0, 10);
                    const dow = ((d.getDay() + 6) % 7);
                    const isAvail = !staffForSlots || staffForSlots.workDays?.includes(dow + 1);
                    const isSelected = dateStr === selectedDate;
                    return (
                      <button key={dateStr} onClick={() => { if (isAvail) { setSelectedDate(dateStr); setSelectedSlot(''); } }}
                        disabled={!isAvail}
                        className={`flex flex-col items-center p-2 rounded-xl transition-all text-xs ${isSelected ? 'bg-violet-600 text-white' : isAvail ? 'hover:bg-white text-slate-700' : 'opacity-30 cursor-not-allowed text-slate-300'}`}>
                        <span className="text-[9px] font-black">{DAY_LABELS[dow]}</span>
                        <span className="font-black">{d.getDate()}</span>
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => setWeekOffset(w => w + 1)} className="p-2 hover:bg-white rounded-xl"><ChevronRight size={16} /></button>
              </div>
            </div>

            {/* Time slots */}
            {selectedDate && (
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Godzina</p>
                {slots.length === 0 ? (
                  <p className="text-slate-400 text-sm">Brak wolnych slotów w tym dniu</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {slots.map(slot => (
                      <button key={slot} onClick={() => setSelectedSlot(slot)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-black border-2 transition-all ${selectedSlot === slot ? 'bg-violet-600 border-violet-600 text-white' : 'bg-white border-slate-200 text-slate-700 hover:border-violet-400'}`}>
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedDate && selectedSlot && (
              <button onClick={() => setStep('details')}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white font-black py-4 rounded-2xl transition-all">
                Dalej — dane kontaktowe →
              </button>
            )}
          </div>
        )}

        {/* Step: details */}
        {step === 'details' && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setStep('datetime')} className="p-2 hover:bg-white rounded-xl"><ChevronLeft size={18} /></button>
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Twoje dane</h2>
            </div>

            {/* Summary */}
            <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 space-y-1">
              <p className="text-[9px] font-black text-violet-600 uppercase tracking-widest">Podsumowanie</p>
              <p className="font-black text-slate-900">{selectedService?.name}</p>
              <p className="text-sm text-slate-600">
                {new Date(selectedDate + 'T12:00').toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })} o {selectedSlot}
              </p>
              {staffForSlots && <p className="text-sm text-slate-500">Pracownik: {staffForSlots.name}</p>}
              <p className="text-sm font-black text-violet-600">{selectedService && selectedService.price > 0 ? `${selectedService.price} PLN` : 'Bezpłatna'}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Imię i nazwisko *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="mt-1 w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400" />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  className="mt-1 w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400" />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Telefon</label>
                <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  className="mt-1 w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400" />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dodatkowe informacje</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2}
                  className="mt-1 w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400 resize-none" />
              </div>
            </div>

            <button onClick={handleBook} disabled={!form.name.trim() || saving}
              className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white font-black py-4 rounded-2xl transition-all">
              {saving && <RefreshCw size={14} className="animate-spin" />}
              Zarezerwuj wizytę
            </button>
          </div>
        )}

        {/* Step: done */}
        {step === 'done' && (
          <div className="text-center space-y-6 py-8">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={40} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">Rezerwacja przyjęta!</h2>
              <p className="text-slate-500 mt-2">
                {settings?.confirmationMessage || 'Dziękujemy za rezerwację! Potwierdzenie zostało wysłane.'}
              </p>
              {settings?.requireApproval && (
                <p className="mt-2 text-sm text-amber-600 font-bold">Wizyta oczekuje na potwierdzenie przez salon.</p>
              )}
            </div>
            <div className="bg-slate-50 rounded-2xl p-5 text-left space-y-2">
              <p className="font-black text-slate-900">{selectedService?.name}</p>
              <p className="text-sm text-slate-600">
                {new Date(selectedDate + 'T12:00').toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} o {selectedSlot}
              </p>
            </div>
            <button onClick={() => { setStep('service'); setSelectedService(null); setSelectedDate(''); setSelectedSlot(''); setForm({ name: '', email: '', phone: '', notes: '' }); }}
              className="text-violet-600 font-black text-sm hover:underline">
              ← Zarezerwuj kolejną wizytę
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
