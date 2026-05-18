/**
 * Data: 2026-05-15
 * Zmiany: Provider wielojezycznosci PL/EN/DE z Context, hookiem useI18n i komponentem LangSwitcher.
 * Sciezka: /src/shared/i18n/i18nProvider.tsx
 */
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// --- Types ---
export type Lang = 'pl' | 'en' | 'de';

type Dictionary = Record<string, string>;

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

// --- Dictionaries ---
const dictionaries: Record<Lang, Dictionary> = {
  pl: {
    'nav.dashboard': 'Panel',
    'nav.finance': 'Finanse',
    'nav.compliance': 'Compliance',
    'nav.crm': 'Klienci',
    'nav.hr': 'HR',
    'nav.settings': 'Ustawienia',
    'nav.reports': 'Raporty',
    'nav.documents': 'Dokumenty',
    'nav.admin': 'Admin',
    'nav.logout': 'Wyloguj',
    'btn.save': 'Zapisz',
    'btn.cancel': 'Anuluj',
    'btn.delete': 'Usun',
    'btn.edit': 'Edytuj',
    'btn.add': 'Dodaj',
    'btn.generate': 'Generuj',
    'btn.download': 'Pobierz',
    'btn.send': 'Wyslij',
    'btn.connect': 'Polacz',
    'btn.disconnect': 'Odlacz',
    'status.pending': 'Oczekuje',
    'status.active': 'Aktywny',
    'status.inactive': 'Nieaktywny',
    'status.connected': 'Polaczono',
    'status.error': 'Blad',
    'status.verified': 'Zweryfikowano',
    'status.draft': 'Szkic',
    'status.sent': 'Wyslano',
    'label.tenant': 'Firma',
    'label.email': 'Email',
    'label.date': 'Data',
    'label.amount': 'Kwota',
  },
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.finance': 'Finance',
    'nav.compliance': 'Compliance',
    'nav.crm': 'Clients',
    'nav.hr': 'HR',
    'nav.settings': 'Settings',
    'nav.reports': 'Reports',
    'nav.documents': 'Documents',
    'nav.admin': 'Admin',
    'nav.logout': 'Logout',
    'btn.save': 'Save',
    'btn.cancel': 'Cancel',
    'btn.delete': 'Delete',
    'btn.edit': 'Edit',
    'btn.add': 'Add',
    'btn.generate': 'Generate',
    'btn.download': 'Download',
    'btn.send': 'Send',
    'btn.connect': 'Connect',
    'btn.disconnect': 'Disconnect',
    'status.pending': 'Pending',
    'status.active': 'Active',
    'status.inactive': 'Inactive',
    'status.connected': 'Connected',
    'status.error': 'Error',
    'status.verified': 'Verified',
    'status.draft': 'Draft',
    'status.sent': 'Sent',
    'label.tenant': 'Company',
    'label.email': 'Email',
    'label.date': 'Date',
    'label.amount': 'Amount',
  },
  de: {
    'nav.dashboard': 'Ubersicht',
    'nav.finance': 'Finanzen',
    'nav.compliance': 'Compliance',
    'nav.crm': 'Kunden',
    'nav.hr': 'Personal',
    'nav.settings': 'Einstellungen',
    'nav.reports': 'Berichte',
    'nav.documents': 'Dokumente',
    'nav.admin': 'Admin',
    'nav.logout': 'Abmelden',
    'btn.save': 'Speichern',
    'btn.cancel': 'Abbrechen',
    'btn.delete': 'Loschen',
    'btn.edit': 'Bearbeiten',
    'btn.add': 'Hinzufugen',
    'btn.generate': 'Generieren',
    'btn.download': 'Herunterladen',
    'btn.send': 'Senden',
    'btn.connect': 'Verbinden',
    'btn.disconnect': 'Trennen',
    'status.pending': 'Ausstehend',
    'status.active': 'Aktiv',
    'status.inactive': 'Inaktiv',
    'status.connected': 'Verbunden',
    'status.error': 'Fehler',
    'status.verified': 'Verifiziert',
    'status.draft': 'Entwurf',
    'status.sent': 'Gesendet',
    'label.tenant': 'Firma',
    'label.email': 'E-Mail',
    'label.date': 'Datum',
    'label.amount': 'Betrag',
  },
};

// --- Context ---
const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = 'cias_lang';

const getBrowserLang = (): Lang => {
  const nav = navigator.languages?.length ? navigator.languages[0] : navigator.language;
  const code = nav?.split('-')[0]?.toLowerCase();
  if (code === 'en') return 'en';
  if (code === 'de') return 'de';
  return 'pl';
};

const getSavedLang = (): Lang => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'pl' || saved === 'en' || saved === 'de') return saved;
  } catch {
    // localStorage unavailable
  }
  return getBrowserLang();
};

// --- Provider ---
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getSavedLang);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const t = useCallback((key: string): string => {
    return dictionaries[lang][key] ?? key;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

// --- Hook ---
export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}

// --- LangSwitcher ---
interface LangOption {
  code: Lang;
  flag: string;
  label: string;
}

const LANG_OPTIONS: LangOption[] = [
  { code: 'pl', flag: '🇵🇱', label: 'PL' },
  { code: 'en', flag: '🇬🇧', label: 'EN' },
  { code: 'de', flag: '🇩🇪', label: 'DE' },
];

export function LangSwitcher() {
  const { lang, setLang } = useI18n();

  return (
    <div className="inline-flex items-center gap-1 bg-slate-100 rounded-2xl p-1">
      {LANG_OPTIONS.map(opt => (
        <button
          key={opt.code}
          onClick={() => setLang(opt.code)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
            ${lang === opt.code
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'}`}
        >
          <span>{opt.flag}</span>
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

export default I18nProvider;
