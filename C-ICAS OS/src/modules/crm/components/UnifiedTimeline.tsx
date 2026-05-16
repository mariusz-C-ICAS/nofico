import React, { useState, useEffect } from 'react';
import {
  Clock, RefreshCw, Phone, Mail, Calendar, FileText,
  Star, DollarSign, AlertTriangle, CheckSquare, MessageSquare,
  Users, ChevronDown
} from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface Props { tenantId: string; onSelectCustomer?: (c: any) => void }

interface TimelineEvent {
  id: string;
  customerId?: string;
  customerName?: string;
  type: string;
  title: string;
  description?: string;
  createdAt?: any;
  createdBy?: string;
  source: string;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  call: Phone, email: Mail, meeting: Calendar, note: MessageSquare,
  quote: FileText, deal: DollarSign, nps: Star, task: CheckSquare,
  activity: Clock, sla: AlertTriangle,
};

const TYPE_COLORS: Record<string, string> = {
  call: 'bg-blue-100 text-blue-700', email: 'bg-indigo-100 text-indigo-700',
  meeting: 'bg-violet-100 text-violet-700', note: 'bg-slate-100 text-slate-700',
  quote: 'bg-amber-100 text-amber-700', deal: 'bg-emerald-100 text-emerald-700',
  nps: 'bg-pink-100 text-pink-700', task: 'bg-teal-100 text-teal-700',
  activity: 'bg-orange-100 text-orange-700', sla: 'bg-red-100 text-red-700',
};

const TYPE_LABELS: Record<string, string> = {
  call: 'Telefon', email: 'Email', meeting: 'Spotkanie', note: 'Notatka',
  quote: 'Oferta', deal: 'Deal', nps: 'NPS', task: 'Zadanie',
  activity: 'Aktywnosc', sla: 'SLA',
};

