/**
 * Data: 2026-05-16
 * Zmiany: Modal postępu długotrwałych operacji workflow.
 * Sciezka: /src/modules/finance/components/WorkflowProgressModal.tsx
 */
import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  X,
} from 'lucide-react';
import {
  Workflow,
  WorkflowStep,
  WorkflowStatus,
  subscribeToWorkflow,
} from '../services/workflowEngine';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  workflowId: string;
  tenantId: string;
  isOpen: boolean;
  onClose: () => void;
  onCompleted?: (workflow: Workflow) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<WorkflowStatus, { label: string; className: string }> = {
  pending: { label: 'Oczekuje', className: 'bg-slate-100 text-slate-500' },
  running: { label: 'W toku', className: 'bg-indigo-50 text-indigo-600' },
  completed: { label: 'Ukonczone', className: 'bg-emerald-50 text-emerald-600' },
  failed: { label: 'Blad', className: 'bg-rose-50 text-rose-600' },
  retrying: { label: 'Ponawia', className: 'bg-amber-50 text-amber-600' },
};

const WORKFLOW_TYPE_LABELS: Record<Workflow['type'], string> = {
  ksef_batch_send: 'Wysylka KSeF',
  jpk_generate: 'Generowanie JPK',
  ml_insights_refresh: 'Odswiezanie ML',
  gus_batch_lookup: 'Wyszukiwanie GUS',
};

function StepIcon({ status }: { status: WorkflowStatus }) {
  switch (status) {
    case 'pending':
      return <Clock size={14} className="text-slate-400" />;
    case 'running':
      return <Loader2 size={14} className="animate-spin text-indigo-500" />;
    case 'completed':
      return <CheckCircle2 size={14} className="text-emerald-500" />;
    case 'failed':
      return <XCircle size={14} className="text-rose-500" />;
    case 'retrying':
      return <RefreshCw size={14} className="animate-spin text-amber-500" />;
    default:
      return <Clock size={14} className="text-slate-400" />;
  }
}

function stepRowBg(status: WorkflowStatus): string {
  switch (status) {
    case 'completed': return 'bg-emerald-50/60';
    case 'running': return 'bg-indigo-50/60';
    case 'failed': return 'bg-rose-50/60';
    case 'retrying': return 'bg-amber-50/60';
    default: return 'bg-slate-50';
  }
}

// ─── Step Row ─────────────────────────────────────────────────────────────────

function StepRow({ step }: { step: WorkflowStep }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl ${stepRowBg(step.status)}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <StepIcon status={step.status} />
        <span className="text-xs font-bold text-slate-700 truncate">{step.name}</span>
        {step.retryCount > 0 && (
          <span className="text-[10px] text-amber-500 font-black">
            ({step.retryCount}x)
          </span>
        )}
      </div>
      <AnimatePresence mode="wait">
        <motion.span
          key={step.status}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className={`shrink-0 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${STATUS_BADGE[step.status].className}`}
        >
          {STATUS_BADGE[step.status].label}
        </motion.span>
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WorkflowProgressModal({
  workflowId,
  tenantId,
  isOpen,
  onClose,
  onCompleted,
}: Props) {
  const [workflow, setWorkflow] = React.useState<Workflow | null>(null);
  const autoCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOpen || !workflowId || !tenantId) return;
    const unsub = subscribeToWorkflow(tenantId, workflowId, w => {
      setWorkflow(w);
      if (w.status === 'completed') {
        onCompleted?.(w);
        autoCloseRef.current = setTimeout(onClose, 3000);
      }
    });
    return () => {
      unsub();
      if (autoCloseRef.current) clearTimeout(autoCloseRef.current);
    };
  }, [isOpen, workflowId, tenantId, onClose, onCompleted]);

  const isRunning = workflow?.status === 'running' || workflow?.status === 'pending';

  const progress =
    workflow && workflow.totalItems && workflow.totalItems > 0
      ? Math.round(((workflow.processedItems ?? 0) / workflow.totalItems) * 100)
      : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={e => {
            if (e.target === e.currentTarget && !isRunning) onClose();
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-[2.5rem] p-10 w-full max-w-lg shadow-2xl border border-slate-100"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
              <div className="min-w-0">
                <h3 className="text-xl font-black uppercase tracking-widest italic text-slate-900 leading-tight">
                  {workflow ? WORKFLOW_TYPE_LABELS[workflow.type] : 'Workflow'}
                </h3>
                {workflow && (
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={workflow.status}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className={`inline-block mt-2 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${STATUS_BADGE[workflow.status].className}`}
                    >
                      {STATUS_BADGE[workflow.status].label}
                    </motion.span>
                  </AnimatePresence>
                )}
              </div>
              <button
                onClick={onClose}
                disabled={isRunning}
                className="p-2 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <X size={18} className="text-slate-400" />
              </button>
            </div>

            {/* Progress bar */}
            {progress !== null && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Postep
                  </span>
                  <span className="text-[10px] font-black text-slate-600">
                    {workflow?.processedItems ?? 0} / {workflow?.totalItems ?? 0}
                  </span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-indigo-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ type: 'spring', damping: 20 }}
                  />
                </div>
              </div>
            )}

            {/* Steps list */}
            {workflow && workflow.steps.length > 0 && (
              <div className="flex flex-col gap-2 mb-8">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  Kroki
                </p>
                {workflow.steps.map(step => (
                  <StepRow key={step.stepId} step={step} />
                ))}
              </div>
            )}

            {/* No workflow yet */}
            {!workflow && (
              <div className="flex items-center justify-center py-12 text-slate-300">
                <Loader2 size={28} className="animate-spin" />
              </div>
            )}

            {/* Auto-close hint */}
            {workflow?.status === 'completed' && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-[10px] font-bold text-slate-400 mb-4"
              >
                Zamkniecie za 3 sekundy...
              </motion.p>
            )}

            {/* Close button */}
            <button
              onClick={onClose}
              disabled={isRunning}
              className="w-full py-4 rounded-2xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Zamknij
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
