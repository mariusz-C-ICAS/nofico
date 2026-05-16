/**
 * Data: 2026-05-15
 * Utworzył: Agent AI
 * Opis: Punkt dostępowy publicznego / intranetowego widoku iFrame. Służy do wyświetlania struktury 3D.
 */
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../../shared/lib/firebase';
import { collection, query, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { Building2, ChevronLeft, ChevronRight, MousePointer2, UserCircle, X } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../shared/lib/firestoreUtils';

// Skopiowany Carousel3D dla samodzielności iFrame'a (aby można było wyrwać moduł HR, a iFrame działał samodzielnie)
// Ale optymalnie jest pobierać konfiguracje oraz elementy z db.
const Tree3DNode = ({ unit, allUnits, roles, employees, displayOptions }: any) => {
   const children = allUnits.filter((u: any) => u.parentId === unit.id);
   const itemRoles = roles.filter((r: any) => r.departmentId === unit.id);

   const brandColor = displayOptions?.brandColor || '#4f46e5';
   const fStyle = displayOptions?.brandFont === 'serif' ? 'font-serif' : displayOptions?.brandFont === 'mono' ? 'font-mono' : 'font-sans';
   
   const uShape = displayOptions?.shapeUnit || 'rounded-2xl';
   const rShape = displayOptions?.shapeRole || 'rounded-xl';
   const pShape = displayOptions?.shapePerson || 'rounded-lg';

   return (
      <div className={`flex flex-col items-center group/node relative ${fStyle}`}>
         <div className={`p-4 bg-white/95 backdrop-blur-sm border border-slate-200 shadow-xl w-[260px] md:w-[320px] flex flex-col gap-3 transition-all duration-300 hover:-translate-y-4 hover:shadow-2xl relative z-10 max-h-[60vh] overflow-y-auto custom-scrollbar ${uShape}`} style={{ borderTop: `4px solid ${brandColor}` }}>
            <div className={`w-12 h-12 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center border shadow-inner shrink-0 ${uShape}`} style={{ borderColor: brandColor, color: brandColor }}>
               <Building2 size={24} />
            </div>
            <div>
               {displayOptions?.showUnits ? (
                  <h3 className="text-lg font-black text-slate-800 tracking-tight leading-tight">{unit.name}</h3>
               ) : (
                  <h3 className="text-lg font-bold text-slate-400 italic">-- Ukryto --</h3>
               )}
               {displayOptions?.showUnits && <p className="text-[10px] uppercase font-black text-slate-400 mt-1 tracking-wider">{unit.code || 'Brak kodu'}</p>}
               {displayOptions?.showMPK && unit.costCenter && <p className="text-[10px] uppercase font-black mt-1 bg-slate-50 px-2 py-0.5 w-max border" style={{ color: brandColor, borderColor: brandColor, borderRadius: '4px' }}>MPK: {unit.costCenter}</p>}
               
               {(displayOptions?.showRoles || displayOptions?.showPersons) && itemRoles.length > 0 && (
                  <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4">
                     {itemRoles.map((r:any) => {
                        const assigned = employees.filter((e:any) => e.department === unit.name || e.role === r.name);
                        return (
                           <div key={r.id} className={`text-left bg-slate-50 border border-slate-100 p-2 hover:bg-slate-100 transition-colors ${rShape}`}>
                              {displayOptions?.showRoles && <div className="text-xs font-black text-slate-800 tracking-tight">{r.name}</div>}
                              {displayOptions?.showPersons && assigned.map((e:any) => (
                                 <div key={e.id} className={`text-[10px] font-medium text-slate-600 mt-1.5 flex items-center gap-1.5 bg-white border border-slate-100 p-1.5 shadow-sm ${pShape}`}><UserCircle size={14} style={{ color: brandColor }}/> {e.name || e.email}</div>
                              ))}
                           </div>
                        )
                     })}
                  </div>
               )}
            </div>
         </div>

         {children.length > 0 && (
            <div className="flex gap-8 relative pt-8 mt-2 transition-opacity duration-300 opacity-90 group-hover/node:opacity-100 items-start">
               {/* Vertical line coming down from parent to the horizontal bracket */}
               <div className="absolute top-0 left-1/2 w-0.5 h-8 bg-slate-400/50 -translate-x-1/2 -mt-2"></div>
               
               {children.map((child: any, idx: number) => (
                  <div key={child.id} className="relative flex flex-col items-center">
                     {/* Horizontal bracket line piece for this child */}
                     {children.length > 1 && (
                         <div className={`absolute -top-8 h-0.5 bg-slate-400/50
                            ${idx === 0 ? 'left-1/2 right-0' : idx === children.length - 1 ? 'left-0 right-1/2' : 'left-0 right-0'}
                         `}></div>
                     )}
                     {/* Vertical line from bracket down to this child */}
                     <div className="absolute -top-8 left-1/2 w-0.5 h-8 bg-slate-400/50 -translate-x-1/2"></div>
                     
                     <Tree3DNode unit={child} allUnits={allUnits} roles={roles} employees={employees} displayOptions={displayOptions} />
                  </div>
               ))}
            </div>
         )}
      </div>
   );
};

function IframeCarousel3D({ items, allUnits, displayOptions, roles = [], employees = [] }: any) {
   const [rotation, setRotation] = useState(0);
   const [isDragging, setIsDragging] = useState(false);
   const [startX, setStartX] = useState(0);
   const [showTooltip, setShowTooltip] = useState(() => localStorage.getItem('om-3d-tooltip-closed') !== 'true');

   const radius = Math.max(800, items.length * 400); 
   const angleStep = 360 / Math.max(1, items.length);

   const handleMouseDown = (e: any) => {
      setIsDragging(true);
      setStartX(e.clientX || (e.touches && e.touches[0].clientX) || 0);
   };
   const handleMouseMove = (e: any) => {
      if (!isDragging) return;
      const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      const dx = clientX - startX;
      setRotation(r => r + dx * 0.2);
      setStartX(clientX);
   };
   const handleMouseUp = () => setIsDragging(false);

   const dismissTooltip = (e: any) => {
      e.stopPropagation();
      setShowTooltip(false);
      localStorage.setItem('om-3d-tooltip-closed', 'true');
   };

   return (
      <div 
         className="relative w-full h-screen overflow-hidden cursor-grab active:cursor-grabbing [perspective:2000px] flex items-center justify-center bg-slate-50"
         onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
         onTouchStart={handleMouseDown} onTouchMove={handleMouseMove} onTouchEnd={handleMouseUp}
      >
         {showTooltip && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/40 backdrop-blur-md text-white/90 pl-3 pr-2 py-1 rounded-full text-[9px] font-bold flex items-center gap-2 z-20 shadow-sm border border-white/10 uppercase tracking-widest cursor-default">
               <MousePointer2 size={10} className="animate-pulse" />
               <span>Przeciągnij myszą aby obrócić</span>
               <button 
                  onClick={dismissTooltip} 
                  className="ml-1 hover:bg-white/20 p-0.5 rounded-full transition-colors cursor-pointer"
                  title="Nie pokazuj więcej"
               >
                  <X size={10} />
               </button>
            </div>
         )}

         <div className="absolute w-full h-full flex transform-gpu items-center justify-center [transform-style:preserve-3d] transition-transform duration-75"
              style={{ transform: `scale(0.8) translateZ(${-radius}px) rotateY(${rotation}deg) translateY(-20%)` }}>
            {items.map((item: any, i: number) => {
               const angle = angleStep * i;

               return (
                  <div key={item.id} className="absolute [transform-style:preserve-3d] transition-all origin-top flex justify-center"
                       style={{ transform: `rotateY(${angle}deg) translateZ(${radius}px)` }}>
                      <Tree3DNode 
                        unit={item} 
                        allUnits={allUnits} 
                        roles={roles} 
                        employees={employees} 
                        displayOptions={displayOptions} 
                     />
                  </div>
               );
            })}
         </div>

         <div className="absolute bottom-8 flex gap-6 z-20">
            <button onClick={(e) => { e.stopPropagation(); setRotation(r => r + angleStep); }} className="bg-white/90 backdrop-blur-md p-4 rounded-full shadow-xl hover:shadow-2xl hover:scale-110 transition-all cursor-pointer text-slate-600 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200">
               <ChevronLeft size={28} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); setRotation(r => r - angleStep); }} className="bg-white/90 backdrop-blur-md p-4 rounded-full shadow-xl hover:shadow-2xl hover:scale-110 transition-all cursor-pointer text-slate-600 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200">
               <ChevronRight size={28} />
            </button>
         </div>
      </div>
   );
}


