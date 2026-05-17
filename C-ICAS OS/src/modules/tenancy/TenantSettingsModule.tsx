import React, { useState, useEffect } from 'react';
import { db } from '../../shared/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../shared/hooks/AuthContext';
import { useTenant } from '../../shared/hooks/useTenant';
import { Building2, Save, Globe, Palette, Clock, Shield, Loader2 } from 'lucide-react';
import { applyBrandColor, brandShadeHex, DEFAULT_BRAND_COLOR } from '../../shared/utils/colorUtils';

export const TenantSettingsModule: React.FC = () => {
  const { activeTenantId } = useTenant();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    name: '',
    logoUrl: '',
    brandColor: DEFAULT_BRAND_COLOR,
    timezone: 'Europe/Warsaw',
    currency: 'PLN',
    supportEmail: '',
    mfaRequired: false,
    retentionDays: 365,
  });

  useEffect(() => {
    if (!activeTenantId) return;
    setLoading(true);
    getDoc(doc(db, 'tenants', activeTenantId))
      .then(snap => {
        if (snap.exists()) {
          const data = snap.data() as any;
          setSettings(prev => ({
            ...prev,
            name: data.name ?? prev.name,
            logoUrl: data.logoUrl ?? '',
            brandColor: data.brandColor ?? DEFAULT_BRAND_COLOR,
            timezone: data.timezone ?? 'Europe/Warsaw',
            currency: data.currency ?? 'PLN',
            supportEmail: data.supportEmail ?? '',
            mfaRequired: data.mfaRequired ?? false,
            retentionDays: data.retentionDays ?? 365,
          }));
        }
      })
      .finally(() => setLoading(false));
  }, [activeTenantId]);

  const handleColorChange = (hex: string) => {
    setSettings(s => ({ ...s, brandColor: hex }));
    applyBrandColor(hex); // live preview — instant feedback
  };

  const handleSave = async () => {
    if (!activeTenantId) return;
    setSaving(true);
    setSaved(false);
    try {
      await setDoc(doc(db, 'tenants', activeTenantId), {
        name: settings.name,
        logoUrl: settings.logoUrl,
        brandColor: settings.brandColor,
        timezone: settings.timezone,
        currency: settings.currency,
        supportEmail: settings.supportEmail,
        mfaRequired: settings.mfaRequired,
        retentionDays: settings.retentionDays,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid,
      }, { merge: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-3 text-slate-500">
        <Loader2 className="animate-spin" size={18} />
        <span>Ładowanie ustawień...</span>
      </div>
    );
  }

  const previewShades: Array<50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900> =
    [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-4xl">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Ustawienia Workspace</h1>
          <p className="text-slate-500">Zarządzaj tożsamością i politykami swojej organizacji.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-brand-700 transition-all shadow-lg disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          {saving ? 'Zapisywanie...' : saved ? 'Zapisano!' : 'Zapisz zmiany'}
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tożsamość */}
        <section className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 text-slate-900 font-black uppercase tracking-widest text-xs">
            <Building2 className="h-4 w-4" /> Tożsamość
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nazwa Wyświetlana</label>
              <input
                type="text"
                value={settings.name}
                onChange={e => setSettings(s => ({ ...s, name: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none transition-all font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">E-mail Wsparcia</label>
              <input
                type="email"
                value={settings.supportEmail}
                onChange={e => setSettings(s => ({ ...s, supportEmail: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none transition-all font-bold"
              />
            </div>
          </div>
        </section>

        {/* Brand & Appearance */}
        <section className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 text-slate-900 font-black uppercase tracking-widest text-xs">
            <Palette className="h-4 w-4" /> Kolor Marki (Branding)
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div
                className="h-12 w-12 rounded-xl border-4 border-white shadow-lg shrink-0 transition-colors duration-200"
                style={{ backgroundColor: settings.brandColor }}
              />
              <div className="flex-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Wybierz kolor</label>
                <input
                  type="color"
                  value={settings.brandColor}
                  onChange={e => handleColorChange(e.target.value)}
                  className="w-full h-10 p-1 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                />
              </div>
            </div>

            {/* Live color scale preview */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Podgląd palety</label>
              <div className="flex gap-1 rounded-xl overflow-hidden h-8">
                {previewShades.map(shade => (
                  <div
                    key={shade}
                    className="flex-1 transition-colors duration-200"
                    style={{ backgroundColor: brandShadeHex(settings.brandColor, shade) }}
                    title={`brand-${shade}`}
                  />
                ))}
              </div>
              <div className="flex gap-1 mt-0.5">
                {previewShades.map(shade => (
                  <div key={shade} className="flex-1 text-center text-[7px] text-slate-400 font-mono">{shade}</div>
                ))}
              </div>
            </div>

            <p className="text-[10px] text-slate-400 leading-relaxed">
              Kolor marki jest używany w nawigacji, przyciskach i akcentach w całym systemie. Zmiana jest natychmiastowa.
            </p>
          </div>
        </section>

        {/* Regionalne */}
        <section className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 text-slate-900 font-black uppercase tracking-widest text-xs">
            <Globe className="h-4 w-4" /> Ustawienia Regionalne
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Strefa Czasowa</label>
              <div className="relative">
                <select
                  value={settings.timezone}
                  onChange={e => setSettings(s => ({ ...s, timezone: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none transition-all font-bold appearance-none"
                >
                  <option value="Europe/Warsaw">Warszawa (GMT+1)</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">New York (EDT)</option>
                </select>
                <Clock className="absolute right-4 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Waluta Domyślna</label>
              <select
                value={settings.currency}
                onChange={e => setSettings(s => ({ ...s, currency: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none transition-all font-bold"
              >
                <option value="PLN">Polski Złoty (PLN)</option>
                <option value="EUR">Euro (EUR)</option>
                <option value="USD">Dolar Amerykański (USD)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Bezpieczeństwo */}
        <section className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 text-slate-900 font-black uppercase tracking-widest text-xs">
            <Shield className="h-4 w-4" /> Bezpieczeństwo & Retention
          </div>
          <div className="space-y-4">
            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200">
              <input
                type="checkbox"
                checked={settings.mfaRequired}
                onChange={e => setSettings(s => ({ ...s, mfaRequired: e.target.checked }))}
                className="h-5 w-5 rounded-lg border-slate-300"
              />
              <div className="flex-1">
                <div className="text-sm font-bold text-slate-900">Wymuś MFA dla wszystkich</div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Multi-Factor Authentication</div>
              </div>
            </label>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Retention Danych (dni)</label>
              <input
                type="number"
                value={settings.retentionDays}
                onChange={e => setSettings(s => ({ ...s, retentionDays: parseInt(e.target.value) || 365 }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none transition-all font-bold"
              />
              <p className="text-[10px] text-slate-400 mt-2 font-medium">Okres przechowywania logów audytowych i dokumentów tymczasowych.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TenantSettingsModule;
