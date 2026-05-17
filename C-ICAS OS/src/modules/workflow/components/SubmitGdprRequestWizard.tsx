import React, { useState } from 'react';
import { ArrowLeft, Check, AlertTriangle, Shield, Clock } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { useCompany } from '../../../core/auth/CompanyContext';
import { createDocumentInstance, transitionDocument } from '../services/workflowEngine';

interface Props { onComplete: (docId: string) => void; onCancel: () => void; }

const INPUT = 'w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-all';

const REQUEST_TYPES = [
  { val: 'ACCESS', label: 'Dostęp do danych (Art. 15)', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { val: 'ERASURE', label: 'Prawo do bycia zapomnianym (Art. 17)', color: 'text-red-600 bg-red-50 border-red-200' },
  { val: 'PORTABILITY', label: 'Przeniesienie danych (Art. 20)', color: 'text-violet-600 bg-violet-50 border-violet-200' },
  { val: 'RECTIFICATION', label: 'Sprostowanie danych (Art. 16)', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { val: 'OBJECTION', label: 'Sprzeciw wobec przetwarzania (Art. 21)', color: 'text-orange-600 bg-orange-50 border-orange-200' },
];

export default function SubmitGdprRequestWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [requestType, setRequestType] = useState('ACCESS');
  const [dataSubjectEmail, setDataSubjectEmail] = useState('');
  const [dataSubjectName, setDataSubjectName] = useState('');
  const [identityVerified, setIdentityVerified] = useState(false);
  const [description, setDescription] = useState('');

  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 30);

  const isValid = dataSubjectEmail.includes('@') && description.trim().length > 5;

  const handleSubmit = async () => {
    if (!user || !activeTenantId || !isValid) return;
    setLoading(true); setError('');
    try {
      const typeLabel = REQUEST_TYPES.find(t => t.val === requestType)?.label ?? requestType;
      const docId = await createDocumentInstance(
        activeTenantId, user.uid, user.email ?? '',
        'GDPR_REQUEST', 'default-gdpr-request',
        {
          title: `DSAR: ${typeLabel} – ${dataSubjectEmail}`,
          invoiceDate: new Date().toISOString().split('T')[0],
          vendor: dataSubjectEmail,
          description: `Typ żądania: ${typeLabel}\nPodmiot danych: ${dataSubjectName} <${dataSubjectEmail}>\nWeryfikacja tożsamości: ${identityVerified ? 'TAK' : 'NIE (do uzupełnienia)'}\nTermin odpowiedzi: ${deadline.toLocaleDateString('pl-PL')}\n\nOpis żądania:\n${description}`,
        },
        [], currentCompany?.id
      );
      await transitionDocument(activeTenantId, docId, 'SUBMIT', user.uid, user.email ?? '', 'SUBMITTED', {
        stepDefId: 'step-submit', stepType: 'APPROVAL', note: 'Żądanie DSAR przekazane do DPO. Termin: 30 dni.',
      });
      onComplete(docId);
    } catch (e: any) { setError(e.message ?? 'Błąd podczas wysyłania.'); }
    finally { setLoading(false); }
  };

  const selected = REQUEST_TYPES.find(t => t.val === requestType);

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center"><Shield size={18} className="text-blue-600" /></div>
        <div>
          <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">GDPR / RODO – DSAR</span>
          <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 leading-none">Żądanie Podmiotu Danych</h3>
        </div>
      </div>

      <div className="bg-blue-50 rounded-2xl px-4 py-3 border border-blue-100 flex items-center gap-3">
        <Clock size={14} className="text-blue-600 shrink-0" />
        <p className="text-[10px] font-black text-blue-700 uppercase tracking-wide">Ustawowy termin odpowiedzi: <span className="text-blue-900">{deadline.toLocaleDateString('pl-PL')}</span> (30 dni — RODO Art. 12)</p>
      </div>

      <div className="space-y-4">
        <Field label="Typ żądania *">
          <div className="grid grid-cols-1 gap-2">
            {REQUEST_TYPES.map(t => (
              <button key={t.val} type="button" onClick={() => setRequestType(t.val)}
                className={`text-left px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wide transition-all border ${requestType === t.val ? t.color + ' scale-[1.01] shadow-sm' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-blue-200'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Email podmiotu danych *"><input type="email" value={dataSubjectEmail} onChange={e => setDataSubjectEmail(e.target.value)} placeholder="jan.kowalski@example.com" className={INPUT} /></Field>
          <Field label="Imię i nazwisko"><input value={dataSubjectName} onChange={e => setDataSubjectName(e.target.value)} placeholder="Jan Kowalski" className={INPUT} /></Field>
        </div>

        <Field label="Opis żądania * (min. 5 znaków)"><textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Szczegóły żądania i zakres danych, których dotyczy..." className={INPUT + ' resize-none'} /></Field>

        <label className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${identityVerified ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
          <input type="checkbox" checked={identityVerified} onChange={e => setIdentityVerified(e.target.checked)} className="w-5 h-5 rounded-lg text-emerald-600 cursor-pointer" />
          <div>
            <p className={`text-[10px] font-black uppercase ${identityVerified ? 'text-emerald-700' : 'text-slate-600'}`}>Tożsamość podmiotu zweryfikowana</p>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">Wymagane przed realizacją żądania (Art. 12 ust. 6)</p>
          </div>
        </label>
      </div>

      {error && <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-2xl px-4 py-3 text-xs font-bold"><AlertTriangle size={13} />{error}</div>}

      <div className="flex gap-3">
        <button onClick={onCancel} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 text-slate-600 text-xs font-black uppercase hover:bg-slate-200 transition-all"><ArrowLeft size={13} />Anuluj</button>
        <button onClick={handleSubmit} disabled={loading || !isValid} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-blue-600 text-white text-xs font-black uppercase hover:bg-blue-700 disabled:opacity-40 transition-all">
          {loading ? 'Wysyłanie...' : <><Check size={13} />Przekaż do DPO</>}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>{children}</div>;
}
