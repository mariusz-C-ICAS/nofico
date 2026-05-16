import React, { useState, useEffect } from 'react';
import { Calendar, RefreshCw, Clock, DollarSign } from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface Props { tenantId: string; customerId: string; customerName: string }

interface Booking {
  id: string; serviceId: string; staffId?: string; date: string; startTime: string; endTime: string;
  status: string; price?: number; notes?: string; source: string; createdAt?: any;
}
interface BookingService { id: string; name: string; color: string; duration: number }
interface Staff { id: string; name: string }

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-emerald-100 text-emerald-700',
  confirmed: 'bg-blue-100 text-blue-700',
  pending: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-red-100 text-red-500',
  no_show: 'bg-slate-100 text-slate-500',
};

export default function CustomerBookingHistory({ tenantId, customerId, customerName }: Props) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<BookingService[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getDocs(query(collection(db, `tenants/${tenantId}/bookings`),
        where('tenantId', '==', tenantId),
        where('customerId', '==', customerId)
      )),
      getDocs(query(collection(db, `tenants/${tenantId}/bookingServices`), where('tenantId', '==', tenantId))),
      getDocs(query(collection(db, `tenants/${tenantId}/bookingStaff`), where('tenantId', '==', tenantId))),
    ]).then(([bSnap, sSnap, stSnap]) => {
      setBookings(bSnap.docs.map(d => ({ id: d.id, ...d.data() } as Booking))
        .sort((a, b) => `${b.date}${b.startTime}`.localeCompare(`${a.date}${a.startTime}`)));
      setServices(sSnap.docs.map(d => ({ id: d.id, ...d.data() } as BookingService)));
      setStaff(stSnap.docs.map(d => ({ id: d.id, ...d.data() } as Staff)));
      setLoading(false);
    });
  }, [tenantId, customerId]);

  const completed = bookings.filter(b => b.status === 'completed');
  const totalSpent = completed.reduce((s, b) => s + (b.price ?? 0), 0);
  const nextBooking = bookings.find(b => b.date >= new Date().toISOString().slice(0, 10) && b.status !== 'cancelled');

  if (loading) return <div className="flex justify-center py-10"><RefreshCw size={18} className="animate-spin text-indigo-400" /></div>;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-violet-50 rounded-xl p-3 text-center">
          <p className="text-[8px] font-black text-violet-500 uppercase">Łącznie wizyt</p>
          <p className="text-xl font-black text-violet-700">{bookings.length}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-3 text-center">
          <p className="text-[8px] font-black text-emerald-500 uppercase">Wydano łącznie</p>
          <p className="text-xl font-black text-emerald-700">{totalSpent.toLocaleString('pl-PL')} PLN</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-3 text-center">
          <p className="text-[8px] font-black text-blue-500 uppercase">Zrealizowane</p>
          <p className="text-xl font-black text-blue-700">{completed.length}</p>
        </div>
      </div>

      {/* Next upcoming booking */}
      {nextBooking && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
          <Calendar size={15} className="text-amber-600 flex-shrink-0" />
          <div>
            <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Najbliższa wizyta</p>
            <p className="text-xs font-black text-slate-900">
              {new Date(nextBooking.date + 'T12:00').toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' })} o {nextBooking.startTime}
            </p>
          </div>
          <span className={`ml-auto text-[8px] font-black px-2 py-1 rounded-lg ${STATUS_COLORS[nextBooking.status] ?? 'bg-slate-100 text-slate-500'}`}>
            {nextBooking.status}
          </span>
        </div>
      )}

      {/* History list */}
      {bookings.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-6">Brak historii rezerwacji dla tego klienta.</p>
      ) : (
        <div className="space-y-2">
          {bookings.map(b => {
            const svc = services.find(s => s.id === b.serviceId);
            const stf = staff.find(s => s.id === b.staffId);
            return (
              <div key={b.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: svc?.color ?? '#6366f1' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-slate-900">{svc?.name ?? '—'}</p>
                  <div className="flex items-center gap-2 text-[9px] text-slate-500 mt-0.5">
                    <Calendar size={9} />
                    {new Date(b.date + 'T12:00').toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: '2-digit' })}
                    <Clock size={9} /> {b.startTime}
                    {stf && <span>· {stf.name}</span>}
                  </div>
                </div>
                {b.price != null && (
                  <div className="flex items-center gap-1 text-[10px] font-black text-slate-700">
                    <DollarSign size={9} /> {b.price} PLN
                  </div>
                )}
                <span className={`text-[8px] font-black px-2 py-1 rounded-lg flex-shrink-0 ${STATUS_COLORS[b.status] ?? 'bg-slate-100 text-slate-500'}`}>
                  {b.status}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
