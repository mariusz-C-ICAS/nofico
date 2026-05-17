import React, { useState, useEffect } from 'react';
import { useAuth } from '../../shared/hooks/AuthContext';
import { db } from '../../shared/lib/firebase';
import { collection, query, getDocs, deleteDoc, doc, where, getDoc } from 'firebase/firestore';
import { Database, Trash2, CheckCircle2, History, AlertTriangle, Lock, Wand2, Square, SquareCheck } from 'lucide-react';
import { generateAllModulesV2, type IdesModule } from '../../shared/utils/idesGeneratorsV2';

const ALL_MODULES: { id: IdesModule; label: string; desc: string }[] = [
  { id: 'hr',           label: 'HR',            desc: 'Działy, stanowiska, 35 pracowników, urlopy, rekrutacja' },
  { id: 'crm',          label: 'CRM',           desc: '12 klientów, kontakty, szanse sprzedaży, aktywności' },
  { id: 'projects',     label: 'Projekty',      desc: '7 projektów, zadania, MPK / centra kosztów' },
  { id: 'finance',      label: 'Finanse',       desc: '16 faktur, 12 wydatków (14+ miesięcy historii)' },
  { id: 'timeTracking', label: 'Czas pracy',    desc: '80 wpisów time tracking z historią 14+ miesięcy' },
  { id: 'auditLogs',    label: 'Logi audytu',   desc: '50 wpisów audytowych (create/update/delete/approve)' },
];

