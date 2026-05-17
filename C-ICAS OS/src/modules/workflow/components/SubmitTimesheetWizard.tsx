/**
 * Data: 2026-05-17
 * Ścieżka: /src/modules/workflow/components/SubmitTimesheetWizard.tsx
 */
import React, { useState } from 'react';
import { ArrowLeft, Check, AlertTriangle, Clock, Plus, X } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { useCompany } from '../../../core/auth/CompanyContext';
import { createDocumentInstance, transitionDocument } from '../services/workflowEngine';
import type { DocumentMetadata } from '../types';

const INPUT = 'w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-emerald-400 focus:border-transparent outline-none transition-all';
const CELL = 'bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-emerald-400 outline-none transition-all w-full';

interface TimesheetRow { project: string; task: string; hours: string; overtime: string; }
interface Props { onComplete: (docId: string) => void; onCancel: () => void; }

export default function SubmitTimesheetWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState(new Date().toISOString().substring(0, 7));
  const [note, setNote] = useState('');
  const [rows, setRows] = useState<TimesheetRow[]>([{ project: '', task: '', hours: '', overtime: '' }]);

  const totalHours = rows.reduce((acc, r) => acc + (parseFloat(r.hours) || 0), 0);
  const totalOT    = rows.reduce((acc, r) => acc + (parseFloat(r.overtime) || 0), 0);

  const addRow = () => setRows(p => [...p, { project: '', task: '', hours: '', overtime: '' }]);
  const removeRow = (i: number) => setRows(p => p.filter((_, idx) => idx !== i));
  const updateRow = (i: number, patch: Partial<TimesheetRow>) =>
    setRows(p => p.map((r, idx) => idx === i ? { ...r, ...patch } : r));

  const isValid = period.length === 7 && rows.some(r => r.project.trim() && parseFloat(r.hours) > 0);

  const handleSubmit = async () => {
    if (!user || !activeTenantId || !isValid) return;
    setLoading(true); setError('');
    try {
      const rowsSummary = rows
        .filter(r => r.project && parseFloat(r.hours) > 0)
        .map(r => `${r.project}${r.task ? '/' + r.task : ''}: ${r.hours}h${parseFloat(r.overtime) > 0 ? ' (+' + r.overtime + 'h OT)' : ''}`)
        .join('; ');
      const meta: DocumentMetadata = {
        title: `Karta czasu pracy ${period} — ${user.displayName ?? user.email}`,
        invoiceDate: period + '-01',
        amount: totalHours,
        currency: 'h',
        description: [
          `Łącznie: ${totalHours}h regularne`,
          totalOT > 0 ? `${totalOT}h nadgodziny` : '',
          rowsSummary,
          note ? 'Notatka: ' + note : '',
        ].filter(Boolean).join(' | '),
      };
      const docId = await createDocumentInstance(
        activeTenantId, user.uid, user.email ?? '',
        'TIMESHEET', 'default-timesheet', meta, [],
        currentCompany?.id
      );
      await transitionDocument(activeTenantId, docId, 'SUBMIT', user.uid, user.email ?? '', 'SUBMITTED', {
        stepDefId: 'step-submit', stepType: 'APPROVAL',
        note: `Karta czasu pracy za ${period} wysłana do zatwierdzenia (${totalHours}h).`,
      });
      onComplete(docId);
    } catch (e: any) {
      setError(e.message ?? 'Błąd podczas wysyłania.');
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
          <Clock size={12} /> Karta Czasu Pracy
        </span>
        <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 mt-1">Nowy timesheet</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Okres rozliczeniowy *</label>
          <input type="month" value={period} onChange={e => setPeriod(e.target.value)} className={INPUT} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Wpisy czasu pracy *</label>
            <button type="button" onClick={addRow} className="flex items-center gap-1 text-[9px] font-black text-emerald-600 uppercase hover:text-emerald-700 transition-colors">
              <Plus size={12} /> Dodaj wiersz
            </button>
          </div>

          <div className="bg-slate-50 rounded-2xl p-3 space-y-2">
            <div className="grid grid-cols-12 gap-2 px-1 mb-1">
              {['Projekt', 'Zadanie', 'Godz.', 'OT'].map(h => (
                <span key={h} className="text-[8px] font-black text-slate-400 uppercase tracking-widest col-span-3">{h}</span>
              ))}
            </div>
            {rows.map((row, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input value={row.project} onChange={e => updateRow(i, { project: e.target.value })} placeholder="Projekt" className={CELL + ' col-span-3'} />
                <input value={row.task} onChange={e => updateRow(i, { task: e.target.value })} placeholder="Zadanie" className={CELL + ' col-span-3'} />
                <input type="number" value={row.hours} onChange={e => updateRow(i, { hours: e.target.value })} placeholder="0" min="0" max="24" step="0.5" className={CELL + ' col-span-3'} />
                <div className="col-span-3 flex items-center gap-1">
                  <input type="number" value={row.overtime} onChange={e => updateRow(i, { overtime: e.target.value })} placeholder="0" min="0" step="0.5" className={CELL + ' flex-1'} />
                  {rows.length > 1 && (
                    <button type="button" onClick={() => removeRow(i)} className="text-slate-300 hover:text-red-400 transition-colors flex-shrink-0">
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-6 py-4 flex items-center justify-between">
          <div>
            <div className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Łącznie regularne</div>
            <div className="text-2xl font-black text-emerald-800 italic">{totalHours}h</div>
          </div>
          {totalOT > 0 && (
            <div className="text-right">
              <div className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Nadgodziny</div>
              <div className="text-2xl font-black text-amber-700 italic">+{totalOT}h</div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Notatka (opcjonalnie)</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Dodatkowe informacje dla przełożonego..." className={INPUT + ' resize-none'} />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-2xl px-4 py-3 text-xs font-bold">
          <AlertTriangle size={13} /> {error}
        </div>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={onCancel} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 text-slate-600 text-xs font-black uppercase hover:bg-slate-200 transition-all">
          <ArrowLeft size={13} /> Anuluj
        </button>
        <button type="button" onClick={handleSubmit} disabled={loading || !isValid} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-600 text-white text-xs font-black uppercase hover:bg-emerald-700 disabled:opacity-40 transition-all">
          {loading ? 'Wysyłanie...' : <><Check size={13} /> Wyślij do zatwierdzenia</>}
        </button>
      </div>
    </div>
  );
}