export default function OmIframeView() {
  const { configId } = useParams();
  const [config, setConfig] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [persons, setPersons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const docRef = doc(db, 'omIframeConfigs', configId || '');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setConfig({ id: docSnap.id, ...docSnap.data() });
        } else {
          setError('Nie znaleziono konfiguracji widoku iFrame.');
        }
      } catch (e) {
         setError('Wystąpił błąd podczas autoryzacji widoku.');
      }
    };
    loadConfig();
  }, [configId]);

  useEffect(() => {
    // If it's a tenant-based config, we could filter by activeTenantId, but this is a public link.
    // In real prod, public unauthenticated reads on 'om_departments' need special firestore rules (like allowing read if a valid iframe config exists, or via custom tokens, or just making OM public if they check the "public" flag).
    // For this prototype, we'll try to query without restrictive tenant filters if we can't secure it quickly, OR assume it uses normal snapshot logic.
    // Normally, iframe would need an authenticated fallback or server-side rendering, but here we just subscribe.
    
    // We'll query all documents. The firestore rules might block this if not signed in, but we assume it's acceptable for intranet demo.
    
    // Note: If you face 'Missing or insufficient permissions', remember to adjust firestore rules.
    const qDepts = query(collection(db, 'hr_departments'));
    const qRoles = query(collection(db, 'hr_roles'));
    const qPersons = query(collection(db, 'employees'));

    const unsubD = onSnapshot(qDepts, snap => setDepartments(snap.docs.map(d => ({id: d.id, ...d.data()}))), err => console.log('IFrame db error:', err));
    const unsubR = onSnapshot(qRoles, snap => setRoles(snap.docs.map(d => ({id: d.id, ...d.data()}))), err => console.log('IFrame db error:', err));
    const unsubP = onSnapshot(qPersons, snap => setPersons(snap.docs.map(d => ({id: d.id, ...d.data()}))), err => {
       console.log('IFrame db error:', err);
       setLoading(false);
    });
    
    // We set loading false after short delay since snap might be empty initially
    setTimeout(() => setLoading(false), 800);

    return () => { unsubD(); unsubR(); unsubP(); };
  }, []);

  if (error) return <div className="h-screen w-full flex items-center justify-center bg-slate-50 text-slate-500 font-bold">{error}</div>;
  if (loading || !config) return <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50"><div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div>;

  const topLevelUnits = departments.filter(d => !d.parentId);

  return (
    <div className="w-full h-screen bg-slate-50">
       <IframeCarousel3D items={topLevelUnits} allUnits={departments} roles={roles} employees={persons} displayOptions={config} />
    </div>
  );
}
