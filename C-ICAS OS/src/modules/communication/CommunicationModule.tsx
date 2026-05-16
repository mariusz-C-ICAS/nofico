/**
 * Data: 2026-05-14
 * Sciezka: src/modules/communication/CommunicationModule.tsx
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare, Megaphone, Hash, Bell, Send, Search,
  Plus, Circle, ChevronDown, SmilePlus, Paperclip, AtSign,
  Lock, Users, Star, Pin
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../shared/lib/firebase';
import { useAuth } from '../../shared/hooks/AuthContext';
import { useTenant } from '../../shared/hooks/useTenant';
import AnnouncementBoard from './components/AnnouncementBoard';
import NotificationsTabPanel from './components/NotificationsTabPanel';

type Tab = 'wiadomosci' | 'ogloszenia' | 'kanaly' | 'powiadomienia';

interface Message {
  id: string;
  author: string;
  initials: string;
  avatarColor: string;
  time: string;
  content: string;
  reactions: { emoji: string; count: number; reacted: boolean }[];
}

interface Conversation {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  type: 'dm' | 'channel';
  icon?: React.ElementType;
  messages: Message[];
}

const CONVERSATIONS: Conversation[] = [
  {
    id: 'ch-general',
    name: 'general',
    initials: '',
    avatarColor: '',
    lastMessage: 'Anna: Dzisiaj o 15:00 spotkanie w Sali A',
    time: '14:55',
    unread: 3,
    online: false,
    type: 'channel',
    icon: Hash,
    messages: [
      { id: 'm1', author: 'Anna Kowalska', initials: 'AK', avatarColor: 'bg-violet-500', time: '08:30', content: 'Dzien dobry wszystkim! Przypominam o spotkaniu teamowym o 10:00.', reactions: [{ emoji: '👍', count: 5, reacted: false }, { emoji: '☕', count: 2, reacted: false }] },
      { id: 'm2', author: 'Tomasz Piotr', initials: 'TP', avatarColor: 'bg-emerald-500', time: '09:15', content: 'Dzieki za przypomnienie. Bede punktualnie.', reactions: [{ emoji: '👍', count: 1, reacted: false }] },
      { id: 'm3', author: 'Maria Nowak', initials: 'MN', avatarColor: 'bg-rose-500', time: '10:45', content: 'Spotkanie bylo bardzo produktywne. Nowe zadania przydzielone w Kanban.', reactions: [{ emoji: '🎉', count: 3, reacted: false }, { emoji: '👏', count: 4, reacted: false }] },
      { id: 'm4', author: 'Piotr Zaleski', initials: 'PZ', avatarColor: 'bg-amber-500', time: '13:20', content: 'Zakonczylem refactoring modulu HR. PR gotowy do review.', reactions: [{ emoji: '🚀', count: 2, reacted: false }] },
      { id: 'm5', author: 'Anna Kowalska', initials: 'AK', avatarColor: 'bg-violet-500', time: '14:55', content: 'Dzisiaj o 15:00 spotkanie w Sali A — temat: roadmapa Q3.', reactions: [] },
    ],
  },
  {
    id: 'ch-dev',
    name: 'dev-team',
    initials: '',
    avatarColor: '',
    lastMessage: 'Piotr: Build przeszedl pomyslnie',
    time: '14:42',
    unread: 1,
    online: false,
    type: 'channel',
    icon: Hash,
    messages: [
      { id: 'd1', author: 'Piotr Zaleski', initials: 'PZ', avatarColor: 'bg-amber-500', time: '09:00', content: 'Deployujemy dziś wersję 2.4.1 na staging o 12:00.', reactions: [{ emoji: '👍', count: 4, reacted: false }] },
      { id: 'd2', author: 'Kasia Wrona', initials: 'KW', avatarColor: 'bg-indigo-500', time: '09:30', content: 'Testy e2e gotowe. 98% pass rate. Jeden flaky test do fixu.', reactions: [{ emoji: '💯', count: 2, reacted: false }] },
      { id: 'd3', author: 'Tomasz Piotr', initials: 'TP', avatarColor: 'bg-emerald-500', time: '12:05', content: 'Deploy na staging OK. Zaczyna review QA.', reactions: [{ emoji: '✅', count: 3, reacted: false }] },
      { id: 'd4', author: 'Kasia Wrona', initials: 'KW', avatarColor: 'bg-indigo-500', time: '13:50', content: 'QA zatwierdzil. Mozemy puszczac na prod jutro rano.', reactions: [{ emoji: '🎉', count: 5, reacted: false }] },
      { id: 'd5', author: 'Piotr Zaleski', initials: 'PZ', avatarColor: 'bg-amber-500', time: '14:42', content: 'Build przeszedl pomyslnie. CI zielone na wszystkich checkach.', reactions: [] },
    ],
  },
  {
    id: 'dm-anna',
    name: 'Anna Kowalska',
    initials: 'AK',
    avatarColor: 'bg-violet-500',
    lastMessage: 'Swietnie, dziekuje za update!',
    time: '13:05',
    unread: 0,
    online: true,
    type: 'dm',
    messages: [
      { id: 'a1', author: 'Ty', initials: 'MC', avatarColor: 'bg-indigo-600', time: '10:00', content: 'Hej Anno, mam gotowy raport kwartalny. Kiedy mozesz przejrzec?', reactions: [] },
      { id: 'a2', author: 'Anna Kowalska', initials: 'AK', avatarColor: 'bg-violet-500', time: '10:15', content: 'Dzieki! Dzis po 14:00 bede miala chwile. Mozesz wrzucic do DMS?', reactions: [{ emoji: '👍', count: 1, reacted: true }] },
      { id: 'a3', author: 'Ty', initials: 'MC', avatarColor: 'bg-indigo-600', time: '10:18', content: 'Juz wrzucone. Link: /dms/raporty/Q2-2026', reactions: [] },
      { id: 'a4', author: 'Anna Kowalska', initials: 'AK', avatarColor: 'bg-violet-500', time: '14:10', content: 'Przejrzalam. Wyniki rewelacyjne! Marza 24% powyzej targetu.', reactions: [{ emoji: '🎉', count: 1, reacted: false }] },
      { id: 'a5', author: 'Ty', initials: 'MC', avatarColor: 'bg-indigo-600', time: '13:05', content: 'Swietnie, dziekuje za update!', reactions: [] },
    ],
  },
  {
    id: 'dm-piotr',
    name: 'Piotr Zaleski',
    initials: 'PZ',
    avatarColor: 'bg-amber-500',
    lastMessage: 'Sprawdze i wróce z feedbackiem',
    time: 'Wczoraj',
    unread: 0,
    online: false,
    type: 'dm',
    messages: [
      { id: 'p1', author: 'Piotr Zaleski', initials: 'PZ', avatarColor: 'bg-amber-500', time: 'Wczoraj 09:00', content: 'Mariusz, czy mozesz rzucic okiem na nowy komponent Gantt?', reactions: [] },
      { id: 'p2', author: 'Ty', initials: 'MC', avatarColor: 'bg-indigo-600', time: 'Wczoraj 09:30', content: 'Jasne, wrzuc PR to review.', reactions: [] },
      { id: 'p3', author: 'Piotr Zaleski', initials: 'PZ', avatarColor: 'bg-amber-500', time: 'Wczoraj 09:35', content: 'PR #127 juz otwarty. Dodaem screenshoty.', reactions: [{ emoji: '👍', count: 1, reacted: true }] },
      { id: 'p4', author: 'Ty', initials: 'MC', avatarColor: 'bg-indigo-600', time: 'Wczoraj 14:00', content: 'Wygladta dobrze! Jeden komentarz do drag-and-drop, reszta OK.', reactions: [] },
      { id: 'p5', author: 'Piotr Zaleski', initials: 'PZ', avatarColor: 'bg-amber-500', time: 'Wczoraj 14:20', content: 'Sprawdze i wroce z feedbackiem.', reactions: [] },
    ],
  },
];

const CHANNELS_LIST = [
  { name: 'general', members: 48, private: false, description: 'Ogólna komunikacja firmowa' },
  { name: 'dev-team', members: 12, private: false, description: 'Zespół developerski' },
  { name: 'marketing', members: 8, private: false, description: 'Dział marketingu i komunikacji' },
  { name: 'zarzad', members: 5, private: true, description: 'Kanał Zarządu — dostęp ograniczony' },
  { name: 'projekt-ruflo', members: 15, private: false, description: 'Powiązany z projektem RuFlo V3' },
  { name: 'hr-ogloszenia', members: 48, private: false, description: 'Ogłoszenia z działu HR' },
];


const TABS_CONFIG: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'wiadomosci', label: 'Wiadomosci', icon: MessageSquare },
  { id: 'ogloszenia', label: 'Ogloszenia', icon: Megaphone },
  { id: 'kanaly', label: 'Kanaly', icon: Hash },
  { id: 'powiadomienia', label: 'Powiadomienia', icon: Bell },
];

function MessageBubble({ msg, isOwn }: { msg: Message; isOwn: boolean }) {
  const [reactions, setReactions] = useState(msg.reactions);
  const toggleReaction = (idx: number) => {
    setReactions(prev => prev.map((r, i) => i === idx
      ? { ...r, count: r.reacted ? r.count - 1 : r.count + 1, reacted: !r.reacted }
      : r
    ));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 group ${isOwn ? 'flex-row-reverse' : ''}`}
    >
      <div className={`w-9 h-9 rounded-2xl ${msg.avatarColor} flex items-center justify-center text-white text-[10px] font-black shrink-0`}>
        {msg.initials}
      </div>
      <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`flex items-baseline gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{msg.author}</span>
          <span className="text-[9px] text-slate-400">{msg.time}</span>
        </div>
        <div className={`px-4 py-3 rounded-[1.5rem] text-sm font-medium leading-relaxed ${
          isOwn ? 'bg-indigo-600 text-white rounded-tr-md' : 'bg-white border border-slate-100 text-slate-800 rounded-tl-md shadow-sm'
        }`}>
          {msg.content}
        </div>
        {reactions.length > 0 && (
          <div className="flex gap-1 mt-1">
            {reactions.map((r, i) => (
              <button
                key={i}
                onClick={() => toggleReaction(i)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                  r.reacted ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-200'
                }`}
              >
                {r.emoji} {r.count}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ChatView({ conv }: { conv: Conversation }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState(conv.messages);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, {
      id: `new-${Date.now()}`,
      author: 'Ty',
      initials: 'MC',
      avatarColor: 'bg-indigo-600',
      time: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
      content: input.trim(),
      reactions: [],
    }]);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-white">
        {conv.type === 'channel' ? (
          <div className="w-9 h-9 rounded-2xl bg-indigo-50 flex items-center justify-center">
            <Hash size={16} className="text-indigo-600" />
          </div>
        ) : (
          <div className={`w-9 h-9 rounded-2xl ${conv.avatarColor} flex items-center justify-center text-white text-[10px] font-black`}>
            {conv.initials}
          </div>
        )}
        <div>
          <div className="font-black text-slate-900 text-sm uppercase tracking-tight">
            {conv.type === 'channel' ? `#${conv.name}` : conv.name}
          </div>
          {conv.type === 'dm' && (
            <div className={`text-[9px] font-bold uppercase tracking-widest ${conv.online ? 'text-emerald-500' : 'text-slate-400'}`}>
              <Circle size={6} className="inline mr-1 fill-current" />{conv.online ? 'Online' : 'Offline'}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
        {messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} isOwn={msg.author === 'Ty'} />
        ))}
      </div>

      <div className="p-4 border-t border-slate-100 bg-white">
        <div className="flex items-center gap-3 bg-slate-100 rounded-[2rem] px-4 py-2">
          <button className="text-slate-400 hover:text-indigo-600 transition-colors"><Paperclip size={16} /></button>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder={`Wiadomosc do ${conv.type === 'channel' ? '#' + conv.name : conv.name}...`}
            className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none font-medium"
          />
          <button className="text-slate-400 hover:text-indigo-600 transition-colors"><SmilePlus size={16} /></button>
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white p-2 rounded-full transition-all"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function MessagesTab() {
  const [activeConv, setActiveConv] = useState(CONVERSATIONS[0]);
  const [search, setSearch] = useState('');

  const filtered = CONVERSATIONS.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const channels = filtered.filter(c => c.type === 'channel');
  const dms = filtered.filter(c => c.type === 'dm');

  return (
    <div className="flex h-[600px] rounded-[2rem] overflow-hidden border border-slate-200 shadow-sm bg-white">
      {/* Sidebar */}
      <div className="w-72 border-r border-slate-100 flex flex-col shrink-0 bg-slate-50/50">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-3 py-2">
            <Search size={14} className="text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Szukaj konwersacji..."
              className="flex-1 text-xs text-slate-700 outline-none placeholder-slate-400 font-medium bg-transparent"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <div className="px-2 mb-2 mt-2">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <ChevronDown size={10} /> Kanaly
            </span>
          </div>
          {channels.map(c => (
            <button key={c.id} onClick={() => setActiveConv(c)}
              className={`w-full text-left px-3 py-2.5 rounded-2xl mb-0.5 flex items-center gap-2.5 transition-all ${
                activeConv.id === c.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-white text-slate-600'
              }`}
            >
              <Hash size={14} className={activeConv.id === c.id ? 'text-indigo-500' : 'text-slate-400'} />
              <span className="text-xs font-bold flex-1">{c.name}</span>
              {c.unread > 0 && (
                <span className="bg-indigo-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{c.unread}</span>
              )}
            </button>
          ))}

          <div className="px-2 mb-2 mt-4">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <ChevronDown size={10} /> Wiadomosci Bezposrednie
            </span>
          </div>
          {dms.map(c => (
            <button key={c.id} onClick={() => setActiveConv(c)}
              className={`w-full text-left px-3 py-2.5 rounded-2xl mb-0.5 flex items-center gap-2.5 transition-all ${
                activeConv.id === c.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-white text-slate-600'
              }`}
            >
              <div className="relative">
                <div className={`w-7 h-7 rounded-xl ${c.avatarColor} flex items-center justify-center text-white text-[9px] font-black`}>
                  {c.initials}
                </div>
                {c.online && <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white" />}
              </div>
              <span className="text-xs font-bold flex-1 truncate">{c.name}</span>
            </button>
          ))}
        </div>

        <div className="p-3 border-t border-slate-100">
          <button className="w-full flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest px-3 py-2 rounded-2xl hover:bg-indigo-50 transition-colors">
            <Plus size={14} /> Nowy Kanal / DM
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 min-w-0">
        <ChatView key={activeConv.id} conv={activeConv} />
      </div>
    </div>
  );
}

