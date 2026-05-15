/**
 * Data: 2026-05-14
 * Sciezka: src/modules/wellness/WellnessModule.tsx
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart, Shield, Footprints, Trophy, Gift, Smile,
  AlertTriangle, BarChart2, Activity, Coffee, Users,
  Check, Star, TrendingDown, TrendingUp,
  ExternalLink, Lock
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, LineChart, Line, ReferenceLine
} from 'recharts';

const STEPS_DATA = [
  { day: 'Pn', steps: 8420 }, { day: 'Wt', steps: 11200 }, { day: 'Sr', steps: 6800 },
  { day: 'Cz', steps: 10100 }, { day: 'Pt', steps: 9300 }, { day: 'So', steps: 12400 }, { day: 'Nd', steps: 7600 },
];
const GOAL = 10000;

const WELLBEING_DATA = [
  { week: 'Tydz 1', energia: 6, stres: 5, satysfakcja: 7 },
  { week: 'Tydz 2', energia: 7, stres: 4, satysfakcja: 8 },
  { week: 'Tydz 3', energia: 5, stres: 7, satysfakcja: 6 },
  { week: 'Tydz 4', energia: 8, stres: 3, satysfakcja: 9 },
];

const TEAM_TREND = [
  { month: 'Sty', absencja: 3.2 }, { month: 'Lut', absencja: 2.8 }, { month: 'Mar', absencja: 4.1 },
  { month: 'Kwi', absencja: 2.5 }, { month: 'Maj', absencja: 1.9 },
];

const CHALLENGES = [
  { id: 'c1', name: '10 000 Krokow', desc: 'Przejdz 10 000 krokow przez 5 dni z rzedu', icon: Footprints, progress: 60, participants: 22, reward: 'Kawa gratis', color: 'bg-emerald-500', endDate: '2026-05-31' },
  { id: 'c2', name: 'Tydzen bez Nadgodzin', desc: 'Zakoncz prace na czas przez caly tydzien', icon: Coffee, progress: 80, participants: 35, reward: 'Dodatkowe WFH', color: 'bg-amber-500', endDate: '2026-05-17' },
  { id: 'c3', name: 'Wellness Champions', desc: 'Zbierz 4 sondaze wellbeing z wynikiem 7+', icon: Trophy, progress: 25, participants: 15, reward: 'Voucher fitness', color: 'bg-violet-500', endDate: '2026-06-30' },
];

const BENEFITS = [
  { label: 'Urlop wypoczynkowy', used: 8, total: 26, icon: Gift, color: 'text-indigo-500' },
  { label: 'Karta Sportowa (MultiSport)', used: 4, total: 12, icon: Activity, color: 'text-emerald-500' },
  { label: 'Opieka Medyczna', used: 1, total: 4, icon: Heart, color: 'text-rose-500' },
];

function OptInBanner({ onAccept, onDecline }: { onAccept: () => void; onDecline: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-indigo-200 rounded-[2rem] p-10 shadow-2xl shadow-indigo-50 max-w-2xl mx-auto"
    >
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 bg-indigo-50 rounded-[1.5rem] flex items-center justify-center">
          <Shield size={32} className="text-indigo-600" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Program Wellbeing</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Opt-in — Twoje Dane Pozostaja Prywatne</p>
        </div>
      </div>
      <div className="space-y-4 mb-8">
        {[
          { icon: Lock, title: 'Pelna Prywatnosc', desc: 'Twoje dane zdrowotne sa widoczne tylko dla Ciebie. Przelozeni widza wylacznie anonimowe srednie zespolowe.' },
          { icon: Shield, title: 'Zgodnosc RODO', desc: 'Dane przetwarzane zgodnie z RODO. Mozesz w dowolnym momencie wycofac zgode i usunac wszystkie dane.' },
          { icon: Star, title: 'Opt-in i Opt-out', desc: 'Uczestnictwo jest calkowicie dobrowolne. Brak uczestnictwa nie wplywa na ocene pracownicza.' },
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl">
            <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
              <item.icon size={16} className="text-indigo-600" />
            </div>
            <div>
              <div className="text-xs font-black text-slate-900 uppercase tracking-tight">{item.title}</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <button onClick={onAccept}
          className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2"
        >
          <Check size={16} /> Dolacz do Programu
        </button>
        <button onClick={onDecline}
          className="px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
        >
          Nie teraz
        </button>
      </div>
    </motion.div>
  );
}

function SurveyWidget() {
  const [scores, setScores] = useState<Record<string, number>>({ Energia: 7, Stres: 4, Satysfakcja: 8 });
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-emerald-50 border border-emerald-200 rounded-[2rem] p-8 flex flex-col items-center text-center"
      >
        <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mb-4">
          <Check size={28} className="text-white" />
        </div>
        <h3 className="text-lg font-black text-emerald-800 uppercase italic tracking-tight">Dziekujemy!</h3>
        <p className="text-xs text-emerald-600 font-medium mt-2">Odpowiedz zapisana anonimowo. Nastepny sondaz w przyszlym tygodniu.</p>
      </motion.div>
    );
  }

  const SURVEYS = [
    { label: 'Energia', invert: false },
    { label: 'Stres', invert: true },
    { label: 'Satysfakcja', invert: false },
  ];

  return (
    <div className="bg-white border border-slate-100 rounded-[2rem] p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center"><Smile size={20} className="text-indigo-600" /></div>
        <div>
          <h3 className="font-black text-slate-900 uppercase italic tracking-tight text-sm">Tygodniowy Sondaz</h3>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Anonimowe — widoczne tylko dla Ciebie</p>
        </div>
      </div>
      <div className="space-y-5">
        {SURVEYS.map(s => (
          <div key={s.label}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{s.label}</span>
              <span className="text-lg font-black italic text-indigo-600">{scores[s.label]}/10</span>
            </div>
            <input type="range" min={1} max={10} value={scores[s.label]}
              onChange={e => setScores(prev => ({ ...prev, [s.label]: parseInt(e.target.value) }))}
              className="w-full accent-indigo-600"
            />
            <div className="flex justify-between text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1">
              <span>{s.invert ? 'Wysoki' : 'Niski'}</span>
              <span>{s.invert ? 'Brak' : 'Wysoki'}</span>
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => setSubmitted(true)}
        className="w-full mt-6 bg-indigo-600 text-white py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-all"
      >
        Wyslij Anonimowo
      </button>
    </div>
  );
}

function StepsCard() {
  const daysGoalMet = STEPS_DATA.filter(d => d.steps >= GOAL).length;
  const avg = Math.round(STEPS_DATA.reduce((a, d) => a + d.steps, 0) / 7);
  return (
    <div className="bg-white border border-slate-100 rounded-[2rem] p-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center"><Footprints size={20} className="text-emerald-600" /></div>
        <div>
          <h3 className="font-black text-slate-900 uppercase italic tracking-tight text-sm">Kroki — Ten Tydzien</h3>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{daysGoalMet}/7 dni z celem {GOAL.toLocaleString()}</p>
        </div>
        <div className="ml-auto text-right">
          <div className="text-2xl font-black italic text-emerald-600">{avg.toLocaleString()}</div>
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">sr. dziennie</div>
        </div>
      </div>
      <div className="h-40 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={STEPS_DATA} barSize={22}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800 }} />
            <YAxis hide />
            <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', fontSize: '10px' }} formatter={(v: number) => [`${v.toLocaleString()} krokow`]} />
            <ReferenceLine y={GOAL} stroke="#e2e8f0" strokeDasharray="4 4" />
            <Bar dataKey="steps" radius={[8, 8, 0, 0]} fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function WellbeingHistory() {
  return (
    <div className="bg-white border border-slate-100 rounded-[2rem] p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center"><Activity size={20} className="text-violet-600" /></div>
        <div>
          <h3 className="font-black text-slate-900 uppercase italic tracking-tight text-sm">Historia Wellbeing</h3>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ostatnie 4 tygodnie — tylko Twoje dane</p>
        </div>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={WELLBEING_DATA}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800 }} />
            <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800 }} />
            <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', fontSize: '10px' }} />
            <Line type="monotone" dataKey="energia" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} name="Energia" />
            <Line type="monotone" dataKey="stres" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4, fill: '#f59e0b' }} name="Stres" strokeDasharray="5 5" />
            <Line type="monotone" dataKey="satysfakcja" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: '#6366f1' }} name="Satysfakcja" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-4 mt-3 flex-wrap">
        {[{ label: 'Energia', color: '#10b981' }, { label: 'Stres (nizszy = lepszy)', color: '#f59e0b' }, { label: 'Satysfakcja', color: '#6366f1' }].map(l => (
          <div key={l.label} className="flex items-center gap-2">
            <div className="w-3 h-0.5 rounded-full" style={{ backgroundColor: l.color }} />
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChallengesSection() {
  const [joined, setJoined] = useState<string[]>(['c1']);
  return (
    <div className="space-y-3">
      {CHALLENGES.map((c, i) => {
        const isJoined = joined.includes(c.id);
        return (
          <motion.div key={c.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
            className="bg-white border border-slate-100 rounded-[2rem] px-8 py-6 flex items-center gap-6 hover:border-indigo-200 transition-all"
          >
            <div className={`w-12 h-12 rounded-[1.5rem] ${c.color} flex items-center justify-center`}>
              <c.icon size={22} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <h4 className="font-black text-slate-900 uppercase italic tracking-tight text-sm">{c.name}</h4>
                {isJoined && <span className="bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full border border-emerald-200">Dolaczono</span>}
              </div>
              <p className="text-xs text-slate-500 font-medium">{c.desc}</p>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${c.color}`} style={{ width: `${c.progress}%` }} />
                </div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{c.progress}%</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Nagroda</div>
              <div className="text-xs font-black text-slate-700">{c.reward}</div>
              <div className="text-[9px] text-slate-400 mt-1">do {c.endDate}</div>
              <div className="flex items-center gap-1 mt-1 text-[9px] font-black text-slate-400"><Users size={10} /> {c.participants} os.</div>
            </div>
            <button
              onClick={() => setJoined(prev => isJoined ? prev.filter(id => id !== c.id) : [...prev, c.id])}
              className={`shrink-0 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                isJoined ? 'bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600' : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {isJoined ? 'Rezygnuj' : 'Dolacz'}
            </button>
          </motion.div>
        );
      })}
    </div>
  );
}

function TeamAggregateView() {
  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-[2rem] px-8 py-5 flex items-start gap-4">
        <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs font-bold text-amber-800">
          Jako menadzer widzisz <strong>wylacznie anonimowe agregaty zespolowe</strong>. Zadne dane indywidualne nie sa widoczne.
          Minimalna liczba osob do wyswietlenia wyniku: 5.
        </p>
        <Lock size={16} className="text-amber-400 shrink-0 mt-0.5 ml-auto" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Sr. Energia Zespolu', value: '7.2', trend: 'up', desc: '+0.5 vs poprzedni tydzien', color: 'text-emerald-600' },
          { label: 'Sr. Poziom Stresu', value: '4.1', trend: 'down', desc: '-0.8 vs poprzedni tydzien', color: 'text-amber-600' },
          { label: 'Sr. Satysfakcja', value: '8.0', trend: 'up', desc: '+0.3 vs poprzedni tydzien', color: 'text-indigo-600' },
        ].map((m, i) => (
          <div key={i} className="bg-white border border-slate-100 rounded-[2rem] p-8">
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{m.label}</div>
            <div className={`text-4xl font-black italic ${m.color}`}>{m.value}<span className="text-base text-slate-400">/10</span></div>
            <div className={`flex items-center gap-1 mt-2 text-[10px] font-bold ${m.trend === 'up' ? 'text-emerald-500' : 'text-amber-500'}`}>
              {m.trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {m.desc}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-100 rounded-[2rem] p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center"><BarChart2 size={20} className="text-rose-600" /></div>
          <div>
            <h3 className="font-black text-slate-900 uppercase italic tracking-tight text-sm">Trend Absencji Firmowej</h3>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Zagregowane dane z systemu HR</p>
          </div>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={TEAM_TREND}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800 }} unit="%" />
              <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', fontSize: '10px' }} />
              <Line type="monotone" dataKey="absencja" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 5, fill: '#f43f5e' }} name="Absencja %" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
          <TrendingDown size={14} /> Absencja spada — Maj to najlepszy miesiac od poczatku roku
        </div>
      </div>
    </div>
  );
}

export default function WellnessModule() {
  const [optedIn, setOptedIn] = useState<boolean | null>(null);
  const [activeSection, setActiveSection] = useState<'moje' | 'zespol'>('moje');

  const SECTIONS = [
    { id: 'moje' as const, label: 'Moj Wellbeing', icon: Heart },
    { id: 'zespol' as const, label: 'Zespol (Anonimowo)', icon: Users },
  ];

  return (
    <div className="max-w-[1600px] mx-auto p-10 space-y-10 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-slate-900 rounded-[3rem] p-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative overflow-hidden shadow-2xl shadow-slate-200">
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
        <div>
          <div className="flex items-center gap-4 mb-3">
            <div className="bg-rose-500 p-3 rounded-[1.5rem] shadow-lg shadow-rose-900/40">
              <Heart className="text-white" size={22} />
            </div>
            <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">Program Wellbeing</h1>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">
            Twoje Dane Pozostaja Prywatne — C-ICAS OS V5
          </p>
        </div>
        <div className="flex gap-4 flex-wrap items-center">
          <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-[2rem] px-6 py-4 flex items-center gap-3">
            <Shield size={20} className="text-emerald-400" />
            <div>
              <div className="text-[9px] font-black text-emerald-300 uppercase tracking-widest">RODO Compliant</div>
              <div className="text-sm font-black text-white">Prywatnosc First</div>
            </div>
          </div>
          {optedIn && (
            <div className="bg-white/5 border border-white/10 rounded-[2rem] px-8 py-6 text-right backdrop-blur-sm">
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</div>
              <div className="text-sm font-black text-emerald-400 uppercase italic">Aktywny uczestnik</div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {optedIn === null && (
          <OptInBanner onAccept={() => setOptedIn(true)} onDecline={() => setOptedIn(false)} />
        )}

        {optedIn === false && (
          <motion.div key="declined" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-slate-50 border border-slate-200 rounded-[2rem] p-12 flex flex-col items-center text-center gap-6"
          >
            <Lock size={48} className="text-slate-300" />
            <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Opt-in Wymagany</h3>
            <p className="text-xs text-slate-500 font-medium max-w-md">Nie dolaczyles do programu. Twoja prywatnosc jest respektowana. Mozesz dolaczyc w dowolnym momencie.</p>
            <button onClick={() => setOptedIn(null)}
              className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-all"
            >
              Dowiedz sie wiecej i Dolacz
            </button>
          </motion.div>
        )}

        {optedIn === true && (
          <motion.div key="dashboard" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            {/* Sub nav */}
            <div className="flex gap-2 p-2 bg-slate-100 rounded-[2.5rem] w-fit">
              {SECTIONS.map(s => (
                <button key={s.id} onClick={() => setActiveSection(s.id)}
                  className={`flex items-center gap-2 px-6 py-4 rounded-[2rem] transition-all text-[10px] font-black uppercase tracking-widest ${
                    activeSection === s.id ? 'bg-white text-slate-900 shadow-xl scale-[1.02]' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                  }`}
                >
                  <s.icon size={14} /> {s.label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {activeSection === 'moje' && (
                <motion.div key="moje" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2"><StepsCard /></div>
                    <div><SurveyWidget /></div>
                  </div>
                  <WellbeingHistory />

                  {/* Benefits */}
                  <div className="bg-white border border-slate-100 rounded-[2rem] p-8">
                    <h3 className="font-black text-slate-900 uppercase italic tracking-tight text-sm mb-6 flex items-center gap-3">
                      <Gift size={18} className="text-amber-500" /> Wykorzystane Benefity
                    </h3>
                    <div className="space-y-4">
                      {BENEFITS.map((b, i) => (
                        <div key={i} className="flex items-center gap-5">
                          <b.icon size={18} className={b.color} />
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="text-xs font-bold text-slate-700">{b.label}</span>
                              <span className="text-[10px] font-black text-slate-500">{b.used}/{b.total} dni</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(b.used / b.total) * 100}%` }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-black text-slate-900 uppercase italic tracking-tighter text-lg mb-4 flex items-center gap-3">
                      <Trophy size={20} className="text-amber-500" /> Wyzwania Zespolowe
                    </h3>
                    <ChallengesSection />
                  </div>

                  {/* Mental health resources */}
                  <div className="bg-slate-900 rounded-[2rem] p-8 flex items-center gap-6">
                    <div className="w-14 h-14 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center shrink-0">
                      <Heart size={28} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Zasoby Zdrowia Psychicznego</h4>
                      <p className="text-sm font-medium text-slate-300">Anonimowe wsparcie psychologiczne, materialy o mindfulness i kontakt z certyfikowanym coachem.</p>
                    </div>
                    <button className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all shrink-0">
                      <ExternalLink size={12} /> Przejdz do Zasobow
                    </button>
                  </div>
                </motion.div>
              )}

              {activeSection === 'zespol' && (
                <motion.div key="zespol" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <TeamAggregateView />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
