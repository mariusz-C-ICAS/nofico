import React, { useState, useEffect } from 'react';
import { RefreshCw, Plus } from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

interface Props { tenantId: string }
interface BookingService { id: string; name: string; duration: number; price?: number; color: string }
interface Staff { id: string; name: string }

type Pattern = 'weekly' | 'biweekly' | 'monthly';

const PATTERNS: { id: Pattern; label: string }[] = [
  { id: 'weekly',   label: 'Co tydzień' },
  { id: 'biweekly', label: 'Co 2 tygodnie' },
  { id: 'monthly',  label: 'Co miesiąc' },
];

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function addOneMonth(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00');
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

function generateDates(start: string, pattern: Pattern, count: number): string[] {
  const dates: string[] = [start];
  for (let i = 1; i < count; i++) {
    const prev = dates[i - 1];
    if (pattern === 'weekly')   dates.push(addDays(prev, 7));
    else if (pattern === 'biweekly') dates.push(addDays(prev, 14));
    else dates.push(addOneMonth(prev));
  }
  return dates;
}

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export default function RecurringBooking({ tenantId }: Props) {
  const [services, setServices] = useState<BookingService[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [serviceId, setServiceId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('09:00');
  const [pattern, setPattern] = useState<Pattern>('weekly');
  const [count, setCount] = useState(4);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  useEffect(() => {
    Promise.all([
      getDocs(query(collection(db, `tenants/${tenantId}/bookingServices`), where('tenantId', '==', tenantId))),
      getDocs(query(collection(db, `tenants/${tenantId}/bookingStaff`), where('tenantId', '==', tenantId))),
    ]).then(([sSnap, stSnap]) => {
      const svcs = sSnap.docs.map(d => ({ id: d.id, ...d.data() } as BookingService));
      setServices(svcs);
      setStaff(stSnap.docs.map(d => ({ id: d.id, ...d.data() } as Staff)));
      if (svcs.length > 0) setServiceId(svcs[0].id);
      setLoading(false);
    });
  }, [tenantId]);

  const selectedService = services.find(s => s.id === serviceId);
  const previewDates = startDate ? generateDates(startDate, pattern, Math.min(count, 12)) : [];

  async function handleSave() {
    if (!serviceId || !startDate || !customerName.trim()) return;
    setSaving(true);
    const endTime = selectedService ? addMinutes(startTime, selectedService.duration) : startTime;
    const col = collection(db, `tenants/${tenantId}/bookings`);
    await Promise.all(previewDates.map(date => addDoc(col, {
      tenantId, serviceId, staffId: staffId || null,
      date, startTime, endTime,
      status: 'confirmed',
      price: selectedService?.price ?? 0,
      source: 'recurring',
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      customerPhone: customerPhone.trim(),
      isRecurring: true,
      recurringPattern: pattern,
      bridgedToCrm: false,
      createdAt: serverTimestamp(),
    })));
    setSaving(false);
    setSaved(true);
    setCustomerName(''); setCustomerEmail(''); setCustomerPhone('');
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading) return <div className="flex justify-center py-20"><RefreshCw size={20} className="animate-spin text-indigo-400" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Rezerwacje cykliczne</h3>
        <p className="text-xs text-slate-500 mt-0.5">Utwórz serię wizyt z powtarzającym się harmonogramem</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Konfiguracja serii</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Usługa</label>
              <select value={serviceId} onChange={e => setServiceId(e.target.value)}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pracownik</label>
              <select value={staffId} onChange={e => setStaffId(e.target.value)}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                <option value="">— dowolny —</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Data pierwszej wizyty</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Godzina</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
            </div>
          </div>

          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Powtarzalność</label>
            <div className="flex gap-2 mt-2">
              {PATTERNS.map(p => (
                <button key={p.id} onClick={() => setPattern(p.id)}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${
                    pattern === p.id ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500'
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              Liczba wizyt ({count})
            </label>
            <input type="range" min={2} max={12} value={count} onChange={e => setCount(Number(e.target.value))}
              className="mt-2 w-full accent-indigo-600" />
            <div className="flex justify-between text-[8px] text-slate-400 mt-1"><span>2</span><span>12</span></div>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-3">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dane klienta</p>
            <input value={customerName} onChange={e => setCustomerName(e.target.value)}
              placeholder="Imię i nazwisko *"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
            <div className="grid grid-cols-2 gap-3">
              <input value={customerEmail} onChange={e => setCustomerEmail(e.target.value)}
                placeholder="Email"
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
              <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                placeholder="Telefon"
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
            </div>
          </div>

          <button onClick={handleSave} disabled={saving || !serviceId || !customerName.trim()}
            className="w-full bg-indigo-600 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
            {saving ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />}
            {saved ? 'Zapisano!' : `Utwórz ${previewDates.length} wizyt`}
          </button>
        </div>

        {/* Preview */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">
            Podgląd serii · <span className="text-indigo-600">{selectedService?.name ?? '—'}</span>
          </p>
          {previewDates.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-10">Wybierz datę i usługę</p>
          ) : (
            <div className="space-y-2">
              {previewDates.map((date, i) => (
                <div key={date} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black text-indigo-700 bg-indigo-100 flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-black text-slate-900">
                      {new Date(date + 'T12:00').toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    <p className="text-[10px] text-slate-500">{startTime} · {selectedService?.name}</p>
                  </div>
                  {selectedService?.price != null && (
                    <span className="text-[10px] font-black text-slate-700">{selectedService.price} PLN</span>
                  )}
                </div>
              ))}
              {selectedService?.price != null && previewDates.length > 0 && (
                <div className="flex justify-between pt-2 text-xs font-black text-slate-900 border-t border-slate-100">
                  <span>Suma</span>
                  <span>{(selectedService.price * previewDates.length).toLocaleString('pl-PL')} PLN</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
