import React, { useState, useEffect } from 'react';
import { db } from '../../shared/lib/firebase';
import { collection, query, onSnapshot, doc, setDoc, updateDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { useAuth } from '../../shared/hooks/AuthContext';
import { Building2, Globe, Shield, Activity, Plus, Search, CheckCircle2, FlaskConical, Factory } from 'lucide-react';

export default function TenantAdminModule() {
  const { userData } = useAuth();
  const [tenants, setTenants] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newTenant, setNewTenant] = useState({ 
    name: '', 
    country: 'PL', 
    id: '',
    address: '',
    nip: '',
    regon: '',
    krs: '',
    pkd: '',
    legalForm: 'JDG',
    legalDocument: '',
    branches: [],
    showOnLanding: false,
    logoUrl: '',
    websiteUrl: ''
  });

  useEffect(() => {
    // Sprawdzamy czy parametr add=true jest w URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('add') === 'true') {
      setShowAdd(true);
      // Czyścimy URL bez przeładowania
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'tenants'), orderBy('createdAt', 'desc'));
    const un = onSnapshot(q, (snap) => {
      setTenants(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return un;
  }, []);

  const handleAdd = async () => {
    if (!newTenant.name) {
      alert('Podaj nazwę prawną organizacji');
      return;
    }
    if (!newTenant.id) {
      alert('Podaj identyfikator numeryczny ID');
      return;
    }
    try {
      const fullId = `${newTenant.country}-${newTenant.id.padStart(5, '0')}`;
      await setDoc(doc(db, 'tenants', fullId), {
        ...newTenant,
        id: fullId,
        createdAt: serverTimestamp(),
        status: 'active'
      });
      setShowAdd(false);
      setNewTenant({ 
        name: '', 
        country: 'PL', 
        id: '',
        address: '',
        nip: '',
        regon: '',
        krs: '',
        pkd: '',
        legalForm: 'JDG',
        legalDocument: '',
        branches: [],
        showOnLanding: false,
        logoUrl: '',
        websiteUrl: ''
      });
    } catch (err) {
      console.error(err);
    }
  };

  const formatDisplayId = (id: string) => {
    if (id.length < 4) return id;
    return id.substring(0, 4) + '...';
  };

  const handleToggleEnvironment = async (tenantId: string, currentIsProduction: boolean) => {
    const warning = currentIsProduction
      ? 'Przełączasz tenant do trybu TESTOWEGO. Zostanie odblokowane generowanie danych IDES i Hard Reset.\n\nKontynuować?'
      : 'Przełączasz tenant do trybu PRODUKCYJNEGO.\n\nGenerowanie danych IDES i Hard Reset zostaną ZABLOKOWANE.\nDane produkcyjne nie zostaną zmienione.\n\nKontynuować?';
    if (!window.confirm(warning)) return;
    try {
      await updateDoc(doc(db, 'tenants', tenantId), {
        isProduction: !currentIsProduction,
        environmentSwitchedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error('Błąd zmiany środowiska:', e);
      alert('Nie udało się zmienić środowiska. Sprawdź uprawnienia Firestore.');
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 flex flex-col md:flex-row justify-between items-center gap-6 shadow-sm">
        <div className="flex items-center gap-4">
           <div className="w-16 h-16 bg-slate-900 rounded-[1.5rem] flex items-center justify-center shadow-2xl">
              <Building2 size={32} className="text-white" />
           </div>
           <div>
              <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Organizacja Multi-Tenant</h2>
              <p className="text-sm text-slate-500 font-medium tracking-tight italic">Zarządzaj kontami firmowymi i ich izolacją terytorialną.</p>
           </div>
        </div>
        <button 
          onClick={() => setShowAdd(true)}
          className="bg-slate-900 text-white px-8 py-4 rounded-3xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl flex items-center gap-2"
        >
          <Plus size={18} /> Nowy Tenant
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {tenants.map(t => (
           <div key={t.id} className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                 <Building2 size={80} />
              </div>
              <div className="flex justify-between items-start mb-6">
                 <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${t.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-500'}`}>
                    {t.status}
                 </div>
                 <div className="flex items-center gap-1.5">
                    <Globe size={14} className="text-slate-300" />
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{t.country}</span>
                 </div>
              </div>
              <h3 className="text-2xl font-black text-slate-900 uppercase italic mb-2 truncate">{t.name}</h3>

              {/* Environment badge */}
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border mb-3 ${t.isProduction ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-violet-50 text-violet-700 border-violet-200'}`}>
                 {t.isProduction ? <><Factory size={12} /> Produkcja</> : <><FlaskConical size={12} /> Środowisko Testowe</>}
              </div>

              <div className="flex items-center gap-3 mt-2 pt-4 border-t border-slate-50">
                 <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">S-ID:</div>
                 <div className="bg-slate-100 px-3 py-1.5 rounded-xl font-mono text-[10px] font-black text-slate-600">
                    {formatDisplayId(t.id)}
                 </div>
              </div>
              <div className="mt-6 flex justify-between items-center">
                 <div className="flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 size={16} />
                    <span className="text-[9px] font-black uppercase tracking-widest underline underline-offset-4">Zweryfikowany</span>
                 </div>
                 <button
                    onClick={() => handleToggleEnvironment(t.id, !!t.isProduction)}
                    className={`text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border transition-colors ${t.isProduction ? 'border-violet-200 text-violet-600 hover:bg-violet-50' : 'border-rose-200 text-rose-600 hover:bg-rose-50'}`}
                 >
                    {t.isProduction ? '→ Tryb Testowy' : '→ Produkcja'}
                 </button>
              </div>
           </div>
         ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-[3rem] w-full max-w-5xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 border border-white/20 flex flex-col max-h-[90vh]">
              <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                 <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Inicjuj Firmę & Rejestry</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2">Pobieranie bazy CEIDG/KRS przez AI Wizard</p>
                 </div>
                 <button onClick={() => setShowAdd(false)} className="p-4 hover:bg-slate-200 rounded-[2rem] transition-colors"><Plus size={24} className="rotate-45" /></button>
              </div>
              <div className="p-8 space-y-6 overflow-y-auto bg-white flex-1 grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-6">
                   <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Identyfikator Podatkowy (NIP)</label>
                      <div className="flex gap-2">
                        <input value={newTenant.nip} onChange={e => setNewTenant({...newTenant, nip: e.target.value})} className="flex-1 bg-white border border-slate-200 rounded-2xl px-6 py-4 outline-none ring-blue-500 focus:ring-4 font-black text-slate-900" placeholder="np. 5250000000" />
                        <button 
                          onClick={async () => {
                            if (newTenant.nip.length < 10) {
                              alert('Podaj prawidłowy numer NIP (10 znaków bez myślników).');
                              return;
                            }
                            try {
                              const today = new Date().toISOString().split('T')[0];
                              const cleanNip = newTenant.nip.replace(/\D/g, '');
                              const res = await fetch(`https://wl-api.mf.gov.pl/api/search/nip/${cleanNip}?date=${today}`);
                              if (!res.ok) throw new Error(`Status ${res.status}`);
                              const json = await res.json();
                              if (json && json.result && json.result.subject) {
                                 const s = json.result.subject;
                                 setNewTenant(prev => ({
                                     ...prev, 
                                     name: s.name || prev.name, 
                                     address: s.workingAddress || s.residenceAddress || prev.address, 
                                     regon: s.regon || prev.regon, 
                                     krs: s.krs || prev.krs
                                 }));
                                 alert(`Biała Lista MF: Pobrano firmę ${s.name}.\n\nUwaga: MF nie udostępnia kodów PKD, API GUS wymaga zatwierdzonego Tokenu Użytkownika.`);
                              } else {
                                 alert('Nie znaleziono podmiotu na Białej Liście (KAS).');
                              }
                            } catch (e: any) {
                              alert('Błąd połączenia z API MF: ' + e.message);
                            }
                          }}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl px-6 font-black uppercase tracking-widest text-[10px] whitespace-nowrap transition-all shadow-md"
                        >
                          Weryfikuj MF API
                        </button>
                      </div>
                   </div>

                   <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Forma Prawna</label>
                      <select value={newTenant.legalForm} onChange={e => setNewTenant({...newTenant, legalForm: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none ring-blue-500 focus:ring-4 font-black italic text-slate-900">
                         <option value="JDG">JDG - Jednoosobowa Działalność</option>
                         <option value="NIEREJESTROWANA">Działalność Nierejestrowana</option>
                         <option value="SC">Spółka Cywilna (s.c.)</option>
                         <option value="SP_J">Spółka Jawna (sp. j.)</option>
                         <option value="SP_P">Spółka Partnerska (sp. p.)</option>
                         <option value="SP_K">Spółka Komandytowa (sp. k.)</option>
                         <option value="SKA">Spółka Komandytowo-Akcyjna (S.K.A.)</option>
                         <option value="SP_ZOO">Spółka z o.o. (sp. z o.o.)</option>
                         <option value="PSA">Prosta Spółka Akcyjna (P.S.A.)</option>
                         <option value="SA">Spółka Akcyjna (S.A.)</option>
                         <option value="FUNDACJA">Fundacja / Stowarzyszenie / SPZOZ</option>
                         <option value="SPOŁDZIELNIA">Spółdzielnia</option>
                         <option value="KONSORCJUM">Konsorcjum / Konglomerat / Grupa</option>
                      </select>
                   </div>
                   {(newTenant.legalForm !== 'JDG' && newTenant.legalForm !== 'NIEREJESTROWANA') && (
                      <div className="animate-in fade-in slide-in-from-top-2">
                         <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Akty Prawne / Umowa / Statut (Dla AI)</label>
                         <textarea value={newTenant.legalDocument} onChange={e => setNewTenant({...newTenant, legalDocument: e.target.value})} className="w-full bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4 outline-none ring-amber-500 focus:ring-4 font-medium text-xs text-amber-900 h-24 placeholder:text-amber-300" placeholder="Wklej kluczowe zapisy ze statutu, umowy spółki lub linki do zabezpieczonych zasobów. FieldTime AI użyje ich do walidacji procesów, np. limitów transakcyjnych dla zarządu lub konieczności uchwał." />
                      </div>
                   )}

                   <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Rejestry KRS i REGON</label>
                      <div className="flex gap-4">
                        <input value={newTenant.krs} onChange={e => setNewTenant({...newTenant, krs: e.target.value})} className="w-1/2 bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none ring-blue-500 focus:ring-4 font-black italic text-slate-900" placeholder="Numer KRS" />
                        <input value={newTenant.regon} onChange={e => setNewTenant({...newTenant, regon: e.target.value})} className="w-1/2 bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none ring-blue-500 focus:ring-4 font-black italic text-slate-900" placeholder="Numer REGON" />
                      </div>
                   </div>

                   <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Kody PKD (Zakres Działalności)</label>
                      <input value={newTenant.pkd} onChange={e => setNewTenant({...newTenant, pkd: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none ring-blue-500 focus:ring-4 text-sm font-semibold text-slate-900" placeholder="np. 41.20.Z (Roboty budowlane)" />
                      <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase">System weryfikuje zakres PKD przy wprowadzaniu faktur.</p>
                   </div>
                   
                 </div>

                 <div className="space-y-6">
                   <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Nazwa Prawna Organizacji</label>
                      <input value={newTenant.name} onChange={e => setNewTenant({...newTenant, name: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none ring-blue-500 focus:ring-4 font-black italic text-slate-900" placeholder="np. C-ICAS INC" />
                   </div>
                   <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Adres Siedziby</label>
                      <input value={newTenant.address} onChange={e => setNewTenant({...newTenant, address: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none ring-blue-500 focus:ring-4 text-sm font-semibold text-slate-900" placeholder="ul. Wiejska 1, 00-000 Warszawa" />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Kod Kraju</label>
                        <select value={newTenant.country} onChange={e => setNewTenant({...newTenant, country: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none ring-blue-500 focus:ring-4 font-black text-slate-900">
                           <option value="PL">PL - Polska</option>
                           <option value="DE">DE - Niemcy</option>
                           <option value="US">US - USA</option>
                        </select>
                     </div>
                     <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Numer ID (Numeryczny)</label>
                        <input type="number" value={newTenant.id} onChange={e => setNewTenant({...newTenant, id: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none ring-blue-500 focus:ring-4 font-black text-xl text-slate-900 tracking-widest" placeholder="10001" />
                        <p className="text-[9px] text-slate-300 font-bold mt-2 uppercase">Klucz: {newTenant.country}-{newTenant.id.padStart(5, '0')}</p>
                     </div>
                   </div>
                   <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 block flex justify-between items-center">
                         <span>Oddziały / Lokalizacje Zamiejscowe</span>
                         <button 
                           onClick={() => setNewTenant({...newTenant, branches: [...newTenant.branches, { name: '', address: '' }]})}
                           className="text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md"
                         >+ Dodaj</button>
                      </label>
                      {newTenant.branches.map((b, idx) => (
                        <div key={idx} className="flex gap-2 mb-2">
                           <input placeholder="Nazwa oddziału" value={b.name} onChange={e => { const nb = [...newTenant.branches]; nb[idx].name = e.target.value; setNewTenant({...newTenant, branches: nb});}} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs" />
                           <input placeholder="Adres" value={b.address} onChange={e => { const nb = [...newTenant.branches]; nb[idx].address = e.target.value; setNewTenant({...newTenant, branches: nb});}} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs" />
                        </div>
                      ))}
                      {newTenant.branches.length === 0 && <p className="text-xs text-slate-400 italic">Brak dodatkowych oddziałów.</p>}
                   </div>

                   <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mt-4 space-y-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                         <input type="checkbox" checked={newTenant.showOnLanding} onChange={e => setNewTenant({...newTenant, showOnLanding: e.target.checked})} className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                         <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Pokaż firmę na Landing Page</span>
                      </label>
                      {newTenant.showOnLanding && (
                         <div className="space-y-4 pt-2">
                            <div>
                               <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Logo URL</label>
                               <input value={newTenant.logoUrl} onChange={e => setNewTenant({...newTenant, logoUrl: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs" placeholder="https://.../logo.svg" />
                            </div>
                            <div>
                               <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Link do witryny (Website URL)</label>
                               <input value={newTenant.websiteUrl} onChange={e => setNewTenant({...newTenant, websiteUrl: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs" placeholder="https://example.com" />
                            </div>
                         </div>
                      )}
                   </div>
                 </div>
              </div>
              <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
                 <button onClick={() => setShowAdd(false)} className="px-8 py-4 rounded-[2rem] font-black uppercase tracking-widest transition-all text-slate-500 hover:bg-slate-200 text-[10px]">Anuluj</button>
                 <button onClick={handleAdd} className="bg-slate-900 text-white px-10 py-4 rounded-[2rem] font-black uppercase tracking-widest hover:bg-emerald-600 shadow-xl transition-all text-[10px]">Aktywuj Tenant Elite</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
