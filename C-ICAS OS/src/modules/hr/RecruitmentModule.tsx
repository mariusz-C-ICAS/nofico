import React, { useState, useEffect, useRef } from 'react';
import { toast } from '../../shared/utils/toast';
import { 
  Sparkles, CheckCircle2, X, Filter, Heart, Target, 
  Users, Building2, Download, UploadCloud, Link as LinkIcon,
  Calendar, GitBranch, Briefcase, Plus, UserPlus, Server, Monitor
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTenant } from '../../shared/hooks/useTenant';
import { db } from '../../shared/lib/firebase';
import { collection, addDoc, doc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import CareersIframeSettings from '../admin/CareersIframeSettings';

export default function RecruitmentModule() {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'fast_screen' | 'sourcing' | 'mass_import' | 'iframes'>('sourcing');
  const [importStatus, setImportStatus] = useState<'idle' | 'uploading' | 'validating' | 'success'>('idle');
  const { activeTenantId } = useTenant();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStatus('uploading');
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = (ev.target?.result as string) || '';
      const lines = content.split('\n').filter(l => l.trim());
      const isValid = lines.length > 1 && (
        content.toLowerCase().includes('mpk') ||
        content.toLowerCase().includes('stanowisko') ||
        content.toLowerCase().includes('jednostka')
      );
      setImportStatus(isValid ? 'success' : 'validation_error' as any);
    };
    reader.onerror = () => setImportStatus('validation_error' as any);
    reader.readAsText(file);
    e.target.value = '';
  };

  const [candidates, setCandidates] = useState<any[]>([]);
  const [openings, setOpenings] = useState<any[]>([]);
  const [swipeIndex, setSwipeIndex] = useState(0);

  const tinderCandidates = [
    { id: '1', name: 'Tomasz Kowalski', age: 34, role: 'Operator CNC', score: 92, match: ['Angielski B2', 'Frezarka CNC'], missing: ['3 lata dośw. (wymagane 5)'], note: 'System rekomenduje rozmowę techniczną z uwagi na certyfikat w bazie.' },
    { id: '2', name: 'Anna Nowak', age: 28, role: 'Specjalista HR', score: 88, match: ['Rekrutacja IT', 'Soft Skills'], missing: ['Brak certyfikatu SHL'], note: 'Wybitne doświadczenie w sourcingu (Adecco API match).' },
    { id: '3', name: 'Piotr Wiśniewski', age: 41, role: 'Kierownik Budowy', score: 76, match: ['Uprawnienia budowlane', 'Prowadzenie dużych kontraktów'], missing: ['Język Niemiecki'], note: 'Silny kandydat na rynek lokalny.' },
  ];

  const handleSwipe = (direction: 'left' | 'right') => {
    console.log(`Swiped ${direction}`);
    setSwipeIndex(prev => prev + 1);
  };

  useEffect(() => {
    if (!activeTenantId) return;

    const unRec = onSnapshot(doc(db, 'hrSettings', activeTenantId + '_recruitments'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setOpenings(data.openPositions || []);
      } else {
        setOpenings([]);
      }
    });

    const unCand = onSnapshot(doc(db, 'hrSettings', activeTenantId + '_candidates'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCandidates(data.list || []);
      } else {
        setCandidates([]);
      }
    });

    return () => {
      unRec();
      unCand();
    };
  }, [activeTenantId]);

  const handleHire = async (candidateName: string) => {
    // Symulacja transferu Kandydata na Pracownika
    try {
      const parts = candidateName.split(' ');
      
      const newEmployeeRef = doc(collection(db, 'employees'));
      await setDoc(newEmployeeRef, {
        tenantId: activeTenantId,
        firstName: parts[0] || '',
        lastName: parts[1] || '',
        employeeType: 'P',
        status: 'Aktywny',
        personalDataValidFrom: new Date().toISOString().split('T')[0],
        personalDataValidTo: '9999-12-31',
        createdAt: serverTimestamp(),
      });
      toast.success(`Sukces: Zakończono rekrutację dla ${candidateName}. Utworzono profil pracownika (Dane Podstawowe). Wyniki w zakładce Pracownicy.`);
    } catch (e) {
      console.error(e);
      toast.error('Wystąpił błąd podczas zatrudniania.');
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50">
        <div>
          <h3 className="text-lg font-black text-indigo-900 uppercase italic tracking-tighter flex items-center gap-2">
            <Users className="text-indigo-500" size={24}/> Rekrutacja i Sourcing
          </h3>
          <p className="text-xs text-slate-500 mt-1 font-medium">Standardy agencyjne, mass-import struktur organizacyjnych i transfery 1-click.</p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('sourcing')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${activeTab === 'sourcing' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
          >
            Sourcing & Agencje
          </button>
          <button 
            onClick={() => setActiveTab('pipeline')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${activeTab === 'pipeline' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
          >
            Lejek & Transfer
          </button>
          <button 
            onClick={() => setActiveTab('mass_import')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${activeTab === 'mass_import' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
          >
            Mass Import Struktury
          </button>
          <button 
            onClick={() => setActiveTab('fast_screen')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${activeTab === 'fast_screen' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
          >
             Fast Match(UI)
          </button>
          <button 
            onClick={() => setActiveTab('iframes')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${activeTab === 'iframes' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'} flex gap-1 items-center`}
          >
             <Monitor size={14} /> Oferty (iFrame)
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
         {activeTab === 'sourcing' && (
           <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute right-0 top-0 p-8 opacity-10"><LinkIcon size={120} /></div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">Integracje Zewnętrzne (Sourcing)</h4>
                <p className="text-sm font-medium text-slate-300 max-w-2xl leading-relaxed mb-6">
                  Pobieraj kandydatów bezpośrednio z API firm rekrutacyjnych oraz systemów ATS partnerów (np. Adecco, Pracuj.pl, Randstad).
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex items-center justify-between">
                     <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400 font-black">Ad</div>
                       <div>
                         <div className="text-xs font-bold">Adecco API</div>
                         <div className="text-[9px] text-emerald-400">Połączono</div>
                       </div>
                     </div>
                     <button className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded font-bold transition-colors">Synchronizuj</button>
                   </div>
                   <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex items-center justify-between">
                     <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400 font-black">Pr</div>
                       <div>
                         <div className="text-xs font-bold">Pracuj.pl</div>
                         <div className="text-[9px] text-slate-400">Brak klucza API</div>
                       </div>
                     </div>
                     <button className="text-xs bg-indigo-600 hover:bg-indigo-500 px-3 py-1 rounded font-bold transition-colors">Testuj</button>
                   </div>
                </div>
              </div>
                       <div className="bg-white border border-slate-200 rounded-2xl p-6">
                 <h4 className="font-bold text-sm text-slate-800 uppercase mb-4">Pulowani Kandydaci (Baza)</h4>
                 <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 text-xs font-medium uppercase">
                         <th className="py-2 pb-3">Kandydat</th>
                         <th className="py-2 pb-3">Źródło</th>
                         <th className="py-2 pb-3">Stanowisko (Match)</th>
                         <th className="py-2 pb-3">Akcja</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {candidates.length > 0 ? candidates.map((cand, idx) => {
                          const opening = openings.find(o => o.id === cand.appliedFor);
                          return (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                               <td className="py-3 font-bold text-slate-700">{cand.name}</td>
                               <td className="py-3"><span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-black">{cand.source}</span></td>
                               <td className="py-3">{opening ? opening.title : cand.appliedFor} <span className="text-emerald-500 font-bold ml-1">({cand.score}%)</span></td>
                               <td className="py-3"><button className="text-[10px] uppercase font-black bg-indigo-50 text-indigo-700 px-3 py-1 rounded border border-indigo-100 hover:bg-indigo-100">+ Dodaj do Pipeline</button></td>
                            </tr>
                          );
                       }) : (
                          <>
                             <tr className="hover:bg-slate-50 transition-colors">
                               <td className="py-3 font-bold text-slate-700">Anna Nowak</td>
                               <td className="py-3"><span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-black">Adecco API</span></td>
                               <td className="py-3">Księgowa / HR <span className="text-emerald-500 font-bold ml-1">(94%)</span></td>
                               <td className="py-3"><button className="text-[10px] uppercase font-black bg-indigo-50 text-indigo-700 px-3 py-1 rounded border border-indigo-100 hover:bg-indigo-100">+ Dodaj do Pipeline</button></td>
                             </tr>
                             <tr className="hover:bg-slate-50 transition-colors">
                               <td className="py-3 font-bold text-slate-700">Piotr Wiśniewski</td>
                               <td className="py-3"><span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-black">Baza Własna</span></td>
                               <td className="py-3">Kierownik Budowy <span className="text-amber-500 font-bold ml-1">(78%)</span></td>
                               <td className="py-3"><button className="text-[10px] uppercase font-black bg-indigo-50 text-indigo-700 px-3 py-1 rounded border border-indigo-100 hover:bg-indigo-100">+ Dodaj do Pipeline</button></td>
                             </tr>
                          </>
                       )}
                    </tbody>
                 </table>
              </div>
           </div>
         )}

         {activeTab === 'pipeline' && (
           <div className="space-y-6 animate-in fade-in duration-300">
               <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2"><Briefcase size={16} className="text-indigo-500"/> Aktywne Procesy Rekrutacyjne</h4>
                  <button className="text-[10px] bg-slate-900 text-white px-3 py-1.5 uppercase font-black tracking-widest rounded-lg">+ Nowy Wakat</button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Kolumna Kanban */}
                  <div className="bg-slate-100/50 rounded-2xl p-4 border border-slate-200/50 h-full">
                     <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Rozmowa Techniczna</h5>
                     <div className="space-y-3">
                        {candidates.filter(c => c.status === 'Rozmowa IT' || c.status === 'Nowy').map((c, idx) => {
                           const o = openings.find(x => x.id === c.appliedFor);
                           return (
                             <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative group">
                                <div className="font-bold text-sm text-slate-800">{c.name}</div>
                                <div className="text-[10px] text-slate-500 mt-1">Stanowisko: {o ? o.title : c.appliedFor}</div>
                                <button className="mt-3 w-full border border-slate-200 text-[10px] uppercase font-black text-slate-600 py-1.5 rounded-lg hover:bg-slate-50">Przesuń dalej</button>
                             </div>
                           );
                        })}
                     </div>
                  </div>
                  <div className="bg-slate-100/50 rounded-2xl p-4 border border-slate-200/50 h-full">
                     <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Weryfikacja HR / Zgoda</h5>
                     <div className="space-y-3">
                        {candidates.filter(c => c.status === 'Screening').map((c, idx) => {
                           const o = openings.find(x => x.id === c.appliedFor);
                           return (
                             <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative group">
                                <div className="font-bold text-sm text-slate-800">{c.name}</div>
                                <div className="text-[10px] text-slate-500 mt-1">Stanowisko: {o ? o.title : c.appliedFor}</div>
                                <button className="mt-3 w-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] uppercase font-black py-1.5 rounded-lg hover:bg-emerald-100">Przesuń dalej</button>
                             </div>
                           );
                        })}
                     </div>
                  </div>
                  <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100 h-full">
                     <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4">Gotowy do zatrudnienia (Transfer)</h5>
                     <div className="space-y-3">
                        {candidates.filter(c => c.status === 'Gotowy do zatrudnienia').map((c, idx) => {
                           const o = openings.find(x => x.id === c.appliedFor);
                           return (
                             <div key={idx} className="bg-white p-4 rounded-xl border-2 border-emerald-200 shadow-md relative group transition-all hover:scale-[1.02]">
                                <div className="absolute -top-2 -right-2 bg-emerald-500 text-white rounded-full p-1"><CheckCircle2 size={12}/></div>
                                <div className="font-bold text-sm text-slate-800">{c.name}</div>
                                <div className="text-[10px] text-slate-500 mt-1 mb-3">Stanowisko: {o ? o.title : c.appliedFor}</div>
                                
                                <button 
                                  onClick={() => handleHire(c.name)}
                                  className="w-full bg-slate-900 text-white text-[10px] uppercase font-black py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 shadow-lg shadow-slate-900/20"
                                >
                                  <UserPlus size={14}/> Zatrudnij (1-Click)
                                </button>
                             </div>
                           );
                        })}
                     </div>
                  </div>
               </div>
           </div>
         )}

         {activeTab === 'mass_import' && (
           <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
               <div className="text-center p-8 bg-white border border-slate-200 rounded-3xl shadow-sm">
                  <div className="w-20 h-20 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Server size={32} />
                  </div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Mass Import Struktur i Wakatów (Dino/Biedronka Scale)</h3>
                  <p className="text-sm text-slate-500 mt-2 max-w-2xl mx-auto">
                    Uruchamiasz nową lokalizację, 100 nowych sklepów lub strukturę budowy? Wgraj plik Excel zawierający Jednostki Organizacyjne (O), Stanowiska (S), MPK oraz opisy wakatów. System automatycznie utworzy te struktury z datą wejścia w życie "w przyszłości" i wygeneruje pulę wakatów dla Sourcerów.
                  </p>
               </div>

               <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-3xl p-12 text-center transition-colors hover:border-indigo-400 hover:bg-indigo-50/50">
                   {importStatus === 'idle' && (
                     <>
                        <UploadCloud size={48} className="mx-auto text-slate-400 mb-4" />
                        <h4 className="text-lg font-bold text-slate-700">Upuść plik Excel lub CSV tutaj</h4>
                        <p className="text-xs text-slate-500 mt-2 mb-6">Wspierane formaty: .xlsx, .csv (wg szablonu mass-import-template.xlsx)</p>
                        <>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.csv"
                            className="hidden"
                            onChange={handleFileSelect}
                          />
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-200 hover:bg-indigo-700"
                          >
                            Wybierz plik
                          </button>
                        </>
                     </>
                   )}
                   {importStatus === 'uploading' && (
                     <div className="py-8">
                        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                        <h4 className="text-sm font-bold text-slate-700">Przesyłanie pliku ze strukturą...</h4>
                     </div>
                   )}
                   {importStatus === 'validating' && (
                     <div className="py-8">
                        <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin mx-auto mb-4"></div>
                        <h4 className="text-sm font-bold text-slate-700">Walidacja kolumn Excela (O, S, MPK)...</h4>
                        <p className="text-xs text-slate-500 mt-2">Zabezpieczenie przed zapętleniem i błędami MPK (Atomicity Check)</p>
                     </div>
                   )}
                   {(importStatus as any) === 'validation_error' && (
                     <div className="py-6 text-left animate-in zoom-in-95 bg-white p-6 rounded-2xl shadow-xl border border-rose-200">
                        <div className="flex items-center gap-3 mb-4">
                           <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center shrink-0">
                             <X size={20} />
                           </div>
                           <div>
                             <h4 className="text-base font-black text-slate-800">Błąd Walidacji Struktury (Atomicity Error)</h4>
                             <p className="text-[10px] uppercase font-black text-rose-500 tracking-widest">Wykryto zapętlenie / błędne powiązania w pliku Excel</p>
                           </div>
                        </div>
                        
                        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 font-mono text-xs text-slate-600 mb-6 max-h-40 overflow-y-auto">
                           <div className="text-rose-600 font-bold mb-2">&gt; Błąd Krytyczny na Linii: 43 (Arkusz: Struktura)</div>
                           <div>Kolumna [Kierownik_MPK_ID]: Podano nieistniejący MPK "Biedronka_LOK_X299".</div>
                           <div className="mt-2 text-rose-600 font-bold mb-2">&gt; Błąd Krytyczny na Linii: 112 (Arkusz: Struktura)</div>
                           <div>Znaleziono obustronne przypisanie Działu A do Działu B (Odwrotna referencja / Zapętlenie).</div>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                           <p className="text-xs text-amber-800 font-medium">Ze względu na zasady <strong>Integralności (Atomicity)</strong>, żaden rekord nie został zaimportowany. Wszystkie błędy muszą zostać naprawione w Excelu lub zignorowane dla pominiętych wierszy, aby zapobiec importowi "połowy" struktury.</p>
                        </div>

                        <div className="flex gap-3 justify-end items-center border-t border-slate-100 pt-4">
                           <button onClick={() => setImportStatus('idle')} className="text-xs font-black uppercase text-slate-500 hover:text-slate-800 px-4 py-2">
                              Wgraj Poprawiony Plik
                           </button>
                           <button 
                             onClick={() => {
                               // Start bg task
                               window.dispatchEvent(new CustomEvent('addBgTask', { detail: { name: 'Ignoruj błędy i Importuj Resztę' } }));
                               setImportStatus('idle');
                             }}
                             className="text-xs font-black uppercase bg-indigo-50 text-indigo-700 px-4 py-2 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                           >
                              Zignoruj Błędne Linie i Wyślij w Tle
                           </button>
                        </div>
                     </div>
                   )}
                   {importStatus === 'success' && (
                     <div className="py-8 animate-in zoom-in-95">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                          <CheckCircle2 size={32} />
                        </div>
                        <h4 className="text-lg font-black text-slate-800">Import Zakończony Sukcesem</h4>
                        <div className="text-xs text-slate-500 mt-2 max-w-md mx-auto space-y-2">
                           <div className="flex justify-between border-b border-slate-200 pb-1"><span>Jednostki Organizacyjne (O):</span> <span className="font-bold text-slate-800">12</span></div>
                           <div className="flex justify-between border-b border-slate-200 pb-1"><span>Nowe Stanowiska (S):</span> <span className="font-bold text-slate-800">145</span></div>
                           <div className="flex justify-between border-b border-slate-200 pb-1"><span>Utworzone Wakaty (Do Rekrutacji):</span> <span className="font-bold text-slate-800">145</span></div>
                           <div className="flex justify-between pt-1"><span>Data Wejścia W Życie (Effective Date):</span> <span className="font-bold text-emerald-600">+2 miesiące</span></div>
                        </div>
                        <button 
                          onClick={() => setImportStatus('idle')}
                          className="mt-8 bg-slate-900 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800"
                        >
                          Załaduj Kolejny
                        </button>
                     </div>
                   )}
               </div>
           </div>
         )}

         {activeTab === 'fast_screen' && (
            <div className="flex flex-col md:flex-row gap-8 h-full">
                <div className="w-full md:w-80 shrink-0">
                  <div className="bg-white border border-slate-200 p-6 rounded-3xl sticky top-8 shadow-sm">
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-700 mb-4 flex items-center gap-2">
                        <Target size={16} className="text-blue-500" />
                        Wymagania Stanowiska
                      </h4>
                      <div className="space-y-3">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs font-bold text-slate-600">Język Angielski (B2)</div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs font-bold text-slate-600">Obsługa Frezarki CNC</div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs font-bold text-slate-600">5 lat doświadczenia</div>
                      </div>
                      <div className="mt-6 pt-6 border-t border-slate-100">
                        <button className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] uppercase py-3 rounded-xl transition-colors">Edytuj Wymagania</button>
                      </div>
                  </div>
                </div>
                
                <div className="flex-1 flex flex-col items-center justify-center min-h-[600px]">
                  <div className="relative w-full max-w-md aspect-[4/5] perspective-[1000px]">
                      <AnimatePresence mode="popLayout">
                        {swipeIndex < tinderCandidates.length ? (
                          <motion.div 
                            key={tinderCandidates[swipeIndex].id}
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            onDragEnd={(_, info) => {
                              if (info.offset.x > 100) handleSwipe('right');
                              else if (info.offset.x < -100) handleSwipe('left');
                            }}
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={(info) => ({
                              x: info?.x > 0 ? 500 : -500,
                              opacity: 0,
                              rotate: info?.x > 0 ? 20 : -20,
                              transition: { duration: 0.3 }
                            })}
                            className="absolute inset-0 bg-white border border-slate-200 rounded-[3rem] shadow-2xl p-8 z-10 flex flex-col justify-between cursor-grab active:cursor-grabbing"
                          >
                            <div>
                                <div className="flex justify-between items-start mb-6">
                                  <div>
                                      <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                                        {tinderCandidates[swipeIndex].name}, {tinderCandidates[swipeIndex].age}
                                      </h3>
                                      <p className="text-sm font-bold text-indigo-600 mt-1">Aplikuje na: {tinderCandidates[swipeIndex].role}</p>
                                  </div>
                                  <div className="bg-emerald-100 text-emerald-700 font-black text-lg px-3 py-1 rounded-2xl flex items-center gap-1 shadow-inner">
                                      <Sparkles size={16}/> {tinderCandidates[swipeIndex].score}%
                                  </div>
                                </div>
                                
                                <div className="space-y-4 mb-6">
                                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
                                      <h5 className="text-[10px] font-black uppercase text-emerald-600 tracking-widest mb-2 flex items-center gap-1">
                                        <CheckCircle2 size={12} /> Spełnia wymagania
                                      </h5>
                                      <div className="flex flex-wrap gap-2">
                                        {tinderCandidates[swipeIndex].match.map((m, i) => (
                                          <span key={i} className="bg-white text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-emerald-100">{m}</span>
                                        ))}
                                      </div>
                                  </div>
                                  <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl">
                                      <h5 className="text-[10px] font-black uppercase text-rose-600 tracking-widest mb-2 flex items-center gap-1">
                                        <X size={12} /> Braki kompetencyjne
                                      </h5>
                                      <div className="flex flex-wrap gap-2">
                                        {tinderCandidates[swipeIndex].missing.map((m, i) => (
                                          <span key={i} className="bg-white text-rose-700 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-rose-100">{m}</span>
                                        ))}
                                      </div>
                                  </div>
                                </div>
                                
                                <p className="text-xs text-slate-500 italic bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 font-medium">
                                  {tinderCandidates[swipeIndex].note}
                                </p>
                            </div>
                            
                            <div className="flex justify-center gap-6 mt-6">
                                <button 
                                  onClick={() => handleSwipe('left')}
                                  className="w-16 h-16 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:border-rose-500 hover:text-rose-500 hover:scale-110 active:scale-95 transition-all shadow-sm group"
                                >
                                  <X size={28} className="group-hover:rotate-12 transition-transform" />
                                </button>
                                <button 
                                  onClick={() => setSwipeIndex(0)}
                                  className="w-12 h-12 mt-2 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:border-blue-500 hover:text-blue-500 hover:scale-110 active:scale-95 transition-all shadow-sm group"
                                >
                                  <Filter size={20} className="group-hover:rotate-180 transition-transform duration-500" />
                                </button>
                                <button 
                                  onClick={() => handleSwipe('right')}
                                  className="w-16 h-16 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:border-emerald-500 hover:text-emerald-500 hover:scale-110 active:scale-95 transition-all shadow-sm group"
                                >
                                  <Heart size={28} className="group-hover:scale-125 transition-transform" />
                                </button>
                            </div>
                          </motion.div>
                        ) : (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-slate-100 rounded-[3rem] border border-dashed border-slate-300"
                          >
                             <CheckCircle2 size={48} className="text-emerald-500 mb-4" />
                             <h4 className="text-lg font-black text-slate-800 uppercase">Koniec Kolejki</h4>
                             <p className="text-xs text-slate-500 mt-2">Przejrzałeś wszystkich dostępnych kandydatów dla tego stanowiska.</p>
                             <button 
                               onClick={() => setSwipeIndex(0)}
                               className="mt-6 px-6 py-2 bg-slate-900 text-white text-[10px] font-black uppercase rounded-xl"
                             >
                               Zacznij od nowa
                             </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                  </div>
                </div>
            </div>
         )}
         {activeTab === 'iframes' && (
           <div className="animate-in fade-in duration-300">
              <CareersIframeSettings />
           </div>
         )}
      </div>
    </div>
  );
}

