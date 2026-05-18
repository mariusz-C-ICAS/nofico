/**
 * Data: 2026-05-15
 * Autor: Agent AI
 * Opis: Swipe & Match — Tinder-like kwalifikacja wydatków (firmowe vs prywatne).
 *       Stack kart 3D, animacja swipe, skróty klawiaturowe, progress bar, panel boczny.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  CreditCard, ThumbsUp, ThumbsDown,
  ChevronLeft, ChevronRight, Sparkles,
} from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { useTenant } from '../../../shared/hooks/useTenant';

// --- TYPES ---
type Category = 'firmowe' | 'prywatne' | null;

interface Transaction {
  id: string;
  date: string;
  amount: number;
  vendor: string;
  description: string;
  aiCategory: 'firmowe' | 'prywatne';
  aiConfidence: number;
  hasInvoice: boolean;
  ksefId?: string;
}

interface ProcessedTransaction extends Transaction {
  decision: 'firmowe' | 'prywatne';
}

// --- AI SUGGESTION CHIP ---
function AiChip({ category, confidence }: { category: 'firmowe' | 'prywatne'; confidence: number }) {
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase italic tracking-tighter ${
      category === 'firmowe'
        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
    }`}>
      <Sparkles className="w-3 h-3" />
      AI: {category} {confidence}%
    </div>
  );
}

// --- TRANSACTION CARD ---
interface CardProps {
  transaction: Transaction;
  index: number;
  total: number;
  dragX: number;
  isDragging: boolean;
  onDragEnd: (direction: 'left' | 'right') => void;
}

function TransactionCard({ transaction, index, total, dragX, isDragging, onDragEnd }: CardProps) {
  const isTop = index === 0;
  const scale = 1 - index * 0.04;
  const yOffset = index * 10;
  const opacity = 1 - index * 0.15;

  const swipeHint = isDragging && isTop
    ? dragX > 60
      ? 'right'
      : dragX < -60
        ? 'left'
        : null
    : null;

  return (
    <motion.div
      className="absolute w-full"
      style={{ zIndex: total - index }}
      initial={{ scale, y: yOffset, opacity }}
      animate={{ scale, y: yOffset, opacity }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className={`bg-slate-900 rounded-[2.5rem] p-6 border-2 transition-colors duration-150 ${
        isTop && swipeHint === 'right'
          ? 'border-emerald-500/60'
          : isTop && swipeHint === 'left'
            ? 'border-rose-500/60'
            : 'border-slate-800'
      }`}>
        {/* SWIPE HINT BADGE */}
        <AnimatePresence>
          {isTop && swipeHint && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={`absolute top-6 ${swipeHint === 'right' ? 'right-6' : 'left-6'} px-4 py-2 rounded-2xl font-black uppercase italic tracking-tighter text-sm border-2 ${
                swipeHint === 'right'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                  : 'bg-rose-500/20 border-rose-500 text-rose-400'
              }`}
            >
              {swipeHint === 'right' ? 'Firmowe' : 'Prywatne'}
            </motion.div>
          )}
        </AnimatePresence>

        {/* HEADER */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-[1rem] bg-slate-800 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <p className="font-black uppercase italic tracking-tighter text-lg leading-tight">
                {transaction.vendor}
              </p>
              <p className="text-xs text-slate-500">{transaction.date}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-black text-2xl tracking-tighter">
              {transaction.amount.toFixed(2)}
              <span className="text-sm text-slate-400 ml-1">PLN</span>
            </p>
          </div>
        </div>

        {/* DESCRIPTION */}
        <p className="text-sm text-slate-400 mb-4">{transaction.description}</p>

        {/* KSEF INVOICE */}
        {transaction.hasInvoice && (
          <div className="bg-slate-800 rounded-2xl p-3 mb-4 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-xs font-black uppercase italic tracking-tighter text-emerald-400">
              Faktura KSeF
            </span>
            <span className="text-xs text-slate-500 ml-auto">{transaction.ksefId}</span>
          </div>
        )}

        {/* AI SUGGESTION */}
        <AiChip category={transaction.aiCategory} confidence={transaction.aiConfidence} />
      </div>
    </motion.div>
  );
}

