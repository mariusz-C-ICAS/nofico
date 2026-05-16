import React, { useState, useEffect } from 'react';
import { RefreshCw, Search, Filter } from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, where, onSnapshot, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

interface Props { tenantId: string }

interface Booking {
  id: string; serviceId: string; staffId?: string; customerName: string; customerEmail?: string;
  customerPhone?: string; date: string; startTime: string; endTime: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'no_show' | 'completed';
  notes?: string; price?: number; source: 'manual' | 'online';
}
interface BookingService { id: string; name: string; color: string }
interface Staff { id: string; name: string }

const STATUS_OPTIONS = ['all', 'pending', 'confirmed', 'completed', 'cancelled', 'no_show'];
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-500',
  no_show: 'bg-slate-100 text-slate-500',
};

export default function BookingsList({ tenantId }: Props) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<BookingService[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const unsubs = [
      onSnapshot(query(collection(db, `tenants/${tenantId}/bookings`), where('tenantId', '==', tenantId)), snap => {
        setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking)));
        setLoading(false);
      }),
      onSnapshot(query(collection(db, `tenants/${tenantId}/bookingServices`), where('tenantId', '==', tenantId)), snap => {
        setServices(snap.docs.map(d => ({ id: d.id, ...d.data() } as BookingService)));
      }),
      onSnapshot(query(collection(db, `tenants/${tenantId}/bookingStaff`), where('tenantId', '==', tenantId)), snap => {
        setStaff(snap.docs.map(d => ({ id: d.id, ...d.data() } as Staff)));
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, [tenantId]);

  const updateStatus = async (id: string, status: Booking['status']) => {
    await updateDoc(doc(db, `tenants/${tenantId}/bookings`, id), { status, updatedAt: serverTimestamp() });
  };

  const filtered = bookings
    .filter(b => filterStatus === 'all' || b.status === filterStatus)
    .filter(b => !search || b.customerName.toLowerCase().includes(search.toLowerCase()) || b.customerEmail?.includes(search))
    .sort((a, b) => `${b.date}${b.startTime}`.localeCompare(`${a.date}${a.startTime}`));

  // KPIs
  const total = bookings.length;
  const pending = bookings.filter(b => b.status === 'pending').length;
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayCount = bookings.filter(b => b.date === todayStr).length;
  const revenue = bookings.filter(b => b.status === 'completed').reduce((s, b) => s + (b.price ?? 0), 0);

  if (loading) return <div className="flex justify-center py-20"><RefreshCw size={20} className="animate-spin text-indigo-400" /></div>;

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Wszystkie rezerwacje</h3>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Łącznie', value: String(total), color: 'text-slate-900', bg: 'bg-slate-50 border-slate-200' },
          { label: 'Oczekujące', value: String(pending), color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
          { label: 'Dziś', value: String(todayCount), color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
          { label: 'Przychód', value: revenue.toLocaleString('pl-PL') + ' PLN', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
        ].map(k => (
          <div key={k.label} className={`rounded-2xl border p-5 ${k.bg}`}>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{k.label}</p>
            <p className={`text-2xl font-black mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Szukaj klienta..."
            className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-400 w-52" />
        </div>
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
          <Filter size={12} className="text-slate-400 ml-2" />
          {STATUS_OPTIONS.map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filterStatus === s ? 'bg-violet-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
              {s === 'all' ? 'Wszystkie' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">Brak rezerwacji dla wybranych filtrów</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                <th className="text-left px-5 py-3">Klient</th>
                <th className="text-left px-4 py-3">Data & Godzina</th>
                <th className="text-left px-4 py-3">Usługa</th>
                <th className="text-left px-4 py-3">Pracownik</th>
                <th className="text-left px-4 py-3">Cena</th>
                <th className="text-left px-4 py-3">Źródło</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(b => {
                const svc = services.find(s => s.id === b.serviceId);
                const stf = staff.find(s => s.id === b.staffId);
                return (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <div className="font-black text-slate-900 text-sm">{b.customerName}</div>
                      <div className="text-[9px] text-slate-400">{b.customerPhone ?? b.customerEmail ?? ''}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      {new Date(b.date + 'T12:00').toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
                      <span className="ml-1 text-slate-400">{b.startTime}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {svc && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: svc.color }} />}
                        <span className="text-xs text-slate-700">{svc?.name ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{stf?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-xs font-black text-slate-700">{b.price != null ? b.price + ' PLN' : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[8px] font-black px-2 py-1 rounded-lg ${b.source === 'online' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500'}`}>
                        {b.source}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select value={b.status} onChange={e => updateStatus(b.id, e.target.value as Booking['status'])}
                        className={`text-[9px] font-black px-3 py-1.5 rounded-lg border-0 outline-none cursor-pointer ${STATUS_COLORS[b.status] ?? ''}`}>
                        {(['pending', 'confirmed', 'completed', 'cancelled', 'no_show'] as const).map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
