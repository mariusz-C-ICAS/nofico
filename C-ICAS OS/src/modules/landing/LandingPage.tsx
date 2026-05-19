import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../../core/firebase/config';
import {
  ArrowRight, LogIn, Check,
  Factory, Truck, Hammer, ShoppingCart, Stethoscope,
  GraduationCap, Leaf, BookOpen, Globe, Building2,
  Users, Briefcase, BarChart3, FileText, Shield, Cpu, Layers,
  ChevronDown,
} from 'lucide-react';
import UseCasesSection from './UseCasesSection';

// ─── Static data ────────────────────────────────────────────────────────────
const SECTORS = [
  { icon: Factory, labelPl: 'Produkcja & Przemysł', labelEn: 'Manufacturing' },
  { icon: Truck, labelPl: 'Transport & Logistyka', labelEn: 'Transport & Logistics' },
  { icon: Hammer, labelPl: 'Budownictwo', labelEn: 'Construction' },
  { icon: ShoppingCart, labelPl: 'Handel & E-commerce', labelEn: 'Retail & E-commerce' },
  { icon: Stethoscope, labelPl: 'Opieka Zdrowotna', labelEn: 'Healthcare' },
  { icon: GraduationCap, labelPl: 'Edukacja & Szkolenia', labelEn: 'Education & Training' },
  { icon: Leaf, labelPl: 'Usługi & Serwis', labelEn: 'Services' },
  { icon: BookOpen, labelPl: 'Finanse & Doradztwo', labelEn: 'Finance & Consulting' },
  { icon: Globe, labelPl: 'IT & Technologia', labelEn: 'IT & Technology' },
  { icon: Building2, labelPl: 'Nieruchomości & Facility', labelEn: 'Real Estate & Facility' },
];

const MODULE_CARDS = [
  { key: 'hr', icon: Users, color: 'bg-indigo-500', titlePl: 'HR & Kadry', titleEn: 'HR & Payroll', descPl: 'Pełny cykl życia pracownika — onboarding, umowy, urlopy, płace, struktura org, offboarding.', descEn: 'Full employee lifecycle — onboarding, contracts, leave, payroll, org structure, offboarding.' },
  { key: 'crm', icon: Briefcase, color: 'bg-violet-500', titlePl: 'CRM & Sprzedaż', titleEn: 'CRM & Sales', descPl: 'Klienci, szanse sprzedaży, oferty, faktury, pipeline i raporty handlowe.', descEn: 'Clients, opportunities, quotes, invoices, pipeline and sales reports.' },
  { key: 'fin', icon: BarChart3, color: 'bg-blue-500', titlePl: 'Finanse & Kontroling', titleEn: 'Finance & Controlling', descPl: 'Faktury, JPK, KSeF, PSD2, budżetowanie i konsolidacja holdingowa.', descEn: 'Invoices, JPK, e-Invoice, PSD2, budgeting and holding consolidation.' },
  { key: 'proj', icon: FileText, color: 'bg-cyan-500', titlePl: 'Projekty & Czas Pracy', titleEn: 'Projects & Time', descPl: 'Kanban, Scrum, ewidencja czasu i raportowanie projektów.', descEn: 'Kanban, Scrum, time tracking and project reporting.' },
  { key: 'comp', icon: Shield, color: 'bg-teal-500', titlePl: 'Compliance & RODO', titleEn: 'Compliance & GDPR', descPl: 'RODO, ESG/CSRD, sygnalista, JPK, polityki i audyt ISO 27001.', descEn: 'GDPR, ESG/CSRD, whistleblower, JPK, policies and ISO 27001 audit.' },
  { key: 'ai', icon: Cpu, color: 'bg-orange-500', titlePl: 'AI Coach & Asystent', titleEn: 'AI Coach & Assistant', descPl: 'Automatyzacja zadań, predykcje HR, OCR dokumentów i asystent głosowy.', descEn: 'Task automation, HR predictions, document OCR and voice assistant.' },
  { key: 'dms', icon: Globe, color: 'bg-rose-500', titlePl: 'E-podpis & Obieg Dok.', titleEn: 'E-sign & Document Flow', descPl: 'Podpis kwalifikowany eIDAS, obieg akceptacyjny i DMS z wersjonowaniem.', descEn: 'eIDAS qualified e-signature, approval workflow and DMS with versioning.' },
  { key: 'log', icon: Truck, color: 'bg-emerald-500', titlePl: 'Logistyka & Serwis', titleEn: 'Logistics & Field Service', descPl: 'Zarządzanie flotą, GPS, serwis terenowy i rezerwacje zasobów.', descEn: 'Fleet management, GPS, field service and resource booking.' },
  { key: 'multi', icon: Layers, color: 'bg-indigo-500', titlePl: 'Multi-Firma', titleEn: 'Multi-Entity', descPl: 'Wiele spółek w jednym tenancie — konsolidacja, holding, biura rachunkowe.', descEn: 'Multiple companies in one tenant — consolidation, holding, accounting firms.' },
];

