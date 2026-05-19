/**
 * Data: 2026-05-19
 * Modul: DMS — ESignPanel
 * Opis: Panel do wysyłania dokumentów do podpisu elektronicznego (DocuSign).
 *       Pokazuje listę sygnatariuszy, status podpisu i historię.
 *       Wywołanie: <ESignPanel documentId={id} documentName={name} />
 */

import React, { useState, useEffect } from 'react';
import {
  PenLine,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Settings,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import {
  Signer,
  SignatureRecord,
  getDocuSignConfig,
  sendForSignature,
  getSignatureRecords,
} from '../services/eSignService';

// ---------------------------------------------------------------------------
// Typy
// ---------------------------------------------------------------------------

type PanelState = 'idle' | 'sending' | 'success' | 'error' | 'no_config';

interface ESignPanelProps {
  documentId: string;
  documentName: string;
  /** base64 zawartości pliku — opcjonalne; jeśli brak, pokazuje info o storage */
  documentBase64?: string;
}

// ---------------------------------------------------------------------------
// Helpers renderowania statusu
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; className: string }
> = {
  sent: {
    label: 'Oczekuje na podpis',
    icon: <Clock size={14} />,
    className: 'text-amber-600 bg-amber-50 border-amber-200',
  },
  completed: {
    label: 'Podpisano',
    icon: <CheckCircle2 size={14} />,
    className: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  },
  declined: {
    label: 'Odrzucono',
    icon: <XCircle size={14} />,
    className: 'text-rose-600 bg-rose-50 border-rose-200',
  },
  voided: {
    label: 'Unieważniono',
    icon: <XCircle size={14} />,
    className: 'text-slate-500 bg-slate-50 border-slate-200',
  },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    icon: <Clock size={14} />,
    className: 'text-slate-500 bg-slate-50 border-slate-200',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${cfg.className}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Komponent
// ---------------------------------------------------------------------------

export default function ESignPanel({
  documentId,
  documentName,
  documentBase64,
}: ESignPanelProps) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();

  const [panelState, setPanelState] = useState<PanelState>('idle');
  const [signers, setSigners] = useState<Signer[]>([
    { name: '', email: '', role: 'Sygnatariusz' },
  ]);
  const [errorMessage, setErrorMessage] = useState('');
  const [records, setRecords] = useState<SignatureRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [configChecked, setConfigChecked] = useState(false);

  // Sprawdź konfigurację i załaduj historię przy montowaniu
  useEffect(() => {
    if (!activeTenantId || !documentId) return;

    const init = async () => {
      const { configured } = await getDocuSignConfig(activeTenantId);
      if (!configured) {
        setPanelState('no_config');
      }
      setConfigChecked(true);

      try {
        const recs = await getSignatureRecords(documentId);
        setRecords(recs);
      } catch {
        // historia niedostępna — nie blokujemy UI
      } finally {
        setLoadingRecords(false);
      }
    };

    init();
  }, [activeTenantId, documentId]);

  const addSigner = () => {
    setSigners((prev) => [
      ...prev,
      { name: '', email: '', role: 'Sygnatariusz' },
    ]);
  };

  const removeSigner = (index: number) => {
    setSigners((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSigner = (
    index: number,
    field: keyof Signer,
    value: string
  ) => {
    setSigners((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const isValid = signers.every(
    (s) => s.name.trim() && s.email.trim() && s.email.includes('@')
  );

  const handleSend = async () => {
    if (!activeTenantId || !user || !isValid) return;

    setPanelState('sending');
    setErrorMessage('');

    try {
      await sendForSignature(
        activeTenantId,
        documentId,
        signers,
        documentBase64 ?? '',
        documentName
      );

      // Odśwież historię
      const recs = await getSignatureRecords(documentId);
      setRecords(recs);

      setPanelState('success');
      setTimeout(() => setPanelState('idle'), 2500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Nieznany błąd';
      if (msg.startsWith('UPLOAD_REQUIRED:')) {
        setErrorMessage(
          'Wymagany upload pliku do Firebase Storage. Dokument przechowuje tylko link — wgraj plik binarny przed podpisem.'
        );
      } else {
        setErrorMessage(msg);
      }
      setPanelState('error');
    }
  };

  // ---------------------------------------------------------------------------
  // Render stanów specjalnych
  // ---------------------------------------------------------------------------

  if (!configChecked) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (panelState === 'no_config') {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center px-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center">
          <Settings size={28} className="text-amber-500" />
        </div>
        <div>
          <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-tight mb-1">
            Skonfiguruj DocuSign w Integracjach
          </h4>
          <p className="text-[10px] text-slate-500 font-bold max-w-xs leading-relaxed">
            Aby wysyłać dokumenty do podpisu, dodaj integrację DocuSign
            (apiKey + apiUrl + accountId) w module Integracji.
          </p>
        </div>
        <a
          href="#integrations"
          className="px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all"
        >
          Przejdz do Integracji
        </a>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render główny
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-6">
      {/* Nagłówek */}
      <div className="flex items-center gap-2">
        <PenLine size={16} className="text-indigo-500" />
        <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-tight">
          Podpis Elektroniczny — DocuSign
        </h4>
      </div>

      {/* Info o braku pliku */}
      {!documentBase64 && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-200">
          <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[10px] font-bold text-amber-700 leading-relaxed">
            Dokument przechowuje tylko link. Wymagany upload pliku do Firebase
            Storage przed wysłaniem do podpisu elektronicznego.
          </p>
        </div>
      )}

      {/* Lista sygnatariuszy */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Sygnatariusze ({signers.length})
          </span>
          <button
            onClick={addSigner}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all"
          >
            <Plus size={12} /> Dodaj
          </button>
        </div>

        {signers.map((signer, index) => (
          <div
            key={index}
            className="flex flex-col gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Sygnatariusz {index + 1}
              </span>
              {signers.length > 1 && (
                <button
                  onClick={() => removeSigner(index)}
                  className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Imie i Nazwisko"
                value={signer.name}
                onChange={(e) => updateSigner(index, 'name', e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-900 placeholder-slate-300 outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <input
                type="email"
                placeholder="email@firma.pl"
                value={signer.email}
                onChange={(e) => updateSigner(index, 'email', e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-900 placeholder-slate-300 outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <input
              type="text"
              placeholder="Rola (np. Dyrektor, Klient)"
              value={signer.role}
              onChange={(e) => updateSigner(index, 'role', e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-900 placeholder-slate-300 outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        ))}
      </div>

      {/* Błąd */}
      {panelState === 'error' && (
        <div className="flex items-start gap-3 p-4 bg-rose-50 rounded-2xl border border-rose-200">
          <AlertCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
          <p className="text-[10px] font-bold text-rose-700 leading-relaxed">
            {errorMessage}
          </p>
        </div>
      )}

      {/* Sukces */}
      {panelState === 'success' && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
          <CheckCircle2 size={16} className="text-emerald-500" />
          <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
            Wyslano do podpisu pomyslnie
          </p>
        </div>
      )}

      {/* Przycisk wysyłania */}
      <button
        onClick={handleSend}
        disabled={
          panelState === 'sending' ||
          panelState === 'success' ||
          !isValid ||
          !documentBase64
        }
        className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-3.5 rounded-2xl text-[10px] uppercase tracking-widest transition-all"
      >
        {panelState === 'sending' ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Wysylanie...
          </>
        ) : (
          <>
            <PenLine size={14} />
            Wyslij do podpisu (DocuSign)
          </>
        )}
      </button>

      {/* Historia podpisów */}
      {(records.length > 0 || loadingRecords) && (
        <div className="border-t border-slate-100 pt-4">
          <button
            onClick={() => setShowHistory((p) => !p)}
            className="flex items-center justify-between w-full text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-900 transition-colors"
          >
            <span>Historia podpisow ({records.length})</span>
            {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showHistory && (
            <div className="mt-4 flex flex-col gap-3">
              {loadingRecords ? (
                <div className="flex items-center gap-2 py-4 justify-center">
                  <Loader2 size={16} className="animate-spin text-slate-400" />
                  <span className="text-[10px] font-black text-slate-400 uppercase">
                    Ladowanie...
                  </span>
                </div>
              ) : (
                records.map((record) => (
                  <div
                    key={record.id}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-100"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                          Koperta: {record.envelopeId.substring(0, 16)}...
                        </p>
                        <p className="text-[9px] font-bold text-slate-400">
                          Wyslano:{' '}
                          {new Date(record.sentAt).toLocaleDateString('pl-PL', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        {record.completedAt && (
                          <p className="text-[9px] font-bold text-emerald-600">
                            Podpisano:{' '}
                            {new Date(record.completedAt).toLocaleDateString(
                              'pl-PL'
                            )}
                          </p>
                        )}
                      </div>
                      <StatusBadge status={record.status} />
                    </div>
                    <div className="flex flex-col gap-1">
                      {record.signers.map((s, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-[9px] font-bold text-slate-500"
                        >
                          <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[8px] font-black shrink-0">
                            {i + 1}
                          </span>
                          <span className="truncate">
                            {s.name} — {s.email}
                          </span>
                          <span className="text-slate-300">({s.role})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
