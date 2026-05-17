import React, { useState } from 'react';
import {
  CheckCircle2, XCircle, RotateCcw, ChevronDown, User,
  Calendar, Hash, Banknote, AlertTriangle, UserCheck, ImageIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { DocumentInstance } from '../types';
import { STATUS_LABELS, STATUS_COLORS, DOC_TYPE_LABELS } from '../types';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import { transitionDocument } from '../services/workflowEngine';
import { dispatchNotification, NOTIF_MESSAGES } from '../services/notificationService';

interface Props {
  document: DocumentInstance;
  actorId: string;
  actorEmail: string;
  actorRole?: string;
  onActionComplete: () => void;
}

type PanelAction = 'approve' | 'reject' | 'request_changes' | null;

export default function ApprovalPanel({
  document: docInstance,
  actorId,
  actorEmail,
  actorRole,
  onActionComplete,
}: Props) {
  const [activeAction, setActiveAction] = useState<PanelAction>(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDelegated, setIsDelegated] = useState(false);
  const [delegatedFor, setDelegatedFor] = useState('');
  const [delegatedForEmail, setDelegatedForEmail] = useState('');

  const handleAction = async () => {
    if (!activeAction) return;
    if (activeAction !== 'approve' && !note.trim()) {
      setError('Dodaj notatkę wyjaśniającą powód.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const delegationNote = isDelegated && delegatedFor
        ? `[Zatwierdzono w zastępstwie za ${delegatedFor}${delegatedForEmail ? ` (${delegatedForEmail})` : ''}] ${note.trim()}`
        : note.trim() || undefined;

      if (activeAction === 'approve') {
        await transitionDocument(
          docInstance.tenantId,
          docInstance.id,
          'APPROVE',
          actorId,
          actorEmail,
          'APPROVED',
          {
            note: delegationNote,
            actorRole: isDelegated ? `${actorRole ?? 'approver'} (zastępstwo)` : actorRole,
            stepType: 'APPROVAL',
          }
        );
        await dispatchNotification({
          tenantId: docInstance.tenantId,
          recipientId: docInstance.submittedBy,
          documentInstanceId: docInstance.id,
          documentTitle: docInstance.metadata.title,
          type: 'DOCUMENT_APPROVED',
          message: NOTIF_MESSAGES.DOCUMENT_APPROVED!(docInstance.metadata.title),
        });
        // Cross-module integration hooks — fire-and-forget
        const { tenantId, type: docType } = docInstance;
        const meta = docInstance.metadata;
        const baseFields = { documentId: docInstance.id, approvedBy: actorId, approvedAt: serverTimestamp(), title: meta.title };
        const hooks: Partial<Record<string, () => Promise<unknown>>> = {
          OUT_OF_POCKET: () => addDoc(collection(db, `tenants/${tenantId}/expenseSettlements`), { ...baseFields, submittedBy: docInstance.submittedBy, amount: meta.amount ?? 0, currency: meta.currency ?? 'PLN' }),
          TRAVEL_EXPENSE: () => addDoc(collection(db, `tenants/${tenantId}/expenseSettlements`), { ...baseFields, submittedBy: docInstance.submittedBy, amount: meta.amount ?? 0, currency: meta.currency ?? 'PLN' }),
          EXPENSE_ADVANCE: () => addDoc(collection(db, `tenants/${tenantId}/expenseSettlements`), { ...baseFields, submittedBy: docInstance.submittedBy, amount: meta.amount ?? 0, currency: meta.currency ?? 'PLN' }),
          LEAVE_REQUEST: () => addDoc(collection(db, `tenants/${tenantId}/leaveBalanceAdjustments`), { ...baseFields, employeeId: docInstance.submittedBy }),
          VENDOR_INVOICE: () => addDoc(collection(db, `tenants/${tenantId}/glEntries`), { ...baseFields, type: 'VENDOR_INVOICE', vendor: meta.vendor ?? '', amount: meta.amount ?? 0, currency: meta.currency ?? 'PLN' }),
          CREDIT_NOTE: () => addDoc(collection(db, `tenants/${tenantId}/glEntries`), { ...baseFields, type: 'CREDIT_NOTE', vendor: meta.vendor ?? '', amount: meta.amount ?? 0, currency: meta.currency ?? 'PLN' }),
          SALES_ORDER: () => addDoc(collection(db, `tenants/${tenantId}/invoiceDrafts`), { ...baseFields, customer: meta.vendor ?? '', amount: meta.amount ?? 0, currency: meta.currency ?? 'PLN' }),
          BUDGET_REQUEST: () => addDoc(collection(db, `tenants/${tenantId}/approvedBudgets`), { ...baseFields, requestedBy: docInstance.submittedBy, amount: meta.amount ?? 0, currency: meta.currency ?? 'PLN' }),
        };
        hooks[docType]?.().catch(() => {});
      } else if (activeAction === 'reject') {
        await transitionDocument(
          docInstance.tenantId,
          docInstance.id,
          'REJECT',
          actorId,
          actorEmail,
          'REJECTED',
          { note: delegationNote ?? note.trim(), actorRole, stepType: 'APPROVAL' }
        );
        await dispatchNotification({
          tenantId: docInstance.tenantId,
          recipientId: docInstance.submittedBy,
          documentInstanceId: docInstance.id,
          documentTitle: docInstance.metadata.title,
          type: 'DOCUMENT_REJECTED',
          message: NOTIF_MESSAGES.DOCUMENT_REJECTED!(docInstance.metadata.title),
        });
      } else if (activeAction === 'request_changes') {
        await transitionDocument(
          docInstance.tenantId,
          docInstance.id,
          'REQUEST_CHANGES',
          actorId,
          actorEmail,
          'DRAFT',
          { note: delegationNote ?? note.trim(), actorRole, stepType: 'APPROVAL' }
        );
        await dispatchNotification({
          tenantId: docInstance.tenantId,
          recipientId: docInstance.submittedBy,
          documentInstanceId: docInstance.id,
          documentTitle: docInstance.metadata.title,
          type: 'CHANGES_REQUESTED',
          message: NOTIF_MESSAGES.CHANGES_REQUESTED!(docInstance.metadata.title),
        });
      }
      onActionComplete();
    } catch (e: any) {
      setError(e.message ?? 'Błąd operacji.');
    } finally {
      setLoading(false);
    }
  };

  const meta = docInstance.metadata;
  const createdDate = docInstance.createdAt?.toDate
    ? format(docInstance.createdAt.toDate(), 'dd MMM yyyy', { locale: pl })
    : '—';

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
      {/* Document header */}
      <div className="p-8 bg-slate-900 text-white">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${STATUS_COLORS[docInstance.status]}`}>
              {STATUS_LABELS[docInstance.status]}
            </span>
            <h3 className="text-2xl font-black uppercase tracking-tight italic mt-3">
              {meta.title}
            </h3>
            <p className="text-slate-400 text-xs font-bold mt-1 uppercase">
              {DOC_TYPE_LABELS[docInstance.type]}
            </p>
          </div>
          {meta.amount != null && (
            <div className="text-right">
              <div className="text-3xl font-black tabular-nums">
                {meta.amount.toFixed(2)}
              </div>
              <div className="text-xs font-bold text-slate-400 uppercase">
                {meta.currency ?? 'PLN'}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 text-[10px] font-bold text-slate-400 uppercase">
          {meta.vendor && (
            <span className="flex items-center gap-1.5">
              <User size={10} /> {meta.vendor}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Calendar size={10} /> {createdDate}
          </span>
          <span className="flex items-center gap-1.5 col-span-2 font-mono">
            <Hash size={10} /> {docInstance.id.substring(0, 16)}...
          </span>
        </div>
      </div>

      {/* Description */}
      {meta.description && (
        <div className="px-8 py-5 border-b border-slate-100 bg-slate-50">
          <p className="text-sm text-slate-600 font-medium leading-relaxed italic">
            {meta.description}
          </p>
        </div>
      )}

      {/* Action buttons */}
      {(docInstance.status === 'PENDING_APPROVAL' || docInstance.status === 'SUBMITTED') && (
        <div className="p-8 space-y-6">
          {/* Delegation toggle */}
          <div className={`rounded-2xl border px-5 py-4 transition-all ${isDelegated ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={isDelegated} onChange={e => setIsDelegated(e.target.checked)} className="w-4 h-4 rounded accent-amber-500" />
              <div className="flex items-center gap-2">
                <UserCheck size={14} className={isDelegated ? 'text-amber-600' : 'text-slate-400'} />
                <span className="text-xs font-black uppercase tracking-widest text-slate-700">Zatwierdzam w zastępstwie</span>
              </div>
            </label>
            {isDelegated && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Imię i nazwisko osoby</label>
                  <input value={delegatedFor} onChange={e => setDelegatedFor(e.target.value)} placeholder="Jan Kowalski" className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-amber-400 outline-none" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Email osoby</label>
                  <input type="email" value={delegatedForEmail} onChange={e => setDelegatedForEmail(e.target.value)} placeholder="jan@firma.pl" className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-amber-400 outline-none" />
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setActiveAction(activeAction === 'approve' ? null : 'approve')}
              className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                activeAction === 'approve'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <CheckCircle2 size={16} /> Zatwierdź
            </button>
            <button
              onClick={() => setActiveAction(activeAction === 'reject' ? null : 'reject')}
              className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                activeAction === 'reject'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-500/20'
                  : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
              }`}
            >
              <XCircle size={16} /> Odrzuć
            </button>
            <button
              onClick={() => setActiveAction(activeAction === 'request_changes' ? null : 'request_changes')}
              className={`flex items-center justify-center gap-2 px-5 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                activeAction === 'request_changes'
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/20'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <RotateCcw size={16} />
            </button>
          </div>

          {activeAction && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder={
                  activeAction === 'approve'
                    ? 'Opcjonalna notatka do zatwierdzenia...'
                    : 'Wymagane: podaj przyczynę...'
                }
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
              {error && (
                <div className="flex items-center gap-2 text-red-600 text-xs font-bold">
                  <AlertTriangle size={12} /> {error}
                </div>
              )}
              <button
                onClick={handleAction}
                disabled={loading}
                className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                  activeAction === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : activeAction === 'reject'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed shadow-xl`}
              >
                {loading ? 'Przetwarzanie...' : 'Potwierdź akcję'}
              </button>
            </div>
          )}
        </div>
      )}

      {docInstance.status === 'APPROVED' && docInstance.type !== 'PROJECT_DELIVERY' && (
        <div className="p-8 flex items-center gap-3 bg-emerald-50 border-t border-emerald-100">
          <CheckCircle2 className="text-emerald-600" size={20} />
          <span className="text-sm font-black text-emerald-800 uppercase tracking-tight">
            Dokument zatwierdzony — oczekuje na weryfikację KSeF
          </span>
        </div>
      )}

      {docInstance.status === 'APPROVED' && docInstance.type === 'PROJECT_DELIVERY' && (
        <ProjectDeliveryRouting
          docInstance={docInstance}
          actorId={actorId}
          actorEmail={actorEmail}
          actorRole={actorRole}
          onActionComplete={onActionComplete}
        />
      )}
    </div>
  );
}

function ProjectDeliveryRouting({
  docInstance,
  actorId,
  actorEmail,
  actorRole,
  onActionComplete,
}: {
  docInstance: import('../types').DocumentInstance;
  actorId: string;
  actorEmail: string;
  actorRole?: string;
  onActionComplete: () => void;
}) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [done, setDone] = React.useState<string[]>([]);

  const route = async (target: 'BILLING_READY' | 'MARKETING_REVIEW', action: import('../types').StepAction) => {
    setLoading(true);
    setError('');
    try {
      await transitionDocument(
        docInstance.tenantId,
        docInstance.id,
        action,
        actorId,
        actorEmail,
        target,
        { actorRole, stepType: 'APPROVAL' }
      );
      setDone(prev => [...prev, target]);
      onActionComplete();
    } catch (e: any) {
      setError(e.message ?? 'Błąd routingu.');
    } finally {
      setLoading(false);
    }
  };

  const isBillable = docInstance.metadata.isBillable;
  const sendToMarketing = docInstance.metadata.sendToMarketing;

  return (
    <div className="p-8 border-t border-slate-100 space-y-4">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Routing realizacji projektu</p>
      <div className="flex flex-col sm:flex-row gap-3">
        {isBillable && (
          <button
            disabled={loading || done.includes('BILLING_READY')}
            onClick={() => route('BILLING_READY', 'APPROVE')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
              done.includes('BILLING_READY')
                ? 'bg-lime-100 text-lime-700 border border-lime-200 cursor-default'
                : 'bg-lime-600 hover:bg-lime-700 text-white shadow-lg shadow-lime-500/20'
            } disabled:opacity-50`}
          >
            <Banknote size={15} />
            {done.includes('BILLING_READY') ? 'Skierowano do fakturowania' : 'Skieruj do fakturowania'}
          </button>
        )}
        {sendToMarketing && (
          <button
            disabled={loading || done.includes('MARKETING_REVIEW')}
            onClick={() => route('MARKETING_REVIEW', 'APPROVE')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
              done.includes('MARKETING_REVIEW')
                ? 'bg-pink-100 text-pink-700 border border-pink-200 cursor-default'
                : 'bg-pink-600 hover:bg-pink-700 text-white shadow-lg shadow-pink-500/20'
            } disabled:opacity-50`}
          >
            <ImageIcon size={15} />
            {done.includes('MARKETING_REVIEW') ? 'Skierowano do Marketingu' : 'Skieruj do Marketingu'}
          </button>
        )}
        {!isBillable && !sendToMarketing && (
          <div className="flex items-center gap-3 bg-slate-50 rounded-2xl px-5 py-4">
            <CheckCircle2 className="text-emerald-600" size={16} />
            <span className="text-xs font-bold text-slate-600">Brak dodatkowego routingu — projekt zatwierdzony.</span>
          </div>
        )}
      </div>
      {error && (
        <div className="flex items-center gap-2 text-red-600 text-xs font-bold">
          <AlertTriangle size={12} /> {error}
        </div>
      )}
    </div>
  );
}
