import React, { useEffect, useState } from 'react';
import { useAuth } from '../../shared/hooks/AuthContext';
import { getDebtCases, updateDebtStage, addContactAttempt } from './services/debtService';
import { DebtCase, DebtStage, ContactMethod, ContactOutcome } from './types';
import { Scale, DollarSign, AlertTriangle, TrendingDown, X, Plus, Phone } from 'lucide-react';
import { serverTimestamp } from 'firebase/firestore';

const STAGE_META: Record<DebtStage, { label: string; color: string }> = {
  SOFT_REMINDER:  { label: 'Miękkie przypomnienie', color: 'bg-yellow-100 text-yellow-700' },
  FORMAL_DEMAND:  { label: 'Wezwanie formalne',      color: 'bg-orange-100 text-orange-700' },
  PRE_LEGAL:      { label: 'Przedsądowe',            color: 'bg-red-100 text-red-700' },
  LEGAL:          { label: 'Sądowe',                 color: 'bg-red-200 text-red-800' },
  WRITE_OFF:      { label: 'Umorzenie',              color: 'bg-gray-100 text-gray-600' },
  SETTLED:        { label: 'Spłacona',               color: 'bg-emerald-100 text-emerald-700' },
};

const METHODS: ContactMethod[] = ['EMAIL', 'PHONE', 'REGISTERED_MAIL', 'BAILIFF'];
const OUTCOMES: ContactOutcome[] = ['NO_RESPONSE', 'PROMISE_TO_PAY', 'DISPUTED', 'PARTIAL_PAYMENT', 'FULL_PAYMENT'];
const METHOD_LABEL: Record<ContactMethod, string>  = { EMAIL: 'E-mail', PHONE: 'Telefon', REGISTERED_MAIL: 'List polecony', BAILIFF: 'Komornik' };
const OUTCOME_LABEL: Record<ContactOutcome, string> = { NO_RESPONSE: 'Brak odpowiedzi', PROMISE_TO_PAY: 'Obietnica zapłaty', DISPUTED: 'Sporne', PARTIAL_PAYMENT: 'Częściowa płatność', FULL_PAYMENT: 'Pełna płatność' };

const dpdColor = (dpd: number) =>
  dpd > 90 ? 'text-red-700 font-bold' : dpd > 30 ? 'text-orange-600 font-semibold' : 'text-amber-600';

