import React, { useState } from 'react';
import { ArrowLeft, Check, AlertTriangle, Home } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { useCompany } from '../../../core/auth/CompanyContext';
import { createDocumentInstance, transitionDocument } from '../services/workflowEngine';

interface Props { onComplete: (docId: string) => void; onCancel: () => void; }

const INPUT = 'w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-rose-400 focus:border-transparent outline-none transition-all';
const ASSET_TYPES = ['Biuro / lokal', 'Powierzchnia magazynowa', 'Hala produkcyjna', 'Pojazd', 'Sprzęt / maszyna', 'Grunt', 'Inne'];
const CURRENCIES = ['PLN', 'EUR', 'USD'];

export default function SubmitLeaseAgreementWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [assetType, setAssetType] = useState(ASSET_TYPES[0]);
  const [assetDescription, setAssetDescription] = useState('');
  const [lessor, setLessor] = useState('');
  const [lessorNip, setLessorNip] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [currency, setCurrency] = useState('PLN');
  const [termStart, setTermStart] = useState('');
  const [termEnd, setTermEnd] = useState('');
  const [noticePeriod, setNoticePeriod] = useState('3 miesiące');
  const [deposit, setDeposit] = useState('');
  const [notes, setNotes] = useState('');

  const totalMonths = termStart && termEnd
    ? Math.max(0, Math.round((new Date(termEnd).getTime() - new Date(termStart).getTime()) / (1000 * 60 * 60 * 24 * 30.44)))
    : null;
  const totalValue = totalMonths && monthlyRent ? (totalMonths * Number(monthlyRent)).toFixed(2) : null;

  const isValid = assetDescription.trim().length > 3 && lessor.trim().length > 1 && Number(monthlyRent) > 0 && termStart.length > 0 && termEnd.length > 0;

  const handleSubmit = async () => {
    if (!user || !activeTenantId || !isValid) return;
    setLoading(true); setError('');
    try {
      const docId = await createDocumentInstance(
        activeTenantId, user.uid, user.email ?? '',
        'LEASE_AGREEMENT', 'default-lease-agreement',
        {
          title: `Najem [${assetType}]: ${assetDescription.substring(0, 40)} — ${lessor}`,
          amount: Number(monthlyRent), currency,
          vendor: lessor,
          invoiceDate: termStart,
          description: `Typ: ${assetType}\nPrzedmiot najmu: ${assetDescription}\nWynajmujący: ${lessor} (NIP: ${lessorNip})\nCzynsz: ${monthlyRent} ${currency}/mies.\nKaucja: ${deposit} ${currency}\nOkres: ${termStart} – ${termEnd}${totalMonths ? ` (${totalMonths} mies.)` : ''}\nWartość łączna: ${totalValue || 'n/d'} ${currency}\nOkres wypowiedzenia: ${noticePeriod}\n\nUwagi: ${notes}`,
        },
        [], currentCompany?.id
      );
      await transitionDocument(activeTenantId, docId, 'SUBMIT', user.uid, user.email ?? '', 'PENDING_APPROVAL', {
        stepDefId: 'step-submit', stepType: 'APPROVAL', note: `Umowa najmu ${assetType} z ${lessor} — ${monthlyRent} ${currency}/mies. do ${termEnd}. Przegląd prawny + akceptacja zarządu.`,
      });
      onComplete(docId);
    } catch (e: any) { setError(e.message ?? 'Błąd podczas wysyłania.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-rose-50 rounded-2xl flex items-center justify-center"><Home size={18} className="text-rose-600" /></div>
        <div>
          <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest">LEASE AGREEMENT</span>
          <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 leading-none">Umowa Najmu</h3>
        </div>
      </div>

      <div className="space-y-4">
        <Field label="Typ przedmiotu najmu *">
          <select value={assetType} onChange={e => setAssetType(e.target.value)} className={INPUT}>
            {ASSET_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>

        <Field label="Opis przedmiotu najmu *"><textarea value={assetDescription} onChange={e => setAssetDescription(e.target.value)} rows={2} placeholder="Adres, metraż, numer rejestracyjny, specyfikacja..." className={INPUT + ' resize-none'} /></Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Wynajmujący (Lessor) *"><input value={lessor} onChange={e => setLessor(e.target.value)} placeholder="Nazwa firmy / osoba" className={INPUT} /></Field>
          <Field label="NIP wynajmującego"><input value={lessorNip} onChange={e => setLessorNip(e.target.value)} placeholder="0000000000" className={INPUT} /></Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Czynsz miesięczny *">
            <input type="number" min="0" step="0.01" value={monthlyRent} onChange={e => setMonthlyRent(e.target.value)} placeholder="0.00" className={INPUT} />
          </Field>
          <Field label="Waluta">
            <select value={currency} onChange={e => setCurrency(e.target.value)} className={INPUT}>
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Kaucja">
            <input type="number" min="0" value={deposit} onChange={e => setDeposit(e.target.value)} placeholder="0" className={INPUT} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Data rozpoczęcia *"><input type="date" value={termStart} onChange={e => setTermStart(e.target.value)} className={INPUT} /></Field>
          <Field label="Data zakończenia *"><input type="date" value={termEnd} onChange={e => setTermEnd(e.target.value)} className={INPUT} /></Field>
        </div>

        {totalValue && (
          <div className="flex items-center justify-between bg-rose-50 border border-rose-100 rounded-2xl px-4 py-3">
            <span className="text-[10px] font-black text-rose-700 uppercase">Łączna wartość umowy ({totalMonths} mies.)</span>
            <span className="text-lg font-black text-rose-700">{totalValue} {currency}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Okres wypowiedzenia"><input value={noticePeriod} onChange={e => setNoticePeriod(e.target.value)} placeholder="np. 3 miesiące" className={INPUT} /></Field>
        </div>

        <Field label="Uwagi"><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Warunki szczególne, opcja przedłużenia, zakazy podnajmu..." className={INPUT + ' resize-none'} /></Field>
      </div>

      {error && <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-2xl px-4 py-3 text-xs font-bold"><AlertTriangle size={13} />{error}</div>}

      <div className="flex gap-3">
        <button onClick={onCancel} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 text-slate-600 text-xs font-black uppercase hover:bg-slate-200 transition-all"><ArrowLeft size={13} />Anuluj</button>
        <button onClick={handleSubmit} disabled={loading || !isValid} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-rose-600 text-white text-xs font-black uppercase hover:bg-rose-700 disabled:opacity-40 transition-all">
          {loading ? 'Wysyłanie...' : <><Check size={13} />Wyślij do przeglądu prawnego</>}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex-1"><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>{children}</div>;
}
