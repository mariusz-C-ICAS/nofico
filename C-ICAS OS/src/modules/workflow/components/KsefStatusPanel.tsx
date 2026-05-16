import React from 'react';
import { Shield, ShieldCheck, ShieldX, AlertTriangle, Hash, Banknote, User, Calendar, Clock } from 'lucide-react';
import type { DocumentInstance, WorkflowStepRecord } from '../types';

interface Props {
  document: DocumentInstance;
  docHistory: WorkflowStepRecord[];
}

export default function KsefStatusPanel({ document: doc, docHistory }: Props) {
  const isVerified = doc.status === 'KSEF_VERIFIED' || doc.metadata.ksefVerified;
  const ksefStep = docHistory.find(s => s.stepType === 'KSEF_VERIFY');
  const meta = doc.metadata;

  if (!['APPROVED', 'KSEF_VERIFIED', 'BOOKED', 'PENDING_SETTLEMENT', 'SETTLED', 'ARCHIVED'].includes(doc.status)) {
    return null;
  }

  if (doc.status === 'APPROVED' && !isVerified) {
    return (
      <div className="bg-violet-50 border border-violet-200 rounded-[2rem] p-6 flex items-center gap-4">
        <div className="w-10 h-10 rounded-2xl bg-violet-100 flex items-center justify-center flex-shrink-0">
          <Clock size={16} className="text-violet-500 animate-pulse" />
        </div>
        <div>
          <p className="text-xs font-black text-violet-800 uppercase tracking-widest">Oczekiwanie na weryfikację KSeF</p>
          <p className="text-[10px] text-violet-500 mt-0.5 font-medium">
            {meta.ksefNumber
              ? `Numer KSeF: ${meta.ksefNumber} — weryfikacja w toku...`
              : 'Brak numeru KSeF — krok zostanie automatycznie zaliczony (typ dokumentu nie wymaga weryfikacji).'}
          </p>
        </div>
      </div>
    );
  }

  const noteDetails = ksefStep?.note ?? '';
  const isAutoPass = noteDetails.includes('automatycznie zaliczony');
  const isAmountMismatch = noteDetails.includes('AMOUNT_MISMATCH') || noteDetails.includes('nie zgadza się');

  return (
    <div className={`border rounded-[2rem] p-6 space-y-4 ${isVerified ? 'bg-violet-50 border-violet-200' : 'bg-red-50 border-red-200'}`}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${isVerified ? 'bg-violet-600' : 'bg-red-500'}`}>
          {isVerified ? <ShieldCheck size={16} className="text-white" /> : <ShieldX size={16} className="text-white" />}
        </div>
        <div>
          <p className={`text-xs font-black uppercase tracking-widest ${isVerified ? 'text-violet-800' : 'text-red-800'}`}>
            {isVerified
              ? isAutoPass ? 'KSeF — krok zaliczony automatycznie' : 'Weryfikacja KSeF — Pozytywna'
              : 'Weryfikacja KSeF — Negatywna'}
          </p>
          {ksefStep?.timestamp?.toDate && (
            <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">
              <Calendar size={8} className="inline mr-1" />
              {ksefStep.timestamp.toDate().toLocaleString('pl-PL')}
            </p>
          )}
        </div>
      </div>

      {/* Details grid */}
      {!isAutoPass && (
        <div className="grid grid-cols-2 gap-3">
          {meta.ksefNumber && (
            <Detail icon={<Hash size={11} />} label="Numer KSeF" value={meta.ksefNumber} mono />
          )}
          {meta.amount != null && (
            <Detail icon={<Banknote size={11} />} label="Kwota" value={`${meta.amount.toFixed(2)} ${meta.currency ?? 'PLN'}`} />
          )}
          {meta.vendor && (
            <Detail icon={<User size={11} />} label="Dostawca" value={meta.vendor} />
          )}
          {meta.invoiceDate && (
            <Detail icon={<Calendar size={11} />} label="Data faktury" value={meta.invoiceDate} />
          )}
        </div>
      )}

      {/* Step note */}
      {noteDetails && !isAutoPass && (
        <div className={`rounded-xl px-4 py-3 text-[11px] font-medium ${isAmountMismatch ? 'bg-amber-100 text-amber-800' : isVerified ? 'bg-violet-100/60 text-violet-700' : 'bg-red-100 text-red-700'}`}>
          {isAmountMismatch && <AlertTriangle size={10} className="inline mr-1" />}
          {noteDetails}
        </div>
      )}

      {/* No KSeF number warning for VENDOR_INVOICE */}
      {doc.type === 'VENDOR_INVOICE' && !meta.ksefNumber && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle size={12} className="text-amber-600 flex-shrink-0" />
          <p className="text-[10px] text-amber-700 font-bold uppercase">
            Faktura dostawcy bez numeru KSeF — zalecane uzupełnienie dla pełnej zgodności.
          </p>
        </div>
      )}
    </div>
  );
}

function Detail({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-white/70 rounded-xl px-4 py-3">
      <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase mb-1">
        {icon} {label}
      </div>
      <p className={`text-xs font-bold text-slate-800 truncate ${mono ? 'font-mono text-[10px]' : ''}`}>{value}</p>
    </div>
  );
}
