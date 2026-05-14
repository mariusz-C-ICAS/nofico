import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Zap, Shield, TrendingUp, Users, 
  MapPin, Cpu, ArrowRight, CheckCircle2, 
  Globe, BarChart3, Lock
} from 'lucide-react';
import { db } from '../../shared/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function LandingPage() {
  const [email, setEmail] = useState('');
  const [partnerTenants, setPartnerTenants] = useState<any[]>([]);

  const handleStart = () => {
    const signupPath = email ? `/auth/signup?email=${encodeURIComponent(email)}` : '/auth/signup';
    window.location.href = signupPath;
  };

  useEffect(() => {
    const loadPartners = async () => {
      try {
        const q = query(collection(db, 'tenants'), where('showOnLanding', '==', true));
        const snap = await getDocs(q);
        setPartnerTenants(snap.docs.map(d => d.data()));
      } catch (e) {
        console.error("Error loading partners:", e);
      }
    };
    loadPartners();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
              <Zap size={18} className="text-white" />
            </div>
            <span className="font-black tracking-tighter text-xl text-slate-900 uppercase italic">C-ICAS <span className="text-indigo-600">Elite</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors uppercase tracking-widest">Funkcje</a>
            <a href="#industry" className="text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors uppercase tracking-widest">Branże</a>
            <Link to="/login" className="px-6 py-2 bg-slate-900 text-white rounded-full text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-200">Panel Logowania</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-4 py-1.5 rounded-full mb-6">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">System Operacyjny Przyszłości 2026</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 leading-[0.9] tracking-tighter mb-6 uppercase italic">
              Zarządzaj Firmą <br/>
              <span className="text-indigo-600">Bez Kompromisów</span>
            </h1>
            <p className="text-xl text-slate-500 font-medium mb-10 max-w-lg leading-relaxed">
              Kompletny ekosystem ERP dla nowoczesnych przedsiębiorstw. Budownictwo, Flota, HR, Finanse i AI w jednej, potężnej platformie.
            </p>
            
            <div className="max-w-md">
              <div className="bg-white p-2 rounded-3xl border border-slate-200 shadow-xl flex flex-col sm:flex-row gap-2">
                <input 
                   type="email" 
                   placeholder="Wpisz swój email..."
                   className="flex-1 px-6 py-4 rounded-2xl bg-slate-50 outline-none font-bold text-slate-900 border-none focus:ring-0"
                   value={email}
                   onChange={(e) => setEmail(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                />
                <button 
                  onClick={handleStart}
                  className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  Zacznij <ArrowRight size={18} />
                </button>
              </div>
              <p className="mt-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest px-4">Już masz konto? <Link to="/auth/login" className="text-indigo-600 underline">Zaloguj się</Link></p>
            </div>
            
            {partnerTenants.length > 0 && (
               <div className="mt-12">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Zaufali nam:</div>
                  <div className="flex flex-wrap items-center gap-6">
                     {partnerTenants.map((partner, idx) => (
                        partner.websiteUrl ? (
                           <a key={idx} href={partner.websiteUrl} target="_blank" rel="noreferrer" className="block hover:opacity-80 transition-opacity">
                              {partner.logoUrl ? (
                                 <img src={partner.logoUrl} alt={partner.name} className="h-8 object-contain grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all" />
                              ) : (
                                 <span className="font-bold text-slate-600 border border-slate-200 px-3 py-1 rounded shadow-sm text-xs">{partner.name}</span>
                              )}
                           </a>
                        ) : (
                           <div key={idx}>
                              {partner.logoUrl ? (
                                 <img src={partner.logoUrl} alt={partner.name} className="h-8 object-contain grayscale opacity-60" />
                              ) : (
                                 <span className="font-bold text-slate-600 border border-slate-200 px-3 py-1 rounded shadow-sm text-xs">{partner.name}</span>
                              )}
                           </div>
                        )
                     ))}
                  </div>
               </div>
            )}
          </div>
          <div className="relative">
             <div className="absolute -inset-4 bg-indigo-500/10 blur-3xl rounded-full"></div>
             <div className="relative bg-white border border-slate-200 p-2 rounded-[2.5rem] shadow-2xl overflow-hidden aspect-video group">
                <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1000" className="w-full h-full object-cover rounded-[2rem] group-hover:scale-105 transition-transform duration-700" alt="Dashboard Preview" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent"></div>
                <div className="absolute bottom-8 left-8 flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 text-white text-xs font-bold uppercase tracking-widest">
                   <Zap size={14} className="text-amber-400" /> Real-time Analytics
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-slate-900 py-20 text-white">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-12">
          <div className="text-center">
            <div className="text-4xl font-black text-indigo-400 mb-2">99.9%</div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Uptime Systemu</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-black text-indigo-400 mb-2">15 min</div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Czas Wdrożenia</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-black text-indigo-400 mb-2">NoFiCo</div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Finanse PSD2/KSeF</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-black text-indigo-400 mb-2">24/7</div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Wsparcie AI</div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 px-6">
        <div className="max-w-7xl mx-auto text-center mb-20">
          <h2 className="text-xs font-black uppercase tracking-[0.4em] text-indigo-600 mb-4">Filary Twojego Biznesu</h2>
          <h3 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase italic">Wszystko czego potrzebujesz <br/> pod jednym <span className="text-indigo-600 underline decoration-indigo-200">Adresem</span></h3>
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard 
            icon={<MapPin className="text-indigo-600" />}
            title="Logistyka & Flota 2026"
            desc="Kody QR, śledzenie degradacji sprzętu za pomocą zdjęć AI, geo-fencing i pełna gospodarka magazynowa."
          />
          <FeatureCard 
            icon={<TrendingUp className="text-emerald-600" />}
            title="NoFiCo Financial System"
            desc="Bezpośrednia integracja PSD2 z Twoim bankiem, KSeF Offline24 i automatyczne rozrachunki faktur."
          />
          <FeatureCard 
            icon={<Users className="text-blue-600" />}
            title="Elite-HR & Kadry"
            desc="Automatyczne listy płac, paski wynagrodzeń, rekrutacja AI i moduł szkoleń z certyfikacją Elite."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center shadow-lg">
              <Zap size={18} className="text-white" />
            </div>
            <span className="font-black tracking-tighter text-xl text-slate-900 uppercase italic">C-ICAS <span className="text-indigo-600">Elite</span></span>
          </div>
          <div className="flex gap-8 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <a href="#" className="hover:text-slate-900">Prywatność</a>
            <a href="#" className="hover:text-slate-900">Regulamin</a>
            <a href="#" className="hover:text-slate-900">Kontakt</a>
          </div>
          <div className="text-[10px] font-bold text-slate-400">© 2026 C-ICAS Operating System. Wszelkie prawa zastrzeżone.</div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="bg-white border border-slate-200 p-10 rounded-[2rem] hover:border-indigo-600 hover:shadow-2xl transition-all group">
      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-indigo-50 transition-colors">
        {icon}
      </div>
      <h4 className="text-xl font-black text-slate-800 mb-4 uppercase italic tracking-tight">{title}</h4>
      <p className="text-slate-500 font-medium leading-relaxed">{desc}</p>
    </div>
  );
}

function Sparkles(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
  );
}
