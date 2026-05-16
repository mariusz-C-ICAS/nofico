import React, { useState, useEffect } from 'react';
import { useAuth } from '../../shared/hooks/AuthContext';
import { useTenant } from '../../shared/hooks/useTenant';
import { Building2, Save, Globe, Palette, Clock, Shield, Mail } from 'lucide-react';
import { motion } from 'motion/react';

export const TenantSettingsModule: React.FC = () => {
  const { activeTenantId } = useTenant();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    name: '',
    logoUrl: '',
    brandColor: '#0f172a',
    timezone: 'Europe/Warsaw',
    currency: 'PLN',
    supportEmail: '',
    mfaRequired: false,
    retentionDays: 365
  });

  useEffect(() => {
    if (activeTenantId) {
      // Mock fetch - in real app would be from Firestore
      setSettings(prev => ({
        ...prev,
        name: `Portfolio Tenant ${activeTenantId.slice(0, 6)}`,
        supportEmail: `support@tenant-${activeTenantId.slice(0, 6)}.com`
      }));
      setLoading(false);
    }
  }, [activeTenantId]);

  const handleSave = async () => {
    setSaving(true);
    // Simulating save
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    alert('Ustawienia zapisane pomyślnie');
  };

  if (loading) return <div className="p-8 text-slate-500">Ładowanie ustawień...</div>;

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
          className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-black transition-all shadow-lg shadow-slate-900/20 disabled:opacity-50"
        >
          <Save className="h-5 w-5" />
          {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Podstawowe dane */}
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
                  onChange={e => setSettings({...settings, name: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none transition-all font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">E-mail Wsparcia</label>
                <input 
                  type="email" 
                  value={settings.supportEmail}
                  onChange={e => setSettings({...settings, supportEmail: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none transition-all font-bold"
                />
              </div>
           </div>
        </section>

        {/* Brand & Appearance */}
        <section className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
           <div className="flex items-center gap-3 text-slate-900 font-black uppercase tracking-widest text-xs">
              <Palette className="h-4 w-4" /> Wygląd (Branding)
           </div>
           
           <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div 
                  className="h-12 w-12 rounded-xl border-4 border-white shadow-lg shrink-0"
                  style={{ backgroundColor: settings.brandColor }}
                />
                <div className="flex-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Kolor Marki</label>
                  <input 
                    type="color" 
                    value={settings.brandColor}
                    onChange={e => setSettings({...settings, brandColor: e.target.value})}
                    className="w-full h-10 p-1 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                  />
                </div>
              </div>
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
                    onChange={e => setSettings({...settings, timezone: e.target.value})}
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
                  onChange={e => setSettings({...settings, currency: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none transition-all font-bold"
                >
                  <option value="PLN">Polski Złoty (PLN)</option>
                  <option value="EUR">Euro (EUR)</option>
                  <option value="USD">Dolar Amerykański (USD)</option>
                </select>
              </div>
           </div>
        </section>

        {/* Polityki Bezpieczeństwa */}
        <section className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
           <div className="flex items-center gap-3 text-slate-900 font-black uppercase tracking-widest text-xs">
              <Shield className="h-4 w-4" /> Bezpieczeństwo & Retention
           </div>
           
           <div className="space-y-4">
              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200">
                <input 
                  type="checkbox" 
                  checked={settings.mfaRequired}
                  onChange={e => setSettings({...settings, mfaRequired: e.target.checked})}
                  className="h-5 w-5 rounded-lg border-slate-300 text-slate-900 focus:ring-slate-900 transition-all"
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
                  onChange={e => setSettings({...settings, retentionDays: parseInt(e.target.value)})}
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
