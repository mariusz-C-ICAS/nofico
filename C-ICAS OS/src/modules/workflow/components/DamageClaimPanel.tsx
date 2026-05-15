import React, { useState } from 'react';
import {
  ShieldAlert, FileCheck2, XCircle, MessageSquare, CheckCircle2,
  AlertTriangle, RefreshCw, Hash, Banknote,
} from 'lucide-react';
import type { DocumentInstance } from '../types';
import { STATUS_LABELS, STATUS_COLORS } from '../types';
import { transitionDocument } from '../services/workflowEngine';

interface Props {
  document: DocumentInstance;
  actorId: string;
  actorEmail: string;
  actorRole?: string;
  onActionComplete: () => void;
}

export default function DamageClaimPanel({ document: doc, actorId, actorEmail, actorRole, onActionComplete }: Props) {
  const [note, setNote] = useState('');
  const [insuranceRef, setInsuranceRef] = useState(doc.metadata.insuranceRef ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const act = async (
    target: import('../types').DocumentStatus,
    action: import('../types').StepAction,
    requireNote = false
  ) => {
    if (requireNote && !note.trim()) { setError('Dodaj notatkę.'); return; }
    setLoading(true);
    setError('');
    try {
      await transitionDocument(doc.tenantId, doc.id, action, actorId, actorEmail, target, {
        note: note.trim() || undefined,
        actorRole,
        stepType: 'APPROVAL',
      });
      setNote('');
      onActionComplete();
    } catch (e: any) {
      setError(e.message ?? 'Błąd operacji.');
    } finally {
      setLoading(false);
    }
  };

  const StatusBadge = () => (
    <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${STATUS_COLORS[doc.status]}`}>
      {STATUS_LABELS[doc.status]}
    </span>
  );

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
      <div className="bg-orange-950 text-white p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-orange-500/20 rounded-2xl flex items-center justify-center">
          <ShieldAlert size={18} className="text-orange-400" />
        </div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-orange-300 mb-0.5">Zgłoszenie szkody / Ubezpieczenie</p>
          <StatusBadge />
        </div>
      </div>

      <div className="p-6 space-y-5">

        {/* APPROVED → route to backoffice */}
        {doc.status === 'APPROVED' && (
          <Step
            icon={<FileCheck2 size={16} className="text-sky-600" />}
            title="Skieruj do backoffice ubezpieczeniowego"
            description="Szef zatwierdził — backoffice złoży wniosek o odszkodowanie do ubezpieczyciela."
          >
            <NoteInput value={note} onChange={setNote} placeholder="Opcjonalna notatka dla backoffice..." />
            <ActionButton
              color="sky"
              label="Skieruj do backoffice"
              loading={loading}
              onClick={() => act('CLAIM_FILED', 'FILE_CLAIM')}
            />
          </Step>
        )}

        {/* CLAIM_FILED → waiting for insurer */}
        {doc.status === 'CLAIM_FILED' && (
          <Step
            icon={<RefreshCw size={16} className="text-sky-600 animate-spin" style={{ animationDuration: '3s' }} />}
            title="Oczekiwanie na odpowiedź ubezpieczyciela"
            description="Wniosek złożony — zaznacz odpowiedź ubezpieczyciela gdy nadejdzie."
          >
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nr referencyjny wniosku (opcjonalnie)</label>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
                <Hash size={12} className="text-slate-400" />
                <input
                  value={insuranceRef}
                  onChange={e => setInsuranceRef(e.target.value)}
                  placeholder="np. PZU-2026/05/12345"
                  className="flex-1 bg-transparent text-sm font-medium text-slate-900 outline-none"
                />
              </div>
            </div>
            <NoteInput value={note} onChange={setNote} placeholder="Notatki z korespondencji z ubezpieczycielem..." />
            <div className="grid grid-cols-2 gap-3">
              <ActionButton
                color="green"
                label="Zatwierdził — wypłata"
                loading={loading}
                onClick={() => act('CLAIM_APPROVED', 'APPROVE')}
              />
              <ActionButton
                color="rose"
                label="Odrzucił wniosek"
                loading={loading}
                onClick={() => act('CLAIM_REJECTED', 'REJECT', true)}
              />
            </div>
          </Step>
        )}

        {/* CLAIM_REJECTED → appeal */}
        {doc.status === 'CLAIM_REJECTED' && (
          <Step
            icon={<XCircle size={16} className="text-rose-600" />}
            title="Ubezpieczyciel odrzucił wniosek"
            description="Backoffice może złożyć odwołanie z uzupełnioną dokumentacją."
          >
            <NoteInput value={note} onChange={setNote} placeholder="Uzasadnienie odwołania, dodatkowe dowody..." required />
            <ActionButton
              color="orange"
              label="Złóż odwołanie"
              loading={loading}
              onClick={() => act('CLAIM_APPEALED', 'APPEAL_CLAIM', true)}
            />
          </Step>
        )}

        {/* CLAIM_APPEALED → waiting for appeal outcome */}
        {doc.status === 'CLAIM_APPEALED' && (
          <Step
            icon={<MessageSquare size={16} className="text-orange-600" />}
            title="Odwołanie złożone — oczekiwanie na ostateczną odpowiedź"
            description="Zaznacz wynik po otrzymaniu decyzji ubezpieczyciela."
          >
            <NoteInput value={note} onChange={setNote} placeholder="Notatki z rozpatrzenia odwołania..." />
            <div className="grid grid-cols-2 gap-3">
              <ActionButton
                color="green"
                label="Odwołanie uwzględnione"
                loading={loading}
                onClick={() => act('CLAIM_APPROVED', 'APPROVE')}
              />
              <ActionButton
                color="slate"
                label="Odrzucono — zamknij"
                loading={loading}
                onClick={() => act('ARCHIVED', 'CLOSE_CLAIM', true)}
              />
            </div>
          </Step>
        )}

        {/* CLAIM_APPROVED → route to finance */}
        {doc.status === 'CLAIM_APPROVED' && (
          <Step
            icon={<CheckCircle2 size={16} className="text-green-600" />}
            title="Odszkodowanie zatwierdzone"
            description="Ubezpieczyciel zatwierdził wypłatę. Skieruj do FI w celu zaksięgowania i pokrycia kosztów."
          >
            <NoteInput value={note} onChange={setNote} placeholder="Kwota, termin przelewu, uwagi dla FI..." />
            <ActionButton
              color="teal"
              label="Skieruj do FI — rozliczenie"
              loading={loading}
              onClick={() => act('PENDING_SETTLEMENT', 'SETTLE')}
            />
          </Step>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-xs font-bold">
            <AlertTriangle size={12} /> {error}
          </div>
        )}

        {/* Audit info */}
        {doc.metadata.insuranceRef && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 rounded-2xl">
            <Hash size={11} className="text-slate-400" />
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Nr wniosku:</span>
            <span className="text-xs font-bold text-slate-700 font-mono">{doc.metadata.insuranceRef}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Step({ icon, title, description, children }: {
  icon: React.ReactNode; title: string; description: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">{icon}</div>
        <div>
          <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{title}</p>
          <p className="text-[10px] text-slate-500 font-medium mt-0.5">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function NoteInput({ value, onChange, placeholder, required }: { value: string; onChange: (v: string) => void; placeholder: string; required?: boolean }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:ring-2 focus:ring-orange-400 focus:border-transparent resize-none"
    />
  );
}

const COLOR_MAP: Record<string, string> = {
  sky: 'bg-sky-600 hover:bg-sky-700 shadow-sky-500/20',
  green: 'bg-green-600 hover:bg-green-700 shadow-green-500/20',
  rose: 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20',
  orange: 'bg-orange-600 hover:bg-orange-700 shadow-orange-500/20',
  teal: 'bg-teal-600 hover:bg-teal-700 shadow-teal-500/20',
  slate: 'bg-slate-600 hover:bg-slate-700 shadow-slate-500/20',
};

function ActionButton({ color, label, loading, onClick }: {
  color: string; label: string; loading: boolean; onClick: () => void;
}) {
  return (
    <button
      disabled={loading}
      onClick={onClick}
      className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-white transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${COLOR_MAP[color] ?? COLOR_MAP.slate}`}
    >
      {loading ? 'Przetwarzanie...' : label}
    </button>
  );
}
