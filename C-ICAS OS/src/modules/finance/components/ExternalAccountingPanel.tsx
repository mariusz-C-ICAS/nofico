/**
 * Data: 2026-05-19
 * Opis: Panel eksportu faktur do zewnętrznych systemów FK.
 *       Zakładki: inFakt | Optima | Symfonia | Xero
 *       Każda zakładka pokazuje faktury bez znacznika exportedTo.{system}
 *       i umożliwia multi-select + eksport.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import { useAuth } from '../../../shared/hooks/useAuth';
import type { SalesInvoice } from '../types/fiTypes';
import { syncInvoicesToInFakt } from '../services/inFaktService';
import { exportInvoicesToOptima } from '../services/optimaService';
import { exportInvoicesToSymfonia } from '../services/symfoniaService';
import { syncInvoicesToXero } from '../services/xeroService';
import {
  Upload, CheckCircle2, AlertCircle, Loader2, ExternalLink,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Typy lokalne
// ---------------------------------------------------------------------------

type FkSystem = 'infakt' | 'optima' | 'symfonia' | 'xero';

interface FkTab {
  id: FkSystem;
  label: string;
  providerId: string;
}

const FK_TABS: FkTab[] = [
  { id: 'infakt',   label: 'inFakt',   providerId: 'infakt' },
  { id: 'optima',   label: 'Optima',   providerId: 'optima' },
  { id: 'symfonia', label: 'Symfonia', providerId: 'symfonia' },
  { id: 'xero',     label: 'Xero',     providerId: 'xero' },
];

interface ExportResult {
  synced?: number;
  exported?: number;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Hook: lista nieksportowanych faktur dla danego systemu
// ---------------------------------------------------------------------------

function useUnexportedInvoices(tenantId: string, system: FkSystem) {
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Firestore nie obsługuje "pole nie istnieje" bezpośrednio —
      // pobieramy wszystkie nieusunięte i filtrujemy po stronie klienta.
      const q = query(
        collection(db, 'tenants', tenantId, 'invoices'),
        where('isDeleted', '==', false),
        where('status', 'in', ['issued', 'sent', 'partially_paid', 'paid']),
        orderBy('issueDate', 'desc'),
      );
      const snap = await getDocs(q);
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SalesInvoice));
      const unexported = all.filter((inv) => {
        const exportedTo = (inv as SalesInvoice & { exportedTo?: Record<string, unknown> }).exportedTo;
        return !exportedTo?.[system];
      });
      setInvoices(unexported);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [tenantId, system]);

  useEffect(() => { load(); }, [load]);

  return { invoices, loading, error, reload: load };
}

// ---------------------------------------------------------------------------
// Hook: czy integracja jest skonfigurowana
// ---------------------------------------------------------------------------

function useIntegrationConfigured(tenantId: string, providerId: string) {
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        const q = query(
          collection(db, 'tenants', tenantId, 'integrations'),
          where('providerId', '==', providerId),
        );
        const snap = await getDocs(q);
        if (snap.empty) { setConfigured(false); return; }
        const data = snap.docs[0].data() as { config?: Record<string, unknown> };
        const cfg = data.config ?? {};
        const hasKey = Object.values(cfg).some((v) => typeof v === 'string' && v.length > 0);
        setConfigured(hasKey);
      } catch {
        setConfigured(false);
      }
    };
    check();
  }, [tenantId, providerId]);

  return configured;
}

// ---------------------------------------------------------------------------
// Komponent jednej zakładki systemu FK
// ---------------------------------------------------------------------------

interface FkSystemPanelProps {
  tenantId: string;
  tab: FkTab;
}

function FkSystemPanel({ tenantId, tab }: FkSystemPanelProps) {
  const configured = useIntegrationConfigured(tenantId, tab.providerId);
  const { invoices, loading, error, reload } = useUnexportedInvoices(tenantId, tab.id);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<ExportResult | null>(null);

  // Reset selected gdy zmienia się lista
  useEffect(() => { setSelected(new Set()); }, [invoices]);

  const toggleAll = () => {
    if (selected.size === invoices.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(invoices.map((inv) => inv.id!)));
    }
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExport = async () => {
    const toExport = invoices.filter((inv) => inv.id && selected.has(inv.id));
    if (toExport.length === 0) return;

    setExporting(true);
    setResult(null);
    try {
      let res: ExportResult;
      switch (tab.id) {
        case 'infakt':
          res = await syncInvoicesToInFakt(tenantId, toExport);
          break;
        case 'optima':
          res = await exportInvoicesToOptima(tenantId, toExport);
          break;
        case 'symfonia':
          res = await exportInvoicesToSymfonia(tenantId, toExport);
          break;
        case 'xero':
          res = await syncInvoicesToXero(tenantId, toExport);
          break;
      }
      setResult(res);
      await reload();
    } catch (err) {
      setResult({
        errors: [err instanceof Error ? err.message : String(err)],
      });
    } finally {
      setExporting(false);
    }
  };

  // Brak konfiguracji
  if (configured === false) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <AlertCircle className="text-amber-500" size={40} />
        <p className="text-slate-700 font-semibold text-sm">
          Brak konfiguracji {tab.label}.
        </p>
        <p className="text-slate-500 text-xs max-w-xs">
          Przejdz do sekcji <strong>Integracje</strong> i skonfiguruj polaczenie z {tab.label},
          aby moc eksportowac faktury.
        </p>
        <a
          href="/dashboard/integrations"
          className="flex items-center gap-2 text-indigo-600 text-xs font-bold hover:underline"
        >
          <ExternalLink size={14} /> Przejdz do Integracji
        </a>
      </div>
    );
  }

  // Ladowanie
  if (configured === null || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="text-indigo-600 animate-spin" size={32} />
      </div>
    );
  }

  // Blad
  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
        <AlertCircle size={18} />
        {error}
      </div>
    );
  }

  const count = invoices.length;
  const exportCount = result?.synced ?? result?.exported ?? 0;

  return (
    <div className="space-y-4">
      {/* Wynik eksportu */}
      {result && (
        <div className={`flex items-start gap-3 p-4 rounded-2xl border text-sm ${
          result.errors.length === 0
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-amber-50 border-amber-200 text-amber-700'
        }`}>
          {result.errors.length === 0
            ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            : <AlertCircle size={18} className="mt-0.5 shrink-0" />
          }
          <div>
            {exportCount > 0 && (
              <p className="font-bold">Wyeksportowano {exportCount} {exportCount === 1 ? 'fakture' : 'faktur'}.</p>
            )}
            {result.errors.map((e, i) => (
              <p key={i} className="text-xs mt-1">{e}</p>
            ))}
          </div>
        </div>
      )}

      {/* Brak faktur do eksportu */}
      {count === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <CheckCircle2 className="text-emerald-500" size={36} />
          <p className="text-slate-600 font-semibold text-sm">
            Wszystkie faktury sa juz wyeksportowane do {tab.label}.
          </p>
        </div>
      )}

      {/* Lista faktur */}
      {count > 0 && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              {count} {count === 1 ? 'faktura' : 'faktur'} do eksportu
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={toggleAll}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                {selected.size === count ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}
              </button>
              <button
                onClick={handleExport}
                disabled={selected.size === 0 || exporting}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-[11px] font-black uppercase tracking-widest px-5 py-3 rounded-xl transition-all"
              >
                {exporting
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Upload size={14} />
                }
                Eksportuj zaznaczone ({selected.size})
              </button>
            </div>
          </div>

          <div className="border border-slate-100 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="w-10 p-3">
                    <input
                      type="checkbox"
                      checked={selected.size === count && count > 0}
                      onChange={toggleAll}
                      className="rounded"
                    />
                  </th>
                  <th className="text-left p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Numer</th>
                  <th className="text-left p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Nabywca</th>
                  <th className="text-left p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Data</th>
                  <th className="text-right p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Kwota brutto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {invoices.map((inv) => {
                  const isChecked = inv.id ? selected.has(inv.id) : false;
                  return (
                    <tr
                      key={inv.id}
                      onClick={() => inv.id && toggle(inv.id)}
                      className={`cursor-pointer transition-colors ${
                        isChecked ? 'bg-indigo-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => inv.id && toggle(inv.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="p-3 font-mono text-xs font-bold text-slate-800">{inv.number}</td>
                      <td className="p-3 text-xs text-slate-700">{inv.buyer.name}</td>
                      <td className="p-3 text-xs text-slate-500">{inv.issueDate}</td>
                      <td className="p-3 text-xs text-right font-bold text-slate-900">
                        {inv.totalBrutto.toFixed(2)} {inv.currency}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel glowny z zakładkami
// ---------------------------------------------------------------------------

export default function ExternalAccountingPanel() {
  const { activeTenantId } = useAuth();
  const [activeTab, setActiveTab] = useState<FkSystem>('infakt');

  if (!activeTenantId) return null;
  const tenantId = activeTenantId;

  return (
    <div className="space-y-6">
      {/* Naglowek */}
      <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-6 flex items-center gap-6 shadow-sm">
        <div className="bg-indigo-600 p-4 rounded-2xl shadow-lg shadow-indigo-200">
          <Upload className="text-white" size={22} />
        </div>
        <div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
            Eksport FK
          </div>
          <h3 className="text-xl font-black text-slate-900 uppercase italic leading-none">
            Zewnetrzne Systemy Ksiegowe
          </h3>
        </div>
      </div>

      {/* Zakładki systemow */}
      <div className="flex p-1.5 bg-slate-100 rounded-[2rem] w-fit gap-1">
        {FK_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-7 py-3.5 rounded-[1.75rem] transition-all text-[11px] font-black uppercase tracking-widest ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-xl scale-[1.02]'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Zawartosc aktywnej zakładki */}
      <div className="bg-white border-2 border-slate-100 rounded-[2rem] p-6 min-h-[400px]">
        {FK_TABS.map((tab) =>
          activeTab === tab.id ? (
            <FkSystemPanel key={tab.id} tenantId={tenantId} tab={tab} />
          ) : null,
        )}
      </div>
    </div>
  );
}
