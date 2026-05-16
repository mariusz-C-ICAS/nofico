import React, { useState } from 'react';
import { Building2, Plus, Pencil, Trash2, CheckCircle2, X, AlertTriangle } from 'lucide-react';
import { useCompany, Company, CompanyInput } from '../../../core/auth/CompanyContext';

const INDUSTRIES = [
  'Budownictwo', 'Handel detaliczny', 'Transport i logistyka', 'Produkcja',
  'IT / Software', 'Finanse / Ubezpieczenia', 'Ochrona zdrowia', 'Edukacja',
  'Gastronomia / Hotelarstwo', 'Nieruchomości', 'Usługi dla firm', 'Inne',
];

export default function CompaniesSection() {
  const { availableCompanies, currentCompany, switchCompany, createCompany, updateCompany, deactivateCompany, loadingCompanies } = useCompany();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CompanyInput>({ name: '', nip: '', regon: '', industry: '', address: { street: '', city: '', zip: '', country: 'PL' } });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDeactivate, setConfirmDeactivate] = useState<string | null>(null);

  const resetForm = () => {
    setForm({ name: '', nip: '', regon: '', industry: '', address: { street: '', city: '', zip: '', country: 'PL' } });
    setEditId(null);
    setShowForm(false);
    setError('');
  };

  const openEdit = (c: Company) => {
    setForm({ name: c.name, nip: c.nip ?? '', regon: c.regon ?? '', industry: c.industry ?? '', address: c.address ?? { street: '', city: '', zip: '', country: 'PL' } });
    setEditId(c.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Nazwa firmy jest wymagana.'); return; }
    setSaving(true); setError('');
    try {
      const payload: CompanyInput = {
        name: form.name.trim(),
        nip: form.nip?.trim() || undefined,
        regon: form.regon?.trim() || undefined,
        industry: form.industry?.trim() || undefined,
        address: {
          street: form.address?.street?.trim() || undefined,
          city: form.address?.city?.trim() || undefined,
          zip: form.address?.zip?.trim() || undefined,
          country: form.address?.country || 'PL',
        },
      };
      if (editId) {
        await updateCompany(editId, payload);
      } else {
        await createCompany(payload);
      }
      resetForm();
    } catch (e: any) {
      setError(e.message ?? 'Błąd zapisu.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await deactivateCompany(id);
      setConfirmDeactivate(null);
    } catch (e: any) {
      setError(e.message ?? 'Błąd.');
    }
  };

  if (loadingCompanies) {
    return <div className="py-20 text-center text-slate-400 text-sm font-bold">Ładowanie firm...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
              <Building2 size={18} />
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Firmy w grupie</h3>
          </div>
          {!showForm && (
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-widest px-5 py-3 rounded-2xl transition-all"
            >
              <Plus size={13} /> Dodaj firmę
            </button>
          )}
        </div>

        <div className="p-8 space-y-4">
          {/* Company list */}
          {availableCompanies.map(c => (
            <div
              key={c.id}
              className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${c.id === currentCompany?.id ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100 hover:bg-white hover:shadow-md'}`}
            >
              <div className="flex items-center gap-4">
                <button
                  onClick={() => switchCompany(c.id)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xs italic transition-all ${c.id === currentCompany?.id ? 'bg-indigo-600' : 'bg-slate-300 hover:bg-indigo-500'}`}
                  title="Ustaw jako aktywną"
                >
                  {c.name.charAt(0).toUpperCase()}
                </button>
                <div>
                  <div className="font-black text-slate-900 text-sm italic flex items-center gap-2">
                    {c.name}
                    {c.id === currentCompany?.id && (
                      <span className="text-[8px] bg-indigo-600 text-white px-2 py-0.5 rounded-full uppercase tracking-widest font-black">Aktywna</span>
                    )}
                  </div>
                  <div className="text-[9px] text-slate-400 font-bold mt-0.5">
                    {[c.nip && `NIP: ${c.nip}`, c.industry].filter(Boolean).join(' · ')}
                    {c.address?.city && ` · ${c.address.city}`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEdit(c)}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 flex items-center justify-center transition-all"
                >
                  <Pencil size={13} />
                </button>
                {availableCompanies.length > 1 && c.id !== currentCompany?.id && (
                  confirmDeactivate === c.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleDeactivate(c.id)} className="text-[9px] font-black text-red-600 hover:text-red-700 px-2">Potwierdź</button>
                      <button onClick={() => setConfirmDeactivate(null)} className="text-[9px] font-black text-slate-400 px-2">Anuluj</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeactivate(c.id)}
                      className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-red-100 text-slate-300 hover:text-red-500 flex items-center justify-center transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  )
                )}
              </div>
            </div>
          ))}

          {availableCompanies.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-sm font-bold">Brak firm. Dodaj pierwszą firmę.</div>
          )}

          {/* Add / Edit form */}
          {showForm && (
            <div className="mt-4 p-6 bg-indigo-50 border border-indigo-100 rounded-2xl space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">
                  {editId ? 'Edytuj firmę' : 'Nowa firma'}
                </span>
                <button onClick={resetForm} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Nazwa firmy *</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Alfa Sp. z o.o."
                    className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-3 text-sm font-black text-slate-900 focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">NIP</label>
                  <input
                    value={form.nip}
                    onChange={e => setForm(f => ({ ...f, nip: e.target.value }))}
                    placeholder="1234567890"
                    className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-900 focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">REGON</label>
                  <input
                    value={form.regon}
                    onChange={e => setForm(f => ({ ...f, regon: e.target.value }))}
                    placeholder="987654321"
                    className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-900 focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Branża</label>
                  <select
                    value={form.industry}
                    onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
                    className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-3 text-sm font-black text-slate-900 focus:outline-none focus:border-indigo-400"
                  >
                    <option value="">— wybierz —</option>
                    {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Ulica i numer</label>
                  <input
                    value={form.address?.street ?? ''}
                    onChange={e => setForm(f => ({ ...f, address: { ...f.address, street: e.target.value } }))}
                    placeholder="ul. Puławska 14"
                    className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Miasto</label>
                  <input
                    value={form.address?.city ?? ''}
                    onChange={e => setForm(f => ({ ...f, address: { ...f.address, city: e.target.value } }))}
                    placeholder="Warszawa"
                    className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Kod pocztowy</label>
                  <input
                    value={form.address?.zip ?? ''}
                    onChange={e => setForm(f => ({ ...f, address: { ...f.address, zip: e.target.value } }))}
                    placeholder="02-512"
                    className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-900 focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              {error && (
                <p className="flex items-center gap-2 text-red-600 text-xs font-bold">
                  <AlertTriangle size={12} /> {error}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  disabled={saving}
                  onClick={handleSave}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-xl transition-all"
                >
                  <CheckCircle2 size={13} /> {saving ? 'Zapisuję...' : editId ? 'Zaktualizuj' : 'Dodaj firmę'}
                </button>
                <button onClick={resetForm} className="text-slate-500 hover:text-slate-700 font-black text-[10px] uppercase tracking-widest px-4 py-3">
                  Anuluj
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
