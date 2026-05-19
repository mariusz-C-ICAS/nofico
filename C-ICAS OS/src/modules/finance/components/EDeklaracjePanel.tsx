/**
 * Data: 2026-05-19
 * Zmiany: Panel e-Deklaracje — wybor okresu, typy deklaracji, podglad XML, wysylka, historia.
 * Sciezka: /src/modules/finance/components/EDeklaracjePanel.tsx
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, Send, Eye, AlertTriangle, CheckCircle2,
  Loader2, Clock, ChevronRight, X, Download,
} from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import {
  generateJpkVat,
  submitDeclaration,
  getDeclarationHistory,
  getEDeklaracjeConfig,
  type DeclarationType,
  type DeclarationHistoryEntry,
  type EDeklaracjeConfig,
  type JpkVatPreview,
} from '../services/eDeklaracjeService';

// ─── Types ────────────────────────────────────────────────────────────────────

type PanelStatus = 'idle' | 'loading' | 'preview' | 'submitting' | 'done' | 'error' | 'no-config';

interface DeclarationTypeOption {
  value: DeclarationType;
  label: string;
  description: string;
}

const DECLARATION_TYPES: DeclarationTypeOption[] = [
  { value: 'JPK_VAT', label: 'JPK-VAT', description: 'Plik JPK_V7M — miesięczny rejestr VAT' },
  { value: 'CIT', label: 'CIT-8', description: 'Podatek dochodowy od osób prawnych' },
  { value: 'PIT', label: 'PIT-36', description: 'Podatek dochodowy od osób fizycznych' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatPeriodLabel(period: string): string {
  const [y, m] = period.split('-');
  const months = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
  ];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

function downloadXml(xml: string, filename: string): void {
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EDeklaracjePanel() {
  const { activeTenantId } = useAuth() as { activeTenantId: string };

  const [status, setStatus] = useState<PanelStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [config, setConfig] = useState<EDeklaracjeConfig | null>(null);

  const [period, setPeriod] = useState(currentPeriod());
  const [declType, setDeclType] = useState<DeclarationType>('JPK_VAT');

  const [preview, setPreview] = useState<JpkVatPreview | null>(null);
  const [showXml, setShowXml] = useState(false);

  const [submitResult, setSubmitResult] = useState<{ referenceNumber: string; message: string } | null>(null);
  const [history, setHistory] = useState<DeclarationHistoryEntry[]>([]);

  // ─── Load config + history on mount ────────────────────────────────────────

  const loadInitialData = useCallback(async () => {
    if (!activeTenantId) return;
    try {
      const [cfg, hist] = await Promise.all([
        getEDeklaracjeConfig(activeTenantId).catch(() => null),
        getDeclarationHistory(activeTenantId).catch(() => [] as DeclarationHistoryEntry[]),
      ]);
      setConfig(cfg);
      setHistory(hist.sort((a, b) => String(b.submittedAt ?? '').localeCompare(String(a.submittedAt ?? ''))));
      if (!cfg) setStatus('no-config');
    } catch {
      setStatus('no-config');
    }
  }, [activeTenantId]);

  useEffect(() => { loadInitialData(); }, [loadInitialData]);

  // ─── Generate preview ───────────────────────────────────────────────────────

  const handleGeneratePreview = useCallback(async () => {
    if (!activeTenantId) return;
    setStatus('loading');
    setErrorMsg('');
    setPreview(null);
    setShowXml(false);
    try {
      if (declType !== 'JPK_VAT') {
        // CIT/PIT — symulacja (brak rzeczywistych danych)
        const placeholderXml =
          `<?xml version="1.0" encoding="UTF-8"?>\n` +
          `<Deklaracja xmlns="http://e-deklaracje.mf.gov.pl">\n` +
          `  <Naglowek><KodFormularza>${declType === 'CIT' ? 'CIT-8' : 'PIT-36'}</KodFormularza></Naglowek>\n` +
          `  <!-- Deklaracja ${declType} za okres ${period} -->\n` +
          `  <!-- W produkcji: dane z systemu FK + certyfikat kwalifikowany -->\n` +
          `</Deklaracja>`;
        setPreview({ xml: placeholderXml, salesCount: 0, totalVatDue: 0 });
      } else {
        const result = await generateJpkVat(activeTenantId, period);
        setPreview(result);
      }
      setStatus('preview');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setStatus('error');
    }
  }, [activeTenantId, period, declType]);

  // ─── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!activeTenantId) return;
    if (!config?.hasCertificate) {
      setErrorMsg('Brak certyfikatu e-Deklaracje. Skonfiguruj certyfikat w module Integracje.');
      setStatus('error');
      return;
    }
    setStatus('submitting');
    try {
      const result = await submitDeclaration(activeTenantId, declType, period);
      if (result.status === 'error') {
        setErrorMsg(result.message);
        setStatus('error');
        return;
      }
      setSubmitResult({ referenceNumber: result.referenceNumber, message: result.message });
      setStatus('done');
      // Odswież historię
      const hist = await getDeclarationHistory(activeTenantId).catch(() => [] as DeclarationHistoryEntry[]);
      setHistory(hist.sort((a, b) => String(b.submittedAt ?? '').localeCompare(String(a.submittedAt ?? ''))));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setStatus('error');
    }
  }, [activeTenantId, config, declType, period]);

  // ─── Render ──────────────────────────────────────────────────────────────────

  const isLoading = status === 'loading' || status === 'submitting';
  const selectedTypeOption = DECLARATION_TYPES.find((t) => t.value === declType)!;

  return (
    <div className="space-y-6">

      {/* No config warning */}
      {status === 'no-config' && (
        <div className="bg-white border-2 border-amber-100 rounded-[2rem] p-6 flex items-start gap-4 shadow-sm">
          <div className="bg-amber-50 p-3 rounded-xl shrink-0">
            <AlertTriangle className="text-amber-500" size={20} />
          </div>
          <div>
            <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">
              Brak konfiguracji
            </div>
            <div className="text-sm font-black text-slate-900 uppercase italic">
              Skonfiguruj e-Deklaracje w Integracjach
            </div>
            <div className="text-[10px] font-black text-slate-400 uppercase mt-2 flex items-center gap-1">
              <ChevronRight size={12} />
              Ustawienia → Integracje → e-Deklaracje
            </div>
          </div>
        </div>
      )}

      {/* Config form */}
      <div className="bg-white border-2 border-slate-100 rounded-[2rem] p-6 shadow-sm space-y-5">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
          Parametry deklaracji
        </div>

        {/* Period */}
        <div className="flex flex-wrap gap-4 items-end">
          <label className="flex flex-col gap-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              Okres (miesiąc)
            </span>
            <input
              type="month"
              value={period}
              onChange={(e) => { setPeriod(e.target.value); setStatus('idle'); setPreview(null); }}
              className="border-2 border-slate-100 rounded-xl px-3 py-2 text-xs font-black text-slate-700 focus:outline-none focus:border-indigo-400"
            />
          </label>
          <div className="text-[10px] font-black text-indigo-500 uppercase pb-2">
            {formatPeriodLabel(period)}
          </div>
        </div>

        {/* Type selector */}
        <div className="space-y-2">
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
            Typ deklaracji
          </div>
          <div className="flex flex-wrap gap-3">
            {DECLARATION_TYPES.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setDeclType(opt.value); setStatus('idle'); setPreview(null); }}
                className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${
                  declType === opt.value
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100'
                    : 'bg-white text-slate-600 border-slate-100 hover:border-indigo-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="text-[9px] font-black text-slate-400 uppercase">
            {selectedTypeOption.description}
          </div>
        </div>

        {/* Certificate warning */}
        {config && !config.hasCertificate && (
          <div className="bg-amber-50 rounded-xl px-4 py-3 text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
            <AlertTriangle size={12} />
            Brak certyfikatu — wysyłka wymaga kwalifikowanego certyfikatu e-Deklaracje
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleGeneratePreview}
            disabled={isLoading || status === 'no-config'}
            className="bg-slate-900 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
            Generuj podgląd
          </button>

          {status === 'preview' && (
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'submitting' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Wyślij
            </button>
          )}
        </div>
      </div>

      {/* XML Preview */}
      {(status === 'preview' || status === 'submitting') && preview && (
        <div className="bg-white border-2 border-slate-100 rounded-[2rem] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Podgląd XML — {selectedTypeOption.label} {formatPeriodLabel(period)}
            </div>
            <div className="flex gap-2">
              {declType === 'JPK_VAT' && (
                <div className="flex gap-4 text-[10px] font-black uppercase">
                  <span className="text-slate-500">
                    Faktur: <span className="text-slate-900">{preview.salesCount}</span>
                  </span>
                  <span className="text-slate-500">
                    VAT należny: <span className="text-indigo-600">{preview.totalVatDue.toFixed(2)} PLN</span>
                  </span>
                </div>
              )}
              <button
                onClick={() => downloadXml(preview.xml, `${declType}_${period}.xml`)}
                className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-all"
                title="Pobierz XML"
              >
                <Download size={14} className="text-slate-600" />
              </button>
              <button
                onClick={() => setShowXml((v) => !v)}
                className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-all"
                title={showXml ? 'Ukryj XML' : 'Pokaż XML'}
              >
                {showXml ? <X size={14} className="text-slate-600" /> : <FileText size={14} className="text-slate-600" />}
              </button>
            </div>
          </div>

          {showXml && (
            <pre className="bg-slate-50 rounded-xl p-4 text-[10px] font-mono text-slate-600 overflow-x-auto max-h-80 whitespace-pre-wrap break-all">
              {preview.xml}
            </pre>
          )}
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="bg-white border-2 border-rose-100 rounded-[2rem] p-6 flex items-start gap-4 shadow-sm">
          <div className="bg-rose-50 p-3 rounded-xl shrink-0">
            <AlertTriangle className="text-rose-500" size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Błąd</div>
            <div className="text-[11px] font-black text-slate-700 uppercase font-mono break-all">{errorMsg}</div>
          </div>
        </div>
      )}

      {/* Success */}
      {status === 'done' && submitResult && (
        <div className="bg-emerald-600 rounded-[2rem] p-6 flex items-center gap-5 shadow-xl shadow-emerald-100">
          <div className="bg-white/20 p-3 rounded-xl shrink-0">
            <CheckCircle2 className="text-white" size={24} />
          </div>
          <div>
            <div className="text-[10px] font-black text-emerald-200 uppercase tracking-widest mb-1">
              Wysłano pomyślnie
            </div>
            <div className="text-sm font-black text-white uppercase italic">
              {submitResult.message}
            </div>
            <div className="text-[10px] font-black text-emerald-200 uppercase mt-1 font-mono">
              REF: {submitResult.referenceNumber}
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="bg-white border-2 border-slate-100 rounded-[2rem] p-6 shadow-sm space-y-4">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Historia wysłanych deklaracji
          </div>
          <div className="space-y-2">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg shrink-0 ${entry.status === 'submitted' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                    {entry.status === 'submitted'
                      ? <CheckCircle2 size={14} className="text-emerald-600" />
                      : <AlertTriangle size={14} className="text-rose-500" />
                    }
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-slate-700 uppercase">
                      {entry.type} — {entry.period}
                    </div>
                    <div className="text-[9px] font-black text-slate-400 uppercase font-mono">
                      {entry.referenceNumber}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Clock size={12} className="text-slate-300" />
                  <div className="text-[9px] font-black text-slate-400 uppercase">
                    {entry.period}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
