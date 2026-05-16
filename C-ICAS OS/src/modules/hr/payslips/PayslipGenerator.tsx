import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { FileText, Send, Download, CheckCircle2, Clock, Eye, RefreshCw, Users, Calendar, ChevronDown, ChevronUp, Mail } from 'lucide-react';
import { calcPayslip, savePayslip, markPayslipSent, loadPayslips, type PayslipCalc, type PayslipRecord, type SalaryComponents } from './payslipService';
import { printPayslip } from './PayslipDocument';
import PayslipDocument from './PayslipDocument';
import { handleFirestoreError, OperationType } from '../../../shared/lib/firestoreUtils';

const DEFAULT_COMPONENTS: SalaryComponents = {
  enableZusTaxes: true,
  zusEmerytalna: 9.76,
  zusRentowa: 6.50,
  zdrowotna: 9.00,
  funduszPracy: 2.45,
  ppk: 1.50,
  taxProg1: 12.00,
  taxProg2: 32.00,
  kwotaWolna: 30000,
  kosztyUzyskania: 250.00,
};

const MONTHS_PL = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'];

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function fmt(v: number) {
  return v.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PayslipGenerator() {
  const { activeTenantId, userData } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [period, setPeriod] = useState(currentPeriod());
  const [components, setComponents] = useState<SalaryComponents>(DEFAULT_COMPONENTS);
  const [history, setHistory] = useState<PayslipRecord[]>([]);
  const [previewCalc, setPreviewCalc] = useState<PayslipCalc | null>(null);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [companyNip, setCompanyNip] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [generated, setGenerated] = useState<PayslipCalc[]>([]);

  useEffect(() => {
    if (!activeTenantId) return;
    const q = query(collection(db, 'employees'), where('tenantId', '==', activeTenantId));
    const unsub = onSnapshot(q, snap => {
      setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => handleFirestoreError(err, OperationType.LIST, 'employees'));

    // Load salary components from Firestore if saved
    getDoc(doc(db, 'tenants', activeTenantId, 'config', 'payrollComponents'))
      .then(d => { if (d.exists()) setComponents({ ...DEFAULT_COMPONENTS, ...d.data() }); })
      .catch(() => {});

    // Load tenant name
    getDoc(doc(db, 'tenants', activeTenantId))
      .then(d => {
        if (d.exists()) {
          setCompanyName(d.data()?.companyName || d.data()?.name || '');
          setCompanyNip(d.data()?.nip || '');
        }
      })
      .catch(() => {});

    return unsub;
  }, [activeTenantId]);

  const toggleAll = () => {
    if (selectedIds.size === employees.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(employees.map(e => e.id)));
    }
  };

  const toggleEmployee = (id: string) => {
    const s = new Set(selectedIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedIds(s);
  };

  const selectedEmployees = useMemo(() => employees.filter(e => selectedIds.has(e.id)), [employees, selectedIds]);

  const handleGenerate = async () => {
    if (selectedEmployees.length === 0 || !activeTenantId) return;
    setGenerating(true);
    const calcs: PayslipCalc[] = [];
    for (const emp of selectedEmployees) {
      const hrs = 160; // default full month; ideally from time-tracking
      const calc = calcPayslip(emp, components, period, hrs);
      await savePayslip(activeTenantId, calc);
      calcs.push(calc);
    }
    setGenerated(calcs);
    setGenerating(false);
    // Reload history
    const h = await loadPayslips(activeTenantId, period);
    setHistory(h);
    setShowHistory(true);
  };

  const handlePrintOne = (calc: PayslipCalc) => {
    printPayslip(calc, companyName || 'Firma', companyNip);
  };

  const handlePrintAll = () => {
    generated.forEach(c => printPayslip(c, companyName || 'Firma', companyNip));
  };

  const handleSendEmail = async (rec: PayslipRecord) => {
    if (!activeTenantId || !rec.id) return;
    setSending(rec.id);
    try {
      await markPayslipSent(activeTenantId, rec.id, rec.employeeEmail);
      setHistory(prev => prev.map(h => h.id === rec.id ? { ...h, status: 'sent' as const } : h));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'payslips');
    } finally {
      setSending(null);
    }
  };

  const loadHistory = async () => {
    if (!activeTenantId) return;
    const h = await loadPayslips(activeTenantId, period);
    setHistory(h);
    setShowHistory(true);
  };

  const [yy, mm] = period.split('-').map(Number);
  const periodLabel = `${MONTHS_PL[mm - 1]} ${yy}`;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 p-10 opacity-10"><FileText size={120} /></div>
        <div className="relative z-10">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1 flex items-center gap-2">
            <FileText size={12} /> Moduł Płac Online
          </h3>
          <h2 className="text-2xl font-black uppercase text-white tracking-tight">Paski Płacowe</h2>
          <p className="text-xs text-slate-400 mt-2 max-w-xl">Generuj imienne paski płacowe dla wybranych pracowników, drukuj PDF lub wysyłaj e-mailem z archiwizacją w systemie.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: config */}
        <div className="lg:col-span-1 space-y-4">
          {/* Period selector */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2"><Calendar size={12}/> Okres rozliczeniowy</h4>
            <input
              type="month"
              value={period}
              onChange={e => setPeriod(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-400"
            />
            <div className="mt-2 text-xs font-bold text-indigo-600 text-center">{periodLabel}</div>
          </div>

          {/* Salary components summary */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Składniki (z ustawień)</h4>
            <div className="space-y-1.5 text-xs">
              {[
                ['ZUS emerytalna', `${components.zusEmerytalna}%`],
                ['ZUS rentowa', `${components.zusRentowa}%`],
                ['Zdrowotna', `${components.zdrowotna}%`],
                ['PPK', `${components.ppk}%`],
                ['PIT próg I', `${components.taxProg1}%`],
                ['Kwota wolna', `${components.kwotaWolna.toLocaleString('pl-PL')} PLN`],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between text-slate-600">
                  <span>{label}</span>
                  <span className="font-mono font-bold text-slate-800">{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={generating || selectedIds.size === 0}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black uppercase text-xs tracking-widest rounded-2xl transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
          >
            {generating ? <><RefreshCw size={14} className="animate-spin" /> Generuję...</> : <><FileText size={14} /> Generuj paski ({selectedIds.size})</>}
          </button>

          {generated.length > 0 && (
            <button
              onClick={handlePrintAll}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-xs tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2"
            >
              <Download size={14} /> Drukuj / PDF wszystkie
            </button>
          )}

          <button onClick={loadHistory} className="w-full py-3 bg-white border border-slate-200 text-slate-600 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
            <Clock size={14} /> Historia {periodLabel}
          </button>
        </div>

        {/* Right: employee list */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center">
            <h4 className="font-black text-sm text-slate-800 uppercase tracking-tight flex items-center gap-2"><Users size={14}/> Pracownicy</h4>
            <button onClick={toggleAll} className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800">
              {selectedIds.size === employees.length ? 'Odznacz wszystkich' : 'Zaznacz wszystkich'}
            </button>
          </div>

          <div className="divide-y divide-slate-50 max-h-[480px] overflow-y-auto">
            {employees.length === 0 && (
              <div className="p-10 text-center text-slate-400 text-xs">Brak pracowników w systemie.</div>
            )}
            {employees.map(emp => {
              const calc = generated.find(c => c.employeeId === emp.id);
              return (
                <div key={emp.id} className={`flex items-center gap-4 p-4 transition-colors ${selectedIds.has(emp.id) ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(emp.id)}
                    onChange={() => toggleEmployee(emp.id)}
                    className="w-4 h-4 accent-indigo-600"
                  />
                  <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-xs font-black text-slate-600 uppercase flex-shrink-0">
                    {(emp.name || emp.email || '?')[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-slate-800 truncate">{emp.name || emp.email}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">{emp.contractType || 'UoP'} · {emp.department || ''}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {emp.baseSalary > 0 ? (
                      <div className="text-xs font-black text-slate-700">{fmt(emp.baseSalary)} PLN</div>
                    ) : emp.hourlyRate > 0 ? (
                      <div className="text-xs font-black text-slate-700">{emp.hourlyRate} PLN/h</div>
                    ) : (
                      <div className="text-[10px] text-rose-500 font-bold">Brak stawki</div>
                    )}
                  </div>

                  {calc && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => setPreviewCalc(calc)} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors" title="Podgląd">
                        <Eye size={14} />
                      </button>
                      <button onClick={() => handlePrintOne(calc)} className="p-1.5 bg-indigo-100 hover:bg-indigo-200 rounded-lg text-indigo-700 transition-colors" title="PDF">
                        <Download size={14} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Generated results summary */}
      {generated.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span className="text-sm font-black text-emerald-800 uppercase tracking-tight">Wygenerowano {generated.length} pasków — {periodLabel}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[9px] uppercase tracking-widest text-slate-500">
                  <th className="text-left pb-2 font-black">Pracownik</th>
                  <th className="text-right pb-2 font-black">Brutto</th>
                  <th className="text-right pb-2 font-black">ZUS+PPK</th>
                  <th className="text-right pb-2 font-black">PIT</th>
                  <th className="text-right pb-2 font-black text-emerald-700">Netto</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {generated.map(c => (
                  <tr key={c.employeeId} className="hover:bg-white/60 transition-colors">
                    <td className="py-2 font-semibold text-slate-700">{c.employeeName}</td>
                    <td className="py-2 text-right font-mono text-slate-600">{fmt(c.grossBase)}</td>
                    <td className="py-2 text-right font-mono text-slate-500">{fmt(c.zusEmerytalna + c.zusRentowa + c.zdrowotna + c.ppk)}</td>
                    <td className="py-2 text-right font-mono text-slate-500">{fmt(c.pit)}</td>
                    <td className="py-2 text-right font-mono font-black text-emerald-700">{fmt(c.netSalary)}</td>
                    <td className="py-2 pl-3">
                      <div className="flex gap-1">
                        <button onClick={() => setPreviewCalc(c)} className="p-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-500 transition-colors"><Eye size={12}/></button>
                        <button onClick={() => handlePrintOne(c)} className="p-1 bg-indigo-100 hover:bg-indigo-200 rounded text-indigo-600 transition-colors"><Download size={12}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-emerald-200 font-black">
                  <td className="pt-3 text-emerald-800">RAZEM ({generated.length} os.)</td>
                  <td className="pt-3 text-right font-mono text-slate-700">{fmt(generated.reduce((s,c) => s+c.grossBase, 0))}</td>
                  <td className="pt-3 text-right font-mono text-slate-500">{fmt(generated.reduce((s,c) => s+c.zusEmerytalna+c.zusRentowa+c.zdrowotna+c.ppk, 0))}</td>
                  <td className="pt-3 text-right font-mono text-slate-500">{fmt(generated.reduce((s,c) => s+c.pit, 0))}</td>
                  <td className="pt-3 text-right font-mono text-emerald-700">{fmt(generated.reduce((s,c) => s+c.netSalary, 0))}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* History */}
      {showHistory && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center">
            <h4 className="font-black text-sm text-slate-800 uppercase tracking-tight flex items-center gap-2">
              <Clock size={14} /> Archiwum — {periodLabel}
            </h4>
            <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-600">
              <ChevronUp size={16} />
            </button>
          </div>
          <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
            {history.length === 0 && <div className="p-8 text-center text-slate-400 text-xs">Brak zapisanych pasków za ten okres.</div>}
            {history.map(rec => (
              <div key={rec.id} className="flex items-center gap-4 p-4">
                <div className="flex-1">
                  <div className="font-bold text-sm text-slate-800">{rec.employeeName}</div>
                  <div className="text-[10px] text-slate-400">{rec.contractType} · {rec.periodLabel}</div>
                </div>
                <div className="text-right">
                  <div className="font-black text-sm text-emerald-700">{fmt(rec.netSalary)} PLN</div>
                  <div className="text-[10px] text-slate-400 font-mono">brutto: {fmt(rec.grossBase)}</div>
                </div>
                <div className="flex items-center gap-2">
                  {rec.status === 'sent'
                    ? <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-black uppercase flex items-center gap-1"><CheckCircle2 size={9}/> Wysłano</span>
                    : <span className="text-[9px] bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full font-black uppercase flex items-center gap-1"><FileText size={9}/> Wygenerowano</span>
                  }
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setPreviewCalc(rec)} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors" title="Podgląd"><Eye size={13}/></button>
                  <button onClick={() => handlePrintOne(rec)} className="p-1.5 bg-indigo-100 hover:bg-indigo-200 rounded-lg text-indigo-700 transition-colors" title="PDF"><Download size={13}/></button>
                  {rec.status !== 'sent' && rec.employeeEmail && (
                    <button onClick={() => handleSendEmail(rec)} disabled={sending === rec.id} className="p-1.5 bg-emerald-100 hover:bg-emerald-200 rounded-lg text-emerald-700 transition-colors disabled:opacity-50" title="Wyślij email">
                      {sending === rec.id ? <RefreshCw size={13} className="animate-spin"/> : <Mail size={13}/>}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview modal */}
      {previewCalc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 p-5 flex justify-between items-center z-10 rounded-t-3xl">
              <span className="font-black text-sm text-slate-800 uppercase tracking-tight">Podgląd paska — {previewCalc.employeeName}</span>
              <div className="flex gap-2">
                <button onClick={() => handlePrintOne(previewCalc)} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-black uppercase rounded-xl hover:bg-indigo-700 transition-all">
                  <Download size={12}/> PDF
                </button>
                <button onClick={() => setPreviewCalc(null)} className="px-4 py-2 bg-slate-100 text-slate-600 text-xs font-black uppercase rounded-xl hover:bg-slate-200 transition-all">Zamknij</button>
              </div>
            </div>
            <div className="p-4">
              <PayslipDocument calc={previewCalc} companyName={companyName || 'Firma'} companyNip={companyNip} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
