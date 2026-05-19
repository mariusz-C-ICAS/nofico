/**
 * Data: 2026-05-15
 * Ścieżka: /src/modules/finance/contractors/ContractorForm.tsx
 * Opis: Formularz dodawania/edycji kontrahenta — 3 zakładki, NIP lookup, BL/VIES weryfikacja.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2, User, Globe, CreditCard, Settings2, Loader2,
  ShieldCheck, ShieldAlert, CheckCircle2, XCircle, Plus, Trash2, Save, X,
} from 'lucide-react';
import { useTenant } from '../../../shared/hooks/useTenant';
import {
  createContractor, updateContractor, lookupByNip,
  verifyWhiteList, verifyVies,
} from '../services/contractorService';
import type { Contractor, ContractorBankAccount, Currency, PaymentMethod, VatRate } from '../types/fiTypes';

// ─── Types ────────────────────────────────────────────────────────────────────
type FormTab = 'basic' | 'bank' | 'defaults';

interface Props {
  initialData?: Contractor;
  onSave: () => void;
  onCancel: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CURRENCIES: Currency[] = ['PLN', 'EUR', 'USD', 'GBP'];
const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'transfer', label: 'Przelew' },
  { value: 'cash', label: 'Gotówka' },
  { value: 'card', label: 'Karta' },
  { value: 'blik', label: 'BLIK' },
];
const VAT_RATES: { value: VatRate; label: string }[] = [
  { value: 23, label: '23%' },
  { value: 8, label: '8%' },
  { value: 5, label: '5%' },
  { value: 0, label: '0%' },
  { value: 'zw', label: 'ZW' },
  { value: 'np', label: 'NP' },
  { value: 'oo', label: 'OO' },
];

// ─── Empty state factory ───────────────────────────────────────────────────────
function emptyForm(): Omit<Contractor, 'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'createdBy'> {
  return {
    name: '', shortName: '', type: 'company', nip: '', euVatId: '',
    regon: '', krs: '', address: '', city: '', postCode: '', country: 'PL',
    email: '', emailInvoice: '', phone: '',
    bankAccounts: [],
    status: 'active', isCustomer: true, isSupplier: false,
    defaultPaymentDays: 14,
    defaultPaymentMethod: 'transfer',
    defaultVatRate: 23,
    defaultCurrency: 'PLN',
  };
}

// ─── Input helpers ────────────────────────────────────────────────────────────
function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/30 transition-colors placeholder:text-slate-300';
const selectCls = inputCls + ' cursor-pointer';

// ─── Bank account empty ───────────────────────────────────────────────────────
function emptyBankAccount(): ContractorBankAccount {
  return { id: crypto.randomUUID(), iban: '', bankName: '', swift: '', currency: 'PLN', isDefault: false };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ContractorForm({ initialData, onSave, onCancel }: Props) {
  const { activeTenantId } = useTenant();
  const [tab, setTab] = useState<FormTab>('basic');
  const [form, setForm] = useState<ReturnType<typeof emptyForm>>(() =>
    initialData
      ? { ...emptyForm(), ...initialData }
      : emptyForm()
  );
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // NIP lookup state
  const [nipLoading, setNipLoading] = useState(false);
  const [nipFilled, setNipFilled] = useState(false);
  const nipDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // BL/VIES verification
  const [blStatus, setBlStatus] = useState<boolean | null>(initialData?.isWhiteListValid ?? null);
  const [blLoading, setBlLoading] = useState(false);
  const [viesStatus, setViesStatus] = useState<boolean | null>(initialData?.isViesValid ?? null);
  const [viesLoading, setViesLoading] = useState(false);

  // New bank account form
  const [newBa, setNewBa] = useState<ContractorBankAccount>(emptyBankAccount());
  const [showBaForm, setShowBaForm] = useState(false);

  // Compute completion percentage
  const completionPct = Math.round(
    ([form.name, form.nip, form.address, form.city, form.email, form.postCode].filter(Boolean).length / 6) * 100
  );

  // NIP debounce lookup
  const onNipChange = useCallback((val: string) => {
    setForm(f => ({ ...f, nip: val }));
    setNipFilled(false);
    if (nipDebounceRef.current) clearTimeout(nipDebounceRef.current);
    if (val.length === 10) {
      nipDebounceRef.current = setTimeout(async () => {
        setNipLoading(true);
        try {
          const result = await lookupByNip(val, activeTenantId);
          if (result) {
            setForm(f => ({
              ...f,
              name: result.name || f.name,
              regon: result.regon || f.regon,
              address: result.address || f.address,
              city: result.city || f.city,
              postCode: result.postCode || f.postCode,
              country: result.country || f.country,
              krs: result.krs || f.krs,
            }));
            setNipFilled(true);
          }
        } catch {
          // silent
        } finally {
          setNipLoading(false);
        }
      }, 800);
    }
  }, []);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Nazwa jest wymagana';
    if (form.nip && !/^\d{10}$/.test(form.nip)) errs.nip = 'NIP musi mieć 10 cyfr';
    if (!form.name.trim() || (form.type === 'company' && form.nip && !/^\d{10}$/.test(form.nip))) {
      // covered above
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || !activeTenantId) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        tenantId: activeTenantId,
        createdBy: 'user',
        bankAccounts: form.bankAccounts,
      } as Omit<Contractor, 'id' | 'createdAt' | 'updatedAt'>;

      if (initialData?.id) {
        await updateContractor(activeTenantId, initialData.id, payload);
      } else {
        await createContractor(activeTenantId, payload);
      }
      onSave();
    } catch (err) {
      console.error('ContractorForm save error:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleVerifyBL() {
    if (!activeTenantId || !form.nip) return;
    setBlLoading(true);
    try {
      const r = await verifyWhiteList(activeTenantId, initialData?.id ?? 'new', form.nip);
      setBlStatus(r.isValid);
    } catch {
      setBlStatus(false);
    } finally {
      setBlLoading(false);
    }
  }

  async function handleVerifyVIES() {
    if (!form.euVatId) return;
    setViesLoading(true);
    try {
      const r = await verifyVies(form.euVatId);
      setViesStatus(r.isValid);
    } catch {
      setViesStatus(false);
    } finally {
      setViesLoading(false);
    }
  }

  function addBankAccount() {
    if (!newBa.iban.trim()) return;
    const isFirst = form.bankAccounts.length === 0;
    setForm(f => ({
      ...f,
      bankAccounts: [...f.bankAccounts, { ...newBa, isDefault: isFirst || newBa.isDefault }],
    }));
    setNewBa(emptyBankAccount());
    setShowBaForm(false);
  }

  function removeBankAccount(id: string) {
    setForm(f => ({ ...f, bankAccounts: f.bankAccounts.filter(ba => ba.id !== id) }));
  }

  function setDefaultBankAccount(id: string) {
    setForm(f => ({
      ...f,
      bankAccounts: f.bankAccounts.map(ba => ({ ...ba, isDefault: ba.id === id })),
    }));
  }

  const tabs: { id: FormTab; label: string; icon: React.ElementType }[] = [
    { id: 'basic', label: 'Dane Podstawowe', icon: Building2 },
    { id: 'bank', label: 'Rachunki Bankowe', icon: CreditCard },
    { id: 'defaults', label: 'Ustawienia Domyślne', icon: Settings2 },
  ];

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-300">

      {/* Header */}
      <div className="px-8 pt-8 pb-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">
            {initialData ? 'Edytuj Kontrahenta' : 'Nowy Kontrahent'}
          </h2>
          <button type="button" onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Uzupełnienie formularza</span>
            <span className="text-[10px] font-black text-indigo-600">{completionPct}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-indigo-600 rounded-full"
              animate={{ width: `${completionPct}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-slate-100 -mx-8 px-8">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest border-b-2 transition-colors ${tab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-700'}`}
              >
                <Icon size={12} /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-8 py-6 space-y-5">
        <AnimatePresence mode="wait">
          {tab === 'basic' && (
            <motion.div key="basic" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
              {/* Type toggle */}
              <Field label="Typ kontrahenta">
                <div className="flex gap-2">
                  {[{ v: 'company', l: 'Firma' }, { v: 'individual', l: 'Osoba' }, { v: 'foreign', l: 'Zagraniczny' }].map(({ v, l }) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, type: v as Contractor['type'] }))}
                      className={`flex-1 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all border ${form.type === v ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </Field>

              {/* Name */}
              <Field label="Nazwa pełna" required>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="np. Acme Sp. z o.o." />
                {errors.name && <p className="text-[10px] text-rose-500 mt-0.5 font-bold">{errors.name}</p>}
              </Field>

              <Field label="Nazwa skrócona">
                <input value={form.shortName ?? ''} onChange={e => setForm(f => ({ ...f, shortName: e.target.value }))} className={inputCls} placeholder="np. Acme" />
              </Field>

              {/* NIP + lookup */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="NIP">
                  <div className="relative">
                    <input
                      value={form.nip ?? ''}
                      onChange={e => onNipChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className={inputCls}
                      placeholder="1234567890"
                      maxLength={10}
                    />
                    {nipLoading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-indigo-400" />}
                    {nipFilled && !nipLoading && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Dane z GUS</span>
                    )}
                  </div>
                  {errors.nip && <p className="text-[10px] text-rose-500 mt-0.5 font-bold">{errors.nip}</p>}
                </Field>
                <Field label="EU VAT ID">
                  <input value={form.euVatId ?? ''} onChange={e => setForm(f => ({ ...f, euVatId: e.target.value }))} className={inputCls} placeholder="PL1234567890" />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="REGON">
                  <input value={form.regon ?? ''} onChange={e => setForm(f => ({ ...f, regon: e.target.value }))} className={inputCls} placeholder="123456789" />
                </Field>
                <Field label="KRS">
                  <input value={form.krs ?? ''} onChange={e => setForm(f => ({ ...f, krs: e.target.value }))} className={inputCls} placeholder="0000000000" />
                </Field>
              </div>

              <Field label="Adres">
                <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className={inputCls} placeholder="ul. Przykładowa 1" />
              </Field>

              <div className="grid grid-cols-3 gap-4">
                <Field label="Kod pocztowy">
                  <input value={form.postCode} onChange={e => setForm(f => ({ ...f, postCode: e.target.value }))} className={inputCls} placeholder="00-000" />
                </Field>
                <Field label="Miasto">
                  <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className={inputCls} placeholder="Warszawa" />
                </Field>
                <Field label="Kraj">
                  <input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} className={inputCls} placeholder="PL" maxLength={2} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Email">
                  <input type="email" value={form.email ?? ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputCls} placeholder="kontakt@firma.pl" />
                </Field>
                <Field label="Email do faktur">
                  <input type="email" value={form.emailInvoice ?? ''} onChange={e => setForm(f => ({ ...f, emailInvoice: e.target.value }))} className={inputCls} placeholder="faktury@firma.pl" />
                </Field>
              </div>

              <Field label="Telefon">
                <input value={form.phone ?? ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputCls} placeholder="+48 600 000 000" />
              </Field>

              {/* Role toggles */}
              <div className="flex gap-4 pt-1">
                {[
                  { key: 'isCustomer' as const, label: 'Klient' },
                  { key: 'isSupplier' as const, label: 'Dostawca' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, [key]: !f[key] }))}
                    className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all border ${form[key] ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                  >
                    {label} {form[key] ? '✓' : ''}
                  </button>
                ))}
              </div>

              {/* BL + VIES verify */}
              <div className="flex gap-3 pt-1 flex-wrap">
                <button
                  type="button"
                  onClick={handleVerifyBL}
                  disabled={blLoading || !form.nip}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 transition-colors disabled:opacity-40"
                >
                  {blLoading ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                  Weryfikuj Białą Listę
                </button>
                {blStatus !== null && (
                  blStatus
                    ? <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600"><CheckCircle2 size={12} /> BL Aktywny</span>
                    : <span className="flex items-center gap-1 text-[10px] font-black text-rose-600"><XCircle size={12} /> BL Nieaktywny</span>
                )}

                <button
                  type="button"
                  onClick={handleVerifyVIES}
                  disabled={viesLoading || !form.euVatId}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition-colors disabled:opacity-40"
                >
                  {viesLoading ? <Loader2 size={12} className="animate-spin" /> : <Globe size={12} />}
                  Weryfikuj VIES
                </button>
                {viesStatus !== null && (
                  viesStatus
                    ? <span className="flex items-center gap-1 text-[10px] font-black text-blue-600"><CheckCircle2 size={12} /> VIES Aktywny</span>
                    : <span className="flex items-center gap-1 text-[10px] font-black text-rose-600"><XCircle size={12} /> VIES Nieaktywny</span>
                )}
              </div>
            </motion.div>
          )}

          {tab === 'bank' && (
            <motion.div key="bank" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
              {form.bankAccounts.length === 0 ? (
                <p className="text-sm text-slate-400 italic">Brak rachunków. Dodaj poniżej.</p>
              ) : (
                <div className="space-y-2">
                  {form.bankAccounts.map(ba => (
                    <div key={ba.id} className={`flex items-center justify-between p-4 rounded-2xl border ${ba.isDefault ? 'border-indigo-200 bg-indigo-50/40' : 'border-slate-100 bg-slate-50/50'}`}>
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-sm text-slate-800 truncate">{ba.iban}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {[ba.bankName, ba.swift, ba.currency].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setDefaultBankAccount(ba.id)}
                          className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg transition-colors ${ba.isDefault ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'}`}
                        >
                          {ba.isDefault ? 'Domyślny' : 'Ustaw domyślny'}
                        </button>
                        <button type="button" onClick={() => removeBankAccount(ba.id)} className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {showBaForm ? (
                <div className="border border-indigo-100 rounded-2xl p-5 space-y-3 bg-indigo-50/20">
                  <Field label="IBAN" required>
                    <input value={newBa.iban} onChange={e => setNewBa(b => ({ ...b, iban: e.target.value }))} className={inputCls} placeholder="PL00 0000 0000 0000 0000 0000 0000" />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Nazwa banku">
                      <input value={newBa.bankName ?? ''} onChange={e => setNewBa(b => ({ ...b, bankName: e.target.value }))} className={inputCls} placeholder="PKO BP" />
                    </Field>
                    <Field label="SWIFT/BIC">
                      <input value={newBa.swift ?? ''} onChange={e => setNewBa(b => ({ ...b, swift: e.target.value }))} className={inputCls} placeholder="BPKOPLPW" />
                    </Field>
                  </div>
                  <Field label="Waluta">
                    <select value={newBa.currency} onChange={e => setNewBa(b => ({ ...b, currency: e.target.value as Currency }))} className={selectCls}>
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                  <div className="flex gap-2">
                    <button type="button" onClick={addBankAccount} className="flex-1 bg-indigo-600 text-white text-[11px] font-black uppercase tracking-widest py-2.5 rounded-xl hover:bg-indigo-500 transition-colors">
                      Dodaj rachunek
                    </button>
                    <button type="button" onClick={() => setShowBaForm(false)} className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-500 text-[11px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors">
                      Anuluj
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowBaForm(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-600 text-[11px] font-black uppercase tracking-widest transition-colors"
                >
                  <Plus size={13} /> Dodaj rachunek bankowy
                </button>
              )}
            </motion.div>
          )}

          {tab === 'defaults' && (
            <motion.div key="defaults" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Termin płatności (dni)">
                  <input
                    type="number"
                    min={0}
                    max={365}
                    value={form.defaultPaymentDays ?? 14}
                    onChange={e => setForm(f => ({ ...f, defaultPaymentDays: parseInt(e.target.value) || 14 }))}
                    className={inputCls}
                  />
                </Field>
                <Field label="Metoda płatności">
                  <select value={form.defaultPaymentMethod ?? 'transfer'} onChange={e => setForm(f => ({ ...f, defaultPaymentMethod: e.target.value as PaymentMethod }))} className={selectCls}>
                    {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Stawka VAT domyślna">
                  <select value={String(form.defaultVatRate ?? 23)} onChange={e => {
                    const v = e.target.value;
                    const parsed: VatRate = /^\d+$/.test(v) ? (parseInt(v) as VatRate) : v as VatRate;
                    setForm(f => ({ ...f, defaultVatRate: parsed }));
                  }} className={selectCls}>
                    {VAT_RATES.map(r => <option key={String(r.value)} value={String(r.value)}>{r.label}</option>)}
                  </select>
                </Field>
                <Field label="Waluta domyślna">
                  <select value={form.defaultCurrency ?? 'PLN'} onChange={e => setForm(f => ({ ...f, defaultCurrency: e.target.value as Currency }))} className={selectCls}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 text-xs text-slate-500">
                Ustawienia domyślne będą automatycznie wstępnie uzupełniać nowe faktury wystawiane dla tego kontrahenta.
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="px-8 pb-8 flex gap-3 justify-end border-t border-slate-100 pt-5">
        <button type="button" onClick={onCancel} className="px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
          Anuluj
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-8 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-60"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Zapisywanie...' : 'Zapisz kontrahenta'}
        </button>
      </div>
    </form>
  );
}
