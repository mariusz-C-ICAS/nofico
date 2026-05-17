/**
 * Data: 2026-05-14
 * Ścieżka: /src/modules/lms/LmsModule.tsx
 */
import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  BookOpen, GraduationCap, Award, ClipboardList,
  BarChart3, PenSquare, Users, TrendingUp, BadgeCheck
} from 'lucide-react';
import CourseList from './components/CourseList';
import CourseEditor from './components/CourseEditor';
import LearnerPortal from './components/LearnerPortal';
import CertificateManager from './components/CertificateManager';
import QuizEngine from './components/QuizEngine';
import IdesGenerateButton from '../../shared/components/IdesGenerateButton';

type LmsTab = 'catalog' | 'my-courses' | 'editor' | 'exams' | 'certificates' | 'reports';

const STATS = [
  { label: 'Kursy łącznie', value: '24', icon: BookOpen, color: 'indigo' },
  { label: 'Zapisani pracownicy', value: '138', icon: Users, color: 'violet' },
  { label: 'Ukończenia', value: '73%', icon: TrendingUp, color: 'emerald' },
  { label: 'Certyfikaty wystawione', value: '89', icon: BadgeCheck, color: 'amber' },
];

const TABS: { id: LmsTab; label: string; icon: React.ElementType }[] = [
  { id: 'catalog', label: 'Katalog Kursów', icon: BookOpen },
  { id: 'my-courses', label: 'Moje Szkolenia', icon: GraduationCap },
  { id: 'editor', label: 'Twórca Kursów', icon: PenSquare },
  { id: 'exams', label: 'Egzaminy', icon: ClipboardList },
  { id: 'certificates', label: 'Certyfikaty', icon: Award },
  { id: 'reports', label: 'Raporty', icon: BarChart3 },
];

export default function LmsModule() {
  const [activeTab, setActiveTab] = useState<LmsTab>('catalog');

  return (
    <div className="max-w-[1600px] mx-auto p-10 space-y-10 animate-in fade-in duration-500">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative bg-slate-900 rounded-[3rem] overflow-hidden p-12 shadow-2xl"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/60 via-slate-900 to-violet-900/40" />
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500 opacity-10 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3" />
        <div className="absolute left-1/2 bottom-0 w-64 h-64 bg-violet-500 opacity-10 rounded-full blur-3xl translate-y-1/2" />

        <div className="relative z-10 flex flex-col lg:flex-row justify-between gap-10">
          <div>
            <div className="flex items-center gap-4 mb-3">
              <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-900">
                <GraduationCap className="text-white" size={24} />
              </div>
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.25em]">
                C-ICAS OS / LMS V1
              </span>
            </div>
            <h1 className="text-5xl font-black text-white uppercase italic tracking-tighter leading-none mb-4">
              Learning<br />
              <span className="text-indigo-400">Management</span>
            </h1>
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest max-w-md">
              Centrum szkolen, certyfikacji i rozwoju kompetencji pracownikow C-ICAS
            </p>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap gap-4 items-start">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-[2rem] p-6 min-w-[130px]"
              >
                <stat.icon
                  size={18}
                  className={
                    stat.color === 'indigo' ? 'text-indigo-400 mb-2' :
                    stat.color === 'violet' ? 'text-violet-400 mb-2' :
                    stat.color === 'emerald' ? 'text-emerald-400 mb-2' :
                    'text-amber-400 mb-2'
                  }
                />
                <div className="text-2xl font-black text-white italic">{stat.value}</div>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 leading-tight">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Navigation Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-100 pb-8">
        <div className="flex p-2 bg-slate-100 rounded-[2.5rem] w-fit flex-wrap gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 rounded-[2rem] transition-all text-[10px] font-black uppercase tracking-widest ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-2xl scale-[1.02]'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
        <IdesGenerateButton moduleKey="hr" />
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="min-h-[600px]"
      >
        {activeTab === 'catalog' && <CourseList />}
        {activeTab === 'my-courses' && <LearnerPortal />}
        {activeTab === 'editor' && <CourseEditor />}
        {activeTab === 'exams' && <QuizEngine />}
        {activeTab === 'certificates' && <CertificateManager />}
        {activeTab === 'reports' && <ReportsPlaceholder />}
      </motion.div>
    </div>
  );
}

function ReportsPlaceholder() {
  const reportItems = [
    { label: 'Ukończenia per dział', value: '5 raportow', color: 'indigo' },
    { label: 'Sredni czas szkolenia', value: '2h 14min', color: 'violet' },
    { label: 'Zdawalnosc egzaminow', value: '81%', color: 'emerald' },
    { label: 'Kursy przeterminowane', value: '3', color: 'rose' },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {reportItems.map((r) => (
          <div key={r.label} className="bg-white border-2 border-slate-100 rounded-[2rem] p-8 shadow-sm">
            <div className={`text-3xl font-black italic mb-2 ${
              r.color === 'indigo' ? 'text-indigo-600' :
              r.color === 'violet' ? 'text-violet-600' :
              r.color === 'emerald' ? 'text-emerald-600' :
              'text-rose-600'
            }`}>{r.value}</div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{r.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 rounded-[3rem] p-12 flex flex-col items-center justify-center text-center gap-6 min-h-[300px]">
        <BarChart3 size={56} className="text-indigo-400" />
        <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">
          Raporty Zaawansowane
        </h3>
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest max-w-sm">
          Pelne raporty compliance, eksport do CSV/PDF oraz integracja z Power BI dostepne w wersji Enterprise
        </p>
        <button className="bg-indigo-600 text-white px-10 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-900">
          Generuj Raport
        </button>
      </div>
    </div>
  );
}
