import React, { useState } from 'react';
import { ArrowLeft, Check, AlertTriangle, Shield } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { useCompany } from '../../../core/auth/CompanyContext';
import { createDocumentInstance, transitionDocument } from '../services/workflowEngine';

interface Props { onComplete: (docId: string) => void; onCancel: () => void; }

const INPUT = 'w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none transition-all';
const CLAIM_TYPES = ['Majątkowe (mienie)', 'OC (odpowiedzialność cywilna)', 'D&O (zarząd)', 'Cargo (transport)', 'NNW (wypadek)', 'Cyber', 'Inne'];
const CURRENCIES = ['PLN', 'EUR', 'USD'];

export default function SubmitInsuranceClaimWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [policyNumber, setPolicyNumber] = useState('');
  const [insurerName, setInsurerName] = useState('');
  const [claimType, setClaimType] = useState(CLAIM_TYPES[0]);
  const [incidentDate, setIncidentDate] = useState('');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [estimatedLoss, setEstimatedLoss] = useState('');
  const [currency, setCurrency] = useState('PLN');
  const [location, setLocation] = useState('');
  const [policeReport, setPoliceReport] = useState(false);
  const [policeReportNumber, setPoliceReportNumber] = useState('');

  const isValid = policyNumber.trim().length > 2 && incidentDate.length > 0 && description.trim().length > 10 && Number(estimatedLoss) > 0;

  const handleSubmit = async () => {
    if (!user || !activeTenantId || !isValid) return;
    setLoading(true); setError('');
    try {
      const docId = await createDocumentInstance(
        activeTenantId, user.uid, user.email ?? '',
        'INSURANCE_CLAIM', 'default-insurance-claim',
        {
          title: `Roszczenie [${claimType}]: ${insurerName} — Polisa ${policyNumber}`,
          amount: Number(estimatedLoss), currency,
          vendor: insurerName,
          invoiceDate: reportDate,
          description: `Ubezpieczyciel: ${insurerName}\nNr polisy: ${policyNumber}\nTyp: ${claimType}\nData szkody: ${incidentDate}\nData zgłoszenia: ${reportDate}\nLokalizacja szkody: ${location}\nSzacowana szkoda: ${estimatedLoss} ${currency}\nZgłoszenie policji: ${policeReport ? `TAK — ${policeReportNumber}` : 'NIE'}\n\nOpis zdarzenia:\n${description}`,
        },
        [], currentCompany?.id
      );
      await transitionDocument(activeTenantId, docId, 'SUBMIT', user.uid, user.email ?? '', 'PENDING_APPROVAL', {
        stepDefId: 'step-submit', stepType: 'APPROVAL', note: `Roszczenie ubezpieczeniowe ${claimType} — szacowana szkoda ${estimatedLoss} ${currency}.`,
      });
      onComplete(docId);
    } catch (e: any) { setError(e.message ?? 'Błąd podczas wysyłania.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-orange-50 rounded-2xl flex items-center justify-center"><Shield size={18} className="text-orange-600" /></div>
        <div>
          <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest">INSURANCE CLAIM</span>
          <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 leading-none">Roszczenie Ubezpieczeniowe</h3>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ubezpieczyciel"><input value={insurerName} onChange={e => setInsurerName(e.target.value)} placeholder="Nazwa towarzystwa" className={INPUT} /></Field>
          <Field label="Nr polisy *"><input value={policyNumber} onChange={e => setPolicyNumber(e.target.value)} placeholder="POL-2026-001234" className={INPUT} /></Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Typ roszczenia">
            <select value={claimType} onChange={e => setClaimType(e.target.value)} className={INPUT}>
              {CLAIM_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Data zdarzenia *"><input type="date" value={incidentDate} onChange={e => setIncidentDate(e.target.value)} className={INPUT} /></Field>
        </div>

        <Field label="Lokalizacja zdarzenia"><input value={location} onChange={e => setLocation(e.target.value)} placeholder="ul. Przykładowa 1, Warszawa" className={INPUT} /></Field>
        <Field label="Opis zdarzenia * (min. 10 znaków)"><textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Co się wydarzyło, okoliczności, świadkowie, przyczyny..." className={INPUT + ' resize-none'} /></Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Szacowana szkoda *">
            <input type="number" min="0" step="0.01" value={estimatedLoss} onChange={e => setEstimatedLoss(e.target.value)} placeholder="0.00" className={INPUT} />
          </Field>
          <Field label="Waluta">
            <select value={currency} onChange={e => setCurrency(e.target.value)} className={INPUT}>
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Data zgłoszenia"><input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} className={INPUT} /></Field>
        </div>

        <label className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${policeReport ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
          <input type="checkbox" checked={policeReport} onChange={e => setPoliceReport(e.target.checked)} className="w-4 h-4" />
          <span className={`text-[9px] font-black uppercase ${policeReport ? 'text-blue-700' : 'text-slate-500'}`}>Zdarzenie zgłoszone na policję</span>
        </label>
        {policeReport && (
          <Field label="Nr notatki policyjnej"><input value={policeReportNumber} onChange={e => setPoliceReportNumber(e.target.value)} placeholder="RSD-0001/2026" className={INPUT} /></Field>
        )}
      </div>

      {error && <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-2xl px-4 py-3 text-xs font-bold"><AlertTriangle size={13} />{error}</div>}

      <div className="flex gap-3">
        <button onClick={onCancel} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 text-slate-600 text-xs font-black uppercase hover:bg-slate-200 transition-all"><ArrowLeft size={13} />Anuluj</button>
        <button onClick={handleSubmit} disabled={loading || !isValid} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-orange-600 text-white text-xs font-black uppercase hover:bg-orange-700 disabled:opacity-40 transition-all">
          {loading ? 'Wysyłanie...' : <><Check size={13} />Wyślij roszczenie do zatwierdzenia</>}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex-1"><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>{children}</div>;
}
