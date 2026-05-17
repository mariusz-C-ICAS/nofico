import React, { useState } from 'react';
import { ArrowLeft, Check, AlertTriangle, ClipboardCheck, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { useCompany } from '../../../core/auth/CompanyContext';
import { createDocumentInstance, transitionDocument } from '../services/workflowEngine';

interface Props { onComplete: (docId: string) => void; onCancel: () => void; }
interface Finding { id: string; item: string; status: 'OK' | 'NOK' | 'OBS'; comment: string; }

const INPUT = 'w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-all';
const INSPECTION_TYPES = ['Wewnętrzna ISO', 'Zewnętrzna audytorska', 'Klientowska', 'Odbiór techniczny', 'Inspekcja BHP', 'Inspekcja jakościowa'];

export default function SubmitInspectionReportWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [location, setLocation] = useState('');
  const [inspectionType, setInspectionType] = useState(INSPECTION_TYPES[0]);
  const [inspector, setInspector] = useState('');
  const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().split('T')[0]);
  const [overallResult, setOverallResult] = useState<'PASS' | 'FAIL'>('PASS');
  const [findings, setFindings] = useState<Finding[]>([{ id: '1', item: '', status: 'OK', comment: '' }]);
  const [correctionRequired, setCorrectionRequired] = useState(false);
  const [correctionDeadline, setCorrectionDeadline] = useState('');

  const addFinding = () => setFindings(p => [...p, { id: Date.now().toString(), item: '', status: 'OK', comment: '' }]);
  const removeFinding = (id: string) => setFindings(p => p.filter(f => f.id !== id));
  const setFinding = (id: string, patch: Partial<Finding>) => setFindings(p => p.map(f => f.id === id ? { ...f, ...patch } : f));

  const nokCount = findings.filter(f => f.status === 'NOK').length;
  const isValid = location.trim().length > 1 && findings.every(f => f.item.trim().length > 0);

  const handleSubmit = async () => {
    if (!user || !activeTenantId || !isValid) return;
    setLoading(true); setError('');
    try {
      const findingsText = findings.map(f => `[${f.status}] ${f.item}${f.comment ? ` — ${f.comment}` : ''}`).join('\n');
      const docId = await createDocumentInstance(
        activeTenantId, user.uid, user.email ?? '',
        'INSPECTION_REPORT', 'default-inspection-report',
        {
          title: `Inspekcja [${overallResult}]: ${inspectionType} — ${location}`,
          invoiceDate: inspectionDate,
          description: `Typ inspekcji: ${inspectionType}\nLokalizacja: ${location}\nInspektor: ${inspector}\nData: ${inspectionDate}\nWynik ogólny: ${overallResult}\nNiezgodności: ${nokCount}\nKorekta wymagana: ${correctionRequired ? `TAK do ${correctionDeadline}` : 'NIE'}\n\nSzczegóły:\n${findingsText}`,
        },
        [], currentCompany?.id
      );
      await transitionDocument(activeTenantId, docId, 'SUBMIT', user.uid, user.email ?? '', 'PENDING_APPROVAL', {
        stepDefId: 'step-submit', stepType: 'APPROVAL', note: `Protokół inspekcji ${inspectionType} — wynik: ${overallResult}${nokCount > 0 ? `, ${nokCount} niezgodności.` : '.'}`,
      });
      onComplete(docId);
    } catch (e: any) { setError(e.message ?? 'Błąd podczas wysyłania.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center"><ClipboardCheck size={18} className="text-blue-600" /></div>
        <div>
          <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">INSPECTION REPORT</span>
          <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 leading-none">Protokół Inspekcji</h3>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Typ inspekcji *">
            <select value={inspectionType} onChange={e => setInspectionType(e.target.value)} className={INPUT}>
              {INSPECTION_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Data inspekcji *"><input type="date" value={inspectionDate} onChange={e => setInspectionDate(e.target.value)} className={INPUT} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Lokalizacja / obiekt *"><input value={location} onChange={e => setLocation(e.target.value)} placeholder="Hala produkcyjna A, Plac budowy..." className={INPUT} /></Field>
          <Field label="Inspektor"><input value={inspector} onChange={e => setInspector(e.target.value)} placeholder="Imię Nazwisko" className={INPUT} /></Field>
        </div>

        <Field label="Punkty inspekcji *">
          <div className="space-y-2">
            <div className="grid grid-cols-[2fr_90px_2fr_20px] gap-2 px-1">
              {['Element', 'Status', 'Komentarz', ''].map(h => (
                <span key={h} className="text-[8px] font-black text-slate-400 uppercase">{h}</span>
              ))}
            </div>
            {findings.map(f => (
              <div key={f.id} className={`grid grid-cols-[2fr_90px_2fr_20px] gap-2 items-center ${f.status === 'NOK' ? 'bg-red-50 rounded-xl p-1 -mx-1' : ''}`}>
                <input value={f.item} onChange={e => setFinding(f.id, { item: e.target.value })} placeholder="Punkt kontrolny" className={INPUT} />
                <select value={f.status} onChange={e => setFinding(f.id, { status: e.target.value as 'OK' | 'NOK' | 'OBS' })}
                  className={`${INPUT} text-center font-black ${f.status === 'NOK' ? 'text-red-600' : f.status === 'OBS' ? 'text-amber-600' : 'text-emerald-600'}`}>
                  <option value="OK">OK</option>
                  <option value="NOK">NOK</option>
                  <option value="OBS">OBS</option>
                </select>
                <input value={f.comment} onChange={e => setFinding(f.id, { comment: e.target.value })} placeholder="Uwaga" className={INPUT} />
                {findings.length > 1 && <button onClick={() => removeFinding(f.id)} className="text-rose-400 hover:text-rose-600"><Trash2 size={14} /></button>}
              </div>
            ))}
            <button onClick={addFinding} className="flex items-center gap-2 text-blue-600 text-xs font-black uppercase hover:underline"><Plus size={12} />Dodaj punkt</button>
          </div>
        </Field>

        <Field label="Wynik ogólny *">
          <div className="flex gap-3">
            {(['PASS', 'FAIL'] as const).map(r => (
              <button key={r} type="button" onClick={() => setOverallResult(r)}
                className={`flex-1 py-3 rounded-2xl text-xs font-black uppercase border transition-all ${overallResult === r
                  ? r === 'PASS' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-red-600 text-white border-red-600'
                  : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                {r === 'PASS' ? 'PASS' : 'FAIL'}
              </button>
            ))}
          </div>
        </Field>

        <label className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${correctionRequired ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
          <input type="checkbox" checked={correctionRequired} onChange={e => setCorrectionRequired(e.target.checked)} className="w-4 h-4" />
          <span className={`text-[9px] font-black uppercase ${correctionRequired ? 'text-amber-700' : 'text-slate-500'}`}>Wymaga działań korygujących</span>
        </label>
        {correctionRequired && (
          <Field label="Termin korekty"><input type="date" value={correctionDeadline} onChange={e => setCorrectionDeadline(e.target.value)} className={INPUT} /></Field>
        )}
      </div>

      {error && <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-2xl px-4 py-3 text-xs font-bold"><AlertTriangle size={13} />{error}</div>}

      <div className="flex gap-3">
        <button onClick={onCancel} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 text-slate-600 text-xs font-black uppercase hover:bg-slate-200 transition-all"><ArrowLeft size={13} />Anuluj</button>
        <button onClick={handleSubmit} disabled={loading || !isValid} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-blue-600 text-white text-xs font-black uppercase hover:bg-blue-700 disabled:opacity-40 transition-all">
          {loading ? 'Wysyłanie...' : <><Check size={13} />Wyślij protokół inspekcji</>}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>{children}</div>;
}
