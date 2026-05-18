/**
 * Data: 2026-05-18
 * Zmiany: Prawdziwy Tink PSD2 PISP flow (popup + Firestore onSnapshot);
 *         fallback do symulacji gdy CF zwróci 503 (Tink nie skonfigurowany).
 * Ścieżka: /src/modules/finance/psd2/PaymentInitiator.tsx
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  CreditCard, ShieldCheck, ArrowRight, Loader2,
  CheckCircle2, Landmark, Smartphone, AlertTriangle, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import { useAuth } from '../../../core/auth/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';

interface PaymentInitiatorProps {
  onClose: () => void;
  onSuccess?: () => void;
  invoice?: {
    id:          string;
    number:      string;
    amount:      number;
    counterpart: string;
    iban:        string;
    currency?:   string;
  };
}

type Step = 'details' | 'authenticating' | 'success' | 'error';

const TINK_FINAL = new Set(['EXECUTED', 'SETTLED', 'PAID']);
const TINK_FAILED = new Set(['FAILED', 'REJECTED', 'EXPIRED', 'CANCELLED']);

export default function PaymentInitiator({ onClose, onSuccess, invoice }: PaymentInitiatorProps) {
  const { user }            = useAuth();
  const { activeTenantId }  = useTenant();

  const [step,    setStep]    = useState<Step>('details');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [simulated, setSimulated] = useState(false);

  const paymentIdRef = useRef<string | null>(null);
  const popupRef     = useRef<Window | null>(null);
  const unsubRef     = useRef<(() => void) | null>(null);

  // ── Cleanup on unmount ────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      unsubRef.current?.();
      popupRef.current?.close();
    };
  }, []);

  // ── Message from popup (payment-callback.html) ────────────────────────────────
  useEffect(() => {
    const handler = (evt: MessageEvent) => {
      if (evt.origin !== window.location.origin) return;
      if (evt.data?.type !== 'TINK_PAYMENT_CALLBACK') return;

      if (evt.data.error) {
        setStep('error');
        setErrorMsg(`Błąd Tink: ${evt.data.error}`);
      }
      // Status will be confirmed via Firestore onSnapshot — just close popup
      popupRef.current?.close();
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // ── Subscribe to Firestore payment doc once we have paymentId ─────────────────
  const subscribeToPayment = (paymentId: string) => {
    if (!activeTenantId) return;
    unsubRef.current?.();

    const ref = doc(db, `tenants/${activeTenantId}/payments/${paymentId}`);
    unsubRef.current = onSnapshot(ref, snap => {
      const status = snap.data()?.status as string | undefined;
      if (!status) return;

      if (TINK_FINAL.has(status)) {
        setStep('success');
        unsubRef.current?.();
      } else if (TINK_FAILED.has(status)) {
        setStep('error');
        setErrorMsg(`Płatność nieudana — status Tink: ${status}`);
        unsubRef.current?.();
      }
    });
  };

  // ── Main payment handler ──────────────────────────────────────────────────────
  const handlePay = async () => {
    if (!user || !activeTenantId || !invoice) return;
    setLoading(true);
    setStep('authenticating');

    try {
      const idToken = await user.getIdToken();

      const res = await fetch('/api/tink/init', {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          tenantId:      activeTenantId,
          invoiceId:     invoice.id,
          invoiceNumber: invoice.number,
          amount:        invoice.amount,
          currency:      invoice.currency ?? 'PLN',
          creditorIban:  invoice.iban,
          creditorName:  invoice.counterpart,
        }),
      });

      const data = await res.json() as {
        paymentId?:        string;
        authorizationUrl?: string;
        simulation?:       boolean;
        error?:            string;
      };

      // ── Fallback: Tink not configured → simulate ───────────────────────────
      if (res.status === 503 || data.simulation) {
        setSimulated(true);
        setLoading(false);
        setStep('success');
        return;
      }

      if (!res.ok || !data.paymentId || !data.authorizationUrl) {
        throw new Error(data.error ?? `Błąd CF: ${res.status}`);
      }

      // ── Real Tink flow ─────────────────────────────────────────────────────
      paymentIdRef.current = data.paymentId;
      subscribeToPayment(data.paymentId);

      const popup = window.open(
        data.authorizationUrl,
        'tink-payment',
        'width=520,height=700,left=400,top=100,resizable=yes',
      );
      popupRef.current = popup;

      if (!popup) {
        throw new Error('Przeglądarka zablokowała popup. Zezwól na wyskakujące okna dla tej strony.');
      }

      setLoading(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStep('error');
      setErrorMsg(msg);
      setLoading(false);
    }
  };

  const fmt = (n: number) => n.toLocaleString('pl-PL', { minimumFractionDigits: 2 });

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[70] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[4rem] p-12 max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden relative"
      >
        <AnimatePresence mode="wait">

          {/* ── Step 1: Details ── */}
          {step === 'details' && (
            <motion.div key="details" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }} className="space-y-8">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter mb-2">Płatność PSD2</h4>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inicjowanie przelewu (PISP via Tink)</p>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-900 p-2"><X size={20} /></button>
              </div>

              <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Do zapłaty</span>
                  <span className="text-3xl font-black text-indigo-600 tracking-tighter italic">
                    {fmt(invoice?.amount ?? 0)} {invoice?.currency ?? 'PLN'}
                  </span>
                </div>
                <div className="space-y-4 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[9px] font-black text-slate-400 uppercase">Kontrahent</span>
                    <span className="font-black text-slate-900 uppercase">{invoice?.counterpart ?? '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[9px] font-black text-slate-400 uppercase">Faktura</span>
                    <span className="font-black text-slate-900 italic">{invoice?.number ?? '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[9px] font-black text-slate-400 uppercase">IBAN Odbiorcy</span>
                    <span className="font-mono font-black text-slate-900 tracking-tight">{invoice?.iban ?? '—'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border-2 border-slate-100 rounded-[2rem] p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
                    <Landmark className="text-slate-400" size={22} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase">Z rachunku</div>
                    <div className="text-sm font-black text-slate-900 uppercase italic">Bank wybierasz w Tink</div>
                  </div>
                </div>
                <ArrowRight size={18} className="text-slate-300" />
              </div>

              <div className="space-y-4">
                <button
                  onClick={handlePay}
                  disabled={loading || !user}
                  className="w-full bg-slate-900 text-white font-black py-6 rounded-2xl text-[11px] uppercase tracking-widest shadow-2xl shadow-slate-100 hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {loading
                    ? <Loader2 size={18} className="animate-spin" />
                    : <Smartphone size={18} />
                  }
                  Autoryzuj i zapłać
                </button>
                <p className="text-[9px] font-black text-slate-400 text-center uppercase tracking-widest flex items-center justify-center gap-2 italic">
                  <ShieldCheck size={12} className="text-emerald-500" /> Bezpieczna transakcja bankowa via Tink PSD2
                </p>
              </div>
            </motion.div>
          )}

          {/* ── Step 2: Authenticating ── */}
          {step === 'authenticating' && (
            <motion.div key="authenticating" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-center">
              <div className="relative w-40 h-40 mb-12">
                <div className="absolute inset-0 border-8 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <div className="absolute inset-4 border-4 border-slate-100 rounded-full flex items-center justify-center">
                  <Smartphone size={48} className="text-slate-200" />
                </div>
              </div>
              {simulated
                ? (
                  <>
                    <h4 className="text-2xl font-black text-slate-900 uppercase italic mb-4">Symulacja płatności</h4>
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest leading-relaxed max-w-xs">
                      Tink nie jest skonfigurowany — symulacja lokalna. Dodaj credentials w Firebase Functions config.
                    </p>
                  </>
                )
                : (
                  <>
                    <h4 className="text-2xl font-black text-slate-900 uppercase italic mb-4">Oczekiwanie na autoryzację...</h4>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-relaxed max-w-xs">
                      Potwierdź przelew w oknie Tink. Masz 180 sekund.
                    </p>
                    <p className="text-[9px] font-bold text-slate-300 mt-3">Status aktualizuje się automatycznie</p>
                  </>
                )
              }
            </motion.div>
          )}

          {/* ── Step 3: Success ── */}
          {step === 'success' && (
            <motion.div key="success" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-40 h-40 bg-emerald-50 rounded-full flex items-center justify-center mb-12 shadow-xl shadow-emerald-100">
                <CheckCircle2 className="text-emerald-500" size={80} strokeWidth={3} />
              </div>
              <h4 className="text-4xl font-black text-slate-900 uppercase italic mb-4">
                {simulated ? 'Płatność (symulacja)' : 'Przelew Wysłany!'}
              </h4>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-relaxed max-w-sm mb-12">
                {simulated
                  ? 'Symulacja zakończona. Skonfiguruj Tink credentials, aby wykonać prawdziwy przelew.'
                  : 'Zlecenie przyjęte przez bank. Status zostanie zaktualizowany po potwierdzeniu (SETTLED).'}
              </p>
              <button
                onClick={() => { onSuccess?.(); onClose(); }}
                className="bg-slate-900 text-white px-12 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl hover:bg-slate-800 transition-all"
              >
                Powrót do faktur
              </button>
            </motion.div>
          )}

          {/* ── Step 4: Error ── */}
          {step === 'error' && (
            <motion.div key="error" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-32 h-32 bg-rose-50 rounded-full flex items-center justify-center mb-10 shadow-xl shadow-rose-100">
                <AlertTriangle className="text-rose-500" size={56} strokeWidth={2.5} />
              </div>
              <h4 className="text-2xl font-black text-slate-900 uppercase italic mb-4">Błąd płatności</h4>
              <p className="text-xs font-bold text-slate-500 mb-10 max-w-sm leading-relaxed">{errorMsg}</p>
              <div className="flex gap-4">
                <button
                  onClick={() => { setStep('details'); setErrorMsg(''); setSimulated(false); }}
                  className="bg-indigo-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all"
                >
                  Spróbuj ponownie
                </button>
                <button
                  onClick={onClose}
                  className="bg-slate-100 text-slate-700 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Anuluj
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  );
}
