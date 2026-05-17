import React, { useState, useEffect, useRef } from 'react';
import { useTenant } from '../../core/auth/TenantContext';
import { db } from '../../shared/lib/firebase';
import { collection, query, getDocs, deleteDoc, doc, where, getDoc } from 'firebase/firestore';
import { Database, Trash2, History, AlertTriangle, Lock, Wand2, Square, SquareCheck, Building2, ChevronDown, Plus } from 'lucide-react';
import { generateAllModulesV2, type IdesModule } from '../../shared/utils/idesGeneratorsV2';

const MAX_TENANTS = 3;

const ALL_MODULES: { id: IdesModule; label: string; desc: string }[] = [
  { id: 'hr',           label: 'HR',            desc: '10 działów, 22 stanowiska, 80 pracowników (aktywni / zwolnieni / nowi / na urlopie), lista płac, historia wynagrodzeń' },
  { id: 'crm',          label: 'CRM',           desc: '40 klientów, 60 kontaktów, 30 szans sprzedaży, 50 aktywności, 15 NPS' },
  { id: 'projects',     label: 'Projekty',      desc: '15 projektów, 150 zadań, 30 kamieni milowych, 8 MPK / centra kosztów' },
  { id: 'finance',      label: 'Finanse',       desc: '40 faktur, 30 wydatków, 12 budżetów, 50 transakcji bankowych (14+ miesięcy)' },
  { id: 'inventory',    label: 'Magazyn',       desc: '3 magazyny, 60 produktów, 120 stanów, 150 ruchów magazynowych, 20 zamówień zakupu' },
  { id: 'timeTracking', label: 'Czas pracy',    desc: '200 wpisów time tracking, 30 tygodniowych zestawień (14+ miesięcy)' },
  { id: 'auditLogs',    label: 'Logi audytu',   desc: '100 wpisów audytowych z pełnymi danymi (action, changes, IP, session)' },
  { id: 'fieldService', label: 'Field Service', desc: '15 techników, 25 urządzeń klientów, 40 zleceń serwisowych, 10 kontraktów SLA' },
];

