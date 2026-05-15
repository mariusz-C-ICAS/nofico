import React, { useState } from 'react';
import { ClipboardList, CheckCircle2, AlertTriangle, User } from 'lucide-react';
import { transitionDocument } from '../services/workflowEngine';
import type { DocumentInstance } from '../types';

interface Props {
  document: DocumentInstance;
  actorId: string;
  actorEmail: string;
  onActionComplete: () => void;
}

export default function QualityNcrPanel({ document: doc, actorId, actorEmail, onActionComplete }: Props) {
  const [responsiblePerson, setResponsiblePerson] = useState('');
  const [capaDescription, setCapaDescription] = useState('');
  const [capaDueDate, setCapaDueDate] = useState('');
  const [verifiedBy, setVerifiedBy] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!['APPROVED', 'NCR_OPEN', 'NCR_VERIFIED'].includes(doc.status)) return null;

  const transition = async (target: 'NCR_OPEN' | 'NCR_VERIFIED' | 'ARCHIVED', action: 'OPEN_NCR' | 'CLOSE_NCR' | 'ARCHIVE', note: string) => {
    setLoading(true); setError('');
    try {
      await transitionDocument(doc.tenantId, doc.id, action, actorId, actorEmail, target, { stepType: 'APPROVAL', note });
      onActionComplete();
    } catch (e: any) { setError(e.message ?? 'Błąd operacji.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="bg-yellow-50 rounded-[2rem] p-6 border border-yellow-100 space-y-5">
      <div className="flex items-center gap-2">
        <ClipboardList size={16} className="text-yellow-600" />
        <h3 className="text-sm font-black text-yellow-800 uppercase tracking-tight">Zarządzanie NCR</h3>
        <span className="ml-auto text-[9px] font-black px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 uppercase">
          {doc.status === 'APPROVED' ? 'Gotowy do otwarcia' : doc.status === 'NCR_OPEN' ? 'NCR Otwarty' : 'Zweryfikowany'}
        </span>
      </div>

      {doc.status === 'APPROVED' && (
        <div className="space-y-4">
          <p className="text-xs text-yellow-700 font-medium">
            Zatwierdź i otwórz kartę NCR — przypisz odpowiedzialną osobę.
          </p>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
              <User size={9} className="inline mr-1" />Osoba odpowiedzialna (CAPA)
            </label>
            <input
              value={responsiblePerson}
              onChange={e => setResponsiblePerson(e.target.value)}
              placeholder="np. Jan Kowalski — Dział Jakości"
              className="w-full bg-white border border-yellow-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-yellow-400 outline-none"
            />
          </div>
          {error && <p className="text-red-600 text-xs font-bold flex items-center gap-1.5"><AlertTriangle size={12} />{error}</p>}
          <button
            disabled={loading || !responsiblePerson.trim()}
            onClick={() => transition('NCR_OPEN', 'OPEN_NCR', `NCR otwarty. Odpowiedzialny: ${responsiblePerson}.`)}
            className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-40 text-white font-black px-6 py-3 rounded-2xl text-xs uppercase tracking-widest w-full"
          >
            {loading ? 'Otwieranie...' : 'Otwórz NCR i przypisz odpowiedzialność'}
          </button>
        </div>
      )}

      {doc.status === 'NCR_OPEN' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-yellow-100 text-xs text-slate-700 space-y-1">
            {doc.metadata.ncrSeverity && <p><span className="font-black text-slate-500">Dotkliwość:</span> {doc.metadata.ncrSeverity}</p>}
            {doc.metadata.ncrProcessArea && <p><span className="font-black text-slate-500">Obszar:</span> {doc.metadata.ncrProcessArea}</p>}
            {doc.metadata.ncrResponsiblePerson && <p><span className="font-black text-slate-500">Odpowiedzialny:</span> {doc.metadata.ncrResponsiblePerson}</p>}
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Opis działań CAPA</label>
            <textarea
              value={capaDescription}
              onChange={e => setCapaDescription(e.target.value)}
              rows={3}
              placeholder="Opisz podjęte działania korygujące i zapobiegawcze..."
              className="w-full bg-white border border-yellow-200 rounded-2xl px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-yellow-400 outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Termin CAPA</label>
              <input
                type="date"
                value={capaDueDate}
                onChange={e => setCapaDueDate(e.target.value)}
                className="w-full bg-white border border-yellow-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-yellow-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Zweryfikowane przez</label>
              <input
                value={verifiedBy}
                onChange={e => setVerifiedBy(e.target.value)}
                placeholder="Imię i nazwisko QA"
                className="w-full bg-white border border-yellow-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-yellow-400 outline-none"
              />
            </div>
          </div>
          {error && <p className="text-red-600 text-xs font-bold flex items-center gap-1.5"><AlertTriangle size={12} />{error}</p>}
          <button
            disabled={loading || !capaDescription.trim() || !verifiedBy.trim()}
            onClick={() => transition('NCR_VERIFIED', 'CLOSE_NCR', `CAPA zakończona: ${capaDescription.slice(0, 100)}. Zweryfikował: ${verifiedBy}.`)}
            className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-40 text-white font-black px-6 py-3 rounded-2xl text-xs uppercase tracking-widest w-full flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={14} />
            {loading ? 'Zapisywanie...' : 'Zamknij NCR — CAPA zakończona'}
          </button>
        </div>
      )}

      {doc.status === 'NCR_VERIFIED' && (
        <div className="space-y-4">
          <div className="bg-teal-50 rounded-2xl p-4 border border-teal-100">
            <p className="text-xs font-bold text-teal-700 flex items-center gap-2">
              <CheckCircle2 size={14} /> NCR zweryfikowany — działania CAPA zakończone. Dokument gotowy do archiwizacji.
            </p>
          </div>
          {error && <p className="text-red-600 text-xs font-bold flex items-center gap-1.5"><AlertTriangle size={12} />{error}</p>}
          <button
            disabled={loading}
            onClick={() => transition('ARCHIVED', 'ARCHIVE', 'NCR zarchiwizowany po weryfikacji CAPA.')}
            className="bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white font-black px-6 py-3 rounded-2xl text-xs uppercase tracking-widest w-full"
          >
            {loading ? 'Archiwizowanie...' : 'Archiwizuj NCR'}
          </button>
        </div>
      )}
    </div>
  );
}
