/**
 * Data: 2026-05-15
 * Sciezka: /src/modules/expenses/components/ExpenseApprovalCard.tsx
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Receipt, User, Calendar, Tag, FolderOpen,
  DollarSign, Check, X, Clock, CheckCircle, XCircle,
  MessageSquare, ChevronRight,
} from 'lucide-react';

export type ExpenseStatus = 'pending' | 'approved' | 'rejected';

export interface PendingExpense {
  id: string;
  employee: string;
  department: string;
  submittedAt: string;
  category: string;
  project: string;
  amount: number;
  description: string;
  note?: string;
}

interface ExpenseApprovalCardProps {
  expense: PendingExpense;
  onApprove: (id: string, comment: string) => void;
  onReject: (id: string, comment: string) => void;
}

type ConfirmState = 'idle' | 'confirmApprove' | 'confirmReject';

const TIMELINE_STEPS = [
  { label: 'Zlozony', icon: CheckCircle, done: true },
  { label: 'Oczekuje na akceptacje', icon: Clock, done: true },
  { label: 'Decyzja', icon: ChevronRight, done: false },
];

export default function ExpenseApprovalCard({
  expense,
  onApprove,
  onReject,
}: ExpenseApprovalCardProps) {
  const [comment, setComment] = useState('');
  const [confirmState, setConfirmState] = useState<ConfirmState>('idle');

  const handleApprove = () => {
    if (confirmState === 'confirmApprove') {
      onApprove(expense.id, comment);
    } else {
      setConfirmState('confirmApprove');
    }
  };

  const handleReject = () => {
    if (confirmState === 'confirmReject') {
      onReject(expense.id, comment);
    } else {
      setConfirmState('confirmReject');
    }
  };

  const cancelConfirm = () => setConfirmState('idle');

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white rounded-[2rem] border border-slate-100 shadow-lg shadow-slate-100/80 overflow-hidden"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2">

        {/* Lewa kolumna — zdjecie faktury */}
        <div className="bg-slate-50 p-8 flex flex-col items-center justify-center min-h-[260px] border-b lg:border-b-0 lg:border-r border-slate-100">
          <div className="w-full max-w-[280px] aspect-[3/4] bg-slate-100 rounded-2xl flex flex-col items-center justify-center gap-4 border-2 border-dashed border-slate-200">
            <Receipt size={48} className="text-slate-300" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
              Faktura / Paragon
            </span>
          </div>
        </div>

        {/* Prawa kolumna — szczegoly */}
        <div className="p-8 flex flex-col gap-6">

          {/* Pracownik */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <User size={18} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Pracownik</p>
              <p className="text-base font-black text-slate-900 uppercase italic tracking-tighter">
                {expense.employee}
              </p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {expense.department}
              </p>
            </div>
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Calendar size={13} className="text-slate-400" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Data zlozenia</span>
              </div>
              <p className="text-sm font-black text-slate-800">{expense.submittedAt}</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Tag size={13} className="text-slate-400" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Kategoria</span>
              </div>
              <p className="text-sm font-black text-slate-800">{expense.category}</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <FolderOpen size={13} className="text-slate-400" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Projekt / MPK</span>
              </div>
              <p className="text-sm font-black text-slate-800">{expense.project}</p>
            </div>
            <div className="bg-emerald-50 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign size={13} className="text-emerald-600" />
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Kwota</span>
              </div>
              <p className="text-xl font-black text-emerald-700">
                {expense.amount.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN
              </p>
            </div>
          </div>

          {/* Opis */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Opis</p>
            <p className="text-sm font-black text-slate-700">{expense.description}</p>
          </div>

          {/* Timeline */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">Status</p>
            <div className="flex items-center gap-2">
              {TIMELINE_STEPS.map((step, i) => (
                <React.Fragment key={step.label}>
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center ${step.done ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                      <step.icon size={13} className={step.done ? 'text-white' : 'text-slate-400'} />
                    </div>
                    <span className="text-[7px] font-black uppercase tracking-wider text-slate-500 text-center max-w-[60px] leading-tight">
                      {step.label}
                    </span>
                  </div>
                  {i < TIMELINE_STEPS.length - 1 && (
                    <div className="flex-1 h-[2px] bg-slate-200 mb-4" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Komentarz managera */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare size={13} className="text-slate-400" />
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Komentarz managera</p>
            </div>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Opcjonalny komentarz do decyzji..."
              rows={2}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-black text-slate-800 placeholder:text-slate-300 placeholder:font-normal resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 transition-all"
            />
          </div>

          {/* Przyciski akcji */}
          <AnimatePresence mode="wait">
            {confirmState === 'idle' && (
              <motion.div
                key="buttons"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex gap-3"
              >
                <button
                  onClick={handleApprove}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-100"
                >
                  <Check size={14} />
                  Zatwierdz
                </button>
                <button
                  onClick={handleReject}
                  className="flex-1 flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-600 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-rose-100"
                >
                  <X size={14} />
                  Odrzuc
                </button>
              </motion.div>
            )}

            {confirmState === 'confirmApprove' && (
              <motion.div
                key="confirmApprove"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200"
              >
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle size={16} className="text-emerald-600" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                    Potwierdzenie zatwierdzenia
                  </span>
                </div>
                <p className="text-xs text-emerald-700 font-black mb-3">
                  Czy na pewno chcesz zatwierdzic ten wniosek?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleApprove}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                  >
                    Tak, zatwierdz
                  </button>
                  <button
                    onClick={cancelConfirm}
                    className="px-4 bg-white hover:bg-slate-50 text-slate-600 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-slate-200 transition-all"
                  >
                    Anuluj
                  </button>
                </div>
              </motion.div>
            )}

            {confirmState === 'confirmReject' && (
              <motion.div
                key="confirmReject"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-rose-50 rounded-2xl p-4 border border-rose-200"
              >
                <div className="flex items-center gap-2 mb-3">
                  <XCircle size={16} className="text-rose-600" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-rose-700">
                    Potwierdzenie odrzucenia
                  </span>
                </div>
                <p className="text-xs text-rose-700 font-black mb-3">
                  Czy na pewno chcesz odrzucic ten wniosek?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleReject}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                  >
                    Tak, odrzuc
                  </button>
                  <button
                    onClick={cancelConfirm}
                    className="px-4 bg-white hover:bg-slate-50 text-slate-600 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-slate-200 transition-all"
                  >
                    Anuluj
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </motion.div>
  );
}
