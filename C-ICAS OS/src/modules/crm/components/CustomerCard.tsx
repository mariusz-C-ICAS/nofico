import React, { useState, useEffect } from 'react';
import {
  X, Phone, Mail, Globe, MapPin, Building2,
  Clock, TrendingUp, Zap,
} from 'lucide-react';
import CustomerTimeline from './CustomerTimeline';
import CustomerEmailPanel from './CustomerEmailPanel';
import CustomerAttachments from './CustomerAttachments';
import { subscribeCustomerTasks, getCustomerServiceEvents } from '../services/crmService';
import { computeLeadScore, scoreLabel, detectUpsellOpportunity } from '../services/leadScoringService';
import type { CrmTask } from '../types';
import { TASK_TYPE_META } from '../types';

interface Customer {
  id: string;
  tenantId?: string;
  name: string;
  nip?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  industry?: string;
  status?: string;
  tags?: string[];
  totalRevenue?: number;
  currency?: string;
  lastActivityAt?: any;
  serviceEventCount?: number;
  value?: string;
}

interface Props {
  customer: Customer;
  tenantId: string;
  onClose: () => void;
}

type Tab = 'timeline' | 'tasks' | 'score' | 'service' | 'email' | 'files';

export default function CustomerCard({ customer, tenantId, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('timeline');
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [serviceEvents, setServiceEvents] = useState<any[]>([]);
  const [scoreData, setScoreData] = useState<ReturnType<typeof computeLeadScore> | null>(null);
  const [upsell, setUpsell] = useState<ReturnType<typeof detectUpsellOpportunity> | null>(null);

  const clientId = customer.id;

  useEffect(() => {
    const unsub = subscribeCustomerTasks(tenantId, customer.id, setTasks);
    getCustomerServiceEvents(tenantId, clientId).then(ev => {
      setServiceEvents(ev);
      const lastActivity = customer.lastActivityAt?.toDate
        ? customer.lastActivityAt.toDate().getTime()
        : null;
      const score = computeLeadScore({
        lastActivityMs: lastActivity,
        totalRevenue: customer.totalRevenue ?? 0,
        hasActiveDeal: false,
        serviceEventCount: ev.length,
        activityCount30Days: 0,
      });
      setScoreData(score);
      const up = detectUpsellOpportunity({
        customerId: customer.id,
        customerName: customer.name,
        serviceEventCount: ev.length,
        hasActiveContract: false,
        totalRevenue: customer.totalRevenue ?? 0,
        lastServiceDate: ev[0]?.scheduledStart ?? null,
        tags: customer.tags ?? [],
      });
      setUpsell(up);
    });
    return unsub;
  }, [tenantId, customer.id]);

  const score = scoreData?.total ?? 0;
  const sl = scoreLabel(score);

  const fmtDate = (ts: any) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'timeline', label: 'Timeline' },
    { id: 'tasks',    label: `Zadania (${tasks.length})` },
    { id: 'score',    label: 'Lead Score' },
    { id: 'service',  label: `Serwis (${serviceEvents.length})` },
    { id: 'email',    label: 'Email' },
    { id: 'files',    label: 'Pliki' },
  ];

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden max-h-[85vh] flex flex-col">
      {/* Header */}
      <div className="bg-indigo-600 px-6 py-5 text-white flex items-start gap-4">
        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
          <Building2 size={22} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-black uppercase tracking-tighter leading-none">{customer.name}</h3>
          {customer.industry && <p className="text-indigo-200 text-xs mt-0.5">{customer.industry}</p>}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${sl.bg} ${sl.color}`}>
              Score {score} · {sl.label}
            </span>
            {upsell?.shouldFlag && (
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 flex items-center gap-1">
                <Zap size={8} /> Upsell
              </span>
            )}
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-xl">
          <X size={16} />
        </button>
      </div>

      {/* Contact info */}
      <div className="px-6 py-3 border-b border-slate-100 flex gap-6 flex-wrap text-[10px] text-slate-600">
        {customer.email && (
          <a href={`mailto:${customer.email}`} className="flex items-center gap-1.5 hover:text-indigo-600">
            <Mail size={11} /> {customer.email}
          </a>
        )}
        {customer.phone && (
          <a href={`tel:${customer.phone}`} className="flex items-center gap-1.5 hover:text-emerald-600">
            <Phone size={11} /> {customer.phone}
          </a>
        )}
        {customer.city && (
          <span className="flex items-center gap-1.5">
            <MapPin size={11} /> {customer.city}
          </span>
        )}
        {customer.totalRevenue ? (
          <span className="flex items-center gap-1.5 font-black text-slate-800">
            <TrendingUp size={11} className="text-indigo-500" />
            {customer.totalRevenue.toLocaleString('pl-PL')} {customer.currency ?? 'PLN'}
          </span>
        ) : null}
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 px-6 pt-3 border-b border-slate-100">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${
              tab === t.id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'timeline' && (
          <CustomerTimeline tenantId={tenantId} customerId={customer.id} clientId={clientId} />
        )}

        {tab === 'tasks' && (
          <div className="space-y-2">
            {tasks.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">Brak otwartych zadań.</p>
            )}
            {tasks.map(task => {
              const tm = TASK_TYPE_META[task.type];
              const isOverdue = task.dueDate?.toDate
                ? task.dueDate.toDate() < new Date() : false;
              return (
                <div key={task.id} className={`flex items-start gap-3 p-3 rounded-2xl border ${isOverdue ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-base">{tm.icon}</span>
                  <div className="flex-1">
                    <p className="text-xs font-black text-slate-800">{task.title}</p>
                    <p className={`text-[10px] flex items-center gap-1 mt-0.5 ${isOverdue ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                      <Clock size={9} /> {fmtDate(task.dueDate)}
                      {isOverdue && ' — PRZETERMINOWANE'}
                    </p>
                  </div>
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${
                    task.priority === 'high' ? 'bg-red-100 text-red-700' :
                    task.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-500'
                  }`}>{task.priority}</span>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'score' && scoreData && (
          <div className="space-y-4">
            {/* Big score */}
            <div className={`text-center p-6 rounded-2xl ${sl.bg}`}>
              <p className="text-5xl font-black text-slate-900">{score}</p>
              <p className={`text-sm font-black uppercase tracking-widest mt-1 ${sl.color}`}>{sl.label}</p>
            </div>
            {/* Breakdown */}
            {([
              { label: 'Aktywność (ostatnia)', max: 25, val: scoreData.recency },
              { label: 'Przychód',             max: 30, val: scoreData.revenue },
              { label: 'Pipeline / Deal',      max: 25, val: scoreData.pipeline },
              { label: 'Wizyty serwisowe',     max: 15, val: scoreData.serviceFrequency },
              { label: 'Zaangażowanie 30 dni', max: 5,  val: scoreData.engagement },
            ]).map(({ label, max, val }) => (
              <div key={label}>
                <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-1">
                  <span>{label}</span><span>{val}/{max}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${(val / max) * 100}%` }} />
                </div>
              </div>
            ))}
            {upsell?.shouldFlag && (
              <div className="bg-yellow-50 rounded-2xl p-4 border border-yellow-200">
                <p className="text-xs font-black text-yellow-800 flex items-center gap-1.5 mb-1"><Zap size={12} /> Szansa upsell</p>
                <p className="text-[10px] text-yellow-700">{upsell.reason}</p>
                <p className="text-[10px] font-bold text-yellow-800 mt-1">→ {upsell.suggestedAction}</p>
              </div>
            )}
          </div>
        )}

        {tab === 'files' && (
          <CustomerAttachments tenantId={tenantId} customerId={customer.id} />
        )}

        {tab === 'email' && (
          <CustomerEmailPanel
            tenantId={tenantId}
            customerId={customer.id}
            customerName={customer.name}
            customerEmail={customer.email}
          />
        )}

        {tab === 'service' && (
          <div className="space-y-2">
            {serviceEvents.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">Brak wizyt serwisowych.</p>
            )}
            {serviceEvents.map(e => (
              <div key={e.id} className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: e.serviceTypeColor ?? '#6366f1' }} />
                <div className="flex-1">
                  <p className="text-xs font-black text-slate-800">{e.serviceTypeName}</p>
                  <p className="text-[10px] text-slate-500">{fmtDate(e.scheduledStart)} · {e.location?.address}</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">{e.status}</p>
                </div>
                {e.price && (
                  <span className="text-[10px] font-black text-slate-700">{e.price.toLocaleString('pl-PL')} {e.currency}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