const SECURITY_PL = [
  'Dane przechowywane wyłącznie w centrach danych UE (Google Cloud EU)',
  'Zgodność z RODO / GDPR — pełny rejestr czynności przetwarzania',
  'KSeF — integracja z Krajowym Systemem e-Faktur',
  'ESG & CSRD — raporty ESG zgodne z dyrektywą EU 2022/2464',
  'JPK_V7M/V7K, JPK_FA, JPK_CIT — eksport plików kontrolnych',
  'Sygnalista — moduł zgodny z dyrektywą EU 2019/1937',
  'Architektura zgodna z zasadami ISO 27001 — szyfrowanie TLS + spoczynek',
  'MFA, SSO, Role RBAC, Logi audytowe, IP whitelisting',
];

const SECURITY_EN = [
  'Data stored exclusively in EU data centres (Google Cloud EU)',
  'GDPR compliant — full processing activities register',
  'e-Invoicing — National e-Invoice System (KSeF) integration',
  'ESG & CSRD — reports compliant with EU Directive 2022/2464',
  'Standard Audit Files (JPK) — V7M, V7K, FA, CIT export',
  'Whistleblower module — compliant with EU Directive 2019/1937',
  'ISO 27001-aligned architecture — TLS + at-rest encryption',
  'MFA, SSO, RBAC roles, Audit logs, IP whitelisting',
];

const FAQ_PL = [
  { q: 'Czy mogę zarządzać wieloma firmami z jednego konta?', a: 'Tak. W jednym tenancie możesz dodać wiele spółek/oddziałów (holding, grupy kapitałowe). Możesz też zarządzać wieloma tenantami — każdy z osobną izolacją danych (np. biuro rachunkowe obsługujące wielu klientów).' },
  { q: 'Czy dane są bezpieczne i zgodne z RODO?', a: 'Tak. Wszystkie dane przechowywane są w UE (Google Cloud Europe-West). Mamy pełny rejestr czynności przetwarzania, automatyczną retencję danych i eksport danych na żądanie (Art. 15 RODO).' },
  { q: 'Czy integruje się z KSeF i JPK?', a: 'Tak. C-ICAS OS obsługuje KSeF (wysyłka i odbiór e-Faktur), JPK_V7M/V7K, JPK_FA, JPK_CIT oraz integrację PSD2 z bankami.' },
  { q: 'Ile czasu zajmuje wdrożenie?', a: 'Podstawowe funkcje działają w ciągu 15 minut od rejestracji. Import danych z Excel/CSV/JPK zajmuje zwykle 1–2 godziny dla typowej firmy MŚP.' },
  { q: 'Czy mogę zaimportować dane z innego systemu?', a: 'Tak. Obsługujemy import z Excel, CSV, JPK oraz REST API do integracji z zewnętrznymi systemami. Nie ma vendor lock-in — możesz też w każdej chwili eksportować wszystkie swoje dane.' },
  { q: 'Jakie formy prawne obsługuje system?', a: 'JDG, Sp. z o.o., S.A., Sp. j., Sp. k., SKA, Sp. p., NGO, Spółdzielnia, Holding/Grupa kapitałowa — wszystkie z osobnymi regułami ZUS, VAT i compliance.' },
];

