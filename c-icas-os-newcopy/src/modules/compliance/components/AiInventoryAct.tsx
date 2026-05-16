/**
 * Data: 2026-05-12
 * Zmiany: AI Inventory z auto-detekcją systemów (EU AI Act Compliance).
 * Ścieżka: /src/modules/compliance/components/AiInventoryAct.tsx
 */
import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Scale, Cpu, 
  Database, Plus, Grid, Tag, Check,
  FileText, Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { useTenant } from '../../../shared/hooks/useTenant';

interface BusinessProcess {
  id: string;
  tenantId: string;
  name: string;
  level: string; // L1, L2, L3
  parentId: string | null;
  description: string;
  status: string; // Active, Draft, Archived
}

interface AiSystem {
  id: string;
  tenantId: string;
  name: string;
  vendor: string;
  riskClassification: string; // Low, Medium, High, Unacceptable
  description: string;
  useCase: string;
  businessProcesses: string[];
  compliance: {
    rodo: boolean;
    itil: boolean;
    iso27001: boolean;
    fda21cfr11: boolean;
    euAiAct: boolean;
  };
  requirements: {
    techDocs: string; // Ready, Draft, Missing
    humanOversight: string;
    accuracy: string;
    transparency: string;
  };
}

export default function AiInventoryAct() {
  const { activeTenantId } = useTenant();
  
  const [activeTab, setActiveTab] = useState<'inventory' | 'processes' | 'frameworks'>('inventory');
  const [systems, setSystems] = useState<AiSystem[]>([]);
  const [processes, setProcesses] = useState<BusinessProcess[]>([]);

  // Modals
  const [isAddingSystem, setIsAddingSystem] = useState(false);
  const [isAddingProcess, setIsAddingProcess] = useState(false);

  useEffect(() => {
    if (!activeTenantId) return;

    // Fetch Ai Systems
    const qSys = query(collection(db, 'aiSystems'), where('tenantId', '==', activeTenantId), orderBy('createdAt', 'desc'));
    const unSys = onSnapshot(qSys, (snapshot) => {
      setSystems(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AiSystem)));
    });

    // Fetch Business Processes
    const qProc = query(collection(db, 'businessProcesses'), where('tenantId', '==', activeTenantId), orderBy('createdAt', 'desc'));
    const unProc = onSnapshot(qProc, (snapshot) => {
      setProcesses(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BusinessProcess)));
    });

    return () => {
      unSys();
      unProc();
    };
  }, [activeTenantId]);

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-3">
            <ShieldCheck className="text-indigo-600" />
            Compliance & Risk Management
          </h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Zgodność: AI Act, ISO 27001, RODO, ITIL, FDA 21 CFR 11</p>
        </div>
        <div className="flex gap-2">
          {['inventory', 'processes', 'frameworks'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as 'inventory' | 'processes' | 'frameworks')}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab 
                ? 'bg-slate-900 text-white shadow-xl' 
                : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-50'
              }`}
            >
              {tab === 'inventory' ? 'AI Systems' : tab === 'processes' ? 'Business Processes' : 'Frameworks & Certs'}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'inventory' && (
        <InventoryTab 
          systems={systems} 
          processes={processes}
          onAddSystem={() => setIsAddingSystem(true)} 
          tenantId={activeTenantId!}
          isAddingSystem={isAddingSystem}
          setIsAddingSystem={setIsAddingSystem}
        />
      )}

      {activeTab === 'processes' && (
        <ProcessesTab 
          processes={processes}
          onAddProcess={() => setIsAddingProcess(true)}
          tenantId={activeTenantId!}
          isAddingProcess={isAddingProcess}
          setIsAddingProcess={setIsAddingProcess}
        />
      )}

      {activeTab === 'frameworks' && (
        <FrameworksTab />
      )}
    </div>
  );
}

interface InventoryTabProps {
  systems: AiSystem[];
  processes: BusinessProcess[];
  onAddSystem: () => void;
  tenantId: string;
  isAddingSystem: boolean;
  setIsAddingSystem: (val: boolean) => void;
}

function InventoryTab({ systems, processes, onAddSystem, tenantId, isAddingSystem, setIsAddingSystem }: InventoryTabProps) {
  // New System State
  const [newSys, setNewSys] = useState<Partial<AiSystem>>({
    name: '', vendor: '', riskClassification: 'Low', description: '', useCase: '', businessProcesses: [],
    compliance: { rodo: false, itil: false, iso27001: false, fda21cfr11: false, euAiAct: false },
    requirements: { techDocs: 'Missing', humanOversight: 'Missing', accuracy: 'Missing', transparency: 'Missing' }
  });

  const handleSave = async () => {
    if(!newSys.name || !tenantId) return;
    try {
      await addDoc(collection(db, 'aiSystems'), {
        ...newSys,
        tenantId,
        createdAt: serverTimestamp()
      });
      setIsAddingSystem(false);
      setNewSys({
        name: '', vendor: '', riskClassification: 'Low', description: '', useCase: '', businessProcesses: [],
        compliance: { rodo: false, itil: false, iso27001: false, fda21cfr11: false, euAiAct: false },
        requirements: { techDocs: 'Missing', humanOversight: 'Missing', accuracy: 'Missing', transparency: 'Missing' }
      });
    } catch(e) {
      console.error(e);
      alert('Brak uprawnień lub błąd zapisu.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">AI Inventory Act</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Rejestr systemów AI (EU AI Act)</p>
        </div>
        <button onClick={onAddSystem} className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all flex items-center gap-2">
          <Plus size={16} /> Dodaj System AI
        </button>
      </div>

      <AnimatePresence>
        {isAddingSystem && (
           <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} exit={{opacity:0, height:0}} className="overflow-hidden">
              <div className="bg-white p-8 rounded-[2rem] border-2 border-indigo-100 shadow-xl mb-6">
                 <h4 className="text-lg font-black text-slate-900 uppercase italic mb-6">Nowy System AI</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nazwa Systemu / Modelu</label>
                      <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700" value={newSys.name} onChange={e=>setNewSys({...newSys, name: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Dostawca / Vendor</label>
                      <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700" value={newSys.vendor} onChange={e=>setNewSys({...newSys, vendor: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Klasyfikacja Ryzyka (AI Act)</label>
                      <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700" value={newSys.riskClassification} onChange={e=>setNewSys({...newSys, riskClassification: e.target.value})}>
                        <option value="Low">Mimalne / Brak (Low)</option>
                        <option value="Limited">Ograniczone (Limited)</option>
                        <option value="High">Wysokie Ryzyko (High)</option>
                        <option value="Unacceptable">Niedopuszczalne (Unacceptable)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Przypisane Procesy Biznesowe</label>
                      <select multiple className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 h-24 custom-scrollbar" value={newSys.businessProcesses} onChange={e=>{
                         const vals = Array.from(e.target.selectedOptions, option => option.value);
                         setNewSys({...newSys, businessProcesses: vals});
                      }}>
                         {processes.map((p: BusinessProcess) => (
                           <option key={p.id} value={p.id}>[{p.level}] {p.name}</option>
                         ))}
                      </select>
                    </div>
                 </div>
                 
                 <div className="mb-6">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Przypisane Normy i Standardy</label>
                    <div className="flex flex-wrap gap-4">
                       {Object.keys(newSys.compliance || {}).map((k) => (
                          <label key={k} className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 cursor-pointer hover:border-indigo-300">
                             <input type="checkbox" className="rounded" checked={(newSys.compliance as Record<string, boolean>)[k]} onChange={e => setNewSys({...newSys, compliance: {...newSys.compliance!, [k]: e.target.checked}})} />
                             <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">{k === 'rodo' ? 'RODO (GDPR)' : k === 'fda21cfr11' ? 'FDA 21 CFR 11' : k.toUpperCase()}</span>
                          </label>
                       ))}
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    {Object.keys(newSys.requirements || {}).map((k) => (
                       <div key={k}>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">{k.replace(/([A-Z])/g, ' $1')}</label>
                          <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-[11px] font-bold text-slate-700" value={(newSys.requirements as Record<string, string>)[k]} onChange={e => setNewSys({...newSys, requirements: {...newSys.requirements!, [k]: e.target.value}})}>
                             <option value="Missing">Brak (Missing)</option>
                             <option value="Draft">W przygotowaniu (Draft)</option>
                             <option value="Ready">Gotowe (Ready)</option>
                          </select>
                       </div>
                    ))}
                 </div>

                 <div className="flex justify-end gap-4">
                    <button onClick={() => setIsAddingSystem(false)} className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100">Anuluj</button>
                    <button onClick={handleSave} className="bg-slate-900 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center gap-2">
                      <ShieldCheck size={16} /> Zapisz Rejestr
                    </button>
                 </div>
              </div>
           </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-4">
        {systems.length === 0 ? (
           <div className="bg-slate-50 p-10 rounded-3xl border border-slate-100 text-center">
              <Cpu className="text-slate-300 mx-auto mb-4" size={40} />
              <p className="text-sm font-bold text-slate-500">Brak systemów AI w rejestrze.</p>
           </div>
        ) : (
          systems.map((sys: AiSystem) => (
            <div key={sys.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-6 hover:shadow-xl transition-all group">
               <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                     <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                        <Cpu size={24} />
                     </div>
                     <div>
                        <h4 className="text-lg font-black text-slate-900 italic tracking-tight">{sys.name}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{sys.vendor || 'Brak Vendora'} • {sys.businessProcesses.length} Podpiętych procesów</p>
                     </div>
                  </div>
                  
                  <div className="flex gap-2 mt-4 flex-wrap">
                     {sys.compliance.euAiAct && <span className="px-2 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded text-[9px] font-black uppercase tracking-widest">AI Act: YES</span>}
                     {sys.compliance.rodo && <span className="px-2 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded text-[9px] font-black uppercase tracking-widest">GDPR</span>}
                     {sys.compliance.iso27001 && <span className="px-2 py-1 bg-amber-50 text-amber-600 border border-amber-100 rounded text-[9px] font-black uppercase tracking-widest">ISO 27001</span>}
                     {sys.compliance.fda21cfr11 && <span className="px-2 py-1 bg-rose-50 text-rose-600 border border-rose-100 rounded text-[9px] font-black uppercase tracking-widest">FDA 21 CFR 11</span>}
                  </div>
               </div>

               <div className="md:w-64 border-l border-slate-100 pl-6 flex flex-col justify-center">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Klasyfikacja AI Act</div>
                  <div className="flex items-center gap-2">
                     {sys.riskClassification === 'Low' && <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold w-full text-center">Low Risk</span>}
                     {sys.riskClassification === 'Limited' && <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold w-full text-center">Limited Risk</span>}
                     {sys.riskClassification === 'High' && <span className="px-3 py-1 bg-rose-100 text-rose-800 rounded-full text-xs font-bold w-full text-center animate-pulse">High Risk</span>}
                     {sys.riskClassification === 'Unacceptable' && <span className="px-3 py-1 bg-red-600 text-white rounded-full text-xs font-bold w-full text-center">Unacceptable</span>}
                  </div>
               </div>

               <div className="md:w-64 border-l border-slate-100 pl-6 grid grid-cols-2 gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  <div className="col-span-2 text-[10px]">Wymagania</div>
                  <div className="flex items-center justify-between col-span-2">
                     <span>Docs:</span> <span className={sys.requirements.techDocs === 'Ready' ? 'text-emerald-500' : 'text-amber-500'}>{sys.requirements.techDocs}</span>
                  </div>
                  <div className="flex items-center justify-between col-span-2">
                     <span>Oversight:</span> <span className={sys.requirements.humanOversight === 'Ready' ? 'text-emerald-500' : 'text-amber-500'}>{sys.requirements.humanOversight}</span>
                  </div>
               </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

interface ProcessesTabProps {
  processes: BusinessProcess[];
  onAddProcess: () => void;
  tenantId: string;
  isAddingProcess: boolean;
  setIsAddingProcess: (val: boolean) => void;
}

function ProcessesTab({ processes, onAddProcess, tenantId, isAddingProcess, setIsAddingProcess }: ProcessesTabProps) {
  const [newProc, setNewProc] = useState<Partial<BusinessProcess>>({
    name: '', level: 'L1', parentId: null, description: '', status: 'Active'
  });

  const handleSave = async () => {
    if(!newProc.name || !tenantId) return;
    try {
      await addDoc(collection(db, 'businessProcesses'), {
        ...newProc,
        tenantId,
        createdAt: serverTimestamp()
      });
      setIsAddingProcess(false);
      setNewProc({ name: '', level: 'L1', parentId: null, description: '', status: 'Active' });
    } catch(e) {
      console.error(e);
      alert('Błąd zapisu procesu.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Business Process Mapping</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Architektura Procesów (L1, L2, L3)</p>
        </div>
        <button onClick={onAddProcess} className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all flex items-center gap-2">
          <Plus size={16} /> Dodaj Proces
        </button>
      </div>

      <AnimatePresence>
        {isAddingProcess && (
           <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} exit={{opacity:0, height:0}} className="overflow-hidden">
              <div className="bg-white p-8 rounded-[2rem] border-2 border-indigo-100 shadow-xl mb-6">
                 <h4 className="text-lg font-black text-slate-900 uppercase italic mb-6">Definiuj Proces Biznesowy</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nazwa Procesu</label>
                      <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700" value={newProc.name} onChange={e=>setNewProc({...newProc, name: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Poziom (Metodologia rynkowa)</label>
                      <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700" value={newProc.level} onChange={e=>setNewProc({...newProc, level: e.target.value})}>
                        <option value="L1">L1 - Mega Proces (Kategoria główna)</option>
                        <option value="L2">L2 - Proces Główny</option>
                        <option value="L3">L3 - Subproces / Aktywność</option>
                        <option value="L4">L4 - Zadanie / Procedura (Opcjonalnie)</option>
                      </select>
                    </div>
                 </div>
                 
                 <div className="flex justify-end gap-4 mt-6">
                    <button onClick={() => setIsAddingProcess(false)} className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100">Anuluj</button>
                    <button onClick={handleSave} className="bg-slate-900 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center gap-2">
                      <Grid size={16} /> Zapisz Proces
                    </button>
                 </div>
              </div>
           </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative">
         <div className="absolute top-0 right-0 p-8 opacity-5">
            <Grid size={100} />
         </div>
         {processes.length === 0 ? (
           <div className="text-center py-10 opacity-50">Brak zdefiniowanych procesów.</div>
         ) : (
           <div className="space-y-4">
             {['L1', 'L2', 'L3', 'L4'].map(lvl => {
               const procs = processes.filter((p: BusinessProcess) => p.level === lvl);
               if(procs.length === 0) return null;
               return (
                 <div key={lvl} className="mb-6">
                   <h5 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-slate-50 pb-2">
                     <Tag size={12} /> {lvl} Processes
                   </h5>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {procs.map((p: BusinessProcess) => (
                       <div key={p.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-start">
                         <div>
                           <div className="font-bold text-slate-800">{p.name}</div>
                           <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Status: {p.status}</div>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
               )
             })}
           </div>
         )}
      </div>
    </div>
  );
}

function FrameworksTab() {
  const frameworks = [
    { title: "EU AI Act", icon: Scale, color: "text-blue-600", bg: "bg-blue-50", desc: "Zgodność z unijnymi wymogami klasyfikacji ryzyka AI." },
    { title: "GDPR (RODO)", icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-50", desc: "Ochrona danych osobowych, DPA, Data Mapping, PII." },
    { title: "ISO 27001", icon: Shield, color: "text-amber-600", bg: "bg-amber-50", desc: "Standardy zarządzania bezpieczeństwem informacji." },
    { title: "ITIL 4", icon: Database, color: "text-indigo-600", bg: "bg-indigo-50", desc: "Zarządzanie usługami IT i support L1-L3." },
    { title: "FDA 21 CFR 11", icon: FileText, color: "text-rose-600", bg: "bg-rose-50", desc: "Podpisy elektroniczne i audyt trail dla Farmacji." },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {frameworks.map((fw, i) => (
        <div key={i} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:border-indigo-100 hover:shadow-xl transition-all cursor-default">
           <div className={`w-14 h-14 ${fw.bg} ${fw.color} rounded-2xl flex items-center justify-center mb-6`}>
              <fw.icon size={28} />
           </div>
           <h4 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter mb-2">{fw.title}</h4>
           <p className="text-xs font-bold text-slate-500 leading-relaxed mb-6">{fw.desc}</p>
           
           <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
             <Check size={14} className="text-emerald-500" /> Wbudowane w platformę
           </div>
        </div>
      ))}
    </div>
  );
}
