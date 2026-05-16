/**
 * Data: 2026-05-15
 * Utworzył: Agent AI
 * Opis: Ustawienia widoków iFrame dla Aktywnych Ogłoszeń o Pracę (Careers). Pozwala administratorowi zdefiniować jakie dane są widoczne w poszczególnych widokach publicznych/ostronach kariery.
 */
import React, { useState, useEffect } from 'react';
import { db } from '../../shared/lib/firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Monitor, Plus, Settings, Link as LinkIcon, Trash2, Eye } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../shared/lib/firestoreUtils';

export default function CareersIframeSettings() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<any>(null);

  // Default new config
  const initialConfig = {
    name: '',
    tenantId: 'Zarządzanie',
    showDepartment: true,
    showSalary: false,
    showDescription: true,
    theme: 'light',
    brandColor: '#10b981', // Emerald for careers
    brandFont: 'sans',
    layoutStyle: 'grid', // grid or list
  };

  const [formData, setFormData] = useState(initialConfig);

  useEffect(() => {
    const q = query(collection(db, 'careersIframeConfigs'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setConfigs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'careersIframeConfigs');
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    if (!formData.name) return alert('Wpisz nazwę widoku');
    
    try {
      if (editingConfig) {
        await updateDoc(doc(db, 'careersIframeConfigs', editingConfig.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'careersIframeConfigs'), {
          ...formData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      setEditingConfig(null);
      setFormData(initialConfig);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'careersIframeConfigs');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Czy na pewno chcesz usunąć ten widok iFrame? Linki do niego przestaną działać.')) return;
    try {
      await deleteDoc(doc(db, 'careersIframeConfigs', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'careersIframeConfigs');
    }
  };

  const openEdit = (conf: any) => {
    setEditingConfig(conf);
    setFormData({
       name: conf.name || '',
       tenantId: conf.tenantId || '',
       showDepartment: conf.showDepartment ?? true,
       showSalary: conf.showSalary ?? false,
       showDescription: conf.showDescription ?? true,
       theme: conf.theme || 'light',
       brandColor: conf.brandColor || '#10b981',
       brandFont: conf.brandFont || 'sans',
       layoutStyle: conf.layoutStyle || 'grid',
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-8">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 rounded-lg">
              <Monitor size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Widoki iFrame (Kariera)</h2>
              <p className="text-sm text-slate-500">Konfiguracja publicznych widoków aktualnych ofert pracy</p>
            </div>
          </div>
          <button onClick={() => { setEditingConfig(null); setFormData(initialConfig); setIsModalOpen(true); }} className="bg-emerald-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg flex gap-2 items-center">
            <Plus size={16} /> Nowy Widok
          </button>
        </div>

        {loading ? (
           <div className="text-slate-500 font-bold text-sm text-center py-8">Wczytywanie konfiguracji...</div>
        ) : configs.length === 0 ? (
           <div className="text-slate-400 font-medium text-sm text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              Brak zdefiniowanych widoków iFrame. Kliknij "Nowy Widok", aby utworzyć.
           </div>
        ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {configs.map(conf => {
                 const iframeUrl = `${window.location.origin}/iframe/careers/${conf.id}`;
                 const snippet = `<iframe src="${iframeUrl}" width="100%" height="800" frameborder="0"></iframe>`;
                 
                 return (
                    <div key={conf.id} className="border border-slate-200 rounded-2xl p-5 hover:border-emerald-300 transition-colors bg-slate-50 relative group">
                       <h3 className="font-bold text-slate-800 text-lg">{conf.name}</h3>
                       <div className="flex flex-wrap gap-2 mt-3">
                          {conf.showDepartment && <span className="bg-blue-100 text-blue-700 text-[9px] px-2 py-0.5 rounded uppercase font-black tracking-widest">Dział</span>}
                          {conf.showSalary && <span className="bg-emerald-100 text-emerald-700 text-[9px] px-2 py-0.5 rounded uppercase font-black tracking-widest">Wynagrodzenie</span>}
                          {conf.showDescription && <span className="bg-amber-100 text-amber-700 text-[9px] px-2 py-0.5 rounded uppercase font-black tracking-widest">Opis</span>}
                          <span className="bg-purple-100 text-purple-700 text-[9px] px-2 py-0.5 rounded uppercase font-black tracking-widest">{conf.layoutStyle === 'grid' ? 'Siatka' : 'Lista'}</span>
                       </div>
                       
                       <div className="mt-3">
                           <label className="block text-[9px] uppercase tracking-widest font-black text-slate-400 mb-1">Adres iFrame (URL)</label>
                           <input type="text" readOnly value={iframeUrl} className="w-full text-xs bg-slate-100 border border-slate-200 rounded p-1.5 text-slate-500 font-mono focus:outline-none" onClick={(e) => (e.target as HTMLInputElement).select()} />
                       </div>
                       
                       <div className="mt-4 pt-4 border-t border-slate-200 flex gap-2 justify-between">
                          <div className="flex gap-2">
                             <button onClick={() => openEdit(conf)} className="p-2 text-slate-400 hover:text-emerald-600 bg-white border border-slate-200 rounded-lg transition-colors">
                                <Settings size={14} />
                             </button>
                             <button onClick={() => handleDelete(conf.id)} className="p-2 text-slate-400 hover:text-red-600 bg-white border border-slate-200 rounded-lg transition-colors">
                                <Trash2 size={14} />
                             </button>
                          </div>
                          <div className="flex gap-2">
                             <button onClick={() => { navigator.clipboard.writeText(snippet); window.alert('Skopiowano kod iFrame!'); }} className="p-2 text-emerald-600 hover:bg-emerald-50 border border-emerald-200 bg-white rounded-lg transition-colors flex gap-2 items-center text-[10px] uppercase font-black tracking-widest">
                                <LinkIcon size={14} /> Kopiuj Kod
                             </button>
                             <a href={iframeUrl} target="_blank" rel="noreferrer" className="p-2 text-slate-500 hover:text-blue-600 bg-white border border-slate-200 rounded-lg transition-colors">
                                <Eye size={14} />
                             </a>
                          </div>
                       </div>
                    </div>
                 );
              })}
           </div>
        )}
      </div>

      {isModalOpen && (
         <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-xl animate-in fade-in zoom-in duration-200 relative">
               <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-black text-xl text-slate-800">{editingConfig ? 'Edycja Widoku Kariery' : 'Nowy Widok Kariery iFrame'}</h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-800 transition-colors">✕</button>
               </div>
               
               <div className="p-6 space-y-5 flex-1 overflow-y-auto max-h-[70vh]">
                  <div>
                     <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">Nazwa Widoku</label>
                     <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-emerald-500" placeholder="np. Strona Główna - Kariera" />
                  </div>
                  
                  <div>
                     <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">Konfiguracja Danych</label>
                     <div className="grid grid-cols-2 gap-3">
                        <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                           <input type="checkbox" checked={formData.showDepartment} onChange={e => setFormData({...formData, showDepartment: e.target.checked})} className="accent-emerald-600 w-4 h-4" />
                           <span className="text-sm font-bold text-slate-700">Dział</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                           <input type="checkbox" checked={formData.showSalary} onChange={e => setFormData({...formData, showSalary: e.target.checked})} className="accent-emerald-600 w-4 h-4" />
                           <span className="text-sm font-bold text-slate-700">Widły Wynagrodzeń</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                           <input type="checkbox" checked={formData.showDescription} onChange={e => setFormData({...formData, showDescription: e.target.checked})} className="accent-emerald-600 w-4 h-4" />
                           <span className="text-sm font-bold text-slate-700">Krótki Opis</span>
                        </label>
                     </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                     <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">Wygląd i Branding</label>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-xs font-bold text-slate-600 mb-1">Kolor Główny (HEX)</label>
                           <input type="color" value={formData.brandColor} onChange={e => setFormData({...formData, brandColor: e.target.value})} className="w-full h-10 border border-slate-200 rounded-xl cursor-pointer" />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-slate-600 mb-1">Czcionka</label>
                           <select value={formData.brandFont} onChange={e => setFormData({...formData, brandFont: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-sm font-bold text-slate-800 outline-none">
                              <option value="sans">Sans-serif (np. Inter)</option>
                              <option value="serif">Serif (np. Playfair)</option>
                              <option value="mono">Monospace</option>
                           </select>
                        </div>
                     </div>
                  </div>

                  <div>
                     <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">Układ</label>
                     <div className="grid grid-cols-2 gap-3">
                        <div>
                           <label className="block text-[10px] font-bold text-slate-600 mb-1">Styl Ułożenia</label>
                           <select value={formData.layoutStyle} onChange={e => setFormData({...formData, layoutStyle: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-3 py-3 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-emerald-500">
                              <option value="grid">Siatka Kart (Grid)</option>
                              <option value="list">Lista Zwięzła (List)</option>
                           </select>
                        </div>
                     </div>
                  </div>
               </div>
               
               <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-3xl">
                  <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 text-sm transition-colors">Anuluj</button>
                  <button onClick={handleSave} className="px-5 py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 text-sm transition-colors shadow-lg">Zapisz Widok</button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
