import { Link } from "react-router-dom";
import {
  ArrowRight, CheckCircle2, ChevronRight, Shield, Cpu, BarChart2,
  FileText, Briefcase, Users, Building2, Globe, Download, Upload,
  Layers, Zap, RefreshCw, Lock, Database, BookOpen, Factory,
  Truck, Stethoscope, Hammer, ShoppingCart, GraduationCap, Leaf,
} from "lucide-react";
import { useI18n, LangSwitcher } from "../../shared/i18n/i18nProvider";
import { homeT, HomeLang } from "./homeTranslations";

const MODULES_DATA = [
  { icon: Users,     color: "bg-indigo-500", key: 'hr',    titlePl: "HR & Kadry",           titleEn: "HR & Payroll",        descPl: "Pełny cykl życia pracownika — onboarding, umowy, urlopy, płace, struktura org, offboarding.", descEn: "Full employee lifecycle — onboarding, contracts, leave, payroll, org structure, offboarding." },
  { icon: Briefcase, color: "bg-violet-500", key: 'crm',   titlePl: "CRM & Sprzedaż",       titleEn: "CRM & Sales",         descPl: "Klienci, szanse sprzedaży, oferty, faktury, pipeline i raporty handlowe.", descEn: "Clients, opportunities, quotes, invoices, pipeline and sales reports." },
  { icon: BarChart2, color: "bg-blue-500",   key: 'fin',   titlePl: "Finanse & Kontroling", titleEn: "Finance & Controlling", descPl: "FK, KSeF, rozrachunki, kasy, banki, środki trwałe, budżetowanie, controlling.", descEn: "GL, e-Invoicing, settlements, cash, banks, assets, budgeting, controlling." },
  { icon: FileText,  color: "bg-cyan-500",   key: 'proj',  titlePl: "Projekty & Czas Pracy",titleEn: "Projects & Time",     descPl: "Kanban, Gantt, sprinty, rejestracja czasu, rozliczenia projektowe.", descEn: "Kanban, Gantt, sprints, time tracking, project billing." },
  { icon: Shield,    color: "bg-emerald-500",key: 'comp',  titlePl: "Compliance & RODO",    titleEn: "Compliance & GDPR",   descPl: "Rejestr czynności, sygnalista, ESG/CSRD, RODO, ISO, BCM i audyt wewnętrzny.", descEn: "Processing register, whistleblower, ESG/CSRD, GDPR, ISO, BCM and internal audit." },
  { icon: Cpu,       color: "bg-rose-500",   key: 'ai',    titlePl: "AI Coach & Asystent",  titleEn: "AI Coach & Assistant",descPl: "Dwa tryby AI: Coach pracuje za Ciebie (automatyzuje, generuje raporty), Asystent odpowiada na pytania.", descEn: "Two AI modes: Coach automates tasks and generates reports; Assistant answers questions without touching data." },
  { icon: Globe,     color: "bg-orange-500", key: 'dms',   titlePl: "E-podpis & Obieg Dok.",titleEn: "e-Sign & Documents",  descPl: "Podpis elektroniczny, obieg dokumentów, DMS, archiwum i wersjonowanie.", descEn: "Electronic signature, document workflow, DMS, archive and versioning." },
  { icon: Truck,     color: "bg-teal-500",   key: 'log',   titlePl: "Logistyka & Serwis",   titleEn: "Logistics & Service", descPl: "Flota, serwis terenowy, rezerwacje, magazyn, zlecenia i harmonogramowanie.", descEn: "Fleet, field service, bookings, warehouse, work orders and scheduling." },
  { icon: Layers,    color: "bg-pink-500",   key: 'multi', titlePl: "Multi-Firma",          titleEn: "Multi-Entity",        descPl: "Zarządzaj wieloma spółkami/oddziałami w jednym pulpicie. Konsolidacja automatyczna.", descEn: "Manage multiple entities in one dashboard. Automatic consolidation." },
];

