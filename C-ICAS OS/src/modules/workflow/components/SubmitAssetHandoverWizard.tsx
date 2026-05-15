import React, { useState } from 'react';
import { Package, CheckCircle2, AlertTriangle, ArrowRightLeft } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { createDocumentInstance, transitionDocument } from '../services/workflowEngine';

interface Props { onComplete: (docId: string) => void; onCancel: () => void; }
type Step = 'asset' | 'handover' | 'review';
type HandoverType = 'issued' | 'returned' | 'transferred';
type AssetType = 'laptop' | 'phone' | 'car' | 'key' | 'card' | 'tool' | 'server' | 'monitor' | 'tablet' | 'other';

const ASSET_LABELS: Record<AssetType, string> = {
  laptop: 'Laptop / Komputer', phone: 'Telefon służbowy', car: 'Pojazd służbowy',
  key: 'Klucze / dostępy', card: 'Karta płatnicza / paliwowa', tool: 'Narzędzie / sprzęt',
  server: 'Serwer / sprzęt IT', monitor: 'Monitor / peryferiale', tablet: 'Tablet', other: 'Inne',
};

const HANDOVER_META: Record<HandoverType, { label: string; desc: string; color: string }> = {
  issued: { label: 'Wydanie', desc: 'Przekazanie sprzętu pracownikowi', color: 'bg-emerald-50 border-emerald-300 text-emerald-700' },
  returned: { label: 'Zwrot', desc: 'Pracownik zwraca sprzęt firmie', color: 'bg-amber-50 border-amber-300 text-amber-700' },
  transferred: { label: 'Przekazanie', desc: 'Między pracownikami / działami', color: 'bg-blue-50 border-blue-300 text-blue-700' },
};

const CONDITIONS = ['Nowy', 'Bardzo dobry', 'Dobry', 'Zadowalający', 'Uszkodzony — opis w uwagach'];

