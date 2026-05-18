/**
 * Data: 2026-05-12 19:58
 * Opis: ADM-IMP-04: Strona Billing (Stripe Customer Portal embed).
 */
import React, { useState } from 'react';
import { toast } from '../../shared/utils/toast';
import { CreditCard, Zap, CheckCircle, ExternalLink, Globe, Shield } from 'lucide-react';

export default function BillingAdmin() {
  const [loadingPortal, setLoadingPortal] = useState(false);

  const handleOpenPortal = () => {
    setLoadingPortal(true);
    // Symulacja otwierania portalu Stripe
    setTimeout(() => {
      toast.info('Przekierowanie do Stripe Customer Portal... (W środowisku produkcyjnym nastąpi przekierowanie do billing.stripe.com)');
      setLoadingPortal(false);
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="bg-slate-900 p-8 text-white">
          <div className="flex items-center gap-4 mb-2">
            <CreditCard className="h-8 w-8 text-emerald-400" />
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Billing & Subscription</h1>
          </div>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Zarządzanie płatnościami, planem i fakturami</p>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Plan Info */}
            <div className="lg:col-span-2 space-y-8">
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-2 block">Aktualny Plan</span>
                  <h2 className="text-4xl font-black text-slate-900 uppercase italic">Enterprise OS</h2>
                  <div className="flex items-center gap-4 mt-4">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Status:</span>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                      <CheckCircle size={12} /> Aktywny
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="block text-4xl font-black text-slate-900">4,999 PLN</span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">mieś. / bez limitu userów</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 border border-slate-100 rounded-2xl bg-white shadow-sm">
                  <Globe className="text-slate-400 mb-2" size={20} />
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Następna Płatność</span>
                  <span className="block text-lg font-black text-slate-900 italic">01 CZE 2026</span>
                </div>
                <div className="p-6 border border-slate-100 rounded-2xl bg-white shadow-sm">
                  <Shield className="text-slate-400 mb-2" size={20} />
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Metoda Płatności</span>
                  <span className="block text-lg font-black text-slate-900 italic">VISA •••• 4242</span>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 border-l-4 border-emerald-500 pl-4">Zalety Twojego Planu</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    'Nielimitowana liczba użytkowników',
                    'Wszystkie moduły branżowe (Budowa, Flota, HR)',
                    'Wsparcie AI Architekta 24/7',
                    'Własna domena .c-icas.com',
                    'Dedykowany opiekun klienta',
                    'SLA 99.99%'
                  ].map((benefit, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl text-xs font-bold text-slate-700 uppercase tracking-tight">
                      <CheckCircle className="text-emerald-500" size={14} />
                      {benefit}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-4">
              <div className="p-6 bg-indigo-600 rounded-3xl text-white shadow-xl shadow-indigo-200">
                <Zap className="mb-4 text-indigo-200" size={32} />
                <h3 className="text-xl font-black uppercase italic mb-2 leading-tight">Zarządzaj w Stripe</h3>
                <p className="text-sm text-indigo-100 font-bold mb-6 opacity-80">
                  Użyj bezpiecznego portalu Stripe, aby zmienić metodę płatności, pobrać faktury lub zmienić plan.
                </p>
                <button 
                  onClick={handleOpenPortal}
                  disabled={loadingPortal}
                  className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-lg outline-none"
                >
                  {loadingPortal ? 'Ładowanie...' : <><ExternalLink size={14} /> Otwórz Portal</>}
                </button>
              </div>

              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Potrzebujesz pomocy?</h4>
                <p className="text-xs font-bold text-slate-700 leading-relaxed uppercase tracking-tight mb-4">
                  Nasi specjaliści finansowi są dostępni od poniedziałku do piątku w godzinach 8:00 - 16:00.
                </p>
                <button className="text-indigo-600 text-xs font-black uppercase tracking-widest hover:underline flex items-center gap-2">
                  Kontakt z działem billing <ExternalLink size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
