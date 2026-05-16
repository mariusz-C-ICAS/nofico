import React from 'react';
import { FileArchive, ShieldAlert, Activity } from 'lucide-react';

export default function HrRetentionModule() {
  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2"><FileArchive className="text-slate-500" size={24}/> Retencja Danych (HR/Kadry)</h3>
          <p className="text-xs text-slate-400 mt-1 font-medium">Ustawienia anonimizacji i usuwania danych zgodnie z polityką RODO per Infotyp.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6">
            <h4 className="font-black text-sm text-slate-800 mb-6 flex items-center gap-2">
              <ShieldAlert size={18} className="text-indigo-600"/> Zgodnie z wytycznymi z Admin Panel
            </h4>
            <div className="space-y-4">
                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                  <div>
                      <h5 className="text-xs font-bold text-slate-700">Dane Podstawowe (Akta)</h5>
                      <p className="text-[10px] text-slate-400">Po ustaniu zatrudnienia, od Końca Roku</p>
                  </div>
                  <span className="bg-rose-100 text-rose-700 text-xs font-black px-3 py-1 rounded-lg">Max 50 lat</span>
                </div>
                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                  <div>
                      <h5 className="text-xs font-bold text-slate-700">Dokumenty ZUS/PIT</h5>
                      <p className="text-[10px] text-slate-400">Od daty wysłania, od Końca Roku</p>
                  </div>
                  <span className="bg-slate-200 text-slate-700 text-xs font-black px-3 py-1 rounded-lg">Max 10 lat</span>
                </div>
                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                  <div>
                      <h5 className="text-xs font-bold text-slate-700">Kandydaci (Rekrutacja)</h5>
                      <p className="text-[10px] text-slate-400">Bez zgody Mkt. per rekrutacja (Dokładna Data)</p>
                  </div>
                  <span className="bg-emerald-100 text-emerald-700 text-xs font-black px-3 py-1 rounded-lg">Max 6 mies.</span>
                </div>
            </div>
            <button className="mt-6 w-full py-3 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-100 transition-colors">
              Zgłoś propozycję zmiany retencji do Admina
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white relative overflow-hidden">
            <div className="absolute -inset-4 bg-emerald-500/10 blur-3xl rounded-full"></div>
            <div className="relative z-10">
                <h4 className="font-black text-sm text-emerald-400 mb-2 flex items-center gap-2">
                  <Activity size={18} /> Automatyczna Czyszczarka
                </h4>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  Zdefiniowane polityki odszukują rekodry, którym skończył się okres retencji i aplikują domyślne zasady anonimizacji lub kasowania z uwzględnieniem offset-u dat.
                </p>
                <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl mb-4">
                  <div className="flex justify-between text-xs font-bold mb-2">
                      <span className="text-slate-300">W kolejce do skasowania/anonimizacji:</span>
                      <span className="text-emerald-400">24 teczki</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 w-1/3 h-full"></div>
                  </div>
                </div>
                <button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase py-3 rounded-xl transition-colors shadow-lg shadow-emerald-500/20">
                  Uruchom proces przedwcześnie (Wymaga OTP)
                </button>
            </div>
          </div>
      </div>
    </div>
  );
}
