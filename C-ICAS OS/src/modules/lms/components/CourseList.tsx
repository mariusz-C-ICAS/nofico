/**
 * Data: 2026-05-14
 * Ścieżka: /src/modules/lms/components/CourseList.tsx
 */
import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Search, Filter, Clock, Users, Star,
  ShieldAlert, Lock, BookOpen, Cpu, Heart, UserCheck
} from 'lucide-react';

type Category = 'Wszystkie' | 'BHP' | 'Compliance' | 'Techniczne' | 'Soft Skills' | 'Onboarding';
type Difficulty = 'Wszystkie' | 'Beginner' | 'Intermediate' | 'Advanced';
type Mandatory = 'Wszystkie' | 'Obowiazkowe' | 'Opcjonalne';

interface Course {
  id: string;
  title: string;
  description: string;
  category: Exclude<Category, 'Wszystkie'>;
  duration: string;
  difficulty: Exclude<Difficulty, 'Wszystkie'>;
  enrolled: number;
  completionRate: number;
  mandatory: boolean;
  coverColor: string;
  icon: React.ElementType;
}

const COURSES: Course[] = [
  {
    id: 'c1', title: 'BHP Podstawowe 2026', description: 'Obowiazkowe szkolenie BHP dla wszystkich pracownikow. Zasady bezpieczenstwa i higieny pracy.',
    category: 'BHP', duration: '3h', difficulty: 'Beginner', enrolled: 138, completionRate: 91, mandatory: true, coverColor: 'from-rose-600 to-rose-800', icon: ShieldAlert,
  },
  {
    id: 'c2', title: 'BHP na Wysokosciach', description: 'Specjalistyczne szkolenie dla pracownikow wykonujacych prace na wysokosciach powyzej 1m.',
    category: 'BHP', duration: '4h', difficulty: 'Advanced', enrolled: 42, completionRate: 78, mandatory: true, coverColor: 'from-orange-600 to-red-700', icon: Lock,
  },
  {
    id: 'c3', title: 'RODO / GDPR Compliance', description: 'Ochrona danych osobowych w praktyce. Obowiazki pracownika, incydenty, prawa podmiotow danych.',
    category: 'Compliance', duration: '2h', difficulty: 'Intermediate', enrolled: 138, completionRate: 85, mandatory: true, coverColor: 'from-violet-600 to-indigo-700', icon: ShieldAlert,
  },
  {
    id: 'c4', title: 'Obsluga Oprogramowania ERP', description: 'Szkolenie z obslugi modulu NoFiCo: faktury, platnosci, raporty finansowe.',
    category: 'Techniczne', duration: '5h', difficulty: 'Intermediate', enrolled: 65, completionRate: 62, mandatory: false, coverColor: 'from-indigo-600 to-blue-700', icon: Cpu,
  },
  {
    id: 'c5', title: 'Komunikacja i Feedback', description: 'Techniki skutecznej komunikacji w zespole, udzielanie i przyjmowanie informacji zwrotnej.',
    category: 'Soft Skills', duration: '2h 30min', difficulty: 'Beginner', enrolled: 89, completionRate: 74, mandatory: false, coverColor: 'from-emerald-500 to-teal-600', icon: Heart,
  },
  {
    id: 'c6', title: 'Onboarding C-ICAS', description: 'Wprowadzenie do firmy: struktura, procedury, kultura organizacyjna i narzedzia pracy.',
    category: 'Onboarding', duration: '1h 30min', difficulty: 'Beginner', enrolled: 28, completionRate: 100, mandatory: true, coverColor: 'from-amber-500 to-orange-600', icon: UserCheck,
  },
  {
    id: 'c7', title: 'Pierwsza Pomoc (Urazowa)', description: 'Kurs pierwszej pomocy z certyfikatem. Postepowanie w nagłych przypadkach na terenie zakladu.',
    category: 'BHP', duration: '6h', difficulty: 'Advanced', enrolled: 54, completionRate: 67, mandatory: true, coverColor: 'from-pink-600 to-rose-700', icon: Heart,
  },
  {
    id: 'c8', title: 'Zarzadzanie Projektem (Agile)', description: 'Metodyki zwinne w budownictwie i logistyce. Scrum, Kanban i praktyczne narzedzia PM.',
    category: 'Soft Skills', duration: '4h', difficulty: 'Intermediate', enrolled: 31, completionRate: 55, mandatory: false, coverColor: 'from-cyan-600 to-blue-600', icon: BookOpen,
  },
];

const CATEGORIES: Category[] = ['Wszystkie', 'BHP', 'Compliance', 'Techniczne', 'Soft Skills', 'Onboarding'];
const DIFFICULTIES: Difficulty[] = ['Wszystkie', 'Beginner', 'Intermediate', 'Advanced'];
const MANDATORY_OPTS: Mandatory[] = ['Wszystkie', 'Obowiazkowe', 'Opcjonalne'];

