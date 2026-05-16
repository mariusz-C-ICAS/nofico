import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Bell, Save, Clock, Mail, Smartphone, Monitor, CheckCircle2, RotateCcw } from 'lucide-react';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../shared/lib/firebase';
import { useTenant } from '../../shared/hooks/useTenant';
import {
  saveRetentionConfig, getRetentionConfig, getInteractionLog,
  NOTIF_TITLES,
} from '../workflow/services/notificationService';
import type { NotificationType, NotificationChannelPrefs } from '../workflow/types';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

const ALL_TYPES: NotificationType[] = [
  'APPROVAL_REQUIRED', 'DOCUMENT_APPROVED', 'DOCUMENT_REJECTED',
  'DOCUMENT_SETTLED', 'KSEF_VERIFIED', 'STEP_TIMEOUT',
  'DOCUMENT_CANCELLED', 'CHANGES_REQUESTED',
];

const RETENTION_OPTIONS = [
  { days: 30, label: '30 dni' },
  { days: 90, label: '90 dni' },
  { days: 180, label: '6 miesięcy' },
  { days: 365, label: '1 rok' },
];

const DEFAULT_CHANNELS: Record<NotificationType, NotificationChannelPrefs> = {
  APPROVAL_REQUIRED: { auditLog: true, inApp: true, push: true, email: true },
  DOCUMENT_APPROVED: { auditLog: true, inApp: true, push: false, email: false },
  DOCUMENT_REJECTED: { auditLog: true, inApp: true, push: true, email: true },
  DOCUMENT_SETTLED: { auditLog: true, inApp: true, push: false, email: false },
  KSEF_VERIFIED: { auditLog: true, inApp: false, push: false, email: false },
  STEP_TIMEOUT: { auditLog: true, inApp: true, push: true, email: true },
  DOCUMENT_CANCELLED: { auditLog: true, inApp: true, push: false, email: false },
  CHANGES_REQUESTED: { auditLog: true, inApp: true, push: true, email: true },
};

const ACTION_LABELS: Record<string, string> = {
  viewed: 'Wyświetlono',
  clicked: 'Kliknięto',
  dismissed: 'Odrzucono',
};

const CHANNEL_LABELS: Record<string, string> = {
  in_app: 'In-App',
  email: 'Email',
  push: 'Push',
};