const BUSINESS_TYPES = [
  { label: "JDG",             descPl: "Jednoosobowa działalność gospodarcza",      descEn: "Sole trader" },
  { label: "Sp. z o.o.",      descPl: "Spółka z ograniczoną odpowiedzialnością",  descEn: "Limited liability company (Ltd)" },
  { label: "S.A.",            descPl: "Spółka akcyjna",                            descEn: "Joint-stock company (JSC)" },
  { label: "Sp. j.",          descPl: "Spółka jawna",                              descEn: "General partnership" },
  { label: "Sp. k.",          descPl: "Spółka komandytowa",                        descEn: "Limited partnership" },
  { label: "S.K.A.",          descPl: "Spółka komandytowo-akcyjna",               descEn: "Limited joint-stock partnership" },
  { label: "Sp. p.",          descPl: "Spółka partnerska",                         descEn: "Professional partnership" },
  { label: "Fundacja / NGO",  descPl: "Fundacja, stowarzyszenie, OPP",            descEn: "Foundation / NGO / Association" },
  { label: "Spółdzielnia",    descPl: "Spółdzielnia pracy i mieszkaniowa",        descEn: "Co-operative" },
  { label: "Holding / Grupa", descPl: "Wielospółkowa struktura z konsolidacją",   descEn: "Multi-entity group with consolidation" },
];

const SECTORS = [
  { icon: Factory,       labelPl: "Produkcja & Przemysł",    labelEn: "Manufacturing" },
  { icon: Truck,         labelPl: "Transport & Logistyka",   labelEn: "Transport & Logistics" },
  { icon: Hammer,        labelPl: "Budownictwo",             labelEn: "Construction" },
  { icon: ShoppingCart,  labelPl: "Handel & E-commerce",     labelEn: "Retail & E-commerce" },
  { icon: Stethoscope,   labelPl: "Opieka Zdrowotna",        labelEn: "Healthcare" },
  { icon: GraduationCap, labelPl: "Edukacja & Szkolenia",    labelEn: "Education & Training" },
  { icon: Leaf,          labelPl: "Usługi & Serwis",         labelEn: "Services" },
  { icon: BookOpen,      labelPl: "Finanse & Doradztwo",     labelEn: "Finance & Consulting" },
  { icon: Globe,         labelPl: "IT & Technologia",        labelEn: "IT & Technology" },
  { icon: Building2,     labelPl: "Nieruchomości & Facility",labelEn: "Real Estate & Facility" },
];

const LEGAL_FEATURES_PL = [
  "Dane przechowywane wyłącznie w centrach danych UE (Google Cloud EU)",
  "Zgodność z RODO / GDPR — pełny rejestr czynności przetwarzania",
  "KSeF — integracja z Krajowym Systemem e-Faktur",
  "ESG & CSRD — raporty ESG zgodne z dyrektywą EU 2022/2464",
  "JPK_V7M/V7K, JPK_FA, JPK_CIT — eksport plików kontrolnych",
  "Sygnalista — moduł zgodny z dyrektywą EU 2019/1937",
  "Architektura zgodna z zasadami ISO 27001 — szyfrowanie TLS + spoczynek",
  "MFA, SSO, Role RBAC, Logi audytowe, IP whitelisting",
];

const LEGAL_FEATURES_EN = [
  "Data stored exclusively in EU data centres (Google Cloud EU)",
  "GDPR compliant — full processing activities register",
  "e-Invoicing — National e-Invoice System (KSeF) integration",
  "ESG & CSRD — reports compliant with EU Directive 2022/2464",
  "Standard Audit Files (JPK) — V7M, V7K, FA, CIT export",
  "Whistleblower module — compliant with EU Directive 2019/1937",
  "ISO 27001-aligned architecture — TLS + at-rest encryption",
  "MFA, SSO, RBAC roles, Audit logs, IP whitelisting",
];

