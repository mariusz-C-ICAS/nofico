import React, { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, DollarSign, Clock, Users } from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface Props { tenantId: string }
interface Booking {
  id: string; serviceId: string; date: string; startTime: string;
  status: string; price?: number; source: string;
}
interface BookingService { id: string; name: string; color: string; duration: number }

function monthLabel(key: string) {
  const [y, m] = key.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('pl-PL', { month: 'short', year: '2-digit' });
}

export default function BookingAnalytics({ tenantId }: Props) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<BookingService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getDocs(query(collection(db, `tenants/${tenantId}/bookings`), where('tenantId', '==', tenantId))),
      getDocs(query(collection(db, `tenants/${tenantId}/bookingServices`), where('tenantId', '==', tenantId))),
    ]).then(([bSnap, sSnap]) => {
      setBookings(bSnap.docs.map(d => ({ id: d.id, ...d.data() } as Booking)));
      setServices(sSnap.docs.map(d => ({ id: d.id, ...d.data() } as BookingService)));
      setLoading(false);
    });
  }, [tenantId]);

  const completed = bookings.filter(b => b.status === 'completed');
  const totalRevenue = completed.reduce((s, b) => s + (b.price ?? 0), 0);
  const avgRevenue = completed.length > 0 ? Math.round(totalRevenue / completed.length) : 0;
  const onlineRate = bookings.length > 0 ? Math.round((bookings.filter(b => b.source === 'online').length / bookings.length) * 100) : 0;

  // Revenue by service
  const revenueByService: Record<string, number> = {};
  const countByService: Record<string, number> = {};
  completed.forEach(b => {
    revenueByService[b.serviceId] = (revenueByService[b.serviceId] ?? 0) + (b.price ?? 0);
    countByService[b.serviceId] = (countByService[b.serviceId] ?? 0) + 1;
  });
  const topServices = Object.entries(revenueByService)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([id, rev]) => ({ id, rev, count: countByService[id] ?? 0, svc: services.find(s => s.id === id) }));
  const maxRev = topServices[0]?.rev ?? 1;

  // Bookings by month (last 6)
  const monthMap: Record<string, number> = {};
  bookings.forEach(b => {
    const key = b.date?.slice(0, 7);
    if (key) monthMap[key] = (monthMap[key] ?? 0) + 1;
  });
  const months = Object.entries(monthMap).sort(([a], [b]) => a.localeCompare(b)).slice(-6);
  const maxMonth = Math.max(...months.map(([, c]) => c), 1);

  // Peak hours heatmap (hour 0-23)
  const hourMap: Record<number, number> = {};
  bookings.forEach(b => {
    const h = parseInt(b.startTime?.split(':')[0] ?? '0');
    hourMap[h] = (hourMap[h] ?? 0) + 1;
  });
  const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 07-20
  const maxHour = Math.max(...HOURS.map(h => hourMap[h] ?? 0), 1);

  // Status breakdown
  const statusMap: Record<string, number> = {};
  bookings.forEach(b => { statusMap[b.status] = (statusMap[b.status] ?? 0) + 1; });
  const STATUS_COLORS: Record<string, string> = {
    completed: 'bg-emerald-500', confirmed: 'bg-blue-500', pending: 'bg-amber-400',
    cancelled: 'bg-red-400', no_show: 'bg-slate-300',
  };

  if (loading) return <div className="flex justify-center py-20"><RefreshCw size={20} className="animate-spin text-indigo-400" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Analityka rezerwacji</h3>
        <p className="text-xs text-slate-500 mt-0.5">Przychody, obłożenie, szczyty ruchu</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Przychód łącznie', value: totalRevenue.toLocaleString('pl-PL') + ' PLN', icon: DollarSign, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
          { label: 'Śr. wartość wizyty', value: avgRevenue + ' PLN', icon: TrendingUp, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
          { label: 'Zrealizowane', value: String(completed.length), icon: Users, color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
          { label: 'Online %', value: onlineRate + '%', icon: Clock, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
        ].map(k => (
          <div key={k.label} className={`rounded-2xl border p-5 ${k.bg}`}>
            <k.icon size={15} className={`${k.color} mb-2`} />
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{k.label}</p>
            <p className={`text-2xl font-black mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue by service */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Przychód per usługa</p>
          {topServices.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">Brak danych</p>
          ) : (
            <div className="space-y-3">
              {topServices.map(({ id, rev, count, svc }) => (
                <div key={id} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: svc?.color ?? '#6366f1' }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-700 truncate">{svc?.name ?? id}</span>
                      <span className="text-[10px] font-black text-slate-900 ml-2">{rev.toLocaleString('pl-PL')} PLN</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(rev / maxRev) * 100}%`, backgroundColor: svc?.color ?? '#6366f1' }} />
                    </div>
                  </div>
                  <span className="text-[9px] text-slate-400 w-10 text-right">{count}×</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bookings by month */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Rezerwacje per miesiąc</p>
          {months.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">Brak danych</p>
          ) : (
            <div className="flex items-end gap-2 h-32">
              {months.map(([key, count]) => (
                <div key={key} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[8px] font-black text-slate-600">{count}</span>
                  <div className="w-full rounded-t-lg bg-violet-500 transition-all" style={{ height: `${(count / maxMonth) * 90}%`, minHeight: 4 }} />
                  <span className="text-[8px] text-slate-400">{monthLabel(key)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Peak hours */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Szczyty ruchu (godziny)</p>
          <div className="flex items-end gap-1.5 h-24">
            {HOURS.map(h => {
              const count = hourMap[h] ?? 0;
              const pct = (count / maxHour) * 100;
              const hot = pct >= 70;
              return (
                <div key={h} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className={`w-full rounded-t transition-all ${hot ? 'bg-red-400' : pct >= 40 ? 'bg-amber-400' : 'bg-slate-200'}`}
                    style={{ height: `${Math.max(pct, 4)}%` }} />
                  <span className="text-[7px] text-slate-400">{h}</span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-3 mt-2 text-[8px] text-slate-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-400 rounded inline-block" /> Szczyt</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-400 rounded inline-block" /> Średni</span>
          </div>
        </div>

        {/* Status breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Podział statusów</p>
          <div className="space-y-3">
            {Object.entries(statusMap).sort(([, a], [, b]) => b - a).map(([status, count]) => {
              const pct = bookings.length > 0 ? Math.round((count / bookings.length) * 100) : 0;
              return (
                <div key={status} className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-slate-600 w-20">{status}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${STATUS_COLORS[status] ?? 'bg-slate-400'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] font-black text-slate-700 w-10 text-right">{count}</span>
                  <span className="text-[9px] text-slate-400 w-8">{pct}%</span>
                </div>
              );
            })}
            {Object.keys(statusMap).length === 0 && <p className="text-slate-400 text-sm text-center py-4">Brak danych</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
