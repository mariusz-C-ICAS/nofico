import React, { useState, useEffect } from 'react';
import { Code2, Copy, Check, Globe, Palette, Save, Loader2, Eye } from 'lucide-react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import { useTenant } from '../../../shared/hooks/useTenant';
import type { CalendarBrandConfig } from '../types';

const DEFAULTS: Omit<CalendarBrandConfig, 'id' | 'tenantId'> = {
  companyName: '',
  logoUrl: '',
  primaryColor: '#10b981',
  accentColor: '#3b82f6',
  publicMessage: 'Zarezerwuj wizytę online',
  showPrice: false,
  showWorkerName: false,
  allowReschedule: true,
  allowLocationChange: false,
  allowWorkerChoice: false,
  maxRescheduleDaysAhead: 30,
  maxRescheduleDaysBefore: 2,
};

export default function CalendarEmbedConfig() {
  const { activeTenantId } = useTenant();
  const [config, setConfig] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [copied, setCopied]   = useState(false);

  const setF = (k: keyof typeof DEFAULTS) => (v: any) =>
    setConfig(c => ({ ...c, [k]: v }));

  useEffect(() => {
    if (!activeTenantId) return;
    getDoc(doc(db, `tenants/${activeTenantId}/config/calendarBrand`))
      .then(snap => { if (snap.exists()) setConfig({ ...DEFAULTS, ...snap.data() }); })
      .finally(() => setLoading(false));
  }, [activeTenantId]);

  const save = async () => {
    if (!activeTenantId) return;
    setSaving(true);
    try {
      await setDoc(doc(db, `tenants/${activeTenantId}/config/calendarBrand`), {
        ...config, tenantId: activeTenantId, updatedAt: serverTimestamp(),
      });
    } finally { setSaving(false); }
  };

  const iframeUrl  = `${window.location.origin}/embed/${activeTenantId}`;
  const iframeCode = `<iframe\n  src="${iframeUrl}"\n  width="100%"\n  height="700"\n  style="border:none; border-radius:16px;"\n  title="${config.companyName || 'Kalendarz'}"\n></iframe>`;

  const copy = () => {
    navigator.clipboard.writeText(iframeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="py-20 text-center text-slate-400 text-xs font-black uppercase">Ładowanie konfiguracji...</div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-slate-700 uppercase tracking-tight">Kalendarz publiczny & iFrame</h3>
          <p className="text-xs text-slate-400 mt-0.5">Konfiguracja brandingu i uprawnień dla klientów</p>
        </div>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-black px-5 py-2.5 rounded-2xl text-xs uppercase tracking-widest">
          {saving ? <Loader2 size={12} className="animate-spin"/> : <Save size={12}/>}
          Zapisz
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Branding */}
        <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-200 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Palette size={14} className="text-slate-500"/>
            <h4 className="text-xs font-black text-slate-600 uppercase tracking-widest">Branding</h4>
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Nazwa firmy</label>
            <input value={config.companyName} onChange={e => setF('companyName')(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400"/>
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Logo URL</label>
            <input value={config.logoUrl ?? ''} onChange={e => setF('logoUrl')(e.target.value)}
              placeholder="https://..."
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400"/>
          </div>
          <div className="flex gap-3">
            {([
              { key: 'primaryColor', label: 'Kolor główny' },
              { key: 'accentColor',  label: 'Kolor akcentu' },
            ] as { key: 'primaryColor' | 'accentColor'; label: string }[]).map(({ key, label }) => (
              <div key={key} className="flex-1">
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</label>
                <input type="color" value={(config as any)[key]} onChange={e => setF(key)(e.target.value)}
                  className="w-full h-10 bg-white border border-slate-200 rounded-xl cursor-pointer"/>
              </div>
            ))}
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Wiadomość powitalna</label>
            <input value={config.publicMessage ?? ''} onChange={e => setF('publicMessage')(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400"/>
          </div>
        </div>

        {/* Permissions */}
        <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-200 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Globe size={14} className="text-slate-500"/>
            <h4 className="text-xs font-black text-slate-600 uppercase tracking-widest">Uprawnienia klienta</h4>
          </div>
          {([
            { key: 'allowReschedule',     label: 'Zmiana terminu',    desc: 'Klient może przesunąć wizytę' },
            { key: 'allowLocationChange', label: 'Zmiana lokalizacji', desc: 'Klient może zmienić adres' },
            { key: 'allowWorkerChoice',   label: 'Wybór pracownika',  desc: 'Klient wybiera technika' },
            { key: 'showPrice',           label: 'Pokaż cenę',        desc: 'Widoczna w portalu klienta' },
            { key: 'showWorkerName',      label: 'Pokaż pracownika',  desc: 'Imię technika w powiadomieniu' },
          ] as { key: keyof typeof DEFAULTS; label: string; desc: string }[]).map(({ key, label, desc }) => (
            <label key={key} className="flex items-center justify-between gap-3 cursor-pointer">
              <div>
                <p className="text-xs font-bold text-slate-700">{label}</p>
                <p className="text-[9px] text-slate-400">{desc}</p>
              </div>
              <input type="checkbox" checked={!!(config as any)[key]} onChange={e => setF(key)(e.target.checked)}
                className="w-4 h-4 accent-emerald-500"/>
            </label>
          ))}
          <div className="grid grid-cols-2 gap-3">
            {([
              { key: 'maxRescheduleDaysAhead',   label: 'Max. dni naprzód',     min: 1, max: 365 },
              { key: 'maxRescheduleDaysBefore',  label: 'Min. h przed wizytą',  min: 1, max: 72 },
            ] as { key: 'maxRescheduleDaysAhead' | 'maxRescheduleDaysBefore'; label: string; min: number; max: number }[]).map(({ key, label, min, max }) => (
              <div key={key}>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</label>
                <input type="number" min={min} max={max} value={(config as any)[key]}
                  onChange={e => setF(key)(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none"/>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* iFrame snippet */}
      <div className="bg-slate-900 rounded-[2rem] p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 size={14} className="text-emerald-400"/>
            <h4 className="text-xs font-black text-emerald-300 uppercase tracking-widest">Kod iFrame do osadzenia na stronie</h4>
          </div>
          <button onClick={copy}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-2 rounded-xl text-xs uppercase tracking-widest">
            {copied ? <Check size={12}/> : <Copy size={12}/>}
            {copied ? 'Skopiowano!' : 'Kopiuj'}
          </button>
        </div>
        <pre className="text-emerald-300 text-[11px] font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap break-all">{iframeCode}</pre>
        <p className="text-[9px] text-slate-500 flex items-center gap-1.5">
          <Eye size={10}/>
          Link bezpośredni:&nbsp;
          <a href={iframeUrl} target="_blank" rel="noopener noreferrer"
            className="text-emerald-400 hover:underline break-all">{iframeUrl}</a>
        </p>
      </div>
    </div>
  );
}
