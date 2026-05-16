import React, { useState, useEffect } from 'react';
import { useAuth } from '../../shared/hooks/AuthContext';
import { generateIdesData } from '../hr/utils/generateIdesData';
import { db } from '../../shared/lib/firebase';
import { collection, query, getDocs, deleteDoc, doc, where, getDoc } from 'firebase/firestore';
import { Database, Trash2, CheckCircle2, History, AlertTriangle, Lock } from 'lucide-react';

export default function TestDataAdminModule() {
  const { activeTenantId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [isProduction, setIsProduction] = useState(false);

  useEffect(() => {
    const fetchTenantMode = async () => {
      if (!activeTenantId) return;
      try {
        const tDoc = await getDoc(doc(db, 'tenants', activeTenantId));
        if (tDoc.exists() && tDoc.data().isProduction) {
          setIsProduction(true);
        } else {
          setIsProduction(false);
        }
      } catch (err) {
        console.error('Error fetching tenant mode:', err);
      }
    };
    fetchTenantMode();
  }, [activeTenantId]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  const clearMessage = () => setTimeout(() => setMessage(''), 5000);

  if (isProduction) {
    return (
       <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden min-h-[50vh] flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-6">
             <Lock size={32} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Środowisko Produkcyjne</h2>
          <p className="text-slate-500 max-w-lg mb-8">
             Bieżący profil operacyjny (Tenant) został oznaczony jako układ produkcyjny.
             Akcje takie jak generowanie masowych danych wzorcowych oraz czyszczenie systemowe (Hard Reset) zostały zablokowane ze względów bezpieczeństwa.
          </p>
       </div>
    );
  }

  const handleGenerateHR = async () => {
    if (!activeTenantId) return alert('Wybierz organizację z listy u góry');
    
    try {
      setLoading(true);
      setMessage('Generowanie danych HR IDES...');
      addLog('Rozpoczęto generowanie struktury organizacyjnej, stanowisk (roles) i pracowników...');
      const res = await generateIdesData(activeTenantId);
      setMessage('Zakończono sukcesem!');
      addLog(`Utworzono: ${res.depts} działów, ${res.roles} ról, ${res.employees} pracowników.`);
    } catch (e) {
       console.error(e);
       setMessage('Wystąpił błąd podczas generowania danych.');
       addLog(`BŁĄD: ${(e as Error).message}`);
    } finally {
       setLoading(false);
       clearMessage();
    }
  };

  const handleClearData = async () => {
    if (!activeTenantId) return alert('Wybierz organizację z listy u góry');
    if (!window.confirm('UWAGA! Usunięte zostaną wszystkie dane transakcyjne i master data (Pracownicy, Stanowiska, Działy). Czy na pewno?')) return;

    try {
      setLoading(true);
      setMessage('Rozpoczynam kasowanie danych...');
      addLog('Rozpoczęto usuwanie danych transakcyjnych i master data...');

      const collectionsToClear = ['employees', 'hr_roles', 'hr_departments', 'leaves', 'timeEntries', 'recruitments', 'candidates'];
      
      for (const colName of collectionsToClear) {
         addLog(`Kasowanie kolekcji: ${colName}...`);
         const q = query(collection(db, colName), where('tenantId', '==', activeTenantId));
         const snapshot = await getDocs(q);
         let deleted = 0;
         for (const d of snapshot.docs) {
            await deleteDoc(d.ref);
            deleted++;
         }
         addLog(`Usunięto ${deleted} dokumentów z ${colName}.`);
      }

      setMessage('Zakończono usuwanie danych.');
      addLog('Operacja czyszczenia danych zakończona sukcesem.');
    } catch (e) {
      console.error(e);
      setMessage('Wystąpił błąd podczas usuwania danych.');
      addLog(`BŁĄD: ${(e as Error).message}`);
    } finally {
      setLoading(false);
      clearMessage();
    }
  };

  const handleClearConfig = async () => {
    if (!activeTenantId) return alert('Wybierz organizację z listy u góry');
    if (!window.confirm('UWAGA! Usunięta zostanie konfiguracja systemu (iFrames, emaile, ustawienia, uprawnienia). Czy na pewno?')) return;

    try {
      setLoading(true);
      setMessage('Rozpoczynam kasowanie konfiguracji...');
      addLog('Rozpoczęto usuwanie konfiguracji systemu...');

      // Remove global settings that are document-based with activeTenantId or within specific collections
      addLog('Kasowanie dokumentów konfiguracji...');
      const settingsPaths = [
         `hrSettings/${activeTenantId}`,
         `hrSettings/${activeTenantId}_skills`,
         `hrSettings/${activeTenantId}_recruitments`,
         `hrSettings/${activeTenantId}_candidates`,
         `tenantSettings/${activeTenantId}`,
         `aiSettings/${activeTenantId}`,
         `emailDefinitions/${activeTenantId}`,
         `iframeSettings/${activeTenantId}`
      ];

      for (const path of settingsPaths) {
         try {
            await deleteDoc(doc(db, path));
            addLog(`Usunięto ścieżkę: ${path}`);
         } catch {
            // ignore if not exists
         }
      }

      const collectionsToClear = ['iframeSettings', 'emailDefinitions', 'customSettings'];
      for (const colName of collectionsToClear) {
         addLog(`Kasowanie konfiguracji z kolekcji: ${colName}...`);
         const q = query(collection(db, colName), where('tenantId', '==', activeTenantId));
         const snapshot = await getDocs(q);
         let deleted = 0;
         for (const d of snapshot.docs) {
            await deleteDoc(d.ref);
            deleted++;
         }
         addLog(`Usunięto ${deleted} dokumentów konfiguracji z ${colName}.`);
      }

      setMessage('Zakończono usuwanie konfiguracji.');
      addLog('Operacja czyszczenia konfiguracji zakończona sukcesem.');
    } catch (e) {
      console.error(e);
      setMessage('Wystąpił błąd podczas usuwania konfiguracji.');
      addLog(`BŁĄD: ${(e as Error).message}`);
    } finally {
      setLoading(false);
      clearMessage();
    }
  };

  const handleClearAllData = async () => {
    if (!activeTenantId) return alert('Wybierz organizację z listy u góry');
    if (!window.confirm('UWAGA! Ta operacja jest NIEODWRACALNA. Usunie WSZYSTKIE pobrane dokumenty (Działy, Stanowiska, Pracowników, Ustawienia, iFrames) dla bieżącej organizacji. Czy na pewno kontynuować?')) return;

    await handleClearData();
    await handleClearConfig();
  };

  return (
    <div className="space-y-6">
       <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-8 border-b border-slate-100 bg-slate-50 flex gap-4 items-center">
             <div className="bg-indigo-600 rounded-xl p-3 shadow-lg shadow-indigo-600/30">
                <Database className="text-white" size={24} />
             </div>
             <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Dane Wzorcowe & IDES</h2>
                <p className="text-sm font-medium text-slate-500">Zarządzanie środowiskiem testowym i demonstracyjnym</p>
             </div>
          </div>

          <div className="p-8 grid md:grid-cols-2 gap-8">
             <div className="space-y-6">
                <div className="border border-slate-200 bg-white rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:border-indigo-300 transition-colors">
                   <div className="absolute top-0 right-0 p-6 opacity-5 rotate-12 group-hover:rotate-0 transition-transform"><Database size={64} /></div>
                   <h3 className="font-bold text-lg text-slate-800 mb-2">Moduł HR (OM, PA, REQ)</h3>
                   <p className="text-sm text-slate-500 mb-6 relative z-10">Generuje pełną strukturę organizacyjną, menedżerów, kilkudziesięciu pracowników, kandydatów oraz stanowiska.</p>
                   <button 
                      onClick={handleGenerateHR} 
                      disabled={loading}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-md flex gap-2 items-center disabled:opacity-50"
                   >
                      <CheckCircle2 size={16} /> Generuj HR IDES
                   </button>
                </div>

                <div className="border border-dashed border-amber-300 bg-amber-50 rounded-2xl p-6 shadow-sm">
                   <h3 className="font-bold text-lg text-amber-800 mb-2">Kolejne moduły wkrótce</h3>
                   <p className="text-sm text-amber-700">W przyszłych wersjach: CRM, Projekty, Finanse i Logistyka zyskają dedykowane zasilenia Danych Wzorcowych.</p>
                </div>
             </div>

             <div className="space-y-6">
                <div className="border border-rose-200 bg-rose-50/50 rounded-2xl p-6 relative overflow-hidden group">
                   <h3 className="font-bold text-lg text-rose-800 mb-2 flex gap-2 items-center"><AlertTriangle size={18} /> Czyszczenie (Hard Reset)</h3>
                   <p className="text-sm text-rose-700 mb-6">Trwale usuwa wszystkie wygenerowane dane transakcyjne, konfiguracje i bazę Master Data dla wybranego obszaru (Tenanta). Ta akcja jest nieodwracalna.</p>
                   <div className="flex flex-col gap-3">
                      <button 
                         onClick={handleClearData}
                         disabled={loading}
                         className="bg-amber-100/50 hover:bg-amber-100 text-amber-700 border border-amber-200 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm flex gap-2 items-center disabled:opacity-50 transition-colors"
                      >
                         <Trash2 size={14} /> Usuń dane (Transakcyjne & Master Data)
                      </button>
                      <button 
                         onClick={handleClearConfig}
                         disabled={loading}
                         className="bg-amber-100/50 hover:bg-amber-100 text-amber-700 border border-amber-200 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm flex gap-2 items-center disabled:opacity-50 transition-colors"
                      >
                         <Trash2 size={14} /> Usuń konfigurację (Ustawienia systemu)
                      </button>
                      <button 
                         onClick={handleClearAllData}
                         disabled={loading}
                         className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-md flex gap-2 items-center disabled:opacity-50 transition-colors"
                      >
                         <Trash2 size={16} /> Hard Reset - Usuń wszystko
                      </button>
                   </div>
                </div>

                <div className="bg-slate-900 rounded-2xl p-4 min-h-[150px] shadow-inner font-mono text-xs overflow-y-auto w-full custom-scrollbar">
                   <div className="flex gap-2 items-center text-slate-500 mb-4 pb-2 border-b border-slate-800 font-bold uppercase tracking-widest text-[9px]"><History size={12} /> Log Operacji</div>
                   {message && <div className="text-amber-400 font-bold mb-2">&gt; {message}</div>}
                   {logs.map((log, idx) => (
                      <div key={idx} className="text-emerald-400 mb-1 opacity-80">{log}</div>
                   ))}
                   {logs.length === 0 && !message && <div className="text-slate-600 italic">Oczekuję na komendy...</div>}
                </div>
             </div>
          </div>
       </div>
    </div>
  );
}
