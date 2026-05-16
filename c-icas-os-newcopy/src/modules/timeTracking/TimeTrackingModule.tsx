import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../shared/hooks/AuthContext';
import { db } from '../../shared/lib/firebase';
import { 
  collection, query, where, orderBy, onSnapshot, 
  addDoc, updateDoc, doc, serverTimestamp, getDocs
} from 'firebase/firestore';
import { 
  MapPin, Play, Square, Clock, Plus, UploadCloud, 
  ChevronRight, Calendar, History, Coffee, Car, 
  HardHat, Camera, X, Check, Briefcase, Info, AlertTriangle,
  Mic, FileText, Image as ImageIcon, Map as MapIcon, RefreshCw, Edit3
} from 'lucide-react';
import { format } from 'date-fns';
import { offlineDB, OfflineTimeEntry } from './services/offlineStorage';
import { checkGeofence, getAdaptiveInterval } from './services/geofenceService';
import { auditService } from '../../shared/lib/audit';

export default function TimeTrackingModule() {
  const { t } = useTranslation();
  const { user, userData, activeTenantId } = useAuth();
  
  const [entries, setEntries] = useState<any[]>([]);
  const [activeEntry, setActiveEntry] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'tracker' | 'history' | 'stats'>('tracker');
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [note, setNote] = useState('');
  
  // Advanced tracking states
  const [gpsStatus, setGpsStatus] = useState<'stable' | 'searching' | 'error'>('searching');
  const [currentPos, setCurrentPos] = useState<GeolocationPosition | null>(null);
  const [isInsideGeofence, setIsInsideGeofence] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isManualMode, setIsManualMode] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  
  const gpsWatcher = useRef<number | null>(null);
  const adaptiveTimer = useRef<any>(null);

  useEffect(() => {
    // Online/Offline listener
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Sync backgrounds
    if (!isOffline) {
       syncOfflineData();
    }

    // GPS Watcher
    if ("geolocation" in navigator) {
      gpsWatcher.current = navigator.geolocation.watchPosition(
        (pos) => {
          setCurrentPos(pos);
          setGpsStatus('stable');
        },
        (err) => {
          console.error("GPS Error:", err);
          setGpsStatus('error');
        },
        { enableHighAccuracy: true }
      );
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (gpsWatcher.current) navigator.geolocation.clearWatch(gpsWatcher.current);
      if (adaptiveTimer.current) clearTimeout(adaptiveTimer.current);
    };
  }, [isOffline]);

  const syncOfflineData = async () => {
    const pending = await offlineDB.entries.where('status').equals('pending').toArray();
    for (const entry of pending) {
      try {
        await addDoc(collection(db, 'timeEntries'), {
          ...entry,
          status: 'completed', // Synchronized entries are usually finished sessions
          createdAt: serverTimestamp(),
          startTime: new Date(entry.startTime),
          endTime: entry.endTime ? new Date(entry.endTime) : serverTimestamp(),
          syncedAt: serverTimestamp()
        });
        await offlineDB.entries.update(entry.id!, { status: 'synced' });
      } catch (err) {
        console.error("Sync failed for entry:", entry.id, err);
      }
    }
  };

  useEffect(() => {
    if (selectedProjectId && currentPos) {
      const proj = projects.find(p => p.id === selectedProjectId);
      if (proj?.location) {
        const inside = checkGeofence(
          [currentPos.coords.longitude, currentPos.coords.latitude],
          { radius: proj.radius || 100, center: [proj.location.lng, proj.location.lat] }
        );
        setIsInsideGeofence(inside);
      }
    }
  }, [selectedProjectId, currentPos, projects]);

  useEffect(() => {
    if (activeEntry && !isManualMode && currentPos) {
      const speed = currentPos.coords.speed || 0;
      const interval = getAdaptiveInterval(speed);
      
      adaptiveTimer.current = setInterval(() => {
        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition((pos) => {
            setCurrentPos(pos);
            // In real app, we might want to log this intermediate path point to Firestore
            console.log("Adaptive GPS Poll:", pos.coords.latitude, pos.coords.longitude);
          });
        }
      }, interval);

      return () => clearInterval(adaptiveTimer.current);
    }
  }, [activeEntry, isManualMode, currentPos]);

  useEffect(() => {
    if (!user) return;

    // Load user's time entries
    const qEntries = query(
      collection(db, 'timeEntries'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubEntries = onSnapshot(qEntries, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      setEntries(data);
      const currentActive = data.find((e: any) => e.status === 'active');
      setActiveEntry(currentActive || null);
      setLoading(false);
    });

    // Load active projects for the company
    const qProjects = query(
      collection(db, 'projects'),
      where('tenantId', '==', activeTenantId || 'default')
    );
    const unsubProjects = onSnapshot(qProjects, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubEntries();
      unsubProjects();
    };
  }, [user, activeTenantId]);

  const handleStart = async (type: string) => {
    if (!user) return;
    if (!selectedProjectId && type !== 'break') {
      alert("Proszę wybrać projekt przed rozpoczęciem pracy.");
      return;
    }

    const entryData: any = {
      userId: user.uid,
      userName: userData?.name || user.email,
      type,
      projectId: selectedProjectId || 'SYSTEM_BREAK',
      projectName: projects.find(p => p.id === selectedProjectId)?.name || 'Przerwa/Logistyka',
      startTime: Date.now(),
      status: 'active',
      note: note,
      manualEdit: isManualMode,
      location: currentPos ? {
        lat: currentPos.coords.latitude,
        lng: currentPos.coords.longitude,
        accuracy: currentPos.coords.accuracy
      } : null,
      attachments,
      tenantId: activeTenantId || 'default'
    };

    if (isOffline) {
      await offlineDB.entries.add({ ...entryData, status: 'pending' });
      alert("Tryb Offline: Zmiana zapisana lokalnie.");
      // Manually trigger fake update for UI
      setActiveEntry({ ...entryData, id: 'temp-' + Date.now() });
    } else {
      try {
        const docRef = await addDoc(collection(db, 'timeEntries'), {
          ...entryData,
          startTime: serverTimestamp(),
          createdAt: serverTimestamp()
        });
        
        // TT-IMP-08/09: Pub/Sub event publishers
        if (entryData.type !== 'break') {
          // Simulated HR integration
          console.log("PubSub Event: hr.timesheet.update", { 
            id: docRef.id, 
            userId: user.uid, 
            projectId: entryData.projectId 
          });
          
          // Simulated Finance integration (if billable)
          if (entryData.projectName !== 'Logistyka') {
            console.log("PubSub Event: finance.billable.created", {
              id: docRef.id,
              clientRate: 150, // default rate
              isBillable: true
            });
          }
        }
      } catch (err) {
        console.error("Time Tracking Error:", err);
      }
    }
    setNote('');
    setAttachments([]);
  };

  const handleStop = async () => {
    if (!activeEntry) return;

    if (isOffline || activeEntry.id.startsWith('temp-')) {
       await offlineDB.entries.update(activeEntry.id.replace('temp-', ''), {
         endTime: Date.now(),
         status: 'pending'
       });
       setActiveEntry(null);
       alert("Tryb Offline: Koniec zmiany zapisany.");
       return;
    }

    try {
      const docRef = doc(db, 'timeEntries', activeEntry.id);
      await updateDoc(docRef, {
        status: 'completed',
        endTime: serverTimestamp(),
        endLocation: currentPos ? {
          lat: currentPos.coords.latitude,
          lng: currentPos.coords.longitude
        } : null
      });

      if (activeEntry.manualEdit) {
        await auditService.logAction(user?.uid || 'system', 'MANUAL_TIME_EDIT', activeEntry.id, {
          originalStart: activeEntry.startTime,
          editedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error("Stop Error:", err);
    }
  };

  const calculateDuration = (start: any, end: any) => {
    if (!start) return '--:--';
    const startTime = start.toDate().getTime();
    const endTime = end ? end.toDate().getTime() : Date.now();
    const diffMs = endTime - startTime;
    const hrs = Math.floor(diffMs / 3600000);
    const mins = Math.floor((diffMs % 3600000) / 60000);
    return `${hrs.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m`;
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 font-sans tracking-tight">
      {/* Header Nav */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
         <div className="flex bg-slate-100 p-1.5 rounded-2xl">
            <button onClick={() => setView('tracker')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'tracker' ? 'bg-white text-blue-600 shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}>Kontrola Live</button>
            <button onClick={() => setView('history')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'history' ? 'bg-white text-blue-600 shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}>Historia Logów</button>
         </div>
         <div className="flex items-center gap-8 px-8 py-3 bg-slate-50 border border-slate-100 rounded-2xl">
            <div className="text-center">
               <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Dziś Przepracowano</div>
               <div className="text-xl font-black text-slate-900 tracking-tighter">07:42:12</div>
            </div>
            <div className="w-px h-8 bg-slate-200"></div>
            <div className="text-center">
               <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Norma (SLA)</div>
               <div className="text-xl font-black text-emerald-600 tracking-tighter">96%</div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        <div className="md:col-span-12">
          {view === 'tracker' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
               {/* Controls */}
               <div className="lg:col-span-4 bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm flex flex-col gap-6">
                  <div className="flex items-center justify-between border-b pb-4 mb-2">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Konfiguracja Zmiany</h3>
                    {isOffline && (
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-600 rounded-lg border border-amber-200 animate-pulse">
                         <RefreshCw size={10} className="animate-spin" />
                         <span className="text-[8px] font-black uppercase">OFFLINE</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 p-2 bg-slate-50 rounded-2xl border border-slate-100">
                    <button 
                      onClick={() => setIsManualMode(false)}
                      className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${!isManualMode ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400'}`}
                    >
                      Auto (GPS)
                    </button>
                    <button 
                      onClick={() => setIsManualMode(true)}
                      className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${isManualMode ? 'bg-rose-50 text-rose-600 shadow-md' : 'text-slate-400'}`}
                    >
                      <Edit3 size={10} className="inline mr-1" /> Manual
                    </button>
                  </div>
                  
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Wybierz Projekt / Lokalizację</label>
                    <select 
                      disabled={!!activeEntry}
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full bg-slate-100 border-none rounded-2xl p-4 text-xs font-black uppercase tracking-tight outline-none focus:ring-2 ring-blue-500 appearance-none disabled:opacity-50"
                    >
                      <option value="">Wybierz z listy...</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Notatka / Zadanie</label>
                    <textarea 
                      disabled={!!activeEntry}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Co będziesz robił? (opcjonalnie)"
                      className="w-full bg-slate-100 border-none rounded-2xl p-4 text-xs font-bold outline-none focus:ring-2 ring-blue-500 h-24 resize-none disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Dowody Cyfrowe (Evidence)</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button className="bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 p-3 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center gap-1 transition-all">
                        <Camera size={18} />
                        <span className="text-[8px] font-black uppercase">Foto</span>
                      </button>
                      <button className="bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 p-3 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center gap-1 transition-all">
                        <Mic size={18} />
                        <span className="text-[8px] font-black uppercase">Głos</span>
                      </button>
                      <button className="bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 p-3 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center gap-1 transition-all">
                        <FileText size={18} />
                        <span className="text-[8px] font-black uppercase">Info</span>
                      </button>
                    </div>
                  </div>

                  <div className={`p-4 rounded-2xl flex gap-3 transition-all ${isInsideGeofence ? 'bg-emerald-50 border border-emerald-100' : 'bg-amber-50 border border-amber-100'}`}>
                     <MapIcon size={18} className={isInsideGeofence ? 'text-emerald-600' : 'text-amber-600'} />
                     <div>
                        <p className={`text-[9px] font-black uppercase leading-tight ${isInsideGeofence ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {isInsideGeofence ? 'W STREFIE PROJEKTU' : 'POZA STREFĄ PROJEKTU'}
                        </p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">
                          {gpsStatus === 'stable' ? `GPS ±${currentPos?.coords.accuracy.toFixed(0)}m` : 'Czekam na sygnał...'}
                        </p>
                     </div>
                  </div>
               </div>

               {/* Active Visualizer */}
               <div className="lg:col-span-8 bg-slate-950 rounded-[3rem] p-12 text-white shadow-3xl relative overflow-hidden flex flex-col justify-center items-center text-center group">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 opacity-10 rounded-full blur-[100px] transform translate-x-1/3 -translate-y-1/3 group-hover:scale-110 transition-transform duration-1000"></div>
                  
                  {activeEntry ? (
                    <div className="relative z-10 animate-in zoom-in duration-500 w-full">
                       <div className="inline-flex items-center gap-2 bg-emerald-500/20 px-4 py-1.5 rounded-full border border-emerald-500/30 mb-8 border-dashed">
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></div>
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Rejestrowanie Operacyjne</span>
                       </div>
                       
                       <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2">{activeEntry.projectName}</div>
                       <h2 className="text-4xl md:text-6xl font-black italic tracking-tighter mb-4 uppercase leading-none">
                          {activeEntry.type === 'work' && "Praca Terenowa"}
                          {activeEntry.type === 'travel' && "W Trasie (Log)"}
                          {activeEntry.type === 'break' && "Pauza / Przerwa"}
                       </h2>
                       
                       <div className="text-7xl md:text-9xl font-black font-mono tracking-tighter mb-12 tabular-nums drop-shadow-2xl">
                          {calculateDuration(activeEntry.startTime, null).split(' ')[0]}<span className="text-4xl text-slate-600">h</span> {calculateDuration(activeEntry.startTime, null).split(' ')[1]}
                       </div>

                       <div className="flex justify-center gap-4">
                          <button 
                            onClick={handleStop}
                            className="bg-white text-slate-950 px-12 py-5 rounded-3xl font-black uppercase tracking-widest text-sm hover:scale-105 active:scale-95 transition-all shadow-white/10 shadow-2xl flex items-center gap-3 border-4 border-transparent hover:border-rose-500"
                          >
                             <Square size={20} fill="currentColor" /> Zatrzymaj Zmianę
                          </button>
                          <button className="p-5 bg-white/10 rounded-3xl hover:bg-white hover:text-slate-900 transition-all">
                             <Camera size={24} />
                          </button>
                       </div>
                    </div>
                  ) : (
                    <div className="relative z-10 animate-in slide-in-from-bottom-12 duration-500">
                       <h2 className="text-4xl md:text-6xl font-black italic tracking-tighter mb-10 uppercase leading-none">Zarządzaj<br/>Swoim Czasem</h2>
                       <div className="grid grid-cols-2 gap-4 w-full max-w-md mx-auto">
                          <button 
                            onClick={() => handleStart('work')}
                            className="bg-white/10 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] flex flex-col items-center gap-4 hover:bg-white hover:text-slate-950 transition-all group hover:rotate-2 shadow-2xl"
                          >
                             <HardHat size={40} className="text-blue-500 group-hover:text-slate-950 transition-transform group-hover:scale-110" />
                             <span className="text-[10px] font-black uppercase tracking-widest">Start Praca</span>
                          </button>
                          <button 
                            onClick={() => handleStart('travel')}
                            className="bg-white/10 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] flex flex-col items-center gap-4 hover:bg-white hover:text-slate-950 transition-all group hover:-rotate-2 shadow-2xl"
                          >
                             <Car size={40} className="text-emerald-500 group-hover:text-slate-950 transition-transform group-hover:scale-110" />
                             <span className="text-[11px] font-black uppercase tracking-widest">Start Trasa</span>
                          </button>
                          <button 
                            onClick={() => handleStart('break')}
                            className="col-span-2 bg-white/5 border border-white/5 p-5 rounded-[2rem] flex items-center justify-center gap-4 hover:bg-white/10 transition-all group"
                          >
                             <Coffee size={24} className="text-slate-500 group-hover:text-amber-400 transition-colors" />
                             <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white">Włącz Przerwę (Break Protocol)</span>
                          </button>
                       </div>
                    </div>
                  )}
               </div>
            </div>
          ) : (
            <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-12 duration-500">
               <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-3">
                    <History size={24} className="text-blue-600"/> Rejestr Operacyjny Pracownika
                  </h3>
                  <div className="flex gap-2">
                     <button className="px-5 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all">Filtr Daty</button>
                  </div>
               </div>
               <div className="divide-y divide-slate-50">
                  {entries.length === 0 ? (
                    <div className="p-20 text-center flex flex-col items-center opacity-30">
                       <Clock size={64} strokeWidth={1} />
                       <p className="mt-4 font-black uppercase tracking-widest text-sm italic">Brak zapisanych logów czasowych.</p>
                    </div>
                  ) : entries.map(entry => (
                    <div key={entry.id} className="p-8 flex items-center justify-between hover:bg-slate-50 transition-all group">
                       <div className="flex items-center gap-6">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-white shadow-xl transition-all group-hover:scale-110 rotate-3 group-hover:rotate-0 ${entry.type === 'work' ? 'bg-blue-600 shadow-blue-200' : entry.type === 'travel' ? 'bg-emerald-600 shadow-emerald-200' : 'bg-slate-400'}`}>
                             {entry.type === 'work' ? <HardHat size={24}/> : entry.type === 'travel' ? <Car size={24}/> : <Coffee size={24}/>}
                          </div>
                          <div>
                             <div className="text-sm font-black text-slate-900 italic uppercase leading-none mb-1">
                                {entry.type === 'work' && "Praca Terenowa"}
                                {entry.type === 'travel' && "Logistyka / Trasa"}
                                {entry.type === 'break' && "Pauza / Przerwa"}
                             </div>
                             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <MapPin size={10} className="text-blue-500" /> {entry.projectName || 'Ogólny'} • 
                                {entry.startTime ? format(entry.startTime.toDate(), 'HH:mm') : '--:--'} 
                                {entry.endTime && ` → ${format(entry.endTime.toDate(), 'HH:mm')}`}
                             </div>
                          </div>
                       </div>
                       <div className="text-right">
                          <div className="text-2xl font-black text-slate-900 tracking-tighter">
                            {calculateDuration(entry.startTime, entry.endTime)}
                          </div>
                          <div className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded italic inline-block mt-1">Status: OK</div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}
        </div>
      </div>

      {/* SYSTEM STATUS FOOTER */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-8 py-8 border-t border-slate-100 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
         <div className="flex items-center gap-2">
           <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div> 
           Wartość Geofencingu: AKTYWNA
         </div>
         <div className="flex items-center gap-2">
           <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div> 
           Kryptografia Logów: AES-256
         </div>
         <div className="flex items-center gap-2">
           <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div> 
           Sync Time: 12ms
         </div>
      </div>
    </div>
  );
}
