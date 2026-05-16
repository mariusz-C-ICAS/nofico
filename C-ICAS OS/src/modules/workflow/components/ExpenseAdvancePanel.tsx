import React, { useState } from 'react';
import { Banknote, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { transitionDocument } from '../services/workflowEngine';
import type { DocumentInstance } from '../types';

interface Props {
  document: DocumentInstance;
  actorId: string;
  actorEmail: string;
  onActionComplete: () => void;
}

export default function ExpenseAdvancePanel({ document: doc, actorId, actorEmail, onActionComplete }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!['APPROVED', 'ADVANCE_ISSUED', 'SETTLED'].includes(doc.status)) return null;

  const transition = async (target: 'ADVANCE_ISSUED' | 'SETTLED' | 'ARCHIVED', action: 'ISSUE_ADVANCE' | 'SETTLE' | 'ARCHIVE', note: string) => {
    setLoading(true); setError('');
    try {
      await transitionDocument(doc.tenantId, doc.id, action, actorId, actorEmail, target, { stepType: 'APPROVAL', note });
      onActionComplete();
    } catch (e: any) { setError(e.message ?? 'Błąd operacji.'); }
    finally { setLoading(false); }
  };

  const settlementDate = doc.metadata.advanceExpectedSettlementDate;
  const isOverdue = settlementDate ? new Date(settlementDate) < new Date() : false;

  return (
    <div className="bg-green-50 rounded-[2rem] p-6 border border-green-100 space-y-5">
      <div className="flex items-center gap-2">
        <Banknote size={16} className="text-green-600" />
        <h3 className="text-sm font-black text-green-800 uppercase tracking-tight">Zaliczka pracownicza</h3>
        <span className={`ml-auto text-[9px] font-black px-2 py-1 rounded-full uppercase ${
          doc.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
          doc.status === 'ADVANCE_ISSUED' ? 'bg-lime-100 text-lime-700' :
          'bg-teal-100 text-teal-700'
        }`}>
          {doc.status === 'APPROVED' ? 'Do wydania' : doc.status === 'ADVANCE_ISSUED' ? 'Wydana' : 'Rozliczona'}
        </span>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-green-100 text-xs text-slate-700 space-y-1">
        {doc.metadata.amount && <p><span className="font-black text-slate-500">Kwota:</span> {doc.metadata.amount.toLocaleString('pl-PL')} {doc.metadata.currency ?? 'PLN'}</p>}
        {doc.metadata.advancePurpose && <p><span className="font-black text-slate-500">Cel:</span> {doc.metadata.advancePurpose}</p>}
        {settlementDate && (
          <p className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-bold' : ''}`}>
            <Clock size={10} />
            <span className="font-black text-slate-500">Rozliczenie do:</span> {settlementDate}
            {isOverdue && <span className="text-red-600 font-black ml-1">PRZEKROCZONE</span>}
          </p>
        )}
      </div>

      {doc.status === 'APPROVED' && (
        <>
          <div className="bg-green-100 rounded-2xl p-4 border border-green-200">
            <p className="text-[10px] text-green-700 font-bold">
              Dział FI potwierdza wydanie gotówki / przelewu. Po kliknięciu pracownik otrzymuje powiadomienie o obowiązku rozliczenia.
            </p>
          </div>
          {error && <p className="text-red-600 text-xs font-bold flex items-center gap-1.5"><AlertTriangle size={12} />{error}</p>}
          <button
            disabled={loading}
            onClick={() => transition('ADVANCE_ISSUED', 'ISSUE_ADVANCE', `Zaliczka ${doc.metadata.amount ?? '?'} ${doc.metadata.currency ?? 'PLN'} wydana. Rozliczenie do: ${settlementDate ?? 'brak daty'}.`)}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-black px-6 py-3 rounded-2xl text-xs uppercase tracking-widest w-full flex items-center justify-center gap-2"
          >
            <Banknote size={14} />
            {loading ? 'Potwierdzanie...' : 'Potwierdź wydanie zaliczki'}
          </button>
        </>
      )}

      {doc.status === 'ADVANCE_ISSUED' && (
        <>
          <div className={`rounded-2xl p-4 border ${isOverdue ? 'bg-red-50 border-red-200' : 'bg-lime-50 border-lime-100'}`}>
            <p className={`text-[10px] font-bold ${isOverdue ? 'text-red-700' : 'text-lime-700'}`}>
              {isOverdue
                ? 'Termin rozliczenia minął. Wymagane natychmiastowe złożenie dokumentów rozliczeniowych.'
                : 'Zaliczka wydana. Pracownik powinien złożyć wydatki jako OUT_OF_POCKET przed terminem rozliczenia.'}
            </p>
          </div>
          {error && <p className="text-red-600 text-xs font-bold flex items-center gap-1.5"><AlertTriangle size={12} />{error}</p>}
          <button
            disabled={loading}
            onClick={() => transition('SETTLED', 'SETTLE', 'Zaliczka rozliczona — dokumenty wydatków przyjęte przez FI.')}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-black px-6 py-3 rounded-2xl text-xs uppercase tracking-widest w-full flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={14} />
            {loading ? 'Rozliczanie...' : 'Oznacz zaliczkę jako rozliczoną'}
          </button>
        </>
      )}

      {doc.status === 'SETTLED' && (
        <div className="bg-teal-50 rounded-2xl p-4 border border-teal-100">
          <p className="text-xs font-bold text-teal-700 flex items-center gap-2">
            <CheckCircle2 size={14} /> Zaliczka rozliczona. Wszystkie dokumenty zaakceptowane.
          </p>
        </div>
      )}
    </div>
  );
}