// --- MAIN MODULE ---
export default function SwipeMatchModule() {
  const { activeTenantId } = useTenant();
  const pendingRef = useRef<{ card: Transaction; decision: 'firmowe' | 'prywatne' } | null>(null);
  const [queue, setQueue] = useState<Transaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [processed, setProcessed] = useState<ProcessedTransaction[]>([]);
  const [animating, setAnimating] = useState<{ direction: 'left' | 'right' } | null>(null);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);

  useEffect(() => {
    if (!activeTenantId) return;
    (async () => {
      const snap = await getDocs(collection(db, `tenants/${activeTenantId}/bankTransactions`));
      const txs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Transaction));
      setQueue(txs);
      setTotalCount(txs.length);
    })();
  }, [activeTenantId]);

  const progress = totalCount > 0 ? ((totalCount - queue.length) / totalCount) * 100 : 0;

  const decide = useCallback((direction: 'left' | 'right') => {
    if (queue.length === 0 || animating) return;
    const current = queue[0];
    const decision: 'firmowe' | 'prywatne' = direction === 'right' ? 'firmowe' : 'prywatne';
    pendingRef.current = { card: current, decision };
    setAnimating({ direction });
  }, [queue, animating]);

  // KEYBOARD SHORTCUTS
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') decide('left');
      if (e.key === 'ArrowRight') decide('right');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [decide]);

  // DRAG HANDLERS
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setDragX(e.clientX - dragStartX);
  }, [isDragging, dragStartX]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    if (Math.abs(dragX) > 80) {
      decide(dragX > 0 ? 'right' : 'left');
    } else {
      setDragX(0);
    }
  }, [isDragging, dragX, decide]);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      {/* HEADER */}
      <div className="bg-slate-900 rounded-[3rem] px-8 py-5 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-violet-600/20 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="font-black uppercase italic tracking-tighter text-lg">
              Swipe & Match
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              Kwalifikacja wydatkow — firmowe vs prywatne
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <ChevronLeft className="w-4 h-4" />
          <span className="font-black uppercase italic tracking-tighter">Prywatne</span>
          <span className="text-slate-600">|</span>
          <span className="font-black uppercase italic tracking-tighter">Firmowe</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>

      {/* PROGRESS */}
      <div className="bg-slate-900 rounded-[2rem] px-6 py-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-black uppercase italic tracking-tighter text-slate-400">
            Postep kwalifikacji
          </span>
          <span className="text-xs font-black text-violet-400">
            {totalCount - queue.length} / {totalCount}
          </span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-violet-500 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ type: 'spring', stiffness: 200 }}
          />
        </div>
      </div>

      <div className="flex gap-6">
        {/* CARD AREA */}
        <div className="flex-1 flex flex-col items-center">
          {/* CARD STACK */}
          <div
            className="relative w-full max-w-md"
            style={{ height: '340px' }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <AnimatePresence>
              {queue.length > 0 ? (
                queue.slice(0, 5).map((tx, index) =>
                  index === 0 && animating ? (
                    <motion.div
                      key={tx.id}
                      className="absolute w-full"
                      style={{ zIndex: 100 }}
                      animate={{
                        x: animating.direction === 'right' ? 400 : -400,
                        rotate: animating.direction === 'right' ? 20 : -20,
                        opacity: 0,
                      }}
                      transition={{ duration: 0.35, ease: 'easeOut' }}
                      onAnimationComplete={() => {
                        const pending = pendingRef.current;
                        if (!pending) return;
                        pendingRef.current = null;
                        if (activeTenantId) {
                          updateDoc(doc(db, `tenants/${activeTenantId}/bankTransactions`, pending.card.id), { decision: pending.decision });
                        }
                        setProcessed(prev => [...prev, { ...pending.card, decision: pending.decision }]);
                        setQueue(prev => prev.slice(1));
                        setAnimating(null);
                        setDragX(0);
                      }}
                    >
                      <TransactionCard
                        transaction={tx}
                        index={0}
                        total={Math.min(queue.length, 5)}
                        dragX={dragX}
                        isDragging={isDragging}
                        onDragEnd={decide}
                      />
                    </motion.div>
                  ) : index === 0 ? (
                    <motion.div
                      key={tx.id}
                      className="absolute w-full cursor-grab active:cursor-grabbing"
                      style={{ zIndex: 100, x: dragX, rotate: dragX * 0.08 }}
                      onMouseDown={handleMouseDown}
                    >
                      <TransactionCard
                        transaction={tx}
                        index={0}
                        total={Math.min(queue.length, 5)}
                        dragX={dragX}
                        isDragging={isDragging}
                        onDragEnd={decide}
                      />
                    </motion.div>
                  ) : (
                    <TransactionCard
                      key={tx.id}
                      transaction={tx}
                      index={index}
                      total={Math.min(queue.length, 5)}
                      dragX={0}
                      isDragging={false}
                      onDragEnd={decide}
                    />
                  )
                )
              ) : (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 rounded-[2.5rem] border-2 border-slate-800"
                >
                  <ThumbsUp className="w-12 h-12 text-emerald-400 mb-4" />
                  <p className="font-black uppercase italic tracking-tighter text-xl">
                    Wszystko przejrzane!
                  </p>
                  <p className="text-slate-400 text-sm mt-1">
                    {processed.length} transakcji zakwalifikowanych
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ACTION BUTTONS */}
          {queue.length > 0 && (
            <div className="flex items-center gap-6 mt-8">
              <button
                onClick={() => decide('left')}
                className="group flex flex-col items-center gap-2"
              >
                <div className="w-16 h-16 rounded-[1.5rem] bg-rose-500/20 hover:bg-rose-500/30 border-2 border-rose-500/40 hover:border-rose-400 flex items-center justify-center transition-all">
                  <ThumbsDown className="w-7 h-7 text-rose-400 group-hover:scale-110 transition-transform" />
                </div>
                <span className="text-xs font-black uppercase italic tracking-tighter text-rose-400">
                  Prywatne
                </span>
              </button>

              <div className="text-center">
                <p className="text-xs text-slate-600 font-black uppercase italic tracking-tighter">
                  lub
                </p>
                <p className="text-[10px] text-slate-600 mt-1">← → klawiatura</p>
              </div>

              <button
                onClick={() => decide('right')}
                className="group flex flex-col items-center gap-2"
              >
                <div className="w-16 h-16 rounded-[1.5rem] bg-emerald-500/20 hover:bg-emerald-500/30 border-2 border-emerald-500/40 hover:border-emerald-400 flex items-center justify-center transition-all">
                  <ThumbsUp className="w-7 h-7 text-emerald-400 group-hover:scale-110 transition-transform" />
                </div>
                <span className="text-xs font-black uppercase italic tracking-tighter text-emerald-400">
                  Firmowe
                </span>
              </button>
            </div>
          )}
        </div>

        {/* SIDEBAR — PROCESSED */}
        <div className="w-72 flex flex-col gap-3">
          <div className="bg-slate-900 rounded-[2rem] px-5 py-4">
            <p className="font-black uppercase italic tracking-tighter text-sm text-slate-300 mb-3">
              Przetworzone ({processed.length})
            </p>

            {processed.length === 0 ? (
              <div className="text-center py-8 text-slate-600 text-sm">
                Brak przegladniętych
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1">
                <AnimatePresence>
                  {[...processed].reverse().map(tx => (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-slate-800 rounded-xl p-3 flex items-start gap-3"
                    >
                      <div className={`w-1.5 h-full min-h-[2rem] rounded-full mt-0.5 ${
                        tx.decision === 'firmowe' ? 'bg-emerald-400' : 'bg-rose-400'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-black uppercase italic tracking-tighter truncate">
                            {tx.vendor}
                          </span>
                          <span className={`text-[9px] font-black uppercase italic tracking-tighter px-1.5 py-0.5 rounded-lg shrink-0 ${
                            tx.decision === 'firmowe'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}>
                            {tx.decision}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-[10px] text-slate-500">{tx.date}</span>
                          <span className="text-xs font-bold text-slate-300">
                            {tx.amount.toFixed(0)} PLN
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* STATS */}
          {processed.length > 0 && (
            <div className="bg-slate-900 rounded-[2rem] px-5 py-4">
              <p className="font-black uppercase italic tracking-tighter text-sm text-slate-300 mb-3">
                Podsumowanie
              </p>
              <div className="flex flex-col gap-2">
                {(['firmowe', 'prywatne'] as const).map(cat => {
                  const items = processed.filter(p => p.decision === cat);
                  const total = items.reduce((s, p) => s + p.amount, 0);
                  return (
                    <div key={cat} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${cat === 'firmowe' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                        <span className="text-xs font-black uppercase italic tracking-tighter text-slate-400">
                          {cat} ({items.length})
                        </span>
                      </div>
                      <span className={`text-xs font-black ${cat === 'firmowe' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {total.toFixed(0)} PLN
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
