/**
 * Data: 2026-05-15
 * Autor: Agent AI
 * Opis: AI Guardian — symulacja Edge AI do cenzury zrzutów ekranu bankowych.
 *       Flow: upload → analiza AI (2s) → review z blur overlay → zapis Firestore.
 */
import React, { useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Shield, Eye, EyeOff, Upload, CheckCircle,
  ZoomIn, AlertTriangle, X, Loader2,
} from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../../shared/hooks/AuthContext';

// --- TYPES ---
type Step = 'upload' | 'analyzing' | 'review' | 'saved';

interface DetectedZone {
  id: string;
  label: string;
  type: 'required' | 'sensitive';
  top: string;
  left: string;
  width: string;
  height: string;
  reduction: string;
}

// --- AI ANALYSIS ZONES (Edge AI simulation) ---
const AI_ANALYSIS_ZONES: DetectedZone[] = [
  { id: 'date',     label: 'Data',           type: 'required',   top: '8%',  left: '4%',  width: '25%', height: '8%',  reduction: '' },
  { id: 'amount',   label: 'Kwota',          type: 'required',   top: '22%', left: '60%', width: '35%', height: '8%',  reduction: '' },
  { id: 'payee',    label: 'Odbiorca',       type: 'required',   top: '35%', left: '4%',  width: '55%', height: '8%',  reduction: '' },
  { id: 'balance',  label: 'Saldo',          type: 'sensitive',  top: '52%', left: '55%', width: '40%', height: '8%',  reduction: '-45%' },
  { id: 'transfers',label: 'Inne przelewy',  type: 'sensitive',  top: '65%', left: '4%',  width: '88%', height: '14%', reduction: '-30%' },
  { id: 'iban',     label: 'Numer konta',    type: 'sensitive',  top: '84%', left: '4%',  width: '60%', height: '7%',  reduction: '-20%' },
];

// --- BLUR OVERLAY COMPONENT ---
interface BlurOverlayProps {
  zone: DetectedZone;
  revealed: boolean;
  onToggle: (id: string) => void;
}

function BlurOverlay({ zone, revealed, onToggle }: BlurOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1 }}
      onClick={() => onToggle(zone.id)}
      className="absolute cursor-pointer group"
      style={{ top: zone.top, left: zone.left, width: zone.width, height: zone.height }}
    >
      <div
        className={`w-full h-full rounded-md border-2 flex items-center justify-center transition-all duration-300 ${
          zone.type === 'required'
            ? 'border-emerald-400 bg-emerald-400/10'
            : revealed
              ? 'border-rose-400 bg-rose-400/5'
              : 'border-rose-500 bg-rose-500/20'
        }`}
        style={
          zone.type === 'sensitive' && !revealed
            ? { backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }
            : {}
        }
      >
        {zone.type === 'sensitive' && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {revealed ? (
              <EyeOff className="w-3 h-3 text-rose-400" />
            ) : (
              <ZoomIn className="w-3 h-3 text-rose-300" />
            )}
          </div>
        )}
        {zone.type === 'required' && (
          <span className="text-[9px] font-black uppercase italic tracking-tighter text-emerald-400 px-1">
            {zone.label}
          </span>
        )}
      </div>
      {zone.type === 'sensitive' && (
        <div className="absolute -top-5 left-0 flex items-center gap-1 whitespace-nowrap">
          <span className="text-[9px] font-black uppercase italic tracking-tighter text-rose-400">
            {zone.label}
          </span>
          {zone.reduction && (
            <span className="text-[8px] text-rose-500">{zone.reduction}</span>
          )}
        </div>
      )}
    </motion.div>
  );
}

