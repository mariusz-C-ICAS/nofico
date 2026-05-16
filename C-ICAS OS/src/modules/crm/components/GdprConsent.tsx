import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Plus, RefreshCw, Trash2, Edit2, X, Save,
  AlertTriangle, CheckCircle2, XCircle, Clock, Download
} from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import {
  collection, query, where, getDocs, addDoc, updateDoc,
  deleteDoc, doc, serverTimestamp
} from 'firebase/firestore';

interface Props { tenantId: string }

interface ConsentRecord {
  id: string;
  customerName: string;
  customerId?: string;
  email?: string;
  consentType: string;
  status: 'granted' | 'withdrawn' | 'expired';
  grantedAt?: string;
  withdrawnAt?: string;
  expiresAt?: string;
  legalBasis: string;
  channel: string;
  notes?: string;
  createdAt?: any;
}

const CONSENT_TYPES = [
  'Marketing email', 'Marketing SMS', 'Telefon handlowy', 'Profilowanie',
  'Udostępnienie partnerom', 'Newsletter', 'Pliki cookies', 'Analityka',
];

const LEGAL_BASES = [
  'Zgoda (art. 6 ust. 1 lit. a)', 'Umowa (art. 6 ust. 1 lit. b)',
  'Obowiązek prawny (art. 6 ust. 1 lit. c)', 'Uzasadniony interes (art. 6 ust. 1 lit. f)',
];

const CHANNELS = ['Formularz online', 'Email', 'Telefon', 'Papierowy', 'Aplikacja mobilna'];

const RETENTION_YEARS = 3;

function isExpired(expiresAt?: string): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

function effectiveStatus(r: ConsentRecord): ConsentRecord['status'] {
  if (r.status === 'withdrawn') return 'withdrawn';
  if (isExpired(r.expiresAt)) return 'expired';
  return r.status;
}

const STATUS_COLORS: Record<string, string> = {
  granted: 'text-emerald-700 bg-emerald-100',
  withdrawn: 'text-red-700 bg-red-100',
  expired: 'text-amber-700 bg-amber-100',
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  granted: CheckCircle2, withdrawn: XCircle, expired: Clock,
};

const emptyForm = () => ({
  customerName: '', email: '', consentType: '', status: 'granted' as ConsentRecord['status'],
  grantedAt: new Date().toISOString().slice(0, 10),
  withdrawnAt: '', expiresAt: '',
  legalBasis: LEGAL_BASES[0], channel: CHANNELS[0], notes: '',
});

