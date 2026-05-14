/**
 * Data: 2026-05-10 14:04
 * Utworzył: Agent AI
 * Opis: Moduł Licencji i Płatności (Stripe Mockup / SaaS Management)
 */
import React, { useState } from 'react';
import { CreditCard, Zap, Shield, CheckCircle, Smartphone } from 'lucide-react';
import { useAuth } from '../../shared/hooks/AuthContext';

export default function LicenseModule() {
  const { userData, hasPermission } = useAuth();
  const [loading, setLoading] = useState(false);
  const hasAccess = hasPermission('*') || hasPermission('finance.manage');

  const handleSubscribe = async (tier: string) => {
    setLoading(true);
    // Tutaj mock integracji ze Stripe Checkout (Biling do podłączenia)
    setTimeout(() => {
      alert(`Przekierowanie do bramki płatności Stripe dla planu: ${tier}`);
      setLoading(false);
    }, 1500);
  };

  if (!hasAccess) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center mt-6">
        <Shield size={48} className="mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Brak uprawnień bilingowych</h2>
        <p className="text-gray-500 mt-2">Zarządzanie licencjami SaaS jest przypisane do właściciela konta (Admin).</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6 flex flex-col gap-6">
      <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
        <div className="p-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-lg">
          <CreditCard size={20} className="text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Licencje & Aktywacja</h2>
          <p className="text-sm text-slate-500">Zarządzanie subskrypcjami i dozwolonymi modułami systemu</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Tier 1 */}
        <div className="border border-slate-200 rounded-2xl p-6 flex flex-col items-center text-center hover:border-blue-400 transition-colors">
          <h3 className="text-lg font-bold text-slate-800">Basic Plan</h3>
          <p className="text-sm text-slate-500 mt-1">Podstawowy Time Tracking</p>
          <div className="text-3xl font-extrabold text-slate-900 mt-4 mb-6">49 zł <span className="text-sm font-normal text-slate-500">/ user</span></div>
          
          <ul className="text-sm text-slate-600 text-left w-full flex flex-col gap-3 mb-8">
            <li className="flex gap-2 items-center"><CheckCircle size={16} className="text-green-500" /> Rejestracja Czasu</li>
            <li className="flex gap-2 items-center"><CheckCircle size={16} className="text-green-500" /> Projekty (Kanban)</li>
            <li className="flex gap-2 items-center opacity-40"><CheckCircle size={16} /> Moduły Specjalistyczne</li>
            <li className="flex gap-2 items-center opacity-40"><CheckCircle size={16} /> API Kalendarzy</li>
          </ul>

          <button onClick={() => handleSubscribe('basic')} disabled={loading} className="w-full py-2 px-4 rounded-xl font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 mt-auto transition-colors">
            Zmień Plan
          </button>
        </div>

        {/* Tier 2 (Pro) */}
        <div className="border-2 border-violet-500 rounded-2xl p-6 flex flex-col items-center text-center relative shadow-md scale-105 bg-white z-10">
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-violet-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
            <Zap size={12} /> MOST POPULAR
          </div>
          <h3 className="text-lg font-bold text-slate-800">Professional</h3>
          <p className="text-sm text-slate-500 mt-1">Pełna zarządzanie firmą</p>
          <div className="text-3xl font-extrabold text-slate-900 mt-4 mb-6">99 zł <span className="text-sm font-normal text-slate-500">/ user</span></div>
          
          <ul className="text-sm text-slate-600 text-left w-full flex flex-col gap-3 mb-8">
            <li className="flex gap-2 items-center"><CheckCircle size={16} className="text-violet-500" /> Wszystko z Basic</li>
            <li className="flex gap-2 items-center"><CheckCircle size={16} className="text-violet-500" /> Moduły (Budownictwo, etc)</li>
            <li className="flex gap-2 items-center"><CheckCircle size={16} className="text-violet-500" /> Raporty Audytowe (RODO)</li>
            <li className="flex gap-2 items-center opacity-40"><CheckCircle size={16} /> Asystent AI</li>
          </ul>

          <button onClick={() => handleSubscribe('pro')} disabled={loading} className="w-full py-3 px-4 rounded-xl font-medium text-white bg-violet-600 hover:bg-violet-700 mt-auto transition-all shadow-sm">
            {loading ? 'Przetwarzanie...' : 'Aktywuj Pro'}
          </button>
        </div>

        {/* Tier 3 (Enterprise) */}
        <div className="border border-slate-200 rounded-2xl p-6 flex flex-col items-center text-center hover:border-slate-800 transition-colors">
          <h3 className="text-lg font-bold text-slate-800">Enterprise High-Res</h3>
          <p className="text-sm text-slate-500 mt-1">Zegar AI, Zapis B2B & Storage 4K</p>
          <div className="text-3xl font-extrabold text-slate-900 mt-4 mb-6">149 zł <span className="text-sm font-normal text-slate-500">/ user</span></div>
          
          <ul className="text-sm text-slate-600 text-left w-full flex flex-col gap-3 mb-8">
            <li className="flex gap-2 items-center"><CheckCircle size={16} className="text-slate-800" /> Wszystko z Professional</li>
            <li className="flex gap-2 items-center"><CheckCircle size={16} className="text-slate-800" /> Nielimitowany AI Voice Log</li>
            <li className="flex gap-2 items-center"><CheckCircle size={16} className="text-slate-800" /> Zapis Zdjęć 4K / Wideo bez kompresji</li>
            <li className="flex gap-2 items-center"><CheckCircle size={16} className="text-slate-800" /> Zwiększony limit Storage</li>
          </ul>

          <button onClick={() => handleSubscribe('enterprise')} disabled={loading} className="w-full py-2 px-4 rounded-xl font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 mt-auto transition-colors">
            Skontaktuj się ze sprzedażą
          </button>
        </div>
      </div>
      
      <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm flex gap-3">
        <Smartphone size={24} className="text-slate-400 shrink-0" />
        <div className="text-slate-600">
          <strong className="text-slate-800 block">Dystrybucja Aplikacji i Smartwatch:</strong>
          Aplikacje klienckie i Smartwatch Companion (WearOS) są pobierane oddzielnie przez Google Play Store dla upragnionych pracowników. Twoje licencje determinują, który użytkownik będzie miał do nich dostęp na poziomie zapytania autoryzacyjnego z urządzenia do Firestore DB.
        </div>
      </div>
    </div>
  );
}
