/**
 * Data: 2026-05-19
 * Zmiany: T2-06 — panel PPK PZU w module HR Payroll.
 * Ścieżka: /src/modules/hr/components/PpkPanel.tsx
 */
import React, { useState, useEffect, useCallback } from 'react';
import { PiggyBank, Download, AlertCircle, Loader2, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';
import { ppkService, EmployeePpkData, PpkReport } from '../services/ppkService';
import { useAuth } from '../../../shared/hooks/AuthContext';

function exportToCsv(report: PpkReport): void {
  const header = 'Pracownik,Podstawa,Składka pracownika,Składka pracodawcy,Bonus PPK,Razem';
  const rows = report.contributions.map(c =>
    [c.employeeName, c.baseSalary, c.employeeContribution, c.employerContribution, c.ppkBonus, c.total].join(','),
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ppk_raport_${report.payrollRunId}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PpkPanel() {
  const { tenantId } = useAuth() as { tenantId: string };
  const [employees, setEmployees] = useState<EmployeePpkData[]>([]);
  const [report, setReport] = useState<PpkReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ppkService.getEmployeePpkData(tenantId);
      setEmployees(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Nieznany błąd');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleToggleEnrollment = async (emp: EmployeePpkData) => {
    setTogglingId(emp.employeeId);
    try {
      await ppkService.setEmployeePpkEnrollment(tenantId, emp.employeeId, !emp.enrolled);
      setEmployees(prev => prev.map(e =>
        e.employeeId === emp.employeeId ? { ...e, enrolled: !emp.enrolled } : e,
      ));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Błąd aktualizacji');
    } finally {
      setTogglingId(null);
    }
  };

  const handleGenerateReport = async () => {
    setGenerating(true);
    setError(null);
    try {
      await ppkService.getPpkConfig(tenantId);
      const runId = `manual-${new Date().toISOString().slice(0, 10)}`;
      const r = await ppkService.generatePpkReport(tenantId, runId);
      setReport(r);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Błąd generowania raportu');
    } finally {
      setGenerating(false);
    }
  };

  const isConfigError = error?.includes('konfiguracji') || error?.includes('Skonfiguruj') || error?.includes('certyfikat');

  const fmt = (v: number) => v.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' zł';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3">
        <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
          <PiggyBank className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">PPK PZU</h2>
          <p className="text-xs text-slate-500">Pracownicze Plany Kapitałowe — składki i raporty</p>
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={loadData}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Odśwież"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleGenerateReport}
            disabled={generating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Generuj raport PPK
          </button>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className={`mb-4 p-4 rounded-xl flex items-start gap-3 ${isConfigError ? 'bg-amber-50 border border-amber-200' : 'bg-red-50 border border-red-200'}`}>
            <AlertCircle className={`w-5 h-5 mt-0.5 shrink-0 ${isConfigError ? 'text-amber-600' : 'text-red-500'}`} />
            <div>
              <p className={`text-sm font-medium ${isConfigError ? 'text-amber-800' : 'text-red-700'}`}>{error}</p>
              {isConfigError && (
                <p className="text-xs text-amber-600 mt-1">Przejdz do <strong>Ustawienia &rarr; Integracje &rarr; PPK PZU</strong> i dodaj certyfikat.</p>
              )}
            </div>
          </div>
        )}

        {report && (
          <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-blue-800">Raport PPK — {report.payrollRunId}</h3>
              <button
                onClick={() => exportToCsv(report)}
                className="flex items-center gap-1.5 text-xs text-blue-700 hover:text-blue-900 font-medium px-2 py-1 bg-white border border-blue-300 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Pobierz CSV
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <p className="text-xs text-blue-600 font-medium">Składki pracowników</p>
                <p className="text-lg font-bold text-blue-900 mt-0.5">{fmt(report.totalEmployeeContributions)}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <p className="text-xs text-blue-600 font-medium">Składki pracodawcy</p>
                <p className="text-lg font-bold text-blue-900 mt-0.5">{fmt(report.totalEmployerContributions)}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <p className="text-xs text-blue-600 font-medium">Bonus PPK (państwo)</p>
                <p className="text-lg font-bold text-blue-900 mt-0.5">{fmt(report.totalPpkBonus)}</p>
              </div>
              <div className="bg-blue-600 rounded-lg p-3">
                <p className="text-xs text-blue-200 font-medium">Razem</p>
                <p className="text-lg font-bold text-white mt-0.5">{fmt(report.grandTotal)}</p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Pracownik</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Zapisany</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Wkład własny</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Składka pracownika</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Składka pracodawcy</th>
                  <th className="py-2 px-3" />
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 && !error && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400 text-sm">Brak danych pracowników</td>
                  </tr>
                )}
                {employees.map(emp => {
                  const empContrib = emp.enrolled ? (emp.baseSalary * emp.employeeRate) : 0;
                  const emplContrib = emp.enrolled ? (emp.baseSalary * emp.employerRate) : 0;
                  return (
                    <tr key={emp.employeeId} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3">
                        <p className="font-medium text-slate-800">{emp.employeeName}</p>
                        <p className="text-xs text-slate-400">{emp.email}</p>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${emp.enrolled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          {emp.enrolled ? 'Tak' : 'Nie'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600">{(emp.employeeRate * 100).toFixed(1)}%</td>
                      <td className="py-2.5 px-3 text-right text-slate-700 font-medium">{fmt(empContrib)}</td>
                      <td className="py-2.5 px-3 text-right text-slate-700 font-medium">{fmt(emplContrib)}</td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleToggleEnrollment(emp)}
                          disabled={togglingId === emp.employeeId}
                          className="text-slate-400 hover:text-blue-600 transition-colors disabled:opacity-40"
                          title={emp.enrolled ? 'Wypisz z PPK' : 'Zapisz do PPK'}
                        >
                          {togglingId === emp.employeeId
                            ? <Loader2 className="w-5 h-5 animate-spin" />
                            : emp.enrolled
                              ? <ToggleRight className="w-5 h-5 text-blue-600" />
                              : <ToggleLeft className="w-5 h-5" />
                          }
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