export default function DebtCollectionModule() {
  const { activeTenantId, currentUser } = useAuth() as any;
  const [cases,       setCases]       = useState<DebtCase[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [stageFilter, setStageFilter] = useState<DebtStage | 'ALL'>('ALL');
  const [selected,    setSelected]    = useState<DebtCase | null>(null);

  // Contact form state
  const [method,  setMethod]  = useState<ContactMethod>('PHONE');
  const [outcome, setOutcome] = useState<ContactOutcome>('NO_RESPONSE');
  const [note,    setNote]    = useState('');
  const [adding,  setAdding]  = useState(false);

  const reload = async () => {
    if (!activeTenantId) return;
    setLoading(true);
    const data = await getDebtCases(activeTenantId, stageFilter === 'ALL' ? undefined : stageFilter)
      .finally(() => setLoading(false));
    setCases(data);
    if (selected) {
      const fresh = data.find(c => c.id === selected.id);
      if (fresh) setSelected(fresh);
    }
  };

  useEffect(() => { reload(); }, [activeTenantId, stageFilter]);

  const active      = cases.filter(c => c.stage !== 'SETTLED' && c.stage !== 'WRITE_OFF');
  const outstanding = active.reduce((s, c) => s + c.outstandingAmount, 0);
  const critical    = active.filter(c => c.dpd > 90).length;

  const changeStage = async (newStage: DebtStage) => {
    if (!selected || !activeTenantId) return;
    await updateDebtStage(activeTenantId, selected.id, newStage);
    await reload();
  };

  const submitContact = async () => {
    if (!selected || !activeTenantId) return;
    setAdding(true);
    try {
      await addContactAttempt(activeTenantId, selected.id, {
        method,
        outcome,
        note,
        date:        serverTimestamp() as any,
        performedBy: currentUser?.uid ?? 'unknown',
      });
      setNote('');
      await reload();
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Scale className="w-7 h-7 text-rose-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Windykacja</h1>
          <p className="text-sm text-gray-500">Należności przeterminowane i sprawy windykacyjne</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Łączne zaległości',   value: `${outstanding.toLocaleString('pl-PL', { maximumFractionDigits: 0 })} PLN`, Icon: DollarSign,    color: 'rose' },
          { label: 'Spraw aktywnych',     value: active.length,                                                                Icon: TrendingDown,  color: 'indigo' },
          { label: 'Krytyczne (>90 DPD)', value: critical,                                                                    Icon: AlertTriangle, color: 'red' },
        ].map(({ label, value, Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 text-${color}-500`} />
              <span className="text-xs text-gray-500 font-medium">{label}</span>
            </div>
            <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600 font-medium">Etap:</label>
        <select
          value={stageFilter}
          onChange={e => setStageFilter(e.target.value as DebtStage | 'ALL')}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5"
        >
          <option value="ALL">Wszystkie</option>
          {(Object.keys(STAGE_META) as DebtStage[]).map(s => (
            <option key={s} value={s}>{STAGE_META[s].label}</option>
          ))}
        </select>
      </div>

      {/* Lista spraw */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-6 py-3 text-left">Klient</th>
              <th className="px-6 py-3 text-left">Nr faktury</th>
              <th className="px-6 py-3 text-right">Zaległość</th>
              <th className="px-6 py-3 text-right">DPD</th>
              <th className="px-6 py-3 text-left">Etap</th>
              <th className="px-6 py-3 text-right">Kontakty</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">Ładowanie…</td></tr>}
            {!loading && !cases.length && <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">Brak spraw windykacyjnych</td></tr>}
            {cases.map(c => (
              <tr
                key={c.id}
                onClick={() => setSelected(c)}
                className={`hover:bg-indigo-50 cursor-pointer transition-colors ${selected?.id === c.id ? 'bg-indigo-50' : ''}`}
              >
                <td className="px-6 py-4 font-medium text-gray-900">{c.customerName}</td>
                <td className="px-6 py-4 font-mono text-sm text-gray-600">{c.invoiceNumber}</td>
                <td className="px-6 py-4 text-right font-bold text-rose-600">
                  {c.outstandingAmount.toLocaleString('pl-PL', { maximumFractionDigits: 2 })} {c.currency}
                </td>
                <td className={`px-6 py-4 text-right ${dpdColor(c.dpd)}`}>{c.dpd}d</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${STAGE_META[c.stage].color}`}>
                    {STAGE_META[c.stage].label}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-gray-500">{c.contactAttempts.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Panel szczegółów */}
      {selected && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{selected.customerName}</h2>
              <p className="text-sm text-gray-500">
                Faktura: <span className="font-mono">{selected.invoiceNumber}</span>
                {' · '}Zaległość: <span className="font-bold text-rose-600">{selected.outstandingAmount.toLocaleString('pl-PL', { maximumFractionDigits: 2 })} {selected.currency}</span>
                {' · '}DPD: <span className={dpdColor(selected.dpd)}>{selected.dpd}d</span>
              </p>
            </div>
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-700">
              <X size={20} />
            </button>
          </div>

          {/* Zmiana etapu */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Zmień etap</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(STAGE_META) as DebtStage[]).map(s => (
                <button
                  key={s}
                  onClick={() => changeStage(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                    selected.stage === s
                      ? `${STAGE_META[s].color} border-transparent ring-2 ring-indigo-400`
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {STAGE_META[s].label}
                </button>
              ))}
            </div>
          </div>

          {/* Historia kontaktów */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
              Historia kontaktów ({selected.contactAttempts.length})
            </p>
            {selected.contactAttempts.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Brak prób kontaktu</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {[...selected.contactAttempts].reverse().map(a => (
                  <div key={a.id} className="flex items-start gap-3 bg-gray-50 rounded-lg p-3 text-sm">
                    <Phone size={14} className="text-gray-400 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <span className="font-semibold text-gray-700">{METHOD_LABEL[a.method]}</span>
                      <span className="mx-1.5 text-gray-300">·</span>
                      <span className={`text-xs font-medium ${a.outcome === 'FULL_PAYMENT' ? 'text-emerald-600' : a.outcome === 'NO_RESPONSE' ? 'text-gray-500' : 'text-amber-600'}`}>
                        {OUTCOME_LABEL[a.outcome]}
                      </span>
                      {a.note && <p className="text-gray-500 text-xs mt-0.5 truncate">{a.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Formularz nowego kontaktu */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Plus size={14} /> Dodaj próbę kontaktu
            </p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[10px] font-semibold text-gray-400 uppercase block mb-1">Metoda</label>
                <select
                  value={method}
                  onChange={e => setMethod(e.target.value as ContactMethod)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
                >
                  {METHODS.map(m => <option key={m} value={m}>{METHOD_LABEL[m]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-400 uppercase block mb-1">Wynik</label>
                <select
                  value={outcome}
                  onChange={e => setOutcome(e.target.value as ContactOutcome)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
                >
                  {OUTCOMES.map(o => <option key={o} value={o}>{OUTCOME_LABEL[o]}</option>)}
                </select>
              </div>
            </div>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              placeholder="Notatka (opcjonalna)…"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-3 resize-none"
            />
            <button
              onClick={submitContact}
              disabled={adding}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
            >
              <Plus size={14} />
              {adding ? 'Zapisuję…' : 'Zapisz kontakt'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
