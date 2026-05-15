import React, { useEffect, useState } from 'react';
import { X, Bell, FileText, Save, LogIn, Smartphone, BookOpen } from 'lucide-react';
import type { NotificationType, NotificationPrefs, NotificationChannelPrefs } from '../types';
import {
  getNotificationPrefs,
  saveNotificationPrefs,
  NOTIF_TITLES,
} from '../services/notificationService';

interface Props {
  userId: string;
  tenantId: string;
  onClose: () => void;
}

const NOTIFICATION_GROUPS: { label: string; types: NotificationType[] }[] = [
  {
    label: 'Zatwierdzenia',
    types: ['APPROVAL_REQUIRED', 'DOCUMENT_APPROVED', 'DOCUMENT_REJECTED', 'CHANGES_REQUESTED'],
  },
  {
    label: 'Finanse',
    types: ['KSEF_VERIFIED', 'DOCUMENT_SETTLED'],
  },
  {
    label: 'Alerty',
    types: ['STEP_TIMEOUT', 'DOCUMENT_CANCELLED'],
  },
];

const CHANNEL_LABELS: Record<keyof NotificationChannelPrefs, { label: string; icon: React.ReactNode; hint: string }> = {
  auditLog: {
    label: 'Audit Log',
    icon: <BookOpen size={12} />,
    hint: 'Zawsze zapisywany — wymóg prawny',
  },
  inApp: {
    label: 'In-App',
    icon: <Bell size={12} />,
    hint: 'Dzwonek w aplikacji',
  },
  push: {
    label: 'Push',
    icon: <Smartphone size={12} />,
    hint: 'Powiadomienie systemowe',
  },
};

const DEFAULT_CHANNELS: NotificationChannelPrefs = {
  auditLog: true,
  inApp: true,
  push: false,
};

export default function NotificationPrefsModal({ userId, tenantId, onClose }: Props) {
  const [prefs, setPrefs] = useState<NotificationPrefs['channels']>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getNotificationPrefs(userId, tenantId).then(p => {
      setPrefs(p.channels);
      setLoading(false);
    });
  }, [userId, tenantId]);

  const getChannel = (type: NotificationType): NotificationChannelPrefs => {
    return prefs[type] ?? DEFAULT_CHANNELS;
  };

  const toggle = (type: NotificationType, channel: keyof NotificationChannelPrefs) => {
    if (channel === 'auditLog') return;
    setPrefs(prev => ({
      ...prev,
      [type]: {
        ...getChannel(type),
        [channel]: !getChannel(type)[channel],
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    await saveNotificationPrefs(userId, tenantId, prefs);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-8 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">
              Preferencje Powiadomień
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Konfiguracja per typ zdarzenia
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-300">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-indigo-500" />
          </div>
        ) : (
          <div className="overflow-y-auto max-h-[60vh]">
            {/* Channel legend */}
            <div className="px-8 py-4 bg-slate-50 border-b border-slate-100 grid grid-cols-4 gap-4">
              <div className="text-[9px] font-black text-slate-400 uppercase">Zdarzenie</div>
              {(Object.entries(CHANNEL_LABELS) as [keyof NotificationChannelPrefs, typeof CHANNEL_LABELS[keyof NotificationChannelPrefs]][]).map(
                ([key, cfg]) => (
                  <div key={key} className="text-center">
                    <div className="flex items-center justify-center gap-1 text-[9px] font-black text-slate-500 uppercase">
                      {cfg.icon} {cfg.label}
                    </div>
                    <div className="text-[8px] text-slate-300 mt-0.5">{cfg.hint}</div>
                  </div>
                )
              )}
            </div>

            {NOTIFICATION_GROUPS.map(group => (
              <div key={group.label}>
                <div className="px-8 py-3 bg-slate-50 border-b border-slate-100">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                    {group.label}
                  </span>
                </div>
                {group.types.map(type => {
                  const ch = getChannel(type);
                  return (
                    <div
                      key={type}
                      className="px-8 py-4 grid grid-cols-4 gap-4 items-center border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="text-xs font-bold text-slate-700">
                        {NOTIF_TITLES[type]}
                      </div>
                      {(Object.keys(CHANNEL_LABELS) as (keyof NotificationChannelPrefs)[]).map(channel => (
                        <div key={channel} className="flex justify-center">
                          <button
                            onClick={() => toggle(type, channel)}
                            disabled={channel === 'auditLog'}
                            className={`w-10 h-6 rounded-full transition-all relative ${
                              ch[channel]
                                ? 'bg-indigo-600'
                                : 'bg-slate-200'
                            } ${channel === 'auditLog' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            <span
                              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                ch[channel] ? 'translate-x-4' : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        <div className="p-8 border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-2xl text-xs font-black uppercase text-slate-500 hover:bg-slate-100 transition-colors"
          >
            Anuluj
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all disabled:opacity-50 shadow-xl"
          >
            <Save size={14} />
            {saved ? 'Zapisano!' : saving ? 'Zapisuję...' : 'Zapisz'}
          </button>
        </div>
      </div>
    </div>
  );
}