export default function GdprConsent({ tenantId }: Props) {
  const [records, setRecords] = useState<ConsentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'granted' | 'withdrawn' | 'expired'>('granted');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ConsentRecord | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const snap = await getDocs(query(
      collection(db, `tenants/${tenantId}/gdprConsents`),
      where('tenantId', '==', tenantId)
    ));
    setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as ConsentRecord)));
    setLoading(false);
  };

  useEffect(() => { load(); }, [tenantId]);

  const upd = (k: keyof ReturnType<typeof emptyForm>, v: any) => setForm(p => ({ ...p, [k]: v }));

  const openCreate = () => { setForm(emptyForm()); setEditing(null); setCreating(true); };
  const openEdit = (r: ConsentRecord) => {
    setForm({
      customerName: r.customerName, email: r.email ?? '', consentType: r.consentType,
      status: r.status, grantedAt: r.grantedAt ?? '', withdrawnAt: r.withdrawnAt ?? '',
      expiresAt: r.expiresAt ?? '', legalBasis: r.legalBasis, channel: r.channel, notes: r.notes ?? '',
    });
    setEditing(r); setCreating(false);
  };
  const closeForm = () => { setCreating(false); setEditing(null); };

  const handleSave = async () => {
    if (!form.customerName.trim() || !form.consentType) return;
    setSaving(true);
    const payload = {
      tenantId,
      customerName: form.customerName.trim(),
      email: form.email.trim() || null,
      consentType: form.consentType,
      status: form.status,
      grantedAt: form.grantedAt || null,
      withdrawnAt: form.withdrawnAt || null,
      expiresAt: form.expiresAt || null,
      legalBasis: form.legalBasis,
      channel: form.channel,
      notes: form.notes.trim() || null,
      updatedAt: serverTimestamp(),
    };
    try {
      if (editing) {
        await updateDoc(doc(db, `tenants/${tenantId}/gdprConsents`, editing.id), payload);
      } else {
        await addDoc(collection(db, `tenants/${tenantId}/gdprConsents`), { ...payload, createdAt: serverTimestamp() });
      }
      closeForm();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleWithdraw = async (r: ConsentRecord) => {
    if (!confirm('Oznaczyć zgodę jako wycofaną?')) return;
    await updateDoc(doc(db, `tenants/${tenantId}/gdprConsents`, r.id), {
      status: 'withdrawn', withdrawnAt: new Date().toISOString().slice(0, 10), updatedAt: serverTimestamp(),
    });
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Usunąć rekord zgody? Upewnij się, że masz inną kopię dokumentacji.')) return;
    await deleteDoc(doc(db, `tenants/${tenantId}/gdprConsents`, id));
    setRecords(p => p.filter(x => x.id !== id));
  };

  const exportCSV = () => {
    const rows = [['Klient', 'Email', 'Typ zgody', 'Status', 'Podstawa prawna', 'Kanał', 'Udzielono', 'Wygasa', 'Wycofano']];
    records.forEach(r => rows.push([
      r.customerName, r.email ?? '', r.consentType, effectiveStatus(r),
      r.legalBasis, r.channel, r.grantedAt ?? '', r.expiresAt ?? '', r.withdrawnAt ?? '',
    ]));
    const csv = '﻿' + rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `gdpr_consents_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };

  const withStatus = records.map(r => ({ ...r, effectiveStatus: effectiveStatus(r) }));
  const filtered = withStatus.filter(r => {
    if (filter !== 'all' && r.effectiveStatus !== filter) return false;
    if (search && !r.customerName.toLowerCase().includes(search.toLowerCase()) && !r.email?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const grantedCount = withStatus.filter(r => r.effectiveStatus === 'granted').length;
  const withdrawnCount = withStatus.filter(r => r.effectiveStatus === 'withdrawn').length;
  const expiredCount = withStatus.filter(r => r.effectiveStatus === 'expired').length;

  const FormPanel = () => (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-black text-slate-900 uppercase tracking-tighter">
          {editing ? 'Edytuj zgodę RODO' : 'Rejestruj zgodę RODO'}
        </h4>
        <button onClick={closeForm}><X size={14} /></button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Klient *</label>
          <input value={form.customerName} onChange={e => upd('customerName', e.target.value)}
            className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Email</label>
          <input type="email" value={form.email} onChange={e => upd('email', e.target.value)}
            className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
        </div>
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Typ zgody *</label>
          <select value={form.consentType} onChange={e => upd('consentType', e.target.value)}
            className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
            <option value="">— wybierz —</option>
            {CONSENT_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</label>
          <select value={form.status} onChange={e => upd('status', e.target.value as any)}
            className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
            <option value="granted">Udzielona</option>
            <option value="withdrawn">Wycofana</option>
            <option value="expired">Wygasła</option>
          </select>
        </div>
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Podstawa prawna</label>
          <select value={form.legalBasis} onChange={e => upd('legalBasis', e.target.value)}
            className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none">
            {LEGAL_BASES.map(l => <option key={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Kanał</label>
          <select value={form.channel} onChange={e => upd('channel', e.target.value)}
            className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
            {CHANNELS.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Data udzielenia</label>
          <input type="date" value={form.grantedAt} onChange={e => upd('grantedAt', e.target.value)}
            className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
        </div>
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Data wygaśnięcia</label>
          <input type="date" value={form.expiresAt} onChange={e => upd('expiresAt', e.target.value)}
            className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
        </div>
        <div className="col-span-2">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Notatki / dowód zgody</label>
          <textarea value={form.notes} onChange={e => upd('notes', e.target.value)} rows={2}
            placeholder="np. numer dokumentu, link do formularza..."
            className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none resize-none" />
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={closeForm} className="flex-1 border border-slate-200 text-slate-500 font-black text-xs py-3 rounded-xl">Anuluj</button>
        <button onClick={handleSave} disabled={!form.customerName.trim() || !form.consentType || saving}
          className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-black text-xs py-3 rounded-xl">
          {saving ? <RefreshCw size={11} className="animate-spin" /> : <Save size={11} />} Zapisz
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">GDPR / RODO — Zgody</h3>
          <p className="text-xs text-slate-500 mt-0.5">Retencja danych: {RETENTION_YEARS} lata · {records.length} rekordów</p>
        </div>
        <div className="flex gap-3">
          <button onClick={exportCSV}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs px-4 py-2.5 rounded-xl">
            <Download size={13} /> Eksport CSV
          </button>
          <button onClick={openCreate}
            className="flex items-center gap-2 bg-slate-900 hover:bg-indigo-600 text-white font-black text-xs px-6 py-3 rounded-2xl transition-all">
            <Plus size={14} /> Rejestruj zgodę
          </button>
        </div>
      </div>

      {expiredCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle size={14} className="text-amber-600 flex-shrink-0" />
          <p className="text-xs font-black text-amber-700">{expiredCount} zgód wygasło — rozważ odnowienie lub usunięcie danych</p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Aktywne zgody', value: grantedCount, icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
          { label: 'Wycofane', value: withdrawnCount, icon: XCircle, color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
          { label: 'Wygasłe', value: expiredCount, icon: Clock, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
        ].map(k => (
          <div key={k.label} className={`rounded-2xl border p-5 ${k.bg}`}>
            <k.icon size={16} className={`${k.color} mb-2`} />
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{k.label}</p>
            <p className={`text-2xl font-black mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex flex-wrap gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Szukaj klienta..."
          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-400 w-48" />
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {(['granted', 'withdrawn', 'expired', 'all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}>
              {f === 'granted' ? 'Aktywne' : f === 'withdrawn' ? 'Wycofane' : f === 'expired' ? 'Wygasłe' : 'Wszystkie'}
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      {(creating || editing) && <FormPanel />}

      {/* Records */}
      {loading ? (
        <div className="flex justify-center py-16"><RefreshCw size={20} className="animate-spin text-indigo-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">Brak rekordów zgód</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => {
            const StatusIcon = STATUS_ICONS[r.effectiveStatus];
            return (
              <div key={r.id} className="bg-white rounded-2xl border border-slate-200 px-5 py-4 flex items-start gap-4">
                <StatusIcon size={16} className={`flex-shrink-0 mt-0.5 ${STATUS_COLORS[r.effectiveStatus].split(' ')[0]}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-sm font-black text-slate-900">{r.customerName}</span>
                    {r.email && <span className="text-[9px] text-slate-400">{r.email}</span>}
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${STATUS_COLORS[r.effectiveStatus]}`}>{r.effectiveStatus}</span>
                    <span className="text-[9px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">{r.consentType}</span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-[9px] text-slate-500">
                    <span>{r.legalBasis}</span>
                    <span>Kanał: {r.channel}</span>
                    {r.grantedAt && <span>Udzielono: {r.grantedAt}</span>}
                    {r.expiresAt && <span>Wygasa: {r.expiresAt}</span>}
                    {r.withdrawnAt && <span>Wycofano: {r.withdrawnAt}</span>}
                  </div>
                  {r.notes && <p className="text-[9px] text-slate-500 italic mt-0.5">{r.notes}</p>}
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  {r.effectiveStatus === 'granted' && (
                    <button onClick={() => handleWithdraw(r)}
                      className="text-[9px] font-black text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg">
                      Wycofaj
                    </button>
                  )}
                  <button onClick={() => openEdit(r)}
                    className="text-[9px] font-black text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg">
                    <Edit2 size={10} className="inline mr-1" />Edytuj
                  </button>
                  <button onClick={() => handleDelete(r.id)}
                    className="text-[9px] font-black text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg">
                    <Trash2 size={10} className="inline mr-1" />Usuń
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
