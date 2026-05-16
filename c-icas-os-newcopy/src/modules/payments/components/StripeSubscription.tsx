/**
 * Data: 2026-05-12
 * Zmiany: Zarządzanie subskrypcjami Stripe.
 * Ścieżka: /src/modules/payments/components/StripeSubscription.tsx
 */
import React, { useState } from 'react';
import { Check, Zap, ShieldCheck, Crown, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');

export default function StripeSubscription() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleActivate = async (planId: string, planName: string) => {
    setLoadingPlan(planId);
    setError(null);
    try {
      const response = await fetch('/api/v1/payments/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: planId, planName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Błąd połączenia ze Stripe');
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoadingPlan(null);
    }
  };

  const plans = [
    {
      id: 'plan_basic',
      name: 'Starter',
      price: '49',
      currency: 'PLN',
      features: ['Podstawowy CRM', '5 użytkowników', '2GB Vault'],
      color: 'bg-slate-100',
      icon: Zap
    },
    {
      id: 'plan_pro',
      name: 'Professional',
      price: '199',
      currency: 'PLN',
      features: ['Pełny Finanse Core', 'Nielimitowani użytkownicy', 'DMS + E-Sign', 'AI Assistant 500 req/mo'],
      color: 'bg-indigo-600',
      textColor: 'text-white',
      popular: true,
      icon: ShieldCheck
    },
    {
      id: 'plan_enterprise',
      name: 'Enterprise',
      price: '999',
      currency: 'PLN',
      features: ['Multi-tenant Custom Branding', 'SLA 99.9%', 'Dedykowany Account Manager', 'Integracja z SAP/Oracle'],
      color: 'bg-slate-900',
      textColor: 'text-white',
      icon: Crown
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
       {plans.map(plan => (
          <div key={plan.id} className={`${plan.color} rounded-[3rem] p-10 relative overflow-hidden flex flex-col h-full hover:scale-[1.02] transition-transform shadow-xl shadow-slate-200/50`}>
             {plan.popular && (
                <div className="absolute top-10 -right-12 bg-amber-400 text-slate-900 px-12 py-2 text-[10px] font-black uppercase tracking-widest rotate-45">
                   Popular
                </div>
             )}
             
             <div className="mb-12">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-10 ${plan.textColor ? 'bg-white/10' : 'bg-white border border-slate-100'}`}>
                   <plan.icon size={28} className={plan.textColor ? 'text-white' : 'text-indigo-600'} />
                </div>
                <h4 className={`text-2xl font-black uppercase italic tracking-tighter mb-2 ${plan.textColor || 'text-slate-900'}`}>{plan.name}</h4>
                <div className="flex items-baseline gap-2">
                   <span className={`text-5xl font-black italic ${plan.textColor || 'text-slate-900'}`}>{plan.price}</span>
                   <span className={`text-xl font-black opacity-60 italic ${plan.textColor || 'text-slate-400'}`}>{plan.currency}/mies.</span>
                </div>
             </div>

             <div className="space-y-6 mb-12 flex-grow">
                {plan.features.map((feat, i) => (
                   <div key={i} className="flex items-start gap-4">
                      <div className={`mt-1 p-1 rounded-full ${plan.textColor ? 'bg-white/10' : 'bg-emerald-50 text-emerald-600'}`}>
                        <Check size={12} />
                      </div>
                      <span className={`text-[11px] font-black uppercase italic tracking-tight leading-normal ${plan.textColor ? 'text-white/80' : 'text-slate-600'}`}>
                         {feat}
                      </span>
                   </div>
                ))}
             </div>

             {error && plan.id === loadingPlan && (
               <div className="mb-4 text-xs font-bold text-rose-500 flex items-center justify-center gap-1 bg-white/90 p-2 rounded-lg">
                 <AlertCircle size={14} />
                 <span>{error}</span>
               </div>
             )}

             <button 
                onClick={() => handleActivate(plan.id, plan.name)}
                disabled={loadingPlan !== null}
                className={`w-full py-6 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${
                plan.id === 'plan_pro' 
                ? 'bg-white text-indigo-600 hover:bg-slate-50' 
                : plan.textColor 
                  ? 'bg-white/10 text-white hover:bg-white/20' 
                  : 'bg-slate-900 text-white hover:bg-indigo-600'
             } ${loadingPlan ? 'opacity-70 cursor-not-allowed' : ''}`}>
                {loadingPlan === plan.id ? 'Przetwarzanie...' : 'Aktywuj Plan'}
                {loadingPlan === plan.id ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
             </button>
          </div>
       ))}
    </div>
  );
}
