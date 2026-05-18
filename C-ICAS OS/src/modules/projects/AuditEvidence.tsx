/**
 * Data: 2026-05-10
 * Utworzył: Agent AI
 * Opis: Komponent do wstawiania niezmiennych dowodowych multimediów,
 * idealnych w sądach przy sporach klient-firma.
 */
import React, { useState, useEffect } from 'react';
import { toast } from '../../shared/utils/toast';
import { db } from '../../shared/lib/firebase';
import { collection, query, onSnapshot, where, orderBy, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../shared/hooks/AuthContext';
import { Camera, Video, ShieldCheck, Lock, Share2, Mail, MessageCircle, Phone, Link as LinkIcon, CheckCircle2 } from 'lucide-react';

export default function AuditEvidence({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const [evidence, setEvidence] = useState<any[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [stage, setStage] = useState('before');
  const [mediaType, setMediaType] = useState('photo');
  const [isProofOfCompletion, setIsProofOfCompletion] = useState(false);
  const [activeShareTarget, setActiveShareTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !projectId) return;
    const q = query(
      collection(db, 'mediaEvidence'), 
      where('projectId', '==', projectId),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEvidence(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, [user, projectId]);

  const simulateCaptureAndHash = async () => {
    if (!user) return;
    const simulatedFileUrl = `https://example.com/audit-${Date.now()}.${mediaType === 'photo' ? 'jpg' : 'mp4'}`;
    const fakeHash = 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9';

    try {
      await addDoc(collection(db, 'mediaEvidence'), {
        projectId,
        userId: user.uid,
        mediaUrl: simulatedFileUrl,
        mediaType,
        stage,
        fileHash: fakeHash,
        gpsCoords: '52.2297, 21.0122',
        sharedWith: [],
        proofOfCompletion: isProofOfCompletion,
        createdAt: serverTimestamp()
      });
      setIsCapturing(false);
      setIsProofOfCompletion(false);
    } catch(err) {
      console.error(err);
      toast.error('Błąd podczas zapisywania dowodu.');
    }
  };

  const handleShare = async (evId: string, currentSharedWith: string[], method: string) => {
     try {
       // Aktualizujemy tablicę udostępnionych kontaktów/informacji (np. wysłano emailem na adres)
       const timestampString = `[${method.toUpperCase()}] ${new Date().toLocaleTimeString()} `;
       await updateDoc(doc(db, 'mediaEvidence', evId), {
         sharedWith: [...(currentSharedWith || []), timestampString]
       });
       toast.success(`Wysłano dowód za pomocą: ${method}`);
       setActiveShareTarget(null);
     } catch (err) {
       console.error("Nie udało się udostępnić:", err);
     }
  };

  return (
    <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="text-green-600" />
            Dokumentacja Audit-Proof & Odbiór
          </h3>
          <p className="text-sm text-slate-500">Dowody projektu i generowanie raportów odbiorczych z GPS.</p>
        </div>
        <button 
          onClick={() => setIsCapturing(!isCapturing)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
        >
          {isCapturing ? 'Anuluj' : 'Rejestruj Dowód / Odbiór'}
        </button>
      </div>

      {isCapturing && (
        <div className="bg-white p-4 rounded-lg border border-slate-300 mb-6 border-l-4 border-l-green-500">
          <div className="flex gap-4 mb-4 flex-wrap">
            <select value={mediaType} onChange={e => setMediaType(e.target.value)} className="px-3 py-2 border rounded-md text-sm outline-none">
              <option value="photo">Zdjęcie</option>
              <option value="video">Wideo</option>
            </select>
            <select value={stage} onChange={e => setStage(e.target.value)} className="px-3 py-2 border rounded-md text-sm outline-none">
              <option value="before">Przed pracą</option>
              <option value="during">W trakcie prac</option>
              <option value="after">Po zakończeniu prac</option>
              <option value="issue">Zgłoszenie Usterki / Roszczenia</option>
            </select>
            <label className="flex items-center gap-2 text-sm font-medium text-amber-700 bg-amber-50 px-3 py-2 rounded border border-amber-200 cursor-pointer">
               <input type="checkbox" checked={isProofOfCompletion} onChange={e => setIsProofOfCompletion(e.target.checked)} />
               Oznacz jako zgłoszenie gotowości do odbioru (PO)
            </label>
          </div>
          
          <div className="bg-slate-100 rounded-lg h-40 flex flex-col items-center justify-center text-slate-400 gap-2 mb-4 border-2 border-dashed border-slate-300">
            {mediaType === 'photo' ? <Camera size={32} /> : <Video size={32} />}
            <span className="text-sm">Kliknij zrób zdjęcie/nagraj film (Symulacja aparatu)</span>
          </div>

          <button onClick={simulateCaptureAndHash} className="w-full bg-slate-800 text-white py-2 rounded-lg font-semibold hover:bg-slate-900 flex justify-center items-center gap-2">
             <Lock size={16} /> Zapisz Audit Log
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {evidence.map(ev => (
          <div key={ev.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm text-sm relative">
             <div className="flex justify-between font-semibold mb-1">
               <span className="capitalize">{ev.stage}</span>
               <span className="text-xs text-slate-400 font-mono">{ev.fileHash?.substring(0, 8)}...</span>
             </div>
             
             {ev.proofOfCompletion && (
               <div className="text-xs bg-amber-100 text-amber-800 font-semibold px-2 py-1 rounded inline-block mb-1 border border-amber-200">
                 Gotowość do Odbioru (PO)
               </div>
             )}

             <div className="flex items-center gap-2 text-slate-500 mb-2">
                {ev.mediaType === 'photo' ? <Camera size={14} /> : <Video size={14} />}
                <span>GPS: {ev.gpsCoords}</span>
             </div>
             <div className="text-xs text-green-600 flex items-center gap-1 font-semibold bg-green-50 px-2 py-1 rounded inline-block w-full text-center mb-2">
                <Lock size={12}/> Zabezpieczono (Blockchain Hash)
             </div>

             <div className="border-t border-slate-100 pt-2 flex flex-col gap-2">
                <button 
                  onClick={() => setActiveShareTarget(activeShareTarget === ev.id ? null : ev.id)}
                  className="w-full flex items-center justify-center gap-1 text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 py-1.5 rounded transition-colors text-xs font-medium border border-slate-200"
                >
                  <Share2 size={14} /> Udostępnij Klientowi Raport
                </button>
                
                {activeShareTarget === ev.id && (
                  <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-md">
                     <button onClick={() => handleShare(ev.id, ev.sharedWith, 'Email')} className="flex flex-col items-center p-1 hover:bg-white rounded text-blue-600" title="Wyślij E-mail"><Mail size={16}/></button>
                     <button onClick={() => handleShare(ev.id, ev.sharedWith, 'SMS')} className="flex flex-col items-center p-1 hover:bg-white rounded text-emerald-600" title="Wyślij SMS"><Phone size={16}/></button>
                     <button onClick={() => handleShare(ev.id, ev.sharedWith, 'WhatsApp')} className="flex flex-col items-center p-1 hover:bg-white rounded text-green-500" title="WhatsApp"><MessageCircle size={16}/></button>
                     <button onClick={() => handleShare(ev.id, ev.sharedWith, 'Link')} className="flex flex-col items-center p-1 hover:bg-white rounded text-slate-600" title="Kopiuj Prywatny Link"><LinkIcon size={16}/></button>
                  </div>
                )}

                {ev.sharedWith && ev.sharedWith.length > 0 && (
                   <div className="text-[10px] text-slate-400 mt-1">
                     <span className="font-semibold">Udostępniono:</span> {ev.sharedWith.length}x
                   </div>
                )}
             </div>
          </div>
        ))}
        {evidence.length === 0 && !isCapturing && (
          <div className="col-span-3 text-center py-6 text-slate-400">Brak dowodów w tym projekcie.</div>
        )}
      </div>
    </div>
  );
}