export default function TestDataAdminModule() {
  const { currentTenant, availableTenants, switchTenant } = useTenant();

  const [overrideTenantId, setOverrideTenantId] = useState<string | null>(null);
  const tenantId = overrideTenantId ?? currentTenant?.id ?? null;
  const tenantObj = availableTenants.find(t => t.id === tenantId) ?? currentTenant;
  const tenantDisplayName = tenantObj?.name || tenantId || '—';

  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [isProduction, setIsProduction] = useState(false);
  const [selected, setSelected] = useState<Set<IdesModule>>(new Set(ALL_MODULES.map(m => m.id)));
  const [showOrgPicker, setShowOrgPicker] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showOrgPicker) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowOrgPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showOrgPicker]);

  useEffect(() => {
    if (!tenantId) return;
    setIsProduction(false);
    getDoc(doc(db, 'tenants', tenantId)).then(d => {
      if (d.exists()) setIsProduction(!!d.data().isProduction);
    }).catch(() => {});
  }, [tenantId]);

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
    if (!tenantId) return;
    if (selected.size === 0) { addLog('Zaznacz co najmniej jeden moduł'); return; }
    try {
      setLoading(true);
      addLog(`Generowanie IDES dla "${tenantDisplayName}": ${[...selected].join(', ')}…`);
      const results = await generateAllModulesV2(tenantId, [...selected] as IdesModule[], addLog);
      const summary = Object.entries(results).map(([k, v]) => `${k}: ${v}`).join(', ');
      addLog(`Gotowe! Wygenerowano: ${summary}`);
    } catch (e) {
      addLog(`BŁĄD: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClearData = async () => {
    if (!tenantId) return;
    if (!window.confirm(`UWAGA! Usunięte zostaną wszystkie dane z "${tenantDisplayName}". Czy na pewno?`)) return;
    try {
      setLoading(true);
      const cols = [
        'employees','hr_roles','hr_departments','leaves','salaryHistory','payroll',
        'timeEntries','timesheets',
        'customers','crm_contacts','crm_deals',
        'projects','tasks','milestones','costCenters',
        'invoices','expenses','budgets','bankTransactions',
        'warehouses','products','inventory','stockMovements','purchaseOrders',
        'technicians','serviceAssets','serviceOrders','serviceContracts',
        'auditLogs',
      ];
      for (const col of cols) {
        addLog(`Kasowanie: ${col}…`);
        const snap = await getDocs(query(collection(db, col), where('tenantId', '==', tenantId)));
        for (const d of snap.docs) await deleteDoc(d.ref);
        if (snap.size > 0) addLog(`Usunięto ${snap.size} dok. z ${col}`);
      }
      for (const sub of ['crmActivities','npsResponses']) {
        const snap = await getDocs(collection(db, `tenants/${tenantId}/${sub}`));
        for (const d of snap.docs) await deleteDoc(d.ref);
        if (snap.size > 0) addLog(`Usunięto ${snap.size} dok. z ${sub}`);
      }
      addLog('Czyszczenie danych zakończone.');
    } catch (e) {
      addLog(`BŁĄD: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClearConfig = async () => {
    if (!tenantId) return;
    if (!window.confirm('UWAGA! Usunięta zostanie konfiguracja systemu. Czy na pewno?')) return;
    try {
      setLoading(true);
      const paths = [
        `hrSettings/${tenantId}`, `hrSettings/${tenantId}_skills`,
        `hrSettings/${tenantId}_recruitments`, `hrSettings/${tenantId}_candidates`,
        `tenantSettings/${tenantId}`, `aiSettings/${tenantId}`,
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

  // ── No tenant selected ─────────────────────────────────────────────────────
  if (!tenantId) {
    return (
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 flex flex-col items-center justify-center p-10 text-center min-h-[50vh]">
        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-5">
          <Building2 size={28} />
        </div>
        <h2 className="text-xl font-black text-slate-800 mb-2">Wybierz organizację</h2>
        <p className="text-sm text-slate-500 mb-6 max-w-xs">Aby generować lub czyścić dane IDES, wskaż docelową organizację.</p>
        {availableTenants.length > 0 ? (
          <div className="flex flex-col gap-2 w-full max-w-xs">
            {availableTenants.map(t => (
              <button
                key={t.id}
                onClick={() => { switchTenant(t.id); setOverrideTenantId(t.id); }}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl text-sm font-bold transition-colors"
              >
                {t.name || t.id}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">Brak dostępnych organizacji.</p>
        )}
      </div>
    );
  }

  // ── Production lock ────────────────────────────────────────────────────────
  if (isProduction) {
    return (
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 flex flex-col items-center justify-center p-8 text-center min-h-[50vh]">
        <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-6">
          <Lock size={32} />
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">Środowisko Produkcyjne</h2>
        <p className="text-slate-500 max-w-lg">
          Tenant <strong>{tenantDisplayName}</strong> jest oznaczony jako produkcyjny. Generowanie danych wzorcowych i Hard Reset są zablokowane.
        </p>
        {availableTenants.length > 1 && (
          <button
            onClick={() => setOverrideTenantId(null)}
            className="mt-5 text-sm text-indigo-600 hover:underline"
          >
            Zmień organizację
          </button>
        )}
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
              <p className="text-sm font-medium text-slate-500">Dane wzorcowe z historią 14+ miesięcy</p>
            </div>
          </div>

          {/* Org picker */}
          <div className="flex items-center gap-3">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowOrgPicker(p => !p)}
                className="flex items-center gap-2 bg-white border border-slate-200 hover:border-indigo-300 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 transition-colors shadow-sm"
              >
                <Building2 size={14} className="text-indigo-500" />
                <span className="max-w-[200px] truncate">{tenantDisplayName}</span>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${showOrgPicker ? 'rotate-180' : ''}`} />
              </button>
              {showOrgPicker && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 min-w-[240px] py-1 overflow-hidden">
                  {availableTenants.length === 0 && (
                    <div className="px-4 py-3 text-xs text-slate-400 italic">Brak organizacji</div>
                  )}
                  {availableTenants.map(t => (
                    <button
                      key={t.id}
                      onClick={() => { setOverrideTenantId(t.id); switchTenant(t.id); setShowOrgPicker(false); setLogs([]); setIsProduction(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 transition-colors flex items-center gap-2 ${t.id === tenantId ? 'font-bold text-indigo-600 bg-indigo-50/50' : 'text-slate-700'}`}
                    >
                      <Building2 size={13} className="flex-shrink-0 opacity-50" />
                      <span className="truncate">{t.name || t.id}</span>
                    </button>
                  ))}
                  <div className="border-t border-slate-100 mt-1 pt-1">
                    {availableTenants.length < MAX_TENANTS ? (
                      <a
                        href="/onboarding"
                        onClick={() => setShowOrgPicker(false)}
                        className="w-full text-left px-4 py-2.5 text-sm text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center gap-2"
                      >
                        <Plus size={13} /> Dodaj organizację
                      </a>
                    ) : (
                      <div className="px-4 py-2.5 text-xs text-slate-400 flex items-center gap-1.5">
                        <Lock size={11} /> Limit {MAX_TENANTS} organizacji osiągnięty
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={handleGenerate}
              disabled={loading || selected.size === 0}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-md transition-colors disabled:opacity-50"
            >
              <Wand2 size={16} /> {loading ? 'Generowanie…' : 'Generuj zaznaczone'}
            </button>
          </div>
        </div>

        <div className="p-8 grid lg:grid-cols-2 gap-8">

          {/* Module selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1">
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
                  selected.has(m.id) ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white hover:border-slate-300'
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
            <div className="border border-rose-200 bg-rose-50/50 rounded-2xl p-5 mt-2">
              <h3 className="font-bold text-rose-800 flex gap-2 items-center mb-3">
                <AlertTriangle size={16} /> Hard Reset
              </h3>
              <div className="flex flex-col gap-2">
                <button onClick={handleClearData} disabled={loading}
                  className="bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex gap-2 items-center disabled:opacity-50">
                  <Trash2 size={13} /> Usuń dane transakcyjne
                </button>
                <button onClick={handleClearConfig} disabled={loading}
                  className="bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex gap-2 items-center disabled:opacity-50">
                  <Trash2 size={13} /> Usuń konfigurację systemu
                </button>
                <button onClick={async () => { await handleClearData(); await handleClearConfig(); }} disabled={loading}
                  className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex gap-2 items-center disabled:opacity-50">
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
            <div className="bg-slate-900 rounded-2xl p-4 min-h-[480px] max-h-[580px] shadow-inner font-mono text-xs overflow-y-auto">
              {logs.length === 0
                ? <div className="text-slate-600 italic">Oczekuję na komendy…</div>
                : logs.map((l, i) => (
                    <div key={i} className={`mb-1 ${l.includes('BŁĄD') ? 'text-rose-400' : l.includes('Gotowe') ? 'text-emerald-300 font-bold' : 'text-emerald-400'}`}>
                      {l}
                    </div>
                  ))
              }
            </div>

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
