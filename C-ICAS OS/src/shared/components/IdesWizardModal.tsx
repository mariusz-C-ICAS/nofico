/**
 * Data: 2026-05-17
 * Opis: Kreator IDES — 5-krokowy wizard do generowania danych testowych.
 *       Otwierany z TestDataAdminModule.
 */

import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  X, ChevronRight, ChevronLeft, Building2, Users, CheckSquare,
  BarChart3, Zap, Loader2, CheckCircle2,
} from 'lucide-react';
import { generateAllIdesData } from '../utils/idesGenerator';
import type { CompanyProfile, IdesGenerationResult, AllIdesResult } from '../utils/idesGenerator';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  tenantName: string;
}

type CompanyTypeOption = {
  value: string;
  label: string;
  defaultIndustry: string;
};

const COMPANY_TYPES: CompanyTypeOption[] = [
  { value: 'manufacturing', label: 'Produkcja',          defaultIndustry: 'Przemysl' },
  { value: 'services',      label: 'Uslugi',             defaultIndustry: 'Uslugi profesjonalne' },
  { value: 'it',            label: 'IT & Technologia',   defaultIndustry: 'Technologie informacyjne' },
  { value: 'retail',        label: 'Handel Detaliczny',  defaultIndustry: 'Handel' },
  { value: 'construction',  label: 'Budownictwo',        defaultIndustry: 'Budownictwo i nieruchomosci' },
  { value: 'healthcare',    label: 'Ochrona Zdrowia',    defaultIndustry: 'Ochrona zdrowia' },
  { value: 'education',     label: 'Edukacja',           defaultIndustry: 'Edukacja i szkolenia' },
  { value: 'logistics',     label: 'Logistyka',          defaultIndustry: 'Transport i logistyka' },
  { value: 'finance_sector',label: 'Finanse',            defaultIndustry: 'Bankowosc i finanse' },
];

const MODULE_OPTIONS = [
  { key: 'hr',        label: 'HR',            desc: 'Pracownicy, umowy, urlopy' },
  { key: 'crm',       label: 'CRM',           desc: 'Klienci, kontakty, szanse' },
  { key: 'finance',   label: 'Finanse',       desc: 'Faktury, koszty, platnosci' },
  { key: 'projects',  label: 'Projekty',      desc: 'Projekty, zadania, czas' },
  { key: 'workflow',  label: 'Workflow',      desc: 'Procesy, zatwierdzenia' },
  { key: 'assets',    label: 'Srodki Trwale', desc: 'Sprzet, amortyzacja' },
  { key: 'documents', label: 'DMS',           desc: 'Dokumenty, wersje' },
];

const MONTHS_OPTIONS = [
  { value: 6,  label: '6 miesiecy' },
  { value: 12, label: '12 miesiecy' },
  { value: 18, label: '18 miesiecy' },
  { value: 24, label: '24 miesiace' },
];

function estimateCounts(employeeCount: number, months: number, modules: string[]) {
  return {
    employees:  modules.includes('hr')        ? employeeCount                           : 0,
    leaves:     modules.includes('hr')        ? Math.round(employeeCount * 2)           : 0,
    clients:    modules.includes('crm')       ? Math.round(employeeCount * 2.5)         : 0,
    deals:      modules.includes('crm')       ? Math.round(employeeCount * 2.5 * 1.5)  : 0,
    invoices:   modules.includes('finance')   ? months * 12                             : 0,
    expenses:   modules.includes('finance')   ? months * 10                             : 0,
    projects:   modules.includes('projects')  ? Math.min(8, Math.round(months / 2))    : 0,
    tasks:      modules.includes('projects')  ? Math.min(8, Math.round(months / 2)) * 7: 0,
    workflows:  modules.includes('workflow')  ? months * 5                              : 0,
    assets:     modules.includes('assets')    ? Math.round(employeeCount * 1.5)        : 0,
    documents:  modules.includes('documents') ? months * 10                             : 0,
  };
}

const STEP_ICONS = [Building2, Users, CheckSquare, BarChart3, Zap];
const STEP_LABELS = ['Profil Firmy', 'Skala', 'Moduly', 'Podsumowanie', 'Generowanie'];

