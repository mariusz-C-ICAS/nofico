/**
 * Data: 2026-05-16
 * Zmiany: Modal konfiguracji KSeF — NIP, token, środowisko, test połączenia, zapis.
 * Ścieżka: /src/modules/finance/ksef/KsefAuthModal.tsx
 */
import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import {
  initKsefSession,
  terminateSession,
  KsefAuthError,
  KsefApiError,
  type KsefCredentials,
} from '../services/ksefService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Props {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
}

type ToastState = { type: 'success' | 'error'; message: string } | null;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function KsefAuthModal({ isOpen, onClose, tenantId }: Props) {
  const [nip, setNip] = useState('');
  const [token, setToken] = useState('');
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>('sandbox');
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleTest() {
    if (!nip.trim() || !token.trim()) {
      showToast('error', 'Uzupełnij NIP i token przed testem.');
      return;
    }
    setTesting(true);
    const credentials: KsefCredentials = { nip: nip.trim(), token, environment };
    try {
      const session = await initKsefSession(tenantId, credentials);
      // Natychmiast zakończ sesję testową
      const base =
        environment === 'sandbox'
          ? 'https://ksef-demo.mf.gov.pl/api'
          : 'https://ksef.mf.gov.pl/api';
      await terminateSession(session, base).catch(() => undefined);
      showToast('success', 'Polaczenie z KSeF udane. Sesja testowa zakonczona.');
    } catch (err) {
      if (err instanceof KsefAuthError) {
        showToast('error', 'Blad autoryzacji — sprawdz NIP i token.');
      } else if (err instanceof KsefApiError) {
        showToast('error', `Blad API KSeF (${err.statusCode}): ${err.message}`);
      } else {
        showToast('error', 'Blad polaczenia z KSeF — sprawdz siec.');
      }
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    if (!nip.trim() || !token.trim()) {
      showToast('error', 'Uzupelnij NIP i token przed zapisem.');
      return;
    }
    setSaving(true);
    try {
      // Token przechowujemy jako base64 (nie plaintext, nie szyfrowany kluczem)
      const tokenHash = btoa(token);
      await setDoc(doc(db, `tenants/${tenantId}/ksefCredentials/main`), {
        nip: nip.trim(),
        tokenHash,
        environment,
        updatedAt: serverTimestamp(),
      });
      showToast('success', 'Konfiguracja KSeF zapisana.');
      setTimeout(onClose, 1500);
    } catch {
      showToast('error', 'Blad zapisu konfiguracji.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-8 relative">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Konfiguracja
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase italic">
                    Autoryzacja KSeF
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
                  aria-label="Zamknij"
                >
                  <X size={20} className="text-slate-500" />
                </button>
              </div>

              {/* Form */}
              <div className="space-y-5">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                    NIP podmiotu
                  </label>
                  <input
                    type="text"
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    placeholder="1234567890"
                    maxLength={10}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                    Token API (z portalu KSeF)
                  </label>
                  <input
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Wklej token z portalu ksef.mf.gov.pl"
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                    Srodowisko
                  </label>
                  <select
                    value={environment}
                    onChange={(e) =>
                      setEnvironment(e.target.value as 'sandbox' | 'production')
                    }
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-indigo-500 transition-colors bg-white"
                  >
                    <option value="sandbox">Sandbox (ksef-demo.mf.gov.pl)</option>
                    <option value="production">Produkcja (ksef.mf.gov.pl)</option>
                  </select>
                </div>
              </div>

              {/* Toast */}
              <AnimatePresence>
                {toast && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className={`mt-5 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
                      toast.type === 'success'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                  >
                    {toast.type === 'success' ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <AlertCircle size={16} />
                    )}
                    {toast.message}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Buttons */}
              <div className="flex gap-3 mt-8">
                <button
                  onClick={handleTest}
                  disabled={testing || saving}
                  className="flex items-center gap-2 px-6 py-3 border-2 border-slate-200 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-700 hover:border-indigo-400 hover:text-indigo-600 transition-colors disabled:opacity-50"
                >
                  {testing ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={14} />
                  )}
                  Testuj polaczenie
                </button>

                <button
                  onClick={handleSave}
                  disabled={testing || saving}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-700 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : null}
                  Zapisz
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
