import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock, CheckCircle2, XCircle, Banknote, AlertTriangle,
  Shield, RotateCcw, X, Bell, Loader2,
} from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { db } from '../../../shared/lib/firebase';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { markAsRead, markAllAsRead, logInteraction } from '../../workflow/services/notificationService';
import type { WorkflowNotification, NotificationType } from '../../workflow/types';
import { NOTIF_TITLES } from '../../workflow/services/notificationService';

type Filter = 'all' | 'unread' | 'workflow' | 'system';

const TYPE_ICONS: Record<NotificationType, { icon: React.ElementType; bg: string; color: string }> = {
  APPROVAL_REQUIRED: { icon: Clock, bg: 'bg-amber-50', color: 'text-amber-600' },
  DOCUMENT_APPROVED: { icon: CheckCircle2, bg: 'bg-emerald-50', color: 'text-emerald-600' },
  DOCUMENT_REJECTED: { icon: XCircle, bg: 'bg-red-50', color: 'text-red-600' },
  DOCUMENT_SETTLED: { icon: Banknote, bg: 'bg-teal-50', color: 'text-teal-600' },
  KSEF_VERIFIED: { icon: Shield, bg: 'bg-violet-50', color: 'text-violet-600' },
  STEP_TIMEOUT: { icon: AlertTriangle, bg: 'bg-orange-50', color: 'text-orange-600' },
  DOCUMENT_CANCELLED: { icon: X, bg: 'bg-slate-100', color: 'text-slate-500' },
  CHANGES_REQUESTED: { icon: RotateCcw, bg: 'bg-blue-50', color: 'text-blue-600' },
};

const WORKFLOW_TYPES: NotificationType[] = [
  'APPROVAL_REQUIRED', 'DOCUMENT_APPROVED', 'DOCUMENT_REJECTED',
  'DOCUMENT_SETTLED', 'KSEF_VERIFIED', 'STEP_TIMEOUT',
  'DOCUMENT_CANCELLED', 'CHANGES_REQUESTED',
];

const FILTER_LABELS: Record<Filter, string> = {
  all: 'Wszystkie',
  unread: 'Nieprzeczytane',
  workflow: 'Obieg dokumentów',
  system: 'Systemowe',
};

export default function NotificationsTabPanel() {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const [notifs, setNotifs] = useState<WorkflowNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    if (!user || !activeTenantId) { setLoading(false); return; }
    const q = query(
      collection(db, `tenants/${activeTenantId}/notifications`),
      where('recipientId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      setNotifs(snap.docs.map(d => ({ id: d.id, ...d.data() }) as WorkflowNotification));
      setLoading(false);
    });
    return unsub;
  }, [user?.uid, activeTenantId]);

  const filtered = notifs.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'workflow') return WORKFLOW_TYPES.includes(n.type);
    if (filter === 'system') return !WORKFLOW_TYPES.includes(n.type);
    return true;
  });

  const unreadCount = notifs.filter(n => !n.read).length;

  const handleRead = async (n: WorkflowNotification) => {
    if (!activeTenantId) return;
    if (!n.read) {
      await markAsRead(activeTenantId, n.id);
      await logInteraction(activeTenantId, n.id, user!.uid, 'viewed');
    }
  };

  const handleMarkAll = async () => {
    if (!activeTenantId || !user) return;
    await markAllAsRead(activeTenantId, user.uid);
    for (const n of notifs.filter(x => !x.read)) {
      await logInteraction(activeTenantId, n.id, user.uid, 'viewed');
    }
  };

  if (loading) return (
    <div className="flex justify-center py-16">
      <Loader2 className="animate-spin text-slate-400" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1 bg-slate-100 rounded-2xl p-1">
          {(Object.keys(FILTER_LABELS) as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                filter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {FILTER_LABELS[f]}
              {f === 'unread' && unreadCount > 0 && (
                <span className="ml-1.5 bg-indigo-600 text-white text-[8px] px-1.5 py-0.5 rounded-full">{unreadCount}</span>
              )}
            </button>
          ))}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAll}
            className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800 transition-colors"
          >
            Zaznacz wszystkie jako przeczytane
          </button>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-slate-300">
          <Bell size={36} className="mb-4" />
          <p className="text-sm font-black uppercase tracking-widest">
            {filter === 'unread' ? 'Wszystko przeczytane' : 'Brak powiadomień'}
          </p>
        </div>
      ) : (
        <AnimatePresence>
          <div className="space-y-2">
            {filtered.map((n, i) => {
              const cfg = TYPE_ICONS[n.type] ?? { icon: Bell, bg: 'bg-slate-100', color: 'text-slate-500' };
              const Icon = cfg.icon;
              const ts = n.createdAt?.toDate?.();
              const timeStr = ts ? format(ts, 'd MMM, HH:mm', { locale: pl }) : '';

              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => handleRead(n)}
                  className={`flex items-start gap-4 px-6 py-5 rounded-[2rem] border transition-all cursor-pointer hover:shadow-md ${
                    n.read ? 'bg-white border-slate-100 opacity-60 hover:opacity-100' : 'bg-indigo-50 border-indigo-100'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${n.read ? 'bg-slate-100' : cfg.bg}`}>
                    <Icon size={16} className={n.read ? 'text-slate-400' : cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${n.read ? 'bg-slate-100 text-slate-400' : `${cfg.bg} ${cfg.color}`}`}>
                        {NOTIF_TITLES[n.type]}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800 leading-snug">{n.message}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">{timeStr}</span>
                      {n.documentTitle && (
                        <span className="text-[9px] text-slate-400 truncate">{n.documentTitle}</span>
                      )}
                    </div>
                  </div>
                  {!n.read && <div className="w-2 h-2 rounded-full bg-indigo-600 mt-2 shrink-0 flex-shrink-0" />}
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
