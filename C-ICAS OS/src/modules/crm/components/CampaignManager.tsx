import React, { useState, useEffect } from 'react';
import { Megaphone, RefreshCw, Plus, X, CheckCircle2, Send, Users, BarChart2 } from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

interface Props { tenantId: string }

interface Campaign {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'push';
  status: 'draft' | 'scheduled' | 'sent' | 'cancelled';
  subject?: string;
  body: string;
  targetSegment: string;
  targetTags: string[];
  scheduledAt?: string;
  sentAt?: any;
  recipientsCount: number;
  opensCount: number;
  clicksCount: number;
  createdAt?: any;
}

const TYPES = ['email', 'sms', 'push'] as const;
const SEGMENTS = ['all', 'active', 'prospect', 'churned', 'vip', 'b2c', 'b2b'] as const;

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  scheduled: 'bg-blue-100 text-blue-700',
  sent: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-500',
};

const TYPE_COLORS: Record<string, string> = {
  email: 'bg-indigo-100 text-indigo-700',
  sms: 'bg-green-100 text-green-700',
  push: 'bg-amber-100 text-amber-700',
};

const EMPTY_FORM = {
  name: '', type: 'email' as typeof TYPES[number], subject: '', body: '',
  targetSegment: 'all', targetTags: '', scheduledAt: '',
};

