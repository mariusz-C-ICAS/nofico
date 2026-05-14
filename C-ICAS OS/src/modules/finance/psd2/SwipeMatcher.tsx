/**
 * Data: 2026-05-12
 * Zmiany: Interfejs "Swipe & Match" do szybkiej kategoryzacji wydatków.
 * Ścieżka: /src/modules/finance/psd2/SwipeMatcher.tsx
 */
import React, { useState, useEffect } from 'react';
import { 
  Heart, X, ArrowLeft, ArrowRight, 
  Briefcase, ShieldCheck,
  Sparkles, Check, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, addDoc, serverTimestamp, onSnapshot, orderBy } from 'firebase/firestore';
import { useAuth } from '../../../shared/hooks/AuthContext';
import * as LucideIcons from 'lucide-react';

interface CardData {
  id: string;
  amount: number;
  counterpart: string;
  category: string;
  date: string;
  title: string;
}

interface TransactionCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

const DEFAULT_CATEGORIES: TransactionCategory[] = [
  { id: '1', name: 'Software/Cloud', icon: 'Cloud', color: 'bg-indigo-500' },
  { id: '2', name: 'Podróże Służbowe', icon: 'Building2', color: 'bg-emerald-500' },
  { id: '3', name: 'Materiały Biurowe', icon: 'ShoppingCart', color: 'bg-amber-500' },
  { id: '4', name: 'Marketing', icon: 'Sparkles', color: 'bg-rose-500' },
];