const FAQ_EN = [
  { q: 'Can I manage multiple companies from one account?', a: 'Yes. In one tenant you can add multiple companies/branches (holding, corporate groups). You can also manage multiple tenants — each with separate data isolation (e.g., accounting firms serving multiple clients).' },
  { q: 'Is data secure and GDPR-compliant?', a: 'Yes. All data is stored in the EU (Google Cloud Europe-West). We have a full processing activities register, automatic data retention and data export on demand (GDPR Art. 15).' },
  { q: 'Does it integrate with e-Invoice and audit files?', a: 'Yes. C-ICAS OS supports KSeF (e-Invoice send/receive), JPK_V7M/V7K, JPK_FA, JPK_CIT and PSD2 bank integration.' },
  { q: 'How long does deployment take?', a: 'Basic features work within 15 minutes of registration. Importing data from Excel/CSV/JPK typically takes 1–2 hours for a typical SMB.' },
  { q: 'Can I import data from another system?', a: 'Yes. We support import from Excel, CSV, JPK and REST API for integration with external systems. No vendor lock-in — you can also export all your data at any time.' },
  { q: 'What legal forms does the system support?', a: 'Sole trader, Ltd, S.A., partnerships, NGO, Cooperative, Holding/Corporate group — all with separate VAT, social security and compliance rules.' },
];

