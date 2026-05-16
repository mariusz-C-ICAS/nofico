import React, { useState, useEffect } from 'react';
import { RefreshCw, Star, MessageSquare, Eye, EyeOff, Send } from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, where, onSnapshot, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

interface Props { tenantId: string }
interface Review {
  id: string; bookingId: string; customerName: string; serviceId: string;
  rating: 1 | 2 | 3 | 4 | 5; comment?: string; reply?: string;
  visible: boolean; token: string; createdAt?: any; repliedAt?: any;
}
interface BookingService { id: string; name: string; color: string }

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size} className={i <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} />
      ))}
    </div>
  );
}

export default function PostVisitReview({ tenantId }: Props) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [services, setServices] = useState<BookingService[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [savingReply, setSavingReply] = useState(false);
  const [filter, setFilter] = useState<number | null>(null);

  useEffect(() => {
    const unsubs = [
      onSnapshot(
        query(collection(db, `tenants/${tenantId}/bookingReviews`), where('tenantId', '==', tenantId)),
        snap => {
          setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() } as Review))
            .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)));
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

  const toggleVisible = async (r: Review) => {
    await updateDoc(doc(db, `tenants/${tenantId}/bookingReviews`, r.id), { visible: !r.visible });
  };

  const saveReply = async (r: Review) => {
    if (!replyText.trim()) return;
    setSavingReply(true);
    await updateDoc(doc(db, `tenants/${tenantId}/bookingReviews`, r.id), {
      reply: replyText.trim(), repliedAt: serverTimestamp(),
    });
    setSavingReply(false);
    setReplyingId(null);
    setReplyText('');
  };

  const visible = reviews.filter(r => r.visible);
  const avgRating = visible.length > 0
    ? (visible.reduce((s, r) => s + r.rating, 0) / visible.length)
    : 0;

  const dist = [5, 4, 3, 2, 1].map(stars => ({
    stars,
    count: visible.filter(r => r.rating === stars).length,
    pct: visible.length > 0 ? Math.round((visible.filter(r => r.rating === stars).length / visible.length) * 100) : 0,
  }));

  const filtered = filter ? reviews.filter(r => r.rating === filter) : reviews;

  if (loading) return <div className="flex justify-center py-20"><RefreshCw size={20} className="animate-spin text-indigo-400" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Opinie klientów</h3>
        <p className="text-xs text-slate-500 mt-0.5">Recenzje po zrealizowanych wizytach</p>
      </div>

      {reviews.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <Star size={28} className="text-slate-300 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">Brak opinii — pojawią się po realizacji pierwszych wizyt</p>
          <p className="text-[10px] text-slate-300 mt-1">Email z prośbą o ocenę jest wysyłany automatycznie</p>
        </div>
      ) : (
        <>
          {/* Rating summary */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="flex flex-col items-center justify-center text-center">
                <p className="text-6xl font-black text-slate-900">{avgRating.toFixed(1)}</p>
                <StarRow rating={Math.round(avgRating)} size={18} />
                <p className="text-xs text-slate-400 mt-2">{visible.length} ocen publicznych</p>
              </div>
              <div className="space-y-2">
                {dist.map(({ stars, count, pct }) => (
                  <button key={stars} onClick={() => setFilter(filter === stars ? null : stars)}
                    className={`w-full flex items-center gap-2 group ${filter === stars ? 'opacity-100' : 'opacity-80 hover:opacity-100'}`}>
                    <span className="text-xs font-black text-slate-600 w-4">{stars}</span>
                    <Star size={11} className="fill-amber-400 text-amber-400 flex-shrink-0" />
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-400 w-8 text-right">{count}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Filter indicator */}
          {filter && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Filtr: {filter} gwiazdki</span>
              <button onClick={() => setFilter(null)} className="text-[10px] text-indigo-600 font-bold hover:underline">Pokaż wszystkie</button>
            </div>
          )}

          {/* Review list */}
          <div className="space-y-4">
            {filtered.map(r => {
              const svc = services.find(s => s.id === r.serviceId);
              return (
                <div key={r.id} className={`bg-white rounded-2xl border-2 p-5 transition-all ${r.visible ? 'border-slate-200' : 'border-dashed border-slate-200 opacity-60'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-black text-sm flex-shrink-0">
                          {r.customerName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900">{r.customerName}</p>
                          {svc && (
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: svc.color }} />
                              <span className="text-[9px] text-slate-400">{svc.name}</span>
                            </div>
                          )}
                        </div>
                        <StarRow rating={r.rating} />
                      </div>
                      {r.comment && (
                        <p className="text-sm text-slate-700 bg-slate-50 rounded-xl px-4 py-3 leading-relaxed">
                          "{r.comment}"
                        </p>
                      )}
                      {r.reply && (
                        <div className="mt-3 ml-4 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
                          <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1">Odpowiedź salonu</p>
                          <p className="text-sm text-slate-700">{r.reply}</p>
                        </div>
                      )}
                      {replyingId === r.id && (
                        <div className="mt-3 ml-4 space-y-2">
                          <textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows={2}
                            placeholder="Odpowiedź dla klienta..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none resize-none focus:border-indigo-400" />
                          <div className="flex gap-2">
                            <button onClick={() => saveReply(r)} disabled={!replyText.trim() || savingReply}
                              className="flex items-center gap-1.5 bg-indigo-600 text-white font-black text-xs px-4 py-2 rounded-xl disabled:opacity-50">
                              {savingReply ? <RefreshCw size={11} className="animate-spin" /> : <Send size={11} />}
                              Wyślij odpowiedź
                            </button>
                            <button onClick={() => { setReplyingId(null); setReplyText(''); }}
                              className="text-slate-400 text-xs font-bold px-3 py-2">Anuluj</button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      {!r.reply && replyingId !== r.id && (
                        <button onClick={() => { setReplyingId(r.id); setReplyText(''); }}
                          title="Odpowiedz"
                          className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-all">
                          <MessageSquare size={13} />
                        </button>
                      )}
                      <button onClick={() => toggleVisible(r)}
                        title={r.visible ? 'Ukryj' : 'Pokaż publicznie'}
                        className={`p-2 rounded-xl transition-all ${r.visible ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                        {r.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
