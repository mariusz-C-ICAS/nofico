import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, CheckCircle2, Copy, ExternalLink } from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

interface Props { tenantId: string }

interface BookingSettingsData {
  publicEnabled: boolean;
  requireApproval: boolean;
  reminderHours: number;
  timezone: string;
  businessName: string;
  welcomeMessage: string;
  confirmationMessage: string;
  minBookingNoticeHours: number;
}

const DEFAULT: BookingSettingsData = {
  publicEnabled: true,
  requireApproval: false,
  reminderHours: 24,
  timezone: 'Europe/Warsaw',
  businessName: '',
  welcomeMessage: 'Zarezerwuj wizytę online szybko i wygodnie.',
  confirmationMessage: 'Dziękujemy za rezerwację! Potwierdzenie zostało wysłane na Twój email.',
  minBookingNoticeHours: 2,
};

const TIMEZONES = ['Europe/Warsaw', 'Europe/London', 'Europe/Berlin', 'Europe/Paris', 'Europe/Rome', 'UTC'];

export default function BookingSettings({ tenantId }: Props) {
  const [cfg, setCfg] = useState<BookingSettingsData>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const publicUrl = `${window.location.origin}/book/${tenantId}`;

  useEffect(() => {
    getDoc(doc(db, `tenants/${tenantId}/bookingSettings/main`)).then(snap => {
      if (snap.exists()) setCfg({ ...DEFAULT, ...snap.data() as BookingSettingsData });
      setLoading(false);
    });
  }, [tenantId]);

  const upd = (k: keyof BookingSettingsData, v: any) => setCfg(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    await setDoc(doc(db, `tenants/${tenantId}/bookingSettings/main`), {
      ...cfg, tenantId, updatedAt: serverTimestamp(),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="flex justify-center py-20"><RefreshCw size={20} className="animate-spin text-indigo-400" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Ustawienia Booking</h3>
          <p className="text-xs text-slate-500 mt-0.5">Konfiguracja strony publicznej i rezerwacji</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white font-black text-xs px-6 py-3 rounded-2xl">
          {saving ? <RefreshCw size={13} className="animate-spin" /> : saved ? <CheckCircle2 size={13} /> : <Save size={13} />}
          {saved ? 'Zapisano!' : 'Zapisz'}
        </button>
      </div>

      {/* Public link */}
      <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5 space-y-3">
        <p className="text-[9px] font-black text-violet-600 uppercase tracking-widest">Link do rezerwacji online</p>
        <div className="flex items-center gap-3">
          <code className="flex-1 bg-white rounded-xl px-4 py-2.5 text-sm text-violet-700 font-mono border border-violet-200 truncate">{publicUrl}</code>
          <button onClick={handleCopy} className="flex items-center gap-2 bg-violet-600 text-white font-black text-xs px-4 py-2.5 rounded-xl hover:bg-violet-700 transition-all">
            <Copy size={12} /> {copied ? 'Skopiowano!' : 'Kopiuj'}
          </button>
          <a href={publicUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 border border-violet-300 text-violet-600 font-black text-xs px-4 py-2.5 rounded-xl hover:bg-violet-100 transition-all">
            <ExternalLink size={12} /> Podgląd
          </a>
        </div>
      </div>

      {/* General settings */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ogólne</p>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-black text-slate-900">Strona publiczna aktywna</p>
            <p className="text-[10px] text-slate-500">Klienci mogą rezerwować przez link</p>
          </div>
          <button onClick={() => upd('publicEnabled', !cfg.publicEnabled)}
            className={`w-12 h-6 rounded-full transition-all relative ${cfg.publicEnabled ? 'bg-violet-600' : 'bg-slate-200'}`}>
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${cfg.publicEnabled ? 'left-7' : 'left-1'}`} />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-black text-slate-900">Wymagaj zatwierdzenia</p>
            <p className="text-[10px] text-slate-500">Każda rezerwacja wymaga ręcznego potwierdzenia</p>
          </div>
          <button onClick={() => upd('requireApproval', !cfg.requireApproval)}
            className={`w-12 h-6 rounded-full transition-all relative ${cfg.requireApproval ? 'bg-violet-600' : 'bg-slate-200'}`}>
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${cfg.requireApproval ? 'left-7' : 'left-1'}`} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nazwa firmy</label>
            <input value={cfg.businessName} onChange={e => upd('businessName', e.target.value)}
              className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
          </div>
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Strefa czasowa</label>
            <select value={cfg.timezone} onChange={e => upd('timezone', e.target.value)}
              className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
              {TIMEZONES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Przypomnienie (godz. przed)</label>
            <select value={cfg.reminderHours} onChange={e => upd('reminderHours', Number(e.target.value))}
              className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
              {[1, 2, 6, 12, 24, 48].map(h => <option key={h} value={h}>{h}h przed wizytą</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Min. wyprzedzenie rezerwacji (godz.)</label>
            <input type="number" min={0} value={cfg.minBookingNoticeHours} onChange={e => upd('minBookingNoticeHours', Number(e.target.value))}
              className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Wiadomości dla klientów</p>
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Komunikat powitalny</label>
          <textarea value={cfg.welcomeMessage} onChange={e => upd('welcomeMessage', e.target.value)} rows={2}
            className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none resize-none" />
        </div>
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Komunikat po rezerwacji</label>
          <textarea value={cfg.confirmationMessage} onChange={e => upd('confirmationMessage', e.target.value)} rows={2}
            className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none resize-none" />
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white font-black text-xs px-8 py-3 rounded-2xl">
          {saving ? <RefreshCw size={13} className="animate-spin" /> : saved ? <CheckCircle2 size={13} /> : <Save size={13} />}
          {saved ? 'Zapisano!' : 'Zapisz ustawienia'}
        </button>
      </div>
    </div>
  );
}
