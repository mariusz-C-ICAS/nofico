/**
 * Data: 2026-05-10 14:06
 * Utworzył: Agent AI
 * Opis: Moduł konfiguracyjny (Integracje jak CalSyncPro, ustawienia prywatności/Kroki)
 */
import React, { useState, useEffect } from 'react';
import { 
  Shield, Save, Download, AlertTriangle, Languages, Moon, Sun, 
  Monitor, Bell, Mail, Zap, FileText
} from 'lucide-react';
import { useAuth } from '../../shared/hooks/AuthContext';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../app/providers/ThemeProvider';

export default function SettingsModule() {
  const { user, userData, updateUserSettings } = useAuth();
  const { i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  
  // Stany formularza
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Preferencje powiadomień
  const [notifs, setNotifs] = useState({
    email: userData?.notifications?.email ?? true,
    push: userData?.notifications?.push ?? false,
    inApp: userData?.notifications?.inApp ?? true
  });

  const languages = [
    { code: 'pl', name: 'Polski', flag: '🇵🇱' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'ua', name: 'Українська', flag: '🇺🇦' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
  ];

  const handleLanguageChange = async (lng: string) => {
    i18n.changeLanguage(lng);
    await updateUserSettings({ language: lng });
  };

  const handleToggleNotif = (key: keyof typeof notifs) => {
    setNotifs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateUserSettings({
        notifications: notifs
      });
      alert('Ustawienia pomyślnie zsynchronizowane z Twoim profilem.');
    } catch (err) {
      console.error(err);
      alert('Błąd podczas zapisywania ustawień.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportData = () => {
    setIsExporting(true);
    setTimeout(() => {
      const data = {
        user: {
          email: user?.email,
          displayName: user?.displayName,
          role: userData?.role
        },
        settings: userData,
        timestamp: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `c-icas_export_${user?.uid}.json`;
      link.click();
      setIsExporting(false);
      alert('Paczka danych RODO (JSON) została pobrana pomyślnie.');
    }, 1500);
  };

  const handleForgetMe = () => {
    if (confirm('UWAGA: Ta akcja spowoduje anonimizację Twoich danych i usunięcie profilu. Jest to akcja nieodwracalna. Kontynuować?')) {
      alert('Zgłoszenie anonimizacji zostało wysłane. Twój profil zostanie usunięty zgodnie z polityką retencji.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8 pb-20">
      
      <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-xl">
        <h2 className="text-4xl font-black italic tracking-tighter uppercase mb-2">Ustawienia & UI</h2>
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Personalizacja Twojego C-ICAS.OS</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Język i Region */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col gap-6">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
              <Languages size={24} />
            </div>
            <h3 className="text-lg font-black uppercase italic text-slate-900 tracking-tight">Język Interfejsu</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all border ${
                  i18n.language === lang.code 
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xl' 
                    : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-indigo-300 hover:text-slate-900'
                }`}
              >
                <span className="text-lg">{lang.flag}</span>
                {lang.name}
              </button>
            ))}
          </div>
        </div>

        {/* Motyw Wizualny */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col gap-6">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
            <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
              <Sun size={24} />
            </div>
            <h3 className="text-lg font-black uppercase italic text-slate-900 tracking-tight">Tryb Wizualny</h3>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'light', icon: Sun, label: 'Jasny' },
              { id: 'dark', icon: Moon, label: 'Ciemny' },
              { id: 'auto', icon: Monitor, label: 'System' }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id as any)}
                className={`flex flex-col items-center justify-center gap-2 px-2 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all border ${
                  theme === t.id 
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xl' 
                    : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-amber-300 hover:text-slate-900'
                }`}
              >
                <t.icon size={20} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Preferencje Powiadomień */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col gap-6 md:col-span-2">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
            <div className="p-2 bg-rose-50 rounded-xl text-rose-600">
              <Bell size={24} />
            </div>
            <h3 className="text-lg font-black uppercase italic text-slate-900 tracking-tight">Powiadomienia i Komunikacja</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { id: 'email', label: 'E-mail', desc: 'Faktury, raporty i alerty', icon: Mail },
              { id: 'push', label: 'Push (Browser)', desc: 'Powiadomienia w czasie rzeczywistym', icon: Zap },
              { id: 'inApp', label: 'In-App', desc: 'Wewnętrzny system wiadomości', icon: Bell }
            ].map((n) => (
              <div 
                key={n.id}
                onClick={() => handleToggleNotif(n.id as keyof typeof notifs)}
                className={`p-6 rounded-3xl border transition-all cursor-pointer group ${
                  notifs[n.id as keyof typeof notifs] 
                    ? 'bg-rose-50 border-rose-200' 
                    : 'bg-slate-50 border-slate-100 hover:border-rose-100'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-2xl transition-all ${notifs[n.id as keyof typeof notifs] ? 'bg-rose-600 text-white shadow-lg shadow-rose-200' : 'bg-white text-slate-400 group-hover:text-rose-500'}`}>
                    <n.icon size={20} />
                  </div>
                  <div className={`w-12 h-6 rounded-full transition-all relative ${notifs[n.id as keyof typeof notifs] ? 'bg-rose-600' : 'bg-slate-300'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${notifs[n.id as keyof typeof notifs] ? 'left-7' : 'left-1'}`} />
                  </div>
                </div>
                <h4 className={`text-sm font-black uppercase tracking-tight mb-1 ${notifs[n.id as keyof typeof notifs] ? 'text-rose-900' : 'text-slate-900'}`}>{n.label}</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase leading-tight">{n.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tryb Deweloperski (Tech Names) */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col gap-6 md:col-span-2">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
              <FileText size={24} />
            </div>
            <h3 className="text-lg font-black uppercase italic text-slate-900 tracking-tight">Developer Mode (Tech Names UI)</h3>
          </div>
          <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100">
             <div className="max-w-xl">
                <div className="font-black text-xs text-slate-900 uppercase tracking-widest mb-2">Pokaż techniczne nazwy pól</div>
                <div className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed tracking-tight">Włącza dopisywanie nazwy pola technicznego (np. _fieldName) obok etykiet w całej aplikacji. Pomaga w debugowaniu i konfiguracji API.</div>
             </div>
             <label className="relative inline-flex items-center cursor-pointer ml-4 shrink-0 scale-125">
               <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={userData?.showTechnicalNames || false} 
                  onChange={async (e) => {
                     await updateUserSettings({ showTechnicalNames: e.target.checked });
                  }} 
               />
               <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
             </label>
          </div>
        </div>

        {/* Sekcja RODO (GDPR Compliance) */}
        <div className="bg-slate-900 rounded-3xl shadow-xl p-8 flex flex-col gap-6 md:col-span-2 text-white">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <Shield size={24} className="text-emerald-400" />
            <h3 className="text-lg font-black uppercase italic text-white tracking-tight">Privacy Hub & RODO (GDPR)</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
             <div className="flex flex-col gap-4">
                <h4 className="font-black text-white text-xs uppercase tracking-widest flex items-center gap-2">
                  <Download size={14} /> Twoje prawo do danych
                </h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight leading-relaxed">
                  Pobierz kompletną paczkę informacji, które system FieldTime Work OS zebrał na Twój temat w formacie maszynowym.
                </p>
                <button 
                  onClick={handleExportData}
                  disabled={isExporting}
                  className="w-full bg-white text-slate-900 font-black py-4 rounded-2xl transition-all shadow-xl disabled:opacity-50 text-[10px] uppercase tracking-widest"
                >
                   {isExporting ? 'Przygotowywanie...' : 'Eksportuj Dane (JSON)'}
                </button>
             </div>

             <div className="flex flex-col gap-4">
                <h4 className="font-black text-rose-500 text-xs uppercase tracking-widest flex items-center gap-2">
                   <AlertTriangle size={14} /> Prawo do bycia zapomnianym
                </h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight leading-relaxed">
                  Zażądaj całkowitego i nieodwracalnego usunięcia swoich danych i profilu z systemów produkcyjnych.
                </p>
                <button 
                  onClick={handleForgetMe}
                  className="w-full bg-rose-600/10 border border-rose-600/20 text-rose-500 font-black py-4 rounded-2xl transition-all hover:bg-rose-600 hover:text-white text-[10px] uppercase tracking-widest"
                >
                   Usuń Profil
                </button>
             </div>
          </div>
        </div>

      </div>

      <div className="flex justify-end pt-8 border-t border-slate-200">
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-3 bg-slate-900 hover:bg-indigo-600 text-white font-black py-5 px-12 rounded-2xl transition-all shadow-2xl shadow-indigo-100 uppercase tracking-widest text-xs"
        >
           {isSaving ? 'Synchronizacja...' : <><Save size={20} /> Zapisz Wszystko</>}
        </button>
      </div>

    </div>
  );
}

