import React, { useState } from 'react';
import { ArrowLeft, Check, AlertTriangle, Wrench } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { useCompany } from '../../../core/auth/CompanyContext';
import { createDocumentInstance, transitionDocument } from '../services/workflowEngine';

interface Props { onComplete: (docId: string) => void; onCancel: () => void; }

const INPUT = 'w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none transition-all';
const CHANGE_REASONS = ['Poprawa jakości', 'Redukcja kosztów', 'Zmiana dostawcy', 'Wymogi regulacyjne', 'Problem bezpieczeństwa', 'Wymogi klienta', 'Optymalizacja produkcji'];

export default function SubmitEngineeringChangeWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [partNumber, setPartNumber] = useState('');
  const [partName, setPartName] = useState('');
  const [ecoNumber, setEcoNumber] = useState('');
  const [changeReason, setChangeReason] = useState(CHANGE_REASONS[0]);
  const [changeTitle, setChangeTitle] = useState('');
  const [description, setDescription] = useState('');
  const [affectedDocs, setAffectedDocs] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [productionImpact, setProductionImpact] = useState(false);

  const isValid = (partNumber.trim().length > 0 || partName.trim().length > 0) && changeTitle.trim().length > 3 && description.trim().length > 10;

  const handleSubmit = async () => {
    if (!user || !activeTenantId || !isValid) return;
    setLoading(true); setError('');
    try {
      const docId = await createDocumentInstance(
        activeTenantId, user.uid, user.email ?? '',
        'ENGINEERING_CHANGE', 'default-engineering-change',
        {
          title: `ECO: ${changeTitle}${partNumber ? ` — ${partNumber}` : ''}`,
          invoiceDate: new Date().toISOString().split('T')[0],
          description: `Nr ECO: ${ecoNumber}\nCzęść: ${partName} (${partNumber})\nPrzyczyna: ${changeReason}\nData wejścia w życie: ${effectiveDate}\nWpływ na produkcję: ${productionImpact ? 'TAK — powiadomić produkcję' : 'NIE'}\nDokumenty do aktualizacji: ${affectedDocs}\n\nOpis zmiany:\n${description}`,
        },
        [], currentCompany?.id
      );
      await transitionDocument(activeTenantId, docId, 'SUBMIT', user.uid, user.email ?? '', 'PENDING_APPROVAL', {
        stepDefId: 'step-submit', stepType: 'APPROVAL', note: `ECO: ${changeTitle}. Przyczyna: ${changeReason}.${productionImpact ? ' Wpływ na produkcję.' : ''}`,
      });
      onComplete(docId);
    } catch (e: any) { setError(e.message ?? 'Błąd podczas wysyłania.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center"><Wrench size={18} className="text-indigo-600" /></div>
        <div>
          <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">ENGINEERING CHANGE ORDER (ECO)</span>
          <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 leading-none">Zmiana Inżynierska</h3>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Nr części"><input value={partNumber} onChange={e => setPartNumber(e.target.value)} placeholder="P/N" className={INPUT} /></Field>
          <Field label="Nazwa części"><input value={partName} onChange={e => setPartName(e.target.value)} placeholder="Nazwa" className={INPUT} /></Field>
          <Field label="Nr ECO"><input value={ecoNumber} onChange={e => setEcoNumber(e.target.value)} placeholder="ECO-2026-001" className={INPUT} /></Field>
        </div>

        <Field label="Tytuł zmiany * (min. 3 znaki)"><input value={changeTitle} onChange={e => setChangeTitle(e.target.value)} placeholder="Krótki opis zmiany inżynierskiej" className={INPUT} /></Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Przyczyna zmiany">
            <select value={changeReason} onChange={e => setChangeReason(e.target.value)} className={INPUT}>
              {CHANGE_REASONS.map(r => <option key={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Data wejścia w życie"><input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} className={INPUT} /></Field>
        </div>

        <Field label="Opis zmiany * (min. 10 znaków)"><textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Co się zmienia (stan obecny → stan docelowy)..." className={INPUT + ' resize-none'} /></Field>
        <Field label="Dokumenty do aktualizacji"><textarea value={affectedDocs} onChange={e => setAffectedDocs(e.target.value)} rows={2} placeholder="Rysunki techniczne, BOM, instrukcje montażu, FMEA..." className={INPUT + ' resize-none'} /></Field>

        <label className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${productionImpact ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
          <input type="checkbox" checked={productionImpact} onChange={e => setProductionImpact(e.target.checked)} className="w-4 h-4" />
          <span className={`text-[9px] font-black uppercase ${productionImpact ? 'text-amber-700' : 'text-slate-500'}`}>
            Zmiana wpływa na bieżącą produkcję — wymagane powiadomienie produkcji
          </span>
        </label>
      </div>

      {error && <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-2xl px-4 py-3 text-xs font-bold"><AlertTriangle size={13} />{error}</div>}

      <div className="flex gap-3">
        <button onClick={onCancel} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 text-slate-600 text-xs font-black uppercase hover:bg-slate-200 transition-all"><ArrowLeft size={13} />Anuluj</button>
        <button onClick={handleSubmit} disabled={loading || !isValid} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-600 text-white text-xs font-black uppercase hover:bg-indigo-700 disabled:opacity-40 transition-all">
          {loading ? 'Wysyłanie...' : <><Check size={13} />Wyślij ECO do przeglądu technicznego</>}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex-1"><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>{children}</div>;
}
