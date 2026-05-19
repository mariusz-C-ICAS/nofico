import React, { useEffect, useRef, useState } from 'react';
import { Building2, Upload, CheckCircle2, AlertTriangle, RefreshCw, X, Plus } from 'lucide-react';
import { useCompany } from '../../../core/auth/CompanyContext';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../../shared/lib/firebase';
import { fetchCompanyByNip } from '../../onboarding/onboardingService';

const INDUSTRIES = [
  'Budownictwo / PropTech', 'Handel detaliczny', 'Transport i logistyka', 'Produkcja',
  'IT / Software', 'Finanse / Ubezpieczenia', 'Ochrona zdrowia', 'Edukacja',
  'Gastronomia / Hotelarstwo', 'Nieruchomości', 'Usługi dla firm',
  'Rolnictwo', 'Energetyka', 'Media / Reklama', 'Inne',
];

export default function ProfilFirmySection() {
  const { currentCompany, updateCompany } = useCompany();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [nipLoading, setNipLoading] = useState(false);
  const [pkdInput, setPkdInput] = useState('');
  const logoRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '',
    nip: '',
    regon: '',
    krs: '',
    phone: '',
    email: '',
    website: '',
    industry: '',
    industries: [] as string[],
    pkd: [] as string[],
    logoUrl: '',
    address: { street: '', city: '', zip: '', country: 'PL' },
  });

  useEffect(() => {
    if (!currentCompany) return;
    const c = currentCompany as any;
    setForm({
      name: c.name ?? '',
      nip: c.nip ?? '',
      regon: c.regon ?? '',
      krs: c.krs ?? '',
      phone: c.phone ?? '',
      email: c.email ?? '',
      website: c.website ?? '',
      industry: c.industry ?? '',
      industries: c.industries ?? [],
      pkd: c.pkd ?? [],
      logoUrl: c.logoUrl ?? '',
      address: c.address ?? { street: '', city: '', zip: '', country: 'PL' },
    });
  }, [currentCompany?.id]);

  const fetchFromGUS = async () => {
    if (!form.nip || form.nip.length < 10) return;
    setNipLoading(true); setError('');
    try {
      const data = await fetchCompanyByNip(form.nip.replace(/[^0-9]/g, ''));
      if (data) {
        setForm(f => ({
          ...f,
          name: data.name || f.name,
          regon: data.regon || f.regon,
          krs: data.krs || f.krs,
          address: {
            street: data.street || f.address.street,
            city: data.city || f.address.city,
            zip: data.zip || f.address.zip,
            country: 'PL',
          },
        }));
      } else {
        setError('Nie znaleziono firmy w bazie MF dla podanego NIP.');
      }
    } finally {
      setNipLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentCompany) return;
    setSaving(true); setError('');
    try {
      const ref = storageRef(storage, `logos/${currentCompany.id}/${file.name}`);
      await uploadBytes(ref, file);
      const url = await getDownloadURL(ref);
      setForm(f => ({ ...f, logoUrl: url }));
      await updateCompany(currentCompany.id, { logoUrl: url } as any);
      setSuccess('Logo zapisane.');
    } catch (err: any) {
      setError(err.message ?? 'Błąd wgrywania logo.');
    } finally {
      setSaving(false);
    }
  };

  const addPkd = () => {
    const code = pkdInput.trim().toUpperCase();
    if (!code || form.pkd.includes(code)) return;
    setForm(f => ({ ...f, pkd: [...f.pkd, code] }));
    setPkdInput('');
  };

  const removePkd = (code: string) => setForm(f => ({ ...f, pkd: f.pkd.filter(p => p !== code) }));

  const toggleIndustry = (ind: string) => {
    setForm(f => ({
      ...f,
      industries: f.industries.includes(ind)
        ? f.industries.filter(i => i !== ind)
        : [...f.industries, ind],
    }));
  };

  const handleSave = async () => {
    if (!currentCompany || !form.name.trim()) { setError('Nazwa firmy jest wymagana.'); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      await updateCompany(currentCompany.id, {
        name: form.name,
        nip: form.nip || undefined,
        regon: form.regon || undefined,
        krs: form.krs || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        website: form.website || undefined,
        industry: form.industry || undefined,
        industries: form.industries.length ? form.industries : undefined,
        pkd: form.pkd.length ? form.pkd : undefined,
        logoUrl: form.logoUrl || undefined,
        address: {
          street: form.address.street || undefined,
          city: form.address.city || undefined,
          zip: form.address.zip || undefined,
          country: form.address.country || 'PL',
        },
      } as any);
      setSuccess('Profil firmy zapisany.');
    } catch (err: any) {
      setError(err.message ?? 'Błąd zapisu.');
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ label, value, onChange, placeholder, wide, mono, disabled: dis }: {
    label: string; value: string; onChange: (v: string) => void;
    placeholder?: string; wide?: boolean; mono?: boolean; disabled?: boolean;
  }) => (
    <div className={wide ? 'md:col-span-2' : ''}>
      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={dis}
        className={`w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm text-slate-900 placeholder:text-slate-300 placeholder:font-normal focus:outline-none focus:border-indigo-400 transition-colors ${mono ? 'font-mono' : 'font-black'} ${dis ? 'opacity-60 cursor-not-allowed' : ''}`}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
            <Building2 size={18} />
          </div>
          <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Profil Firmy</h3>
        </div>

        <div className="p-8 space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-6 pb-6 border-b border-slate-50">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-slate-100 flex items-center justify-center bg-indigo-600 text-white font-black text-2xl italic shrink-0">
              {form.logoUrl ? (
                <img src={form.logoUrl} alt="logo" className="w-full h-full object-cover" />
              ) : (
                (form.name || 'C').charAt(0)
              )}
            </div>
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Logo firmy</div>
              <button
                onClick={() => logoRef.current?.click()}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-widest px-5 py-3 rounded-xl transition-all"
              >
                <Upload size={13} /> Wgraj nowe logo
              </button>
              <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </div>
          </div>

          {/* Dane rejestrowe */}
          <div>
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Dane rejestrowe</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Nazwa firmy *" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} wide />
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">NIP</label>
                <div className="flex gap-2">
                  <input
                    value={form.nip}
                    onChange={e => setForm(f => ({ ...f, nip: e.target.value }))}
                    placeholder="1234567890"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-mono text-slate-900 focus:outline-none focus:border-indigo-400"
                  />
                  <button
                    onClick={fetchFromGUS}
                    disabled={nipLoading || form.nip.length < 10}
                    title="Pobierz dane z Białej Listy MF (nazwa, adres, REGON, KRS)"
                    className="w-12 h-12 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center disabled:opacity-40 transition-all"
                  >
                    {nipLoading ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  </button>
                </div>
                <div className="text-[8px] text-slate-400 font-bold mt-1">Biała Lista MF — pobiera: nazwę, adres, REGON, KRS. PKD/kontakt — wpisz ręcznie.</div>
              </div>
              <Field label="REGON" value={form.regon} onChange={v => setForm(f => ({ ...f, regon: v }))} placeholder="987654321" mono />
              <Field label="KRS" value={form.krs} onChange={v => setForm(f => ({ ...f, krs: v }))} placeholder="0000000000" mono />
            </div>
          </div>

          {/* Kody PKD */}
          <div className="border-t border-slate-50 pt-6">
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Kody PKD</div>
            <div className="flex gap-2 mb-3 flex-wrap">
              {form.pkd.map(code => (
                <span key={code} className="flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-xl text-[10px] font-black">
                  {code}
                  <button onClick={() => removePkd(code)} className="hover:text-red-500"><X size={10} /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={pkdInput}
                onChange={e => setPkdInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addPkd()}
                placeholder="np. 41.20.Z"
                className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-mono text-slate-900 focus:outline-none focus:border-indigo-400 w-40"
              />
              <button onClick={addPkd} className="w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center hover:bg-indigo-500 transition-all">
                <Plus size={14} />
              </button>
            </div>
            <div className="text-[8px] text-slate-400 font-bold mt-2">System AI będzie weryfikował zgodność faktur z kodami PKD.</div>
          </div>

          {/* Branże */}
          <div className="border-t border-slate-50 pt-6">
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Branże działalności (wybierz wszystkie pasujące)</div>
            <div className="flex flex-wrap gap-2">
              {INDUSTRIES.map(ind => (
                <button
                  key={ind}
                  onClick={() => toggleIndustry(ind)}
                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                    form.industries.includes(ind)
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-indigo-200'
                  }`}
                >
                  {ind}
                </button>
              ))}
            </div>
          </div>

          {/* Kontakt */}
          <div className="border-t border-slate-50 pt-6">
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Dane kontaktowe</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Email kontaktowy" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="biuro@firma.pl" />
              <Field label="Telefon" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} placeholder="+48 22 123 45 67" />
              <Field label="Strona www" value={form.website} onChange={v => setForm(f => ({ ...f, website: v }))} placeholder="https://firma.pl" wide />
            </div>
          </div>

          {/* Adres */}
          <div className="border-t border-slate-50 pt-6">
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Adres siedziby</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Ulica i numer</label>
                <input value={form.address.street} onChange={e => setForm(f => ({ ...f, address: { ...f.address, street: e.target.value } }))}
                  placeholder="ul. Puławska 14"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-black text-slate-900 focus:outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Kod pocztowy</label>
                <input value={form.address.zip} onChange={e => setForm(f => ({ ...f, address: { ...f.address, zip: e.target.value } }))}
                  placeholder="02-512"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-mono text-slate-900 focus:outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Miasto</label>
                <input value={form.address.city} onChange={e => setForm(f => ({ ...f, address: { ...f.address, city: e.target.value } }))}
                  placeholder="Warszawa"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-black text-slate-900 focus:outline-none focus:border-indigo-400" />
              </div>
            </div>
          </div>

          {error && <p className="flex items-center gap-2 text-red-600 text-xs font-bold"><AlertTriangle size={12} />{error}</p>}
          {success && <p className="flex items-center gap-2 text-emerald-600 text-xs font-bold"><CheckCircle2 size={12} />{success}</p>}

          <div className="pt-4 border-t border-slate-50">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-slate-900 hover:bg-indigo-600 disabled:opacity-50 text-white font-black text-[10px] uppercase tracking-widest px-8 py-4 rounded-2xl transition-all shadow-xl flex items-center gap-2"
            >
              <CheckCircle2 size={14} /> {saving ? 'Zapisuję...' : 'Zapisz profil firmy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
