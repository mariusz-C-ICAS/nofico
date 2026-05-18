/**
 * Data: 2026-05-16
 * Sciezka: src/modules/communication/components/AnnouncementBoard.tsx
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Pin, AlertTriangle, Info, Flame, ThumbsUp, Heart, HandMetal,
  Eye, Plus, X, ChevronDown, Calendar, Users, Check, Megaphone, Loader2,
} from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, doc, Timestamp, orderBy, query } from 'firebase/firestore';
import { useTenant } from '../../../shared/hooks/useTenant';

type Priority = 'info' | 'important' | 'critical';

interface Reaction { emoji: string; icon: React.ElementType; count: number; reacted: boolean; }

interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  authorInitials: string;
  authorColor: string;
  date: string;
  expiryDate: string;
  departments: string[];
  priority: Priority;
  readCount: number;
  totalEmployees: number;
  isRead: boolean;
  reactions: Reaction[];
  pinned: boolean;
}

const DEPARTMENTS = ['Wszyscy', 'IT', 'HR', 'Finanse', 'Marketing', 'Sprzedaz', 'Compliance'];

const PRIORITY_CONFIG: Record<Priority, { label: string; icon: React.ElementType; bg: string; text: string; border: string }> = {
  info:      { label: 'Info',  icon: Info,          bg: 'bg-sky-50',   text: 'text-sky-700',   border: 'border-sky-200'   },
  important: { label: 'Wazne', icon: AlertTriangle, bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  critical:  { label: 'Pilne', icon: Flame,         bg: 'bg-rose-50',  text: 'text-rose-700',  border: 'border-rose-200'  },
};

const REACTION_ICONS: Record<string, React.ElementType> = {
  '👍': ThumbsUp,
  '❤️': Heart,
  '👏': HandMetal,
};

const DEFAULT_REACTIONS = () => [
  { emoji: '👍', icon: ThumbsUp,  count: 0, reacted: false },
  { emoji: '❤️', icon: Heart,     count: 0, reacted: false },
  { emoji: '👏', icon: HandMetal, count: 0, reacted: false },
];

function mapDoc(id: string, data: any): Announcement {
  return {
    id,
    title:          data.title          ?? '',
    content:        data.content        ?? '',
    author:         data.author         ?? '',
    authorInitials: data.authorInitials ?? '??',
    authorColor:    data.authorColor    ?? 'bg-slate-600',
    date:           data.date           ?? '',
    expiryDate:     data.expiryDate     ?? '',
    departments:    data.departments    ?? ['Wszyscy'],
    priority:       (data.priority      ?? 'info') as Priority,
    readCount:      data.readCount      ?? 0,
    totalEmployees: data.totalEmployees ?? 0,
    isRead:         data.isRead         ?? false,
    pinned:         data.pinned         ?? false,
    reactions: (data.reactions ?? []).map((r: any) => ({
      emoji:   r.emoji,
      icon:    REACTION_ICONS[r.emoji] ?? ThumbsUp,
      count:   r.count   ?? 0,
      reacted: r.reacted ?? false,
    })),
  };
}

interface CreateModalProps {
  onClose: () => void;
  onPublish: (form: { title: string; content: string; departments: string[]; priority: Priority; expiryDate: string }) => void;
}

function CreateModal({ onClose, onPublish }: CreateModalProps) {
  const [form, setForm] = useState({
    title: '', content: '', departments: ['Wszyscy'] as string[],
    priority: 'info' as Priority, expiryDate: '',
  });

  const toggleDept = (dept: string) => setForm(prev => ({
    ...prev,
    departments: prev.departments.includes(dept)
      ? prev.departments.filter(d => d !== dept)
      : [...prev.departments, dept],
  }));

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Nowe Ogloszenie</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tylko Administrator</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-400"><X size={20} /></button>
        </div>

        <div className="p-8 space-y-5 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Tytul</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Tytul ogloszenia..."
              className="w-full bg-slate-100 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 ring-indigo-500 outline-none font-bold" />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Tresc</label>
            <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={4}
              className="w-full bg-slate-100 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 ring-indigo-500 outline-none font-medium resize-none" />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Priorytet</label>
            <div className="flex gap-2">
              {(Object.keys(PRIORITY_CONFIG) as Priority[]).map(p => {
                const cfg = PRIORITY_CONFIG[p];
                return (
                  <button key={p} onClick={() => setForm({ ...form, priority: p })}
                    className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                      form.priority === p ? `${cfg.bg} ${cfg.text} ${cfg.border}` : 'bg-slate-100 text-slate-500 border-transparent'
                    }`}>
                    <cfg.icon size={12} /> {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Dzialy docelowe</label>
            <div className="flex flex-wrap gap-2">
              {DEPARTMENTS.map(dept => (
                <button key={dept} onClick={() => toggleDept(dept)}
                  className={`px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                    form.departments.includes(dept) ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-500 border-transparent'
                  }`}>
                  {form.departments.includes(dept) && <Check size={10} className="inline mr-1" />}
                  {dept}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Data wygasniecia</label>
            <input type="date" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })}
              className="w-full bg-slate-100 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 ring-indigo-500 outline-none font-bold" />
          </div>

          <button
            onClick={() => { onPublish(form); onClose(); }}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl">
            Opublikuj Ogloszenie
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function AnnouncementBoard() {
  const { activeTenantId } = useTenant();
  const [announcements,   setAnnouncements]   = useState<Announcement[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [filterDept,      setFilterDept]      = useState('Wszyscy');
  const [filterPriority,  setFilterPriority]  = useState<Priority | 'all'>('all');
  const [showCreate,      setShowCreate]      = useState(false);

  useEffect(() => {
    if (!activeTenantId) return;
    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(query(
          collection(db, `tenants/${activeTenantId}/announcements`),
          orderBy('createdAt', 'desc'),
        ));
        setAnnouncements(snap.docs.map(d => mapDoc(d.id, d.data())));
      } finally {
        setLoading(false);
      }
    })();
  }, [activeTenantId]);

  const filtered  = announcements.filter(a =>
    (filterDept     === 'Wszyscy' || a.departments.includes(filterDept)) &&
    (filterPriority === 'all'     || a.priority === filterPriority)
  );
  const pinned  = filtered.filter(a =>  a.pinned);
  const regular = filtered.filter(a => !a.pinned);

  const toggleReaction = async (annId: string, rIdx: number) => {
    const ann = announcements.find(a => a.id === annId);
    if (!ann) return;
    const newReactions = ann.reactions.map((r, i) => i === rIdx
      ? { emoji: r.emoji, count: r.reacted ? r.count - 1 : r.count + 1, reacted: !r.reacted }
      : { emoji: r.emoji, count: r.count, reacted: r.reacted }
    );
    await updateDoc(doc(db, `tenants/${activeTenantId}/announcements`, annId), { reactions: newReactions });
    setAnnouncements(prev => prev.map(a => {
      if (a.id !== annId) return a;
      return {
        ...a,
        reactions: a.reactions.map((r, i) => i === rIdx
          ? { ...r, count: r.reacted ? r.count - 1 : r.count + 1, reacted: !r.reacted }
          : r
        ),
      };
    }));
  };

  const markRead = async (annId: string) => {
    const ann = announcements.find(a => a.id === annId);
    if (!ann || ann.isRead) return;
    await updateDoc(doc(db, `tenants/${activeTenantId}/announcements`, annId), {
      isRead: true, readCount: ann.readCount + 1,
    });
    setAnnouncements(prev => prev.map(a =>
      a.id === annId ? { ...a, isRead: true, readCount: a.readCount + 1 } : a
    ));
  };

  const handlePublish = async (formData: { title: string; content: string; departments: string[]; priority: Priority; expiryDate: string }) => {
    const now = new Date().toISOString().split('T')[0];
    const docRef = await addDoc(collection(db, `tenants/${activeTenantId}/announcements`), {
      ...formData,
      author: 'Admin', authorInitials: 'AD', authorColor: 'bg-slate-600',
      date: now, readCount: 0, totalEmployees: 0, isRead: false,
      reactions: DEFAULT_REACTIONS().map(({ icon: _icon, ...r }) => r),
      pinned: false,
      createdAt: Timestamp.now(),
    });
    setAnnouncements(prev => [mapDoc(docRef.id, {
      ...formData,
      author: 'Admin', authorInitials: 'AD', authorColor: 'bg-slate-600',
      date: now, readCount: 0, totalEmployees: 0, isRead: false,
      reactions: DEFAULT_REACTIONS().map(({ icon: _icon, ...r }) => r),
      pinned: false,
    }), ...prev]);
  };

  const AnnCard = ({ ann }: { ann: Announcement }) => {
    const cfg      = PRIORITY_CONFIG[ann.priority];
    const readRate = Math.round((ann.readCount / Math.max(ann.totalEmployees, 1)) * 100);
    const [expanded, setExpanded] = useState(false);

    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className={`bg-white rounded-[2rem] border p-8 transition-all hover:shadow-lg ${
          ann.priority === 'critical' ? 'border-rose-200 shadow-rose-50 shadow-md' : 'border-slate-100'
        } ${!ann.isRead ? 'ring-2 ring-indigo-100' : ''}`}>
        <div className="flex items-start gap-4">
          {ann.pinned && (
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 mt-1">
              <Pin size={14} className="text-amber-500" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                <cfg.icon size={10} /> {cfg.label}
              </span>
              {ann.departments.map(d => (
                <span key={d} className="bg-slate-100 text-slate-600 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full">{d}</span>
              ))}
              {!ann.isRead && (
                <span className="bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full">Nowe</span>
              )}
            </div>

            <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase italic leading-tight mb-2">{ann.title}</h3>
            <p className={`text-sm text-slate-600 font-medium leading-relaxed ${!expanded ? 'line-clamp-2' : ''}`}>{ann.content}</p>
            {ann.content.length > 120 && (
              <button onClick={() => setExpanded(!expanded)}
                className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-2 flex items-center gap-1">
                <ChevronDown size={12} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                {expanded ? 'Zwiń' : 'Rozwiń'}
              </button>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-lg ${ann.authorColor} flex items-center justify-center text-white text-[8px] font-black`}>
                  {ann.authorInitials}
                </div>
                <span className="text-[10px] font-bold text-slate-500">{ann.author}</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                <Calendar size={10} /> {ann.date}
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                <Eye size={10} /> {ann.readCount}/{ann.totalEmployees} ({readRate}%)
              </div>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${readRate > 80 ? 'bg-emerald-500' : readRate > 50 ? 'bg-amber-400' : 'bg-indigo-500'}`}
                  style={{ width: `${readRate}%` }} />
              </div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{readRate}% przeczytalo</span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="flex gap-2">
                {ann.reactions.map((r, i) => (
                  <button key={i} onClick={() => toggleReaction(ann.id, i)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black border transition-all ${
                      r.reacted ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-200'
                    }`}>
                    {r.emoji} {r.count}
                  </button>
                ))}
              </div>
              {!ann.isRead && (
                <button onClick={() => markRead(ann.id)}
                  className="ml-auto flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase tracking-widest px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-all">
                  <Check size={10} /> Oznacz jako przeczytane
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-4 justify-between">
        <div className="flex flex-wrap gap-2">
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
            className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-700 outline-none focus:border-indigo-400 appearance-none">
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
            <button onClick={() => setFilterPriority('all')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterPriority === 'all' ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}>
              Wszystkie
            </button>
            {(Object.keys(PRIORITY_CONFIG) as Priority[]).map(p => {
              const cfg = PRIORITY_CONFIG[p];
              return (
                <button key={p} onClick={() => setFilterPriority(p)}
                  className={`flex items-center gap-1 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    filterPriority === p ? `bg-white shadow ${cfg.text}` : 'text-slate-500'
                  }`}>
                  <cfg.icon size={10} /> {cfg.label}
                </button>
              );
            })}
          </div>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-600 transition-all shadow-lg">
          <Plus size={14} /> Nowe Ogloszenie
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" size={24} /></div>
      ) : (
        <>
          {pinned.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-black text-amber-600 uppercase tracking-widest">
                <Pin size={12} /> Przypięte
              </div>
              {pinned.map(a => <AnnCard key={a.id} ann={a} />)}
            </div>
          )}

          {regular.length > 0 && (
            <div className="space-y-3">
              {pinned.length > 0 && <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pozostale</div>}
              {regular.map(a => <AnnCard key={a.id} ann={a} />)}
            </div>
          )}

          {filtered.length === 0 && (
            <div className="text-center py-20 text-slate-400">
              <Megaphone size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-sm font-black uppercase tracking-widest">Brak ogloszen dla wybranych filtrow</p>
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {showCreate && <CreateModal onClose={() => setShowCreate(false)} onPublish={handlePublish} />}
      </AnimatePresence>
    </div>
  );
}
