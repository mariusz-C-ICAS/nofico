/**
 * Data: 2026-05-15
 * Zmiany: Gemini Vision OCR scanner dla paragonów i faktur.
 * Ścieżka: /src/modules/finance/expenses/ExpenseScanner.tsx
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Camera, Upload, Clipboard, X, CheckCircle2, AlertCircle,
  Zap, ChevronRight, RotateCcw, Loader2, ScanLine,
  ShieldCheck, Tag, Hash, Building2, Calendar, DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import useTenant from '../../../shared/hooks/useTenant';
import { GoogleGenAI } from '@google/genai';
import { checkDuplicate, compressImage, validateNip, type DuplicateCheckResult } from '../services/aiDocumentService';
import { checkNipOnBialaLista, type BialaListaResult } from '../services/bialaListaService';

type ExpenseStatus = 'pending_ocr' | 'ocr_done' | 'categorized' | 'approved' | 'rejected' | 'booked';
type VatRate = 23 | 8 | 5 | 0 | 'zw' | 'np';
type Currency = 'PLN' | 'EUR' | 'USD' | 'GBP' | 'CHF';

interface OcrResult {
  vendor: string;
  amount: number;
  currency: Currency;
  vatRate: VatRate | null;
  vatAmount: number | null;
  nettoAmount: number | null;
  date: string;
  invoiceNumber: string | null;
  nip: string | null;
  category: string;
  description: string;
  confidence: number;
}

interface ScanItem {
  file: File;
  preview: string;
  status: 'queued' | 'processing' | 'done' | 'error';
  result?: OcrResult;
  error?: string;
}

const CATEGORIES = ['Paliwo', 'Biuro', 'Marketing', 'Podróże', 'Usługi IT', 'Restauracja', 'Inne'];
const OCR_STEPS = ['Analizuję obraz...', 'Identyfikuję dane...', 'Weryfikuję NIP...', 'Gotowe!'];

interface ExpenseScannerProps {
  onClose?: () => void;
  onSaved?: () => void;
}

export default function ExpenseScanner({ onClose, onSaved }: ExpenseScannerProps) {
  const { activeTenantId } = useTenant();
  const [items, setItems] = useState<ScanItem[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [ocrStep, setOcrStep] = useState(0);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [editedResult, setEditedResult] = useState<OcrResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dupCheck, setDupCheck] = useState<DuplicateCheckResult | null>(null);
  const [nipValid, setNipValid] = useState<boolean | null>(null);
  const [bialaLista, setBialaLista] = useState<BialaListaResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const activeItem = items[activeIdx] ?? null;

  useEffect(() => {
    if (activeItem?.result && !editedResult) {
      setEditedResult({ ...activeItem.result });
      setDupCheck(null);
      setNipValid(null);
      setBialaLista(null);
    }
  }, [activeItem]);

  useEffect(() => {
    if (!editedResult || !activeTenantId) return;
    if (editedResult.nip) {
      const isValid = validateNip(editedResult.nip);
      setNipValid(isValid);
      if (isValid) {
        checkNipOnBialaLista(editedResult.nip)
          .then(setBialaLista)
          .catch(() => setBialaLista(null));
      } else {
        setBialaLista(null);
      }
    } else {
      setNipValid(null);
      setBialaLista(null);
    }
    checkDuplicate(activeTenantId, {
      vendor: editedResult.vendor,
      amount: editedResult.amount,
      date: editedResult.date,
      nip: editedResult.nip ?? undefined,
      invoiceNumber: editedResult.invoiceNumber ?? undefined,
    }).then(setDupCheck).catch(() => {});
  }, [editedResult?.amount, editedResult?.date, editedResult?.nip, activeTenantId]);

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const runOcr = useCallback(async (idx: number, fileRaw: File) => {
    const file = await compressImage(fileRaw, 1280);
    setOcrStep(0);
    setOcrProgress(10);

    const stepInterval = setInterval(() => {
      setOcrStep(s => (s < OCR_STEPS.length - 2 ? s + 1 : s));
      setOcrProgress(p => (p < 85 ? p + 15 : p));
    }, 900);

    try {
      const base64 = await fileToBase64(file);
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{
          parts: [
            {
              text: `Przeanalizuj ten paragon lub fakturę i wyciągnij dane w formacie JSON:
{
  "vendor": "nazwa sprzedawcy",
  "amount": całkowita kwota brutto (liczba),
  "currency": "PLN",
  "vatRate": stawka VAT (23/8/5/0/"zw"),
  "vatAmount": kwota VAT,
  "nettoAmount": kwota netto,
  "date": "YYYY-MM-DD",
  "invoiceNumber": "numer faktury lub null",
  "nip": "NIP sprzedawcy lub null",
  "category": "kategoria wydatku (Paliwo/Biuro/Marketing/Podróże/Usługi IT/Restauracja/Inne)",
  "description": "krótki opis",
  "confidence": 0-100
}
Jeśli nie możesz odczytać wartości, użyj null. Odpowiedz TYLKO JSON.`
            },
            { inlineData: { mimeType: file.type as 'image/jpeg' | 'image/png', data: base64 } }
          ]
        }]
      });

      clearInterval(stepInterval);
      setOcrStep(3);
      setOcrProgress(100);

      const text = response.text ?? '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Nie udało się odczytać odpowiedzi AI');
      const parsed = JSON.parse(jsonMatch[0]) as OcrResult;

      setItems(prev => prev.map((item, i) =>
        i === idx ? { ...item, status: 'done', result: parsed } : item
      ));
      setEditedResult({ ...parsed });
    } catch (err) {
      clearInterval(stepInterval);
      const msg = err instanceof Error ? err.message : 'Błąd OCR';
      setItems(prev => prev.map((item, i) =>
        i === idx ? { ...item, status: 'error', error: msg } : item
      ));
    }
  }, []);

  const addFiles = useCallback((files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (!imageFiles.length) return;

    const newItems: ScanItem[] = imageFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      status: 'queued'
    }));

    setItems(prev => {
      const updated = [...prev, ...newItems];
      const firstNewIdx = prev.length;
      setActiveIdx(firstNewIdx);
      setSaved(false);
      setSaveError(null);
      setEditedResult(null);

      updated[firstNewIdx] = { ...updated[firstNewIdx], status: 'processing' };
      setTimeout(() => runOcr(firstNewIdx, imageFiles[0]), 100);
      return updated;
    });
  }, [runOcr]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, [addFiles]);

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const files = Array.from(e.clipboardData?.files ?? []);
    if (files.length) addFiles(files);
  }, [addFiles]);

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const handleSave = async () => {
    if (!editedResult || !activeTenantId) return;
    setSaving(true);
    setSaveError(null);
    try {
      await addDoc(collection(db, `tenants/${activeTenantId}/expenses`), {
        tenantId: activeTenantId,
        receiptThumbnail: activeItem?.preview ?? null,
        ocrStatus: 'ocr_done' as ExpenseStatus,
        vendor: editedResult.vendor ?? '',
        amount: editedResult.amount ?? 0,
        currency: editedResult.currency ?? 'PLN',
        vatRate: editedResult.vatRate,
        vatAmount: editedResult.vatAmount,
        nettoAmount: editedResult.nettoAmount,
        date: editedResult.date ?? '',
        invoiceNumber: editedResult.invoiceNumber,
        nip: editedResult.nip,
        category: editedResult.category ?? 'Inne',
        description: editedResult.description ?? '',
        isReimbursable: false,
        status: 'ocr_done' as ExpenseStatus,
        aiCategory: editedResult.category,
        aiConfidence: editedResult.confidence,
        aiRawExtraction: JSON.stringify(editedResult),
        isBooked: false,
        createdBy: activeTenantId ?? 'unknown',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Błąd zapisu');
    } finally {
      setSaving(false);
    }
  };

  const confidenceColor = (c: number) => c >= 80 ? 'text-emerald-500' : c >= 60 ? 'text-amber-500' : 'text-red-500';

  if (!items.length) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">Skanuj <span className="text-indigo-600">Dokument</span></h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Gemini Vision AI — automatyczna ekstrakcja danych</p>
          </div>
          {onClose && <button onClick={onClose} className="p-3 rounded-2xl hover:bg-slate-100 transition-colors"><X size={20} className="text-slate-400" /></button>}
        </div>

        {/* Drop Zone */}
        <div onDragOver={e => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-[3rem] p-20 text-center cursor-pointer transition-all duration-300 ${isDragging ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]' : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30'}`}
          onClick={() => fileInputRef.current?.click()}>
          <AnimatePresence>
            {isDragging && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 rounded-[3rem] bg-indigo-600/5 flex items-center justify-center">
                <span className="text-2xl font-black text-indigo-600 uppercase italic tracking-tighter">Upuść tutaj!</span>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex flex-col items-center gap-6">
            <div className="w-24 h-24 bg-indigo-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-indigo-500/30">
              <Upload size={40} className="text-white" />
            </div>
            <div>
              <p className="text-xl font-black uppercase italic tracking-tighter text-slate-900 mb-2">Przeciągnij paragon lub fakturę</p>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">PNG, JPG, HEIC — do 20 MB</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Aparat', icon: Camera, cls: 'bg-slate-900 text-white hover:bg-slate-800', iCls: 'text-indigo-400', action: () => cameraInputRef.current?.click() },
            { label: 'Plik', icon: Upload, cls: 'bg-white border border-slate-100 hover:bg-slate-50 shadow-sm', iCls: 'text-slate-400', action: () => fileInputRef.current?.click() },
            { label: 'Ctrl+V', icon: Clipboard, cls: 'bg-indigo-50 border border-indigo-100', iCls: 'text-indigo-500', action: undefined },
          ].map(({ label, icon: Icon, cls, iCls, action }) => (
            <button key={label} onClick={action}
              className={`flex flex-col items-center gap-3 p-8 rounded-[2.5rem] transition-all ${cls}`}>
              <Icon size={28} className={iCls} />
              <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
            </button>
          ))}
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
          onChange={e => addFiles(Array.from(e.target.files ?? []))} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={e => addFiles(Array.from(e.target.files ?? []))} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">
            Skan <span className="text-indigo-600">AI</span>
          </h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
            {items.length > 1 ? `${activeIdx + 1} / ${items.length} dokumentów` : 'Ekstrakcja danych'}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setItems([]); setEditedResult(null); setSaved(false); }}
            className="p-3 rounded-2xl hover:bg-slate-100 transition-colors">
            <RotateCcw size={18} className="text-slate-400" />
          </button>
          {onClose && (
            <button onClick={onClose} className="p-3 rounded-2xl hover:bg-slate-100 transition-colors">
              <X size={18} className="text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* Batch Thumbnails */}
      {items.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {items.map((item, i) => (
            <button key={i} onClick={() => { setActiveIdx(i); setEditedResult(item.result ? { ...item.result } : null); setSaved(false); }}
              className={`relative flex-shrink-0 w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all ${
                i === activeIdx ? 'border-indigo-500 scale-105' : 'border-slate-200'
              }`}>
              <img src={item.preview} alt="" className="w-full h-full object-cover" />
              {item.status === 'processing' && (
                <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                  <Loader2 size={16} className="text-white animate-spin" />
                </div>
              )}
              {item.status === 'done' && (
                <div className="absolute top-1 right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                  <CheckCircle2 size={12} className="text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Main Content */}
      {activeItem && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Image Preview */}
          <div className="relative rounded-[2.5rem] overflow-hidden bg-slate-900 aspect-[3/4]">
            <img src={activeItem.preview} alt="Dokument" className="w-full h-full object-contain" />

            {/* Scan Animation */}
            {activeItem.status === 'processing' && (
              <div className="absolute inset-0 bg-slate-900/70 flex flex-col items-center justify-center gap-6 p-8">
                <div className="absolute inset-0 overflow-hidden">
                  <motion.div
                    className="absolute left-0 right-0 h-1 bg-indigo-400/80 shadow-lg shadow-indigo-400/50"
                    animate={{ top: ['0%', '100%', '0%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  />
                </div>
                <div className="relative z-10 flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center">
                    <ScanLine size={32} className="text-white animate-pulse" />
                  </div>
                  <p className="text-white font-black uppercase tracking-widest text-sm text-center">
                    {OCR_STEPS[ocrStep]}
                  </p>
                  <div className="w-48 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-indigo-500 rounded-full"
                      animate={{ width: `${ocrProgress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <span className="text-indigo-300 font-black text-lg">{ocrProgress}%</span>
                </div>
              </div>
            )}

            {activeItem.status === 'error' && (
              <div className="absolute inset-0 bg-red-900/80 flex flex-col items-center justify-center gap-4 p-8">
                <AlertCircle size={48} className="text-red-300" />
                <p className="text-white font-bold text-center text-sm">{activeItem.error}</p>
                <button onClick={() => { setItems(prev => prev.map((it, i) => i === activeIdx ? { ...it, status: 'processing', error: undefined } : it)); runOcr(activeIdx, activeItem.file); }} className="bg-white text-red-600 font-black text-xs uppercase px-6 py-3 rounded-xl">Spróbuj ponownie</button>
              </div>
            )}
          </div>

          {/* Results Panel */}
          <div className="space-y-4">
            {activeItem.status === 'done' && editedResult && (
              <AnimatePresence>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  {/* Confidence */}
                  <div className="bg-slate-50 rounded-[2rem] p-6 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full border-4 border-slate-200 flex items-center justify-center relative">
                      <span className={`text-lg font-black ${confidenceColor(editedResult.confidence)}`}>
                        {editedResult.confidence}
                      </span>
                      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 64 64">
                        <circle cx="32" cy="32" r="28" fill="none" stroke="#e2e8f0" strokeWidth="6" />
                        <circle cx="32" cy="32" r="28" fill="none"
                          className={editedResult.confidence >= 80 ? 'stroke-emerald-500' : editedResult.confidence >= 60 ? 'stroke-amber-500' : 'stroke-red-500'}
                          strokeWidth="6" strokeDasharray={`${editedResult.confidence * 1.76} 176`} strokeLinecap="round" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pewność AI</p>
                      <p className={`text-xl font-black ${confidenceColor(editedResult.confidence)}`}>
                        {editedResult.confidence >= 80 ? 'Wysoka' : editedResult.confidence >= 60 ? 'Średnia' : 'Niska'}
                      </p>
                      {editedResult.confidence < 70 && (
                        <p className="text-[10px] text-amber-600 font-bold uppercase flex items-center gap-1 mt-1">
                          <AlertCircle size={10} /> Zweryfikuj pola ręcznie
                        </p>
                      )}
                    </div>
                    <div className="ml-auto">
                      <span className="bg-indigo-100 text-indigo-700 font-black text-[10px] uppercase px-4 py-2 rounded-full flex items-center gap-1">
                        <Zap size={10} /> Gemini Vision
                      </span>
                    </div>
                  </div>

                  {/* Editable Fields */}
                  <div className="bg-white rounded-[2rem] p-6 border border-slate-100 space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Wyekstrahowane dane</p>

                    {[
                      { key: 'vendor', label: 'Sprzedawca', icon: Building2 },
                      { key: 'date', label: 'Data', icon: Calendar, type: 'date' },
                      { key: 'amount', label: 'Kwota brutto', icon: DollarSign, type: 'number' },
                      { key: 'invoiceNumber', label: 'Nr faktury', icon: Hash },
                      { key: 'nip', label: 'NIP', icon: ShieldCheck },
                    ].map(({ key, label, icon: Icon, type }) => (
                      <div key={key} className={`group ${editedResult.confidence < 70 ? 'ring-1 ring-amber-200 rounded-xl' : ''}`}>
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1 mb-1">
                          <Icon size={9} /> {label}
                        </label>
                        <input
                          type={type ?? 'text'}
                          value={String((editedResult as unknown as Record<string, unknown>)[key] ?? '')}
                          onChange={e => setEditedResult(prev => prev ? { ...prev, [key]: type === 'number' ? parseFloat(e.target.value) : e.target.value } : prev)}
                          className="w-full text-sm font-bold text-slate-900 bg-slate-50 rounded-xl px-4 py-2 border border-slate-100 focus:outline-none focus:border-indigo-300"
                        />
                      </div>
                    ))}

                    {/* Category */}
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1 mb-1">
                        <Tag size={9} /> Kategoria AI
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map(cat => (
                          <button key={cat}
                            onClick={() => setEditedResult(prev => prev ? { ...prev, category: cat } : prev)}
                            className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full transition-all ${
                              editedResult.category === cat
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}>
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Alerts: Duplicate + NIP */}
                  {dupCheck?.isDuplicate && (
                    <div className="bg-amber-50 border border-amber-200 rounded-[1.5rem] p-4 flex items-start gap-3">
                      <AlertCircle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-800">Możliwy duplikat ({dupCheck.matchScore}%)</p>
                        <p className="text-[10px] text-amber-700 mt-0.5">{dupCheck.reason}</p>
                      </div>
                    </div>
                  )}
                  {nipValid === false && editedResult?.nip && (
                    <div className="bg-rose-50 border border-rose-100 rounded-[1.5rem] p-3 flex items-center gap-2">
                      <AlertCircle size={14} className="text-rose-600" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-rose-700">Nieprawidłowy NIP: {editedResult.nip}</span>
                    </div>
                  )}
                  {nipValid === true && bialaLista && (
                    bialaLista.isActiveVatPayer ? (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-[1.5rem] p-3 flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-600" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">VAT czynny — Biała Lista MF</span>
                      </div>
                    ) : bialaLista.found ? (
                      <div className="bg-amber-50 border border-amber-200 rounded-[1.5rem] p-3 flex items-center gap-2">
                        <AlertCircle size={14} className="text-amber-600" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">Sprawdz status VAT — podmiot znaleziony, brak czynnego VAT</span>
                      </div>
                    ) : (
                      <div className="bg-rose-50 border border-rose-100 rounded-[1.5rem] p-3 flex items-center gap-2">
                        <AlertCircle size={14} className="text-rose-600" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-rose-700">Nie znaleziono w Białej Liście MF</span>
                      </div>
                    )
                  )}

                  {/* Save */}
                  {saved ? (
                    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-emerald-50 rounded-[2rem] p-6 flex items-center gap-4 border border-emerald-200">
                      <CheckCircle2 size={32} className="text-emerald-500" />
                      <div className="flex-1"><p className="font-black text-emerald-800 uppercase tracking-tighter">Zapisano!</p><p className="text-xs text-emerald-600 font-bold">Wydatek dodany do systemu</p></div>
                      <div className="flex gap-2">
                        <button onClick={() => { setItems([]); setEditedResult(null); setSaved(false); }} className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-4 py-2 rounded-xl hover:bg-emerald-200 transition-colors">Dodaj kolejny</button>
                        {onSaved && <button onClick={onSaved} className="text-[10px] font-black uppercase text-white bg-emerald-600 px-4 py-2 rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-1">Lista <ChevronRight size={10} /></button>}
                      </div>
                    </motion.div>
                  ) : (
                    <div className="space-y-2">
                      {saveError && <div className="bg-red-50 rounded-2xl px-4 py-3 flex items-center gap-2 border border-red-200"><AlertCircle size={14} className="text-red-500" /><span className="text-xs font-bold text-red-600">{saveError}</span></div>}
                      <button onClick={handleSave} disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-sm py-5 rounded-[2rem] shadow-xl shadow-indigo-500/30 transition-all flex items-center justify-center gap-3 disabled:opacity-60">
                        {saving ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
                        {saving ? 'Zapisywanie...' : 'Zapisz Wydatek'}
                      </button>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}

            {activeItem.status === 'processing' && (
              <div className="h-full flex flex-col items-center justify-center gap-4 py-12">
                <Loader2 size={40} className="text-indigo-500 animate-spin" />
                <p className="text-sm font-black uppercase tracking-widest text-slate-500">
                  {OCR_STEPS[ocrStep]}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={e => addFiles(Array.from(e.target.files ?? []))} />
    </div>
  );
}
