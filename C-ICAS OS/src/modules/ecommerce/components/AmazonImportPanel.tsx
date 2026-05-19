/**
 * Data: 2026-05-19
 * Autor: Agent AI
 * Opis: Panel importu zamówień Amazon SP-API → CRM + FI (draft faktury).
 *       Wymaga konta Amazon Seller Central z aktywnym SP-API.
 *       Obsługuje multi-select, deduplikację, stany ładowania i błędów.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ShoppingCart, RefreshCw, CheckSquare, Square,
  AlertCircle, CheckCircle2, Loader2,
  Download, Package, User, Ban, Info,
} from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import {
  getAmazonConfig,
  fetchOrders,
  importOrders,
} from '../services/amazonService';
import type { AmazonOrder, AmazonImportResult } from '../services/amazonService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ORDER_STATUS_COLOR: Record<string, string> = {
  Pending:             'bg-amber-50 text-amber-700 border-amber-200',
  Unshipped:           'bg-sky-50 text-sky-700 border-sky-200',
  Shipped:             'bg-emerald-50 text-emerald-700 border-emerald-200',
  Canceled:            'bg-rose-50 text-rose-500 border-rose-200',
  PartiallyShipped:    'bg-indigo-50 text-indigo-700 border-indigo-200',
};

const ORDER_STATUS_LABEL: Record<string, string> = {
  Pending:             'Oczekuje',
  Unshipped:           'Do wysyłki',
  Shipped:             'Wysłane',
  Canceled:            'Anulowane',
  PartiallyShipped:    'Częściowo',
};

function formatAmount(order: AmazonOrder): string {
  if (!order.OrderTotal) return '—';
  const num = parseFloat(order.OrderTotal.Amount);
  if (Number.isNaN(num)) return '—';
  return `${num.toFixed(2)} ${order.OrderTotal.CurrencyCode}`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pl-PL');
  } catch {
    return iso;
  }
}

function buyerLabel(order: AmazonOrder): string {
  return (
    order.BuyerInfo?.BuyerName?.trim()
    || order.BuyerInfo?.BuyerEmail
    || '—'
  );
}

// ---------------------------------------------------------------------------
// Główny komponent
// ---------------------------------------------------------------------------

export default function AmazonImportPanel() {
  const { activeTenantId } = useAuth() as { activeTenantId: string };

  const [orders, setOrders] = useState<AmazonOrder[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<AmazonImportResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [noToken, setNoToken] = useState(false);

  // ---------------------------------------------------------------------------
  // Pobieranie zamówień
  // ---------------------------------------------------------------------------

  const loadOrders = useCallback(async () => {
    if (!activeTenantId) return;
    setLoading(true);
    setError(null);
    setNoToken(false);
    setResults(null);

    try {
      const config = await getAmazonConfig(activeTenantId);
      const fetched = await fetchOrders(config.accessToken, config.marketplaceId);
      setOrders(fetched);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('token') || msg.includes('LWA') || msg.includes('konfiguracji')) {
        setNoToken(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [activeTenantId]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  // ---------------------------------------------------------------------------
  // Zaznaczanie
  // ---------------------------------------------------------------------------

  const toggleAll = () => {
    if (selected.size === orders.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(orders.map(o => o.AmazonOrderId)));
    }
  };

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ---------------------------------------------------------------------------
  // Import
  // ---------------------------------------------------------------------------

  const handleImport = async () => {
    if (!activeTenantId) return;
    setImporting(true);
    setError(null);
    setResults(null);

    try {
      const res = await importOrders(activeTenantId);
      setResults(res);
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setImporting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Brak konfiguracji — komunikat z wymaganiami
  // ---------------------------------------------------------------------------

  if (noToken) {
    return (
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-[2rem] p-10 text-center">
          <AlertCircle size={40} className="mx-auto text-amber-400 mb-4" />
          <p className="text-sm font-bold text-amber-700 mb-2">Brak połączenia z Amazon SP-API</p>
          <p className="text-xs text-amber-600 mb-4">
            Skonfiguruj integrację Amazon w sekcji <strong>Ustawienia &rarr; Integracje</strong>.
          </p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-[1.5rem] p-6">
          <div className="flex items-start gap-3">
            <Info size={16} className="text-slate-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-xs font-black text-slate-700 uppercase tracking-wider">Wymagania — Amazon Seller Account</p>
              <ul className="text-[11px] text-slate-500 space-y-1 list-disc list-inside">
                <li>Aktywne konto Amazon Seller Central (Professional)</li>
                <li>Zarejestrowana aplikacja SP-API w Amazon Developer Console</li>
                <li>Autoryzacja OAuth 2.0 (Login with Amazon — LWA)</li>
                <li>Uprawnienia: orders:read, buyerInfo:read</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Banner wyników
  // ---------------------------------------------------------------------------

  const ResultBanner = () => {
    if (!results) return null;
    const imported = results.filter(r => r.invoiceId);
    const skipped  = results.filter(r => r.skipped);
    const failed   = results.filter(r => r.error);

    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-[1.5rem] p-6 flex flex-wrap gap-6 items-center">
        <CheckCircle2 size={28} className="text-emerald-500 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-black text-emerald-700 mb-1">Import zakończony</p>
          <p className="text-xs text-emerald-600">
            Zaimportowano <strong>{imported.length}</strong> zamówień
            &rarr; <strong>{imported.length}</strong> klientów w CRM,
            &nbsp;<strong>{imported.length}</strong> faktur (DRAFT) w FI.
            {skipped.length > 0 && ` Pominięto (duplikaty): ${skipped.length}.`}
            {failed.length > 0 && ` Błędy: ${failed.length}.`}
          </p>
          {failed.length > 0 && (
            <ul className="mt-2 text-[10px] text-rose-600 list-disc list-inside">
              {failed.map(r => (
                <li key={r.orderId}>{r.orderId}: {r.error}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Główny render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Nagłówek */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-2xl flex items-center justify-center">
            <ShoppingCart size={18} className="text-orange-500" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Import Amazon</h2>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">
              {orders.length} zamówień (ostatnie 30 dni)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadOrders}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Odśwież
          </button>

          {selected.size > 0 && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-2xl transition-colors disabled:opacity-50"
            >
              {importing ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              Importuj wybrane ({selected.size})
            </button>
          )}

          {orders.length > 0 && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl transition-colors disabled:opacity-50"
            >
              {importing ? <Loader2 size={13} className="animate-spin" /> : <Package size={13} />}
              Importuj wszystkie nowe
            </button>
          )}
        </div>
      </div>

      {/* Info o Amazon Seller Account */}
      <div className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 flex items-center gap-3">
        <Info size={14} className="text-slate-400 flex-shrink-0" />
        <p className="text-[10px] text-slate-500">
          Wymaga konta <strong>Amazon Seller Central Professional</strong> z aktywnym SP-API i tokenem LWA.
          Importowane są zamówienia z ostatnich 30 dni.
        </p>
      </div>

      {/* Banner wyników */}
      <ResultBanner />

      {/* Error */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-[1.5rem] p-5 flex items-start gap-3">
          <Ban size={18} className="text-rose-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-rose-700 font-semibold">{error}</p>
        </div>
      )}

      {/* Lista zamówień */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-indigo-400" />
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-slate-50 rounded-[2rem] p-16 text-center border-2 border-dashed border-slate-200">
          <ShoppingCart size={40} className="mx-auto text-slate-300 mb-4" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Brak zamówień do importu
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
          {/* Nagłówek tabeli */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50">
            <button onClick={toggleAll} className="text-slate-400 hover:text-indigo-600 transition-colors">
              {selected.size === orders.length && orders.length > 0
                ? <CheckSquare size={16} className="text-indigo-600" />
                : <Square size={16} />}
            </button>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 w-40">Amazon Order ID</span>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex-1">Kupujący</span>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 w-28 text-right">Kwota</span>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 w-24 text-center">Status</span>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 w-24 text-center">Data zakupu</span>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 w-8"></span>
          </div>

          {/* Wiersze */}
          {orders.map(order => {
            const id = order.AmazonOrderId;
            const isSelected = selected.has(id);
            const resultForOrder = results?.find(r => r.orderId === id);

            return (
              <div
                key={id}
                className={`flex items-center gap-3 px-6 py-4 border-b border-slate-50 hover:bg-slate-50/60 transition-colors cursor-pointer ${isSelected ? 'bg-indigo-50/40' : ''}`}
                onClick={() => toggleOne(id)}
              >
                {/* Checkbox */}
                <div className="flex-shrink-0" onClick={e => { e.stopPropagation(); toggleOne(id); }}>
                  {isSelected
                    ? <CheckSquare size={16} className="text-indigo-600" />
                    : <Square size={16} className="text-slate-300" />}
                </div>

                {/* ID */}
                <span className="text-[10px] font-mono text-slate-400 w-40 truncate">
                  {id}
                </span>

                {/* Kupujący */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <User size={12} className="text-slate-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{buyerLabel(order)}</p>
                    <p className="text-[10px] text-slate-400 truncate">{order.BuyerInfo?.BuyerEmail ?? '—'}</p>
                  </div>
                </div>

                {/* Kwota */}
                <span className="text-xs font-black text-slate-900 w-28 text-right flex-shrink-0">
                  {formatAmount(order)}
                </span>

                {/* Status */}
                <div className="w-24 text-center flex-shrink-0">
                  <span className={`inline-block text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-xl border ${ORDER_STATUS_COLOR[order.OrderStatus] ?? 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                    {ORDER_STATUS_LABEL[order.OrderStatus] ?? order.OrderStatus}
                  </span>
                </div>

                {/* Data */}
                <span className="text-[10px] text-slate-400 w-24 text-center flex-shrink-0">
                  {formatDate(order.PurchaseDate)}
                </span>

                {/* Wynik importu */}
                <div className="w-8 flex-shrink-0 flex items-center justify-center">
                  {resultForOrder?.invoiceId && (
                    <CheckCircle2 size={14} className="text-emerald-500" title="Zaimportowano" />
                  )}
                  {resultForOrder?.skipped && (
                    <Ban size={14} className="text-slate-300" title="Duplikat — pominięto" />
                  )}
                  {resultForOrder?.error && (
                    <AlertCircle size={14} className="text-rose-500" title={resultForOrder.error} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legenda */}
      <p className="text-[10px] text-slate-400 text-center">
        Faktury tworzone jako DRAFT — wymagają ręcznego zatwierdzenia w module FI.
        Duplikaty (po AmazonOrderId) są automatycznie pomijane.
      </p>
    </div>
  );
}
