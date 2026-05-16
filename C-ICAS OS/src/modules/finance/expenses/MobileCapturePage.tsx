/**
 * Data: 2026-05-16
 * Zmiany: Dedykowana strona mobile do przechwytywania paragonów z offline queue
 * Ścieżka: /src/modules/finance/expenses/MobileCapturePage.tsx
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera,
  CheckCircle2,
  CloudOff,
  ImagePlus,
  Loader2,
  RefreshCw,
  Trash2,
  Wifi,
  WifiOff,
  XCircle,
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import useTenant from '../../../shared/hooks/useTenant';
import {
  addToQueue,
  clearDoneReceipts,
  getPendingReceipts,
  getQueueStats,
  processQueue,
  type QueuedReceipt,
} from '../../../shared/utils/offlineQueue';

// ---------------------------------------------------------------------------
// Helpers (duplicated from ExpenseScanner — no cross-import per spec)
// ---------------------------------------------------------------------------
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function runGeminiOcr(file: File): Promise<string> {
  const base64 = await fileToBase64(file);
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [
      {
        parts: [
          {
            text: `Przeanalizuj ten paragon lub fakturę i wyciągnij dane w formacie JSON:\n{\n  "vendor": "nazwa sprzedawcy",\n  "amount": 0,\n  "currency": "PLN",\n  "vatRate": 23,\n  "date": "YYYY-MM-DD",\n  "category": "Inne",\n  "description": "krótki opis"\n}\nOdpowiedz TYLKO JSON.`,
          },
          {
            inlineData: {
              mimeType: file.type as 'image/jpeg' | 'image/png',
              data: base64,
            },
          },
        ],
      },
    ],
  });
  return response.text ?? '{}';
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------
const STATUS_CONFIG = {
  pending: { label: 'Oczekuje', color: 'bg-amber-100 text-amber-700' },
  processing: { label: 'Przetwarzanie', color: 'bg-indigo-100 text-indigo-700' },
  done: { label: 'Gotowe', color: 'bg-emerald-100 text-emerald-700' },
  error: { label: 'Błąd', color: 'bg-red-100 text-red-700' },
} as const;

function StatusBadge({ status }: { status: QueuedReceipt['status'] }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function MobileCapturePage() {
  const { activeTenantId } = useTenant();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingItems, setPendingItems] = useState<QueuedReceipt[]>([]);
  const [stats, setStats] = useState({ pending: 0, done: 0, error: 0, totalSize: 0 });
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [capturing, setCapturing] = useState(false);

  // -------------------------------------------------------------------------
  // Network listeners
  // -------------------------------------------------------------------------
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Auto-process when back online
  useEffect(() => {
    if (isOnline && stats.pending > 0) {
      handleProcessQueue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  // -------------------------------------------------------------------------
  // Load queue data
  // -------------------------------------------------------------------------
  const refreshQueue = useCallback(async () => {
    if (!activeTenantId) return;
    const [items, s] = await Promise.all([
      getPendingReceipts(activeTenantId),
      getQueueStats(activeTenantId),
    ]);
    setPendingItems(items.slice(0, 5));
    setStats(s);
  }, [activeTenantId]);

  useEffect(() => {
    refreshQueue();
  }, [refreshQueue]);

  // -------------------------------------------------------------------------
  // Show toast
  // -------------------------------------------------------------------------
  const showToast = (msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // -------------------------------------------------------------------------
  // Handle image capture / upload
  // -------------------------------------------------------------------------
  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file || !activeTenantId) return;
      setCapturing(true);

      try {
        const imageDataUrl = await fileToDataUrl(file);
        const id = await addToQueue({
          tenantId: activeTenantId,
          imageDataUrl,
          fileName: file.name || `paragon-${Date.now()}.jpg`,
          size: file.size,
          capturedAt: Date.now(),
          status: 'pending',
          retryCount: 0,
        });

        if (isOnline) {
          await processQueue(activeTenantId, async (receipt) => {
            const blob = await fetch(receipt.imageDataUrl).then((r) => r.blob());
            const f = new File([blob], receipt.fileName, { type: blob.type });
            return runGeminiOcr(f);
          });
          showToast('Paragon przetworzony przez AI', 'ok');
        } else {
          showToast('Zapisano offline — przetworzone po połączeniu', 'ok');
        }

        // Reset inputs so same file can be re-selected
        if (cameraRef.current) cameraRef.current.value = '';
        if (galleryRef.current) galleryRef.current.value = '';

        await refreshQueue();
        void id; // used only for addToQueue side-effect
      } catch (err) {
        showToast('Błąd przechwytywania — spróbuj ponownie', 'err');
      } finally {
        setCapturing(false);
      }
    },
    [activeTenantId, isOnline, refreshQueue],
  );

  // -------------------------------------------------------------------------
  // Process queue manually
  // -------------------------------------------------------------------------
  const handleProcessQueue = useCallback(async () => {
    if (!activeTenantId || processing) return;
    setProcessing(true);
    try {
      const result = await processQueue(activeTenantId, async (receipt) => {
        const blob = await fetch(receipt.imageDataUrl).then((r) => r.blob());
        const f = new File([blob], receipt.fileName, { type: blob.type });
        return runGeminiOcr(f);
      });
      showToast(
        `Przetworzono: ${result.processed}, błędy: ${result.failed}`,
        result.failed === 0 ? 'ok' : 'err',
      );
      await refreshQueue();
    } catch {
      showToast('Błąd przetwarzania kolejki', 'err');
    } finally {
      setProcessing(false);
    }
  }, [activeTenantId, processing, refreshQueue]);

  // -------------------------------------------------------------------------
  // Clear done
  // -------------------------------------------------------------------------
  const handleClearDone = useCallback(async () => {
    if (!activeTenantId) return;
    await clearDoneReceipts(activeTenantId);
    await refreshQueue();
  }, [activeTenantId, refreshQueue]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="max-w-sm mx-auto flex flex-col gap-6 pb-20">

      {/* ------------------------------------------------------------------ */}
      {/* Toast */}
      {/* ------------------------------------------------------------------ */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 ${
              toast.type === 'ok'
                ? 'bg-emerald-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            {toast.type === 'ok' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------------ */}
      {/* Header */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-[80px] -translate-y-1/3 translate-x-1/3" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            {isOnline ? (
              <Wifi size={14} className="text-emerald-400" />
            ) : (
              <WifiOff size={14} className="text-red-400" />
            )}
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {isOnline ? 'Online' : 'Offline — tryb kolejki'}
            </span>
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tighter italic mb-1">
            Skanuj <span className="text-indigo-400">Paragon</span>
          </h2>
          <p className="text-[11px] text-slate-400 font-bold">
            Gemini Vision OCR — automatyczna ekstrakcja danych
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Camera Hero */}
      {/* ------------------------------------------------------------------ */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => cameraRef.current?.click()}
        disabled={capturing}
        className="relative w-full rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-indigo-600 to-slate-800 shadow-2xl border border-indigo-500/30 flex flex-col items-center justify-center gap-4 py-14 cursor-pointer disabled:opacity-70"
      >
        {/* Pulse ring when idle */}
        {!capturing && (
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            className="absolute inset-0 rounded-[2.5rem] border-4 border-indigo-400 pointer-events-none"
          />
        )}

        {capturing ? (
          <Loader2 size={64} className="text-white animate-spin" />
        ) : (
          <Camera size={64} className="text-white drop-shadow-lg" />
        )}

        <span className="text-white font-black uppercase tracking-widest text-sm">
          {capturing ? 'Przetwarzanie...' : 'Dotknij aby sfotografować'}
        </span>
        <span className="text-indigo-300 text-[10px] font-bold uppercase tracking-widest">
          Użyj aparatu urządzenia
        </span>
      </motion.button>

      {/* Hidden camera input */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {/* Gallery upload */}
      <button
        onClick={() => galleryRef.current?.click()}
        className="flex items-center justify-center gap-3 w-full py-5 rounded-[2rem] border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 font-black uppercase tracking-widest text-[11px] hover:border-indigo-400 hover:text-indigo-600 transition-colors"
      >
        <ImagePlus size={18} />
        Wybierz z galerii
      </button>

      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Queue Card */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-7 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CloudOff size={18} className="text-slate-400" />
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-700 italic">
              Kolejka offline
            </span>
          </div>
          <div className="flex gap-2 text-[10px] font-black uppercase">
            <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              {stats.pending} oczek.
            </span>
            <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {stats.done} gotowe
            </span>
            {stats.error > 0 && (
              <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                {stats.error} błąd
              </span>
            )}
          </div>
        </div>

        {/* Recent items */}
        {pendingItems.length > 0 ? (
          <div className="flex flex-col gap-3">
            {pendingItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 bg-slate-50 rounded-2xl p-3"
              >
                <img
                  src={item.imageDataUrl}
                  alt={item.fileName}
                  className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-slate-200"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-700 truncate">
                    {item.fileName}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold">
                    {new Date(item.capturedAt).toLocaleDateString('pl-PL', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <StatusBadge status={item.status} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-slate-400 font-bold text-center py-2">
            Brak pozycji w kolejce
          </p>
        )}

        {/* Process button */}
        <button
          onClick={handleProcessQueue}
          disabled={processing || !isOnline || stats.pending === 0}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-indigo-600 text-white font-black text-[11px] uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <RefreshCw size={15} />
          )}
          {processing ? 'Przetwarzam...' : 'Przetwórz online'}
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Done receipts cleanup */}
      {/* ------------------------------------------------------------------ */}
      {stats.done > 0 && (
        <div className="bg-emerald-50 rounded-[2rem] border border-emerald-100 p-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-emerald-800 italic">
              Przetworzone
            </p>
            <p className="text-[10px] text-emerald-600 font-bold mt-0.5">
              {stats.done} paragony gotowe do wyczyszczenia
            </p>
          </div>
          <button
            onClick={handleClearDone}
            className="flex-shrink-0 flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-colors"
          >
            <Trash2 size={12} />
            Wyczyść
          </button>
        </div>
      )}
    </div>
  );
}
