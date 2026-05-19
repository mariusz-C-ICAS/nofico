import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, RefreshCw, Building2, User } from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import NipLookup from './NipLookup';
import RegonLookup from './RegonLookup';
import KrsLookup from './KrsLookup';
import type { GusCompanyData, RegonCompanyData } from '../services/gusApiService';
import type { EkrsCompanyData } from '../services/ekrsProService';

interface Props {
  tenantId: string;
  onClose: () => void;
}

const STATUSES = ['prospect', 'active', 'churned', 'blocked'];
const INDUSTRIES = ['IT', 'Produkcja', 'Handel', 'Usługi', 'Budownictwo', 'Transport', 'Finanse', 'Medycyna', 'Edukacja', 'Uroda', 'Sport & Fitness', 'Gastronomia', 'Nieruchomości', 'Prawo', 'Inne'];
const GENDERS = ['Kobieta', 'Mężczyzna', 'Inne', 'Nie podano'];

export default function AddCustomerModal({ tenantId, onClose }: Props) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [customerType, setCustomerType] = useState<'business' | 'individual'>('business');
  const [form, setForm] = useState({
    name: '', nip: '', email: '', phone: '', city: '', address: '',
    zipCode: '', industry: '', status: 'prospect', website: '',
    tags: '', totalRevenue: '', currency: 'PLN',
    whiteListValid: false, regon: '', krs: '',
    firstName: '', lastName: '', dateOfBirth: '', gender: 'Nie podano',
  });

  const upd = (k: keyof typeof form, v: string | boolean) =>
    setForm(p => ({ ...p, [k]: v }));

  const handleGusFill = (data: GusCompanyData) => {
    setForm(p => ({
      ...p,
      name: data.name || p.name,
      nip: data.nip || p.nip,
      address: data.address || p.address,
      city: data.city || p.city,
      zipCode: data.zipCode || p.zipCode,
      regon: data.regon || p.regon,
      whiteListValid: data.whiteListValid,
    }));
  };

  const handleRegonFill = (data: RegonCompanyData) => {
    setForm(p => ({
      ...p,
      name: data.name || p.name,
      nip: data.nip || p.nip,
      regon: data.regon || p.regon,
      address: data.street || p.address,
      city: data.city || p.city,
      zipCode: data.postalCode || p.zipCode,
    }));
  };

  const handleKrsFill = (data: EkrsCompanyData) => {
    setForm(p => ({
      ...p,
      name: data.name || p.name,
      nip: data.nip || p.nip,
      regon: data.regon || p.regon,
      address: data.address || p.address,
      krs: data.krs || p.krs,
    }));
  };

  const displayName = customerType === 'individual'
    ? [form.firstName.trim(), form.lastName.trim()].filter(Boolean).join(' ')
    : form.name.trim();

  const handleSave = async () => {
    if (!displayName) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'customers'), {
        tenantId,
        customerType,
        name: displayName,
        ...(customerType === 'individual' ? {
          firstName: form.firstName.trim() || null,
          lastName: form.lastName.trim() || null,
          dateOfBirth: form.dateOfBirth || null,
          gender: form.gender,
        } : {
          nip: form.nip.replace(/\D/g, '') || null,
          regon: form.regon || null,
          whiteListValid: form.whiteListValid,
        }),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        city: form.city.trim() || null,
        address: form.address.trim() || null,
        zipCode: form.zipCode.trim() || null,
        industry: form.industry || null,
        status: form.status,
        website: form.website.trim() || null,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        totalRevenue: parseFloat(form.totalRevenue) || 0,
        currency: form.currency,
        leadScore: 0,
        serviceEventCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
          <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center">
            {customerType === 'business' ? <Building2 size={18} className="text-indigo-700" /> : <User size={18} className="text-indigo-700" />}
          </div>
          <div className="flex-1">
            <h3 className="text-base font-black text-slate-900 uppercase tracking-tighter">{t('crm.addCustomer.title')}</h3>
            <p className="text-[10px] text-slate-500">{customerType === 'business' ? t('crm.addCustomer.businessSubtitle') : t('crm.addCustomer.individualSubtitle')}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Type toggle */}
          <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
            <button
              onClick={() => setCustomerType('business')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${customerType === 'business' ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}>
              <Building2 size={12} /> {t('crm.addCustomer.businessTab')}
            </button>
            <button
              onClick={() => setCustomerType('individual')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${customerType === 'individual' ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}>
              <User size={12} /> {t('crm.addCustomer.individualTab')}
            </button>
          </div>

          {/* Business: GUS lookup — NIP (Biała Lista MF) + REGON (BIR) */}
          {customerType === 'business' && (
            <div className="space-y-3">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('crm.addCustomer.gusAutofill')}</p>
                <NipLookup onFill={handleGusFill} initialNip={form.nip} />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Autouzupełnienie REGON (GUS BIR)</p>
                <RegonLookup tenantId={tenantId} onFound={handleRegonFill} initialRegon={form.regon} />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Autouzupełnienie KRS (e-KRS Pro)</p>
                <KrsLookup tenantId={tenantId} onFill={handleKrsFill} initialKrs={form.krs} />
              </div>
            </div>
          )}

          <div className="border-t border-slate-100 pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">

              {customerType === 'business' ? (
                <>
                  <div className="col-span-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('crm.addCustomer.companyName')}</label>
                    <input value={form.name} onChange={e => upd('name', e.target.value)}
                      className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('crm.addCustomer.nip')}</label>
                    <input value={form.nip} onChange={e => upd('nip', e.target.value)} maxLength={13}
                      className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none font-mono" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('crm.addCustomer.regon')}</label>
                    <input value={form.regon} onChange={e => upd('regon', e.target.value)}
                      className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none font-mono" />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('crm.addCustomer.firstName')}</label>
                    <input value={form.firstName} onChange={e => upd('firstName', e.target.value)}
                      className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('crm.addCustomer.lastName')}</label>
                    <input value={form.lastName} onChange={e => upd('lastName', e.target.value)}
                      className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('crm.addCustomer.birthDate')}</label>
                    <input type="date" value={form.dateOfBirth} onChange={e => upd('dateOfBirth', e.target.value)}
                      className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('crm.addCustomer.gender')}</label>
                    <select value={form.gender} onChange={e => upd('gender', e.target.value)}
                      className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                      {GENDERS.map(g => <option key={g}>{g}</option>)}
                    </select>
                  </div>
                </>
              )}

              {/* Shared fields */}
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('crm.addCustomer.status')}</label>
                <select value={form.status} onChange={e => upd('status', e.target.value)}
                  className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('crm.addCustomer.industry')}</label>
                <select value={form.industry} onChange={e => upd('industry', e.target.value)}
                  className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                  <option value="">{t('crm.addCustomer.chooseIndustry')}</option>
                  {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('crm.addCustomer.email')}</label>
                <input type="email" value={form.email} onChange={e => upd('email', e.target.value)}
                  className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('crm.addCustomer.phone')}</label>
                <input value={form.phone} onChange={e => upd('phone', e.target.value)}
                  className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('crm.addCustomer.city')}</label>
                <input value={form.city} onChange={e => upd('city', e.target.value)}
                  className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
              </div>
              <div className="col-span-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('crm.addCustomer.address')}</label>
                <input value={form.address} onChange={e => upd('address', e.target.value)}
                  className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('crm.addCustomer.revenue')}</label>
                <input type="number" value={form.totalRevenue} onChange={e => upd('totalRevenue', e.target.value)}
                  className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('crm.addCustomer.tags')}</label>
                <input value={form.tags} onChange={e => upd('tags', e.target.value)}
                  placeholder={t('crm.addCustomer.tagsPlaceholder')}
                  className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 border border-slate-200 text-slate-500 font-black text-xs py-3 rounded-xl">
              {t('crm.addCustomer.cancel')}
            </button>
            <button onClick={handleSave} disabled={!displayName || saving}
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-black text-xs py-3 rounded-xl">
              {saving && <RefreshCw size={11} className="animate-spin" />}
              {t('crm.addCustomer.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
