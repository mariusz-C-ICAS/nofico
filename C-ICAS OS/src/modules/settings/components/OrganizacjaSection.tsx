/**
 * OrganizacjaSection.tsx
 * Scalona sekcja: Profil Firmy + Struktura Grupy
 *
 * Wzorce biznesowe wg dokumentacji:
 *  - Standalone   : JDG / Sp. z o.o. bez powiązań grupowych
 *  - Holding      : spółka matka posiadająca udziały w zależnych
 *  - Subsidiary   : spółka zależna w holdingu (art. 4 §1 pkt 4 KSH)
 *  - Affiliate    : spółka stowarzyszona (art. 4 §1 pkt 5 KSH) ≥20% głosów
 *  - Branch       : oddział tej samej osoby prawnej (art. 5 ustawy o swobodzie dz.g.)
 *
 * Use-cases z docs: UC-CC-04 (refakturowanie), UC-CC-10 (pożyczki wewnątrzgrupowe),
 * UC-TEN-07 (fuzja), Art. 210 KSH (lock dostępu).
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Building2, Plus, Pencil, Trash2, CheckCircle2, X, AlertTriangle,
  RefreshCw, Upload, GitBranch, Info, ChevronDown, ChevronRight,
} from 'lucide-react';
import { useCompany, Company, CompanyInput } from '../../../core/auth/CompanyContext';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../../shared/lib/firebase';
import { fetchCompanyByNip } from '../../onboarding/onboardingService';

/* ── typy ── */
type GroupRelationType = 'standalone' | 'parent' | 'subsidiary' | 'affiliate' | 'branch';

const RELATION_META: Record<GroupRelationType, { label: string; desc: string; color: string }> = {
  standalone: { label: 'Samodzielna', desc: 'Spółka niezależna, bez powiązań grupowych', color: 'bg-slate-500' },
  parent:     { label: 'Spółka dominująca', desc: 'Holding / spółka matka (art. 4 §1 pkt 4 KSH)', color: 'bg-violet-600' },
  subsidiary: { label: 'Spółka zależna', desc: 'Podmiot kontrolowany przez spółkę dominującą', color: 'bg-indigo-500' },
  affiliate:  { label: 'Spółka stowarzyszona', desc: '≥20% głosów, brak kontroli (art. 4 §1 pkt 5 KSH)', color: 'bg-cyan-600' },
  branch:     { label: 'Oddział', desc: 'Wyodrębniony organizacyjnie oddział tej samej osoby prawnej', color: 'bg-teal-600' },
};

const INDUSTRIES = [
  'Budownictwo / PropTech', 'Handel detaliczny', 'Transport i logistyka', 'Produkcja',
  'IT / Software', 'Finanse / Ubezpieczenia', 'Ochrona zdrowia', 'Edukacja',
  'Gastronomia / Hotelarstwo', 'Nieruchomości', 'Usługi dla firm',
  'Rolnictwo', 'Energetyka', 'Media / Reklama', 'Inne',
];

/* ── helpers ── */
function Badge({ type }: { type: GroupRelationType }) {
  const m = RELATION_META[type];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest text-white ${m.color}`}>
      {m.label}
    </span>
  );
}

/* ════════════════════════════════════════════════════════════════ */
export default function OrganizacjaSection() {
  const [tab, setTab] = useState<'moja' | 'grupa'>('moja');

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-2 bg-white rounded-2xl border border-slate-100 p-2 shadow-sm">
        {([
          { id: 'moja',  icon: Building2,  label: 'Moja firma' },
          { id: 'grupa', icon: GitBranch, label: 'Struktura grupy' },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 flex-1 justify-center py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              tab === t.id ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-indigo-600'
            }`}
          >
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'moja'  && <MojaFirmaTab />}
      {tab === 'grupa' && <StrukturaGrupyTab />}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   TAB 1 — Moja firma (profil prawny aktywnej spółki)
   ════════════════════════════════════════════════════════════════ */
