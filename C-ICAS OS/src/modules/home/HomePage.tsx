import { Link } from "react-router-dom";
import {
  ArrowRight, Users, BarChart2, FileText, Briefcase,
  Shield, Cpu, CheckCircle2, ChevronRight,
} from "lucide-react";

const MODULES = [
  { icon: Users,     title: "HR & Kadry",          desc: "Pełny cykl życia pracownika — onboarding, umowy, urlopy, płace, offboarding.",  color: "bg-indigo-500" },
  { icon: Briefcase, title: "CRM & Sprzedaż",       desc: "Zarządzanie klientami, szansami sprzedaży i aktywnościami handlowymi.",         color: "bg-violet-500" },
  { icon: BarChart2, title: "Finanse & Kontroling", desc: "Faktury, wydatki, KSeF, budżetowanie i pełny controlling finansowy.",           color: "bg-blue-500"   },
  { icon: FileText,  title: "Projekty & Zadania",   desc: "Zarządzanie projektami, zadaniami, sprintami i rejestracją czasu pracy.",        color: "bg-cyan-500"   },
  { icon: Shield,    title: "Compliance & RODO",    desc: "Pełna zgodność z RODO, KSeF, ESG CSRD, sygnalista i audyt wewnętrzny.",         color: "bg-emerald-500"},
  { icon: Cpu,       title: "AI Copilot",           desc: "Asystent AI w każdym module — automatyzacja, analiza i rekomendacje w czasie rzeczywistym.", color: "bg-rose-500" },
];

const STATS = [
  { value: "100+", label: "Modułów" },
  { value: "14+",  label: "Krajów" },
  { value: "35+",  label: "Raportów" },
  { value: "99.9%",label: "Uptime SLA" },
];

const FEATURES = [
  "Bezpłatny trial 14 dni, brak karty kredytowej",
  "Dane przechowywane w centrach danych UE",
  "Zgodność z RODO, KSeF, ESG i prawem pracy",
  "Szyfrowanie end-to-end i MFA",
];

export default function HomePage() {
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
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#modules" className="hover:text-indigo-600 transition-colors">Moduły</a>
            <a href="#use-cases" className="hover:text-indigo-600 transition-colors">Zastosowania</a>
            <a href="#security" className="hover:text-indigo-600 transition-colors">Bezpieczeństwo</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors">
              Zaloguj się
            </Link>
            <Link to="/register" className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all shadow-sm hover:shadow-indigo-500/30 hover:shadow-md">
              Zacznij bezpłatnie <ArrowRight size={14} />
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
              Nowa wersja v2.6 — AI Copilot + ESG Reporting
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight mb-6">
              Jeden system<br />
              <span className="text-indigo-300">dla całej firmy</span>
            </h1>
            <p className="text-lg sm:text-xl text-indigo-100/80 leading-relaxed mb-8 max-w-2xl">
              C-ICAS OS to modułowy, chmurowy ERP dla polskich MŚP i przedsiębiorstw.
              HR, CRM, Finanse, Projekty, Compliance i AI Copilot — wszystko w jednym miejscu.
            </p>
            <div className="flex flex-wrap gap-5 mb-10 text-sm">
              {STATS.map(s => (
                <div key={s.label} className="flex items-center gap-2">
                  <span className="font-bold text-indigo-300 text-lg">{s.value}</span>
                  <span className="text-indigo-200/70">{s.label}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/register"
                className="inline-flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold px-7 py-3.5 rounded-xl text-base transition-all hover:shadow-lg hover:shadow-indigo-500/30">
                Zacznij bezpłatnie <ArrowRight size={16} />
              </Link>
              <Link to="/login"
                className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-7 py-3.5 rounded-xl text-base transition-all">
                Mam już konto <ChevronRight size={16} />
              </Link>
            </div>
            <p className="mt-4 text-xs text-indigo-300/60">Bezpłatny trial 14 dni · Brak karty kredytowej · Anuluj w dowolnym momencie</p>
          </div>
        </div>
      </section>

      {/* Modules */}
      <section id="modules" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-3">Wszystko czego potrzebuje Twoja firma</h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">Jeden system zamiast wielu rozproszonych narzędzi. Integracja natywna, brak silosów danych.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {MODULES.map(m => (
              <div key={m.title} className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg hover:border-slate-300 transition-all group">
                <div className={`w-10 h-10 ${m.color} rounded-xl flex items-center justify-center mb-4 shadow-sm`}>
                  <m.icon size={18} className="text-white" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">{m.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases strip */}
      <section id="use-cases" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-3xl p-8 md:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold mb-3">Gotowe dla każdego rodzaju firmy</h2>
              <p className="text-indigo-100 max-w-lg">Produkcja, usługi, handel, NGO, budownictwo, logistyka, serwis techniczny — C-ICAS OS dopasowuje się do Twojej branży.</p>
            </div>
            <Link to="/register"
              className="flex-shrink-0 inline-flex items-center gap-2 bg-white text-indigo-700 font-bold px-7 py-3.5 rounded-2xl text-base hover:shadow-xl transition-all hover:scale-105">
              Wypróbuj za darmo <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-3">Bezpieczeństwo klasy enterprise</h2>
            <p className="text-slate-500 text-lg">Twoje dane są chronione zgodnie z najwyższymi standardami.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {FEATURES.map(f => (
              <div key={f} className="flex items-start gap-3 bg-white rounded-xl border border-slate-200 p-4">
                <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-slate-700 font-medium">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-indigo-950 text-white text-center">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Gotowy na zmianę?</h2>
          <p className="text-indigo-200 text-lg mb-8">Zacznij bezpłatny trial i przekonaj się, jak C-ICAS OS usprawnia Twoją firmę.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register"
              className="inline-flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold px-8 py-4 rounded-2xl text-base transition-all hover:shadow-xl">
              Zacznij bezpłatnie — 14 dni trial <ArrowRight size={16} />
            </Link>
            <Link to="/login"
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-8 py-4 rounded-2xl text-base transition-all">
              Mam już konto
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-[10px]">CI</span>
            </div>
            <span className="font-bold text-slate-300">C-ICAS OS</span>
            <span className="text-slate-600">· © {new Date().getFullYear()} C-ICAS</span>
          </div>
          <div className="flex gap-6 text-xs">
            <a href="https://os.c-icas.eu/privacy" target="_blank" rel="noreferrer" className="hover:text-slate-200 transition-colors">Polityka Prywatności</a>
            <a href="https://os.c-icas.eu/terms" target="_blank" rel="noreferrer" className="hover:text-slate-200 transition-colors">Regulamin</a>
            <a href="https://os.c-icas.eu/security" target="_blank" rel="noreferrer" className="hover:text-slate-200 transition-colors">Bezpieczeństwo</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
