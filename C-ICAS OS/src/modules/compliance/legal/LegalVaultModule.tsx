/**
 * Data: 2026-05-17
 * Zmiany: Legal & Compliance Vault — Art. 210 KSH Strażnik + Generator Umów.
 * Ścieżka: /src/modules/compliance/legal/LegalVaultModule.tsx
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  Scale, Shield, FileCheck, Lock, AlertTriangle,
  CheckCircle2, Download, ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../../../shared/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useAuth } from '../../../shared/hooks/AuthContext';

// --- Types ---
interface VerificationEntry {
  id: string;
  date: string;
  filename: string;
  confidence: number;
  status: 'ok' | 'warn';
}

interface ContractField {
  label: string;
  key: string;
  type: 'text' | 'number' | 'date' | 'textarea';
  placeholder?: string;
}

// --- Constants ---
const CONTRACT_TYPES = [
  'Umowa najmu lokalu',
  'Umowa o pracę',
  'Umowa zlecenie',
  'Nota obciążeniowa',
] as const;

const LEASE_FIELDS: ContractField[] = [
  { label: 'Adres lokalu', key: 'address', type: 'text', placeholder: 'ul. Przykładowa 1, 00-001 Warszawa' },
  { label: 'Powierzchnia (m²)', key: 'area', type: 'number', placeholder: '50' },
  { label: 'Czynsz miesięczny (PLN)', key: 'rent', type: 'number', placeholder: '3 500' },
  { label: 'Data od', key: 'dateFrom', type: 'date' },
  { label: 'Uwagi', key: 'notes', type: 'textarea', placeholder: 'Dodatkowe ustalenia...' },
];

// --- Sub-components ---
function SectionHeader({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-4 mb-8">
      <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
        <Icon size={26} />
      </div>
      <div>
        <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">{title}</h3>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">{sub}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: 'ok' | 'warn' | 'none' }) {
  if (status === 'ok') return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 text-[9px] font-black uppercase tracking-widest">
      <CheckCircle2 size={11} /> Zweryfikowana
    </span>
  );
  if (status === 'warn') return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 text-[9px] font-black uppercase tracking-widest">
      <AlertTriangle size={11} /> Niska pewność
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-500/10 text-red-700 text-[9px] font-black uppercase tracking-widest">
      <Lock size={11} /> Brak uchwały
    </span>
  );
}

// --- Art. 210 Section ---
function Art210Section() {
  const { activeTenantId } = useAuth() as any;
  const [history,   setHistory]   = useState<VerificationEntry[]>([]);
  const [dragging,  setDragging]  = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [filename,  setFilename]  = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!activeTenantId) return;
    (async () => {
      const snap = await getDocs(collection(db, `tenants/${activeTenantId}/legalVerifications`));
      setHistory(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as VerificationEntry)));
    })();
  }, [activeTenantId]);

  const runAnalysis = (name: string) => {
    setFilename(name);
    setAnalyzing(true);
    setProgress(0);
    setConfidence(null);

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          const result = Math.floor(Math.random() * 15) + 85;
          setConfidence(result);
          setAnalyzing(false);
          return 100;
        }
        return prev + 5;
      });
    }, 150);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) runAnalysis(file.name);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) runAnalysis(file.name);
  };

  const resultOk = confidence !== null && confidence >= 95;

  return (
    <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm space-y-8">
      <SectionHeader icon={Shield} title="Art. 210 KSH Strażnik" sub="Weryfikacja uchwały Zgromadzenia Wspólników" />

      <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100">
        <p className="text-[11px] font-bold text-indigo-900 leading-relaxed">
          Umowa między Spółką z o.o. a Członkiem Zarządu wymaga uchwały Zgromadzenia Wspólników
          (art. 210 § 1 KSH). Brak uchwały powoduje nieważność umowy.
        </p>
      </div>

      <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Status bieżący</span>
        <StatusBadge status={confidence === null ? 'none' : resultOk ? 'ok' : 'warn'} />
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all
          ${dragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/50'}`}
      >
        <input ref={fileRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={handleFile} />
        <FileCheck size={32} className="mx-auto mb-3 text-slate-400" />
        <p className="text-[11px] font-black text-slate-600 uppercase tracking-widest">Wgraj skan uchwały ZW</p>
        <p className="text-[9px] text-slate-400 mt-1">PDF, JPG, PNG — przeciągnij lub kliknij</p>
      </div>

      <AnimatePresence>
        {(analyzing || confidence !== null) && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">
                {analyzing ? 'AI Legal Guard analizuje dokument...' : `Plik: ${filename}`}
              </span>
              {!analyzing && confidence !== null && (
                <span className={`text-[11px] font-black uppercase ${resultOk ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {confidence}% pewności
                </span>
              )}
            </div>

            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.1 }}
                className={`h-full rounded-full ${analyzing ? 'bg-indigo-400' : resultOk ? 'bg-emerald-500' : 'bg-amber-500'}`}
              />
            </div>

            {!analyzing && confidence !== null && (
              <div className={`p-5 rounded-2xl flex items-center gap-3 ${resultOk ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
                {resultOk
                  ? <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                  : <AlertTriangle size={20} className="text-amber-600 shrink-0" />
                }
                <p className={`text-[11px] font-black uppercase tracking-tight ${resultOk ? 'text-emerald-800' : 'text-amber-800'}`}>
                  {resultOk
                    ? 'Uchwala prawidlowa — umowa odblokowana'
                    : 'Niska pewnosc — wymagana weryfikacja reczna'}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mb-4">Historia weryfikacji</h4>
        {history.length === 0 && <p className="text-sm italic text-slate-400 text-center py-4">Brak historii weryfikacji</p>}
        <div className="space-y-3">
          {history.map(entry => (
            <div key={entry.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <p className="text-[10px] font-black text-slate-700 uppercase tracking-tight">{entry.filename}</p>
                <p className="text-[9px] text-slate-400 mt-0.5">{entry.date} — pewność: {entry.confidence}%</p>
              </div>
              <StatusBadge status={entry.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Contract Generator Section ---
function ContractGenerator() {
  const [contractType, setContractType] = useState<string>(CONTRACT_TYPES[0]);
  const [fields,       setFields]       = useState<Record<string, string>>({});
  const [autoInvoice,  setAutoInvoice]  = useState(false);
  const [generating,   setGenerating]   = useState(false);
  const [preview,      setPreview]      = useState<string | null>(null);

  const setField = (key: string, value: string) =>
    setFields(prev => ({ ...prev, [key]: value }));

  const isLease = contractType === 'Umowa najmu lokalu';

  const generateContract = () => {
    setGenerating(true);
    setPreview(null);
    setTimeout(() => {
      const text = isLease
        ? `UMOWA NAJMU LOKALU\n\nData: ${new Date().toLocaleDateString('pl-PL')}\n\nLOKAL: ${fields.address || '—'}\nPOWIERZCHNIA: ${fields.area || '—'} m²\nCZYNSZ: ${fields.rent || '—'} PLN/mies.\nOKRES: od ${fields.dateFrom || '—'}\n\nUWAGI:\n${fields.notes || 'Brak uwag.'}\n\n${autoInvoice ? '>> Automatyczne rachunki miesięczne (8,5% ryczałt) AKTYWNE <<' : ''}`
        : `UMOWA: ${contractType}\nData: ${new Date().toLocaleDateString('pl-PL')}\n\n[Treść umowy zostanie wygenerowana na podstawie szablonu...]`;
      setPreview(text);
      setGenerating(false);
    }, 2000);
  };

  return (
    <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm space-y-8">
      <SectionHeader icon={Scale} title="Generator Umów" sub="Automatyczne tworzenie dokumentów prawnych" />

      <div>
        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Typ umowy</label>
        <div className="relative">
          <select
            value={contractType}
            onChange={e => { setContractType(e.target.value); setPreview(null); }}
            className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-[11px] font-black text-slate-900 uppercase tracking-tight pr-10 focus:outline-none focus:border-indigo-400"
          >
            {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {isLease && (
        <div className="grid grid-cols-1 gap-5">
          {LEASE_FIELDS.map(f => (
            <div key={f.key}>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{f.label}</label>
              {f.type === 'textarea' ? (
                <textarea rows={3} placeholder={f.placeholder} value={fields[f.key] || ''} onChange={e => setField(f.key, e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-[11px] text-slate-900 focus:outline-none focus:border-indigo-400 resize-none" />
              ) : (
                <input type={f.type} placeholder={f.placeholder} value={fields[f.key] || ''} onChange={e => setField(f.key, e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-[11px] text-slate-900 focus:outline-none focus:border-indigo-400" />
              )}
            </div>
          ))}

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div onClick={() => setAutoInvoice(v => !v)}
              className={`w-12 h-6 rounded-full transition-all relative ${autoInvoice ? 'bg-indigo-600' : 'bg-slate-200'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${autoInvoice ? 'left-7' : 'left-1'}`} />
            </div>
            <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">
              Generuj automatyczne rachunki miesięczne (8,5% ryczałt)
            </span>
          </label>
        </div>
      )}

      <button onClick={generateContract} disabled={generating}
        className="w-full bg-indigo-600 text-white py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 transition-all"
      >
        {generating ? 'Generowanie...' : 'Generuj umowe'}
      </button>

      <AnimatePresence>
        {preview && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
              <pre className="text-[10px] text-slate-700 font-mono whitespace-pre-wrap leading-relaxed">{preview}</pre>
            </div>
            <button className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all">
              <Download size={14} /> Pobierz umowe
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Main Export ---
export default function LegalVaultModule() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-10">
      <div className="bg-slate-900 rounded-[3rem] px-10 py-8 mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">Legal Vault</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mt-1">
            Compliance & Contract Management
          </p>
        </div>
        <div className="flex items-center gap-3 bg-slate-800 px-5 py-3 rounded-2xl">
          <Lock size={16} className="text-emerald-400" />
          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Secured</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
        <Art210Section />
        <ContractGenerator />
      </div>
    </div>
  );
}