export default function CampaignManager({ tenantId }: Props) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [preview, setPreview] = useState<Campaign | null>(null);

  useEffect(() => {
    return onSnapshot(query(collection(db, `tenants/${tenantId}/campaigns`), where('tenantId', '==', tenantId)), snap => {
      setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() } as Campaign)));
      setLoading(false);
    });
  }, [tenantId]);

  const upd = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async (status: 'draft' | 'scheduled') => {
    if (!form.name.trim() || !form.body.trim()) return;
    setSaving(true);
    await addDoc(collection(db, `tenants/${tenantId}/campaigns`), {
      tenantId,
      name: form.name.trim(),
      type: form.type,
      subject: form.subject.trim() || null,
      body: form.body.trim(),
      targetSegment: form.targetSegment,
      targetTags: form.targetTags ? form.targetTags.split(',').map(t => t.trim()).filter(Boolean) : [],
      scheduledAt: form.scheduledAt || null,
      status,
      recipientsCount: 0, opensCount: 0, clicksCount: 0,
      createdAt: serverTimestamp(),
    });
    setSaving(false);
    setShowForm(false);
    setForm(EMPTY_FORM);
  };

  const markSent = async (c: Campaign) => {
    await updateDoc(doc(db, `tenants/${tenantId}/campaigns`, c.id), {
      status: 'sent', sentAt: serverTimestamp(),
    });
  };

  const cancelCampaign = async (c: Campaign) => {
    await updateDoc(doc(db, `tenants/${tenantId}/campaigns`, c.id), { status: 'cancelled' });
  };

  // KPIs
  const sent = campaigns.filter(c => c.status === 'sent');
  const totalRecipients = sent.reduce((s, c) => s + c.recipientsCount, 0);
  const totalOpens = sent.reduce((s, c) => s + c.opensCount, 0);
  const avgOpen = totalRecipients > 0 ? Math.round((totalOpens / totalRecipients) * 100) : 0;

  if (loading) return <div className="flex justify-center py-20"><RefreshCw size={20} className="animate-spin text-indigo-400" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Campaign Manager</h3>
          <p className="text-xs text-slate-500 mt-0.5">Email, SMS, Push — B2C masowe kampanie</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-5 py-3 rounded-2xl">
          <Plus size={13} /> Nowa kampania
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Kampanii', value: String(campaigns.length), color: 'text-slate-900', bg: 'bg-slate-50 border-slate-200' },
          { label: 'Wysłanych', value: String(sent.length), color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
          { label: 'Odbiorcy', value: String(totalRecipients), color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
          { label: 'Open rate', value: avgOpen + '%', color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
        ].map(k => (
          <div key={k.label} className={`rounded-2xl border p-5 ${k.bg}`}>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{k.label}</p>
            <p className={`text-2xl font-black mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* New campaign form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nowa kampania</p>
            <button onClick={() => setShowForm(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={14} /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nazwa kampanii *</label>
              <input value={form.name} onChange={e => upd('name', e.target.value)}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Kanał</label>
              <div className="flex gap-2 mt-1">
                {TYPES.map(t => (
                  <button key={t} onClick={() => upd('type', t)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${form.type === t ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Segment docelowy</label>
              <select value={form.targetSegment} onChange={e => upd('targetSegment', e.target.value)}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                {SEGMENTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            {form.type === 'email' && (
              <div className="col-span-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Temat emaila</label>
                <input value={form.subject} onChange={e => upd('subject', e.target.value)}
                  className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
              </div>
            )}
            <div className="col-span-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Treść {form.type === 'sms' ? `(${form.body.length}/160 znaków)` : ''}*
              </label>
              <textarea value={form.body} onChange={e => upd('body', e.target.value)} rows={4}
                maxLength={form.type === 'sms' ? 160 : undefined}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none resize-none" />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tagi targetowania</label>
              <input value={form.targetTags} onChange={e => upd('targetTags', e.target.value)} placeholder="vip, newsletter, b2c"
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Zaplanuj wysyłkę</label>
              <input type="datetime-local" value={form.scheduledAt} onChange={e => upd('scheduledAt', e.target.value)}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => handleSave('draft')} disabled={!form.name || !form.body || saving}
              className="flex items-center gap-2 border border-slate-200 text-slate-600 font-black text-xs px-5 py-3 rounded-xl disabled:opacity-40">
              Zapisz szkic
            </button>
            <button onClick={() => handleSave('scheduled')} disabled={!form.name || !form.body || saving}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-black text-xs px-5 py-3 rounded-xl">
              {saving ? <RefreshCw size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
              {form.scheduledAt ? 'Zaplanuj' : 'Aktywuj'}
            </button>
          </div>
        </div>
      )}

      {/* Preview panel */}
      {preview && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Podgląd: {preview.name}</p>
            <button onClick={() => setPreview(null)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={14} /></button>
          </div>
          {preview.subject && <div className="font-black text-slate-900 text-sm">Temat: {preview.subject}</div>}
          <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 whitespace-pre-wrap">{preview.body}</div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <Users size={11} /> Segment: {preview.targetSegment}
            {preview.targetTags.length > 0 && <span>· Tagi: {preview.targetTags.join(', ')}</span>}
          </div>
        </div>
      )}

      {/* Campaigns list */}
      {campaigns.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">Brak kampanii — stwórz pierwszą</div>
      ) : (
        <div className="space-y-3">
          {campaigns.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)).map(c => (
            <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <Megaphone size={18} className="text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-black text-slate-900">{c.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-lg ${TYPE_COLORS[c.type]}`}>{c.type.toUpperCase()}</span>
                  <span className="text-[9px] text-slate-400">→ {c.targetSegment}</span>
                </div>
              </div>
              {c.status === 'sent' && (
                <div className="flex items-center gap-4 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1"><Users size={10} /> {c.recipientsCount}</span>
                  <span className="flex items-center gap-1"><BarChart2 size={10} /> {c.opensCount > 0 ? Math.round((c.opensCount / Math.max(c.recipientsCount, 1)) * 100) + '%' : '—'}</span>
                </div>
              )}
              {c.scheduledAt && c.status === 'scheduled' && (
                <div className="text-[9px] text-blue-600 font-black">{new Date(c.scheduledAt).toLocaleDateString('pl-PL')}</div>
              )}
              <span className={`text-[9px] font-black px-3 py-1.5 rounded-lg ${STATUS_COLORS[c.status]}`}>{c.status}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPreview(c)} className="text-[9px] font-black px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">Podgląd</button>
                {(c.status === 'draft' || c.status === 'scheduled') && (
                  <>
                    <button onClick={() => markSent(c)} className="flex items-center gap-1 text-[9px] font-black px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
                      <Send size={10} /> Wyślij
                    </button>
                    <button onClick={() => cancelCampaign(c)} className="text-[9px] font-black px-3 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100">Anuluj</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