const DIFFICULTY_COLOR: Record<string, string> = {
  Beginner: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Intermediate: 'bg-amber-50 text-amber-700 border-amber-200',
  Advanced: 'bg-rose-50 text-rose-700 border-rose-200',
};

export default function CourseList() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category>('Wszystkie');
  const [difficulty, setDifficulty] = useState<Difficulty>('Wszystkie');
  const [mandatory, setMandatory] = useState<Mandatory>('Wszystkie');

  const filtered = useMemo(() => {
    return COURSES.filter((c) => {
      const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.description.toLowerCase().includes(search.toLowerCase());
      const matchCat = category === 'Wszystkie' || c.category === category;
      const matchDiff = difficulty === 'Wszystkie' || c.difficulty === difficulty;
      const matchMandatory = mandatory === 'Wszystkie' ||
        (mandatory === 'Obowiazkowe' && c.mandatory) ||
        (mandatory === 'Opcjonalne' && !c.mandatory);
      return matchSearch && matchCat && matchDiff && matchMandatory;
    });
  }, [search, category, difficulty, mandatory]);

  return (
    <div className="space-y-8">
      {/* Search & Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Szukaj kursu, tematyki lub slowa kluczowego..."
            className="w-full pl-14 pr-6 py-5 bg-white border-2 border-slate-100 rounded-[2rem] outline-none focus:border-indigo-400 transition-all text-sm font-black text-slate-700 placeholder:font-normal placeholder:text-slate-400 shadow-sm"
          />
        </div>

        <div className="flex gap-3 flex-wrap">
          {/* Category filter */}
          <div className="relative">
            <Filter size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="pl-10 pr-6 py-5 bg-white border-2 border-slate-100 rounded-[2rem] outline-none focus:border-indigo-400 text-[11px] font-black uppercase tracking-widest text-slate-600 appearance-none cursor-pointer shadow-sm"
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            className="px-6 py-5 bg-white border-2 border-slate-100 rounded-[2rem] outline-none focus:border-indigo-400 text-[11px] font-black uppercase tracking-widest text-slate-600 appearance-none cursor-pointer shadow-sm"
          >
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>

          <select
            value={mandatory}
            onChange={(e) => setMandatory(e.target.value as Mandatory)}
            className="px-6 py-5 bg-white border-2 border-slate-100 rounded-[2rem] outline-none focus:border-indigo-400 text-[11px] font-black uppercase tracking-widest text-slate-600 appearance-none cursor-pointer shadow-sm"
          >
            {MANDATORY_OPTS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Znaleziono {filtered.length} kursow
        </span>
        {filtered.length !== COURSES.length && (
          <button
            onClick={() => { setSearch(''); setCategory('Wszystkie'); setDifficulty('Wszystkie'); setMandatory('Wszystkie'); }}
            className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-400 transition-colors"
          >
            Wyczysc filtry
          </button>
        )}
      </div>

      {/* Course Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map((course, i) => (
          <motion.div
            key={course.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            className="bg-white border-2 border-slate-100 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all cursor-pointer group"
          >
            {/* Cover */}
            <div className={`bg-gradient-to-br ${course.coverColor} p-8 flex items-center justify-between`}>
              <course.icon size={32} className="text-white/80" />
              <span className={`text-[10px] font-black px-3 py-1.5 rounded-full border ${
                course.mandatory
                  ? 'bg-white/20 text-white border-white/30'
                  : 'bg-black/20 text-white/80 border-white/20'
              } uppercase tracking-widest`}>
                {course.mandatory ? 'Obowiazkowy' : 'Opcjonalny'}
              </span>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{course.category}</div>
                <h3 className="text-base font-black text-slate-900 uppercase italic tracking-tight leading-tight">{course.title}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{course.description}</p>
              </div>

              <div className="flex items-center gap-3">
                <span className={`text-[9px] font-black px-2.5 py-1 rounded-full border ${DIFFICULTY_COLOR[course.difficulty]} uppercase tracking-widest`}>
                  {course.difficulty}
                </span>
                <div className="flex items-center gap-1 text-slate-400">
                  <Clock size={12} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{course.duration}</span>
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                  <Users size={12} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{course.enrolled}</span>
                </div>
              </div>

              {/* Completion rate */}
              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ukonczenia</span>
                  <span className="text-[9px] font-black text-slate-600 uppercase">{course.completionRate}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${course.completionRate}%` }}
                  />
                </div>
              </div>

              <button className="w-full bg-slate-900 text-white py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all group-hover:shadow-lg">
                Rozpocznij Kurs
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <BookOpen size={48} className="text-slate-200" />
          <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Brak kursow spelniajacych kryteria</p>
        </div>
      )}
    </div>
  );
}