// --- MAIN MODULE ---
export default function AiGuardianModule() {
  const { activeTenantId } = useAuth();
  const [step, setStep] = useState<Step>('upload');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [revealedZones, setRevealedZones] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageUrl(e.target?.result as string);
      setStep('analyzing');
      setTimeout(() => setStep('review'), 2000);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const toggleZone = useCallback((id: string) => {
    setRevealedZones(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!activeTenantId || !imageUrl) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'aiGuardianScreenshots'), {
        tenantId: activeTenantId,
        aiGuardianApproved: true,
        censoredZones: AI_ANALYSIS_ZONES.filter(z => z.type === 'sensitive').map(z => z.id),
        revealedByUser: Array.from(revealedZones),
        createdAt: serverTimestamp(),
      });
      setStep('saved');
    } finally {
      setSaving(false);
    }
  }, [activeTenantId, imageUrl, revealedZones]);

  const reset = useCallback(() => {
    setStep('upload');
    setImageUrl(null);
    setRevealedZones(new Set());
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      {/* HEADER */}
      <div className="bg-slate-900 rounded-[3rem] px-8 py-5 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-violet-600/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="font-black uppercase italic tracking-tighter text-lg">
              AI Guardian
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              Edge AI Cenzura — zrzuty bankowe
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
          <span className="text-xs font-black uppercase italic tracking-tighter text-violet-400">
            Edge AI Online
          </span>
        </div>
      </div>

      {/* LEGEND */}
      {(step === 'review' || step === 'saved') && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 rounded-[2rem] px-6 py-4 mb-4 flex items-center gap-6 flex-wrap"
        >
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-emerald-400 bg-emerald-400/10" />
            <span className="text-xs font-black uppercase italic tracking-tighter text-emerald-400">
              Wymagane pola
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-rose-500 bg-rose-500/20" />
            <span className="text-xs font-black uppercase italic tracking-tighter text-rose-400">
              Ukryte (kliknij by podejrzeć)
            </span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Eye className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-400">
              {revealedZones.size} odkrytych stref
            </span>
          </div>
        </motion.div>
      )}

      {/* MAIN CONTENT */}
      <AnimatePresence mode="wait">

        {/* STEP: UPLOAD */}
        {step === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-slate-900 rounded-[3rem] p-8"
          >
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-[2rem] p-16 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
                dragOver
                  ? 'border-violet-400 bg-violet-400/5'
                  : 'border-slate-700 hover:border-violet-500 hover:bg-violet-500/5'
              }`}
            >
              <div className="w-20 h-20 rounded-[1.5rem] bg-violet-600/20 flex items-center justify-center mb-6">
                <Upload className="w-10 h-10 text-violet-400" />
              </div>
              <p className="font-black uppercase italic tracking-tighter text-xl mb-2">
                Wgraj zrzut ekranu
              </p>
              <p className="text-slate-400 text-sm text-center max-w-xs">
                Przeciagnij i upusc lub kliknij — AI przeanalizuje i ocenzuruje dane wrazliwe
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                { icon: Shield, label: 'Saldo ukryte', sub: 'automatycznie' },
                { icon: Eye, label: 'Wymagane pola', sub: 'zachowane' },
                { icon: CheckCircle, label: 'WORM archiwum', sub: 'po akceptacji' },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={label} className="bg-slate-800 rounded-2xl p-4 flex items-center gap-3">
                  <Icon className="w-5 h-5 text-violet-400 shrink-0" />
                  <div>
                    <p className="font-black uppercase italic tracking-tighter text-sm">{label}</p>
                    <p className="text-xs text-slate-500">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* STEP: ANALYZING */}
        {step === 'analyzing' && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="bg-slate-900 rounded-[3rem] p-16 flex flex-col items-center justify-center gap-8"
          >
            <div className="relative">
              <div className="w-24 h-24 rounded-[2rem] bg-violet-600/20 flex items-center justify-center">
                <Shield className="w-12 h-12 text-violet-400" />
              </div>
              <div className="absolute inset-0 rounded-[2rem] border-2 border-violet-400 animate-ping opacity-30" />
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
                <p className="font-black uppercase italic tracking-tighter text-xl">
                  Analiza AI...
                </p>
              </div>
              <p className="text-slate-400 text-sm text-center">
                Edge AI skanuje i klasyfikuje dane wrazliwe
              </p>
            </div>
            <div className="w-64 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-violet-500 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 2, ease: 'linear' }}
              />
            </div>
            <div className="flex flex-col gap-2 text-xs text-slate-500">
              {['Wykrywanie pol tekstowych...', 'Klasyfikacja danych...', 'Generowanie masek...'].map((t, i) => (
                <motion.div
                  key={t}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.5 }}
                  className="flex items-center gap-2"
                >
                  <div className="w-1 h-1 rounded-full bg-violet-400" />
                  {t}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* STEP: REVIEW */}
        {step === 'review' && imageUrl && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex gap-4"
          >
            {/* IMAGE + OVERLAYS */}
            <div className="flex-1 bg-slate-900 rounded-[3rem] p-6">
              <div className="relative inline-block w-full">
                <img
                  src={imageUrl}
                  alt="Zrzut ekranu"
                  className="w-full rounded-[2rem] object-cover max-h-[60vh]"
                />
                {AI_ANALYSIS_ZONES.map(zone => (
                  <BlurOverlay
                    key={zone.id}
                    zone={zone}
                    revealed={revealedZones.has(zone.id)}
                    onToggle={toggleZone}
                  />
                ))}
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-black uppercase italic tracking-tighter rounded-[2rem] py-4 flex items-center justify-center gap-2 transition-colors"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Akceptuj cenzure i zapisz
                </button>
                <button
                  onClick={reset}
                  className="w-14 h-14 bg-slate-800 hover:bg-slate-700 rounded-[1.5rem] flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>

            {/* SIDEBAR */}
            <div className="w-64 flex flex-col gap-4">
              <div className="bg-slate-900 rounded-[2rem] p-5">
                <p className="font-black uppercase italic tracking-tighter text-sm mb-3 text-slate-300">
                  Wykryte strefy
                </p>
                <div className="flex flex-col gap-2">
                  {AI_ANALYSIS_ZONES.map(zone => (
                    <div
                      key={zone.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          zone.type === 'required' ? 'bg-emerald-400' : 'bg-rose-400'
                        }`} />
                        <span className="text-xs font-bold">{zone.label}</span>
                      </div>
                      {zone.type === 'sensitive' && (
                        <button onClick={() => toggleZone(zone.id)}>
                          {revealedZones.has(zone.id)
                            ? <EyeOff className="w-3 h-3 text-rose-400" />
                            : <Eye className="w-3 h-3 text-slate-500" />
                          }
                        </button>
                      )}
                      {zone.type === 'required' && (
                        <CheckCircle className="w-3 h-3 text-emerald-400" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900 rounded-[2rem] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <p className="font-black uppercase italic tracking-tighter text-sm text-amber-400">
                    Redukcja danych
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {AI_ANALYSIS_ZONES.filter(z => z.type === 'sensitive').map(z => (
                    <div key={z.id} className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">{z.label}</span>
                      <span className="font-black text-rose-400">{z.reduction}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP: SAVED */}
        {step === 'saved' && (
          <motion.div
            key="saved"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 rounded-[3rem] p-16 flex flex-col items-center justify-center gap-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="w-24 h-24 rounded-[2rem] bg-emerald-600/20 flex items-center justify-center"
            >
              <CheckCircle className="w-12 h-12 text-emerald-400" />
            </motion.div>
            <div className="text-center">
              <p className="font-black uppercase italic tracking-tighter text-2xl mb-2">
                Przeslano do archiwum WORM
              </p>
              <p className="text-slate-400 text-sm">
                Zrzut ocenzurowany przez AI Guardian zapisany z flaga{' '}
                <code className="text-violet-400 text-xs bg-slate-800 px-1.5 py-0.5 rounded">
                  aiGuardianApproved: true
                </code>
              </p>
            </div>
            <button
              onClick={reset}
              className="bg-slate-800 hover:bg-slate-700 text-white font-black uppercase italic tracking-tighter rounded-[2rem] px-8 py-3 transition-colors"
            >
              Nowy zrzut
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