export default function SwipeMatcher() {
  const { userData, activeTenantId } = useAuth();
  const [categories, setCategories] = useState<TransactionCategory[]>(DEFAULT_CATEGORIES);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Briefcase');
  const [newCatColor, setNewCatColor] = useState('bg-slate-800');
  
  useEffect(() => {
    const q = query(collection(db, 'transactionCategories'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const customCategories = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TransactionCategory[];
      
      // Merge with defaults, ensuring no duplicates by name
      const allCats = [...DEFAULT_CATEGORIES];
      for (const cust of customCategories) {
        if (!allCats.find(c => c.name === cust.name)) {
          allCats.push(cust);
        }
      }
      setCategories(allCats);
    });
    return () => unsubscribe();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName || !activeTenantId) return;
    
    try {
      await addDoc(collection(db, 'transactionCategories'), {
        createdByTenantId: activeTenantId,
        name: newCategoryName,
        icon: newCatIcon,
        color: newCatColor,
        createdAt: serverTimestamp()
      });
      setNewCategoryName('');
      setNewCatIcon('Briefcase');
      setNewCatColor('bg-slate-800');
      setIsAddingCategory(false);
    } catch (err) {
      console.error('Error adding category:', err);
    }
  };

  const [cards, setCards] = useState<CardData[]>([
    { id: '1', amount: -42.50, counterpart: 'MICROSOFT IRELAND', category: 'Software/Cloud', date: '2026-05-10', title: 'AZURE USAGE' },
    { id: '2', amount: -65.00, counterpart: 'UBER POLSKA', category: 'Podróże Służbowe', date: '2026-05-09', title: 'PRZEJAZD DO KLIENTA' },
    { id: '3', amount: -1200.00, counterpart: 'IKEA KATOWICE', category: 'Materiały Biurowe', date: '2026-05-08', title: 'BIURKO DO BIURA' },
  ]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<null | 'left' | 'right'>(null);

  const activeCard = cards[activeIndex];

  const handleSwipe = (dir: 'left' | 'right') => {
    setDirection(dir);
    setTimeout(() => {
      setDirection(null);
      if (activeIndex < cards.length - 1) {
        setActiveIndex(prev => prev + 1);
      } else {
        // All cards swiped
        setActiveIndex(cards.length);
      }
    }, 400);
  };

  if (activeIndex >= cards.length) {
    return (
      <div className="h-[600px] flex flex-col items-center justify-center text-center animate-in zoom-in-95">
         <div className="w-40 h-40 bg-emerald-50 rounded-full flex items-center justify-center mb-10 shadow-xl shadow-emerald-100 border border-emerald-100">
            <Check className="text-emerald-500" size={64} strokeWidth={4} />
         </div>
         <h3 className="text-4xl font-black text-slate-900 uppercase italic mb-4">Wszystko Sprawdzone!</h3>
         <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-relaxed max-w-sm">
            Twoja kolejka transakcji jest pusta. <br />AI NoFiCo automatycznie zadekretuje te wydatki w Księdze Głównej.
         </p>
         <button 
           onClick={() => setActiveIndex(0)}
           className="mt-12 bg-slate-900 text-white px-10 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-2xl shadow-slate-100"
         >
            Zacznij od NOWA (Demo)
         </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto h-[700px] flex flex-col relative py-10">
      <div className="flex justify-between items-center mb-10 px-6 relative z-30">
         <div>
            <h4 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-2">
              Swipe & Match 
              {userData?.role === 'admin' && (
                <button onClick={() => setIsAddingCategory(true)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-indigo-100 transition-colors text-slate-500 hover:text-indigo-600">
                  <Sparkles size={14} />
                </button>
              )}
            </h4>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kategoryzuj wydatki firmowe</div>
         </div>
         <div className="bg-slate-900 text-white w-12 h-12 rounded-2xl flex items-center justify-center font-black italic shadow-xl">
            {cards.length - activeIndex}
         </div>
      </div>

      <AnimatePresence>
        {isAddingCategory && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute inset-0 z-50 bg-white/90 backdrop-blur-md flex flex-col p-6"
          >
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Baza Kategorii</h3>
              <button onClick={() => setIsAddingCategory(false)} className="p-2 border border-slate-200 rounded-full bg-white"><X size={16}/></button>
            </div>
            
            <form onSubmit={handleCreateCategory} className="mb-8 p-4 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-100">
              <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Plus size={14}/> Dodaj do Globalnej Bazy</div>
              
              <input 
                type="text" 
                placeholder="Nazwa Kategorii (np. Reklama, Serwery...)" 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 mb-4"
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
              />

              <div className="flex gap-2 mb-6">
                <div className="flex-1">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Ikona</div>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none appearance-none cursor-pointer"
                    id="newCatIcon"
                    value={newCatIcon}
                    onChange={(e) => setNewCatIcon(e.target.value)}
                  >
                    <option value="Briefcase">Aktówka (Biznes)</option>
                    <option value="Coffee">Kawa (Spotkania)</option>
                    <option value="Globe">Globus (Usługi Online)</option>
                    <option value="Zap">Piorun (Energia)</option>
                    <option value="Truck">Ciężarówka (Logistyka)</option>
                    <option value="Monitor">Monitor (IT)</option>
                  </select>
                </div>
                <div className="flex-1">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Kolor</div>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none appearance-none cursor-pointer"
                    id="newCatColor"
                    value={newCatColor}
                    onChange={(e) => setNewCatColor(e.target.value)}
                  >
                    <option value="bg-slate-800">Ciemny (Slate)</option>
                    <option value="bg-indigo-500">Fioletowy (Indigo)</option>
                    <option value="bg-emerald-500">Zielony (Emerald)</option>
                    <option value="bg-rose-500">Czerwony (Rose)</option>
                    <option value="bg-amber-500">Pomarańczowy (Amber)</option>
                    <option value="bg-cyan-500">Błękitny (Cyan)</option>
                  </select>
                </div>
              </div>

              <button type="submit" disabled={!newCategoryName} className="w-full bg-slate-900 text-white font-black italic uppercase tracking-widest py-4 rounded-xl disabled:opacity-50 transition-all hover:bg-slate-800 active:scale-[0.98]">
                Opublikuj Kategorię
              </button>
            </form>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
               {categories.map(cat => {
                 const IconCmp = (LucideIcons as any)[cat.icon] || Briefcase;
                 return (
                   <div key={cat.id} className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100">
                     <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${cat.color}`}>
                       <IconCmp size={16} />
                     </div>
                     <span className="font-bold text-slate-700">{cat.name}</span>
                   </div>
                 )
               })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative flex-1 px-4 cursor-grab active:cursor-grabbing">
         <AnimatePresence mode="wait">
            <motion.div
              key={activeCard.id}
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ 
                scale: 1, 
                opacity: 1, 
                y: 0,
                x: direction === 'left' ? -500 : direction === 'right' ? 500 : 0,
                rotate: direction === 'left' ? -20 : direction === 'right' ? 20 : 0,
                transition: { type: 'spring', damping: 25, stiffness: 400 }
              }}
              className="absolute inset-0 bg-white rounded-[4rem] shadow-2xl border-2 border-slate-50 p-10 flex flex-col overflow-hidden"
            >
               {/* Label Indicators */}
               {direction === 'left' && (
                 <div className="absolute top-10 right-10 z-20 border-4 border-rose-500 rounded-2xl px-6 py-2 rotate-12 bg-white shadow-xl">
                   <span className="text-2xl font-black text-rose-500 uppercase italic">Prywatne</span>
                 </div>
               )}
               {direction === 'right' && (
                 <div className="absolute top-10 left-10 z-20 border-4 border-emerald-500 rounded-2xl px-6 py-2 -rotate-12 bg-white shadow-xl">
                   <span className="text-2xl font-black text-emerald-500 uppercase italic">Firmowe</span>
                 </div>
               )}

               <div className="bg-slate-50 -mx-10 -mt-10 p-10 flex flex-col items-center justify-center mb-10 border-b border-slate-100">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-4 py-1.5 bg-white rounded-full border border-slate-100 italic">Sugestia AI: {activeCard.category}</div>
                  <div className="text-5xl font-black text-slate-900 italic tracking-tighter mb-2">
                     {Math.abs(activeCard.amount).toLocaleString('pl-PL', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic tracking-widest">PLN</div>
               </div>

               <div className="flex-1 space-y-8">
                  <div>
                     <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Kontrahent</div>
                     <div className="text-xl font-black text-slate-900 uppercase italic leading-tight tracking-tight">{activeCard.counterpart}</div>
                  </div>
                  <div>
                     <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Tytuł operacji</div>
                     <p className="text-xs font-bold text-slate-500 uppercase leading-relaxed tracking-tight italic">{activeCard.title}</p>
                  </div>
                  <div className="flex items-center gap-4 pt-4 border-t border-slate-50">
                     {(() => {
                       const matchedCat = categories.find(c => c.name === activeCard.category) || categories[0];
                       const IconCmp = (LucideIcons as any)[matchedCat.icon] || Sparkles;
                       return (
                         <>
                           <div className={`w-10 h-10 ${matchedCat.color} rounded-xl flex items-center justify-center text-white shadow-lg`}>
                              <IconCmp size={20} />
                           </div>
                           <div>
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Kategoria Kosztu</div>
                              <div className="text-[11px] font-black text-slate-900 uppercase italic tracking-tight">{activeCard.category}</div>
                           </div>
                         </>
                       );
                     })()}
                  </div>
               </div>

               <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-10 italic flex items-center justify-center gap-2">
                  <ShieldCheck size={12} /> Zabezpieczono przez NoFiCo AI Engine V5
               </div>
            </motion.div>
         </AnimatePresence>
      </div>

      <div className="flex justify-center items-center gap-8 mt-12 px-6">
         <button 
           onClick={() => handleSwipe('left')}
           className="w-20 h-20 rounded-full bg-white border-2 border-slate-100 flex items-center justify-center text-rose-500 shadow-xl hover:scale-110 active:scale-95 transition-all group"
         >
            <X size={32} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
         </button>
         <button 
           onClick={() => handleSwipe('right')}
           className="w-24 h-24 rounded-full bg-slate-900 border-8 border-white flex items-center justify-center text-emerald-400 shadow-[0_20px_50px_rgba(0,0,0,0.15)] hover:scale-110 active:scale-95 transition-all group"
         >
            <Heart size={40} fill="currentColor" strokeWidth={0} className="group-hover:animate-pulse" />
         </button>
      </div>

      <div className="mt-8 text-center">
         <div className="flex justify-center gap-4 text-[9px] font-black text-slate-300 uppercase tracking-widest italic">
            <span className="flex items-center gap-1"><ArrowLeft size={10} /> Prywatne</span>
            <span>|</span>
            <span className="flex items-center gap-1">Firmowe <ArrowRight size={10} /></span>
         </div>
      </div>
    </div>
  );
}
