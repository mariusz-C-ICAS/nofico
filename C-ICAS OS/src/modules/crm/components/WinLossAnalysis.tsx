import React, { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, RefreshCw, TrendingUp, TrendingDown, BarChart2, AlertTriangle } from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

interface Props { tenantId: string }

interface Deal {
  id: string;
  name: string;
  value: number;
  stage: string;
  lossReason?: string;
  winReason?: string;
  closedAt?: any;
  updatedAt?: any;
  owner?: string;
  customer?: string;
}

const LOSS_REASONS = [
  'Cena zbyt wysoka', 'Wybrali konkurencję', 'Brak budżetu', 'Zły timing',
  'Produkt nie spełnia wymagań', 'Brak decyzji', 'Projekt odwołany', 'Inne',
];
const WIN_REASONS = [
  'Najlepsza cena', 'Relacja z klientem', 'Szybka reakcja', 'Lepsza oferta techniczna',
  'Referencje', 'Demo / PoC', 'Rekomendacja', 'Inne',
];

function fmtDate(ts: any): string {
  const d = ts?.toDate?.() ?? (ts ? new Date(ts) : null);
  if (!d) return '—';
  return d.toLocaleDateString('pl-PL');
}

function groupBy<T>(arr: T[], key: (x: T) => string): Record<string, T[]> {
  return arr.reduce((acc, x) => {
    const k = key(x);
    acc[k] = [...(acc[k] ?? []), x];
    return acc;
  }, {} as Record<string, T[]>);
}

