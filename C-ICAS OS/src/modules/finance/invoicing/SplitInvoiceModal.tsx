/**
 * Data: 2026-05-15
 * Zmiany: Modal rozbicia faktury KSeF na MPK/projekty z walidacją sum i live preview.
 * Ścieżka: /src/modules/finance/invoicing/SplitInvoiceModal.tsx
 */
import React, { useState, useMemo } from 'react';
import { X, AlertTriangle, CheckCircle2, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const MPK_OPTIONS = [
  { value: 'MPK-001', label: 'MPK-001 IT' },
  { value: 'MPK-002', label: 'MPK-002 Handlowy' },
  { value: 'MPK-003', label: 'MPK-003 Admin' },
  { value: 'MPK-004', label: 'MPK-004 Projekt-Alfa' },
] as const;

type MpkValue = (typeof MPK_OPTIONS)[number]['value'];

interface InvoiceItem {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
  total: number;
}

interface Invoice {
  id: string;
  number: string;
  total: number;
  items: InvoiceItem[];
}

interface SplitInvoiceModalProps {
  invoice?: Invoice;
  onClose: () => void;
  onSave: (splits: Record<string, number>) => void;
}

type SplitMode = 'single' | 'proportional';

interface ItemSplit {
  mode: SplitMode;
  mpk: MpkValue;
  mpkA: MpkValue;
  mpkB: MpkValue;
  percentA: number;
}

const DEFAULT_MOCK_INVOICE: Invoice = {
  id: 'inv-demo-01',
  number: 'FV/2026/05/041',
  total: 87432.0,
  items: [
    { id: 'i1', name: 'Cement portlandzki CEM I', qty: 200, unitPrice: 85.0, total: 17000.0 },
    { id: 'i2', name: 'Stal zbrojeniowa B500SP', qty: 5, unitPrice: 6200.0, total: 31000.0 },
    { id: 'i3', name: 'Robocizna — ekipa montażowa', qty: 120, unitPrice: 220.0, total: 26400.0 },
    { id: 'i4', name: 'Wynajem żurawia wieżowego', qty: 4, unitPrice: 3258.0, total: 13032.0 },
  ],
};

function buildInitialSplits(items: InvoiceItem[]): Record<string, ItemSplit> {
  return Object.fromEntries(
    items.map(item => [
      item.id,
      {
        mode: 'single' as SplitMode,
        mpk: 'MPK-001' as MpkValue,
        mpkA: 'MPK-001' as MpkValue,
        mpkB: 'MPK-002' as MpkValue,
        percentA: 50,
      },
    ]),
  );
}

export default function SplitInvoiceModal({ invoice, onClose, onSave }: SplitInvoiceModalProps) {
  const inv = invoice ?? DEFAULT_MOCK_INVOICE;
  const [splits, setSplits] = useState<Record<string, ItemSplit>>(() => buildInitialSplits(inv.items));
  const [saving, setSaving] = useState(false);

  const updateSplit = <K extends keyof ItemSplit>(id: string, field: K, value: ItemSplit[K]) => {
    setSplits(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const mpkTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    inv.items.forEach(item => {
      const split = splits[item.id];
      if (split.mode === 'single') {
        totals[split.mpk] = (totals[split.mpk] ?? 0) + item.total;
      } else {
        const amtA = (item.total * split.percentA) / 100;
        const amtB = item.total - amtA;
        totals[split.mpkA] = (totals[split.mpkA] ?? 0) + amtA;
        totals[split.mpkB] = (totals[split.mpkB] ?? 0) + amtB;
      }
    });
    return totals;
  }, [splits, inv.items]);

  const totalAllocated = Object.values(mpkTotals).reduce((a, b) => a + b, 0);
  const isValid = Math.abs(totalAllocated - inv.total) < 0.01;

  const proportionalErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    inv.items.forEach(item => {
      const s = splits[item.id];
      if (s.mode === 'proportional' && s.mpkA === s.mpkB) {
        errors[item.id] = 'Oba MPK muszą być różne';
      }
    });
    return errors;
  }, [splits, inv.items]);

  const hasErrors = Object.keys(proportionalErrors).length > 0;

  const handleSave = () => {
    if (!isValid || hasErrors) return;
    setSaving(true);
    setTimeout(() => {
      onSave(mpkTotals);
      setSaving(false);
      onClose();
    }, 900);
  };

  const formatMoney = (v: number) => v.toLocaleString('pl-PL', { minimumFractionDigits: 2 }) + ' PLN';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[80] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[4rem] w-full max-w-5xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              Podział kosztów
            </div>
            <h3 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">
              {inv.number}
            </h3>
            <div className="text-[10px] font-black text-slate-400 uppercase mt-1">
              Łącznie: {formatMoney(inv.total)}
            </div>
          </div>
          <button
            onClick={onClose}
            className="bg-white text-slate-400 hover:text-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-10 space-y-6">
          {inv.items.map(item => {
            const split = splits[item.id];
            const err = proportionalErrors[item.id];
            return (
              <div
                key={item.id}
                className="bg-slate-50 rounded-[2.5rem] p-8 space-y-6 border border-slate-100"
              >
                {/* Item Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-black text-slate-900 uppercase italic tracking-tight">
                      {item.name}
                    </div>
                    <div className="text-[10px] font-black text-slate-400 uppercase mt-1">
                      {item.qty} szt. &times; {formatMoney(item.unitPrice)} = {formatMoney(item.total)}
                    </div>
                  </div>
                  {/* Mode Toggle */}
                  <div className="flex bg-white border border-slate-200 rounded-2xl p-1 gap-1 text-[10px] font-black uppercase">
                    <button
                      onClick={() => updateSplit(item.id, 'mode', 'single')}
                      className={`px-4 py-2 rounded-xl transition-all ${
                        split.mode === 'single'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      Jeden MPK
                    </button>
                    <button
                      onClick={() => updateSplit(item.id, 'mode', 'proportional')}
                      className={`px-4 py-2 rounded-xl transition-all ${
                        split.mode === 'proportional'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      Podziel proporcjonalnie
                    </button>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {split.mode === 'single' ? (
                    <motion.div
                      key="single"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">
                        Przypisz do MPK
                      </label>
                      <select
                        value={split.mpk}
                        onChange={e => updateSplit(item.id, 'mpk', e.target.value as MpkValue)}
                        className="bg-white border-2 border-slate-200 rounded-2xl px-6 py-4 text-xs font-black uppercase italic w-full md:w-72 focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        {MPK_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="proportional"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">
                            MPK A ({split.percentA}%)
                          </label>
                          <select
                            value={split.mpkA}
                            onChange={e => updateSplit(item.id, 'mpkA', e.target.value as MpkValue)}
                            className="bg-white border-2 border-slate-200 rounded-2xl px-6 py-4 text-xs font-black uppercase italic w-full focus:ring-2 focus:ring-indigo-500 outline-none"
                          >
                            {MPK_OPTIONS.map(o => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">
                            MPK B ({100 - split.percentA}%)
                          </label>
                          <select
                            value={split.mpkB}
                            onChange={e => updateSplit(item.id, 'mpkB', e.target.value as MpkValue)}
                            className="bg-white border-2 border-slate-200 rounded-2xl px-6 py-4 text-xs font-black uppercase italic w-full focus:ring-2 focus:ring-indigo-500 outline-none"
                          >
                            {MPK_OPTIONS.map(o => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase px-1">
                          <span>
                            {split.mpkA}: {formatMoney((item.total * split.percentA) / 100)}
                          </span>
                          <span>
                            {split.mpkB}: {formatMoney((item.total * (100 - split.percentA)) / 100)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={99}
                          value={split.percentA}
                          onChange={e => updateSplit(item.id, 'percentA', parseInt(e.target.value))}
                          className="w-full accent-indigo-600 cursor-pointer"
                        />
                      </div>
                      {err && (
                        <div className="flex items-center gap-2 text-rose-500 text-[10px] font-black uppercase">
                          <AlertTriangle size={12} /> {err}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-10 bg-slate-900 text-white shrink-0">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            {/* Live Preview */}
            <div className="w-full md:w-auto">
              <div className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-3">
                Podgląd podziału MPK
              </div>
              <div className="flex flex-wrap gap-3">
                {Object.entries(mpkTotals).map(([mpk, amount]) => (
                  <div key={mpk} className="bg-white/10 rounded-2xl px-5 py-3 text-center">
                    <div className="text-[9px] font-black text-indigo-300 uppercase">{mpk}</div>
                    <div className="text-sm font-black text-white italic tracking-tight">
                      {formatMoney(amount)}
                    </div>
                  </div>
                ))}
              </div>
              <div className={`mt-3 flex items-center gap-2 text-[10px] font-black uppercase ${isValid ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isValid ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                {isValid
                  ? 'Suma = 100% — podział poprawny'
                  : `Różnica: ${formatMoney(Math.abs(totalAllocated - inv.total))}`}
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <button
                onClick={onClose}
                className="bg-white/10 hover:bg-white/20 text-white px-8 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Anuluj
              </button>
              <button
                onClick={handleSave}
                disabled={!isValid || hasErrors || saving}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-10 py-5 rounded-2xl text-[10px] font-black uppercase italic tracking-widest shadow-xl shadow-indigo-500/20 transition-all flex items-center gap-2"
              >
                <Save size={16} />
                {saving ? 'Zapisywanie...' : 'Zapisz podział'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
