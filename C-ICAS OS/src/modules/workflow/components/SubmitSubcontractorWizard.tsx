import React, { useState } from 'react';
import { HardHat, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { createDocumentInstance, transitionDocument } from '../services/workflowEngine';

interface Props { onComplete: (docId: string) => void; onCancel: () => void; }
type Step = 'company' | 'scope' | 'review';

const SCOPE_TYPES = [
  'Roboty budowlane',
  'Instalacje elektryczne',
  'Instalacje sanitarne / HVAC',
  'Roboty ziemne',
  'Usługi IT',
  'Outsourcing pracowniczy',
  'Transport i logistyka',
  'Dostawy materiałów',
  'Usługi ochrony',
  'Sprzątanie i utrzymanie czystości',
  'Inne usługi',
];

export default function SubmitSubcontractorWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const [step, setStep] = useState<Step>('company');
  const [companyName, setCompanyName] = useState('');
  const [nip, setNip] = useState('');
  const [address, setAddress] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [scopeType, setScopeType] = useState(SCOPE_TYPES[0]);
  const [scopeDescription, setScopeDescription] = useState('');
  const [contractValue, setContractValue] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [projectId, setProjectId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const order: Step[] = ['company', 'scope', 'review'];
  const stepIndex = order.indexOf(step);

  const canProceed = () => {
    if (step === 'company') return companyName.trim() && nip.trim().length >= 9;
    if (step === 'scope') return scopeDescription.trim().length > 10 && validUntil;
    return true;
  };

  const handleSubmit = async () => {
    if (!user || !activeTenantId) return;
    setLoading(true); setError('');
    try {
      const title = `Podwykonawca: ${companyName.trim()} — ${scopeType}`;
      const docId = await createDocumentInstance(activeTenantId, user.uid, user.email ?? '', 'SUBCONTRACTOR_APPROVAL', 'default-subcontractor', {
        title,
        subcontractorName: companyName.trim(),
        subcontractorNip: nip.trim(),
        subcontractorScope: scopeDescription.trim(),
        subcontractorValidUntil: validUntil,
        projectId: projectId.trim() || undefined,
        amount: contractValue ? parseFloat(contractValue) : undefined,
        currency: 'PLN',
        description: `Typ usług: ${scopeType}. Kontakt: ${contactPerson} ${contactEmail} ${contactPhone}. Adres: ${address}`.trim(),
      });
      await transitionDocument(activeTenantId, docId, 'SUBMIT', user.uid, user.email ?? '', 'PENDING_APPROVAL',
        { stepType: 'APPROVAL', note: `Wniosek o zatwierdzenie podwykonawcy: ${companyName} (NIP: ${nip}). Zakres: ${scopeType}.` });
      onComplete(docId);
    } catch (e: any) { setError(e.message ?? 'Błąd wysyłania.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div>
        <button onClick={onCancel} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 mb-4 block">← Anuluj</button>
        <div className="flex items-center gap-3 mb-1">
          <HardHat size={20} className="text-stone-600" />
          <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Zatwierdzenie podwykonawcy</h3>
        </div>
        <p className="text-slate-400 text-sm font-medium">Budownictwo, IT, logistyka, outsourcing — weryfikacja i zatwierdzenie podwykonawcy.</p>
      </div>

      <div className="flex gap-1">
        {order.map((s, i) => (
          <div key={s} className="flex-1 flex flex-col gap-1">
            <div className={`h-1 rounded-full ${i <= stepIndex ? 'bg-stone-500' : 'bg-slate-200'}`} />
            <span className={`text-[9px] font-black uppercase tracking-widest ${s === step ? 'text-stone-600' : 'text-slate-400'}`}>
              {s === 'company' ? 'Firma' : s === 'scope' ? 'Zakres' : 'Wyślij'}
            </span>
          </div>
        ))}
      </div>

      {step === 'company' && (
        <div className="space-y-4">
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nazwa firmy *</label>
            <input value={companyName} onChange={e => setCompanyName(e.target.value)}
              placeholder="np. Budownictwo XYZ Sp. z o.o."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-stone-500 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">NIP *</label>
              <input value={nip} onChange={e => setNip(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="1234567890"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-stone-500 outline-none" />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Projekt</label>
              <input value={projectId} onChange={e => setProjectId(e.target.value)}
                placeholder="PROJ-2026-012"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-stone-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Adres firmy</label>
            <input value={address} onChange={e => setAddress(e.target.value)}
              placeholder="ul. Przemysłowa 5, 00-001 Warszawa"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-stone-500 outline-none" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Osoba kontaktowa</label>
              <input value={contactPerson} onChange={e => setContactPerson(e.target.value)}
                placeholder="Jan Kowalski"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-3 text-sm focus:ring-2 focus:ring-stone-500 outline-none" />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">E-mail</label>
              <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)}
                placeholder="jan@xyz.pl"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-3 text-sm focus:ring-2 focus:ring-stone-500 outline-none" />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Telefon</label>
              <input value={contactPhone} onChange={e => setContactPhone(e.target.value)}
                placeholder="+48 600 100 200"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-3 text-sm focus:ring-2 focus:ring-stone-500 outline-none" />
            </div>
          </div>
        </div>
      )}

      {step === 'scope' && (
        <div className="space-y-5">
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Typ usług</label>
            <select value={scopeType} onChange={e => setScopeType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-stone-500 outline-none">
              {SCOPE_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Szczegółowy zakres prac *</label>
            <textarea value={scopeDescription} onChange={e => setScopeDescription(e.target.value)} rows={4}
              placeholder="Opisz szczegółowo zakres prac, lokalizację, specyfikę usługi..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm resize-none focus:ring-2 focus:ring-stone-500 outline-none" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Wartość (PLN)</label>
              <input type="number" value={contractValue} onChange={e => setContractValue(e.target.value)}
                placeholder="50000"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-stone-500 outline-none" />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Ważność od</label>
              <input type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-stone-500 outline-none" />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Ważność do *</label>
              <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-stone-500 outline-none" />
            </div>
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-[2rem] p-6 space-y-3">
            <Row label="Firma" value={companyName} />
            <Row label="NIP" value={nip} />
            {address && <Row label="Adres" value={address} />}
            <Row label="Typ usług" value={scopeType} />
            <Row label="Ważność do" value={validUntil} />
            {contractValue && <Row label="Wartość" value={`${parseInt(contractValue).toLocaleString('pl-PL')} PLN`} />}
          </div>
          <div className="bg-stone-50 rounded-[2rem] p-4 border border-stone-200">
            <p className="text-[10px] text-stone-700 font-bold">Po zatwierdzeniu przez menedżera podwykonawca zostaje wpisany do rejestru zatwierdzonych dostawców. Kontrakt wymaga osobnej ścieżki CONTRACT.</p>
          </div>
          {error && <p className="text-red-600 text-xs font-bold flex items-center gap-1.5"><AlertTriangle size={12} />{error}</p>}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button onClick={() => { const i = order.indexOf(step); i > 0 ? setStep(order[i - 1]) : onCancel(); }}
          className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600">
          ← {step === 'company' ? 'Anuluj' : 'Wstecz'}
        </button>
        {step !== 'review' ? (
          <button disabled={!canProceed()} onClick={() => setStep(order[order.indexOf(step) + 1])}
            className="bg-stone-600 hover:bg-stone-700 disabled:opacity-40 text-white font-black px-8 py-3 rounded-2xl text-xs uppercase tracking-widest">Dalej →</button>
        ) : (
          <button disabled={loading} onClick={handleSubmit}
            className="bg-stone-600 hover:bg-stone-700 disabled:opacity-50 text-white font-black px-8 py-3 rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2">
            {loading ? 'Wysyłanie...' : <><CheckCircle2 size={14} /> Wyślij do zatwierdzenia</>}
          </button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest shrink-0">{label}</span>
      <span className="text-xs font-bold text-slate-800 text-right">{value}</span>
    </div>
  );
}
