/**
 * Data: 2026-05-15
 * Zmiany: Wydzielony wiersz transakcji z TransactionList dla zachowania limitu 500 linii.
 * Ścieżka: /src/modules/finance/psd2/TransactionRow.tsx
 */
import React from 'react';
import {
  ArrowUpRight, ArrowDownLeft, CheckCircle2, AlertCircle, Sparkles, MoreVertical,
} from 'lucide-react';
import { motion } from 'motion/react';
import type { BankTransaction } from '../services/transactionService';

interface CategoryBadgeProps {
  category?: string;
  aiCategory?: string;
}
function CategoryBadge({ category, aiCategory }: CategoryBadgeProps) {
  const label = category ?? aiCategory;
  if (!label) return null;
  const isAI = !category && !!aiCategory;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tight ${
      isAI ? 'bg-violet-50 text-violet-600 border border-violet-100' : 'bg-slate-100 text-slate-600'
    }`}>
      {isAI && <Sparkles size={9} />}
      {label}
    </span>
  );
}

export interface TransactionRowProps {
  tx: BankTransaction;
  onConfirmSuggestion: (tx: BankTransaction) => void;
  onOpenMatchModal: (tx: BankTransaction) => void;
  onUnmatch: (tx: BankTransaction) => void;
  onIgnore: (tx: BankTransaction) => void;
}

export default function TransactionRow({
  tx,
  onConfirmSuggestion,
  onOpenMatchModal,
  onUnmatch,
  onIgnore,
}: TransactionRowProps) {
  return (
    <motion.tr
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      whileHover={{ backgroundColor: 'rgba(248, 250, 252, 0.5)' }}
      className="group transition-colors"
    >
      {/* Date + direction icon */}
      <td className="px-8 py-6">
        <div className="flex items-center gap-4">
          <div className={`p-4 rounded-2xl ${tx.amount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {tx.amount > 0 ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
          </div>
          <div>
            <div className="text-[11px] font-black text-slate-900 italic">{tx.date}</div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              ID: {tx.id?.slice(0, 8)}
            </div>
          </div>
        </div>
      </td>

      {/* Counterpart + title + category badge */}
      <td className="px-8 py-6">
        <div className="max-w-md space-y-1">
          <div className="text-[11px] font-black text-slate-900 uppercase tracking-tight truncate">
            {tx.counterpartName}
          </div>
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tight truncate leading-none italic">
            {tx.title}
          </div>
          <CategoryBadge category={tx.category} aiCategory={tx.aiCategory} />
        </div>
      </td>

      {/* Amount */}
      <td className="px-8 py-6">
        <div className={`text-sm font-black tracking-tighter italic ${tx.amount > 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
          {tx.amount.toLocaleString('pl-PL', { minimumFractionDigits: 2, signDisplay: 'always' })}{' '}
          {tx.currency}
        </div>
      </td>

      {/* Match status cell */}
      <td className="px-8 py-6">
        {tx.status === 'matched' || tx.status === 'manual' ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-3 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl border border-emerald-100 w-fit">
              <CheckCircle2 size={14} />
              <span className="text-[10px] font-black uppercase tracking-tight italic">
                {tx.matchedInvoiceNumber}
              </span>
            </div>
            <button
              onClick={() => onUnmatch(tx)}
              className="text-[9px] font-black text-slate-300 hover:text-rose-500 uppercase transition-colors"
            >
              Cofnij
            </button>
          </div>
        ) : tx.status === 'suggested' ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl border border-indigo-100 w-fit">
              <Sparkles size={14} className="animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-tight italic">
                {tx.matchedInvoiceNumber}
              </span>
              <span className="text-[9px] font-bold bg-indigo-200 px-1.5 rounded">{tx.matchScore}%</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onConfirmSuggestion(tx)}
                className="text-[9px] font-black text-indigo-600 uppercase underline decoration-double"
              >
                Potwierdź
              </button>
              <span className="text-slate-300">|</span>
              <button
                onClick={() => onOpenMatchModal(tx)}
                className="text-[9px] font-black text-slate-400 uppercase underline"
              >
                Szukaj innej
              </button>
            </div>
          </div>
        ) : tx.status === 'ignored' ? (
          <div className="flex items-center gap-3 bg-slate-50 text-slate-300 px-4 py-2 rounded-xl border border-slate-100 w-fit">
            <span className="text-[10px] font-black uppercase tracking-tight italic">Ignorowana</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-3 bg-slate-50 text-slate-400 px-4 py-2 rounded-xl border border-slate-100 w-fit">
              <AlertCircle size={14} />
              <button
                onClick={() => onOpenMatchModal(tx)}
                className="text-[10px] font-black uppercase tracking-tight italic hover:text-indigo-600 transition-colors"
              >
                Połącz z fakturą
              </button>
            </div>
            <button
              onClick={() => onIgnore(tx)}
              className="text-[9px] font-black text-slate-300 hover:text-slate-500 uppercase transition-colors"
            >
              Ignoruj
            </button>
          </div>
        )}
      </td>

      {/* Actions menu */}
      <td className="px-8 py-6 text-right">
        <button className="text-slate-200 hover:text-slate-500 transition-colors">
          <MoreVertical size={20} />
        </button>
      </td>
    </motion.tr>
  );
}
