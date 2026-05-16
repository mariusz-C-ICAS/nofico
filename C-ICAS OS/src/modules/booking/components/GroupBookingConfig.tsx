import React, { useState, useEffect } from 'react';
import { RefreshCw, Users, Save } from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';

interface Props { tenantId: string }
interface BookingService {
  id: string; name: string; color: string; duration: number; price: number; active: boolean;
  isGroup?: boolean; maxParticipants?: number;
}
interface Booking {
  id: string; serviceId: string; date: string; startTime: string; status: string; customerName: string;
}
interface EditState { isGroup: boolean; maxParticipants: number }

export default function GroupBookingConfig({ tenantId }: Props) {
  const [services, setServices] = useState<BookingService[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, EditState>>({});

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const unsubs = [
      onSnapshot(
        query(collection(db, `tenants/${tenantId}/bookingServices`), where('tenantId', '==', tenantId)),
        snap => {
          const svcs = snap.docs.map(d => ({ id: d.id, ...d.data() } as BookingService));
          setServices(svcs);
          setEdits(prev => {
            const next = { ...prev };
            svcs.forEach(s => {
              if (!next[s.id]) next[s.id] = { isGroup: s.isGroup ?? false, maxParticipants: s.maxParticipants ?? 10 };
            });
            return next;
          });
          setLoading(false);
        }
      ),
      onSnapshot(
        query(collection(db, `tenants/${tenantId}/bookings`), where('tenantId', '==', tenantId)),
        snap => {
          setBookings(
            snap.docs
              .map(d => ({ id: d.id, ...d.data() } as Booking))
              .filter(b => b.date >= today && !['cancelled', 'no_show'].includes(b.status))
          );
        }
      ),
    ];
    return () => unsubs.forEach(u => u());
  }, [tenantId]);

  const handleSave = async (svc: BookingService) => {
    const edit = edits[svc.id];
    if (!edit) return;
    setSaving(svc.id);
    await updateDoc(doc(db, `tenants/${tenantId}/bookingServices`, svc.id), {
      isGroup: edit.isGroup,
      maxParticipants: edit.isGroup ? edit.maxParticipants : null,
    });
    setSaving(null);
  };

  const setEdit = (id: string, patch: Partial<EditState>) =>
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  if (loading) return <div className="flex justify-center py-20"><RefreshCw size={20} className="animate-spin text-indigo-400" /></div>;

  if (services.length === 0) return (
    <div className="space-y-4">
      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Rezerwacje grupowe</h3>
      <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
        <Users size={24} className="text-slate-300 mx-auto mb-2" />
        <p className="text-slate-400 text-sm">Brak usług — dodaj usługi w zakładce Usługi</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Rezerwacje grupowe</h3>
        <p className="text-xs text-slate-500 mt-0.5">Konfiguruj usługi grupowe i monitoruj zapisanych uczestników</p>
      </div>

      <div className="space-y-3">
        {services.map(svc => {
          const edit = edits[svc.id] ?? { isGroup: false, maxParticipants: 10 };
          const slotMap = bookings
            .filter(b => b.serviceId === svc.id)
            .reduce<Record<string, Booking[]>>((acc, b) => {
              const key = `${b.date}|${b.startTime}`;
              if (!acc[key]) acc[key] = [];
              acc[key].push(b);
              return acc;
            }, {});

          return (
            <div key={svc.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: svc.color }} />
                  <div>
                    <p className="text-sm font-black text-slate-900">{svc.name}</p>
                    <p className="text-[10px] text-slate-400">{svc.duration} min · {svc.price} PLN</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Grupowa</span>
                    <button
                      onClick={() => setEdit(svc.id, { isGroup: !edit.isGroup })}
                      className={`relative w-10 h-5 rounded-full transition-all ${edit.isGroup ? 'bg-indigo-500' : 'bg-slate-200'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${edit.isGroup ? 'left-5' : 'left-0.5'}`} />
                    </button>
                  </label>
                  {edit.isGroup && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Max</span>
                      <input
                        type="number" min={2} max={200}
                        value={edit.maxParticipants}
                        onChange={e => setEdit(svc.id, { maxParticipants: Number(e.target.value) })}
                        className="w-16 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-sm text-center outline-none focus:border-indigo-400"
                      />
                      <span className="text-[10px] text-slate-400">os.</span>
                    </div>
                  )}
                  <button
                    onClick={() => handleSave(svc)}
                    disabled={saving === svc.id}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-[10px] px-3 py-2 rounded-xl uppercase tracking-widest"
                  >
                    {saving === svc.id ? <RefreshCw size={11} className="animate-spin" /> : <Save size={11} />}
                    Zapisz
                  </button>
                </div>
              </div>

              {edit.isGroup && Object.keys(slotMap).length > 0 && (
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Nadchodzące terminy</p>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                    {Object.entries(slotMap).slice(0, 6).map(([key, participants]) => {
                      const [date, time] = key.split('|');
                      const pct = Math.round((participants.length / edit.maxParticipants) * 100);
                      const full = participants.length >= edit.maxParticipants;
                      return (
                        <div key={key} className={`rounded-xl p-3 border ${full ? 'border-red-200 bg-red-50' : 'border-slate-100 bg-slate-50'}`}>
                          <p className="text-[10px] font-black text-slate-700">
                            {new Date(date + 'T12:00').toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })} o {time}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Users size={10} className={full ? 'text-red-500' : 'text-indigo-400'} />
                            <span className={`text-[10px] font-black ${full ? 'text-red-600' : 'text-slate-600'}`}>
                              {participants.length}/{edit.maxParticipants}
                            </span>
                          </div>
                          <div className="mt-1.5 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${full ? 'bg-red-400' : 'bg-indigo-400'}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