// ─── Component ───────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [lang, setLang] = useState<'pl' | 'en'>('pl');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const isEn = lang === 'en';
  const navigate = useNavigate();

  const handleGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/');
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') return;
      console.error(err);
    }
  };

  const faq = isEn ? FAQ_EN : FAQ_PL;
  const security = isEn ? SECURITY_EN : SECURITY_PL;

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/favicon.png" className="w-8 h-8 rounded-xl shadow-lg" alt="C-ICAS" />
            <span className="text-lg font-black tracking-tight text-slate-900">C-ICAS OS</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#how-it-works" className="hover:text-indigo-600 transition-colors">{isEn ? 'How it works' : 'Jak to działa'}</a>
            <a href="#modules" className="hover:text-indigo-600 transition-colors">{isEn ? 'Modules' : 'Moduły'}</a>
            <a href="#sectors" className="hover:text-indigo-600 transition-colors">{isEn ? 'Industries' : 'Branże'}</a>
            <a href="#use-cases" className="hover:text-indigo-600 transition-colors">{isEn ? 'Use cases' : 'Przypadki użycia'}</a>
            <a href="#faq" className="hover:text-indigo-600 transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1 bg-slate-100 rounded-xl p-0.5">
              {(['pl', 'en'] as const).map(l => (
                <button key={l} onClick={() => setLang(l)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase transition-all ${lang === l ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}>
                  {l === 'pl' ? '🇵🇱 PL' : '🇬🇧 EN'}
                </button>
              ))}
            </div>
            <button
              onClick={handleGoogle}
              className="hidden sm:flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-xl transition-all bg-white hover:shadow-sm"
            >
              <svg width="16" height="16" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
              {isEn ? 'Sign in' : 'Zaloguj się'}
            </button>
            <Link to="/register" className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all shadow-sm">
              {isEn ? 'Start for free' : 'Zacznij bezpłatnie'} <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 text-white">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-indigo-800/60 border border-indigo-600/50 rounded-full px-4 py-1.5 text-sm mb-6">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              {isEn ? 'AI Coach & Assistant · ESG/CSRD · e-Invoice · Multi-Entity' : 'AI Coach & Asystent · ESG/CSRD · KSeF · Multi-Firma'}
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight mb-6">
              {isEn ? 'One ecosystem' : 'Jeden ekosystem'}<br />
              <span className="text-indigo-300">{isEn ? 'for your entire company' : 'dla całej firmy'}</span>
            </h1>
            <p className="text-lg sm:text-xl text-indigo-100/80 leading-relaxed mb-6 max-w-2xl">
              {isEn
                ? 'C-ICAS OS is a modular cloud ERP — HR, CRM, Finance, Projects, Compliance and AI in one place.'
                : 'C-ICAS OS to modułowy ERP w chmurze — HR, CRM, Finanse, Projekty, Compliance i AI w jednym miejscu.'}
            </p>
            <div className="flex flex-wrap gap-3 mb-10">
              {(isEn
                ? ['HR · CRM · Finance', 'Projects · Compliance', 'Multi-Entity · Multi-Tenant', 'Data in EU · GDPR']
                : ['HR · CRM · Finanse', 'Projekty · Compliance', 'Multi-Firma · Multi-Tenant', 'Dane w UE · KSeF · RODO']
              ).map(tag => (
                <span key={tag} className="text-xs px-3 py-1.5 bg-indigo-800/60 border border-indigo-600/40 rounded-full text-indigo-200">{tag}</span>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/register" className="inline-flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold px-7 py-3.5 rounded-xl text-base transition-all hover:shadow-lg hover:shadow-indigo-500/30">
                {isEn ? 'Start for free' : 'Zacznij bezpłatnie'} <ArrowRight size={16} />
              </Link>
              <Link to="/login" className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-7 py-3.5 rounded-xl text-base transition-all">
                {isEn ? 'I have an account' : 'Mam już konto'} <LogIn size={16} />
              </Link>
            </div>
            <p className="mt-4 text-xs text-indigo-300/60">
              {isEn ? 'Free registration · Data in EU · Full data ownership' : 'Rejestracja bezpłatna · Dane w UE · Pełna kontrola nad danymi'}
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-3">{isEn ? 'How does it work?' : 'Jak to działa?'}</h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              {isEn ? 'Deployment in 3 steps — no consultants, no months of configuration.' : 'Wdrożenie w 3 krokach — bez konsultantów, bez miesięcy konfiguracji.'}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {(isEn
              ? [
                { step: '01', title: 'Create your workspace', desc: 'Register, enter company details and select modules. System is ready in minutes.' },
                { step: '02', title: 'Import your data', desc: 'Load existing data from Excel, CSV, JPK or another system. Or start from scratch.' },
                { step: '03', title: 'Work and export', desc: 'Manage your company in one place. Generate tax files, compliance reports and export data anytime.' },
              ]
              : [
                { step: '01', title: 'Utwórz workspace', desc: 'Zarejestruj się, podaj dane firmy i wybierz moduły. System jest gotowy do pracy w kilka minut.' },
                { step: '02', title: 'Zaimportuj dane', desc: 'Wczytaj istniejące dane z Excela, CSV, JPK lub innego systemu. Możesz też zacząć od zera.' },
                { step: '03', title: 'Pracuj i eksportuj', desc: 'Zarządzaj firmą w jednym miejscu. Generuj JPK, KSeF, raporty ESG i eksportuj dane w dowolnym momencie.' },
              ]
            ).map(s => (
              <div key={s.step} className="relative p-6 bg-white rounded-2xl border border-slate-200 hover:border-indigo-200 hover:shadow-sm transition-all">
                <div className="text-4xl font-black text-indigo-100 mb-4">{s.step}</div>
                <h3 className="font-bold text-slate-900 mb-2">{s.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sectors */}
      <section id="sectors" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-3">
              {isEn ? 'For every industry and sector' : 'Dla każdej branży i sektora'}
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              {isEn ? 'Ready industry configurations — deploy in 1 day, not 3 months.' : 'Gotowe konfiguracje branżowe — wdróż w 1 dzień, nie w 3 miesiące.'}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {SECTORS.map(s => (
              <div key={s.labelPl} className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all text-center">
                <s.icon size={22} className="text-indigo-500" />
                <span className="text-xs font-bold text-slate-700">{isEn ? s.labelEn : s.labelPl}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-slate-400 mt-6">
            {isEn ? '… and dozens of other sectors — module configuration tailored to your industry' : '… i dziesiątki innych sektorów — konfiguracja modułów dopasowana do Twojej branży'}
          </p>
        </div>
      </section>

      {/* Use cases */}
      <UseCasesSection lang={lang} />

      {/* Modules */}
      <section id="modules" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-3">
              {isEn ? 'Everything your company needs' : 'Wszystko czego potrzebuje Twoja firma'}
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              {isEn ? 'Activate only the modules you need. One system instead of many scattered tools.' : 'Aktywuj tylko potrzebne moduły. Jeden system zamiast wielu rozproszonych narzędzi.'}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {MODULE_CARDS.map(m => (
              <div key={m.key} className="bg-slate-50 rounded-2xl border border-slate-200 p-6 hover:shadow-lg hover:border-indigo-200 transition-all group">
                <div className={`w-10 h-10 ${m.color} rounded-xl flex items-center justify-center mb-4 shadow-sm`}>
                  <m.icon size={18} className="text-white" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
                  {isEn ? m.titleEn : m.titlePl}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">{isEn ? m.descEn : m.descPl}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold mb-3">{isEn ? 'Security & legal compliance' : 'Bezpieczeństwo i zgodność prawna'}</h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              {isEn ? 'We meet GDPR, KSeF, ESG CSRD, labour law and EU security standard requirements.' : 'Spełniamy wymagania RODO, KSeF, ESG CSRD, prawa pracy i standardów bezpieczeństwa UE.'}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {security.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-4 bg-slate-800/60 rounded-xl border border-slate-700/50">
                <Check size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-slate-300">{item}</span>
              </div>
            ))}
          </div>
          <div className="text-center mt-10 text-xs text-slate-500 font-medium tracking-wide">
            {isEn ? 'Data in EU · GDPR · e-Invoice · ESG' : 'Dane w UE · RODO · KSeF · ESG'}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-indigo-600 text-white text-center">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl font-extrabold mb-4">{isEn ? 'Ready to change?' : 'Gotowy na zmianę?'}</h2>
          <p className="text-indigo-100 mb-8">
            {isEn ? 'Register and get started. Data in EU. Full control over your data.' : 'Zarejestruj się i zacznij korzystać. Dane w UE. Pełna kontrola nad swoimi danymi.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="inline-flex items-center justify-center gap-2 bg-white text-indigo-600 font-bold px-8 py-3.5 rounded-xl text-base hover:bg-indigo-50 transition-all">
              {isEn ? 'Register for free' : 'Zarejestruj się bezpłatnie'} <ArrowRight size={16} />
            </Link>
            <Link to="/login" className="inline-flex items-center justify-center gap-2 bg-indigo-700 text-white font-semibold px-8 py-3.5 rounded-xl text-base hover:bg-indigo-800 transition-all">
              {isEn ? 'I have an account' : 'Mam już konto'} <LogIn size={16} />
            </Link>
          </div>
          <p className="mt-4 text-xs text-indigo-200/70">
            {isEn ? 'Need a quote or demo? Write to' : 'Potrzebujesz wyceny lub demo? Napisz na'}{' '}
            <a href="mailto:kontakt@c-icas.gg" className="underline">kontakt@c-icas.gg</a>
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900">{isEn ? 'Frequently asked questions' : 'Najczęściej zadawane pytania'}</h2>
          </div>
          <div className="space-y-3">
            {faq.map((item, i) => (
              <div key={i} className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition-colors"
                >
                  <span className="font-semibold text-slate-900 text-sm">{item.q}</span>
                  <ChevronDown size={16} className={`text-slate-400 flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">{item.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.png" className="w-8 h-8 rounded-xl" alt="C-ICAS" />
            <span className="text-lg font-black tracking-tight">C-ICAS OS</span>
          </div>
          <div className="flex gap-6 text-xs font-medium text-slate-400">
            <a href="#" className="hover:text-white transition-colors">{isEn ? 'Privacy' : 'Prywatność'}</a>
            <a href="#" className="hover:text-white transition-colors">{isEn ? 'Terms' : 'Regulamin'}</a>
            <a href="mailto:kontakt@c-icas.gg" className="hover:text-white transition-colors">kontakt@c-icas.gg</a>
          </div>
          <div className="text-xs text-slate-500">© 2026 C-ICAS Operating System</div>
        </div>
      </footer>
    </div>
  );
}
