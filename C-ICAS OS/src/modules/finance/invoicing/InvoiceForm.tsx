/**
 * Data: 2026-05-18
 * Zmiany: Prawdziwe API NBP, generowanie numeru z Firestore, kontrolowane pola formularza,
 *         obsługa zapisu (szkic / wystawiona) przez invoiceService.createInvoice.
 * Ścieżka: /src/modules/finance/invoicing/InvoiceForm.tsx
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X, Plus, Trash2, Sparkles,
  Send, Loader2, Globe,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useTenant } from '../../../shared/hooks/useTenant';
import { useAuth } from '../../../core/auth/AuthContext';
import { generateNextInvoiceNumber, createInvoice } from '../services/invoiceService';
import type { Currency, VatRate } from '../types/fiTypes';

interface FormItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  priceBrutto: number;
  vatRate: number;
}

const today = () => new Date().toISOString().slice(0, 10);

const addDays = (dateStr: string, days: number): string => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export default function InvoiceForm({ onClose }: { onClose: () => void }) {
  const { activeTenantId, activeTenantName } = useTenant();
  const { user } = useAuth();

  const [items, setItems] = useState<FormItem[]>([
    { id: '1', name: '', quantity: 1, unit: 'szt.', priceBrutto: 0, vatRate: 23 },
  ]);
  const [currency, setCurrency] = useState<Currency>('PLN');
  const [exchangeRate, setExchangeRate] = useState(1);
  const [rateLoading, setRateLoading] = useState(false);

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [numberLoading, setNumberLoading] = useState(false);

  const [issueDate, setIssueDate] = useState(today);
  const [saleDate, setSaleDate] = useState(today);
  const [paymentDays, setPaymentDays] = useState(14);
  const [buyerName, setBuyerName] = useState('');
  const [saving, setSaving] = useState(false);

  const dueDate = useMemo(() => addDays(issueDate, paymentDays), [issueDate, paymentDays]);

  // Generate invoice number from Firestore
  useEffect(() => {
    if (!activeTenantId) return;
    setNumberLoading(true);
    generateNextInvoiceNumber(activeTenantId, 'FV')
      .then(num => setInvoiceNumber(num))
      .catch(() => {
        const d = new Date();
        setInvoiceNumber(`FV/${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/001`);
      })
      .finally(() => setNumberLoading(false));
  }, [activeTenantId]);

  // Real NBP exchange rate (table A)
  useEffect(() => {
    if (currency === 'PLN') { setExchangeRate(1); return; }
    setRateLoading(true);
    fetch(`https://api.nbp.pl/api/exchangerates/rates/A/${currency}/last/1/?format=json`)
      .then(r => r.json())
      .then(data => setExchangeRate(data.rates[0].mid))
      .catch(() => {}) // keep previous rate on error
      .finally(() => setRateLoading(false));
  }, [currency]);

  const totalBrutto = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity * i.priceBrutto, 0),
    [items],
  );
  const totalNetto = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity * (i.priceBrutto / (1 + i.vatRate / 100)), 0),
    [items],
  );

  const addItem = () =>
    setItems(prev => [
      ...prev,
      { id: Date.now().toString(), name: '', quantity: 1, unit: 'szt.', priceBrutto: 0, vatRate: 23 },
    ]);

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const updateItem = useCallback((id: string, field: keyof FormItem, value: string | number) => {
    setItems(prev => prev.map(i => (i.id === id ? { ...i, [field]: value } : i)));
  }, []);

  const handleSave = async (status: 'draft' | 'issued') => {
    if (!activeTenantId || !user) return;
    setSaving(true);
    try {
      const fiItems = items.map(item => {
        const vatNum = item.vatRate / 100;
        const priceNetto = Math.round((item.priceBrutto / (1 + vatNum)) * 10000) / 10000;
        const totalNetto = Math.round(item.quantity * priceNetto * 100) / 100;
        const totalVat = Math.round(totalNetto * vatNum * 100) / 100;
        const totalBrutto = Math.round((totalNetto + totalVat) * 100) / 100;
        return {
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          priceNetto,
          vatRate: item.vatRate as VatRate,
          totalNetto,
          totalVat,
          totalBrutto,
        };
      });

      await createInvoice(activeTenantId, {
        tenantId: activeTenantId,
        number: invoiceNumber,
        series: 'FV',
        type: 'standard',
        status,
        issueDate,
        saleDate,
        dueDate,
        seller: { name: activeTenantName ?? '', address: '', city: '', postCode: '', country: 'PL' },
        buyer: { name: buyerName, address: '', city: '', postCode: '', country: 'PL' },
        items: fiItems,
        currency,
        ...(currency !== 'PLN' ? { exchangeRate, exchangeRateSource: 'NBP' } : {}),
        paymentMethod: 'transfer',
        ksefStatus: 'not_sent',
        paidAmount: 0,
        isMpp: false,
        createdBy: user.uid,
      });
      onClose();
    } catch (err) {
      console.error('[InvoiceForm] save error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[80] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[4rem] w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Kreator Dokumentu</div>
            <h3 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Nowa Faktura Sprzedaży</h3>
          </div>
          <button onClick={onClose} className="bg-white text-slate-400 hover:text-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 space-y-12">
          {/* Section 1: Header fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 px-1">Kontrahent (Nazwa)</label>
                <input
                  type="text"
                  value={buyerName}
                  onChange={e => setBuyerName(e.target.value)}
                  placeholder="np. Acme Sp. z o.o."
                  className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 text-sm font-black uppercase italic tracking-tighter focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 px-1">Nr Faktury</label>
                  <div className="relative">
                    <input
                      className="w-full bg-slate-100 border-none rounded-2xl px-6 py-5 text-xs font-black text-slate-500 italic outline-none"
                      value={numberLoading ? '...' : invoiceNumber}
                      readOnly
                    />
                    {numberLoading && (
                      <Loader2 size={14} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-indigo-400" />
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 px-1">Waluta</label>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value as Currency)}
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 text-xs font-black uppercase italic outline-none"
                  >
                    <option value="PLN">PLN</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                    <option value="CHF">CHF</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 space-y-6">
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 px-1">Data Wystawienia</label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={e => setIssueDate(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 text-xs font-black italic outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 px-1">Data Sprzedaży</label>
                  <input
                    type="date"
                    value={saleDate}
                    onChange={e => setSaleDate(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 text-xs font-black italic outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 px-1">Termin Płatności</label>
                  <select
                    value={paymentDays}
                    onChange={e => setPaymentDays(parseInt(e.target.value))}
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 text-xs font-black uppercase italic outline-none"
                  >
                    <option value={0}>Gotówka ({issueDate})</option>
                    <option value={7}>7 dni ({addDays(issueDate, 7)})</option>
                    <option value={14}>14 dni ({addDays(issueDate, 14)})</option>
                    <option value={21}>21 dni ({addDays(issueDate, 21)})</option>
                    <option value={30}>30 dni ({addDays(issueDate, 30)})</option>
                    <option value={60}>60 dni ({addDays(issueDate, 60)})</option>
                  </select>
                </div>
              </div>

              {currency !== 'PLN' && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-white p-3 rounded-xl shadow-sm">
                      <Globe className="text-indigo-600" size={20} />
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-indigo-400 uppercase leading-none mb-1">Kurs NBP tabela A</div>
                      <div className="text-sm font-black text-indigo-900 uppercase italic tracking-tighter">
                        1 {currency} = {exchangeRate.toFixed(4)} PLN
                      </div>
                    </div>
                  </div>
                  {rateLoading && <Loader2 className="animate-spin text-indigo-400" size={18} />}
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Line items */}
          <div className="space-y-6">
            <div className="flex justify-between items-end mb-4">
              <h5 className="text-sm font-black text-slate-900 uppercase italic tracking-widest flex items-center gap-2">
                Pozycje Faktury
                <div className="bg-indigo-600/10 text-indigo-600 px-3 py-1 rounded-full text-[9px] font-black">AI OPTIMIZED</div>
              </h5>
              <button className="flex items-center gap-2 text-[10px] font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-colors uppercase italic">
                <Sparkles size={14} /> Sugeruj z historii
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, idx) => (
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
                      onChange={e => updateItem(item.id, 'name', e.target.value)}
                      placeholder="np. Doradztwo strategiczne"
                      className="w-full bg-slate-50 border-none rounded-xl px-4 py-4 text-xs font-bold focus:ring-2 focus:ring-indigo-500 uppercase tracking-tighter italic outline-none"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Ilość</label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={item.quantity}
                      onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 1)}
                      className="w-full bg-slate-50 border-none rounded-xl px-4 py-4 text-xs font-bold text-center outline-none"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">VAT</label>
                    <select
                      value={item.vatRate}
                      onChange={e => updateItem(item.id, 'vatRate', parseInt(e.target.value))}
                      className="w-full bg-slate-50 border-none rounded-xl px-4 py-4 text-[10px] font-bold outline-none"
                    >
                      <option value={23}>23%</option>
                      <option value={8}>8%</option>
                      <option value={5}>5%</option>
                      <option value={0}>0%</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Cena Brutto</label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.priceBrutto}
                        onChange={e => updateItem(item.id, 'priceBrutto', parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-4 text-xs font-bold font-mono text-right pr-12 outline-none"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 uppercase">{currency}</span>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[9px] font-black text-slate-400 uppercase mb-2 text-right">Razem Brutto</div>
                    <div className="text-sm font-black text-slate-900 text-right italic">
                      {(item.quantity * item.priceBrutto).toLocaleString('pl-PL', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button onClick={() => removeItem(item.id)} className="text-slate-200 hover:text-rose-500 transition-colors p-3">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addItem}
              className="w-full border-2 border-dashed border-slate-200 rounded-[2rem] py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-indigo-500 hover:text-indigo-600 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={16} /> Dodaj Nową Pozycję
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-10 bg-slate-900 text-white flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex gap-12">
            <div className="text-center md:text-left">
              <div className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-1 italic">Razem Netto</div>
              <div className="text-xl font-black italic tracking-tighter">
                {totalNetto.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} {currency}
              </div>
            </div>
            <div className="text-center md:text-left">
              <div className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-1 italic">Kwota VAT</div>
              <div className="text-xl font-black italic tracking-tighter">
                {(totalBrutto - totalNetto).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} {currency}
              </div>
            </div>
            <div className="text-center md:text-left scale-110 origin-left">
              <div className="text-[10px] font-black text-white uppercase tracking-widest mb-1 italic">Do Zapłaty</div>
              <div className="text-4xl font-black italic tracking-tighter text-emerald-400">
                {totalBrutto.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} {currency}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => handleSave('draft')}
              disabled={saving}
              className="bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white px-8 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Zapisz Szkic
            </button>
            <button
              onClick={() => handleSave('issued')}
              disabled={saving || !buyerName.trim() || items.every(i => !i.name.trim())}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-10 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all flex items-center gap-2"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={16} />}
              Wystaw i Wyślij
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
