/**
 * Data: 2026-05-16
 * Ścieżka: /src/modules/eRecruitment/components/InterviewScheduler.tsx
 */
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  CalendarDays, Clock, Video, Users, Plus, X,
  CheckCircle2, AlertCircle, Circle, ChevronLeft, ChevronRight, Loader2,
} from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { useTenant } from '../../../shared/hooks/useTenant';

type InterviewType   = 'HR' | 'Techniczne' | 'Finalna';
type InterviewStatus = 'Zaplanowana' | 'Zakonczona' | 'Odwolana';

interface Interview {
  id: string;
  candidate: string;
  position: string;
  interviewers: string[];
  date: string;
  time: string;
  type: InterviewType;
  status: InterviewStatus;
  meetLink: string;
  notes?: string;
}

const TYPE_STYLE: Record<InterviewType, string> = {
  'HR':         'bg-indigo-100 text-indigo-700',
  'Techniczne': 'bg-amber-100 text-amber-700',
  'Finalna':    'bg-purple-100 text-purple-700',
};

const STATUS_ICON: Record<InterviewStatus, React.ElementType> = {
  'Zaplanowana': Circle,
  'Zakonczona':  CheckCircle2,
  'Odwolana':    AlertCircle,
};

const STATUS_COLOR: Record<InterviewStatus, string> = {
  'Zaplanowana': 'text-indigo-600',
  'Zakonczona':  'text-emerald-600',
  'Odwolana':    'text-rose-600',
};

const WEEK_DAYS = ['Pon', 'Wt', 'Sr', 'Czw', 'Pt', 'Sob', 'Nd'];

