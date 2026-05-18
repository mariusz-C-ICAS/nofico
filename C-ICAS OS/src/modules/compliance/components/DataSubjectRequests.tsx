/**
 * Data: 2026-05-17
 * Ścieżka: /src/modules/compliance/components/DataSubjectRequests.tsx
 */
import React, { useState, useEffect } from 'react';
import {
  UserCog, Eye, Edit3, Trash2, Download, Ban,
  PauseCircle, Clock, CheckCircle2, AlertTriangle,
  ChevronRight, Sparkles, ArrowRight, Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../../../shared/lib/firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { useTenant } from '../../../shared/hooks/useTenant';

type DsrType = 'Prawo dostępu' | 'Prawo do sprostowania' | 'Prawo do usunięcia' | 'Prawo do przenoszenia' | 'Sprzeciw' | 'Ograniczenie przetwarzania';
type DsrStatus = 'Nowy' | 'W Toku' | 'Info Wymagane' | 'Przetwarzanie' | 'Zakończony';

interface DsrRequest {
  id: string;
  subject: string;
  email: string;
  type: DsrType;
  submitted: string;
  deadline: string;
  status: DsrStatus;
  assignedTo: string;
  description: string;
}

function daysRemaining(deadline: string): number {
  const d = new Date(deadline);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

const TYPE_ICONS: Record<DsrType, React.ReactNode> = {
  'Prawo dostępu': <Eye size={14} />,
  'Prawo do sprostowania': <Edit3 size={14} />,
  'Prawo do usunięcia': <Trash2 size={14} />,
  'Prawo do przenoszenia': <Download size={14} />,
  'Sprzeciw': <Ban size={14} />,
  'Ograniczenie przetwarzania': <PauseCircle size={14} />,
};

const TYPE_CFG: Record<DsrType, string> = {
  'Prawo dostępu': 'bg-indigo-50 text-indigo-600 border-indigo-100',
  'Prawo do sprostowania': 'bg-amber-50 text-amber-600 border-amber-100',
  'Prawo do usunięcia': 'bg-rose-50 text-rose-600 border-rose-100',
  'Prawo do przenoszenia': 'bg-emerald-50 text-emerald-600 border-emerald-100',
  'Sprzeciw': 'bg-slate-100 text-slate-600 border-slate-200',
  'Ograniczenie przetwarzania': 'bg-purple-50 text-purple-600 border-purple-100',
};

const STATUS_FLOW: DsrStatus[] = ['Nowy', 'W Toku', 'Info Wymagane', 'Przetwarzanie', 'Zakończony'];

const STATUS_CFG: Record<DsrStatus, string> = {
  'Nowy': 'bg-slate-100 text-slate-600',
  'W Toku': 'bg-indigo-50 text-indigo-600 border border-indigo-100',
  'Info Wymagane': 'bg-amber-50 text-amber-600 border border-amber-100',
  'Przetwarzanie': 'bg-blue-50 text-blue-600 border border-blue-100',
  'Zakończony': 'bg-emerald-50 text-emerald-600 border border-emerald-100',
};

function TimerBadge({ deadline }: { deadline: string }) {
  const days = daysRemaining(deadline);
  if (days < 0) return <span className="text-[10px] font-black text-rose-600 bg-rose-50 border border-rose-100 px-3 py-1.5 rounded-full uppercase tracking-widest flex items-center gap-1"><AlertTriangle size={10} /> Przekroczono</span>;
  const color = days > 14 ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : days > 7 ? 'text-amber-600 bg-amber-50 border-amber-100' : 'text-rose-600 bg-rose-50 border-rose-100';
  return (
    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border flex items-center gap-1 ${color}`}>
      <Clock size={10} /> {days} dni
    </span>
  );
}

export default function DataSubjectRequests() {
  const { activeTenantId } = useTenant();
  const [requests,    setRequests]    = useState<DsrRequest[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [selectedId,  setSelectedId]  = useState<string | null>(null);
  const [filterType,       setFilterType]       = useState<DsrType | 'Wszystkie'>('Wszystkie');
  const [generatedLetters, setGeneratedLetters] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!activeTenantId) return;
    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, `tenants/${activeTenantId}/dsrRequests`));
        setRequests(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as DsrRequest)));
      } finally {
        setLoading(false);
      }
    })();
  }, [activeTenantId]);

  const selected = requests.find(r => r.id === selectedId) || null;
  const filtered = requests.filter(r => filterType === 'Wszystkie' || r.type === filterType);

  const advanceStatus = async (id: string) => {
    const req = requests.find(r => r.id === id);
    if (!req) return;
    const idx  = STATUS_FLOW.indexOf(req.status);
    const next = STATUS_FLOW[Math.min(idx + 1, STATUS_FLOW.length - 1)];
    await updateDoc(doc(db, `tenants/${activeTenantId}/dsrRequests`, id), { status: next });
    setRequests(prev => prev.map(r => r.id !== id ? r : { ...r, status: next }));
  };

  function handleGenerateLetter(req: DsrRequest) {
    const today = new Date().toLocaleDateString('pl-PL');
    const deadline = new Date(req.deadline).toLocaleDateString('pl-PL');
    const letter =
      `Szanowna/y ${req.subject},\n\n` +
      `W odpowiedzi na Pana/Pani wniosek z dnia ${req.submitted} dotyczący realizacji prawa: ` +
      `${req.type} (nr ref. ${req.id}), złożony w trybie art. 12 RODO, informujemy:\n\n` +
      `Pański/Pani wniosek został przyjęty do realizacji. Odpowiedzi udzielimy do dnia ` +
      `${deadline} zgodnie z art. 12 ust. 3 RODO (termin 30 dni).\n\n` +
      `Osoba odpowiedzialna: ${req.assignedTo}\n\n` +
      `Z poważaniem,\nInspektor Ochrony Danych\nData: ${today}`;
    setGeneratedLetters(prev => ({ ...prev, [req.id]: letter }));
  }

  const types: DsrType[] = ['Prawo dostępu', 'Prawo do sprostowania', 'Prawo do usunięcia', 'Prawo do przenoszenia', 'Sprzeciw', 'Ograniczenie przetwarzania'];

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" size={24} /></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-200">
              <UserCog className="text-white" size={18} />
            </div>
            <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Wnioski DSR</h2>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Data Subject Requests — Art. 15-22 RODO</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Łącznie', value: requests.length, color: 'text-slate-700' },
            { label: 'Otwarte', value: requests.filter(r => r.status !== 'Zakończony').length, color: 'text-amber-600' },
            { label: 'Pilne (<7 dni)', value: requests.filter(r => daysRemaining(r.deadline) <= 7 && r.status !== 'Zakończony').length, color: 'text-rose-600' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-slate-100 rounded-2xl px-5 py-4 shadow-sm text-center">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</div>
              <div className={`text-xl font-black italic ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterType('Wszystkie')} className={`text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-2xl transition-all ${filterType === 'Wszystkie' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-50'}`}>Wszystkie</button>
        {types.map(t => (
          <button key={t} onClick={() => setFilterType(t)} className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-2xl border transition-all ${filterType === t ? 'bg-indigo-600 text-white border-indigo-600' : `bg-white border-slate-100 hover:bg-slate-50 ${TYPE_CFG[t]}`}`}>
            {TYPE_ICONS[t]} {t}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm italic text-slate-400 text-center py-10">Brak wniosków DSR</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-4">
          {filtered.map(req => (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setSelectedId(req.id === selectedId ? null : req.id)}
              className={`bg-white rounded-[2.5rem] border shadow-sm p-8 cursor-pointer transition-all hover:shadow-xl hover:shadow-slate-100 ${selectedId === req.id ? 'border-indigo-200 shadow-lg shadow-indigo-50' : 'border-slate-100'}`}
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{req.id}</div>
                  <div className="text-base font-black text-slate-900 italic">{req.subject}</div>
                  <div className="text-[10px] text-slate-400">{req.email}</div>
                </div>
                <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${STATUS_CFG[req.status]}`}>
                  {req.status}
                </div>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${TYPE_CFG[req.type]}`}>
                  {TYPE_ICONS[req.type]} {req.type}
                </div>
                <TimerBadge deadline={req.deadline} />
                <span className="text-[10px] text-slate-400">{req.assignedTo}</span>
                <span className="text-[10px] text-slate-300 ml-auto">Złożony: {req.submitted}</span>
              </div>

              {selectedId === req.id && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-6 pt-6 border-t border-slate-100">
                  <p className="text-[11px] text-slate-500 mb-6">{req.description}</p>

                  <div className="flex items-center gap-2 mb-6 overflow-x-auto">
                    {STATUS_FLOW.map((s, i) => {
                      const currentIdx = STATUS_FLOW.indexOf(req.status);
                      const isPast    = i < currentIdx;
                      const isCurrent = i === currentIdx;
                      return (
                        <React.Fragment key={s}>
                          <div className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full whitespace-nowrap ${isCurrent ? 'bg-indigo-600 text-white' : isPast ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400'}`}>{s}</div>
                          {i < STATUS_FLOW.length - 1 && <ArrowRight size={10} className="text-slate-300 shrink-0" />}
                        </React.Fragment>
                      );
                    })}
                  </div>

                  <div className="flex gap-3 flex-wrap">
                    <button
                      onClick={e => { e.stopPropagation(); advanceStatus(req.id); }}
                      disabled={req.status === 'Zakończony'}
                      className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-40 shadow-lg shadow-indigo-200"
                    >
                      <ChevronRight size={14} /> Zrealizuj Wniosek
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleGenerateLetter(req); }}
                      className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                    >
                      <Sparkles size={14} className="text-indigo-600" />
                      Generuj Odpowiedź (AI)
                    </button>
                  </div>
                  {generatedLetters[req.id] && (
                    <div className="mt-4 p-5 bg-slate-50 border border-slate-100 rounded-2xl">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Wygenerowana Odpowiedź RODO</p>
                      <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">{generatedLetters[req.id]}</pre>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>

        <div className="lg:col-span-5">
          <div className="bg-slate-900 rounded-[3rem] p-10 sticky top-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Typy Wniosków DSR</h3>
            <div className="space-y-3">
              {types.map(t => (
                <div key={t} className="flex items-center gap-3 p-4 bg-slate-800 rounded-2xl">
                  <div className="text-slate-400">{TYPE_ICONS[t]}</div>
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{t}</span>
                  <span className="ml-auto text-[10px] font-black text-slate-500">
                    {requests.filter(r => r.type === t).length}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-8 p-6 bg-amber-900/30 border border-amber-700/40 rounded-2xl">
              <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <AlertTriangle size={12} /> Termin RODO
              </div>
              <p className="text-[11px] text-amber-300">Wnioski muszą być zrealizowane w ciągu <strong>30 dni</strong> od złożenia. Przekroczenie terminu grozi karą do <strong>20M EUR</strong>.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
