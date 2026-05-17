import React, { useState } from 'react';
import { ArrowLeft, Check, AlertTriangle, Scale, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { useCompany } from '../../../core/auth/CompanyContext';
import { createDocumentInstance, transitionDocument } from '../services/workflowEngine';

interface Props { onComplete: (docId: string) => void; onCancel: () => void; }
interface Bid { id: string; vendor: string; amount: string; score: string; notes: string; }

const INPUT = 'w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none transition-all';
const CURRENCIES = ['PLN', 'EUR', 'USD'];

export default function SubmitBidEvaluationWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [rfqNumber, setRfqNumber] = useState('');
  const [currency, setCurrency] = useState('PLN');
  const [bids, setBids] = useState<Bid[]>([{ id: '1', vendor: '', amount: '', score: '', notes: '' }]);
  const [winner, setWinner] = useState('');
  const [justification, setJustification] = useState('');

  const addBid = () => setBids(p => [...p, { id: Date.now().toString(), vendor: '', amount: '', score: '', notes: '' }]);
  const removeBid = (id: string) => setBids(p => p.filter(b => b.id !== id));
  const setBid = (id: string, patch: Partial<Bid>) => setBids(p => p.map(b => b.id === id ? { ...b, ...patch } : b));

  const isValid = bids.length > 0 && bids.every(b => b.vendor.trim().length > 0) && winner.trim().length > 0 && justification.trim().length > 5;

  const handleSubmit = async () => {
    if (!user || !activeTenantId || !isValid) return;
    setLoading(true); setError('');
    try {
      const bidsText = bids.map(b => `${b.vendor}: ${b.amount} ${currency} | Ocena: ${b.score}/10 | ${b.notes}`).join('\n');
      const docId = await createDocumentInstance(
        activeTenantId, user.uid, user.email ?? '',
        'BID_EVALUATION', 'default-bid-evaluation',
        {
          title: `Ocena ofert${rfqNumber ? ` – RFQ ${rfqNumber}` : ''}`,
          vendor: winner,
          invoiceDate: new Date().toISOString().split('T')[0],
          description: `Nr RFQ: ${rfqNumber}\nWybrano: ${winner}\n\nOferty:\n${bidsText}\n\nUzasadnienie wyboru:\n${justification}`,
        },
        [], currentCompany?.id
      );
      await transitionDocument(activeTenantId, docId, 'SUBMIT', user.uid, user.email ?? '', 'PENDING_APPROVAL', {
        stepDefId: 'step-submit', stepType: 'APPROVAL', note: `Ocena ${bids.length} ofert — rekomendacja: ${winner}.`,
      });
      onComplete(docId);
    } catch (e: any) { setError(e.message ?? 'Błąd podczas wysyłania.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center"><Scale size={18} className="text-amber-600" /></div>
        <div>
          <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">BID EVALUATION</span>
          <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 leading-none">Ocena Ofert</h3>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nr RFQ (opcjonalnie)"><input value={rfqNumber} onChange={e => setRfqNumber(e.target.value)} placeholder="RFQ/2026/05/001" className={INPUT} /></Field>
          <Field label="Waluta">
            <select value={currency} onChange={e => setCurrency(e.target.value)} className={INPUT}>
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Oferty dostawców *">
          <div className="space-y-2">
            <div className="grid grid-cols-[2fr_1fr_60px_1fr_20px] gap-2 px-1">
              {['Dostawca', 'Kwota', 'Ocena', 'Uwagi', ''].map(h => (
                <span key={h} className="text-[8px] font-black text-slate-400 uppercase">{h}</span>
              ))}
            </div>
            {bids.map(bid => (
              <div key={bid.id} className="grid grid-cols-[2fr_1fr_60px_1fr_20px] gap-2 items-center">
                <input value={bid.vendor} onChange={e => setBid(bid.id, { vendor: e.target.value })} placeholder="Nazwa dostawcy" className={INPUT} />
                <input type="number" min="0" value={bid.amount} onChange={e => setBid(bid.id, { amount: e.target.value })} placeholder="0.00" className={INPUT} />
                <input type="number" min="0" max="10" value={bid.score} onChange={e => setBid(bid.id, { score: e.target.value })} placeholder="0-10" className={INPUT + ' text-center'} />
                <input value={bid.notes} onChange={e => setBid(bid.id, { notes: e.target.value })} placeholder="Komentarz" className={INPUT} />
                {bids.length > 1 && <button onClick={() => removeBid(bid.id)} className="text-rose-400 hover:text-rose-600"><Trash2 size={14} /></button>}
              </div>
            ))}
            <button onClick={addBid} className="flex items-center gap-2 text-amber-600 text-xs font-black uppercase hover:underline"><Plus size={12} />Dodaj ofertę</button>
          </div>
        </Field>

        <Field label="Rekomendowany dostawca *"><input value={winner} onChange={e => setWinner(e.target.value)} placeholder="Nazwa wybranego dostawcy" className={INPUT} /></Field>
        <Field label="Uzasadnienie wyboru * (min. 5 znaków)"><textarea value={justification} onChange={e => setJustification(e.target.value)} rows={3} placeholder="Najlepsza relacja ceny do jakości, referencje, termin dostawy..." className={INPUT + ' resize-none'} /></Field>
      </div>

      {error && <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-2xl px-4 py-3 text-xs font-bold"><AlertTriangle size={13} />{error}</div>}

      <div className="flex gap-3">
        <button onClick={onCancel} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 text-slate-600 text-xs font-black uppercase hover:bg-slate-200 transition-all"><ArrowLeft size={13} />Anuluj</button>
        <button onClick={handleSubmit} disabled={loading || !isValid} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-amber-600 text-white text-xs font-black uppercase hover:bg-amber-700 disabled:opacity-40 transition-all">
          {loading ? 'Wysyłanie...' : <><Check size={13} />Wyślij do zatwierdzenia</>}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>{children}</div>;
}