function fmtDate(ts: any): string {
  const d = ts?.toDate?.() ?? (ts ? new Date(ts) : null);
  if (!d) return '-';
  return d.toLocaleDateString('pl-PL', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
    d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

function fmtRelative(ts: any): string {
  const d = ts?.toDate?.() ?? (ts ? new Date(ts) : null);
  if (!d) return '';
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days === 0) return 'dzisiaj';
  if (days === 1) return 'wczoraj';
  if (days < 7) return days + 'd temu';
  if (days < 30) return Math.floor(days / 7) + 'tyg. temu';
  return Math.floor(days / 30) + 'mies. temu';
}

export default function UnifiedTimeline({ tenantId, onSelectCustomer }: Props) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchCustomer, setSearchCustomer] = useState('');
  const [displayCount, setDisplayCount] = useState(30);

  const load = async () => {
    setLoading(true);
    const tenantPath = 'tenants/' + tenantId;
    const [actSnap, taskSnap, npsSnap, dealSnap] = await Promise.all([
      getDocs(query(collection(db, tenantPath + '/crmActivities'), where('tenantId', '==', tenantId))),
      getDocs(query(collection(db, tenantPath + '/crmTasks'), where('tenantId', '==', tenantId))),
      getDocs(query(collection(db, tenantPath + '/npsResponses'), where('tenantId', '==', tenantId))),
      getDocs(query(collection(db, 'deals'), where('tenantId', '==', tenantId))),
    ]);

    const timeline: TimelineEvent[] = [];

    actSnap.docs.forEach(d => {
      const data = d.data();
      timeline.push({
        id: d.id, customerId: data.customerId, customerName: data.customerName,
        type: data.type ?? 'activity', title: data.subject ?? data.type ?? 'Aktywnosc',
        description: data.body ?? data.notes, createdAt: data.createdAt,
        createdBy: data.createdBy, source: 'activity',
      });
    });

    taskSnap.docs.forEach(d => {
      const data = d.data();
      timeline.push({
        id: 'task_' + d.id, customerId: data.customerId, customerName: data.customerName,
        type: 'task', title: data.title ?? 'Zadanie',
        description: data.isDone ? 'Zakonczone' : 'Otwarte',
        createdAt: data.createdAt ?? data.dueDate, source: 'task',
      });
    });

    npsSnap.docs.forEach(d => {
      const data = d.data();
      timeline.push({
        id: 'nps_' + d.id, customerId: data.customerId, customerName: data.customerName,
        type: 'nps', title: 'NPS: ' + data.score + '/10', description: data.comment,
        createdAt: data.createdAt, source: 'nps',
      });
    });

    dealSnap.docs.forEach(d => {
      const data = d.data();
      if (data.stage === 'closed_won' || data.stage === 'closed_lost') {
        const stageName = data.stage === 'closed_won' ? 'wygrany' : 'przegrany';
        timeline.push({
          id: 'deal_' + d.id, customerId: data.customerId, customerName: data.customerName,
          type: 'deal', title: 'Deal ' + stageName + ': ' + (data.name ?? ''),
          description: data.value ? data.value.toLocaleString('pl-PL') + ' PLN' : undefined,
          createdAt: data.closedAt ?? data.updatedAt, source: 'deal',
        });
      }
    });

    timeline.sort((a, b) => {
      const da = a.createdAt?.toDate?.() ?? (a.createdAt ? new Date(a.createdAt) : new Date(0));
      const dbDate = b.createdAt?.toDate?.() ?? (b.createdAt ? new Date(b.createdAt) : new Date(0));
      return dbDate.getTime() - da.getTime();
    });

    setEvents(timeline);
    setLoading(false);
  };

  useEffect(() => { load(); }, [tenantId]);

  const types = Array.from(new Set(events.map(e => e.type)));
  const filtered = events.filter(e => {
    if (typeFilter !== 'all' && e.type !== typeFilter) return false;
    if (searchCustomer && !e.customerName?.toLowerCase().includes(searchCustomer.toLowerCase())) return false;
    return true;
  });

  if (loading) return <div className="flex justify-center py-20"><RefreshCw size={20} className="animate-spin text-indigo-400" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Unified Timeline</h3>
          <p className="text-xs text-slate-500 mt-0.5">{events.length} zdarzen: aktywnosci, zadania, NPS, deale</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest">
          <RefreshCw size={13} /> Odswiez
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Users size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={searchCustomer} onChange={e => setSearchCustomer(e.target.value)}
            placeholder="Filtruj klienta..."
            className="pl-8 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none w-40" />
        </div>
        <div className="flex flex-wrap gap-1 bg-slate-100 rounded-xl p-1">
          <button onClick={() => setTypeFilter('all')}
            className={'px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ' + (typeFilter === 'all' ? 'bg-white text-slate-900 shadow' : 'text-slate-500')}>
            Wszystkie
          </button>
          {types.map(t => {
            const Icon = TYPE_ICONS[t] ?? Clock;
            return (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={'flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ' + (typeFilter === t ? 'bg-white text-slate-900 shadow' : 'text-slate-500')}>
                <Icon size={9} /> {TYPE_LABELS[t] ?? t}
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">Brak zdarzen</div>
      ) : (
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-100" />
          <div className="space-y-4 pl-14">
            {filtered.slice(0, displayCount).map(e => {
              const Icon = TYPE_ICONS[e.type] ?? Clock;
              const colorClass = TYPE_COLORS[e.type] ?? 'bg-slate-100 text-slate-700';
              return (
                <div key={e.id} className="relative group">
                  <div className={'absolute -left-9 w-8 h-8 rounded-full flex items-center justify-center ' + colorClass}>
                    <Icon size={13} />
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-100 group-hover:border-slate-200 p-4 transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="text-xs font-black text-slate-900">{e.title}</span>
                          <span className={'text-[8px] font-black px-1.5 py-0.5 rounded-full ' + colorClass}>{TYPE_LABELS[e.type] ?? e.type}</span>
                        </div>
                        {e.customerName && (
                          <button onClick={() => onSelectCustomer?.({ id: e.customerId, name: e.customerName })}
                            className="text-[10px] font-black text-indigo-600 hover:text-indigo-800">
                            {e.customerName}
                          </button>
                        )}
                        {e.description && <p className="text-[10px] text-slate-500 mt-0.5">{e.description}</p>}
                        {e.createdBy && <p className="text-[9px] text-slate-400 mt-0.5">przez: {e.createdBy}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[9px] font-black text-slate-500">{fmtRelative(e.createdAt)}</p>
                        <p className="text-[8px] text-slate-400">{fmtDate(e.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {filtered.length > displayCount && (
            <button onClick={() => setDisplayCount(d => d + 30)}
              className="mt-4 ml-14 flex items-center gap-2 text-[10px] font-black text-indigo-600 hover:text-indigo-800">
              <ChevronDown size={12} /> Zaladuj wiecej ({filtered.length - displayCount} pozostalych)
            </button>
          )}
        </div>
      )}
    </div>
  );
}