export default function IdesWizardModal({ isOpen, onClose, tenantId, tenantName }: Props) {
  const [step, setStep] = useState(0);

  // Krok 1 — Profil
  const [companyName,    setCompanyName]    = useState(tenantName);
  const [companyType,    setCompanyType]    = useState<string>('services');
  const [industry,       setIndustry]       = useState('Uslugi profesjonalne');

  // Krok 2 — Skala
  const [employeeCount,  setEmployeeCount]  = useState(20);
  const [generateMonths, setGenerateMonths] = useState(12);

  // Krok 3 — Moduly
  const [selectedModules, setSelectedModules] = useState<string[]>(['hr', 'crm', 'finance', 'projects']);

  // Krok 5 — Generowanie
  const [currentModule,   setCurrentModule]  = useState('');
  const [moduleIndex,     setModuleIndex]    = useState(0);
  const [logs,            setLogs]           = useState<string[]>([]);
  const [generating,      setGenerating]     = useState(false);
  const [done,            setDone]           = useState(false);
  const [finalResult,     setFinalResult]    = useState<AllIdesResult | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Ladowanie danych tenanta
  useEffect(() => {
    if (!isOpen || !tenantId) return;
    getDoc(doc(db, 'tenants', tenantId)).then(snap => {
      if (!snap.exists()) return;
      const data = snap.data() as any;
      setCompanyName(data.name ?? tenantName);
      if (data.companyType) setCompanyType(data.companyType);
      if (data.industry)    setIndustry(data.industry);
      if (data.employeeCount) setEmployeeCount(data.employeeCount);
      if (Array.isArray(data.activeModules) && data.activeModules.length > 0) {
        const mapped = (data.activeModules as string[]).filter(m =>
          MODULE_OPTIONS.some(o => o.key === m),
        );
        if (mapped.length > 0) setSelectedModules(mapped);
      }
    }).catch(() => {});
  }, [isOpen, tenantId]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (!isOpen) return null;

  function handleTypeChange(value: string) {
    setCompanyType(value);
    const opt = COMPANY_TYPES.find(t => t.value === value);
    if (opt) setIndustry(opt.defaultIndustry);
  }

  function toggleModule(key: string) {
    setSelectedModules(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key],
    );
  }

  async function startGeneration() {
    setGenerating(true);
    setDone(false);
    setLogs([]);
    setModuleIndex(0);
    setCurrentModule('');

    const profile: CompanyProfile = {
      companyName,
      companyType: companyType as any,
      industry,
      employeeCount,
      modules:        selectedModules,
      generateMonths,
      tenantId,
    };

    const result = await generateAllIdesData(profile, (mod, idx, total) => {
      setCurrentModule(mod);
      setModuleIndex(idx);
      const label = MODULE_OPTIONS.find(o => o.key === mod)?.label ?? mod;
      setLogs(prev => [...prev, `[${idx + 1}/${total}] Generowanie modulu: ${label}...`]);
    });

    result.results.forEach(r => {
      const label = MODULE_OPTIONS.find(o => o.key === r.module)?.label ?? r.module;
      setLogs(prev => [
        ...prev,
        `  OK  ${label}: ${r.created} rekordow${r.errors > 0 ? `, ${r.errors} bledow` : ''}`,
      ]);
    });
    setLogs(prev => [...prev, `Zakonczono! Lacznie: ${result.totalCreated} rekordow w ${(result.durationMs / 1000).toFixed(1)}s`]);
    setFinalResult(result);
    setGenerating(false);
    setDone(true);
  }

  const estimates = estimateCounts(employeeCount, generateMonths, selectedModules);
  const totalEstimate = Object.values(estimates).reduce((s, v) => s + v, 0);

  const progress = generating && selectedModules.length > 0
    ? Math.round((moduleIndex / selectedModules.length) * 100)
    : done ? 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl flex flex-col overflow-hidden max-h-[92vh]">

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-8 pt-7 pb-6 shrink-0">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-white text-xl font-bold tracking-tight">Generator IDES</h2>
              <p className="text-indigo-200 text-sm mt-0.5">Dane testowe dla srodowiska deweloperskiego</p>
            </div>
            <button
              onClick={onClose}
              disabled={generating}
              className="text-indigo-200 hover:text-white transition-colors disabled:opacity-40"
            >
              <X size={20} />
            </button>
          </div>

          {/* Progress steps */}
          <div className="flex items-center gap-0">
            {STEP_LABELS.map((label, i) => {
              const Icon    = STEP_ICONS[i];
              const isActive = i === step;
              const isDone   = i < step;
              return (
                <React.Fragment key={i}>
                  <div className="flex flex-col items-center">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center transition-all
                      ${isActive ? 'bg-white text-indigo-600 shadow-lg scale-110' :
                        isDone   ? 'bg-indigo-400 text-white' : 'bg-indigo-500/40 text-indigo-200'}
                    `}>
                      {isDone ? <CheckCircle2 size={16} /> : <Icon size={16} />}
                    </div>
                    <span className={`text-[9px] mt-1 font-semibold uppercase tracking-wide
                      ${isActive ? 'text-white' : isDone ? 'text-indigo-300' : 'text-indigo-400/60'}`}
                    >
                      {label}
                    </span>
                  </div>
                  {i < STEP_LABELS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 mb-4 rounded-full
                      ${i < step ? 'bg-indigo-400' : 'bg-indigo-500/30'}`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-8 py-6">

          {/* Krok 0 — Profil firmy */}
          {step === 0 && (
            <div className="space-y-5">
              <h3 className="text-base font-bold text-gray-900">Profil Firmy</h3>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Nazwa firmy</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Typ dzialalnosci</label>
                <select
                  value={companyType}
                  onChange={e => handleTypeChange(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                >
                  {COMPANY_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Branza</label>
                <input
                  type="text"
                  value={industry}
                  onChange={e => setIndustry(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
            </div>
          )}

          {/* Krok 1 — Skala */}
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-base font-bold text-gray-900">Skala Operacyjna</h3>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold text-gray-500">Liczba pracownikow</label>
                  <span className="text-lg font-black text-indigo-600">{employeeCount}</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={500}
                  step={5}
                  value={employeeCount}
                  onChange={e => setEmployeeCount(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>5</span>
                  <span>500</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Okres generowania danych</label>
                <div className="grid grid-cols-4 gap-2">
                  {MONTHS_OPTIONS.map(o => (
                    <button
                      key={o.value}
                      onClick={() => setGenerateMonths(o.value)}
                      className={`py-2.5 rounded-xl text-xs font-bold border transition-all
                        ${generateMonths === o.value
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-indigo-50 rounded-xl p-4 text-sm text-indigo-700">
                <p className="font-semibold">Srodowisko po {generateMonths} miesiacach:</p>
                <p className="text-xs mt-1 text-indigo-500">
                  Dane beda reprezentowac firme dzialajaca przez ten okres z {employeeCount} pracownikami.
                </p>
              </div>
            </div>
          )}

          {/* Krok 2 — Moduly */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-gray-900">Wybor Modulow</h3>
              <p className="text-xs text-gray-400">Zaznacz moduly dla ktorych chcesz wygenerowac dane testowe.</p>

              <div className="grid grid-cols-2 gap-3">
                {MODULE_OPTIONS.map(m => {
                  const isSelected = selectedModules.includes(m.key);
                  return (
                    <button
                      key={m.key}
                      onClick={() => toggleModule(m.key)}
                      className={`text-left p-4 rounded-xl border-2 transition-all
                        ${isSelected
                          ? 'border-indigo-400 bg-indigo-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0
                          ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
                          {isSelected && <CheckCircle2 size={10} className="text-white" />}
                        </div>
                        <span className={`text-sm font-bold ${isSelected ? 'text-indigo-700' : 'text-gray-700'}`}>
                          {m.label}
                        </span>
                      </div>
                      <p className={`text-[10px] pl-6 ${isSelected ? 'text-indigo-400' : 'text-gray-400'}`}>
                        {m.desc}
                      </p>
                    </button>
                  );
                })}
              </div>

              {selectedModules.length === 0 && (
                <p className="text-xs text-red-500 text-center py-2">Wybierz co najmniej jeden modul.</p>
              )}
            </div>
          )}

          {/* Krok 3 — Podglad */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-gray-900">Podglad i Podsumowanie</h3>
              <p className="text-xs text-gray-400">
                Szacowana liczba rekordow do wygenerowania dla {companyName}.
              </p>

              <div className="bg-gray-50 rounded-2xl divide-y divide-gray-100 overflow-hidden">
                {estimates.employees > 0  && <Row label="Pracownicy"   value={estimates.employees} />}
                {estimates.leaves > 0     && <Row label="Urlopy"        value={estimates.leaves} />}
                {estimates.clients > 0    && <Row label="Klienci"       value={estimates.clients} />}
                {estimates.deals > 0      && <Row label="Szanse CRM"    value={estimates.deals} />}
                {estimates.invoices > 0   && <Row label="Faktury"       value={estimates.invoices} />}
                {estimates.expenses > 0   && <Row label="Koszty"        value={estimates.expenses} />}
                {estimates.projects > 0   && <Row label="Projekty"      value={estimates.projects} />}
                {estimates.tasks > 0      && <Row label="Zadania"       value={estimates.tasks} />}
                {estimates.workflows > 0  && <Row label="Procesy"       value={estimates.workflows} />}
                {estimates.assets > 0     && <Row label="Srodki trwale" value={estimates.assets} />}
                {estimates.documents > 0  && <Row label="Dokumenty"     value={estimates.documents} />}
              </div>

              <div className="bg-indigo-600 text-white rounded-2xl px-5 py-4 flex justify-between items-center">
                <span className="text-sm font-semibold">Lacznie rekordow</span>
                <span className="text-2xl font-black">{totalEstimate.toLocaleString('pl-PL')}</span>
              </div>

              <p className="text-[10px] text-gray-400 text-center">
                Wartosci sa szacunkowe — rzeczywista liczba moze sie nieznacznie roznic.
              </p>
            </div>
          )}

          {/* Krok 4 — Generowanie */}
          {step === 4 && (
            <div className="space-y-5">
              <h3 className="text-base font-bold text-gray-900">
                {done ? 'Generowanie zakonczone' : generating ? 'Generowanie w toku...' : 'Gotowy do generowania'}
              </h3>

              {!generating && !done && (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-500 mb-6">
                    Kliknij Generuj, aby uruchomic generator dla{' '}
                    <span className="font-bold text-gray-800">{selectedModules.length}</span> modulow.
                  </p>
                  <button
                    onClick={startGeneration}
                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm transition-colors shadow-lg"
                  >
                    Generuj dane
                  </button>
                </div>
              )}

              {(generating || done) && (
                <>
                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                      <span>{generating ? `Modul: ${MODULE_OPTIONS.find(o => o.key === currentModule)?.label ?? currentModule}` : 'Zakonczono'}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Log terminal */}
                  <div className="bg-gray-900 rounded-xl p-4 h-48 overflow-y-auto font-mono text-[11px] space-y-0.5">
                    {logs.map((line, i) => (
                      <p key={i} className={
                        line.startsWith('  OK')         ? 'text-green-400' :
                        line.startsWith('Zakonczono')   ? 'text-yellow-300 font-bold' :
                        'text-gray-300'
                      }>
                        {line}
                      </p>
                    ))}
                    {generating && (
                      <p className="text-indigo-400 animate-pulse">...</p>
                    )}
                    <div ref={logsEndRef} />
                  </div>

                  {/* Podsumowanie */}
                  {done && finalResult && (
                    <div className="grid grid-cols-3 gap-3">
                      <SummaryCard label="Rekordow" value={finalResult.totalCreated.toLocaleString('pl-PL')} color="indigo" />
                      <SummaryCard label="Modulow"  value={String(finalResult.results.length)}               color="violet" />
                      <SummaryCard label="Czas"     value={`${(finalResult.durationMs / 1000).toFixed(1)}s`} color="purple" />
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-gray-100 flex justify-between items-center shrink-0">
          <button
            onClick={() => step > 0 && !generating ? setStep(s => s - 1) : undefined}
            disabled={step === 0 || generating}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} />
            Wstecz
          </button>

          {step < 4 ? (
            <button
              onClick={() => selectedModules.length > 0 || step !== 2 ? setStep(s => s + 1) : undefined}
              disabled={step === 2 && selectedModules.length === 0}
              className="flex items-center gap-1.5 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              Dalej
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={onClose}
              disabled={generating}
              className="flex items-center gap-1.5 px-6 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-sm font-semibold disabled:opacity-40 transition-colors"
            >
              {done ? 'Zamknij' : 'Anuluj'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between items-center px-4 py-2.5">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-bold text-gray-800">{value.toLocaleString('pl-PL')}</span>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: 'indigo' | 'violet' | 'purple' }) {
  const styles: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-700',
    violet: 'bg-violet-50 text-violet-700',
    purple: 'bg-purple-50 text-purple-700',
  };
  return (
    <div className={`rounded-xl p-3.5 text-center ${styles[color]}`}>
      <p className="text-xl font-black">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wide mt-0.5 opacity-70">{label}</p>
    </div>
  );
}
