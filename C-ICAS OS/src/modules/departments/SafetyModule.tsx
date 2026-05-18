/**
 * Data: 2026-05-10
 * Utworzył: Agent AI
 * Opis: Generowany dynamicznie moduł BHP z kreatorem cyfrowych formularzy.
 */
import React, { useState, useEffect } from 'react';
import { toast } from '../../shared/utils/toast';
import { db } from '../../shared/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../shared/hooks/AuthContext';
import { useTenant } from '../../shared/hooks/useTenant';
import { ShieldAlert, ClipboardList, PlusCircle, CheckCircle, Smartphone, Globe, Plus, Trash2 } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../shared/lib/firestoreUtils';

interface FormField {
  id: string;
  type: string;
  label: Record<string, string>; // { pl: "Imię", en: "Name" }
  required: boolean;
}

interface AuditFormTemplate {
  id: string;
  tenantId: string;
  moduleType: string;
  languageMode: string;
  title: Record<string, string>;
  schema: FormField[];
  retentionDays: number;
  autoDestruct: boolean;
  isActive: boolean;
}

export default function SafetyModule() {
  const { memberships, isGlobalAdmin } = useAuth();
  const { activeTenantId } = useTenant();
  
  const [forms, setForms] = useState<AuditFormTemplate[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  
  const [languageMode, setLanguageMode] = useState('PL'); // PL, EN, UA, PL/EN, PL/UA
  const [moduleType, setModuleType] = useState('BHP'); // BHP, RODO
  
  const [retentionDays, setRetentionDays] = useState(1825);
  const [autoDestruct, setAutoDestruct] = useState(false);
  
  const [title, setTitle] = useState<Record<string, string>>({ PL: '', EN: '', UA: '' });
  const [fields, setFields] = useState<FormField[]>([]);

  // Check Permissions
  const userRole = activeTenantId ? memberships[activeTenantId]?.roleId : null;
  const canManageForms = isGlobalAdmin || ['owner', 'admin', 'safety_manager', 'compliance_manager'].includes(userRole || '');

  useEffect(() => {
    if (moduleType === 'BHP') setRetentionDays(1825);
    else if (moduleType === 'RODO') setRetentionDays(1825);
    else if (moduleType === 'QUALITY') setRetentionDays(1095);
  }, [moduleType]);

  useEffect(() => {
    if (!activeTenantId) return;
    const q = query(
      collection(db, 'auditFormTemplates'), 
      where('tenantId', '==', activeTenantId),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setForms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditFormTemplate)));
    }, err => handleFirestoreError(err, OperationType.GET, 'auditFormTemplates'));
    return unsubscribe;
  }, [activeTenantId]);

  const handleAddField = (type: string) => {
    setFields([...fields, { id: Date.now().toString(), type, label: { PL: '', EN: '', UA: '' }, required: false }]);
  };

  const handleRemoveField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };
  
  const handleLabelChange = (fieldId: string, lang: string, val: string) => {
    setFields(fields.map(f => f.id === fieldId ? { ...f, label: { ...f.label, [lang]: val } } : f));
  };

  const handleSaveForm = async () => {
    if (!title.PL.trim() && languageMode.includes('PL')) toast.warn("Polski tytuł jest wymagany."); return;
    if (!activeTenantId) return;

    try {
      await addDoc(collection(db, 'auditFormTemplates'), {
        tenantId: activeTenantId,
        moduleType,
        languageMode,
        title,
        schema: fields,
        retentionDays,
        autoDestruct,
        isActive: true,
        createdAt: serverTimestamp()
      });
      setIsCreating(false);
      setTitle({ PL: '', EN: '', UA: '' });
      setFields([]);
      setLanguageMode('PL');
      setAutoDestruct(false);
      setRetentionDays(1825);
    } catch(err) {
      handleFirestoreError(err, OperationType.CREATE, 'auditFormTemplates');
    }
  };

  const getRequiredLangs = () => {
    return languageMode.split('/');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-slate-100 pb-6 gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-200">
            <ShieldAlert size={32} className="text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight uppercase italic mb-1">BHP & RODO (Audyty)</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Kreator wielojęzycznych formularzy zgłoszeniowych i inspekcji.</p>
          </div>
        </div>
        {canManageForms && !isCreating && (
          <button onClick={() => setIsCreating(true)} className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl shadow-slate-200">
            <PlusCircle size={18} /> Nowy Szablon
          </button>
        )}
      </div>

      {isCreating ? (
        <div className="bg-slate-50 p-8 rounded-3xl border-2 border-slate-200">
           <h3 className="text-lg font-black uppercase italic tracking-tighter text-slate-900 mb-6 flex items-center gap-2">
             <ClipboardList className="text-red-500" /> Kreator Inspekcji
           </h3>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
             <div>
               <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Moduł Systemowy</label>
               <select value={moduleType} onChange={e => setModuleType(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold shadow-sm">
                 <option value="BHP">BHP (Bezpieczeństwo)</option>
                 <option value="RODO">RODO (GDPR/Compliance)</option>
                 <option value="QUALITY">QUALITY (Kontrola Jakości)</option>
               </select>
             </div>
             <div>
               <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Tryb Językowy</label>
               <select value={languageMode} onChange={e => setLanguageMode(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2">
                 <option value="PL">Polski (PL)</option>
                 <option value="EN">Angielski (EN)</option>
                 <option value="UA">Ukraiński (UA)</option>
                 <option value="PL/EN">Dwujęzyczny: Polski / Angielski</option>
                 <option value="PL/UA">Dwujęzyczny: Polski / Ukraiński</option>
               </select>
             </div>
             <div>
               <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Polityka Retencji</label>
               <select value={retentionDays} onChange={e => setRetentionDays(Number(e.target.value))} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold shadow-sm">
                 <option value={30}>30 dni (Tymczasowe)</option>
                 <option value={365}>1 rok (Operacyjne)</option>
                 <option value={1095}>3 lata (Standard Quality)</option>
                 <option value={1825}>5 lat (RODO / Standard BHP)</option>
                 <option value={3650}>10 lat (BHP - Powypadkowe)</option>
                 <option value={18250}>50 lat (Płace/Twarde)</option>
               </select>
             </div>
             <div className="flex flex-col justify-end pb-1">
                <label className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-slate-300 transition-colors">
                  <input type="checkbox" checked={autoDestruct} onChange={e => setAutoDestruct(e.target.checked)} className="w-5 h-5 rounded text-red-600 focus:ring-red-600 border-slate-300" />
                  <span className="text-xs font-bold text-slate-700">Auto-destrukcja po upływie retencji</span>
                </label>
             </div>
           </div>
           
           <div className="space-y-4 mb-8">
             <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Tytuł Formularza</label>
             {getRequiredLangs().map(lang => (
               <div key={`title-${lang}`} className="flex items-center gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                 <span className="bg-slate-100 text-slate-600 font-black text-[10px] px-3 py-1 rounded-lg w-12 text-center">{lang}</span>
                 <input type="text" value={title[lang]} onChange={e => setTitle({...title, [lang]: e.target.value})} className="w-full outline-none font-bold text-slate-800" placeholder={`Tytuł w języku ${lang}...`} />
               </div>
             ))}
           </div>
           
           <div className="mb-8">
             <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Pola Formularza</label>
             <div className="space-y-4">
               {fields.map((f, i) => (
                  <div key={f.id} className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm relative group">
                    <button onClick={() => handleRemoveField(f.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-[10px] bg-slate-900 text-white px-2 py-1 rounded font-black uppercase tracking-widest">{f.type}</span>
                      <span className="text-xs font-bold text-slate-400">Pytanie #{i+1}</span>
                    </div>
                    <div className="space-y-3">
                      {getRequiredLangs().map(lang => (
                        <div key={`field-${f.id}-${lang}`} className="flex items-center gap-3">
                           <span className="text-[10px] font-black text-slate-400 w-6">{lang}</span>
                           <input type="text" value={f.label[lang] || ''} onChange={e => handleLabelChange(f.id, lang, e.target.value)} className="w-full border-b border-slate-200 py-2 outline-none font-medium focus:border-red-500 transition-colors" placeholder={`Treść pytania (${lang})...`} />
                        </div>
                      ))}
                    </div>
                  </div>
               ))}
             </div>
             {fields.length === 0 && <div className="text-center py-6 text-slate-400 text-sm font-bold border-2 border-dashed border-slate-200 rounded-xl">Dodaj pierwsze pytanie.</div>}
             
             <div className="flex gap-3 mt-6">
               <button onClick={() => handleAddField('text')} className="px-4 py-2 bg-white border border-slate-200 shadow-sm rounded-xl text-xs font-black uppercase tracking-widest hover:border-slate-300 flex items-center gap-2"><Plus size={14}/> Tekst</button>
               <button onClick={() => handleAddField('checkbox')} className="px-4 py-2 bg-white border border-slate-200 shadow-sm rounded-xl text-xs font-black uppercase tracking-widest hover:border-slate-300 flex items-center gap-2"><Plus size={14}/> Checkbox</button>
               <button onClick={() => handleAddField('photo')} className="px-4 py-2 bg-white border border-slate-200 shadow-sm rounded-xl text-xs font-black uppercase tracking-widest hover:border-slate-300 flex items-center gap-2"><Plus size={14}/> Zdjęcie</button>
             </div>
           </div>
           
           <div className="flex justify-end gap-4 border-t border-slate-200 pt-6">
             <button onClick={() => setIsCreating(false)} className="px-6 py-3 text-slate-500 hover:bg-slate-100 rounded-xl font-black text-xs uppercase tracking-widest">Anuluj</button>
             <button onClick={handleSaveForm} className="px-8 py-3 bg-red-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-200 hover:bg-red-700 transition-all flex items-center gap-2"><CheckCircle size={16}/> Aktywuj Szablon</button>
           </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {forms.map(form => (
            <div key={form.id} className="bg-white p-6 rounded-3xl border border-slate-100 hover:border-slate-200 hover:shadow-xl transition-all flex flex-col justify-between group">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-red-50 transition-colors">
                    <ClipboardList size={20} className="text-slate-400 group-hover:text-red-500" />
                  </div>
                  <div className="flex gap-2">
                    <span className="bg-slate-900 text-white px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest">{form.moduleType}</span>
                    <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest flex items-center gap-1"><Globe size={10}/> {form.languageMode}</span>
                  </div>
                </div>
                <h3 className="font-black text-lg text-slate-800 italic tracking-tight line-clamp-2 leading-tight">{form.title[form.languageMode.split('/')[0]] || 'Formularz'}</h3>
                <div className="flex justify-between items-center mt-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{form.schema.length} Pytań i Pól</p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded">Retencja: {form.retentionDays} dni {form.autoDestruct && <span className="text-red-500 font-black">🔥 (Auto-del)</span>}</p>
                </div>
              </div>
              <button className="mt-8 w-full py-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 flex items-center justify-center gap-2 hover:bg-slate-900 hover:text-white transition-colors">
                <Smartphone size={16} /> Wypełnij Raport
              </button>
            </div>
          ))}
          {forms.length === 0 && (
             <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-20 bg-slate-50 rounded-3xl border border-slate-100">
                <ShieldAlert className="text-slate-300 mx-auto mb-4" size={48} />
                <p className="text-sm font-bold text-slate-500 mb-2">Brak zdefiniowanych formularzy audytowych.</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{canManageForms ? 'Kliknij "Nowy Szablon" aby stworzyć bazę pytań.' : 'Poproś inspektora o aktywowanie formularzy.'}</p>
             </div>
          )}
        </div>
      )}
    </div>
  );
}
