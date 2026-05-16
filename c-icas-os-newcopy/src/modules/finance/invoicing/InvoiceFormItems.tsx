/**
 * Data: 2026-05-15
 * Zmiany: Podkomponent pozycji faktury z live VAT calc + AI suggestions.
 * Ścieżka: /src/modules/finance/invoicing/InvoiceFormItems.tsx
 */
import React, { useCallback } from 'react';
import { Plus, Trash2, Sparkles, Loader2 } from 'lucide-react';
import type { InvoiceItem, VatRate, Currency } from '../types/fiTypes';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FormItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  priceNetto: number;
  vatRate: VatRate;
}

interface AiSuggestion {
  name: string;
  unit: string;
  priceNetto: number;
  vatRate: VatRate;
}

interface Props {
  items: FormItem[];
  currency: Currency;
  onItemsChange: (items: FormItem[]) => void;
  onAiSuggest: () => void;
  aiSuggestions: AiSuggestion[];
  aiSuggestLoading: boolean;
  onSuggestionApply: (s: AiSuggestion) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VAT_RATES: VatRate[] = [23, 8, 5, 0, 'zw', 'np', 'oo'];

function computeItem(item: FormItem): { netto: number; vat: number; brutto: number } {
  const netto = Math.round(item.quantity * item.priceNetto * 100) / 100;
  const vatNum = typeof item.vatRate === 'number' ? item.vatRate / 100 : 0;
  const vat = Math.round(netto * vatNum * 100) / 100;
  return { netto, vat, brutto: Math.round((netto + vat) * 100) / 100 };
}

export function buildInvoiceItems(items: FormItem[]): InvoiceItem[] {
  return items.map(item => {
    const { netto, vat, brutto } = computeItem(item);
    return {
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      priceNetto: item.priceNetto,
      vatRate: item.vatRate,
      totalNetto: netto,
      totalVat: vat,
      totalBrutto: brutto,
    };
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function InvoiceFormItems({
  items, currency, onItemsChange, onAiSuggest,
  aiSuggestions, aiSuggestLoading, onSuggestionApply,
}: Props) {

  const updateItem = useCallback(<K extends keyof FormItem>(idx: number, key: K, value: FormItem[K]) => {
    const next = [...items];
    next[idx] = { ...next[idx], [key]: value };
    onItemsChange(next);
  }, [items, onItemsChange]);

  const removeItem = useCallback((id: string) => {
    onItemsChange(items.filter(i => i.id !== id));
  }, [items, onItemsChange]);

  const addItem = useCallback(() => {
    onItemsChange([
      ...items,
      { id: Date.now().toString(), name: '', quantity: 1, unit: 'szt.', priceNetto: 0, vatRate: 23 },
    ]);
  }, [items, onItemsChange]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end mb-4">
        <h5 className="text-sm font-black text-slate-900 uppercase italic tracking-widest flex items-center gap-2">
          Pozycje Faktury
          <div className="bg-indigo-600/10 text-indigo-600 px-3 py-1 rounded-full text-[9px] font-black">AI OPTIMIZED</div>
        </h5>
        <button
          type="button"
          onClick={onAiSuggest}
          disabled={aiSuggestLoading}
          className="flex items-center gap-2 text-[10px] font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-colors uppercase italic disabled:opacity-50"
        >
          {aiSuggestLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          Sugeruj z historii
        </button>
      </div>

      {/* AI Suggestions */}
      {aiSuggestions.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-5 space-y-3">
          <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest italic">Sugestie AI — kliknij, by dodać</div>
          <div className="flex flex-wrap gap-3">
            {aiSuggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSuggestionApply(s)}
                className="bg-white border border-indigo-100 rounded-2xl px-4 py-3 text-left hover:border-indigo-400 transition-colors shadow-sm"
              >
                <div className="text-[10px] font-black text-slate-900 uppercase italic tracking-tight">{s.name}</div>
                <div className="text-[9px] font-bold text-slate-400 mt-0.5">
                  {s.priceNetto.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN netto · VAT {typeof s.vatRate === 'number' ? `${s.vatRate}%` : s.vatRate}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Line items */}
      <div className="space-y-4">
        {items.map((item, idx) => {
          const { netto, vat, brutto } = computeItem(item);
          return (
            <div
              key={item.id}
              className="grid grid-cols-12 gap-4 items-end bg-slate-50/30 p-6 rounded-[2rem] border border-slate-100 group transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-100"
            >
              <div className="col-span-1 text-center">
                <div className="text-[9px] font-black text-slate-300 uppercase mb-2">LP</div>
                <div className="text-xs font-black text-slate-900">{idx + 1}</div>
              </div>
              <div className="col-span-4">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Nazwa towaru lub usługi</label>
                <input
                  value={item.name}
                  onChange={e => updateItem(idx, 'name', e.target.value)}
                  placeholder="np. Doradztwo strategiczne - Maj 2026"
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-4 text-xs font-bold focus:ring-2 focus:ring-indigo-500 uppercase tracking-tighter italic"
                />
              </div>
              <div className="col-span-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Ilość</label>
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 1)}
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-4 text-xs font-bold text-center"
                />
              </div>
              <div className="col-span-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">VAT</label>
                <select
                  value={String(item.vatRate)}
                  onChange={e => {
                    const v = e.target.value;
                    const parsed = ['zw', 'np', 'oo'].includes(v) ? v as VatRate : (parseInt(v) as VatRate);
                    updateItem(idx, 'vatRate', parsed);
                  }}
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-4 text-[10px] font-bold"
                >
                  {VAT_RATES.map(r => (
                    <option key={String(r)} value={String(r)}>
                      {typeof r === 'number' ? `${r}%` : r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Cena Netto</label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={item.priceNetto}
                    onChange={e => updateItem(idx, 'priceNetto', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-4 text-xs font-bold font-mono text-right pr-12"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 uppercase">{currency}</span>
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-[9px] font-black text-slate-400 uppercase mb-2 text-right">Razem Brutto</div>
                <div className="text-sm font-black text-slate-900 text-right italic">
                  {brutto.toLocaleString('pl-PL', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[9px] text-slate-400 font-bold text-right mt-0.5">
                  VAT: {vat.toLocaleString('pl-PL', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="col-span-1 flex justify-center">
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="text-slate-200 hover:text-rose-500 transition-colors p-3"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={addItem}
        className="w-full border-2 border-dashed border-slate-200 rounded-[2rem] py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-indigo-500 hover:text-indigo-600 transition-all flex items-center justify-center gap-2"
      >
        <Plus size={16} /> Dodaj Nową Pozycję
      </button>
    </div>
  );
}
