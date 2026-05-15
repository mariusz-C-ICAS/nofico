import React, { useState } from 'react';
import {
  Sparkles, Loader2, ChevronDown, ChevronRight, Copy, CheckCheck,
  FileSearch, AlertCircle, Stamp, QrCode, Barcode, Type, PenLine,
} from 'lucide-react';
import type { AiDocumentAnalysis, AiExtractionField, DocumentMetadata } from '../types';
import { analyzeDocument, buildSuggestedMetadata } from '../services/documentAiService';

interface Props {
  tenantId: string;
  documentInstanceId: string;
  attachmentId: string;
  attachmentUrl?: string;
  onApplySuggestions?: (meta: Partial<DocumentMetadata>) => void;
}

const FIELD_CONFIG: Record<AiExtractionField, { label: string; icon: React.ReactNode; color: string }> = {
  printed_text:   { label: 'Tekst drukowany',   icon: <Type size={12} />,     color: 'text-slate-600 bg-slate-100' },
  handwritten:    { label: 'Notatki odręczne',  icon: <PenLine size={12} />,  color: 'text-violet-600 bg-violet-50' },
  stamp:          { label: 'Pieczątki',          icon: <Stamp size={12} />,    color: 'text-amber-600 bg-amber-50' },
  barcode:        { label: 'Kody kreskowe',      icon: <Barcode size={12} />,  color: 'text-blue-600 bg-blue-50' },
  qr_code:        { label: 'Kody QR',            icon: <QrCode size={12} />,   color: 'text-indigo-600 bg-indigo-50' },
  amounts:        { label: 'Kwoty',              icon: <span className="text-[10px] font-black">PLN</span>, color: 'text-emerald-600 bg-emerald-50' },
  dates:          { label: 'Daty',               icon: <span className="text-[10px] font-black">📅</span>, color: 'text-blue-600 bg-blue-50' },
  nip_numbers:    { label: 'Numery NIP',         icon: <span className="text-[10px] font-black">NIP</span>, color: 'text-slate-600 bg-slate-100' },
  iban_numbers:   { label: 'IBAN / Rachunki',   icon: <span className="text-[10px] font-black">IBAN</span>, color: 'text-teal-600 bg-teal-50' },
  vendor_name:    { label: 'Nazwa dostawcy',     icon: <span className="text-[10px] font-black">FV</span>, color: 'text-orange-600 bg-orange-50' },
  invoice_number: { label: 'Nr dokumentu',       icon: <span className="text-[10px] font-black">#</span>,  color: 'text-indigo-600 bg-indigo-50' },
  signatures:     { label: 'Podpisy / parafy',  icon: <PenLine size={12} />,  color: 'text-rose-600 bg-rose-50' },
};

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} className="p-1 hover:bg-white rounded-md transition-colors ml-1">
      {copied ? <CheckCheck size={10} className="text-emerald-500" /> : <Copy size={10} className="text-slate-400" />}
    </button>
  );
}

export default function DocumentAiPanel({ tenantId, documentInstanceId, attachmentId, attachmentUrl, onApplySuggestions }: Props) {
  const [analysis, setAnalysis] = useState<AiDocumentAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Partial<Record<AiExtractionField, boolean>>>({});
  const [applied, setApplied] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await analyzeDocument(tenantId, documentInstanceId, attachmentId, attachmentUrl ?? '');
      setAnalysis(result);
    } catch (e: any) {
      setError(e.message ?? 'Błąd analizy');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!analysis || !onApplySuggestions) return;
    onApplySuggestions(buildSuggestedMetadata(analysis));
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  };

  const toggleField = (field: AiExtractionField) =>
    setExpanded(p => ({ ...p, [field]: !p[field] }));

  const nonEmptyFields = analysis
    ? (Object.keys(FIELD_CONFIG) as AiExtractionField[]).filter(
        f => (analysis.extractedData[f]?.length ?? 0) > 0
      )
    : [];

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-[2rem] border border-indigo-100 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-indigo-500" />
          <span className="text-xs font-black text-slate-800 uppercase tracking-tight">
            Asystent AI — Analiza dokumentu
          </span>
        </div>
        {analysis && (
          <span className="text-[9px] font-black text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full uppercase">
            {Math.round(analysis.confidence * 100)}% pewność · {analysis.model}
          </span>
        )}
      </div>

      {!analysis && !loading && (
        <button
          onClick={handleAnalyze}
          className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-200"
        >
          <FileSearch size={14} /> Analizuj dokument (OCR + AI)
        </button>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-3 py-8">
          <Loader2 size={20} className="text-indigo-500 animate-spin" />
          <span className="text-xs font-bold text-indigo-600">
            Czytam tekst, pieczątki, kody, notatki odręczne…
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-2xl px-4 py-3 text-xs font-bold">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {analysis && (
        <>
          {/* Suggestions */}
          {(analysis.suggestedTitle || analysis.suggestedAmount || analysis.suggestedVendor) && (
            <div className="bg-white rounded-2xl p-4 space-y-2 border border-indigo-100">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">
                Sugestie — kliknij aby zastosować do formularza
              </p>
              {analysis.suggestedTitle && (
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-slate-400 uppercase font-black">Tytuł</span>
                  <span className="text-xs font-bold text-slate-800">{analysis.suggestedTitle}</span>
                </div>
              )}
              {analysis.suggestedAmount && (
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-slate-400 uppercase font-black">Kwota</span>
                  <span className="text-sm font-black text-indigo-600">
                    {analysis.suggestedAmount.toFixed(2)} {analysis.suggestedCurrency ?? 'PLN'}
                  </span>
                </div>
              )}
              {analysis.suggestedVendor && (
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-slate-400 uppercase font-black">Dostawca</span>
                  <span className="text-xs font-bold text-slate-800">{analysis.suggestedVendor}</span>
                </div>
              )}
              {analysis.suggestedDate && (
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-slate-400 uppercase font-black">Data</span>
                  <span className="text-xs font-bold text-slate-800">{analysis.suggestedDate}</span>
                </div>
              )}
              {onApplySuggestions && (
                <button
                  onClick={handleApply}
                  className="mt-2 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
                >
                  {applied ? 'Zastosowano!' : 'Zastosuj sugestie'}
                </button>
              )}
            </div>
          )}

          {/* Extracted fields */}
          <div className="space-y-2">
            {nonEmptyFields.map(field => {
              const cfg = FIELD_CONFIG[field];
              const values = analysis.extractedData[field] ?? [];
              const isOpen = expanded[field];
              return (
                <div key={field} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                  <button
                    onClick={() => toggleField(field)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                      {cfg.icon}
                    </span>
                    <span className="text-xs font-black text-slate-700 flex-1 text-left">{cfg.label}</span>
                    <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      {values.length}
                    </span>
                    {isOpen ? <ChevronDown size={12} className="text-slate-400" /> : <ChevronRight size={12} className="text-slate-400" />}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-3 space-y-1.5">
                      {values.map((v, i) => (
                        <div key={i} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2">
                          <span className="text-xs text-slate-700 font-medium flex-1 break-all">{v}</span>
                          <CopyBtn text={v} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={handleAnalyze}
            className="w-full py-3 text-[10px] font-black text-indigo-500 hover:text-indigo-700 uppercase tracking-widest transition-colors"
          >
            Analizuj ponownie
          </button>
        </>
      )}
    </div>
  );
}
