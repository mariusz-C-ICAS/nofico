import React, { useState, useEffect } from 'react';
import {
  Phone, Mail, Users, FileText, Wrench, Trophy, XCircle,
  Star, MessageSquare, Plus, RefreshCw, Edit3,
} from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { subscribeCustomerActivities, addActivity, getCustomerServiceEvents } from '../services/crmService';
import type { CrmActivity, ActivityType } from '../types';
import { ACTIVITY_META } from '../types';

const TYPE_ICONS: Record<ActivityType, React.ElementType> = {
  note: Edit3, call: Phone, email: Mail, meeting: Users,
  service_visit: Wrench, quote_sent: FileText,
  deal_won: Trophy, deal_lost: XCircle, nps_response: Star,
};

interface Props {
  tenantId: string;
  customerId: string;
  clientId: string;
}

export default function CustomerTimeline({ tenantId, customerId, clientId }: Props) {
  const { user } = useAuth() as any;
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [serviceEvents, setServiceEvents] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<ActivityType>('note');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = subscribeCustomerActivities(tenantId, customerId, setActivities);
    getCustomerServiceEvents(tenantId, clientId).then(setServiceEvents);
    return unsub;
  }, [tenantId, customerId, clientId]);

  const handleAdd = async () => {
    if (!title.trim() || !user) return;
    setSaving(true);
    try {
      await addActivity(tenantId, {
        tenantId, customerId, type, title: title.trim(), body: body.trim() || undefined,
        createdBy: user.uid, createdByEmail: user.email ?? '',
      });
      setTitle(''); setBody(''); setShowForm(false);
    } finally { setSaving(false); }
  };

  const fmtDate = (ts: any) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Merge CRM activities + service events into unified timeline
  type TimelineItem = { ts: number; kind: 'activity' | 'service'; data: any };
  const timeline: TimelineItem[] = [
    ...activities.map(a => ({
      ts: a.createdAt?.toDate ? a.createdAt.toDate().getTime() : Date.now(),
      kind: 'activity' as const,
      data: a,
    })),
    ...serviceEvents.map(e => ({
      ts: e.scheduledStart?.toDate ? e.scheduledStart.toDate().getTime() : Date.now(),
      kind: 'service' as const,
      data: e,
    })),
  ].sort((a, b) => b.ts - a.ts);

  return (
    <div className="space-y-4">
      {/* Add activity */}
      {showForm ? (
        <div className="bg-slate-50 rounded-2xl p-4 space-y-3 border border-slate-200">
          <div className="flex gap-2 flex-wrap">
            {(['note', 'call', 'email', 'meeting', 'quote_sent'] as ActivityType[]).map(t => {
              const meta = ACTIVITY_META[t];
              return (
                <button key={t} onClick={() => setType(t)}
                  className={`text-[9px] font-black px-3 py-1.5 rounded-full border transition-all ${
                    type === t ? `${meta.bg} ${meta.color} border-current` : 'bg-white text-slate-500 border-slate-200'
                  }`}>
                  {meta.label}
                </button>
              );
            })}
          </div>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Tytuł / temat *"
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={2}
            placeholder="Szczegóły (opcjonalnie)..."
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none resize-none" />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="text-xs font-bold text-slate-400 hover:text-slate-600 px-3 py-1.5">Anuluj</button>
            <button onClick={handleAdd} disabled={!title.trim() || saving}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-black text-xs px-4 py-1.5 rounded-xl">
              {saving ? <RefreshCw size={10} className="animate-spin" /> : null}
              Dodaj
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest">
          <Plus size={12} /> Dodaj aktywność
        </button>
      )}

      {/* Timeline */}
      <div className="relative space-y-0">
        {timeline.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-8">Brak aktywności. Dodaj pierwszą notatkę lub zarejestruj rozmowę.</p>
        )}
        {timeline.map((item, i) => {
          if (item.kind === 'activity') {
            const a = item.data as CrmActivity;
            const meta = ACTIVITY_META[a.type];
            const Icon = TYPE_ICONS[a.type];
            return (
              <div key={a.id} className="flex gap-3 pb-4 relative">
                {i < timeline.length - 1 && (
                  <div className="absolute left-4 top-8 bottom-0 w-px bg-slate-100" />
                )}
                <div className={`w-8 h-8 rounded-full ${meta.bg} flex items-center justify-center flex-shrink-0 z-10`}>
                  <Icon size={13} className={meta.color} />
                </div>
                <div className="flex-1 pt-0.5">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>{meta.label}</span>
                    <span className="text-[9px] text-slate-400">{fmtDate(a.createdAt)}</span>
                  </div>
                  <p className="text-xs font-black text-slate-800">{a.title}</p>
                  {a.body && <p className="text-[11px] text-slate-500 mt-0.5">{a.body}</p>}
                </div>
              </div>
            );
          } else {
            const e = item.data;
            return (
              <div key={e.id} className="flex gap-3 pb-4 relative">
                {i < timeline.length - 1 && (
                  <div className="absolute left-4 top-8 bottom-0 w-px bg-slate-100" />
                )}
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 z-10">
                  <Wrench size={13} className="text-emerald-700" />
                </div>
                <div className="flex-1 pt-0.5">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Wizyta serwisowa</span>
                    <span className="text-[9px] text-slate-400">{fmtDate(e.scheduledStart)}</span>
                  </div>
                  <p className="text-xs font-black text-slate-800">{e.serviceTypeName}</p>
                  <p className="text-[11px] text-slate-500">{e.location?.address} · {e.status}</p>
                </div>
              </div>
            );
          }
        })}
      </div>
    </div>
  );
}
