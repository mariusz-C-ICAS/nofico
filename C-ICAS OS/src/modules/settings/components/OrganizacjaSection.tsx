/**
 * OrganizacjaSection.tsx
 * Scalona sekcja: Profil Firmy + Struktura Grupy
 *
 * Wzorce biznesowe wg dokumentacji:
 *  - Standalone   : JDG / Sp. z o.o. bez powiązań grupowych
 *  - Holding      : spółka matka posiadająca udziały w zależnych
 *  - Subsidiary   : spółka zależna w holdingu (art. 4 §1 pkt 4 KSH)
 *  - Associated   : spółka stowarzyszona (art. 4 §1 pkt 5 KSH) ≥20% głosów
 *  - Joint Venture: wspólne przedsięwzięcie dwóch lub więcej podmiotów
 *  - Branch       : oddział tej samej osoby prawnej (art. 5 ustawy o swobodzie dz.g.)
 *
 * Use-cases z docs: UC-CC-04 (refakturowanie), UC-CC-10 (pożyczki wewnątrzgrupowe),
 * UC-TEN-07 (fuzja), Art. 210 KSH (lock dostępu).
 */
import React, { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Plus, Pencil, Trash2, CheckCircle2, X, AlertTriangle,
  RefreshCw, Upload, GitBranch, Info, ChevronDown, ChevronRight, Search, Palette,
  ArrowRight, ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { evaluateCompanyCompleteness, syncCompanyTask } from '../../../services/systemTasks';

const BrandingAdmin = lazy(() => import('../../admin/BrandingAdmin'));
import { useCompany, Company, CompanyInput } from '../../../core/auth/CompanyContext';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../../shared/lib/firebase';
import { fetchCompanyByNip, createTenantWithCompany } from '../../onboarding/onboardingService';
import { checkTenantLicense, activateTrial, type LicenseStatus } from '../../../services/licenseService';

/* ── typy ── */
type GroupRelationType = 'standalone' | 'parent' | 'subsidiary' | 'branch' | 'associated' | 'joint_venture' | 'conglomerate';

const RELATION_META: Record<GroupRelationType, { label: string; desc: string; color: string }> = {
  standalone:   { label: 'Niezależna',              desc: 'Brak powiązań grupowych',                                                           color: 'bg-slate-500' },
  parent:       { label: 'Organizacja nadrzędna',   desc: 'Podmiot sprawujący kontrolę — spółka, fundacja rodzinna, stowarzyszenie (art. 4 §1 pkt 4 KSH)', color: 'bg-violet-600' },
  subsidiary:   { label: 'Jednostka zależna',       desc: 'Podmiot kontrolowany przez organizację nadrzędną (art. 4 §1 pkt 4 KSH)',            color: 'bg-indigo-500' },
  branch:       { label: 'Oddział',                 desc: 'Wyodrębniony organizacyjnie oddział tej samej osoby prawnej',                       color: 'bg-teal-600' },
  associated:   { label: 'Jednostka stowarzyszona', desc: '≥20% głosów, brak kontroli (art. 4 §1 pkt 5 KSH)',                                 color: 'bg-cyan-600' },
  joint_venture:{ label: 'Joint Venture',           desc: 'Wspólne przedsięwzięcie dwóch lub więcej podmiotów',                                color: 'bg-orange-500' },
  conglomerate: { label: 'Konglomerat',             desc: 'Wielobranżowa grupa kapitałowa — pojęcie ekonomiczne, brak def. ustawowej w KSH',   color: 'bg-rose-600' },
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
  const [tab, setTab] = useState<'moja' | 'grupa' | 'branding'>('moja');

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-2 bg-white rounded-2xl border border-slate-100 p-2 shadow-sm">
        {([
          { id: 'moja',     icon: Building2, label: 'Moja firma' },
          { id: 'grupa',    icon: GitBranch, label: 'Struktura grupy' },
          { id: 'branding', icon: Palette,   label: 'Branding' },
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

      {tab === 'moja'     && <MojaFirmaTab />}
      {tab === 'grupa'    && <StrukturaGrupyTab />}
      {tab === 'branding' && (
        <Suspense fallback={<div className="py-12 text-center text-slate-400 text-sm font-bold">Ładowanie...</div>}>
          <BrandingAdmin />
        </Suspense>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   TAB 1 — Moja firma (profil prawny aktywnej spółki)
   ════════════════════════════════════════════════════════════════ */
function MojaFirmaTab() {
  const { currentCompany, updateCompany } = useCompany();
  const { activeTenantId } = useAuth() as any;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [completeness, setCompleteness] = useState<{ pct: number; missing: string[] } | null>(null);
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
    const { completeness: pct, missingFields: missing } = evaluateCompanyCompleteness(currentCompany);
    setCompleteness({ pct, missing });
  }, [currentCompany?.id]);

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
    setNipLoading(true); setError(''); setSuccess('');
    try {
      const data = await fetchCompanyByNip(form.nip.replace(/\D/g, ''));
      if (data) {
        setForm(f => ({
          ...f,
          name:  data.name  || f.name,
          regon: data.regon || f.regon,
          krs:   data.krs   || f.krs,
          pkd:   (data.pkd && data.pkd.length > 0) ? data.pkd : f.pkd,
          address: {
            street:  data.street || f.address.street,
            city:    data.city   || f.address.city,
            zip:     data.zip    || f.address.zip,
            country: 'PL',
          },
        }));
        const pkdMsg = (data.pkd && data.pkd.length > 0)
          ? `Dane pobrane z rejestru MF. PKD: ${data.pkd.join(', ')}`
          : 'Dane podstawowe pobrane. PKD nie jest dostępne w rejestrze MF — wprowadź kody ręcznie.';
        setSuccess(pkdMsg);
      } else {
        setError('Brak wyników dla podanego NIP w rejestrze MF.');
      }
    } catch (e: any) {
      setError('Błąd API MF: ' + (e?.message ?? 'Sprawdź połączenie lub spróbuj ponownie.'));
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
      const updatedCompany = stripUndefined({
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
        groupRelationType: form.groupRelationType,
        address: stripUndefined({
          street: form.address.street || undefined,
          city: form.address.city || undefined,
          zip: form.address.zip || undefined,
          country: form.address.country || 'PL',
        }),
      });
      await updateCompany(currentCompany.id, updatedCompany as any);
      const { completeness: pct, missingFields: missing } = evaluateCompanyCompleteness(updatedCompany);
      setCompleteness({ pct, missing });
      if (activeTenantId) syncCompanyTask(activeTenantId, updatedCompany);
      setSuccess('Profil zapisany.');
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  return (
    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-8 border-b border-slate-50 flex items-center gap-4">
        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center"><Building2 size={18} /></div>
        <div className="flex-1">
          <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Moja firma</h3>
          <p className="text-[9px] text-slate-400 font-bold mt-0.5">Dane prawne i rejestrowe aktywnej jednostki organizacyjnej</p>
        </div>
        {completeness && (
          <div className="text-right shrink-0">
            <div className={`text-xs font-black ${completeness.pct < 40 ? 'text-rose-600' : completeness.pct < 70 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {completeness.pct}% kompletny
            </div>
            <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${completeness.pct < 40 ? 'bg-rose-500' : completeness.pct < 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${completeness.pct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Banner C — completeness alert (always visible when incomplete) */}
      {completeness && completeness.pct < 100 && (
        <div className="mx-8 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
          <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Profil uzupełniony w {completeness.pct}%</p>
            <p className="text-[10px] text-amber-600 mt-0.5">
              Brakuje: {completeness.missing.slice(0, 4).join(', ')}{completeness.missing.length > 4 ? ` i ${completeness.missing.length - 4} więcej` : ''}. Uzupełnij aby odblokować pełną funkcjonalność.
            </p>
          </div>
          <div className="text-[9px] font-black text-amber-500 flex items-center gap-1 shrink-0">Zadanie w ToDo <ArrowRight size={10} /></div>
        </div>
      )}

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
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <SectionLabel>Kody PKD</SectionLabel>
              <div className="group relative">
                <Info size={12} className="text-slate-300 cursor-help" />
                <div className="absolute left-5 top-0 z-10 hidden group-hover:block w-72 bg-slate-900 text-white text-[9px] font-bold p-3 rounded-xl shadow-xl">
                  AI weryfikuje zgodność wystawianych faktur z kodami PKD. Firma budowlana bez PKD medycznego nie powinna wystawiać faktur za usługi medyczne — system będzie ostrzegał i żądał potwierdzenia.
                </div>
              </div>
            </div>
            {form.nip.length >= 10 && (
              <a href={`https://aplikacja.ceidg.gov.pl/ceidg/ceidg.public.ui/SearchAction.aspx?nip=${form.nip}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[8px] font-black text-indigo-500 hover:text-indigo-700 uppercase tracking-widest">
                <ExternalLink size={10} /> Szukaj w CEIDG
              </a>
            )}
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-3 text-[9px] text-amber-700 font-bold">
            Rejestr MF (Biała Lista) nie zawiera kodów PKD. Wpisz kody ręcznie na podstawie wpisu w CEIDG lub KRS.
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {form.pkd.map(code => (
              <span key={code} className="flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-xl text-[10px] font-black">
                {code}
                <button onClick={() => setForm(f => ({ ...f, pkd: f.pkd.filter(p => p !== code) }))} className="hover:text-red-500"><X size={10} /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={pkdInput} onChange={e => setPkdInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && pkdInput.trim()) { setForm(f => ({ ...f, pkd: [...new Set([...f.pkd, pkdInput.trim().toUpperCase()])] })); setPkdInput(''); } }}
              placeholder="np. 41.20.Z — Enter aby dodać"
              className={`${INPUT_BASE} font-mono flex-1`} />
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
type ManagementModel = 'internal' | 'separate_tenant';
type ExtendedForm = CompanyInput & {
  groupRelationType?: GroupRelationType;
  parentCompanyId?: string;
  krs?: string;
  entityType?: string;
  phone?: string;
  email?: string;
  website?: string;
  pkd?: string[];
  managementModel?: ManagementModel;
};

const EMPTY_FORM: ExtendedForm = {
  name: '', nip: '', regon: '', krs: '', entityType: 'spolka', industry: '',
  address: { street: '', city: '', zip: '', country: 'PL' },
  phone: '', email: '', website: '', pkd: [], managementModel: undefined,
  groupRelationType: 'standalone', parentCompanyId: '',
};

function StrukturaGrupyTab() {
  const { availableCompanies, currentCompany, switchCompany, createCompany, updateCompany, deactivateCompany, loadingCompanies } = useCompany();
  const [showForm, setShowForm] = useState(false);
  const [formStep, setFormStep] = useState<'model' | 'data'>('model');
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ExtendedForm>({ ...EMPTY_FORM });
  const { activeTenantId, user } = useAuth() as any;
  const navigate = useNavigate();
  const [pkdInput, setPkdInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [nipLoading, setNipLoading] = useState(false);
  const [error, setError] = useState('');
  const [nipMsg, setNipMsg] = useState('');
  const [confirmDeactivate, setConfirmDeactivate] = useState<string | null>(null);
  const [licenseModal, setLicenseModal] = useState<{ status: LicenseStatus } | null>(null);
  const [licenseChecking, setLicenseChecking] = useState(false);
  const [tenantCreated, setTenantCreated] = useState<string | null>(null);

  const isFR = form.entityType === 'fundacja_rodzinna';

  const fetchFromGUS = async () => {
    const nip = (form.nip ?? '').replace(/\D/g, '');
    if (nip.length < 10) return;
    setNipLoading(true); setNipMsg(''); setError('');
    try {
      const data = await fetchCompanyByNip(nip);
      if (data) {
        setForm(f => ({
          ...f,
          name:  data.name  || f.name,
          regon: data.regon || f.regon,
          krs:   data.krs   || f.krs,
          pkd:   (data.pkd && data.pkd.length > 0) ? data.pkd : f.pkd,
          address: {
            street:  data.street || f.address?.street || '',
            city:    data.city   || f.address?.city   || '',
            zip:     data.zip    || f.address?.zip    || '',
            country: 'PL',
          },
        }));
        const isJdg = !data.krs && !data.name?.includes('Sp.') && !data.name?.includes('S.A.');
        setNipMsg(isJdg
          ? `MF zwróciło: "${data.name}" (nazwa wg CEIDG — uzupełnij ręcznie pełną nazwę handlową). PKD niedostępne w MF — wpisz ręcznie.`
          : 'Dane uzupełnione z rejestru MF.');
      } else {
        setNipMsg('Brak danych w rejestrze MF — uzupełnij ręcznie.');
      }
    } catch (e: any) {
      setNipMsg('Błąd API MF: ' + (e?.message ?? 'Sprawdź połączenie lub spróbuj ponownie.'));
    } finally { setNipLoading(false); }
  };

  const reset = () => {
    setForm({ ...EMPTY_FORM });
    setEditId(null); setShowForm(false); setFormStep('model');
    setError(''); setNipMsg(''); setPkdInput('');
  };

  const openEdit = (c: Company) => {
    setForm({
      name: c.name,
      nip: c.nip ?? '',
      regon: c.regon ?? '',
      krs: (c as any).krs ?? '',
      entityType: (c as any).entityType ?? 'spolka',
      industry: c.industry ?? '',
      industries: c.industries ?? [],
      address: c.address ?? { street: '', city: '', zip: '', country: 'PL' },
      groupRelationType: (c as any).groupRelationType ?? 'standalone',
      parentCompanyId: c.parentCompanyId ?? '',
      phone: c.phone ?? '',
      email: c.email ?? '',
      website: c.website ?? '',
      pkd: c.pkd ?? [],
      managementModel: (c as any).managementModel ?? 'internal',
    });
    setEditId(c.id); setShowForm(true); setFormStep('data'); setNipMsg('');
  };

  // Check license before creating a separate tenant
  const handleModelSelect = async (model: ManagementModel) => {
    setForm(f => ({ ...f, managementModel: model }));
    if (model === 'separate_tenant') {
      setLicenseChecking(true);
      const status = await checkTenantLicense(activeTenantId);
      setLicenseChecking(false);
      if (!status.isValid) {
        setLicenseModal({ status });
        return;
      }
    }
    setFormStep('data');
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Nazwa jest wymagana.'); return; }
    setSaving(true); setError('');
    try {
      const payload = stripUndefined({
        name: form.name.trim(),
        nip: form.nip?.trim() || undefined,
        regon: form.regon?.trim() || undefined,
        krs: (!isFR && form.krs?.trim()) ? form.krs.trim() : undefined,
        entityType: form.entityType || 'spolka',
        industry: form.industry?.trim() || undefined,
        industries: (form as any).industries?.length ? (form as any).industries : undefined,
        groupRelationType: form.groupRelationType ?? 'standalone',
        parentCompanyId: form.parentCompanyId?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        email: form.email?.trim() || undefined,
        website: form.website?.trim() || undefined,
        pkd: (form.pkd && form.pkd.length > 0) ? form.pkd : undefined,
        managementModel: form.managementModel ?? 'internal',
        address: stripUndefined({
          street: form.address?.street?.trim() || undefined,
          city:   form.address?.city?.trim()   || undefined,
          zip:    form.address?.zip?.trim()     || undefined,
          country: 'PL',
        }),
      });

      if (!editId && form.managementModel === 'separate_tenant') {
        // Create a new tenant + company for this entity
        const result = await createTenantWithCompany({
          companyName: form.name.trim(),
          nip: form.nip?.trim() || '',
          industries: (form as any).industries ?? [],
          userId: user?.uid ?? '',
          userEmail: user?.email ?? '',
        });
        // Also link it in current tenant's group structure
        await createCompany({ ...payload, linkedTenantId: result.tenantId } as any);
        setTenantCreated(result.tenantId);
      } else {
        editId ? await updateCompany(editId, payload as any) : await createCompany(payload as any);
      }
      reset();
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  // Zbuduj drzewko: parent → children
  const parents = availableCompanies.filter(c => !((c as any).parentCompanyId));
  const getChildren = (parentId: string) => availableCompanies.filter(c => (c as any).parentCompanyId === parentId);

  const currentRelType = ((currentCompany as any)?.groupRelationType ?? 'standalone') as GroupRelationType;
  const isSingleCompany = availableCompanies.length === 1 && currentRelType === 'standalone';

  if (loadingCompanies) return <div className="py-20 text-center text-slate-400 text-sm font-bold">Ładowanie...</div>;

  /* ── Modal: sprawdzenie licencji ── */
  const LicenseModal = licenseModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full mx-4 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
            <AlertTriangle size={22} className="text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Licencja wymagana</h3>
            <p className="text-[9px] text-slate-500 font-bold mt-0.5">
              {licenseModal.status.reason === 'trial_expired'
                ? 'Twój okres próbny (14 dni) wygasł.'
                : 'Twoja licencja wygasła lub nie jest aktywna.'}
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-600 font-bold">
          Tworzenie osobnych tenantów dla podmiotów grupy wymaga aktywnej licencji. Wybierz opcję:
        </p>
        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={async () => {
              await activateTrial(activeTenantId);
              setLicenseModal(null);
              setFormStep('data');
            }}
            className="flex items-center gap-3 p-4 rounded-2xl border-2 border-indigo-200 bg-indigo-50 hover:border-indigo-400 hover:bg-white transition-all text-left">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
              <CheckCircle2 size={16} className="text-white" />
            </div>
            <div>
              <div className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Aktywuj trial 14 dni</div>
              <div className="text-[9px] text-slate-500 font-bold">Pełna funkcjonalność, bezpłatnie przez 14 dni.</div>
            </div>
          </button>
          <button
            onClick={() => { setLicenseModal(null); navigate('/settings/license'); }}
            className="flex items-center gap-3 p-4 rounded-2xl border-2 border-slate-200 hover:border-indigo-300 transition-all text-left bg-white">
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
              <ArrowRight size={16} className="text-slate-600" />
            </div>
            <div>
              <div className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Kup licencję</div>
              <div className="text-[9px] text-slate-500 font-bold">Przejdź do ustawień licencji i wybierz plan.</div>
            </div>
          </button>
        </div>
        <button onClick={() => setLicenseModal(null)} className="w-full text-slate-400 font-black text-[10px] uppercase tracking-widest py-2">Anuluj</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {LicenseModal}
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
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">
                    {editId ? 'Edytuj podmiot' : 'Nowy podmiot'}
                  </span>
                  {!editId && (
                    <div className="flex gap-1">
                      {(['model', 'data'] as const).map((s, i) => (
                        <span key={s} className={`w-5 h-1.5 rounded-full transition-all ${formStep === s || (i === 1 && formStep === 'data') ? 'bg-indigo-600' : 'bg-indigo-200'}`} />
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={reset}><X size={16} className="text-slate-400 hover:text-slate-600" /></button>
              </div>

              {/* KROK 1: Model zarządzania */}
              {formStep === 'model' && !editId && (
                <div className="space-y-4">
                  <p className="text-xs font-black text-slate-700">Jak chcesz zarządzać tym podmiotem?</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {([
                      {
                        model: 'internal' as ManagementModel,
                        title: 'Wewnętrznie (jeden tenant)',
                        desc: 'Wspólna baza pracowników, wspólne moduły. Podmiot jako jednostka organizacyjna (OU) w strukturze OM. Pracownicy mogą być zatrudnieni w wielu jednostkach jednocześnie.',
                        icon: '🏢',
                        when: 'Kiedy: wspólna kadra, wspólny HR, jedno centrum kosztów.',
                      },
                      {
                        model: 'separate_tenant' as ManagementModel,
                        title: 'Osobny tenant',
                        desc: 'Pełna izolacja danych. Własne role, własny HR, własne faktury. Możliwość przypisania tych samych osób (np. zarząd) do wielu tenantów jednocześnie z osobnymi uprawnieniami.',
                        icon: '🔒',
                        when: 'Kiedy: osobna spółka z własną kadrą, zewnętrzny partner (JV), pełna izolacja wymagana.',
                      },
                    ]).map(opt => (
                      <button key={opt.model} onClick={() => handleModelSelect(opt.model)} disabled={licenseChecking}
                        className="text-left p-5 rounded-2xl border-2 bg-white hover:border-indigo-400 hover:shadow-lg transition-all group border-slate-200">
                        <div className="text-2xl mb-2">{opt.icon}</div>
                        <div className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-2">{opt.title}</div>
                        <p className="text-[9px] text-slate-500 font-bold mb-3 leading-relaxed">{opt.desc}</p>
                        <p className="text-[8px] text-indigo-600 font-black uppercase tracking-widest">{opt.when}</p>
                      </button>
                    ))}
                  </div>
                  <button onClick={reset} className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Anuluj</button>
                </div>
              )}

              {/* KROK 2: Pełne dane podmiotu */}
              {(formStep === 'data' || editId) && (
                <div className="space-y-5">
                  {form.managementModel === 'separate_tenant' && !editId && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-[9px] text-amber-700 font-bold flex items-start gap-2">
                      <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                      Osobny tenant zostanie utworzony po zapisaniu. Właściciel konta otrzyma zaproszenie. Możesz teraz zdefiniować pełny profil organizacji.
                    </div>
                  )}

                  {/* Sekcja 1: Dane rejestrowe */}
                  <div>
                    <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-3">Dane rejestrowe</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="md:col-span-2">
                        <FLabel>Typ podmiotu prawnego</FLabel>
                        <select value={form.entityType ?? 'spolka'}
                          onChange={e => setForm(f => ({ ...f, entityType: e.target.value }))}
                          className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-3 text-sm font-black text-slate-900 focus:outline-none">
                          <option value="spolka">Spółka (KSH)</option>
                          <option value="jdg">Jednoosobowa działalność gospodarcza</option>
                          <option value="fundacja_rodzinna">Fundacja Rodzinna (Dz.U. 2023 poz. 326)</option>
                          <option value="fundacja">Fundacja / Stowarzyszenie</option>
                          <option value="spoldzielnia">Spółdzielnia</option>
                          <option value="inne">Inne</option>
                        </select>
                        {isFR && <p className="text-[9px] text-amber-600 font-bold mt-1 flex items-center gap-1"><AlertTriangle size={10} /> FR nie posiada KRS — wpisz REGON.</p>}
                      </div>
                      <div className="md:col-span-2">
                        <FLabel>Nazwa *</FLabel>
                        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Alfa Sp. z o.o." className={INPUT_FORM} />
                      </div>
                      <div>
                        <FLabel>NIP</FLabel>
                        <div className="flex gap-2">
                          <input value={form.nip ?? ''} onChange={e => setForm(f => ({ ...f, nip: e.target.value.replace(/\D/g, '') }))}
                            placeholder="1234567890" maxLength={10} className={`flex-1 ${INPUT_FORM_BASE} font-mono`} />
                          <button onClick={fetchFromGUS} disabled={nipLoading || (form.nip ?? '').replace(/\D/g,'').length < 10}
                            title="Pobierz z Białej Listy MF"
                            className="w-11 h-11 bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center disabled:opacity-40 transition-all shrink-0">
                            {nipLoading ? <RefreshCw size={13} className="animate-spin" /> : <Search size={13} />}
                          </button>
                        </div>
                        {nipMsg && <p className={`text-[9px] font-bold mt-1 ${nipMsg.includes('Brak') ? 'text-amber-600' : 'text-emerald-600'}`}>{nipMsg}</p>}
                        <p className="text-[8px] text-slate-300 font-bold mt-0.5">MF pobiera: nazwę, adres, REGON, KRS. PKD wpisz ręcznie.</p>
                      </div>
                      <div>
                        <FLabel>REGON</FLabel>
                        <input value={form.regon ?? ''} onChange={e => setForm(f => ({ ...f, regon: e.target.value }))} placeholder="987654321" className={`${INPUT_FORM_BASE} font-mono`} />
                      </div>
                      {!isFR && (
                        <div className="md:col-span-2">
                          <FLabel>KRS <span className="text-slate-300 font-normal text-[9px] normal-case">(opcjonalny dla JDG)</span></FLabel>
                          <input value={form.krs ?? ''} onChange={e => setForm(f => ({ ...f, krs: e.target.value }))} placeholder="0000000000" className={`${INPUT_FORM_BASE} font-mono`} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sekcja 2: Relacja w grupie */}
                  <div className="border-t border-indigo-100 pt-4">
                    <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-3">Relacja w grupie</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="md:col-span-2">
                        <FLabel>Typ relacji</FLabel>
                        <select value={form.groupRelationType ?? 'standalone'}
                          onChange={e => setForm(f => ({ ...f, groupRelationType: e.target.value as GroupRelationType }))}
                          className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-3 text-sm font-black text-slate-900 focus:outline-none">
                          {(Object.entries(RELATION_META) as [GroupRelationType, typeof RELATION_META.standalone][]).map(([k, v]) => (
                            <option key={k} value={k}>{v.label} — {v.desc}</option>
                          ))}
                        </select>
                      </div>
                      {(['subsidiary', 'branch', 'associated', 'joint_venture', 'conglomerate'] as GroupRelationType[]).includes(form.groupRelationType ?? 'standalone') && (
                        <div className="md:col-span-2">
                          <FLabel>Organizacja nadrzędna</FLabel>
                          <select value={form.parentCompanyId ?? ''}
                            onChange={e => setForm(f => ({ ...f, parentCompanyId: e.target.value }))}
                            className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-3 text-sm font-black text-slate-900 focus:outline-none">
                            <option value="">— brak —</option>
                            {availableCompanies
                              .filter(c => (['standalone', 'parent'] as GroupRelationType[]).includes((c as any).groupRelationType ?? 'standalone'))
                              .map(c => <option key={c.id} value={c.id}>{c.name}{c.nip ? ` (NIP: ${c.nip})` : ''}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sekcja 3: Kody PKD */}
                  <div className="border-t border-indigo-100 pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Kody PKD</p>
                      {(form.nip ?? '').length >= 10 && (
                        <a href={`https://aplikacja.ceidg.gov.pl/ceidg/ceidg.public.ui/SearchAction.aspx?nip=${form.nip}`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[8px] font-black text-indigo-500 hover:text-indigo-700">
                          <ExternalLink size={9} /> Szukaj w CEIDG
                        </a>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {(form.pkd ?? []).map(code => (
                        <span key={code} className="flex items-center gap-1 px-2.5 py-1 bg-white border border-indigo-200 text-indigo-700 rounded-lg text-[9px] font-black">
                          {code}
                          <button onClick={() => setForm(f => ({ ...f, pkd: (f.pkd ?? []).filter(p => p !== code) }))} className="hover:text-red-500"><X size={9} /></button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input value={pkdInput} onChange={e => setPkdInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && pkdInput.trim()) { setForm(f => ({ ...f, pkd: [...new Set([...(f.pkd ?? []), pkdInput.trim().toUpperCase()])] })); setPkdInput(''); } }}
                        placeholder="np. 41.20.Z — Enter aby dodać"
                        className={`${INPUT_FORM_BASE} font-mono flex-1`} />
                      <button onClick={() => { if (pkdInput.trim()) { setForm(f => ({ ...f, pkd: [...new Set([...(f.pkd ?? []), pkdInput.trim().toUpperCase()])] })); setPkdInput(''); } }}
                        className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-500">
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Sekcja 4: Kontakt */}
                  <div className="border-t border-indigo-100 pt-4">
                    <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-3">Dane kontaktowe</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div><FLabel>Telefon</FLabel>
                        <input value={form.phone ?? ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+48 22 123 45 67" className={INPUT_FORM} />
                      </div>
                      <div><FLabel>Email</FLabel>
                        <input value={form.email ?? ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="biuro@firma.pl" className={INPUT_FORM} />
                      </div>
                      <div className="md:col-span-2"><FLabel>Strona www</FLabel>
                        <input value={form.website ?? ''} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://firma.pl" className={INPUT_FORM} />
                      </div>
                    </div>
                  </div>

                  {/* Sekcja 5: Adres */}
                  <div className="border-t border-indigo-100 pt-4">
                    <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-3">Adres siedziby</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="md:col-span-2">
                        <FLabel>Ulica i numer</FLabel>
                        <input value={form.address?.street ?? ''} onChange={e => setForm(f => ({ ...f, address: { ...f.address, street: e.target.value } }))} placeholder="ul. Puławska 14" className={INPUT_FORM} />
                      </div>
                      <div><FLabel>Kod pocztowy</FLabel>
                        <input value={form.address?.zip ?? ''} onChange={e => setForm(f => ({ ...f, address: { ...f.address, zip: e.target.value } }))} placeholder="02-512" className={`${INPUT_FORM_BASE} font-mono`} />
                      </div>
                      <div><FLabel>Miasto</FLabel>
                        <input value={form.address?.city ?? ''} onChange={e => setForm(f => ({ ...f, address: { ...f.address, city: e.target.value } }))} placeholder="Warszawa" className={INPUT_FORM} />
                      </div>
                    </div>
                  </div>

                  {error && <Msg type="error">{error}</Msg>}

                  <div className="flex gap-3 pt-2">
                    {!editId && (
                      <button onClick={() => setFormStep('model')} className="text-slate-400 font-black text-[10px] uppercase tracking-widest px-4">← Wstecz</button>
                    )}
                    <button disabled={saving} onClick={handleSave}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-xl transition-all">
                      <CheckCircle2 size={13} /> {saving ? 'Zapisuję...' : editId ? 'Zaktualizuj' : 'Dodaj podmiot'}
                    </button>
                    <button onClick={reset} className="text-slate-500 font-black text-[10px] uppercase tracking-widest px-4">Anuluj</button>
                  </div>
                </div>
              )}
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

/* ── strip undefined values recursively before Firestore write ── */
function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, v && typeof v === 'object' && !Array.isArray(v) ? stripUndefined(v) : v])
  ) as Partial<T>;
}

/* ── micro helpers ── */
const INPUT_BASE = 'w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-black text-slate-900 placeholder:text-slate-300 placeholder:font-normal focus:outline-none focus:border-indigo-400 transition-colors';
const INPUT = INPUT_BASE;
const INPUT_FORM_BASE = 'w-full bg-white border border-indigo-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-300 placeholder:font-normal focus:outline-none focus:border-indigo-400';
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
