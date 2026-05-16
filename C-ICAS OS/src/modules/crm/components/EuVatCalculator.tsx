import React, { useState } from 'react';
import { Globe, ArrowRight, RefreshCw } from 'lucide-react';
import { EU_VAT_RATES, getAllRates, calculateVat, reverseVat } from '../services/euVatService';

interface Props { tenantId?: string }

export default function EuVatCalculator({ tenantId }: Props) {
  const [selectedCountry, setSelectedCountry] = useState('PL');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<'net_to_gross' | 'gross_to_net'>('net_to_gross');
  const [selectedRate, setSelectedRate] = useState<number | null>(null);

  const vatData = EU_VAT_RATES.find(r => r.code === selectedCountry);
  const availableRates = selectedCountry ? getAllRates(selectedCountry) : [];
  const rate = selectedRate ?? vatData?.standard ?? 23;

  const parsed = parseFloat(amount.replace(',', '.'));
  const result = !isNaN(parsed) && parsed > 0
    ? mode === 'net_to_gross' ? calculateVat(parsed, selectedCountry) : reverseVat(parsed, selectedCountry)
    : null;

  // Override rate if user selected custom
  const customResult = !isNaN(parsed) && parsed > 0 ? (() => {
    const r = selectedRate;
    if (r === null) return result;
    const net = mode === 'net_to_gross' ? parsed : Math.round((parsed / (1 + r / 100)) * 100) / 100;
    const vat = Math.round(net * (r / 100) * 100) / 100;
    return { net, vat, gross: net + vat, rate: r };
  })() : null;

  const display = customResult ?? result;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Kalkulator VAT UE</h3>
        <p className="text-xs text-slate-500 mt-0.5">Stawki VAT dla wszystkich 27 krajów Unii Europejskiej</p>
      </div>

      {/* Rates reference table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Tabela stawek VAT — UE 27</p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
          {EU_VAT_RATES.sort((a, b) => a.country.localeCompare(b.country)).map(r => (
            <button key={r.code} onClick={() => { setSelectedCountry(r.code); setSelectedRate(null); }}
              className={`flex items-center justify-between p-3 rounded-xl border-2 text-left transition-all ${selectedCountry === r.code ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 hover:border-slate-200'}`}>
              <div>
                <span className="text-[10px] font-black text-slate-900">{r.country}</span>
                <span className="text-[8px] text-slate-400 ml-1.5">{r.code}</span>
              </div>
              <div className="text-right">
                <div className="text-base font-black text-indigo-700">{r.standard}%</div>
                {r.reduced.length > 0 && (
                  <div className="text-[8px] text-slate-400">{r.reduced.join(' / ')}%</div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Calculator */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Kalkulator</p>

        {/* Country & mode */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Kraj</label>
            <select value={selectedCountry} onChange={e => { setSelectedCountry(e.target.value); setSelectedRate(null); }}
              className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
              {EU_VAT_RATES.sort((a, b) => a.country.localeCompare(b.country)).map(r => (
                <option key={r.code} value={r.code}>{r.country} ({r.code})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Stawka VAT</label>
            <select value={selectedRate ?? rate}
              onChange={e => setSelectedRate(Number(e.target.value))}
              className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
              {availableRates.map(r => (
                <option key={r} value={r}>{r}%{r === vatData?.standard ? ' (standard)' : r === 0 ? ' (zwolniony)' : ' (obniżony)'}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
          <button onClick={() => setMode('net_to_gross')}
            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'net_to_gross' ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}>
            Netto → Brutto
          </button>
          <button onClick={() => setMode('gross_to_net')}
            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'gross_to_net' ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}>
            Brutto → Netto
          </button>
        </div>

        {/* Amount input */}
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
            Kwota {mode === 'net_to_gross' ? 'netto' : 'brutto'} (PLN)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="np. 1000"
            className="mt-1 w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-xl font-black outline-none focus:border-indigo-400"
          />
        </div>

        {/* Result */}
        {display ? (
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 space-y-3">
            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">
              Wynik · {vatData?.country} · {display.rate}% VAT
            </p>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Netto', value: display.net.toFixed(2), highlight: mode === 'gross_to_net' },
                { label: 'VAT', value: display.vat.toFixed(2), highlight: false },
                { label: 'Brutto', value: display.gross.toFixed(2), highlight: mode === 'net_to_gross' },
              ].map(({ label, value, highlight }) => (
                <div key={label} className={`rounded-xl p-3 text-center ${highlight ? 'bg-indigo-600 text-white' : 'bg-white'}`}>
                  <p className={`text-[9px] font-black uppercase tracking-widest ${highlight ? 'text-indigo-200' : 'text-slate-400'}`}>{label}</p>
                  <p className={`text-xl font-black mt-1 ${highlight ? 'text-white' : 'text-slate-900'}`}>{value}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-indigo-600">
              <ArrowRight size={10} />
              <span>VAT = {display.rate}% × {display.net.toFixed(2)} = {display.vat.toFixed(2)} PLN</span>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 rounded-2xl p-5 text-center text-slate-400 text-sm">
            Wprowadź kwotę aby zobaczyć wynik
          </div>
        )}
      </div>

      {/* Country detail */}
      {vatData && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Szczegóły — {vatData.country} ({vatData.code})</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-indigo-50 rounded-xl p-3 text-center">
              <p className="text-[8px] text-indigo-500 font-black uppercase">Standardowa</p>
              <p className="text-2xl font-black text-indigo-700">{vatData.standard}%</p>
            </div>
            {vatData.reduced.map((r, i) => (
              <div key={i} className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-[8px] text-slate-400 font-black uppercase">Obniżona {i + 1}</p>
                <p className="text-2xl font-black text-slate-700">{r}%</p>
              </div>
            ))}
            {vatData.superReduced != null && (
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-[8px] text-green-600 font-black uppercase">Super-obniżona</p>
                <p className="text-2xl font-black text-green-700">{vatData.superReduced}%</p>
              </div>
            )}
            <div className={`rounded-xl p-3 text-center ${vatData.zeroRated ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <p className="text-[8px] font-black uppercase text-slate-400">Stawka 0%</p>
              <p className={`text-sm font-black mt-1 ${vatData.zeroRated ? 'text-emerald-700' : 'text-red-500'}`}>
                {vatData.zeroRated ? 'Tak' : 'Nie'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
