import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../../shared/lib/firebase';
import { collection, query, where, getDocs, addDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { Calendar, Clock, ChevronLeft, ChevronRight, CheckCircle2, User, RefreshCw, UserPlus, X } from 'lucide-react';
import { getBookedIntervals, getAvailableSlots, isSlotInPast, isSlotTooSoon } from './services/bookingConflictService';
import { queueConfirmationEmail } from './services/bookingNotificationService';

interface BookingService {
  id: string; name: string; duration: number; price: number; color: string;
  bufferAfter: number; description?: string; isGroup?: boolean; maxParticipants?: number;
}
interface Staff { id: string; name: string; workDays: number[]; workHoursStart: string; workHoursEnd: string }
interface BookingSettingsData {
  publicEnabled: boolean; requireApproval: boolean; businessName: string;
  welcomeMessage: string; confirmationMessage: string; minBookingNoticeHours: number;
}

type SlotStatus = { slot: string; available: boolean; reason?: 'occupied' | 'past' | 'soon' };

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

const STEP_LABELS = ['Usługa', 'Termin', 'Dane'];
const DAY_LABELS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];

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

  const [slotsStatus, setSlotsStatus] = useState<SlotStatus[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [waitlistMode, setWaitlistMode] = useState(false);
  const [waitlistForm, setWaitlistForm] = useState({ name: '', email: '', phone: '' });
  const [waitlistDone, setWaitlistDone] = useState(false);

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

  // Derived: available staff for selected date
  const availableStaff = selectedDate ? staff.filter(s => {
    const dow = ((new Date(selectedDate + 'T12:00').getDay() + 6) % 7) + 1;
    return s.workDays?.includes(dow);
  }) : staff;
  const staffForSlots = selectedStaff ?? availableStaff[0];

  // Load slot availability when date / service / staff changes
  useEffect(() => {
    if (!selectedDate || !selectedService || !tenantId || !staffForSlots) {
      setSlotsStatus([]); return;
    }
    const allSlots = generateSlots(
      staffForSlots.workHoursStart, staffForSlots.workHoursEnd,
      selectedService.duration, selectedService.bufferAfter ?? 0,
    );
    if (!allSlots.length) { setSlotsStatus([]); return; }
    setLoadingSlots(true);
    setSelectedSlot('');
    setWaitlistMode(false);
    setWaitlistDone(false);
    getBookedIntervals(tenantId, selectedDate, staffForSlots.id).then(intervals => {
      const noticeHours = settings?.minBookingNoticeHours ?? 0;
      const result: SlotStatus[] = getAvailableSlots(allSlots, selectedService.duration, intervals)
        .map(({ slot, available }) => {
          if (isSlotInPast(selectedDate, slot)) return { slot, available: false, reason: 'past' as const };
          if (isSlotTooSoon(selectedDate, slot, noticeHours)) return { slot, available: false, reason: 'soon' as const };
          return { slot, available, reason: available ? undefined : 'occupied' as const };
        });
      setSlotsStatus(result);
      setLoadingSlots(false);
    });
  }, [selectedDate, selectedService?.id, staffForSlots?.id, tenantId, settings?.minBookingNoticeHours]);

  // Week days
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - ((today.getDay() + 6) % 7) + weekOffset * 7);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek); d.setDate(startOfWeek.getDate() + i); return d;
  }).filter(d => d >= today);

  const handleBook = async () => {
    if (!form.name.trim() || !selectedService || !selectedDate || !selectedSlot || !tenantId) return;
    setSaving(true);
    const endTime = addMins(selectedSlot, selectedService.duration);
    await addDoc(collection(db, `tenants/${tenantId}/bookings`), {
      tenantId,
      customerName: form.name.trim(),
      customerEmail: form.email.trim() || null,
      customerPhone: form.phone.trim() || null,
      serviceId: selectedService.id,
      staffId: staffForSlots?.id ?? null,
      date: selectedDate,
      startTime: selectedSlot,
      endTime,
      price: selectedService.price,
      status: settings?.requireApproval ? 'pending' : 'confirmed',
      notes: form.notes.trim() || null,
      source: 'online',
      bridgedToCrm: false,
      syncedToFinance: false,
      createdAt: serverTimestamp(),
    });
    if (form.email.trim()) {
      await queueConfirmationEmail(
        tenantId,
        { customerName: form.name.trim(), customerEmail: form.email.trim(), date: selectedDate, startTime: selectedSlot, price: selectedService.price },
        { name: selectedService.name },
        { businessName: settings?.businessName, confirmationMessage: settings?.confirmationMessage },
      );
    }
    setSaving(false);
    setStep('done');
  };

  const handleWaitlist = async () => {
    if (!waitlistForm.name.trim() || !selectedService || !selectedDate || !selectedSlot || !tenantId) return;
    await addDoc(collection(db, `tenants/${tenantId}/bookingWaitlist`), {
      tenantId,
      serviceId: selectedService.id,
      staffId: staffForSlots?.id ?? null,
      date: selectedDate,
      startTime: selectedSlot,
      customerName: waitlistForm.name.trim(),
      customerEmail: waitlistForm.email.trim() || null,
      customerPhone: waitlistForm.phone.trim() || null,
      status: 'waiting',
      createdAt: serverTimestamp(),
    });
    setWaitlistDone(true);
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-white flex items-center justify-center">
      <RefreshCw size={24} className="animate-spin text-violet-500" />
    </div>
  );

  if (!settings?.publicEnabled) return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <X size={28} className="text-red-500" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">Rezerwacje wyłączone</h2>
        <p className="text-slate-500 mt-2">Właściciel wyłączył rezerwacje online.</p>
      </div>
    </div>
  );

  const stepIndex = ['service', 'datetime', 'details', 'done'].indexOf(step);

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50">
      <div className="max-w-xl mx-auto px-4 py-12">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-violet-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-200">
            <Calendar className="text-white" size={28} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">
            {settings?.businessName || 'Rezerwacja online'}
          </h1>
          {settings?.welcomeMessage && <p className="text-slate-500 mt-2 text-sm">{settings.welcomeMessage}</p>}
        </div>

        {/* Step progress indicator */}
        {step !== 'done' && (
          <div className="flex items-center justify-center gap-1 mb-8">
            {STEP_LABELS.map((label, i) => (
              <React.Fragment key={label}>
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black transition-all ${
                    stepIndex === i ? 'bg-violet-600 text-white shadow-md shadow-violet-200' :
                    stepIndex > i ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'
                  }`}>
                    {stepIndex > i ? '✓' : i + 1}
                  </div>
                  <span className={`text-[8px] font-black uppercase tracking-widest ${stepIndex === i ? 'text-violet-600' : 'text-slate-300'}`}>
                    {label}
                  </span>
                </div>
                {i < 2 && <div className={`h-0.5 w-10 rounded-full mb-5 transition-all ${stepIndex > i ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* ─── Step: service ─── */}
        {step === 'service' && (
          <div className="space-y-3">
            {services.length === 0 ? (
              <p className="text-center text-slate-400 py-8">Brak dostępnych usług</p>
            ) : services.map(s => (
              <button key={s.id} onClick={() => { setSelectedService(s); setStep('datetime'); }}
                className="w-full flex items-center gap-4 bg-white rounded-2xl border-2 border-slate-100 p-5 hover:border-violet-400 hover:shadow-xl hover:shadow-violet-100 transition-all text-left group">
                <div className="w-3 h-14 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <div className="flex-1">
                  <div className="font-black text-slate-900 text-base">{s.name}</div>
                  {s.description && <div className="text-xs text-slate-400 mt-0.5">{s.description}</div>}
                  <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-1.5">
                    <span className="flex items-center gap-1"><Clock size={10} /> {s.duration} min</span>
                    {s.isGroup && (
                      <span className="bg-violet-100 text-violet-700 font-bold px-2 py-0.5 rounded-full">
                        Grupowe · max {s.maxParticipants} os.
                      </span>
                    )}
                  </div>
                </div>
                <div className="font-black text-violet-600 text-lg">{s.price > 0 ? `${s.price} PLN` : 'Gratis'}</div>
              </button>
            ))}
          </div>
        )}

        {/* ─── Step: datetime ─── */}
        {step === 'datetime' && selectedService && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <button onClick={() => setStep('service')} className="p-2 hover:bg-white rounded-xl transition-colors">
                <ChevronLeft size={18} />
              </button>
              <div>
                <p className="text-sm font-black text-slate-900">{selectedService.name}</p>
                <p className="text-[10px] text-slate-400">{selectedService.duration} min · {selectedService.price > 0 ? `${selectedService.price} PLN` : 'Gratis'}</p>
              </div>
            </div>

            {/* Staff selector */}
            {staff.length > 1 && (
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Pracownik</p>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => setSelectedStaff(null)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black border-2 transition-all ${!selectedStaff ? 'border-violet-600 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                    <User size={11} /> Dowolny
                  </button>
                  {staff.map(s => (
                    <button key={s.id} onClick={() => setSelectedStaff(s)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black border-2 transition-all ${selectedStaff?.id === s.id ? 'border-violet-600 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Date picker */}
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Data</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setWeekOffset(w => Math.max(0, w - 1))} className="p-2 hover:bg-white rounded-xl"><ChevronLeft size={16} /></button>
                <div className="flex-1 grid grid-cols-7 gap-1">
                  {weekDays.map(d => {
                    const dateStr = d.toISOString().slice(0, 10);
                    const dow = (d.getDay() + 6) % 7;
                    const isAvail = !staffForSlots || staffForSlots.workDays?.includes(dow + 1);
                    const isSelected = dateStr === selectedDate;
                    return (
                      <button key={dateStr} onClick={() => isAvail && setSelectedDate(dateStr)} disabled={!isAvail}
                        className={`flex flex-col items-center p-2 rounded-xl transition-all ${
                          isSelected ? 'bg-violet-600 text-white shadow-md' :
                          isAvail ? 'hover:bg-white text-slate-700' : 'opacity-20 cursor-not-allowed'
                        }`}>
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
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">
                  Godzina {staffForSlots && <span className="font-normal ml-1">· {staffForSlots.name}</span>}
                </p>
                {loadingSlots ? (
                  <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
                    <RefreshCw size={14} className="animate-spin" /> Sprawdzam dostępność…
                  </div>
                ) : slotsStatus.length === 0 ? (
                  <p className="text-slate-400 text-sm py-4">Brak slotów w tym dniu</p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {slotsStatus.map(({ slot, available, reason }) => (
                        available ? (
                          <button key={slot} onClick={() => { setSelectedSlot(slot); setWaitlistMode(false); }}
                            className={`px-4 py-2.5 rounded-xl text-sm font-black border-2 transition-all ${
                              selectedSlot === slot
                                ? 'bg-violet-600 border-violet-600 text-white shadow-md shadow-violet-200'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-violet-400 hover:shadow-md'
                            }`}>
                            {slot}
                          </button>
                        ) : (
                          <button key={slot} disabled={reason !== 'occupied'}
                            onClick={reason === 'occupied' ? () => { setSelectedSlot(slot); setWaitlistMode(true); } : undefined}
                            className={`px-4 py-2 rounded-xl text-sm border-2 text-center transition-all ${
                              reason === 'occupied'
                                ? 'border-slate-100 bg-slate-50 cursor-pointer hover:border-amber-200'
                                : 'border-slate-100 bg-slate-50 cursor-not-allowed'
                            }`}>
                            <span className={`font-black ${reason === 'occupied' ? 'text-slate-300 line-through' : 'text-slate-200'}`}>{slot}</span>
                            {reason === 'occupied' && <span className="block text-[8px] text-red-400 font-black leading-tight">zajęty</span>}
                          </button>
                        )
                      ))}
                    </div>

                    {/* Waitlist inline form */}
                    {waitlistMode && selectedSlot && !waitlistDone && (
                      <div className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <UserPlus size={14} className="text-amber-600" />
                            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">
                              Lista oczekujących · {selectedSlot}
                            </p>
                          </div>
                          <button onClick={() => setWaitlistMode(false)} className="text-slate-400 hover:text-slate-600">
                            <X size={14} />
                          </button>
                        </div>
                        <p className="text-xs text-amber-600">Powiadomimy Cię gdy slot się zwolni.</p>
                        <input value={waitlistForm.name} onChange={e => setWaitlistForm(p => ({ ...p, name: e.target.value }))}
                          placeholder="Imię i nazwisko *"
                          className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-amber-400" />
                        <div className="grid grid-cols-2 gap-2">
                          <input value={waitlistForm.email} onChange={e => setWaitlistForm(p => ({ ...p, email: e.target.value }))}
                            placeholder="Email"
                            className="bg-white border border-amber-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
                          <input value={waitlistForm.phone} onChange={e => setWaitlistForm(p => ({ ...p, phone: e.target.value }))}
                            placeholder="Telefon"
                            className="bg-white border border-amber-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
                        </div>
                        <button onClick={handleWaitlist} disabled={!waitlistForm.name.trim()}
                          className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] uppercase tracking-widest py-3 rounded-xl disabled:opacity-40 transition-all">
                          Zapisz na listę oczekujących
                        </button>
                      </div>
                    )}
                    {waitlistMode && waitlistDone && (
                      <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center space-y-1">
                        <CheckCircle2 size={20} className="text-emerald-600 mx-auto" />
                        <p className="text-emerald-700 font-black text-sm">Zapisano na listę oczekujących!</p>
                        <p className="text-emerald-600 text-xs">Powiadomimy Cię gdy slot się zwolni.</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {selectedDate && selectedSlot && !waitlistMode && (
              <button onClick={() => setStep('details')}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-violet-200">
                Dalej — dane kontaktowe →
              </button>
            )}
          </div>
        )}

        {/* ─── Step: details ─── */}
        {step === 'details' && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <button onClick={() => setStep('datetime')} className="p-2 hover:bg-white rounded-xl transition-colors">
                <ChevronLeft size={18} />
              </button>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dane kontaktowe</p>
            </div>

            {/* Booking summary */}
            <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 space-y-1.5">
              <p className="text-[9px] font-black text-violet-500 uppercase tracking-widest">Podsumowanie</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: selectedService?.color }} />
                <span className="font-black text-slate-900">{selectedService?.name}</span>
              </div>
              <p className="text-sm text-slate-600">
                {new Date(selectedDate + 'T12:00').toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
                {' · '}{selectedSlot}–{addMins(selectedSlot, selectedService?.duration ?? 0)}
              </p>
              {staffForSlots && <p className="text-xs text-slate-500">Pracownik: <span className="font-bold">{staffForSlots.name}</span></p>}
              {selectedService && selectedService.price > 0 && (
                <p className="text-sm font-black text-violet-700">{selectedService.price} PLN</p>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Imię i nazwisko *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} autoFocus
                  className="mt-1 w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400 transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    className="mt-1 w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400 transition-colors" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Telefon</label>
                  <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    className="mt-1 w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400 transition-colors" />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Notatka (opcjonalnie)</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2}
                  className="mt-1 w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400 transition-colors resize-none" />
              </div>
            </div>

            <button onClick={handleBook} disabled={!form.name.trim() || saving}
              className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-violet-200">
              {saving && <RefreshCw size={14} className="animate-spin" />}
              Zarezerwuj wizytę
            </button>
            <p className="text-center text-[9px] text-slate-300">Rezerwując potwierdzasz znajomość regulaminu usługi</p>
          </div>
        )}

        {/* ─── Step: done ─── */}
        {step === 'done' && (
          <div className="text-center space-y-6 py-4">
            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-200">
              <CheckCircle2 size={44} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">Rezerwacja przyjęta!</h2>
              <p className="text-slate-500 mt-2 text-sm">
                {settings?.confirmationMessage || 'Dziękujemy za rezerwację!'}
              </p>
              {form.email && (
                <p className="text-xs text-slate-400 mt-1">Potwierdzenie wysłano na <span className="font-bold">{form.email}</span></p>
              )}
              {settings?.requireApproval && (
                <div className="mt-3 inline-block bg-amber-50 text-amber-700 font-bold text-sm px-4 py-2 rounded-xl border border-amber-200">
                  Wizyta oczekuje na potwierdzenie
                </div>
              )}
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 text-left space-y-2 shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Szczegóły</p>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedService?.color ?? '#6366f1' }} />
                <span className="font-black text-slate-900">{selectedService?.name}</span>
              </div>
              <p className="text-sm text-slate-600">
                {new Date(selectedDate + 'T12:00').toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <p className="text-sm text-slate-600">{selectedSlot} · {selectedService?.duration} min</p>
              {staffForSlots && <p className="text-sm text-slate-500">Pracownik: {staffForSlots.name}</p>}
              {selectedService && selectedService.price > 0 && (
                <p className="text-sm font-black text-violet-700">{selectedService.price} PLN</p>
              )}
            </div>
            <button onClick={() => {
              setStep('service'); setSelectedService(null); setSelectedDate(''); setSelectedSlot('');
              setForm({ name: '', email: '', phone: '', notes: '' });
              setWaitlistMode(false); setWaitlistDone(false); setWaitlistForm({ name: '', email: '', phone: '' });
            }} className="text-violet-600 font-black text-sm hover:underline">
              ← Zarezerwuj kolejną wizytę
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
