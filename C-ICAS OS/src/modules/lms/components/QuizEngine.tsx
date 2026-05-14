/**
 * Data: 2026-05-14
 * Ścieżka: /src/modules/lms/components/QuizEngine.tsx
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ClipboardList, Clock, CheckCircle2, XCircle,
  Award, RotateCcw, Download, ChevronRight, AlertTriangle
} from 'lucide-react';

interface QuizOption { text: string; correct: boolean; }
interface QuizQuestion { id: string; question: string; options: QuizOption[]; explanation: string; }

const QUIZ: { title: string; course: string; timeLimit: number; passingScore: number; questions: QuizQuestion[] } = {
  title: 'Egzamin: BHP Podstawowe 2026',
  course: 'BHP Podstawowe 2026',
  timeLimit: 600, // seconds
  passingScore: 80,
  questions: [
    {
      id: 'q1', question: 'Jaki jest obowiazkowy element wyposazenia pracownika wykonujacego prace na wysokosci powyzej 1 metra?',
      options: [
        { text: 'Kask ochronny i szelki bezpieczenstwa', correct: true },
        { text: 'Tylko kask ochronny', correct: false },
        { text: 'Kamizelka odblaskowa', correct: false },
        { text: 'Zadna odpowiedz nie jest poprawna', correct: false },
      ],
      explanation: 'Na wysokosciach powyzej 1m wymagany jest kask i szelki bezpieczenstwa zgodnie z Rozporzadzeniem Ministra Pracy z 2023r.',
    },
    {
      id: 'q2', question: 'W przypadku pozaru w miejscu pracy nalezy w pierwszej kolejnosci:',
      options: [
        { text: 'Zaatakowac ogien gasnica', correct: false },
        { text: 'Powiadomic straz pozarna i ewakuowac ludzi', correct: true },
        { text: 'Ratowac mienie firmy', correct: false },
        { text: 'Odczekac az ogien sam zgasnie', correct: false },
      ],
      explanation: 'Priorytetem jest ewakuacja i powiadomienie sluzb ratowniczych. Mienie jest drugorzedne wobec zycia ludzkiego.',
    },
    {
      id: 'q3', question: 'Maksymalny dopuszczalny poziom halasu w miejscu pracy bez wymogu stosowania ochrony sluchu wynosi:',
      options: [
        { text: '75 dB', correct: false },
        { text: '85 dB', correct: true },
        { text: '95 dB', correct: false },
        { text: '100 dB', correct: false },
      ],
      explanation: 'Zgodnie z Rozporzadzeniem Ministra Srodowiska, NDS hałasu to 85 dB. Powyzej tego poziomu wymagana jest ochrona sluchu.',
    },
    {
      id: 'q4', question: 'Kto jest odpowiedzialny za zapewnienie bezpiecznych warunkow pracy?',
      options: [
        { text: 'Inspekcja pracy', correct: false },
        { text: 'Sami pracownicy', correct: false },
        { text: 'Pracodawca', correct: true },
        { text: 'Ubezpieczalnia BHP', correct: false },
      ],
      explanation: 'Zgodnie z Art. 207 Kodeksu Pracy, pracodawca ponosi odpowiedzialnosc za stan bezpieczenstwa i higieny pracy.',
    },
    {
      id: 'q5', question: 'Jak czesto przeprowadzane sa obowiazkowe szkolenia BHP dla pracownikow na stanowiskach nierobotniczych?',
      options: [
        { text: 'Co rok', correct: false },
        { text: 'Co 2 lata', correct: false },
        { text: 'Co 5 lat', correct: true },
        { text: 'Tylko podczas zatrudnienia', correct: false },
      ],
      explanation: 'Szkolenia okresowe BHP dla pracownikow administracyjno-biurowych przeprowadza sie nie rzadziej niz raz na 5 lat.',
    },
  ],
};

type Phase = 'start' | 'quiz' | 'confirm' | 'result';

export default function QuizEngine() {
  const [phase, setPhase] = useState<Phase>('start');
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(QUIZ.questions.length).fill(null));
  const [timeLeft, setTimeLeft] = useState(QUIZ.timeLimit);
  const [selected, setSelected] = useState<number | null>(null);

  const q = QUIZ.questions[current];
  const totalQ = QUIZ.questions.length;

  useEffect(() => {
    if (phase !== 'quiz') return;
    const t = setInterval(() => {
      setTimeLeft((v) => {
        if (v <= 1) { clearInterval(t); setPhase('result'); return 0; }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  const startQuiz = () => {
    setPhase('quiz');
    setTimeLeft(QUIZ.timeLimit);
    setAnswers(Array(totalQ).fill(null));
    setCurrent(0);
    setSelected(null);
  };

  const confirmAnswer = () => {
    if (selected === null) return;
    const updated = [...answers];
    updated[current] = selected;
    setAnswers(updated);
    setSelected(null);
    if (current < totalQ - 1) {
      setCurrent((c) => c + 1);
    } else {
      setPhase('confirm');
    }
  };

  const submitQuiz = () => setPhase('result');

  const score = useCallback(() => {
    const correct = answers.filter((a, i) => a !== null && QUIZ.questions[i].options[a]?.correct).length;
    return Math.round((correct / totalQ) * 100);
  }, [answers]);

  const passed = score() >= QUIZ.passingScore;

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const ss = String(timeLeft % 60).padStart(2, '0');
  const timeWarning = timeLeft < 60;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <AnimatePresence mode="wait">

        {/* START */}
        {phase === 'start' && (
          <motion.div key="start" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="bg-white border-2 border-slate-100 rounded-[3rem] p-14 text-center shadow-sm space-y-8"
          >
            <div className="w-20 h-20 bg-indigo-50 rounded-[1.5rem] flex items-center justify-center mx-auto">
              <ClipboardList size={38} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter mb-3">{QUIZ.title}</h2>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Kurs: {QUIZ.course}</p>
            </div>
            <div className="flex justify-center gap-8">
              {[
                { label: 'Pytan', value: totalQ },
                { label: 'Czas', value: `${QUIZ.timeLimit / 60} min` },
                { label: 'Prog zaliczenia', value: `${QUIZ.passingScore}%` },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <div className="text-2xl font-black text-slate-900 italic">{value}</div>
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{label}</div>
                </div>
              ))}
            </div>
            <button onClick={startQuiz} className="bg-slate-900 text-white px-14 py-5 rounded-[2rem] text-[11px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-2xl shadow-slate-200">
              Rozpocznij Egzamin
            </button>
          </motion.div>
        )}

        {/* QUIZ */}
        {phase === 'quiz' && (
          <motion.div key={`quiz-${current}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-white border-2 border-slate-100 rounded-[2rem] px-8 py-5 shadow-sm">
              <div>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Pytanie</div>
                <div className="text-lg font-black text-slate-900 italic">{current + 1} / {totalQ}</div>
              </div>
              {/* Progress bar */}
              <div className="flex-1 mx-8">
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full transition-all" style={{ width: `${((current) / totalQ) * 100}%` }} />
                </div>
              </div>
              <div className={`flex items-center gap-2 px-5 py-3 rounded-[1.5rem] ${timeWarning ? 'bg-rose-50 border-2 border-rose-200' : 'bg-slate-100'} transition-all`}>
                <Clock size={16} className={timeWarning ? 'text-rose-600 animate-pulse' : 'text-slate-500'} />
                <span className={`text-base font-black italic ${timeWarning ? 'text-rose-600' : 'text-slate-700'}`}>{mm}:{ss}</span>
              </div>
            </div>

            {/* Question */}
            <div className="bg-white border-2 border-slate-100 rounded-[2rem] p-10 shadow-sm space-y-8">
              <h3 className="text-xl font-black text-slate-900 leading-snug">{q.question}</h3>
              <div className="space-y-3">
                {q.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => setSelected(i)}
                    className={`w-full text-left px-7 py-5 rounded-[1.5rem] border-2 transition-all font-black text-sm ${
                      selected === i
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200'
                        : 'border-slate-100 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50'
                    }`}
                  >
                    <span className={`inline-block w-7 h-7 rounded-full border-2 mr-4 text-center leading-[1.5rem] text-xs font-black ${
                      selected === i ? 'border-white/50 text-white' : 'border-slate-200 text-slate-400'
                    }`}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt.text}
                  </button>
                ))}
              </div>
              <button
                onClick={confirmAnswer}
                disabled={selected === null}
                className="w-full bg-slate-900 text-white py-5 rounded-[2rem] text-[11px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {current < totalQ - 1 ? 'Nastepne pytanie' : 'Zakoncz egzamin'}
                <ChevronRight size={18} />
              </button>
            </div>
          </motion.div>
        )}

        {/* CONFIRM SUBMIT */}
        {phase === 'confirm' && (
          <motion.div key="confirm" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="bg-white border-2 border-slate-100 rounded-[3rem] p-14 text-center shadow-sm space-y-8"
          >
            <AlertTriangle size={48} className="text-amber-500 mx-auto" />
            <div>
              <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter mb-2">Zatwierdzic odpowiedzi?</h2>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                Odpowiedziales na {answers.filter((a) => a !== null).length} z {totalQ} pytan. Po zatwierdzeniu nie mozna edytowac odpowiedzi.
              </p>
            </div>
            <div className="flex gap-4 justify-center">
              <button onClick={() => { setCurrent(totalQ - 1); setPhase('quiz'); }}
                className="px-10 py-4 rounded-[2rem] bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
                Wróc
              </button>
              <button onClick={submitQuiz}
                className="px-10 py-4 rounded-[2rem] bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg">
                Zatwierdz i zakoncz
              </button>
            </div>
          </motion.div>
        )}

        {/* RESULT */}
        {phase === 'result' && (
          <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Score card */}
            <div className={`rounded-[3rem] p-14 text-center space-y-6 ${passed ? 'bg-emerald-600' : 'bg-slate-900'}`}>
              {passed ? <CheckCircle2 size={56} className="text-white mx-auto" /> : <XCircle size={56} className="text-rose-400 mx-auto" />}
              <div>
                <div className="text-6xl font-black text-white italic mb-2">{score()}%</div>
                <div className="text-[11px] font-black text-white/70 uppercase tracking-widest">
                  {passed ? 'EGZAMIN ZALICZONY' : 'EGZAMIN NIEZALICZONY'}
                </div>
              </div>
              <div className="flex justify-center gap-8">
                {[
                  { label: 'Poprawne', value: answers.filter((a, i) => a !== null && QUIZ.questions[i].options[a]?.correct).length },
                  { label: 'Bledne', value: answers.filter((a, i) => a !== null && !QUIZ.questions[i].options[a]?.correct).length },
                  { label: 'Bez odp.', value: answers.filter((a) => a === null).length },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <div className="text-2xl font-black text-white italic">{value}</div>
                    <div className="text-[9px] font-black text-white/60 uppercase tracking-widest mt-1">{label}</div>
                  </div>
                ))}
              </div>
              <div className="flex justify-center gap-4">
                {passed && (
                  <button className="flex items-center gap-2 bg-white text-emerald-700 px-10 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:bg-emerald-50 transition-all shadow-lg">
                    <Download size={16} /> Pobierz Certyfikat
                  </button>
                )}
                <button onClick={startQuiz} className="flex items-center gap-2 bg-white/10 text-white px-10 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all border border-white/20">
                  <RotateCcw size={16} /> Podejdz ponownie
                </button>
              </div>
            </div>

            {/* Answers breakdown */}
            <div className="bg-white border-2 border-slate-100 rounded-[2rem] p-8 space-y-5">
              <h3 className="text-base font-black text-slate-900 uppercase italic tracking-tighter">Omowienie odpowiedzi</h3>
              {QUIZ.questions.map((question, i) => {
                const userAnswer = answers[i];
                const isCorrect = userAnswer !== null && question.options[userAnswer]?.correct;
                return (
                  <div key={question.id} className={`p-5 rounded-[1.5rem] border-2 ${isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                    <div className="flex items-start gap-3 mb-2">
                      {isCorrect
                        ? <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                        : <XCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                      }
                      <div className="flex-1">
                        <div className="text-sm font-black text-slate-800 mb-1">{i + 1}. {question.question}</div>
                        {userAnswer !== null && (
                          <div className={`text-[10px] font-black uppercase tracking-widest ${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                            Twoja odpowiedz: {question.options[userAnswer].text}
                          </div>
                        )}
                        {!isCorrect && (
                          <div className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                            Poprawna: {question.options.find((o) => o.correct)?.text}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-500 mt-2 leading-relaxed">{question.explanation}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