export default function SubmitAssetHandoverWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const [step, setStep] = useState<Step>('asset');
  const [assetType, setAssetType] = useState<AssetType>('laptop');
  const [assetId, setAssetId] = useState('');
  const [assetName, setAssetName] = useState('');
  const [assetSerial, setAssetSerial] = useState('');
  const [handoverType, setHandoverType] = useState<HandoverType>('issued');
  const [employeeName, setEmployeeName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [condition, setCondition] = useState(CONDITIONS[1]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const order: Step[] = ['asset', 'handover', 'review'];
  const stepIndex = order.indexOf(step);

  const canProceed = () => {
    if (step === 'asset') return assetName.trim().length > 0;
    if (step === 'handover') return employeeName.trim().length > 0;
    return true;
  };

  const handleSubmit = async () => {
    if (!user || !activeTenantId) return;
    setLoading(true); setError('');
    try {
      const actionLabel = HANDOVER_META[handoverType].label;
      const title = `${actionLabel} — ${ASSET_LABELS[assetType]}: ${assetName.trim()} → ${employeeName.trim()}`;
      const docId = await createDocumentInstance(activeTenantId, user.uid, user.email ?? '', 'ASSET_HANDOVER', 'default-asset-handover', {
        title,
        assetType: ASSET_LABELS[assetType],
        assetId: assetId.trim() || undefined,
        assetSerialNumber: assetSerial.trim() || undefined,
        handoverType,
        handoverEmployeeName: employeeName.trim(),
        handoverEmployeeId: employeeId.trim() || undefined,
        assetCondition: condition,
        description: notes.trim() || undefined,
      });
      await transitionDocument(activeTenantId, docId, 'SUBMIT', user.uid, user.email ?? '', 'PENDING_APPROVAL',
        { stepType: 'APPROVAL', note: `${actionLabel} sprzętu: ${assetName}. Odbiorca: ${employeeName}. Stan: ${condition}.` });
      onComplete(docId);
    } catch (e: any) { setError(e.message ?? 'Błąd wysyłania.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div>
        <button onClick={onCancel} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 mb-4 block">← Anuluj</button>
        <div className="flex items-center gap-3 mb-1">
          <Package size={20} className="text-teal-600" />
          <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Przekazanie mienia</h3>
        </div>
        <p className="text-slate-400 text-sm font-medium">Wydanie / zwrot / transfer sprzętu firmowego. Protokół z podpisem.</p>
      </div>

      <div className="flex gap-1">
        {(['asset', 'handover', 'review'] as Step[]).map((s, i) => (
          <div key={s} className="flex-1 flex flex-col gap-1">
            <div className={`h-1 rounded-full ${i <= stepIndex ? 'bg-teal-600' : 'bg-slate-200'}`} />
            <span className={`text-[9px] font-black uppercase tracking-widest ${s === step ? 'text-teal-600' : 'text-slate-400'}`}>
              {s === 'asset' ? 'Sprzęt' : s === 'handover' ? 'Przekazanie' : 'Wyślij'}
            </span>
          </div>
        ))}
      </div>

      {step === 'asset' && (
        <div className="space-y-5">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Typ sprzętu</p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {(Object.keys(ASSET_LABELS) as AssetType[]).map(t => (
                <button key={t} onClick={() => setAssetType(t)}
                  className={`p-2.5 rounded-2xl border text-center text-[10px] font-black uppercase transition-all ${assetType === t ? 'bg-teal-50 border-teal-400 text-teal-700 ring-2 ring-teal-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                  {ASSET_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nazwa / opis sprzętu *</label>
            <input value={assetName} onChange={e => setAssetName(e.target.value)}
              placeholder="np. MacBook Pro 14\" M3, iPhone 15 Pro"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">ID inwentarzowy</label>
              <input value={assetId} onChange={e => setAssetId(e.target.value)}
                placeholder="INV-2026-0042"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Numer seryjny</label>
              <input value={assetSerial} onChange={e => setAssetSerial(e.target.value)}
                placeholder="C02X123456789"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>
          </div>
        </div>
      )}

      {step === 'handover' && (
        <div className="space-y-5">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Rodzaj przekazania</p>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(HANDOVER_META) as [HandoverType, typeof HANDOVER_META[HandoverType]][]).map(([ht, meta]) => (
                <button key={ht} onClick={() => setHandoverType(ht)}
                  className={`p-3 rounded-2xl border text-left transition-all ${handoverType === ht ? meta.color + ' ring-2 ring-current' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                  <div className="flex items-center gap-1.5 mb-1"><ArrowRightLeft size={10} /><p className="text-xs font-black">{meta.label}</p></div>
                  <p className="text-[9px]">{meta.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                {handoverType === 'returned' ? 'Pracownik zwracający *' : 'Pracownik odbierający *'}
              </label>
              <input value={employeeName} onChange={e => setEmployeeName(e.target.value)}
                placeholder="Jan Kowalski"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">ID pracownika</label>
              <input value={employeeId} onChange={e => setEmployeeId(e.target.value)}
                placeholder="EMP-0042"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Stan sprzętu</label>
            <div className="flex flex-wrap gap-2">
              {CONDITIONS.map(c => (
                <button key={c} onClick={() => setCondition(c)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${condition === c ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Uwagi</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="Dodatkowe informacje, uszkodzenia, akcesoria dołączone..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm resize-none focus:ring-2 focus:ring-teal-500 outline-none" />
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-4">
          <div className={`rounded-[2rem] p-4 border-2 ${HANDOVER_META[handoverType].color}`}>
            <p className="text-xs font-black uppercase">{HANDOVER_META[handoverType].label}: {ASSET_LABELS[assetType]}</p>
          </div>
          <div className="bg-slate-50 rounded-[2rem] p-6 space-y-3">
            <Row label="Sprzęt" value={assetName} />
            {assetId && <Row label="ID inwentarz." value={assetId} />}
            {assetSerial && <Row label="Nr seryjny" value={assetSerial} />}
            <Row label="Pracownik" value={employeeName} />
            {employeeId && <Row label="ID pracownika" value={employeeId} />}
            <Row label="Stan" value={condition} />
          </div>
          <div className="bg-teal-50 rounded-[2rem] p-4 border border-teal-100">
            <p className="text-[10px] text-teal-700 font-bold">Protokół wymaga zatwierdzenia przez menedżera. Po zatwierdzeniu trafia do rejestru środków trwałych.</p>
          </div>
          {error && <p className="text-red-600 text-xs font-bold flex items-center gap-1.5"><AlertTriangle size={12} />{error}</p>}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button onClick={() => { const i = order.indexOf(step); i > 0 ? setStep(order[i - 1]) : onCancel(); }}
          className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600">
          ← {step === 'asset' ? 'Anuluj' : 'Wstecz'}
        </button>
        {step !== 'review' ? (
          <button disabled={!canProceed()} onClick={() => setStep(order[order.indexOf(step) + 1])}
            className="bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white font-black px-8 py-3 rounded-2xl text-xs uppercase tracking-widest">Dalej →</button>
        ) : (
          <button disabled={loading} onClick={handleSubmit}
            className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-black px-8 py-3 rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-teal-500/20">
            {loading ? 'Wysyłanie...' : <><CheckCircle2 size={14} /> Wystaw protokół</>}
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