function WeekCalendar({ interviews }: { interviews: Interview[] }) {
  const [weekOffset, setWeekOffset] = useState(0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString().split('T')[0];

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - ((today.getDay() + 6) % 7) + weekOffset * 7);

  const days = WEEK_DAYS.map((label, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const iso = d.toISOString().split('T')[0];
    return { label, iso, day: d.getDate(), interviews: interviews.filter(iv => iv.date === iso) };
  });

  return (
    <div className="bg-white border-2 border-slate-100 rounded-[3rem] p-8 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-tighter">Widok Tygodniowy</h3>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset(w => w - 1)} className="p-2 rounded-xl hover:bg-slate-100 transition-all">
            <ChevronLeft size={16} className="text-slate-500" />
          </button>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-3">
            {startOfWeek.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => setWeekOffset(w => w + 1)} className="p-2 rounded-xl hover:bg-slate-100 transition-all">
            <ChevronRight size={16} className="text-slate-500" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map(d => (
          <div key={d.iso} className="min-h-[120px]">
            <div className={`text-center mb-2 ${d.iso === todayIso ? 'text-indigo-600' : 'text-slate-400'}`}>
              <div className="text-[9px] font-black uppercase tracking-widest">{d.label}</div>
              <div className={`text-lg font-black italic mt-0.5 ${d.iso === todayIso ? 'bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center mx-auto' : ''}`}>
                {d.day}
              </div>
            </div>
            <div className="space-y-1">
              {d.interviews.map(iv => (
                <div key={iv.id} className={`text-[8px] font-black uppercase tracking-tighter px-2 py-1 rounded-lg ${TYPE_STYLE[iv.type]} truncate`}>
                  {iv.time} {iv.candidate.split(' ')[0]}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InterviewScheduler() {
  const { activeTenantId } = useTenant();
  const [interviews,  setInterviews]  = useState<Interview[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showModal,   setShowModal]   = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [form, setForm] = useState({
    candidate: '', position: '', date: '', time: '',
    interviewers: '', type: 'HR' as InterviewType, notes: '',
  });

  useEffect(() => {
    if (!activeTenantId) return;
    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, `tenants/${activeTenantId}/interviews`));
        setInterviews(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Interview)));
      } finally {
        setLoading(false);
      }
    })();
  }, [activeTenantId]);

  const handleSave = async () => {
    if (!form.candidate || !form.date || saving) return;
    setSaving(true);
    try {
      const docRef = await addDoc(collection(db, `tenants/${activeTenantId}/interviews`), {
        candidate:    form.candidate,
        position:     form.position,
        interviewers: form.interviewers.split(',').map(s => s.trim()).filter(Boolean),
        date:         form.date,
        time:         form.time,
        type:         form.type,
        status:       'Zaplanowana' as InterviewStatus,
        meetLink:     '',
        notes:        form.notes,
        createdAt:    Timestamp.now(),
      });
      setInterviews(prev => [...prev, {
        id:           docRef.id,
        candidate:    form.candidate,
        position:     form.position,
        interviewers: form.interviewers.split(',').map(s => s.trim()).filter(Boolean),
        date:         form.date,
        time:         form.time,
        type:         form.type,
        status:       'Zaplanowana',
        meetLink:     '',
        notes:        form.notes,
      }]);
      setForm({ candidate: '', position: '', date: '', time: '', interviewers: '', type: 'HR', notes: '' });
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <button
          onClick={() => setShowModal(true)}
          className="bg-slate-900 text-white px-10 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-indigo-600 transition-all shadow-2xl shadow-slate-200"
        >
          <Plus size={16} /> Zaplanuj Rozmowe
        </button>
      </div>

      <WeekCalendar interviews={interviews} />

      <div className="space-y-4">
        <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-tighter">Nadchodzace Rozmowy</h3>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" size={24} /></div>
        ) : interviews.length === 0 ? (
          <p className="text-sm italic text-slate-400 text-center py-8">Brak zaplanowanych rozmów</p>
        ) : (
          interviews.map((iv, i) => {
            const StatusIcon = STATUS_ICON[iv.status] ?? Circle;
            return (
              <motion.div
                key={iv.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 shadow-sm hover:border-indigo-100 hover:shadow-md transition-all"
              >
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  <div className="flex gap-5 items-start">
                    <div className={`px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest ${TYPE_STYLE[iv.type] ?? 'bg-slate-100 text-slate-600'} flex-shrink-0`}>
                      {iv.type}
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-base font-black text-slate-900 italic tracking-tight">{iv.candidate}</h4>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{iv.position}</p>
                      <div className="flex flex-wrap gap-4 mt-2">
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                          <CalendarDays size={11} className="text-slate-300" /> {iv.date}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                          <Clock size={11} className="text-slate-300" /> {iv.time}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                          <Users size={11} className="text-slate-300" /> {iv.interviewers?.join(', ')}
                        </div>
                      </div>
                      {iv.notes && <p className="text-[10px] font-black text-slate-400 italic mt-1">{iv.notes}</p>}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3 flex-shrink-0">
                    <div className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-widest ${STATUS_COLOR[iv.status] ?? 'text-slate-500'}`}>
                      <StatusIcon size={12} /> {iv.status}
                    </div>
                    {iv.meetLink && (
                      <a href={iv.meetLink} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-600 px-5 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border border-indigo-100">
                        <Video size={12} /> Dolacz do Meet
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg p-10 border border-slate-100 space-y-6"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Zaplanuj Rozmowe</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Integracja z Google Meet</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                <X size={18} className="text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              {[
                { label: 'Kandydat',   key: 'candidate',    placeholder: 'Imie i nazwisko kandydata' },
                { label: 'Stanowisko', key: 'position',     placeholder: 'np. Senior Full-Stack Developer' },
                { label: 'Prowadzacy', key: 'interviewers', placeholder: 'np. Anna Kowalska, Piotr Nowak' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{f.label}</label>
                  <input type="text" value={(form as any)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm"
                  />
                </div>
              ))}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Data</label>
                  <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Godzina</label>
                  <input type="time" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Typ rozmowy</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as InterviewType }))}
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm">
                  <option value="HR">HR</option>
                  <option value="Techniczne">Techniczne</option>
                  <option value="Finalna">Finalna</option>
                </select>
              </div>

              <div className="bg-indigo-50 rounded-2xl px-5 py-3 border border-indigo-100 flex items-center gap-3">
                <Video size={14} className="text-indigo-600 flex-shrink-0" />
                <div>
                  <div className="text-[9px] font-black text-indigo-700 uppercase tracking-widest">Link Google Meet</div>
                  <div className="text-[9px] font-black text-indigo-400 mt-0.5">Zostanie wygenerowany automatycznie po zapisaniu</div>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Notatki</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Wskazowki dla prowadzacego..."
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm min-h-[70px] resize-none" />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="px-6 py-3 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 rounded-xl transition-all">
                Anuluj
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-8 py-3 bg-slate-900 hover:bg-indigo-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 size={13} className="animate-spin" />}
                Zapisz Rozmowe
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
