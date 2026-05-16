/**
 * Data: 2026-05-14
 * Ścieżka: /src/modules/lms/components/CourseEditor.tsx
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronRight, ChevronLeft, Plus, Trash2,
  Check, BookOpen, FileText, HelpCircle, Settings, Eye
} from 'lucide-react';

type Step = 1 | 2 | 3 | 4 | 5;

interface Section { id: string; title: string; content: string; videoUrl: string; }
interface QuizOption { text: string; correct: boolean; }
interface QuizQuestion { id: string; question: string; options: QuizOption[]; }
interface CourseForm {
  title: string; description: string; category: string;
  duration: string; coverColor: string;
  sections: Section[];
  questions: QuizQuestion[];
  passingScore: number;
  mandatory: boolean; targetDepts: string[]; certificate: boolean; retakePolicy: string;
}

const STEPS = [
  { num: 1 as Step, label: 'Informacje', icon: BookOpen },
  { num: 2 as Step, label: 'Tresci', icon: FileText },
  { num: 3 as Step, label: 'Quiz', icon: HelpCircle },
  { num: 4 as Step, label: 'Ustawienia', icon: Settings },
  { num: 5 as Step, label: 'Publikacja', icon: Eye },
];

const COVER_COLORS = [
  { label: 'Czerwony', value: 'from-rose-600 to-rose-800' },
  { label: 'Indigo', value: 'from-indigo-600 to-violet-700' },
  { label: 'Zielony', value: 'from-emerald-600 to-teal-700' },
  { label: 'Pomaranczowy', value: 'from-orange-500 to-red-600' },
  { label: 'Niebieski', value: 'from-blue-600 to-cyan-700' },
  { label: 'Zloty', value: 'from-amber-500 to-orange-600' },
];

const DEPTS = ['IT', 'HR', 'Finanse', 'Produkcja', 'Logistyka', 'Sprzedaz', 'Zarzad'];

const mkSection = (): Section => ({ id: crypto.randomUUID(), title: '', content: '', videoUrl: '' });
const mkQuestion = (): QuizQuestion => ({
  id: crypto.randomUUID(), question: '',
  options: [
    { text: '', correct: true }, { text: '', correct: false },
    { text: '', correct: false }, { text: '', correct: false },
  ],
});

export default function CourseEditor() {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<CourseForm>({
    title: '', description: '', category: 'BHP', duration: '', coverColor: 'from-indigo-600 to-violet-700',
    sections: [mkSection()],
    questions: [mkQuestion()],
    passingScore: 80,
    mandatory: false, targetDepts: [], certificate: true, retakePolicy: 'unlimited',
  });

  const update = (partial: Partial<CourseForm>) => setForm((f) => ({ ...f, ...partial }));

  const addSection = () => update({ sections: [...form.sections, mkSection()] });
  const removeSection = (id: string) => update({ sections: form.sections.filter((s) => s.id !== id) });
  const updateSection = (id: string, partial: Partial<Section>) =>
    update({ sections: form.sections.map((s) => s.id === id ? { ...s, ...partial } : s) });

  const addQuestion = () => update({ questions: [...form.questions, mkQuestion()] });
  const removeQuestion = (id: string) => update({ questions: form.questions.filter((q) => q.id !== id) });
  const updateQuestion = (id: string, partial: Partial<QuizQuestion>) =>
    update({ questions: form.questions.map((q) => q.id === id ? { ...q, ...partial } : q) });
  const updateOption = (qId: string, idx: number, partial: Partial<QuizOption>) =>
    update({
      questions: form.questions.map((q) => q.id === qId
        ? { ...q, options: q.options.map((o, i) => i === idx ? { ...o, ...partial } : o) }
        : q),
    });
  const setCorrect = (qId: string, idx: number) =>
    update({
      questions: form.questions.map((q) => q.id === qId
        ? { ...q, options: q.options.map((o, i) => ({ ...o, correct: i === idx })) }
        : q),
    });

  const toggleDept = (dept: string) => {
    const has = form.targetDepts.includes(dept);
    update({ targetDepts: has ? form.targetDepts.filter((d) => d !== dept) : [...form.targetDepts, dept] });
  };

  const inputCls = "w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] outline-none focus:border-indigo-400 transition-all text-sm font-black text-slate-700 placeholder:font-normal placeholder:text-slate-400";
  const labelCls = "text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block";

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.num}>
            <button
              onClick={() => setStep(s.num)}
              className={`flex items-center gap-2 px-5 py-3 rounded-[1.5rem] transition-all text-[10px] font-black uppercase tracking-widest ${
                step === s.num
                  ? 'bg-slate-900 text-white shadow-lg'
                  : step > s.num
                  ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-200'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              {step > s.num ? <Check size={12} /> : <s.icon size={12} />}
              {s.label}
            </button>
            {i < STEPS.length - 1 && <ChevronRight size={14} className="text-slate-300 shrink-0" />}
          </React.Fragment>
        ))}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className="bg-white border-2 border-slate-100 rounded-[2rem] p-10 shadow-sm space-y-8"
        >
          {/* STEP 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Podstawowe Informacje</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className={labelCls}>Tytul kursu</label>
                  <input className={inputCls} placeholder="np. BHP Podstawowe 2026" value={form.title} onChange={(e) => update({ title: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelCls}>Opis kursu</label>
                  <textarea rows={3} className={inputCls} placeholder="Krotki opis zawartosci i celow kursu..." value={form.description} onChange={(e) => update({ description: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Kategoria</label>
                  <select className={inputCls} value={form.category} onChange={(e) => update({ category: e.target.value })}>
                    {['BHP', 'Compliance', 'Techniczne', 'Soft Skills', 'Onboarding'].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Czas trwania</label>
                  <input className={inputCls} placeholder="np. 2h 30min" value={form.duration} onChange={(e) => update({ duration: e.target.value })} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Kolor okladki</label>
                <div className="flex gap-3 flex-wrap">
                  {COVER_COLORS.map((cc) => (
                    <button
                      key={cc.value}
                      onClick={() => update({ coverColor: cc.value })}
                      className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${cc.value} transition-all ${form.coverColor === cc.value ? 'ring-4 ring-indigo-600 ring-offset-2 scale-110' : 'hover:scale-105'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Content Sections */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Sekcje Tresci</h2>
                <button onClick={addSection} className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all">
                  <Plus size={14} /> Dodaj sekcje
                </button>
              </div>
              {form.sections.map((s, i) => (
                <div key={s.id} className="bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sekcja {i + 1}</span>
                    {form.sections.length > 1 && (
                      <button onClick={() => removeSection(s.id)} className="text-rose-500 hover:text-rose-700 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <input className={inputCls} placeholder="Tytul sekcji" value={s.title} onChange={(e) => updateSection(s.id, { title: e.target.value })} />
                  <textarea rows={4} className={inputCls} placeholder="Tresc sekcji (tekst, instrukcje, procedury...)" value={s.content} onChange={(e) => updateSection(s.id, { content: e.target.value })} />
                  <input className={inputCls} placeholder="URL wideo (opcjonalnie)" value={s.videoUrl} onChange={(e) => updateSection(s.id, { videoUrl: e.target.value })} />
                </div>
              ))}
            </div>
          )}

          {/* STEP 3: Quiz Builder */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Budowa Quizu</h2>
                <button onClick={addQuestion} className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all">
                  <Plus size={14} /> Dodaj pytanie
                </button>
              </div>
              <div>
                <label className={labelCls}>Prog zaliczenia (%)</label>
                <input type="number" min={0} max={100} className={`${inputCls} w-40`} value={form.passingScore} onChange={(e) => update({ passingScore: Number(e.target.value) })} />
              </div>
              {form.questions.map((q, qi) => (
                <div key={q.id} className="bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] p-6 space-y-4">
                  <div className="flex justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pytanie {qi + 1}</span>
                    {form.questions.length > 1 && (
                      <button onClick={() => removeQuestion(q.id)} className="text-rose-500 hover:text-rose-700"><Trash2 size={16} /></button>
                    )}
                  </div>
                  <input className={inputCls} placeholder="Tresc pytania..." value={q.question} onChange={(e) => updateQuestion(q.id, { question: e.target.value })} />
                  <div className="space-y-3">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-3">
                        <button
                          onClick={() => setCorrect(q.id, oi)}
                          className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${opt.correct ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300 hover:border-emerald-400'}`}
                        >
                          {opt.correct && <Check size={12} className="text-white" />}
                        </button>
                        <input className={`${inputCls} flex-1`} placeholder={`Odpowiedz ${oi + 1}`} value={opt.text} onChange={(e) => updateOption(q.id, oi, { text: e.target.value })} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* STEP 4: Settings */}
          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Ustawienia Kursu</h2>
              <div className="flex items-center justify-between p-5 bg-slate-50 rounded-[1.5rem] border-2 border-slate-100">
                <div>
                  <div className="text-sm font-black text-slate-800 uppercase tracking-tight">Kurs obowiazkowy</div>
                  <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Wszyscy wyznaczeni pracownicy musza ukonczyc</div>
                </div>
                <button onClick={() => update({ mandatory: !form.mandatory })} className={`w-14 h-7 rounded-full transition-all ${form.mandatory ? 'bg-indigo-600' : 'bg-slate-200'} relative`}>
                  <div className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-all shadow ${form.mandatory ? 'left-8' : 'left-1'}`} />
                </button>
              </div>
              <div>
                <label className={labelCls}>Docelowe dzialy</label>
                <div className="flex flex-wrap gap-3">
                  {DEPTS.map((d) => (
                    <button
                      key={d}
                      onClick={() => toggleDept(d)}
                      className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border-2 transition-all ${form.targetDepts.includes(d) ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-500 hover:border-indigo-300'}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between p-5 bg-slate-50 rounded-[1.5rem] border-2 border-slate-100">
                <div>
                  <div className="text-sm font-black text-slate-800 uppercase tracking-tight">Certyfikat po ukonczeniu</div>
                  <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Automatyczne wystawienie certyfikatu</div>
                </div>
                <button onClick={() => update({ certificate: !form.certificate })} className={`w-14 h-7 rounded-full transition-all ${form.certificate ? 'bg-indigo-600' : 'bg-slate-200'} relative`}>
                  <div className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-all shadow ${form.certificate ? 'left-8' : 'left-1'}`} />
                </button>
              </div>
              <div>
                <label className={labelCls}>Polityka powtarzania</label>
                <select className={inputCls} value={form.retakePolicy} onChange={(e) => update({ retakePolicy: e.target.value })}>
                  <option value="unlimited">Bez limitu podejsc</option>
                  <option value="once">Jedno podejscie</option>
                  <option value="3times">Max 3 podejscia</option>
                  <option value="cooldown">Cooldown 24h miedzy podejsciami</option>
                </select>
              </div>
            </div>
          )}

          {/* STEP 5: Preview & Publish */}
          {step === 5 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Podglad i Publikacja</h2>
              <div className={`bg-gradient-to-br ${form.coverColor || 'from-indigo-600 to-violet-700'} rounded-[2rem] p-10 text-white`}>
                <div className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-2">{form.category}</div>
                <h3 className="text-3xl font-black uppercase italic tracking-tighter mb-2">{form.title || 'Tytul kursu'}</h3>
                <p className="text-sm opacity-80 mb-4">{form.description || 'Opis kursu pojawi sie tutaj.'}</p>
                <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest opacity-70">
                  <span>{form.duration || '—'}</span>
                  <span>{form.sections.length} sekcji</span>
                  <span>{form.questions.length} pytan</span>
                  <span>Prog: {form.passingScore}%</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-[1.5rem] p-5">
                  <div className={labelCls}>Dzialy docelowe</div>
                  <div className="text-sm font-black text-slate-700">{form.targetDepts.length ? form.targetDepts.join(', ') : 'Wszyscy'}</div>
                </div>
                <div className="bg-slate-50 rounded-[1.5rem] p-5">
                  <div className={labelCls}>Ustawienia</div>
                  <div className="text-sm font-black text-slate-700 space-y-1">
                    <div>{form.mandatory ? 'Obowiazkowy' : 'Opcjonalny'}</div>
                    <div>{form.certificate ? 'Certyfikat: TAK' : 'Certyfikat: NIE'}</div>
                  </div>
                </div>
              </div>
              <button className="w-full bg-slate-900 text-white py-5 rounded-[2rem] text-[11px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-2xl shadow-slate-200">
                Opublikuj Kurs
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          onClick={() => setStep((s) => Math.max(1, s - 1) as Step)}
          disabled={step === 1}
          className="flex items-center gap-2 px-8 py-4 rounded-[1.5rem] bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} /> Poprzedni
        </button>
        {step < 5 && (
          <button
            onClick={() => setStep((s) => Math.min(5, s + 1) as Step)}
            className="flex items-center gap-2 px-8 py-4 rounded-[1.5rem] bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg"
          >
            Nastepny <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
