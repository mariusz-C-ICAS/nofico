import React, { useState, useRef, useEffect } from 'react';
import { PenLine, Copy, Check, RefreshCw, CheckCircle2, Link, Trash2 } from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import {
  collection, addDoc, onSnapshot, query, where,
  orderBy, serverTimestamp, updateDoc, doc
} from 'firebase/firestore';
import { useAuth } from '../../../shared/hooks/AuthContext';

interface Props { tenantId: string }

interface ESignRequest {
  id: string;
  tenantId: string;
  quoteTitle: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  currency: string;
  token: string;
  status: 'pending' | 'signed' | 'rejected';
  signedAt?: any;
  signatureData?: string;
  createdAt: any;
}

function generateToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function QuoteESign({ tenantId }: Props) {
  const { user } = useAuth() as any;
  const [requests, setRequests] = useState<ESignRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [form, setForm] = useState({ quoteTitle: '', customerName: '', customerEmail: '', amount: '', currency: 'PLN' });

  useEffect(() => {
    return onSnapshot(
      query(collection(db, `tenants/${tenantId}/esignRequests`), where('tenantId', '==', tenantId), orderBy('createdAt', 'desc')),
      snap => { setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as ESignRequest))); setLoading(false); }
    );
  }, [tenantId]);

  const getSignUrl = (token: string) => `${window.location.origin}/sign/${token}`;

  const handleCreate = async () => {
    if (!form.quoteTitle || !form.customerName || !form.customerEmail) return;
    setSaving(true);
    const token = generateToken();
    await addDoc(collection(db, `tenants/${tenantId}/esignRequests`), {
      tenantId,
      quoteTitle: form.quoteTitle.trim(),
      customerName: form.customerName.trim(),
      customerEmail: form.customerEmail.trim(),
      amount: parseFloat(form.amount) || 0,
      currency: form.currency,
      token,
      status: 'pending',
      createdBy: user?.uid ?? '',
      createdAt: serverTimestamp(),
    });
    setForm({ quoteTitle: '', customerName: '', customerEmail: '', amount: '', currency: 'PLN' });
    setShowForm(false);
    setSaving(false);
  };

  const handleCopy = async (token: string) => {
    await navigator.clipboard.writeText(getSignUrl(token));
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  const STATUS_META: Record<ESignRequest['status'], { label: string; color: string; bg: string }> = {
    pending:  { label: 'Oczekuje',  color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200' },
    signed:   { label: 'Podpisano', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
    rejected: { label: 'Odrzucono', color: 'text-red-700',     bg: 'bg-red-50 border-red-200' },
  };

  const fmt = (n: number) => n.toLocaleString('pl-PL', { maximumFractionDigits: 0 });
  const fmtDate = (ts: any) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Podpisywanie Ofert Online</h3>
          <p className="text-xs text-slate-500 mt-0.5">Generuj linki do e-podpisu ofert przez klientów</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black px-5 py-2.5 rounded-2xl text-xs uppercase tracking-widest">
          <PenLine size={13} /> Nowy e-sign
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input value={form.quoteTitle} onChange={e => setForm(p => ({ ...p, quoteTitle: e.target.value }))}
              placeholder="Tytuł oferty *"
              className="col-span-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none" />
            <input value={form.customerName} onChange={e => setForm(p => ({ ...p, customerName: e.target.value }))}
              placeholder="Nazwa klienta *"
              className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none" />
            <input type="email" value={form.customerEmail} onChange={e => setForm(p => ({ ...p, customerEmail: e.target.value }))}
              placeholder="Email klienta *"
              className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none" />
            <input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
              placeholder="Kwota oferty"
              className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none" />
            <select value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}
              className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none">
              {['PLN', 'EUR', 'USD'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="text-xs font-bold text-slate-400 px-3 py-1.5">Anuluj</button>
            <button onClick={handleCreate} disabled={saving || !form.quoteTitle || !form.customerName || !form.customerEmail}
              className="flex items-center gap-1.5 bg-indigo-600 disabled:opacity-40 text-white font-black text-xs px-5 py-2 rounded-xl">
              {saving && <RefreshCw size={10} className="animate-spin" />} Generuj link
            </button>
          </div>
        </div>
      )}

      {loading && <div className="flex justify-center py-10"><RefreshCw size={20} className="animate-spin text-indigo-400" /></div>}

      <div className="space-y-3">
        {requests.map(req => {
          const meta = STATUS_META[req.status];
          const url = getSignUrl(req.token);
          return (
            <div key={req.id} className={`rounded-2xl border p-4 ${meta.bg}`}>
              <div className="flex items-start gap-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${req.status === 'signed' ? 'bg-emerald-100' : 'bg-white/80'}`}>
                  {req.status === 'signed'
                    ? <CheckCircle2 size={16} className="text-emerald-600" />
                    : <PenLine size={16} className="text-indigo-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-slate-900 truncate">{req.quoteTitle}</p>
                  <p className="text-[10px] text-slate-600">{req.customerName} · {req.customerEmail}</p>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border ${meta.bg} ${meta.color}`}>{meta.label}</span>
                    {req.amount > 0 && <span className="text-[9px] font-black text-slate-700">{fmt(req.amount)} {req.currency}</span>}
                    <span className="text-[9px] text-slate-400">{fmtDate(req.createdAt)}</span>
                    {req.signedAt && <span className="text-[9px] text-emerald-600 font-bold">Podpisano: {fmtDate(req.signedAt)}</span>}
                  </div>
                  {req.status === 'pending' && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[9px] font-mono text-slate-500 bg-white/70 px-2 py-1 rounded-lg border border-slate-200 truncate max-w-xs">
                        {url}
                      </span>
                      <button onClick={() => handleCopy(req.token)}
                        className="flex items-center gap-1 text-[9px] font-black text-indigo-600 hover:text-indigo-800">
                        {copied === req.token ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                        {copied === req.token ? 'Skopiowano' : 'Kopiuj'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {!loading && requests.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-8">Brak żądań e-podpisu. Utwórz pierwsze dla klienta.</p>
        )}
      </div>

      <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200 flex gap-3">
        <Link size={14} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-blue-700">
          Link /sign/&#123;token&#125; prowadzi do strony podpisywania (wymaga wdrożenia route na /sign/[token] w Next.js/React Router).
          Klient podpisuje klikając przycisk potwierdzenia — brak wersji z canvas podpisem odręcznym w tym module.
        </p>
      </div>
    </div>
  );
}
