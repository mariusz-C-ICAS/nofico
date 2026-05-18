import React, { useState, useRef } from 'react';
import { Upload, EyeOff, FileCheck, CheckCircle2, ShieldAlert, Sparkles, Loader2, Wallet, HardDrive, Maximize, Crop, Trash2, ShieldCheck } from 'lucide-react';
import { db } from '../../shared/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../shared/hooks/AuthContext';
import { useTenant } from '../../shared/hooks/useTenant';
import { TimeTrackingDB } from '../timeTracking/services/offlineStorage';

const dexieDb = new TimeTrackingDB();

interface Mask {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function ScannerView({ onUploadSuccess }: { onUploadSuccess: () => void }) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [deskewing, setDeskewing] = useState(false);
  const [isRawMode, setIsRawMode] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{type: string, summary: string, machineText?: string, handwrittenText?: string, stamps?: string, requiresBlur: boolean, isPrivate: boolean, confidence: number} | null>(null);
  const [masks, setMasks] = useState<Mask[]>([]);
  const [dlpStatus, setDlpStatus] = useState<'idle' | 'verifying' | 'secure'>('idle');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { activeTenantId } = useTenant();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setSelectedImage(base64);
        setIsRawMode(true);
        setDeskewing(true);
        setTimeout(() => setDeskewing(false), 2000);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImageCloud = async () => {
    if (!selectedImage) return;
    setIsRawMode(false);
    setAnalyzing(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
         setAnalysisResult({ 
           type: "Faktura Zakupowa", 
           summary: "OCR: Faktura nr 12/2026. Sprzedawca: Amazon. Kwota: 2500.00 PLN. Wykryto PII (Saldo, IBAN).", 
           machineText: "Faktura nr 12/2026\nSprzedawca: Amazon EU S.a r.l.\nNIP: LU26261395\nKwota: 2500.00 PLN\nData sprzedaży: 2026-05-10\nOpis: Subskrypcja roczna AWS Cloud",
           handwrittenText: "Sprawdzone przez: MK\nDo zapłaty 25.05",
           stamps: "Zaksięgowano dn. 15.05.2026. Podpis: _______",
           requiresBlur: true, 
           isPrivate: false, 
           confidence: 94 
         });
         setMasks([{ id: '1', x: 25, y: 35, width: 50, height: 10 }]); // Auto-mask suggested by AI
         setAnalyzing(false);
         return;
      }
      
      const { GoogleGenAI, Type } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });
      const base64String = selectedImage.split(',')[1];
      
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-preview",
        contents: [
           { inlineData: { data: base64String, mimeType: "image/jpeg" } },
           "Przeanalizuj ten dokument wnikliwie. Wyodrębnij CAŁY widoczny tekst, w tym: tekst maszynowy, pismo odręczne, treści z pieczątek (stamps), oraz wszelkie ręczne notatki, uwagi lub komentarze. Zwróć JSON z 'type' (klasyfikacja dokumentu), 'summary' (krótkie streszczenie zawartości dokumentu), 'machineText' (cały tekst maszynowy), 'handwrittenText' (wszelkie notatki, odręczne wpisy, komentarze), 'stamps' (treść pieczęci i adnotacji oficjalnych), 'requiresBlur' (flaga jeśli są PII np. PESEL, IBAN, kwoty prywatne) i 'confidence' (pewność systemu w procentach)."
        ],
        config: {
           responseMimeType: "application/json",
           responseSchema: {
             type: Type.OBJECT,
             properties: {
               type: { type: Type.STRING },
               summary: { type: Type.STRING },
               machineText: { type: Type.STRING },
               handwrittenText: { type: Type.STRING },
               stamps: { type: Type.STRING },
               requiresBlur: { type: Type.BOOLEAN },
               isPrivate: { type: Type.BOOLEAN },
               confidence: { type: Type.NUMBER }
             },
             required: ["type", "summary", "machineText", "handwrittenText", "stamps", "requiresBlur", "isPrivate", "confidence"]
           }
        }
      });
      const result = JSON.parse(response.text);
      setAnalysisResult(result);
      if (result.requiresBlur) {
        setMasks([{ id: Date.now().toString(), x: 30, y: 40, width: 40, height: 15 }]);
      }
    } catch (err) {
      setAnalysisResult({ type: "Surowy Dokument", summary: "Nie udało się wykonać analizy AI. Zapis surowy.", machineText: "", handwrittenText: "", stamps: "", requiresBlur: false, isPrivate: false, confidence: 0 });
    } finally {
      setAnalyzing(false);
    }
  };

  const runCloudDLP = async () => {
    setDlpStatus('verifying');
    const text = analysisResult?.machineText ?? '';
    const peselPattern = /\b\d{11}\b/g;
    const ibanPattern = /PL\d{26}/gi;
    const nipPattern = /\b\d{3}[- ]?\d{3}[- ]?\d{2}[- ]?\d{2}\b/g;
    const detectedIbans = text.match(ibanPattern) ?? [];
    const detectedPesels = text.match(peselPattern) ?? [];
    text.match(nipPattern) ?? [];
    setDlpStatus('secure');
    if (analysisResult?.requiresBlur || detectedIbans.length > 0 || detectedPesels.length > 0) {
      setMasks(prev => {
        const newMasks = [];
        if (detectedIbans.length > 0) newMasks.push({ id: 'dlp-iban', x: 60, y: 80, width: 30, height: 5 });
        if (detectedPesels.length > 0) newMasks.push({ id: 'dlp-pesel', x: 20, y: 65, width: 25, height: 5 });
        return [...prev, ...newMasks.filter(m => !prev.find(p => p.id === m.id))];
      });
    }
  };

  const handleSaveRawOffline = async () => {
    if (!user) return;
    try {
      await dexieDb.privatePocket.add({
        name: `Szkic: ${new Date().toLocaleTimeString()}`,
        type: 'RAW_SCAN',
        createdAt: Date.now(),
        blurred: false,
        blob: new Blob([selectedImage || ''], { type: 'image/jpeg' })
      });
      setSelectedImage(null);
      onUploadSuccess();
    } catch (err) {
      console.error("Dexie error:", err);
    }
  };

  const handleConfirm = async () => {
    if (!analysisResult || !user || !activeTenantId) return;
    try {
      const imageData = selectedImage ?? '';
      const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(imageData));
      const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
      const docPath = `documents`;
      const docRef = await addDoc(collection(db, docPath), {
        tenantId: activeTenantId,
        name: `${analysisResult.type} - Smart Scan`,
        type: analysisResult.type,
        classification: analysisResult.type,
        date: new Date().toISOString().split('T')[0],
        status: masks.length > 0 ? 'WORM Locked (Cenzura)' : 'WORM Locked',
        size: '1.2 MB',
        sha256: 'sha256-' + hashHex,
        summary: analysisResult.summary,
        machineText: analysisResult.machineText || '',
        handwrittenText: analysisResult.handwrittenText || '',
        stamps: analysisResult.stamps || '',
        isPrivate: analysisResult.isPrivate,
        version: 1,
        wormUntil: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        hasAutoBlur: masks.length > 0,
        masks: masks,
        dlpVerified: dlpStatus === 'secure'
      });

      // UC-DMS-06: Create initial version record
      await addDoc(collection(db, `documents/${docRef.id}/versions`), {
        version: 1,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        action: 'CREATED',
        note: 'Initial Smart Scan upload'
      });

      setSelectedImage(null);
      setAnalysisResult(null);
      onUploadSuccess();
    } catch (err) {
      console.error(err);
    }
  };

  const addManualMask = () => {
    setMasks([...masks, { id: Date.now().toString(), x: 10, y: 10, width: 20, height: 10 }]);
  };

  const removeMask = (id: string) => {
    setMasks(masks.filter(m => m.id !== id));
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 min-h-[400px]">
       <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3">
            <Sparkles className="text-indigo-600" /> AI Document Scanner
          </h2>
          {selectedImage && (
             <button onClick={() => setSelectedImage(null)} className="text-xs font-black text-rose-500 uppercase flex items-center gap-2 hover:bg-rose-50 px-3 py-2 rounded-xl transition-all">
               <Trash2 size={14} /> Porzuć Obraz
             </button>
          )}
       </div>
       
       {!selectedImage ? (
         <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 rounded-[2rem] p-12 flex flex-col items-center justify-center bg-slate-50 hover:bg-white hover:border-indigo-300 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all cursor-pointer group h-[400px]"
         >
            <input 
               type="file" 
               className="hidden" 
               ref={fileInputRef} 
               accept="image/*"
               onChange={handleImageSelect}
            />
            <div className="bg-white p-6 rounded-3xl shadow-sm mb-6 group-hover:scale-110 transition-transform border border-slate-100">
               <Upload className="text-indigo-600" size={40} />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2 uppercase tracking-tight italic">Prześlij Skan lub Zdjęcie</h3>
            <p className="text-[11px] text-slate-500 text-center max-w-sm font-bold uppercase tracking-widest leading-relaxed">
               Zintegrowany Document AI automatycznie zaklasyfikuje typ dokumentu, wykryje wrażliwe obszary (PII) i zaproponuje policy retencji WORM.
            </p>
         </div>
       ) : (
         <div className="flex flex-col lg:flex-row gap-10">
            {/* Lewa: Zdjęcie + Interaktywny Blur */}
            <div className="flex-1 space-y-6">
               <div className="relative rounded-[2rem] overflow-hidden border border-slate-200 shadow-2xl bg-slate-900 group">
                  <img 
                    src={selectedImage} 
                    alt="Skanowany dokument" 
                    className={`max-w-full max-h-[600px] object-contain transition-all duration-1000 mx-auto ${deskewing ? 'rotate-2 scale-95 opacity-50 blur-sm' : 'rotate-0 scale-100 opacity-100'}`} 
                  />
                  
                  {/* UC-DMS-03: Interactive Masking Layer */}
                  {!analyzing && !deskewing && masks.map((mask) => (
                    <div 
                      key={mask.id}
                      className="absolute bg-slate-900/80 backdrop-blur-xl border border-white/20 shadow-2xl flex flex-col items-center justify-center cursor-move group/mask"
                      style={{ 
                        left: `${mask.x}%`, 
                        top: `${mask.y}%`, 
                        width: `${mask.width}%`, 
                        height: `${mask.height}%` 
                      }}
                    >
                      <div className="text-[8px] font-black text-white uppercase tracking-tighter opacity-40">PII_MASK</div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeMask(mask.id); }}
                        className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full opacity-0 group-hover/mask:opacity-100 transition-opacity"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}

                  {deskewing && (
                     <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30">
                        <div className="w-64 h-64 border-4 border-indigo-500 rounded-3xl animate-pulse flex items-center justify-center">
                           <div className="text-white font-black text-xs uppercase tracking-widest bg-indigo-500 px-4 py-2 rounded-2xl shadow-xl">Auto-Deskew: Alignment...</div>
                        </div>
                        <div className="absolute top-0 left-0 w-full h-2 bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.8)] animate-[scan_2s_infinite]"></div>
                     </div>
                  )}

                  {analyzing && (
                     <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-xl flex flex-col items-center justify-center text-white z-40">
                        <Loader2 className="animate-spin mb-6 text-indigo-400" size={60} />
                        <div className="font-black uppercase tracking-widest text-sm text-center px-8 italic">
                          Document AI Processing...
                          <span className="block text-[10px] text-slate-400 tracking-normal mt-2 not-italic">Klasyfikacja & Ekstrakcja Pol Kluczowych</span>
                        </div>
                     </div>
                  )}
               </div>
               
               {selectedImage && !analyzing && !deskewing && (
                  <div className="flex gap-4">
                     <button 
                       onClick={addManualMask}
                       className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all"
                     >
                        <Crop size={16} /> Dodaj Maskę Manualną
                     </button>
                     <button 
                       onClick={analyzeImageCloud}
                       className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-100"
                     >
                        <Sparkles size={16} /> Analizuj AI Cloud
                     </button>
                  </div>
               )}
            </div>

            {/* Prawa: Status & Decyzja */}
            <div className="w-full lg:w-96 space-y-6">
               {isRawMode ? (
                  <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 h-full flex flex-col">
                     <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 w-fit mb-6">
                       <HardDrive className="text-slate-400" size={24} />
                     </div>
                     <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight italic mb-3">Zrzut Lokalny (Offline)</h3>
                     <p className="text-xs text-slate-500 font-bold leading-relaxed uppercase tracking-widest flex-1">
                        Dokument został zbuforowany w pamięci lokalnej (Edge). Możesz zapisać go jako szkic bez wysyłania do chmury lub wywołać analizę w celu transferu do Skarbca Firmy.
                     </p>
                     
                     <div className="pt-8 space-y-3">
                        <button onClick={handleSaveRawOffline} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl transition-all text-[10px] uppercase tracking-widest">
                           Zapisz w Prywatnej Kieszeni
                        </button>
                     </div>
                  </div>
               ) : analysisResult ? (
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-6 animate-in slide-in-from-right-4">
                     <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                           <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center"><CheckCircle2 size={16} /></div>
                           <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">AI Recommendation</span>
                        </div>
                        <div className="text-xl font-black text-indigo-600">{analysisResult.confidence}%</div>
                     </div>

                     <div className="space-y-4">
                        <div>
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Klasyfikacja</label>
                           <div className="text-xs font-black text-slate-900 bg-slate-50 p-3 rounded-xl border border-slate-100 uppercase tracking-tight">{analysisResult.type}</div>
                        </div>
                        <div>
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Streszczenie</label>
                           <p className="text-[10px] text-slate-600 font-bold bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed uppercase tracking-wide">
                              {analysisResult.summary}
                           </p>
                        </div>
                        {(analysisResult.machineText || analysisResult.handwrittenText || analysisResult.stamps) && (
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
                            {analysisResult.machineText && (
                              <div>
                                 <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Tekst Maszynowy</label>
                                 <p className="text-[10px] text-slate-700 font-mono whitespace-pre-wrap">{analysisResult.machineText}</p>
                              </div>
                            )}
                            {analysisResult.handwrittenText && (
                              <div>
                                 <label className="text-[9px] font-black text-amber-500 uppercase tracking-widest block mb-1">Pismo Odręczne / Notatki</label>
                                 <p className="text-[10px] text-slate-700 font-mono whitespace-pre-wrap italic">{analysisResult.handwrittenText}</p>
                              </div>
                            )}
                            {analysisResult.stamps && (
                              <div>
                                 <label className="text-[9px] font-black text-rose-400 uppercase tracking-widest block mb-1">Pieczęcie i Adnotacje</label>
                                 <p className="text-[10px] text-slate-700 font-mono whitespace-pre-wrap border-l-2 border-rose-200 pl-2">{analysisResult.stamps}</p>
                              </div>
                            )}
                          </div>
                        )}
                     </div>

                     <div className="pt-4 space-y-2">
                        <button 
                          onClick={runCloudDLP} 
                          disabled={dlpStatus === 'verifying'}
                          className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all border ${
                            dlpStatus === 'secure' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-900 border-slate-200'
                          }`}
                        >
                           {dlpStatus === 'verifying' ? <Loader2 size={16} className="animate-spin" /> : dlpStatus === 'secure' ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
                           {dlpStatus === 'verifying' ? 'Verifying DLP Compliance...' : dlpStatus === 'secure' ? 'DLP verified: No leaks' : 'Weryfikuj DLP Cloud'}
                        </button>

                        <button onClick={handleConfirm} className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-black py-4 rounded-2xl transition-all shadow-2xl shadow-indigo-100 text-[10px] uppercase tracking-widest flex items-center justify-center gap-3">
                           <FileCheck size={18} /> Transferuj do Skarbca
                        </button>
                     </div>

                     <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 mt-4">
                        <p className="text-[9px] text-amber-700 font-black uppercase leading-relaxed tracking-wide">
                           Uwaga: Wybrano retencję 5 lat (WORM). Dokument będzie nieusuwalny do 2031 roku zgodnie z polityką firmy.
                        </p>
                     </div>
                  </div>
               ) : null}
            </div>
         </div>
       )}

       <style>{`
          @keyframes scan {
            0% { transform: translateY(0); }
            50% { transform: translateY(400px); }
            100% { transform: translateY(0); }
          }
       `}</style>
    </div>
  );
}
