import React, { useState, useEffect } from 'react';
import { toast } from '../../shared/utils/toast';
import { db } from '../../shared/lib/firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Monitor, Plus, Settings, Link as LinkIcon, Trash2, Eye } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../shared/lib/firestoreUtils';

export default function BookingsIframeSettings() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<any>(null);

  const initialConfig = {
    name: '',
    tenantId: 'Zarządzanie',
    showServices: true,
    showPrices: true,
    showCalendar: true,
    theme: 'light',
    brandColor: '#ea580c', // amber/orange
    brandFont: 'sans',
    layoutStyle: 'calendar', // calendar or list
  };

  const [formData, setFormData] = useState(initialConfig);

  useEffect(() => {
    const q = query(collection(db, 'bookingsIframeConfigs'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setConfigs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'bookingsIframeConfigs');
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    if (!formData.name) toast.warn('Wpisz nazwę widoku'); return;
    
    try {
      if (editingConfig) {
        await updateDoc(doc(db, 'bookingsIframeConfigs', editingConfig.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'bookingsIframeConfigs'), {
          ...formData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      setEditingConfig(null);
      setFormData(initialConfig);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'bookingsIframeConfigs');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Czy na pewno chcesz usunąć ten widok iFrame?')) return;
    try {
      await deleteDoc(doc(db, 'bookingsIframeConfigs', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'bookingsIframeConfigs');
    }
  };

  const openEdit = (conf: any) => {
    setEditingConfig(conf);
    setFormData({
       name: conf.name || '',
       tenantId: conf.tenantId || '',
       showServices: conf.showServices ?? true,
       showPrices: conf.showPrices ?? true,
       showCalendar: conf.showCalendar ?? true,
       theme: conf.theme || 'light',
       brandColor: conf.brandColor || '#ea580c',
       brandFont: conf.brandFont || 'sans',
       layoutStyle: conf.layoutStyle || 'calendar',
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
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Widoki iFrame (Bookings CRM)</h2>
              <p className="text-sm text-slate-500">Konfiguracja publicznych kalendarzy rezerwacji i umawiania spotkań</p>
            </div>
          </div>
          <button onClick={() => { setEditingConfig(null); setFormData(initialConfig); setIsModalOpen(true); }} className="bg-amber-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg flex gap-2 items-center">
            <Plus size={16} /> Nowy Widok
          </button>
        </div>

        {loading ? (
           <div className="text-slate-500 font-bold text-sm text-center py-8">Wczytywanie konfiguracji...</div>
        ) : configs.length === 0 ? (
           <div className="text-slate-400 font-medium text-sm text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              Brak zdefiniowanych widoków iFrame dla rezerwacji. Kliknij "Nowy Widok", aby utworzyć.
           </div>
        ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {configs.map(conf => {
                 const iframeUrl = `${window.location.origin}/iframe/bookings/${conf.id}`;
                 const snippet = `<iframe src="${iframeUrl}" width="100%" height="800" frameborder="0"></iframe>`;
                 
                 return (
                    <div key={conf.id} className="border border-slate-200 rounded-2xl p-5 hover:border-amber-300 transition-colors bg-slate-50 relative group">
                       <h3 className="font-bold text-slate-800 text-lg">{conf.name}</h3>
                       <div className="flex flex-wrap gap-2 mt-3">
                          {conf.showServices && <span className="bg-blue-100 text-blue-700 text-[9px] px-2 py-0.5 rounded uppercase font-black tracking-widest">Usługi</span>}
                          {conf.showPrices && <span className="bg-emerald-100 text-emerald-700 text-[9px] px-2 py-0.5 rounded uppercase font-black tracking-widest">Ceny</span>}
                          {conf.showCalendar && <span className="bg-amber-100 text-amber-700 text-[9px] px-2 py-0.5 rounded uppercase font-black tracking-widest">Kalendarz</span>}
                          <span className="bg-purple-100 text-purple-700 text-[9px] px-2 py-0.5 rounded uppercase font-black tracking-widest">{conf.layoutStyle === 'calendar' ? 'Kalendarz' : 'Lista Usług'}</span>
                       </div>
                       
                       <div className="mt-3">
                           <label className="block text-[9px] uppercase tracking-widest font-black text-slate-400 mb-1">Adres iFrame (URL)</label>
                           <input type="text" readOnly value={iframeUrl} className="w-full text-xs bg-slate-100 border border-slate-200 rounded p-1.5 text-slate-500 font-mono focus:outline-none" onClick={(e) => (e.target as HTMLInputElement).select()} />
                       </div>
                       
                       <div className="mt-4 pt-4 border-t border-slate-200 flex gap-2 justify-between">
                          <div className="flex gap-2">
                             <button onClick={() => openEdit(conf)} className="p-2 text-slate-400 hover:text-amber-600 bg-white border border-slate-200 rounded-lg transition-colors">
                                <Settings size={14} />
                             </button>
                             <button onClick={() => handleDelete(conf.id)} className="p-2 text-slate-400 hover:text-red-600 bg-white border border-slate-200 rounded-lg transition-colors">
                                <Trash2 size={14} />
                             </button>
                          </div>
                          <div className="flex gap-2">
                             <button onClick={() => { navigator.clipboard.writeText(snippet); toast.info('Skopiowano kod iFrame!'); }} className="p-2 text-amber-600 hover:bg-amber-50 border border-amber-200 bg-white rounded-lg transition-colors flex gap-2 items-center text-[10px] uppercase font-black tracking-widest">
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
                  <h3 className="font-black text-xl text-slate-800">{editingConfig ? 'Edycja Widoku Rezerwacji' : 'Nowy Widok Bookings iFrame'}</h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-800 transition-colors">✕</button>
               </div>
               
               <div className="p-6 space-y-5 flex-1 overflow-y-auto max-h-[70vh]">
                  <div>
                     <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">Nazwa Widoku</label>
                     <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-amber-500" placeholder="np. Moduł Rezerwacji na stronę główną" />
                  </div>
                  
                  <div>
                     <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">Konfiguracja Pokazywanych Danych</label>
                     <div className="grid grid-cols-2 gap-3">
                        <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                           <input type="checkbox" checked={formData.showServices} onChange={e => setFormData({...formData, showServices: e.target.checked})} className="accent-amber-600 w-4 h-4" />
                           <span className="text-sm font-bold text-slate-700">Katalog Usług</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                           <input type="checkbox" checked={formData.showPrices} onChange={e => setFormData({...formData, showPrices: e.target.checked})} className="accent-amber-600 w-4 h-4" />
                           <span className="text-sm font-bold text-slate-700">Cennik</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                           <input type="checkbox" checked={formData.showCalendar} onChange={e => setFormData({...formData, showCalendar: e.target.checked})} className="accent-amber-600 w-4 h-4" />
                           <span className="text-sm font-bold text-slate-700">Wybór Daty i Kalendarz</span>
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
                     <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">Układ Początkowy</label>
                     <div className="grid grid-cols-2 gap-3">
                        <div>
                           <label className="block text-[10px] font-bold text-slate-600 mb-1">Widok STARTOWY</label>
                           <select value={formData.layoutStyle} onChange={e => setFormData({...formData, layoutStyle: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-3 py-3 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-amber-500">
                              <option value="calendar">Kalendarz (od razu na Datach)</option>
                              <option value="list">Katalog (Wybór usługi jako pierwszy krok)</option>
                           </select>
                        </div>
                     </div>
                  </div>
               </div>
               
               <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-3xl">
                  <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 text-sm transition-colors">Anuluj</button>
                  <button onClick={handleSave} className="px-5 py-2.5 rounded-xl font-bold text-white bg-amber-600 hover:bg-amber-700 text-sm transition-colors shadow-lg">Zapisz Widok</button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
