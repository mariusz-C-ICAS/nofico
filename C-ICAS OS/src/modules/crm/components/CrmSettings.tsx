import React, { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, CheckCircle2 } from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

interface Props { tenantId: string }

interface CrmConfig {
  companyName: string;
  defaultCurrency: string;
  fiscalYearStart: string;
  dealStages: string[];
  leadScoreThresholds: { hot: number; warm: number };
  churnThreshold: number;
  slaDefaults: { critical: number; high: number; medium: number; low: number };
  commissionRates: { threshold: number; rate: number }[];
  npsScheduleDays: number;
  autoRenewalAlertDays: number;
  defaultTaxRate: number;
}

const DEFAULT_CONFIG: CrmConfig = {
  companyName: '',
  defaultCurrency: 'PLN',
  fiscalYearStart: '01-01',
  dealStages: ['lead', 'meeting', 'quote', 'negotiation', 'closed_won', 'closed_lost'],
  leadScoreThresholds: { hot: 70, warm: 40 },
  churnThreshold: 60,
  slaDefaults: { critical: 4, high: 8, medium: 24, low: 72 },
  commissionRates: [
    { threshold: 0, rate: 5 },
    { threshold: 10000, rate: 7 },
    { threshold: 50000, rate: 10 },
  ],
  npsScheduleDays: 90,
  autoRenewalAlertDays: 30,
  defaultTaxRate: 23,
};

const CURRENCIES = ['PLN', 'EUR', 'USD', 'GBP', 'CHF'];

export default function CrmSettings({ tenantId }: Props) {
  const [config, setConfig] = useState<CrmConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = async () => {
    setLoading(true);
    const snap = await getDoc(doc(db, `tenants/${tenantId}/settings/crm`));
    if (snap.exists()) {
      setConfig({ ...DEFAULT_CONFIG, ...snap.data() as CrmConfig });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [tenantId]);

  const upd = (k: keyof CrmConfig, v: any) => setConfig(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    await setDoc(doc(db, `tenants/${tenantId}/settings/crm`), {
      ...config, tenantId, updatedAt: serverTimestamp(),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const updStage = (i: number, val: string) => {
    const arr = [...config.dealStages];
    arr[i] = val;
    upd('dealStages', arr);
  };

  const updCommission = (i: number, k: 'threshold' | 'rate', v: number) => {
    const arr = [...config.commissionRates];
    arr[i] = { ...arr[i], [k]: v };
    upd('commissionRates', arr);
  };

  if (loading) return <div className="flex justify-center py-20"><RefreshCw size={20} className="animate-spin text-indigo-400" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Ustawienia CRM</h3>
          <p className="text-xs text-slate-500 mt-0.5">Konfiguracja modułu dla tenanta</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-black text-xs px-6 py-3 rounded-2xl transition-all">
          {saving ? <RefreshCw size={13} className="animate-spin" /> : saved ? <CheckCircle2 size={13} /> : <Save size={13} />}
          {saved ? 'Zapisano!' : 'Zapisz'}
        </button>
      </div>

      {/* General */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ogolne</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nazwa firmy</label>
            <input value={config.companyName} onChange={e => upd('companyName', e.target.value)}
              className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Domyslna waluta</label>
            <select value={config.defaultCurrency} onChange={e => upd('defaultCurrency', e.target.value)}
              className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Domyslna stawka VAT (%)</label>
            <select value={config.defaultTaxRate} onChange={e => upd('defaultTaxRate', Number(e.target.value))}
              className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
              {[0, 5, 8, 23].map(r => <option key={r} value={r}>{r}%</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Poczatek roku fiskalnego</label>
            <input value={config.fiscalYearStart} onChange={e => upd('fiscalYearStart', e.target.value)}
              placeholder="MM-DD (np. 01-01)"
              className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
          </div>
        </div>
      </div>

      {/* Deal stages */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Etapy pipeline (kolejnosc)</p>
        <div className="space-y-2">
          {config.dealStages.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-6 h-6 bg-indigo-50 rounded-lg flex items-center justify-center text-[9px] font-black text-indigo-600">{i + 1}</span>
              <input value={s} onChange={e => updStage(i, e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none font-mono" />
            </div>
          ))}
        </div>
      </div>

      {/* Lead score */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lead Score — progi</p>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'HOT (min.)', key: 'hot' as const },
            { label: 'WARM (min.)', key: 'warm' as const },
          ].map(({ label, key }) => (
            <div key={key}>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
              <input type="number" min={0} max={100}
                value={config.leadScoreThresholds[key]}
                onChange={e => upd('leadScoreThresholds', { ...config.leadScoreThresholds, [key]: Number(e.target.value) })}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
            </div>
          ))}
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Churn threshold</label>
            <input type="number" min={0} max={100} value={config.churnThreshold}
              onChange={e => upd('churnThreshold', Number(e.target.value))}
              className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
          </div>
        </div>
      </div>

      {/* SLA defaults */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">SLA — domyslne czasy (godziny)</p>
        <div className="grid grid-cols-4 gap-4">
          {(['critical', 'high', 'medium', 'low'] as const).map(p => (
            <div key={p}>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{p}</label>
              <input type="number" min={1} value={config.slaDefaults[p]}
                onChange={e => upd('slaDefaults', { ...config.slaDefaults, [p]: Number(e.target.value) })}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
            </div>
          ))}
        </div>
      </div>

      {/* Commission rates */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tabela prowizji</p>
        <div className="space-y-2">
          {config.commissionRates.map((r, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-[9px] text-slate-400 w-12">Prog {i + 1}</span>
              <div>
                <label className="text-[8px] text-slate-400">Min. wartosci (PLN)</label>
                <input type="number" value={r.threshold}
                  onChange={e => updCommission(i, 'threshold', Number(e.target.value))}
                  className="w-28 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none block" />
              </div>
              <div>
                <label className="text-[8px] text-slate-400">Stawka (%)</label>
                <input type="number" min={0} max={100} step={0.5} value={r.rate}
                  onChange={e => updCommission(i, 'rate', Number(e.target.value))}
                  className="w-20 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none block" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Other */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Inne</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">NPS — co ile dni</label>
            <input type="number" min={30} value={config.npsScheduleDays}
              onChange={e => upd('npsScheduleDays', Number(e.target.value))}
              className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
          </div>
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Alert odnowienia (dni przed)</label>
            <select value={config.autoRenewalAlertDays}
              onChange={e => upd('autoRenewalAlertDays', Number(e.target.value))}
              className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
              {[14, 30, 60, 90].map(d => <option key={d} value={d}>{d} dni</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-black text-xs px-8 py-3 rounded-2xl transition-all">
          {saving ? <RefreshCw size={13} className="animate-spin" /> : saved ? <CheckCircle2 size={13} /> : <Save size={13} />}
          {saved ? 'Zapisano!' : 'Zapisz konfiguracje'}
        </button>
      </div>
    </div>
  );
}