export default function HomePage() {
  const { lang, setLang } = useI18n();
  const L = lang as HomeLang;
  const T = homeT[L] ?? homeT.pl;

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <span className="text-white font-black text-xs">CI</span>
            </div>
            <span className="text-lg font-black tracking-tight text-slate-900">C-ICAS OS</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#how-it-works" className="hover:text-indigo-600 transition-colors">{T.nav.howItWorks}</a>
            <a href="#modules"      className="hover:text-indigo-600 transition-colors">{T.nav.modules}</a>
            <a href="#for-whom"     className="hover:text-indigo-600 transition-colors">{T.nav.forWhom}</a>
            <a href="#sectors"      className="hover:text-indigo-600 transition-colors">{T.nav.sectors}</a>
            <a href="#faq"          className="hover:text-indigo-600 transition-colors">{T.nav.faq}</a>
          </nav>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1 bg-slate-100 rounded-xl p-0.5">
              {(['pl', 'en'] as HomeLang[]).map(l => (
                <button key={l} onClick={() => setLang(l as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase transition-all ${lang === l ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}>
                  {l === 'pl' ? '🇵🇱 PL' : '🇬🇧 EN'}
                </button>
              ))}
            </div>
            <Link to="/login" className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors">
              {lang === 'en' ? 'Log in' : 'Zaloguj się'}
            </Link>
            <Link to="/register" className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all shadow-sm">
              {T.hero.cta1} <ArrowRight size={14} />
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
              {T.hero.badge}
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight mb-6">
              {T.hero.h1a}<br /><span className="text-indigo-300">{T.hero.h1b}</span>
            </h1>
            <p className="text-lg sm:text-xl text-indigo-100/80 leading-relaxed mb-6 max-w-2xl">{T.hero.sub}</p>
            <div className="flex flex-wrap gap-3 mb-10">
              {T.hero.tags.map(tag => (
                <span key={tag} className="text-xs px-3 py-1.5 bg-indigo-800/60 border border-indigo-600/40 rounded-full text-indigo-200">{tag}</span>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/register" className="inline-flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold px-7 py-3.5 rounded-xl text-base transition-all hover:shadow-lg hover:shadow-indigo-500/30">
                {T.hero.cta1} <ArrowRight size={16} />
              </Link>
              <Link to="/login" className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-7 py-3.5 rounded-xl text-base transition-all">
                {T.hero.cta2} <ChevronRight size={16} />
              </Link>
            </div>
            <p className="mt-4 text-xs text-indigo-300/60">{T.hero.sub2}</p>
          </div>
        </div>
      </section>

      {/* One Ecosystem */}
      <section id="ecosystem" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-3">{T.ecosystem.h2}</h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">{T.ecosystem.sub}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {([
              { icon: Layers, color: "text-indigo-600 bg-indigo-50" },
              { icon: Upload, color: "text-violet-600 bg-violet-50" },
              { icon: Download,color: "text-blue-600 bg-blue-50" },
            ] as const).map((f, i) => (
              <div key={i} className="flex flex-col gap-4 p-6 rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${f.color}`}><f.icon size={22} /></div>
                <h3 className="font-bold text-slate-900 text-lg">{T.ecosystem.cards[i].title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{T.ecosystem.cards[i].desc}</p>
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {([Zap, RefreshCw, Database, Lock] as const).map((Icon, i) => (
              <div key={i} className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <Icon size={16} className="text-indigo-500 flex-shrink-0" />
                <span className="text-sm text-slate-700 font-medium">{T.ecosystem.features[i]}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-3">{T.howItWorks.h2}</h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">{T.howItWorks.sub}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {T.howItWorks.steps.map((s, i) => {
              const colors = ["text-indigo-600 bg-indigo-50 border-indigo-200", "text-violet-600 bg-violet-50 border-violet-200", "text-blue-600 bg-blue-50 border-blue-200"];
              return (
                <div key={s.step} className={`p-6 rounded-2xl border-2 ${colors[i]}`}>
                  <div className={`text-4xl font-black mb-3 ${colors[i].split(' ')[0]}`}>{s.step}</div>
                  <h3 className="font-bold text-slate-900 text-lg mb-2">{s.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* For Whom */}
      <section id="for-whom" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-3">{T.forWhom.h2}</h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">{T.forWhom.sub}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {T.forWhom.cards.map((w, i) => {
              const colors = ["border-indigo-200 bg-indigo-50", "border-violet-200 bg-violet-50", "border-blue-200 bg-blue-50"];
              return (
                <div key={i} className={`rounded-2xl border-2 p-6 flex flex-col gap-4 ${colors[i]}`}>
                  <div>
                    <div className="font-black text-slate-900 text-lg mb-1">{w.title}</div>
                    <div className="text-sm text-slate-500">{w.sub}</div>
                  </div>
                  <ul className="space-y-2 flex-1">
                    {w.points.map(p => (
                      <li key={p} className="flex items-start gap-2 text-sm text-slate-700">
                        <CheckCircle2 size={15} className="text-indigo-500 flex-shrink-0 mt-0.5" />{p}
                      </li>
                    ))}
                  </ul>
                  <Link to="/register" className="inline-flex items-center gap-1.5 text-indigo-700 font-bold text-sm hover:text-indigo-900 transition-colors">
                    {w.cta} <ChevronRight size={14} />
                  </Link>
                </div>
              );
            })}
          </div>
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-8">
            <h3 className="text-xl font-extrabold text-slate-900 mb-2">{T.forWhom.typesH}</h3>
            <p className="text-slate-500 text-sm mb-6">{T.forWhom.typesSub}</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {BUSINESS_TYPES.map(b => (
                <div key={b.label} className="p-3 rounded-xl bg-white border border-slate-200">
                  <div className="font-black text-indigo-700 text-sm mb-0.5">{b.label}</div>
                  <div className="text-[11px] text-slate-500">{lang === 'en' ? b.descEn : b.descPl}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Multi-company */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-3xl p-8 md:p-12 text-white">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-indigo-800/60 border border-indigo-600/40 rounded-full px-3 py-1 text-xs mb-4">
                  <Building2 size={12} /> Multi-Firma &amp; Multi-Tenant
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold mb-4">{T.multiEntity.h2}</h2>
                <p className="text-indigo-200 leading-relaxed mb-6">{T.multiEntity.sub}</p>
                <ul className="space-y-2">
                  {T.multiEntity.points.map(p => (
                    <li key={p} className="flex items-start gap-2 text-sm text-indigo-100">
                      <CheckCircle2 size={14} className="text-indigo-400 flex-shrink-0 mt-0.5" />{p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: lang === 'en' ? '1 Tenant' : '1 Tenant', sub: lang === 'en' ? 'Holding / Group' : 'Holding / Grupa', desc: lang === 'en' ? 'Entities A, B, C in one workspace. Automatic consolidation.' : 'Spółki A, B, C w jednym workspace. Konsolidacja automatyczna.', color: "bg-indigo-800/50 border-indigo-600/40" },
                  { label: 'N Tenants', sub: lang === 'en' ? 'Accounting firm' : 'Biuro Rachunkowe', desc: lang === 'en' ? 'Each client is a separate isolated tenant. Central management panel.' : 'Każdy klient to osobny izolowany tenant. Centralny panel zarządzający.', color: "bg-violet-800/50 border-violet-600/40" },
                  { label: 'Multi-Region', sub: lang === 'en' ? 'Foreign branch' : 'Oddział zagraniczny', desc: lang === 'en' ? 'Local currency, language, tax law — configured per entity.' : 'Waluta lokalna, język, prawo podatkowe — konfiguracja per spółka.', color: "bg-blue-800/50 border-blue-600/40" },
                  { label: 'API Connect', sub: lang === 'en' ? 'System integration' : 'Integracja systemów', desc: lang === 'en' ? 'REST API + webhooks — connect to external systems without migration.' : 'REST API + webhooks — połącz z zewnętrznymi systemami bez migracji.', color: "bg-teal-800/50 border-teal-600/40" },
                ].map(c => (
                  <div key={c.label} className={`p-4 rounded-xl border ${c.color}`}>
                    <div className="font-black text-white mb-0.5 text-sm">{c.label}</div>
                    <div className="text-[10px] text-indigo-300 mb-2 uppercase tracking-wide">{c.sub}</div>
                    <div className="text-xs text-indigo-200/80 leading-relaxed">{c.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sectors */}
      <section id="sectors" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-3">{T.sectors.h2}</h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">{T.sectors.sub}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {SECTORS.map(s => (
              <div key={s.labelPl} className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all text-center">
                <s.icon size={22} className="text-indigo-500" />
                <span className="text-xs font-bold text-slate-700">{lang === 'en' ? s.labelEn : s.labelPl}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-slate-400 mt-6">{T.sectors.more}</p>
        </div>
      </section>

      {/* Modules */}
      <section id="modules" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-3">{T.modules.h2}</h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">{T.modules.sub}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {MODULES_DATA.map(m => (
              <div key={m.key} className="bg-slate-50 rounded-2xl border border-slate-200 p-6 hover:shadow-lg hover:border-indigo-200 transition-all group">
                <div className={`w-10 h-10 ${m.color} rounded-xl flex items-center justify-center mb-4 shadow-sm`}>
                  <m.icon size={18} className="text-white" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">{lang === 'en' ? m.titleEn : m.titlePl}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{lang === 'en' ? m.descEn : m.descPl}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-3">{T.security.h2}</h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">{T.security.sub}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(lang === 'en' ? LEGAL_FEATURES_EN : LEGAL_FEATURES_PL).map(f => (
              <div key={f} className="flex items-start gap-3 bg-white rounded-xl border border-slate-200 p-4">
                <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-xs text-slate-700 font-medium leading-relaxed">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-3">{T.faq.h2}</h2>
          </div>
          <div className="space-y-4">
            {T.faq.items.map(({ q, a }) => (
              <details key={q} className="group border border-slate-200 rounded-xl overflow-hidden">
                <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50 transition-colors font-semibold text-slate-900 text-sm list-none">
                  {q}
                  <ChevronRight size={16} className="text-slate-400 flex-shrink-0 group-open:rotate-90 transition-transform" />
                </summary>
                <div className="px-5 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">{a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-indigo-950 text-white text-center">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4">{T.cta.h2}</h2>
          <p className="text-indigo-200 text-lg mb-8">{T.cta.sub}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="inline-flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold px-8 py-4 rounded-2xl text-base transition-all hover:shadow-xl">
              {T.cta.btn1} <ArrowRight size={16} />
            </Link>
            <Link to="/login" className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-8 py-4 rounded-2xl text-base transition-all">
              {T.cta.btn2}
            </Link>
          </div>
          <p className="mt-6 text-xs text-indigo-400">{T.cta.contact} <a href="mailto:mc@c-icas.gg" className="underline hover:text-white">mc@c-icas.gg</a></p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 pt-12 pb-8 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-black text-[10px]">CI</span>
                </div>
                <span className="font-bold text-slate-200 text-base">C-ICAS OS</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{T.footer.desc}</p>
              <p className="text-xs text-slate-600 mt-3">
                C-ICAS — Czaja Independent Consulting<br />
                NIP: PL [do uzupełnienia]<br />
                <a href="mailto:mc@c-icas.gg" className="hover:text-slate-300">mc@c-icas.gg</a>
              </p>
            </div>
            <div>
              <div className="font-bold text-slate-300 text-xs uppercase tracking-widest mb-3">{T.footer.product}</div>
              <ul className="space-y-2 text-xs">
                {T.footer.productLinks.map(l => <li key={l}><a href="#modules" className="hover:text-slate-200 transition-colors">{l}</a></li>)}
              </ul>
            </div>
            <div>
              <div className="font-bold text-slate-300 text-xs uppercase tracking-widest mb-3">{T.footer.company}</div>
              <ul className="space-y-2 text-xs">
                {T.footer.companyLinks.map(l => <li key={l}><a href="#" className="hover:text-slate-200 transition-colors">{l}</a></li>)}
              </ul>
            </div>
            <div>
              <div className="font-bold text-slate-300 text-xs uppercase tracking-widest mb-3">{T.footer.legal}</div>
              <ul className="space-y-2 text-xs">
                {T.footer.legalLinks.map(([label, href]) => (
                  <li key={label}><a href={`https://os.c-icas.eu${href}`} target="_blank" rel="noreferrer" className="hover:text-slate-200">{label}</a></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-600">
            <div>© {new Date().getFullYear()} C-ICAS. {T.footer.copy} {T.footer.puodo}</div>
            <div className="flex items-center gap-1.5 text-slate-500">
              <span className="w-2 h-2 bg-emerald-500 rounded-full" />
              {T.footer.status}
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
