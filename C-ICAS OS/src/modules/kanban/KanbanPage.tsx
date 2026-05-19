import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, ChevronRight, ChevronLeft } from 'lucide-react';
import { useTenant } from '../../core/auth/TenantContext';
import { useAuth } from '../../core/auth/AuthContext';
import { db } from '../../core/firebase/config';
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, onSnapshot, serverTimestamp,
} from 'firebase/firestore';

type Column = 'backlog' | 'in_progress' | 'review' | 'done';

// COLS defined inside component to use t()

interface Card {
  id: string;
  title: string;
  column: Column;
  createdAt: any;
}

export default function KanbanPage() {
  const { t } = useTranslation();
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const tenantId = currentTenant?.id;

  const COLS: { id: Column; label: string; accent: string }[] = [
    { id: 'backlog',     label: t('kanban.backlog'),   accent: 'border-zinc-700 text-zinc-400' },
    { id: 'in_progress', label: t('kanban.inProgress'), accent: 'border-blue-700 text-blue-400' },
    { id: 'review',      label: t('kanban.review'),    accent: 'border-amber-700 text-amber-400' },
    { id: 'done',        label: t('kanban.done'),      accent: 'border-emerald-700 text-emerald-400' },
  ];

  const [cards, setCards] = useState<Card[]>([]);
  const [adding, setAdding] = useState<Column | null>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!tenantId) return;
    const q = query(collection(db, `tenants/${tenantId}/kanbanCards`), orderBy('createdAt', 'asc'));
    return onSnapshot(q, snap =>
      setCards(snap.docs.map(d => ({ id: d.id, ...d.data() } as Card)))
    );
  }, [tenantId]);

  const addCard = async (col: Column) => {
    const title = draft.trim();
    if (!title || !tenantId || !user) return;
    await addDoc(collection(db, `tenants/${tenantId}/kanbanCards`), {
      title, column: col, createdBy: user.uid, createdAt: serverTimestamp(),
    });
    setDraft(''); setAdding(null);
  };

  const move = async (id: string, dir: 'left' | 'right', cur: Column) => {
    if (!tenantId) return;
    const idx = COLS.findIndex(c => c.id === cur);
    const next = dir === 'right' ? idx + 1 : idx - 1;
    if (next < 0 || next >= COLS.length) return;
    await updateDoc(doc(db, `tenants/${tenantId}/kanbanCards`, id), { column: COLS[next].id });
  };

  const del = async (id: string) => {
    if (!tenantId) return;
    await deleteDoc(doc(db, `tenants/${tenantId}/kanbanCards`, id));
  };

  if (!tenantId) return <div className="p-6 text-zinc-400 text-sm">{t('kanban.noWorkspace')}</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-black text-white uppercase tracking-tighter mb-6">{t('kanban.title')}</h1>
      <div className="grid grid-cols-4 gap-3 items-start">
        {COLS.map((col, colIdx) => {
          const colCards = cards.filter(c => c.column === col.id);
          return (
            <div key={col.id} className={`bg-zinc-900 border ${col.accent.split(' ')[0]} rounded-2xl p-4 flex flex-col min-h-[60vh]`}>
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <span className={`text-[10px] font-black uppercase tracking-widest ${col.accent.split(' ')[1]}`}>{col.label}</span>
                <span className="text-[10px] font-bold text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-full">{colCards.length}</span>
              </div>

              {/* Cards */}
              <div className="flex-1 space-y-2">
                {colCards.map(card => (
                  <div key={card.id} className="bg-zinc-800 border border-zinc-700 rounded-xl p-3 group">
                    <p className="text-sm font-medium text-zinc-200 mb-2 leading-snug">{card.title}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1">
                        {colIdx > 0 && (
                          <button onClick={() => move(card.id, 'left', col.id)}
                            title={t('kanban.moveLeft')}
                            className="p-1 rounded-lg hover:bg-zinc-700 text-zinc-600 hover:text-zinc-300 transition-all">
                            <ChevronLeft size={12} />
                          </button>
                        )}
                        {colIdx < COLS.length - 1 && (
                          <button onClick={() => move(card.id, 'right', col.id)}
                            title={t('kanban.moveRight')}
                            className="p-1 rounded-lg hover:bg-zinc-700 text-zinc-600 hover:text-zinc-300 transition-all">
                            <ChevronRight size={12} />
                          </button>
                        )}
                      </div>
                      <button onClick={() => del(card.id)}
                        className="p-1 rounded-lg text-zinc-700 hover:text-red-400 hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add card */}
              {adding === col.id ? (
                <div className="mt-3">
                  <textarea
                    autoFocus
                    rows={2}
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addCard(col.id); }
                      if (e.key === 'Escape') { setAdding(null); setDraft(''); }
                    }}
                    placeholder={t('kanban.taskNamePlaceholder')}
                    className="w-full bg-zinc-800 border border-indigo-500 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none resize-none mb-2"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => addCard(col.id)}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black py-1.5 rounded-xl transition-all">
                      {t('kanban.add')}
                    </button>
                    <button onClick={() => { setAdding(null); setDraft(''); }}
                      className="px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs rounded-xl transition-all">
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setAdding(col.id); setDraft(''); }}
                  className="mt-3 flex items-center gap-1.5 text-zinc-600 hover:text-zinc-300 text-xs font-bold transition-all">
                  <Plus size={13} /> {t('kanban.addCard')}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