function MojaFirmaTab() {
  const { currentCompany, updateCompany } = useCompany();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [nipLoading, setNipLoading] = useState(false);
  const [pkdInput, setPkdInput] = useState('');
  const logoRef = useRef<HTMLInputElement>(null);

  const blank = {
    name: '', nip: '', regon: '', krs: '', phone: '', email: '', website: '',
    industry: '', industries: [] as string[], pkd: [] as string[], logoUrl: '',
    address: { street: '', city: '', zip: '', country: 'PL' },
    groupRelationType: 'standalone' as GroupRelationType,
  };
  const [form, setForm] = useState(blank);

  useEffect(() => {
    if (!currentCompany) return;
    const c = currentCompany as any;
    setForm({
      name:             c.name ?? '',
      nip:              c.nip ?? '',
      regon:            c.regon ?? '',
      krs:              c.krs ?? '',
      phone:            c.phone ?? '',
      email:            c.email ?? '',
      website:          c.website ?? '',
      industry:         c.industry ?? '',
      industries:       c.industries ?? [],
      pkd:              c.pkd ?? [],
      logoUrl:          c.logoUrl ?? '',
      address:          c.address ?? { street: '', city: '', zip: '', country: 'PL' },
      groupRelationType: c.groupRelationType ?? 'standalone',
    });
  }, [currentCompany?.id]);

  const fetchFromGUS = async () => {
    if (form.nip.length < 10) return;
    setNipLoading(true); setError('');
    try {
      const data = await fetchCompanyByNip(form.nip.replace(/\D/g, ''));
      if (data) {
        setForm(f => ({
          ...f,
          name:  data.name  || f.name,
          regon: data.regon || f.regon,
          krs:   data.krs   || f.krs,
          address: {
            street:  data.street || f.address.street,
            city:    data.city   || f.address.city,
            zip:     data.zip    || f.address.zip,
            country: 'PL',
          },
        }));
        setSuccess('Dane pobrane z rejestru MF.');
      } else {
        setError('Brak wyników dla podanego NIP w rejestrze MF.');
      }
    } finally { setNipLoading(false); }
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
      setSuccess('Logo zaktualizowane.');
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  const handleSave = async () => {
    if (!currentCompany || !form.name.trim()) { setError('Nazwa jest wymagana.'); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      await updateCompany(currentCompany.id, {
        name: form.name, nip: form.nip || undefined, regon: form.regon || undefined,
        krs: form.krs || undefined, phone: form.phone || undefined,
        email: form.email || undefined, website: form.website || undefined,
        industry: form.industry || undefined,
        industries: form.industries.length ? form.industries : undefined,
        pkd: form.pkd.length ? form.pkd : undefined,
        logoUrl: form.logoUrl || undefined,
        groupRelationType: form.groupRelationType,
        address: {
          street: form.address.street || undefined, city: form.address.city || undefined,
          zip: form.address.zip || undefined, country: form.address.country || 'PL',
        },
      } as any);
      setSuccess('Profil zapisany.');
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  return (
    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-8 border-b border-slate-50 flex items-center gap-4">
        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center"><Building2 size={18} /></div>
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Moja firma</h3>
          <p className="text-[9px] text-slate-400 font-bold mt-0.5">Dane prawne i rejestrowe aktywnej jednostki organizacyjnej</p>
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* Logo + typ relacji */}
        <div className="flex items-start gap-6 pb-6 border-b border-slate-50">
          <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-slate-100 flex items-center justify-center bg-indigo-600 text-white font-black text-2xl italic shrink-0">
            {form.logoUrl
              ? <img src={form.logoUrl} alt="logo" className="w-full h-full object-cover" />
              : (form.name || 'C').charAt(0)
            }
          </div>
          <div className="flex-1 space-y-3">
            <button onClick={() => logoRef.current?.click()}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-widest px-5 py-3 rounded-xl transition-all">
              <Upload size={13} /> Wgraj logo
            </button>
            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Typ jednostki w grupie kapitałowej</label>
              <select
                value={form.groupRelationType}
                onChange={e => setForm(f => ({ ...f, groupRelationType: e.target.value as GroupRelationType }))}
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black text-slate-900 focus:outline-none focus:border-indigo-400 w-full max-w-xs"
              >
                {(Object.entries(RELATION_META) as [GroupRelationType, typeof RELATION_META.standalone][]).map(([k, v]) => (
                  <option key={k} value={k}>{v.label} — {v.desc}</option>
                ))}
              </select>
              {form.groupRelationType !== 'standalone' && (
                <p className="text-[8px] text-indigo-600 font-bold mt-1">
                  {RELATION_META[form.groupRelationType].desc}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Dane rejestrowe */}
        <div>
          <SectionLabel>Dane rejestrowe</SectionLabel>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <FLabel>Nazwa firmy *</FLabel>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className={INPUT} />
            </div>
            {/* NIP + auto-fill */}
            <div>
              <FLabel>NIP</FLabel>
              <div className="flex gap-2">
                <input value={form.nip} onChange={e => setForm(f => ({ ...f, nip: e.target.value.replace(/\D/g, '') }))}
                  placeholder="1234567890" maxLength={10}
                  className={`flex-1 ${INPUT_BASE} font-mono`} />
                <button onClick={fetchFromGUS} disabled={nipLoading || form.nip.length < 10}
                  title="Pobierz dane z rejestru MF (Biała Lista)"
                  className="w-11 h-11 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center disabled:opacity-40 transition-all shrink-0">
                  {nipLoading ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                </button>
              </div>
              <p className="text-[8px] text-slate-400 font-bold mt-1">Kliknij strzałkę → Biała Lista MF / GUS BIR</p>
            </div>
            <div>
              <FLabel>REGON</FLabel>
              <input value={form.regon} onChange={e => setForm(f => ({ ...f, regon: e.target.value }))}
                placeholder="987654321" className={`${INPUT_BASE} font-mono`} />
            </div>
            <div>
              <FLabel>KRS</FLabel>
              <input value={form.krs} onChange={e => setForm(f => ({ ...f, krs: e.target.value }))}
                placeholder="0000000000" className={`${INPUT_BASE} font-mono`} />
              <p className="text-[8px] text-slate-400 font-bold mt-1">Wymagany przy zgłoszeniu UBO i e-Sprawozdaniu XML</p>
            </div>
          </div>
        </div>

        {/* PKD */}
        <div className="border-t border-slate-50 pt-6">
          <div className="flex items-center gap-2 mb-1">
            <SectionLabel>Kody PKD</SectionLabel>
            <div className="group relative">
              <Info size={12} className="text-slate-300 cursor-help" />
              <div className="absolute left-5 top-0 z-10 hidden group-hover:block w-72 bg-slate-900 text-white text-[9px] font-bold p-3 rounded-xl shadow-xl">
                AI weryfikuje zgodność wystawianych faktur z kodami PKD. Firma budowlana bez PKD medycznego nie powinna wystawiać faktur za usługi medyczne — system będzie ostrzegał i żądał potwierdzenia.
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {form.pkd.map(code => (
              <span key={code} className="flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-xl text-[10px] font-black">
                {code}
                <button onClick={() => setForm(f => ({ ...f, pkd: f.pkd.filter(p => p !== code) }))} className="hover:text-red-500"><X size={10} /></button>
              </span>
            ))}
            {form.pkd.length === 0 && <span className="text-[9px] text-slate-400 font-bold">Brak kodów PKD — AI compliance nieaktywny</span>}
          </div>
          <div className="flex gap-2">
            <input value={pkdInput} onChange={e => setPkdInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && pkdInput.trim()) { setForm(f => ({ ...f, pkd: [...new Set([...f.pkd, pkdInput.trim().toUpperCase()])] })); setPkdInput(''); } }}
              placeholder="np. 41.20.Z — Enter aby dodać"
              className={`${INPUT_BASE} font-mono w-52`} />
            <button onClick={() => { if (pkdInput.trim()) { setForm(f => ({ ...f, pkd: [...new Set([...f.pkd, pkdInput.trim().toUpperCase()])] })); setPkdInput(''); } }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-500 transition-all">
              <Plus size={13} />
            </button>
          </div>
        </div>

        {/* Branże */}
        <div className="border-t border-slate-50 pt-6">
          <SectionLabel>Branże działalności</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {INDUSTRIES.map(ind => (
              <button key={ind}
                onClick={() => setForm(f => ({
                  ...f,
                  industries: f.industries.includes(ind) ? f.industries.filter(i => i !== ind) : [...f.industries, ind],
                }))}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                  form.industries.includes(ind) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-indigo-200'
                }`}>
                {ind}
              </button>
            ))}
          </div>
        </div>

        {/* Kontakt */}
        <div className="border-t border-slate-50 pt-6">
          <SectionLabel>Dane kontaktowe</SectionLabel>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div><FLabel>Email</FLabel><input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="biuro@firma.pl" className={INPUT} /></div>
            <div><FLabel>Telefon</FLabel><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+48 22 123 45 67" className={INPUT} /></div>
            <div className="md:col-span-2"><FLabel>Strona www</FLabel><input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://firma.pl" className={INPUT} /></div>
          </div>
        </div>

        {/* Adres */}
        <div className="border-t border-slate-50 pt-6">
          <SectionLabel>Adres siedziby</SectionLabel>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <FLabel>Ulica i numer</FLabel>
              <input value={form.address.street} onChange={e => setForm(f => ({ ...f, address: { ...f.address, street: e.target.value } }))} placeholder="ul. Puławska 14" className={INPUT} />
            </div>
            <div><FLabel>Kod pocztowy</FLabel><input value={form.address.zip} onChange={e => setForm(f => ({ ...f, address: { ...f.address, zip: e.target.value } }))} placeholder="02-512" className={`${INPUT_BASE} font-mono`} /></div>
            <div><FLabel>Miasto</FLabel><input value={form.address.city} onChange={e => setForm(f => ({ ...f, address: { ...f.address, city: e.target.value } }))} placeholder="Warszawa" className={INPUT} /></div>
          </div>
        </div>

        {error   && <Msg type="error">{error}</Msg>}
        {success && <Msg type="ok">{success}</Msg>}

        <div className="pt-4 border-t border-slate-50">
          <button onClick={handleSave} disabled={saving}
            className="bg-slate-900 hover:bg-indigo-600 disabled:opacity-50 text-white font-black text-[10px] uppercase tracking-widest px-8 py-4 rounded-2xl transition-all shadow-xl flex items-center gap-2">
            <CheckCircle2 size={14} /> {saving ? 'Zapisuję...' : 'Zapisz profil firmy'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   TAB 2 — Struktura grupy (zarządzanie powiązaniami)
   ════════════════════════════════════════════════════════════════ */
function StrukturaGrupyTab() {
  const { availableCompanies, currentCompany, switchCompany, createCompany, updateCompany, deactivateCompany, loadingCompanies } = useCompany();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CompanyInput & { groupRelationType?: GroupRelationType; parentCompanyId?: string }>({
    name: '', nip: '', regon: '', industry: '',
    address: { street: '', city: '', zip: '', country: 'PL' },
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDeactivate, setConfirmDeactivate] = useState<string | null>(null);

  const reset = () => { setForm({ name: '', nip: '', regon: '', industry: '', address: { street: '', city: '', zip: '', country: 'PL' } }); setEditId(null); setShowForm(false); setError(''); };

  const openEdit = (c: Company) => {
    setForm({ name: c.name, nip: c.nip ?? '', regon: c.regon ?? '', industry: c.industry ?? '',
      address: c.address ?? { street: '', city: '', zip: '', country: 'PL' },
      groupRelationType: (c as any).groupRelationType ?? 'standalone',
      parentCompanyId: (c as any).parentCompanyId ?? '',
    });
    setEditId(c.id); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Nazwa jest wymagana.'); return; }
    setSaving(true); setError('');
    try {
      const payload = { name: form.name.trim(), nip: form.nip?.trim() || undefined, regon: form.regon?.trim() || undefined,
        industry: form.industry?.trim() || undefined, groupRelationType: form.groupRelationType ?? 'standalone',
        parentCompanyId: form.parentCompanyId?.trim() || undefined,
        address: { street: form.address?.street?.trim() || undefined, city: form.address?.city?.trim() || undefined,
          zip: form.address?.zip?.trim() || undefined, country: 'PL' },
      };
      editId ? await updateCompany(editId, payload as any) : await createCompany(payload as any);
      reset();
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  // Zbuduj drzewko: parent → children
  const parents = availableCompanies.filter(c => !((c as any).parentCompanyId));
  const getChildren = (parentId: string) => availableCompanies.filter(c => (c as any).parentCompanyId === parentId);

  const currentRelType = ((currentCompany as any)?.groupRelationType ?? 'standalone') as GroupRelationType;
  const isSingleCompany = availableCompanies.length === 1 && currentRelType === 'standalone';

  if (loadingCompanies) return <div className="py-20 text-center text-slate-400 text-sm font-bold">Ładowanie...</div>;

  return (
    <div className="space-y-5">
      {/* Typ struktury — info box */}
      <div className={`rounded-2xl border p-5 flex items-start gap-4 ${isSingleCompany ? 'bg-slate-50 border-slate-200' : 'bg-indigo-50 border-indigo-200'}`}>
        <GitBranch size={18} className={isSingleCompany ? 'text-slate-400 shrink-0 mt-0.5' : 'text-indigo-500 shrink-0 mt-0.5'} />
        <div>
          <p className={`text-xs font-black uppercase tracking-widest ${isSingleCompany ? 'text-slate-700' : 'text-indigo-700'}`}>
            {isSingleCompany ? 'Struktura: Samodzielna spółka' : `Struktura: Grupa kapitałowa (${availableCompanies.length} podmiotów)`}
          </p>
          <p className="text-[9px] font-bold mt-1 text-slate-500">
            {isSingleCompany
              ? 'Działasz jako jeden podmiot prawny. Możesz dodać powiązane spółki aby zarządzać grupą kapitałową z jednego miejsca.'
              : 'Zarządzasz grupą firm. Możesz przypisywać zasoby, refakturować koszty i prowadzić skonsolidowane raporty między podmiotami.'
            }
          </p>
          {!isSingleCompany && (
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(RELATION_META).filter(([k]) => k !== 'standalone').map(([k, v]) => {
                const count = availableCompanies.filter(c => (c as any).groupRelationType === k).length;
                if (!count) return null;
                return <span key={k} className={`text-[8px] font-black text-white px-2 py-0.5 rounded-full ${v.color}`}>{v.label}: {count}</span>;
              })}
            </div>
          )}
        </div>
      </div>

      {/* Nagłówek listy */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center"><Building2 size={18} /></div>
            <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Podmioty w grupie</h3>
          </div>
          {!showForm && (
            <button onClick={() => { reset(); setShowForm(true); }}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-widest px-5 py-3 rounded-2xl transition-all">
              <Plus size={13} /> Dodaj podmiot
            </button>
          )}
        </div>

        <div className="p-8 space-y-3">
          {/* Tree view */}
          {parents.map(parent => (
            <div key={parent.id} className="space-y-2">
              <CompanyRow
                c={parent}
                isActive={parent.id === currentCompany?.id}
                onSwitch={() => switchCompany(parent.id)}
                onEdit={() => openEdit(parent)}
                onDelete={availableCompanies.length > 1 && parent.id !== currentCompany?.id ? () => setConfirmDeactivate(parent.id) : undefined}
                confirmDelete={confirmDeactivate === parent.id}
                onConfirmDelete={async () => { await deactivateCompany(parent.id); setConfirmDeactivate(null); }}
                onCancelDelete={() => setConfirmDeactivate(null)}
                isParent={getChildren(parent.id).length > 0}
              />
              {/* Children */}
              {getChildren(parent.id).map(child => (
                <div key={child.id} className="ml-8 pl-4 border-l-2 border-indigo-100">
                  <CompanyRow
                    c={child}
                    isActive={child.id === currentCompany?.id}
                    onSwitch={() => switchCompany(child.id)}
                    onEdit={() => openEdit(child)}
                    onDelete={child.id !== currentCompany?.id ? () => setConfirmDeactivate(child.id) : undefined}
                    confirmDelete={confirmDeactivate === child.id}
                    onConfirmDelete={async () => { await deactivateCompany(child.id); setConfirmDeactivate(null); }}
                    onCancelDelete={() => setConfirmDeactivate(null)}
                    isChild
                  />
                </div>
              ))}
            </div>
          ))}

          {availableCompanies.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-sm font-bold">Brak podmiotów. Dodaj pierwszy.</div>
          )}

          {/* Form dodawania / edycji */}
          {showForm && (
            <div className="mt-4 p-6 bg-indigo-50 border border-indigo-100 rounded-2xl space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">{editId ? 'Edytuj podmiot' : 'Nowy podmiot'}</span>
                <button onClick={reset}><X size={16} className="text-slate-400 hover:text-slate-600" /></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2"><FLabel>Nazwa *</FLabel>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Alfa Sp. z o.o." className={INPUT_FORM} />
                </div>
                <div><FLabel>NIP</FLabel>
                  <input value={form.nip} onChange={e => setForm(f => ({ ...f, nip: e.target.value }))} placeholder="1234567890" className={`${INPUT_FORM_BASE} font-mono`} />
                </div>
                <div><FLabel>REGON</FLabel>
                  <input value={form.regon} onChange={e => setForm(f => ({ ...f, regon: e.target.value }))} placeholder="987654321" className={`${INPUT_FORM_BASE} font-mono`} />
                </div>
                <div className="md:col-span-2">
                  <FLabel>Typ relacji w grupie</FLabel>
                  <select value={(form as any).groupRelationType ?? 'standalone'}
                    onChange={e => setForm(f => ({ ...f, groupRelationType: e.target.value as GroupRelationType }))}
                    className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-3 text-sm font-black text-slate-900 focus:outline-none">
                    {(Object.entries(RELATION_META) as [GroupRelationType, typeof RELATION_META.standalone][]).map(([k, v]) => (
                      <option key={k} value={k}>{v.label} — {v.desc}</option>
                    ))}
                  </select>
                </div>
                {(form as any).groupRelationType && (form as any).groupRelationType !== 'standalone' && (form as any).groupRelationType !== 'parent' && (
                  <div className="md:col-span-2">
                    <FLabel>Podmiot nadrzędny (ID firmy matki)</FLabel>
                    <select value={(form as any).parentCompanyId ?? ''}
                      onChange={e => setForm(f => ({ ...f, parentCompanyId: e.target.value }))}
                      className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-3 text-sm font-black text-slate-900 focus:outline-none">
                      <option value="">— brak —</option>
                      {availableCompanies
                        .filter(c => [(form as any).groupRelationType === 'subsidiary' && 'parent', 'standalone', 'parent'].includes((c as any).groupRelationType ?? 'standalone'))
                        .map(c => <option key={c.id} value={c.id}>{c.name} {c.nip ? `(NIP: ${c.nip})` : ''}</option>)
                      }
                    </select>
                  </div>
                )}
                <div className="md:col-span-2"><FLabel>Adres siedziby</FLabel>
                  <input value={form.address?.street ?? ''} onChange={e => setForm(f => ({ ...f, address: { ...f.address, street: e.target.value } }))} placeholder="ul. Puławska 14, 02-512 Warszawa" className={INPUT_FORM} />
                </div>
              </div>

              {error && <Msg type="error">{error}</Msg>}

              <div className="flex gap-3">
                <button disabled={saving} onClick={handleSave}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-xl transition-all">
                  <CheckCircle2 size={13} /> {saving ? 'Zapisuję...' : editId ? 'Zaktualizuj' : 'Dodaj'}
                </button>
                <button onClick={reset} className="text-slate-500 font-black text-[10px] uppercase tracking-widest px-4">Anuluj</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Legenda typów relacji */}
      <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Typy relacji — podstawa prawna</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {(Object.entries(RELATION_META) as [GroupRelationType, typeof RELATION_META.standalone][]).map(([k, v]) => (
            <div key={k} className="flex items-start gap-2">
              <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${v.color}`} />
              <div>
                <span className="text-[9px] font-black text-slate-700">{v.label}</span>
                <span className="text-[8px] text-slate-400 font-bold ml-2">{v.desc}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[8px] text-slate-400 font-bold mt-3">
          Refakturowanie cross-company (UC-CC-04), pożyczki wewnątrzgrupowe (UC-CC-10) i skonsolidowane raporty są dostępne wyłącznie dla podmiotów w tej samej grupie.
        </p>
      </div>
    </div>
  );
}

/* ── CompanyRow ── */
function CompanyRow({ c, isActive, onSwitch, onEdit, onDelete, confirmDelete, onConfirmDelete, onCancelDelete, isParent, isChild }: {
  c: Company; isActive: boolean;
  onSwitch: () => void; onEdit: () => void;
  onDelete?: () => void; confirmDelete?: boolean;
  onConfirmDelete?: () => void; onCancelDelete?: () => void;
  isParent?: boolean; isChild?: boolean;
}) {
  const relType = ((c as any).groupRelationType ?? 'standalone') as GroupRelationType;
  return (
    <div className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isActive ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100 hover:bg-white hover:shadow-md'}`}>
      <div className="flex items-center gap-3">
        {isChild && <ChevronRight size={12} className="text-indigo-300 shrink-0" />}
        <button onClick={onSwitch}
          className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-xs italic transition-all ${isActive ? 'bg-indigo-600' : 'bg-slate-300 hover:bg-indigo-500'}`}>
          {c.name.charAt(0).toUpperCase()}
        </button>
        <div>
          <div className="font-black text-slate-900 text-sm italic flex items-center gap-2 flex-wrap">
            {c.name}
            {isActive && <span className="text-[8px] bg-indigo-600 text-white px-2 py-0.5 rounded-full uppercase tracking-widest font-black">Aktywna</span>}
            <Badge type={relType} />
            {isParent && <span className="text-[8px] bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full uppercase tracking-widest font-black">↳ ma zależne</span>}
          </div>
          <div className="text-[9px] text-slate-400 font-bold mt-0.5">
            {[c.nip && `NIP: ${c.nip}`, (c as any).krs && `KRS: ${(c as any).krs}`, c.address?.city].filter(Boolean).join(' · ')}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onEdit} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 flex items-center justify-center transition-all">
          <Pencil size={12} />
        </button>
        {onDelete && (confirmDelete ? (
          <div className="flex items-center gap-1">
            <button onClick={onConfirmDelete} className="text-[9px] font-black text-red-600 hover:text-red-700 px-2">Usuń</button>
            <button onClick={onCancelDelete} className="text-[9px] font-black text-slate-400">Anuluj</button>
          </div>
        ) : (
          <button onClick={onDelete} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-red-100 text-slate-300 hover:text-red-500 flex items-center justify-center transition-all">
            <Trash2 size={12} />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── micro helpers ── */
const INPUT_BASE = 'w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-black text-slate-900 focus:outline-none focus:border-indigo-400 transition-colors';
const INPUT = INPUT_BASE;
const INPUT_FORM_BASE = 'w-full bg-white border border-indigo-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-indigo-400';
const INPUT_FORM = `${INPUT_FORM_BASE} font-black`;

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">{children}</div>;
}
function FLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{children}</label>;
}
function Msg({ type, children }: { type: 'error' | 'ok'; children: React.ReactNode }) {
  return (
    <p className={`flex items-center gap-2 text-xs font-bold ${type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
      {type === 'error' ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />} {children}
    </p>
  );
}
