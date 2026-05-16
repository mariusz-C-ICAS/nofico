/**
 * Data: 2026-05-14
 * Ścieżka: /src/modules/lms/components/LearnerPortal.tsx
 */
import React from 'react';
import { motion } from 'motion/react';
import {
  PlayCircle, CheckCircle2, AlertTriangle, Award,
  Clock, Sparkles, ChevronRight, BookOpen
} from 'lucide-react';

interface InProgressCourse {
  id: string; title: string; category: string; progress: number;
  lastActivity: string; duration: string; coverColor: string;
}
interface MandatoryCourse {
  id: string; title: string; category: string; deadline: string;
  duration: string; coverColor: string;
}
interface CompletedCourse {
  id: string; title: string; category: string; completedDate: string;
  score: number; hasCertificate: boolean; coverColor: string;
}
interface RecommendedCourse {
  id: string; title: string; reason: string; duration: string; coverColor: string;
}

const IN_PROGRESS: InProgressCourse[] = [
  { id: 'ip1', title: 'Obsluga Oprogramowania ERP', category: 'Techniczne', progress: 62, lastActivity: 'Wczoraj', duration: '5h', coverColor: 'from-indigo-500 to-blue-600' },
  { id: 'ip2', title: 'Komunikacja i Feedback', category: 'Soft Skills', progress: 35, lastActivity: '3 dni temu', duration: '2h 30min', coverColor: 'from-emerald-500 to-teal-600' },
];

const MANDATORY: MandatoryCourse[] = [
  { id: 'm1', title: 'Pierwsza Pomoc (Urazowa)', category: 'BHP', deadline: '2026-06-01', duration: '6h', coverColor: 'from-rose-600 to-rose-800' },
];

const COMPLETED: CompletedCourse[] = [
  { id: 'co1', title: 'BHP Podstawowe 2026', category: 'BHP', completedDate: '2026-04-12', score: 94, hasCertificate: true, coverColor: 'from-rose-500 to-rose-700' },
  { id: 'co2', title: 'Onboarding C-ICAS', category: 'Onboarding', completedDate: '2026-03-01', score: 100, hasCertificate: true, coverColor: 'from-amber-500 to-orange-600' },
  { id: 'co3', title: 'RODO / GDPR Compliance', category: 'Compliance', completedDate: '2026-04-28', score: 88, hasCertificate: true, coverColor: 'from-violet-600 to-indigo-700' },
];

const RECOMMENDED: RecommendedCourse[] = [
  { id: 'r1', title: 'Zarzadzanie Projektem (Agile)', reason: 'Popularne w Twoim dziale', duration: '4h', coverColor: 'from-cyan-600 to-blue-600' },
  { id: 'r2', title: 'BHP na Wysokosciach', reason: 'Wymagane dla Twojego stanowiska', duration: '4h', coverColor: 'from-orange-600 to-red-700' },
];

export default function LearnerPortal() {
  return (
    <div className="space-y-12">
      {/* Section: In Progress */}
      <section className="space-y-5">
        <div className="flex items-center gap-3">
          <PlayCircle size={20} className="text-indigo-600" />
          <h2 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter">W trakcie</h2>
          <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
            {IN_PROGRESS.length}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {IN_PROGRESS.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-white border-2 border-slate-100 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all group cursor-pointer"
            >
              <div className={`bg-gradient-to-br ${c.coverColor} p-6 flex items-center justify-between`}>
                <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">{c.category}</span>
                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest flex items-center gap-1">
                  <Clock size={11} /> {c.lastActivity}
                </span>
              </div>
              <div className="p-6 space-y-4">
                <h3 className="text-base font-black text-slate-900 uppercase italic tracking-tight">{c.title}</h3>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Postep</span>
                    <span className="text-[10px] font-black text-indigo-600 uppercase">{c.progress}%</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 rounded-full transition-all" style={{ width: `${c.progress}%` }} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Clock size={11} /> {c.duration}
                  </span>
                  <button className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 uppercase tracking-widest group-hover:gap-3 transition-all">
                    Kontynuuj <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Section: Mandatory */}
      <section className="space-y-5">
        <div className="flex items-center gap-3">
          <AlertTriangle size={20} className="text-rose-600" />
          <h2 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter">Wymagane</h2>
          <span className="bg-rose-100 text-rose-700 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
            {MANDATORY.length} nowe
          </span>
        </div>

        <div className="space-y-4">
          {MANDATORY.map((c) => (
            <div key={c.id} className="flex items-center gap-6 bg-rose-50 border-2 border-rose-100 rounded-[2rem] p-6 hover:border-rose-300 transition-all group cursor-pointer">
              <div className={`bg-gradient-to-br ${c.coverColor} rounded-2xl w-14 h-14 flex items-center justify-center shrink-0`}>
                <AlertTriangle size={22} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">{c.category}</div>
                <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-tight">{c.title}</h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Clock size={11} /> {c.duration}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full mb-2">
                  Termin: {c.deadline}
                </div>
                <button className="text-[10px] font-black text-rose-600 uppercase tracking-widest hover:text-rose-800 transition-colors">
                  Rozpocznij teraz
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section: Completed */}
      <section className="space-y-5">
        <div className="flex items-center gap-3">
          <CheckCircle2 size={20} className="text-emerald-600" />
          <h2 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter">Ukonczone</h2>
          <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
            {COMPLETED.length}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {COMPLETED.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.06 }}
              className="bg-white border-2 border-emerald-100 rounded-[2rem] overflow-hidden shadow-sm"
            >
              <div className={`bg-gradient-to-br ${c.coverColor} p-5 flex items-center justify-between`}>
                <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">{c.category}</span>
                <CheckCircle2 size={20} className="text-white/90" />
              </div>
              <div className="p-5 space-y-3">
                <h3 className="text-sm font-black text-slate-800 uppercase italic tracking-tight">{c.title}</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Wynik</div>
                    <div className="text-xl font-black text-emerald-600 italic">{c.score}%</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ukonczono</div>
                    <div className="text-xs font-black text-slate-600">{c.completedDate}</div>
                  </div>
                </div>
                {c.hasCertificate && (
                  <button className="w-full flex items-center justify-center gap-2 bg-emerald-50 border-2 border-emerald-200 text-emerald-700 py-2.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all">
                    <Award size={14} /> Pobierz Certyfikat
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Section: AI Recommendations */}
      <section className="space-y-5">
        <div className="flex items-center gap-3">
          <Sparkles size={20} className="text-amber-500" />
          <h2 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter">Rekomendowane dla Ciebie</h2>
          <span className="bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
            AI
          </span>
        </div>

        <div className="bg-slate-900 rounded-[3rem] p-8 space-y-4">
          <div className="flex items-center gap-3 mb-6">
            <Sparkles size={16} className="text-amber-400" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sugestie oparte na Twoim stanowisku i historii szkolen</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {RECOMMENDED.map((r) => (
              <div key={r.id} className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-[1.5rem] p-5 hover:bg-white/10 transition-all cursor-pointer group">
                <div className={`bg-gradient-to-br ${r.coverColor} rounded-2xl w-12 h-12 flex items-center justify-center shrink-0`}>
                  <BookOpen size={18} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-black text-white uppercase italic tracking-tight">{r.title}</div>
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{r.reason}</div>
                  <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                    <Clock size={10} /> {r.duration}
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-600 group-hover:text-white transition-colors" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
