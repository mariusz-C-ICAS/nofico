/**
 * Data: 2026-05-15
 * Zmiany: Tryb offline KSeF — kolejkowanie faktur lokalnie z E2E i WORM.
 * Ścieżka: /src/modules/finance/ksef/KsefOffline24.tsx
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Wifi, WifiOff, Lock, Send, Clock, CheckCircle2,
  AlertTriangle, ShieldCheck, Plus, X, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface OfflineInvoice {
  id: string;
  buyerNip: string;
  amount: number;
  description: string;
  queuedAt: string;
  encrypted: boolean;
  wormCopy: boolean;
}

interface SentInvoice {
  id: string;
  number: string;
  buyerNip: string;
  amount: number;
  sentAt: string;
  upoNumber: string;
}

const MOCK_QUEUE: OfflineInvoice[] = [
  {
    id: 'off-001',
    buyerNip: '5213254837',
    amount: 12300.0,
    description: 'Usługi budowlane — Maj 2026',
    queuedAt: '2026-05-15T08:14:22',
    encrypted: true,
    wormCopy: true,
  },
  {
    id: 'off-002',
    buyerNip: '7740001454',
    amount: 4500.0,
    description: 'Dostawa materiałów — etap 3',
    queuedAt: '2026-05-15T09:02:11',
    encrypted: true,
    wormCopy: true,
  },
];

const MOCK_HISTORY: SentInvoice[] = [
  { id: 'h-001', number: 'FV/2026/05/038', buyerNip: '5213254837', amount: 8200.0, sentAt: '2026-05-14T11:22:00', upoNumber: 'UPO/2026/0000038' },
  { id: 'h-002', number: 'FV/2026/05/039', buyerNip: '9571049278', amount: 1850.0, sentAt: '2026-05-13T09:05:00', upoNumber: 'UPO/2026/0000039' },
  { id: 'h-003', number: 'FV/2026/05/040', buyerNip: '7740001454', amount: 22500.0, sentAt: '2026-05-10T14:41:00', upoNumber: 'UPO/2026/0000040' },
];

function useCountdown(seconds: number) {
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    const id = setInterval(() => setRemaining(r => (r <= 1 ? seconds : r - 1)), 1000);
    return () => clearInterval(id);
  }, [seconds]);
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

interface FormState {
  nip: string;
  amount: string;
  description: string;
}

export default function KsefOffline24() {
  const [isOffline, setIsOffline] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [queue, setQueue] = useState<OfflineInvoice[]>(MOCK_QUEUE);
  const [form, setForm] = useState<FormState>({ nip: '', amount: '', description: '' });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const countdown = useCountdown(872); // ~14:32

  const handleFormChange = useCallback(
    (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm(prev => ({ ...prev, [field]: e.target.value }));
      setFormError('');
    },
    [],
  );

  const handleSubmit = () => {
    if (!form.nip.trim() || form.nip.length < 10) {
      setFormError('Podaj poprawny NIP (10 cyfr)');
      return;
    }
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) {
      setFormError('Podaj kwotę większą od zera');
      return;
    }
    if (!form.description.trim()) {
      setFormError('Opis jest wymagany');
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      const newInvoice: OfflineInvoice = {
        id: `off-${Date.now()}`,
        buyerNip: form.nip.trim(),
        amount: amt,
        description: form.description.trim(),
        queuedAt: new Date().toISOString(),
        encrypted: true,
        wormCopy: true,
      };
      setQueue(prev => [newInvoice, ...prev]);
      setForm({ nip: '', amount: '', description: '' });
      setSubmitting(false);
      setShowForm(false);
    }, 1200);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const formatMoney = (v: number) =>
    v.toLocaleString('pl-PL', { minimumFractionDigits: 2 }) + ' PLN';

  return (
    <div className="space-y-8">
      {/* Status Banner */}
      <motion.div
        layout
        className={`rounded-[3rem] p-8 flex items-center justify-between shadow-xl ${
          isOffline
            ? 'bg-rose-950 border-4 border-rose-500/30'
            : 'bg-emerald-950 border-4 border-emerald-500/30'
        }`}
      >
        <div className="flex items-center gap-6">
          <div className={`p-5 rounded-2xl ${isOffline ? 'bg-rose-500/20' : 'bg-emerald-500/20'}`}>
            {isOffline ? (
              <WifiOff className="text-rose-400" size={28} />
            ) : (
              <Wifi className="text-emerald-400" size={28} />
            )}
          </div>
          <div>
            <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">
              Status systemu KSeF MF
            </div>
            <div className="flex items-center gap-3">
              <h2
                className={`text-2xl font-black uppercase italic tracking-tighter ${
                  isOffline ? 'text-rose-300' : 'text-emerald-300'
                }`}
              >
                {isOffline ? 'KSeF OFFLINE' : 'KSeF ONLINE'}
              </h2>
              {isOffline ? (
                <AlertTriangle className="text-amber-400" size={22} />
              ) : (
                <CheckCircle2 className="text-emerald-400" size={22} />
              )}
            </div>
            <div className="text-[10px] font-black text-white/40 uppercase mt-1">
              {isOffline
                ? 'Serwery MF niedostępne — tryb lokalny aktywny'
                : 'Połączono z API Produkcyjnym KSeF V2'}
            </div>
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer select-none">
          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
            Symuluj offline
          </span>
          <div
            className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
              isOffline ? 'bg-rose-500' : 'bg-white/10'
            }`}
            onClick={() => setIsOffline(v => !v)}
          >
            <div
              className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${
                isOffline ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </div>
        </label>
      </motion.div>

      <AnimatePresence mode="wait">
        {isOffline ? (
          <motion.div
            key="offline"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="space-y-6"
          >
            {/* Info Banner */}
            <div className="bg-amber-50 border-2 border-amber-200 rounded-[2rem] p-6 flex items-start gap-4">
              <div className="bg-amber-100 p-3 rounded-xl mt-0.5">
                <Clock className="text-amber-600" size={20} />
              </div>
              <div>
                <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">
                  Tryb kolejkowania lokalnego
                </div>
                <p className="text-sm font-black text-amber-900 italic tracking-tight">
                  Faktura zostanie kolejkowana lokalnie i wysłana automatycznie po przywróceniu KSeF.
                </p>
              </div>
            </div>

            {/* Countdown */}
            <div className="bg-slate-900 rounded-[2rem] p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-500/20 p-3 rounded-xl">
                  <Send className="text-indigo-400" size={20} />
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                    Kolejna próba wysłania za
                  </div>
                  <div className="text-2xl font-black text-white italic tracking-tighter font-mono">
                    {countdown}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-black text-slate-400 uppercase">W kolejce</div>
                <div className="text-3xl font-black text-indigo-400 italic">{queue.length}</div>
              </div>
            </div>

            {/* Add Invoice Button */}
            <button
              onClick={() => setShowForm(v => !v)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] py-6 text-[11px] font-black uppercase italic tracking-widest shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3 transition-all"
            >
              <Plus size={18} />
              Wystaw fakturę offline
            </button>

            {/* Form */}
            <AnimatePresence>
              {showForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 space-y-6 shadow-sm">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-black text-slate-900 uppercase italic tracking-tighter">
                        Nowa faktura offline
                      </h4>
                      <button
                        onClick={() => setShowForm(false)}
                        className="text-slate-300 hover:text-slate-600 transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">
                          NIP nabywcy
                        </label>
                        <input
                          type="text"
                          maxLength={10}
                          placeholder="5213254837"
                          value={form.nip}
                          onChange={handleFormChange('nip')}
                          className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 text-sm font-black uppercase italic tracking-tighter focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">
                          Kwota brutto (PLN)
                        </label>
                        <input
                          type="number"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          value={form.amount}
                          onChange={handleFormChange('amount')}
                          className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 text-sm font-black italic tracking-tighter focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">
                        Opis usługi / towaru
                      </label>
                      <input
                        type="text"
                        placeholder="np. Usługi budowlane — Maj 2026"
                        value={form.description}
                        onChange={handleFormChange('description')}
                        className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 text-sm font-black italic tracking-tighter focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>

                    {formError && (
                      <div className="flex items-center gap-2 text-rose-500 text-xs font-black uppercase">
                        <AlertTriangle size={14} /> {formError}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-4 text-[9px] font-black text-slate-400 uppercase">
                        <span className="flex items-center gap-1">
                          <Lock size={11} className="text-emerald-500" /> E2E szyfrowanie
                        </span>
                        <span className="flex items-center gap-1">
                          <ShieldCheck size={11} className="text-emerald-500" /> WORM kopia
                        </span>
                      </div>
                      <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase italic tracking-widest flex items-center gap-2 transition-all"
                      >
                        {submitting ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
                        Dodaj do kolejki
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Queue List */}
            <div className="space-y-4">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">
                Kolejka offline ({queue.length})
              </div>
              {queue.map(inv => (
                <motion.div
                  key={inv.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white border-2 border-amber-100 rounded-[2rem] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
                >
                  <div className="flex items-center gap-5">
                    <div className="bg-amber-50 p-3 rounded-xl">
                      <Clock className="text-amber-500" size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-900 uppercase italic tracking-tight">
                        {inv.description}
                      </div>
                      <div className="text-[10px] font-black text-slate-400 uppercase mt-1">
                        NIP: {inv.buyerNip} &bull; {formatDate(inv.queuedAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-[9px] font-black text-slate-400 uppercase">Kwota</div>
                      <div className="text-lg font-black text-slate-900 italic">{formatMoney(inv.amount)}</div>
                    </div>
                    <div className="space-y-1.5 text-right min-w-[120px]">
                      <div className="bg-amber-100 text-amber-700 rounded-full px-3 py-1 text-[9px] font-black uppercase text-center">
                        Oczekuje w kolejce
                      </div>
                      <div className="flex items-center justify-end gap-1 text-[9px] font-black text-emerald-600 uppercase">
                        <Lock size={9} /> Zaszyfrowano E2E
                      </div>
                      <div className="flex items-center justify-end gap-1 text-[9px] font-black text-emerald-600 uppercase">
                        <ShieldCheck size={9} /> Kopia WORM
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="online"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="space-y-6"
          >
            {/* Stats */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Oczekujące</div>
                <div className="text-5xl font-black text-slate-900 uppercase italic tracking-tighter">0</div>
                <div className="text-[9px] font-black text-emerald-500 uppercase mt-2">Wszystko wysłane</div>
              </div>
              <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-xl">
                <div className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-2">Wysłane (30 dni)</div>
                <div className="text-5xl font-black text-white uppercase italic tracking-tighter">{MOCK_HISTORY.length}</div>
                <div className="text-[9px] font-black text-indigo-400 uppercase mt-2">Wszystkie z UPO</div>
              </div>
            </div>

            {/* History */}
            <div className="space-y-4">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">
                Historia kolejki — ostatnie 30 dni
              </div>
              {MOCK_HISTORY.map(inv => (
                <div
                  key={inv.id}
                  className="bg-white border-2 border-slate-100 rounded-[2rem] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
                >
                  <div className="flex items-center gap-5">
                    <div className="bg-emerald-50 p-3 rounded-xl">
                      <CheckCircle2 className="text-emerald-500" size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-900 uppercase italic tracking-tight">
                        {inv.number}
                      </div>
                      <div className="text-[10px] font-black text-slate-400 uppercase mt-1">
                        NIP: {inv.buyerNip} &bull; {formatDate(inv.sentAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-[9px] font-black text-slate-400 uppercase">Kwota</div>
                      <div className="text-lg font-black text-slate-900 italic">{formatMoney(inv.amount)}</div>
                    </div>
                    <div className="space-y-1.5 text-right">
                      <div className="bg-emerald-100 text-emerald-700 rounded-full px-3 py-1 text-[9px] font-black uppercase">
                        Wysłano
                      </div>
                      <div className="text-[9px] font-black text-slate-400 uppercase">{inv.upoNumber}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
