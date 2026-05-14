/**
 * Data: 2026-05-12
 * Zmiany: Główny moduł płatności i finansów premium.
 * Ścieżka: /src/modules/payments/PaymentsModule.tsx
 */
import React, { useState } from 'react';
import { 
  CreditCard, TrendingUp, History, 
  ShieldCheck, Zap,
  Settings, DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import StripeSubscription from './components/StripeSubscription';
import BlikPayment from './components/BlikPayment';
import MultiCurrencyEngine from './components/MultiCurrencyEngine';
import CashFlowForecasting from './components/CashFlowForecasting';

type TabType = 'subscriptions' | 'one-time' | 'forecasting' | 'history';

export default function PaymentsModule() {
  const [activeTab, setActiveTab] = useState<TabType>('subscriptions');

  const tabs = [
    { id: 'subscriptions', label: 'Abonamenty', icon: ShieldCheck },
    { id: 'one-time', label: 'Płatności Szybkie', icon: Zap },
    { id: 'forecasting', label: 'Prognozy ML', icon: TrendingUp },
    { id: 'history', label: 'Historia', icon: History },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-12">
       {/* UI Header */}
       <div className="max-w-7xl mx-auto mb-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
             <div>
                <div className="flex items-center gap-3 mb-4">
                   <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200">
                      <CreditCard size={24} />
                   </div>
                   <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Silnik Płatności</h1>
                </div>
                <p className="text-sm font-black text-slate-400 uppercase tracking-widest italic">Stripe • PayU • BLIK • BigQuery ML Forecasts</p>
             </div>

             <div className="flex items-center gap-4">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
                   <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                      <DollarSign size={20} />
                   </div>
                   <div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Miesięczny MRR</div>
                      <div className="text-xl font-black text-slate-900 italic">420.500 PLN</div>
                   </div>
                </div>
                <button className="bg-slate-900 text-white p-6 rounded-[2rem] hover:bg-indigo-600 transition-all group">
                   <Settings size={20} className="group-hover:rotate-90 transition-transform" />
                </button>
             </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-4 mb-12">
             {tabs.map(tab => (
                <button
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id as TabType)}
                   className={`px-10 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${
                      activeTab === tab.id 
                      ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200' 
                      : 'bg-white text-slate-400 hover:text-indigo-600 border border-slate-100'
                   }`}
                >
                   <tab.icon size={16} />
                   {tab.label}
                </button>
             ))}
          </div>

          {/* Module Content */}
          <AnimatePresence mode="wait">
             <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
             >
                {activeTab === 'subscriptions' && <StripeSubscription />}
                {activeTab === 'one-time' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                     <div className="lg:col-span-12">
                        <MultiCurrencyEngine />
                     </div>
                     <div className="lg:col-span-12">
                        <BlikPayment />
                     </div>
                  </div>
                )}
                {activeTab === 'forecasting' && <CashFlowForecasting />}
                {activeTab === 'history' && (
                  <div className="bg-white rounded-[3rem] border border-slate-100 p-12 shadow-sm">
                     <h3 className="text-2xl font-black text-slate-900 uppercase italic mb-8">Rejestr Transakcji</h3>
                     <div className="space-y-4">
                        {[
                          { id: 'TX-9921', date: ' Dzisiaj, 22:30', amount: '1.200 PLN', provider: 'BLIK', status: 'Completed' },
                          { id: 'TX-9920', date: ' Dzisiaj, 20:15', amount: '4.500 EUR', provider: 'Stripe', status: 'Completed' },
                          { id: 'TX-9919', date: ' Wczoraj', amount: '800 PLN', provider: 'PayU', status: 'Failed' },
                        ].map(tx => (
                          <div key={tx.id} className="flex items-center justify-between p-8 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all">
                             <div className="flex items-center gap-6">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-[10px] ${
                                   tx.provider === 'Stripe' ? 'bg-indigo-600 text-white' :
                                   tx.provider === 'BLIK' ? 'bg-slate-900 text-white' :
                                   'bg-rose-600 text-white'
                                }`}>
                                   {tx.provider}
                                </div>
                                <div>
                                   <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">{tx.id} • {tx.date}</div>
                                   <div className="text-lg font-black text-slate-900 italic">{tx.amount}</div>
                                </div>
                             </div>
                             <div className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                tx.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                             }`}>
                                {tx.status}
                             </div>
                          </div>
                        ))}
                     </div>
                  </div>
                )}
             </motion.div>
          </AnimatePresence>
       </div>
    </div>
  );
}
