/**
 * Data: 2026-05-15
 * Utworzył: Agent AI
 * Opis: Punkt dostępowy publicznego / intranetowego widoku iFrame dla aktywnych ofert pracy.
 */
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../../shared/lib/firebase';
import { collection, query, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { Briefcase, Building2, ChevronRight, X, Coins } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../shared/lib/firestoreUtils';

export default function CareersIframeView() {
  const { configId } = useParams();
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [openings, setOpenings] = useState<any[]>([]);

  useEffect(() => {
    if (!configId) {
      setError('Brak identyfikatora konfiguracji.');
      setLoading(false);
      return;
    }

    const fetchConfig = async () => {
      try {
        const confDoc = await getDoc(doc(db, 'careersIframeConfigs', configId));
        if (!confDoc.exists()) {
          setError('Nie znaleziono konfiguracji.');
        } else {
          const cfg = confDoc.data();
          setConfig(cfg);

          if (cfg.tenantId) {
             const unTop = onSnapshot(doc(db, 'hrSettings', cfg.tenantId + '_recruitments'), (docSnap) => {
               if (docSnap.exists()) {
                 const data = docSnap.data();
                 const offers = (data.openPositions || []).filter((o: any) => o.status === 'Otwarta');
                 setOpenings(offers);
               }
             });
             return () => unTop();
          }
        }
        setLoading(false);
      } catch (err) {
        setLoading(false);
        setError('Błąd ładowania danych: ' + (err as Error).message);
      }
    };

    fetchConfig();
  }, [configId]);

  if (loading) return <div className="h-screen w-full flex items-center justify-center font-bold text-slate-400 font-sans">Ładowanie widoku ofert pracy...</div>;
  if (error) return <div className="h-screen w-full flex items-center justify-center font-bold text-red-500 bg-red-50 font-sans p-8 text-center">{error}</div>;
  if (!config) return null;

  const brandColor = config.brandColor || '#10b981';
  const fStyle = config.brandFont === 'serif' ? 'font-serif' : config.brandFont === 'mono' ? 'font-mono' : 'font-sans';
  const isGrid = config.layoutStyle === 'grid';

  return (
    <div className={`w-full min-h-screen bg-slate-50 p-6 sm:p-8 ${fStyle}`}>
       <div className="max-w-6xl mx-auto">
          <div className="mb-8 p-6 bg-white border border-slate-200 rounded-3xl shadow-sm text-center">
             <h2 className="text-3xl font-black text-slate-800 tracking-tighter mb-2" style={{ color: brandColor }}>Dołącz do nas</h2>
             <p className="text-slate-500 font-medium max-w-2xl mx-auto">Sprawdź otwarte pozycje i rozwijaj swoją karierę w nowoczesnym środowisku pracy.</p>
          </div>

          {openings.length === 0 ? (
             <div className="text-center py-20 bg-white border border-dashed border-slate-300 rounded-3xl">
                <Briefcase size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="font-bold text-slate-500 text-lg">Aktualnie nie prowadzimy nowych rekrutacji.</p>
                <p className="text-sm text-slate-400 mt-2">Wróć tu za jakiś czas!</p>
             </div>
          ) : (
             <div className={isGrid ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-4"}>
                {openings.map((offer) => (
                   <div key={offer.id} className="bg-white rounded-2xl border border-slate-200 p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: brandColor }}></div>

                      <div className="flex justify-between items-start mb-4">
                         <h3 className="text-xl font-bold tracking-tight text-slate-800 group-hover:text-slate-900 transition-colors">{offer.title}</h3>
                         <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest shrink-0">Otwarta</div>
                      </div>

                      {config.showDepartment && offer.department && (
                         <div className="flex items-center gap-2 text-slate-600 text-sm font-medium mb-2">
                            <Building2 size={16} className="opacity-50" />
                            <span>Dz. {offer.department.name || offer.department.code || 'Brak'}</span>
                         </div>
                      )}

                      {config.showSalary && (
                         <div className="flex items-center gap-2 text-slate-600 text-sm font-medium mb-2">
                            <Coins size={16} className="opacity-50" />
                            <span>Zgodne z taryfikatorem HR</span>
                         </div>
                      )}

                      {config.showDescription && (
                         <p className="text-slate-500 text-sm leading-relaxed mt-4 line-clamp-3">
                           Szukamy osoby zorientowanej na rezultaty, potrafiącej samodzielnie koordynować obszary oraz dbać o wysoką jakość procesów w firmie.
                         </p>
                      )}

                      <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
                         <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Wakatów: <span className="text-slate-700">{offer.spots || 1}</span></div>
                         <button className="flex items-center gap-2 font-bold text-sm transition-colors rounded-xl px-4 py-2 hover:bg-slate-50" style={{ color: brandColor }}>
                            Aplikuj <ChevronRight size={16} />
                         </button>
                      </div>
                   </div>
                ))}
             </div>
          )}
       </div>
    </div>
  );
}
