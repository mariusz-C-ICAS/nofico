import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, RefreshCw, X, CheckCircle2 } from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

interface Props { tenantId: string }

interface BookingService { id: string; name: string; duration: number; price: number; color: string; active: boolean }
interface Staff { id: string; name: string; color: string; workDays: number[] }
interface Booking {
  id: string; serviceId: string; staffId?: string; customerName: string; customerEmail?: string;
  customerPhone?: string; date: string; startTime: string; endTime: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'no_show' | 'completed';
  notes?: string; price?: number; source: 'manual' | 'online';
}

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-500',
  no_show: 'bg-slate-100 text-slate-500',
};

export default function BookingCalendarView({ tenantId }: Props) {
  const [today] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(today.toISOString().slice(0, 10));
  const [weekOffset, setWeekOffset] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<BookingService[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customerName: '', customerEmail: '', customerPhone: '',
    serviceId: '', staffId: '', startTime: '09:00', notes: '',
  });

  useEffect(() => {
    const unsubs = [
      onSnapshot(query(collection(db, `tenants/${tenantId}/bookings`), where('tenantId', '==', tenantId)), snap => {
        setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking)));
        setLoading(false);
      }),
      onSnapshot(query(collection(db, `tenants/${tenantId}/bookingServices`), where('tenantId', '==', tenantId)), snap => {
        setServices(snap.docs.map(d => ({ id: d.id, ...d.data() } as BookingService)).filter(s => s.active));
      }),
      onSnapshot(query(collection(db, `tenants/${tenantId}/bookingStaff`), where('tenantId', '==', tenantId)), snap => {
        setStaff(snap.docs.map(d => ({ id: d.id, ...d.data() } as Staff)));
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, [tenantId]);

  // Build week days
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
  const DAY_LABELS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];

  const dayBookings = bookings.filter(b => b.date === selectedDate).sort((a, b) => a.startTime.localeCompare(b.startTime));

  const selectedService = services.find(s => s.id === form.serviceId);

  const handleSave = async () => {
    if (!form.customerName.trim() || !form.serviceId) return;
    setSaving(true);
    const svc = services.find(s => s.id === form.serviceId);
    const endTime = svc ? addMinutes(form.startTime, svc.duration) : form.startTime;
    await addDoc(collection(db, `tenants/${tenantId}/bookings`), {
      tenantId,
      customerName: form.customerName.trim(),
      customerEmail: form.customerEmail.trim() || null,
      customerPhone: form.customerPhone.trim() || null,
      serviceId: form.serviceId,
      staffId: form.staffId || null,
      date: selectedDate,
      startTime: form.startTime,
      endTime,
      price: svc?.price ?? 0,
      status: 'confirmed',
      notes: form.notes.trim() || null,
      source: 'manual',
      createdAt: serverTimestamp(),
    });
    setSaving(false);
    setShowForm(false);
    setForm({ customerName: '', customerEmail: '', customerPhone: '', serviceId: '', staffId: '', startTime: '09:00', notes: '' });
  };

  const updateStatus = async (id: string, status: Booking['status']) => {
    await updateDoc(doc(db, `tenants/${tenantId}/bookings`, id), { status, updatedAt: serverTimestamp() });
  };

  if (loading) return <div className="flex justify-center py-20"><RefreshCw size={20} className="animate-spin text-indigo-400" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Kalendarz wizyt</h3>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-black text-xs px-5 py-3 rounded-2xl">
          <Plus size={13} /> Dodaj wizytę
        </button>
      </div>

      {/* Week navigation */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setWeekOffset(w => w - 1)} className="p-2 hover:bg-slate-100 rounded-xl"><ChevronLeft size={16} /></button>
          <div className="flex-1 grid grid-cols-7 gap-1">
            {weekDays.map((d, i) => {
              const dayCount = bookings.filter(b => b.date === d).length;
              const isToday = d === today.toISOString().slice(0, 10);
              const isSelected = d === selectedDate;
              return (
                <button key={d} onClick={() => setSelectedDate(d)}
                  className={`flex flex-col items-center p-2 rounded-xl transition-all ${isSelected ? 'bg-violet-600 text-white' : isToday ? 'bg-violet-50 text-violet-700' : 'hover:bg-slate-50 text-slate-600'}`}>
                  <span className="text-[9px] font-black uppercase">{DAY_LABELS[i]}</span>
                  <span className="text-base font-black">{new Date(d + 'T12:00').getDate()}</span>
                  {dayCount > 0 && <span className={`text-[8px] font-black ${isSelected ? 'text-violet-200' : 'text-violet-600'}`}>{dayCount}</span>}
                </button>
              );
            })}
          </div>
          <button onClick={() => setWeekOffset(w => w + 1)} className="p-2 hover:bg-slate-100 rounded-xl"><ChevronRight size={16} /></button>
        </div>
      </div>

      {/* Add booking form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nowa wizyta — {selectedDate}</p>
            <button onClick={() => setShowForm(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={14} /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Klient *</label>
              <input value={form.customerName} onChange={e => setForm(p => ({ ...p, customerName: e.target.value }))}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Email</label>
              <input type="email" value={form.customerEmail} onChange={e => setForm(p => ({ ...p, customerEmail: e.target.value }))}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Telefon</label>
              <input value={form.customerPhone} onChange={e => setForm(p => ({ ...p, customerPhone: e.target.value }))}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Usługa *</label>
              <select value={form.serviceId} onChange={e => setForm(p => ({ ...p, serviceId: e.target.value }))}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                <option value="">— wybierz —</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.duration} min)</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Godzina</label>
              <input type="time" value={form.startTime} onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pracownik</label>
              <select value={form.staffId} onChange={e => setForm(p => ({ ...p, staffId: e.target.value }))}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                <option value="">— dowolny —</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            {selectedService && (
              <div className="col-span-2 bg-violet-50 rounded-xl p-3 text-[10px] text-violet-700 font-black">
                Czas: {selectedService.duration} min · Cena: {selectedService.price} PLN
                · Koniec: {addMinutes(form.startTime, selectedService.duration)}
              </div>
            )}
            <div className="col-span-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Notatka</label>
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none resize-none" />
            </div>
          </div>
          <button onClick={handleSave} disabled={!form.customerName.trim() || !form.serviceId || saving}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white font-black text-xs px-6 py-3 rounded-xl">
            {saving ? <RefreshCw size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
            Dodaj wizytę
          </button>
        </div>
      )}

      {/* Day bookings */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">
          Wizyty — {new Date(selectedDate + 'T12:00').toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        {dayBookings.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">Brak wizyt w tym dniu</div>
        ) : (
          <div className="space-y-3">
            {dayBookings.map(b => {
              const svc = services.find(s => s.id === b.serviceId);
              const stf = staff.find(s => s.id === b.staffId);
              return (
                <div key={b.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                  <div className="w-1 h-12 rounded-full flex-shrink-0" style={{ backgroundColor: svc?.color ?? '#6366f1' }} />
                  <div className="text-sm font-black text-slate-700 w-20">{b.startTime}–{b.endTime}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-slate-900 text-sm">{b.customerName}</div>
                    <div className="text-[10px] text-slate-500">{svc?.name ?? b.serviceId}{stf ? ` · ${stf.name}` : ''}</div>
                  </div>
                  {b.price != null && <div className="text-[10px] font-black text-slate-600">{b.price} PLN</div>}
                  <span className={`text-[9px] font-black px-3 py-1.5 rounded-lg ${STATUS_COLORS[b.status] ?? 'bg-slate-100 text-slate-500'}`}>
                    {b.status}
                  </span>
                  <select value={b.status} onChange={e => updateStatus(b.id, e.target.value as Booking['status'])}
                    className="text-[10px] bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none">
                    {(['pending', 'confirmed', 'completed', 'cancelled', 'no_show'] as const).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
