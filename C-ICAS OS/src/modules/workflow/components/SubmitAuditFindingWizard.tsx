import React, { useState } from 'react';
import { ArrowLeft, Check, AlertTriangle, Microscope } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { useCompany } from '../../../core/auth/CompanyContext';
import { createDocumentInstance, transitionDocument } from '../services/workflowEngine';

interface Props { onComplete: (docId: string) => void; onCancel: () => void; }

const INPUT = 'w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none transition-all';
const AUDIT_TYPES = ['Wewnętrzny ISO 9001', 'Wewnętrzny finansowy', 'Zewnętrzny audytor', 'Audyt KNF/UKE', 'SOC 2', 'ISO 27001', 'Inny'];
const SEVERITY = ['Obserwacja', 'Minor (Drobna)', 'Major (Poważna)', 'Krytyczna'];

export default function SubmitAuditFindingWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [auditType, setAuditType] = useState(AUDIT_TYPES[0]);
  const [auditor, setAuditor] = useState('');
  const [auditDate, setAuditDate] = useState(new Date().toISOString().split('T')[0]);
  const [findingTitle, setFindingTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('Minor (Drobna)');
  const [capaDescription, setCapaDescription] = useState('');
  const [capaDeadline, setCapaDeadline] = useState('');
  const [capaOwner, setCapaOwner] = useState('');

  const isValid = findingTitle.trim().length > 3 && description.trim().length > 10 && capaDescription.trim().length > 5;

  const handleSubmit = async () => {
    if (!user || !activeTenantId || !isValid) return;
    setLoading(true); setError('');
    try {
      const docId = await createDocumentInstance(
        activeTenantId, user.uid, user.email ?? '',
        'AUDIT_FINDING', 'default-audit-finding',
        {
          title: `Audyt [${severity}]: ${findingTitle}`,
          vendor: auditor,
          invoiceDate: auditDate,
          description: `Typ audytu: ${auditType}\nAudytor: ${auditor}\nData audytu: ${auditDate}\nPoziom: ${severity}\n\nOkres niezgodności:\n${description}\n\nPlan CAPA:\n${capaDescription}\nTermin CAPA: ${capaDeadline}\nWłaściciel CAPA: ${capaOwner}`,
        },
        [], currentCompany?.id
      );
      await transitionDocument(activeTenantId, docId, 'SUBMIT', user.uid, user.email ?? '', 'PENDING_APPROVAL', {
        stepDefId: 'step-submit', stepType: 'APPROVAL', note: `Wynik audytu ${auditType} — ${severity}. Plan CAPA do zatwierdzenia.`,
      });
      onComplete(docId);
    } catch (e: any) { setError(e.message ?? 'Błąd podczas wysyłania.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-purple-50 rounded-2xl flex items-center justify-center"><Microscope size={18} className="text-purple-600" /></div>
        <div>
          <span className="text-[9px] font-black text-purple-600 uppercase tracking-widest">AUDIT FINDING / CAPA</span>
          <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 leading-none">Wynik Audytu</h3>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Typ audytu *">
            <select value={auditType} onChange={e => setAuditType(e.target.value)} className={INPUT}>
              {AUDIT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Data audytu *"><input type="date" value={auditDate} onChange={e => setAuditDate(e.target.value)} className={INPUT} /></Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Audytor / firma"><input value={auditor} onChange={e => setAuditor(e.target.value)} placeholder="Imię nazwisko / firma" className={INPUT} /></Field>
          <Field label="Poziom niezgodności">
            <select value={severity} onChange={e => setSeverity(e.target.value)} className={INPUT}>
              {SEVERITY.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Tytuł niezgodności * (min. 3 znaki)"><input value={findingTitle} onChange={e => setFindingTitle(e.target.value)} placeholder="Brak procedury X, niezgodność z normą Y..." className={INPUT} /></Field>
        <Field label="Opis niezgodności * (min. 10 znaków)"><textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Szczegółowy opis problemu, obiektywna ocena audytora..." className={INPUT + ' resize-none'} /></Field>

        <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100 space-y-3">
          <p className="text-[9px] font-black text-purple-600 uppercase tracking-widest">Plan CAPA (Corrective & Preventive Action)</p>
          <Field label="Działania naprawcze * (min. 5 znaków)"><textarea value={capaDescription} onChange={e => setCapaDescription(e.target.value)} rows={2} placeholder="Co zostanie zrobione, żeby wyeliminować niezgodność..." className={INPUT + ' resize-none'} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Termin realizacji CAPA"><input type="date" value={capaDeadline} onChange={e => setCapaDeadline(e.target.value)} className={INPUT} /></Field>
            <Field label="Właściciel CAPA"><input value={capaOwner} onChange={e => setCapaOwner(e.target.value)} placeholder="Imię Nazwisko / dział" className={INPUT} /></Field>
          </div>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-2xl px-4 py-3 text-xs font-bold"><AlertTriangle size={13} />{error}</div>}

      <div className="flex gap-3">
        <button onClick={onCancel} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 text-slate-600 text-xs font-black uppercase hover:bg-slate-200 transition-all"><ArrowLeft size={13} />Anuluj</button>
        <button onClick={handleSubmit} disabled={loading || !isValid} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-purple-600 text-white text-xs font-black uppercase hover:bg-purple-700 disabled:opacity-40 transition-all">
          {loading ? 'Wysyłanie...' : <><Check size={13} />Wyślij plan CAPA do zatwierdzenia</>}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>{children}</div>;
}
