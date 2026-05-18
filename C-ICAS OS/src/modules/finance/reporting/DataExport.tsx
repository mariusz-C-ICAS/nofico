/**
 * Data: 2026-05-18
 * Zmiany: Prawdziwy CSV export faktur sprzedaży i zakupów z Firestore; zakres dat; integracje jako stub.
 * Ścieżka: /src/modules/finance/reporting/DataExport.tsx
 */
import React, { useState } from 'react';
import {
  Database, Share2, ExternalLink, HardDrive,
  Cloud, CheckCircle2, ShieldCheck, ChevronRight,
  Download, FileText, FileSpreadsheet, Loader2,
  AlertTriangle, X,
} from 'lucide-react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import { useTenant } from '../../../shared/hooks/useTenant';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfMonth() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DataExport() {
  const { activeTenantId } = useTenant();

  const [dateFrom, setDateFrom] = useState(firstDayOfMonth);
  const [dateTo,   setDateTo]   = useState(todayStr);
  const [exporting, setExporting] = useState<string | null>(null);
  const [toast,   setToast]  = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  // ── CSV: sales invoices ──
  const exportSalesCSV = async () => {
    if (!activeTenantId) return;
    setExporting('sales');
    try {
      const q = query(
        collection(db, `tenants/${activeTenantId}/invoices`),
        where('issueDate', '>=', dateFrom),
        where('issueDate', '<=', dateTo),
        orderBy('issueDate', 'asc'),
      );
      const snap = await getDocs(q);
      const header = [
        'Nr Faktury', 'Data Wystawienia', 'Data Sprzedaży', 'Termin Płatności',
        'Nabywca', 'NIP Nabywcy',
        'Netto', 'VAT', 'Brutto', 'Waluta',
        'Status', 'Status KSeF', 'Metoda Płatności',
      ].map(csvCell).join(',');

      const rows = snap.docs.map(d => {
        const i = d.data();
        return [
          i.number, i.issueDate, i.saleDate, i.dueDate,
          i.buyer?.name ?? '', i.buyer?.nip ?? '',
          i.totalNetto?.toFixed(2) ?? '0.00',
          i.totalVat?.toFixed(2)   ?? '0.00',
          i.totalBrutto?.toFixed(2) ?? '0.00',
          i.currency,
          i.status, i.ksefStatus ?? '', i.paymentMethod,
        ].map(csvCell).join(',');
      });

      downloadCSV([header, ...rows].join('\n'), `faktury_sprzedazy_${dateFrom}_${dateTo}.csv`);
      showToast(`Wyeksportowano ${snap.size} faktur sprzedaży`);
    } catch (err) {
      console.error('[DataExport] sales CSV error:', err);
      showToast('Błąd eksportu faktur sprzedaży', false);
    } finally {
      setExporting(null);
    }
  };

  // ── CSV: purchase invoices ──
  const exportPurchaseCSV = async () => {
    if (!activeTenantId) return;
    setExporting('purchase');
    try {
      const q = query(
        collection(db, `tenants/${activeTenantId}/purchaseInvoices`),
        where('issueDate', '>=', dateFrom),
        where('issueDate', '<=', dateTo),
        orderBy('issueDate', 'asc'),
      );
      const snap = await getDocs(q);
      const header = [
        'Nr Faktury Dostawcy', 'Nr Wewnętrzny', 'Data Wystawienia', 'Termin Płatności',
        'Dostawca', 'NIP Dostawcy',
        'Netto', 'VAT', 'Brutto', 'Waluta',
        'Opłacona', 'Data Zapłaty', 'Źródło', 'MPP',
      ].map(csvCell).join(',');

      const rows = snap.docs.map(d => {
        const i = d.data();
        return [
          i.supplierInvoiceNumber, i.internalNumber ?? '',
          i.issueDate, i.dueDate,
          i.seller?.name ?? '', i.seller?.nip ?? '',
          i.totalNetto?.toFixed(2)   ?? '0.00',
          i.totalVat?.toFixed(2)     ?? '0.00',
          i.totalBrutto?.toFixed(2)  ?? '0.00',
          i.currency,
          i.isPaid ? 'TAK' : 'NIE', i.paymentDate ?? '',
          i.source, i.isMpp ? 'TAK' : 'NIE',
        ].map(csvCell).join(',');
      });

      downloadCSV([header, ...rows].join('\n'), `faktury_zakupowe_${dateFrom}_${dateTo}.csv`);
      showToast(`Wyeksportowano ${snap.size} faktur zakupowych`);
    } catch (err) {
      console.error('[DataExport] purchase CSV error:', err);
      showToast('Błąd eksportu faktur zakupowych', false);
    } finally {
      setExporting(null);
    }
  };

  // ── JPK placeholder ──
  const exportJpkPlaceholder = () => {
    showToast('JPK_V7 — w trakcie implementacji. Użyj modułu Podatki → JPK Generator.', false);
  };

  const integrations = [
    { id: 'looker', name: 'Looker Studio Connector', icon: Database, color: 'bg-indigo-100 text-indigo-600', status: 'none' },
    { id: 'drive',  name: 'Google Drive Sync',       icon: Cloud,    color: 'bg-emerald-100 text-emerald-600', status: 'none' },
    { id: 'od',     name: 'Microsoft OneDrive',      icon: HardDrive,color: 'bg-indigo-100 text-indigo-600', status: 'none' },
    { id: 'bi',     name: 'Power BI Endpoints',      icon: Share2,   color: 'bg-amber-100 text-amber-600',   status: 'none' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-8 right-8 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl text-[11px] font-black uppercase tracking-widest ${toast.ok ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
          {toast.ok ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
          {toast.msg}
          <button onClick={() => setToast(null)}><X size={12} /></button>
        </div>
      )}

      {/* Date range */}
      <div className="bg-white rounded-[3rem] border border-slate-100 p-8 shadow-sm">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Zakres Dat Eksportu</div>
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Od</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Do</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Local exports */}
        <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm">
          <h4 className="text-xl font-black text-slate-900 uppercase italic mb-6">Eksport Lokalny (CSV)</h4>
          <div className="space-y-4">

            {/* Sales invoices */}
            <button
              onClick={exportSalesCSV}
              disabled={exporting === 'sales' || !activeTenantId}
              className="w-full flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-100/50 transition-all group disabled:opacity-50"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-indigo-100 text-indigo-600">
                  <FileText size={22} />
                </div>
                <div className="text-left">
                  <div className="text-[11px] font-black text-slate-900 uppercase tracking-tight">Faktury Sprzedaży</div>
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">CSV / Excel-ready (UTF-8 BOM)</div>
                </div>
              </div>
              {exporting === 'sales'
                ? <Loader2 size={18} className="animate-spin text-indigo-400" />
                : <Download size={18} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
              }
            </button>

            {/* Purchase invoices */}
            <button
              onClick={exportPurchaseCSV}
              disabled={exporting === 'purchase' || !activeTenantId}
              className="w-full flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-100/50 transition-all group disabled:opacity-50"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-purple-100 text-purple-600">
                  <FileSpreadsheet size={22} />
                </div>
                <div className="text-left">
                  <div className="text-[11px] font-black text-slate-900 uppercase tracking-tight">Faktury Zakupowe</div>
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">CSV / Excel-ready (UTF-8 BOM)</div>
                </div>
              </div>
              {exporting === 'purchase'
                ? <Loader2 size={18} className="animate-spin text-indigo-400" />
                : <Download size={18} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
              }
            </button>

            {/* JPK */}
            <button
              onClick={exportJpkPlaceholder}
              className="w-full flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 hover:border-amber-400 hover:bg-amber-50/30 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-100 text-amber-600">
                  <Database size={22} />
                </div>
                <div className="text-left">
                  <div className="text-[11px] font-black text-slate-900 uppercase tracking-tight">JPK_V7 / JPK_FA</div>
                  <div className="text-[9px] font-black text-amber-400 uppercase tracking-widest italic">Użyj modułu Podatki → JPK</div>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-300 group-hover:text-amber-500 transition-colors" />
            </button>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-8">

          {/* External integrations */}
          <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm">
            <h4 className="text-xl font-black text-slate-900 uppercase italic mb-6">Konektory Zewnętrzne</h4>
            <div className="space-y-3">
              {integrations.map(int => (
                <div key={int.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 group">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${int.color}`}>
                      <int.icon size={20} />
                    </div>
                    <div>
                      <div className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{int.name}</div>
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Niepołączone — wymaga konfiguracji OAuth</div>
                    </div>
                  </div>
                  <button className="text-[9px] font-black text-indigo-500 uppercase tracking-widest hover:text-indigo-700 transition-colors px-3 py-1 border border-indigo-200 rounded-lg">
                    Konfiguruj
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Security info */}
          <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />
            <ShieldCheck className="text-indigo-400 mb-4" size={28} />
            <h4 className="text-lg font-black uppercase italic tracking-tighter mb-3">Export Security</h4>
            <p className="text-xs font-medium text-indigo-100 italic leading-relaxed mb-6">
              Pliki CSV generowane są lokalnie w przeglądarce. Dane nie opuszczają Firestore bez Twojej autoryzacji.
            </p>
            <div className="flex items-center gap-3 bg-white/10 px-5 py-3 rounded-2xl w-fit">
              <ExternalLink size={16} className="text-indigo-300" />
              <span className="text-[10px] font-black uppercase tracking-widest italic">Dane szyfrowane TLS 1.3</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
