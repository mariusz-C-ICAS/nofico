import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Square, Clock, Calendar } from 'lucide-react';
import { useTenant } from '../../core/auth/TenantContext';
import { useAuth } from '../../core/auth/AuthContext';
import { db } from '../../core/firebase/config';
import {
  collection, addDoc, query, where, orderBy,
  onSnapshot, serverTimestamp, Timestamp,
} from 'firebase/firestore';

interface TimeLog {
  id: string;
  userId: string;
  startTime: Timestamp;
  endTime: Timestamp | null;
  durationMinutes: number | null;
  note: string | null;
}

function fmt(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function fmtDur(min: number) {
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

export default function TimeTrackingPage() {
  const { t } = useTranslation();
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const tenantId = currentTenant?.id;

  const [tracking, setTracking] = useState(false);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [logs, setLogs] = useState<TimeLog[]>([]);

  useEffect(() => {
    if (!tracking) return;
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, [tracking]);

  useEffect(() => {
    if (!tenantId || !user) return;
    const q = query(
      collection(db, `tenants/${tenantId}/timeLogs`),
      where('userId', '==', user.uid),
      orderBy('startTime', 'desc'),
    );
    return onSnapshot(q, snap =>
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as TimeLog)))
    );
  }, [tenantId, user]);

  const start = () => { setSessionStart(new Date()); setElapsed(0); setTracking(true); };

  const stop = async () => {
    if (!tenantId || !user || !sessionStart) return;
    setSaving(true);
    setTracking(false);
    const endTime = new Date();
    const durationMinutes = Math.max(1, Math.round((endTime.getTime() - sessionStart.getTime()) / 60000));
    await addDoc(collection(db, `tenants/${tenantId}/timeLogs`), {
      userId: user.uid,
      userEmail: user.email,
      startTime: Timestamp.fromDate(sessionStart),
      endTime: Timestamp.fromDate(endTime),
      durationMinutes,
      note: note.trim() || null,
      createdAt: serverTimestamp(),
    });
    setNote(''); setSaving(false);
  };

  const today = new Date();
  const todayLogs = logs.filter(l => {
    if (!l.startTime) return false;
    const d = l.startTime.toDate();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  });
  const todayMin = todayLogs.reduce((s, l) => s + (l.durationMinutes ?? 0), 0);

  if (!tenantId) return <div className="p-6 text-zinc-400 text-sm">{t('timeTracking.noWorkspace')}</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-black text-white uppercase tracking-tighter mb-6 flex items-center gap-2">
        <Clock size={20} className="text-indigo-400" /> {t('timeTracking.title')}
      </h1>

      {/* Timer */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 mb-4 text-center">
        <div className={`text-6xl font-black font-mono mb-6 transition-colors ${tracking ? 'text-emerald-400' : 'text-white'}`}>
          {fmt(elapsed)}
        </div>
        {tracking && (
          <input
            value={note} onChange={e => setNote(e.target.value)}
            placeholder={t('timeTracking.notePlaceholder')}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:ring-2 focus:ring-indigo-500 mb-5"
          />
        )}
        <button
          onClick={tracking ? stop : start}
          disabled={saving}
          className={`inline-flex items-center gap-2 px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl ${
            tracking
              ? 'bg-red-600 hover:bg-red-500 shadow-red-600/20 text-white'
              : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20 text-white'
          }`}
        >
          {tracking ? <><Square size={14} /> {t('timeTracking.stop')}</> : <><Play size={14} /> {t('timeTracking.start')}</>}
        </button>
      </div>

      {/* Today summary */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">{t('timeTracking.today')}</div>
          <div className="text-2xl font-black text-indigo-400">{fmtDur(todayMin)}</div>
          <div className="text-xs text-zinc-600">{todayLogs.length} {t('timeTracking.sessions')}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">{t('timeTracking.total')}</div>
          <div className="text-2xl font-black text-zinc-300">{fmtDur(logs.reduce((s, l) => s + (l.durationMinutes ?? 0), 0))}</div>
          <div className="text-xs text-zinc-600">{logs.length} {t('timeTracking.sessions')}</div>
        </div>
      </div>

      {/* Log */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-3">
          <Calendar size={11} /> {t('timeTracking.history')}
        </div>
        {logs.slice(0, 30).map(log => {
          const start = log.startTime?.toDate();
          return (
            <div key={log.id} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-zinc-200">
                  {start?.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                  {' · '}
                  {start?.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                </div>
                {log.note && <div className="text-[11px] text-zinc-500 mt-0.5">{log.note}</div>}
              </div>
              <div className="text-sm font-black text-indigo-400">
                {log.durationMinutes != null ? fmtDur(log.durationMinutes) : '—'}
              </div>
            </div>
          );
        })}
        {logs.length === 0 && (
          <div className="text-center text-zinc-600 text-sm py-8">{t('timeTracking.noSessions')}</div>
        )}
      </div>
    </div>
  );
}