export default function TestDataAdminModule() {
  const { activeTenantId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [isProduction, setIsProduction] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const [selected, setSelected] = useState<Set<IdesModule>>(new Set(ALL_MODULES.map(m => m.id)));

  useEffect(() => {
    if (!activeTenantId) return;
    getDoc(doc(db, 'tenants', activeTenantId)).then(d => {
      if (d.exists()) {
        setIsProduction(!!d.data().isProduction);
        setTenantName(d.data().name || '');
      }
    }).catch(() => {});
  }, [activeTenantId]);

  const addLog = (msg: string) => setLogs(prev => [`${new Date().toLocaleTimeString()}: ${msg}`, ...prev]);

  const toggleModule = (id: IdesModule) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(prev => prev.size === ALL_MODULES.length ? new Set() : new Set(ALL_MODULES.map(m => m.id)));
  };

  const handleGenerate = async () => {
    if (!activeTenantId) return alert('Wybierz organizację z listy u góry');
    if (selected.size === 0) return alert('Zaznacz co najmniej jeden moduł');
    try {
      setLoading(true);
      addLog(`Rozpoczynam generowanie IDES dla: ${[...selected].join(', ')}…`);
      const results = await generateAllModulesV2(activeTenantId, [...selected] as IdesModule[], addLog);
      const summary = Object.entries(results).map(([k, v]) => `${k}: ${v}`).join(', ');
      addLog(`Gotowe! Wygenerowano: ${summary}`);
    } catch (e) {
      addLog(`BŁĄD: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClearData = async () => {
    if (!activeTenantId) return alert('Wybierz organizację z listy u góry');
    if (!window.confirm('UWAGA! Usunięte zostaną wszystkie dane transakcyjne i master data. Czy na pewno?')) return;
    try {
      setLoading(true);
      const cols = ['employees','hr_roles','hr_departments','leaves','timeEntries','customers','crm_contacts','crm_deals','projects','tasks','invoices','expenses','costCenters','auditLogs'];
      for (const col of cols) {
        addLog(`Kasowanie: ${col}…`);
        const q = query(collection(db, col), where('tenantId', '==', activeTenantId));
        const snap = await getDocs(q);
        for (const d of snap.docs) await deleteDoc(d.ref);
        addLog(`Usunięto ${snap.size} dok. z ${col}`);
      }
      // subcollections
      const subCols = ['crmActivities','npsResponses'];
      for (const sub of subCols) {
        const snap = await getDocs(collection(db, `tenants/${activeTenantId}/${sub}`));
        for (const d of snap.docs) await deleteDoc(d.ref);
        addLog(`Usunięto ${snap.size} dok. z tenants/.../${sub}`);
      }
      addLog('Czyszczenie danych zakończone.');
    } catch (e) {
      addLog(`BŁĄD: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClearConfig = async () => {
    if (!activeTenantId) return alert('Wybierz organizację z listy u góry');
    if (!window.confirm('UWAGA! Usunięta zostanie konfiguracja systemu. Czy na pewno?')) return;
    try {
      setLoading(true);
      const paths = [
        `hrSettings/${activeTenantId}`, `hrSettings/${activeTenantId}_skills`,
        `hrSettings/${activeTenantId}_recruitments`, `hrSettings/${activeTenantId}_candidates`,
        `tenantSettings/${activeTenantId}`, `aiSettings/${activeTenantId}`,
      ];
      for (const p of paths) {
        try { await deleteDoc(doc(db, p)); addLog(`Usunięto: ${p}`); } catch { /* skip */ }
      }
      addLog('Czyszczenie konfiguracji zakończone.');
    } catch (e) {
      addLog(`BŁĄD: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  if (isProduction) {
    return (
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 flex flex-col items-center justify-center p-8 text-center min-h-[50vh]">
        <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-6">
          <Lock size={32} />
        </div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Środowisko Produkcyjne</h2>
        <p className="text-slate-500 max-w-lg">
          Tenant <strong>{tenantName}</strong> jest oznaczony jako produkcyjny. Generowanie danych wzorcowych i Hard Reset są zablokowane.
        </p>
      </div>
    );
  }

  const allSelected = selected.size === ALL_MODULES.length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">

        {/* Header */}
        <div className="p-8 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-4 items-center">
            <div className="bg-indigo-600 rounded-xl p-3 shadow-lg shadow-indigo-600/30">
              <Database className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Dane IDES — Generowanie</h2>
              <p className="text-sm font-medium text-slate-500">Dane wzorcowe z historią 14+ miesięcy · {tenantName || activeTenantId}</p>
            </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading || selected.size === 0}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-md transition-colors disabled:opacity-50"
          >
            <Wand2 size={16} /> {loading ? 'Generowanie…' : 'Generuj zaznaczone'}
          </button>
        </div>

        <div className="p-8 grid lg:grid-cols-2 gap-8">

          {/* Module selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-800">Wybierz moduły</h3>
              <button
                onClick={toggleAll}
                className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                {allSelected ? <SquareCheck size={14} /> : <Square size={14} />}
                {allSelected ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}
              </button>
            </div>

            {ALL_MODULES.map(m => (
              <button
                key={m.id}
                onClick={() => toggleModule(m.id)}
                className={`w-full text-left flex items-start gap-3 p-4 rounded-2xl border-2 transition-all ${
                  selected.has(m.id)
                    ? 'border-indigo-400 bg-indigo-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {selected.has(m.id)
                  ? <SquareCheck size={18} className="text-indigo-600 flex-shrink-0 mt-0.5" />
                  : <Square size={18} className="text-slate-400 flex-shrink-0 mt-0.5" />
                }
                <div>
                  <div className="font-bold text-slate-800 text-sm">{m.label}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{m.desc}</div>
                </div>
              </button>
            ))}

            {/* Clear section */}
            <div className="border border-rose-200 bg-rose-50/50 rounded-2xl p-5 mt-4">
              <h3 className="font-bold text-rose-800 flex gap-2 items-center mb-3">
                <AlertTriangle size={16} /> Hard Reset
              </h3>
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleClearData}
                  disabled={loading}
                  className="bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex gap-2 items-center disabled:opacity-50"
                >
                  <Trash2 size={13} /> Usuń dane transakcyjne
                </button>
                <button
                  onClick={handleClearConfig}
                  disabled={loading}
                  className="bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex gap-2 items-center disabled:opacity-50"
                >
                  <Trash2 size={13} /> Usuń konfigurację systemu
                </button>
                <button
                  onClick={async () => { await handleClearData(); await handleClearConfig(); }}
                  disabled={loading}
                  className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex gap-2 items-center disabled:opacity-50"
                >
                  <Trash2 size={15} /> Hard Reset — usuń wszystko
                </button>
              </div>
            </div>
          </div>

          {/* Log panel */}
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 flex gap-2 items-center">
              <History size={16} /> Log operacji
            </h3>
            <div className="bg-slate-900 rounded-2xl p-4 min-h-[500px] max-h-[600px] shadow-inner font-mono text-xs overflow-y-auto">
              {logs.length === 0
                ? <div className="text-slate-600 italic">Oczekuję na komendy…</div>
                : logs.map((l, i) => (
                    <div key={i} className={`mb-1 ${l.startsWith(new Date().toLocaleTimeString().slice(0,2)) && l.includes('BŁĄD') ? 'text-rose-400' : l.includes('Gotowe') ? 'text-emerald-300 font-bold' : 'text-emerald-400'}`}>
                      {l}
                    </div>
                  ))
              }
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Zaznaczono', value: `${selected.size} / ${ALL_MODULES.length}` },
                { label: 'Historia', value: '14+ mies.' },
                { label: 'Pola w bazie', value: '100%' },
              ].map(c => (
                <div key={c.label} className="bg-slate-50 rounded-xl p-3 text-center border border-slate-200">
                  <div className="text-lg font-black text-indigo-600">{c.value}</div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wide mt-0.5">{c.label}</div>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
              <strong>Dane IDES</strong> — realistyczne dane polskiego rynku z datami historycznymi od marca 2025 do dziś. Każde pole Firestore jest wypełnione. Idealne do demonstracji i szkoleń.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