export default function NotificationRetentionAdmin() {
  const { activeTenantId } = useTenant();
  const [retentionDays, setRetentionDays] = useState(90);
  const [channels, setChannels] = useState<Record<NotificationType, NotificationChannelPrefs>>(DEFAULT_CHANNELS);
  const [interactionLog, setInteractionLog] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeTenantId) return;
    Promise.all([
      getRetentionConfig(activeTenantId),
      getDoc(doc(db, `tenants/${activeTenantId}/config/notificationChannelDefaults`)),
      getInteractionLog(activeTenantId, 10),
    ]).then(([retention, chanSnap, log]) => {
      setRetentionDays(retention.retentionDays);
      if (chanSnap.exists()) setChannels(chanSnap.data() as Record<NotificationType, NotificationChannelPrefs>);
      setInteractionLog(log);
    }).finally(() => setLoading(false));
  }, [activeTenantId]);

  const toggleChannel = (type: NotificationType, channel: keyof NotificationChannelPrefs) => {
    setChannels(prev => ({
      ...prev,
      [type]: { ...prev[type], [channel]: !prev[type][channel] },
    }));
  };

  const handleSave = async () => {
    if (!activeTenantId) return;
    setSaving(true);
    try {
      await saveRetentionConfig(activeTenantId, retentionDays);
      await setDoc(
        doc(db, `tenants/${activeTenantId}/config/notificationChannelDefaults`),
        { ...channels, updatedAt: serverTimestamp() },
        { merge: true }
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-slate-400">
        <RotateCcw className="animate-spin" size={20} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-indigo-50 rounded-2xl">
          <Bell size={20} className="text-indigo-600" />
        </div>
        <div>
          <h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-900">Powiadomienia — Admin</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Retencja logów · Kanały domyślne</p>
        </div>
      </div>

      {/* Retention */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Clock size={16} className="text-slate-500" />
          <h3 className="font-black uppercase tracking-widest text-[11px] text-slate-700">Retencja logów powiadomień</h3>
        </div>
        <div className="flex gap-3 flex-wrap">
          {RETENTION_OPTIONS.map(opt => (
            <button
              key={opt.days}
              onClick={() => setRetentionDays(opt.days)}
              className={`px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${
                retentionDays === opt.days
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 mt-4 font-medium">
          Logi interakcji z powiadomieniami będą automatycznie usuwane po {retentionDays} dniach (wymaga Cloud Function).
        </p>
      </div>

      {/* Channel defaults */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm overflow-x-auto">
        <div className="flex items-center gap-3 mb-6">
          <Monitor size={16} className="text-slate-500" />
          <h3 className="font-black uppercase tracking-widest text-[11px] text-slate-700">Domyślne kanały dostarczania</h3>
        </div>

        <table className="w-full text-left border-collapse min-w-[500px]">
          <thead>
            <tr>
              <th className="text-[9px] font-black text-slate-400 uppercase tracking-widest pb-4 pr-6 w-1/2">Typ zdarzenia</th>
              {(['inApp', 'push', 'email'] as (keyof NotificationChannelPrefs)[]).map(ch => (
                <th key={ch} className="text-[9px] font-black text-slate-400 uppercase tracking-widest pb-4 text-center">
                  {ch === 'inApp' ? <><Monitor size={10} className="inline mr-1" />In-App</> : ch === 'push' ? <><Smartphone size={10} className="inline mr-1" />Push</> : <><Mail size={10} className="inline mr-1" />Email</>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {ALL_TYPES.map(type => (
              <tr key={type}>
                <td className="py-3 pr-6">
                  <span className="text-[11px] font-bold text-slate-700">{NOTIF_TITLES[type]}</span>
                </td>
                {(['inApp', 'push', 'email'] as (keyof NotificationChannelPrefs)[]).map(ch => (
                  <td key={ch} className="py-3 text-center">
                    <button
                      onClick={() => toggleChannel(type, ch)}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center mx-auto transition-all ${
                        channels[type]?.[ch]
                          ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                          : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      <CheckCircle2 size={14} />
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <p className="text-[10px] text-slate-400 mt-4 font-medium">
          Ustawienia domyślne stosowane dla nowych użytkowników. Każdy użytkownik może nadpisać swoje preferencje.
        </p>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2.5 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all shadow-lg ${
            saved
              ? 'bg-emerald-500 text-white shadow-emerald-200'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200 disabled:opacity-50'
          }`}
        >
          {saved ? <><CheckCircle2 size={15} /> Zapisano</> : saving ? <><RotateCcw size={15} className="animate-spin" /> Zapisywanie...</> : <><Save size={15} /> Zapisz ustawienia</>}
        </button>
      </div>

      {/* Interaction log */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <h3 className="font-black uppercase tracking-widest text-[11px] text-slate-700 mb-6">Ostatnie interakcje (10)</h3>
        {interactionLog.length === 0 ? (
          <p className="text-[11px] text-slate-400 font-medium py-8 text-center">Brak zarejestrowanych interakcji</p>
        ) : (
          <div className="space-y-2">
            {interactionLog.map((entry, i) => {
              const ts = entry.timestamp?.toDate?.();
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-4 px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100"
                >
                  <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase ${
                    entry.action === 'viewed' ? 'bg-blue-50 text-blue-600' :
                    entry.action === 'clicked' ? 'bg-emerald-50 text-emerald-600' :
                    'bg-slate-200 text-slate-500'
                  }`}>
                    {ACTION_LABELS[entry.action] ?? entry.action}
                  </span>
                  <span className="text-[9px] font-black bg-slate-200 text-slate-500 px-2.5 py-1 rounded-full uppercase">
                    {CHANNEL_LABELS[entry.channel] ?? entry.channel}
                  </span>
                  <span className="text-xs text-slate-500 font-mono flex-1 truncate">{entry.userId}</span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase shrink-0">
                    {ts ? format(ts, 'd MMM HH:mm', { locale: pl }) : '—'}
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
