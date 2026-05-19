/**
 * Data: 2026-05-19
 * Zmiany: T2-05 — panel Multisport w module HR.
 * Ścieżka: /src/modules/hr/components/MultisportPanel.tsx
 */
import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, UserPlus, XCircle, BarChart2, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { multisportService, MultisportCard, MultisportMonthlyReport, NewEmployeeInput } from '../services/multisportService';
import { useAuth } from '../../../shared/hooks/AuthContext';

type PanelTab = 'cards' | 'report';

interface NewEmployeeForm {
  name: string;
  email: string;
  startDate: string;
}

const EMPTY_FORM: NewEmployeeForm = { name: '', email: '', startDate: '' };

export default function MultisportPanel() {
  const { tenantId } = useAuth() as { tenantId: string };
  const [activeTab, setActiveTab] = useState<PanelTab>('cards');
  const [cards, setCards] = useState<MultisportCard[]>([]);
  const [report, setReport] = useState<MultisportMonthlyReport | null>(null);
  const [reportMonth, setReportMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<NewEmployeeForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const loadCards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const config = await multisportService.getMultisportConfig(tenantId);
      const data = await multisportService.fetchEmployeeCards(tenantId, config.apiUrl, config.apiKey);
      setCards(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Nieznany błąd');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await multisportService.getMonthlyReport(tenantId, reportMonth);
      setReport(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Nieznany błąd');
    } finally {
      setLoading(false);
    }
  }, [tenantId, reportMonth]);

  useEffect(() => {
    if (activeTab === 'cards') loadCards();
    else loadReport();
  }, [activeTab, loadCards, loadReport]);

  const handleDeactivate = async (cardId: string) => {
    if (!window.confirm('Dezaktywować kartę pracownika?')) return;
    try {
      await multisportService.deactivateCard(tenantId, cardId);
      setCards(prev => prev.map(c => c.cardId === cardId ? { ...c, status: 'inactive' } : c));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Błąd dezaktywacji');
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.startDate) return;
    setSubmitting(true);
    setError(null);
    try {
      const newCard = await multisportService.reportNewEmployee(tenantId, form as NewEmployeeInput);
      setCards(prev => [...prev, newCard]);
      setForm(EMPTY_FORM);
      setShowAddForm(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Błąd rejestracji');
    } finally {
      setSubmitting(false);
    }
  };

  const isConfigError = error?.includes('konfiguracji') || error?.includes('Skonfiguruj');

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3">
        <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">Multisport</h2>
          <p className="text-xs text-slate-500">Karty pracownicze i raporty miesięczne</p>
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => activeTab === 'cards' ? loadCards() : loadReport()}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Odśwież"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Zgłoś pracownika
          </button>
        </div>
      </div>

      <div className="flex border-b border-slate-200 px-6">
        {([['cards', 'Karty'], ['report', 'Raport miesięczny']] as [PanelTab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === id
                ? 'border-orange-600 text-orange-600'
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
                <p className="text-xs text-amber-600 mt-1">Przejdz do <strong>Ustawienia &rarr; Integracje &rarr; Multisport</strong></p>
              )}
            </div>
          </div>
        )}

        {showAddForm && (
          <form onSubmit={handleAddEmployee} className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Nowy pracownik — karta Multisport</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Imię i nazwisko"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                required
              />
              <input
                type="date"
                value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                required
              />
            </div>
            <div className="flex gap-2 mt-3">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Zgłoś
              </button>
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setForm(EMPTY_FORM); }}
                className="px-4 py-2 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-100 transition-colors"
              >
                Anuluj
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
          </div>
        ) : activeTab === 'cards' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Pracownik</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Data start</th>
                  <th className="py-2 px-3" />
                </tr>
              </thead>
              <tbody>
                {cards.length === 0 && !error && (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-400 text-sm">Brak kart pracowniczych</td>
                  </tr>
                )}
                {cards.map(card => (
                  <tr key={card.cardId} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-slate-800">{card.employeeName}</td>
                    <td className="py-2.5 px-3 text-slate-500">{card.email}</td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        card.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {card.status === 'active' ? 'Aktywna' : 'Nieaktywna'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">{card.startDate}</td>
                    <td className="py-2.5 px-3">
                      {card.status === 'active' && (
                        <button
                          onClick={() => handleDeactivate(card.cardId)}
                          className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Dezaktywuj
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <label className="text-sm font-medium text-slate-700">Miesiąc:</label>
              <input
                type="month"
                value={reportMonth}
                onChange={e => setReportMonth(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <button
                onClick={loadReport}
                className="px-3 py-1.5 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors"
              >
                Pobierz
              </button>
            </div>
            {report && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <p className="text-xs text-green-600 font-medium uppercase tracking-wide">Aktywne karty</p>
                    <p className="text-2xl font-bold text-green-800 mt-1">{report.activeCards}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Nieaktywne</p>
                    <p className="text-2xl font-bold text-slate-700 mt-1">{report.inactiveCards}</p>
                  </div>
                  <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                    <p className="text-xs text-orange-600 font-medium uppercase tracking-wide">Koszt miesięczny</p>
                    <p className="text-2xl font-bold text-orange-800 mt-1">{report.totalCost.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Pracownik</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Data start</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.cards.map(card => (
                        <tr key={card.cardId} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-medium text-slate-800">{card.employeeName}</td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              card.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {card.status === 'active' ? 'Aktywna' : 'Nieaktywna'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">{card.startDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
