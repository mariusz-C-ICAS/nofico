import React, { useState, useEffect } from 'react';
import { Star, RefreshCw, Plus, Send } from 'lucide-react';
import { subscribeNpsResponses, addNpsResponse } from '../services/crmService';
import type { NpsResponse } from '../types';

interface Props { tenantId: string }

function NpsScore({ score }: { score: number }) {
  const color = score >= 9 ? 'text-emerald-600 bg-emerald-100' :
                score >= 7 ? 'text-blue-600 bg-blue-100' :
                             'text-red-600 bg-red-100';
  return (
    <span className={`text-sm font-black w-8 h-8 rounded-full flex items-center justify-center ${color}`}>
      {score}
    </span>
  );
}

export default function NpsPanel({ tenantId }: Props) {
  const [responses, setResponses] = useState<NpsResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ customerId: '', customerName: '', score: '9', comment: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return subscribeNpsResponses(tenantId, r => { setResponses(r); setLoading(false); });
  }, [tenantId]);

  const handleAdd = async () => {
    if (!form.customerId || !form.customerName) return;
    setSaving(true);
    await addNpsResponse(tenantId, {
      tenantId, customerId: form.customerId, customerName: form.customerName,
      score: parseInt(form.score), comment: form.comment || undefined,
      sentAt: new Date(),
    });
    setForm({ customerId: '', customerName: '', score: '9', comment: '' });
    setShowForm(false);
    setSaving(false);
  };

  const promoters  = responses.filter(r => r.score >= 9).length;
  const passives   = responses.filter(r => r.score >= 7 && r.score <= 8).length;
  const detractors = responses.filter(r => r.score <= 6).length;
  const total      = responses.length;
  const nps        = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : null;

  const fmtDate = (ts: any) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">NPS & Satysfakcja Klienta</h3>
          <p className="text-xs text-slate-500 mt-0.5">{total} odpowiedzi · Net Promoter Score</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black px-5 py-2.5 rounded-2xl text-xs uppercase tracking-widest">
          <Plus size={13} /> Dodaj ocenę
        </button>
      </div>

      {/* NPS Score */}
      {total > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <div className={`col-span-1 rounded-2xl p-5 text-center border ${
            nps !== null && nps >= 50 ? 'bg-emerald-50 border-emerald-200' :
            nps !== null && nps >= 0  ? 'bg-amber-50 border-amber-200' :
                                        'bg-red-50 border-red-200'
          }`}>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">NPS</p>
            <p className={`text-4xl font-black ${nps !== null && nps >= 50 ? 'text-emerald-700' : nps !== null && nps >= 0 ? 'text-amber-700' : 'text-red-700'}`}>
              {nps !== null ? nps : '—'}
            </p>
          </div>
          {[
            { label: 'Promotorzy (9-10)', count: promoters, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
            { label: 'Pasywni (7-8)',     count: passives,  color: 'text-blue-600 bg-blue-50 border-blue-200' },
            { label: 'Krytycy (0-6)',     count: detractors, color: 'text-red-600 bg-red-50 border-red-200' },
          ].map(({ label, count, color }) => (
            <div key={label} className={`rounded-2xl p-5 border ${color}`}>
              <p className="text-[9px] font-black uppercase tracking-widest mb-1">{label}</p>
              <p className="text-3xl font-black">{count}</p>
              <p className="text-[10px] font-bold mt-0.5">{total > 0 ? Math.round((count / total) * 100) : 0}%</p>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input value={form.customerName} onChange={e => setForm(p => ({ ...p, customerName: e.target.value }))}
              placeholder="Nazwa klienta *"
              className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none" />
            <input value={form.customerId} onChange={e => setForm(p => ({ ...p, customerId: e.target.value }))}
              placeholder="ID klienta *"
              className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none font-mono text-xs" />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Ocena (0-10)</p>
            <div className="flex gap-1">
              {Array.from({ length: 11 }, (_, i) => (
                <button key={i} onClick={() => setForm(p => ({ ...p, score: String(i) }))}
                  className={`flex-1 py-2 rounded-xl text-xs font-black border transition-all ${
                    form.score === String(i)
                      ? i >= 9 ? 'bg-emerald-500 text-white border-emerald-500' :
                        i >= 7 ? 'bg-blue-500 text-white border-blue-500' :
                                 'bg-red-500 text-white border-red-500'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}>
                  {i}
                </button>
              ))}
            </div>
          </div>
          <textarea value={form.comment} onChange={e => setForm(p => ({ ...p, comment: e.target.value }))} rows={2}
            placeholder="Komentarz klienta (opcjonalnie)..."
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none resize-none" />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="text-xs font-bold text-slate-400 px-3 py-1.5">Anuluj</button>
            <button onClick={handleAdd} disabled={!form.customerId || !form.customerName || saving}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-black text-xs px-5 py-1.5 rounded-xl">
              {saving ? <RefreshCw size={10} className="animate-spin" /> : <Send size={10} />}
              Zapisz
            </button>
          </div>
        </div>
      )}

      {loading && <div className="flex justify-center py-10"><RefreshCw size={20} className="animate-spin text-indigo-400" /></div>}

      {/* Responses list */}
      <div className="space-y-2">
        {responses.map(r => (
          <div key={r.id} className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-slate-200">
            <NpsScore score={r.score} />
            <div className="flex-1">
              <p className="text-xs font-black text-slate-800">{r.customerName}</p>
              {r.comment && <p className="text-[11px] text-slate-600 mt-0.5 italic">"{r.comment}"</p>}
            </div>
            <span className="text-[9px] text-slate-400 flex-shrink-0">{fmtDate(r.respondedAt)}</span>
          </div>
        ))}
        {!loading && responses.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-6">Brak ocen NPS. Zbieraj opinie po każdej wizycie serwisowej.</p>
        )}
      </div>
    </div>
  );
}
