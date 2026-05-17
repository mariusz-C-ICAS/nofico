import React, { useState } from 'react';
import { ArrowLeft, Check, AlertTriangle, Gauge } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { useCompany } from '../../../core/auth/CompanyContext';
import { createDocumentInstance, transitionDocument } from '../services/workflowEngine';

interface Props { onComplete: (docId: string) => void; onCancel: () => void; }

const INPUT = 'w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-teal-400 focus:border-transparent outline-none transition-all';

export default function SubmitCalibrationRecordWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [instrumentName, setInstrumentName] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [inventoryId, setInventoryId] = useState('');
  const [calibrationDate, setCalibrationDate] = useState(new Date().toISOString().split('T')[0]);
  const [nextCalibrationDate, setNextCalibrationDate] = useState('');
  const [standardUsed, setStandardUsed] = useState('');
  const [calibratedBy, setCalibratedBy] = useState('');
  const [measurementResults, setMeasurementResults] = useState('');
  const [result, setResult] = useState<'PASS' | 'FAIL'>('PASS');
  const [uncertaintyValue, setUncertaintyValue] = useState('');

  const isValid = instrumentName.trim().length > 1 && calibrationDate.length > 0 && nextCalibrationDate.length > 0 && measurementResults.trim().length > 3;

  const handleSubmit = async () => {
    if (!user || !activeTenantId || !isValid) return;
    setLoading(true); setError('');
    try {
      const docId = await createDocumentInstance(
        activeTenantId, user.uid, user.email ?? '',
        'CALIBRATION_RECORD', 'default-calibration-record',
        {
          title: `Kalibracja [${result}]: ${instrumentName}${serialNumber ? ` S/N ${serialNumber}` : ''}`,
          invoiceDate: calibrationDate,
          description: `Przyrząd: ${instrumentName}\nNr seryjny: ${serialNumber}\nID inwentarzowe: ${inventoryId}\nData kalibracji: ${calibrationDate}\nNastępna kalibracja: ${nextCalibrationDate}\nWzorzec: ${standardUsed}\nKalibrował: ${calibratedBy}\nNiepewność pomiaru: ${uncertaintyValue}\nWynik: ${result}\n\nWyniki pomiarów:\n${measurementResults}`,
        },
        [], currentCompany?.id
      );
      await transitionDocument(activeTenantId, docId, 'SUBMIT', user.uid, user.email ?? '', 'PENDING_APPROVAL', {
        stepDefId: 'step-submit', stepType: 'APPROVAL', note: `Karta kalibracji: ${instrumentName} — wynik ${result}. Następna kalibracja: ${nextCalibrationDate}.`,
      });
      onComplete(docId);
    } catch (e: any) { setError(e.message ?? 'Błąd podczas wysyłania.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-teal-50 rounded-2xl flex items-center justify-center"><Gauge size={18} className="text-teal-600" /></div>
        <div>
          <span className="text-[9px] font-black text-teal-600 uppercase tracking-widest">CALIBRATION RECORD</span>
          <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 leading-none">Karta Kalibracji</h3>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nazwa przyrządu *"><input value={instrumentName} onChange={e => setInstrumentName(e.target.value)} placeholder="Suwmiarka, termometr, waga..." className={INPUT} /></Field>
          <Field label="Nr seryjny"><input value={serialNumber} onChange={e => setSerialNumber(e.target.value)} placeholder="SN-001234" className={INPUT} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ID inwentarzowe"><input value={inventoryId} onChange={e => setInventoryId(e.target.value)} placeholder="INV-2026-001" className={INPUT} /></Field>
          <Field label="Kalibrował"><input value={calibratedBy} onChange={e => setCalibratedBy(e.target.value)} placeholder="Imię Nazwisko / lab" className={INPUT} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data kalibracji *"><input type="date" value={calibrationDate} onChange={e => setCalibrationDate(e.target.value)} className={INPUT} /></Field>
          <Field label="Następna kalibracja *"><input type="date" value={nextCalibrationDate} onChange={e => setNextCalibrationDate(e.target.value)} className={INPUT} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Wzorzec kalibracji"><input value={standardUsed} onChange={e => setStandardUsed(e.target.value)} placeholder="EURAMET, GUM, cert. nr..." className={INPUT} /></Field>
          <Field label="Niepewność pomiaru"><input value={uncertaintyValue} onChange={e => setUncertaintyValue(e.target.value)} placeholder="±0.01 mm, k=2" className={INPUT} /></Field>
        </div>

        <Field label="Wynik kalibracji *">
          <div className="flex gap-3">
            {(['PASS', 'FAIL'] as const).map(r => (
              <button key={r} type="button" onClick={() => setResult(r)}
                className={`flex-1 py-3 rounded-2xl text-xs font-black uppercase border transition-all ${result === r
                  ? r === 'PASS' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-red-600 text-white border-red-600'
                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-teal-300'}`}>
                {r === 'PASS' ? 'PASS — w normie' : 'FAIL — poza normą'}
              </button>
            ))}
          </div>
        </Field>

        {result === 'FAIL' && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-600 shrink-0" />
            <p className="text-[10px] font-black text-red-700 uppercase">Przyrząd poza normą — wymaga wycofania z użytku do czasu naprawy / legalizacji.</p>
          </div>
        )}

        <Field label="Wyniki pomiarów * (min. 3 znaki)">
          <textarea value={measurementResults} onChange={e => setMeasurementResults(e.target.value)} rows={3} placeholder="Punkt 1: 10.00 mm (wzorzec) → 10.01 mm (wynik), błąd: +0.01 mm..." className={INPUT + ' resize-none'} />
        </Field>
      </div>

      {error && <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-2xl px-4 py-3 text-xs font-bold"><AlertTriangle size={13} />{error}</div>}

      <div className="flex gap-3">
        <button onClick={onCancel} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 text-slate-600 text-xs font-black uppercase hover:bg-slate-200 transition-all"><ArrowLeft size={13} />Anuluj</button>
        <button onClick={handleSubmit} disabled={loading || !isValid} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-teal-600 text-white text-xs font-black uppercase hover:bg-teal-700 disabled:opacity-40 transition-all">
          {loading ? 'Wysyłanie...' : <><Check size={13} />Zapisz kartę kalibracji</>}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex-1"><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>{children}</div>;
}