export default function WinLossAnalysis({ tenantId }: Props) {
  const [won, setWon] = useState<Deal[]>([]);
  const [lost, setLost] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<30 | 90 | 180 | 365>(90);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [editReason, setEditReason] = useState('');
  const [editCustom, setEditCustom] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const cutoff = new Date(Date.now() - period * 86400000);
    const snap = await getDocs(query(collection(db, 'deals'), where('tenantId', '==', tenantId)));
    const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Deal));
    const inPeriod = all.filter(d => {
      const dt = d.closedAt?.toDate?.() ?? d.updatedAt?.toDate?.();
      return dt && dt >= cutoff;
    });
    setWon(inPeriod.filter(d => d.stage === 'closed_won'));
    setLost(inPeriod.filter(d => d.stage === 'closed_lost'));
    setLoading(false);
  };

  useEffect(() => { load(); }, [tenantId, period]);

  const openEdit = (deal: Deal, type: 'win' | 'loss') => {
    setEditingDeal({ ...deal, _type: type } as any);
    const reason = type === 'win' ? deal.winReason : deal.lossReason;
    const isCustom = reason && ![...LOSS_REASONS, ...WIN_REASONS].includes(reason);
    setEditReason(isCustom ? 'Inne' : (reason ?? ''));
    setEditCustom(isCustom ? (reason ?? '') : '');
  };

  const handleSaveReason = async () => {
    if (!editingDeal) return;
    setSaving(true);
    const type = (editingDeal as any)._type as 'win' | 'loss';
    const finalReason = editReason === 'Inne' ? editCustom : editReason;
    const field = type === 'win' ? 'winReason' : 'lossReason';
    await updateDoc(doc(db, 'deals', editingDeal.id), { [field]: finalReason });
    setEditingDeal(null);
    await load();
    setSaving(false);
  };

  const fmt = (n: number) => n.toLocaleString('pl-PL', { maximumFractionDigits: 0 });
  const total = won.length + lost.length;
  const winRate = total > 0 ? Math.round((won.length / total) * 100) : 0;
  const totalWonValue = won.reduce((s, d) => s + (d.value ?? 0), 0);
  const totalLostValue = lost.reduce((s, d) => s + (d.value ?? 0), 0);

  const lossReasonGroups = groupBy(lost.filter(d => d.lossReason), d => d.lossReason!);
  const winReasonGroups = groupBy(won.filter(d => d.winReason), d => d.winReason!);

  const topLoss = Object.entries(lossReasonGroups).sort((a, b) => b[1].length - a[1].length);
  const topWin = Object.entries(winReasonGroups).sort((a, b) => b[1].length - a[1].length);

  if (loading) return <div className="flex justify-center py-20"><RefreshCw size={20} className="animate-spin text-indigo-400" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Win/Loss Analysis</h3>
          <p className="text-xs text-slate-500 mt-0.5">{total} dealów zamkniętych w wybranym okresie</p>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {([30, 90, 180, 365] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${period === p ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}>
              {p === 365 ? '1 rok' : `${p}d`}
            </button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Win Rate', value: winRate + '%', icon: TrendingUp, color: winRate >= 50 ? 'text-emerald-700' : 'text-amber-700', bg: winRate >= 50 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200' },
          { label: 'Wygrane deale', value: String(won.length), icon: ThumbsUp, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
          { label: 'Przegrane deale', value: String(lost.length), icon: ThumbsDown, color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
          { label: 'Wartość wygranych', value: fmt(totalWonValue) + ' PLN', icon: BarChart2, color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
        ].map(k => (
          <div key={k.label} className={`rounded-2xl border p-5 ${k.bg}`}>
            <k.icon size={16} className={`${k.color} mb-2`} />
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{k.label}</p>
            <p className={`text-2xl font-black mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Win rate bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Podział wartości pipeline</p>
        <div className="h-5 rounded-full overflow-hidden flex">
          {totalWonValue + totalLostValue > 0 ? (
            <>
              <div className="bg-emerald-500 h-full transition-all" style={{ width: `${(totalWonValue / (totalWonValue + totalLostValue)) * 100}%` }} />
              <div className="bg-red-400 h-full flex-1" />
            </>
          ) : (
            <div className="bg-slate-100 h-full w-full" />
          )}
        </div>
        <div className="flex justify-between mt-2 text-[9px] font-black">
          <span className="text-emerald-700">Wygrane: {fmt(totalWonValue)} PLN</span>
          <span className="text-red-600">Stracone: {fmt(totalLostValue)} PLN</span>
        </div>
      </div>

      {/* Reason analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Loss reasons */}
        <div className="bg-white rounded-2xl border border-red-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <ThumbsDown size={14} className="text-red-600" />
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Powody przegranych</p>
          </div>
          {topLoss.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Brak danych — oznacz powody przegranych poniżej</p>
          ) : (
            <div className="space-y-2">
              {topLoss.map(([reason, deals]) => (
                <div key={reason}>
                  <div className="flex justify-between text-[10px] font-black text-slate-700 mb-0.5">
                    <span>{reason}</span>
                    <span>{deals.length}×</span>
                  </div>
                  <div className="h-2 bg-red-50 rounded-full overflow-hidden">
                    <div className="h-full bg-red-400 rounded-full" style={{ width: `${(deals.length / lost.length) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          {lost.filter(d => !d.lossReason).length > 0 && (
            <p className="text-[9px] text-amber-600 mt-3 flex items-center gap-1">
              <AlertTriangle size={10} /> {lost.filter(d => !d.lossReason).length} dealów bez powodu
            </p>
          )}
        </div>

        {/* Win reasons */}
        <div className="bg-white rounded-2xl border border-emerald-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <ThumbsUp size={14} className="text-emerald-600" />
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Powody wygranych</p>
          </div>
          {topWin.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Brak danych — oznacz powody wygranych poniżej</p>
          ) : (
            <div className="space-y-2">
              {topWin.map(([reason, deals]) => (
                <div key={reason}>
                  <div className="flex justify-between text-[10px] font-black text-slate-700 mb-0.5">
                    <span>{reason}</span>
                    <span>{deals.length}×</span>
                  </div>
                  <div className="h-2 bg-emerald-50 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(deals.length / won.length) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Deal lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lost deals */}
        <div className="space-y-2">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <ThumbsDown size={11} className="text-red-500" /> Przegrane dealów
          </p>
          {lost.slice(0, 10).map(d => (
            <div key={d.id} className="bg-white rounded-xl border border-red-100 px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-slate-900 truncate">{d.name || d.customer || 'Deal'}</p>
                <p className="text-[9px] text-slate-400">{fmtDate(d.closedAt ?? d.updatedAt)} · {fmt(d.value ?? 0)} PLN</p>
                {d.lossReason && <span className="text-[9px] bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-black">{d.lossReason}</span>}
              </div>
              <button onClick={() => openEdit(d, 'loss')}
                className="text-[9px] font-black text-slate-500 hover:text-red-600 bg-slate-100 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap">
                {d.lossReason ? 'Zmień' : 'Dodaj powód'}
              </button>
            </div>
          ))}
        </div>

        {/* Won deals */}
        <div className="space-y-2">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <ThumbsUp size={11} className="text-emerald-500" /> Wygrane dealów
          </p>
          {won.slice(0, 10).map(d => (
            <div key={d.id} className="bg-white rounded-xl border border-emerald-100 px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-slate-900 truncate">{d.name || d.customer || 'Deal'}</p>
                <p className="text-[9px] text-slate-400">{fmtDate(d.closedAt ?? d.updatedAt)} · {fmt(d.value ?? 0)} PLN</p>
                {d.winReason && <span className="text-[9px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-black">{d.winReason}</span>}
              </div>
              <button onClick={() => openEdit(d, 'win')}
                className="text-[9px] font-black text-slate-500 hover:text-emerald-600 bg-slate-100 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap">
                {d.winReason ? 'Zmień' : 'Dodaj powód'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Edit reason modal */}
      {editingDeal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setEditingDeal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-tighter">
              {(editingDeal as any)._type === 'win' ? 'Powód wygranej' : 'Powód przegranej'}
            </h4>
            <p className="text-xs text-slate-500">{editingDeal.name || editingDeal.customer}</p>
            <div className="flex flex-wrap gap-2">
              {((editingDeal as any)._type === 'win' ? WIN_REASONS : LOSS_REASONS).map(r => (
                <button key={r} onClick={() => setEditReason(r)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all ${editReason === r ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {r}
                </button>
              ))}
            </div>
            {editReason === 'Inne' && (
              <input value={editCustom} onChange={e => setEditCustom(e.target.value)}
                placeholder="Opisz powód..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
            )}
            <div className="flex gap-3">
              <button onClick={() => setEditingDeal(null)} className="flex-1 border border-slate-200 text-slate-500 font-black text-xs py-3 rounded-xl">Anuluj</button>
              <button onClick={handleSaveReason} disabled={!editReason || saving}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-black text-xs py-3 rounded-xl flex items-center justify-center gap-2">
                {saving && <RefreshCw size={11} className="animate-spin" />} Zapisz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
