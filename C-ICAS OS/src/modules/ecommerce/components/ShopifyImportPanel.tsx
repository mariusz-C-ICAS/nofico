/**
 * Data: 2026-05-19
 * Autor: Agent AI
 * Opis: Panel importu zamówień Shopify → CRM + FI (draft faktury) + Logistyka.
 *       Obsługuje multi-select, deduplikację, stany ładowania i błędów.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ShoppingBag, RefreshCw, CheckSquare, Square,
  AlertCircle, CheckCircle2, Loader2,
  Download, Package, User, Ban, Truck,
} from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import {
  getShopifyConfig,
  fetchOrders,
  importOrders,
} from '../services/shopifyService';
import type { ShopifyOrder, ShopifyImportResult } from '../services/shopifyService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FINANCIAL_LABEL: Record<string, string> = {
  paid:     'Opłacone',
  pending:  'Oczekuje',
  refunded: 'Zwrot',
};

const FINANCIAL_COLOR: Record<string, string> = {
  paid:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending:  'bg-amber-50 text-amber-700 border-amber-200',
  refunded: 'bg-rose-50 text-rose-500 border-rose-200',
};

const FULFILLMENT_LABEL: Record<string, string> = {
  fulfilled: 'Wysłane',
  pending:   'Oczekuje',
};

function formatCurrency(amount: string): string {
  const num = parseFloat(amount);
  if (Number.isNaN(num)) return '—';
  return `${num.toFixed(2)} PLN`;
}

function buyerLabel(order: ShopifyOrder): string {
  return (
    order.customer?.company?.trim()
    || [order.customer?.first_name, order.customer?.last_name].filter(Boolean).join(' ')
    || order.email
    || '—'
  );
}

// ---------------------------------------------------------------------------
// Główny komponent
// ---------------------------------------------------------------------------

export default function ShopifyImportPanel() {
  const { activeTenantId } = useAuth() as { activeTenantId: string };

  const [orders, setOrders] = useState<ShopifyOrder[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ShopifyImportResult[] | null>(null);
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
      const config = await getShopifyConfig(activeTenantId);
      const fetched = await fetchOrders(config.apiUrl, config.apiKey, undefined, 50);
      setOrders(fetched);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('token') || msg.includes('konfiguracji') || msg.includes('klucz')) {
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
      setSelected(new Set(orders.map(o => String(o.id))));
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

  const handleImport = async (all = false) => {
    if (!activeTenantId) return;
    const ids = all ? undefined : Array.from(selected);
    if (!all && ids?.length === 0) return;

    setImporting(true);
    setError(null);
    setResults(null);

    try {
      const res = await importOrders(activeTenantId, ids);
      setResults(res);
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setImporting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Brak konfiguracji
  // ---------------------------------------------------------------------------

  if (noToken) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-[2rem] p-10 text-center">
        <AlertCircle size={40} className="mx-auto text-amber-400 mb-4" />
        <p className="text-sm font-bold text-amber-700 mb-2">Brak połączenia z Shopify</p>
        <p className="text-xs text-amber-600">
          Skonfiguruj Shopify (URL sklepu + klucz API) w sekcji{' '}
          <strong>Ustawienia &rarr; Integracje</strong>.
        </p>
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
    const shipped  = results.filter(r => r.shipmentId);

    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-[1.5rem] p-6 flex flex-wrap gap-6 items-center">
        <CheckCircle2 size={28} className="text-emerald-500 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-black text-emerald-700 mb-1">Import zakończony</p>
          <p className="text-xs text-emerald-600">
            Zaimportowano <strong>{imported.length}</strong> zamówień
            &rarr; <strong>{imported.length}</strong> klientów w CRM,
            &nbsp;<strong>{imported.length}</strong> faktur (DRAFT) w FI,
            &nbsp;<strong>{shipped.length}</strong> wysyłek w Logistyce.
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
          <div className="w-10 h-10 bg-green-100 rounded-2xl flex items-center justify-center">
            <ShoppingBag size={18} className="text-green-600" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Import Shopify</h2>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">
              {orders.length} zamówień
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
              onClick={() => handleImport(false)}
              disabled={importing}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-2xl transition-colors disabled:opacity-50"
            >
              {importing ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              Importuj wybrane ({selected.size})
            </button>
          )}

          {orders.length > 0 && (
            <button
              onClick={() => handleImport(true)}
              disabled={importing}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl transition-colors disabled:opacity-50"
            >
              {importing ? <Loader2 size={13} className="animate-spin" /> : <Package size={13} />}
              Importuj wszystkie nowe
            </button>
          )}
        </div>
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
          <ShoppingBag size={40} className="mx-auto text-slate-300 mb-4" />
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
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 w-28">ID zamówienia</span>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex-1">Klient</span>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 w-24 text-right">Kwota</span>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 w-24 text-center">Płatność</span>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 w-24 text-center">Wysyłka</span>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 w-8"></span>
          </div>

          {/* Wiersze */}
          {orders.map(order => {
            const id = String(order.id);
            const isSelected = selected.has(id);
            const resultForOrder = results?.find(r => r.orderId === id);

            return (
              <div
                key={order.id}
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
                <span className="text-[10px] font-mono text-slate-400 w-28 truncate">
                  #{order.id}
                </span>

                {/* Klient */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <User size={12} className="text-slate-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{buyerLabel(order)}</p>
                    <p className="text-[10px] text-slate-400 truncate">{order.email}</p>
                  </div>
                </div>

                {/* Kwota */}
                <span className="text-xs font-black text-slate-900 w-24 text-right flex-shrink-0">
                  {formatCurrency(order.total_price)}
                </span>

                {/* Status płatności */}
                <div className="w-24 text-center flex-shrink-0">
                  <span className={`inline-block text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-xl border ${FINANCIAL_COLOR[order.financial_status] ?? 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                    {FINANCIAL_LABEL[order.financial_status] ?? order.financial_status}
                  </span>
                </div>

                {/* Fulfillment */}
                <div className="w-24 text-center flex-shrink-0">
                  <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-xl border ${order.fulfillment_status === 'fulfilled' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                    <Truck size={9} />
                    {FULFILLMENT_LABEL[order.fulfillment_status ?? 'pending'] ?? 'Oczekuje'}
                  </span>
                </div>

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
        Wysyłki trafiają do modułu Logistyka. Duplikaty (po ID zamówienia) są automatycznie pomijane.
      </p>
    </div>
  );
}
