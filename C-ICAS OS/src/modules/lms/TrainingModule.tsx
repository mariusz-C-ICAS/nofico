import React, { useState, useEffect } from 'react';
import { db } from '../../shared/lib/firebase';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../shared/hooks/AuthContext';
import { 
  BookOpen, Award, CheckCircle, HelpCircle, FileText, 
  Lock, Sparkles, PlusCircle, Bookmark, PlayCircle, 
  GraduationCap, FileCheck, Search, ChevronRight, Clock,
  Trophy, Lightbulb, Info
} from 'lucide-react';

export default function TrainingModule() {
  const { userData } = useAuth();
  const [activeTab, setActiveTab] = useState<'courses' | 'faq' | 'exams'>('courses');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Simulation states
  const [examStarted, setExamStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const mockCourses = [
    { id: '1', title: 'BHP na wysokościach', category: 'Bezpieczeństwo', status: 'Wymagane', duration: '2h', progress: 0, icon: <Lock className="text-red-500" /> },
    { id: '2', title: 'Obsługa Koparki Volvo 2026', category: 'Maszyny', status: 'Ukończone', duration: '4h', progress: 100, icon: <CheckCircle className="text-emerald-500" /> },
    { id: '3', title: 'Social Selling w Budownictwie', category: 'Soft-Skills', status: 'Opcjonalne', duration: '1.5h', progress: 45, icon: <PlayCircle className="text-blue-500" /> },
    { id: '4', title: 'Pierwsza Pomoc (Urazowa)', category: 'Medyczne', status: 'Wymagane', duration: '3h', progress: 10, icon: <AlertCircle className="text-orange-500" /> }
  ];

  const examQuestions = [
    { q: "Jakie jest maksymalne dopuszczalne obciążenie spocznika?", a: ["200 kg", "500 kg", "Zależne od projektu", "1000 kg"] },
    { q: "Kto wydaje zgodę na pracę w strefie niebezpiecznej?", a: ["Kierownik budowy", "AI Assistant", "Inwestor", "Dowolny pracownik"] }
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-black rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
         <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500 opacity-20 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
         <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="max-w-xl text-center md:text-left">
               <h1 className="text-3xl md:text-5xl font-black tracking-tighter mb-4 leading-none uppercase italic">Akademia <span className="text-indigo-400">C-ICAS Elite</span></h1>
               <p className="text-slate-400 font-medium text-sm md:text-lg">Twoje centrum rozwoju, certyfikacji i bazy wiedzy. Podnoś kwalifikacje i zdobywaj odznaki potwierdzające profesjonalizm.</p>
            </div>
            <div className="flex gap-4">
               <div className="bg-white/10 backdrop-blur-xl p-4 rounded-2xl border border-white/10 text-center">
                  <Trophy className="text-amber-400 mx-auto mb-1" />
                  <div className="text-xl font-black">12</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Odznaki</div>
               </div>
               <div className="bg-white/10 backdrop-blur-xl p-4 rounded-2xl border border-white/10 text-center">
                  <GraduationCap className="text-indigo-400 mx-auto mb-1" />
                  <div className="text-xl font-black">3</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Certyfikaty</div>
               </div>
            </div>
         </div>

         <div className="mt-8 flex bg-white/5 p-1 rounded-2xl w-fit backdrop-blur-md border border-white/10">
            <button onClick={() => setActiveTab('courses')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'courses' ? 'bg-white text-indigo-900 shadow-xl' : 'text-slate-300 hover:text-white'}`}>Kursy</button>
            <button onClick={() => setActiveTab('exams')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'exams' ? 'bg-white text-indigo-900 shadow-xl' : 'text-slate-300 hover:text-white'}`}>EGZAMINY</button>
            <button onClick={() => setActiveTab('faq')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'faq' ? 'bg-white text-indigo-900 shadow-xl' : 'text-slate-300 hover:text-white'}`}>BAZA WIEDZY</button>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar / Categories */}
        <div className="lg:col-span-1 space-y-6">
           <div className="bg-white p-6 rounded-2xl border border-slate-200">
              <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest mb-4 border-b pb-2">Kategorie Wiedzy</h3>
              <div className="space-y-1">
                 {['Bezpieczeństwo (BHP)', 'Technologia & Maszyny', 'Procedury Firmowe', 'Prawo i Finanse', 'Soft-Skills'].map(cat => (
                   <button key={cat} className="w-full text-left p-3 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center justify-between group transition-all">
                      {cat}
                      <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                   </button>
                 ))}
              </div>
           </div>

           <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                 <Sparkles className="text-indigo-600" size={24} />
                 <h4 className="font-black text-indigo-900 uppercase text-[10px] tracking-widest">AI Tutor (Aktywny)</h4>
              </div>
              <p className="text-xs text-indigo-800/70 font-medium leading-relaxed mb-4">
                "Cześć! Widzę, że nie ukończyłeś jeszcze modułu o zabezpieczaniu terenu budowy. Chcesz szybkie streszczenie 2-minutowe?"
              </p>
              <button className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors">Rozmawiaj z AI</button>
           </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
           {activeTab === 'courses' && (
              <div className="space-y-4">
                 <div className="relative mb-6">
                   <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
                   <input 
                     value={searchQuery}
                     onChange={e => setSearchQuery(e.target.value)}
                     className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none shadow-sm focus:border-indigo-500 transition-all font-medium" 
                     placeholder="Wyszukaj kurs, tag lub procedurę w bazie..." 
                   />
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {mockCourses.map(course => (
                      <div key={course.id} className="bg-white border border-slate-200 p-5 rounded-2xl group hover:border-indigo-500 hover:shadow-xl transition-all cursor-pointer">
                         <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                               <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                                  {course.icon}
                               </div>
                               <div>
                                  <div className="text-xs font-black text-slate-800 uppercase tracking-tight">{course.title}</div>
                                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{course.category}</div>
                               </div>
                            </div>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${course.status === 'Wymagane' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                               {course.status}
                            </span>
                         </div>
                         
                         <div className="flex items-center gap-4 mb-4">
                            <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                               <div className="bg-indigo-600 h-full transition-all" style={{ width: `${course.progress}%` }}></div>
                            </div>
                            <span className="text-[10px] font-black text-slate-500 uppercase">{course.progress}%</span>
                         </div>

                         <div className="flex justify-between items-center pt-2 border-t border-slate-50 italic text-[10px] font-medium text-slate-400">
                            <div className="flex items-center gap-1"><Clock size={12}/> {course.duration}</div>
                            <div className="uppercase font-black text-indigo-600 group-hover:translate-x-1 transition-transform">Rozpocznij model {course.id} &rarr;</div>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
           )}

           {activeTab === 'exams' && (
              <div className="bg-white p-8 rounded-3xl border border-slate-200">
                 {!examStarted ? (
                    <div className="text-center py-12">
                       <FileCheck size={48} className="mx-auto text-indigo-600 mb-4" />
                       <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-2">Gotowy na Egzamin?</h3>
                       <p className="text-slate-500 text-sm max-w-sm mx-auto mb-8">Uruchamiasz certyfikację: <b>BHP 2026</b>. Masz 20 minut i musisz uzyskać min. 80% aby otrzymać odznakę Elite.</p>
                       <button onClick={() => setExamStarted(true)} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-black shadow-2xl transition-all">Rozpocznij Certyfikację</button>
                    </div>
                 ) : (
                    <div className="space-y-8">
                       <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">
                          <span>Pytanie {currentQuestion + 1} z {examQuestions.length}</span>
                          <span className="text-red-500 animate-pulse">Pozostało: 14:58</span>
                       </div>
                       <h4 className="text-xl font-bold text-slate-800">{examQuestions[currentQuestion].q}</h4>
                       <div className="grid grid-cols-1 gap-3">
                          {examQuestions[currentQuestion].a.map((opt, idx) => (
                             <button key={idx} onClick={() => currentQuestion < examQuestions.length - 1 ? setCurrentQuestion(v => v + 1) : setExamStarted(false)} className="w-full text-left p-4 border border-slate-200 rounded-2xl hover:bg-slate-50 hover:border-indigo-500 transition-all font-medium text-slate-700">
                                {opt}
                             </button>
                          ))}
                       </div>
                    </div>
                 )}
              </div>
           )}

           {activeTab === 'faq' && (
              <div className="space-y-6">
                 <div className="bg-amber-900 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
                    <div className="absolute right-0 top-0 p-8 opacity-10"><Lightbulb size={120} /></div>
                    <h3 className="text-xl font-black uppercase tracking-widest mb-4">Firmowa Biblia Procedur</h3>
                    <div className="relative">
                       <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
                       <input className="w-full pl-12 pr-4 py-4 bg-white/10 rounded-2xl outline-none placeholder:text-white/40 font-medium" placeholder="Wpisz np. 'Procedura zgłoszenia urlopu'..." />
                    </div>
                 </div>

                 <div className="space-y-3">
                    {[
                      { id: 'f1', title: 'Rozliczanie wydatków paliwowych (Flota)', desc: 'Według nowych zasad z maja 2026, każda faktura musi posiadać numer rejestracyjny pojazdu...' },
                      { id: 'f2', title: 'Zasady dojazdu na budowę (Ekipy)', desc: 'Pracownik kierujący pojazdem służbowym jest odpowiedzialny za sprawdzenie stanu technicznego...' },
                      { id: 'f3', title: 'Pobór zaliczek (Procedura Vault)', desc: 'Zaliczki powyżej 500 PLN wymagają akceptacji poziomu Dyrektora Finansowego w module NoFiCo...' }
                    ].map(faq => (
                      <div key={faq.id} className="bg-white p-5 rounded-2xl border border-slate-100 hover:border-amber-200 transition-all cursor-pointer group shadow-sm flex gap-4">
                         <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500 shrink-0 border border-amber-100">
                            <Info size={20} />
                         </div>
                         <div>
                            <h5 className="font-bold text-slate-800 uppercase text-xs tracking-tight">{faq.title}</h5>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{faq.desc}</p>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
           )}
        </div>
      </div>
    </div>
  );
}

const AlertCircle = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-circle"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
);
