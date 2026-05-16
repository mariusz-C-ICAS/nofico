import React, { useState, useEffect } from 'react';
import { RefreshCw, Bell, CheckCircle2, XCircle, UserPlus, CalendarClock } from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, where, onSnapshot, updateDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { queueWaitlistNotification } from '../services/bookingNotificationService';

interface Props { tenantId: string }
interface WaitEntry {
  id: string; serviceId: string; staffId?: string; date: string; startTime: string;
  customerName: string; customerEmail?: string; customerPhone?: string;
  status: 'waiting' | 'notified' | 'booked' | 'cancelled';
  createdAt?: any;
}
interface BookingService { id: string; name: string; color: string }
interface BookingSettingsData { businessName?: string; publicUrl?: string }

const STATUS_COLORS: Record<string, string> = {
  waiting:   'bg-amber-100 text-amber-700',
  notified:  'bg-blue-100 text-blue-700',
  booked:    'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-slate-100 text-slate-400',
};
const STATUS_LABELS: Record<string, string> = {
  waiting: 'Oczekuje', notified: 'Powiadomiony', booked: 'Zarezerwowany', cancelled: 'Anulowany',
};

export default function WaitlistManager({ tenantId }: Props) {
  const [entries, setEntries] = useState<WaitEntry[]>([]);
  const [services, setServices] = useState<BookingService[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);

  useEffect(() => {
    const unsubs = [
      onSnapshot(
        query(collection(db, `tenants/${tenantId}/bookingWaitlist`), where('tenantId', '==', tenantId)),
        snap => {
          setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as WaitEntry))
            .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)));
          setLoading(false);
        }
      ),
      onSnapshot(
        query(collection(db, `tenants/${tenantId}/bookingServices`), where('tenantId', '==', tenantId)),
        snap => setServices(snap.docs.map(d => ({ id: d.id, ...d.data() } as BookingService)))
      ),
    ];
    return () => unsubs.forEach(u => u());
  }, [tenantId]);

  const publicUrl = `${window.location.origin}/book/${tenantId}`;

  const handleNotify = async (entry: WaitEntry) => {
    const svc = services.find(s => s.id === entry.serviceId);
    if (!svc) return;
    setActioning(entry.id);
    await queueWaitlistNotification(tenantId, entry, { name: svc.name }, publicUrl);
    await updateDoc(doc(db, `tenants/${tenantId}/bookingWaitlist`, entry.id), {
      status: 'notified', notifiedAt: serverTimestamp(),
    });
    setActioning(null);
  };

  const handleConvert = async (entry: WaitEntry) => {
    const svc = services.find(s => s.id === entry.serviceId);
    setActioning(entry.id);
    await addDoc(collection(db, `tenants/${tenantId}/bookings`), {
      tenantId,
      serviceId: entry.serviceId,
      staffId: entry.staffId ?? null,
      date: entry.date,
      startTime: entry.startTime,
      customerName: entry.customerName,
      customerEmail: entry.customerEmail ?? null,
      customerPhone: entry.customerPhone ?? null,
      price: 0,
      status: 'confirmed',
      source: 'waitlist',
      bridgedToCrm: false,
      syncedToFinance: false,
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, `tenants/${tenantId}/bookingWaitlist`, entry.id), { status: 'booked' });
    setActioning(null);
  };

  const handleCancel = async (id: string) => {
    await updateDoc(doc(db, `tenants/${tenantId}/bookingWaitlist`, id), { status: 'cancelled' });
  };

  const active = entries.filter(e => e.status === 'waiting' || e.status === 'notified');
  const done = entries.filter(e => e.status === 'booked' || e.status === 'cancelled');

  if (loading) return <div className="flex justify-center py-20"><RefreshCw size={20} className="animate-spin text-indigo-400" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Lista oczekujących</h3>
        <p className="text-xs text-slate-500 mt-0.5">Klienci czekający na zwolniony slot</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Oczekujących', val: entries.filter(e => e.status === 'waiting').length, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
          { label: 'Powiadomionych', val: entries.filter(e => e.status === 'notified').length, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
          { label: 'Zarezerwowanych', val: entries.filter(e => e.status === 'booked').length, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border p-4 ${s.bg}`}>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
            <p className={`text-3xl font-black mt-1 ${s.color}`}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* Active entries */}
      {active.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <UserPlus size={24} className="text-slate-300 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">Brak oczekujących klientów</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Aktywne</p>
          </div>
          <div className="divide-y divide-slate-50">
            {active.map(entry => {
              const svc = services.find(s => s.id === entry.serviceId);
              const isActioning = actioning === entry.id;
              return (
                <div key={entry.id} className="flex items-center gap-4 p-4">
                  <div className="w-2 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: svc?.color ?? '#6366f1' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-900">{entry.customerName}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                      <CalendarClock size={10} />
                      {new Date(entry.date + 'T12:00').toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })} o {entry.startTime}
                      <span>· {svc?.name ?? entry.serviceId}</span>
                    </div>
                    {entry.customerEmail && (
                      <p className="text-[9px] text-slate-400 mt-0.5">{entry.customerEmail}</p>
                    )}
                  </div>
                  <span className={`text-[8px] font-black px-2 py-1 rounded-lg ${STATUS_COLORS[entry.status]}`}>
                    {STATUS_LABELS[entry.status]}
                  </span>
                  <div className="flex gap-2">
                    {entry.status === 'waiting' && (
                      <button onClick={() => handleNotify(entry)} disabled={isActioning}
                        title="Powiadom emailem"
                        className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl transition-all disabled:opacity-50">
                        {isActioning ? <RefreshCw size={13} className="animate-spin" /> : <Bell size={13} />}
                      </button>
                    )}
                    <button onClick={() => handleConvert(entry)} disabled={isActioning}
                      title="Utwórz rezerwację"
                      className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl transition-all disabled:opacity-50">
                      <CheckCircle2 size={13} />
                    </button>
                    <button onClick={() => handleCancel(entry.id)}
                      title="Anuluj"
                      className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-all">
                      <XCircle size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Done entries */}
      {done.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Historia</p>
          </div>
          <div className="divide-y divide-slate-50">
            {done.slice(0, 10).map(entry => {
              const svc = services.find(s => s.id === entry.serviceId);
              return (
                <div key={entry.id} className="flex items-center gap-3 p-3 opacity-60">
                  <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: svc?.color ?? '#6366f1' }} />
                  <div className="flex-1">
                    <p className="text-xs font-black text-slate-700">{entry.customerName}</p>
                    <p className="text-[9px] text-slate-400">{entry.date} {entry.startTime} · {svc?.name}</p>
                  </div>
                  <span className={`text-[8px] font-black px-2 py-1 rounded-lg ${STATUS_COLORS[entry.status]}`}>
                    {STATUS_LABELS[entry.status]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
