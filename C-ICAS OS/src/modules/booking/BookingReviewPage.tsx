import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Star, CheckCircle2, RefreshCw } from 'lucide-react';
import { db } from '../../shared/lib/firebase';
import {
  collection, query, where, getDocs, updateDoc, doc, addDoc, serverTimestamp,
} from 'firebase/firestore';

const LABELS = ['', 'Bardzo źle', 'Źle', 'Neutralnie', 'Dobrze', 'Świetnie!'];

export default function BookingReviewPage() {
  const { tenantId, token } = useParams<{ tenantId: string; token: string }>();
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [bookingData, setBookingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!tenantId || !token) { setNotFound(true); setLoading(false); return; }
    (async () => {
      // Try existing review skeleton
      const rSnap = await getDocs(
        query(collection(db, `tenants/${tenantId}/bookingReviews`), where('token', '==', token))
      );
      if (!rSnap.empty) {
        const d = rSnap.docs[0];
        const data = d.data();
        setReviewId(d.id);
        setBookingData(data);
        if (data.rating) setAlreadyDone(true);
        setLoading(false);
        return;
      }
      // Try booking with reviewToken field
      const bSnap = await getDocs(
        query(collection(db, `tenants/${tenantId}/bookings`), where('reviewToken', '==', token))
      );
      if (!bSnap.empty) {
        const d = bSnap.docs[0];
        setBookingData({ id: d.id, ...d.data() });
        setLoading(false);
        return;
      }
      setNotFound(true);
      setLoading(false);
    })();
  }, [tenantId, token]);

  const handleSubmit = async () => {
    if (!rating || !tenantId || !token) return;
    setSaving(true);
    if (reviewId) {
      await updateDoc(doc(db, `tenants/${tenantId}/bookingReviews`, reviewId), {
        rating,
        comment: comment.trim() || null,
        visible: true,
        submittedAt: serverTimestamp(),
      });
    } else if (bookingData) {
      await addDoc(collection(db, `tenants/${tenantId}/bookingReviews`), {
        tenantId,
        token,
        bookingId: bookingData.id,
        customerName: bookingData.customerName ?? '',
        serviceId: bookingData.serviceId ?? null,
        rating,
        comment: comment.trim() || null,
        visible: true,
        createdAt: serverTimestamp(),
      });
    }
    setSaving(false);
    setDone(true);
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <RefreshCw size={20} className="animate-spin text-indigo-400" />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="text-center max-w-sm">
        <Star size={40} className="text-slate-200 mx-auto mb-4" />
        <p className="text-lg font-black text-slate-700">Link do recenzji jest nieprawidłowy lub wygasł</p>
        <p className="text-sm text-slate-400 mt-1">Skontaktuj się z salonem, jeśli uważasz, że to błąd.</p>
      </div>
    </div>
  );

  if (alreadyDone || done) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="text-center max-w-sm">
        <CheckCircle2 size={56} className="text-emerald-500 mx-auto mb-4" />
        <p className="text-2xl font-black text-slate-900 mb-2">Dziękujemy!</p>
        <p className="text-sm text-slate-500">Twoja opinia została zapisana i pomaga innym klientom.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full space-y-6">
        <div className="text-center">
          <Star size={36} className="text-amber-400 mx-auto mb-3 fill-amber-100" />
          <h1 className="text-2xl font-black text-slate-900">Oceń wizytę</h1>
          {bookingData?.customerName && (
            <p className="text-sm text-slate-500 mt-1">Cześć, {bookingData.customerName}!</p>
          )}
          <p className="text-xs text-slate-400 mt-1">Twoja opinia pomaga nam się doskonalić</p>
        </div>

        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center mb-3">Ocena *</p>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map(i => (
              <button
                key={i}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setRating(i)}
              >
                <Star
                  size={40}
                  className={`transition-all duration-100 ${i <= (hovered || rating)
                    ? 'fill-amber-400 text-amber-400 scale-110'
                    : 'text-slate-200'}`}
                />
              </button>
            ))}
          </div>
          {(hovered || rating) > 0 && (
            <p className="text-center text-sm font-black text-slate-600 mt-2 transition-all">
              {LABELS[hovered || rating]}
            </p>
          )}
        </div>

        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Komentarz (opcjonalnie)</label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
            placeholder="Co Ci się podobało? Co moglibyśmy poprawić?"
            className="mt-1.5 w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none resize-none focus:border-indigo-400"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!rating || saving}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-black text-sm px-6 py-4 rounded-2xl transition-all"
        >
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          Wyślij opinię
        </button>
      </div>
    </div>
  );
}
