/**
 * Data: 2026-05-15
 * Zmiany: Moduł Środków Trwałych z amortyzacją, AI review i real-time Firestore.
 * Sciezka: /src/modules/finance/assets/AssetsModule.tsx
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  Laptop, Car, Building2, Wrench, Brain, Package,
  Plus, ChevronDown, ChevronUp, Sparkles, Loader2,
  TrendingDown, Calendar, DollarSign, Archive, X,
  AlertCircle, CheckCircle2, BarChart3, Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  collection, onSnapshot, doc, addDoc, updateDoc,
  query, where, orderBy, serverTimestamp, getDocs
} from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import useTenant from '../../../shared/hooks/useTenant';
import { askAI } from '../../../shared/services/geminiService';
import IdesGenerateButton from '../../../shared/components/IdesGenerateButton';

interface FixedAsset {
  id?: string;
  tenantId: string;
  name: string;
  category: 'computers' | 'vehicles' | 'property' | 'equipment' | 'intangible' | 'other';
  description?: string;
  purchaseDate: string;
  cost: number;
  residualValue: number;
  usefulLifeMonths: number;
  depreciationMethod: 'SL' | 'DB';
  monthlyDepreciation?: number;
  currentBookValue: number;
  totalDepreciated: number;
  isFullyDepreciated: boolean;
  isDisposed: boolean;
  disposedAt?: string;
  costCenterId?: string;
  invoiceId?: string;
  aiNote?: string;
  createdBy: string;
  createdAt: any;
  updatedAt: any;
}

type FilterTab = 'all' | 'computers' | 'vehicles' | 'equipment' | 'other';

const CATEGORY_LABELS: Record<FixedAsset['category'], string> = {
  computers: 'Komputery & IT',
  vehicles: 'Pojazdy',
  property: 'Nieruchomosci',
  equipment: 'Wyposazenie',
  intangible: 'Wartosci Niematerialne',
  other: 'Inne',
};

const CATEGORY_COLORS: Record<FixedAsset['category'], string> = {
  computers: 'bg-blue-100 text-blue-700',
  vehicles: 'bg-green-100 text-green-700',
  property: 'bg-amber-100 text-amber-700',
  equipment: 'bg-purple-100 text-purple-700',
  intangible: 'bg-pink-100 text-pink-700',
  other: 'bg-slate-100 text-slate-600',
};

function CategoryIcon({ category, size = 18 }: { category: FixedAsset['category']; size?: number }) {
  switch (category) {
    case 'computers': return <Laptop size={size} />;
    case 'vehicles': return <Car size={size} />;
    case 'property': return <Building2 size={size} />;
    case 'equipment': return <Wrench size={size} />;
    case 'intangible': return <Brain size={size} />;
    default: return <Package size={size} />;
  }
}

function calcMonthly(cost: number, residual: number, life: number, method: 'SL' | 'DB'): number {
  if (method === 'SL') return Math.max(0, (cost - residual) / life);
  return Math.max(0, (2 / life) * cost);
}

const fmt = (n: number) =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(n);

const emptyForm = {
  name: '',
  category: 'computers' as FixedAsset['category'],
  description: '',
  purchaseDate: new Date().toISOString().slice(0, 10),
  cost: '',
  residualValue: '',
  usefulLifeMonths: '',
  depreciationMethod: 'SL' as 'SL' | 'DB',
};

export default function AssetsModule() {
  const { activeTenantId } = useTenant();
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [depreciating, setDepreciating] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiLoadingId, setAiLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeTenantId) return;
    const q = query(
      collection(db, `tenants/${activeTenantId}/fixedAssets`),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      setAssets(snap.docs.map(d => ({ id: d.id, ...d.data() } as FixedAsset)));
      setLoading(false);
    });
    return unsub;
  }, [activeTenantId]);

  const activeAssets = useMemo(() => assets.filter(a => !a.isDisposed), [assets]);

  const stats = useMemo(() => ({
    totalBookValue: activeAssets.reduce((s, a) => s + a.currentBookValue, 0),
    fullyDepreciated: activeAssets.filter(a => a.isFullyDepreciated).length,
    annualDepreciation: activeAssets.reduce((s, a) => s + (a.monthlyDepreciation ?? 0) * 12, 0),
    activeCount: activeAssets.filter(a => !a.isFullyDepreciated).length,
  }), [activeAssets]);

  const filtered = useMemo(() => {
    if (filterTab === 'all') return assets.filter(a => !a.isDisposed);
    if (filterTab === 'computers') return assets.filter(a => !a.isDisposed && a.category === 'computers');
    if (filterTab === 'vehicles') return assets.filter(a => !a.isDisposed && a.category === 'vehicles');
    if (filterTab === 'equipment') return assets.filter(a => !a.isDisposed && a.category === 'equipment');
    return assets.filter(a => !a.isDisposed && !['computers', 'vehicles', 'equipment'].includes(a.category));
  }, [assets, filterTab]);

  const filterTabs: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'Wszystkie' },
    { id: 'computers', label: 'Komputery & IT' },
    { id: 'vehicles', label: 'Pojazdy' },
    { id: 'equipment', label: 'Wyposazenie' },
    { id: 'other', label: 'Inne' },
  ];

  async function handleAdd() {
    if (!activeTenantId || !form.name || !form.cost || !form.usefulLifeMonths) return;
    setSaving(true);
    const cost = parseFloat(form.cost as string);
    const residual = parseFloat(form.residualValue as string) || 0;
    const life = parseInt(form.usefulLifeMonths as string, 10);
    const monthly = calcMonthly(cost, residual, life, form.depreciationMethod);
    const asset: Omit<FixedAsset, 'id'> = {
      tenantId: activeTenantId,
      name: form.name,
      category: form.category,
      description: form.description || undefined,
      purchaseDate: form.purchaseDate,
      cost,
      residualValue: residual,
      usefulLifeMonths: life,
      depreciationMethod: form.depreciationMethod,
      monthlyDepreciation: monthly,
      currentBookValue: cost,
      totalDepreciated: 0,
      isFullyDepreciated: false,
      isDisposed: false,
      createdBy: 'user',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await addDoc(collection(db, `tenants/${activeTenantId}/fixedAssets`), asset);
    setForm(emptyForm);
    setShowModal(false);
    setSaving(false);
  }

  async function handleDepreciate() {
    if (!activeTenantId) return;
    setDepreciating(true);
    const toDepreciate = activeAssets.filter(a => !a.isFullyDepreciated && (a.monthlyDepreciation ?? 0) > 0);
    await Promise.all(toDepreciate.map(async a => {
      const totalDep = Math.min(a.totalDepreciated + (a.monthlyDepreciation ?? 0), a.cost - a.residualValue);
      const bookVal = Math.max(a.cost - totalDep, a.residualValue);
      const isFull = totalDep >= (a.cost - a.residualValue);
      await updateDoc(doc(db, `tenants/${activeTenantId}/fixedAssets`, a.id!), {
        totalDepreciated: Math.round(totalDep * 100) / 100,
        currentBookValue: Math.round(bookVal * 100) / 100,
        isFullyDepreciated: isFull,
        updatedAt: serverTimestamp(),
      });
    }));
    setDepreciating(false);
  }

  async function handleDispose(asset: FixedAsset) {
    if (!activeTenantId || !asset.id) return;
    await updateDoc(doc(db, `tenants/${activeTenantId}/fixedAssets`, asset.id), {
      isDisposed: true,
      disposedAt: new Date().toISOString().slice(0, 10),
      updatedAt: serverTimestamp(),
    });
  }

  async function handleAiNote(asset: FixedAsset) {
    if (!asset.id) return;
    setAiLoadingId(asset.id);
    const prompt = `Jestem ksiegowym w polskiej firmie. Srodek trwaly: "${asset.name}", kategoria: ${asset.category}, metoda amortyzacji: ${asset.depreciationMethod}, stawka miesieczna: ${asset.monthlyDepreciation?.toFixed(2)} PLN, wartosc poczatkowa: ${asset.cost} PLN. Czy ten srodek trwaly moze kwalifikowac sie do przyspieszonej amortyzacji lub jednorazowego odpisu zgodnie z polskim prawem podatkowym? Odpowiedz krotko po polsku.`;
    const note = await askAI(prompt);
    await updateDoc(doc(db, `tenants/${activeTenantId}/fixedAssets`, asset.id!), {
      aiNote: note,
      updatedAt: serverTimestamp(),
    });
    setAiLoadingId(null);
  }

  async function handleAiReview() {
    setAiLoading(true);
    const list = activeAssets.map(a => `- ${a.name} (${a.category}): ${fmt(a.cost)}, metoda ${a.depreciationMethod}`).join('\n');
    const prompt = `Jako doradca podatkowy w Polsce, przeanalizuj ponizsze srodki trwale i wskazaz, ktore moga kwalifikowac sie do przyspieszonej amortyzacji lub jednorazowego odpisu podatkowego wg polskich przepisow:\n${list}\nOdpowiedz po polsku, konkretnie.`;
    const result = await askAI(prompt);
    setAiResult(result);
    setAiLoading(false);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-slate-100 rounded-[2rem] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Stats header */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <Layers className="text-indigo-400" size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-100">Rejestr Srodkow Trwalych</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Wartosc Ksiegowa</p>
              <p className="text-2xl font-black text-white">{fmt(stats.totalBookValue)}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Aktywne</p>
              <p className="text-2xl font-black text-indigo-400">{stats.activeCount}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">W Pelni Zamortyzowane</p>
              <p className="text-2xl font-black text-amber-400">{stats.fullyDepreciated}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Amortyzacja Roczna</p>
              <p className="text-2xl font-black text-emerald-400">{fmt(stats.annualDepreciation)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions row */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {filterTabs.map(t => (
            <button
              key={t.id}
              onClick={() => setFilterTab(t.id)}
              className={`px-5 py-2.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${
                filterTab === t.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <IdesGenerateButton moduleKey="assets" />
          <button
            onClick={handleAiReview}
            disabled={aiLoading || activeAssets.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-[1.5rem] bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-widest border border-indigo-100 hover:bg-indigo-100 transition-all disabled:opacity-50"
          >
            {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            AI Review
          </button>
          <button
            onClick={handleDepreciate}
            disabled={depreciating || activeAssets.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-[1.5rem] bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-widest border border-amber-100 hover:bg-amber-100 transition-all disabled:opacity-50"
          >
            {depreciating ? <Loader2 size={14} className="animate-spin" /> : <TrendingDown size={14} />}
            Amortyzacja Miesiac
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-[1.5rem] bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all"
          >
            <Plus size={14} /> Dodaj Srodek Trwaly
          </button>
        </div>
      </div>

      {/* AI Review result */}
      <AnimatePresence>
        {aiResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-indigo-50 border border-indigo-100 rounded-[2rem] p-6 relative"
          >
            <button onClick={() => setAiResult(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
              <X size={16} />
            </button>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-indigo-600" />
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700">AI — Analiza Amortyzacji</span>
            </div>
            <p className="text-sm text-indigo-900 leading-relaxed whitespace-pre-line">{aiResult}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Asset list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <Layers size={32} className="text-slate-300" />
          </div>
          <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Brak srodkow trwalych</p>
          <p className="text-xs text-slate-300 mt-2">Dodaj pierwszy srodek trwaly klikajac przycisk powyzej</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(asset => {
            const depRange = asset.cost - asset.residualValue;
            const depPct = depRange > 0 ? Math.min(100, (asset.totalDepreciated / depRange) * 100) : 0;
            const monthsRemaining = asset.monthlyDepreciation && asset.monthlyDepreciation > 0
              ? Math.max(0, Math.ceil((asset.cost - asset.residualValue - asset.totalDepreciated) / asset.monthlyDepreciation))
              : 0;
            const isExpanded = expandedId === asset.id;

            return (
              <motion.div
                key={asset.id}
                layout
                className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden hover:shadow-md transition-all"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-[1rem] flex items-center justify-center text-slate-600">
                        <CategoryIcon category={asset.category} />
                      </div>
                      <div>
                        <p className="font-black text-slate-900 text-sm leading-tight">{asset.name}</p>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${CATEGORY_COLORS[asset.category]}`}>
                          {CATEGORY_LABELS[asset.category]}
                        </span>
                      </div>
                    </div>
                    {asset.isFullyDepreciated && (
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-1" />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Koszt nabycia</p>
                      <p className="text-sm font-black text-slate-900">{fmt(asset.cost)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Wartosc Ksiegowa</p>
                      <p className="text-sm font-black text-indigo-600">{fmt(asset.currentBookValue)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Data Zakupu</p>
                      <p className="text-xs font-bold text-slate-600">{asset.purchaseDate}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Metoda</p>
                      <p className="text-xs font-bold text-slate-600">{asset.depreciationMethod === 'SL' ? 'Liniowa' : 'Malejaca'}</p>
                    </div>
                  </div>

                  {/* Depreciation progress */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Amortyzacja</p>
                      <p className="text-[9px] font-black text-slate-600">{depPct.toFixed(0)}%</p>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${depPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : (asset.id ?? null))}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[1rem] bg-slate-50 text-slate-600 text-[9px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                    >
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      {isExpanded ? 'Zwiń' : 'Szczegoly'}
                    </button>
                    <button
                      onClick={() => handleDispose(asset)}
                      className="px-3 py-2 rounded-[1rem] bg-red-50 text-red-500 text-[9px] font-black uppercase tracking-widest hover:bg-red-100 transition-all"
                    >
                      <Archive size={12} />
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-100 overflow-hidden"
                    >
                      <div className="p-6 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Amortyzacja/mies</p>
                            <p className="text-sm font-black text-amber-600">{fmt(asset.monthlyDepreciation ?? 0)}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Pozostalo Mies.</p>
                            <p className="text-sm font-black text-slate-700">{asset.isFullyDepreciated ? '—' : monthsRemaining}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Lacznie Zamortyzowano</p>
                            <p className="text-sm font-black text-slate-700">{fmt(asset.totalDepreciated)}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Wartosc Rezydualna</p>
                            <p className="text-sm font-black text-slate-700">{fmt(asset.residualValue)}</p>
                          </div>
                        </div>
                        {asset.description && (
                          <p className="text-xs text-slate-500 leading-relaxed">{asset.description}</p>
                        )}
                        {asset.aiNote ? (
                          <div className="bg-indigo-50 rounded-[1rem] p-3">
                            <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600 mb-1">AI Insight</p>
                            <p className="text-xs text-indigo-800">{asset.aiNote}</p>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAiNote(asset)}
                            disabled={aiLoadingId === asset.id}
                            className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 transition-all disabled:opacity-50"
                          >
                            {aiLoadingId === asset.id ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                            Zapytaj AI o amortyzacje
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black uppercase tracking-tighter italic text-slate-900">Nowy Srodek Trwaly</h2>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Nazwa</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full border border-slate-200 rounded-[1rem] px-4 py-3 text-sm font-medium focus:outline-none focus:border-indigo-400"
                    placeholder="np. Laptop Dell XPS 15"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Kategoria</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value as FixedAsset['category'] }))}
                    className="w-full border border-slate-200 rounded-[1rem] px-4 py-3 text-sm font-medium focus:outline-none focus:border-indigo-400 bg-white"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Data Zakupu</label>
                    <input
                      type="date"
                      value={form.purchaseDate}
                      onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))}
                      className="w-full border border-slate-200 rounded-[1rem] px-4 py-3 text-sm font-medium focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Metoda Amort.</label>
                    <select
                      value={form.depreciationMethod}
                      onChange={e => setForm(f => ({ ...f, depreciationMethod: e.target.value as 'SL' | 'DB' }))}
                      className="w-full border border-slate-200 rounded-[1rem] px-4 py-3 text-sm font-medium focus:outline-none focus:border-indigo-400 bg-white"
                    >
                      <option value="SL">Liniowa (SL)</option>
                      <option value="DB">Malejaca (DB)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Koszt (PLN)</label>
                    <input
                      type="number"
                      value={form.cost}
                      onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
                      className="w-full border border-slate-200 rounded-[1rem] px-4 py-3 text-sm font-medium focus:outline-none focus:border-indigo-400"
                      placeholder="10000"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Wartosc Rez. (PLN)</label>
                    <input
                      type="number"
                      value={form.residualValue}
                      onChange={e => setForm(f => ({ ...f, residualValue: e.target.value }))}
                      className="w-full border border-slate-200 rounded-[1rem] px-4 py-3 text-sm font-medium focus:outline-none focus:border-indigo-400"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Zywotn. (mies.)</label>
                    <input
                      type="number"
                      value={form.usefulLifeMonths}
                      onChange={e => setForm(f => ({ ...f, usefulLifeMonths: e.target.value }))}
                      className="w-full border border-slate-200 rounded-[1rem] px-4 py-3 text-sm font-medium focus:outline-none focus:border-indigo-400"
                      placeholder="60"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Opis (opcjonalny)</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={2}
                    className="w-full border border-slate-200 rounded-[1rem] px-4 py-3 text-sm font-medium focus:outline-none focus:border-indigo-400 resize-none"
                    placeholder="Dodatkowy opis..."
                  />
                </div>

                {form.cost && form.usefulLifeMonths && (
                  <div className="bg-indigo-50 rounded-[1rem] p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600 mb-1">Podglad amortyzacji</p>
                    <p className="text-sm font-black text-indigo-800">
                      {fmt(calcMonthly(
                        parseFloat(form.cost as string) || 0,
                        parseFloat(form.residualValue as string) || 0,
                        parseInt(form.usefulLifeMonths as string, 10) || 1,
                        form.depreciationMethod
                      ))}/mies.
                    </p>
                  </div>
                )}

                <button
                  onClick={handleAdd}
                  disabled={saving || !form.name || !form.cost || !form.usefulLifeMonths}
                  className="w-full bg-indigo-600 text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-[1.5rem] hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Dodaj Srodek Trwaly
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