function ChannelsTab() {
  return (
    <div className="space-y-3">
      {CHANNELS_LIST.map((ch, i) => (
        <motion.div key={ch.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
          className="bg-white border border-slate-100 rounded-[2rem] px-8 py-6 flex items-center gap-6 hover:border-indigo-200 hover:shadow-lg transition-all cursor-pointer group"
        >
          <div className={`w-12 h-12 rounded-[1.5rem] flex items-center justify-center ${ch.private ? 'bg-rose-50' : 'bg-indigo-50'}`}>
            {ch.private ? <Lock size={20} className="text-rose-500" /> : <Hash size={20} className="text-indigo-500" />}
          </div>
          <div className="flex-1">
            <div className="font-black text-slate-900 uppercase tracking-tight text-sm">#{ch.name}</div>
            <div className="text-xs text-slate-500 font-medium mt-1">{ch.description}</div>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <Users size={12} /> {ch.members} czlonkow
          </div>
          {ch.private && (
            <span className="bg-rose-50 text-rose-600 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border border-rose-100">Prywatny</span>
          )}
          <button className="opacity-0 group-hover:opacity-100 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-2xl transition-all">
            Dolacz
          </button>
        </motion.div>
      ))}
    </div>
  );
}

export default function CommunicationModule() {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const [activeTab, setActiveTab] = useState<Tab>('wiadomosci');
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  useEffect(() => {
    if (!user || !activeTenantId) return;
    const q = query(
      collection(db, `tenants/${activeTenantId}/notifications`),
      where('recipientId', '==', user.uid),
      where('read', '==', false)
    );
    return onSnapshot(q, snap => setUnreadNotifs(snap.size));
  }, [user?.uid, activeTenantId]);

  const unreadMessages = CONVERSATIONS.reduce((acc, c) => acc + c.unread, 0);

  return (
    <div className="max-w-[1600px] mx-auto p-10 space-y-10 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-slate-900 rounded-[3rem] p-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative overflow-hidden shadow-2xl shadow-slate-200">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div>
          <div className="flex items-center gap-4 mb-3">
            <div className="bg-indigo-600 p-3 rounded-[1.5rem] shadow-lg shadow-indigo-900/40">
              <MessageSquare className="text-white" size={22} />
            </div>
            <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">Komunikacja</h1>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">
            Wewnetrzny Hub Komunikacyjny — C-ICAS OS V5
          </p>
        </div>
        <div className="flex gap-6 flex-wrap">
          {[
            { label: 'Wiadomosci', value: unreadMessages.toString(), unit: 'nowych', color: 'text-indigo-400' },
            { label: 'Kanaly', value: '6', unit: 'aktywnych', color: 'text-white' },
            { label: 'Powiadomienia', value: unreadNotifs.toString(), unit: 'oczekuje', color: 'text-amber-400' },
          ].map((s, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-[2rem] px-8 py-6 text-right backdrop-blur-sm">
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</div>
              <div className={`text-2xl font-black italic ${s.color}`}>
                {s.value} <span className="text-[10px] text-slate-500">{s.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 p-2 bg-slate-100 rounded-[2.5rem] w-fit">
        {TABS_CONFIG.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-4 rounded-[2rem] transition-all text-[10px] font-black uppercase tracking-widest relative ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-xl scale-[1.02]'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
            {tab.id === 'wiadomosci' && unreadMessages > 0 && (
              <span className="bg-indigo-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">{unreadMessages}</span>
            )}
            {tab.id === 'powiadomienia' && unreadNotifs > 0 && (
              <span className="bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">{unreadNotifs}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
          {activeTab === 'wiadomosci' && <MessagesTab />}
          {activeTab === 'ogloszenia' && <AnnouncementBoard />}
          {activeTab === 'kanaly' && <ChannelsTab />}
          {activeTab === 'powiadomienia' && <NotificationsTabPanel />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
