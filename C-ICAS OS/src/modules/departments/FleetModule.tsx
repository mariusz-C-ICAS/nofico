import React, { useState, useEffect } from 'react';
import { toast } from '../../shared/utils/toast';
import { db } from '../../shared/lib/firebase';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, doc, updateDoc, where } from 'firebase/firestore';
import { useAuth } from '../../shared/hooks/AuthContext';
import { 
  Truck, Wrench, Calendar as CalIcon, PlusCircle, CheckCircle, 
  AlertTriangle, Camera, Video, ScanLine, QrCode, ClipboardList, 
  History, Barcode, MapPin, User, Briefcase, Search, Plus, X as LucideX
} from 'lucide-react';
import { format } from 'date-fns';

export default function FleetModule() {
  const { userData, activeTenantId } = useAuth();
  const [fleet, setFleet] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [activeTransfer, setActiveTransfer] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeItem, setActiveItem] = useState<any>(null);
  const [photoHistory, setPhotoHistory] = useState<any[]>([]);

  const [newItem, setNewItem] = useState({ 
    name: '', 
    serialNumber: '', 
    barcode: '',
    type: 'Elektronarzędzia', 
    ownership: 'firmowy', 
    status: 'sprawny', 
    ownerName: 'C-ICAS FIRMA',
    location: 'Magazyn Główny',
    assignedToId: '',
    assignedProjectId: '',
    assignedTaskId: '',
    description: ''
  });

  const assetTypes = {
    'Elektronarzędzia Ogrodowe': ['Kosiarki akumulatorowe', 'Podkaszarki akumulatorowe', 'Nożyce do żywopłotu (bateryjne)', 'Dmuchawy do liści (akumulatorowe)', 'Aeratory / Wertykulatory'],
    'Elektronarzędzia Warsztatowe': ['Wiertarki SDS+', 'Wkrętarki 18V', 'Szlifierki kątowe (Flex)', 'Młoty wyburzeniowe', 'Pilarki tarczowe', 'Wyrzynarki', 'Frezarki', 'Klucze udarowe'],
    'Sprzęt Spalinowy': ['Kosiarki spalinowe', 'Traktorki ogrodowe', 'Piły mechaniczne', 'Świdry glebowe', 'Przecinarki do betonu', 'Zagęszczarki', 'Glebogryzarki'],
    'Narzędzia Ręczne (Specjalistyczne)': ['Sekatory teleskopowe', 'Nożyce do drutu', 'Poziomnice laserowe', 'Dalmierz laserowy', 'Klucze dynamometryczne'],
    'Pojazdy i Transport': ['Samochody dostawcze', 'Przyczepy lekkie', 'Lawety', 'Wózki widłowe', 'Mini-koparki'],
    'Sprzęt Klienta': ['Systemy nawadniania', 'Pompy głębinowe', 'Roboty koszące', 'Instalacje elektryczne', 'Ogrodzenia systemowe']
  };

  useEffect(() => {
    if (!activeTenantId) return;

    const qF = query(collection(db, 'fleetItems'), where('tenantId', '==', activeTenantId), orderBy('createdAt', 'desc'));
    const unF = onSnapshot(qF, (snapshot) => {
      setFleet(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    
    onSnapshot(query(collection(db, 'clients'), where('tenantId', '==', activeTenantId), orderBy('createdAt', 'desc')), (snap) => {
      setClients(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    onSnapshot(query(collection(db, 'projects'), where('tenantId', '==', activeTenantId), orderBy('createdAt', 'desc')), (snap) => {
      setProjects(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    
    return () => { unF(); };
  }, [activeTenantId]);

  const fetchPhotoHistory = (itemId: string) => {
    const q = query(collection(db, `fleetItems/${itemId}/photoHistory`), orderBy('createdAt', 'desc'));
    onSnapshot(q, (snap) => {
      setPhotoHistory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  };

  const handleAddPhotoRecord = async (itemId: string, photoUrl: string, condition: string, comment: string) => {
    try {
      await addDoc(collection(db, `fleetItems/${itemId}/photoHistory`), {
        photoUrl,
        condition,
        comment,
        reportedBy: userData?.name || userData?.email,
        createdAt: serverTimestamp()
      });
      const itemRef = doc(db, 'fleetItems', itemId);
      await updateDoc(itemRef, {
        lastPhotoUrl: photoUrl,
        lastCondition: condition,
        lastPhotoAt: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    if (!newItem.name.trim()) toast.warn("Nazwa jest wymagana."); return;
    try {
      await addDoc(collection(db, 'fleetItems'), {
        ...newItem,
        tenantId: activeTenantId,
        createdAt: serverTimestamp(),
        lastStatusUpdate: serverTimestamp()
      });
      setIsAdding(false);
      setNewItem({ 
        name: '', serialNumber: '', barcode: '', type: 'Elektronarzędzia', ownership: 'firmowy', 
        status: 'sprawny', ownerName: 'C-ICAS FIRMA', location: 'Magazyn Główny', 
        assignedToId: '', assignedProjectId: '', assignedTaskId: '', description: ''
      });
    } catch(err) {
      console.error(err);
    }
  };

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'sprawny': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'naprawa/serwis': return 'bg-red-100 text-red-700 border-red-200';
      case 'uszkodzony': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'u klienta': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'na projekcie': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const filteredFleet = fleet.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3">
             <QrCode size={32} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase italic">E-Stock 2026 Fleet</h2>
            <p className="text-sm text-slate-500 font-medium tracking-tight">System Degradacji AI & Inwentaryzacja Elite</p>
          </div>
        </div>
        {!isAdding && (
          <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl">
            <Plus size={18} /> Dodaj Środek
          </button>
        )}
      </div>

      {isAdding ? (
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl max-w-4xl mx-auto w-full animate-in zoom-in-95 duration-300">
           <div className="flex justify-between items-center mb-8">
             <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Nowy Wpis do Rejestru</h3>
             <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><LucideX size={20} /></button>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <div className="md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Nazwa Środka / Model</label>
                <input required value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm focus:bg-white outline-none ring-offset-2 focus:ring-2 ring-blue-500 transition-all" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Typ / Kategoria</label>
                <select value={newItem.type} onChange={e => setNewItem({...newItem, type: e.target.value})} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none">
                  {Object.keys(assetTypes).map(group => (
                    <optgroup label={group} key={group}>
                      {assetTypes[group as keyof typeof assetTypes].map(t => <option value={t} key={t}>{t}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Numer Seryjny</label>
                <input value={newItem.serialNumber} onChange={e => setNewItem({...newItem, serialNumber: e.target.value})} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Kod QR / E-Stock ID</label>
                <input value={newItem.barcode} onChange={e => setNewItem({...newItem, barcode: e.target.value})} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none" />
              </div>
           </div>

           <div className="flex justify-end gap-3 pt-6 border-t">
              <button onClick={() => setIsAdding(false)} className="px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50">Anuluj</button>
              <button onClick={handleSave} className="px-10 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 shadow-xl transition-all">Zapisz Środek</button>
           </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
           <div className="bg-white p-6 rounded-[2rem] border border-slate-200 flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-100 bg-slate-50 outline-none focus:bg-white focus:ring-2 ring-blue-500/20 font-bold text-sm transition-all" placeholder="Szukaj po SN, nazwie lub lokalizacji..." />
              </div>
           </div>

           <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 font-black text-[10px] text-slate-400 uppercase tracking-widest">
                    <th className="px-8 py-5">Nazwa i SN</th>
                    <th className="px-8 py-5">Status Degradacji</th>
                    <th className="px-8 py-5">Lokalizacja</th>
                    <th className="px-8 py-5 text-right w-20">Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFleet.map(item => (
                    <tr 
                      key={item.id} 
                      onClick={() => { setActiveItem(item); fetchPhotoHistory(item.id); }}
                      className="hover:bg-slate-50 transition-colors group cursor-pointer"
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-sm">
                              {item.type?.toLowerCase().includes('auto') ? <Truck size={24}/> : <Wrench size={24}/>}
                           </div>
                           <div>
                              <div className="font-black text-slate-900 uppercase italic tracking-tight">{item.name}</div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">SN: {item.serialNumber || 'BRAK'}</div>
                           </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                         <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-block border ${getStatusStyle(item.status)}`}>
                            {item.status}
                         </div>
                         {item.lastCondition && <div className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-tighter italic">Stan: {item.lastCondition}</div>}
                      </td>
                      <td className="px-8 py-6">
                         <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg w-fit">
                           <MapPin size={12} className="text-slate-400" /> {item.location}
                         </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                         <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shadow-sm ring-1 ring-blue-100">
                               <Camera size={20} />
                            </div>
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </div>
        </div>
      )}

      {activeItem && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-[2.5rem] w-full max-w-5xl h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-slate-100 animate-in slide-in-from-bottom-12 duration-500">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                 <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg">
                       <Truck size={28} className="text-white" />
                    </div>
                    <div>
                        <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">{activeItem.name}</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2 italic flex items-center gap-2">
                           <ScanLine size={14} className="text-blue-500"/> SYSTEM ANALIZY DEGRADACJI ELITE-STOCK 2026
                        </p>
                    </div>
                 </div>
                 <button onClick={() => setActiveItem(null)} className="p-4 hover:bg-slate-200 rounded-[2rem] transition-colors"><LucideX size={28} /></button>
              </div>

              <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 gap-0">
                 <div className="p-10 border-r border-slate-100 bg-slate-50/40">
                    <div className="space-y-8">
                       <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                             <TrendingUp size={100} />
                          </div>
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 block">Nowa Inspekcja Wizualna</h4>
                          <div className="aspect-square bg-slate-50 rounded-3xl flex flex-col items-center justify-center border-4 border-dashed border-slate-200 mb-6 cursor-pointer hover:bg-slate-100 transition-all text-slate-400 group/upload relative overflow-hidden">
                             {/* Mock Preview if we had camera integration */}
                             <Camera size={48} className="group-hover/upload:scale-110 transition-transform" />
                             <span className="text-[10px] font-black uppercase tracking-widest mt-4">Prześlij Foto Stanu</span>
                          </div>
                          
                          <div className="space-y-4">
                             <select className="w-full bg-slate-50 border border-slate-100 px-5 py-3 rounded-2xl font-black uppercase text-[10px] outline-none ring-blue-500 focus:ring-2">
                                <option>Idealny / Nowy</option>
                                <option>Drobne Ślady</option>
                                <option>Umiarkowane zużycie</option>
                                <option>Uszkodzenie mechaniczne</option>
                                <option>Wymaga Serwisu</option>
                             </select>
                             <button 
                               onClick={() => handleAddPhotoRecord(activeItem.id, 'https://images.unsplash.com/photo-1572911578273-04359483324e?auto=format&fit=crop&q=80&w=600', 'Zadbane', 'Pracownik oddał czysty i sprawny sprzęt.')}
                               className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-600 transition-all shadow-xl"
                             >
                                Zatwierdź i Archiwizuj
                             </button>
                          </div>
                       </div>

                       <div className="bg-emerald-900 p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden group">
                          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:rotate-12 transition-transform">
                             <Award size={120} />
                          </div>
                          <h5 className="flex items-center gap-2 text-amber-400 font-black uppercase tracking-widest text-xs mb-4">
                             <Award size={18} /> Bonus Motywacyjny
                          </h5>
                          <p className="text-xs font-medium text-emerald-100 leading-relaxed mb-6">
                             Ten sprzęt jest wart <span className="font-black text-white italic">4,500 PLN</span>. Utrzymanie go w stanie idealnym do końca projektu uprawnia operatora do <span className="text-amber-400 font-black">PREMII (+10%)</span>.
                          </p>
                          <div className="flex items-center gap-2">
                             <div className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-400 w-3/4"></div>
                             </div>
                             <span className="text-[10px] font-black tracking-widest">75%</span>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="lg:col-span-2 p-10 bg-white">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-[0.3em] mb-12 flex items-center gap-3 italic underline decoration-blue-500 decoration-4">
                       <History className="text-blue-600" /> Analiza Wizualna Degradacji
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       {photoHistory.length === 0 ? (
                         <div className="col-span-2 py-40 text-center flex flex-col items-center opacity-30">
                            <Camera size={64} strokeWidth={1} />
                            <p className="mt-4 font-black uppercase tracking-widest text-sm italic italic">Brak dokumentacji wizualnej.</p>
                         </div>
                       ) : photoHistory.map(log => (
                         <div key={log.id} className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-4 flex flex-col gap-4 group hover:bg-white hover:shadow-2xl transition-all duration-500">
                            <div className="aspect-video rounded-3xl overflow-hidden border border-slate-200">
                               <img src={log.photoUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt="Audit" />
                            </div>
                            <div className="px-4 pb-4">
                               <div className="flex justify-between items-center mb-3">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{log.createdAt ? format(log.createdAt.toDate(), 'dd.MM.yyyy HH:mm') : ''}</span>
                                  <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-black uppercase text-[8px] border border-amber-200">{log.condition}</span>
                               </div>
                               <p className="text-xs text-slate-600 font-bold italic line-clamp-2">"{log.comment}"</p>
                               <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                     <div className="w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-[10px] font-black italic">{log.reportedBy?.[0]}</div>
                                     <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter truncate max-w-[100px]">{log.reportedBy}</span>
                                  </div>
                               </div>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

function Award(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/><circle cx="12" cy="8" r="6"/></svg>
  );
}

function TrendingUp(props: any) {
    return (
      <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
    )
}
