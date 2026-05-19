/**
 * Data: 2026-05-19
 * Zmiany: T3-08 — panel ZUS PUE API w module HR.
 * Ścieżka: /src/modules/hr/components/ZusPanel.tsx
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Building2, FileDown, Send, Clock, AlertCircle, Loader2, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { zusService, ZusDeclaration, ZusSubmission } from '../services/zusService';
import { HrService, Employee } from '../services/HrService';
import { useAuth } from '../../../shared/hooks/AuthContext';

const MONTHS_PL = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'];

function formatMonthLabel(month: string): string {
  const [year, m] = month.split('-');
  return `${MONTHS_PL[parseInt(m, 10) - 1]} ${year}`;
}

function downloadXml(xml: string, filename: string): void {
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function currentMonthValue(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const STATUS_LABELS: Record<ZusSubmission['status'], string> = {
  pending: 'Oczekuje',
  submitted: 'Wysłano',
  accepted: 'Zaakceptowano',
  rejected: 'Odrzucono',
};

const STATUS_COLORS: Record<ZusSubmission['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  submitted: 'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

type PanelView = 'declaration' | 'history';

export default function ZusPanel() {
  const { tenantId } = useAuth() as { tenantId: string };
  const [view, setView] = useState<PanelView>('declaration');
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthValue());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [declaration, setDeclaration] = useState<ZusDeclaration | null>(null);
  const [history, setHistory] = useState<ZusSubmission[]>([]);
  const [loadingDecl, setLoadingDecl] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadEmployees = useCallback(async () => {
    try {
      const data = await HrService.getEmployees(tenantId);
      setEmployees(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Błąd pobierania pracowników');
    }
  }, [tenantId]);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const data = await zusService.getSubmissionHistory(tenantId);
      setHistory(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Błąd historii deklaracji');
    } finally {
      setLoadingHistory(false);
    }
  }, [tenantId]);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);
  useEffect(() => { if (view === 'history') loadHistory(); }, [view, loadHistory]);

  const handleGenerateDeclaration = async () => {
    setLoadingDecl(true);
    setError(null);
    setDeclaration(null);
    try {
      const decl = await zusService.generateZusDeclaration(tenantId, selectedMonth, employees as (Employee & { pesel?: string })[]);
      setDeclaration(decl);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Błąd generowania deklaracji');
    } finally {
      setLoadingDecl(false);
    }
  };

  const handleDownloadXml = () => {
    if (!declaration?.xmlContent) return;
    downloadXml(declaration.xmlContent, `ZUS_DRA_${selectedMonth}.xml`);
  };

  const handleSubmit = async () => {
    if (!declaration) return;
    if (!window.confirm('Wysłać deklarację ZUS do PUE? Upewnij się, że dane są poprawne.')) return;
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const id = await zusService.submitDeclaration(tenantId, declaration);
      setSuccessMsg(`Deklaracja wysłana. ID: ${id}`);
      setDeclaration(null);
      await loadHistory();
      setView('history');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Błąd wysyłki deklaracji');
    } finally {
      setSubmitting(false);
    }
  };

  const isConfigError = error?.includes('konfiguracji') || error?.includes('Skonfiguruj') || error?.includes('tokenu');
  const fmt = (v: number) => v.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3">
        <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center">
          <Building2 className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">ZUS PUE</h2>
          <p className="text-xs text-slate-500">Deklaracje DRA/RCA — generowanie i wysyłka</p>
        </div>
      </div>

      <div className="flex border-b border-slate-200 px-6">
        {([['declaration', 'Deklaracja'], ['history', 'Historia wysyłek']] as [PanelView, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              view === id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {error && (
          <div className={`mb-4 p-4 rounded-xl flex items-start gap-3 ${isConfigError ? 'bg-amber-50 border border-amber-200' : 'bg-red-50 border border-red-200'}`}>
            <AlertCircle className={`w-5 h-5 mt-0.5 shrink-0 ${isConfigError ? 'text-amber-600' : 'text-red-500'}`} />
            <div>
              <p className={`text-sm font-medium ${isConfigError ? 'text-amber-800' : 'text-red-700'}`}>{error}</p>
              {isConfigError && (
                <p className="text-xs text-amber-600 mt-1">Przejdz do <strong>Ustawienia &rarr; Integracje &rarr; ZUS PUE</strong> i dodaj token PUE.</p>
              )}
            </div>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <p className="text-sm font-medium text-green-800">{successMsg}</p>
          </div>
        )}

        {view === 'declaration' && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 flex-wrap">
              <label className="text-sm font-medium text-slate-700">Miesiąc rozliczeniowy:</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={e => { setSelectedMonth(e.target.value); setDeclaration(null); }}
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button
                onClick={handleGenerateDeclaration}
                disabled={loadingDecl || employees.length === 0}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {loadingDecl ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Generuj deklarację
              </button>
            </div>

            {declaration && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-800">
                    Deklaracja ZUS DRA — {formatMonthLabel(declaration.month)}
                    <span className="ml-2 text-xs font-normal text-slate-400">({declaration.entries.length} pracowników UoP)</span>
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDownloadXml}
                      className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-indigo-300 text-indigo-700 rounded-lg hover:bg-indigo-50 transition-colors font-medium"
                    >
                      <FileDown className="w-4 h-4" />
                      Pobierz XML
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Wyślij do PUE ZUS
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Pracownik</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Podstawa</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Emerytal.</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Rentowa</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Chorobowa</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Wypadkowa</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">FP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {declaration.entries.map(entry => (
                        <tr key={entry.employeeId} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 font-medium text-slate-800">{entry.employeeName}</td>
                          <td className="py-2.5 px-3 text-right text-slate-600">{fmt(entry.podstawaSkładek)}</td>
                          <td className="py-2.5 px-3 text-right text-slate-600">{fmt(entry.zusEmerytalna + entry.zusEmerytalnaPracodawca)}</td>
                          <td className="py-2.5 px-3 text-right text-slate-600">{fmt(entry.zusRentowa + entry.zusRentowaPracodawca)}</td>
                          <td className="py-2.5 px-3 text-right text-slate-600">{fmt(entry.zusChorobowa)}</td>
                          <td className="py-2.5 px-3 text-right text-slate-600">{fmt(entry.zusWypadkowa)}</td>
                          <td className="py-2.5 px-3 text-right text-slate-600">{fmt(entry.funduszPracy)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-indigo-50">
                      <tr>
                        <td className="py-2.5 px-3 text-xs font-semibold text-indigo-700 uppercase tracking-wide">Suma</td>
                        {(['podstawaSkładek', 'zusE', 'zusR', 'zusChorobowa', 'zusWypadkowa', 'funduszPracy'] as const).map((_, i) => {
                          const sums = [
                            declaration.entries.reduce((s, e) => s + e.podstawaSkładek, 0),
                            declaration.entries.reduce((s, e) => s + e.zusEmerytalna + e.zusEmerytalnaPracodawca, 0),
                            declaration.entries.reduce((s, e) => s + e.zusRentowa + e.zusRentowaPracodawca, 0),
                            declaration.entries.reduce((s, e) => s + e.zusChorobowa, 0),
                            declaration.entries.reduce((s, e) => s + e.zusWypadkowa, 0),
                            declaration.entries.reduce((s, e) => s + e.funduszPracy, 0),
                          ];
                          return <td key={i} className="py-2.5 px-3 text-right text-xs font-bold text-indigo-800">{fmt(sums[i])}</td>;
                        })}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'history' && (
          <div>
            {loadingHistory ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
              </div>
            ) : (
              <div className="space-y-2">
                {history.length === 0 && (
                  <div className="text-center py-12">
                    <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">Brak historii wysłanych deklaracji</p>
                  </div>
                )}
                {history.map(sub => (
                  <div key={sub.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-3">
                      {sub.status === 'accepted'
                        ? <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                        : sub.status === 'rejected'
                          ? <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                          : <Clock className="w-5 h-5 text-blue-400 shrink-0" />
                      }
                      <div>
                        <p className="text-sm font-semibold text-slate-800">ZUS DRA — {formatMonthLabel(sub.month)}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('pl-PL') : '—'}
                          {sub.confirmationNumber && <span className="ml-2 font-medium text-slate-600">#{sub.confirmationNumber}</span>}
                        </p>
                        {sub.errorMessage && (
                          <p className="text-xs text-red-500 mt-0.5">{sub.errorMessage}</p>
                        )}
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[sub.status]}`}>
                      {STATUS_LABELS[sub.status]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
